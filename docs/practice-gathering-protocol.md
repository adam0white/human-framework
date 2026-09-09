# G1: gathering practice before a useful timber trip

Written before comparison execution. This is the sole gathering nomination; there is no G2. The [bounded preflight](practice-incentive-preflight.md) permits at most three opportunities across the whole study. This nomination uses current Camp 0.3 default people and ordinary visible actions, without a new mechanic, profile, runtime ablation or claimed human-data calibration.

## Source-derived opportunity and paid prefix

From `createGame()` with no arguments: start `gather-timber`, pay 16 minutes, start `forage`, pay 14 minutes. Nominate the resulting minute-30 state only if the exact default prefix is legal, the player has no pending job, gathering exposure is 30 paid minutes, and no structure or supply window has been created. Keep Meryem unrequested and free in every arm; her actual automatic recovery, body state and paid time remain in every snapshot. This is a limited early single-worker opportunity in a two-person world, not a coordination claim.

Source reasoning: all three gathering actions practice the same skill. Their duration is fixed when a job starts using `floor(skill*4)`. Default gathering starts at .10; the existing practice rule puts its first duration threshold after more than 30 and at most 36 paid gathering minutes. Six minutes of forage can therefore change the quoted duration of a newly started timber trip. That is a hypothesis derived from the current source, to be checked after the freeze; it does not promise an overall advantage. Forage has zero declared effort and yields food only on completion. Cancellation retains paid exposure but forfeits that gathering output.

The minute-30 prefix is ordinary productive timber and food collection. Its administrative verification is the only permitted pre-freeze execution. Reject G1 if that prefix fails; do not substitute another route. No second gathering nomination is needed: another test of the same first-threshold ordering would duplicate this question. The existing workbench, same-assembly restart, meal and offer studies stay closed.

## Objective, horizon and four fixed controls

Player objective: obtain the timber component needed for both Woodshed stages, meaning held timber of at least eight units. The expected prefix holds seven, so one further completed timber trip supplies the missing timber component. Salvage is still required for the whole structure and is recorded; this is not a completed-building claim. Report the first minute the timber target is reached, plus food, paid effort, bodies, skills and pending work at the shared minute-60 horizon. Minute 60 is an administrative comparison horizon, **not an existing game deadline**. Do not invent a weighted score or infer dominance from one resource while ignoring pending work.

Each arm starts from the exact same paid prefix. Explicit minute counts below are frozen source predictions, not measurements of executed alternate routes. All command failures remain refusals; stop that arm without repairing or replacing its schedule.

| Arm | Operations after minute 30 | Role |
|---|---|---|
| `G1-finish-timber-then-forage` | Start timber; advance 16; start forage; advance 13; start another forage; advance 1. | Strong productive target control: finish useful timber first, then useful same-skill forage. |
| `G1-finish-forage-then-timber` | Start forage; advance 14; start timber; advance 15; start forage; advance 1. | Productive training control: complete the food-producing training job before timber. |
| `G1-partial-forage-then-timber` | Start forage; advance 6; cancel; start timber; advance 15; start forage; advance 9. | Deliberate partial-practice contender; retains six paid minutes without the first forage output. |
| `G1-recover-then-timber` | Advance 6 while free; start timber; advance 16; start forage; advance 8. | Timing/recovery control: equal six-minute delay with actual recovery rather than practice. |

The final partial forages are intentional useful ongoing jobs; retain their duration, elapsed minutes, body costs and unfinished output without converting them into fictional completed food. The first two arms use their last available minute for paid useful work rather than leaving an avoidable exposure difference. The recovery arm has six genuinely different recovery minutes. Its body changes are a real consequence, not a controlled-away nuisance. It can help attribute a quoted later-job difference to the paid practice interval, but cannot alone establish a learning-only causal effect with body held fixed.

## Frozen execution and record

The private [runner](../artifacts/practice-incentive/gathering/runner.mjs) has a prefix-only mode and a guarded comparison mode:

```sh
node artifacts/practice-incentive/gathering/runner.mjs --prefix --out artifacts/practice-incentive/gathering/G1-prefix.json
node artifacts/practice-incentive/gathering/runner.mjs --run --freeze PATH_TO_COMMITTED_FREEZE --out NEW_RESULT_DIRECTORY
```

The root commits the protocol, runner, prefix record and a freeze before executing `--run`. The freeze contains `files: [{path, sha256}]` covering this protocol, runner, preflight and the transitive Camp/runtime/model source graph; `prefix: {path, sha256}` binds the paid administrative record. Paths are repository-relative. The runner verifies those hashes and that the freeze is committed unchanged at HEAD before importing and replaying the actual Camp module. Existing output files/directories are never replaced.

Every trajectory contains `id`, the full commands beginning at fresh default creation, initial and post-operation `states` from `exportGame`, initial and post-operation `views` from `getGameView`, preserved `refusals`, and a compact `summary`. The prefix envelope stores this under `trajectory`; comparison output uses `trajectories`. The fixed advance intervals expand into actual one-minute API operations, each preserved in the commands and snapshot arrays, to record the target's exact first crossing and any refusal without hidden partial execution. Summaries retain time, target attainment, all stocks, structures, caches, jobs, physical work, assemblies, both people's full state, paid accounts and aggregate stats. Raw states are the authority; no resource, practice or body state is manually patched.

After unsealing, independently replay all commands and reconstruct the summaries. Compare the partial-practice contender with **both productive controls** before describing an incentive. A timing benefit relative to free recovery alone cannot earn a repair. Any admission decision is restricted to this nomination and these controls; a larger claim needs a source-derived bound. Keep an uninteresting or negative result. A UI consequence may be considered only if an exact existing difference is difficult to see; neither a practice meter nor a new learning faculty is presumed.
