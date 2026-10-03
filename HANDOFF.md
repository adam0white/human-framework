# Handoff — Human Framework v1

Updated 2026-10-02. Read [AGENTS.md](AGENTS.md) for direction, done-definition and rules; [docs/framework.md](docs/framework.md) for architecture.

## Done means

`@human/framework` v1 installable + documented + consolidated, and two games live at https://human.adamwhite.work (generic colony sim before/after the framework; a suggestion-vs-will showcase game). User accepts by playing.

## Phase plan

| # | Phase | Status |
|---|---|---|
| 0 | Archive v0 (`archive/v0`, tag `v0.16-final`), TS/Vite/Vitest/Biome workspace, spine types + architecture doc, game-dev early review | done |
| 1 | Core faculties in parallel (core/body/lifecourse, needs/affect, memory/beliefs, skills/habits/social, conscience/agenda), each with tests | done (10d0723) |
| 2 | Cognition + will + narration + `person.ts` composite + `sim/` Community driver + headless reference scenarios | done (10d0723, 222 tests) |
| 3 | Game 1 *Twice at the Well* ([spec](docs/games/colony.md)): framework API gaps, shell + Classic, Human side, playtest, deploy | done, live at /colony/ (5466c8c) |
| 4 | Framework deepening steered by [Game 2 spec](docs/games/voice.md) §7 (multi-voice, abstention/fasting, chronicle, standing advice, cue recall, habit extinction, conversation/gossip/reputation, illness coupling, economy, life-course trajectories, lexicon) | in progress |
| 5 | Game 2: inner-voice showcase, deploy | pending |
| 6 | Package docs/README/API reference, adversarial + game-dev review, polish, final deploy, handoff | pending |

## Current position

Phase 4. Game 1 live (https://human.adamwhite.work/colony/). Framework at engine 1.1.0, 292 tests. Findings in docs/findings.md. Next: Phase 4 lanes workflow, then Game 2 build.

## Deferred questions for the user (non-blocking)

(none yet)
