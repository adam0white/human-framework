# @adam0white/human-framework

HF is a TypeScript library for simulated people in games and headless simulations. Your world offers
possible actions. Each person weighs needs, habits, duties, goals and suggestions, then chooses.
A player can suggest an action; the person can defer or refuse it.

HF 4.0 uses utility scoring and seeded randomness, with no LLM in the actor loop and no runtime
dependencies. Every faculty is always on: people differ through their state, never through switches.
Run state is plain JSON. This is an authored simulation model, not a validated predictor of real people.

HF 4.0 does not read 3.x saves, exports or option selectors. Hosts that need the 3.x API stay on 3.2.x; its
README is at [v3.2.0](https://github.com/adam0white/human-framework/blob/v3.2.0/packages/human/README.md).
The [CHANGELOG](https://github.com/adam0white/human-framework/blob/main/CHANGELOG.md) 4.0.0 section lists every removal.

## Try the games

The HF games are at [adamwhite.work](https://adamwhite.work). Each one names the HF version it runs on.

## The run API

A host uses eight calls. Each takes and returns plain data, and each failure is a `Result` with a typed
`ContractError` rather than an exception.

| Call                                      | What it does                                                                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createRun(spec)`                         | Starts a run from a seed, a start time, the host's definitions (actions, norms, skills, methods, calendar), the lifecycle and the world.                                 |
| `createPerson(run, authoring)`            | Adds one person from authored state. Portable admission is rejected in 4.0.                                                                                              |
| `step(run, { until, fidelity?, inputs })` | Advances to `until`, applying the timestamped inputs. It stops early at a `world-required` boundary when people need the host to resolve their actions or communication. |
| `inspect(run, query)`                     | Reads actual state, from the host's view or from one person's own view. It never changes the run.                                                                        |
| `preview(run, query)`                     | Answers "what would happen if": the same step on a detached copy, with its own ids and wording. It never changes the run.                                                |
| `exportRun(run)`                          | Returns the archive: spec, input log, current state and hashes. It is the save and the playtest export.                                                                  |
| `restoreRun(archive)`                     | Rebuilds a run from an archive after checking it.                                                                                                                        |
| `replay(archive)`                         | Re-runs the input log from the spec and checks every hash.                                                                                                               |

`projectChapterClock(clock, untilWallMs)` is a pure helper for hosts that pace a story by wall time.

Every host change is an `Input` with an id, a time, a source (host, voice, person or shelf) and a kind:
offers, observations, suggestions, orders, agenda and context changes, testimony, conversation, world changes,
and the resolutions of the requests HF issued. Every reading leaves through `inspect` or `preview`. The host is
the only writer of the world.

## Quick start

[`examples/minimal.ts`](https://github.com/adam0white/human-framework/blob/main/packages/human/examples/minimal.ts) is a complete host in one file. Its shape is:

```ts
import {
  createPerson,
  createRun,
  exportRun,
  inspect,
  replay,
  restoreRun,
  step,
} from '@adam0white/human-framework';

const run = need(createRun(spec)); // seed, start, definitions, lifecycle, world
need(createPerson(run, ada)); // authored state: body, character, agenda, habits, norms...
let result = need(step(run, { until, inputs: [offers, morningNote] }));
while (result.boundary.type === 'world-required') {
  // Ada chose an action. The host decides what actually happened and says so.
  const resolutions = result.boundary.requests.map((request) => resolve(request, world));
  result = need(step(run, { until, inputs: resolutions }));
}
const view = need(
  inspect(run, {
    perspective: { kind: 'person', observer: 'ada' },
    people: ['ada'],
    select: ['summary', 'events'],
  }),
);
const save = exportRun(run); // JSON; restoreRun(save) continues it, replay(save) verifies it
```

The [examples README](https://github.com/adam0white/human-framework/blob/main/packages/human/examples/README.md) describes the other five examples.

## One clock, two fidelities

A batch chooses its fidelity. `{ mode: 'fine' }`, the default, follows every decision and request.
`{ mode: 'daily', dayMs: 86400000, anchor }` is a first-class larger step for long runs (a batch that resolves pending
requests keeps the paused fidelity): the same owners
advance the person a day at a time, with bodily stores integrated in closed form. There is no separate
simulation loop for long runs.

## Determinism and replay

- All randomness comes from seeded RNG held in the run state. The library never calls `Math.random` or
  `Date.now`, and transcendental functions come from a bundled fdlibm port, so results do not depend on the
  platform's math library.
- Replaying the same input log with the same step chunking is byte-exact. Different chunkings of the same
  inputs keep clocks, counters, RNG, the set of events and their order exact; continuous values such as mood
  and needs agree within 1e-9. Fields that count step calls (`counters.nextTransaction`, `cursor.frameOrdinal`,
  `history`), the order of `receipts.inputs` and `queue`, and hashed trajectory condition ids differ by chunking, so
  the archive hashes do too; `replay` of the same log is what is promised.
- The archive is the save. Every game offers it as the playtest export: it carries the seed, the input log
  and the state, and `replay` reproduces the run. Each accepted step adds about 240 bytes of history.

## What it models

- Bodily and psychological needs, affect, crisis, attention, memory, beliefs, skills, habits and relationships.
- Values, held moral norms, commitments, goals, review of the day, promptings and trust in outside voices.
- Aging, family, upbringing and character change; curiosity, bounded planning, projects and pursuit.

The host supplies the available actions and their meaning. Projects and planning do not invent actions
or solve arbitrary tasks.

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

| verdict     | meaning                                                                                                              | `kind`               |
| ----------- | -------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `assented`  | the suggested option won                                                                                             | none                 |
| `deferred`  | the person's own preference won; carries a `counterOffer` ("after I eat lunch")                                      | `notNow`             |
| `modified`  | a near alternative with the same action or aim won; the `counterOffer` names it                                      | `notNow`             |
| `refused`   | cannot (asleep, exhausted, skill far too low, a pressing bodily need) or will not (a firmly held norm, broken trust) | `cannot` / `willNot` |
| `complied`  | the voice insisted on a "not now"; done under protest (`activity.protest`), at a cost to autonomy and trust          | `notNow`             |
| `commanded` | the host gave a direct order (`coercion.received`); the person does the order whatever they would have chosen        | none                 |

Insisting (`insist: true`) turns only a `notNow` into compliance, and not when a bodily need is pressing. It
never overrides `cannot` or `willNot`.
Every resolution also carries a machine-readable `reason` (`need:food`, `norm:theft`, `asleep`, `distrust`,
...), which the renderer turns into a line in the person's voice.

## Versions

The release version is the package version (`package.json`, currently `4.0.1`). From 4.0.0 the engine version is
the same string; `RUN_ENGINE` in each archive adds a build hash and a schema hash, so a host can tell exactly
which engine wrote a save. The public API follows [semver](https://semver.org/). Each release is a tag `vX.Y.Z`
and a GitHub release whose notes are that version's section of the root
[CHANGELOG.md](https://github.com/adam0white/human-framework/blob/main/CHANGELOG.md), with the package tarball
attached (`npm run release`, from a clean checkout of pushed `origin/main`). A 4.x minor adds faculties; an
archive from another 4.x version may be refused with a start-fresh message.

## What it does not model

- **Space and travel.** There is no map or pathfinding. Hosts fold travel into action durations.
- **Language.** Narration is rendered from structured events with stable variation. No LLM is involved.
- **Calibrated human behaviour.** Parameters are engineering defaults chosen for plausible behaviour at
  game time scales. Where a published model informs a shape (two-process sleep, power-law practice, OCC
  appraisal, HEXACO, Schwartz values), the module's doc comment names it. Each module's doc comment
  starts with a scope paragraph that also lists what that faculty leaves out.
- **Rulings or divine judgment.** Norms come from the host's definitions with provenance (`SourcedNorm`).
  A person holds an _understanding_ of a norm, with a standing and a conviction. That understanding is
  not a ruling. The library never computes divine acceptance. Where schools of thought differ, the
  position HF takes, and why, is recorded in
  [research/decisions.md](https://github.com/adam0white/human-framework/blob/main/research/decisions.md).

## Further reading

- [docs/framework.md](https://github.com/adam0white/human-framework/blob/main/docs/framework.md): the architecture, which module owns which state slice, the
  utility terms and will rules.
- [docs/findings.md](https://github.com/adam0white/human-framework/blob/main/docs/findings.md): negative findings recorded during development.

## License

MIT; see [LICENSE](LICENSE). The repository's `docs/` and `research/`, which this README links to, are
CC BY 4.0.

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
