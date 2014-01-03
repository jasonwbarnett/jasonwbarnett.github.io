---
layout: post
title: "ifconfig vs ip"
category: posts
---
__!! ALL of this was stolen from [tty1.net][1]. I liked it so much, I decided to copy it for my own reference. !!__

The command `/bin/ip` has been around for some time now. But people continue using the older command `/sbin/ifconfig`. Let's be clear: `ifconfig` will not quickly go away, but its newer version, `ip`, is more powerful and will eventually replace it.

The man page of `ip` may look intimidating at first, but once you get familiar with the command syntax, it is an easy read. This page will not introduce the new features of `ip`. It rather features a side-by-side comparison if `ifconfig` and ip to get a quick overview of the command syntax.

### Show network devices and configuration
`ifconfig`

`ip addr show`

`ip link show`


### Enable a network interface
`ifconfig eth0 up`

`ip link set eth0 up`

A network interface is disabled in a similar way:

`ifconfig eth0 down`

`ip link set eth0 down`


### Set IP address
`ifconfig eth0 192.168.0.77`

`ip address add 192.168.0.77 dev eth0`

This was the simple version of the command. Often, also the network mask or the broadcast address need to be specified. The following examples show the ifconfig and ip variants.

Needless to say that the netmask can also be given in CIDR notation, e.g. as 192.168.0.77/24.

`ifconfig eth0 192.168.0.77 netmask 255.255.255.0 broadcast 192.168.0.255`

`ip addr add 192.168.0.77/24 broadcast 192.168.0.255 dev eth0`


### Delete an IP address
With ip it is also possible to delete an address:

`ip addr del 192.168.0.77/24 dev eth0`

### Add alias interface
`ifconfig eth0:1 10.0.0.1/8`

`ip addr add 10.0.0.1/8 dev eth0 label eth0:1`

### ARP protocol
Add an entry in your ARP table.

`arp -i eth0 -s 192.168.0.1 00:11:22:33:44:55`

`ip neigh add 192.168.0.1 lladdr 00:11:22:33:44:55 nud permanent dev eth0`

Switch ARP resolution off on one device

`ifconfig -arp eth0`

`ip link set dev eth0 arp off`

[1]: http://www.tty1.net/blog/2010/ifconfig-ip-comparison_en.html
