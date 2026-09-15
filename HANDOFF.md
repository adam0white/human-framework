# Human Framework handoff

Updated 2026-09-14 after sequential belief-revision and bounded-planning delivery. Read this file, the [current milestone delivery](docs/connected-person.md), the [MVP contract](docs/mvp-contract.md) and the [roadmap](docs/roadmap.md). [Direct approval](docs/direction-2026-09-14.md) supersedes the earlier absence of a selected implementation milestone.

## Direction

The framework is the product: a reusable account of situated human action and development, including cognition, purposes, relationships, moral/spiritual life and aging. It is Islam-guided, with a Sunni Hanafi–Maturidi starting point, and empirically informed. Distinguish revelation, interpretation, empirical findings and engineering rules. Do not equate software correctness with a validated human model.

The user approved the connected-person milestone and asked for progress without excessive caution or small-task drift. The lead owns routine decisions, bounded delegation, integration and delivery. Three moments at `/person/` is complete. The user then requested substantial autonomous progress on remaining framework capabilities before another game. The sustained-person delivery integrates continuous days, retained learning, ongoing duties and independent reuse. The user then authorized multiple gaps in sequence; the deliberating-person delivery adds evidence-sensitive belief revision followed by bounded planning. Games are deferred; the scheduled task stays paused.

## Current framework milestone

The [deliberating-person delivery](docs/deliberating-person.md) completes two subsequent software gaps: an actor-bound evidence ledger with conflict, stale delivery, expiry, correction/retraction and origin deduplication; then bounded symbolic planning across authored purposes, resources and deadlines. Actual failures deliver evidence and cause replanning; plans cannot fulfill obligations. The separate private package is exercised by a reference delivery host and an independently installed community-session consumer. [Evidence](artifacts/deliberating-person/verification.json) records 966 passing tests, 21 comparison runs, independent installed reuse and source identities. Direct purpose-aware control retains parity; these are authored candidates, not calibrated general cognition.

### Sustained-person foundation

The [sustained-person delivery](docs/sustained-person.md) adds private candidate **0.1.0** over the unchanged components below. It synchronizes awake/sleep intervals, paid actions and retained learning, preserves actor-local purposes and obligations, and packages the combination for independent installation. A fourteen-day reference and a separately authored seven-day library consumer exercise it. [Verification](artifacts/sustained-person/verification.json) records 939 passing tests, package/source hashes and preserved public identity. All modeled time is accounted for; the body has one update owner per interval. Retained access can change a later method or incur a paid consultation, without erasing the original instruction record.

### Earlier connected-person foundation

Situated-person **0.1.0** is a new candidate composing the unchanged Human **0.1.1** component. It carries attributed boolean knowledge, explicit purpose states, understood commitment terms/status/revision and context-specific interaction evidence. A common deterministic rule interface returns attempted choices and executed evidence; external choices can override the baseline. Hosts own canonical outcomes and provide verified fulfillment receipts.

Three adults cross learning, household responsibility and collaboration over dated episodes spanning fourteen days. Instruction changes the attempted method and output; an accepted responsibility changes delivery choices; a communicated breach changes later coordination and the colleague's response. Revised terms change the delivery location. The sequence preserves actor-specific information and survives save/restore and segmented clock advancement.

The [framework delivery report](docs/connected-person.md) explains scope, APIs and evidence. [App 0.15](docs/release-0.15.md) adds a tiny interactive Three moments simulation with three player choices, carried consequences and one-experience replays. The [comparison](artifacts/connected-person/comparison.json) includes eight scenarios; the smaller direct notebook baseline matches their actions and world outcomes. The independent asynchronous lending consumer installs the private tarball with repository access denied. This establishes bounded portable software behavior, not psychological calibration or measured human authoring savings.

## What remains missing

Purposes and policy priorities are authored. The original situated facts remain latest attributed boolean assertions. A separate evidence ledger now resolves delivered reports conservatively, and bounded planning uses explicit purpose priorities. Learned source reliability, probabilistic belief revision, general episodic memory, long-horizon planning and automatic purpose development remain open. The new candidate adds item-specific retained access and delay under authored parameters. Interaction records are not a model of attachment or trust. The original connected-person reference covers dated episodes and thirty learner activity minutes. The sustained-person reference now covers continuous days with explicit awake/sleep recovery and meals; it does not model calibrated sleep physiology, circadian rhythms or sleep debt. Emotion, positive moral/spiritual modeling, lifespan development and broader institutions remain open.

The next substantial work is relationships beyond agreement records, positive sourced duty/repair representation, and a defined adult development trajectory, alongside empirical and qualified interpretive evaluation. Carry forward the simpler alternatives and the distinction between software behavior and validity. Further games should wait for substantial framework progress.

## Source and public delivery

| Scope | Identity |
|---|---|
| Repository | Private `adam0white/human-framework`; `main` is the integration branch |
| Connected-person foundation | situated-person 0.1.0, implementation `87645ea1fb4eb8a9ea20b3928a9e6933f339f1a3`; subsequent handoff-only commits may follow |
| Sustained candidate | sustained-person 0.1.0; source and test identities in `artifacts/sustained-person/verification.json` |
| Deliberating candidate | deliberating-person 0.1.0; source and tests in `artifacts/deliberating-person/verification.json` |
| Existing selected package | Human/runtime 0.1.1; integer clock 0.1.0, unchanged |
| Public browser app | 0.15.0, featuring Three moments at `/person/` |
| Deployed app source | `de52d9c95e89dc25e163fca773fec2269b8b06a4` |
| Public payload digest | `3138fa05c3a061adb922423932849c0630a14559b05858b7b3ed895143ff15b4` |
| Schedule | `advance-human-framework`, paused |

Public review site: [human.adamwhite.work](https://human.adamwhite.work). App 0.15 production verification matched all 76 public payloads and 88 private/missing 404 checks to this app commit. Desktop/mobile interaction and replay passed. Subsequent private evidence commits may be newer than the deployed app commit. Private-source commits do not require redeployment when the allowlisted public payload is unchanged. [Deployment workflow](docs/deployment.md).

The [showcase release evidence](artifacts/release-0.15/verification.json) records 912 passing tests, production verification and browser checks.

## Reproduce and verify

Use Node >=22. On this machine put `/opt/homebrew/bin` first on PATH.

```sh
node --test tests/cognition-beliefs.test.js tests/cognition-planner.test.js tests/deliberation-sequence.test.js tests/deliberating-consumer.test.js
node scripts/run-deliberating-person.js /tmp/deliberating-review
node scripts/package-deliberating-person.js /tmp/deliberating-package
node --test tests/development-*.test.js tests/sustained-*.test.js
node scripts/run-sustained-person.js /tmp/sustained-person-review
node scripts/package-sustained-person.js /tmp/sustained-package
node --test tests/situated-person.test.js tests/person-commitments.test.js tests/connected-person.test.js tests/person-consumer.test.js
node scripts/run-connected-person.js /tmp/connected-person-review
node scripts/package-person.js /tmp/situated-person-package
npm test
npm run package:runtime
```

[Verification record](artifacts/connected-person/verification.json) records final results and source hashes. [Review disposition](docs/reviews/2026-09-14-connected-person.md) distinguishes fixed findings from rejected recommendations. The [execution plan](docs/superpowers/plans/2026-09-14-connected-person.md) records the interface and implementation decisions; [approved design](docs/plans/2026-09-14-focused-framework-milestone.md) records the selected scope.

Preserve released source bytes and `scripts/runtime-release-lock.json`. The two candidate person modules now support the selected public showcase; private research, comparison artifacts and package tooling remain outside the asset allowlist. Keep the actor loop independent of LLMs and UI. One authoritative owner per causal state; world truth reaches actors only through observations. Each substantial task must identify the missing capability and the acceptance check it serves. Stop completed milestones rather than automatically extending them with refinements.

## Historical evidence

The earlier private documentation baseline is `cdde1285afe4d61ae972c48a77617148d2f11f29`, following implementation/evidence baseline `45e95b5a16158a5f5a1bf12c0151ac6436270aa7`. It recorded 871 passing repository tests. The [earlier direction](docs/direction-2026-09-09.md), [historical handoff](docs/history/handoff-through-2026-09-09.md), and [historical roadmap](docs/history/roadmap-through-2026-09-09.md) remain provenance, not the current queue.

Camp reconsideration, practice incentives, meal preflight, action offers, the empirical learning pilot, actor-local information studies and paid-work comparisons remain complete. Preserve their negative findings and source attribution. Do not rerun or expand them merely to keep activity moving. The empirical pilot did not establish a universal learning curve; successful software replay is not independent human evidence. Private research remains separate from public assets.
