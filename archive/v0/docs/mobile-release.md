# Mobile delivery and first playtest response

> Historical or version-scoped record. Original counts, proposals and observations below are retained. For current project state and delivery order, read the [handoff](../HANDOFF.md), [MVP contract](mvp-contract.md) and [roadmap](roadmap.md).

2026-09-07. This follows the [initial MVP record](mvp-status.md). Delivery target: **https://human.adamwhite.work**; private repository: **https://github.com/adam0white/human-framework**. [Release procedure](deployment.md).

## User feedback and concrete response

The user liked seeded repeatability and the design, but found the starting point and action consequences hard to understand. Localhost stopped between sessions. The public release adds an obvious first-choice anchor, numeric action output/effort/duration, short manual and automatic-play instructions, a last-round result summary, and a persistent label for the actual run's seed/model. Staged settings remain distinct from active settings.

Repeated scientific and theological caveats have moved into one collapsed **About this model, its assumptions & limits** section. Useful estimated-success and researcher-view labels remain near their controls. A concise model comparison sits near the selector. The [roadmap](roadmap.md) condenses the source register into the decisions it informs and the mechanisms still unused.

The user asked to keep one single-person game without social effects. **Solo Repair** adds one actor with work, careful work, rest, food and inspection. It has no peer, promise, help action or relationship transition. The original three scenario definitions remain unchanged. Solo stays a control as future social experiments expand.

## Observed playtest

The user reported timing out in Courier Crossing, accumulating fatigue in Repair Bench, and reaching Water Commons' shared target in six rounds. Only the last of these has an inspected replay in this pass.

`/Users/abdul/Downloads/human-framework-commons-seed-7-round-6.json` reconstructs as engine 0.1.0, seed 7, baseline policy, all modules enabled. It is **mixed manual/automatic play**, not a six-round all-baseline benchmark. The user directed Meryem through help, inspect, work, work, help, work; the baseline directed Idris to work in all six rounds. Final progress is 12/12; Meryem's fatigue state is 0.894 and Idris's is 1.0. The original export remains in Downloads and is not a public asset.

This is useful evidence of what the user understood and tried. It motivates clearer outcome/cost feedback and keeping production, time and bodily state visible together. It does not establish a calibrated human fatigue coefficient. Future feedback should identify the first unclear or surprising decision, the expected consequence, and the seed/replay.

## Verification and review

Local browser QA exercised all four scenarios through manual actions, restart and automatic completion; imported the user's existing replay back to the same six-round success; checked person/researcher privacy, staged settings, keyboard action, mobile width and reduced motion. The general notes stayed collapsed and mobile controls had no horizontal overflow. Screenshots include [mobile action controls](../artifacts/mobile-release-controls.png).

Independent deployment review found symlinked source paths could bypass the asset boundary and that the release digest omitted headers. Both were reproduced with failing tests, fixed and rechecked. The release guard now requires clean, pushed `main` before deployment.

Independent UI review found disabled assistance could still claim effective support in its outcome text, and imported help actions with omitted effort did not display the default cost. Both received failing regressions and fixes. The simulation probabilities and update equations remain unchanged. The new solo benchmark retains the full policy's lower output, and its social ablations have identical behavior. See [the benchmark report](benchmark-report.md) for all four settings.

The public deployment is verified at delivery through live HTTP and browser checks, plus equality between the local and public release manifest. The manifest identifies the deployed commit and payload digest; GitHub pushes do not independently auto-deploy.
