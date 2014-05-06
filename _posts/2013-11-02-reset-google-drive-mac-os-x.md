---
title: "How to reset Google Drive on Mac OS X"
author: Jason Barnett
layout: post
categories:
  - Google
  - Mac OS X
  - Quick Notes
---
I just recently was needing to change my Google Drive from using one Google account to another. When I looked at the Google Drive menu and the "preferences" menu item was greyed out, leaving me without a way to change accounts. This led me down a path of searching out a solution. In combination with my own intuition and the web, I came up with the following solution that worked.

1. Open Terminal
    [<img class="alignnone size-medium wp-image-100" alt="Terminal Application" src="/images/spotlight_terminal.png" width="300" height="97" />][1]</li>

2. Copy and paste the following commands:

{% highlight ruby %}
find ~/ -maxdepth 1 -type d -iname '*google*drive*' 2> /dev/null -exec rm -Rf {} \;
rm -Rf ~/Library/Application\ Support/Google/Drive
{% endhighlight %}

[1]: /images/spotlight_terminal.png
