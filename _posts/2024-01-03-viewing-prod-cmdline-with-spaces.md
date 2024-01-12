---
layout: post
title: "Viewing processes in a running container without ps"
category: posts
---

First we find all of the process ids in
```sh
shopt -s extglob # assuming bash
(cd /proc && echo +([0-9]))
```

Great, we have all of the processes, but how can we view the running command?

```sh
cat /proc/48/cmdline | tr '\000' ' '
```
