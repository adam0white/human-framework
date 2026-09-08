# Independent one-pump consumer

This is the frozen **one-repair baseline only**. It uses the supplied private `paid-work-probe` package and Node built-ins, with no repository access, public interface, network service, migration, or additional item requirements.

Mara is worker A, Tomas is worker B, and Nuri owns the tool blank. The yard owns one seal and one broken south pump. `seal.place` is `shelf`, `installed`, then `spent`; `pump.finishedAt !== null` means that one pump functions. There is no output quantity that can be incremented by replaying a receipt.

```js
import {candidate as yard} from './src/candidate-pump.js';
// Or import {direct as yard} from './src/direct-pump.js';
let state = yard.create({tool: true, busy: false});
state = yard.start(state, 'mara').state;
state = yard.advance(state, 1);
const offer = yard.offerHandover(state, 'mara', 'tomas');
state = offer.state;
state = yard.stop(state, 'tomas').state;
state = yard.start(state, 'mara').state;
state = yard.advance(state, 40);
const wire = yard.exportState(state);
const restored = yard.restoreState(JSON.parse(JSON.stringify(wire)));
```

All commands return `{state, result}`; `advance`, `restoreState`, and `settle` return a state directly. The result contains the request, actors, current minute, acceptance and reason. A refusal changes only the bounded latest decision. `stop` clears the current assignment without paying time, refunding effort, returning the installed seal, or resuming anybody. `startTool` is an explicit supplier control, useful after stopping Nuri at zero. Stopped hauling cannot restart in this baseline.

All states and nested records returned by the host are frozen. Exported wire data and command results are detached. The caller must replace its current state with the returned state. `advance(state, target)` accepts an absolute integer target, up to 1,440 minutes ahead and no later than 1,000,000. It integrates real Human attempts in canonical one-minute steps. `nextEvent` returns the next prospective pump, supplier or hauling completion; a next-event driver is still required to stop before a caller command and the prescribed minute-one snapshot.

The shared yard owns exclusive tasks, consent, original seeds, people, clock, paid accounts, inventory, productivity availability and settlement. Candidate-specific translation is in `src/candidate-pump.js`; the direct pump rules are in `src/direct-pump.js`. The direct runtime dependency graph is direct-pump → yard/shape → Human → model. It has no dependency on the candidate item module. The common host is deliberately charged in full to both arms.

The candidate work wire envelope preserves all raw component fields. The direct pump record has coverage, a discharge flag, and at most two crew contributions with first-assignment minutes, paid minutes and covered share. It derives the redundant contribution effort as `.20 * share`, then validates that against the independently stored paid Human effort. Both arms retain raw current people, cumulative work/rest time, effort, task-specific exposure, current consent and latest command result. No command list, payment journal, receipt list or ever-growing item collection is part of state; evidence traces are external test artifacts.

The seven required histories use the exact fixed body and skill seeds. The optional `origins` setup is only used for explicit boundary fixtures: unfit workers and Mara starting at repair .249. In that last fixture one genuinely paid repair minute crosses skill .25, so the later proposed base is 19 while her latched base remains 20. This avoids a purported retention test in which the proposed base never changed. Origins are part of the authoritative snapshot, not authenticated past facts.

## Integration obligations and assurance limits

1. Reserve the yard's seal on accepted first start; preserve the installed seal and contributions through stop and handover.
2. Keep one task per person and one repair assignment. Only willing repairers can accept, and only the current repairer can offer. Check whole remaining capacity before committing enrollment or consent.
3. Derive the worker's proposed base from current raw skill, prepare only a provisional record, and retain the original worker base on all later assignments. Earn the tool through Nuri's owned blank and real crafting attempt.
4. Quote and pay one actual Human minute, check actual capacity, finish its attempt, and grant matching work credit in one detached prospective transaction. A later error discards the whole call's provisional state. The controlled error fixtures test both a downstream accounting exception and an actual Human capacity rejection.
5. Read every person's task and the tool from the same beginning-of-minute state. Apply completion and resource changes only after all three people have paid that minute. Free people pay rest; nobody receives a meal.
6. Settle the current completed work and consume its installed seal together. Current settled state cannot grant another pump. Importing an old branch is not authenticated storage and is outside exactly-once external persistence guarantees.
7. Restore both component and host invariants: exact JSON fields, no accessors/hidden fields/aliases, bounded clocks/accounts, raw Human validity, shared elapsed time and attempt counts, current assignment/consent correspondence, inventory conservation, contribution-to-effort/time correspondence, paid practice, tool payment and duty completion. The same validator and malformed-host fixtures are used in both arms.
8. Snapshots do not prove the past. Skill and hunger reconcile with initial seeds and paid exposure; fatigue is checked against order-independent cumulative lower/upper bounds because rests clamp fatigue and task order is absent. First-assignment bases lie between the initial/current skill-derived limits; the exact past assignment time, tool schedule and consent history are not authenticated. Current accepted permission and latest result are retained, not every prior decision. This is an explicit bounded-state tradeoff in both arms.

Host API calls provide the checked boundary. The direct rule object itself does not offer the candidate's general independent immutable item API, identifiers for arbitrary items, or up-to-16-worker support. Candidate's standalone stronger general surface is real extra assurance/capability, but no need or benefit for that additional scope is demonstrated by one pump. No weaker host resource, person, contribution, or snapshot validator is being counted as a simplification win.

No interface exceptions or additional implementation requirements were requested. The parent owns any later scope, review, Git snapshot or decision about promotion.
