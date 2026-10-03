# Fresh independent source and executable review

Reviewed 2026-09-08 on human-framework main through `7a37161` (Signals integration), without consulting prior reviewer verdicts. Scope: `src/games/signals.js`, `web/signals{,-session}.js`, Signals tests/design, body-isolation source/protocol/report/evidence. Read-only repository review; probes and regenerated evidence live under `/tmp`. Public registration/play-note changes and the not-yet-integrated Signals private comparison are outside this pass.

## Findings

### P2 — The bounded replay can strand a valid, restorable live episode

Location: `src/games/signals.js:103-124`, particularly the limit at line 107 and recording after `advanceRaw()` at line 124.

Counterexample:

```js
let s = createSignals();
for (let i = 0; i < 96; i++) {
  s = requestTask(s, 'rest');
  s = interruptTask(s);
}
// commands.length === 192, now === 0, job.task === 'idle'
restoreSignals(JSON.parse(JSON.stringify(exportSignals(s)))); // succeeds
advanceTo(s, 32); // throws COMMAND_LIMIT
requestTask(s, 'ridge'); // throws COMMAND_LIMIT
```

Every command in this path is supported; no state forgery is involved. Because updates operate on a copy and append the advance after simulating, the thrown cap error discards all time/settlement progress. Download/reimport preserves the dead end. A similar boundary can strand an accepted pending action. Reserve continuation capacity before accepting elective task/stop commands, and ensure refusals cannot consume that reservation. It is enough to preserve bounded time/settlement through closing; no general checkpoint engine is necessary. Tests should cover accepted-cancel exhaustion, a pending job at the limit, refusals after exhaustion and imported capped states.

### P2 — Failed canal experience is mislabeled as testimony in the journal

Location: `src/games/signals.js:65`, called by the failure branch at line 90.

Counterexample:

```js
const s = advanceTo(requestTask(createSignals({situation:'shut'}), 'canal'), 6);
s.deliveries.at(-1).source; // 'canal-lock'
// s.recent includes: 'Landing keeper reply: closed, observed at 6; received at 6.'
```

`deliver()` labels every non-lookout source as a landing-keeper reply, including the carrier's own failed crossing. The receipt strip correctly identifies the lock, so the same observation has contradictory provenance in two visible places. This matters specifically in a game about firsthand observations versus delayed testimony. Use the actual source mapping for the journal as well.

## Verified Signals behavior

- All 25 Signals/session tests passed (42 focused tests including body isolation).
- A deterministic randomized probe ran 200 episodes and round-tripped all 4,215 intermediate valid states. Only deliberately attempted idle interruptions produced expected `NOT_WORKING` errors. No ordinary replay divergence appeared.
- Radio sampling occurs on paid one-minute completion, charge consumption occurs once then, and delivery occurs five minutes later. In-flight values and undisclosed landing timelines remain absent from actor view and next-visible-event control.
- Newer observation time wins over stale later delivery; equal observed times use receipt sequence. Failed crossings create firsthand reports and retain the lens while spending fare and full time.
- Canal fare is spent at departure. Interrupted requests/lookouts/meals grant no incomplete effect; paid effort/practice survives interruption. Completed requests stay in flight during subsequent work.
- Minute 12 launch and minute 32 closing are visible. Equal-time arrival misses the appropriate service window. Hidden changes precede same-time direct observation/crossing completion. Ended states stop activity and clear in-flight events.
- Immediate ridge is a serious primary-delivery baseline in every authored situation (14 minutes, two fares retained). The additional launch window makes the faster route useful without pretending the ridge cannot deliver.
- Reload/import/pause clear wall-time remainder; hidden world changes do not pause play; paid replies and visible completion/windows do.

## Body-isolation result

No actionable defect found in the reviewed causal claims or executable accounting.

The pooled arm calls the exact frozen `practice()` function and retains one current proficiency scalar per skill. The common host pays actual admitted exposure and resource/time costs; blocked/resource-refused work gets neither practice nor output. Both models earn expected output only on completed admitted jobs and debit a part at admission. Meal relief/debit requires an owned completed meal; interruptions preserve paid maintenance without relief. Retests are independent paid branches, not free washouts.

The equal-load hungry/fatigued 40-minute choices isolate a representational consequence: the same scalar state cannot distinguish opposite food/rest bottlenecks. Separate capacity admission and clipping remain intentional body differences. The report does not mistake them for a learning-curve difference or human-performance evidence. Forecast logit gaps and output differences are correctly decomposed. Boundary endpoint counts are explicitly limited to possible clipping involvement.

Reproduced all four CLI outputs under `/tmp/hf-next-review-body/` against the preserved freeze:

- development result SHA-256: `61dacf697a587d1d6b386b96aa559f47d1da237fa153ab1c04b821cd323f7781`
- reserved: `68272ed722ccf1cde326b1eb35df70a257c3d157fff695b54735c8905f4a6c4a`
- sensitivity: `5713da5f13ce062e2675f61043ccedef182f0c1195a0057b4f321ec3d5bc3b13`
- state: `16c5586423022eaa1f993333428267902df7c99c18fbc89697b1155289227500`

Then ran `artifacts/body-isolation/verify.mjs` with the regenerated output directory. It confirmed the same result objects, 15 current/frozen-source hashes, every frozen Human schedule/retest, 75 paired trajectories, 1,512 offered model commands, 108 paid retest branches and 1,389 endpoint task checks at matched admitted exposure. Maximum matched skill difference was zero; cumulative practice error 1.11e-16, logit decomposition residual 2.00e-15 and output decomposition residual 1.13e-14.

The registration `780d20d7f1aaa57f49c2ee1fde0d0042b28cd274` and implementation freeze `f8e146f6451d5649874f3f3637d4c1fd115604fa` are reachable, and their referenced sources verify on integrated main. Nominal 13/25 agreement and sensitivity 10/25, 12/25 are preserved. State measurements reproduce and do not pretend to measure human authoring effort or runtime speed.

## Limits of this pass

No browser visual/accessibility inspection; parent handles public UI/release integration. No claim of human playtest evidence. Private Signals comparison awaits completion/integration and needs its own matched-access/baseline check. Cap/provenance findings were sent promptly to the parent for author correction; this file records pre-fix findings, not a re-review of later fixes.

## Scoped fix and completed-comparison check — integrated `5055c9e`

Rechecked 2026-09-08 after the parent requested only the two original findings and the newly complete private Signals comparison. Did not reopen body isolation or expand host/browser scope.

### Original findings: resolved

1. **Replay cap:** reran the original rest/stop loop. It now refuses further elective commands after 94 cycles / 188 records, before continuation slots are spent. That state exports/imports and advances to minute 32 (189 records), then exports/imports again. Fifty additional rejected task requests at the cap leave continuation intact. A stronger pending-job test started from 186 records, admitted ridge, recorded a busy refusal to reach 188, paid one minute, exported/imported, interrupted, advanced one minute at a time to closing, and issued 100 terminal refusals. The final state has exactly 192 records, one paid ridge minute, a terminal outcome and a successful exact round-trip. The four reserved slots cover the supported continuation paths examined. New elective choices cease at the authored budget, but a valid generated state is no longer stranded without time/settlement.
2. **Journal source:** reran the shut-landing canal probe. The report remains `source: 'canal-lock', channel: 'direct'`; the journal now says `At the canal lock: closed, observed at 6; received at 6.` It contains no keeper-reply label for that experience.

All **32 Signals host/session/comparison tests passed**. This is a fix verification on the current generated-save contract, not a claim that previously unreleased 192-command dead-end exports retain backward compatibility across the edited host implementation.

### Private comparison: no actionable defect found

Inspected `scripts/signals-comparison.js`, `docs/signals-comparison-protocol.md`, `docs/signals-game.md`, the candidate's unchanged encoding/recall rules and all retained case summaries. Regenerated the evidence at `/tmp/hf-next-review-signals-comparison.json` and deep-compared the **entire JSON artifact**, including source hashes, protocol identity, decisions, exposures, checkpoint hashes, complete final states, summary and Node version, to `artifacts/signals/2026-09-08-comparison.json`: exact equality.

Canonical JSON SHA-256 of that complete reproduced object is `1861349fb103a3356fa2e6038c0b885179f8391890fdab2ec1a6099550454523`. Original protocol commit `1f8b2f886583a28cb6555d166f5ed6310738bed0` is reachable and its bytes match current protocol SHA-256 `30c5d88a3786bf83dea20cf2c0463b2afb4c367c671be0bf2e4083cdaeab72c5`.

- All 36 matched case-arms have equal paid predecision time, delivered receipts, resource ownership, person view and offered travel actions within each case.
- The controller accepts only the provider's report; its rule is open → canal, otherwise ridge. Hidden landing is read afterward only for the oracle agreement diagnostic. The same paid ridge fallback applies after an actual failed canal attempt. No provider receives free observation, recovery or world truth.
- The no-retention arm uses current-minute **delivery**, which may describe an old observation. That is the preregistered rule, not accidental receipt/observation-time substitution.
- The candidate is unchanged and replaces an entry by receipt for the same cue; the notebook uses observation time. The retained late-old-reply failure is faithfully produced by that difference. Lifetime 60 cannot expire anything in a 32-minute episode.
- All uninterrupted/resumed result objects match exactly. Host and candidate are round-tripped after each request and one-minute advance; shared adapter receipt/current-delivery state is included in the checkpoint hash. The implementation does not claim an independently portable serialized controller/adapter package.
- Immediate ridge completes all four primary deliveries at minute 14 without fares or charges; separate canal baselines preserve successful primary delivery via the common paid ridge fallback, two early launches and two failed crossings. They are correctly separated from the matched-exposure matrix.
- Reproduced notebook/candidate/none counts are 11/10/10 lens deliveries, 2/2/1 launches and 1/2/1 failed crossings; peak provider-data sizes are 143/257/4 bytes. Exclusions and additional candidate validation duties are stated, so these bytes are not misrepresented as total implementation or authoring cost.

The evidence supports only these authored cases and the timestamp-retention distinction. One cue leaves candidate capacity untested, and lifetime exceeds the entire episode; neither capacity nor expiry earns a general claim here. The documentation appropriately keeps human memory validity, enjoyment, authoring usefulness and broad MVP graduation open. No outstanding blocker remains from this scoped review.

## Additive profile revision check — `fd50f8b` plus root setup-error fix

Scoped source/executable review on 2026-09-08 of `clear`, `tired` and `hungry` profiles, malformed receipt/setup handling, original-result preservation and the previous replay-budget boundary. Parent owns the pending profile UI/play-note integration and comprehensive browser/release QA. No body-isolation re-review was performed.

**No actionable defect found in this scope.** All **41 Signals tests pass** on Node 26.8.1, including the new profile routes and root's invalid-setup regression.

Original-result preservation: `runComparison()` still matches every retained field exactly: all twelve cases, decisions, available actions, exposure records, checkpoint hashes, final states, separate four-situation baselines and summary. The original four situation states and radio timing remain unchanged. The added-profile runner verifies the retained original artifact plus reachable amendment commit `e2c9ce7` before generating evidence.

Regenerated `/tmp/hf-next-review-signals-profile-routes.json`. Every field matches `artifacts/signals/2026-09-08-profile-routes.json` except the `src/games/signals.js` source hash, which correctly differs because the root's setup-error fix is currently an additional working-tree change. All route results, trace views, saved-state hashes, resume checks, amendment identity, original-artifact hash and preservation flags match exactly. SHA-256 of the complete `runs` array is `9a8b9fcd9e63523d21fdab810af796f152f5f451414205241ea69df66c114c85`. This is behavioral equality with transparent source-provenance drift, not a claim of byte-identical current source to the earlier profile evidence.

Verified mechanisms:

- Clear connection charges one radio charge on paid request completion at minute 1, samples then, delivers at minute 3 and supports canal arrival at minute 9 with the launch sailing. The faster blind canal arrival at 6 is preserved and disclosed; paid radio is feasible, not necessary.
- Tired ridge refusal changes neither time, person nor resources. Four paid rest minutes permit ridge arrival at 18; the lighter canal can deliver at 6. The four-minute rest route is a supported complete-rest example, not a proven minimum recovery interval.
- Hungry exertion refuses. Rest leaves hunger at its ceiling. A two-minute interrupted meal retains paid maintenance, consumes no meal and grants no hunger relief. The completed three-minute owned meal consumes exactly one meal and enables canal arrival at 9 or ridge arrival at 17. The retained rest/interrupted-meal path spends four rest and five total meal minutes, reaching the canal destination at 15 and missing the launch.
- Negative projected capacity for new profiles is labeled `CAPACITY_ESTIMATE` and remains tryable; actual execution still uses actual body and returns a real `CAPACITY` refusal. Budget, busy and resource restrictions are not overridden by the estimate exception.
- For each new profile, an isolated hidden-field projection probe changed landing truth and then an in-flight value before delivery while keeping visible state fixed. Both actor view and next-visible-event time remained equal. Profile text/delay/condition is exposed, but hidden landing truth is not projected into the view.
- Repeated the stronger budget probe independently for all three profiles: 186 zero-time records, an accepted rest plus busy refusal to reach 188, one paid minute, JSON import, interruption, advancement to closing and 100 terminal refusals. Each ends at minute 32 with exactly 192 records and one paid rest minute, and exports/imports exactly. No profile capacity estimate makes capped choices available again.
- `receiveReceipt` rejects null/malformed envelopes with `INVALID_RECEIPT` before mutation. Root's `createSignals` setup fix rejects null/scalar/array/extra-field envelopes with `INVALID_COMMAND`. Existing valid early/stale receipt regressions remain passing.

`git diff --exit-code ac4e544` is clean for Human 0.1.1, core model, runtime, clock and runtime release lock. The change remains host-owned and additive before initial Signals release. No new blocker remains from this scoped profile review.
