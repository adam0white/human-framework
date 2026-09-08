# Independent Across player / receiver review

Original target: commit `4f46243681ea6e0edf5173ca16e5e5548b88632e`, player 0.1.0, receiver 0.1.0, host 0.2.0. Scope: player facade, adaptive receiver policy, and player contract. Host/runtime sources were inspected only as required dependencies. Current UI files, comparison outcomes, historical broad matrices, browser/deployment behavior, and external tools were outside scope. Reviewer made no repository edits and loaded no user exports.

The eight-file static import graph including the contract was copied from Git **before probes**. Every original workspace hash matched the commit. The frozen copy remains unchanged. Root concurrently patched the receiver and contract after the original probes and before the final workspace hash check; `after-manifest.json` records those two mismatches explicitly. The other six graph files remained unchanged. An initial strict workspace-unchanged assertion caught this concurrent edit; it was replaced with the explicit original/frozen/current comparison, not concealed as a clean workspace check.

## P2 — receiver repeatedly interrupts its own required meal

Original location: `src/games/across-cut-receiver.js:57–64`, especially the generic held-job Stop at line 63. The meal begins in the capacity fallback helper at line 29. This violates the selected policy's paid two-minute meal behavior and prevents a timely fallback in a supported legal setup.

```js
{inletMinutes:14, launchAt:15,
 bodies:{receiver:{fatigue:0.15,hunger:0.972}}}
```

Use the real player facade, leave the keeper available, and advance one paid minute at a time. Receiver inspection runs 0–1 and its initial report runs 1–2. Hunger then rounds to 1, so cart admission needs a meal. At 2 it starts eating. At 3, the pipe remains impossible and cart capacity is still insufficient, so line 63 stops the held meal after one minute. This repeats at 4/5, 6/7, 8/9, and 10/11. At 11 no timely cart remains, and it stops permanently.

Original outcome: **0 service units, 5 paid meal minutes, 0 meals consumed, 0 paid cart minutes**, with the uneaten meal back in inventory. The recipe restores the failure exactly. This is a lifecycle/liveness defect, not an information leak or conservation defect.

Same-world valid counterpart: use the identical real host after its unchanged initial report at 2, start the same meal and allow both paid minutes through 4, then ask the unchanged frozen receiver for its decision. It chooses cart, delivering **1 unit at 9** and returning at 14, with **2 paid meal minutes and 10 paid cart minutes**. Only completion of the already selected meal differs; physics, body, deadline, source and inventory remain identical. Nearby legal hunger .970 and .976 controls also deliver 1 unit with the frozen driver; the latter eats before inspection and completes that meal under the earlier inspection branch.

Original evidence: `meal-livelock.json`, `meal-counterpart.json`, `hunger-cart.jsonl`, and `probes.mjs`. These are synthetic reviewer-authored worlds, not user histories or revised comparison outcomes.

## Corrective disposition

Root added a held-meal guard before pipe-impossibility handling and explicitly versioned the receiver to **0.1.1**. Independently rechecked receiver SHA-256:

`146b4b94d9ba37dae8f4e31550cbf7c1eb84c644120daedd985c060f8d63d8ce`

The driver remains byte-identical to the original. The corrective graph was copied separately into `corrected/` before the narrow recheck. `narrow-recheck.mjs` uses the **exact original setup** and verifies a meal consumed at 4, cart delivery of 1 unit at 9, return at 14, 2 paid meal minutes, 10 paid cart minutes, plus exact mid-meal and final recipe restoration. All assertions pass. `corrective-results.json` preserves the trace and outcome. Finding is resolved in this rechecked receiver source; original failing source and outcomes remain attributable. No broad comparison rerun or policy/world retuning occurred in this review.

## Original bounded probes

All 11 independently authored probes in `probes.mjs` passed as reproduction assertions. The first passing probe establishes the defect, **not product correctness**. Machine-readable results include the executing Node version in `results.json`.

1. Exact cart/meal interruption counterexample and recipe restoration.
2. Same-world lawful meal-completion counterpart and unchanged cart decision.
3. Neighbor hunger controls .970 and .976.
4. Actual minute-4 receipt during walking preserves the held task; repeated reads and restore stay inert; Stop keeps paid position while Continue reaches the dock at 6.
5. Multiple same-minute keeper controls preserve the receiver decision frame, paid inspection and view against a no-control counterpart.
6. Hidden launch/inlet twins with lost initial reports preserve complete keeper views and Continue stops at minutes 1 and 30 despite different private outcomes.
7. Real first-hop progress reports distinguish an equality bound (source minute 5, earliest arrival 15; no cart) from a strictly late bound (source minute 6, earliest arrival 16; cart).
8. A completed-progress snapshot received at 10 does not fabricate a late upstream bound or cart switch.
9. Every advertised available choice is admitted in eight targeted observations around fatigue/hunger rounding boundaries .9749/.9751.
10. Accessors reject without execution; sparse arrays, injected receiver state, shared exponential expansion and copied handles reject; nested handles stay frozen; valid recipes stay unchanged and restore exactly.
11. Exactly 128 keeper controls plus 30 positive advances fit the 158-command recipe bound and restore; horizon advances return the same handle without appending commands.

Reproduce originals with `node /tmp/across-driver-review/probes.mjs`; reproduce correction with `node /tmp/across-driver-review/narrow-recheck.mjs`.

## Limits

This is targeted independent source review and execution, not exhaustive verification or a full-suite run. The small capacity sample does not establish all estimate boundaries. The original direct-host counterpart is a lawful alternate control sequence, distinct from the subsequently corrected facade. Human usefulness, calibrated policy quality, browser/UI layout, accessibility, public asset privacy, deployment identity and comparison rankings were not evaluated. No additional actionable player/receiver finding was reproduced. Root owns the release decision.
