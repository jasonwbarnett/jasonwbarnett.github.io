---
title: 'VMware &#8211; Linux VLAN tagging with Cisco Trunk Port'
author: Jason Barnett
layout: post
categories:
  - ESXi
  - VMware
---

I wanted to quickly document how you’re able to allow your Linux VMs to use VLAN
tagging when using VMware ESXi. I originally ran into this problem when I was
converting an avahi physical machine into a VM. After I had migrating the
machine over, it was unable to bring up the VLAN interfaces. It ended up being
really easy to fix, but it was a matter of knowing where to look. It is as
simple as setting “VLAN ID (Optional)” to “ALL (4096)”

1. Click the ESXi/ESX host.
2. Click the **Configuration** tab.
3. Click the **Networking** link.
4. Click **Properties**.
5. Click the virtual switch / portgroups (often named VM Network) in the **Ports** tab and click **Edit**.
6. Click the **General** tab.
7. Select “All (4096)” in “VLAN ID (optional)”.
