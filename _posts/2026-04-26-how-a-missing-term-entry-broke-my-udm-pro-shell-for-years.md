---
layout: post
title: "How a missing TERM entry broke my UDM-Pro shell for years"
category: posts
---

I have been on Linux for 16+ years, and yesterday I learned something about
`TERM` that I really should have learned a long time ago. This is the story
of how an unrelated [AdGuard Home][1] deploy on a couple of new Raspberry Pi
5's solved a problem on my [UDM-Pro][2] that had been quietly annoying me for
years.

## The AdGuard Home symptom

I was bringing up two new Pi 5's as DNS hosts and went to check the service:

```text
root@dns03:~# systemctl status AdGuardHome.service
WARNING: terminal is not fully functional
Press RETURN to continue
 ESC[A● AdGuardHome.service - AdGuard Home: Network-level blocker
     Loaded: loaded (/etc/systemd/system/AdGuardHome.service; enabled; preset: enabled)
     Active: active (running) since Sat 2026-04-25 13:32:20 MDT; 19s ago
   Main PID: 1477 (AdGuardHome)
```

The `WARNING: terminal is not fully functional` line stopped me. In 16+
years on Linux I had somehow never seen it before, so I asked Claude what
it meant. The answer was the kind of answer where you immediately feel a
little dumb:

> That warning isn't from AdGuard Home, it's from `less`, the pager that
> `systemctl status` pipes its output through. `less` is checking your `TERM`
> environment variable to decide what terminal capabilities (cursor movement,
> color, etc.) it can use, and it's getting back something it considers
> unusable. It falls back to a degraded mode and prints that warning to let
> you know fancy navigation is off. The literal `ESC[A` you see in the output
> is the same thing. `less` couldn't translate the up-arrow key into
> anything useful and just printed the raw escape bytes.

I'll be honest, I hadn't even noticed the `ESC[A` in the output until
Claude pointed it out. My up-arrow had eaten the keypress in the moment, but
the broken echo was sitting right there in plain text and I had skimmed past
it. That was its own little lesson in *what I'm not noticing in terminal
output*.

I checked `echo $TERM` on the Pi:

```text
TERM=xterm-ghostty
```

There it was. I run [Ghostty][3] as my terminal emulator, and Ghostty
advertises itself with `TERM=xterm-ghostty`. SSH faithfully forwards that
value to the remote host. The remote host then asks the system "do you have
a terminfo entry named `xterm-ghostty`?" and Raspberry Pi OS Bookworm, like
most distros, does not. So `less`, `vim`, `htop`, even `bash`'s readline
all fall back to the most pessimistic assumption about what the terminal can
do. Hence the warning. Hence the raw escape bytes.

## The fix

[Ghostty's docs][4] cover this. The canonical fix is to copy your local
terminfo entry to the remote host:

```sh
infocmp -x xterm-ghostty | ssh root@dns03 -- tic -x -
```

`infocmp -x` dumps the compiled terminfo source for the named entry, the
pipe sends it to the remote, and `tic -x` compiles and installs it into the
remote's terminfo database. Run it once per host.

If you can't SSH directly as root (I can't), it's a two-step:

```sh
# step 1: drop the source on the remote
infocmp -x xterm-ghostty | ssh user@dns03 'cat > /tmp/xterm-ghostty.ti'

# step 2: install it system-wide (needs a real TTY for sudo)
ssh -t user@dns03 'sudo tic -x /tmp/xterm-ghostty.ti && rm /tmp/xterm-ghostty.ti'
```

`sudo tic -x` writes to `/etc/terminfo/x/xterm-ghostty`, which means every
user on the host benefits, including whatever you do under `sudo` later.

Modern `tic` will print a warning that looks alarming but isn't:

```text
"/tmp/xterm-ghostty.ti", line 2, col 31, terminal 'xterm-ghostty':
older tic versions may treat the description field as an alias
```

That just means: the terminfo source uses a long description in the second
pipe-delimited field (`xterm-ghostty|Ghostty|...`), which an ancient `tic`
on some other host might misread. Your install on Bookworm is fine.

After that, `systemctl status` is clean, `less` is happy, `vim` has color,
and the up-arrow does what an up-arrow is supposed to do.

## The plot twist: my UDM-Pro

A day later I SSH'd into my [UDM-Pro][2] for an unrelated reason. As soon as
I started typing, the shell felt off. Same old "off." For *years* I have
had a bug on the UDM-Pro where I cannot use the left-arrow key to move the
cursor backwards over text I had already typed. If I made a typo near the
beginning of a long command, my only options were to retype it or backspace
the whole thing. Annoying, but I had a workaround: if I started a `tmux`
session locally first and then SSH'd from inside `tmux`, everything worked.
I never knew **why** that worked. I just did it.

This time, on muscle memory, I opened a `tmux` window to SSH from. And then
it hit me.

`tmux` re-exports `TERM` as `tmux-256color` (or `screen-256color` depending
on config), and *every* Linux distro on Earth ships terminfo for those.
So when I went through `tmux`, the UDM-Pro was getting a `TERM` it
recognized. When I SSH'd directly from Ghostty, it was getting
`xterm-ghostty`, which the UDM had never heard of, so `bash`'s readline fell
back to the most degraded line-editor mode it has, the one where the
left-arrow doesn't reliably walk back over already-printed text. Same root
cause as the Pi. I had been working around it for *years* without ever
asking why the workaround worked.

I checked, and `tic` exists on UniFi OS (it's Debian Bullseye underneath),
so the fix was the same one-liner:

```sh
infocmp -x xterm-ghostty | ssh root@10.0.15.1 -- tic -x -
```

Reconnected. Arrow keys work. `less` is clean. `vim` has color and syntax
highlighting. A multi-year papercut, gone in one command.

One footnote for UniFi people: the UDM-Pro's root filesystem is an overlay
that *may* get reset by firmware upgrades. `/etc/terminfo` has persisted
across reboots for me, but I'd expect to re-run this after a UniFi OS
upgrade.

## What I actually learned

The thing I am embarrassed about is not that I didn't know the fix. The
thing I am embarrassed about is that I never really understood, at a gut
level, how much of "does my shell feel right" is downstream of one
environment variable and a lookup in a database I never thought about.

`TERM` is not a label. It is a key into `terminfo`, and `terminfo` is the
contract that tells every program (`bash`'s readline, `less`, `vim`, `git`,
`htop`, `systemctl`'s pager, every TUI you have ever used) what bytes to
send for "move cursor left," what bytes mean "the user pressed up-arrow,"
whether color is safe, whether undercurl is supported, whether the terminal
has a status line. If the remote host can't resolve `TERM` to an entry, all
of those programs fall back to the most paranoid assumptions they have, and
your shell starts behaving in subtly broken ways that you might just attribute
to "this host is weird." For sixteen years I had been attributing it to "this
host is weird."

It was never the host. It was always `TERM`.

[1]: https://adguard.com/en/adguard-home/overview.html
[2]: https://store.ui.com/us/en/products/udm-pro
[3]: https://ghostty.org/
[4]: https://ghostty.org/docs/help/terminfo
