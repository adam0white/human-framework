# Handoff — Human Framework v1

Updated 2026-10-03. Read [AGENTS.md](AGENTS.md) for direction, done-definition and rules; [docs/framework.md](docs/framework.md) for architecture.

## Done means

`@human/framework` v1 installable + documented + consolidated, and two games live at https://human.adamwhite.work (generic colony sim before/after the framework; a suggestion-vs-will showcase game). User accepts by playing.

## Phase plan

| # | Phase | Status |
|---|---|---|
| 0 | Archive v0 (`archive/v0`, tag `v0.16-final`), TS/Vite/Vitest/Biome workspace, spine types + architecture doc, game-dev early review | done |
| 1 | Core faculties in parallel (core/body/lifecourse, needs/affect, memory/beliefs, skills/habits/social, conscience/agenda), each with tests | done (10d0723) |
| 2 | Cognition + will + narration + `person.ts` composite + `sim/` Community driver + headless reference scenarios | done (10d0723, 222 tests) |
| 3 | Game 1 *Twice at the Well* ([spec](docs/games/colony.md)): framework API gaps, shell + Classic, Human side, playtest, deploy | done, live at /colony/ (5466c8c) |
| 4 | Framework deepening steered by [Game 2 spec](docs/games/voice.md) §7 (multi-voice, abstention/fasting, chronicle, standing advice, cue recall, habit extinction, conversation/gossip/reputation, illness coupling, economy, life-course trajectories, lexicon) + town scenario | done (engine 1.2.0, 451 tests) |
| 4b | Game 1 v2 from the user's playtest ([record](docs/games/colony-playtest-2026-10-03.md)): goals, paused start, unified orders, harder balance, another day | done, live (11c67c5) |
| 5 | Game 2 *The Day You Say Nothing* ([spec](docs/games/voice.md), [build/as shipped](docs/games/voice-build.md)): two build+playtest rounds, engine 1.3.0 | done, live at /voice/ (9ad6fde) |
| 6 | Game 2 round 3, package installable + README/API/examples, final adversarial + game-design review, fix, final deploy | in progress |

## Current position

Both games live at https://human.adamwhite.work (/colony/, /voice/), release 9ad6fde, engine 1.3.0. Phase 6 workflow running: Game 2 round-3 fixes, package v1 installability and docs, final reviews, and the final fix pass (uncommitted at the time of writing: engine 1.4.0, `FRAMEWORK_VERSION` 1.0.0, save/resume with `communityState`, Game 2 round 4 in docs/games/voice-build.md). Then commit, deploy and close.

## Deferred questions for the user (non-blocking)

- Fajr window: the framework ends Fajr at Dhuhr (documented simplification). The common position that Fajr ends at sunrise is not sourced in `research/`; confirm before changing `prayerWindow`.
- Smoking as breaking the fast is a town-scenario engineering assumption, not sourced in `research/`.
- Eid prayer and zakat al-fitr are deferred in Game 2 until their timing is sourced in `research/` (the Eid prayer exists behind an off-by-default flag as a town custom).
