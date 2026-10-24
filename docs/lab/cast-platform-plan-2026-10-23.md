# Cast platform implementation plan

Authorized scope: task 4 and Voice, Well and Watch adoption from task 5. Owner review remains 2026-11-03. The implementation uses TypeScript and the existing one-device browser shelf. No actor-loop semantics change.

## Design

HF supplies a pure optional chapter clock: integer real-hour slots, a monotone watermark, at most 24 processed slots per return, explicit skipped slots, and a seeded deterministic draw for each slot. No Date.now, storage or biography lives in HF. Repeating a return or rolling the clock backward produces no additional life. A long absence processes the newest 24 slots and records the omitted interval honestly; it does not claim to simulate full days. The same pinned clock, seed and inputs give the same output. This is an engineering pacing choice.

Lab-client owns a generated public canonical roster and coarse life fiction. All six traits and ten values are explicit, starting at 0.5 and applying registry overrides. The artifact includes identity, revision, cohort, host allocations, public occupation/place and a short public introduction. Secret biography paragraphs remain author-side in the registry. Coast and Valley never share life encounters. Catch-up changes bounded assignments inside each person's existing qualifications and occupation; it never completes a contract or asserts payment. It changes local whereabouts and one-sided encounters witnessed in compatible local places. Those records explicitly leave the other perspective unrecorded and never grant a mutual bond. Temperament and values weight assignment and encounter probabilities. It grants no skills, license, health recovery, consent, completed duty, resolved debt or secret knowledge. Host admissions must read these changes and adapt their actual opening availability and visible scene, rather than only display a banner.

The central shelf stores life alongside immutable transfer payloads. A fresh host reads and prepares an admission, pins its complete input and outcome, then claims the exact expected parent by CAS. Validation/hash happens before a single readwrite acceptance transaction. Two competing claims yield one winner. No timestamp merge or retry against a newer head. A claim transfers ownership to that host; the previous loaded chapter stays pinned and its next checkpoint conflicts. Export or an explicit new branch is the recovery. Checkpoints retain the same life and move the absence anchor to the current quantized clock, so active play is not also offscreen life. No real-time refresh enters a loaded simulation. Legacy envelopes without life remain inspectable and exportable; revision-1 wave-1 entries cannot be relabelled revision 2. A visible fresh branch replaces only the selected person's active head.

Storage permits 40 active people plus 80 historical revisions, up to 16 MiB total and 256 KiB per envelope. Pruning removes only oldest non-heads. If heads exceed the budget, the whole acceptance fails without mutation. Approved origins are a finite set matching all fifteen games. Recording association code remains separate: pinned envelope, explicit epoch, invalidation generation, file-history gates and manual linkage choice stay intact.

## Execution

- [x] Add HF chapter-clock helper, focused deterministic/cap/rollback/repeat tests and one headless control. Prove an unopted Person is unchanged.
- [x] Generate the public forty-person artifact from registry identities and profiles. Add roster validation and host lookup.
- [x] Add client life preparation and admission helpers; enlarge shelf retention; test forty heads and competing CAS without weakening recording regressions.
- [x] Adopt canonical profiles, ages, household/occupation fiction and edition pins in Voice, Well and Watch. Recast Watch's four incompatible roles and remove their inherited incidents. Keep incidental children and later generations outside the foreground roster.
- [x] Add fresh-only shelf preparation and pinned current-version replay state for the three games, plus ordinary local/fresh controls and recording gates. Give later game workers exact snippets and self-contained records.
- [x] Run focused controls and obtain the two independent reviews (correctness/privacy and game design/continuity), including whole-cast, ownership, terminal and source-receipt deltas. Final source check:lane remains the release gate.
- [ ] Reconcile the reserved 2.17 release, stamp the next free minor and exact client/kit pins, signed commit, fetch/rebase/push, exact green CI, trusted npm release and provenance.
- [ ] Pack immutable client/kit artifacts once. Publish ready note. Deploy the exact green source, verify release.json and both viewports, and perform an actual cross-origin journey when a compatible live peer exists.

Review focus: old revision refusal before mutation; stale loaded chapters; clock rollback/cap; cross-cohort isolation; imported history recording consent; no health/duty/project resets; full pinned current replay input.

## Whole-cast correction before publication

A fresh universe chapter now admits every compatible current allocated head, bounded by each host's3–8 foreground people. One head per person does not limit a game to one continuing person. A chapter stores a keyed collection of prepared inputs, complete admitted initial actors, initial claims and last accepted ownership receipts. The actor simulation and replay remain pinned. Old, incompatible or closed people block automatic startup with an explicit fresh-local or leave-away choice; they never silently become fresh counterparts.

The client prepares a batch using one quantized time, validates every semantic host admission, hashes all claims before storage, then the central shelf verifies and accepts all expected parents in one IndexedDB readwrite transaction. A single stale parent rejects the whole batch and no game begins. Later eligible source checkpoints advance each owned person separately. No active project, care obligation or clinical restriction is erased.

Recording uses the complete pinned history set. It stays closed until every carried branch permits the current recording epoch; explicit linkage choices apply only to the pinned batch and generation. File imports remain gated. Current local saves carry their exact last accepted ownership envelopes as metadata; only explicit local restore can recover them, and later checkpoints still compare exact current parents. Death writes a terminal envelope under the owned exact parent. The reducer and preparation reject any later continuation of that closed branch; an explicit alternate fresh branch remains available.

Execution: add bounded batch/terminal client and bridge reducers, collection adapter over existing single-person semantic checks, multi-person runtime/privacy/local ownership persistence, actual worker death receipts, focused all-or-none/mixed-epoch/reload/death controls, same two reviewer continuations, final required lane and normal release/deploy. Existing one-person helper remains a bounded compatibility wrapper, not the default site contract.
