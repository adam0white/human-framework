**Scope.** Source and report inspection only; nothing was executed. Not supplied: artifacts, scripts, tests, `protocol.json`, the frozen mechanism-comparison module, the original maintenance example host, and the HTML. Reported run results such as test counts, event budgets and the 13/25 tally are treated as claims, not verified.

## Last Light: does information matter?

The constants in `src/games/signals.js` lines 6 to 14 and the launch rule at line 69 settle the question. Canal takes six minutes and a fare, ridge fourteen, lookout three, radio one minute plus a five-minute reply. The launch needs arrival strictly before minute 12. Both changing harbors flip at minutes 4 and 20. I traced each simple policy by hand under the host's event order: launch-closing and landing-change events are scheduled first at line 53, so they precede same-minute receipts at line 122.

| Policy | I turning | II falling | III steady | IV shut |
|---|---|---|---|---|
| Ridge at 0 | 14 | 14 | 14 | 14 |
| Canal at 0, ridge on failure | 6, launch | 20, fare lost | 6, launch | 20, fare lost |
| Lookout at 0, follow report | 17 | 23, fare lost | 9, launch | 17 |
| Lookout at 1, follow report | 10, launch | 18 | 10, launch | 18 |
| Radio at 0, wait, follow | 20 | 26, fare lost | 12, no launch | 20 |

Concrete design defects that follow:

- **Radio can never inform a launch-catching crossing.** The earliest reply lands at minute 6, canal from 6 arrives at 12, and the tie loses. The second window rewards an immediate gamble, not information.
- **The earliest affordable observation is wrong by construction in both changing harbors.** A lookout from minute 0 observes at 3; both timelines flip at 4. Following that report is the worst simple policy: always-ridge beats it in three harbors and blind canal beats it in three.
- **Information pays only with schedule knowledge.** Waiting one minute before the lookout yields a genuine three-way tradeoff among launch, minutes and fares. Nothing tells a first-time player to wait, harbors are player-selected at `web/signals.js` line 35 and deterministic, and after one replay the schedule is known and observation is moot.
- **No preference is declared.** Outcomes list minutes, fares, charges and the launch without an ordering, so "meaningful" cannot be judged from the host alone. The amendment itself concedes observations are not needed for delivery.
- **Body and practice are inert.** The ridge projects fatigue to about .44 from a .2 start, capacity cannot bind on any plausible line, and practice never shortens durations. Rest and meal are pure time sinks; the frozen runtime contributes nothing decision-relevant.

**Open questions.** The matched-access experiment's decision times are not supplied. If decisions follow an immediate lookout, both retention arms lose to no-retention, which equals always-ridge, in the two changing harbors: a valid but uninformative result. The observation-memory candidate replaces by cue on receipt at `src/cognition/observation-memory.js` lines 75 to 79, so a late stale reply overwrites a newer lookout, and "capacity 2" is irrelevant with one cue. In a noise-free world newest-observed is never less accurate, so notebook beats candidate by construction and says nothing about memory usefulness.

**On the two windows.** The launch does not force a complex method, since immediate canal is both the only method and the simplest. But "without penalizing the reliable ridge" holds only for primary delivery; the ridge is excluded from the launch in every harbor. Replay coalescing at lines 103 to 109 is sound because refusals mutate only the last response.

## Coordination helper and body isolation

**Coordination.** Line and nonblank totals in the report match the supplied files for all five measured sources; bytes are unverifiable. All seven obligations do move into `src/coordination/attempt-clock.js`. The gate failed on aggregate size alone.

Margin: 335 bytes and 20 nonblank lines, under one percent of bytes.

Of those lines, two are the header comments added to the adapted copies and six are the helper's duplicated canonical and fail utilities that each host still keeps. The negative is protocol-valid but is a size-proxy outcome at two hosts; the obligation criterion passed, and the headline should be read that way. The helper adds a capacity throw at line 16 that the original maintenance start at `maintenance-direct.js` lines 53 to 61 lacked; it is unreachable through request validation and disclosed, so parity holds for declared histories only. Meanwhile this snapshot adds a third direct-wired host: `signals.js` lines 72 to 94 repeat the receipt-guard triplet twice, for attempt and report receipts, with single person and job slots the helper cannot borrow. Duplication grew system-wide while the helper was rejected, and generality is now a three-shape question.

**Body isolation.** I verified by hand from Human 0.1.1, the core model and `src/experiments/body-isolation/pooled-model.js`: the parameter mapping, the load identity, the admission implication, and every admission in the 40-minute table. Hungry-rest is blocked for Human by hunger alone and fatigued-meal by fatigue alone, while pooled admits both. That distinction is real and correctly stated.

The remaining evidence is mostly identity:

- The logit decomposition is algebra over the same formula, inlined for pooled at `adapters.js` line 18.
- The matched-exposure proficiency count is inflated by idle, rest and meal steps where exposure is trivially equal. Both arms call the same practice function once per command at `host.js` line 64, so bitwise equality is expected rather than found.
- Tolerance criteria are not independent. For identical-admission pairs the output gap is ten times the summed joint forecast gap, per `host.js` line 76 and `experiment.js` line 85; for different-admission pairs the admissions criterion alone decides.
- The 13/25 headline mixes rows that fail by construction, since pooled admissions are a proven superset, with genuine agreement. It is not a score.
- Pooled state carries parameters and a recovery scale at `pooled-model.js` line 26, an authoring choice that inflates its snapshot; disclosed.
- "Including partial attempts" in the protocol is evidenced only by unsupplied tests; the runner never interrupts.

Unverifiable here: `protocol.json` with rival parameters, task output and retest resources, and the frozen comparison function that sets the equivalent flag.

## Play note, counterargument, verdict

`web/play-note.js` scores nothing, collects no identity, makes no network call, rejects blank notes, bounds every field and renders collapsed. The "allowlisted visible summary" is not enforced by the module; the integrator's context projection is, per the comment at line 32, and no integration exists in this snapshot since the Last Light page never imports it. So "does not gather hidden game truth" is unverifiable. A blank summary item throws via lines 10 to 23, so integrators must filter. As evidence it is honest but weak: unauthenticated self-report, client timestamp, no linkage key to a save.

**Strongest counterargument.** Every finding above is consistent with what the documents already disclaim. Schedules are called puzzle conditions, the memory comparison an engineering comparison, the amendment demands immediate baselines and forbids claiming observations are needed, the coordination gate was predeclared, and the body report hedges every number. If Last Light is a lesson about stale reports, the minute-3 trap is the point, and these artifacts are unusually candid.

**Verdict.** Honest reporting, correct arithmetic, weak gameplay value. The concrete defects are design-level: the launch window is unreachable by radio, the earliest lookout is wrong by construction, and rest, meal and practice are inert. Both experiments mainly confirm identities they were built to satisfy. Acceptable as private evidence with stated limits. The public game should not be described as offering information-sensitive choices until a harbor exists where the earliest affordable observation is reliable and a preference among minutes, fares and the launch is stated.
