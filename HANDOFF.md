# Handoff — HF (Human Framework)

Updated 2026-10-05. Read [AGENTS.md](AGENTS.md) for rules, [docs/framework.md](docs/framework.md) for the architecture, and [docs/roadmap.md](docs/roadmap.md) for what could come next.

## Current state

- **No goal is set.** Goals 1 and 2 are done and accepted. The owner chooses the next goal; the [roadmap](docs/roadmap.md) is the menu, each item with a target (2.1, 2.2, 3.0 or unscheduled).
- **Released:** HF 2.1.0 (GitHub release v2.1.0 at a66700a, Latest, tarball attached; engine 2.0.0, behaviour identical to 2.0.0). Earlier: v2.0.0 (d48d8f6), v1.2.0, v1.1.0, v1.0.0. Live site: https://human.adamwhite.work, framework 2.1.0 at a66700a, with a framework homepage and Games 1–3. CI green (run 37321995064). Repo description and topics set 2026-10-05; v2.0.0 release-note links repointed to the v2.0.0 tag after the docs consolidation.
- **Unreleased on `main`:** the package rename to `@adam0white/human-framework` and the MIT / CC BY 4.0 license (CHANGELOG [Unreleased]). Deprecated option forms go in 3.0 (roadmap).
- **Games:** graduated with HF. Each game doc ends with its deferred list ([colony](docs/games/colony.md#deferred), [voice](docs/games/voice.md#deferred), [watch §12](docs/games/watch.md#12-after-graduation-deferred-features), review watch §12 by 2026-11-05).
- **Docs** were consolidated on 2026-10-05: per-dimension review files, `hf-status.md` and `rimworld-gap.md` were folded into the roadmap, framework.md and the two review summaries, then deleted; v0-era research planning docs moved to `archive/research/`.

## Going public

The repository is private until the owner makes it public (owner's decisions, 2026-10-05: MIT for code, CC BY 4.0 for `docs/` and `research/`, history kept, archived OSF data published). Everything else is prepared. The owner runs:

```sh
gh repo edit adam0white/human-framework --visibility public --accept-visibility-change-consequences
bash scripts/after-public.sh
```

The script refuses to run unless the repository is public, then enables secret scanning with push protection and private vulnerability reporting, creates or updates the `main` ruleset from [.github/rulesets/main.json](.github/rulesets/main.json) (no deletion, no force-push, required check `ci`; repository admins bypass), sets the Actions settings (SHA-pinned actions, approval for fork PRs from all outside contributors) and turns on the weekly CodeQL run (repository variable `CODEQL_SCHEDULE`). It is safe to re-run. CodeQL stays on the workflow; do not enable CodeQL default setup. After that, an agent deploys the homepage (`npm run deploy`), whose Status line now links the GitHub repository.

Applied live while private (2026-10-05): Actions `sha_pinning_required=true` (every workflow already pins actions by SHA). Dependabot alerts were already on. GitHub refused the rest while private on the free plan: rulesets (403), private vulnerability reporting (404), fork-PR approval (422), secret scanning (422).

## Goals

- **Goal 1, HF 1.0: done, accepted 2026-10-04** ("Congrats team on HF v1.0"). Package installable, documented and consolidated; Game 1 *Twice at the Well* and Game 2 *The Day You Say Nothing* live. Tag `v1.0.0` (456c794).
- **Goal 2, HF 2.0 and *The Night Watch*: done, accepted 2026-10-05** after the owner played Game 3 ([playtest](docs/games/watch-playtest-2026-10-05.md)). Done meant: HF 2.0 released on GitHub, closing the five blocking RimWorld-colony gaps (direct control, mental breaks, injury depth, insiders and outsiders, save migration; engine 1.6.0) and the long-run faculties L1–L6 (experience over years, upbringing and heredity, courtship and marriage, environment, multi-year stepping, impressions of others; engine 1.8.0–2.0.0), each tested with a headless control scenario; CI running check and bench; performance, quality and security reviews done and acted on ([R2](docs/reviews/2026-10-04-summary.md), [H2](docs/reviews/2026-10-04-h2-summary.md)); *The Night Watch* live at /watch/ with endless play and a playtest export; Games 1–2 upgraded to HF 2.0 (their recorded playtests replay unchanged).

Phase history, Goal 2 (2026-10-04 to 10-05): R0 releases and CI (v1.1.0, v1.2.0); R1 faith decisions in code (engine 1.7.0); R2 reviews and phone work; R3 faculty inventory; G3-0 to G3-4 Game 3 from a plain tower defence to endless play over generations; H2 the 2.0.0 release; then the owner's playtest, its fixes, the 2.1 polish and this docs consolidation. Details are in the git log, CHANGELOG and each game doc's history.

## Where the tests for the Goal 2 faculties are

All in `packages/human/test/`: command.test.ts (direct control), crisis.test.ts (breaks), injury.test.ts, groups.test.ts (insiders, outsiders, threats), migrate.test.ts (save migration), experience.test.ts and longlife.test.ts (L1), family.test.ts (L2), partnering.test.ts (L3), environment.test.ts (L4), longrun.test.ts, longlife.test.ts and retention.test.ts (L5; timing in longrun.timing.ts), impressions.test.ts (L6). Each file has its headless control scenario.

## Unverified

A real Galaxy S26 (wake lock, fullscreen, safe areas) and iOS; the playtest file download on a device; bench timings on a quiet machine; 50-year save sizes on seeds other than 1; TypeScript 5.x consumers. These are listed in the roadmap.
