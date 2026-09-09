# Private Camp released-work reconsideration candidate

Candidate version **0.3.1-reconsideration.0** implements one direct host policy under [the reconsideration preflight](camp-reconsideration-preflight.md). Public Camp 0.3.0, app 0.14.1 and the current Human/runtime/model files remain unchanged. This document fixes the rule before implementation and before root freezes or executes the final comparison arms. It is not a promotion decision.

## Trigger and decision

Only a successful **player cancellation of an active assembly** can trigger the candidate. The canceled assembly must belong to Meryem's current accepted project and leave unfinished physical work. Meryem must currently own a fixed `gather-timber` or `gather-salvage` job. Food gathering, an owned meal, another person's job, a different commitment, a generic time tick and a player cancellation of a fixed job cannot trigger it.

Meryem keeps her current trip when hunger is at least .65, fatigue is at least .68, or the existing recovery mode still needs fatigue above .45. Otherwise the candidate checks whether the released assembly is actually admissible for her after stopping only her own trip. It uses the unchanged host `blueprint` and `unavailable` checks, including remaining material, stage occupancy, whole-job capacity, time and counter bounds. A copied state can evaluate that hypothetical own-task stop; refusal discards the copy and leaves the real trip intact.

If admissible, Meryem stops her own gathering job using the unchanged `stop` primitive, then begins the released stage using unchanged `begin`. Existing interruption behavior retains elapsed practice, body state, effort and paid time, cancels the old completion event and gives no gathering output. The installed assembly reservation and contributions remain owned by the physical work. The existing per-worker duration basis is reused where already latched. Ordinary `neighbor` policy continues after this event.

There is deliberately **no elapsed-time cutoff**: a nearly completed supply trip can be canceled and its useful output lost. That cost is part of this single candidate's test, not a reason to tune a cutoff after observing the final controls. Earlier frame completion can accompany worse roof timing or more work. The release/re-request player control and unchanged finish-current policy remain serious comparators.

No shared planner, new state field, automatic player command, new learning variable, added output or ration consumption is introduced. The policy responds once to the specified cancellation event; it does not repeatedly cancel/restart at a fixed timestamp.

## Source and initialization boundary

The private [host](../src/experiments/camp-reconsideration/host.js) is a direct copy of current [Camp](../src/games/camp-current.js), with only relative imports, the explicit host version, this one policy helper/cancellation hook, and `fromBaseline(snapshot)` added. Public source and all physical calculations stay attributable to the baseline. The normal API exports are retained; `createGame()` creates a fresh candidate-version game.

`fromBaseline(snapshot)` first validates the complete envelope through baseline `restoreGame`, exports that validated state, changes **only** `game.version`, and validates it through the candidate restore path. The comparison must record this explicit policy intervention point and preserve both baseline and candidate initialization snapshots. It cannot relabel a baseline-paid prefix as an always-active candidate history: a fresh candidate could already have reconsidered an earlier cancellation in that prefix. A separately identified full candidate rollout would be required for that different claim.

The initializer is for private comparisons, not public save migration. Host-version incompatibility is intentional; save envelope, runtime, Human and clock versions are otherwise unchanged.

## Focused implementation checks and final evaluation

Focused tests may exercise the known C1 development state and a short paid-trip variation to establish interruption lifecycle, event removal, paid conservation, state immutability, refusal boundaries and absence of zero-time repetition. These are implementation checks, not the frozen evaluation sample or service-output evidence. Any synthetic structural guard fixture must remain labeled as such and must not be presented as a default-origin opportunity.

Initial implementation verification: all seven focused tests in [camp-reconsideration.test.js](../tests/camp-reconsideration.test.js) pass on Node 26.8.1 and minimum Node 22.0.0. The positive-paid lifecycle fixture adds exactly three baseline minutes to the known C1 development state and checks interruption plus one following paid construction minute; it does not score project completion. Hungry/recovering and owned-meal/forage guards use explicitly labeled structural fixtures. The baseline-versus-candidate source diff is restricted to the header/import/version changes, the single helper/cancellation hook and the initializer above. All five baseline physical-source SHA-256 identities still match the completed C1 records.

Root separately freezes source, exact prefixes, objective, stopping rules and all final controls before evaluating them. The known zero-elapsed C1 case is development evidence. Positive-paid and substantive useful-trip negative controls are required; a no-feasible-work guard alone is insufficient. Preserve initial outputs and counterexamples. Candidate admission requires an independently reviewed, source-specific benefit; a lower command count does not by itself prove better service or justify a general planner.
