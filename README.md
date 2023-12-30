# [My personal blog](https://www.knowitnot.com)

Deployable on Github Pages

Dependencies: bundler, npm, imagemagick

## Setup

```bash
bundle
npm install grunt-cli bower
npm install
bower install
```

## Watch

```bash
foreman start -f Procfile.dev
```

## Update assets

```bash
bower update
grunt
```
