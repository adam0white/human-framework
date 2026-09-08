# Human Framework handoff

Updated 2026-09-08 after the autonomous app 0.6 milestone. Start here, then [the MVP contract](docs/mvp-contract.md), [roadmap](docs/roadmap.md), [release evidence](docs/release-0.6.md) and [review dispositions](docs/reviews/2026-09-08-autonomous-review.md). Earlier lane branches and release records are provenance, not unfinished tasks.

**Active next stage (hourly continuation begun 06:06 UTC):** [Next-stage plan](docs/superpowers/plans/2026-09-08-next-stage.md). Completed private coordination/body-isolation lanes are integrated on main; `codex/signals-game` is completing Last Light review fixes and comparison. Root owns optional play-note UI and shared release integration. Two fresh Astra reviews and two frozen Fable snapshot reviews are in progress/verification. Finish this stage rather than starting duplicate lanes. Public app is still the 0.6 release below until the new release is verified.

The larger project is an Islam-guided, empirically informed human simulation framework with a Sunni Hanafi–Maturidi starting point. Preserve agency, non-LLM execution and the distinction between revelation, interpretation, empirical findings and authored software. A narrow useful kit and a comprehensive human model have different completion standards.

## Current delivery and contracts

| Scope | Current version / boundary |
|---|---|
| Browser app | **0.6.0**, seven games plus laboratory |
| Laboratory | 0.3.0, `src/core/index.js`; historical 0.1/0.2 replay kernels remain frozen |
| Original five games and Before the rain | Human 0.1.0, `src/human/index.js` |
| Before the Water and installed package | Human/runtime 0.1.1, `src/runtime/index.js` → `src/human/v0.1.1.js` |
| Integer event clock | 0.1.0, `src/runtime/clock.js` |
| Before the rain | Separate host wrapper 0.1.0/save 1; `/commons-next/`; original `/commons/` unchanged |
| Before the Water | Host 0.1.0/save 1; `/watch/`; original headless maintenance/watch consumer unchanged |
| Observation memory | Private `src/cognition/observation-memory.js`, candidate 0.1.0; **not packaged or published** |
| Shared social record | Private `src/social/contracts.js`; **not packaged or published** |

Review on **[human.adamwhite.work/games/](https://human.adamwhite.work/games/)**. Verified app source is **`ac4e54429581e3052f9e7edf40945bad55baa127`**, Worker **`2bd84b4a-ffaa-444b-a38a-dfa05f5825c0`**, public digest **`fff63d891d1cb541900405de3c39810e664894012cac14412bd95d609988d93e`**. [Live byte verification](artifacts/release-0.6/live.json) checks all 62 payloads and 23 private/missing 404s. [Production browser QA](artifacts/release-0.6/production-browser.json) exercises both new games at 320/390/1280 widths. Recheck `/release.json` on resume; later private documentation commits do not imply a new app deployment.

Keep `scripts/runtime-release-lock.json` and its frozen transitive model dependencies unchanged. Human 0.1.1 already fixes capacity-object key order and fractional accumulated-time consistency and explicitly migrates valid 0.1.0 person snapshots. New host behavior must use a declared version/save contract; do not silently swap old imports. [Portable API](docs/portable-runtime.md).

## Completed in this autonomous run

- Hourly heartbeat **`advance-human-framework`** is active on Codex task `01a07f66-d78e-7140-bd9e-b5691a048b2a`. It continues executable work, requests Astra Ultra parallel agents and scoped Fable reviews, and reports meaningful milestones/blockers rather than routine checks. The user explicitly authorized autonomous design, implementation, private commits/pushes and deployment.
- **Before the rain** gives surplus caches household/camp uses and a finite ferry/dusk timeline. Original six-run evidence preserves dominated allocations and a recovery-first missed ferry. A separate supported player sequence earns two caches at 40/88 using a paid partial rest and visible event boundaries. [Game/comparison](docs/commons-next.md) · [Exact successful and nearby failed sequences](docs/commons-next-two-cache-probe.md).
- **Before the Water** makes repairs, lookout, owned parts, transfers and diversion playable. A short-notice gate repair succeeds with three paid rest minutes; the fixed six-minute rest route fails. Preserve both. A forged arrival-order import and misleading outcome copy were fixed and independently rechecked. [Game and routes](docs/watch-game.md).
- **Mechanism comparison:** preregistered common schedules, paid matched retests and frozen reserved/sensitivity runs compare Human against pooled stamina plus linear practice counters. The smaller rival meets stated tolerance in 9/21 pairs. Separate food/fatigue bottlenecks matter in chosen conditions; the learning half tests curve shape, not additional faculties. Source/validation/state-size confounds are explicit. [Report](docs/mechanism-comparison.md).
- **Memory candidate:** actor-owned reports, provenance, bounded retention, increasing receipts and JSON resume are executable. Fixed cases score candidate/notebook/no-retention 10/12/8 out of 14. A 10,000-report check bounds candidate state at 372 bytes while the unbounded notebook retains far more information. Keep it private; this earns no superiority or human-memory claim. [Report and review corrections](docs/observation-memory-probe.md).
- **347 tests** pass on Node 26.8.1; deployment repeats that suite, and all 67 new tests pass on minimum Node 22.0.0. Two fresh Astra reviewers audited later code and two independent Fable 5.1 processes inspected frozen designs/memory source, with exact scope recorded. No public runtime formula or historical engine changed. [Review record](docs/reviews/2026-09-08-autonomous-review.md).

Three completed new branches are pushed: `codex/commons-next`, `codex/mechanism-rival`, `codex/watch-playable`. Main contains their cherry-picked work. Preserve original preregistration/freeze commits (`904b7e4`, `3e60c00`) because experiment verification reads their bytes. The earlier ten lane branches/worktrees remain historical evidence; the old `commons-clock` worktree's untracked dependency copy was already recorded in the previous handoff and is not new pending work. Do not delete unrelated worktrees.

## Next executable milestones

1. **Thin host coordination experiment.** Compare direct attempt/clock wiring in Watch and another existing host with a private helper. Predeclare how many host obligations/exception paths should disappear; preserve reservations, actual paid time, interruption, arrival precedence, refusal and duplicate receipts. Add no body shadow-state or world rules. Promote only if two hosts become simpler without new exceptions; otherwise retain the negative result and direct wiring.
2. **One changing-evidence game.** Design a deceptively simple delayed/changing-report task with paid observation, at least two feasible routes and consequences that depend on what the actor actually experienced. Compare a task-keyed notebook, the bounded memory candidate and memory-free behavior with identical access/cost. A generic memory module is optional: choose the smaller representation if it suffices. Make provenance or bounded retrieval earn a real authoring/player benefit before packaging.
3. **Competing obligations after Watch.** A second site, service request or later task could give retained parts/capacity an actual use. Specify a concrete competing use before adding waves, a longer quota or campaign state. Preserve the current episode and the clever interrupted-rest solutions as controls.
4. **Separate body structure from practice shape.** If the mechanism choice matters to a new consumer, compare pooled stamina with the same saturating skill update against two-channel Human. Do not infer learning complexity from the existing capped-linear rival. This is a new protocol/arm, not a revision of the frozen evidence.
5. Advance actual user play feedback and the five-person/four-explanations gate when real responses exist. Optional local exportable playtest feedback can help collect future evidence; never manufacture human participants or send messages to people without authorization. Physical-device timing, measured human authoring benefit, empirical calibration and qualified theological review remain open.

The previous minute-1,312 player save remains private and byte-preserved at `artifacts/user-runs/2026-09-07`; its snapshot did not establish why late play was less interesting. [Original analysis](docs/common-ground-feedback-2026-09-07.md). New games have not yet received a user verdict. General attention, affect, habits, broad planning, physiology and macro models remain in the coverage/decision registers; promote one mechanism in response to a discriminating task, not a list of names.

## Reproduction and release

Use Node >=22. Here `/opt/homebrew/bin/node` is 26.8.1; prefix `PATH=/opt/homebrew/bin:$PATH` to avoid an older login-shell NVM binary. `npm ci` installs only pinned deployment tooling. Runtime execution has no third-party simulation dependency.

```sh
PATH=/opt/homebrew/bin:$PATH npm test
PATH=/opt/homebrew/bin:$PATH npm run package:runtime
node scripts/commons-next-comparison.js /tmp/commons-next-new.json
node artifacts/commons-next/two-cache-ferry-probe.mjs /tmp/two-cache-new.json
node scripts/watch-evidence.js /tmp/watch-routes-new.json
node scripts/observation-memory-probe.js /tmp/memory-new.json
node scripts/mechanism-comparison.js run --partition reserved --freeze artifacts/mechanism-comparison/freeze.json --out /tmp/mechanism-reserved-new.json
```

Use fresh output paths; retained artifacts are immutable evidence. Follow [AGENTS.md](AGENTS.md) and [deployment workflow](docs/deployment.md): review, test, push main, `npm run deploy`, verify exact live manifest/payloads and browser behavior. Keep Solo Repair socially isolated. Public build is allowlisted; cognition/rivals/research/reviews/player exports remain private. For documentation-only handoffs, keep the deployed app commit separate from newer source HEAD and do not redeploy merely for an evidence document. Strict `verify:live` requires source/build/pushed/live identity and intentionally rejects that later documentation-only mismatch. A fresh `git -c core.fsmonitor=false status --short` can reveal new evidence files if the filesystem monitor's untracked cache is stale.
