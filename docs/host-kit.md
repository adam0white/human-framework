# Host kit

These recipes use the existing person loop. They add no behaviour. Their executable counterparts are in [host-kit.test.ts](../packages/human/test/host-kit.test.ts). Import the functions below from `@adam0white/human-framework`.

For starting knowledge, use `seedBelief` and `seedSourceTrust`; see [Beliefs and trust](framework.md#beliefs-and-trust) for the separate trust stores. Use `fingerprint(person)` to compare canonical saves across restore. For mixed full and routine clocks, `tellDeath(community, dead, at, { late: 'now' })` delivers late news at each listener's current minute. That is also the existing default; explicit `late: 'throw'` rejects late listeners before delivering any news.

## Declare travel and setup cost

HF has no distance, route or setup model. `placeId` identifies a place; its spelling does not make a destination costly. The host computes the trip and includes its minutes in `duration`. Include its cost in `effort` if it must affect the immediate choice.

```ts
const near: Affordance = {
  id: 'near', action: 'drink', label: 'drink at the near well',
  placeId: 'near-well', duration: 30, effort: 0.1,
  advertises: { water: 0.6 },
};
const far: Affordance = {
  ...near, id: 'far', label: 'drink at the far well',
  placeId: 'far-well', duration: 150, effort: 0.5,
};
const decision = decide(person, [far, near]);
```

For otherwise identical, unlearned offers, changing only the id and place leaves their utility equal. In the test, the thirsty person chooses the near well once these costs are declared. Both offers retain the same `need:water` term. This proves a cost difference, not a general preference for nearer places. Learned expectations, goals and other motives can change the choice. The host must still move the person, check access and deliver actual water through an outcome or `consume`.

## Charge for a longer stint

The immediate `effort` term does **not** multiply by `duration`. A 150-minute offer and a 30-minute offer with the same effort and focus have the same immediate effort term at the same decision point. Time still changes the body while an activity runs. It also affects commitment windows and opt-in temporal goals; it is not a general opportunity-cost term.

One bounded host convention is to encode total work relative to a reference stint:

```ts
const referenceMinutes = 30;
const referenceEffort = 0.1;
const duration = 150;
const effort = Math.min(1, referenceEffort * duration / referenceMinutes);
```

In the test's rested adult, 30 minutes at `0.1` yields `effort = -0.0156` in the trace. Changing duration alone keeps that value. Encoding 150 minutes as `0.5` yields `-0.0781`, five times the unrounded cost. Trace terms round to four decimal places.

This is a host tuning convention, not a separate total-effort API. `effort` is bounded to 0–1 and also drives exertion, food and water use during the activity. Scaling it by time therefore increases both the immediate score cost and the physical intensity. Above the bound, this convention saturates. Use it only if that physical consequence fits the host. If intensity must remain literal, preserve it and accept the current scoring limit; a temporal goal can value its own delayed progress but does not add a universal time penalty. `followedBy` describes known later exertion for the opt-in bodily forecast; it is not a travel planner.

## Measure work against needs

Inspect `DecisionRecord.considered[].terms` or call `consider` with the same body, needs and life modifiers as the decision. Group `need:*`, `effort`, `material` and `goal:*` separately. Their coefficients are engineering defaults, not a universal exchange rate.

The test uses an adult with neutral values, no held norms, food at 0.1 and no learned expectations. A meal advertises 0.6 food at effort 0.1. Work has effort 0.5. A wage uses `material: 10`. A real, active goal uses importance 1 and advances by 0.5 on `work`.

| Offer | `need:food` | `effort` | `material` | `goal:*` | Utility |
|---|---:|---:|---:|---:|---:|
| Meal | 1.4118 | -0.0156 | 0 | 0 | 1.3962 |
| Work alone | 0 | -0.0781 | 0 | 0 | -0.0781 |
| Paid work | 0 | -0.0781 | 0.6321 | 0 | 0.5540 |
| Work for the adopted goal | 0 | -0.0781 | 0 | 1.0000 | 0.9219 |
| Paid work for that goal | 0 | -0.0781 | 0.6321 | 1.0000 | 1.5540 |

```ts
adoptGoal(person, {
  label: 'finish the work', serves: ['competence'], importance: 1,
  advancedBy: [{ action: 'work', amount: 0.5 }],
}, person.now);
const paidWork = { ...work, material: 10 };
```

The meal beats either wage or goal alone here; their combination beats the meal. A wage saturates rather than growing without bound. Do not advertise food merely to make unrelated work attractive. Model what the person expects to receive. The host owns the material ledger; an offer's `material` field supplies valuation, and does not pay a wage by itself. Goal progress comes from completed outcomes. These numbers depend on the authored person and present state; measure the host's own cases before tuning them.

## Write community bookkeeping back

`createCommunity(people, prior)` deep-copies `prior`. The returned community owns the live timers, last-perceived times, day hooks, queued advice, standing-advice completions and joint proposals. Stepping it does not update the input `prior` object.

```ts
const community = createCommunity(people, saved.community);
stepCommunity(community, world, until);
const nextSave = {
  people: community.people.map(snapshot),
  community: communityState(community),
  world: saveWorld(), // host-owned world state
};
// Restore all three parts together.
const resumed = createCommunity(nextSave.people.map(restore), nextSave.community);
```

Keep that live community between steps, or replace the stored prior with `communityState(community)` after each step. Save the people, community and world at the same boundary. Saving only people loses driver state. This recipe does not provide save storage or world migration.

The doc test steps an idle person to minute 60. The original prior still has no `dayDone` entry; the written-back state records day 0 and the next idle check at minute 75. Reconstructing from the old prior runs day 0's `onDay` hook again. Reconstructing from the new state does not. World hooks should not rely on an old prior being mutated by reference.

## Feed residents during a week

`tick` and `stepCommunity` advance deprivation. They do not invent food or water. Advertising a meal does not deliver it. Report actual intake in `Outcome.needs` when the activity resolves:

```ts
return {
  at: person.now, affordanceId: activity.affordanceId,
  action: activity.action, status: 'completed',
  needs: { food: 0.6, water: 0.6 },
};
```

A host that directly supplies residents can instead call `consume(person, { food, water })`. Both are normalized reserve increments, capped by the body's bounds. Decide when supplies exist and which person receives them. Give the host sleep and rest opportunities as well. `World.onDay` runs once per observed day, not at every meal; a daily hook alone does not establish a meal schedule.

The seven-day doc test isolates provisioning: two identical residents have the same sleep offer, and the host supplies one resident food and water before each six-hour step. That resident ends alive with health above 0.9 and both reserves above 0.3. The resident receiving no intake ends with zero reserves and dies. The control deliberately allows continuous sleep to keep sleep deprivation out of this comparison. It does not demonstrate a realistic daily routine or human survival times. A game must author its own access, meals, waking activities and interruptions. The body's rates and health losses are engineering defaults, not physiological predictions.
