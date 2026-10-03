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
| 4b | Game 1 v2 from the user's playtest ([record](docs/games/colony-playtest-2026-10-03.md)): goals, paused start, unified orders, harder balance, another day | in progress (branch `colony-v2`) |
| 5 | Game 2: inner-voice showcase, deploy | pending |
| 6 | Package docs/README/API reference, adversarial + game-dev review, polish, final deploy, handoff | pending |

## Current position

Phase 4 committed (engine 1.2.0; town scenario `scenarios/town.ts` is the Game 2 world). Game 1 v2 is being built on branch `colony-v2` (worktree `.worktrees/colony-v2`); merge, check, deploy, then Phase 5. Game 1 pins pre-1.2.0 body depletion rates (`COLONY_RATES`). Open framework weaknesses are listed in docs/findings.md (one-sided joint activities, social.judge habituation, 50×30 benchmark ≈5.2 s vs 5 s target). Game 2 content still to author: grief seed, Eid prayer/zakat al-fitr, Halil calling Selin, debt numbers, distinct house places, Eid on day 30 vs 31.

## Deferred questions for the user (non-blocking)

- Fajr window: the framework ends Fajr at Dhuhr (documented simplification). The common position that Fajr ends at sunrise is not sourced in `research/`; confirm before changing `prayerWindow`.
- Smoking as breaking the fast is a town-scenario engineering assumption, not sourced in `research/`.
