# @adam0white/human-framework

HF is a TypeScript library for simulated people in games and headless simulations. Your world offers
possible actions. Each person weighs needs, habits, duties, goals and suggestions, then chooses.
A player can suggest an action; the person can defer or refuse it.

HF 4 uses utility scoring and seeded randomness, with no LLM in the actor loop and no runtime
dependencies. Every faculty is always on: people differ through their state, never through switches.
Run state is plain JSON. This is an authored simulation model, not a validated predictor of real people.

HF 4 does not restore 3.x run saves or option selectors. Bounded portable-person projection is a separate contract; it preserves its original source archive. Hosts that need the 3.x API stay on 3.2.x; its
README is at [v3.2.0](https://github.com/adam0white/human-framework/blob/v3.2.0/packages/human/README.md).
The [CHANGELOG](https://github.com/adam0white/human-framework/blob/main/CHANGELOG.md) 4.0.0 section lists every removal.

## Run contracts added in 4.6

`RunSpec.tuning` is admitted once and archived with effective values and one provenance entry per supported coefficient. Besides the existing planning, assent, doze, crisis and promptings coefficients, hosts may author `will.temperature` in 0–1, `cognition.needScale` in 2–8 and `cognition.effortScale` in 0.5–2. Defaults remain 0, 4 and 1. Temperature zero means deterministic assent. Every faculty remains active. Effort scores intensity once per decision; duration changes physiology separately. These engineering bounds are not calibrated human measurements.

Use host input `quantity.observed` with `{person,evidenceId,truth,difficulty}` for an actor's scalar reading. `truth` must be finite and nonnegative; `difficulty` is 0–1. Read the `quantity-estimated` event's `value` and `confidence`, also available through self event inspection. Actual sleepiness increases error; perceived sleepiness lowers confidence. Zero truth or difficulty returns exact truth without a draw; other readings take one seeded actor draw. Overflow refuses the whole batch. The existing run admission owner records a dead reader as `inapplicable`/`actor-dead`, with no estimate or draw.

Communication still enters through `communication.resolved`. A host can withdraw a tracked source account with `testimony.withdrawn` and `{person,evidenceId,sourceId,prop}`. This removes that source's retained contribution, including drift, without reversing source trust. If withdrawal clips the remaining balance, retained effects scale together to the bounded posterior; later testimony still uses the ordinary update equation. An authored prior without a recorded contribution refuses withdrawal. Source history is bounded to the existing six-source window. Evicted contributions cannot be withdrawn; a returning source tracks only its newly applied contribution. A retained base keeps repeated withdrawals coherent at the certainty bound. Withdrawal does not reconstruct an unsaturated counterfactual or erase the listener's memory of hearing the account. Actual death interrupts joint work through the existing host settlement route; grief and relationship death knowledge still use `death.heard`. Limit: objective widowhood and the authored mourning interval start at actual death. These already affect marriage admission and the lifecourse mortality multiplier before news; they are not an observer-bounded knowledge projection.

For a non-TypeScript host, call `runWire(run, json)` with `{"format":"hf-run-wire","version":1,"operation":"step","input":{"until":0,"inputs":[]}}`. Use `operation:"inspect"` with an ordinary inspection query. Replies use the same format/version plus `operation` and `result` (`ok/value` or `ok/error`); malformed envelopes have `operation:null`. Unknown fields, foreign versions and duplicate object keys refuse before dispatch. This is transport over the same run, not a second simulation API. Host language and native/WASM parity need their own bridge control.

## Try the games

The HF games are at [adamwhite.work](https://adamwhite.work). Each one names the HF version it runs on.

## The run API

A host uses eight calls. Each takes and returns plain data, and each failure is a `Result` with a typed
`ContractError` rather than an exception.

| Call                                      | What it does                                                                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createRun(spec)`                         | Starts a run from a seed, a start time, the host's definitions (actions, norms, skills, methods, calendar), the lifecycle and the world.                                 |
| `createPerson(run, authoring)`            | Adds authored state or a versioned portable person with explicit mappings before the first step.                                                                         |
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

## Actual voice evidence (4.6)

Send `voice.evidence-received` through `step` from the registered host. Its payload is
`{person, voiceId, evidenceId, evidence}`. Register `voiceId` as a voice source. Use
one stable, recipient-specific outcome identity for input `id`, `evidenceId` and
`evidence.id`; redelivery of that identity is rejected, including after restore.

Every evidence variant includes `{id, occurredAt, action}`. `occurredAt` may precede
delivery but cannot be in its future. Add one of:

- `{kind: 'act', felt}` for an actual voice act experienced by the person.
- `{kind: 'request', granted, felt}` for the outcome of this person's request to the voice.
- `{kind: 'support', effect: 'acknowledged'}` for received care or accompaniment without a claimed effect.
- `{kind: 'support', effect: 'comfort'}` when the host asserts an actual comforting effect was received.

`felt` is the person's experienced valence in [-1, 1]. A grant need not feel good;
a refusal need not feel bad. Will derives trust using the existing assumed
asymmetry and repetition discount; hosts cannot assign a trust target here.
Support changes neither trust nor assent. Actual comfort uses the existing crisis
recovery convention; mere narration cannot assert it. This contract concerns
ordinary host-world acts, never divine acceptance or answered prayer. Read the
structured `voice-evidence` event through `inspect` as host or recipient; other
people do not gain access to it. A voice promise remains separate evidence.

## Authored reputation vocabulary (4.5)

Add character words through the optional `definitions.reputationTraits` array:

```ts
reputationTraits: [
  { id: 'nosy', affection: -0.03, trust: -0.03, respect: -0.03 },
  { id: 'sweet', affection: 0, trust: 0, respect: 0 },
];
```

Each coefficient is finite and between −1 and 1. IDs are nonempty NFC strings without colons or reserved prototype names. Duplicate IDs and replacement of builtin traits refuse run construction. Omit the array when no additional words are needed. Builtin character words always remain active.

This immutable, run-scoped vocabulary is retained in exports and replay. An ordinary claim such as `person:nosy` updates the person's belief through `testimony.received` or `fact.confirmed`. The existing reputation owner applies the actual credence change to affection, trust and respect, damped by familiarity and negative weighting. A correction moves those relationships back toward their prior state; it does not invent a separate social event. Prepared conversation uses the same vocabulary to identify character claims, classify unfavourable speech and offer loyal warnings. Zero coefficients recognize a character word without a relationship effect. Coefficients are authored engineering assumptions about relationships, not measures of moral worth or religious rulings. Within a run, reputation applies only to subjects that name people in that run. Authoring a trait named `open` does not create a relationship with the non-person subject of `door:open`.

## Archives and daily steps (4.6)

`exportRun` writes archive format 5. Each event and receipt journal in `current` contains its newest 64 entries. The complete accepted input log remains in `history`; actor memory keeps its own retention policy. A snapshot's journals are recent diagnostics, so their lengths do not equal lifetime allocation counters. Live `step` results and inspections keep their ordinary semantics.

`restoreRun` reconstructs complete private journals and deduplication indexes by executing the accepted history. It checks the reconstructed actor, pending requests, active work, continuations and retained snapshot before returning a run. Restore therefore costs approximately a replay, and its cost grows with total accepted history. `replay` still reproduces a current-version export exactly. Archives from another package/build/schema are refused; no old-export conversion is provided.

The existing daily fidelity uses larger adaptive cells with the same faculty equations, physical branch checks and hazard roots. Its local normalized numerical estimate is `1e-7`; fine-only runs retain their existing `1e-12` policy. Cells reanchor when fidelity changes, so a new daily policy never recomputes an earlier fine span. Needs retain reached reservoir values at canonical daily boundaries, keeping varying-force work bounded to a day. This introduces no faculty switch and skips no host input or reached semantic boundary.

The local estimate is not a certified global error bound. This release loosens the ten-seed fine/daily comparison limit from `1e-9` to `1e-5`. The control covers 24 hours only and measured a maximum current-state difference of `7.44e-6`; fine repeat and irregular-read limits remain `1e-9`. Physical events matched exactly in that fixture. A different daily path can approximate a fine path differently; each current-version archive still replays its own path exactly.

## Live traits, held norms and authored social responses (4.5)

Use `inspect(run, {perspective, people, select: ['traits', 'heldNorms']})` for live rules. Host perspective receives actual HEXACO traits and the current `HeldNorm[]`, including standing, conviction and provenance. Self perspective receives `unobserved` for raw traits; an authored personality model does not imply accurate selfknowledge. Self held norms expose the person's own understanding. Other-person readings return `unobserved` for both selections. These detached reads work during pending and active actions without portable projection, state changes or RNG changes. Held norms model a person's current understanding, never a religious ruling.

`conversation.requested` accepts optional `confidentMin` between 0 and 0.5. It is the minimum absolute distance from 0.5 for a held belief to be offered. Omitting it preserves the builtin 0.2. It changes this prepared conversation only; other runs and later conversations keep their own policies.

An actual `social.received` input may carry an authored response to its evidence:

```ts
sourceTrustResponse: {
  sourceId: 'teller',
  multiplier: 0.8,
  basis: {author: 'world', ruleId: 'response-to-comparison', edition: '1'},
}
```

The source must be registered, must equal the social event's `other` person, and cannot be the recipient or `self`. The multiplier is finite and between 0 and 1. The belief owner multiplies the current held source trust (or its ordinary default when absent) by this coefficient in the same transaction as the actual social event, only when the social owner marks that event applied. The basis identifies an authored world rule, not an empirical psychological rate, external truth, norm or ruling. It does not retroactively rewrite belief log odds. No opposite belief or fabricated confirmation is needed. The original input and host-only `source-trust-responded` event retain the evidence, basis and actual before/after values. Existing contradiction inputs retain their semantics. Repeating any social evidence ID for the same recipient under a new input ID refuses the whole transaction, whether either copy carries a source-trust response; no second relationship or trust effect is applied. A later failed input in the same batch rolls back both effects. Use fresh evidence IDs only for distinct actual evidence.

The released lab client 0.5.2 deliberately retains its exact HF 4.4.0 portable bridge dependency. HF 4.5 does not add a companion SDK feature or change the central site's HF 3.2.0 actor pin.

## Source trust and bodily forecasts (4.4)

Use `inspect(run, {perspective, people, select: ['sourceTrust']})` to read held source trust. Host and self perspectives receive the person's source-id-to-trust map. Another observer receives `{kind: 'unobserved'}`. These numbers describe held evidence, not whether a source is objectively truthful.

`preview` accepts optional `bodyForecast` spans, such as `{label: 'climb', durationMs: 600_000, load: {effort: 0.85, focus: 0, mode: 'awake'}}`. A following span can describe later errands. The result's `bodyForecast` contains `person`, `from` (the live run time) and `spans`. Each span contains `label`, `endsAt`, `worst`, `worstOf` and `basis: 'conditional-load-projection'`. `worst` is the maximum perceived need during that span, not only its endpoint. The existing body owner bounds the horizon and number of spans and returns a structured error for unsupported work. The forecast conditions on declared loads and current ambient evidence. It does not predict host outcomes or action admission. `until` still controls the detached run preview; body spans begin at `from` and have their own declared durations. Preview changes no live state or RNG and never reads another person's hidden body in a person perspective.

`DEFAULT_NORMS` supplies sourced authoring defaults for `definitions.norms` and calendar validation. Its research and interpretation references retain pending review status and modelling limitations. A held norm is a person's understanding, never a ruling. For daily prayer, supply `definitions.calendar.days[].prayers` and `nextFajrMs`, a `salah` definition with the default sourced provenance and source references, and a `pray` action. A person holding salah as obligatory or recommended receives the five worship duties whose windows have not closed at admission. Existing matching retained duties remain authoritative; earlier missed duties are not invented. Supplied times are offsets from midnight in milliseconds, and the host supplies one-shadow Asr and red-twilight Isha. The framework computes no astronomy or divine acceptance. Ramadan and Eid scheduling are not part of this route.


## Retained portable people (4.4)

`hf-portable-person/1` remains the approximate profile/body/mood passport. `hf-portable-person/2` additionally retains beliefs, source trust, episodes, gists, expectations, contradictions, held norm provenance, continuing commitments, owed duties, exemption evidence, age and the source calendar definition. Runtime clocks, scheduler continuations and RNG remain in the source archive. Unsupported active activities, clinical state, ongoing goals and other unsupported obligations refuse projection instead of disappearing.

For a current run, call `inspect` with host perspective, one person, `select: ['persona', 'calendar']`, and `portable: {person, castId, castRevision}`. Keep cast registry validation and claim ownership in the host. For admission, pass an otherwise empty authored memory/agenda opening to `createPerson` with `portable: {person: passport, mapping: {offsetMs, references}}`. Each reference has `kind` (`action`, `entity`, `source`, `norm` or `proposition`), `source` and `target`. The offset must align the source instant with the receiving run. Time-bearing records and age shift together. The referenced receiving actions, people, sources and sourced norms must exist. Missing mappings, collisions, conflicting opening duties and incompatible norm claims refuse the complete admission. The original portable input is retained for exact run replay. Portable admission occurs before the first step; an arriving-person input cannot silently bypass it.

`projectPortablePerson` can project a restored native legacy person with an explicit source `calendar` expressed in milliseconds. Legacy engine 2.21/2.23 and 3.x actor clocks use minutes; the adapter converts their semantic times once. Legacy held norms without provenance require explicit `legacyNormProvenance` plus the actual `legacyNormCatalogue`; the claims must match the sourced receiving catalogue apart from the added provenance. A biography-only or calendar-only historical passport cannot recover memories that it never contained. Preserve the original source archive and use its verified historical replay boundary. This is a bounded retained-state transfer, not an old-save converter or a claim of arbitrary-world portability.


## Authoring identifiers and tuning bounds

Authored biography episodes use unique `eN` ids, where `N` is a nonnegative integer (`e0`, `e1`, …). The memory owner advances its next episode counter beyond the greatest authored id. An arbitrary label such as `hull-event` is a summary or tag, not an episode id. For example:

```ts
biography: [
  {
    id: 'e0',
    at: start - 5_000,
    kind: 'observation',
    valence: 0.2,
    salience: 0.8,
    summary: 'Inspected the hull.',
    tags: ['hull-event'],
    basis: { kind: 'authored', author: 'world' },
    provenance: ['inspection-1'],
  },
];
```

`RunTuning` accepts the following ranges, inclusive. Omitted fields use the recorded defaults. Values outside these ranges refuse admission; the `Unit` type alone does not express every supported range.

| Field                                    | Supported values |
| ---------------------------------------- | ---------------- |
| `planning.depth`                         | integers 2–5     |
| `planning.presentBias`                   | 0.5–1            |
| `assent.minStrength`                     | 0.5–0.9          |
| `assent.pressure`                        | 0.05–0.15        |
| `doze.hazardScale`, `crisis.hazardScale` | 0.5–1.5          |
| `promptings.practiceHalfLifeDays`        | 30–120           |
| `promptings.echoRate`                    | 0.05–0.15        |

## Versions

The release version is the package version (`package.json`, currently `4.6.0`). From 4.0.0 the engine version is
the same string; `RUN_ENGINE` in each archive adds a build hash and a schema hash, so a host can tell exactly
which engine wrote a save. The public API follows [semver](https://semver.org/). Each release is a tag `vX.Y.Z`
and a GitHub release whose notes are that version's section of the root
[CHANGELOG.md](https://github.com/adam0white/human-framework/blob/main/CHANGELOG.md), with the package tarball
attached (`npm run release`, from a clean checkout of pushed `origin/main`). A 4.x minor can add faculties or change numerical policy; an
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
