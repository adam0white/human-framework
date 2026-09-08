# Human Framework handoff

Updated 2026-09-08 after the hourly app 0.7 milestone. Start here, then [the MVP contract](docs/mvp-contract.md), [roadmap](docs/roadmap.md), [release evidence](docs/release-0.7.md) and [review dispositions](docs/reviews/2026-09-08-next-review.md). Earlier lane branches and release records are provenance, not unfinished tasks.

**Active 0.8 release integration:** [Service Day plan](docs/superpowers/plans/2026-09-08-service-day.md). Core, UI, frozen comparison and build guard are integrated on main. The three implementation lanes are complete; independent review fixes and final browser/release checks are underway. Do not restart those lanes or treat the next queue's Service Day entry as unstarted. Current deployed app remains 0.7 until exact 0.8 verification is recorded.

The larger project is an Islam-guided, empirically informed human simulation framework with a Sunni Hanafi–Maturidi starting point. Preserve agency, non-LLM execution and the distinction between revelation, interpretation, empirical findings and authored software. A narrow useful kit and a comprehensive human model have different completion standards.

## Current delivery and contracts

| Scope | Current version / boundary |
|---|---|
| Browser app | **0.7.0**, eight games plus laboratory |
| Laboratory | 0.3.0, `src/core/index.js`; historical 0.1/0.2 replay kernels remain frozen |
| Original five games and Before the rain | Human 0.1.0, `src/human/index.js` |
| Before the Water, Last Light and installed package | Human/runtime 0.1.1, `src/runtime/index.js` → `src/human/v0.1.1.js` |
| Integer event clock | 0.1.0, `src/runtime/clock.js` |
| Before the rain | Separate host wrapper 0.1.0/save 1; `/commons-next/`; original `/commons/` unchanged |
| Before the Water | Host 0.1.0/save 1; `/watch/`; original headless maintenance/watch consumer unchanged |
| Last Light | Host 0.1.0/save 1; `/signals/`; seven authored situations, timestamped notebook, paid radio/lookout/recovery |
| Play notes | Optional local form in Watch/rain/Last Light; user words + bounded public summary, no assessment or full save |
| Coordination helper | Private `src/coordination/attempt-clock.js`; negative inclusive-size result, **not packaged or published** |
| Observation memory | Private `src/cognition/observation-memory.js`, candidate 0.1.0; **not packaged or published** |
| Shared social record | Private `src/social/contracts.js`; **not packaged or published** |

Review on **[human.adamwhite.work/games/](https://human.adamwhite.work/games/)**. Verified app source is **`fa16e743feeaee8a9623c1f8da60082a9222c9f2`**, Worker **`2636b9a0-16fb-45fe-89ad-bf2ea9bc865c`**, public digest **`980d4f7dba80e535ff64d432e549186007f8e7f7c70e2954d95063ebd3affd3e`**. [Live byte verification](artifacts/release-0.7/live.json) checks all 69 payloads and 26 private/missing 404s. [Production browser QA](artifacts/release-0.7/production-signals-browser.json) exercises all seven Last Light situations at 320/390/1280 widths; existing-game and note checks are in the release record. Recheck `/release.json` on resume; later private documentation commits do not imply a new app deployment.

Keep `scripts/runtime-release-lock.json` and its frozen transitive model dependencies unchanged. Human 0.1.1 already fixes capacity-object key order and fractional accumulated-time consistency and explicitly migrates valid 0.1.0 person snapshots. New host behavior must use a declared version/save contract; do not silently swap old imports. [Portable API](docs/portable-runtime.md).

## Latest completed milestone: 0.7

- **Last Light** makes paid radio/lookout, stale delivery ordering and route/service timing playable. Separate clear/tired/hungry profiles make radio latency and food/rest choices consequential while every field of the original twelve-case result remains exact. Notebook/candidate/no-retention deliver 11/10/10 of twelve cases; always-ridge and blind-canal baselines remain. [Game](docs/signals-game.md) · [Profiles](docs/signals-profiles.md).
- **Optional play notes** in Watch/rain/Last Light collect words and bounded public context only when the player downloads. No identity, grading, hidden truth, automatic upload or full save; all browser fixtures are synthetic and not human evidence. [Contract](docs/play-notes.md).
- **Coordination helper:** exact paired state/save parity across 2,754 commands and 10,000 events, but inclusive source grows 510 bytes/21 nonblank lines after identity-guard hardening. Keep direct wiring. Both original and reviewed measurements remain. [Report](docs/coordination-probe.md).
- **Body isolation:** the pooled model now uses the identical saturating practice update and one proficiency per skill. 13/25 diagnostic pairs meet authored tolerance. Opposite food/rest needs are a constructed two-channel distinction, not human validation. The 1,389 equal-exposure checks are disaggregated: 702 zero-exposure, 249 immediately after shared practice, 438 retained positive-exposure checks. [Report](docs/body-isolation.md).
- **421 tests pass** on Node 26.8.1; all 74 tests added this stage pass on Node 22.0.0. Production browser checks pass for all Last Light profiles, previous Watch/rain flows, save/export/import, capped-save continuation, stale reports and synthetic notes. Review-fixed defects and scoped Fable/Astra evidence are in [the new review record](docs/reviews/2026-09-08-next-review.md). Runtime/model/clock locks remain unchanged.

The three new branches `codex/coordination-probe`, `codex/body-isolation`, `codex/signals-game` are completed and pushed. Preserve coordination protocol/implementation `07907e0`/`5e2ea2d`, reviewed helper `09cdc80`, body protocol/implementation `780d20d`/`f8e146f`, Signals protocol `1f8b2f8` and profile amendment `e2c9ce7`; evidence runners read those original Git bytes. Root presentation/setup fixes are on main. They do not imply an open lane.

## Earlier 0.6 milestone (historical evidence)

- Hourly heartbeat **`advance-human-framework`** is active on Codex task `01a07f66-d78e-7140-bd9e-b5691a048b2a`. It continues executable work, requests Astra Ultra parallel agents and scoped Fable reviews, and reports meaningful milestones/blockers rather than routine checks. The user explicitly authorized autonomous design, implementation, private commits/pushes and deployment.
- **Before the rain** gives surplus caches household/camp uses and a finite ferry/dusk timeline. Original six-run evidence preserves dominated allocations and a recovery-first missed ferry. A separate supported player sequence earns two caches at 40/88 using a paid partial rest and visible event boundaries. [Game/comparison](docs/commons-next.md) · [Exact successful and nearby failed sequences](docs/commons-next-two-cache-probe.md).
- **Before the Water** makes repairs, lookout, owned parts, transfers and diversion playable. A short-notice gate repair succeeds with three paid rest minutes; the fixed six-minute rest route fails. Preserve both. A forged arrival-order import and misleading outcome copy were fixed and independently rechecked. [Game and routes](docs/watch-game.md).
- **Mechanism comparison:** preregistered common schedules, paid matched retests and frozen reserved/sensitivity runs compare Human against pooled stamina plus linear practice counters. The smaller rival meets stated tolerance in 9/21 pairs. Separate food/fatigue bottlenecks matter in chosen conditions; the learning half tests curve shape, not additional faculties. Source/validation/state-size confounds are explicit. [Report](docs/mechanism-comparison.md).
- **Memory candidate:** actor-owned reports, provenance, bounded retention, increasing receipts and JSON resume are executable. Fixed cases score candidate/notebook/no-retention 10/12/8 out of 14. A 10,000-report check bounds candidate state at 372 bytes while the unbounded notebook retains far more information. Keep it private; this earns no superiority or human-memory claim. [Report and review corrections](docs/observation-memory-probe.md).
- **347 tests** pass on Node 26.8.1; deployment repeats that suite, and all 67 new tests pass on minimum Node 22.0.0. Two fresh Astra reviewers audited later code and two independent Fable 5.1 processes inspected frozen designs/memory source, with exact scope recorded. No public runtime formula or historical engine changed. [Review record](docs/reviews/2026-09-08-autonomous-review.md).

Three completed new branches are pushed: `codex/commons-next`, `codex/mechanism-rival`, `codex/watch-playable`. Main contains their cherry-picked work. Preserve original preregistration/freeze commits (`904b7e4`, `3e60c00`) because experiment verification reads their bytes. The earlier ten lane branches/worktrees remain historical evidence; the old `commons-clock` worktree's untracked dependency copy was already recorded in the previous handoff and is not new pending work. Do not delete unrelated worktrees.

## Next executable milestones

1. **One sustained cooperative service day.** Build a new bounded continuation/application with two independent people and competing service obligations, using Watch or Common Ground as preserved controls. Resources and condition carried from an earlier event must have a real later use: no free body reset, automatic replacement parts, longer quota without a decision, or arbitrary efficiency bonus. Start from a concrete two-event or two-site tradeoff, two feasible approaches and a simpler host-native controller. Keep host resources/consent outside Human and retain the clever partial-rest solutions as controls.
2. **An independent second consumer of report reasoning only if demanded.** Last Light uses a one-task notebook; the candidate is not general memory. A real communication/coordination need with another independent actor could test source age, experienced information and ambiguous delay. Compare direct records first. Do not promote cognition or social code merely because a second copy can import it, or infer motives from indistinguishable outcomes.
3. **Use actual supplied feedback.** The new optional note exports enable real people to describe goals/tradeoffs/confusion. Keep supplied files private with provenance; establish distinct human participants manually before the five-person gate. Do not harvest unrelated Downloads or fabricate participants. No verdict on user enjoyment of the new games has arrived yet.
4. **Choose a research claim before broadening a faculty.** Body/learning isolation and the two-host helper study are completed, not recurring work to rerun each hour. A third helper shape, attention/planning/affect mechanism, physiological refinement or normatively grounded scenario requires its own specific use, simpler rival, rejection condition and version boundary. Qualified theological review, external human-data calibration, measured human authoring benefit and physical-device timing remain open tracks; none may be invented from automated runs.

The latest actual player report is still the minute-1,312 Common Ground save, private and byte-preserved in `artifacts/user-runs/2026-09-07`. It did not establish why late play was less interesting. [Original analysis](docs/common-ground-feedback-2026-09-07.md). Keep its provenance and the new games' unknown human reception separate. Broader memory, attention, affect, habits, planning, physiology and macro work remain eligible but unpromoted in the coverage/decision registers.

## Reproduction and release

Use Node >=22. Here `/opt/homebrew/bin/node` is 26.8.1; prefix `PATH=/opt/homebrew/bin:$PATH` to avoid an older login-shell NVM binary. `npm ci` installs only pinned deployment tooling. Runtime execution has no third-party simulation dependency.

```sh
PATH=/opt/homebrew/bin:$PATH npm test
PATH=/opt/homebrew/bin:$PATH npm run package:runtime
node scripts/signals-profile-evidence.js /tmp/signals-profiles-new.json
node scripts/signals-comparison.js /tmp/signals-comparison-new.json
node scripts/coordination-probe.js /tmp/coordination-new.json
node scripts/commons-next-comparison.js /tmp/commons-next-new.json
node artifacts/commons-next/two-cache-ferry-probe.mjs /tmp/two-cache-new.json
node scripts/watch-evidence.js /tmp/watch-routes-new.json
node scripts/observation-memory-probe.js /tmp/memory-new.json
node scripts/mechanism-comparison.js run --partition reserved --freeze artifacts/mechanism-comparison/freeze.json --out /tmp/mechanism-reserved-new.json
```

Use fresh output paths; retained artifacts are immutable evidence. Follow [AGENTS.md](AGENTS.md) and [deployment workflow](docs/deployment.md): review, test, push main, `npm run deploy`, verify exact live manifest/payloads and browser behavior. Keep Solo Repair socially isolated. Public build is allowlisted; cognition/rivals/research/reviews/player exports remain private. For documentation-only handoffs, keep the deployed app commit separate from newer source HEAD and do not redeploy merely for an evidence document. Strict `verify:live` requires source/build/pushed/live identity and intentionally rejects that later documentation-only mismatch. A fresh `git -c core.fsmonitor=false status --short` can reveal new evidence files if the filesystem monitor's untracked cache is stale.
