# What HF has (engine 1.6.0, on main) vs the full ambition

2026-10-04. Phase R3 of Goal 2 ([HANDOFF](../HANDOFF.md)). The ambition is the one in [archive/v0 roadmap](../archive/v0/docs/roadmap.md) and [research/empirical-models.md](../research/empirical-models.md): an embodied person who notices, understands, is moved by needs, emotions and duties, chooses, acts and develops over a life, among others and within a culture. This page checks it against the code: exports were confirmed by grep in `packages/human/src`; "where" names the module and export. **built+tested** = exported, wired into the composite or driver, with tests. **partial** = exists but is unwired, opt-in only, or missing a named piece. **missing** = nothing in the code. Host-owned by design (space, economy, factions) is marked as such, not missing.

Versions: `ENGINE_VERSION` 1.6.0 (save format); `FRAMEWORK_VERSION` and package.json are still `1.0.0`.

## Body & health

| Capability | Status | Where | Note |
|---|---|---|---|
| Satiety, hydration, sleep (two-process), fatigue, pain, fitness | built+tested | body/ `advanceBody`, `readBody`, `consume` | True vs perceived readout; closed form for any dt |
| Interrupt thresholds | built+tested | body/ `nextBodyThreshold` | |
| Injury capacities, bleeding, tending, downed | built+tested | body/injury.ts `readCapacities`, `tend`, `bleedRate`, `enableDowned` | Opt-in; no infection, no weapons (game) |
| Acute and chronic illness, contagion | built+tested | body/ `sicken`, `expose`, `contagionRoll` | Not calibrated |
| Fasting perception | built+tested | body/ `fastingDamping` | Hunger damped, thirst not |
| Temperature, bladder, nutrients, stress physiology | missing | — | Listed in body.ts "not modelled" |

## Needs & affect

| Capability | Status | Where | Note |
|---|---|---|---|
| Concurrent physiological and psychological needs | built+tested | needs/ `readNeeds`, `advanceNeeds`, `urgency` | SDT trio plus safety, esteem, leisure, meaning |
| OCC appraisal, 16 emotions, mood | built+tested | affect/ `appraise`, `readAffect`, `actionTendencies` | |
| Regulation as practised capacity | built+tested | affect/ `regulate` | Trained by worship, reflection, rest |
| Mental breaks | built+tested | affect/crisis.ts `enableBreaks`, `breakHazard` | Opt-in; host supplies behaviours |
| Mood from the environment (beauty, cold, dark) | missing | — | rimworld-gap §2; no ambient input on `tick` |
| Fear habituation | missing | — | Courage only via learned expectations |

## Cognition & decision

| Capability | Status | Where | Note |
|---|---|---|---|
| Additive utility with traced terms | built+tested | cognition/ `consider`, `scoreAndResolve`; person.ts `decide` | Every term in the trace |
| Learned expectations vs advertisement | built+tested | memory/ `expectedEffect`, `learnOutcome` | Delta rule, clamped step |
| Selective attention | built+tested | beliefs/ `attend` | |
| Scarcity | partial | `ConsiderContext.scarcity` | Uncited (findings); no bandwidth tax |
| Multi-step planning, implementation intentions | missing | — | agenda.ts scope |
| Present bias, metacognition | missing | — | |
| Calibrated daytime utilities | partial | — | Flat utilities cause ~3 naps/day (findings) |

## Will & voices

| Capability | Status | Where | Note |
|---|---|---|---|
| Typed verdicts, insist, counter-offers | built+tested | will/ `resolveChoice`, `predictResponse`; sim/ `preview` | The signature mechanic |
| Trust and pressure per voice | built+tested | will/ `learnFromVoice`, `voiceOf` | Asymmetric; anti-farming |
| Several voices, standing and remembered advice | built+tested | will/ `rememberAdvice`, `standingAdvice`; sim/ `standingHeard` | |
| Direct command (drafting) | built+tested | person.ts `command`, `releaseCommand`, `previewCommand` | 1.6.0; no game uses it yet |
| Omission rule, necessity, precommitment | built+tested | will/ `closingDuties`, `precommit`; conscience/ `normVeto` | |

## Memory & beliefs

| Capability | Status | Where | Note |
|---|---|---|---|
| Episodic memory with emotional salience | built+tested | memory/ `remember`, `recall`, `advanceMemory` | ≤ 200 episodes; loss memories evicted last |
| Cue-triggered recall | built+tested | memory/ `recallByCue` | |
| Log-odds beliefs, source trust | built+tested | beliefs/ `believe`, `credence`, `confirm`, `trustOf` | |
| Autobiography (day records) | partial | chronicle/ `closeDay`, `narrateChronicle`, `diffChronicle` | Capped at 120 days: no record of years |
| Semantic abstraction, consolidation, false memory | missing | — | memory.ts scope |
| Motivated reasoning, inference between beliefs | missing | — | beliefs.ts scope |

## Skills, habits & learning

| Capability | Status | Where | Note |
|---|---|---|---|
| Skills by doing, forgetting with floor | built+tested | skills/ `practise`, `skillLevel`, `successChance` | Age scales learning rate |
| Explicit transfer | built+tested | skills/ `skillFamilies` | No negative transfer |
| Cue habits, ease, extinction, craving | built+tested | habits/ `habitPull`, `habitEase`, `withholdCued` | |
| Aptitude or passion trait | missing | — | rimworld-gap §2 |
| Learning from others (teaching, imitation) | missing | — | Only joint success support |

## Social life

| Capability | Status | Where | Note |
|---|---|---|---|
| Dyadic ties, favours, drift | built+tested | social/ `socialEvent`, `relationshipWith`, `advanceSocial` | One-sided records |
| Judging others' acts | partial | social/ `judge` | No habituation (findings) |
| Gossip, reputation, deceit | built+tested | conversation/ `converse`; social/ `reputation` | Templates, no language |
| Bereavement | built+tested | social/ `markDeceased`, `isDeceasedTie` | |
| Insiders, outsiders, threat | built+tested | social/groups.ts `joinGroups`, `meet`, `careFor` | Factions host-owned |
| Joint activities | partial | sim/ `proposeJoint`, `acceptJoint`, `jointSuccessChance` | Older paths one-sided (findings) |
| Other's view of me, attachment, group identity strength | missing | — | social.ts, groups.ts scope |
| Romance, partner forming | missing | — | rimworld-gap §2 |
| Missed promise costs standing with the promisee | missing | — | Findings, seventh pass |

## Morality & faith

| Capability | Status | Where | Note |
|---|---|---|---|
| Held understanding of norms, with provenance | built+tested | conscience/ `DEFAULT_NORMS`, `heldNorms`, `normTerms` | Not rulings |
| Prohibition veto, necessity (2:173), capacity (2:286) | built+tested | conscience/ `normVeto`, `abstentionVeto` | |
| Intention, breach, repentance, repair | built+tested | conscience/ `recordDeed`, `repent`, `recordRepair` | No acceptance computed |
| Prayer windows, Ramadan fast, Eid | partial | agenda/ `prayerWindows`, `ramadanFast`, `eidPrayer` | Fajr ends at Dhuhr, not sunrise (R1 pending) |
| Make-ups (qada) | partial | agenda/ `owedMakeUps`, `scheduleMakeUp` | Fasts under illness/necessity only; prayer debt is R1 |
| Duty missed during a break or sleep | partial | — | Booked as missed; [decisions.md](../research/decisions.md) lifts blame, not coded |
| Conviction changing over a life | missing | — | Set at creation only (conscience.ts, birth.ts) |
| Care for dependents as duty | built+tested | agenda/ `careDuty` | |

## Life course, aging & death

| Capability | Status | Where | Note |
|---|---|---|---|
| Age modifiers in body and learning | built+tested | lifecourse/ `lifeModifiers` | `metabolism`, `recovery`, `maxFitness`, `learning` consumed |
| Self-control by age | partial | `LifeModifiers.selfControl` | Computed, consumed nowhere |
| Developmental curves (reward seeking, maturity, speed vs knowledge, elder decline) | partial | lifecourse/ `developmentForAge`, `learningMultiplier` | Tested, not wired into any faculty |
| Life stages | partial | lifecourse/ `lifeStage` | Nothing gates on stage; infants decide like adults |
| Chronic onsets, natural death | partial | lifecourse/ `chronicOnsets`, `mortalityEvent`; sim/ `StepOptions.lifecourse` | Opt-in; tested on 24 people aged 95 with ×50 hazard; hazard capped 1/yr |
| Decades of aging | partial | person.ts `skip` | One person, 40 coarse years, one lived day a year; community never run past ~150 days |
| Experience accumulating over years | missing | — | Episodes ≤ 200, chronicle 120 days: a character keeps months, not a life |

## Heredity & development

| Capability | Status | Where | Note |
|---|---|---|---|
| Child from two parents (HEXACO midparent regression) | built+tested | lifecourse/ `createChild`; sim/ `birth` | h ≈ 0.3, wide noise |
| Value and norm exposure in the household | partial | `ChildSpec.valueTransmission`, `normExposure` | At birth only, not ongoing |
| Partnering, pregnancy | missing | — | No front end to `birth` |
| Childhood model (care needs, maturation, schooling) | missing | — | Child is an adult with age modifiers |
| Personality and value change over life | missing | — | Traits and values are read-only |
| Physical inheritance (health, build) | missing | — | |

## Culture & community

| Capability | Status | Where | Note |
|---|---|---|---|
| Community driver, events, interrupts | built+tested | sim/ `createCommunity`, `stepCommunity`, `interruptPerson` | |
| Reference worlds | built+tested | scenarios/ `createVillage`, `createTown` | Fixtures, not models |
| Culture as learned, shared practices | missing | — | Norms come from a host catalog |
| Institutions, norm diffusion, social consensus | missing | — | empirical-models §8 |

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
| CI and GitHub releases | missing | — | No `.github/workflows`; R0 in progress |

## The grand ambition — what's left

Ordered for Goal 2, where Game 3's endless play needs years of aging and experience, heredity and social effects:

1. **Experience over years.** Memory and chronicle caps hold months. Add a life-scale layer: yearly summaries, a few defining memories kept for life, slow drift of expectations.
2. **Wire the development curves.** `developmentForAge`, `learningMultiplier` and `selfControl` are tested and unused. Feed them into will, skills and affect, then test a 16-year-old against a 60-year-old in the same world.
3. **Aging in a lived community.** Natural death is tested only on the very old under a ×50 hazard. Run a community through years of lived (not skipped) time, with deaths, grief and bench numbers.
4. **Heredity end to end.** Partnering (attraction, marriage) as a front end to `birth`; a childhood model (dependence through `careDuty`, maturation gating, household exposure that continues after birth).
5. **Character change.** Traits, values and norm conviction are fixed for life. Slow, experience-driven drift (practice, community, loss) within research/empirical-models §4.
6. **Social effects.** Judgement habituation, standing loss with a betrayed promisee, the other's view of me, romance; group identity that strengthens with shared nights.
7. **Environment mood.** An ambient context on `tick` (cold, dark, comfort) for the wall at night.
8. **Release plumbing.** CI running check and bench, GitHub release, version bumps, migration of community state.

Faith items from R1 (Fajr to sunrise, prayer debt, blame lifted for sleep and unconsciousness) are in progress and stay quiet in games.

## How games demonstrate it

Game 1 *Twice at the Well* runs its own colony world against a Classic baseline: needs, body and injuries, skills, commitments and promises, and orders as suggestions with typed verdicts. Game 2 *The Day You Say Nothing* runs on `createTown`: voice trust and pressure, insisting, standing advice, habits and their extinction, fasting and prayer as quiet routine, grief through cue recall, gossip through `converse`, and the chronicle story. Neither game uses anything from 1.6.0 (command, breaks, injury depth, downing, groups) or the life course (aging, death, birth, migration). Game 3 *The Night Watch* is planned to show those first: the bell as command, breaks, wounds and downing, Ruslan as outsider under threat, courage as learned expectation, joint practice. Its endless mode is where aging, heredity, character change and long memory have to appear; no game shows them today.
