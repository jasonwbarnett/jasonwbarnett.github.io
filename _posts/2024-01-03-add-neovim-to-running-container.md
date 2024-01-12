---
layout: post
title: "Add NeoVim to Running Pod/Container"
category: posts
---

## [NeoVim][6]

Recently, I had an issue where I was trying to investigate an issue on a running Kubernetes (K8s) pod.
It was a pain because I didn't have root to install additional tools, but I did have curl.

I came up with a quick way to add [NeoVim][6] with curl.

```sh
curl -LO https://github.com/neovim/neovim/releases/download/v0.9.5/nvim.appimage
chmod +x nvim.appimage
./nvim.appimage --appimage-extract
export PATH=$(pwd)/squashfs-root/usr/bin:$PATH
alias vi=nvim
alias vim=nvim
```

After that you can use NoeVim anywhere you'd like.

```
nvim
```

## [fd][1]

Bonus points, this container also didn't have find. I turned to [fd][1] instead.

```sh
curl -LO https://github.com/sharkdp/fd/releases/download/v9.0.0/fd-v9.0.0-x86_64-unknown-linux-gnu.tar.gz
mkdir fd
tar zxvf fd-v9.0.0-x86_64-unknown-linux-gnu.tar.gz --strip-components 1 -C fd
export PATH=$(pwd)/fd:$PATH
```

## [ripgrep][5]

Bonus points, this container had grep, but grep is slow. I turned to [ripgrep][5].

```sh
curl -LO https://github.com/BurntSushi/ripgrep/releases/download/14.0.3/ripgrep-14.0.3-x86_64-unknown-linux-musl.tar.gz
mkdir rg
tar zxvf ripgrep-14.0.3-x86_64-unknown-linux-musl.tar.gz --strip-components 1 -C rg
export PATH=$(pwd)/rg:$PATH
```

## [doggo][7]

```sh
curl -LO https://github.com/mr-karan/doggo/releases/download/v0.5.7/doggo_0.5.7_linux_amd64.tar.gz
mkdir doggo
tar zxvf doggo_0.5.7_linux_amd64.tar.gz -C doggo
export PATH=$(pwd)/doggo:$PATH
```

If you need other runtimes for these programs, check out their project release pages:

- [NeoVim releases][3]
- [fd releases][2]
- [ripgrep releases][4]
- [doggo releases][8]

[1]: https://github.com/sharkdp/fd
[2]: https://github.com/sharkdp/fd/releases
[3]: https://github.com/neovim/neovim/releases
[4]: https://github.com/BurntSushi/ripgrep/releases
[5]: https://github.com/BurntSushi/ripgrep
[6]: https://neovim.io/
[7]: https://github.com/mr-karan/doggo
[8]: https://github.com/mr-karan/doggo/releases
