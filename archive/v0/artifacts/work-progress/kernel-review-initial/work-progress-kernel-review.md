# Independent work-progress kernel review

Reviewed 2026-09-08 on Node v26.8.1. HEAD observed at end of review: `563cc95c524a6e1299d810ca95abf397ae0d3423`. The exact source hashes below, rather than HEAD alone, identify this review. No repository source was edited.

## Verdict

Three concrete saved-state invariant gaps reproduced. The strongest is shared-component acceptance of impossible completed-work exposure, which the camp adapter can convert into accepted extra construction practice. The ordinary immutable payment/settlement path showed no concrete failure in this bounded review. The 21 existing focused tests passed, but do not cover the counterexamples below. This is not a promotion or complete-correctness verdict.

## Findings

### F1 — P2: Completed work can invent additional paid exposure and practice

Location: `src/experiments/work-progress/candidate.js:33-37`; host propagation at `camp-candidate.js:64,76-79`.

For complete/settled work, the component calculates each worker's minimum fraction using `(minutes - 1) / basisMinutes`. This independently grants every contributor a potentially partial final minute. It also permits a whole extra minute with zero incremental physical work when the prior minutes already suffice to complete the item.

Two independent minimal component counterexamples:

1. Create an item with floor 1, prepare A with basis 1, advance A once. The legal result is complete, A.minutes=1, A.fraction=1. Change only exported A.minutes to 2. `restoreWork` accepts this impossible completed state.
2. Floor 1, bases A=1/B=1, status complete, progress 1, A/B each minutes=1/fraction=.5/effort=.1 for item effort .2. `restoreWork` accepts it. Any legal first paid minute must complete all work, so the second person cannot have participated.

The same flaw reaches host validation. Begin a normal no-tool A/work-1, advance to minute 21: the true result has 20 construction minutes, one recovery minute, completedAt 20 and construction skill `0.18889723232091568`. In the export, set contribution A.minutes=21; completedAt=21; A.paid.work/construction=21 and recovery=0; A.person.skills.construction=`practice(.1,21)`. Leave progress and effort unchanged. `restoreWorld` accepts the result, including skill `0.1931040195866663`. The host's practice check treats the invented component minute as evidence for the invented skill.

Impact: corrupt or host-authored snapshots can pass the stated unpaid-credit/physical-fraction checks while claiming task exposure that no legal work schedule can produce. This is a physical accounting gap, even under the expressly unauthenticated snapshot model; it does not require proving a full command history.

Repair direction: enforce an item-level constraint on final partial exposure rather than providing every worker an unconstrained final allowance. A simple additional bound `sum(worker.minutes) <= max(worker.basisMinutes)` rejects the demonstrated impossible whole-extra-minute cases because duration reduction cannot slow work below its latched basis. That alone does not resolve all multiple-partial-credit states; preserve valid multiworker final-partial cases when tightening the broader invariant. No history journal is necessary to reject the demonstrated cases.

Reproduction names: `component_single_extra_minute_after_completion`, `component_multiple_final_partial_minutes`, `host_fabricated_final_minute_and_practice`.

### F2 — P2: The host accepts progress requiring productivity that never existed

Location: `src/experiments/work-progress/camp-candidate.js:53-65,68-79`.

The generic component permits any duration reduction through its stated floor. The host validates that generic state and reconciles contribution totals, but does not narrow the fraction bounds to this host's actual, fixed supplier/tool rules.

Reproduction: create the default world (toolArrival=null), start A/work-1, and advance to minute 1. Export it. Replace item progress and A.fraction `.05` with `1/6`, replace contribution A.effort and A.paid.effort with `.2/6`, and restore. Everything else, including the one real construction minute, latched basis 20, actual Human skill and no-tool setup, remains unchanged. Restore succeeds. Advancing the restored world to 40 now records completedAt 18; advancing the untouched legitimate source records completedAt 20.

With no tool ever configured, the first A minute must be exactly `1/20`. This is not uncertainty about arbitrary historical productivity choices: the camp host knows that none are possible. Component-valid productivity must not automatically be host-valid productivity.

Impact: a saved-state inconsistency changes subsequent actual completion behavior while passing resource, per-worker effort and Human practice reconciliation. The API already explicitly disclaims exact past fatigue and a precise historical skill-derived basis; it currently does not identify this separate and materially larger productivity assurance gap.

Repair direction: check host-specific prospective fractions against the available productivity schedule. At minimum the no-tool case has exact nonfinal fraction law per worker and a single possible final partial exposure. The fixed minute-1 supplier case needs suitable bounded checks for its one known change. Avoid claiming complete history authentication, and count any required extra metadata or validator logic in inclusive cost.

Reproduction name: `host_progress_without_any_productivity_change`.

### F3 — P2: Completion timestamps need not accommodate the item's paid work

Location: `src/experiments/work-progress/camp-candidate.js:57`.

The only completedAt check is an integer between 1 and now. Export a legitimate no-tool A completion at minute 20; set only `items[0].completedAt=1`. `restoreWorld` accepts an item that has 20 paid construction minutes, a single-worker exclusive work law, and a claimed completion at minute 1.

Impact: normalized observations can assert an impossible early completion even though paid counters are retained. Completion time is a primary result in this experiment. This counterexample does not demand recovering its exact historical value: the impossibility follows from facts already present in the snapshot.

Repair direction: at least require completion time to accommodate the sum of the item's actual contribution minutes, since each item is exclusive and the world starts at zero. Account for the limitations of that lower bound; it does not prove the exact completion time or all cross-item ordering. If timestamps intentionally have weaker assurance than other physical counters, say so explicitly.

Reproduction name: `host_completion_before_paid_work_can_fit`.

## Positive observations and exercised verification

- `node --test tests/work-progress-candidate.test.js`: 21/21 pass on Node v26.8.1. This includes the declared histories, restore round trips, capacity failures, supplier/duty ordering, driver parity, detached observations, installed reservation preservation and duplicate current-state settlement. Only this focused suite was run; no old game matrices or comparisons were executed.
- Five independent targeted probes were written and executed in `/tmp/work-progress-kernel-probes.mjs`; exact results are `/tmp/work-progress-kernel-probes.json`. None errored. All five demonstrated acceptance of the invalid states described above.
- Inspection supports the live transaction design: commands and requested advances clone the input world before provisional edits; all actual Human payments occur before tool/output effects; failure discards the clone. A later actor's failed actual payment does not escape through the original input.
- Shared quotes do not authorize payment, shared settlement on current settled state returns no new completion, and the host commits reservation transfer/output/current settled state together. Reusing an old complete branch remains explicitly a host persistence responsibility.
- No legal runtime transition from an unmodified initialized world was independently shown to fabricate work, transfer someone else's contribution, duplicate output, mutate caller input, or leak provisional effects.

## Assumptions and limits

- Scope: dependency-free candidate, full camp adapter, supplied API/execution contracts and focused author tests, with read-only inspection of existing Human/runtime/model dependencies. Findings were not informed by prior work-progress reviews, comparison results, rival source or the independent repair consumer. Current HANDOFF/MVP material and the memory registry restart pointer were read for repository orientation only.
- These are snapshot validation findings, not a hostile-client security claim and not proof that normal runtime paths reach the malformed states. Snapshots are explicitly authoritative and unauthenticated. Nevertheless, their documented structural/cross-field checks include paid credit, resources, assignments and practice; impossibilities that follow from those same retained facts are relevant to that contract.
- Arbitrary rewritten past fatigue and the expressly documented weak historical skill-basis check were not filed as new defects. No full replay or growing history requirement is proposed.
- No external model, additional subagent, public app, public deployment, frozen runtime edit, repair-author contact, unbounded fuzzing or old full game matrix was used. Minimum Node 22 was not independently exercised in this review.
- The generic component's discrete reachable-state set was not exhaustively characterized; its published bounds do not purport to authenticate every earlier productivity choice. Proposed repairs above describe the demonstrated necessary checks, not a verified full validator implementation.

## Exact SHA-256 identities

| File | SHA-256 |
|---|---|
| src/experiments/work-progress/candidate.js | 84f858d56aa77bbdfcc1e7bc44b214373851f8b00773985061acbce66d32ad35 |
| src/experiments/work-progress/camp-candidate.js | 91f26e7babb6dc4f864520b38973cc663eac86dad29aaf73c77cd05a647000a0 |
| tests/work-progress-candidate.test.js | 0ce282e6c9ddb95b7f93bcdb3f2dce4607cf9ada12808f3f647b933dbb89397c |
| docs/work-progress-api.md | 441e3ce8a875f51a765d1abcf8395d882fa07fcda90b6de87681c66951e38716 |
| docs/work-progress-execution.md | a7979b62481546c1e52672f635c81adbc7c5fc3722fa75c68fead881b613df0a |
| src/runtime/index.js | e685a514993fc0e32a84cad54d4a2a23287525e1d9923b4ee479b4cf3421ed7f |
| src/runtime/clock.js | ab770e36dcbf9a248fae30ce614b42d2e131a72176658c3eb130b40f4a49eb6c |
| src/human/v0.1.1.js | 516c5898b7352847f87abfa34b3a010a19d3461d82d81b398bba252bc9598b00 |
| src/core/model.js | 1bf30267083e8e2617fe9964d4654d8da158cba309909ace7bb50c1e6de29c59 |
| /tmp/work-progress-kernel-probes.mjs | 5beecba530697fc02f0c73b6f957792bdffd5ee2ff7dc698dea165581dfa8889 |
| /tmp/work-progress-kernel-probes.json | c5f0cd620e6994ffdfd3c8a7c3704398874ce00697af021397248cef3ec8e31d |
