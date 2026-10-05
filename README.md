# HF (Human Framework)

[![CI](https://github.com/adam0white/human-framework/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/adam0white/human-framework/actions/workflows/ci.yml)

HF is a deterministic, explainable model of a simulated person, written in TypeScript (`@adam0white/human-framework`). A person has a body, needs, emotions, memory, beliefs, habits, relationships, values, a conscience and a will, and lives for decades: they learn, age, marry, raise children and die. At each decision they weigh many urges, including suggestions from outside voices such as a player, and choose an action. Every choice can be explained, and a person may refuse a suggestion.

## Status

- **HF 2.1.0** is released ([GitHub release](https://github.com/adam0white/human-framework/releases/tag/v2.1.0), engine 2.0.0; [CHANGELOG](CHANGELOG.md)). HF 2.x is released and graduated: Goal 1 (HF 1.0) and Goal 2 (HF 2.0 and Game 3) are done and accepted by the owner. What is next is in the [roadmap](docs/roadmap.md).
- **Three example games**, live at [human.adamwhite.work](https://human.adamwhite.work):
  - [Twice at the Well](https://human.adamwhite.work/colony/): a colony sim played side by side without and with HF.
  - [The Day You Say Nothing](https://human.adamwhite.work/voice/): you are a voice in one man's head; he may refuse you.
  - [The Night Watch](https://human.adamwhite.work/watch/): a village's night watch over generations, endless.

## Quick start

The package is private and not on a registry. Download `human-framework-2.1.0.tgz` from the [v2.1.0 release](https://github.com/adam0white/human-framework/releases/tag/v2.1.0) (or build it with `npm pack -w packages/human`) and install it:

```sh
npm install ./human-framework-2.1.0.tgz
```

```ts
import { createCommunity, createPerson, createVillage, predict, stepCommunity, villagerSpec } from '@adam0white/human-framework';

const ids = ['ada', 'bora'];
const people = ids.map((id, i) => createPerson(villagerSpec(id, id, 1 + i, { now: 6 * 60, others: ids })));
const world = createVillage(people, { seed: 7 }); // a bundled example World
const community = createCommunity(people);
const ada = community.people[0]!;

const ask = { voiceId: 'player', action: 'chat', strength: 0.6 };
console.log(predict(ada, world.affordancesFor(ada), ask).verdict); // pure: no state change
stepCommunity(community, world, 6 * 60 + 24 * 60, { suggestions: { ada: ask } });
console.log(ada.trace.at(-1)?.narration); // why she did what she did
```

The [package README](packages/human/README.md) covers the host contract (your `World` offers actions, HF chooses, your world resolves outcomes), saves, versions and runnable [examples](packages/human/examples).

## Docs

- [docs/framework.md](docs/framework.md): architecture, modules and the state each owns, the utility terms, host protocols, determinism and saves.
- [docs/api.md](docs/api.md): every export (generated: `npm run api-doc`).
- [docs/faculty-inventory.md](docs/faculty-inventory.md): every human faculty HF aims to model, marked Done, Partial, Missing or Excluded against the code.
- [docs/roadmap.md](docs/roadmap.md): deferred framework work, missing faculties and the games' deferred lists, each with a target.
- [docs/findings.md](docs/findings.md): results that cut against expectations.
- [docs/games/](docs/games): one design doc per game ([colony](docs/games/colony.md), [voice](docs/games/voice.md), [watch](docs/games/watch.md)) and the owner's playtest notes, verbatim.
- [research/](research): source records behind the norms and formulas, and [decisions on contested religious points](research/decisions.md).
- [CHANGELOG.md](CHANGELOG.md), [HANDOFF.md](HANDOFF.md) (current state), [AGENTS.md](AGENTS.md) (contributor rules).

## Repository

| Path | What |
|---|---|
| `packages/human` | the framework (`@adam0white/human-framework`): `src/`, `test/`, `examples/` |
| `apps/site` | the games and the home page (React 19 shells, Canvas 2D maps, Vite; deployed as a Cloudflare Worker with static assets) |
| `scripts` | release, deploy, API doc and bench scripts |
| `docs`, `research` | documentation and sources |
| `archive` | the earlier v0 codebase (tag `v0.16-final`) and v0-era research; provenance, not built or maintained |

## Commands

Node ≥ 24 with `/opt/homebrew/bin` first on `PATH`.

- `npm run check`: lint (Biome), typecheck and tests. It has no wall-clock assertions and must pass before every commit.
- `npm run bench`: the timing budgets (`*.timing.ts`), one file at a time, printing each measurement; run it alone on a quiet machine (`BENCH_SCALE=3` multiplies every budget). `npm run bench:hyperfine` times the headless 20-person, 30-day village run with [hyperfine](https://github.com/sharkdp/hyperfine).
- `npm run build`: the package and the site. `npm run dev`: the site locally.
- `npm run deploy`: deploys the site build to https://human.adamwhite.work (see AGENTS.md, Delivery); verify the live `/release.json` against the commit.
- `npm run release`: on a clean, pushed `main`, checks versions and the changelog, runs `npm run check`, tags `vX.Y.Z` and creates the GitHub release with the tarball (`-- --dry-run` stops after packing). Versions follow [the version policy](packages/human/README.md#versions).

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs the pieces of check and build in parallel (lint, typecheck and build in one job, the tests in shards) as the gate on pushes and pull requests to `main`; its `ci` job is the single check that passes when all of them pass. [bench.yml](.github/workflows/bench.yml) runs the bench at 3× budgets and hyperfine as information, skipped for prose-only changes. CI uses the Node version in `.nvmrc`.
