---
title: How to get user input without echoing to console with Ruby
author: Jason Barnett
layout: post
categories:
  - Quick Notes
  - Ruby
---

I am always writing little programs that require the end user to provide a
password. One of the biggest problems is that the common methods for receiving
user input ends up echoing everything typed in clear text for all to see. I was
able to solve this little problem with a quick google search and I wanted to
share for all to see.

{% highlight ruby %}
require 'io/console'

print "Please enter your password: "
password = STDIN.noecho(&:gets).chomp
puts ## This is here to add a line break after grabbing the user input
{% endhighlight %}
