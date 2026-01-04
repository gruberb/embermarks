# Embermarks

A Firefox extension that surfaces your forgotten bookmarks — the ones you saved but never visit.

## Installation

### From Firefox Add-ons (recommended)

[Install from AMO](https://addons.mozilla.org/firefox/addon/embermarks/)

### Manual Install

Download the latest `.xpi` from [Releases](https://github.com/gruberb/embermarks/releases) and drag it into Firefox.

## Features

- **Discover forgotten bookmarks** — Shows bookmarks you've rarely or never visited
- **Configurable criteria** — Set maximum visit count and minimum age for "forgotten" status
- **Exclude folders** — Keep certain bookmark folders out of suggestions
- **Quick actions** — Visit, skip, or delete bookmarks directly from the popup

## Building from Source

```sh
git clone https://github.com/gruberb/embermarks.git
cd embermarks
npx web-ext build
```

The extension will be built to `web-ext-artifacts/`.

To run in development mode:

```sh
npx web-ext run
```

## License

Mozilla Public License Version 2.0
