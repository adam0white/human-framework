# Speech acts you can play — 2026-10-25

## Preregistration

Written 2026-10-25T17:13:23.035319+00:00, before probes. Base source: `14b7d6cdcff5b66836f8d97eee38ecc22197741a`. Use npm published HF2.21.0, archive integrity recorded privately in scratch. No release. No player round.

Three actual HF Persons negotiate a single 60-minute shift: early or late. Each actor chooses through `decide`, with `begin` and `finish` for its speech act. Each has its own preferred time. One actor alone knows it cannot work early. That constraint is absent from other Persons and their offer construction until testimony is delivered. The host knows feasibility for scoring only. Seeds1–20, three actors per seed (seed*10+role). Six round-robin decision opportunities per actor in both arms. One statement per opportunity; at most one proposal or refusal, and no extra budget for grammar.

Closed grammar arm offers propose-early, propose-late, refuse and disclose when privately applicable; fixed-choice arm uses identical semantic offers and exact information, budget and outcome effects, with fixed authored labels. Released `converse` carries private-constraint testimony. Votes are proposals actually chosen, never assigned by a winner script. Agreement requires all three actors' latest proposals to name the same feasible time. Repeated proposals cannot add votes; repeated promises cannot create credit. A separate 100-repeat adversarial check must leave accepted commitments and agreement unchanged. No host bonus for agreement and no access to another actor's private constraint when scoring offers.

GO requires at least12/20 feasible agreements in grammar, at least4 more agreements than fixed choices, zero infeasible accepted shifts, zero private leaks before disclosure, and zero spam-created credits or agreements. Any failed gate is NO-GO for a new grammar slice. Equal semantic options may produce identical results; that would reject the claim that grammar alone adds negotiation capability. This is a controlled adapter comparison, never emergence. Report per-seed agreement, disclosure and decision trace references. Do not tune after results. Existing APIs may satisfy testimony and commitment slices without a new faculty.

## Result

**NO-GO for a new grammar slice.** Both arms reached0/20 feasible agreements. Both disclosed40 testimony percepts, with zero initial private leaks and zero infeasible unanimous shifts. All chosen-action sequences matched. The direct promise-spam control grew pending commitments from1 to101 after100 repeated calls. Released `promise` is a low-level mutator, not an idempotent offer protocol; hosts must validate identity and deduplicate. This is an authoring hazard, not evidence of a shipped game exploit.

| Measure | Grammar | Fixed choices |
|---|---:|---:|
| Feasible agreements /20 |0|0|
| Infeasible unanimous shifts |0|0|
| Initial private leaks |0|0|
| Testimony percepts delivered |40|40|

Exact package: npm `@adam0white/human-framework@2.21.0`; downloaded tarball SHA256 `f3a160fa371b954f1902fbb1bd0ad0f2af84299757625f7593d42a361a16c8a9`. Runtime Node26.12.0. Preregistration UTC2026-10-25T17:13:23.035319+00:00, SHA256 `3b11ca78c2988e1ebeab8ca9ccb01e68ae08ea2d50ed8e041af4b916b0ae373b`, signed preregistration commit `5ccd894`. Original document and timestamp/hash receipt remain in worker scratch.

Reproduce with `npm pack @adam0white/human-framework@2.21.0 --pack-destination <scratch>`, extract it under `<scratch>/released`, then `node docs/lab/experiments/speech-acts-you-can-play-2026-10-25/probe.mjs <scratch>/released/package/dist/index.js <scratch>/speech-results.json`. This command runs the headless control and saves per-seed decisions privately in scratch. No browser, server, LLM or player round runs. Twenty seeds use three Persons each; both arms get18 opportunities per seed. A second run from the formatted tracked runner produced byte-identical results.

The host maps private knowledge to its own available offers. Preferences use alternating seed/role parity. Preferred proposals advertise0.2 competence and0.1 belonging; other proposals0.1 each; disclosure advertises0.2 meaning; refusal advertises no benefit. Those uncalibrated premises were fixed before the first probe, but were not numerically frozen in the preregistration: this limits the experiment. `converse` delivers the constraint only after the actor selects disclosure. No other actor reads the secret owner's state. Agreement is measured from actual proposals, not a scripted winning allocation.

Limitations: the grammar arm changes labels over the same semantic acts; it does not implement contingent offers, acceptance, enforcement or the full nine-act grammar. Equality is therefore an expected negative control, not a refutation of richer negotiation. Actors disclose but do not bargain over preferences. Spam checks raw promise accumulation, not fabricated vote or reward effects; no promise credit system exists in this fixture. The announced zero-spam gate fails without inventing one. Neither arm earns agreement bonuses. This is a controlled fixture and does not establish emergence. No implementation, new exports, engine changes or release follows this result. Coordinator should consider contingent offers only as a separately preregistered future probe, with a deduplicated commitment identity and matched acceptance protocol.
