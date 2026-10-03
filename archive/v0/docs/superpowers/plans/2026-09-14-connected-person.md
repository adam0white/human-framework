# Connected Person Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development. The user approved execution on 2026-09-14; routine choices are owned by the lead.

**Goal:** Deliver consequential knowledge, purposes and interaction evidence across three connected dated situations.

**Architecture:** A new private `situated-person` 0.1.0 candidate composes the unchanged Human 0.1.1 body component. Hosts own commitments and outcomes. An explicit deterministic rule policy consumes only the actor view; it is an authored baseline, not a human decision theory.

**Tech Stack:** JavaScript ESM, Node >=22, built-in node:test, no new dependencies.

**Spec:** ../../plans/2026-09-14-focused-framework-milestone.md

## Global constraints

No changes to frozen Human/runtime exports or public assets. No LLM actor loop. Three authored adults and three situations with events spanning fourteen days; gaps advance chronology/deadlines, not physiology. Source research stays private. Scheduled work stays paused. Integration and remote handoff are part of completion.

## Frozen candidate interface (2026-09-14)

Implement in `src/person/index.js`; any helper modules stay under `src/person/`.

All functions are pure and return detached JSON. Strict schemas reject unknown fields, invalid IDs, invalid enum values and future observations. Lists in catalog contain unique nonempty IDs. Catalog is passed explicitly and is not a world-state channel.

```js
const catalog = {actors:['learner','housemate','colleague'],facts:['method'],purposes:['learn','care','work'],commitments:['delivery'],actions:['practice','deliver','work','confirm','coordinate','wait']};
createSituatedPerson({human,now:0,purposes:[{id:'learn',status:'active'}]},catalog);
advancePerson(person,now,catalog); // monotonic integer life chronology; body unchanged
setPurpose(person,{id:'learn',status:'completed'},catalog); // active/completed/withdrawn
observePerson(person,{id:'message-1',at:0,source:'colleague',channel:'instruction',kind:'fact',subject:'method',value:true},catalog);
// source must be actor ID; channel instruction/experience/communication.
// kind=fact -> known fact subject, boolean value
// kind=commitment -> known commitment subject, value proposed/accepted/fulfilled/revised/withdrawn/breached; details:{revision,debtorId,creditorId,dueAt,terms} required
// kind=interaction -> known actor subject, value fulfilled/breached/repaired; contextId (known commitment ID) required
// at is received time <= person.now, and cannot be older than last received observation;
// duplicate identical event IDs are idempotent, conflicting repeats rejected.
getSituatedView(person,catalog); // detached actor-local data plus perceived Human view; no true body
exportSituatedPerson(person,catalog); restoreSituatedPerson(snapshot,catalog);
// output state: {version:'0.1.0',id,human,now,purposes,observations};
// observation history is actor-local input, not universal history. Restore validates all records.

const decision = decide(person,{
  options:[{id:'practice',requiresFacts:['method']},{id:'wait',requiresFacts:[]}],
  rules:[{id:'use-instruction',when:{fact:{id:'method',value:true},purpose:{id:'learn',status:'active'}},actionId:'practice'}],
  defaultActionId:'wait'
},catalog, null); // optional external action ID must be among offered options but may bypass knowledge preconditions
// when permits any nonempty conjunction of fact, purpose, commitment, interaction predicates.
// commitment predicate {id,status,revision?}; interaction {actorId,contextId,value}; latest received record in that context wins.
// first matching rule whose action is noticed wins; otherwise noticed default, otherwise null actionId.
// result {actionId,provider:'baseline'|'external'|'pending',ruleId:string|null,evidence:[observation IDs or 'purpose:<id>'],noticedOptions:[action IDs]}
// validation rejects rules referencing absent options; options/rules IDs unique; reasons derive from executed rule.
```

Host canonical commitments are separate, in `src/person/commitments.js`, exported through candidate index. Agent owning this file MUST NOT edit index.js; lead integrates exports.

```js
createCommitment({id,debtorId,creditorId,dueAt,terms},catalog);
// {id,debtorId,creditorId,dueAt,terms,status:'proposed',revision:0,updatedAt:0,outcomeId:null}
transitionCommitment(record,{type,actorId,at,...},catalog);
// accept: debtor, proposed -> accepted
// revise: creditor, proposed/accepted/revised -> revised; requires dueAt,terms; then debtor accepts
// withdraw: creditor, proposed/accepted/revised -> withdrawn
// fulfill: actorId:null, accepted -> fulfilled; requires outcomeId nonempty + completed:true; trusted host receipt reference is retained.
// breach: actorId:null, accepted with at>dueAt -> breached
// terminal statuses reject further transitions. at monotonic, all actor IDs known, endpoints different.
// Accepted records past due must breach before other transitions; no acceptance/revision to a past deadline.
// no automatic delivery to people; callers create observations explicitly.
```

## Task 1: person state, observation and choice boundary

Files: `src/person/index.js` (and scoped helpers), `tests/situated-person.test.js`.
- [x] Write tests showing delivered instruction changes executable selection, withheld facts do not; external contrary choice survives; conflicting duplicate receipt fails; restore rejects malformed/unknown IDs; life gaps leave body unchanged.
- [x] Run `/opt/homebrew/bin/node --test tests/situated-person.test.js` and record expected missing-export failure before implementing.
- [x] Implement the frozen interface. Keep procedural skill separate from facts; never accept world input in decide.
- [x] Run focused tests and hand off API behavior and caveats to lead.

## Task 2: canonical commitments

Files: `src/person/commitments.js`, `tests/person-commitments.test.js`.
- [x] Test acceptance authority, revision and reacceptance, creditor withdrawal, fulfillment requires receipt, overdue breach, immutable input and malformed records.
- [x] Run focused test red, implement independent host state machine, run green.
- [x] Lead exports functions after Task 1 lands; no shared file edits between agents.

## Task 3: connected sequence and external consumer

Lead owns `examples/connected-person/*`, `tests/connected-person.test.js`, `scripts/run-connected-person.js`. A separate implementer owns `examples/person-consumer/*`, `tests/person-consumer.test.js`, and candidate packaging if assigned.
- [x] Before scenario implementation, assert instruction/removal changes practice outcome, acceptance/removal changes household choice, delivered breach/removal changes collaboration method, and external override has real consequences.
- [x] Implement three adults with explicit observation delivery and a deterministic dated timeline using existing clock. Verify pending events are settled before time jumps. Persist/restore at context boundaries.
- [x] Compare with direct notebook/rule baseline using equivalent information and opportunities. Report matching outcomes honestly; do not claim mechanistic superiority.
- [x] After core interface freezes, independent consumer imports only packaged public exports, supplies structurally different host content, passes persistence/information checks without core edits.
- [x] Emit reproducible JSON and a concise readable causal report; no public game or UI work.

## Task 4: review, verification and handoff

Files: `docs/connected-person.md`, `HANDOFF.md`, `docs/roadmap.md`, `AGENTS.md`, candidate evidence under `artifacts/connected-person/`.
- [x] Run two independent reviews (correctness/information boundaries and goal alignment/reuse), check findings, fix real issues in one bounded round.
- [x] Run focused tests, entire repository tests, existing runtime packaging, and candidate external install. Verify frozen bytes and public build remain unchanged.
- [x] Update current direction to manual approved milestone completion, keep schedule paused, preserve open whole-person gaps.
- [x] Commit, integrate into main, push and verify local HEAD equals remote main. No public deployment if public payload unchanged.

## Execution ledger

- Ruling: the approved design plus user request to proceed authorizes routine implementation, verification, integration and remote handoff; no repeated design approval.
- Ruling: authored generic ordered rules are the explicit choice baseline. This milestone demonstrates portable state and causal wiring, not an empirically fitted psychology model.
- Interface scan: Tasks 1/2 share catalog only; disjoint file ownership. Task 3 consumes the above API; lead alone edits index exports. Task 4 modifies docs only after implementation verification.

- Review ruling: external supplied choices may select authored offered actions outside baseline noticed options, as explicitly approved. The host must provide a world-independent authored action vocabulary; no hidden world input enters the actor policy.
- Review corrections: interaction context prevents unrelated events replacing relevant evidence; commitment views retain terms/deadlines/revisions; host fulfillment retains receipt; packaging uses an explicit source manifest and fresh staging.

- Tasks 1–3 complete: candidate core, host commitments, three connected adapters, direct baseline and independently installed consumer.
- Task 4 verification complete: 903 repository tests, 32 focused tests, eight matching direct controls, frozen runtime packaging and unchanged public payload; implementation integrated and pushed at `87645ea1fb4eb8a9ea20b3928a9e6933f339f1a3`; local HEAD and remote main were verified equal.
