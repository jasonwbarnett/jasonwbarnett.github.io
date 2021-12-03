---
layout: post
title: "Chef Infra Client: Unified Mode (unified_mode)"
category: posts
---

Chef is transforming the way a chef-client run is executed. Historically there have been [two main phases (compile and converge)][1]. This will no longer be the case in Chef Infra Client 18. Technically there will still be a compile and converge phase, but these happen one after the other for each resource. For example:

```ruby
directory "/tmp" do
  owner "root"
  group "root"
  mode "1777"
end

directory "/tmp/sub-dir" do
  owner "root"
  group "root"
  mode "0755"
end
```

[1]: https://coderanger.net/two-pass/
