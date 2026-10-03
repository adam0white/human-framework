# Integrating experienced-person in another application

Use the root workspace when an application already needs the fuller adaptive actor. Use individual subpath exports when it needs only a specific mechanism. The components are deterministic ESM functions over data; none imports an example, DOM, server, filesystem, generated text or remote service.

## Installation and public interfaces

Build the private package with `node scripts/package-experienced-person.js /tmp/experienced-package`, then install the resulting tarball in the consumer. `package.json` exposes `experienced-person` and `/experience` for the workspace, and `/episodes`, `/attention`, `/inference` for individual components. `/adaptive`, `/developing`, `/cognition`, `/sustained`, `/learning`, `/situated`, `/commitments`, `/human`, `/habits`, `/constraints` and `/institution` expose the existing components. Do not import internal source paths; the installed test checks their export restriction.

The source package is private 0.1.0. Earlier release identities remain unchanged; a host chooses which candidate to use. It has no runtime dependency installation, network access or service credentials. Node >=22 is declared; the verification record states the tested runtime. Browser compatibility is a source property of the pure modules, not an executed browser-integration result for this milestone.

When using `/attention` alone, the application must derive its review receipt from real completed work, verify the owner/action/time/minutes, and lock the selected message before work begins. The standalone component validates supplied receipt data and prevents duplicate use; it cannot establish the physical history. The workspace adapter supplies these actual-attempt checks for the included actor lifecycle.

## Minimal application boundary

Construct the existing adaptive actor using the chosen catalog, then pair it with `createEpisodes`, `createAttention` and `createInference` using `createExperienceWorkspace({actor,episodes,attention,inference},catalog)`. The three new components share the actor ID. Episode and attention minute clocks must equal the actor's observed time; the inference configuration has no independent clock.

The runnable [reference setup](../examples/experienced-person/setup.js) demonstrates construction. The [installed maintenance consumer](../tests/experienced-consumer.test.js) demonstrates a separate application without repository imports. They use different actors, propositions, actions, contexts and rules; no source change is needed between them.

A typical application operation is:

```js
import {
  beginExperienceAttempt, advanceExperienceAttempt,
  finishExperienceAttempt, getExperienceView,
} from 'experienced-person';

// workspace and catalog are application-owned data created through the constructors.
workspace = beginExperienceAttempt(workspace, {
  action: {
    actionId: 'read', durationMinutes: 2,
    activity: 'active', effort: 0, exertive: false, skill: null,
  },
  attentionMessageId: 'gate',
  purposeId: 'deliver',
}, catalog);
workspace = advanceExperienceAttempt(workspace, 2, catalog);
const pending = workspace.actor.person.sustained.situated.human.pending;
workspace = finishExperienceAttempt(workspace, {
  attemptId: pending.id, status: 'completed', mealConsumed: false,
}, catalog);
const privateView = getExperienceView(workspace, catalog, {contextId: 'route'});
```

This snippet assumes the action is body-admitted and the inbox message is available. A host must inspect actual admission, advance only admitted work, and report the real completed, failed, interrupted or blocked status. It must not mark a task complete because a rule suggested it. The reference helper exercises this admission check and the installed consumer tests a false-to-world inference producing failed paid work.

## Ownership and delivery

| Data | Authoritative owner | Application rule |
|---|---|---|
| Body, paid attempt, skill and minute time | Existing adaptive/developing/sustained/Human actor | Advance through the workspace while attached; never separately advance its nested actor and workspace |
| Historical episodes | Episode store | Supply only events delivered to that actor, with original times and attribution; retrieval is not a new observation |
| Unprocessed message content | Host-held inbox state | Controllers receive inbox metadata; do not expose full state or validation-error details as actor knowledge |
| Processed original reports | Existing belief ledger | Reading projects the original source claim and expiry; independent direct observations need their own non-inbox receipt IDs |
| Derived conclusions | Recomputed inference view | Keep them separate from original evidence; never write a conclusion back as an independent source |
| Resources, access and actual output | Host world | Resolve success against canonical state after paid work; a positive belief can be wrong |
| Recipient response and external choice | Host/player/recipient policy | Carry supplied choice and response; do not equate them with inward intention or moral standing |

Messages can arrive during an ongoing attempt, but they cannot replace its locked attention target. A message expiring during reading leaves paid time intact and adds no belief. A correction referring to an unprocessed original cannot be selected yet; the application receives a protocol error before work starts. Invalid deliveries are host integration errors, not modeled perceptual clues for the player.

## Persistence and bounded use

Save `exportExperienceWorkspace(workspace,catalog)` together with the host world, pending world jobs, controller state and any random generator state. Restore via `restoreExperienceWorkspace(snapshot,catalog,expectedOwnerId)` before continuing commands. Saving only the person does not save the application's resources or scenario program. Checkpoint replay verifies identical commands, not arbitrary equivalence between different host schedules.

Snapshots and command payloads must be plain data. Known module state is validated before copying; outputs are detached. Exceptions leave the input unchanged. Structural checks reject owner/clock disagreement, altered message/evidence projections and impossible payment references. They do not authenticate coherent rewrites of all historical fields. Each application remains responsible for its storage trust and exposure boundary.

Declare scenario budgets within the finite histories. Current limits intentionally reject exhaustion rather than evicting provenance or silently truncating inference. To scale beyond them, introduce an explicit reviewed archival/compaction protocol and additional scale evidence; do not delete receipts that explain live conclusions or paid history.

## Validation before adding another consumer

Exercise an actual decision and consequence with the component enabled and a relevant input removed. Include unpaid/interrupted attempts, expiry or correction, a mid-action save, and an equally informed simple controller. Install the exact tarball in isolation and verify no example-private imports. Preserve a direct controller that performs equally well: adding a record model is not evidence of improved human prediction or authoring speed.
