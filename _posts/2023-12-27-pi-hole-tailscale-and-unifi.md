---
layout: post
title: "Pi-Hole, Tailscale, and Unifi UDM-Pro"
category: posts
---

Recently, I delved into the challenge of setting up my own DNS server, aiming
for a solution that didn't involve local hardware support. My motivation?
Filtering ads and trackers, along with blocking certain Apple call-home services
within my home network. Initially, I experimented with several Raspberry Pi
units but soon realized managing hardware wasn't my cup of tea. Consequently, I
shifted focus to hosted solutions and opted for [DigitalOcean][26]. My choice
was driven by curiosity, as I hadn't previously used their Virtual Machines, and
their pricing appeared competitive. In truth, any reputable provider in this
sector could have worked.

However, I faced a key concern: I wanted to reduce who can see my home network's
DNS traffic.  This added complexity to my task, which I'll outline in this
journey. Join me as I walk you through the steps and processes I employed, not
out of an initial grand vision, but as incremental solutions to emerging
challenges.

This is a high level overview of all of the components used in the final design.

- (2) [DigitalOcean Droplets][2]
- [Pi-Hole][3]
- [Tailscale][4]
- [UDM-Pro][5]
- [DHCP Option 119][21] for [Tailnet name][20] search domain
- [DHCP Option 121][7] for [Tailnet][1] static route
- [SierraSoftworks/tailscale-udm][10]
- [StevenBlack/hosts][11]
- [Gravity Sync][13]

My initial setup comprised simply of two Pi-Hole servers operating on a
pair of DigitalOcean Droplets, each in a different datacenter. I modified
the DHCP options in my UDM-Pro to direct all DNS traffic to the public IP
addresses of these DigitalOcean Droplets. To ensure minimal security, I
implemented a basic firewall ruleset that restricted access to my home's public
IP address. An important detail to remember: for this setup to function
correctly, you need to enable "Permit all origins." This option can be found
under **Settings** > **DNS** in the Pi-Hole interface.

After setting up the infrastructure, I dedicated time to fine-tuning the
Pi-Hole configuration, a tool I was using for the first time. My focus was
on understanding the ad lists and exploring available options. During this
exploration, I discovered the popular [StevenBlack/hosts GitHub repository][11]
and decided to use the [alternates/porn/hosts list][12] from it.  Additionally,
I created a custom hosts file tailored to block specific Apple services that I
preferred not to have communicating back to their servers.

While configuring my Pi-Hole servers, I realized the inefficiency of
duplicating each setting on both servers. This redundancy prompted me to find a
solution for syncing the configurations. The goal was to ensure that any changes
made to the primary Pi-Hole would automatically replicate to the secondary
one. My solution was [Gravity Sync][13], which, while not perfect due to some
limitations in syncing upstream servers ([documented here][22]), proved to be
significantly beneficial.

Satisfied with the Minimum Viable Product (MVP) I had created, my attention
shifted to concerns about unencrypted DNS traffic traversing the internet.
Additionally, the lack of an SSL-secured admin interface for Pi-Hole was a
downside, and I preferred not to get involved in SSL certificate management,
despite the relative ease of using [Let's Encrypt][14] and [certbot][15]. To
address these issues, I turned to Tailscale for end-to-end encryption. If
you're unfamiliar with Tailscale, you can learn more about it [here][16].

I began by installing Tailscale on the DigitalOcean Droplets and the
devices within my home network. Subsequently, I updated the DHCP DNS settings to
use the Tailscale IPv4 addresses, routing DNS traffic via Tailscale's
end-to-end encrypted connection. However, this method had a significant
limitation: devices without Tailscale couldn't access the DNS servers,
resulting in DNS resolution failure. This was particularly problematic for
devices on my network that couldn't install Tailscale.

To overcome this, I explored integrating Tailscale with my UDM-Pro. My
research led me to [SierraSoftworks/tailscale-udm][10] on GitHub. After sifting
through various GitHub issues, I found a crucial [discussion][9] that detailed
the process of setting up a UDM-Pro as a [Tailscale subnet router][18].
This setup eliminated the need for individual Tailscale installations on
each device.

Despite the GitHub discussion suggesting the use of a persistent bash script, I
felt a more efficient approach would be to integrate support for UDM-Pro
routing tables directly into Tailscale. This led me to fork Tailscale and start
working on adding this functionality in my [jwb/add-support-for-udm-pro
branch][23], rebased off of v1.56.1, which is the latest release as of this
writing.

My next task was to ensure all devices on my network properly routed
`100.64.0.0/10` ([What are these 100.x.y.z addresses?][19]) through the UDM-Pro.
To accomplish this, I utilized [DHCP Option 121][7]. By employing a
[calculator][6], I generated the necessary hexadecimal array for Unifi's
configuration. With this implementation, I effectively enabled DNS to function
over an end-to-end encrypted network path. OK, so it's not really end-to-end,
you got me. It's encrypted from the edge of my private network to the the other
end. So, edge-to-end encryption.

Before proceeding further, it's worth mentioning that I disabled [Tailscale's
key expiry][27] for both my UDM-Pro and the two DigitalOcean Droplets. This
was a deliberate choice to ensure connectivity between my home network and the
DNS servers is not disrupted.

Focusing next on DNS resolution within my [Tailnet][1], I aimed to move beyond
just IP address-based connectivity between devices. Tailscale provides a
handy feature by assigning a [Tailnet name][20] to each network, making access
more user-friendly. My objective was to establish a conditional forwarder from
Pi-Hole to Tailscale's private DNS server at `100.100.100.100`. Without a
native Pi-Hole solution available, I opted for a manual configuration. This
involved adding settings to `/etc/dnsmasq.d/02-tailscale.conf` on my setup,
followed by restarting the `pihole-FTL` service (`systemctl restart
pihole-FTL.service`). For those interested, you can find your own Tailnet name
[here][24].

```text
# /etc/dnsmasq.d/02-tailscale.conf
server=/hot-mess.ts.net/100.100.100.100
```

With these configurations in place, my setup really started to come together. I
now had a fully functional Pi-Hole DNS server. Traffic from my home network
was being securely routed to my DNS Pi-Hole servers, and I could resolve Tailnet
names.  To further refine the system, I configured [DHCP Option 119][21] on my
UDM-Pro, enabling short hostnames to resolve correctly to my Tailnet name.

My next objective was to minimize what DigitalOcean could observe in terms of
DNS traffic. At this point, all DNS queries from my home network were forwarded
to Pi-Hole, then to an upstream DNS server (like `1.1.1.1`). However, this
meant that traffic from the Droplets to the upstream servers was unencrypted. In
my quest for DNS over HTTPS, I discovered Cloudflare's [cloudflared][8].
Following their [Connect to 1.1.1.1 using DoH clients][8] guide, I set up a
running DNS proxy service. Subsequently, I configured Pi-Hole to route DNS
queries to this proxy by entering `127.0.0.1#5553` in the Custom Upstream DNS
Servers section under **Settings** > **DNS**. It's important to note that the
Cloudflare documentation omits the port in the systemd.unit file, which is
crucial here since Pi-Hole binds to `UDP/53` and `TCP/53`.

```
# /etc/systemd/system/cloudflared-proxy-dns.service
[Unit]
Description=DNS over HTTPS (DoH) proxy client
Wants=network-online.target nss-lookup.target
Before=nss-lookup.target

[Service]
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
DynamicUser=yes
ExecStart=/usr/local/bin/cloudflared proxy-dns --port 5553

[Install]
WantedBy=multi-user.target
```

In the end, I made a trade-off, opting to trust Cloudflare over managing a
recursive DNS server myself. If you're uncomfortable with this choice, there's
an alternative: you can set up a recursive DNS server using unbound. For
guidance on this, refer to the [unbound setup guide][25], which provides
detailed instructions on configuring Pi-Hole with unbound as a recursive DNS
server.

Another trade-off I made involves network access: any device connected to my
home network has unrestricted access to my entire Tailnet. This compromise
seemed reasonable, as I don't typically have untrusted individuals connecting to
my home network. If needed, securing this aspect would be relatively
straightforward using Tailscale ACLs. The strategy would involve permitting only
the UDM-Pro Tailscale client to access the Pi-Hole servers via UDP/53 and
TCP/53. While I might consider implementing this security measure in the future,
I currently appreciate the simplicity and convenience of full Tailnet access
from my home network.

In conclusion, I've successfully set up a DNS server that fulfills the
functionality I originally sought. Along the way, I achieved a modest
improvement in privacy, though it's important to acknowledge that the solution
isn't fully privacy-proof. Some remaining privacy concerns include:

- [Subject Name Indication (SNI)][28] remains unencrypted in most scenarios.
- Assuming Cloudflare adheres to their [privacy policy][29], up to 25 hours of DNS queries could still be logged.
- My ISP can still detect the destination IP addresses of my traffic.

Thank you for reading. If you have any feedback, comments, or need assistance,
please feel free to reach out on this [reddit post][30].

[1]: https://tailscale.com/kb/1136/tailnet/
[2]: https://www.digitalocean.com/products/droplets
[3]: https://pi-hole.net/
[4]: https://tailscale.com/
[5]: https://store.ui.com/us/en/products/udm-pro
[6]: https://www.medo64.com/2018/01/configuring-classless-static-route-option/
[7]: https://datatracker.ietf.org/doc/html/rfc3442
[8]: https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/dns-over-https-client/
[9]: https://github.com/SierraSoftworks/tailscale-udm/discussions/51
[10]: https://github.com/SierraSoftworks/tailscale-udm
[11]: https://github.com/StevenBlack/hosts
[12]: https://github.com/StevenBlack/hosts/raw/master/alternates/porn/hosts
[13]: https://github.com/vmstan/gravity-sync
[14]: https://letsencrypt.org/
[15]: https://certbot.eff.org/
[16]: https://tailscale.com/kb/1151/what-is-tailscale
[18]: https://tailscale.com/kb/1019/subnets
[19]: https://tailscale.com/kb/1015/100.x-addresses
[20]: https://tailscale.com/kb/1217/tailnet-name
[21]: https://datatracker.ietf.org/doc/html/rfc3397
[22]: https://github.com/vmstan/gravity-sync/wiki#limitations
[23]: https://github.com/jasonwbarnett/tailscale/tree/jwb/add-support-for-udm-pro
[24]: https://login.tailscale.com/admin/dns
[25]: https://docs.pi-hole.net/guides/dns/unbound/
[26]: https://www.digitalocean.com/
[27]: https://tailscale.com/kb/1028/key-expiry
[28]: https://www.cloudflare.com/learning/ssl/what-is-sni/
[29]: https://www.cloudflare.com/privacypolicy/
[30]: https://www.reddit.com/r/pihole/comments/18su9du/story_time_pihole_tailscale_and_unifi_udmpro/
