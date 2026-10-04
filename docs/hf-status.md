# What HF has (engine 1.6.0, on main) vs the full ambition

2026-10-04. Phase R3 of Goal 2 ([HANDOFF](../HANDOFF.md)). The ambition is the one in [archive/v0 roadmap](../archive/v0/docs/roadmap.md) and [research/empirical-models.md](../research/empirical-models.md): an embodied person who notices, understands, is moved by needs, emotions and duties, chooses, acts and develops over a life, among others and within a culture. This page checks it against the code: exports were confirmed by grep in `packages/human/src`; "where" names the module and export. **built+tested** = exported, wired into the composite or driver, with tests. **partial** = exists but is unwired, opt-in only, or missing a named piece. **missing** = nothing in the code. Host-owned by design (space, economy, factions) is marked as such, not missing.

Versions: `ENGINE_VERSION` 1.6.0 (save format); `FRAMEWORK_VERSION` and package.json `1.1.0`.

## Faculties

The faculty-by-faculty status (body, perception, memory, reasoning, affect, needs, commitments, morality and faith, will, learning and skills, personality, relationships, life course and heredity, environment and culture) is in [faculty-inventory.md](faculty-inventory.md), the single list of what HF aims to model, each marked Done / Partial / Missing / Excluded against the code. It replaces the per-faculty tables that were here. This page keeps the world interface, narration, engineering and the Goal 2 order.

## Economy & world interface

| Capability | Status | Where | Note |
|---|---|---|---|
| Affordance/outcome/percept contract | built+tested | types.ts `Affordance`, `Outcome`, `Percept`; sim/ `World` | |
| Material gain term | built+tested | cognition/ `consider` | Saturating; scarcity-scaled |
| Space, travel, inventory, money, jobs | host-owned | — | By design (framework.md, host protocols) |
| Job reservation, work priorities | host-owned | — | rimworld-gap §2 |

## Narration

| Capability | Status | Where | Note |
|---|---|---|---|
| First-person decision and verdict lines | built+tested | narrate/ `narrateDecision`, `voiceLine`, `describePerson` | |
| Phrase packs, names, roles | built+tested | narrate/ `EN_LINES`, `linesFor`, `nameOf` | |
| Day and month stories | built+tested | chronicle/ `narrateChronicle`, `diffChronicle` | |
| Generated language | missing | — | Templates only; LLMs excluded from the loop by rule |

## Engineering

| Capability | Status | Where | Note |
|---|---|---|---|
| Determinism, seeded RNG in state | built+tested | core/ `createRng`; save-resume.test.ts | Byte-equal resume |
| Snapshot and restore | built+tested | person.ts `snapshot`, `restore`; sim/ `communityState` | |
| Save migration | partial | `migrate`, `MIGRATIONS` | Person 1.4.0+ only; stamp-only; no community/world steps |
| Performance | partial | `npm run bench` | 20 × 30 days 1555 ms; multi-year colony unmeasured; ~200 KB/person |
| Packaging | partial | packages/human `npm run build` | Private, UNLICENSED; TS 5.x consumers untested; version not bumped |
| CI and GitHub releases | partial | `.github/workflows/ci.yml`; `npm run release` | CI gate on check and build, bench informational; tags stop at `v1.0.0`, so the 1.1.0 release is not cut |

## The grand ambition — what's left

Ordered for Goal 2, where Game 3's endless play needs years of aging and experience, heredity and social effects:

1. **Experience over years.** Memory and chronicle caps hold months. Add a life-scale layer: yearly summaries, a few defining memories kept for life, slow drift of expectations.
2. **Wire the development curves.** `lifeModifiers().maturity` already weights agenda and habit terms (cognition.ts); `developmentForAge` and `learningMultiplier` are tested and unused. Feed them into will, skills and affect, then test a 16-year-old against a 60-year-old in the same world.
3. **Aging in a lived community.** Natural death is tested only on the very old under a ×50 hazard. Run a community through years of lived (not skipped) time, with deaths, grief and bench numbers.
4. **Heredity end to end.** Partnering (attraction, marriage) as a front end to `birth`; a childhood model (dependence through `careDuty`, maturation gating, household exposure that continues after birth).
5. **Character change.** Traits, values and norm conviction are fixed for life. Slow, experience-driven drift (practice, community, loss) within research/empirical-models §4.
6. **Social effects.** Judgement habituation, standing loss with a betrayed promisee, the other's view of me, romance; group identity that strengthens with shared nights.
7. **Environment mood.** An ambient context on `tick` (cold, dark, comfort) for the wall at night.
8. **Release plumbing.** CI runs (check and build gate, bench informational); left: cut the 1.1.0+ GitHub releases and migrate community state.

Faith items from R1 (Fajr to sunrise, prayer debt, blame lifted for sleep and unconsciousness) are in progress and stay quiet in games.

## How games demonstrate it

Game 1 *Twice at the Well* runs its own colony world against a Classic baseline: needs, body and injuries, skills, commitments and promises, and orders as suggestions with typed verdicts. Game 2 *The Day You Say Nothing* runs on `createTown`: voice trust and pressure, insisting, standing advice, habits and their extinction, fasting and prayer as quiet routine, grief through cue recall, gossip through `converse`, and the chronicle story. Neither game uses anything from 1.6.0 (command, breaks, injury depth, downing, groups) or the life course (aging, death, birth, migration). Game 3 *The Night Watch* is planned to show those first: the bell as command, breaks, wounds and downing, Ruslan as outsider under threat, courage as learned expectation, joint practice. Its endless mode is where aging, heredity, character change and long memory have to appear; no game shows them today.
