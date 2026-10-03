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
| 3 | Game 1 *Twice at the Well* ([spec](docs/games/colony.md)): framework API gaps, shell + Classic, Human side, playtest, deploy | in progress (workflow game1-twice-at-the-well) |
| 4 | Framework deepening: conversation/gossip/reputation, institutions/economy, illness/aging over years, childhood development, worship practice, long-horizon purposes, perf at 50+ people | pending |
| 5 | Game 2: inner-voice showcase, deploy | pending |
| 6 | Package docs/README/API reference, adversarial + game-dev review, polish, final deploy, handoff | pending |

## Current position

Phase 3. Framework v1 core committed and pushed. Game 1 workflow running (framework gaps ∥ game shell → Human side → playtest → fix). Then: review its output, commit, deploy, verify live.

Design decisions pending into framework: obligatory-prayer omission veto under insist (decided: insist cannot override an obligatory duty in its closing window for high-conviction holders; non-insisted gets deferred). Commit `91912bf` was made unsigned while the 1Password agent was locked.

## Deferred questions for the user (non-blocking)

(none yet)
