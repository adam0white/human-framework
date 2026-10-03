# Connected person candidate 0.1.0

The candidate carries attributed knowledge, explicit purposes, known commitments and interaction evidence between situations. It composes the released Human 0.1.1 component without changing its bytes or the selected runtime 0.1.1 package. The subsequent [Three moments showcase](release-0.15.md) exposes selected candidate source through three interactive choices at `/person/`; the original evidence and packaging remain private.

## What it does

The reference sequence uses three authored adults: a learner, housemate and colleague. Instruction received early changes the learner's attempted work method and produced items. Those items can fulfill a later household responsibility. A separate missed supply commitment becomes interaction evidence only if delivered to the learner; that evidence changes later coordination. The housemate and colleague respond using their own observations.

| Intervention | Executed difference | Consequence |
|---|---|---|
| Instruction received / withheld | Guided / basic practice | Two / one prepared items, with equal procedural practice exposure |
| Responsibility accepted / not accepted | Deliver / paid work | One / zero items delivered; different housemate response |
| Prior breach observed / not observed | Confirm / coordinate | Confirmation request and colleague plan / immediate coordination |
| External choice overrides accepted responsibility | Paid work | Missed delivery, deadline breach and request for an alternative |
| Responsibility revised and reaccepted | Delivery to the revised meeting place | Fulfillment, with revision count retained |
| Responsibility withdrawn by creditor | Paid work | Withdrawn record stays distinct from breach |
| Hidden current obstacle | Same attempted practice decision | Failure is observed only after the ten-minute attempt |

The tests also remove the active care purpose while keeping the accepted commitment: the baseline chooses paid work and the obligation remains recorded. An unrelated observation leaves decisions and outcomes unchanged.

These are software interventions on authored rules. They demonstrate consequential, reusable state and information boundaries. A smaller host-specific notebook policy matches every reported action and world outcome. The candidate's value here is a common validated interface, persistence and trace contract; this comparison does not establish psychological realism, behavioral superiority or measured human authoring savings.

## Public candidate API

The private tarball is named `situated-person`, version `0.1.0`, with no runtime dependencies or install scripts. Import the candidate from `situated-person` and the unchanged body component from `situated-person/human`.

```js
import {createPerson} from 'situated-person/human';
import {createSituatedPerson,observePerson,decide} from 'situated-person';

const catalog={actors:['a','b'],facts:['method'],purposes:['learn'],commitments:[],actions:['try','wait']};
let person=createSituatedPerson({
  human:createPerson({id:'a',body:{fatigue:0.1,hunger:0.1},skills:{craft:0.2},observationBias:0}),
  now:0,purposes:[{id:'learn',status:'active'}]
},catalog);
person=observePerson(person,{
  id:'lesson',at:0,source:'b',channel:'instruction',kind:'fact',subject:'method',value:true
},catalog);
const choice=decide(person,{
  options:[{id:'try',requiresFacts:['method']},{id:'wait',requiresFacts:[]}],
  rules:[{id:'apply-lesson',when:{fact:{id:'method',value:true},purpose:{id:'learn',status:'active'}},actionId:'try'}],
  defaultActionId:'wait'
},catalog);
// choice.actionId === 'try'; evidence names the delivered lesson and active purpose.
```

`advancePerson` changes life chronology; `setPurpose` changes an explicitly supplied purpose. `getSituatedView` returns detached actor-local records and perceived body, while export/restore preserve the private full snapshot. An external action argument to `decide` bypasses the baseline preference and knowledge preconditions among offered actions. It is a request, not proof of physical feasibility or success; the host still executes it.

The implementation contract in the [execution plan](superpowers/plans/2026-09-14-connected-person.md) lists exact fields and enums. IDs use `[A-Za-z][A-Za-z0-9_-]{0,79}`. Catalogs supply vocabulary only; changing them based on hidden world truth would violate the host information contract. All operations validate inputs and return detached data. Received observations have monotonic integer receipt times, explicit source/channel and conflict-checked IDs. Identical repeat deliveries are idempotent. Same-time records use insertion order; the latest received record for a subject supplies the current boolean fact or status.

## Ownership and limits

The host owns canonical world and commitment records. `createCommitment` and `transitionCommitment` enforce declared transition roles and lifecycle shape. Fulfillment is a host-only event (`actorId:null`) and retains its outcome reference. They are trusted-host APIs, not an authentication or receipt-verification service: the host must verify completed outcomes before presenting a fulfillment receipt. Creditor revision releases the previous terms and proposes new ones for debtor acceptance; creditor withdrawal releases the responsibility. Hosts settle deadline events before later actions. Actor understanding changes only through separately delivered observations.

Actor-local commitment views retain the understood terms, deadline, endpoints and revision; older revisions cannot replace newer views. The revised-place case changes the executed delivery target. Interaction predicates select an actor and a specific commitment context, so unrelated later success does not erase relevant earlier breach. Facts are boolean assertions, not verified truth; later reports within the same subject/context replace the current lookup without resolving contradictions or assessing source reliability. Purposes and rule priorities are supplied by the host. The interaction labels are authored classifications of events, not personality or trust scores. No memory decay, general planning, emotion model or autonomous purpose development is implemented.

The chronology spans fourteen days through dated episodes. The learner executes thirty modeled activity minutes. Gaps do not update fatigue, hunger, learning or recovery. The host's integer event clock processes deadlines and deterministic event ordering; intermediate clock jumps and snapshot restoration produce identical results. This is persistence across dated episodes, not a continuous daily-life or aging model.

The normative foundation remains Islam-guided with Sunni Hanafi–Maturidi interpretation distinguished from empirical models and engineering rules. The household responsibilities here are authored agreements, not automated fiqh judgments. No sincerity, spiritual worth or divine acceptance is calculated. Positive moral/spiritual representation, affect and lifespan development remain substantive future work.

## Independent reuse

A separate implementer wrote an asynchronous equipment-return consumer from the frozen interface without reading the candidate implementation. It installs the tarball into a temporary project, imports only the public candidate and Human subpath, and runs with filesystem access restricted to that consumer directory. Repository reads fail. The borrower acts after instructions; the lender remains uninformed until explicit return messages arrive. Both actors' choices survive export/restore. Installed source bytes are compared with the authoritative source.

This proves bounded independent installation and reuse. It is still AI-authored integration evidence, not a human developer study. The consumer surfaced an incorrect legacy Human import during integration; the corrected candidate imports 0.1.1 explicitly.

## Reproduce

Use Node >=22, with `/opt/homebrew/bin` first on this machine's PATH.

```sh
node --test tests/situated-person.test.js tests/person-commitments.test.js tests/connected-person.test.js tests/person-consumer.test.js
node scripts/run-connected-person.js /tmp/connected-person-review
node scripts/package-person.js /tmp/situated-person-package
npm test
npm run package:runtime
```

Each explicit package build uses a fresh staging directory; repeated builds can share the output directory. It copies an explicit allowlist of private candidate modules and two frozen dependency files byte-for-byte, checks the tarball file list, and returns source hashes. It never publishes to a registry.

The [comparison artifact](../artifacts/connected-person/comparison.json) records eight controls, actual decisions, executed rule IDs, causal evidence references and world outcomes. [Verification](../artifacts/connected-person/verification.json) records final check results and source hashes. [Review](reviews/2026-09-14-connected-person.md) records checked findings and fixes.

## Next substantive gap

The next recommended milestone is continuous daily condition and retained learning: connect active episodes with explicit sleep/recovery and knowledge retention, while obligations and relationships continue to matter. Begin with the now-working connected situations and choose only the additional mechanisms their outcomes require. Do not begin another game, repeat completed controls for activity, or mistake more recorded fields for a fuller model of development. The current milestone ends at its verified delivery; scheduling remains paused.
