# HF (Human Framework)

[![CI](https://github.com/adam0white/human-framework/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/adam0white/human-framework/actions/workflows/ci.yml)

HF is a deterministic, explainable model of a simulated person, written in TypeScript (`@adam0white/human-framework`). A person has a body, needs, emotions, memory, beliefs, habits, relationships, values, a conscience and a will, and optional faculties for learning, aging, marriage, upbringing and death over decades. At each decision they weigh many urges, including suggestions from outside voices such as a player, and choose an action. Decision records expose scored terms and template narration, and a person may refuse a suggestion.

## Status

- **HF 3.2.0** is published ([GitHub release](https://github.com/adam0white/human-framework/releases/tag/v3.2.0), engine 3.2.0; [release receipts](docs/releases.md)). Read the [v3 migration guide](packages/human/README.md#migrating-to-v3) before upgrading from 2.x. The widened v3 increment continues through later 3.x work in the [roadmap](docs/roadmap.md); a planned or reviewed change is not a published release.
- **Three in-site example games**, live at [human.adamwhite.work](https://human.adamwhite.work); more games built on HF are listed on [/games/](https://human.adamwhite.work/games/):
  - [Twice at the Well](https://human.adamwhite.work/colony/): a colony sim played side by side without and with HF.
  - [The Day You Say Nothing](https://human.adamwhite.work/voice/): you are a voice in one man's head; he may refuse you.
  - [The Night Watch](https://human.adamwhite.work/watch/): a village's night watch over generations, endless.
- The central site was verified on 2026-10-26 at **HF 3.2.0 / engine 3.2.0**, signed source `00dcdad`, with library 3.2.0 and `dirty:false`. See the [site receipt](docs/releases.md#central-site-32-delivery-2026-10-26) and live [release.json](https://human.adamwhite.work/release.json). The bounded opt-ins and repairs are described in [CHANGELOG](CHANGELOG.md). SDK client 0.4.11 / kit 0.5.12 remain immutable artifacts, including their original manifests; external games retain their actual 3.0 pins until separately upgraded.

## Quick start

The package requires TypeScript 7 or later and Node 24 or later. The source is public on GitHub (code MIT, docs CC BY 4.0). Install from [npm](https://www.npmjs.com/package/@adam0white/human-framework):

```sh
npm install @adam0white/human-framework
```

Each [GitHub release](https://github.com/adam0white/human-framework/releases) also has the tarball attached, which installs by URL.

Or build one from a checkout:

```sh
npm pack -w packages/human   # writes adam0white-human-framework-<version>.tgz
npm install ./adam0white-human-framework-<version>.tgz
```

```ts
import {
  createCommunity,
  createPerson,
  createVillage,
  predict,
  stepCommunity,
  villagerSpec,
} from '@adam0white/human-framework';

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

## Norms and faith

A person's conscience weighs norms from a catalog the host supplies. The bundled catalog (`DEFAULT_NORMS`) is Islam-guided, and a host can replace it with its own. HF models a person's _understanding_ of a norm, held with some conviction, not a ruling, and it never computes divine acceptance. The sources behind each norm and the decisions taken where schools differ are recorded in [research/](research), notably [norm-sources.md](research/norm-sources.md) and [decisions.md](research/decisions.md). In the games, prayer and fasting appear as quiet parts of a character's life, not as the theme.

## Docs

- [docs/framework.md](docs/framework.md): architecture, modules and the state each owns, the utility terms, host protocols, determinism and saves.
- [docs/api.md](docs/api.md): every export (generated: `npm run api-doc`).
- [docs/faculty-inventory.md](docs/faculty-inventory.md): every human faculty HF aims to model, marked Done, Partial, Missing or Excluded against the code.
- [docs/roadmap.md](docs/roadmap.md): deferred framework work, missing faculties and the games' deferred lists, each with a target.
- [docs/findings.md](docs/findings.md): results that cut against expectations.
- [docs/lab/README.md](docs/lab/README.md): current lab references and preserved experiments, reviews and records.
- [docs/games/](docs/games): one design doc per game ([colony](docs/games/colony.md), [voice](docs/games/voice.md), [watch](docs/games/watch.md)) and the owner's playtest notes, verbatim.
- [research/](research): source records behind the norms and formulas, and [decisions on contested religious points](research/decisions.md).
- [CHANGELOG.md](CHANGELOG.md), [HANDOFF.md](HANDOFF.md) (current state), [docs/releases.md](docs/releases.md) (release receipts), [docs/history.md](docs/history.md), [AGENTS.md](AGENTS.md) (contributor rules).

## Repository

| Path               | What                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `packages/human`   | the framework (`@adam0white/human-framework`): `src/`, `test/`, `examples/`                                             |
| `apps/site`        | the games and the home page (React 19 shells, Canvas 2D maps, Vite; deployed as a Cloudflare Worker with static assets) |
| `scripts`          | release, deploy, API doc and bench scripts                                                                              |
| `docs`, `research` | documentation and sources                                                                                               |
| `archive`          | the earlier v0 codebase (tag `v0.16-final`) and v0-era research; provenance, not built or maintained                    |

## Commands

For repository development, use the shared lab Node 26.12.0 with `/opt/homebrew/bin` first on `PATH`.

- `npm run check`: lint (Biome), typecheck and tests, with no wall-clock assertions. `npm run check:lane` runs the checks for the files you changed; run it before every commit.
- `npm run bench`: the timing budgets (`*.timing.ts`), one file at a time, printing each measurement; run it alone on a quiet machine (`BENCH_SCALE=3` multiplies every budget). `npm run bench:hyperfine` times the headless 20-person, 30-day village run with [hyperfine](https://github.com/sharkdp/hyperfine).
- `npm run build`: the package and the site. `npm run dev`: the site locally.
- `npm run deploy`: uses pinned Wrangler 4.152.0 and `wrangler.jsonc` (the [cf beta trial](docs/roadmap.md#cf-cli-migration-trial--2026-10-26) is blocked on Build Output equivalence); deploys the site build to https://human.adamwhite.work (see AGENTS.md, Delivery); verify the live `/release.json` against the commit.
- `npm run release`: from a clean checkout of pushed `origin/main`, checks versions and the changelog, runs `npm run check`, tags `vX.Y.Z` and creates the GitHub release with the tarball (`-- --dry-run` stops after packing). Versions follow [the version policy](packages/human/README.md#versions).

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs the pieces of check and build in parallel (lint, typecheck and build in one job, the tests in shards) as the gate on pushes and pull requests to `main`; its `ci` job is the single check that passes when all of them pass. [bench.yml](.github/workflows/bench.yml) runs the bench at 3× budgets and hyperfine as information, skipped for prose-only changes. CI uses the Node version in `.node-version`.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md). Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

- **Code** (everything outside the documentation directories, including `packages/human`, `apps/site`, `scripts` and the archived v0 code): [MIT](LICENSE).
- **Documentation and research** (`docs/`, `research/`, and the archived prose in `archive/research/` and `archive/v0/docs/`): [CC BY 4.0](docs/LICENSE). Quotations from third-party sources keep their own terms.
- **Third-party data**: the archived learning-pilot dataset under `archive/v0/artifacts/learning-pilot/data-access/` mirrors [OSF project xzm5c](https://osf.io/xzm5c/), which its authors released under [CC0 1.0](archive/v0/artifacts/learning-pilot/data-access/LICENSE-OSF-CC0.txt); credit Zhang, McDougle and Leonard (2025).

### Repository development

Use the shared Node 26.12.0 and pnpm 12.14.0. Run `pnpm install --frozen-lockfile` to install this repository. The default store (`~/Library/pnpm/store` on macOS) shares dependency files across worktrees. `npm run check`, `npm run build`, and the other script commands still work. Published-package consumers can keep their preferred installer.
