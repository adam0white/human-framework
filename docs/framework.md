# Human Framework v1 — architecture

This is the design reference for `packages/human`. The shared data contract lives in [`packages/human/src/types.ts`](../packages/human/src/types.ts). Every module listed here exports pure functions over a `Person` and mutates only the slice of `Person` it owns.

## The spine: Urge → Assent → Act

A person does not execute commands. At each decision point, many pulls act on them at once:

- bodily needs (hunger, thirst, sleep, pain)
- psychological needs (belonging, autonomy, competence, meaning, ...)
- understood duties and commitments
- habits
- emotions and their action tendencies
- goals
- learned expectations of what each action will actually do
- suggestions from outside voices (a player, a parent, a manager)

These pulls are *urges*. The person weighs them and *assents* to one course of action, or refuses a suggested one, and then *acts*. The host world resolves what actually happens. The outcome feeds back into body, memory, skills, emotions, relationships, conscience, and trust in the voices that advised them.

This structure follows a distinction in the project's [Islamic foundations](../research/islamic-foundations.md) (§3–4). An internal suggestion is not yet a deed (Bukhari 5269). Responsibility attaches to deliberate assent and action, and it is bounded by capacity (Qur'an 2:286). Intention is recorded separately from the outward act (Bukhari 1).

In the software, a player's input is therefore one urge among many: a push, not a command. This is the framework's signature mechanic, and it is useful outside games too. The same machinery models a manager directing workers, a parent instructing a child, or public-health advice reaching a population.

Boundaries the software never crosses: it does not compute divine acceptance, assign quantities to the ruh, or call the RNG "qadar". Norms come from a host catalog with provenance. The person holds an *understanding* of each norm, and that understanding is not a ruling.

## Loop

```
host world ──affordances──▶ decide(person, affordances, {suggestion})
     ▲                         │  score every option: Σ terms (needs, norms, commitments, goals,
     │                         │  habits, emotions, expectations, social, effort, risk, suggestion)
     │                         │  will.resolve: vetoes, self-control, softmax(rng), suggestion verdict
     │                         ▼
     │                    DecisionRecord (+ narration, intention)
     │                         │
     │                    begin(person, affordance, decision) → person.activity
     │                         │
     │   tick(person, now) ◀───┘  closed-form body/needs/affect/memory decay; works for any dt
     │                         │
     └──────── outcome ─────── finish(person, outcome) → body, needs, skills, habits, memory,
               percepts ────── perceive(person, percepts) → attention → beliefs, social, affect
```

Decisions are event-driven: a person decides when idle, when an activity ends, or when the host interrupts them. Between decisions, `tick` advances state in closed form, so a two-minute step and an eight-hour sleep both cost O(1).

## Modules and owned state

| Module | Owns | Key exports |
|---|---|---|
| `core/` | `rng` | `createRng(seed)`, `random(rng)`, `randomInt`, `normal`, `pick`; math: `clamp`, `clamp01`, `sigmoid`, `decay(value, dt, halfLife)`, `logit`, `expit`, `minuteOfDay`, `dayOf` |
| `body/` | `body` | `createBody(spec, now)`, `advanceBody(p, dt, load)`, `readBody(p)`, `consume(p, deltas)`, `injure(p, injury)`, `sicken(p, illness)` |
| `lifecourse/` | `life` | `ageYears(p)`, `lifeStage(p)`, `lifeModifiers(p)` → `{metabolism, recovery, learning, selfControl, maxFitness, mortalityPerYear}` |
| `needs/` | `needs` | `readNeeds(p)`, `advanceNeeds(p, dt)`, `satisfy(p, deltas)`, `urgency(level, threshold)` |
| `affect/` | `affect` | `appraise(p, event)`, `advanceAffect(p, dt)`, `readAffect(p)`, `actionTendencies(p)` |
| `memory/` | `memory.episodes`, `memory.expectations` | `remember(p, episode)`, `recall(p, query)`, `advanceMemory(p, dt)`, `expectedEffect(p, affordance)`, `learnOutcome(p, affordance, outcome, realized)` |
| `beliefs/` | `memory.beliefs`, `memory.sourceTrust` | `attend(p, percepts)`, `believe(p, prop, value, confidence, sourceId)`, `credence(p, prop)`, `confirm(p, prop, truth)` |
| `skills/` | `skills` | `skillLevel(p, id)`, `successChance(p, skill, difficulty)`, `practise(p, id, minutes, difficulty, success)` |
| `habits/` | `habits` | `habitPull(p, affordance)`, `reinforce(p, action)` |
| `social/` | `social` | `relationshipWith(p, otherId)`, `socialEvent(p, event)`, `socialTerms(p, affordance)`, `judge(p, percept)` |
| `conscience/` | `conscience` | `normTerms(p, affordance)`, `normVeto(p, affordance, desperation)`, `recordDeed(p, affordance, intention)`, `repent(p, breachId)` |
| `agenda/` | `agenda` | `advanceAgenda(p)`, `agendaTerms(p, affordance)`, `onFinished(p, outcome)`, `promise(p, ...)`, `adoptGoal(p, ...)`, `proposeGoals(p)` |
| `will/` | `will` | `resolveChoice(p, considered, suggestion)`, `learnFromVoice(p, resolution, feltValence)` |
| `cognition/` | — | `consider(p, affordance)` → `Considered`; `decide(p, affordances, opts)` |
| `narrate/` | — | `narrateDecision(p, record)`, `voiceLine(p, resolution)`, `describePerson(p)` |
| `person.ts` | `activity`, `trace`, `now` | `createPerson(spec)`, `tick(p, now)`, `decide`, `begin`, `finish`, `perceive`, `snapshot`, `restore` |
| `sim/` | — | `Community` driver over a host `World` adapter |

## Utility of an option

`consider()` sums the following terms. Every term is kept in the trace so the UI can show why.

- **need:X** = urgency(X) × believed gain on X. The believed gain blends the advertisement with the learned expectation, weighted by how many samples the person has.
- **norm:N**: from conscience. Positive for fulfilling an understood obligation or recommendation, negative for a breach. Weighted by conviction, tradition/conformity, and honesty-humility.
- **commitment:C**: rises as the window closes.
- **goal:G**: importance × amount.
- **habit**: strength of a matching cue.
- **emotion:E**: tendency × tag match. Fear avoids risky options, anger favours confronting, loneliness favours social options, guilt favours repair and worship, boredom favours novel options.
- **social:P**: affection and belonging pull toward options with liked people, and away from disliked ones.
- **effort**: effort × fatigue × (1 − fitness), plus focus × sleepiness.
- **risk**: chance × severity × (fear + emotionality).
- **material**: value of gain, scaled by security, achievement, and power.
- **suggestion:V**: strength × voice trust × appeal match. This is never enough on its own to override a veto.

`will.resolveChoice` then decides:

1. **Vetoes.** Capacity (exhausted, asleep, dead) and strongly held forbidden norms veto an option. The forbidden-norm veto lifts under genuine necessity: when the need urgency is extreme, the person's understanding of necessity applies (Qur'an 2:173 is the canonical source). Hosts can turn this off.
2. **Selection.** Softmax over utilities with temperature from traits and fatigue, sampled from the person's own RNG.
3. **Suggestion verdict.** Assented if the suggested option won. Deferred if a more urgent need won but the suggestion stays acceptable soon. Modified if a near alternative serving the same aim won. Refused if a veto applied or the gap was too large. Each verdict carries a dominant reason and a first-person line.
4. **Autonomy and trust.** Pushing against preference raises voice pressure and drains the autonomy need. Outcomes the person liked raise trust in the voice that suggested them.

## Determinism and saves

- All randomness comes from `person.rng`, or from host-owned RNG for world events. Given the same seed and inputs, the result is byte-identical.
- `Person` is plain JSON. `snapshot(p)` returns a deep clone, and `restore(json)` validates `schema` and fills defaults.
- Bounded collections: episodes ≤ 200, beliefs ≤ 300, trace ≤ 32, emotions ≤ 12, breaches ≤ 50, intentions ≤ 50.

## Scope notes

Parameters are engineering defaults chosen for plausible behavior at game time scales. Where a published finding informs a shape, the module's doc comment names it: the two-process sleep model, the power-law practice curve, exponential forgetting, OCC appraisal, HEXACO, Schwartz values. The parameters are not calibrated predictions of human behavior. Each module states in one paragraph what it covers and what it does not.
