# Independent 0.3 code review

Review date: 2026-09-07. Base commit: `08aab973bcaef51693d94beeed4d882e9c3124ee`; reviewed working tree was uncommitted and being edited by other agents. This is a local code-review record, not production release verification.

## Findings

No additional reproducible material code defect was found in this review. Already assigned host issues were excluded from duplicate findings: required repair skill and impossible save clocks, remaining-time replacement routing, and forecasts after interval practice. Their corrected implementations were present during the later checks below.

One release-documentation mismatch was reported to the release owner: `README.md` still described current play as 0.2, while `docs/benchmark-report.md` described 0.2 results but linked to the newly overwritten 0.3 `artifacts/benchmark.json`. The deployment document also listed the older public roots. The final release must align current documentation and artifact identities while retaining the archived 0.2 results. This observation records the review-time state; it does not assert that those documents remain unchanged after this review.

## Scope and evidence

- Inspected current policy/model/observation/simulation changes, public version dispatch, the human attempt lifecycle, host integration, both browser entrypoints, build allowlist and local routing.
- Ran 26 focused tests in `human.test.js`, `policy-contracts.test.js`, `legacy.test.js`, `build.test.js` and `server.test.js`: 26 passed.
- Independently compared the five archived 0.2 implementation files with the base commit's current core: model, simulation, observation, policy and random were byte-identical. The 0.1 implementation had no working-tree diff; both historical versions passed golden replay, projection, ranking and export checks. Current laboratory play identifies itself as 0.3.0; first-release human and host snapshots use separate component and host versions.
- Ran 144 additional human-component partition checks across active/rest/meal activities, fatigue and hunger floor/ceiling cases, and durations from 0.01 to 1,440 minutes. Whole intervals and seven-part saved/resumed intervals agreed within the declared numerical tolerance, including completed meal relief.
- Ran 3,653 host snapshot round trips across 50 deterministic random command sequences containing legal starts, fractional advances and interruptions. Every exported active state imported without a change.
- Checked the actual publication graph without rebuilding the shared output directory: all 43 local module imports and four HTML asset references resolved within the 28-file source payload. The laboratory's game link points to `/workshop/`, mapped to the workshop entry page.
- Verified that policy functions operate on projected views, workshop fitting condition is removed before projection, repair forecasts use perceived human state, and explicit inspection supplies the later public condition. Diagnostic/save data remains separate from controller input. The current human lifecycle consumes pending attempts once and keeps elapsed practice and maintenance when interrupted.

No full benchmark was rerun. No production deployment, visual browser QA, physical mobile measurement or human playtest was performed by this reviewer. Passing local checks does not establish the final deployed commit or the game's behavioral validity.

## Reviewed source identity

SHA-256: `0644e99411b53c52dcccaffe476448091dfae34c9eba1b1ddc659f8550f6b421`.

Computed by updating SHA-256 with each ordered relative path, NUL, file bytes, NUL: `index.html`, `scripts/build.js`, `scripts/serve.js`, `web/app.js`, `web/workshop.js`, `web/workshop.html`, `src/human/index.js`, `src/games/workshop.js`, `src/core/index.js`, `src/core/model.js`, `src/core/policy.js`, `src/core/observation.js`, `src/core/simulation.js`. Later edits require the release owner's final checks.

## Follow-up: fractional intervals and workshop comparison

The independent host author subsequently fixed an early-settlement boundary: an action fractionally short of completion must remain pending, and a test run extending fractionally beyond departure must not award victory. This reviewer reran the focused human, host-consumer, workshop-game and workshop-benchmark tests after that correction: **35 passed**, including three near-completion/deadline regressions. The corrected host source SHA-256 is `b2ee4cb10fddf57455c0321e42da1d256b87a7a96225d92ff1940f45ed8f6f06`; it supersedes the host file contained in the earlier combined review identity.

A separate reproducible workshop comparison now exists in `scripts/workshop-benchmark.js` and `artifacts/workshop-benchmark.json`. Generate it with:

```sh
node scripts/workshop-benchmark.js --seeds 100 --start-seed 101 --json artifacts/workshop-benchmark.json
```

| Controller | Wins | Mean elapsed, all runs | Mean time among wins | Failed repairs | Blocked attempts / idle minutes |
|---|---:|---:|---:|---:|---:|
| Task-aware | 99/100 | 97.97 min | 96.54 min | 19 | 0 / 0 |
| Planned simple | 100/100 | 71.70 min | 71.70 min | 28 | 0 / 0 |
| Greedy | 100/100 | 71.93 min | 71.93 min | 28 | 4 / 8 |

Task-aware seed 159 ended without victory at the 240-minute deadline. Its completion time is right-censored; the all-run mean describes time until success or deadline, not eventual successful completion. All three controllers consumed zero rations in these runs. Completed rests totaled 5, 6 and 7 respectively. Failed full repair outcomes exclude blocked requests and deadline-interrupted repairs. Blocked requests consume idle time and do not automatically supply recovery.

All 300 recorded command logs were replayed independently and matched their recorded final snapshot hashes, statuses and elapsed clocks. Aggregate means were independently recalculated from the per-run records; recorded intervals and food debits matched host time and inventory. The independent host author also reviewed the runner's counting and censoring definitions against host semantics and reported no concrete error; they did not rerun the sweep or audit every artifact row. The artifact contains the exact seed list, current host/human/formula/runner source hashes, external command and event logs, per-action counts, metric definitions and final state hashes. Its SHA-256 is `08080d130d2f2085d4248ade82bd01aaabab8755c788ee386b6722d2d0bb5203`. Three new focused tests distinguish censored time from winning time, interrupted meals from consumption, and failed repair effort from blocked idle time.

This comparison changes no host or human runtime behavior. It supplies no browser-performance or human-validity evidence. Seeds 101-200 are a reproducibility convention, not untouched held-out data, and this later sweep remains distinct from the earlier 1-100 figures recorded in the integration report.
