# Runtime package peer review

Date: 2026-09-07. Independent delegated code and contract review, initially at `5bf03c6e9bed0bf85210adf66e825885fc76f2da`, with the final installed-host check at `732603f10b5e1ad67302d3d2d7241d9466cece55` after Common Ground merged. The packaging fixes and integration documents/tests were still uncommitted. Prior review verdicts were not used to form the initial assessment.

No unresolved release-blocking issue was found in the reviewed runtime/package scope after the two fixes below. This review verifies local JavaScript consumption and named clock/lifecycle invariants. It does not establish player usefulness, scientific calibration, general social cognition, mobile performance, or a deployment result.

## Verified findings and fixes

1. **P2: the isolated consumer could not start on supported Node 26.** Before the fix, `node --test tests/runtime-clock.test.js tests/runtime-package.test.js` passed 14 of 15 tests; the consumer process failed with `bad option: --experimental-permission` on `/opt/homebrew/Cellar/node/26.8.1/bin/node`. The test now selects the supported flag from `process.allowedNodeEnvironmentFlags`, preferring `--permission` and retaining the experimental fallback for early Node 22. The explicit `ERR_ACCESS_DENIED` assertion and restricted filesystem read scope remain. The integrator applied the same selection to the full Common Ground consumer test. The differing spellings are documented in the official [Node 22.0.0 CLI](https://nodejs.org/download/release/v22.0.0/docs/api/cli.html#--experimental-permission) and [current permission documentation](https://nodejs.org/api/permissions.html#permission-model).

2. **P2: an alternate source root could produce falsely versioned metadata.** Copying the allowlisted files into a temporary root, changing only its `RUNTIME_VERSION` from `0.1.0` to `0.2.0`, then calling `packageRuntime({root})` originally shipped code exporting `0.2.0` under package and manifest version `0.1.0`. Metadata came from the packer's loaded checkout. The ordinary same-checkout CLI path was unaffected. `scripts/package-runtime.js` now checks all three copied version declarations against the loaded runtime/human/clock constants before creating an artifact. This programmatic root override supports fixtures and copies for the current packer; it does not discover arbitrary alternate versions. Its documented source convention is exactly one authored, one-line, single-quoted exported version literal. Unsupported declarations fail clearly. It does not execute alternate-root source or rewrite copied modules. The new regression failed first with `Missing expected rejection`, then passed for runtime, human and clock mismatches and an unsupported expression declaration.

Reviewer changes are limited to `scripts/package-runtime.js`, `tests/runtime-package.test.js` and this record. Runtime, human and model source bytes were not changed by these fixes.

## Executed verification

| Verification | Executable | Result |
|---|---|---|
| Human, clock and package tests after both fixes | `/opt/homebrew/Cellar/node/26.8.1/bin/node`, Node 26.8.1 | 25 passed, 0 failed |
| Same human, clock and package tests | Official darwin-arm64 Node 22.0.0, with its bundled npm first on PATH | 25 passed, 0 failed |
| Final merged `tests/commons-package.test.js` plus `tests/runtime-package.test.js` | Same official Node 22.0.0 | 5 passed, 0 failed |
| Independent seeded scheduler reference | Node 26.8.1; 10,000 mixed schedule/cancel/advance/JSON-restore operations | Exact state and returned-event agreement |
| Whitespace validation of reviewer code changes | `git diff --check -- scripts/package-runtime.js tests/runtime-package.test.js` | Passed |

The temporary early-Node executable used was `/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/human-node22-review-xnBFhK/node-v22.0.0-darwin-arm64/bin/node`. Its downloaded archive SHA-256 was `ea96d349cfaa67aa87ceeaa3e5b52c9167f7ac302fd8d1ff162d0785e9dc0785`, checked against the official [Node 22.0.0 checksum list](https://nodejs.org/dist/v22.0.0/SHASUMS256.txt). Feature detection returned stable=true/experimental=false on Node 26.8.1 and stable=false/experimental=true on Node 22.0.0. No system runtime installation was changed.

The final full-host test copies the complete merged host with exactly two import substitutions, installs the actual tarball offline into a fresh consumer, and denies reading the original repository host. It saves mid-action at minute 7, compares 600 individual minute advances with one 600-minute call after JSON restoration, finishes the workbench commitment, verifies practice for both people, and compares the installed-package result with direct source execution. It tests a real consumer rather than merely asserting package paths exist.

## Scope and simpler rival

The source allowlist, dependency closure, detached clock state, equal-time event ordering, cancellation counters, snapshot checks and bounded pending history match the documented contract. The public human boundary still exposes the full frozen `PARAMETERS`, including unused assistance and trust coefficients; the documentation explicitly discloses this. Those constants do not provide portable social mechanisms. Host outcomes, resource authorization, cancellation effects and coherent multi-component saves remain host responsibilities. A valid clock snapshot is not proof of authentic world history.

For this two-person worksite, per-person end times plus a small authored recovery policy remain a serious simpler implementation. The package demonstrates reusable execution and scheduling boundaries; this host alone does not show that a richer human model is necessary. The matched simpler-policy comparison, independent-author usability check and player-explanation gate should remain open, as `docs/mvp-contract.md` requires. No additional faculty is needed to close the reviewed software issues.

## Reviewed file identities

SHA-256 values from the final integrated check:

| File | SHA-256 |
|---|---|
| `src/runtime/index.js` | `fd669e4f4bcbb3713249b64b34d0d369aa929d3904022b78acd8cc09ffefdb60` |
| `src/runtime/clock.js` | `ab770e36dcbf9a248fae30ce614b42d2e131a72176658c3eb130b40f4a49eb6c` |
| `src/human/index.js` | `0f6d30cf2b5e07f5e18dc791fecd691b9004f290e138abeab7336b1c2e2ee308` |
| `src/core/model.js` | `1bf30267083e8e2617fe9964d4654d8da158cba309909ace7bb50c1e6de29c59` |
| `src/games/commons.js` | `b2c6f5e8bd38e84b729d73182170c88034edc3767e00c71cd65784233283aedb` |
| `scripts/package-runtime.js` | `ac1ca033f7c39cfde1794a35f2a41e195a48fdccd9d8b1a9300f6b14086c1bbb` |
| `tests/runtime-package.test.js` | `0600539ae4b6a3316902e2d9c592805d2e79973036dbb04505af8f57cb45a917` |
| `tests/commons-package.test.js` | `f894cf3b9fb9a19939548a71210e417819ee362c54e7ad90752d964c7f3a9245` |
| `docs/portable-runtime.md` | `750610f410130fb5f11731d0100b1e461d37411ee95857fc6b63529cddb8eee8` |
| `docs/mvp-contract.md` | `6ce37574bf91839fb3c4e3829bfc299a021cc9195cec71b6c5e1a619b3d58b02` |
