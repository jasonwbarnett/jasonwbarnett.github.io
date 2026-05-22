---
layout: page
title: "About Jason Barnett"
cover: "/img/about-smaller.jpg"
---

# About Me

I'm Jason Barnett, a Principal Developer Experience Engineer at [Altana][4].

I got started in tech at 16 doing computer repair with my dad, then went out on
my own running a small business fixing machines around the San Francisco Bay
Area. That hands-on foundation eventually led me into infrastructure and
operations work at [Mindjet][1] (formerly [Spigit][2], now part of
[Planview IdeaPlace][3]), where I worked on their Technical Operations team
doing infrastructure automation.

In November 2015 I joined [Bridgewater][5]. I wore a lot of hats there and it
pushed me to grow in ways I hadn't anticipated. I'm grateful for the experience
and the people I met.

I've been at [Altana][4] for a while now, and it's the first company I've worked
at where I'm genuinely proud of the mission.

## Open Source

Contributing to open source has been one of the more consistently satisfying
parts of my career. It started around 2015 and has never really stopped.

One that sticks with me from early on is the `:create`, `:delete`, and
`:configure` actions I added to Chef's [windows_service resource][chef-windows-svc].
The resource already existed, but its only Windows-specific action was
`:configure_startup`; you could start, stop, enable, or disable a service via
inherited actions, but you couldn't create or delete one. At Bridgewater we
needed to actually create and delete services from Chef, and we were doing
increasingly convoluted PowerShell workarounds to get there. Adding those actions natively meant the workarounds
just went away, for us and for anyone else in the same situation. It ended up
getting mentioned at ChefConf and in some intro videos, which was a bit of a
surreal moment. I was one of the top 50 contributors to Chef's core around that
time.

Since then the contributions have followed whatever I was working on or running
into. Some highlights:

- **[Tailscale][tailscale]** — added routing support for Ubiquiti UniFi UDM-Pro
  devices, which affected me directly and apparently a lot of other people
- **[Pants][pants]** — module mappings for third-party libraries and workunit
  logging improvements
- **[Netdata][netdata]** — RPM packaging, EL6/EL7 support, and a handful of
  monitoring fixes back when I was running a lot of self-hosted infrastructure
- **[Buildkite Test Collector][bk-collector]** — fixed a JSON corruption race
  condition that showed up when multiple pytest processes tried to merge results
  concurrently
- **[Coder][coder]** — fixed a concurrent OAuth token refresh race condition that
  could cause cache poisoning with single-use refresh tokens

The pattern is pretty consistent: I hit something broken or missing, fix it, and
send it upstream. It's a good habit.

## This site

I built this site to sharpen my writing and share technical things I run into
that might be useful to others. Sometimes that means going deep on a specific
problem; sometimes it means writing something up the way I wish I'd found it
when I was searching.

[1]: https://www.mindjet.com/
[2]: https://www.spigit.com/
[3]: https://www.planview.com/products-solutions/products/ideaplace/
[4]: https://altana.ai/
[5]: https://www.bridgewater.com/
[chef]: https://github.com/chef/chef
[chef-windows-svc]: https://github.com/chef/chef/commit/b1b889406efaf65940726c5f6ee2316b785fa600
[tailscale]: https://github.com/tailscale/tailscale
[pants]: https://github.com/pantsbuild/pants
[netdata]: https://github.com/netdata/netdata
[bk-collector]: https://github.com/buildkite/test-collector-python
[coder]: https://github.com/coder/coder
