# Roadmap

The single list of what is next for HF and its example games, 2026-10-05. Goals 1 and 2 are done and accepted ([HANDOFF](../HANDOFF.md)); the next goal is not set, and this page is the menu it will be chosen from. Nothing here is committed work.

**Targets.** Each item has one:
- **2.x**: behaviour-neutral (no replay, fixture or hash changes); fits any minor release after 2.1.0.
- **2.2**: needs an `ENGINE_VERSION` bump because it moves replays or changes decisions; batch these into one engine release, re-record the Games 1–2 playtest fixtures and bump the Game 3 scenario.
- **3.0**: breaking API change (removal or rename).
- **unscheduled**: worth doing, no release chosen.

The H2 summary marked many of these "deferred, 2.1". 2.1.0 (released 2026-10-05) is a behaviour-neutral polish release, so items that move replays are relabelled 2.2 here; behaviour-neutral leftovers are 2.x. This page is the current target.

Item ids (P, Q, S) are the rows of the [H2 review summary](reviews/2026-10-04-h2-summary.md); R2 ids (V, S, 1b, 3a, B1.3, …) are rows of the [R2 review summary](reviews/2026-10-04-summary.md). Review this page when the next goal is set.

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
| Q36 (rest) | `sanitizeFamily` accepts non-finite pregnancy fields (`conceivedAt`, `dueAt`, `seed`). A save the engine wrote is unaffected. | 2.x |
| Q52 (rest) | `PersonSpec.habits` and `PersonSpec.expectations` (hosts write these slices by hand today). Additive. | 2.x |
| Q50 | Two HF gaps Game 3 works around by writing framework slices directly: an additive trust gesture and host-caused tiredness. Add them, then move the game ([watch.md §12](games/watch.md#12-after-graduation-deferred-features) T2). | 2.x (additive) |
| Split long functions | `finish`, `evaluate` and `stepCommunity` are each long enough to hide bugs; split them without changing results (hash tests pin this). | 2.x |
| Test dedup | Tests repeat setup that `test/support.ts` now provides; fold the copies into it. | 2.x |
| Unused `_now` parameters | `repent(p, id, _now)` and `recordRepair(p, victimId, _now)` in `conscience/` take a time they never read. Make it optional in 2.x; remove it in 3.0. | 3.0 |
| Deprecated forms | Remove the 2.0 options-object forms of `glimpse`, `glimpseOf`, `hear`, `conceive` and `retell`, and `TRAIT_NAMES` (CHANGELOG [Unreleased], Deprecated). | 3.0 |
| R2 3c | `expit` is an alias of `sigmoid`; deprecate, then drop. | 3.0 |
| Q5 | Mutable defaults objects are public; `Object.freeze` would break hosts that tune by assignment. Decide a tuning API first. | 3.0 |
| Q13 | Composite and primitive names do not follow one suffix rule (`glimpseOf`, `acquaintWith`). Rename, with 2.x aliases. | 3.0 |
| Q16 | Two shapes for routine sources. Unify, deprecating the other in 2.x. | 3.0 |
| Q15 | `skip` → `skipTo` was rejected in H2 (41 call sites in the games, clear in context). Reconsider only if 3.0 batches renames. | 3.0 or drop |
| Q38 | `retell` and `foldEpisode` match stories differently, by design for now: a told gist stays apart from one's own until one's own experience outweighs it. Revisit with the next gist pass. | unscheduled |
| R2 3a, H2 Q3 | Export hygiene: knip found exports used only in their own file; most were un-exported in 2.0. Re-run knip with `ignoreExportsUsedInFile`. | unscheduled |
| R2 6f | `Object.keys(x) as NeedId[]` casts (8 in src); a `keysOf` helper in `core/`. | unscheduled |
| R2 V11 | `stepCommunity` allocates per event. Invisible at 200 people; revisit if a host runs more than ~500. | unscheduled |
| R2 1c, 7c | CI does not install the packed tarball and run an example, and does not check that docs/api.md is current (`api-doc --check`). | unscheduled |
| TS 5.x | Consumers on TypeScript 5.x are untested (the repo builds with TypeScript 7). | unscheduled |
| Community and world migration | `migrate` upgrades person snapshots only; community state (`communityState`) and world state have no migration steps. None has been needed (their shape has not changed; world state is the host's), but the first shape change needs one. | unscheduled |
| Bench evidence | Bench timings on a quiet machine; 50-year save sizes on seeds other than 1; per-person growth is still about 0.5 KB a year at year 50, almost all the yearbook (P10). | unscheduled |

## 3. Faculties not yet modelled

The full list, with module names and research references, is [faculty-inventory.md](faculty-inventory.md). Counts (2026-10-05, against engine 2.0.0): 142 faculties, 79 Done, 34 Partial, 23 Missing, 6 Excluded. All Missing and Partial rows are **unscheduled** unless named in §1–2 above; none blocks a current game. A row the next goal needs moves into §1 or §2 with a target.

**Missing (23).**
- Body and perception: temperature, bladder and specific nutrients; attention that costs time.
- Memory and reasoning: interference, false memory and reconsolidation; inference between beliefs; multi-step planning; present bias and temporal discounting; motivated reasoning; metacognition; imagination and counterfactuals.
- Affect and commitments: fear habituation; implementation intentions; life purpose, vocation and life narrative.
- Learning: negative transfer between skills; qualifications, roles and credentials.
- Social: the other's view of me (impressions run one way); a missed promise costing standing with the promisee; power, coercion and conflict resolution.
- Culture: culture as learned practices; norm diffusion and consensus; institutions and access.
- Composites: creativity, humour, dreams.

**Partial (34)**, grouped by what is missing:
- Opt-in long-run faculties that work but are off by default: experience over years, lasting gists, trait and value change over life, chronic onsets and natural death.
- Life course and family: life stages, developmental curves, childhood, physical and aptitude inheritance (no passion), kinship and household, attachment, moral development, sexuality and pregnancy (pregnancy only; no complications).
- Mind: working memory, semantic knowledge, autobiography, learning from told experience (host-driven `retell` only), reflection that revises methods, skills aging (disuse only, no old-age decline).
- Decision: calibrated daytime utilities (§1, flat daytime utilities, 2.2), scarcity (uncited).
- Affect and self: body cost of stress, expression and concealment (no emotional contagion), curiosity, status and power, within-person variability, identity through group membership, self-esteem and self-model.
- Social: judging others' acts (no habituation), language (templates only; LLMs stay out of the loop by rule), joint activities (§1, one-sided), courage under threat, tools and equipment, sensory impairment.

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
