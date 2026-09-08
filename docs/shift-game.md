# Pump Yard

2026-09-07. Additive host game at `/shift/`, alongside the original `/workshop/` introduction and laboratory. This document records the authored game and its current evidence, not a human-performance validation or completed player study.

## What the player does

One worker starts at the depot for an eight-hour shift. Three related seal pumps are visible immediately. Choose the job order, take the toolkit, decide where the only replacement seal belongs, recover when needed, and verify each successful repair. The same worker's fatigue, hunger and seal-repair skill carry across all jobs. There are two depot meals; rest is available everywhere. Failed or interrupted fitting retains the spare. Only successful installation consumes it.

| Job | Service value | Patch: minutes / effort / difficulty | Replacement: minutes / effort / difficulty |
|---|---:|---|---|
| Garden | 40 | 35 / 0.17 / 0.32 | 50 / 0.20 / 0.12 |
| Workshop | 70 | 55 / 0.25 / 0.46 | 70 / 0.29 / 0.20 |
| Main intake | 100 | 75 / 0.33 / 0.59 | 95 / 0.38 / 0.29 |

Every job needs an eight-minute, light-effort flow test after a successful fitting. The toolkit takes six minutes to collect; reserving the spare takes ten. Paid inspection takes ten minutes, provides no repair practice, and reveals an ordinary or stubborn fitting. Stubborn condition adds 0.10 difficulty; the uninspected estimate uses 0.05. Inspection remains an optional, plausibly weak action; the current comparison controllers never inspect, so this benchmark establishes no information advantage for it.

Walking minutes are symmetric: depot–garden 12, depot–workshop 10, depot–intake 18, garden–workshop 10, garden–intake 20, workshop–intake 14. Travel has no authored exertion cost beyond the shared component's ordinary time maintenance. A meal takes ten minutes; rest takes fifteen.

At first verification a job earns `baseValue + baseValue * (480 - verifiedAt) / 480`. The total is derived from the immutable job values and verified timestamps; the UI rounds the total and breakdown. These are dimensionless game points, not water-output units. The theoretical 420-point ceiling requires zero time and is not a reachable target. The completion objective is three verified jobs. Verification ends all work opportunities on that pump, and all three running pumps end the shift. Explicit early departure or the deadline preserves partial earned service. No score is granted for failure, practice, skill, meals, leftovers, clicks, waiting, or unverified repairs.

The first feasibility sweep retained the proposed eight-hour duration and service weights. It did not tune parameters to force any controller to win. Typical tested routes take 12–23 consequential action choices; controller averages are 15.7–16.8. A human session is expected to take roughly **5–10 minutes** of reading and choosing, with a quicker replay possible. That duration is a design estimate, not measured player time.

## Human/host boundary and replay

`src/games/shift.js` imports only `src/human/index.js`. The original human component, workshop, laboratory model and legacy kernels remain unchanged. No runtime LLM or social effects are involved. The host owns pumps, tools, seal conservation, observations, travel, action opportunities, clock, keyed randomness and verified score. One public person lifecycle carries the body and repair practice through all targets.

Host/save version: `SHIFT_VERSION = 'shift-0.1.0'`. Exports are `POLICIES`, `createShift`, `getShiftView`, `getActions`, `startAction`, `advanceTime`, `finishAction`, `interruptAction`, `finishShift`, `chooseAction`, `applyCommand`, `exportShift`, `importShift`, and `replaySession`.

`createShift({seed=1, policy='value-first'})` creates a deterministic world. Policies are `value-first` (intake first, spare on intake), `easy-first` (garden first, spare on intake), and `all-patch` (intake first, no spare). All use the same visible-state recovery rule and remaining-time fallback; these are simple host heuristics, not the laboratory Full controller or optimal planners.

The projected view contains public job profiles, status, observations, verified points, perceived body, shared skill, carried and depot resources, current travel costs, actions, one pending interval, and one last event. It excludes seed, unobserved condition, repair counters/draws and authoritative body. Estimated success advances a detached observed person through the same lifecycle to include interval practice and strain. A capacity-blocked request consumes two idle minutes, earns no practice or recovery, and returns control to the player. Successful world effects and human completion settle atomically.

Commands are strict objects:

```js
{ type: 'start', actionId: 'patch-garden' }
{ type: 'advance', minutes: 5 }
{ type: 'finish' }
{ type: 'interrupt', reason: 'Changed plan' }
{ type: 'end' }
```

The active snapshot has no growing history. The optional separate replay is `{version, seed, policy, commands}` and replays from a new shift. Browser storage uses `human-pump-shift-v0.1` and, independently, `human-pump-shift-replay-v0.1`. Ordinary actions start and finish in one click. The collapsed interval option exposes five-minute advances, full completion, and interruption; pending saves resume on reload or file import. Loading a partial save clears the complete replay rather than fabricating its prior history. Imports distinguish a strict shift snapshot from a replay. The browser caps file imports at 2 MB, active saves at 100 KB, and recording at 10,000 commands; the host replay parser caps logs at 100,000 commands.

Conditions use `(seed, 'condition', pumpId)`. Paid completed repairs use `(seed, 'repair', pumpId, route, completedRepairOrdinal)`, with independent target/route counters beginning at zero. Only a fully paid eligible repair resolution increments its counter. Rest, inspection, zero-time or paid interruptions, rendering and saves cannot consume it. Changing body/skill may still legitimately change an outcome against the same draw. A failed fitting supplies the same time-based practice as equally long successful work, with no diagnosis or failure bonus.

Snapshot validation checks the worker and skill identities, known keys, resources, per-route paid counters, repair/verification chronology, unique inspection receipts, deterministic condition consistency, seal conservation, clocks and terminal state. Pending snapshots bind the exact action, target, duration, effort, skill, attempt identity, capacity and prerequisites. Necessary minimum time/attempt bounds cover committed equipment, meals, inspection, repairs, tests and a minimum travel tree. This is structural consistency, not authentication or proof of a complete historical trajectory.

## Reproducible route evidence

Run from the repository root:

```sh
node --test tests/shift*.test.js
node scripts/shift-benchmark.js --count 100 --first-seed 101 --output artifacts/shift-benchmark.json
```

The artifact records exact SHA-256 hashes of the host, shared human source, model and benchmark runner, its baseline revision, runtime and authored inputs. It retains every seed and raw result: 300 controller runs, plus 2,400 combinations of all six job orders and four spare allocations (none/garden/workshop/intake), plus 100 paired interruption continuations. Every run reports restored count, total/base/bonus score, elapsed time, repairs, failures, blocks, rests, meals, inspection count, paid practice time and final skill. A controller that cannot find a feasible next route ends partially; censored/partial runs stay in every score and elapsed-time summary.

Results for seeds 101–200:

| Controller | All 3 / partial / none | Mean score | Mean elapsed min | Mean failed repairs | Mean rests | Mean meals |
|---|---|---:|---:|---:|---:|---:|
| Value first, spare on intake | 84 / 16 / 0 | 297.03 | 377.94 | 0.95 | 2.97 | 0.63 |
| Easy first, spare on intake | 83 / 17 / 0 | 284.44 | 371.41 | 1.17 | 2.93 | 0.49 |
| Value first, all patches | 83 / 15 / 2 | 281.64 | 383.56 | 1.46 | 3.26 | 0.70 |

The equal-spare/equal-recovery comparison isolates an order-policy change, but **does not isolate learning causally**: timing, body, subsequent choices and exposure also change. Easy first scored higher than value first on 15 seeds and lower on 85. All-patch scored higher than value first on 56 seeds and lower on 44, yet had a lower mean and two zero-service outcomes. Fast patches often win; occasional expensive failures lower their average. No strategy is uniformly best across these paired seeds.

Across the wider route sweep, workshop→intake→garden with the spare on intake had the highest mean score (298.75; 87 all-restored), while garden→intake→workshop with that same spare allocation restored all three most often (90; mean 298.43). The lowest mean was garden→intake→workshop with the spare reserved for workshop (253.08; 62 all-restored). These are results of the finite authored game and common recovery heuristic, not discovered human planning laws. The table does not show that a new human faculty is necessary.

## Interruption and learning negatives

A matched-exposure probe compares completing one 35-minute garden patch with canceling two 17.5-minute garden patches, followed by the same all-patch continuation. Before continuation, elapsed repair time, accumulated practice and body are exactly equal in these runs. The completed arm can already hold a repaired target; the interrupted arm has spent the same time without one. Separately, 25 zero-time cancellations before the same target repair caused **zero outcome rerolls** across all 100 seeds. Equal-time partitioning produced zero observed skill/body difference.

The interrupted continuation scored lower on 86 seeds, tied on 12, and **higher on 2** (118 and 153), with a mean difference of −31.09 points. On seed 118 its later trajectory recovered a higher-value pump while the completed-arm heuristic secured only garden service. On seed 153 both restored all three, but subsequent timing and paid attempts differed. These exceptions do not grant free XP or a free draw; they show that completing useful work does not universally dominate every later trajectory under a fixed heuristic. The artifact preserves the exceptions. This is a bounded probe, not a proof that every possible paid grinding schedule is dominated.

The separate matched-exposure person experiment in [Learning through useful work](../research/learning-through-work.md) addresses the practice curve while holding retest body and thresholds fixed. This game benchmark does not replace that causal probe. Practice is the existing authored time-based curve, not empirical evidence that unsuccessful real repair automatically teaches.

## Verification and remaining limits

The clean pre-change baseline passed 105 tests. New host checks cover local prerequisites, independent targets, one-time score, shared seal, practice carryover and equal-duration outcome labels, observed forecasts, capacity/meals, random-domain independence, partial clock boundaries, departure, pending snapshots for every action family, command replay, malformed state, bounded active saves and byte-identical previous runtime hashes. The benchmark tests exercise real runs, seed identities, route coverage and paired interruption continuations.

Browser QA uses isolated Chrome contexts at 1280×900, 390×844 and 320×800. It checks ordinary collection/travel/repair, interval completion, a downloaded pending save, reload/resume, file import, a controller-driven terminal account, a downloaded/uploaded complete replay, explicit partial departure, closed hints/model notes, zero horizontal overflow and no page JavaScript errors. These are desktop-browser viewports, not physical mobile hardware or user playtests. The older experiences are preserved by byte/hash tests; root release integration verifies their routes and the asset allowlist.

Remaining limitations: no direct human playability measurement yet; inspection has no demonstrated strategic benefit; a fixed policy can miss better partial work; the part-on-success rule is deliberately forgiving; the model lacks diagnosis and feedback-driven learning. The prior five-person explanation gate remains unfinished. More mechanisms should wait for discriminating evidence rather than being inferred from a successful game run.
