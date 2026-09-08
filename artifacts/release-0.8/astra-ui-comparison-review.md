# Independent Service Day UI, policy evidence and static-module review

Reviewed 2026-09-08. Initial shared checkout: `3e171e48de2119471fc035c7dcb39d1f236a2540`; host bytes then matched reviewed `94cb980`/dependency cherry-pick `16318cc`. The parent was separately changing the uncommitted static module guard. No prior reviewer verdicts were read. No repository files were edited, committed, pushed or deployed. This report excludes the separately assigned refused-command compaction fix.

## Findings

### [P2] Static module guard merges distinct browser module URL identities

Source: `scripts/inspect-static-modules.mjs:12-20`, especially decoding `url.pathname` and returning `modules.get(path)`. The guard drops URL query and fragment and merges encoded pathname aliases into the physical source path. Browsers instantiate ES modules by resolved URL, including query/fragment. Consequently the guard can accept a selected static graph whose named import fails linkage in the browser; this is within its stated static-linking scope, not a dynamic/runtime coverage request.

Minimal selected source set:

```js
// web/app.js
import {value} from './barrel.js';
// web/barrel.js
export * from './value.js?a';
export * from './value.js?b';
// web/value.js
export const value=1;
```

Observed before the parent's correction: `verifyStaticModules` accepts this graph with three physical modules and three edges. A URL-identity `SourceTextModule` linker rejects it with `The requested module './barrel.js' contains conflicting star exports for name 'value'`. Actual Chrome 152.0.7977.77 rejects with the same message and does not run the application. Browser repro retained in `/tmp/hf-static-graph-browser-probe.mjs`; output `/tmp/hf-static-graph-browser-probe.json`.

The same merging occurs for `./value.js` and `./%76alue.js` when both asset URLs resolve to those bytes. Either key linking modules by complete resolved URL while separately locating published file bytes, or conservatively reject query/fragment and noncanonical encoded URL aliases. Merely rejecting query/fragment leaves the encoded-path alias issue. Current public code need not use these forms for the guard regression to matter; its existing test explicitly admitted query/fragment imports. The parent acknowledged this finding and is restricting accepted module specifiers with regression coverage.

### [P3] Frozen comparison watchdog applies command nine before enforcing its advertised eight-command bound

Source: `src/experiments/service-day/experiment.js:69-73`; contract: `docs/service-day-comparison-protocol.md:15`. The harness increments `zeroTime` after applying a command and only stops when `zeroTime > 8`. Nine zero-time requests can therefore have effects, although the registered wording says at most eight.

Repro:

```js
runTrial({controller: v => v.jobs.keeper
  ? {type:'interrupt',actor:'keeper'}
  : {type:'request',actor:'keeper',task:'rest'}})
```

Observed: status `zero-time-limit`, nine accepted commands, minute 0, a newly requested rest left pending. Both retained original development/reserved matrices have a maximum of only two consecutive zero-time commands, so this defect does not alter any reported comparison result. The parent plans an explicit documentation correction, preserving frozen sources and results. Any later semantic fix must retain the frozen harness and declare its changed execution boundary.

## Favorable findings and checks

- The UI truthfully distinguishes Deniz's own work from accepted requests, displays independent cancellation refusal, owned/reserved supplies, paid partial rest, full versus one-unit outcomes, morning losses and the single clinic receiving slot in the cart choice. Condition labels remain estimates and warned attempts remain enabled for the real capacity check.
- An unfinished shed retrieval is shown as being fetched at the morning boundary, with no premature part grant. Gate/diversion work and actual Human bodies carry through minute 24. No free condition reset or replacement part was found.
- The strict minute-64 delivery requirement is visible in the delivery choice and help. Minute-24 diversion completion is allowed by the host and no longer marked late. Existing core tests explicitly retain these boundary distinctions.
- Session state contains only playback state around the host. New/imported games start paused; invalid import leaves the active valid save intact. Notes contain the author's text and a bounded explicit public projection; automated fixtures are labeled as synthetic. No network submission is performed by the note feature.
- Both policies use the same detached public view. `people.partner` is removed; policies import only shared arithmetic helpers. Both use paid meals, short rests, owned parts and consented partner requests rather than free harness recovery or hidden-world rollouts. View snapshots and command traces are retained.
- Source hashes from both committed freeze manifests exactly match their named Git source bytes. All original and reviewed-host trial table entries match the reported water service, clinic completion, work/rest and carryover results. Each paired case has an identical initial-save hash and no decision view includes the partner's body object.
- The report preserves the interrupted-diversion loss in efficiency, the simpler rules' sufficiency, the failed immediate `TARGET_BUSY` carryover contrast, and the fact that body/material consequences are bundled. Host corrections after reserved unsealing are explicitly labeled post-unsealing validation. No stronger planning, causal physiology, enjoyment, human validation or authoring benefit is claimed.
- Guard parsing/linkage itself never calls `evaluate()`. Missing/private paths, malformed syntax, missing exports and nonlocal imports fail; cycles and source text that would throw/hang if evaluated are accepted without execution. Build checks the graph before removing previous output. Dynamic imports, HTML/CSS/fetch/workers and runtime behavior remain expressly outside this guard's coverage.
- No minimum-Node failure was found: all 29 targeted session/comparison/guard/build tests pass on Node 26.8.1 and minimum Node 22.0.0.
- Full actual UI runner passes in Chrome 152 at widths 320, 390 and 1280, height 844. It exercised independent accepted/refused work, both full-service routes, cart fallback, pending shed part, paid partial rest, completion pausing, save download/import/reload, invalid-import preservation, synthetic tab hiding and note export. No page errors or horizontal overflow. Outputs and screenshots: `/tmp/hf-service-ui-review-browser/`; visually inspected `390-clinic-carryover.png`.

## Scope and remaining release obligations

No other release-blocking UI/comparison defect was found. The two findings above were sent to the parent before this report. Public `/service/` route/catalog integration and exact pushed/deployed commit verification belong to the parent; their incompleteness at the starting checkout is not counted as a lane defect. Browser automation here is desktop Chrome at mobile viewport widths, not a physical-device or human-usefulness result. The guard finding should be resolved and its amended acceptance rules checked before calling the new static-link guard complete.

## Scoped fix verification — 2026-09-08, checkout `6ced8dcdac0bc20af40f8edfc766487844a2fe33`

**P2 is resolved in the inspected guard.** `target()` now rejects any static module specifier containing `?`, `#` or `%` before URL resolution, so query/fragment instances and encoded pathname aliases can no longer collapse into false export-link proofs. Independent probes rejected `./value.js?a`, `./value.js?b`, `./value.js?`, `./value.js#fragment`, `./value.js#`, `./%76alue.js` and `./value%2ejs`, all with the intended unsupported-identity error. The original actual Chrome failing case remains preserved as the before-fix evidence. The successful canonical-path test still includes throw/unresolved-await target source and does not evaluate it.

The actual current selected public directories contain **51 JavaScript modules and 83 static import/reexport edges**. Their real source bytes link successfully through the amended guard on both Node **26.8.1** and minimum **22.0.0**, without building or modifying `dist`. All **10 guard/build tests pass on Node 22.0.0**, including URL-alias rejection and preservation of previous build output on graph failure. Probe source and results: `/tmp/hf-static-guard-final-check.mjs`, `/tmp/hf-static-guard-final-26.8.1.json`, `/tmp/hf-static-guard-final-22.0.0.json`. Dynamic imports, HTML/CSS/fetch/workers and runtime behavior retain their stated exclusions; this recheck does not broaden that claim.

**P3 is accurately disclosed, with retained evidence unaffected.** The final comparison documentation and compact artifact explicitly state that command nine executes before the watchdog trips, while the measured maximum in all recorded trials and carryover continuations is two. Preserving this frozen private harness rather than silently changing historical evidence is a defensible disposition.

The final host normalization is explicitly bound to `0a48e9f` in committed manifest 3. `verifyFreeze` accepted the current host/protocol/policy/harness bytes. The compact result is exactly **302,079 bytes**, SHA256 **`ce28ca019f8105c09f2e7cbfe9120d73a2765c1e0ef87153efad611f47f90f71`**, matching the report; its manifest and original-artifact reference hashes match actual files. Independently replayed its **18 trial and two carryover continuation** input sequences against the current host: every final-save and final-world hash matches. No large matrix was regenerated or replaced. Evidence: `/tmp/hf-final-host-review-validation.json`.

**Scoped final verdict: no remaining blocker in this review's UI/comparison/static-guard scope.** This is approval of the inspected fixes and concise validation, not a claim of deployed release verification or human testing. No repository edits, commits or deployment were performed by this reviewer.
