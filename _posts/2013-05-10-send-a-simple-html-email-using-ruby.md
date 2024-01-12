---
title: Send a Simple HTML Email Using Ruby
author: Jason Barnett
layout: post
categories:
  - Ruby
---

Most recently in my Ruby endeavors, I needed an easy way to send simple HTML
emails. I came up with what I think to be the most concise way of doing so. From
the example I’ve given below you should be able to copy + paste and have
something running in minutes, if not seconds. It simply leverages the lovely
built-in [Ruby class Net::SMTP][1]. No need to install any additional
[RubyGems][2] or anything else. Enjoy and have fun sending emails from your
scripts, programs or anything else.

{% highlight ruby %}
require 'net/smtp'

from    = "First Last <person@example.com>"
to      = "First Last <person@example.com>"
subject = "this is my subject"

message = <<MESSAGE_END
From: #{from}
To: #{to}
Subject: #{subject}
Mime-Version: 1.0
Content-Type: text/html
Content-Disposition: inline

<b>This is my simple HTML message</b><br /><br />

It goes on to tell of wonderful things you can do in ruby.
MESSAGE_END

Net::SMTP.start('localhost', 25) do |smtp|
  smtp.send_message message, from, to
end
{% endhighlight %}

[1]: https://www.ruby-doc.org/stdlib-2.1.1/libdoc/net/smtp/rdoc/Net/SMTP.html
[2]: https://rubygems.org/
