---
layout: post
title: "Tip of the day: Removing files in linux when the filename starts with a hyphen (-)"
category: posts
---

I kept running into the following problem:

    $ \rm -i *.zip
    rm: invalid option -- 't'
    Try 'rm ./-thevoice-amway-com.zip' to remove the file ‘-thevoice-amway-com.zip’.
    Try 'rm --help' for more information.

I've been using the `rm` command for over 5 years and I had never run into this
issue. At first glance I had no idea what was going on.  I initially started
looking to see if maybe rm was actually an alias or function... both `type rm`
and `declare -f rm` revealed nothing.  I decided to try looking at `rm --help`
and boom, I found it.

    To remove a file whose name starts with a '-', for example '-foo',
    use one of these commands:
      rm -- -foo

      rm ./-foo

I was able to finally get things rolling by using the following:

    \rm -i -- *.zip

P.S. I did mean to use `\rm` instead of `rm`. For those of you who don't know,
prefixing a command with a backslash temporarily disables the alias if one
exists.  This is extremely helpful if you have `rm` aliased to `rm -f` or
something like that.
