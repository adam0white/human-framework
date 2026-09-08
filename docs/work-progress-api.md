# Private paid durable work candidate 0.1.1

**Private reviewed validation correction, pending root's corrected-source freeze.** Original work 0.1.0 remains attributable through the existing freeze commit and supplied independent-consumer packet; those sources are not rewritten. Version 0.1.1 keeps the named API/schema and paid transition law while rejecting the impossible saved states described below. This is a private experiment under `src/experiments/work-progress/`, not a runtime/package release or a public game change. There is no migration. The [proposal](work-progress-proposal.md) and [concrete execution contract](work-progress-execution.md) define the comparison and rejection gates. Passing lifecycle tests does not establish that the abstraction reduces maintenance cost.

## Ownership

`candidate.js` has no imports and requires Node >=22 with its built-in `structuredClone`; no older-Node clone shim is provided. It owns one item's identity, fractional progress, total effort coefficient, duration floor, each worker's first-assignment basis and cumulative contribution, and a bounded completion status. It does **not** own assignments, acceptance/refusal, resources, time, tools, body, skill changes, other people, or output effects. It does not infer that a caller paid merely because the caller requested progress.

The complete `camp-candidate.js` consumer owns those host obligations. It uses unmodified Human 0.1.1 for every actual minute and `practice` from the existing shared model only to reconcile saved practice with paid exposure. It does not import the released Camp, a rival, or another experiment's host. Its integer clock and known supplier/duty completions need no event queue. All source and dependencies count toward the candidate arm's inclusive cost.

## Shared item API

Import these named exports directly from `candidate.js`:

| Export | Contract |
|---|---|
| `WORK_VERSION` | `'0.1.1'` |
| `WORK_LIMITS` | Frozen `{workers:16,durationMinutes:1440}` |
| `createWork({id, effort, minimumDuration})` | Create an open item with zero progress and no contributors. No resources are reserved by this operation. |
| `prepareWorker(work, {workerId, basisMinutes})` | Latch this worker's basis if absent. A repeated call keeps the first basis, even if a different valid basis is proposed. Does not assign anyone, pay time or change progress. Requires open work. |
| `quoteWork(work, {workerId, durationReduction = 0})` | Return the exact next-minute fraction/effort and current remaining-work estimate for a prepared worker. Does not change work or pay anyone. Requires open work. |
| `advanceWork(work, {workerId, durationReduction = 0})` | Record one paid minute using that same work law. Returns `{work, payment}`. This is the caller's assertion that the corresponding payment is committed atomically; no external payment is executed or authenticated here. |
| `settleWork(work)` | For complete work, return `{work: settledWork, completion:{id}}`. For already settled work, return `{work, completion:null}`. Reject unfinished work. It does not consume materials or award output. |
| `exportWork(work)` | Return a detached `{format:'paid-durable-work',version:1,work}` JSON-compatible snapshot. |
| `restoreWork(snapshot)` | Validate that exact envelope and the item's structural/cross-field invariants, detach it and return frozen work. Other formats/versions, including original work 0.1.0, reject; no automatic migration is provided. |

All operations are synchronous and deterministic. They do not mutate their inputs or call callbacks, an LLM, I/O, random sampling or wall-clock time. Returned work, quotes and operation results are deeply frozen. Exports are detached mutable data for JSON serialization. A failed operation leaves every input unchanged. Reading/exporting an existing frozen result does not revalidate it through mutable state; an internal WeakSet cache contains only deeply frozen validated outputs.

Identifiers are 1–80 characters, beginning with an ASCII letter and containing only letters, digits, `_` or `-`. Effort is finite in `[0,1]`. `minimumDuration` is a whole minute in `[1,1440]`; each `basisMinutes` is a whole minute in `[minimumDuration,1440]`. The current `durationReduction` is a whole minute in `[0,1440]`. The host chooses these coefficients and earns/owns any productivity change.

For a worker with latched basis `b`, current reduction `r`, floor `m` and current progress `p`:

```js
durationMinutes = Math.max(m, b - r)
fraction = Math.min(1 - p, 1 / durationMinutes)
effortThisMinute = work.effort * fraction
remainingMinutes = Math.max(1, Math.ceil((1 - p) * durationMinutes - 1e-12))
remainingEffort = work.effort * (1 - p)
```

`quoteWork` returns `{workerId,minutes:1,fraction,effort,durationMinutes,remainingMinutes,remainingEffort}`. The final partial fraction still requires one whole exposure minute; the effort shrinks with the remaining fraction. `advanceWork` returns `payment:{workerId,minutes:1,fraction,effort}`. A quote is valid for its exact input item/worker/productivity state; do not reuse it after another transition.

The work schema is:

```js
{
  version: '0.1.1',
  id: 'repair-1',
  effort: 0.20,
  minimumDuration: 6,
  progress: 0,
  workers: {
    // Added only when the host accepts this worker's first assignment:
    A: {basisMinutes:20, minutes:0, fraction:0, effort:0}
  },
  status: 'open' // then 'complete', then 'settled'
}
```

`workers` is a record with at most 16 distinct IDs. Item state retains no sequence of quotes, commands or completed payment receipts. Workers retain only four cumulative fields. Total paid work transitions for one item cannot exceed 1,440 under the bounded basis law. Two active items with the maximum contributor count and 80-character worker IDs fit the prescribed 8 KiB work-state budget in the focused test; host/person state is separate.

Validation reconciles contribution fractions with item progress, each contribution's effort with the item's effort coefficient, and fractions with paid-minute/basis/floor bounds. Total exposure cannot exceed the slowest basis among workers who actually paid. Completed work must have at least one possible terminal contributor: every other contributor meets its full-minute lower bound, and the terminal contributor's fraction is strictly greater than the minimum for its preceding `minutes-1` exposures. Thus only one contributor can require a terminal partial-minute allowance, and a zero-work extra terminal minute is rejected. Preparation alone does not authorize such an allowance. These are item-level checks; giving every contributor a separate final-minute discount was the reviewed 0.1.0 defect.

It also rejects impossible completion status, unpaid credit, unknown fields, accessors, nonfinite/negative-zero values, shared nested work records and malformed identifiers. Completion still uses the inherited Camp threshold `1e-12`; accumulated fraction/effort consistency remains `1e-10`. Full-minute lower bounds retain their `1e-12` arithmetic allowance, while the inferred terminal exposure must be strictly positive. It retains floating-point contributions rather than silently reallocating a final rounding difference to another worker. A proposed basis is still validated on repeated `prepareWorker` calls: a different **valid** basis is ignored, not an invalid input silently accepted.

The current snapshot is authoritative within these invariants. Without recording all earlier productivity choices, this component does not authenticate history, determine exactly when work occurred, or prove that an external person paid. It must not be described as doing so.

## Required host integration

The host must supply these behaviors; the helper does not eliminate them:

1. Give every separately owned item a distinct stable ID. Reserve the owned consumable/material on first accepted start. Keep installed resources and the same item state when work stops or transfers. Do not recreate an item to refresh a worker's basis.
2. Own the exclusive assignment. A worker cannot simultaneously hold another task or build two items. A handover must come from the current assignee and have a free, capable recipient who accepts. A refusal cannot register contribution credit, move the assignment or alter the item.
3. Call `prepareWorker` on accepted first assignment using that person's current skill-derived basis. The item, rather than current skill, owns the basis on every subsequent resume. Tool availability changes only the reduction supplied for future work.
4. Apply the host's whole-remaining-action capacity check on start/accepted transfer. Also check the actual one-minute Human attempt. Availability estimates are not real payment.
5. In one immutable transaction, derive a quote, pay exactly one actual Human minute with its effort and task skill, and call `advanceWork` on the same item/productivity state. Commit the resulting person, paid totals and work together. Discard the complete provisional transaction on failure. Never grant task practice merely for assigning, quoting, asking or reading.
6. Advance all actors against the same beginning-of-minute world before applying same-minute completion/tool effects. Free actors still pay the host's chosen recovery/idle activity. The item has no time source and does not recover actors itself.
7. Consume each completed item's reservation and award its output together with the returned settled status. Do not accept an externally replayed `{id}` as an output-grant command. Calling `settleWork` again on the **current settled state** supplies no new completion. Reusing an older complete snapshot is an old branch, not a second authorized settlement; external persistence/transactions remain the host's responsibility.
8. Save item state together with assignments, owned/free/spent resources, actual people, paid totals and completion times. On restore, reconcile those host facts with component contributions. A component-valid snapshot alone cannot establish resource conservation, assignment consent, worker practice or an exactly-once external effect.

A minimal accepted-assignment fragment (after host consent, exclusivity and ownership checks) is:

```js
const prepared = prepareWorker(item.work, {
  workerId: person.id,
  basisMinutes: hostBasisFromSkill(person)
})
const plan = quoteWork(prepared, {workerId:person.id, durationReduction})
if (!assessEffort(person.body, {
  durationMinutes:plan.remainingMinutes,
  effort:plan.remainingEffort,
  exertive:true
}).allowed) throw new Error('Insufficient capacity')
// Commit prepared + the accepted host assignment/reservation together.
```

A paid-minute fragment, inside an immutable host transaction, is:

```js
const plan = quoteWork(item.work, {workerId:person.id, durationReduction})
let paidPerson = beginAttempt(person, {
  actionId:'repair', targetId:item.work.id, durationMinutes:1,
  effort:plan.effort, exertive:true, activity:'active', skill:'repair'
})
if (!paidPerson.pending.capacity.allowed) throw new Error('Capacity blocked')
paidPerson = advanceAttempt(paidPerson, 1)
paidPerson = finishAttempt(paidPerson, {
  attemptId:paidPerson.pending.id, status:'completed'
})
const advanced = advanceWork(item.work, {workerId:person.id, durationReduction})
// Commit paidPerson, advanced.work and host paid counters together.
// No host clock/resource effect may escape if any operation above fails.
```

The repair example's action, skill, owned consumable and output are host choices. The component needs none of those names. A new consumable or second independently owned repair should require only host setup/resource handling and another item, with no shared-code change. That is a rejection gate to be tested by the independent author, not a passed result here.

## Complete camp-shaped adapter

`camp-candidate.js` exports the complete facade required by the execution contract:

```js
createWorld({toolArrival:null, busyB:false, items:1})
command(world, {type:'start', actor:'A', item:'work-1'})
command(world, {type:'stop', actor:'A'})
command(world, {type:'handover', from:'A', to:'B', item:'work-1'})
advanceTo(world, absoluteMinute)
nextEvent(world)
observe(world)
exportWorld(world)
restoreWorld(snapshot)
```

Its private host version is `0.1.0`; export format is `work-progress-camp-candidate`, envelope version 1. The host supports whole world minutes 0–1,000,000, one or two items, and exactly the declared setup options. Each `advanceTo` may advance at most 1,440 minutes and rejects backward/fractional time or values outside that numeric horizon. Start and accepted handover require the entire remaining work to fit before the endpoint; a recipient without that remaining time receives `recipient-capacity`. The comparison budget remains minute 40, so the runner still clamps to that budget and intervention times. Repeating the current minute is an immutable no-op with no repeated completion effects. `nextEvent` includes active construction, C's minute-1 tool completion and B's minute-4 duty completion; it returns null when none remain and never changes the world.

The host stores `{version,setup,now,stock,spent,toolAvailable,outputs,actors,items,assignments,lastResponse}`. Each actor stores its real Human person and `{work,recovery,effort,construction,hauling,crafting}` totals. Each item stores `{work,reserved,completedAt}`. A settled item's installed reservation is zero and its resources have transferred to spent stock. Completed items retain their bounded worker contributions. No host transcript, payment journal, shadow body, duplicate skill state or history reconstruction is stored.

All A/B/C payments use real one-minute Human attempts with the declared `construct`, `haul`, `craft`, or `recover` action, correct skill and target. Before any world-minute effects, A, B and C have all paid using the old tool availability. C owns the sole tool blank: stock reports 1/spent 0 while crafting at minute 0; only C can use it. At minute 1 it becomes stock 0/spent 1 and the tool is available. B's hauling duty pays only actual completed minutes. A unilateral stop can cancel active hauling; prior effort/practice remains and the duty never automatically resumes. C is not a controllable role.

The host's handover response codes are exactly `accepted`, `recipient-busy`, and `recipient-capacity`. A refused request changes only `lastResponse`. Start and stop preserve that response. The complete normalized `observe` output is the execution contract's accounting record, including full exported Human person records; it is detached from the authoritative world. The host uses .20 item effort, floor 6, skill basis `20-floor(construction*4)`, and a six-minute reduction only after the paid tool completion.

Restore validates the bounded unshared JSON tree before cloning, then exact schema, setup/horizon, item definitions/status, single-worker assignments, installed/free/spent conservation, exactly counted outputs, supplier/duty ownership, complete paid-minute totals, per-worker component credit, actual person clock/attempt identity, and task practice from each initial skill plus recorded exposure. It also narrows the generic component's rates to this host's known productivity schedule. Without a tool, nonterminal exposures use each worker's exact latched rate; with the supplier, only the initial minute can use the old rate, and later minutes use the six-minute reduction. An item working for every elapsed minute must account for that initial slow minute. At minute 1 the tool has no retroactive effect. Only one possible terminal exposure may be fractional under these host rates.

Each item's total sequential exposure must fit within `completedAt`, or within `now` if unfinished. These are necessary per-item chronology/rate checks using bounded first/terminal-contributor possibilities, not a new history journal. They do not authenticate the exact start/stop/transfer sequence, exact historical first-assignment skill, exact completion timestamp above its lower bound, or all ordering constraints between different items. Those remaining snapshot-assurance differences must be counted and disclosed when comparing host validation costs. Every returned world is deeply frozen. Errors and capacity failures do not change caller state, including when an earlier actor provisionally paid before another actor fails within the same requested advance.

Fatigue at a snapshot is an authoritative current Human condition, not recovered history: order-dependent recovery floors cannot be reconstructed from cumulative totals. The host checks Human's valid body range and reconciles no-meal hunger as `min(1, .20 + .002 * now)`, including the unchanged Human cap at long elapsed times, but does not authenticate arbitrary rewritten past fatigue. Separate synthetic unfit-body and near-endpoint snapshots exercise admission and numeric guards; they are not claimed as earned outcomes of the comfortable eight histories or as a million-minute simulation.

## Verification and freeze boundary

`tests/work-progress-candidate.test.js` contains 28 focused tests: component prospective timing, first-basis retention when a different basis is proposed, per-worker transfer credit, duplicate settlement, malformed/unpaid snapshot rejection (including invented exposure with no minimum physical fraction), contributor/state bounds, the eight declared completions with a minute-1 JSON restore before interventions, event/minute/uneven-driver parity, installed work and actual recovery, hauling cancellation, host ownership/credit/assignment rejection, unfit start/recipient, actual-minute failure atomicity, paid supplier/duty event boundaries, and the aligned numeric horizon/advance limit. The reviewed correction adds exact regressions for multiple terminal allowances, a zero-work terminal exposure, fabricated host practice, nonexistent/retroactive productivity and premature completion timestamps; valid late starts/transferred partial completion and the explicit 0.1.0 rejection also remain covered.

Expected completion times are the protocol's declared 20, 15, 23, 15, 19, 20, 20, and paired 20/20. These are eight prescribed histories, not multiplied independent conditions. Author tests do not replace the root's source-frozen D comparison, retained intermediate accounting, independent repair integration, inclusive maintenance/size/latency measurement or adversarial review. No claim of human realism, empirical calibration or theological measurement follows.

The independent repair baseline was assigned the already frozen 0.1.0 packet. Do not replace that supplied kit mid-baseline or count a corrected rerun as the original integration result. Root must record the exact 0.1.1 correction commit/source hashes separately before a corrected rerun; this document deliberately does not claim a commit that has not yet been made. If the independent consumer needs camp internals, new shared exceptions, growing history, or shared changes for its two repair-only requirements, reject promotion. If inclusive cost grows without a documented second-consumer benefit, keep direct host code and preserve that negative outcome.
