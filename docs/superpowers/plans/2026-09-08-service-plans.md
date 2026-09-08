# Shared clinic plans milestone

Started 2026-09-08 from private main `2822179`, with app 0.8 verified live at `afe95c7`. The Service Day implementation/comparison/reviews are complete. This is new authorized work under the active hourly continuation, not a replay of those lanes.

## Product and model decision

Build one separate playable Service Day variation with a single explicit clinic agreement and one pending revision. Preserve `src/games/service.js`, its public route and save format, all existing games, frozen Human/runtime/model/clock and release locks byte-for-byte. The new host has its own declared version and save identity. It may reuse source structure, but no frozen dependency may be edited to smuggle in new policy behavior.

Start from `docs/service-plan-proposal.md` and the executed competent timed-request control. A co-located discussion costs two active minutes for each consenting actor; no recovery credit, compulsory interruption, free information or instant acceptance. Invitation consent and consent to terms are separate. Old terms remain active while a revision is pending or refused; ownership, actual work receipts and the clinic receiving slot stay host facts. A promise is neither truth nor fulfillment. A keeper can fail/withdraw their own promised contribution without erasing Deniz's independent clinic obligation. Resolve exact withdrawal semantics in the core design before UI/experiment implementation.

The ordinary player view should explain a concrete promise, the recipient's answer, its deadline, what is actually complete and which fallback remains possible. Keep researcher views and general limitations collapsed. This is an authored coordination mechanism, not a general planner or portable social faculty.

## Parallel ownership

- `codex/service-plan-core`: new `src/games/service-plan.js`, `tests/service-plan.test.js`, `docs/service-plan-design.md`, `artifacts/service-plan-core/`. Commit the precise design/API first and share it with UI/comparison. Then lifecycle tests and implementation. Own the two-person discussion/receipt lifecycle, accepted terms/revisions/refusals, autonomous execution/expiry, accounting/replay, strict validation and bounded continuation. Preserve old host.
- `codex/service-plan-ui`: new `web/service-plan.html`, `.css`, `.js`, `-session.js`, `tests/service-plan-session.test.js`, `docs/service-plan-ui.md`, `artifacts/service-plan-ui/`. Work from the real core API once supplied. Name the playable variation clearly and link back to the original control. Root owns route/gallery. Actual mobile-width browser validation, downloads/imports, interrupted discussions, changed/declined terms and optional notes are required.
- `codex/service-plan-comparison`: private `src/experiments/service-plan/`, `scripts/service-plan-comparison.js`, comparison tests/protocol/report and `artifacts/service-plan/`. Preregister actual cases and rival information/timing before implementing controller outcomes. Include fixed-fallback, competent timed-request and trivial visible-pump rivals; direct agreement records must get fair affordances. Comparison questions must be separate where world action sets differ. Retain communication-overhead and failed-promise cases; do not silently adjust frozen policies after reserved evaluation. Prefer compact reproducible replay artifacts, with exact source binding.
- Root: integrate precise dependency commits; maintain active handoff; independently inspect discussion semantics and the price of cooperation; add route/gallery/release metadata; commission overlapping Astra Ultra and scoped Fable reviews; verify fixes, package/build, clean pushed main, deployment and exact live payload/browser behavior. No new general package abstraction in this milestone unless evidence separately earns it.

## Acceptance and release

- [ ] Agree concrete core/public-view contract and new host/save boundary; commit protocol before comparison outcomes.
- [ ] Execute two feasible plan terms and at least one useful revision with real paid costs; retain competent old-host result and direct-rule counterexamples.
- [ ] Exercise refusal/interruption, stale or duplicate response, deadline/closing ties, missed promise, post-departure refusal, owned resources, save/import and command-budget continuation.
- [ ] Implement and inspect the actual responsive UI, notes and save flows against real core.
- [ ] Freeze/reproduce comparisons and reserved cases with complete outcome/cost accounting, avoiding claims of human authoring benefit or general cognition.
- [ ] Obtain independent review, preserve actual Fable model/scope/failure provenance, fix defects and recheck their counterexamples.
- [ ] Full suite, new tests on minimum Node22, runtime locks, static graph/build and production browser checks pass. Commit/push/deploy and verify `/release.json` plus every public payload against the exact app commit.
- [ ] Record release evidence, current docs and next meaningful queue separately from deployed app source; no docs-only redeployment.

Human playtesting, physical-device timing, useful human authoring effort, empirical calibration and qualified theological review remain open external tracks. Synthetic actors/notes and source-review verdicts do not fill them. The user's existing authorization covers implementation and delivery; no new approval pause is required for this bounded milestone.
