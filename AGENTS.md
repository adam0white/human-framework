# Project workflow

- Start a resumed task with [HANDOFF.md](HANDOFF.md) (phase plan and current position), then [the architecture](docs/framework.md).
- **Direction, 2026-10-02 (user-approved):** rebuild as one consolidated framework, Human Framework v1, in TypeScript, with a single actor (`Person`). Showcase it with two games: a generic colony sim shown before and after the framework, and a game built around the player's input being a suggestion the character can override. The user granted full autonomy and asked for a bold, opinionated version over a safe generic one. Use subagents and workflows liberally, and keep a game-design expert reviewer in the loop.
- **Done means:** the `@human/framework` package is installable, documented and consolidated, and both games are live at https://human.adamwhite.work. The user accepts by playing them.
- The v0 layered-candidate codebase is archived under `archive/v0/` (tag `v0.16-final`). It is provenance, not a work queue, and it is not maintained or built.

## Engineering rules

- Stack: TypeScript 7 (strict, `noUncheckedIndexedAccess`), Vite 8, Vitest 5, Biome, React 19 for UI shells, and Canvas 2D for maps. npm workspaces: `packages/human` (framework) and `apps/site` (games and site). Use Node ≥24 with `/opt/homebrew/bin` first on PATH.
- `npm run check` (lint, typecheck, tests) must pass before every commit.
- Keep the actor loop deterministic and independent of LLMs and UI. Person state is plain JSON, and all randomness comes from seeded RNG held in state.
- One owning module per state slice (see docs/framework.md).
- Build first, prove after. A new faculty lands with tests, one headless control scenario, and a short scope paragraph in its module doc comment saying what it covers and what it doesn't. Do not write per-milestone evidence essays or verification JSON. Record negative findings briefly in `docs/findings.md` when they occur.
- Moral and spiritual faculty: Islam-guided (Sunni, Hanafi–Maturidi starting point). Keep revealed sources, interpretation, empirical findings and engineering assumptions distinct, with provenance on norm definitions. Never compute divine acceptance, assign quantities to the ruh, or name the RNG or scheduler after divine attributes. Represent a person's *understanding* of a norm, not a ruling. Do not let agents invent rulings; source them from `research/`.
- **Games keep faith gentle (user, 2026-10-04):** the framework stays Islam-guided, but games do not focus on religion. Prayer, fasting and the like appear as quiet parts of a character's life, never the theme, goal or central mechanic.

## Delivery

- Repository: `adam0white/human-framework` (private). Public review site: https://human.adamwhite.work (Cloudflare Worker static assets; see `wrangler.jsonc`).
- For app changes, the user authorized this workflow (2026-09-07, renewed 2026-10-02): implement and test, commit, push `main`, then run `npm run deploy`. Verify the live site and `/release.json` against the commit. Deploy at phase boundaries.
- Never put credentials in source, logs or build output. Publish only the Vite build output of `apps/site`.
