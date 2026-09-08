# Final narrow guard confirmation

**Confirmed: no new finding.** Inspected the single `startJob(rest)` guard introduced at `11f5420`. Automatic recovery rejects this unadvertised request before recording a message; active-idle recovery remains selectable without advancing time and stays immediately preemptible by work. Rejected automatic and busy active-idle calls preserve the caller exactly.

Final `src/games/camp.js` SHA256: `a695c31258b8bc5339a20cd49f238e5a8f7fa1bed52c1cf2c0706822f804c078`. Observed HEAD: `02af6d230fc36fb160ab333d1965e0284072b646`. Actual kernel bytes have no diff from `11f5420`; compared with the previously reviewed `5852de534435378394b0438d69101307d0387198a31e5b6b84d75c092b76ef7c`, the only change is this recovery-mode guard.

Three newly authored narrow tests pass **3/3 on Node26.8.1 and 3/3 on minimum Node22.0.0**: automatic-mode rejection/input immutability; selectable active-idle recovery with zero-time/detached state and subsequent paid recovery/work; busy active-idle rejection/input immutability. No broad reruns were performed for this guard. Script: `/tmp/hf-camp-kernel-review-final-guard.mjs`. Raw outputs: `/tmp/hf-camp-kernel-review-final-guard-node26.txt` and `/tmp/hf-camp-kernel-review-final-guard-node22.txt`.

Earlier review stages and their exact scopes remain below; their broader results are not represented as full reruns of this final hash.

---

# Independent camp kernel review — fixed-source recheck

**Disposition: no unresolved finding in reviewed kernel scope.** The one P2 readiness finding from the initial source is fixed and independently re-executed.

## Exact subject

- Actual integrated tree: `/Users/abdul/code/human-framework`.
- Observed HEAD: `9d25ace2dfd42bca2f6350b9a3740b8205bab3ea`.
- Readiness implementation: `01afcab4fdf87dc7fe9fceb3891d046339289db6`.
- `src/games/camp.js` SHA256: `5852de534435378394b0438d69101307d0387198a31e5b6b84d75c092b76ef7c`.
- Initial kernel source was `ccb71f95881382cb7a2e90ad03da994bc92e191526f695ac746db02d9cbabb47` at worktree head `8defa5a55d7e1102b33ad496c586643a2486163c`, implementation `ffe8fb4`.
- Directly inspected diff: three lines added to `nextStop` record currently blocked player choices only while the player is free and recovering, then stop when one becomes available. No kernel physics or migration source changed in this patch.
- `commons.js`, released Human0.1.0/0.1.1, model, clock and runtime hashes remain exactly those in the before report; the frozen release lock sources remain unchanged.

## Independent recheck

`/tmp/hf-camp-kernel-review-probes.mjs`, targeting the actual root tree with `HF_CAMP_KERNEL_REVIEW_ROOT`, passes **20/20 tests on both Node26.8.1 and minimum Node22.0.0**.

The original four-gather scenario now pauses at minute77 for player timber readiness instead of96. Selected active-idle recovery gives the same result; unselected active-idle retains the expected96 completion. Repeated Next Event calls stop selectively at77,79,80,81 as timber, salvage, garden and shelter regain actual capacity. A busy solo timber assignment keeps its actual minute16 completion, so the fix does not add one-minute polling while assigned.

All earlier targeted lifecycle cases rerun successfully: paid fatigue/practice/effort, durable partial assembly,250 stop/resume cycles, both handover directions/refusal, independent meals through release, canceled food/gather ownership, prospective versus snapshot effects, fixed/assembly simultaneous completions, actual rounded-boundary availability, mixed legacy migration, strict JSON validation, malformed receipt/resource/practice rejection, and finite world-limit continuation/export.

Raw outputs:

- `/tmp/hf-camp-kernel-review-probes-root-node26.txt`
- `/tmp/hf-camp-kernel-review-probes-root-node22.txt`

The broader initial-source execution remains separately bound to the initial hash: both runtimes passed4000 randomized transitions,4800 mixed-job imports,112 chunk pairs,19981 advertised-action executions, a20000-minute/454-cache campaign with maximum full-game JSON7115 characters, and428 additional earned legacy-cache imports. Those broad runs were not represented as full reruns of the patched source; the three-line patch received the specific source review and20-test recheck above. Their reports and initial failure outputs remain retained in `/tmp/hf-camp-kernel-review-report-before.md` and its linked artifacts.

## Scope and limits

This was an independent executed software review of the full camp host, original-host migration and released runtime dependencies. It did not inspect author tests as a substitute for executing independent cases. Story wrapper/source journals and browser/UI are separately assigned reviews. No complete historical authentication, empirical human validity, generic faculty promotion, physical-device performance, or exhaustive mathematical proof is claimed. No original control or frozen source was modified. This reviewer changed only `/tmp/hf-camp-kernel-review*` files and performed no commit, push or deployment.
