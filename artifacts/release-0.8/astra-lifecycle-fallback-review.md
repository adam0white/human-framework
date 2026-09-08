# Independent Service Day lifecycle and static-module review

Date: 2026-09-08. Reviewer: independent delegated Codex reviewer. Read-only repository review; no source changes, commits, public build writes, deployments, or prior reviewer verdicts read.

## Verdict

No blocking or actionable correctness finding in the reviewed lifecycle, ownership, save normalization, session/UI contract, or static-module guard. The planned presentation clarifications are compatible with the implemented rules. This is a favorable scoped result, not a claim about human enjoyment, scientific validity, physical-device performance, deployment identity, or dynamic asset coverage.

## Reviewed version and scope

Repository HEAD during review: `06939c0d025317c4dc719a9c30f6f82c3d44ee64`.

The host matches core commit `0a48e9fb058b3c2011ac77d5c0267f6c908f7e90` (`git diff 0a48e9f --stat -- src/games/service.js` produced no difference). `git diff fa16e743feeaee8a9623c1f8da60082a9222c9f2 --exit-code -- src/human src/runtime scripts/runtime-release-lock.json` exited 0: frozen runtime/model sources and release locks remain unchanged since the app 0.7 baseline.

Read HANDOFF.md, docs/mvp-contract.md, docs/roadmap.md and docs/service-day-design.md; inspected src/games/service.js, web/service.js, web/service-session.js, web/service.html, scripts/public-module-graph.js, scripts/inspect-static-modules.mjs, scripts/build.js and their relevant tests. Presentation wording may change after the hashes below; this report evaluates the inspected bytes rather than later delivery.

## Confirmed behavior

- Ownership and paid work reconcile: parts are reserved by their owner and installed at the first paid minute. A second actor can finish already installed partial gate work without consuming their own reserved clinic part. Per-person paid accounting remains separate. Meals and handovers grant their effects only on completion; interrupted unused reservations return.
- Consecutive same-minute refusals can replace one another even across rejected requests and rejected partner cancellations. Accepted work and earlier-time commands remain. `restoreService` reproduces the journal and compares all saved world/envelope fields exactly after substituting only its normalized command journal (src/games/service.js:160). The deterministic provenance guarantee is internal to a supplied save, not a signature or trusted external history.
- A maximal 256-entry valid redundant refusal journal normalized to 2 commands. Altering owned resources while preserving the global total, changing a chosen job into requested work, or editing the final response still failed import. Additional conservation-preserving public-ledger and installed-ownership forgeries also failed.
- Exhausting the request budget with both actors in accepted jobs retained enough commands to stop both, return an unused meal and uncollected shed reservation, and reach closing. The tested terminal save used 254 commands and 13,799 characters. Refused requests after closing changed only the last response; bodies, inventory, work, receipt, and outcome stayed exact.
- Minute progression installs work before scheduled obligation events. Completed diversion at minute 24 counts; delivery completing at minute 64 misses intake. The existing tests also preserve body carryover, actual later capacity refusal, two feasible service approaches, autonomous cart fallback, exact save continuation, and alternate clock-driver equality.
- The UI/session distinguishes player work from requested or independently chosen Deniz work, labels capacity as an estimate while leaving actual checks available, pauses after import and visibility changes, caps throttled elapsed time, and refuses invalid import before replacing the active game. Meal use is a voluntary condition choice in this standard scenario. The single clinic slot and autonomous cart fallback are authored rules and should remain explicitly described in the parent presentation clarifications.
- The parser compiles and links static ES module imports/reexports without calling evaluate. A source containing a top-level dynamic filesystem import and process exit did not execute or create its marker. Non-local authorities, encoded/query/fragment identities, unsupported import attributes, missing/private modules, missing exports, and ambiguous star exports reject. The guard explicitly excludes dynamic imports and runtime/HTML/CSS/fetch/worker coverage; this limited claim is accurate. Build tests confirm static failure happens before previous output is removed.

## Exact verification evidence

1. Node 26.8.1: `PATH=/opt/homebrew/bin:$PATH node --test tests/service.test.js tests/service-session.test.js tests/public-module-graph.test.js tests/build.test.js` — 40 passed, 0 failed, 4,260.845584 ms (tool-captured output).
2. Minimum Node 22.0.0: `/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/human-node22-review-xnBFhK/node-v22.0.0-darwin-arm64/bin/node --test tests/service.test.js tests/service-session.test.js tests/public-module-graph.test.js tests/build.test.js` — 40 passed, 0 failed, 4,608.48325 ms. Retained log: `/tmp/hf-service-fallback-tests-node22.txt`.
3. Independent probe source: `/tmp/hf-service-fallback-probe.mjs`. Run with each Node binary — eight probe groups passed on both. Retained results: `/tmp/hf-service-fallback-probe-node26.json` and `/tmp/hf-service-fallback-probe-node22.json`.
4. Probe totals: 6 conservation-preserving/edit forgeries plus 3 normalization-associated forgeries rejected; 256 legacy commands normalized to 2; 9 extra parser cases rejected; no source-evaluation marker appeared. The actual current allowlisted JavaScript set statically linked with 51 modules and 83 edges, without writing dist.

## Inspected source hashes (SHA-256)

| File | Hash |
|---|---|
| src/games/service.js | `50ce6e3e52a9e92c85532f3a73d8afa46e6bc0ca7993ef72ce9e4f58e51738d1` |
| web/service.js | `ffcd4702a610503f0cbaf22caa2d6fb2b8aa7031408dac68c43f7cec7a24f999` |
| web/service-session.js | `52aaad8e21135f0bba760444eae3bfd58c0366ba90092ad387099da3a52ad041` |
| docs/service-day-design.md | `c42d2ad79de1121cc89691b0bc6c7203af1aaaabaaf4732a1c36d1843887e6db` |
| scripts/public-module-graph.js | `6e41af60d6c72e7a48bcb6d04b3918f9f9f6e1873ffbf21a1d2fa67278e930ea` |
| scripts/inspect-static-modules.mjs | `39857f8c05c7af22d150167545cbfab3bb0ff5d805235dcf437e92a46f83e10a` |
| scripts/build.js | `8309e689be84692c2b026690374d5c927d59b7bf43392d140641632415d2d3b0` |

Existing uncommitted package/gallery/live-verifier changes and untracked external review artifacts were observed in status but were neither modified nor treated as reviewed evidence.
