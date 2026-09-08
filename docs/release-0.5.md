# App 0.5: portable components and continuing work

Date: 2026-09-07. The delivery target is [human.adamwhite.work](https://human.adamwhite.work). The source remains the private `adam0white/human-framework` repository. This record distinguishes this app release from the unchanged laboratory engine 0.3.0 and human component 0.1.0.

## What changed

[Common Ground](https://human.adamwhite.work/commons/) is a continuing cooperative worksite with jobs of different durations, communal resource reservations, staged useful structures and explicit project requests. A player and Meryem can work concurrently. The player can advance to the next event or run the clock; the default pause stops exactly when their job finishes. The initial construction milestone does not end the world. A solo setup is available.

[The last water](https://human.adamwhite.work/courtyard/) now explains the shared ten-minute interval, each person's action slot, the asymmetric cost of different exchanges, Meryem's own-barrel goal, carried versus stored water and estimated capacity risks. New afternoons record optional separate replay history by default. Importing a snapshot never fabricates missing earlier choices. The three supplied courtyard snapshots and courier snapshot are preserved privately with hashes and [analysis](user-run-feedback-2026-09-07.md).

The local `human-framework-runtime` 0.1.0 package exports the existing human API plus the separate clock 0.1.0. A strict seven-file archive contains four authoritative source modules, metadata, source hashes and documentation. It is built with `npm run package:runtime`; it is not published to npm or included on the public website. [Installation and scope](portable-runtime.md).

## Integration evidence

- **229 automated tests pass** in the integrated tree on Node 26.8.1. The fresh reviewer also ran 25 human/clock/package tests on official Node 22.0.0 and Node 26.8.1; the final merged game/package subset passed 5/5 on Node 22.0.0.
- The entire Common Ground host runs in a newly installed offline consumer with repository file access denied. Only its two dependency specifiers change. Its saved result matches the repository host exactly, including resumed concurrent work, task practice and project fulfillment.
- Canonical minute integration preserves exact results across long, one-minute and event-sized advances. Tests cover simultaneous results, resource reservation conflicts, interrupted meals, canceled work, recovered starvation/exhaustion, active-state bounds and 100 continuing caches.
- Existing `src/core`, `src/human`, `src/legacy`, and all previous game simulation modules are unchanged from the 0.4 source `6db8460`. Presentation and replay-recording improvements do not change the courtyard engine or outcomes.
- Two deterministic host approaches complete the initial worksite at 220 versus 226 minutes with two people, and 389 versus 466 minutes alone. Stockpiling leaves more resources and may leave pending jobs at the milestone. These four authored runs are not seed samples or a test of laboratory Full. The [artifact](../artifacts/commons-benchmark.json) regenerates byte-for-byte.

## Reviews and corrections

Three Astra ultra implementation authors worked on isolated branches. Different authors reviewed the courtyard and new host; a fresh fourth Astra ultra reviewer audited the package and integration proof. Two separate Claude `--model fable` design reviews completed successfully from frozen, limited snapshots. [Synthesis and precise scopes](reviews/2026-09-07-ongoing-review.md).

The release fixes invented-output imports, delayed commitment fulfillment during recovery, project release canceling autonomous recovery, Play overshooting its promised pause, unnecessary replacement of action buttons, Node permission-flag compatibility and version mislabeling under an alternate packaging root. Regression and isolated-browser checks cover the relevant fixes.

## Browser and delivery checks

Root exercised the canonical local routes in an isolated Chrome 152 context at 320, 390 and 1280 pixels: visible first actions, concurrent reservations and separate completions, actual save download/import, exact reload, real 4× playback equal to manual advancement, invalid-save preservation, cross-game save isolation and the supplied blocked-pour snapshot. No horizontal overflow, JavaScript errors or failed asset requests occurred. The author's separate browser checks also covered delayed playback, stable action-button identity and the visibility handler. Synthetic visibility tests are not physical-device or native-background timing evidence.

The static build contains 54 files: 52 page/module/style payloads, response headers and a release manifest. The build and pinned Wrangler 4.129.0 deployment dry run pass. The source/manifest/all-payload live check and production browser record are retained in the release verification artifact after publication. User exports, research, private review files and the runtime tarball remain outside the public asset set.

## Scope that remains open

The package carries body/capacity/practice and scheduling, not the laboratory Full action loop or a general social model. Its retained PARAMETERS object includes unused laboratory coefficients, explicitly documented. The [MVP contract](mvp-contract.md) keeps independent player explanation, a host-native stamina/controller comparison, authoring effort, physical-mobile timing, empirical calibration and qualified theological interpretation separate. This release advances the narrow software boundary and responds to concrete play feedback; it does not declare those larger gates complete.
