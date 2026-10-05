# Contributing

HF is maintained by one person. Issues (bugs, questions, ideas) are welcome. For a pull request, please open
an issue first so we can agree on the change before you spend time on it; unsolicited PRs may be closed.
Report security problems privately, as described in [SECURITY.md](SECURITY.md).

## Setup

- Node ≥ 24 (the exact version is in `.nvmrc`); npm workspaces: `packages/human` (the framework) and
  `apps/site` (the games and the home page).
- TypeScript 7 (strict, `noUncheckedIndexedAccess`), Vite, Vitest, Biome, React 19 for UI shells and Canvas 2D
  for maps.
- `npm ci`, then `npm run dev` for the site.

## Rules

- `npm run check` (lint, typecheck, tests) must pass before every commit. CI runs the same pieces plus the
  build; its `ci` check gates `main`.
- **Determinism.** The simulation is deterministic and independent of LLMs and UI. Person state is plain JSON,
  and all randomness comes from the seeded RNG held in state. Do not use `Math.random`, `Date`,
  `performance.now` or other wall-clock or ambient inputs in simulation code; time comes from the host's
  simulated clock.
- **Framework and games stay separate.** No game-specific code in `packages/human`; no framework logic in the
  games under `apps/site`. A game needs something new from the framework → it becomes a general framework
  feature with its own tests.
- One module owns each slice of person state; see [docs/framework.md](docs/framework.md).
- A new faculty lands with tests, a headless scenario, and a scope paragraph in its module doc comment saying
  what it covers and what it doesn't.
- Norms with religious content are sourced from `research/`, never invented; see
  [research/decisions.md](research/decisions.md).

[AGENTS.md](AGENTS.md) holds the full project rules.

## License

By contributing, you agree that your contributions are licensed under the repository's terms: MIT for code,
CC BY 4.0 for `docs/` and `research/` (see the [README](README.md#license)).
