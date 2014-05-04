---
layout: post
title: "How to override Google Compute Engine's DHCP MTU Option"
category: posts
---

Recently I ran into a few issues with a linux IPSec Tunnel (Strongswan) that was hosted at GCE. With the
suggestion of one of Google's engineers, I thought that it might have something to do with the MTU.
Google's compute engine network MTU is 1460.

> *"For best performance, set MTU to 1460. Google Compute Engine's DHCP server will serve this parameter as the interface-mtu option, which most clients respect."*
>
> source: https://developers.google.com/compute/docs/images

I decided to drop it to 1400 in order to give the Strongswan host some additional headroom on the GCE network side.
It ended up being difficult to override the MTU. I attempted to set the `MTU` option in the
`/etc/sysconfig/network-scripts/ifcfg-eth0` script like so:

```
DEVICE="eth0"
BOOTPROTO="dhcp"
DHCP_HOSTNAME="localhost"
MTU="1400"
NM_CONTROLLED="yes"
ONBOOT="yes"
TYPE="Ethernet"
```

That wasn't working though, so I needed to somehow override the dhcp options being offered. I had never
messed with the linux dhcp client (`dhclient`) so into the man pages we go! I read through them, but
wasn't able to find anything that worked. I tried multiple things until I stumbled upon a random config on
the internet which showed (by observing) that options with numbers as values weren't surrounded in quotes.
I removed the quotes from the option and BAM, it worked! Here is the final config that worked for me:

{% highlight bash %}
# /etc/dhcp/dhclent-eth0.conf
send vendor-class-identifier "anaconda-Linux 2.6.32-431.el6.x86_64 x86_64";
timeout 45;
supersede interface-mtu 1400;
{% endhighlight %}


I highly suggest reading through the dhclient.conf man page.

`man dhclient.conf`

Here is a snippet from the man page about the `supersede` statement.

> <u>The</u> **supersede** <u>statement</u>
>
> **supersede [** <u>option</u> <u>declaration</u> ] ;
>
> If  for  some  option the client should always use a locally-configured value or values rather than whatever is supplied by the
> server, these values can be defined in the **supersede** statement.
