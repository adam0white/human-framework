# Human Framework handoff

Updated 2026-09-14 for the approved focused manual resumption. Read this file, the [current milestone delivery](docs/connected-person.md), the [MVP contract](docs/mvp-contract.md) and the [roadmap](docs/roadmap.md). [Direct approval](docs/direction-2026-09-14.md) supersedes the earlier absence of a selected implementation milestone.

## Direction

The framework is the product: a reusable account of situated human action and development, including cognition, purposes, relationships, moral/spiritual life and aging. It is Islam-guided, with a Sunni Hanafi–Maturidi starting point, and empirically informed. Distinguish revelation, interpretation, empirical findings and engineering rules. Do not equate software correctness with a validated human model.

The user approved the connected-person milestone and asked for progress without excessive caution or small-task drift. The lead owns routine decisions, bounded delegation, integration and delivery. The user subsequently requested the focused Three moments showcase at `/person/`; that delivery is authorized. Older game queues remain set aside and the scheduled task stays paused.

## Current framework milestone

Situated-person **0.1.0** is a new candidate composing the unchanged Human **0.1.1** component. It carries attributed boolean knowledge, explicit purpose states, understood commitment terms/status/revision and context-specific interaction evidence. A common deterministic rule interface returns attempted choices and executed evidence; external choices can override the baseline. Hosts own canonical outcomes and provide verified fulfillment receipts.

Three adults cross learning, household responsibility and collaboration over dated episodes spanning fourteen days. Instruction changes the attempted method and output; an accepted responsibility changes delivery choices; a communicated breach changes later coordination and the colleague's response. Revised terms change the delivery location. The sequence preserves actor-specific information and survives save/restore and segmented clock advancement.

The [framework delivery report](docs/connected-person.md) explains scope, APIs and evidence. [App 0.15](docs/release-0.15.md) adds a tiny interactive Three moments simulation with three player choices, carried consequences and one-experience replays. The [comparison](artifacts/connected-person/comparison.json) includes eight scenarios; the smaller direct notebook baseline matches their actions and world outcomes. The independent asynchronous lending consumer installs the private tarball with repository access denied. This establishes bounded portable software behavior, not psychological calibration or measured human authoring savings.

## What remains missing

Purposes and policy priorities are authored. Facts are latest attributed boolean assertions; there is no general belief revision, source reliability, memory decay, planning or automatic purpose development. Interaction records are not a model of attachment or trust. Fourteen days are dated episodes: body state changes only during modeled activity, with no overnight physiology or recovery. The learner executes thirty activity minutes. Emotion, positive moral/spiritual modeling, lifespan development and broader institutions remain open.

The next recommended substantial milestone is continuous daily condition and retained learning within these same connected situations, with obligations and relationships present. It should connect episodes without returning to game polish or isolated mechanism churn. Later scope is not automatically selected by this recommendation.

## Source and public delivery

| Scope | Identity |
|---|---|
| Repository | Private `adam0white/human-framework`; `main` is the integration branch |
| New private candidate | situated-person 0.1.0, implementation `87645ea1fb4eb8a9ea20b3928a9e6933f339f1a3`; subsequent handoff-only commits may follow |
| Existing selected package | Human/runtime 0.1.1; integer clock 0.1.0, unchanged |
| Public browser app | 0.15.0, featuring Three moments at `/person/` |
| Previous deployed app source (0.14.1) | `235d2e6c077df1a68c508091f54c673391e3a88f` |
| Previous public payload digest (0.14.1) | `671311ad92bedce24376e84ebe8264cf7fddb8cc70af9fb024a61b86a8bce48b` |
| Schedule | `advance-human-framework`, paused |

Public review site: [human.adamwhite.work](https://human.adamwhite.work). App 0.15 production verification will replace the previous deployment identity above after deployment. Private-source commits do not require redeployment when the allowlisted public payload is unchanged. [Deployment workflow](docs/deployment.md).

## Reproduce and verify

Use Node >=22. On this machine put `/opt/homebrew/bin` first on PATH.

```sh
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
