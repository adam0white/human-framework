# Human Framework handoff

Updated 2026-09-08 after the minute-1,312 Common Ground play report. Start here when resuming. This handoff updates private source documentation and preserves a user save; it does not change game behavior.

## Read first

1. [README](README.md): play links, project aim and source layout.
2. [MVP contract](docs/mvp-contract.md): the deliberately narrow deliverable and remaining graduation checks.
3. [Roadmap](docs/roadmap.md): delivery sequence; [latest player feedback](docs/common-ground-feedback-2026-09-07.md) supplies the next product question.
4. [Portable API](docs/portable-runtime.md): executable host boundary, migration and source-release locks.
5. [Evidence milestone](docs/mvp-evidence-2026-09-07.md) and [review dispositions](docs/reviews/2026-09-07-evidence-review.md): results, counterexamples and review scope.

The long-term project is an Islam-guided, empirically informed human simulation framework, with a Sunni Hanafi–Maturidi starting point. Keep revelation, interpretation, empirical evidence and authored simulation decisions distinct. Preserve agency and the non-LLM runtime. The first kit is body/capacity/practice plus scheduling and persistence; laboratory Full, broader cognition, detailed physiology and a religious evaluator have not become portable components.

## Current code and delivery

| Scope | Version / entry |
|---|---|
| Browser app | 0.5.0; five small games plus the laboratory |
| Laboratory | 0.3.0, `src/core/index.js`; frozen 0.1/0.2 replay kernels remain under `src/legacy` |
| Existing games' Human | 0.1.0, `src/human/index.js` |
| Installed runtime / Human | 0.1.1, `src/runtime/index.js` → `src/human/v0.1.1.js` |
| Integer event clock | 0.1.0, `src/runtime/clock.js` |
| Common Ground | Game 0.1.0, save wrapper 1; still imports historical Human 0.1.0 |
| Shared social candidate | Private experimental source in `src/social/contracts.js`; **not** in package exports or public build |

Human 0.1.1 fixes capacity-object key ordering and self-inconsistent fractional accumulated time. Valid 0.1.0 person snapshots can explicitly migrate through `restorePerson`; invalid history and mixed versions reject. Do not swap the current games' imports or rewrite old saves casually. `scripts/runtime-release-lock.json` pins source bytes, the transitive model dependency and package/component version combinations. Append reviewed versions; preserve released entries.

The public site is [human.adamwhite.work](https://human.adamwhite.work/games/); [Common Ground](https://human.adamwhite.work/commons/) is the newest game. Verified deployed source before this documentation handoff is **`8b503c014a7a7ce845564287d4e7fcb648097047`**, Worker **`9dc7376c-2ed7-4cde-9e9b-c0014a7c0b96`**. Public payload digest: `c6ce3bd568deb78d66da70fccc2e13470fb5d75a334053b280d0856f3a6578e3`. Later documentation commits on main do not imply a new app deployment. Recheck `/release.json` when resuming rather than treating this dated record as permanent live state.

Source is private at `adam0white/human-framework`. Main contains the integrated work. Ten completed `codex/*` lane branches are also pushed, preserving original review and preregistration commit IDs that differ from their cherry-picked main commits. They are historical provenance, not ten unfinished tasks. Start new work from current main. Local worktrees are retained; `commons-clock` has one untracked `src/runtime/clock.js` dependency copy identical to main's frozen clock. It contains no unique pending change and has deliberately not been deleted. All other retained lane worktrees were clean at handoff inspection.

## What is established

[Handoff verification](artifacts/handoff-2026-09-08/verification.json) records a fresh 280-test run, valid local document links, pushed original branch heads, archived-save reproduction and unchanged public payload bytes.

- Latest integrated verification: **280 tests**, Node 26.8.1; minimum Node 22.0.0 passes 30 compatibility/clock/package/transplant checks. The independent installed maintenance/watch consumer passes 15 internal checks on each binary, with repository reads denied.
- The maintenance/watch example runs two people, an approaching event, partial repairs, owned parts, refusal and mid-action save/resume through the installed package. It is headless, independently authored by an agent familiar with the project, and not blind programmer onboarding.
- Common Ground's frozen controller study retains 36 development and 12 reserved trials. All reach the first milestone by 1,440 minutes, but shorter checkpoints and later production expose tradeoffs. Its project-focused rival is not uniformly better and is not smaller in source than the existing chooser. It compares controllers, not Human versus a different body model.
- The social candidate matches direct rules in two miniature hosts across 16,000 attempted commands and costs more serialized state. Keep it experimental. Neither these hosts nor protocol records establish general social cognition.
- Two separate Claude Fable processes reviewed a frozen design/API snapshot; Astra ultra authors cross-reviewed later implementations. Their scopes and corrected findings are in the review record. Do not attribute later code execution to the external reviewers.

## Latest user evidence and next work

The player reports that the games are becoming interesting, but the late game is not yet. The supplied Common Ground save reaches the first milestone at minute 217, continues to 1,312 and holds 12 caches. Only 16 recent messages remain; do not invent a complete action history or a reason for the feedback.

| Priority | Bounded next deliverable | What would count against it |
|---|---|---|
| Product | Compare one meaningful post-milestone choice/pacing change against today's continuing worksite. Inspect repeated cache requests, surplus use and recovery legibility before picking a cause. | More elapsed time or content with no new understandable tradeoff; player prefers the current loop. |
| Model value | Preregister prescribed-action and matched-retest comparisons against a credible smaller stamina/practice-counter model. Keep host inputs and information matched; record authoring exceptions separately. | The simpler model supplies equally useful outcomes and explanations with less implementation. |
| Integration | Test a thin clock/attempt coordination helper in two hosts, preserving world-owned resources, consent, interruptions and receipts. | It imports game rules, duplicates body state or adds more exceptional paths than it removes. |
| Later application | Make the repair/lookout/arrival slice playable once its choices warrant a UI. | It adds another demonstration without advancing play or reuse. Full defense waves/campaigns remain later. |

Keep Solo Repair socially isolated. Do not make Full win by weakening the baseline's capacity rules or penalizing compulsory recovery arbitrarily. Broader learning/attention/memory/affect, physiology, interpretation and macro-scale research remain tracked in the [coverage ledger](docs/coverage-ledger.md) and [decision register](research/decision-status.md). Five-person explanation testing, measured human authoring benefit and physical-device timing remain open; the framework is not declared graduated on the strength of automated tests alone.

## Safe reproduction and release

Use Node 22 or later. On this machine `/opt/homebrew/bin/node` is 26.8.1; a login shell can resolve an older NVM executable, so check `node --version`. `npm ci` installs pinned deployment tooling; the runtime has no third-party dependency.

```sh
npm test
npm run package:runtime
node artifacts/user-runs/2026-09-07/analyze-common-ground.mjs
node scripts/commons-comparison.js run --partition development --out /tmp/commons-development-repeat.json
node scripts/commons-comparison.js run --partition reserved --freeze artifacts/commons-comparison/freeze.json --out /tmp/commons-reserved-repeat.json
node scripts/social-contract-probe.js /tmp/social-repeat.json
```

Write new experiment output to a new path. Do not overwrite retained benchmark artifacts or the committed freeze manifest. [Independent consumer commands](docs/independent-consumer.md) install the actual tarball; [package documentation](docs/portable-runtime.md) specifies its limited exports.

Follow [AGENTS.md](AGENTS.md) and the [deployment workflow](docs/deployment.md) for app changes: review, test, push main, deploy, then verify the exact public payload and browser behavior. The strict `verify:live` command requires current source, pushed main and built release to agree; it will intentionally fail after a documentation-only main advance until a matching app release is deployed. Do not misreport that expected identity mismatch as a gameplay regression, or redeploy solely to update a historical verification record. Read the live manifest and retain the recorded deployed commit separately for documentation handoffs.

`scripts/build.js` publishes only explicit pages and asset directories. Research, supplied saves, examples, experimental modules, tests, package archives and deployment configuration stay private. The latest user file and analysis live under `artifacts/user-runs/2026-09-07`; original bytes and earlier provenance are preserved. No external reviewer needs the private player export. Historical release/spec/review documents retain their original dates and counts; current delivery decisions come from this handoff, the contract and roadmap.
