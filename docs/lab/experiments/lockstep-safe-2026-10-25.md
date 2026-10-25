# Lockstep-safe, 2026-10-25

## Preregistration

Registered before probes. Source: worktree base `14b7d6cdcff5b66836f8d97eee38ecc22197741a`, workspace HF2.21.0 source, Node26.12.0. No release or player round.

Use two independently constructed real bench-village harnesses:20 people, alternating devout status, person seeds100+i, world seed7, food200, start420. Run1440 one-minute logical ticks. Logical input envelopes have tick, sender and sequence; every120 ticks two senders each submit a request to a different person, alternating chat/help at strength0.4. Tick inputs are applied only once all expected envelopes arrive. Peer A receives the declared order without delay. Peer B receives reversed per-tick order with delivery delays0–7 simulated scheduling slots. Sort by tick, sender then sequence before application. Both must receive identical logical input; delivery slots never enter HF state. Include a no-input twin control.

Compare SHA256 of complete people snapshots, communityState and village state after every input barrier and logical tick, not just final state. JSON roundtrip and restore both peers at tick720, retaining world and community state. Compare restored continuation to an uninterrupted control receiving identical inputs. Count actual delayed slots and reversed batches so a vacuous schedule cannot pass.

GO only if all1440 per-tick hashes agree across peers and uninterrupted control, restore is exact, no-input twins agree, at least10 batches arrive reversed and at least one input waits for a positive delivery delay. Any state mismatch is NO-GO. Instrument failure means PENDING until repaired without changing criteria. This proves same-runtime barrier-and-order discipline only. Network transport, cross-device and cross-platform claims are excluded.

Only a GO permits a bounded pure canonical tick-input helper. Reuse existing RNG/libm and snapshot APIs; no network service or engine changes.

## Results

Pending the registered probe.

## First probe result

**GO for the bounded helper only.** All1440 tick hashes matched both delayed peers and the uninterrupted control. Both no-input twins matched every tick. Twelve batches arrived reversed;24 envelopes waited for positive delivery delay. The tick720 JSON snapshot/restore was exact. Final complete-state SHA256: `23a8db5a6dc78f9236d1dcbbb8e199b5dd29068f51b69f997e213f699e939ef4`.

Command: `PATH=/opt/homebrew/bin:$PATH node ~/code/.lab-scratch/h3/fork-lockstep/probe.ts lockstep` (exit0). Exact source is the preregistered base; its package manifest is2.22.0 and engine stamp2.21.0. The preregistration's HF2.21.0 label referred to the engine; it was imprecise about package version. No package was installed or released. Probe code, hashes for every tick and raw result are in `~/code/.lab-scratch/h3/fork-lockstep/{probe.ts,lockstep-hashes.jsonl,lockstep-results.json,lockstep-run.log}`. Preregistration timestamp/hash and signed commit: `prereg.timestamp`, `prereg.sha256`, `aeb3f11`.

This is a controlled host scheduling check, not emergence, a network protocol, transport reliability or evidence across platforms. Delivery slots are simulated before each input barrier. The expected set is known in advance. A missing input blocks the host; clock synchronisation, membership changes, retries, authentication and payload agreement are outside this helper. Existing `createCommunity`, `communityState`, `createVillage({ state })`, `snapshot` and `restore` already supply continuation. No duplicate save or RNG API is needed.

## Opt-in helper

The passing slice is [canonicalTickInputs](../../../packages/human/src/tick-input.ts): at most 256 envelopes for one nonnegative safe-integer tick. The caller declares the expected sender/sequence identities. Missing identities return `undefined`; unexpected, duplicate, malformed or wrong-tick input throws. Complete input is copied and ordered by sender code units, then sequence. Supported envelope fields are copied explicitly, including inherited supported values. Payload values remain caller-owned. The helper reads no payload fields, Person, clock, RNG, telemetry or network. Hosts must agree on expected membership and payloads and retain pending input in their own saves.

[Focused tests](../../../packages/human/test/tick-input.test.ts) cover incomplete barriers, complete ordering, nonmutation, empty ticks, code-unit sender priority and rejected ambiguous input. The [headless control](../../../packages/human/examples/tick-input-control.ts) reruns the real village with the helper and compares every tick. It pins full-state hashes measured on the untouched base, including all person RNG and world RNG state, both with input and with old calls without input. Initial helper control: 1440 matching ticks, exact restore, `legacyExact:true`. The final old-call no-input SHA256 is `8d02c5e917be4584fab1ab0628b161ce08cba62b7dc9f60175d269060da084a2`.

Commands: `npm test -- packages/human/test/tick-input.test.ts`; `node packages/human/examples/tick-input-control.ts`; `npm run check:lane`. Exact output remains under `~/code/.lab-scratch/h3/fork-lockstep/`. The first focused attempt stopped during Vite project setup because the worktree lacked its lockfile-pinned nested site dependency; `npm ci --ignore-scripts` restored it without changing tracked manifests. A later typecheck caught an unchecked array access in the inherited-field test fixture; that fixture was made explicit. Neither failure was a simulation result. Final verification is recorded in the worker report.

The original control targeted different people. The revised control below adds same-person conflicts. Late input after an advanced tick, changing membership and disagreement about payload meaning remain outside this helper. GO applies to this bounded barrier/order helper, not a multiplayer claim. Proposed coordinator exports: `canonicalTickInputs`, `TickInput`, `TickInputKey`. Shared export files, engine files, manifests and lockfiles remain unchanged. Independent review and integration belong to the coordinator; no release, merge, push or player round occurred.

## Review correction: conflicting-input control preregistration

Registered before the revised control runs. The original 1,440-tick result remains a **narrow delivery/restore GO**. It does not demonstrate behavior-sensitive ordering: the requests targeted different people, and serialized queue-key order could differ without behavior changing. The original helper control also checked only complete batches and wrote conversation advice internals. Those claims are withdrawn; original raw results and preregistration hashes remain intact.

Revised criterion: run the same 20-person village source, seed 7, start 420 for 1,440 one-minute ticks. Every 120 ticks starting at tick 60, sender `B` asks p00 to help p01 and sender `a` asks the same p00 to rest. Both use the same `player` voice, strength 1, through public `StepOptions.suggestions`; HF admits the first suggestion per voice. Canonical code-unit order puts `B` before `a`. Delayed delivery puts `a` at slot 4 and `B` at slot 7. Invoke the helper after every slot 0–7; require `undefined` for slots 0–6, with no application or simulation advance, and a complete canonical batch at slot 7. Compare complete state after every logical tick between immediate canonical and delayed canonical peers and an uninterrupted canonical control. JSON save/restore both peers at tick 720.

A negative arm applies reversed delivery order directly, without the helper, using the same public suggestions channel. GO for behavior-sensitive ordering requires zero canonical tick mismatches, exact restore, 12 conflicting batches, 84 withheld slot checks, and at least one negative-arm difference in actual chosen affordance at a paired decision (not just JSON or selected-request order). Record selected request differences separately. Any unmet criterion is NO-GO; instrument failure is PENDING. This is a deterministic host priority convention, not fairness, consensus, transport or emergence.

Separately run the old no-helper/no-input calls from 421 through 1860 and require their full-state/RNG SHA256 to remain `8d02c5e917be4584fab1ab0628b161ce08cba62b7dc9f60175d269060da084a2`. Do not compare revised conflicting inputs to the old input-arm hash. The unused `fork` parameter will be removed from the headless control only; the original probe actually uses it and retains it.

## Revised control result

**GO under the revised bounded criterion.** All 1,440 canonical tick comparisons matched; 12 conflicting batches produced 84 incomplete-slot holds; restore was exact. First negative-arm behavioral divergence: logical tick 60 (minute 480), p00 chose `help:p01` under canonical order and `rest` under reversed unsorted order. There were 13 paired decision differences over the run, including later consequences; these are not independent trials or evidence of emergence. First-input priority differed on all 12 batches. The new canonical final hash is `3e0d4caeede70521e219f0a81630636408f3b1b0e37b06d07ab7cf91a3ce9db0`; it is not compared to the old nonconflicting input hash. Separate old no-helper/no-input continuation exactly retained `8d02c5e917be4584fab1ab0628b161ce08cba62b7dc9f60175d269060da084a2`, including state and RNG.

Revised preregistration receipt: `2026-10-25T17:31:38Z`, SHA256 `b37bdb6e74263ff6cbee5ae6e56dd5951decb0dea626baaf9c0345dcbce38d56`; the pre-run document bytes, hash and timestamp remain in scratch as `review-prereg.md`, `review-prereg.sha256` and `review-prereg.timestamp`. Original signed preregistration evidence and first-probe raw results remain intact.

Exact reviewed-source commands, all exit 0:

- `node packages/human/examples/tick-input-control.ts`: `review-control.log` and `.exit`.
- `npm exec -- vitest run --config /Users/abdul/code/.lab-scratch/wt/human-framework/h3-fork-lockstep/packages/human/vitest.config.ts --root packages/human test/tick-input.test.ts`: one file, two tests passed; `review-focused.log` and `.exit`.
- `npm run typecheck`: `review-typecheck.log` and `.exit`.
- `npm exec -- biome check --write packages/human/src/tick-input.ts packages/human/test/tick-input.test.ts packages/human/examples/tick-input-control.ts`: three files checked; `review-format.log`.

The coordinator deliberately terminated this worker's waiting full-check process tree to deliver review corrections; the earlier unknown-cause statement is corrected here. No foreign process or lock was touched. Per coordinator direction, this corrected implementation remains staged and uncommitted. The coordinator owns the single final integration `check:lane`, signing and export decision. No public index change or release occurred.

## Coordinator integration verification

The corrected candidate passed the full `npm run check:lane` (lint, workspace typecheck,2349 tests passed;7 skipped) in the H3 director tree. Human focused tests4/4, speech protocol Node tests5/5, complete-state/RNG controls and independent Codex/Opus reviews are recorded in `~/code/.lab-scratch/h3/report.md`. Earlier pending worker checks above remain historical; no failed or unexecuted worker check is counted as passed. The final independent Codex review found no blockers in the corrected slices. Exact source/CI/release-queue receipt follows in the director report. No H3 release or new player round.
