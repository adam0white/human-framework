# Valley R1 independent evidence gates

Remaining: human-cadence reproduction before causal timing/hold claims; canonical integration, source delivery and retest. This is an evidence audit, not game completion or a blind coding result. No blind output or mapping was read.

## Confirmed

The exact source list in `make-blind-valley-r1.py` contains 31 completed report-ready records: 30 Valley records and one external control. Thirty Valley records comprise 28 panel arms across 14 testers plus the original unmatched Maya free and original Jonas TOOL record. They are not 30 valid paired arms. All original report and raw-log public copies match their source SHA-256. All 89 HF ask rows are unique, continuous F-1095 through F-1183. Their report hashes, literal quote hashes and occurrence in the source report pass. The external control adds zero HF reports or asks.

All 30 Valley final native receipts pass: full inert equality, loaded inequality with source-explained queue delta 7→0, all checkpoint comparisons, exact prepared snapshot, clean matching before/after build `dab2d1eceb56df07e6b636237ce4d9fda68fd3ee`, API block and post-run release match. Harness IDs, local UUIDs and actual player/session/run identity hashes are unique across records (control has only a harness ID). Final PASS is distinct from proof of the original launch receipt bytes.

All 14 paired testers have returned-image tool events and successful real-browser taps at both 360x690 and 1280x800 across their arms. Screenshot operations alone were not counted as viewing. Image file names were joined to shot operations and their current viewport. An image file used at ambiguous sizes was not assigned a size. Ten individual target records do not cover both sizes; early free stops explain these omissions. The harness requirement is per tester, and it passes across each pair. Phone viewport keyboard hold is keyboard input and does not establish touch fidelity.

All 31 measured stops satisfy their assigned floor: sixteen records have a zero-minute free floor; fifteen have a fifteen-minute continued floor, including the external control. A continued stop after 900 seconds does not show voluntary retention for fifteen minutes. Whole-diary wishes still require separate blind coding. This audit does not infer enjoyment from absence of a wish.

## Exclusions and provenance

`hf3-valley-r1/rosa-free/wall-clock.jsonl` records the second-reread wish at 70.569 seconds and stop at 78.304 seconds. Her brief imposed that rule. The public ask map correctly marks F-1104–F-1106 forced, disposition `-`, excluded natural retention/taste. Rosa continued is a separate post-floor record; its initial forced-probe wish is not a natural quitting event. Do not label the pair a natural free-versus-continued retention comparison.

`hf3-valley-r1/jonas-free/wall-clock.jsonl` ends TOOL at 307.979 seconds. F-1110–F-1112 correctly retain technical provenance and disposition `-`, excluded paired/natural taste/retention. Original `hf3-valley-r1/maya-free` is unmatched qualitative. Interrupted original Maya continued and Emre arms are not in the 31-record coding packet. The 14-pair panel contains Rosa's forced arm; therefore 14 pairs is not 14 natural retention comparisons.

Replacement histories are exact: original Maya free report, original Emre interrupted free raw log, original Jonas TOOL report. Each source appears verbatim in both of its hold-tail dispatched briefs. Continuity sections match across arms after normalizing only the driver port. Both arms explicitly declare return exposure. The structured receipt records source hashes. This validates supplied history, not the models' subjective independence or every possible unrecorded access.

## Limits that remain

Only original Maya free, Nia free and Nia continued retain at-launch admission copies whose hashes match the supervisor. The other 27 Valley records lack `valley-session-admission-at-launch.json`. Their final native PASS receipts exist, but their historical launch-byte hash cannot be independently revalidated. `stage-matched.py` deliberately skips the launch-byte check when this copy is absent. This is an evidence retention gap, not proof that admission failed. Exact affected paths and null `launch_hash` values are in `valley-r1-evidence-gates.json`.

Human-cadence 1–3-second reproduction of timing/hold claims remains unrun in this audit. Model decision gaps and keyboard hold support do not establish a game timing defect or physical touch behavior. `valley-retest-preconditions.md` expressly preserves this gate. Preserve asks as requests, rather than validated causal defects. Do not change rates, difficulty or quantities from model delays alone.

The private `STATUS` and leading `report.md` snapshot were stale when read: the report still said 27 reports/81 asks and reserved through F-1184. The current public maps establish 30/89 through F-1183. This audit did not edit coordinator state.

## External control staging

The control has neither `panel-plan.json` nor Valley native admission, so `stage-matched.py` is unsuitable. A standalone explicit-allowlist script stages original report/raw/image-event metadata in `public/docs/lab/reviews/hf3-valley-2026-10-26-control`. The stage receipt records exact hashes and byte counts. It generates sanitized session metadata, keeps the original source untouched, and adds no HF ask IDs. The control reaches 916.976 seconds and has actual images/taps at both sizes. No immutable third-party build identity was established. Never attach Valley's HF commit/native fixture to A Dark Room.

## Per-record evidence

Paths below are relative to B. Both-size means images plus successful taps within this individual record. Per-tester coverage is confirmed separately above.

| Source                                           | Stop seconds | Formal reason | Both sizes | Floor |
| ------------------------------------------------ | -----------: | ------------- | ---------- | ----- |
| `hf3-valley-r1/maya-free`                        |      306.022 | BORED         | no         | pass  |
| `hf3-valley-r1/nia-free`                         |      241.069 | BORED         | no         | pass  |
| `hf3-valley-r1/nia-continued`                    |      916.568 | BORED         | yes        | pass  |
| `hf3-valley-r1/rosa-free`                        |       78.304 | CONFUSED      | no         | pass  |
| `hf3-valley-r1/rosa-continued`                   |      914.034 | BORED         | yes        | pass  |
| `hf3-valley-r1/jonas-free`                       |      307.979 | TOOL          | yes        | pass  |
| `hf3-valley-r1-hold-tail/maya-free`              |      296.165 | BORED         | no         | pass  |
| `hf3-valley-r1-hold-tail/maya-continued`         |      919.258 | BORED         | yes        | pass  |
| `hf3-valley-r1-hold-tail/emre-free`              |      246.802 | BORED         | no         | pass  |
| `hf3-valley-r1-hold-tail/emre-continued`         |      913.808 | BORED         | yes        | pass  |
| `hf3-valley-r1-hold-tail/jonas-free`             |      425.721 | BORED         | yes        | pass  |
| `hf3-valley-r1-hold-tail/jonas-continued`        |       912.29 | BORED         | yes        | pass  |
| `hf3-valley-r1-hold-tail/aisha-free`             |      220.327 | CONFUSED      | no         | pass  |
| `hf3-valley-r1-hold-tail/aisha-continued`        |      928.418 | FRUSTRATED    | yes        | pass  |
| `hf3-valley-r1-hold-tail/diego-free`             |      518.996 | BORED         | yes        | pass  |
| `hf3-valley-r1-hold-tail/diego-continued`        |      914.204 | BORED         | yes        | pass  |
| `hf3-valley-r1-hold-tail/mei-free`               |      262.351 | BORED         | no         | pass  |
| `hf3-valley-r1-hold-tail/mei-continued`          |      924.134 | BORED         | yes        | pass  |
| `hf3-valley-r1-hold-tail/samir-free`             |      956.123 | CONFUSED      | yes        | pass  |
| `hf3-valley-r1-hold-tail/samir-continued`        |      941.187 | BORED         | yes        | pass  |
| `hf3-valley-r1-hold-tail/tessa-free`             |      140.261 | CONFUSED      | no         | pass  |
| `hf3-valley-r1-hold-tail/tessa-continued`        |      917.086 | BORED         | yes        | pass  |
| `hf3-valley-r1-hold-tail/pavel-free`             |      572.201 | BORED         | yes        | pass  |
| `hf3-valley-r1-hold-tail/pavel-continued`        |      935.834 | CONFUSED      | yes        | pass  |
| `hf3-valley-r1-hold-tail/leila-free`             |      232.438 | BORED         | no         | pass  |
| `hf3-valley-r1-hold-tail/leila-continued`        |      923.434 | BORED         | yes        | pass  |
| `hf3-valley-r1-hold-tail/irene-free`             |      615.136 | BORED         | yes        | pass  |
| `hf3-valley-r1-hold-tail/irene-continued`        |      989.062 | BORED         | yes        | pass  |
| `hf3-valley-r1-hold-tail/malik-free`             |      144.222 | CONFUSED      | no         | pass  |
| `hf3-valley-r1-hold-tail/malik-continued`        |       926.65 | BORED         | yes        | pass  |
| `hf3-valley-r1-hold-tail-control/maya-continued` |      916.976 | BORED         | yes        | pass  |

## Cleanup

This audit launched no player, browser, model worker or worktree and owns no persistent process. An actual `ps -p` check across every recorded driver/tester PID in all 31 source supervisors returned no processes (exit 1). Receipt: `valley-r1-cleanup-ps.txt`. No PID was killed. No source evidence was removed. Retained worktrees below belong to others.
