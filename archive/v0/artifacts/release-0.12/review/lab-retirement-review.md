# Independent public laboratory retirement review

Scope: the actual working changes under `/Users/abdul/code/human-framework` to `scripts/public-assets.js`, `scripts/public-pages.js`, `scripts/build.js`, `scripts/serve.js`, `scripts/verify-live.js`, and their focused build/server/live-verifier tests. UI copy/layout and production deployment are separate review scopes. No main-worktree files were edited by this reviewer. No broad camp replay or fuzz suite was run.

## Verdict: scoped PASS after one confirmed P2 correction

The exact output allowlist removes the retired laboratory entry point and modules while preserving the selected examples' required static dependencies. Root `/` and `/index.html` select the games chooser. The shared `src/core/model.js` and `src/core/random.js` remain necessary selected dependencies. The release manifest now identifies the selected runtime and clock instead of the retired laboratory engine.

The initial local-server implementation had a private-file exposure gap. The root agent corrected it; the original independent reproduction now passes. No remaining finding in this build/allowlist/local-serving scope.

## Confirmed initial defect and correction

**P2: a selected path could redirect to an unlisted private file within the same source directory.** `serve.js` selected paths using the exact allowlist but checked resolved targets only for containment within the first `web` or `src` segment. The allowlisted `web/games.js` could therefore be a symlink to unlisted `web/private.js`, and `src/core` could point to `src/private` so that allowlisted `src/core/model.js` served unlisted `src/private/model.js`.

The independently executed original probe returned:

| Request | Before correction | After correction |
|---|---:|---:|
| `/web/games.js` through file symlink | 200, private sentinel body | 403, empty body |
| `/src/core/model.js` through ancestor symlink | 200, private sentinel body | 403, empty body |
| `/web/private.js` directly | 404 | 404 |
| `/src/private/model.js` directly | 404 | 404 |

The build already rejected these source redirects. The root correction replaces the server's broad containment rule with exact equality between the resolved target and `resolve(realBase, relative)`. This rejects both the selected-file and ancestor redirects before reading content. Root also added a regression test covering both cases.

Evidence is preserved in `/tmp/lab-retirement-symlink-before.json` and `/tmp/lab-retirement-symlink-after.json`. The original independently authored executable reproduction is `/tmp/lab-retirement-symlink-probe.mjs`.

## Independent executed checks

An isolated temporary tree copied the actual selected source bytes, page sources and package metadata. It also contained sentinel retired/private files. The build and local HTTP server operated on that fixture; the repository's `dist` and source files were not modified.

`/tmp/lab-retirement-build-probe.mjs` passed on actual Node 26.8.1:

- Exactly **71 output files**, comprising **56 selected assets**, 13 mapped HTML entries, `_headers` and `release.json`; no retired/private sentinel content was copied.
- `dist/index.html` exactly matches the selected chooser source, rather than the retained private root laboratory HTML.
- **42 static modules and 60 static import/export edges** link successfully using the build's actual module parser.
- **90 literal HTML/CSS references** resolve to selected public assets or page routes.
- All **56 selected assets** returned their exact source bytes through the local server with the expected no-sniff header.
- All **26 route aliases**, including `/`, `/index.html`, and slash/non-slash example routes, returned the selected HTML bytes.
- **14 retired/private paths** returned 404, including laboratory JS/CSS, old core/scenarios/legacy modules, unlisted adjacent JS, `.git/config`, and an encoded traversal attempt.
- HEAD responses are empty and supported; POST is rejected with 405.
- A targeted scan of the selected JavaScript found no `import(...)`, `fetch(...)` or `new URL(...)` resource dependency requiring additional publication. This is a literal-source check, not a claim of general dynamic-program equivalence or a browser interaction test.
- The isolated manifest records `appVersion: 0.12.0`, `runtimeVersion: 0.1.1`, `clockVersion: 0.1.0` and no `engineVersion`. Its commit/dirty fields are null because the disposable fixture is not a Git checkout; it is not a release artifact.

All **8 focused existing/updated tests** pass on actual Node 26.8.1 and minimum Node 22.0.0:

`node --test tests/build.test.js tests/server.test.js tests/live-verification.test.js`

These include source/ancestor symlink rejection before erasing prior build output, missing static dependency rejection, exact build selection, local server method/path restrictions, the corrected internal-source redirect, and rejection of missing assets/changed headers/dirty source by the live-verification script's local preconditions.

The live verifier's added retired-path list and runtime metadata change were inspected. **No production HTTP request, remote commit verification, deployment, or live manifest/payload comparison was performed in this review.** The focused verifier tests exercise local rejection paths; they are not proof that production currently has this release or that its old assets are absent.

Artifacts:

- `/tmp/lab-retirement-build-probe.mjs`
- `/tmp/lab-retirement-build-result.json` (includes hashes of every copied source/page)
- `/tmp/lab-retirement-build-output.log`
- `/tmp/lab-retirement-focused-tests-node26.log`
- `/tmp/lab-retirement-focused-tests-node22.log`
- `/tmp/lab-retirement-symlink-probe.mjs`
- `/tmp/lab-retirement-symlink-before.json`
- `/tmp/lab-retirement-symlink-after.json`

## Reviewed corrected source hashes

This is a working-diff review, not an assertion that the changes have been committed or deployed. The exact corrected files inspected are:

| File | SHA256 |
|---|---|
| `scripts/public-assets.js` | `b9da5a3a2d7903d2c1fd61992aedeba0a82189826d5b798f867b753efd7cca56` |
| `scripts/public-pages.js` | `08f3fb57e4dd787c76316e7e8a49dc7f68d83b533a262f255a60b7bd811b9475` |
| `scripts/build.js` | `037633a9f8d627db2cadc149873686fb914be05050d0a28f2daf380e6ec942ea` |
| `scripts/serve.js` | `dda4b65ed55807ceb508964971ab061e1b629a0ae66200fed2979df4ed05b523` |
| `scripts/verify-live.js` | `2006ae07d27b294e04ea41d4d79db6ac4d93e6035d4f46b0bff108b5ff090ade` |

The source and HTTP dependency checks do not replace the separate UI review or root's exact committed-and-pushed release/deployment verification.


## Final verification-list-only delta — inspected PASS

The final `verify-live.js` change adds the five `model`, `observation`, `policy`, `random` and `simulation` endpoints for each retired legacy version (`v0.1`, `v0.2`). These ten paths match the actual legacy filenames. Together with the already listed two legacy entry modules, retired web/core/scenario files and `/laboratory/`, the verifier now configures all **20 removed file endpoints**, the retired page route, and **66 distinct private/missing paths** overall.

A source-only check confirmed that deleting exactly this added line reproduces the previously reviewed hash `f0d315b0fa23a9b0d5d81821f51bd91e8f8edb33c81df17eab514dfe81d1667d`; no other verifier logic changed. The configured path count and uniqueness were checked without executing network requests. No build or test suite was rerun for this list-only change.

Final `scripts/verify-live.js` SHA256: `2006ae07d27b294e04ea41d4d79db6ac4d93e6035d4f46b0bff108b5ff090ade` (also updated in the source table above). This confirms the verification configuration, **not** live endpoint status. Exact production execution remains with the root deployment task.
