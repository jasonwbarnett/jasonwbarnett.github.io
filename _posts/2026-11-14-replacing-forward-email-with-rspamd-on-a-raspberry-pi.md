---
layout: post
title: "Replacing Forward Email's inbound filtering with rspamd on a Raspberry Pi"
category: posts
---

My main inbox lives on [HEY][1] using HEY for Domains. I also own a pile of
other domains that I've collected over the years: this blog's domain, a
couple of vanity domains, my wife's domain, and one for a family project.
For a long time all of them pointed their MX records at [Forward Email][2],
which caught everything with a catch-all and forwarded it into HEY.

That setup worked, but catch-all domains are spam magnets. Every scraped
address, every typo, every `admin@` and `info@` that a bot guesses ends up
in your inbox. Forward Email does some filtering, but plenty still made it
through, and HEY's Screener ended up being my spam filter. That's not really
what the Screener is for, and I was tired of saying "no" to the same kind of
junk over and over.

So I moved inbound mail for all six domains onto a Raspberry Pi at
home running Postfix and [rspamd][3]. I built it with Claude over the course
of a day, and I'm pretty happy with where it landed. This post is the tour.

## The shape of it

```text
sender ──25──▶ home WAN (port forward on the UDM-Pro)
           ──▶ Raspberry Pi: postscreen → smtpd
                 ├─ rspamd milter        reject ≥15 / hold ≥6 / greylist ≥4
                 ├─ virtual alias        catch-all → my HEY address
                 ├─ postsrsd (SRS)       rewrite the envelope sender
                 └─ smtp ──25──▶ HEY
```

Each domain now has two MX records:

```text
MX 10  mx.barnett.network      # the Pi
MX 20  mx1.forwardemail.net    # backup
MX 20  mx2.forwardemail.net    # backup
```

If the Pi, my house, or my ISP falls over, senders fall back to Forward
Email and mail keeps flowing exactly like it did before. I still pay for
Forward Email anyway because HEY sends as some of these domains through
Forward Email's SMTP, so it costs me nothing extra to keep it as the safety
net.

One thing I didn't expect: Forward Email flags a domain as misconfigured if
*any* MX record isn't theirs, regardless of priority. I went and read their
source to confirm it doesn't actually change forwarding behavior (it
doesn't, it just sends you "configuration issue" emails). Setting
`ignore_mx_check = true` on each domain through their API quiets it down.

## Can you even run a mail server at home?

This was the first thing I checked, because most residential ISPs block port
25. I'm on Google Fiber and they don't block it in either direction. I
confirmed inbound 25 was reachable from four different countries with
[check-host.net][4] before I touched anything else.

The other classic problem is reverse DNS. Residential customers can't set a
PTR record, so my IP resolves to Google Fiber's generic name. For *sending*
mail to random providers that would be a real problem. For forwarding to a
single destination it turns out not to matter: HEY accepts the mail just
fine. The Pi only ever talks to HEY on the outbound side.

## Postfix bits worth calling out

Most of `main.cf` is boring. A few pieces earned their keep.

**postscreen** sits in front of `smtpd` and drops obvious bots before they
cost rspamd anything:

```text
postscreen_greet_action = enforce
postscreen_dnsbl_action = enforce
postscreen_dnsbl_sites = zen.spamhaus.org*3 bl.mailspike.net
postscreen_dnsbl_threshold = 3
```

**The rspamd milter** fails closed:

```text
smtpd_milters = inet:127.0.0.1:11332
milter_default_action = tempfail
```

If rspamd is down, senders get a temporary failure and retry later. Nothing
gets through unscanned and nothing gets lost.

**SRS** matters because I'm forwarding. When a message from
`someone@example.com` leaves my Pi headed for HEY, my Pi isn't in
example.com's SPF record. [postsrsd][5] rewrites the envelope sender to
something like `SRS0=...@srs.barnett.network`, which *does* have an SPF
record that covers the Pi. HEY sees a clean SPF pass, and bounces still find
their way back.

## Quarantine instead of a spam folder

rspamd adds up points from a lot of checks and picks an action based on the
total. Mine is:

```text
reject = 15;      # rejected during SMTP (no backscatter)
add_header = 6;   # adds "X-Spam: Yes" -> Postfix HOLDs it (quarantine)
greylist = 4;
```

Under 4 gets delivered. 4 to 6 gets greylisted, so real mail servers retry
and it arrives 5 to 15 minutes late. 15 and up gets rejected during the SMTP
conversation, which means the sender gets the bounce and I never generate
backscatter.

The middle band is the interesting one. HEY doesn't really have a "probably
spam, take a look" folder that I control, so instead of delivering it with a
header, Postfix puts it on **hold** in its own queue on the Pi:

```text
milter_header_checks = regexp:/etc/postfix/header_checks
```

```text
/^X-Spam: Yes/ HOLD
```

This one bit me. I first used plain `header_checks`, and nothing was ever
held. Plain `header_checks` runs before the milter adds its headers, so it
never sees `X-Spam: Yes`. It has to be `milter_header_checks`.

Held mail is useless if you never look at it, so Claude wrote a small Python
web app (stdlib only, no dependencies) that lists what's held and gives each
message three buttons:

- **Not spam**: teach rspamd it's ham and release it to HEY
- **Spam**: teach rspamd it's spam and delete it
- **Always allow this domain**: add it to an allow list and release it

Every morning at 7:00 my wife and I each get an email listing our own held
messages, but only if there are any. Most mornings there's nothing. There's
also a "Recent mail" page that keeps a copy of everything delivered to HEY
for 7 days, so if spam does sneak through I can click "This was spam," which
trains rspamd and blocks the sender's domain.

The allow list only applies if the message passes DMARC. Otherwise anyone
could forge a `From:` on an allowed domain and walk right in.

## Keeping the UI private

All of this sits behind [Tailscale Services][6], so the rspamd dashboard
and the held mail page are only reachable on my tailnet. Tailscale Serve
adds a `Tailscale-User-Login` header to each request, and the held mail app
uses that to figure out who you are. I get admin, my wife gets read-only,
and neither of us types a password.

There was one nasty surprise here. Debian's rspamd package sets the web
controller's `secure_ip` to localhost, which means requests from 127.0.0.1
skip authentication entirely. Tailscale Serve proxies from localhost. So the
first version of this would have handed the admin UI to every device on my
tailnet. The fix is to override `secure_ip` with an address nothing will
ever connect from, and it has to go in `override.d`, not `local.d`, because
`local.d` merges with the default list instead of replacing it.

## DNS blocklists and the "don't use a public resolver" problem

rspamd leans on DNS blocklists like Spamhaus, URIBL and SURBL. Most of them
refuse queries that come through big public resolvers. My home DNS runs
through a pair of [AdGuard Home][7] Pis that forward upstream to public
resolvers, so every blocklist lookup was quietly coming back empty.

I fixed this in AdGuard instead of adding another resolver to the stack.
AdGuard supports per-domain upstreams, so each blocklist zone is now sent
straight to that list's own authoritative nameservers, and the mail Pi is
set up as an unfiltered client. There's also a probe that queries each list's
test entries every 30 minutes, and my status page goes red if rspamd has
quietly disabled one.

## The spam that got through anyway

A few hours after going live, "Norcal Auto Insurance" landed in my HEY
inbox with a score of **0.10**. That's not a bug. It's a classic snowshoe
campaign: aged domains bought second hand, perfect SPF, DKIM and DMARC, and
not on a single blocklist yet. rspamd had nothing to grab onto.

So we added a few more layers:

- **Sender reputation in Redis**, keyed by IP, network, ASN and SPF domain.
  This learns from rspamd's own decisions, so it starts helping from the
  second message of a campaign.
- **Three small local Lua rules**: sending hosts named `<hex>.<sender's
  domain>`, bulk mail where every link points somewhere other than the
  sender's domain, and two or more insurance or lead-gen phrases. That last
  one had zero hits on 366 of my real messages.
- **A trained Bayes classifier.** rspamd's Bayes does nothing until it has
  around 200 examples of each kind, so I bootstrapped it with about 300 real
  messages from my own HEY account and about 500 recent spam samples from
  [untroubled.org][8]. On messages it hadn't seen, it got 56 of 60 good
  messages and 57 of 60 spam messages right.
- **An AI check.** For anything that isn't already rejected, allow-listed or
  a reply, rspamd asks Claude (Haiku, the small fast one) whether the
  message is spam and adds up to +5 points or takes away 1. Results are
  cached in Redis for 7 days so greylist retries don't pay twice. To be
  clear about the tradeoff: this sends message content to Anthropic's API.
  I'm fine with that for mail from strangers to catch-all domains. You might
  not be, and the rule just doesn't load if there's no API key.

Replaying the Norcal message with a fresh domain, it now lands at about 4.7
before the AI check and gets held once the AI check runs.

## An own goal

The funniest problem of the day: an email I sent to my wife got
greylisted. HEY sends mail for these domains through Forward Email, and the
shared Forward Email IP it went out on has a Senderscore of **0**. That's
worth +4 points all by itself. The fix was to allow-list our own domains,
which is safe because the allow list requires DMARC to pass.

## How it's going

The first day, not counting my own test messages:

- **62** connections dropped by postscreen before rspamd ever saw them
- **12** greylisted (real senders retried and got through)
- **7** held on the Pi
- a handful rejected outright

The part I care about is what reaches HEY, and that's now almost entirely
real mail. The Screener is back to being "do I want to hear from this
person," not "is this a person."

It's not perfect, and it never will be. But the junk that does show up now
teaches the filter something every time I click a button, which beats
saying "no" to the same spam in the Screener forever.

A few other things I'd tell you if you want to try this:

- **Back it up.** My Pi images itself to object storage nightly, and an
  hourly job backs up the parts that change (Postfix queue, held mail, Redis,
  allow and block lists).
- **Don't test by lowering thresholds on the live server.** I did that once
  to test the hold path, and a real newsletter to my wife got held in the 10
  seconds it was set. Use a test address that always holds instead.
- **Keep the old provider as a backup MX.** It made the cutover painless:
  one domain in the morning, the other five a couple of hours later, and I
  never worried about losing mail.

One leftover annoyance: every forwarded message in HEY shows
`BCC: me@my-hey-address` under the sender, because the address HEY received
it on isn't in the `To:` line. It did that under Forward Email too. I tried
adding `X-Original-To` and `Envelope-To` headers with no luck, and a test
with a `Delivered-To` header was accepted by HEY and then silently vanished.
I've emailed HEY support. If they fix it, I'll update this post.

[1]: https://www.hey.com/
[2]: https://forwardemail.net/
[3]: https://rspamd.com/
[4]: https://check-host.net/
[5]: https://github.com/roehling/postsrsd
[6]: https://tailscale.com/kb/1552/tailscale-services
[7]: https://adguard.com/en/adguard-home/overview.html
[8]: https://untroubled.org/spam/
