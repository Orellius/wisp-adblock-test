<div align="center">

<img src="src/assets/wisp_app_icon.png" alt="Wisp" width="96" height="96" />

# Wisp AdBlock Test

**The privacy test built into the Wisp browser.**
One screen, speed-test style: how much of the ad/tracker surface does your blocker actually catch?

[![Live](https://img.shields.io/badge/live-orellius.github.io%2Fwisp--adblock--test-4d9fec?style=flat-square)](https://orellius.github.io/wisp-adblock-test/)
[![License](https://img.shields.io/badge/license-CC--BY--NC--SA%204.0-56b366?style=flat-square)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![Based on](https://img.shields.io/badge/based%20on-Turtlecute33%2Fadblocktest-475569?style=flat-square)](https://github.com/Turtlecute33/adblocktest)

</div>

---

## What it does

The page runs three families of checks against your browser, blocker extension, DNS filter, or VPN. No real ads load and no trackers activate; everything is bait.

| Check | How | What it measures |
|---|---|---|
| **Host blocking** (127 hosts) | `HEAD` probe to known ad/analytics/tracker/OEM hostnames | Domain-level blocking (DNS filters, hosts files, filter lists) |
| **Cosmetic filter** (2) | Bait elements with ad-classnames, measured for hiding | Generic element-hiding capability |
| **Ad script loading** (2) | Same-origin bait scripts named like ad SDKs | Path-pattern script blocking |

Results render as a liquid gauge plus a live tile per category. Click a tile for the per-host breakdown; results history, logs, and settings live in the footer.

## How scoring works (and its honest limits)

A probe ends in one of **three** states, not two:

- **Blocked**: the request errored (filter list, DNS hole), *or* it was answered locally in under 5 ms with zero bytes transferred, which is the signature of a redirect-style rule (uBO `redirect=`) neutering the request.
- **Not blocked**: a real network response came back.
- **Unreachable**: the host never answered before the timeout. These are *excluded from the percentage*; a dead domain or a slow network is not your blocker's achievement. They show gray in the breakdown.

Known limits, on purpose:

- `HEAD /fakepage.html` exercises **domain-level** rules. Path-pattern filters (`*/pagead/*` and friends) won't match it; the two script checks cover that gap narrowly.
- Cosmetic and script checks only fire if your blocker applies **generic** rules on unknown domains. Failing them doesn't mean those features are broken elsewhere (the FAQ on the page explains the rules to add).
- A score is a snapshot of one network, one moment. Re-test before drawing conclusions.

## Keeping the bait list honest

Dead bait domains silently inflate everyone's score, so a [weekly GitHub Action](.github/workflows/liveness.yml) probes every host twice from a clean runner and opens a pruning PR when domains die (`src/script/check_hosts.mjs`). Timeouts are flagged but never auto-pruned.

The host list also ships as blocklist files: [`d3host.txt`](src/d3host.txt) (hosts format) and [`d3host.adblock`](src/d3host.adblock) (adblock format), regenerated from [`adblock_data.json`](src/data/adblock_data.json) via `npm run build-list`.

## Wisp integration

This page is designed to be served at **`wisp://privacy-test`** inside the Wisp browser (URL rewrite with a virtual URL, the `chrome://newtab` mechanism). Every asset path is relative and there are zero third-party requests at rest: fonts are self-hosted, no analytics, no sponsor scripts. The page behaves identically from GitHub Pages, a local server, or a browser-internal scheme, and never trips the very blockers it measures.

## Develop

```sh
npm ci
npm run dev          # local dev server
npm run build        # production build -> dist/
npm run purge        # strip unused CSS from dist/
npm run build-list   # regenerate d3host.* from adblock_data.json
node src/script/check_hosts.mjs          # liveness report
node src/script/check_hosts.mjs --prune  # also prune confirmed-dead hosts
```

Pushing to `master` deploys to GitHub Pages via [`deploy.yml`](.github/workflows/deploy.yml).

## Credits & license

Based on [Turtlecute33/adblocktest](https://github.com/Turtlecute33/adblocktest), itself a fork of [d3ward/toolz](https://github.com/d3ward/toolz) (with Daniela Brozzoni). Reworked by Wisp: one-screen redesign, three-state scoring, redirect-defusal detection, list liveness CI, rebrand.

Licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/): attribution preserved, non-commercial, share-alike.
