## @human/framework as the human layer of a RimWorld-like colony sim: gap analysis

**Short answer:** the decision loop, its cost, and long-run aging could carry a 30-colonist colony. Five things block it. The biggest one goes against the framework's own design: in RimWorld, drafting is absolute control, while here no outside voice can override a refusal. Everything spatial and anything about combat stays in the game, which is what the framework intends.

### 1. Blocking (must exist before such a game works)

| Gap | What's missing | Where | Size | Belongs in |
|---|---|---|---|---|
| **Drafted control** | `insist` only turns a `notNow` into compliance. `cannot`, `willNot` and pressing bodily needs always win (will.ts). Drafting has no path. A host can skip `decide` and call `begin(p, aff, record)` with a record it builds itself, since begin only reads `record.id` and `record.intention`. But then no autonomy cost, resentment or memory of being commanded is recorded, and `stepCommunity` would still decide for that person. Needed: a "commanded" mode, i.e. a will verdict `commanded` plus a per-person `StepOptions.controlled`, so the driver ticks, perceives and finishes for that person but does not decide. A mental break or capacity can still end the mode. | will/, person.ts, sim/ | M | framework |
| **Mental breaks** | Nothing exists (grep for break, tantrum, berserk: none). The closest thing is refusals plus emotion tendencies. There is no crisis state where mood stays past a threshold, orders stop being heard, and the person acts out until the state clears. | affect/ (threshold, hazard) + will/ (veto all voices) | M | framework for the state; game for the break catalog |
| **Combat and injury depth** | `Injury` is `{part: free text, severity, healRatePerDay}`. Severity feeds pain, pain feeds one `capacity` scalar, and `health ≤ 0` kills (body.ts `readBody`, `injure`). There are no part capacities (walking, manipulation, sight), no bleeding, no tending, no infection, no downed state. Decisions are per minute with a 30-minute review, so second-level combat must run as a game loop. The framework would only decide fight, flee or comply on each interrupt. | body/ (part capacities, bleeding, downed), game (weapons, hit rolls) | L | split |
| **Hostility and factions** | The social scope excludes group identity and the other side's view of me (social.ts). Raiders would arrive as people with no relationship, or as non-people. Needed: out-group default ties and a threat percept that feeds fear and risk terms. | social/ | M | framework for in-group/out-group; game for factions |
| **Save migration across engine versions** | `restore` refuses any other `ENGINE_VERSION`. There were five bumps (1.1–1.5) in two days. A multi-year save dies at every bump. Needed: a `migrate(json)` chain. | person.ts | S–M | framework |

### 2. Needed for quality

- **Romance and attraction.** Roles include `spouse` and `createChild` exists (lifecourse/birth.ts). There is no attraction, courtship, or partner-forming process. Belongs in social/. M, framework.
- **Moods from the environment.** `NeedsContext` is only `{withOthers, activityTags, asleep}`. No ambient input reaches `tick`: no room beauty, temperature, filth or darkness. Workaround: the game feeds `felt` percepts into appraisal. The proper fix is a host `ambient` context on tick that feeds mood. Temperature and bladder are listed as not modelled in body/. M, framework.
- **Work priorities.** A priority table could be expressed as goals or standing suggestions, but standing advice was tuned for one voice and one person. Game, S–M.
- **Job reservation and contention.** The joint protocol covers cooperation. It does not stop two colonists from claiming the same haul. Game, M.
- **Flat daytime utilities.** The findings record naps about 3× a day and fragile habit cues. A work-heavy colony would show this problem everywhere. Needs a recalibration pass. Framework, M.
- **Joint activities are one-sided.** `partnersOf` only checks that the partner is alive. `social.judge` has no habituation (findings). Framework, S–M.
- **Skills.** No negative transfer and no aptitude or passion trait (skills.ts scope). S.

### 3. Already covered

- Event-driven decisions with interrupts: `stepCommunity`, `interruptPerson`, `Percept.near`, and `interruptSalience` (sim/).
- Grid map and pathfinding stay with the host. Game 1 already folds `findPath` travel into `Affordance.duration` (apps/site/src/colony/sim/human-world.ts).
- Skills learned by doing: `practise`, `successChance`, forgetting, and transfer (skills/).
- Needs, sleep and hunger: body/ and needs/ (two-process sleep model, `consume`, `nextBodyThreshold`).
- Emotions and mood: `appraise`, `feel`, `actionTendencies` (affect/).
- Relationships, gossip, reputation and bereavement: `socialEvent`, `judge`, `converse` (social/, conversation/).
- Illness and contagion: `sicken`, chronic `expose` (body/). Aging, mortality and births: `mortalityEvent`, `createChild`, sim `birth` and `addPerson`, and `skip` for long jumps.
- Player orders as suggestions with typed verdicts: `predict`/`preview`, plus `begin(..., {promise})`.
- Save and load: `snapshot`/`restore` plus `communityState` and `createCommunity(people, prior)`. Byte-equal resume is pinned in save-resume.test.ts.
- Determinism and seeded RNG.

### Performance

**Measured** on this machine (Node 26, a scratch script in /private/tmp/claude-504/scratch/bench.ts importing src):
- 30 villagers for 30 sim-days took **2164 ms**. That is 35,462 decisions (about 39 per person per day), **72 ms per sim-day** and about 61 µs per decision, all-in.
- `decide` alone grows linearly with the number of offers: 26 µs at 14, 85 µs at 50, 240 µs at 150, 455 µs at 300. `tick` costs about 1 µs per person-minute.
- Snapshot of 30 people at day 30: **5.65 MB**, about 190 KB per person.
- The stock benchmarks: 20 people for 30 days took **2327 ms** against a 2 s target, so it passed only on the local ×2 allowance. 50 people took 5703 ms against 5 s. I'm not claiming a regression; there were other agents running.

**Estimate:** RimWorld runs 60 ticks/s at 1×, and a day is 60k ticks, about 1000 s at 1× and about 167 s at the top normal speed. Even in a bad case for the framework (30 colonists, 1,200 decisions each per day from short haul jobs, 300 offers each), the cost is about 0.55 s per sim-day, about 0.3% of real time at top speed. There is no per-tick cost: between events the framework does nothing, and the game can call `stepCommunity(c, world, now)` once per game minute.

**Assumed, not measured:**
- The host's `affordancesFor` will dominate the cost. Pathfinding for each offer on every decision is the expensive part, so it needs caching or flow fields.
- Saves after years should level off at about 0.2 MB per person plus the chronicle (capped at 120 days, about 3 KB a day), so roughly 15–20 MB for 30 colonists. That is heavy for localStorage, so plan for IndexedDB or compression.
- The longest full-community run on record is about 150 days. The 40-year test (lifecourse-trajectories.test.ts) is one person in coarse steps, so multi-year colony behaviour is unmeasured.

### Thin or unbuilt from the original vision

These come from each module's "does NOT model" clause and from findings:
- **agenda/**: no multi-step planning and no implementation intentions.
- **memory/**: no interference, consolidation, false memory or semantic abstraction.
- **social/**: no model of how the other side sees me, no attachment, no groups.
- **body/**: no temperature, bladder or stress physiology.
- **cognition/**: scarcity is uncited and present bias is absent.
- **narration**: templates only.
- **Behaviour**: parameters are uncalibrated, joint activities are one-sided, and there is no CI for the benchmarks.

archive/v0 is not referenced by docs/framework.md and I did not consult it.
