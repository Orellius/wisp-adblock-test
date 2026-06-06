<div align="center">

<img src="src/assets/wisp_app_icon.png" alt="Wisp" width="96" height="96" />

# Wisp AdBlock Test

**The privacy test built into the Wisp browser.**
One screen, speed-test style: how much of the ad/tracker surface does your blocker actually catch?

[![Live](https://img.shields.io/badge/live-orellius.github.io%2Fwisp--adblock--test-4d9fec?style=flat-square)](https://orellius.github.io/wisp-adblock-test/)
[![License](https://img.shields.io/badge/license-CC--BY--NC--SA%204.0-56b366?style=flat-square)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![Lineage](https://img.shields.io/badge/continuation%20of-Turtlecute33%2Fadblocktest-475569?style=flat-square)](https://github.com/Turtlecute33/adblocktest)

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

## Lineage, credits & license

This repository is an **independent continuation** of [Turtlecute33/adblocktest](https://github.com/Turtlecute33/adblocktest), itself a fork of [d3ward/toolz](https://github.com/d3ward/toolz). It was detached from the fork network in June 2026 and is maintained by Wisp as part of the Wisp browser project; it is not affiliated with or endorsed by the original authors.

**The original work and its design belong to the OG creators**: [d3ward](https://github.com/d3ward), [Turtlecute](https://github.com/Turtlecute33), and Daniela Brozzoni. Wisp's changes on top: one-screen redesign, three-state scoring, redirect-defusal detection, list liveness CI, rebrand.

The adopted history is squashed into a single import commit; the complete original history, with every contributor's commits intact, lives on the [`upstream-history`](https://github.com/Orellius/wisp-adblock-test/tree/upstream-history) tag and in the upstream repository.

Licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), as inherited from upstream: attribution preserved, non-commercial, share-alike.

---

<div align="center">

### Original contributors

*This project stands on the shoulders of the people who built `toolz` and `adblocktest`. Thank you.*

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/d3ward"><img src="https://github.com/d3ward.png?size=144" width="72" alt="d3ward"/><br/><b>d3ward</b></a><br/><sub>created toolz, the original test</sub>
    </td>
    <td align="center">
      <a href="https://github.com/Turtlecute33"><img src="https://github.com/Turtlecute33.png?size=144" width="72" alt="Turtlecute"/><br/><b>Turtlecute</b></a><br/><sub>authored &amp; maintained adblocktest</sub>
    </td>
    <td align="center">
      <a href="https://github.com/danielabrozzoni"><img src="https://github.com/danielabrozzoni.png?size=144" width="72" alt="Daniela Brozzoni"/><br/><b>Daniela Brozzoni</b></a><br/><sub>core contributor</sub>
    </td>
  </tr>
</table>

<table>
  <tr>
    <td align="center"><a href="https://github.com/hagezi"><img src="https://github.com/hagezi.png?size=112" width="48" alt="hagezi"/><br/><sub><b>hagezi</b></sub></a></td>
    <td align="center"><a href="https://github.com/ryanbr"><img src="https://github.com/ryanbr.png?size=112" width="48" alt="fanboynz"/><br/><sub><b>fanboynz</b></sub></a></td>
    <td align="center"><a href="https://github.com/TheMonDon"><img src="https://github.com/TheMonDon.png?size=112" width="48" alt="TheMonDon"/><br/><sub><b>TheMonDon</b></sub></a></td>
    <td align="center"><a href="https://github.com/bongochong"><img src="https://github.com/bongochong.png?size=112" width="48" alt="Chon Bongo"/><br/><sub><b>Chon Bongo</b></sub></a></td>
  </tr>
</table>

<sub>…and <b>Federico Pedemonte</b>, <b>raizo</b>, <b>GregT</b>, <b>Dustin</b>, <b>CoderMonkey1956</b> — every original commit preserved on the <a href="https://github.com/Orellius/wisp-adblock-test/tree/upstream-history"><code>upstream-history</code></a> tag.</sub>

</div>
