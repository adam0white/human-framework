# Human Framework

Human Framework v1 is a deterministic, explainable model of a simulated person written in TypeScript. A person has a body, needs, emotions, memory, beliefs, habits, relationships, values and a will. They weigh many urges, including outside suggestions, and choose an action. Every choice can be explained, and the person may refuse a suggestion.

- **Live games:** [human.adamwhite.work](https://human.adamwhite.work)
  - [Twice at the Well](https://human.adamwhite.work/colony/): a colony sim played before and after the framework.
  - [The Day You Say Nothing](https://human.adamwhite.work/voice/): your input is a suggestion, and the character can override it.
- **Package:** [`packages/human`](packages/human) (`@human/framework` 1.0.0). See its [README](packages/human/README.md) and [examples](packages/human/examples).
- **Docs:** [architecture](docs/framework.md), [API reference](docs/api.md) (regenerate with `npm run api-doc`), [findings](docs/findings.md), [game design notes](docs/games).
- **Site:** the games are in [`apps/site`](apps/site) (React and Canvas, built with Vite and deployed as a Cloudflare Worker).
- **Workflow:** `npm run check` runs lint, typecheck and tests. Contributor rules are in [AGENTS.md](AGENTS.md), and current status is in [HANDOFF.md](HANDOFF.md).
- **Provenance:** the earlier v0 layered-candidate codebase is archived under [`archive/v0/`](archive/v0) (tag `v0.16-final`). It is not built or maintained.
