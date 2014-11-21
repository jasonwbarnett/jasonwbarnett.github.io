---
layout: post
title: "How to easily get your public / WAN IP address through a public API"
category: posts
---

I've had this desire in the back of my mind to create a simple way
for programmers / devops / sysadmins or whoever, to get their public IP
through an API.

What ended up pushing me over the edge was a requirement at work to
automatically add newly provisioned servers to a Google Cloud SQL
instance, allowing access to one of our MySQL databases.

I knew there were tons of sites out there that could already provide
you with your WAN IP, but they were all HTML based, bulky and slow. I needed
a fast, reliable and lightweight way to get this information.

I started hunting for domain names that would fit what I was going for. The
only thing available at the .com level and made any sense at all was [myjsonip.com][1].

The goal initially was to create a site that would return my public IP in
a JSON object. As I started working on it and moving forward, I decided to
add additional formats. The site now support getting your IP address in JSON,
YAML and XML. Furthermore, I decided to open source the project. You can find
the source code on [github][2]. Enjoy! It's small, simple, versatile and fast.

[1]: http://myjsonip.com/
[2]: https://github.com/jasonwbarnett/myjsonip.com-go

