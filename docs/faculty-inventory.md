# Faculty inventory

2026-10-04, against `packages/human/src` at engine 1.6.0 / HF 1.1.0. This is the single list of the human faculties HF aims to model, with each one's status in the code. Sections follow the twelve coverage responsibilities of the original research proposal ([archive/v0/docs/framework-proposal.md](../archive/v0/docs/framework-proposal.md) §4–5), with the evidence screen in [research/empirical-models.md](../research/empirical-models.md) (§n, source S-numbers) and the faith constraints in [research/islamic-foundations.md](../research/islamic-foundations.md). Engineering, narration and release status are in [hf-status.md](hf-status.md); the Goal 2 targets L1–L6 are in [games/watch.md](games/watch.md).

**Status.** **Done**: exported, wired into the composite (`person.ts`) or driver (`sim/`), tested. **Partial**: exists but unwired, opt-in only, or missing a named piece. **Missing**: nothing in the code. **Excluded**: deliberately not modelled, by an AGENTS.md rule or a research decision (the reason is given). Every Done/Partial row was checked by reading the module, not the docs. Paths are relative to `packages/human/src/`.

**Count: 71 Done, 30 Partial, 35 Missing, 6 Excluded (142 rows).**

## 1. Bodily life and regulation

| Faculty | Status | Where | What's missing | Research |
|---|---|---|---|---|
| Energy (satiety) and hydration | Done | body/body.ts `advanceBody`, `consume` | Rates uncalibrated | §1 |
| Sleep: two-process pressure, circadian rhythm, chronic debt | Done | body/body.ts `advanceBody`, `readBody` | — | §1 S3 |
| Exertion, fatigue, trained fitness | Done | body/body.ts | — | §1 |
| Pain and injury: part capacities, bleeding, tending, downed | Done | body/injury.ts `readCapacities`, `tend`, `bleedRate`, `enableDowned` | Infection, scars, permanent loss (opt-in module) | §1 |
| Illness: acute, chronic, contagion | Done | body/body.ts `sicken`, `expose`, `contagionRoll` | Uncalibrated | §1 |
| Body cost of stress (allostatic load) | Partial | affect/crisis.ts stress (opt-in) | Stress only drives breaks; no bodily cost | §1 S2 |
| Temperature, bladder, specific nutrients | Missing | — | Listed "not modelled" in body.ts | §1 |
| Sexuality, pregnancy | Missing | — | `createChild` has no pregnancy; games stay PG (watch L3) | proposal §4 |

## 2. Perception and attention

| Faculty | Status | Where | What's missing | Research |
|---|---|---|---|---|
| Perceiving the world through host percepts | Done | types.ts `Percept`; person.ts `perceive` | No sense modalities or misperception; the host decides what is seen | proposal §4 |
| Interoception: perceived vs true body | Done | body/body.ts `readBody` (perceived), `fastingDamping` | No masking of hunger or pain by emotion or focus | §1 S1 |
| Selective attention with limited capacity | Done | beliefs/beliefs.ts `attend` | — | §6 |
| Salient events interrupt the current activity | Done | person.ts `interrupt`; sim/ `interruptPerson`, `Percept.near` | — | — |
| Threat perception (fear aimed at a source) | Done | social/groups.ts, `Percept.threat` | — | — |
| Sensory impairment | Partial | body/injury.ts `sight` capacity | Gates offers only; perception itself is not degraded | §1 |
| Attention costs time (reading, studying) | Missing | — | v0 had paid attention (below) | — |

## 3. Memory and knowledge

| Faculty | Status | Where | What's missing | Research |
|---|---|---|---|---|
| Episodic memory with emotional salience and forgetting | Done | memory/memory.ts `remember`, `recall`, `advanceMemory` | Capped at 200 episodes | proposal §4 |
| Cue-triggered recall | Done | memory/memory.ts `recallByCue` | — | — |
| Source memory and trust in sources | Done | beliefs/beliefs.ts `trustOf`, `confirm` | No source-memory errors | — |
| Working memory | Partial | beliefs/beliefs.ts `attend` budget (2–6 items) | A percept filter only; nothing is held or manipulated | §3 |
| Semantic knowledge | Partial | beliefs/beliefs.ts `believe`, `credence` | Propositions with credence; no abstraction from episodes, no item-level knowledge | §3 |
| Procedural memory | Done | skills/, habits/ (see §10) | — | — |
| Autobiography | Partial | chronicle/chronicle.ts `closeDay`, `narrateChronicle`; 1.8.0 yearbook `enableYearbook`, `foldDay`, `yearRecord` | Opt-in; days leaving the 120-day chronicle (and routine days) fold into year records (≤ 150 years), but nothing narrates a year | — |
| Consolidation into lasting gists | Partial | memory/memory.ts `enableGists`, `consolidate`, `gistsFor`; cognition/ `memory` term | Opt-in; a fear learned at 20 still shapes choices at 40 (test/longlife.test.ts). Gists are not retold in conversation | Brainerd & Reyna (fuzzy trace) |
| Interference, false memory, reconsolidation | Missing | — | memory.ts scope | — |

## 4. Reasoning and metacognition

| Faculty | Status | Where | What's missing | Research |
|---|---|---|---|---|
| Weighing options: additive utility with traced terms | Done | cognition/cognition.ts `consider`; person.ts `decide` | — | §6 S15 |
| Learned expectations vs advertised effects (model-free values) | Done | memory/memory.ts `expectedEffect`, `learnOutcome` | — | §6 S15 |
| Calibrated daytime utilities | Partial | cognition/ | Flat utilities give ~3 naps/day (findings.md) | — |
| Scarcity | Partial | cognition/ `ConsiderContext.scarcity` | Uncited; no bandwidth tax | — |
| Inference between beliefs | Missing | — | beliefs.ts scope; v0 had acyclic inference (below) | §3 |
| Multi-step planning (model-based) | Missing | — | agenda.ts scope; v0 had a bounded planner (below) | §6 S15 |
| Present bias, temporal discounting | Missing | — | Deadline pressure only (agenda) | — |
| Motivated reasoning | Missing | — | beliefs.ts scope | — |
| Metacognition: confidence in own skill, noticing own error | Missing | — | — | proposal §4 |
| Imagination, counterfactuals | Missing | — | — | proposal §4 |
| A general intelligence multiplier | Excluded | — | Research decision: no global ability or learning-speed multiplier | §3 S7–S9 |

## 5. Affect and appraisal

| Faculty | Status | Where | What's missing | Research |
|---|---|---|---|---|
| Emotions from appraisal (16, OCC) | Done | affect/affect.ts `appraise`, `feel` | — | §5 |
| Mood (valence, arousal) | Done | affect/affect.ts `readAffect` | — | §5 S13 |
| Action tendencies | Done | affect/affect.ts `actionTendencies` | — | §5 |
| Regulation as a practised capacity | Done | affect/affect.ts `regulate` (worship, reflection, rest) | — | §5 |
| Mental breaks | Done | affect/crisis.ts `enableBreaks`, `breakHazard` (opt-in) | Host supplies behaviours | — |
| Fear habituation | Missing | — | Courage comes only from learned expectations | — |
| Expression, concealment, emotional contagion | Missing | — | — | §5 |

## 6. Needs and desires

| Faculty | Status | Where | What's missing | Research |
|---|---|---|---|---|
| Bodily needs as concurrent pulls | Done | needs/needs.ts `readNeeds`, `urgency` | — | §2 S6 |
| Psychological needs: safety, belonging, esteem, autonomy, competence, leisure, meaning | Done | needs/needs.ts `advanceNeeds`, `satisfy` | — | §2 S4–S6 |
| Rest and play | Done | needs/ `rest`, `leisure` | — | — |
| Care for others | Done | agenda/ `careDuty`; social/groups.ts `careFor`; value `benevolence` | — | — |
| Curiosity, novelty seeking | Partial | boredom favours `novel` options (affect/) | No curiosity need or information seeking; reward-seeking curve unwired | — |
| Status and power | Partial | needs/ esteem; types.ts `Values.power`; social/ `respect` | No status hierarchy | proposal §4 |

## 7. Commitments and meaning

| Faculty | Status | Where | What's missing | Research |
|---|---|---|---|---|
| Promises, appointments, jobs | Done | agenda/agenda.ts `promise`; person.ts `begin(..., { promise })` | — | — |
| Goals and spontaneous purposes | Done | agenda/agenda.ts `adoptGoal`, `proposeGoals` | — | §2 |
| Neglected purposes fade and are let go | Done | agenda/agenda.ts `revisePurposes` | — | — |
| Abstention and precommitment | Done | agenda/ abstain commitments; `WillState.precommitments` | — | §6 |
| Omission rule (a closing duty is protected) | Done | will/ `closingDuties` | — | — |
| Implementation intentions | Missing | — | agenda.ts scope | §6 |
| Life purpose, vocation, life narrative | Missing | — | Goals run on days; nothing spans a life | §2 S5 |

## 8. Moral understanding and spiritual life

| Faculty | Status | Where | What's missing | Research |
|---|---|---|---|---|
| Held understanding of norms, with provenance | Done | conscience/ `DEFAULT_NORMS`, `heldNorms`, `normTerms` | Understandings, not rulings | islamic-foundations; decisions.md |
| Prohibition veto, necessity (2:173), capacity (2:286) | Done | conscience/ `normVeto`, `abstentionVeto` | — | islamic-foundations §4 |
| Intention recorded apart from the act | Done | conscience/ `recordDeed` | — | Bukhari 1 |
| Breach, guilt, repentance, repair | Done | conscience/ `repent`, `recordRepair`; affect/ `release` | No acceptance computed (by rule) | islamic-foundations |
| Judging others' acts | Partial | social/social.ts `judge` | No habituation (findings.md) | — |
| Worship: prayer windows, Ramadan fast, Eid | Partial | agenda/prayer.ts `prayerWindows`, `ramadanFast`, `eidPrayer` | Fajr ends at Dhuhr, not sunrise (R1) | prayer-times-sources |
| Make-ups (qada) | Partial | agenda/ `owedMakeUps`, `scheduleMakeUp` | Fasts only; prayer debt is R1 | fasting-sources |
| Blame lifted for a duty missed asleep or in a break | Missing | — | Decided in research/decisions.md, not coded | decisions.md |
| Conviction and character changing over a life (moral development) | Missing | — | Set at creation (conscience.ts, birth.ts) | proposal §5 |
| Divine acceptance, worth, ruh quantities; RNG named qadar | Excluded | — | AGENTS.md rule | islamic-foundations |
| Qalb, nafs, fitrah, ʿaql as state variables | Excluded | — | Research decision: no scalar; shown through conviction, regulation, repentance | proposal §5 |

## 9. Choice and action control

| Faculty | Status | Where | What's missing | Research |
|---|---|---|---|---|
| Assent: vetoes, hysteresis, optional softmax | Done | will/will.ts `resolveChoice` | — | — |
| Outside voices: typed verdicts, insist, counter-offers | Done | will/ `resolveChoice`, `predictResponse` | — | — |
| Trust and pressure per voice; standing advice | Done | will/ `learnFromVoice`, `rememberAdvice` | — | — |
| Direct command | Done | person.ts `command`, `releaseCommand`, `previewCommand` | No game uses it yet | — |
| Self-control without a willpower fuel | Done | will/will.ts, habits/habits.ts, cognition/ effort term | — | §6 S17 |
| Task performance vs learned competence | Done | skills/ `successChance` (capacity, support) | — | §3 |
| A single willpower reservoir | Excluded | — | Research decision (ego depletion) | §6 S17 |

## 10. Learning, habit and character development

| Faculty | Status | Where | What's missing | Research |
|---|---|---|---|---|
| **Experience as proficiency**: practice minutes per skill, diminishing gains | Done | skills/skills.ts `practise`, called by person.ts `finish` for any offer with `skill` | Uncalibrated | §3; proposal §7 |
| Desirable difficulty; failure teaches at 0.6 | Done | skills/ `challengeFactor`, `practise` | — | learning-through-work |
| Rust: forgetting with a retention floor | Done | skills/ `skillLevel` (half-life 180 d, 60 % floor); 1.8.0 opt-in `enableSkillConsolidation` lengthens the half-life with practice hours | Without consolidation, decades of daily practice plateau and decline (findings.md) | learning-source-followup Q29 |
| Age-dependent learning rate | Done | lifecourse/ `lifeModifiers().learning` → `practise` | — | §7 S19 |
| Domain-specific age curves (language, motor, knowledge) | Done | lifecourse/development.ts `learningMultiplier(age, domain)`; `Affordance.skill.domain` → person.ts `learningFor` in `finish`, `observeSkill`, longrun | — | §7 S19 |
| **Learning within a field** (near transfer between related skills) | Done | skills/ `SkillTransfer`, `skillFamilies`; `finish(..., { transfer })`, `World.skillTransfer`, `RoutineOptions.transfer` | No default map (research decision); no game supplies one yet | §3 S8 |
| **Learning outside a field**: taking up any skill unrelated to one's work | Done | skills/ `practise` on any skill id, from base 0.05 | No role or field restricts what can be learned | §3 |
| **Far transfer**: gains in one field raising an unrelated one, or global XP | Excluded | — | Research decision: default zero. A host may still declare any link in `SkillTransfer` and it is honoured (row above) | §3 S8–S9; proposal §7 |
| Negative transfer, interference between skills | Missing | — | skills.ts scope | proposal §7 |
| Aptitude per skill (talent), passion | Missing | — | Watch L2; rimworld-gap §2 | §7 |
| Practice quality as a learning input | Done | skills/ `qualityFactor` via `Outcome.practice.quality` / `RoutineActivity.practice` | Size is an assumption (0.5×–1.5×) | Ericsson 1993; Macnamara 2014 |
| **Experience as expectation** (what an action does) | Done | memory/ `learnOutcome` | — | §6 S15 |
| **Experience over years** | Partial | memory/ gists, chronicle/ yearbook, character/, skills/ consolidation, longrun.ts | Each piece is opt-in (`enableGists`, `enableYearbook`, `enableCharacterChange`, `enableSkillConsolidation`) | research/long-run-sources.md |
| Skills aging (slower learning, elder decline) | Partial | lifecourse/lifecourse.ts `lifeModifiers().learning` falls after 30 | development.ts `elderDecline` unwired | §7 S19 |
| Teaching, instruction | Done | skills/ `instructionFactor`, `instructionFrom(teacher, skill)` via `Outcome.practice.instruction`; also `successChance` `support` | No effect on the teacher; the host decides who teaches | VanLehn 2011 |
| Observational learning, imitation | Done | skills/ `observe`; person.ts `observeSkill`, `Percept.demonstrates` | Teaches toward 0.6 × the model's level, never mastery; no imitation of choices | Bandura 1977; Ashford 2006 |
| Learning from told experience | Partial | conversation/ `converse` → beliefs | Moves beliefs only, not expectations or fear (watch L2) | — |
| Qualifications, roles, credentials | Missing | — | v0 had qualification records (below) | §8 |
| Reflection that revises methods or commitments | Partial | agenda/ `revisePurposes` (neglect only) | No revision from evidence of failure | §6 |
| Cue habits: formation, extinction, craving, ease | Done | habits/habits.ts `habitPull`, `withholdCued`, `habitEase` | No renewal after extinction | §6 S16 |

## 11. Personality, values and identity

| Faculty | Status | Where | What's missing | Research |
|---|---|---|---|---|
| HEXACO traits as coefficients | Done | types.ts `Traits`; read across modules | — | §4 |
| Schwartz values as coefficients | Done | types.ts `Values`; cognition/, conscience/, social/ | — | §4 |
| Within-person variability | Partial | will/ `temperature` (opt-in softmax) | Traits are not distributions of states | §4 S10 |
| Trait and value change over life | Partial | character/character.ts `enableCharacterChange`, `ageCharacter`, `noteCharacterDay` | Opt-in; maturation 18–65 plus a yearly experience offset with a set point, within ±0.15 of the anchor. Experience does not move honesty, agreeableness or values | §4 S11; Bleidorn 2022; Roberts 2006 |
| Identity: group membership | Partial | social/groups.ts `joinGroups` | No identity strength, roles as identity or self-concept | §4 |
| Self-esteem, self-model | Partial | needs/needs.ts esteem | No model of oneself | — |

## 12. Relationships and social life

| Faculty | Status | Where | What's missing | Research |
|---|---|---|---|---|
| Dyadic ties: affection, trust, respect, familiarity, drift | Done | social/social.ts `socialEvent`, `relationshipWith`, `advanceSocial` | One-sided records | proposal §4 |
| Reciprocity (favour ledger) | Done | social/social.ts | — | — |
| Communication: testimony and advice | Done | conversation/conversation.ts `converse` | No turn-taking or persuasion beyond trust | — |
| Gossip and reputation | Done | conversation/ `converse`; social/ `reputation` | — | — |
| Deception | Done | conversation/ (`ToldClaim.deceit`) | Lies only when the host offers a temptation | — |
| Bereavement and grief | Done | social/ `markDeceased`; memory/ `recallByCue`; affect grief | — | — |
| Insiders, outsiders, threat | Done | social/groups.ts `joinGroups`, `meet`, `careFor` | Factions host-owned | §8 |
| Language | Partial | narrate/ templates, `EN_LINES` | No generated language (LLMs kept out of the loop by rule) | — |
| Joint activities | Partial | sim/ `proposeJoint`, `acceptJoint`, `jointSuccessChance` | Older paths one-sided (findings.md) | — |
| Kinship and household | Partial | relationship roles; lifecourse/ `createChild` parents | No household unit | §8 |
| Impressions of others (theory of mind) | Missing | — | Watch L6 | — |
| The other's view of me | Missing | — | social.ts scope | — |
| Attachment | Missing | — | social.ts scope | — |
| Attraction, courtship, marriage | Missing | — | Watch L3 | — |
| A missed promise costs standing with the promisee | Missing | — | findings.md | — |
| Power, coercion, conflict resolution | Missing | — | `command` is a host voice, not a social relation | proposal §4 |

## 13. Lifespan, heredity and development

| Faculty | Status | Where | What's missing | Research |
|---|---|---|---|---|
| Aging body: metabolism, recovery, maximum fitness | Done | lifecourse/ `lifeModifiers` → body/ | — | §7 |
| Maturity of planning and inhibition by age | Done | `lifeModifiers().maturity` → cognition/ (agenda terms up, habit pull down) | — | §7 |
| Life stages | Partial | lifecourse/ `lifeStage` | Nothing gates on stage; infants decide like adults | §7 |
| Developmental curves: reward seeking, speed vs knowledge | Partial | lifecourse/development.ts `developmentForAge` | No consumer | §7 S19 |
| Childhood: dependence, maturation, schooling | Missing | — | A child is an adult with age modifiers | §7, §8 S20 |
| Heredity of temperament | Done | lifecourse/birth.ts `createChild`; sim/ `birth` | — | §7 S18 |
| Upbringing: household values and norms | Partial | lifecourse/birth.ts `ChildSpec.valueTransmission`, `normExposure` | At birth only, not ongoing (watch L2) | §8 |
| Physical and aptitude inheritance | Missing | — | Watch L2 | §7 |
| Death | Done | body/ `die` | — | — |
| Chronic onsets and natural death by age | Partial | lifecourse/health.ts `chronicOnsets`, `mortalityEvent`; sim/ `StepOptions.lifecourse`; longrun `RoutineOptions.lifecourse` | Opt-in; run for 50 years in the routine control (test/longrun.test.ts), not in a lived multi-year community | — |
| Multi-year stepping | Done | longrun.ts `routineDay`, `liveRoutine`; sim/longrun.ts `liveCommunity`; person.ts `skip` | Routine days do not drain needs or decide; the host supplies routines and switches fidelity at midnight | — |
| Partnering as the front end to birth | Missing | — | Watch L3 | — |

## 14. Environment, culture and institutions

| Faculty | Status | Where | What's missing | Research |
|---|---|---|---|---|
| World contract: affordances, outcomes, percepts | Done | types.ts `Affordance`, `Outcome`, `Percept`; sim/ `World` | — | §8 |
| Community driver | Done | sim/ `createCommunity`, `stepCommunity` | — | — |
| Material gain and scarcity | Done | cognition/ material term | Money and inventory host-owned | — |
| Reference worlds | Done | scenarios/ `createVillage`, `createTown` | Fixtures, not models | — |
| Tools and equipment | Partial | skills/ `successChance` `support` | No tool model; one support scalar | proposal §4 |
| Ambient environment: cold, dark, comfort | Missing | — | Watch L4 | §1 |
| Culture as learned, shared practices | Missing | — | Norms come from a host catalog | §8 |
| Norm diffusion, social consensus | Missing | — | — | §8 |
| Institutions and access (facilities, offices) | Missing | — | v0 had facility access (below) | §8 |

Space, travel, economy, factions and job reservation are host-owned by design (framework.md, host protocols); they are not counted.

## 15. Composites the proposal names

| Faculty | Status | Where | What's missing | Research |
|---|---|---|---|---|
| Grief | Done | affect/ grief; social/ `markDeceased`; memory/ `recallByCue` | — | proposal §4 |
| Courage under threat | Partial | affect/affect.ts fear; cognition/ risk term; memory/ `learnOutcome` | No habituation (§5) | — |
| Creativity | Missing | — | — | proposal §4 |
| Humour | Missing | — | — | proposal §4 |
| Dreams | Missing | — | Would need a sleep-specific module | proposal §4 |
| Conscious experience | Excluded | — | Research decision: acknowledged, not generated | proposal §4 |

## Approaches from v0 worth keeping

Mechanisms from the archived v0 code and games that HF does not have. Paths are under `archive/v0/`.

| Mechanism | What it did | Where |
|---|---|---|
| Item-level knowledge | Knowledge held per named item tied to a skill; instruction, practice and retrieval add access at different rates; access decays; taught claims keep their source and can be false | src/development/learning.js (`learn`, `applyReceipt`); docs/sustained-person.md |
| Retrieval threshold | Knowledge is usable only above a host threshold; the actor sees that it knows something, not the content | src/development/learning.js (`retrieveLearning`) |
| Instruction changes method | Being taught a method turns basic practice into guided practice that teaches twice as fast | src/games/three-moments.js (`apply-instruction`); docs/connected-person.md |
| Skill shortens work | Task duration falls in tiers with skill, so practice shows as faster jobs | src/games/camp-current.js; docs/practice-construction-protocol.md |
| Interrupted work keeps practice | Abandoned work keeps the practice and partial progress, loses the yield; tested against loopholes | docs/practice-incentive-results.md; docs/work-progress-results.md |
| Qualifications and roles | Qualification = skill plus minimum level, awarded or revoked by an assessor; roles and opportunities require it; leaving a role keeps the competence; age alone grants no skill | src/lifecourse/adult.js (`recordQualification`, `transitionAdultRole`); docs/developing-person.md |
| Restrictions with accommodation | Tasks declare demands; a restriction blocks a method without creating an attempt; an alternative method has its own cost; restrictions persist until reassessed | src/constraints/functional.js (`assessFunctionalMethod`) |
| Facility access queue | Grants, FIFO queue, finite holds; release or expiry promotes the next entitled request | src/institution/access.js |
| Paid attention | A message's content becomes belief only after a completed reading of enough duration; interrupted reading adds nothing | src/experience/attention.js (`processSelectedMessage`); src/experience/workspace.js |
| Acyclic inference | Authored rules over beliefs give true, false, conflicted or unknown; a conflict blocks downstream rules; support paths stay visible | src/experience/inference.js (`inferBeliefs`) |
| Bounded planner | Breadth-first search (depth 8, 4,096 nodes, one-week horizon); unknown facts satisfy no precondition; a plan is a forecast, replanned on observation; greedy rival kept | src/cognition/planner.js (`plan`, `greedyPlan`) |
| Evidence ledger | Observation time separate from receipt time; forwarded copies add no support; only the origin retracts | src/cognition/beliefs.js; src/experience/episodes.js; docs/experienced-person.md |
| Revision from failure | Failures attributed to the cue and purpose at attempt start; revising a method needs enough failures, a completed review and the person's acceptance | src/adaptation/habits.js; src/adaptive/person.js; docs/adaptive-person.md |
| Guarded relationship context | An observed failure guards that context; unrelated successes don't clear it; repair reopens it only after the other person acknowledges | src/social/relationships.js; docs/developing-person.md |
| Contract book | Obligations proposed, answered, withdrawn, released, fulfilled; withdrawn and breached are distinct; repair does not erase a breach | src/social/contracts.js |
| Signed transfer applied once | Transfer as a signed link per skill pair (negative allowed), credited from direct practice only, never from transferred gains | docs/model-reference.md ("Practice and transfer"); framework-proposal.md §7 |

Learning findings from that work, kept in `research/`: no failure bonus or XP objective, and failure feedback only when the host observed something ([learning-through-work.md](../research/learning-through-work.md), "Recommendation"); report what task, interval and refresher a decay claim covers ([learning-source-followup-2026-09-07.md](../research/learning-source-followup-2026-09-07.md), Q29); a 55-person throwing pilot did not separate exponential from power-law learning curves ([archive/v0/docs/learning-pilot-results.md](../archive/v0/docs/learning-pilot-results.md)). No v0 game had teachers, apprentices or observational learning.
