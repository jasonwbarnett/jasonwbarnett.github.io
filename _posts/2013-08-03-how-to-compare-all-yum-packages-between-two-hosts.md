---
title: How to compare all yum packages between two hosts
author: Jason Barnett
layout: post
categories:
  - Linux
  - RHEL
---
Just a quick note! I often find myself needing to migrate a RHEL server from and old VM to a new one and I like to run a few checks and balances to know I have all of the same packages installed. This is an easy way to generate a list of packages that need to be installed on the new host. You can simply copy and paste the list into yum install <list>.

{% highlight bash %}
comm -23 <(rpm -qa --qf "%{NAME}\n" | sort | uniq) <(ssh newhost.domain.com 'rpm -qa --qf "%{NAME}\n" | sort | uniq') | xargs
{% endhighlight %}