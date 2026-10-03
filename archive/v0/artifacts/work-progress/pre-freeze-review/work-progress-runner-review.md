# Paid-work runner and cases review

Verdict: no unresolved finding in this bounded runner/cases review after the final source-specific corrections. Ready for the first frozen comparison; this is not a verdict on the candidate, direct/fixed hosts, their transitive dependencies, or eventual comparison outcomes.

Scope: read-only review of scripts/work-progress-comparison.js and src/experiments/work-progress/cases.js against the amended execution contract. No candidate/rival implementation was read, imported or executed. No real comparison matrix, other agent, external review, commit or main-tree edit was performed. Tests used tiny intentionally invalid API doubles or extracted exact runner control-flow blocks, clearly labeled as such.

## Cases and chronology

The eight scripts match the amended contract. D/candidate expectations remain 20,15,23,15,19,20,20,both20. Fixed expectations are 20,20,23,20,20,18,20,both20. No expected time or case was changed to fix the runner.

Setup and command inputs are cloned before APIs receive them. The driver clamps to intervening commands, minute1 restoration and minute40. Restoration happens after advancing to minute1 and before that minute's scripted commands; same-time H4 stop/resume stays ordered. The corrected runner asserts commands pay zero time, checks authoritative and observed JSON round-trip identity, retains detached observations/snapshots, and compares complete candidate/D observation streams for matching drivers plus synchronized initial/command/final checkpoints across drivers/restoration.

## Findings corrected before execution

- Failure files ended with a literal backslash-n, making decompressed JSON unparsable. The writer now appends an actual newline.
- Post-history candidate/D or driver/restore mismatches had no evidence catch. They now preserve the freeze and complete runs. The analogous replay mismatch now retains expected and newly reproduced runs.
- Invalid NaN/Infinity state could pass accounting and canonicalize to null. Observations/exports now require finite plain JSON; Human records are restored through the actual validator, with paid minutes, task ownership, effort, practice, hunger and person clocks/counters checked. Unsafe current exports become a diagnostic alongside prior valid records.
- A start command that advanced from minute0 to1 could pass H1. It now rejects with failure evidence.
- API-owned reusable observation objects overwrote earlier parity checkpoints. Checkpoints and final observations are now detached.
- Freeze creation could reference changing HEAD values, and verification ignored the declared commit. One commit is now pinned before hashing and every declared source must match both working bytes and that Git object.
- A sparse array with an extra named property evaded the new JSON guard and had different canonical/serialized values. Exact numeric index presence now rejects it.

## Verification

The initial tiny H1 doubles reproduced accepted nonfinite person state and a clock-charging start. A separate reusable-view double showed initial saved observation at0 while initial/command parity checkpoints had incorrectly become40.

On corrected source 8c9ac79, three focused probes passed: nonfinite person and time-charging command reject with evidence, and reused observation checkpoints remain0. Extracted actual comparison-catch and CLI failure-handler source was then tested without a matrix: mismatch evidence retained all supplied test runs; the written gzip parsed as JSON and ended in an actual newline; wx retained an existing failure artifact; an unsafe BigInt export left two prior valid records and a serializable diagnostic.

On final source 4d13e88, only its two changes were rechecked: sparse-plus-extra arrays reject while dense arrays serialize faithfully, and the actual replay function source retains both expected/current evidence on mismatch. JavaScript syntax check passed. Earlier tests were not redundantly rerun.

Evidence:
- /tmp/work-progress-runner-probe.json and /tmp/work-progress-checkpoint-alias-probe.json: first reproductions.
- /tmp/work-progress-runner-recheck.json: three corrected gate checks.
- /tmp/work-progress-runner-failure-probe-result.json: isolated actual failure-handler/catch tests, including artifact path.
- /tmp/work-progress-runner-final-delta.json: final two checks.

## Source identity and limits

Initial runner at 3b79192: d7ecf30783d93930f2388e20737f45b0ba14a5707e730deabca72618419dd03f; archived as /tmp/work-progress-runner-initial-source.js. Corrected runner at 8c9ac79: 43f6ac872d3010a95d61d2a05efc5db7c2483bd6581e1f94b9d8021b3ce40320. Final runner at 4d13e88: 3ad57faa06e6f9becc0bfc09631f3746250491cf1aa17530e7296cacf6494f67. Cases stayed 43c97e2383d50619f5335bfca9b15f7d38c483eba1665ce7017f3db6dff50ef5.

Source-freeze logic was inspected; an actual freeze was intentionally not executed because it reads the still-out-of-scope implementations. Completeness of their declared import closure, physical payment/capacity/lifecycle behavior and the actual frozen matrix remain separate checks. Agreement and selected accounting invariants do not alone prove both implementations physically correct.
