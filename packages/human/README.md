# @adam0white/human-framework

HF is a TypeScript library for simulated people in games and headless simulations. Your world offers
possible actions. Each person weighs needs, habits, duties, goals and suggestions, then chooses.
A player can suggest an action; the person can defer or refuse it.

HF 3.1.0 uses utility scoring and seeded randomness, with no LLM in the actor loop and no runtime
dependencies. Decision records expose scored terms and template narration. Person state is plain JSON.
This is an authored simulation model, not a validated predictor of real people.

## Migrating to v3

The HF 3.0 API migration kept engine `2.23.0`. Relative to HF 2.23.0, that release changed no seeded draws, numeric rules or saved Person state.

HF 3.1 uses engine `3.1.0` and migrates earlier supported snapshots by preserving admitted state. Community death handling, warmth-through-25 upbringing and conditioned bodily forecasts require explicit host options, pinned again after restore. Omitted options preserve HF 3.0 continuation apart from the engine stamp. These are authored simulation rules, not validated predictions of real people.

| Before                                                                         | v3                                                                                                |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `glimpse(p, id, signs, { at, clarity })`                                       | `glimpse(p, id, signs, at, clarity)`                                                              |
| `glimpseOf(p, target, at, clarity)` or `glimpseOf(p, target, { at, clarity })` | `glimpsePerson(p, target, at, clarity)`                                                           |
| `acquaintWith(p, target, familiarity, at)`                                     | `acquaintPerson(p, target, familiarity, at)`                                                      |
| `hear(p, id, key, value, { at, weight })`                                      | `hear(p, id, key, value, at, weight)`                                                             |
| `conceive(mother, father, { seed, at })`                                       | `conceive(mother, father, seed, at)`                                                              |
| `retell(teller, listener, { at, trust, limit, placeIds })`                     | `retell(teller, listener, at, { trust, limit, placeIds })`                                        |
| `TRAIT_NAMES`                                                                  | `TRAIT_KEYS` (same order)                                                                         |
| `expit(x)`                                                                     | `sigmoid(x)` (same function body)                                                                 |
| `keysOf(record)`                                                               | `Object.keys(record)` (same enumeration order; narrow host key types explicitly when needed)      |
| `repent(p, breachId, unusedTime)`                                              | `repent(p, breachId)`                                                                             |
| `recordRepair(p, victimId, unusedTime)`                                        | `recordRepair(p, victimId)`                                                                       |
| `liveRoutine(p, to, fixedRoutine)`                                             | `liveRoutine(p, to, () => fixedRoutine)`                                                          |
| `routineFor: (p, day, community) => choose(p, day, community)`                 | `routineFor: (p, day) => choose(p, day, community)` with `community` captured from the host scope |

Removed options-object calls from untyped JavaScript throw `TypeError` before changing Person state. Their time argument must be a finite number in the positional slot.

Both routine drivers use `RoutineSource = (p: Person, day: number) => Routine`. `day` is the absolute day being started. Existing two-argument sources continue unchanged. A community source closes over the community for that run; bind a new closure after restoring a different community. Sources still run immediately before each person's routine day. Community dawn hooks still run first, and earlier people's days are already applied when later sources read community state. Do not precompute all routines at dawn if that would change those reads.

The primitive names `glimpse` and `acquaint` stay. Their Person composites use the explicit `Person` suffix. The proposed `skip` → `skipTo` rename is dropped (Q15): it provides no player value and `skip` is clear in context.

### Tuning defaults (Q5)

Assignment to existing mutable defaults remains the tuning API in v3. These settings apply to every run in the same module instance. Set them before creating or restoring a run, then keep them fixed while it runs. Already-frozen defaults remain frozen.

Deterministic replay requires the same engine version, effective tuning values, initial state, seeded streams, inputs and call order. Person snapshots do not store these global settings. A host that tunes must store its complete effective configuration or its overrides relative to a known pristine baseline in its save or replay envelope. Before restoring or continuing, restore that baseline first, then apply the saved overrides. A fresh module instance is another way to start from the baseline. Applying overrides over a previous run's settings can leak tuning between runs.

Two worlds with different settings cannot safely share one module instance. Tests that tune must restore values in a `finally` block and must not mutate them concurrently. This decision preserves existing hosts and seeded behavior. It adds no global configuration function or per-person settings. A future isolated settings API must first demonstrate exact snapshot, restore and continuation under overrides.

## Ordering inputs for one logical tick (opt-in)

`canonicalTickInputs(tick, inputs, expected)` waits for the complete declared sender/sequence set and returns a new envelope array sorted by sender, then sequence. It returns `undefined` while an input is missing and throws for duplicate, unexpected or wrong-tick inputs. Payloads remain host-owned. Use the returned array only after the barrier completes; save pending input with host state.

This is a same-runtime host convention with lexical sender priority, not transport, consensus or fairness. It reads no Person or RNG. Existing actor calls never use it implicitly. The H3 controls compare reordered deliveries, withheld input, restore and a behaviorally different unsorted control. The copyable two-person [starter](https://github.com/adam0white/human-framework/tree/v3.0.0/packages/human/examples/h3-starter) owns its own clock and replay envelope; it is not a complete game engine or part of the npm artifact.

## Try the games

- [Twice at the Well](https://human.adamwhite.work/colony/): compare a colony without and with HF.
- [The Day You Say Nothing](https://human.adamwhite.work/voice/): suggest actions to one man who can refuse.
- [The Night Watch](https://human.adamwhite.work/watch/): guide a village watch across winters.
- [All lab games](https://human.adamwhite.work/games/).

## Quick start

Use Node 24 or newer and TypeScript 7 or newer. In an empty directory, install the version this README describes:

```sh
npm install @adam0white/human-framework@3.1.0
```

Save these 20 lines as `quickstart.mjs`, then run `node quickstart.mjs`:

```js
import {
  createCommunity,
  createPerson,
  createVillage,
  predict,
  stepCommunity,
  villagerSpec,
} from '@adam0white/human-framework';
const start = 6 * 60; // simulation minutes
const ids = ['ada', 'bora'];
const people = ids.map((id, i) => createPerson(villagerSpec(id, id, i + 1, { now: start, others: ids })));
const world = createVillage(people, { seed: 7 });
const community = createCommunity(people);
const ada = community.people[0];
const ask = { voiceId: 'player', action: 'chat', strength: 0.6 };
const hint = predict(ada, world.affordancesFor(ada), ask);
console.log('Prediction:', hint.verdict, hint.reason);
stepCommunity(community, world, start + 24 * 60, {
  suggestions: { ada: ask },
});
console.log('Last decision:', ada.trace.at(-1)?.narration);
console.log('JSON snapshot characters:', JSON.stringify(ada).length);
```

`predict` leaves the person and RNG unchanged. `stepCommunity` advances a bundled example village
for one day; the suggestion stands at Ada's decisions. For your own game, replace that village
with a `World` that supplies offers, percepts and actual outcomes (see [the host contract](#the-host-contract)).

## What it models

- Bodily and psychological needs, affect, attention, memory, beliefs, skills, habits and relationships.
- Values, held moral norms, commitments, goals and trust in outside voices.
- Optional faculties for long runs: aging, family, gists and character change.
- Opt-in curiosity, bounded planning, self-set projects from host-shown prospects and pursuit persistence.

The host supplies the available actions and their meaning. Projects and planning do not invent actions
or solve arbitrary tasks. In the island control on 2.14.1, people made small free-time piles, but most
placements replaced earlier work and the carry task did not improve. See the
[experiment](https://github.com/adam0white/human-framework/blob/main/docs/lab/experiments/island-2026-10-20.md).

HF does not provide a map, pathfinding, free-form language, a general planner or calibrated human
behaviour. Its default norms are Islam-guided; it models a person's held understanding, never a ruling
or divine acceptance. See [the boundaries](#what-it-does-not-model).

## The spine: Urge → Assent → Act

At each decision many pulls act on the person at once: bodily and psychological needs, understood duties,
commitments, goals, habits, emotions, learned expectations, relationships, and suggestions from outside
voices (a player, a parent, a manager). These are **urges**. The person scores every offered action as a sum
of named terms (`need:food`, `norm:theft`, `commitment:job`, `habit`, `suggestion:player`, ...). Then the will
**assents** to one option: vetoes come first, then selection (argmax with hysteresis by default, softmax
from the person's own RNG if `will.temperature > 0`). The person **acts**, the host resolves what actually
happened, and the outcome feeds back into body, memory, skills, habits, emotions, relationships, conscience
and trust in the voice that advised it.

A suggestion is one urge among many. Its weight is strength × trust in the voice × how well its appeal
fits the person's motives, and a suggestion alone never overrides a veto. Each one resolves to a typed
verdict (`SuggestionResolution`):

| verdict     | meaning                                                                                                                         | `kind`               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `assented`  | the suggested option won                                                                                                        | none                 |
| `deferred`  | the person's own preference won; carries a `counterOffer` ("after I eat lunch")                                                 | `notNow`             |
| `modified`  | a near alternative with the same action or aim won; the `counterOffer` names it                                                 | `notNow`             |
| `refused`   | cannot (asleep, exhausted, skill far too low, a pressing bodily need) or will not (a firmly held norm, broken trust)            | `cannot` / `willNot` |
| `complied`  | the voice insisted on a "not now"; done under protest (`activity.protest`), at a cost to autonomy and trust                     | `notNow`             |
| `commanded` | the host took direct control (see [Direct control](#direct-control)); the person does the order whatever they would have chosen | none                 |

Insisting (`insist: true`) turns only a `notNow` into compliance, and not when a bodily need is pressing. It
never overrides `cannot` or `willNot`.
Every resolution also carries a machine-readable `reason` (`need:food`, `norm:theft`, `asleep`, `distrust`,
...) and a line in the person's voice (`says`).

## Package and source

The package ships ES modules and TypeScript declarations. It requires Node ≥24 or a modern browser
with `structuredClone`. Source, tests and runnable examples are on
[GitHub](https://github.com/adam0white/human-framework/tree/main/packages/human).
In a source checkout, `npm run examples -w packages/human` builds and runs `minimal.ts`,
`suggestions.ts` and `community.ts`. The `examples/` and `test/` directories are not in the npm package.

## The host contract

The framework has no world of its own. The host supplies three things and receives one.

- **Affordances** (`Affordance`) are the actions on offer right now, each with an honest advertisement of
  its typical effects: `id`, `action` (a verb class such as `eat` or `pray`), `label`, `duration` in minutes
  (fold travel in here), `effort`, `advertises` (need deltas), and optionally `focus`, `mode: 'sleep'`,
  `skill`, `tags`, `norms` (`{ normId, relation: 'fulfills' | 'violates' }`), `risk`, `material`, `with`,
  `fulfills` and `advances`. Always offer zero-prerequisite floor options such as `wait` and `rest`. The
  person's learned expectation of an action can drift from its advertisement.
- **Percepts** (`Percept`) are what the person might notice: `channel` (`saw`, `heard`, `told`, `felt`,
  `outcome`, `social`), `kind`, `salience`, `summary`, and optionally actor, target, valence, claims,
  norms, advice, `demonstrates` (a skill being shown, which teaches a watcher a little) and `near` (the
  framework has no space, so the host marks what is close).
  Attention decides what is encoded.
- **Outcomes** (`Outcome`) are world truth when an activity ends: `status` (`completed`, `failed`,
  `interrupted`), realized `needs`, `material`, `injury`, `illness`, follow-on `percepts`, `quality`,
  `practice` (practice quality and instruction) and `exposures`. The framework computes exertion and sleep itself.
- **Decisions** (`DecisionRecord`) come back: the chosen offer, the top `considered` options with every
  utility term, the suggestion verdict(s), a private `intention`, and a `narration`.

### Expected benefits and observed outcomes

An offer describes expected effects. An outcome reports what happened. The host resolves space,
contact, inventory and payment; HF uses the reported outcome to update the person. Do not copy
`Affordance.advertises` into `Outcome.needs` as a general completion rule.

<!-- biome-ignore format: Biome 2.6.3 adds column padding on each pass for this inline-code table; preserve stable source. -->
| Host situation                                    | Offer                                                                                      | Completion report                                                                                                                                                                                                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A person sleeps for part of the planned night.    | Advertise typical sleep/rest benefits and set `mode: 'sleep'`.                             | Leave `sleep` and `rest` absent from `Outcome.needs`.`finish` advances the body to the actual end time and measures their change since the activity began. Explicit values replace that measurement; copying the advertisement can overstate the realized recovery reported to learning. |
| A task promises four coins but actually pays two. | Set expected `Affordance.material` to four host units.                                     | Update the host ledger by two and report `Outcome.material: 2`. A completed task does not imply the promised payment arrived. Report zero for no payment and a negative value for an actual cost. HF does not maintain the host's money ledger.                                          |
| A person can talk with someone who is present.    | Tag the offer `social` when it really involves social contact; put participants in `with`. | Resolve actual participation. An empty room, a sleeping neighbour or someone who arrives after the conversation ends is not a completed encounter. Do not award contact or belonging merely because the activity uses a shared place.                                                    |

For in-person activities, the host must establish co-presence and overlapping participation. HF has
no map and does not discover companions. `with` names people taking part, not everyone assigned to a
place. A `social` tag is also a claim about the offered activity, not a request to find someone. If
contact becomes impossible, interrupt or replan the activity instead of completing the declared
encounter. Report only the need effects that the actual interaction supports.

The current behavior is defined in [`Affordance` and `Outcome`](https://github.com/adam0white/human-framework/blob/main/packages/human/src/types.ts) and
[`finish`](https://github.com/adam0white/human-framework/blob/main/packages/human/src/person.ts). Existing controls cover [body advancement and waking after sleep](https://github.com/adam0white/human-framework/blob/main/packages/human/test/person.test.ts),
[body recovery](https://github.com/adam0white/human-framework/blob/main/packages/human/test/body.test.ts), [material valuation under scarcity](https://github.com/adam0white/human-framework/blob/main/packages/human/test/cognition-scarcity.test.ts),
[actual material in day records](https://github.com/adam0white/human-framework/blob/main/packages/human/test/chronicle.test.ts), and [relationship-aware social terms](https://github.com/adam0white/human-framework/blob/main/packages/human/test/social.test.ts).
These boundaries require correct host reports; they do not imply a framework behavior change.

### Scheduled activity reviews

A custom host must process `activity.reviewAt`, including during sleep. `tick` advances the person;
it does not dispatch a decision or automatically end the host's job. An `activity.interrupt` is also
a request to review, not an instruction to cancel every activity.

At a due review, call `decide` with physically feasible alternatives. It includes the current activity
with its remaining duration. If that activity is chosen again, call `reviewed(p)` and keep its original
job, arrival time and reservations. If another activity wins, reconcile the old physical job, call
`finish` with an interrupted outcome, then `begin` the chosen activity with its decision record.
Do not restart a continued activity or refund its resources. Hard capacity vetoes still apply.

Sleep reviews can move earlier for ordinary pending appointments. The appointment's time pressure
can permit waking; an obligatory norm is not required. A host that ignores the scheduled review can
make someone miss an obligation HF was ready to reconsider. This does not imply advance planning
for unavailable future actions. See [`reviewed` and the decision lifecycle](https://github.com/adam0white/human-framework/blob/main/packages/human/src/person.ts) and
[`wakeReviewAt` and commitment-based waking](https://github.com/adam0white/human-framework/blob/main/packages/human/src/will/will.ts).

You can drive a person by hand: `decide(p, offers, { suggestion })` → `begin(p, offer, record)` →
`tick(p, now)` → `finish(p, outcome)`, with `perceive(p, percepts)` and `interrupt(p, now, reason)` between.
Or implement `World` and let `stepCommunity` sequence everyone in deterministic (time, id) order:

```ts
interface World {
  now(): Minute;
  affordancesFor(p: Person): Affordance[];
  perceptsFor(p: Person, since: Minute, until: Minute): Percept[];
  resolve(p: Person, activity: Activity, reason: 'ended' | 'interrupted'): Outcome;
  // optional: mirror, beginOptions, scarcityFor, onDay, converse, catalog, skillTransfer
}
```

`stepCommunity` also runs the protocols for joint activities (an offer tagged `joint` with `with`),
conversation (testimony and advice between members), contagion, and the optional life-course rolls.
`runSilent(c, world, days, { mutedVoiceId })` runs the same driver with one voice's standing suggestions
dropped. `diffChronicle(a, b)` then reports what changed between two periods of consolidated day records.
It covers what the person now does unprompted, what they still do only when told, and how trust and mood
moved. `stepCommunity` tells each death to everyone with a tie (`tellDeath`). One scenario is bundled as the
reference host: `createVillage`.

## Determinism, snapshots, versions

- All randomness comes from seeded RNG state held in `person.rng`, or in the host's own state for world
  events. The library never calls `Math.random` or `Date.now`. Offers are processed in stable id
  order and ties break by (utility, id). The same seed and inputs give the same decisions.
- `Person` is plain JSON. `snapshot(p)` is a deep clone. `restore(json)` checks `schema`
  (`PERSON_SCHEMA`, `human/person@1`) and `engine`, then fills missing or mistyped fields with defaults.
  Collections are bounded (episodes, beliefs, trace, emotions, breaches, voice history).
- **A save is three things:** each person's `snapshot`, the community's host-side state
  (`communityState(c)`), and the world's own state. Restoring only the people and calling
  `createCommunity(people)` diverges: the day hooks run again, and queued advice and standing-advice
  completions are lost. Resume with `createCommunity(people, savedCommunityState)` and the world's resume
  option (for the village, `createVillage(people, { seed, state })`):

  ```ts
  const save = JSON.stringify({ people: c.people.map(snapshot), community: communityState(c), world: village.state });
  const s = JSON.parse(save);
  const people = s.people.map(restore);
  const village2 = createVillage(people, { seed: 0, state: s.world });
  const c2 = createCommunity(people, s.community); // continues exactly as the unsaved run would
  ```
- **Time arguments.** A host event takes `at` as its last required argument, with optional knobs after it (`glimpsePerson(observer, target, at, clarity?)`, `retell(teller, listener, at, opts?)`); a query evaluated at a time takes `now`. The former 2.0 options-object forms are removed in v3. See docs/framework.md, "Argument order".
- Hosts that live people sparsely over decades can shrink what a save carries per person with
  `setRetention(p, { trace, chronicleDays })` (or `PersonSpec.retention`): fewer decision records, and day records
  bounded by age as well as count. No decision changes. `restore` also refuses a non-finite or out-of-range `now`
  and bounds retained lists; hosts must still limit input size before parsing.
- Version numbers are described under [Versions](#versions).

## Versions

There are two version numbers, and they move independently.

- **The release version** is the package version (`package.json`, currently `3.1.0`) and `FRAMEWORK_VERSION`, the same
  string compiled into the build; a test keeps them equal. It versions the public API under
  [semver](https://semver.org/): a breaking change to an exported name or signature bumps the major, a new
  faculty or export the minor, a fix the patch. Each release is a tag `vX.Y.Z` and a GitHub release whose notes
  are that version's section of the root [CHANGELOG.md](https://github.com/adam0white/human-framework/blob/main/CHANGELOG.md), with the package tarball attached
  (`npm run release`, from a clean checkout of pushed `origin/main`).
- **`ENGINE_VERSION`** (exported; `3.1.0` at release 3.1.0) versions simulation behaviour and the save format. It
  changes when the same seed and inputs would give different decisions, or when person state changes shape.
  `restore` upgrades saves from engine 1.4.0 and later through `migrate` and refuses older ones. Every release's notes name the
  `ENGINE_VERSION` it ships, so a host can tell whether its saves still restore.

The root `package.json` version is the site's version (stamped into the site's `release.json`) and is not part of
this policy.

## Observation and inherited aptitude

`observeSkill(p, skill, minutes, modelLevel, domain, { inheritedAptitude: true })` applies the person's existing inherited skill factor to observation. An attended `Percept.demonstrates` can declare the same flag. Only literal `true` enables it. Without it, watching keeps its previous rate, including for people whose saved family already has aptitudes. This adds no Person state or RNG draw and does not change direct practice. Save the host's observation inputs and pin the package when opting in.

## Optional felt body (2.21 release)

`PersonSpec.enable.doze` accepts `{ posture: 'upright' | 'seated' | 'reclined', stimulation: number }`; `enableDoze` and `setDozeContext` are the explicit host calls. Doze onset is checked at integer-minute boundaries while awake. `readDoze` reports the current hazard; `nextDozeCheck` tells a manual host when to tick next. The opt-in costs one check per elapsed minute, including when onset gates are closed. It changes integration granularity, so enabled runs require a new replay pin. A dozed activity records `dozedAt`; the host resolves interrupted work with `finish`. Until that call, `begin` refuses every replacement, including voluntary sleep and work chosen after waking. Doze does not wake spontaneously. `perceive` wakes for a delivered percept stamped within the current doze span through `p.now`, including an alarm that occurred between community checkpoints, with `salience >= 0.8`, a heard/felt/social channel, detectable proximity (`near !== false`) and either `targetId === p.id` or `near === true`. The host must supply those alarms. Other delivered percepts pass through ordinary bounded attention, as during voluntary sleep. These hazard and salience values are engineering constants.

`estimateQuantity(p, { truth, difficulty })` is an explicit observation, not a display reader. Finite nonnegative truth and difficulty in `[0,1]` are required. A nonzero request consumes one draw from the person's saved seeded RNG; zero truth or zero difficulty returns truth with confidence 1 and consumes none. The result does not store a belief. Objective sleepiness widens its uniform error; perceived sleepiness determines confidence. Coefficients are engineering choices, not calibrated uncertainty intervals.

`PersonSpec.enable.bladder` or `enableBladder(p)` starts a normalized fill store. `readBladder` returns true and perceived urgency, equal in this first slice. Water intake adds delayed fill and a small base rate fills it over time. A host marks a toilet `Affordance` with `voidsBladder: true` to add urgency-based choice value. Actual successful urination is separate: a completed `Outcome` with `voidedBladder: true` empties it; `voidBladder(p)` is the direct host operation. An interrupted or failed outcome does not empty it. For an offer that declares voiding, expectation learning treats completion without actual voiding as failure of that purpose. Do not use `needs.relief` as a substitute: that field reduces pain. Filling rates, threshold and choice weight are engineering constants. The model has no continence, automatic toilet search or automatic waking.

With none of these options enabled or calls made, person state and seeded RNG continuation match HF 2.20.0 after normalizing the engine stamp only. The bodily options were introduced in HF 2.21.0. Site games pin their adopted package separately from the current library; upgrading the library does not enable these faculties or silently change game runtime.

## Long runs (2.0)

HF 2.0 adds what a life over decades needs. Each faculty is opt-in or absent until used, so a host that uses none
of it runs as before.

- **Experience over years.** Skill learning follows a domain's age curve (`Affordance.skill.domain`), related skills
  move together (`World.skillTransfer`), practice quality and instruction matter (`Outcome.practice`), watching
  someone skilled teaches the basics (`Percept.demonstrates`, `observeSkill`), practice slows forgetting
  (`enableSkillRetention`), and traits and values mature and drift slowly with experience (`enableCharacterChange`).
- **Lasting memory.** `enableGists` folds old episodes into bounded gists that still weigh on choices decades later;
  `retell(teller, listener, at)` passes a teller's gists to a listener (a child fears a place their parents fear before standing there);
  `enableYearbook` keeps one summary per year.
- **Family.** `conceive(mother, father, seed, at)`, `pregnancyDue`, `deliver`, inherited aptitudes, and `raise` (upbringing: values, the lived
  example of norms, attachment, trust in the household's voices).
- **Courtship and marriage.** `court`, `courtshipStage`, `betroth`, `canMarry`, `marry`, `widow`, with customs
  (`GENERIC_CUSTOM`, `MUSLIM_CUSTOM`); accepting a proposal is an ordinary decision, so a person can refuse.
- **Surroundings.** `setAmbient` (cold, dark, crowding, beauty, weather, day length) shifts mood, body and needs.
- **Multi-year stepping.** `liveRoutine` and `liveCommunity` live people by routine a coarse day at a time, with
  natural death, chronic onsets, deaths told and minors raised.
- **Impressions of others.** What one person believes about another (`glimpsePerson(observer, target, at, clarity?)`, `observeAct`, `hear(observer, targetId, key, value, at, weight?)`,
  `acquaintPerson`), with confidence; `predictAs` runs a prediction on the person as the observer pictures them.
- **Switching on at creation.** `PersonSpec.enable: { gists, yearbook, character, skillRetention }` turns the long-run faculties above on when the person is created.
- **Answering between decisions.** `answerNow` books a refusal at once without touching the running activity.

## Direct control

`command(p, { voiceId, action, since })` (or `StepOptions.controlled`) takes direct control: the person does the
order whatever they would have chosen, at a price in autonomy, voice pressure and trust that grows with how much
they would rather have done something else. A pressing need suspends it for a decision; death, a mental break,
being downed, or an order to break a held norm ends it. Suggestions are unchanged. See docs/framework.md.

## Mental breaks

`enableBreaks(p, behaviours)` opts a person into crises: under a low mood or heavy stress a break can start (an
hourly hazard on the person's own RNG), and for its length only the host's break behaviour is open to them and no
voice reaches them. Sleep and comfort from someone close shorten it. Off unless enabled.

## Injuries, bleeding and being downed

Injuries impair moving, manipulation and sight by body part (`readCapacities(p)`; a host can pass its own `affects`),
and an offer can require a capacity (`requires: { moving: 0.5 }`). A host-set `bleeding` rate drains health until it
clots; `tend(p)` slows it and speeds healing. `knockDown(p)` / `standUp(p)` down a person (only lying, resting or
sleeping stays open), and `enableDowned(p, { health: 0.3 })` lets the framework down them below a floor.

## Insiders, outsiders and threats

`joinGroups(p, ['village'])` and `meet(p, 'stranger', ['caravan'])` give new ties insider or outsider defaults (by the
person's stance toward outsiders), and harm to an insider matters to them. A percept with
`threat: { severity, sourceId }` becomes fear aimed at the source: risky options and options with that person or at
that place lose appeal until the fear fades. Groups and factions themselves stay with the host.

## What it does not model

- **Space and travel.** There is no map or pathfinding. Hosts fold travel into `duration` and mark nearby
  percepts with `near`.
- **Language.** Narration is templated from phrase packs (`Lexicon`). No LLM is involved.
- **Calibrated human behaviour.** Parameters are engineering defaults chosen for plausible behaviour at
  game time scales. Where a published model informs a shape (two-process sleep, power-law practice, OCC
  appraisal, HEXACO, Schwartz values), the module's doc comment names it. Each module's doc comment
  starts with a scope paragraph that also lists what that faculty leaves out.
- **Rulings or divine judgment.** Norms come from a host catalog with provenance (`NormDefinition.sources`;
  the bundled `DEFAULT_NORMS` is Islam-guided; each reference's verification status is listed in
  [research/norm-sources.md](https://github.com/adam0white/human-framework/blob/main/research/norm-sources.md)). A host with its own catalog passes it as
  `World.catalog`, so necessity excuses and exemptions read that catalog; a norm not in it is not excused.
  A person holds an _understanding_ of a norm, with a standing and a conviction. That understanding is
  not a ruling. The library never computes divine acceptance. Where schools of thought differ, the
  position the bundled catalog takes, and why, is recorded in
  [research/decisions.md](https://github.com/adam0white/human-framework/blob/main/research/decisions.md).

## Further reading

- [docs/framework.md](https://github.com/adam0white/human-framework/blob/main/docs/framework.md): the architecture, which module owns which state slice, the
  utility terms, will rules, host protocols, and locked decisions.
- [docs/api.md](https://github.com/adam0white/human-framework/blob/main/docs/api.md): every export, grouped by module, generated from the built declarations.
  Helpers tagged `@internal` are stripped from the shipped declarations and are not part of the API.
  The affect module's `release` is exported as `releaseEmotion`, the agenda's as `releaseCommitment`, and the
  will's scorer as `scoreAndResolve`.
- [docs/findings.md](https://github.com/adam0white/human-framework/blob/main/docs/findings.md): negative findings recorded during development.

## License

MIT; see [LICENSE](LICENSE). The repository's `docs/` and `research/`, which this README links to, are
CC BY 4.0.

## Learning a demonstrated conditional step

Use observations the person actually received; the host owns what those observations mean. Matching is on categorical cue strings, not hidden world state or a per-object correct-action table.

```ts
receiveMethodCues(learner, {
  contextId: 'observed-example',
  cues: [
    { cue: 'route', value: 'north' },
    { cue: 'signal', value: 'clear' },
  ],
});
demonstrateMethod(learner, {
  id: 'routing-north',
  demonstrationId: 'example-1',
  contextId: 'observed-example',
  sourceId: 'instructor',
  conditions: [
    { cue: 'route', value: 'north' },
    { cue: 'signal', value: 'clear' },
  ],
  action: 'send-north',
  outcome: 'success',
});
// A new parcel can share the learned observation structure.
receiveMethodCues(learner, {
  contextId: 'new-parcel',
  cues: [
    { cue: 'route', value: 'north' },
    { cue: 'signal', value: 'clear' },
  ],
});
const evidence = methodEvidence(learner, 'send-north', 'new-parcel');
// Offers for that parcel carry methodContext: 'new-parcel'.
// Ordinary decide() includes the acquired method term alongside other motives.
clearMethodContext(learner); // when leaving or switching the task
```

Import these functions from the package. Rules/evidence live in optional `Person.methods` and survive snapshots. Current cues expire after 120 minutes. A stable demonstration id avoids counting the same example twice within the retained 256-example history, even after its rule or evidence is evicted. Once an id has left both that history and retained rule evidence, it can be admitted again. Missing observations cannot satisfy a condition. Failed demonstrations reduce support for that action. Successful alternatives retain their own support; ordinary cognition weighs the supported offers alongside other motives. A successful lecture does not certify reliable execution. [The routing control](https://github.com/adam0white/human-framework/blob/main/packages/human/examples/method-control.ts) demonstrates changed teaching, withheld teaching, a scalar-skill control and acquired-state ablation with two methods and an exception. [The alternatives control](https://github.com/adam0white/human-framework/blob/main/packages/human/examples/method-alternatives-control.ts) demonstrates two independently successful procedures under the same observations, failed practice, hunger and exact restore.


## Receiving a possible future route

HF 2.3.0 lets an attended explanation connect one current action to one possible successor. The host supplies the explanation the person received, not a private success bonus.

```ts
import {
  type Affordance,
  type ReceivedConsequence,
  consequenceEvidence,
  createPerson,
  decide,
  perceive,
} from '@adam0white/human-framework';

const person = createPerson({
  id: 'courier',
  name: 'Courier',
  seed: 19,
  now: 600,
  bornAt: -30 * 365 * 1440,
  sex: 'female',
  goals: [
    {
      id: 'delivery',
      label: 'Deliver the parcel',
      serves: ['achievement'],
      advancedBy: [{ action: 'deliver', amount: 1 }],
      importance: 0.8,
      temporal: { halfLifeMinutes: 30 },
    },
  ],
});
const route: ReceivedConsequence = {
  id: 'access-window',
  revision: 0,
  trigger: { action: 'ask-access', targetId: 'keeper' },
  successor: { action: 'deliver', duration: 20, effort: 0.1 },
  availableFrom: 620,
  availableUntil: 680,
  expiresAt: 800,
  chance: 0.8,
  confidence: 0.9,
};
perceive(person, [
  {
    at: 600,
    channel: 'told',
    kind: 'explanation',
    actorId: 'keeper',
    targetId: person.id,
    salience: 1,
    summary: 'If your request succeeds, this route may become available.',
    consequences: [route],
  },
]);
const request: Affordance = {
  id: 'ask',
  action: 'ask-access',
  label: 'Request access',
  targetId: 'keeper',
  duration: 10,
  effort: 0.1,
  advertises: {},
};
const offers: Affordance[] = [
  request,
  { id: 'direct', action: 'deliver', label: 'Deliver directly', duration: 180, effort: 0.1, advertises: {} },
];
const decision = decide(person, offers);
const evidence = consequenceEvidence(person, request); // pure; no RNG consumed
```

`consequences` and `withdrawConsequences: [{ id, revision }]` are accepted only on attended `told` percepts whose explicit `actorId` names someone else. `Percept.targetId` may identify this person or be omitted for a broadcast; testimony explicitly addressed to another recipient is rejected. A recipient-specific opportunity must be addressed to that recipient. Trigger action, target and place match exactly; an omitted target/place matches only an omitted value. `availableUntil` is the latest successor **completion**, inclusive. The whole successor must fit after the current action and `availableFrom`.

`Goal.temporal.halfLifeMinutes` must be finite and positive. It enables expected completion valuation for direct actions **as well as** received successors: existing goal value × estimated action success × time discount. Existing `deadline` remains urgency, never a hard cutoff. Keep the same temporal goal in knowledge-intact, withheld and removed-knowledge controls; compare temporal-off separately. Legacy goals retain their prior formula. A received successor serves only goals listing its action in `Goal.advancedBy`; it does not inherit an `Affordance.advances` hint from a current offer.

The received access estimate is current-action success × `chance` × `confidence` × current source trust. `chance` means access conditional on successful asking; it does not establish consent. One coherent route may contribute to goals. Expected successor effort and material costs use the same readers as direct actions, are charged once, and remain undiscounted and unscaled by maturity. A favorable explanation need not win against other motives.

Only actual terminal outcomes advance terminal goals. Finishing one's own request consumes matching received opportunities even if a refusal has not been heard. It grants no access and executes no successor. The host still decides physical availability, reports the other person's actual response, and filters repeated or impossible requests. Do not mark asking as `advances` merely to make the route attractive.

Knowledge lives in optional `Person.prospection` and survives snapshot/restore. A percept admits at most four additions/withdrawals combined, atomically. Invalid entries or duplicate source/id identities reject the entire batch. Equal/lower revisions do not reinforce or refresh; a higher revision replaces. There are at most 16 entries and 64 revision records. Consumed entries are evicted first, then the oldest remaining entries, while their revision records remain; a batch requiring more still-valid revision records is rejected. Entries and revision memory expire within seven days. Deduplication is bounded, not a durable audit. Capacity is shared across sources and admission does not allocate by trust. One prolific source can occupy the finite entry/revision capacity, causing other new ids to be rejected until revision space expires; this is bounded memory, not a source-fairness or trust firewall. Hosts must bound the premises they deliver. The pure query exposes retained entries, present feasibility and retained revisions.

[The frozen control](https://github.com/adam0white/human-framework/blob/main/packages/human/examples/received-consequences.ts) publishes useful, late, costly, uncertain, withheld, removed-knowledge, removed-goal, temporal-off and refused arms in two renamed domains. This one-step faculty does not search action graphs, price all waiting opportunities or guarantee consent or success. Opt-in bounded planning (2.12.0) and bodily forecast (2.5.0) extend valuation separately. Its numerical bounds and control parameters are engineering assumptions.

## Persona projection (opt-in)

`projectPersona(source, mapping)` produces `PersonaProjectionSnapshot` (`hf-persona-state/1`).
`admitPersona(projection, targetOpening, { mappingVersion, sourceId, targetId })` returns a detached
`{ person, report }`. `validatePersonaProjection(unknown)` validates portable data without filling defaults.
In HF 3.1.0, portable v1 accepts source engines `2.14.1`, `2.17.0`, `2.21.0`, `2.23.0` and `3.1.0`; it preserves that source provenance. Unknown source engines remain rejected.
These functions never enter the actor loop and never mutate the source or the host opening.

The host supplies a versioned map of skill ids, selected episode ids and every continuing obligation.
Skills keep exact levels and practice evidence. Episode action/person/place/voice references need explicit
bindings. Both evidence timestamps and birth minute shift by `targetOpening.now - source.now`; the Person
RNG carries unchanged. Commitments have explicit target-calendar windows, identical duration, kind,
importance and recurrence, and stay pending. This is a binding for a known calendar, not a calendar translator.

Admission requires the declared identity binding, matching name, sex, age, healthy compatible body,
and matching family/bond provenance. Version 1 rejects injuries, illness, downing and exposures. It also rejects pregnancy, courtships, marriages
and mourning because their dates require a separate explicit clock mapping. It rejects
running source activities, active goals/projects, owed duties and unmapped ongoing obligations, including
completed occurrences of unreleased recurring chains. The host must release finished employment in its own
replay. The host owns the cast registry, death history, branch authority, destination references and truth of
selected facts. A hash is not authentication. An old projection cannot override a dead target Person.

Target authors transient body state, needs, affect, social/conscience state and optional behaviour settings.
Portable skills and selected episodes replace target priors in those stores. The report discloses exclusions;
it does not claim that the complete source life continued. The original checkpoint belongs in the source save.
Pin the admitted Person and mapping version in the target replay. The transport owns its cryptographic hash,
branch metadata, consent and storage bounds. See `examples/persona-control.ts` for a deterministic two-host
control with preserved evidence, source immutability and an unmapped-skill comparison.

The agenda retains scheduled make-up records after the matching commitment is kept. Passport admission
recognizes that positive kept record as completed history. Missing or pruned records do not establish completion.
A host that needs durable completion evidence can explicitly call `retirePaidMakeUps(person)` before bounded
commitment history prunes it. It removes only records matched to an existing, closed, kept make-up and returns
recursively frozen, detached `MakeUpReceipt` objects. Persist those receipts in the source replay. Pending,
broken, released, exempt and missing matches remain unresolved. The normal actor loop never calls retirement;
existing games and saves keep their previous behavior until a host opts in.


### Calendar passports (2.16.0, opt-in)

Use `projectCalendarPersona(source, { version, skills, episodes, calendar })` when declared obligations must
travel. `calendar` has version `hf-persona-calendar-map/1`, one exact clock offset, explicit injective maps
for commitment, chain, action, entity and norm references, and the source-backed norm catalog.
The result is `hf-persona-calendar/1`, wrapping the original approved Person projection and a separate
calendar. It preserves continuing commitments, every owed record, actual retained receipts, held norm
understandings and lapse state. A missing scheduled receipt remains unresolved and is disclosed; it never
becomes a paid duty. `isContinuingCommitment(agenda, commitment)` lets a host construct the required maps
using the owning agenda's existing recurrence semantics.

`validateCalendarPersona` strictly validates portable data. `admitCalendarPersona(payload, opening,
{ mappingVersion, sourceId, targetId, targetNorms })` checks the offset and exact catalog semantics before
returning a detached Person. The receiving calendar must be empty; authored role goals may remain. After
admission, the host uses ordinary agenda APIs and its declared calendar. No duty is waived, no new ruling
is invented, and no obligation is converted to a score. Activities, projects and incompatible identity or
health remain unsupported. The original passport format and no-call continuation remain unchanged.

### Project protection and narration options

Projects can opt into undo protection with `enableProjects(person, { protectProgress: true })`.
Declare `diminishes: [prospectId]` on an offer or its described successor, or let the person
learn the exact action context from a perceived drop after its own completed act.
`adoptProjectTask(person, prospectId, task)` reuses an active project and its net credit
for a host task; an absent match returns `undefined`.

Narration remains unchanged unless requested. Set `person.lexicon.variety`,
`nounActions` or `materialMeaning` for the corresponding host wording. Use
`promptingLine(reading, outcome, kind, { voice: 'third' })` for plain third-person lines.
`converse` adds per-call `loyalWarning`, `confidentMin` and `phrase` options;
`perceive` adds a third `{ reputationTraits }` argument. See the architecture's
[narration and social host options](https://github.com/adam0white/human-framework/blob/v3.0.0/docs/framework.md#narration-and-social-host-options-opt-in)
for cause-aware reviews and actor-addressed recall. These options change no default continuation.

### Bounded chapter clock (2.18.0, opt-in)

`createChapterClock(seed, nowMs)` and `advanceChapterClock(clock, nowMs)` are pure helpers for hosts that author coarse between-chapter life. They do not step a `Person`. The clock quantizes a supplied integer millisecond value into real-hour slots. A return processes at most the newest24 slots and reports the omitted count. Its watermark never moves backward. Repeating the same return produces no new slots. Each retained slot's draw depends only on its absolute slot and pinned seed.

```ts
const clock = createChapterClock(23, 0);
const returnInput = advanceChapterClock(clock, 48 * 3_600_000);
// returnInput.slots.length === 24; returnInput.skipped === 24
// Pin clock, returned draws and the admitted initial host state in the replay.
```

The host owns elapsed-time pacing, narrative interpretation, storage, consent and persona admission. A slot is an opportunity for coarse fiction. It is not proof of a lived day, settled duty, completed project or recovered body. Existing actor state and engine2.17.0 continuation remain unchanged unless the host explicitly uses the helper.


## Plain English (2.19.0)

Set `lexicon: { plainEnglish: true }` in `PersonSpec` for new people. Change an
existing person's choice only through an explicit recorded host action. Do not
overwrite a loaded run's saved choice. Built-in decision narration,
spoken replies, intentions and person summaries then use complete, literal English.
Keep this choice in the saved person and replay setup. It changes recorded prose.
Without the option, legacy wording and continuation stay exact. HF 2.19.0 introduced
this option without changing engine 2.17.0. HF 3.0.0 used engine 2.23.0; HF 3.1.0 uses engine 3.1.0.

Host `lines`, `extend`, names and action forms still apply. A host phrase pack owns
its own grammar. HF does not translate arbitrary host labels or memory summaries.
Short words used inside templates remain phrases, so they compose grammatically.
Pass the same lexicon to renderers without a Person, including chronicle renderers
and label/reason readers.
Use authored `actions` forms for domain actions that English cannot inflect from an id.

Run `node packages/human/examples/plain-narration-control.ts` to compare legacy and
plain replies without advancing the person's state or RNG.

`labelLine(label, lexicon)` and `commitmentLabel(commitment, lexicon)` explain built-in
prayer and purpose labels without changing stored identity keys. `normLabel(norm, lexicon)`
explains selected built-in norm labels. `reasonLine(code, lexicon)` gives a sentence
for a known reason; an unknown plain reason returns an empty string so a host can
supply its own explanation. Without the option, each reader returns the legacy text.

`promptingLine(..., { plainEnglish: true })` supports direct calls.
`promptingsReading`, `reviewLine` and `bodyForecast` read the saved person's choice.
A person’s held interpretation of a thought stays distinct from an observed response.
Neither wording nor a missed-duty explanation changes obligations or excuses.

For domain-specific conversation facts, supply `converse`'s `phrase` callback.
HF cannot infer the English meaning of an opaque proposition id. Without authored
wording, the generic fact sentence still includes that id so the claim is not hidden.

Stock village outcomes, birth/marriage memories, routine fallbacks and generated
community log details use the same per-person option. World-supplied outcome
summaries and routine summaries remain exact.


### Authored setup and explicit host effects

Hosts may pass `habits: Habit[]` and `expectations: ActionExpectation[]` to `createPerson`. The framework copies records and their nested objects in order. Invalid or over-bound setup throws `RangeError`; omission preserves prior state. Duplicates remain authored records, with the existing matcher semantics.

Use `gestureVoiceTrust(p, voiceId, amount, { reason, at?, action? })` for an explicit signed gesture toward an existing advising voice. It records the realized delta in bounded history and returns `undefined` for a missing voice. Reasons must be nonempty strings; optional action must be a string. Use `addTiredness(p, { sleepPressure?, exertion? })` for positive host-caused costs. Neither advances time or draws randomness. Host magnitudes are engineering premises.

`confirmObservedReputation(p, prop, truth, now, table?)` replaces the manual `credence → confirm → applyReputationBelief` sequence. Supply only a fact the person could observe. It does not run attention or invent a moral judgement.

`qalbReading(p)` is a read-only, sourced narration lens over existing records. Its detached categorical rows are this person's recorded understanding and evidence. They are never a spiritual health score, a ruling, a rank, or a decision input. Do not present mood, low social trust or missing memories as evidence of poor faith.

## fdlibm notices

`dist/core/libm.js` ports `e_exp.c`, `e_log.c`, `k_cos.c`, `k_sin.c` and `e_rem_pio2.c`
from Sun/FreeBSD fdlibm. The original notices are preserved below and in that module.
Sources: [Netlib fdlibm](https://netlib.org/fdlibm/) and
[FreeBSD e_exp.c](https://cgit.freebsd.org/src/tree/lib/msun/src/e_exp.c).

```text
 * fdlibm notices: e_exp.c (Sun 2004); e_log.c, k_cos.c, k_sin.c and e_rem_pio2.c (Sun 1993).
 * Sources: https://netlib.org/fdlibm/ and FreeBSD lib/msun/src/e_exp.c.
 * ====================================================
 * Copyright (C) 2004 by Sun Microsystems, Inc. All rights reserved.
 *
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 * ====================================================
 *
 * ====================================================
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 *
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 * ====================================================

```
