# Roadmap

The single list of open deferred work and targets for HF and its example games, updated 2026-10-23. Finished items are removed; release history is in [history.md](history.md) and [CHANGELOG.md](../CHANGELOG.md). The owner authorized the projects follow-ups and narration/social batch on 2026-10-23; [AGENTS.md](../AGENTS.md) defines done. The separate cast increment continues. Other items remain proposals.

**Targets.** Each item has one:
- **2.x**: behaviour-neutral (no replay, fixture or hash changes); fits any minor release after 2.1.0.
- **2.2**: needs an `ENGINE_VERSION` bump because it moves replays or changes decisions; batch these into one engine release, re-record the Games 1–2 playtest fixtures and bump the Game 3 scenario.
- **3.0**: breaking API change (removal or rename).
- **unscheduled**: worth doing, no release chosen.

Items that move replays carry 2.2 or a later engine number; behaviour-neutral items are 2.x. Item ids (P, Q, S) are rows of the [H2 review summary](reviews/2026-10-04-h2-summary.md); R2 ids (V, S, 1b, 3a, B1.3, …) are rows of the [R2 review summary](reviews/2026-10-04-summary.md).

**HF roadmap (2026-10-20).** The vision, three horizons and the recommended next increment are in [hf-roadmap-2026-10-20.md](hf-roadmap-2026-10-20.md), built from a blind consultation and the games' requests. This page stays the authoritative list of deferred items and targets; the roadmap orders them.

## Horizon 3: first probes and remaining targets (2026-10-25)

The [eight first probes](hf-roadmap-2026-10-20.md#horizon-3-long-bets) ran without an H3 release. Narrow GO does not establish emergence, human enjoyment or predictive validity. The H3 director owns these remaining items; v3 owns the serialized release and owner review remains2026-11-03.

| Item | Remaining work | Target |
|---|---|---|
| H3 lockstep | Review/export the optional `canonicalTickInputs` slice in the serialized queue; keep caller-owned payloads, sender-priority convention and same-runtime limits explicit. No multiplayer service. | proposed3.0, review2026-11-03 |
| H3 speech | First opt-in contingent host recipe and focused abuse controls are built; decide host adoption. Full nine-act grammar and general bargaining remain a new design, not this result. | adoption review2026-11-03; broader design2026-11-15 |
| H3 starter | First copied people-centered template is built. Lab/playtester wiring, import validation and deployment scaffolding are listed gaps, not a full engine. | gap review2026-11-03 |
| H3 traditions | Released2.22 conditional methods satisfy controlled transfer/revision; no duplicate faculty. Spontaneous teaching, chosen observation and adult practice need a new probe. | design2026-11-15 |
| H3 fork | Full candidate capture and RNG at decision boundary, then varied intervention contexts; same-time divergence and truncated traces fail the first gate. |2026-11-15|
| H3 cast | Exact Valley→Good Hands route conflicts with cohorts/allocations. Keep existing supported continuity; no identity or era override. Review any future explicit mapping separately. | owner mapping review2026-11-03 |
| H3 ant farm | Original60s budget fails; separate200-person year completes with one persistent strong triangle and no paired baseline. Preregister feasible paired years and validated classifiers. |2026-11-15|
| H3 prediction | Score frozen HF-derived forecasts only on the future eligible20-run cohort with known labels; keep unknowns/PENDING and report misses. No recruitment or new rounds before readiness acceptance. | availability/labels check2026-11-03 |

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
| P11 | Relationships and impressions fill to their caps with the dead (bounded, ~35 KB a person). Prune ties to the dead after a horizon. | 2.2 |
| R2 1b | "Thirsty — the well, then." is game wording in the framework lexicon; changing it moves both games' fixture hashes. | 2.2 |
| Flat daytime utilities | Game 2's Halil naps about three times a day because daytime utilities are flat; a nap gate broke other behaviour and was reverted. Needs a utility recalibration pass ([findings](findings.md)). | 2.2 |
| Joint activities and judgement | Joint activities are one-sided in the driver (`partnersOf` checks only that the partner is alive); `social.judge` has no habituation outside conversation. | unscheduled |
| Eid prayer missed cost | Skipping the Eid prayer carries the generic missed-commitment cost. Whether a recommended prayer should cost less needs a decision in research/decisions.md. | unscheduled (decision first) |

## 2. Framework: API and code quality

| Item | What | Target |
|---|---|---|
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
| R2 V11 | `stepCommunity` allocates per event. Invisible at 200 people; revisit if a host runs more than ~500. | unscheduled |
| TS 5.x | Consumers on TypeScript 5.x are untested (the repo builds with TypeScript 7). | unscheduled |
| Community and world migration | `migrate` upgrades person snapshots only; community state (`communityState`) and world state have no migration steps. None has been needed (their shape has not changed; world state is the host's), but the first shape change needs one. | community: after inner life, review 2027-01-15 (§3b, "Memory bound and declared fidelity"); world: a host recipe, not HF |
| Bench evidence | Bench timings on a quiet machine; 50-year save sizes on seeds other than 1; per-person growth is still about 0.5 KB a year at year 50, almost all the yearbook (P10). | unscheduled |

## 3. Faculties not yet modelled

The full list, with module names and research references, is [faculty-inventory.md](faculty-inventory.md). Counts (2026-10-05, against engine 2.0.0): 142 faculties, 79 Done, 34 Partial, 23 Missing, 6 Excluded. All Missing and Partial rows are **unscheduled** unless named in §1–2 above; none blocks a current game. A row the next goal needs moves into §1 or §2 with a target.

**Missing (23).**
- Body and perception: temperature and specific nutrients; attention that costs time. Bladder, involuntary doze and explicit quantity observation are implemented as opt-ins in the 2.21 release; release receipts are recorded in [releases.md](releases.md).
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
- Affect and self: body cost of stress, expression and concealment (no emotional contagion), curiosity and projects (released in 2.11.0 and 2.14.0; no open-ended invention), status and power, within-person variability, identity through group membership, self-esteem and self-model.
- Social: judging others' acts (no habituation), language (templates only; LLMs stay out of the loop by rule), joint activities (§1, one-sided), courage under threat, tools and equipment, sensory impairment.

## 3b. Next slices (2026-10-18, updated 2026-10-23)

The projects follow-ups and narration/social batch are delivered in HF 2.17.0; their controls and opt-in contracts are in [the architecture](framework.md). Island outcomes are recorded in [the experiment](lab/experiments/island-2026-10-20.md). The remaining targets below use dates rather than minor numbers because the cast releases used 2.15 and 2.16.

Owner direction (2026-10-18, [owner-directions](owner-directions-2026-10-18.md)): HF should become a one-stop shop for future games; the no-quantification rule stands (nothing about the ruh is computed), and science directions and capabilities HF lacks are in scope. Ordered by value to games. "Engine 2.5" means the next engine bump; each item ships opt-in with tests, a headless control and exact legacy continuation. Review this list by 2026-11-01.

| Item | What | Target |
|---|---|---|
| Future bodily state in prospection | Left (2.5.0 covers offers that declare `followedBy`, [framework.md](framework.md#bodily-forecast-250)): forecast a received successor's span; apply host surroundings (fasting perception done in 2.6.0) | Next bodily slice; review 2026-11-15 |
| Muhasaba (reconciliation §7) | Left (2.7.0 covers commitments, `review/`): revise a method or a prompting response in review | After the bodily slice; review 2026-12-15 (proposed order, [hf-roadmap](hf-roadmap-2026-10-20.md)) |
| Waiting opportunity cost | Planning already discounts later completion by a goal's half-life, but waiting does not price the value of other foregone acts. Chains and project adoption are released; this is the remaining planning question. | Unscheduled; review 2026-11-15 |
| Sabr and shukr as appraisal styles | Reappraisal and gratitude in `affect/`, attentional and regulatory effects only | After the bodily slice; review 2026-12-15 (proposed order, [hf-roadmap](hf-roadmap-2026-10-20.md)) |
| The other's view of me | Believed regard done in 2.10.0. Left: a missed promise costs standing with the promisee | review 2026-11-15 |
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
| Glance legal-action policy contract | Gate/oracle and one forced-move displayed-board control are recorded. Both current policies read the screen, but inherited holds are not UI actions. No replacement is justified; any next control must separate legal hold/no-action choices from thresholds. No new player round. | Review 2026-11-15 |
| A voice answering the person's request | `noteRequestAnswered(p, voiceId, { granted, importance, at })`, the mirror of `noteVoicePromise` (Pass 5); needs a sourced effect size first | after a sourced effect size; review 2026-11-15 (proposed order, [hf-roadmap](hf-roadmap-2026-10-20.md)) |
| A duty held by a group | Shared commitment met by any member (Pass 6) | unscheduled, review 2026-11-15 |
| Method learning follow-ups | Inferred cue extraction, multi-step procedure synthesis and calibrated real-world learning rates for `methods/` ([learning-probe.md](learning-probe.md)) | unscheduled |
| Engagement and boredom on a seconds scale | The playtester's fast `engagement` store, if a second user needs it inside HF | unscheduled, review 2026-11-15 |
| A separate review label | `reviewLabel` on commitments, if noun-phrase labels prove too limiting (Voices 3; documented instead) | unscheduled, review 2026-11-15 |
| Valley requests (trust from a voice's acts, goods between households, a memory bound) | Triaged 2026-10-25. `adoptVoiceTrust` supports Valley's present host convention; a generic attended-act evidence API needs sourced effect size and evidence/repetition semantics first. A chosen give act and recipient percept recipe is in [host-kit.md](host-kit.md); inventories stay host-owned. Memory bounds remain after inner life. | Voice-act evidence review 2026-11-15; memory review 2027-01-15 |
| A thousand lives (bench), remaining evidence | Bounded one-day 100/1,000/coarse10,000 measurements and harness delivered; coarse fidelity differs and decision starvation is unavailable without an explicit opportunity predicate. Remaining: quiet-machine repetitions, longer spans and a justified starvation measure; no tuning from noisy timings. | 2026-11-15 |
| Memory bound and declared fidelity | A memory bound in `Retention` (Valley 6); what coarse stepping preserves exactly; community-state migration steps (this supersedes the community half of "Community and world migration" in §2; world state stays the host's, with a documented recipe) | After inner life; review 2027-01-15 (proposed order, [hf-roadmap](hf-roadmap-2026-10-20.md)) |

**2.21 release, delivered.** Optional doze, quantity observation and bladder close the three Glance/Rope bodily framework requests; game adoption remains separate. Watch's Q50 helper adoption uses the separately pinned 2.20 library. Host gift and shared-work recipes are documented in [host-kit.md](host-kit.md). A reset-world prospect identity recipe now records retained peak versus current progress and stale-abandonment limits in the host guide; island task carry remains unresolved. Published-package and site receipts are in [releases.md](releases.md).

| Item | Remaining decision | Target |
|---|---|---|
| Prospect identity across reset worlds | Specify when a rebuilt world keeps a project prospect identity and when it starts a new one; isolate that choice before interpreting island task carry. No reset-aware retuning is authorized. | Host recipe review 2026-11-15 |
| Repeated-offer-set cost (Warren 3) | Profile current decision work; cache only immutable host inputs with explicit invalidation. Do not cache a whole decision without an output-identical continuation and measured benefit. | Review 2026-11-15 |
| Spatial reach (Warren 5) | Host filters visibility/reach through `World.perceptsFor` and offers. Shared API waits for two compatible host representations. | Review 2026-11-15 |
| Mental effort and slow fatigue (SW-1) | Physical depletion does not yet include low-effort focused work. Scope an optional focus contribution in a later body slice. | Review 2026-11-15 |
| Going alongside a voice (SW-2) | Decide a separate opt-in voice field and trust weighting; preserve Person `alongside` semantics. | Review 2026-11-15 |
| Cost for an assented urge | Clarify whether the request means an internal prompting or a voice's insistence, and name the missing observable consequence. | Owner meaning review 2026-11-15 |
| Phrase fade rate (Voices 5) | `practiceHalfLifeDays` already exists in HF. Murmur must choose explicitly between continuous decay and its nightly reinforcement-gated rule; they are not exactly equivalent. | Host adoption review 2026-11-15 |

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

**Lab deferred (2026-10-20).** F-192: client0.4.8/kit0.5.9 are released and the central three games deploy them. Native Firefox local navigation recovery and GPC/DNT defaults/explicit-on controls pass. External adoption and a production cross-origin navigation storage receipt remain, target2026-10-27. Preserve the single recording switch and privacy gates; the owner’s settings and historical note cause remain unknown. See [findings](findings.md) and [adoption](lab/navigation-journal-adoption-2026-10-25.md).

**Lab clarity deferred (2026-10-20).** (a) Each game works its ranked clarity fixes (ledger F-206..F-217) in its own polish round; target 2026-11-03, owned by each game's agent. (b) Adopt `@adam0white/lab-kit` 0.1.0 first in The Valley (glossary, English dates, intro card), then in games that copy the tokens and stamp script; target 2026-11-03. (c) Kit additions the survey found duplicated but not built: service-worker template, speed bar and wake lock, title/continue scaffold; target 2026-11-03, only if two games adopt the kit first. (d) Done 2026-10-23: rewrote lessons L5, L7, L14 and L15 to match the revised checklist, as the Codex review proposed ([review](lab/reviews/design-language-codex-2026-10-20.md)); regenerated the matching curated lesson entries. (e) Done within inspected coverage 2026-10-23: the four canonical adapters expose screen-derived `goal`/`next` and visible disabled controls where available. Missing older UI readers, newer unsupported Pass phases, Warren browser-local raid warnings and frozen example adapters remain unmeasured; see [adapter coverage](../packages/playtester/README.md#clarity-rubric).
