# Independent continuous-work lifecycle and evidence review

Reviewed branch head: `811bc5c7d3e387d0a49d524bad1e0bf5b148e2eb`.
Host SHA256: `13a804beeed7a96ddef89966f6925d1de4e6f23e75e972b4730c8634b6215454`.
Scope: private 240-minute / 512-command continuation, idle and assembly legacy imports only. No demand for gathering, a public UI, or a complete public-host replacement.

## Finding awaiting correction

**P2: reject oversized JSON before exponential traversal** — `src/experiments/continuous-work/host.js:227-243`.

`json()` checks the serialized size only after recursively visiting every value and calling `JSON.stringify`. Its ancestor-only set permits repeated references. A tiny acyclic object graph created with `let value={x:'a'}; for(let i=0;i<26;i++) value={left:value,right:value}` has 27 objects, stays below the depth limit, and makes `restoreContinuation(value)` exceed a 2.5-second child-process timeout on Node 26 and Node 22. Depth 22 costs approximately 1.57 seconds on Node 26 before size rejection. Depth 30 is still allowed by the depth guard and expands much further. An incremental node/byte budget or early repeated-reference rejection should stop this work before serialization. Retain the final serialized-size check for the accepted normal input path.

Reproduction: `json-budget.mjs`; runtime evidence: `json-budget-node22.log` and the root conversation tool output for Node 26. This is a boundary/input-cost issue, not an effort or material-conservation counterexample.

## Independent checks completed

- `probe.mjs`: seven grouped probes passed on Node 26.8.1 and Node 22.0.0, including 76 admitted capacity cases, alternating accepted handovers, actor-specific practice/effort, reservations and interrupted meals, improvement while stopped, saturated hunger receipts, finite Next Event through the 240-minute endpoint, and eight authoritative-state tamper rejections. Probe outputs are identical between Node versions after timing/version metadata is removed.
- The four improvement/recovery arms start from an independently rebuilt legal prelude and the identical exported physical source snapshot. Completion times are 207/207/202/202; equal active-idle wall time and effort give equal end bodies to floating-point tolerance. No retrospective body/practice rewrite was observed.
- `commands.mjs`: six budget-exhaustion sequences exercise stopping first, advancing first and completing naturally with an active work assignment or meal. Accepted states remained exportable/restorable and retained the ability to stop or reach minute 240. Failed new commands left input state unchanged.
- All 25 existing lane tests pass on both Node versions. Complete logs: `scope-node26.log`, `scope-node22.log`.
- `audit.mjs` verifies all 80 payload hashes across the two preserved source-b7c3dd0 runs and two fresh source-811bc5c runs. All 12 recorded source hashes match each cited commit and current source. The four physical reports are identical after removal of environment/source-head metadata. This confirms the comparison follows identical source/physical cases; it is not independent human validation.
- New artifacts were written only under `/tmp/hf-continuous-work-review-lifecycle/`. No source edits, commits, pushes or deployments were performed by this reviewer.

Initial independent probe correction: a strict equality assertion compared equal analytical fatigue values differing by about 6e-16 from floating-point addition order. It was replaced with the stated 1e-10 numerical tolerance; this was a reviewer assertion issue, not a product finding.

Status: lifecycle and evidence checks passed within the declared private scope; the JSON traversal bound needs the noted correction and independent rerun before this review is clear.


## Corrective re-review — source 76b7ffe

The original review above is preserved. Its P2 JSON traversal finding is **resolved** at root commit `76b7ffe89f9268d239ca8e361a0429939d38e6b6`. The reviewed host SHA256 is `266ff107dc18c3477acf30ac77446e41fde7d299294101da43c7a98d85f28e37`; complete updated source hashes are recorded in `correction-76b7ffe/corrective-verdict.json` and its manifest.

The new traversal debits exact serialized character costs while visiting the tree, and rejects shared object identities before expansion. The original depth-26 timeout case rejects in approximately 0.15 ms on Node 26; the stronger depth-30 case rejects in 0.23–0.28 ms on Node 26 and Node 22. An independently authored 50,000-key oversized object rejects in approximately 5–6 ms. Neither subprocess approaches the 2.5-second bound.

Both Node 26.8.1 and minimum Node 22.0.0 passed all 26 scope tests, seven independent lifecycle probe groups, six command-exhaustion sequences and 23 JSON boundary checks. Exact-limit strings and objects, escaped/control/surrogate characters, null-prototype objects, nesting limits, repeated references/cycles and uninvoked getters were checked using the exact committed validator body. Fifteen historical JSON continuation saves restore and re-export exactly; five further paid minutes produce the same state under the original and corrected hosts. The prior physical/lifecycle probe results and all six command-budget cases remain identical. The frozen original host, both Human versions, runtime, clock, model and release-lock hashes are unchanged.

No additional actionable finding was identified within the private bounded continuation scope. This closes the input-bound review; it does not make a public-host migration or deployment claim. All correction probes, runtime logs and manifests remain under `/tmp/hf-continuous-work-review-lifecycle/correction-76b7ffe/`. The reviewer made no repository edits.
