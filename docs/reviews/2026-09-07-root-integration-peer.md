# App 0.4 root integration review

2026-09-07. Bounded read-only review of `/Users/abdul/code/human-framework`. No root files were edited and no production operation was executed. Focus: public packaging, additive routes, app/engine version separation, candidate claims, mobile chooser, and the newly added live verifier.

Source identities and browser/route measurements from the main pass are in `/tmp/root-integration-review-evidence.json`; isolated browser screenshot `/tmp/games-review-390.png`. That main pass preceded the addition of `verify-live.js` and its package script. The verifier was reviewed separately as described below.

## Verified findings

### P2 — Live verification trusts stale local build metadata

The first reviewed `scripts/verify-live.js` checked the commit in `dist/release.json` against HEAD and remote main, but did not recheck actual working-tree status or recompute `assetsSha256`. It enumerated whichever files happened to remain in `dist` and compared those bytes to remote, skipping the manifest and `_headers` as payloads. A deleted required local asset could therefore evade verification while the script printed success for the smaller set. The historical manifest’s `dirty:false` did not establish that the current checkout was still clean.

Reproducer: `node --experimental-vm-modules /tmp/probe-live-verifier.mjs`. This executes the unmodified verifier module in an isolated VM with real temporary filesystem reads and controlled git/fetch boundaries. Its manifest digest represents an HTML file, `_headers`, and a required JavaScript module; the latter is missing from the local fixture. The remote fixture still serves the original payload and manifest. The git stub would report a modified source file if queried, but the original verifier never requested status. Observed result: exit 0 and “Verified ... 1 exact public payloads ...”. No request went to production. The fixture also supports `--clean` (isolate the missing-payload check), `--complete` (isolate dirty-checkout handling) and both together (valid control).

Recommended correction: reject nonempty current git status, and recompute the same sorted `path + NUL + bytes + NUL` SHA-256 as buildSite over every local dist file except `release.json`, including `_headers`. Require equality with the manifest before remote checks. The output artifact, if saved into the repository, is expected to become a later untracked change after this check, not a reason to skip checking beforehand.

This is a verifier completeness issue, not evidence that an existing deployed payload is wrong. Root received the finding and owns its correction/verification.

### P3 — Seven-phase trace claim needs laboratory scope

`README.md:59` says “Every decision records these seven phases.” That accurately describes the laboratory trace; the new host games retain bounded active events and optional game-specific replays, and do not run that seven-phase policy trace for every action. Qualify the sentence as “Every laboratory decision...” so the additive game scope does not imply whole-framework portability. The later narrower-boundary paragraphs already make the right distinction.

No other verified P1/P2 packaging, route-compatibility, version, or chooser defect was found in this bounded pass.

## Executed checks and observations

- `node --test tests/build.test.js tests/server.test.js`: all three tests pass. The fixture build verifies explicit six-page output mappings, excludes private HTML/JSON and repository documents, removes stale output, records app version separately, includes `_headers` in the payload digest, and rejects redirected public roots/ancestors/entries. Server checks exercise methods, traversal and symlink escape as well as the new routes.
- Actual root local server: `/`, both slash forms of `/games`, `/workshop`, `/shift`, and `/courier` returned 200 with exact source HTML. Both courtyard forms returned 404 because its source had not yet been merged; root explicitly identified that merge as pending. This is not reported as a routing bug. The route table already includes courtyard and fixture tests exercise it.
- Actual private/missing probes rejected research/artifact/docs/package/git/unlisted HTML paths with 403/404 as applicable. No source/research publication was performed.
- Current public source asset directories contain runtime JS/CSS and intended assets, not private review records. HTML publication is explicit. Other recognized assets are allowlisted by their direct parent directory and extension, so files intentionally placed there are public; arbitrary JavaScript dropped into those directories is not secret merely because its name sounds private. This is the inherited authored-public-root contract, not an introduced leak.
- App version is 0.4.0 in package.json and both root lockfile locations. Laboratory engine remains 0.3.0; shared human remains 0.1.0. Manifest construction stores appVersion and engineVersion separately. Existing deploy/check-release still requires a clean reviewed main matching pushed main before deployment.
- `git diff --quiet d62f84d -- src/human src/core src/legacy src/games/workshop.js web/workshop.html web/workshop.js web/workshop.css`: passed. The older runtime and workshop presentation bytes remain unchanged; the laboratory entry changes only its link to the new chooser.
- Isolated Chrome 152.0.7977.77 browser contexts at 1280×900, 390×844 and 320×800 showed no horizontal overflow or page JavaScript errors. All four cards have correct, large click targets and distinguish the three new games from the introduction. About notes are collapsed; their summary measures at least 44 px. The 390 px screenshot was visually inspected. This is desktop-browser viewport QA, not a physical-mobile timing measurement.
- Current Pump Yard figures in the release draft agree with the retained artifact; Courier’s stated final means/counts agree with its current artifact. Courtyard figures, combined full-suite count, completed external review status, production commit and live payload verification are explicitly pending. No completed-release claim was inferred from those draft sections.

## Boundaries and remaining work

This review did not run root `npm run build` into the shared dist directory, install dependencies, change source, push, deploy, or invoke the unfinished live verifier against production. The pending courtyard merge means the actual combined public build must still be run by root after integration. Future-tense release checks are required remaining work, not defects in a draft.

The verifier compares remote bytes and selected response-header properties; it is not a full web-security audit or proof that every unknown remote URL is absent. The private-path checks are an explicit sample. Browser clarity findings are formative inspection, not evidence of player understanding or enjoyment.
