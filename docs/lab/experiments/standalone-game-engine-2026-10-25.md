# A standalone game engine — 2026-10-25

## Preregistration

Timebox: 45 minutes of implementation after preregistration. Build only a first host-side people-centered starter from `docs/host-kit.md`: two residents, a bounded shared task, explicit food/water supply, a host clock, saves and input replay. No renderer, physics, networking, new engine faculty or player/playtester round.

GO requires a runnable headless starter within the timebox, one completed host task through HF's activity loop, byte-equivalent complete saved state including RNG for uninterrupted versus mid-run restore and replay of the same seed/inputs, and a control where withholding work inputs leaves the task incomplete. Use seeds 7 and 42 only. List every shared setup gap rather than declaring a complete engine. NO-GO if any requirement fails; tooling-blocked execution is PENDING. After GO retain the explicitly invoked starter and focused tests. Existing calls must remain exact against base; no HF source changes are permitted.

The starter will import existing workspace exports. Record base commit and package metadata. Save people, community bookkeeping and host world together. Inputs carry simulated time, never wall time. Scope excludes lab upload and playtester execution; list their remaining wiring as gaps. This is an authored mechanism control, not emergence or game acceptance.

## Result

**GO for the first host starter only.** Built and ran within the45-minute implementation timebox (preregistration17:10:49 UTC; first successful headless result before17:12:07 UTC). Seeds7 and42 each completed four host repair steps. The no-work control completed zero. Complete save JSON, including all Person RNG and community bookkeeping, matched uninterrupted play after mid-activity JSON save/restore and deterministic replay of the same inputs.

Artifact: `packages/human/examples/h3-starter/{starter.ts,control.ts,README.md}`. Focused test: `packages/human/test/h3-starter.test.ts`. Explicit invocation is the opt-in; no engine source or public export changes. Host state, all people and community state share a save boundary. Input boundaries explicitly provision reserves and are included in the replay. This is a one-hour authored mechanism fixture, not emergence, a seven-day simulation, realistic motivation or owner acceptance. Withholding work removes the only action; it does not isolate motivation.

Source: HF workspace package2.22.0 at base `14b7d6cdcff5b66836f8d97eee38ecc22197741a`, engine code unchanged. Node26.12.0 on Apple Silicon. Commands: `node packages/human/examples/h3-starter/control.ts`; `npm test -- packages/human/test/h3-starter.test.ts`; `npx tsc -b packages/human`. Base source extracted with `git archive14b7d6c packages/human/src`; old-call `createPerson` plus `tick` continuation at minutes15/30/45/60 matched complete state and RNG on both seeds. Empty engine diff independently confirms no engine edits.

The initial direct Node run rejected a TypeScript parameter property; replaced it with a normal field. Initial focused-test startup failed because the site's declared HF2.21.0 package was absent and resolved to workspace2.22.0. Installed the exact published tarball into ignored app-local node_modules, with no manifest/lockfile changes, then retried. Exact logs and results are in `~/code/.lab-scratch/h3/cast-starter/`.

Shared setup gaps are listed in the starter README: persistence and import validation/migration, UI/accessibility, clocks, meaningful content, resource and interruption rules, external-effect receipts, retention, stamps, export UX and lab consent/upload. Existing kits supply pieces but were not wired or exercised. No new player/playtester round. No renderer/physics/network. No public exports or HF release proposed.

Final validation status: package and full-workspace typechecks passed; lint passed with existing warnings. Focused Vitest and the full lane suite remained queued for over ten minutes behind other workers and were stopped before execution. They are PENDING. Implementation remains uncommitted until coordinator reruns them green and obtains independent review. Direct headless and base continuation results above are completed evidence, separate from these pending checks.

## Coordinator integration verification

The corrected candidate passed the full `npm run check:lane` (lint, workspace typecheck,2349 tests passed;7 skipped) in the H3 director tree. Human focused tests4/4, speech protocol Node tests5/5, complete-state/RNG controls and independent Codex/Opus reviews are recorded in `~/code/.lab-scratch/h3/report.md`. Earlier pending worker checks above remain historical; no failed or unexecuted worker check is counted as passed. The final independent Codex review found no blockers in the corrected slices. Exact source/CI/release-queue receipt follows in the director report. No H3 release or new player round.

## V3 closure timing control — 2026-10-25

Run `node docs/lab/experiments/standalone-starter-closure-2026-10-25.ts <scratch output.json>` on current HF3 source eb0bd20. Seeds7,19,43,71,101 delay the control's initial work availability by1,3,5,7,9 minutes respectively; both arms share those input boundaries and finish at minute30. Both arms offer and actually perform repair. Early availability completes4 repairs, delayed availability2, for every seed. The original all-work-absent negative is retained separately; this control measures timing while keeping a productive action in both arms. It is a sensitivity check, not a motivation assay or a new preregistration.

Every arm's complete save, including Person RNG, community and host inputs, matches JSON restore at the first boundary and full input replay. Original seeds7/42 pinned legacy hashes still pass after the existing engine-metadata-only normalization; unnormalized current restore/replay remains exact. No template or runtime API changed.

**Retain GO for this first host-loop mechanism only.** There is still one authored repair action, explicit provisioning and a four-repair ceiling. This provides no evidence of autonomous task adoption, competing motives or a complete game engine.

**Dated deliverable plan, target2026-11-03:** deliver a supported public opt-in HF host-starter export, its documented save/input contract, a runnable packed-consumer starter, and controls for competing available actions, interruption, complete restore/replay and disabled-host continuation. Define the public API before implementation rather than treating this copied template as that API. The release owner owns delivery; the owner accepts at Nov3 review. UI, persistence service, lab and playtester integration remain explicit separate gaps. This is the coordinator's dated-plan route; the current example is not shipped in npm. Record a missed target on Nov3 if unfinished.
