# @human/framework

Simulated people for games and headless simulations. A `Person` has a body, needs, emotions, memory,
beliefs, skills, habits, relationships, values, an understanding of moral norms, and a will. The host
world offers actions; the person chooses among them, and can refuse what an outside voice suggests. Every
choice comes with the terms that produced it and a first-person line, so a refusal reads as a reason rather
than a bug.

The library is TypeScript and has no runtime dependencies. Its core loop is deterministic and does not use an LLM or touch the
DOM. Person state is plain JSON.

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

| verdict | meaning | `kind` |
|---|---|---|
| `assented` | the suggested option won | none |
| `deferred` | the person's own preference won; carries a `counterOffer` ("after I eat lunch") | `notNow` |
| `modified` | a near alternative with the same action or aim won; the `counterOffer` names it | `notNow` |
| `refused` | cannot (asleep, exhausted, skill far too low, a pressing bodily need) or will not (a firmly held norm, broken trust) | `cannot` / `willNot` |
| `complied` | the voice insisted on a "not now"; done under protest (`activity.protest`), at a cost to autonomy and trust | `notNow` |

Insisting (`insist: true`) turns only a `notNow` into compliance, and not when a bodily need is pressing. It
never overrides `cannot` or `willNot`.
Every resolution also carries a machine-readable `reason` (`need:food`, `norm:theft`, `asleep`, `distrust`,
...) and a line in the person's voice (`says`).

## Install

The package is private (`UNLICENSED`) and not on a registry. Build a tarball from the repository and install
that:

```sh
npm pack -w packages/human                  # runs the build; writes human-framework-1.1.0.tgz
npm install /path/to/human-framework-1.1.0.tgz
```

It ships ES modules and `.d.ts` files (`exports["."]` with `types`). It requires Node ≥ 24 or a modern
browser. The library needs `structuredClone` and nothing else from the host.

## Quick start

```ts
import {
  createCommunity, createPerson, createVillage, MINUTES_PER_DAY, predict, stepCommunity,
  type Suggestion, villagerSpec,
} from '@human/framework';

const ids = ['ada', 'bora'];
const people = ids.map((id, i) => createPerson(villagerSpec(id, id, 1 + i, { now: 6 * 60, others: ids })));
const world = createVillage(people, { seed: 7 });      // a bundled World: well, field, pantry, neighbours
const community = createCommunity(people);
const ada = community.people[0]!;

const ask: Suggestion = { voiceId: 'player', action: 'chat', strength: 0.6 };
const hint = predict(ada, world.affordancesFor(ada), ask); // pure: no state change, no RNG
console.log(hint.verdict, hint.reason, hint.says);

// One day; the suggestion stands at each of Ada's decisions.
const events = stepCommunity(community, world, 6 * 60 + MINUTES_PER_DAY, { suggestions: { ada: ask } });
const last = ada.trace.at(-1)!;
console.log(last.chosenAction, last.suggestion?.verdict, last.narration);
```

The runnable examples in [`examples/`](examples) go further. Run them all with
`npm run examples -w packages/human`, or one at a time with `node examples/<name>.ts` after a build. A
vitest (`test/examples.test.ts`) runs them, so they keep working as the code changes.

- [`minimal.ts`](examples/minimal.ts): a hand-written `World` (offers, percepts, outcomes) and one person's day.
- [`suggestions.ts`](examples/suggestions.ts): one voice, five verdicts (assented, deferred, refused/willNot,
  complied, refused/cannot), then one recorded decision and its utility terms.
- [`community.ts`](examples/community.ts): three villagers, a standing nudge, then `runSilent` with that
  voice muted and `diffChronicle` over the two periods.

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
  norms, advice, and `near` (the framework has no space, so the host marks what is close).
  Attention decides what is encoded.
- **Outcomes** (`Outcome`) are world truth when an activity ends: `status` (`completed`, `failed`,
  `interrupted`), realized `needs`, `material`, `injury`, `illness`, follow-on `percepts`, `quality`, and
  `exposures`. The framework computes exertion and sleep itself.
- **Decisions** (`DecisionRecord`) come back: the chosen offer, the top `considered` options with every
  utility term, the suggestion verdict(s), a private `intention`, and a `narration`.

You can drive a person by hand: `decide(p, offers, { suggestion })` → `begin(p, offer, record)` →
`tick(p, now)` → `finish(p, outcome)`, with `perceive(p, percepts)` and `interrupt(p, now, reason)` between.
Or implement `World` and let `stepCommunity` sequence everyone in deterministic (time, id) order:

```ts
interface World {
  now(): Minute;
  affordancesFor(p: Person): Affordance[];
  perceptsFor(p: Person, since: Minute, until: Minute): Percept[];
  resolve(p: Person, activity: Activity, reason: 'ended' | 'interrupted'): Outcome;
  // optional: mirror, beginOptions, scarcityFor, onDay, converse, catalog
}
```

`stepCommunity` also runs the protocols for joint activities (an offer tagged `joint` with `with`),
conversation (testimony and advice between members), contagion, and the optional life-course rolls.
`runSilent(c, world, days, { mutedVoiceId })` runs the same driver with one voice's standing suggestions
dropped. `diffChronicle(a, b)` then reports what changed between two periods of consolidated day records.
It covers what the person now does unprompted, what they still do only when told, and how trust and mood
moved. Two scenarios are bundled as reference hosts: `createVillage` and `createTown`.

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
  option (`createTown(people, { seed, state })`, `createVillage(people, { seed, state })`):

  ```ts
  const save = JSON.stringify({ people: c.people.map(snapshot), community: communityState(c), world: town.state });
  const s = JSON.parse(save);
  const people = s.people.map(restore);
  const town2 = createTown(people, { seed: 0, state: s.world });
  const c2 = createCommunity(people, s.community); // continues exactly as the unsaved run would
  ```
- Version numbers are described under [Versions](#versions).

## Versions

There are two version numbers, and they move independently.

- **The release version** is the package version (`package.json`, now `1.1.0`) and `FRAMEWORK_VERSION`, the same
  string compiled into the build; a test keeps them equal. It versions the public API under
  [semver](https://semver.org/): a breaking change to an exported name or signature bumps the major, a new
  faculty or export the minor, a fix the patch. Each release is a tag `vX.Y.Z` and a GitHub release whose notes
  are that version's section of the root [CHANGELOG.md](../../CHANGELOG.md), with the package tarball attached
  (`npm run release`, run on a clean, pushed `main`).
- **`ENGINE_VERSION`** (now `1.6.0`) versions simulation behaviour and the save format. It changes when the same
  seed and inputs would give different decisions, or when person state changes shape. `restore` upgrades saves
  from engine 1.4.0 and later through `migrate` and refuses older ones. Every release's notes name the
  `ENGINE_VERSION` it ships, so a host can tell whether its saves still restore.

The root `package.json` version is the site's version (stamped into the site's `release.json`) and is not part of
this policy.

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
  [research/norm-sources.md](../../research/norm-sources.md)). A host with its own catalog passes it as
  `World.catalog`, so necessity excuses and exemptions read that catalog; a norm not in it is not excused.
  A person holds an *understanding* of a norm, with a standing and a conviction. That understanding is
  not a ruling. The library never computes divine acceptance.

## Further reading

- [docs/framework.md](../../docs/framework.md): the architecture, which module owns which state slice, the
  utility terms, will rules, host protocols, and locked decisions.
- [docs/api.md](../../docs/api.md): every export, grouped by module, generated from the built declarations.
  Helpers tagged `@internal` are stripped from the shipped declarations and are not part of the API.
  The affect module's `release` is exported as `releaseEmotion`.
- [docs/findings.md](../../docs/findings.md): negative findings recorded during development.
