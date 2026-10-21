# Roadmap

The single list of open deferred work and targets for HF and its example games, updated 2026-10-20. Finished items are removed; the ones removed on 2026-10-20 are listed in [history.md](history.md#roadmap-items-done-moved-2026-10-20). The current owner-approved increment, *Projects and persistence*, was released as 2.14.0 and awaits the owner's review; [AGENTS.md](../AGENTS.md) defines its scope. Curiosity, planning and *Why not* were released as 2.11.0 to 2.13.0. Other items on this page remain proposals.

**Targets.** Each item has one:
- **2.x**: behaviour-neutral (no replay, fixture or hash changes); fits any minor release after 2.1.0.
- **2.2**: needs an `ENGINE_VERSION` bump because it moves replays or changes decisions; batch these into one engine release, re-record the Games 1–2 playtest fixtures and bump the Game 3 scenario.
- **3.0**: breaking API change (removal or rename).
- **unscheduled**: worth doing, no release chosen.

Items that move replays carry 2.2 or a later engine number; behaviour-neutral items are 2.x. Item ids (P, Q, S) are rows of the [H2 review summary](reviews/2026-10-04-h2-summary.md); R2 ids (V, S, 1b, 3a, B1.3, …) are rows of the [R2 review summary](reviews/2026-10-04-summary.md).

**HF roadmap (2026-10-20).** The vision, three horizons and the recommended next increment are in [hf-roadmap-2026-10-20.md](hf-roadmap-2026-10-20.md), built from a blind consultation and the games' requests. This page stays the authoritative list of deferred items and targets; the roadmap orders them.

## 1. Framework: engine changes (2.2)

These change what a run does, so each needs the engine bump and a recorded reason.

| Item | What | Target |
|---|---|---|
| P3 | Per-minute catch-up ticks everyone every minute when a host steps by the minute (Game 3 nights). Add an opt-in `StepOptions.catchUp`, audit stale reads in hosts that read state between events, then let games opt in. | 2.2 |
| P5 | `wavering`-style hosts run a full `predict` per watcher per minute; an output-identical memo depends on P3. | 2.2 (with P3) |
| P6, R2 V10 | Memory decays every episode per segment (13–15% of time under per-minute stepping). Lazy decay changes the float path. Re-measure after P3 first. | 2.2 (with P3, if still worth it) |
| Q26 | Decisions read `lifeModifiers`, ticks read `segmentModifiers`; decisions for pregnant or cold people would change. | 2.2 |
| Q28 | `tellDeath` can widow without `markDeceased`. | 2.2 |
| Q29 | Deaths that happen inside a catch-up `tick` are never told (Game 3 tells its own deaths, so it is unaffected today). | 2.2 |
| Q30 | `liveCommunity` raises only children with a parent tie; count `guardian` as a caregiver. | 2.2 |
| Q31, Q32 | `raise` has a discontinuity at zero warmth, and scope texts disagree on the values handover age (18 or 25). Decide both in one upbringing pass. | 2.2 |
| Q33 | `marry-without-guardian` fires only on refusal. This needs a decision recorded in [research/decisions.md](../research/decisions.md) first; agents must not invent it. | 2.2 (after the decision) |
| Q35 | Learning by watching skips inherited aptitude. | 2.2 |
| P11 | Relationships and impressions fill to their caps with the dead (bounded, ~35 KB a person). Prune ties to the dead after a horizon. | 2.2 |
| R2 1b | "Thirsty — the well, then." is game wording in the framework lexicon; changing it moves both games' fixture hashes. | 2.2 |
| Flat daytime utilities | Game 2's Halil naps about three times a day because daytime utilities are flat; a nap gate broke other behaviour and was reverted. Needs a utility recalibration pass ([findings](findings.md)). | 2.2 |
| Joint activities and judgement | Joint activities are one-sided in the driver (`partnersOf` checks only that the partner is alive); `social.judge` has no habituation outside conversation. | unscheduled |
| Eid prayer missed cost | Skipping the Eid prayer carries the generic missed-commitment cost. Whether a recommended prayer should cost less needs a decision in research/decisions.md. | unscheduled (decision first) |

## 2. Framework: API and code quality

| Item | What | Target |
|---|---|---|
| Q36 (rest), M11 | `sanitizeFamily` accepts non-finite pregnancy fields (`conceivedAt`, `dueAt`, `seed`). A save the engine wrote is unaffected. | 2.x, by 2026-11-01 |
| Q52 (rest) | `PersonSpec.habits` and `PersonSpec.expectations` (hosts write these slices by hand today). Additive. | 2.x |
| Q50 | Two HF gaps Game 3 works around by writing framework slices directly: an additive trust gesture and host-caused tiredness. Add them, then move the game ([watch.md §12](games/watch.md#12-after-graduation-deferred-features) T2). | 2.x (additive) |
| Test dedup | Tests repeat setup that `test/support.ts` now provides; fold the copies into it. | 2.x |
| Unused `_now` parameters | `repent(p, id, _now)` and `recordRepair(p, victimId, _now)` in `conscience/` take a time they never read. Retain optional time arguments in 2.x. | optional 2.9.1, removed 3.0 |
| Deprecated forms | Remove the 2.0 options-object forms of `glimpse`, `glimpseOf`, `hear`, `conceive` and `retell`, and `TRAIT_NAMES` (CHANGELOG [Unreleased], Deprecated). | 3.0 |
| R2 3c | `expit` is an alias of `sigmoid`; retain the deprecated alias in 2.x. | deprecated 2.9.1, removed 3.0 |
| Q5 | Mutable defaults objects are public; `Object.freeze` would break hosts that tune by assignment. Decide a tuning API first. | 3.0 |
| Q13 | Composite and primitive names do not follow one suffix rule (`glimpseOf`, `acquaintWith`). Rename, with 2.x aliases. | 3.0 |
| Q16 | Two shapes for routine sources. Unify, deprecating the other in 2.x. | 3.0 |
| Q15 | `skip` → `skipTo` was rejected in H2 (41 call sites in the games, clear in context). Reconsider only if 3.0 batches renames. | 3.0 or drop |
| Q38 | `retell` and `foldEpisode` match stories differently, by design for now: a told gist stays apart from one's own until one's own experience outweighs it. Revisit with the next gist pass. | unscheduled |
| R2 3a, H2 Q3 | Export hygiene: knip found exports used only in their own file; most were un-exported in 2.0. Re-run knip with `ignoreExportsUsedInFile`. | unscheduled |
| R2 6f, M9 | `Object.keys(x) as NeedId[]` casts (8 in src); a `keysOf` helper in `core/`. Preserve saved key order. | 2.x, by 2026-11-01 |
| R2 V11 | `stepCommunity` allocates per event. Invisible at 200 people; revisit if a host runs more than ~500. | unscheduled |
| TS 5.x | Consumers on TypeScript 5.x are untested (the repo builds with TypeScript 7). | unscheduled |
| Community and world migration | `migrate` upgrades person snapshots only; community state (`communityState`) and world state have no migration steps. None has been needed (their shape has not changed; world state is the host's), but the first shape change needs one. | community: engine 2.18 (§3b, "Memory bound and declared fidelity"); world: a host recipe, not HF |
| Bench evidence | Bench timings on a quiet machine; 50-year save sizes on seeds other than 1; per-person growth is still about 0.5 KB a year at year 50, almost all the yearbook (P10). | unscheduled |

## 3. Faculties not yet modelled

The full list, with module names and research references, is [faculty-inventory.md](faculty-inventory.md). Counts (2026-10-05, against engine 2.0.0): 142 faculties, 79 Done, 34 Partial, 23 Missing, 6 Excluded. All Missing and Partial rows are **unscheduled** unless named in §1–2 above; none blocks a current game. A row the next goal needs moves into §1 or §2 with a target.

**Missing (23).**
- Body and perception: temperature, bladder and specific nutrients; attention that costs time.
- Memory and reasoning (bounded multi-step planning and present bias done in 2.12.0): interference, false memory and reconsolidation; inference between beliefs; motivated reasoning; metacognition; imagination and counterfactuals.
- Affect and commitments: fear habituation; implementation intentions; life purpose, vocation and life narrative.
- Learning: negative transfer between skills; qualifications, roles and credentials.
- Social: a missed promise costing standing with the promisee (believed regard landed in 2.10.0); power, coercion and conflict resolution.
- Culture: culture as learned practices; norm diffusion and consensus; institutions and access.
- Composites: creativity, humour, dreams.

**Partial (34)**, grouped by what is missing:
- Opt-in long-run faculties that work but are off by default: experience over years, lasting gists, trait and value change over life, chronic onsets and natural death.
- Life course and family: life stages, developmental curves, childhood, physical and aptitude inheritance (no passion), kinship and household, attachment, moral development, sexuality and pregnancy (pregnancy only; no complications).
- Mind: working memory, semantic knowledge, autobiography, learning from told experience (host-driven `retell` only), reflection that revises methods, skills aging (disuse only, no old-age decline).
- Decision: calibrated daytime utilities (§1, flat daytime utilities, 2.2), scarcity (uncited).
- Affect and self: body cost of stress, expression and concealment (no emotional contagion), curiosity (done in 2.11.0; no project adoption yet), status and power, within-person variability, identity through group membership, self-esteem and self-model.
- Social: judging others' acts (no habituation), language (templates only; LLMs stay out of the loop by rule), joint activities (§1, one-sided), courage under threat, tools and equipment, sensory impairment.

## 3b. Next slices (2026-10-18, updated 2026-10-20)

Owner direction (2026-10-18, [owner-directions](owner-directions-2026-10-18.md)): HF should become a one-stop shop for future games; the no-quantification rule stands (nothing about the ruh is computed), and science directions and capabilities HF lacks are in scope. Ordered by value to games. "Engine 2.5" means the next engine bump; each item ships opt-in with tests, a headless control and exact legacy continuation. Review this list by 2026-11-01.

| Item | What | Target |
|---|---|---|
| Curiosity and play | People with met needs still act: exploring, playing and making things in free time. The island pilot (2026-10-20) found HF people idle once needs are met (owner, 2026-10-20: "Add those faculties") | Done in 2.11.0. Project adoption done in 2.14.0 (row below) |
| Future bodily state in prospection | Left (2.5.0 covers offers that declare `followedBy`, [framework.md](framework.md#bodily-forecast-250)): forecast a received successor's span; apply host surroundings (fasting perception done in 2.6.0) | Engine 2.8 |
| Muhasaba (reconciliation §7) | Left (2.7.0 covers commitments, `review/`): revise a method or a prompting response in review | Engine 2.17 (proposed order, [hf-roadmap](hf-roadmap-2026-10-20.md)) |
| Multi-step planning (bounded) | Chains of two or three received or known routes with waiting cost; the most requested missing faculty. The island pilot (2026-10-20) adds a case: received consequences give one step of pull, but a goal reached by walk, pick, carry and place needs a longer chain | Done in 2.12.0 (depth 2 to 5, known and received claims). Left: waiting has no opportunity cost (only the goal's half-life), and chains value only active temporal goals, so free time gets nothing (island rerun) | Waiting cost: unscheduled, review 2026-11-15 |
| Sabr and shukr as appraisal styles | Reappraisal and gratitude in `affect/`, attentional and regulatory effects only | Engine 2.17 (proposed order, [hf-roadmap](hf-roadmap-2026-10-20.md)) |
| Present bias and temporal discounting | Person-level discount style over the 2.3.0 temporal goals | Done in 2.12.0 as `enablePlanning({ presentBias })` on later steps only |
| The other's view of me | Believed regard done in 2.10.0. Left: a missed promise costs standing with the promisee | review 2026-11-15 |
| Qalb lens | Read-only narration lens over attention, conviction, mood and trust (no scalar) | 2.x (behaviour-neutral) |
| Promptings follow-ups | Chronicle lines in the reading's vocabulary; prompts against open abstention windows (they veto today and carry no term); upbringing setting the reading | 2.x / engine 2.5 |
| Held fitra and purpose | Life purpose and vocation as a held self-understanding (reconciliation §7) | unscheduled, review 2026-11-15 |
| Culture as learned practices | Norm diffusion and consensus between people | unscheduled, review 2026-11-15 |
| Received support (non-directive words) | A person hears care or a question from another source (a friend, an inner voice) that directs no action; today `converse` needs two Persons and carries testimony or advice, so Voice's care lines are scene continuations with no effect on him (lab ledger F-285, docs/games/voice.md 2026-10-20b) | review 2026-11-15 |

**Game requests and playtesters (triage in [game-requests-2026-10-18.md](game-requests-2026-10-18.md)).**

| Item | What | Target |
|---|---|---|
| Publish the playtester | Three games now have adapters, which meets the earlier "second game" trigger. Decide whether to publish `packages/playtester` as its own npm package | Decide by 2026-11-15 |
| Session-scale affect for the playtester | Game events enter HF's life-scale joy and distress (hours), so a long session of mixed nights saturates both; the 2026-10-19 calibration weighs a 5-minute window in the session instead (docs/findings.md). Try a session-side affect store or propose an HF appraisal channel for fiction; check on The Night Watch and the toys | 2026-11-15 |
| Comparisons that can tell builds apart | At 3 seeds a persona, build-to-build changes stay within one session; add more seeds or a noise estimate per line | 2026-11-15 |
| The Glance adapter's gate policy | Base personas lose every full run; check whether the inherited gate rule or the game causes it | 2026-11-01 |
| Narration variety | Per-person variants for deferral and assent sentences (Rope rank 4, Glance 4); a plain third-person `promptingLine` (Pass 2); chronicle verbs that avoid inflecting nouns (Pass 3). One batch, since each moves narration fixtures | Engine 2.15 (was 2.14; moved 2026-10-20 for Projects and persistence), target 2026-11-30 (proposed order, [hf-roadmap](hf-roadmap-2026-10-20.md)) |
| Why a suggestion failed | `SuggestionResolution.decidedBy` (inertia or the separating term, with margin) so lines can say "not straight off my break" (Pass 1) | Done in 2.13.0 |
| A firm self-rule | Opt-in `Commitment.firm` on a self abstention: `refused/willNot`, reason `rule:<label>` (Pass 4) | Done in 2.13.0 |
| A voice answering the person's request | `noteRequestAnswered(p, voiceId, { granted, importance, at })`, the mirror of `noteVoicePromise` (Pass 5); needs a sourced effect size first | after a sourced effect size; review 2026-11-15 (proposed order, [hf-roadmap](hf-roadmap-2026-10-20.md)) |
| Involuntary sleep onset | Opt-in doze hazard from true sleepiness, posture and stimulation, ended by a salient percept (Glance 2) | Engine 2.16 (proposed order, [hf-roadmap](hf-roadmap-2026-10-20.md)) |
| Reading a quantity | `estimateQuantity(p, { truth, difficulty })` (Glance asked for `estimate`, already exported for impressions of others) returning value and confidence from body state (Glance 3) | Engine 2.16 (proposed order, [hf-roadmap](hf-roadmap-2026-10-20.md)) |
| Bladder | A real voiding need, so hosts stop advertising pain `relief` for the toilet (Rope Kestrel) | Engine 2.16 (proposed order, [hf-roadmap](hf-roadmap-2026-10-20.md)) |
| A duty held by a group | Shared commitment met by any member (Pass 6) | unscheduled, review 2026-11-15 |
| Projects from what is seen (island pilot) | Rerun on 2.12.0 done 2026-10-20 ([experiment](lab/experiments/island-2026-10-20.md#rerun-with-engine-212-hf4)): with curiosity and planning the person explores more but adopts no free-time goal and builds nothing; with a task, planning lifts it to a median of one cube of ten. Two gaps: no project adopted from what is seen, and no commitment to a valued route once started. No game has asked for either yet | Done in 2.14.0 (projects and persistence; island rerun: small free-time piles, task median 1.5 of 10, [experiment](lab/experiments/island-2026-10-20.md#rerun-with-engine-214-hf5)). Net progress credit and the decaying pull (shown releasing in `projects-control.ts`) done in 2.14.1; the island rerun on 2.14.1 still shows 82% replacements, because choice still values taking a piece off one's own pile. Left: tell or learn that an offer takes from one's own project (a host-declared `Affordance` link, or learning it from the drop the person perceives after its own act), so choice stops valuing the undo; target engine 2.15, review 2026-11-15. Also left: carry a held project over into a host task. Deferred 2026-10-21: on 2.14.0, 6 of 10 island seeds had the project stale-abandoned at the task's first step and the task goal formed a fresh, stronger pursuit at once, so carrying pursuit momentum would gain nothing; a useful carry needs a host API for a goal that declares it is about a prospect and inherits net credit. Target engine 2.15, review 2026-11-15 |
| Method learning follow-ups | Inferred cue extraction, multi-step procedure synthesis and calibrated real-world learning rates for `methods/` ([learning-probe.md](learning-probe.md)) | unscheduled |
| Engagement and boredom on a seconds scale | The playtester's fast `engagement` store, if a second user needs it inside HF | unscheduled, review 2026-11-15 |
| Neighbours: residents repair once | Not reproduced; may be the town running out of repairs | Review 2026-11-01 |
| A separate review label | `reviewLabel` on commitments, if noun-phrase labels prove too limiting (Voices 3; documented instead) | unscheduled, review 2026-11-15 |
| Valley requests (trust from a voice's acts, goods between households, second-person recall, `tellDeath` past the listener, `fingerprint`, a memory bound) | Filed 2026-10-19 against 2.8.0. Valley 4 and 5 done in 2.9.1; second-person recall joins the 2.15 narration batch; the memory bound is engine 2.18; Valley 1 and 2 still to triage | Triage 1 and 2 by 2026-11-01 |
| A thousand lives (bench) | 100, 1,000 and coarse 10,000 people: ms per person-day, bytes per person, starved decisions; measurement only | 2026-11-15 |
| Memory bound and declared fidelity | A memory bound in `Retention` (Valley 6); what coarse stepping preserves exactly; community-state migration steps (this supersedes the community half of "Community and world migration" in §2; world state stays the host's, with a documented recipe) | Engine 2.18 (proposed order, [hf-roadmap](hf-roadmap-2026-10-20.md)) |
| Social and narration asks after 2.10 | Host reputation trait table (Stairwell 3); an opt-in `converse` mode for word getting back to the subject (Stairwell 5, partly served by `noteKnownBy`); a per-call relay threshold (Stairwell 6); a `converse` phrasing callback (Hearsay 3), varied cause-naming lapse lines (N2) and work narration that reads `material` as money (Warren 6), all in the narration batch | Engine 2.15 with the narration batch (the 2.11 label was stale; renumbered 2026-10-20), target 2026-11-30 |
| Behaviour-neutral social helpers | A composite observed reputation correction (Hearsay 2) | 2.x helper, by 2026-11-15 |
| Still untriaged | Perceived unfinished shared work (Neighbours 4a); repeated-offer-set cost (Warren 3); a spatial reach helper (Warren 5); from [whats-left](lab/whats-left-2026-10-19.md): mental effort filling the slow fatigue store (SW-1), `alongside` accepting a voice weighted by trust (SW-2), a cost for an urge he agrees to, and a phrase fade-rate API | Triage by 2026-11-15 |

## 4. Example games

Each game doc ends with its deferred list; the games are graduated and none is scheduled.

- *Twice at the Well* (Game 1): [colony.md, Deferred](games/colony.md#deferred).
- *The Day You Say Nothing* (Game 2): [voice.md, Deferred](games/voice.md#deferred).
- *The Night Watch* (Game 3): [watch.md §12](games/watch.md#12-after-graduation-deferred-features), targets T1 (first pass if resumed), T2 (needs an HF release first: Q50, larger cast), T3 (polish). It carries the H2 game rows P8, P10, S7, Q49, Q50, Q51.

Site-wide, from the R2 reviews (all unscheduled):
- R2 V5: the framework is bundled once per worker; serve the hindsight job from the colony worker.
- R2 V6: worker download waits for the entry JS; a small Vite plugin for `<link rel=prefetch>`.
- R2 S2, S4: main-thread long tasks and Game 2's 12-day skip on a low-end phone; take a Chrome trace at 4× CPU throttle.
- R2 4b–4d: minute-of-day arithmetic, the HH:MM formatter and `capitalize` are repeated across the games; one shared helper module.
- R2 B1.3: pull-to-refresh is blocked, but Games 1–2 lose the run if the page is reloaded; save the run to `sessionStorage` on hide (Game 3 already autosaves).
- H2 S5, S6: before Game 3 imports pages or replays files from playtesters, cap decompression, validate, and route people through `restore`.
- Real devices: a real Galaxy S26 (wake lock, fullscreen, safe areas), iOS, the file download, and Game 1 in landscape with large text are unverified.

**Ranked and frozen (2026-10-20).** The games are ranked on [/games/](https://human.adamwhite.work/games/) with reasons in [lab/ranking-2026-10-20.md](lab/ranking-2026-10-20.md). Small Works, Neighbours and The Rope are frozen experiments: playable, listed, no further work, their open ledger rows marked frozen. The owner can unfreeze any of them. Re-rank after the next owner verdicts or by 2026-11-03.

**Lab deferred (2026-10-20).** F-192: test regular-event delivery in a working isolated Firefox, with GPC off and on, including navigation and a cross-origin request to the lab endpoint. Playwright launches failed here; client/Worker privacy controls pass ([findings](findings.md)). Confirm the owner's setting only with read access or a voluntary report. Target 2026-10-27. Preserve GPC/DNT suppression.

**Lab clarity deferred (2026-10-20).** (a) Each game works its ranked clarity fixes (ledger F-206..F-217) in its own polish round; target 2026-11-03, owned by each game's agent. (b) Adopt `@adam0white/lab-kit` 0.1.0 first in The Valley (glossary, English dates, intro card), then in games that copy the tokens and stamp script; target 2026-11-03. (c) Kit additions the survey found duplicated but not built: service-worker template, speed bar and wake lock, title/continue scaffold; target 2026-11-03, only if two games adopt the kit first. (d) Rewrite lessons L5, L7, L14 and L15 to match the revised checklist, as the Codex review proposed ([review](lab/reviews/design-language-codex-2026-10-20.md)); target 2026-10-27. (e) Give the existing adapters `goal`, `next` and `disabled` from what each screen shows, so the clarity rubric measures more than timing; target 2026-10-27.
