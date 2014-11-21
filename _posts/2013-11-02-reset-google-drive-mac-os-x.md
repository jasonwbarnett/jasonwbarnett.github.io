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
    [<img class="alignnone size-medium wp-image-100" alt="Terminal Application" src="/img/spotlight_terminal.png" width="300" height="97" />][1]</li>

2. Copy and paste the following commands:

{% highlight bash %}
# The MIT License (MIT)
#
# Copyright (c) 2014 Jason Barnett
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

# This command prints which directories would be deleted:
find ~ -maxdepth 1 -type d -iname '*google*drive*' -print

# The commands below will actually remove the Google Drive folders
# found in order to reset Google Drive
find ~ -maxdepth 1 -type d -iname '*google*drive*' 2> /dev/null -exec rm -Rf {} \;
rm -Rf ~/Library/Application\ Support/Google/Drive
{% endhighlight %}

[1]: /img/spotlight_terminal.png
