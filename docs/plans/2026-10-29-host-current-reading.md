# Host current reading implementation plan

> For agentic workers: use executing-plans task by task. The director delegates one source writer. No subagents inside the source task.

Goal: let an HF host obtain the exact detached current slice through inspect without materializing accepted history or computing cold archive hashes.

Architecture: extend the existing host inspection outlet with an explicit `current` selection and optional `Inspection.current` result of the existing public RunState type. Reuse archiveSnapshot's existing 64-entry duplicated-journal semantics and the inspector's detached/frozen result boundary. Ordinary selections and person perspectives keep their existing contract.

Tech stack: TypeScript, current HF run schema/generator, Vitest and existing public headless controls.

Spec: recovery-neighbours-current-read-report.md and evidence.json (120 field paths / 27 requirement groups); docs/framework.md HF4 reading rule; CENTRAL-GAPS21:37 source-lease offer; actual G7 acknowledgment21:42. The brain decision index ~/code/brain/promoted/index.md is absent, so no previous findings are claimed.

Global constraints:
- No tracked source edits until actual CENTRAL4.14 publication/source handoff and an explicit sole-writer window. CENTRAL may keep read-only native controls running; app tracked edits must pause during this window.
- One public reading outlet: inspect. No raw actor getter, new function, private game/kernel copy, actor write or scientific change. Preview remains unchanged unless the existing type architecture requires a documented shared projection adjustment.
- Proposed query: inspect(run,{perspective:{kind:'host'},people:[],select:['current']}); empty people is admitted by the actual current array schema. Result current must equal exportRun(run).current exactly at that instant, including optional fields, ordering, world revision, offers, pending requests, actor clock/RNG and the existing64 receipt/event windows.
- Reject every person perspective, including self, for current. Do not include current at all when it was not selected. Existing mixed selections, unknown IDs and duplicate-selection behavior stay coherent.
- Complete initial/history/archive/hash/journal/cold restore/replay remain unchanged. Immutable effective parameters come from the existing public opening once, not a second per-step route.
- No new faculty, clocks, retention, actor count, tuning, CI deadline, file cap or horizon changes. No game-specific code in packages/human. No apps/site port source or canonical ledger edits.
- Next free version train only after publication/lock state recheck. Preserve CENTRAL's chosen published app graph; no forced app upgrade. Include the coordinator's existing next-train docs: stale eight-call wording, distinct branch autosave slots, and why fork lifetime differs from preview. Do not reopen4.14.

Review focus:
- Self and other observers must receive no raw current data, including mixed requests and empty people.
- A retained result cannot mutate the run, and later steps cannot mutate the result.
- Same-time external public steps must appear in the next reading; no stale cache.
- Receipts/events must keep EXACT existing64-window semantics, not raw unbounded journals or all-history membership.
- A current-only request must avoid history packing and cold canonical hashes, while explicit cold diagnostics stay honest about their cost.

Task1: one supported current reading and its evidence
- [x] Read AGENTS, current run/inspection/schema/validation/export boundaries and existing tests. Confirm the proposed selector/result shape fits the closed schema; record any necessary naming adjustment before edits.
- [x] Write one meaningful behavior control first: current equals exported current across real public activity/pending/settlement states; prior reads detach; self/other reject; unselected legacy query omits current. Observe missing-selector RED.
- [x] Implement the smallest existing-inspector projection. Do not reconstruct fields in a second schema or duplicate owner logic. Add a module scope comment. Update the actual source schema/generated contract through the repo's generator.
- [x] Add one public headless control with real accepted inputs through64/65 receipts, rejection/no-op and same-time external work. Check exact current slice, whole native archive/history/RNG unchanged by reading, mutation isolation and full cold replay/next continuation. Keep every existing full-hash control.
- [x] Update API/README/changelog/roadmap and the existing next-train lifetime notes. Explain this is explicit host control data, not new player knowledge or a peer/custody certification.
- [ ] Run focused controls and the required normal check:lane. Freeze source, sign with exact Codex trailer, and push one source branch. No PR, hosted request, merge, tag, publish or deployment by this writer. Return the tracked-writing lease to CENTRAL at this source freeze.

## Source decisions and evidence

- Base: actual fetched origin/main 89240686102c595780bd8ffc6c452d95bf1f7a66, already published 4.14. Root's 22:06 window and G7 acknowledgment checked before edits; CENTRAL app tree3c66 stays frozen.
- Closed query: `inspect(run, {perspective: {kind: 'host'}, people: [], select: ['current']})`. Optional result: `Inspection.current: RunState`. Selection is run-wide; people still controls only existing person views and retains ID admission. No extra per-person part. Mixed requests include both outputs at the same instant.
- Reject person perspectives at $.select before projection, including self, mixed queries and empty people. Preview keeps its separate selector type unchanged.
- Reuse archiveSnapshot and clone/freeze. Do not call exportRun for current-only reads. No manually maintained field projection. Resolve effective parameters once from existing public journal opening.
- Schema-data header requires synchronization by hand with run-schema.ts; build generates the source/schema identity. API reference comes from built declarations. No guessed engine stamp.
- Brain consult: /Users/abdul/code/brain/promoted/index.md is absent (checked locally); no prior findings claimed. Memory supplies no current implementation evidence.
- Source writer does Task1 only. Root owns Task2 independent reviews, CI/main/release/adoption/cleanup. No review workers or requests here. Leave clean managed tree for root acceptance as the specific handoff requires.

## Evidence ledger

- [x] Prerequisites, upstream base, contract, existing inspector/archive boundary, scoped Neighbours report and full requirement map read.
- [x] RED missing-selector behavior: invalid-schema $.select[0], recovery-hf-current-read-red.log.
- [x] GREEN focused contract and real public headless control: 13 tests across six files.
- [x] Next free train and docs, generated API/stamp, lockfile.
- [ ] Normal check:lane, signed source freeze and backup branch.
- [ ] Complete recovery packet and tracked-writer handback.

- Version check: actual main and npm end at 4.14.0; v4.15.0/client-v0.5.14/kit-v0.5.31 remote tags absent. Followed the prior train manifest process, paired schema-data update, generated source stamp/API and pnpm lock. Only apps/site changes are lab-client 0.5.13→0.5.14 and lab-kit 0.5.30→0.5.31; game HF stays 3.2.0. No CENTRAL port tree touched.
- Cost proof is source inspection: selected current calls archiveSnapshot, never exportRun; existing diagnostic full-hash remains explicit. Native ESM forbids spying on named exports; removed that attempted instrumentation instead of changing module loading or injecting private actor data.
- Control uses public authored work for same-time start resolution and pending/active/settled reads, and a public empty run for exact 64/65 world receipt windows. Closed actor timestamps admit only pending resolutions; no invalid world-write lane is invented. Accepted empty steps create a transaction, so the control pins their resulting current and compares cold continuation after the same step.

- First normal lane stopped at Markdown table formatting in the changed roadmap row. Applied the repository formatter only to that doc; no checks disabled or thresholds changed. Existing lint warnings remain warnings.

- Normal typecheck exposed TS7056 at examples/minimal.ts main: the newly complete Inspection exceeds inferred declaration serialization. Minimal adjustment: annotate its existing return object with public RunArchive/Inspection types; no runtime/example/preview behavior changes.

- Final normal `npm run check:lane` PASS: lint (145 existing warnings, no errors), complete typecheck, 369 test files passed / two existing skipped; 1,955 tests passed / seven existing skipped. Focused six files /13 tests PASS. No original tests/assertions or replay hashes changed; no identity rebaseline needed beyond generated RUN_ENGINE.
- Remaining post-commit operations: signed backup-branch freeze, full packet verification and explicit writer handback. Record their actual results in games-deferred/recovery-hf-current-read-report.md; do not rewrite this tracked plan after the signed freeze. Root owns independent review and acceptance.
