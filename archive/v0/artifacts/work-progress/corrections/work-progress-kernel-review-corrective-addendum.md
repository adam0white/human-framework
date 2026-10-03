# Corrective addendum: independent work-progress kernel review

Reviewed 2026-09-08, Node v26.8.1, current shared WORK_VERSION `0.1.1`, host version `0.1.0`. HEAD remained `563cc95c524a6e1299d810ca95abf397ae0d3423`; the corrective source was therefore identified by its exact working-source hashes, not attributed to that earlier commit.

## Disposition

The five original counterexamples covering F1/F2/F3 now all reject on the corrected physical accounting invariants. None rejects because of an incompatible old work version. Eight independent legal controls pass, including completed multiworker final partials and late tool/no-tool starts. Two additional malformed states isolate and exercise the new terminal-exposure check. No new concrete defect was found within this corrective scope.

This closes the demonstrated counterexamples on the source hashes below. It is not a full-history authentication, exhaustive validator correctness or promotion verdict.

## Exact original-probe rerun

Command:

```sh
node /tmp/work-progress-kernel-probes.mjs > /tmp/work-progress-kernel-corrective-original-probes.json
```

The original probe source is byte-identical to the initial review. It builds every input from the currently imported `createWork` / `createWorld`, exports the constructed state and changes only its specified physical/accounting fields; it does not hard-code WORK_VERSION `0.1.0`. The current constructors emit work version `0.1.1`. Stack traces show rejection at the physical checks, after version validation.

| Original probe | Observed current rejection | Corrective check |
|---|---|---|
| component_multiple_final_partial_minutes | `Inconsistent total work progress` | candidate.js:38, total paid minutes greater than maximum paid-worker basis |
| component_single_extra_minute_after_completion | `Inconsistent total work progress` | candidate.js:38, same bound |
| host_fabricated_final_minute_and_practice | `Inconsistent total work progress` | candidate.js:38, reached through host component restore |
| host_progress_without_any_productivity_change | `Item rate or completion chronology contradicts paid work/tool availability` | camp-candidate.js:87, host-specific rate feasibility |
| host_completion_before_paid_work_can_fit | `Item rate or completion chronology contradicts paid work/tool availability` | camp-candidate.js:87, item paid minutes cannot exceed completedAt |

Exact stack traces are retained in `/tmp/work-progress-kernel-corrective-original-probes.json`. The former accepted-results file `/tmp/work-progress-kernel-probes.json` and original report were not overwritten.

## Independent legal controls

Command:

```sh
node /tmp/work-progress-kernel-corrective-probes.mjs > /tmp/work-progress-kernel-corrective-probes.json
```

All eight probes pass. Each shared transition and each host command/advance is JSON-exported/restored and compared exactly with its original current state. Version `0.1.1` is asserted in those exported item records. Shared completions also settle, round-trip as settled state, and return no duplicate completion from a second current-state settlement.

| Legal control | Observed result |
|---|---|
| Exact one-minute completion, with a second prepared but unused contributor | 1 paid transition, unused contributor retains zero credit |
| A basis20 pays once, B basis18 completes the item | 19 transitions; final B fraction `0.005555555555555314` |
| A basis7 pays2, B basis11 pays3, returning A pays4 | 9 transitions; final A fraction `0.012987012987013102` |
| A basis13 pays2 without reduction; B basis17 pays5 with reduction5; A pays3 with reduction8 | 10 transitions; final A fraction `0.029487179487179604` |
| Tool delivered at1; A first starts at17 | Completes at31 with14 construction minutes |
| No tool; B first starts at7 | Completes at25 with18 construction minutes |
| Tool fixture: A works slow minute1, stops, resumes at7, hands over to B at8 | Completes at19; A pays2/B pays11; legal positive final partial retained |
| A is prepared and stopped at0 before any exposure; tool arrives; B starts at5 | Completes at17; A retains0/B pays12 construction minutes |

These controls execute 39 shared paid transitions and 92 host world minutes in total, without a full matrix or broad fuzz loop.

## Isolated terminal-exposure checks

The five original rejections exercise the new total bound and host checks, so they alone do not prove the new terminal-possibility branch runs. Two additional inputs deliberately stay below the total-minute bound:

- Both use A basis4/minutes2 and B basis10/minutes6, floor1, completed progress1 and item effort .2. Total paid8 is below maximum paid basis10.
- `two_positive_terminal_deficits`: A fraction .45 and B fraction .55. Both workers require a partial final exposure, although only one item-completing exposure can exist.
- `zero_physical_terminal_exposure`: A fraction .5 and B fraction .5. B's claimed sixth exposure contributes zero beyond the five full minimum-rate exposures; the other worker cannot be a valid terminal candidate either.

Both now reject with the exact error `Work cannot have multiple or zero-work terminal exposures` at the new component terminal check. Both caller snapshots remain byte-identical after rejection. Probe source/results: `/tmp/work-progress-kernel-corrective-terminal-probes.mjs` and `/tmp/work-progress-kernel-corrective-terminal-probes.json`.

## Limits

Only the requested corrective source and its directly related behavior were checked. No repository source was edited, no old full matrices or independent repair-consumer files were accessed, and no external model or additional agent was used. The focused author suite was not rerun in this addendum; its earlier 21-pass result belongs to the original source and is not being presented as current-version verification. These new independent probes ran only on Node26, not minimum Node22.

The corrected component checks necessary continuous fraction/exposure bounds, not the complete discrete set of all possible productivity histories. The host checks necessary per-item rate/chronology possibilities for the single known tool event; it does not authenticate exact prior command timing, global cross-item history, arbitrary rewritten fatigue or the separately documented historical skill-basis choice. No broader assurance is inferred from these successful repairs.

## Exact SHA-256 identities

| File | SHA-256 |
|---|---|
| src/experiments/work-progress/candidate.js | 43f0093f118e98ce58bdf269d3bddd5cba7a83ce80d3ba82b1bb6e2b5193940b |
| src/experiments/work-progress/camp-candidate.js | 1afc75b9f9a0d3dd11ef172cd5b493ad9e2991404003793bd4627755e21cd269 |
| tests/work-progress-candidate.test.js, identity only in this addendum | 61abf1571a0c0fd43b53ecf7c78c9eb4fa9b5ab7280216f85026916b18cae33b |
| docs/work-progress-api.md, identity only in this addendum | b9a4d420b58ec0cd2b54c05e9a115a1ecc5faf366f0c3f9a584c71ab0c6ea953 |
| src/runtime/index.js | e685a514993fc0e32a84cad54d4a2a23287525e1d9923b4ee479b4cf3421ed7f |
| src/human/v0.1.1.js | 516c5898b7352847f87abfa34b3a010a19d3461d82d81b398bba252bc9598b00 |
| src/core/model.js | 1bf30267083e8e2617fe9964d4654d8da158cba309909ace7bb50c1e6de29c59 |
| /tmp/work-progress-kernel-probes.mjs, preserved original | 5beecba530697fc02f0c73b6f957792bdffd5ee2ff7dc698dea165581dfa8889 |
| /tmp/work-progress-kernel-probes.json, preserved original | c5f0cd620e6994ffdfd3c8a7c3704398874ce00697af021397248cef3ec8e31d |
| /tmp/work-progress-kernel-corrective-original-probes.json | dfbb98ec0ffb6484b085fd06d674e5727d228ee2dc029736581ada5af1f1c3a5 |
| /tmp/work-progress-kernel-corrective-probes.mjs | be6490b436c7535151f2ccfc54a4fd36f3f1de5a7beb63f75cdb358c7e2aef24 |
| /tmp/work-progress-kernel-corrective-probes.json | fce27200efaf846ea4ca2acbd138d7f7a84cdd282c060f40d6e884ba155f54a5 |
| /tmp/work-progress-kernel-corrective-terminal-probes.mjs | eed1cd34f4004548c3513c639b5240dbc91c4c80dadce840eb4f262b7e65f6b2 |
| /tmp/work-progress-kernel-corrective-terminal-probes.json | 0b322890431f454ac128786c0b4ef9d9ac3b04c6b84a22d3acc3aad7dab898b8 |
