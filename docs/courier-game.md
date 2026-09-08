# Courier Round

2026-09-07. Host `courier-0.1.0`; shared human component `0.1.0`. Public route: `/courier/`, reached from `/games/`. Root owns routing, release integration and deployment verification; this document records the independent game lane.

The courier has six named parcels, six actual destinations and three bag slots. Twelve bidirectional routes connect seven places. Parcels start at the depot, occupy an individual bag slot after a two-minute load, travel with the courier, and transfer to the named recipient location only after a three-minute handover. A two-minute unload can change the next load at the depot. The round lasts 240 simulated minutes and ends immediately when all six parcels are delivered. Late deliveries count; the terminal summary retains every delivered, late, carried and undelivered parcel.

There are two river crossings. Each offers an 11-minute uncertain shortcut and a reliable 24-minute road. Failure consumes the entire interval and effort and returns the courier to the entrance with all parcels. Five minutes of inspection at either endpoint reveals a condition fixed for the round. Repeated inspection is unavailable because the evidence cannot change. This is a narrow information-cost experiment; it does not implement changing weather, noisy testimony or a confidence faculty.

The medicine is due at minute 55. With medicine, fabric and tea loaded, delivering fabric and then taking the reliable ridge road delivers medicine at minute 46. Visiting the quay first delivers it at minute 65. The deadline therefore creates an ordering decision while leaving a reliable direct option. Every action explains its time, outcome and opportunity cost. Ordinary play contains optional route hints; controller help, researcher diagnostics and general model notes are collapsed.

## Shared component and host boundary

`src/games/courier.js` imports only the public human API. It never writes body or skills. It owns route topology, clock, parcel ownership, three-slot capacity, carried meal inventory, condition generation, observations, per-crossing resolved-trial counters and terminal outcomes. Human state supplies perceived body, authoritative effort capacity, elapsed body changes and routecraft practice. No social mechanisms, laboratory policy, runtime LLM or theological scores are involved. Existing laboratory, historical engines, workshop and shared human files are byte-unchanged from baseline `d62f84d36cdacba641909c48584850177e900311`.

Only paid attempted shortcut minutes train routecraft; safe roads, observation and rest do not. Both failed crossings and interrupted elapsed crossing work retain practice. That convention makes the existing task-specific learning term observable. It is not a new scientific learning rule. Reliable delivery can succeed with zero routecraft gain.

All travel uses the same shared capacity boundary. A blocked journey costs two authored idle minutes; it supplies no movement, recovery, food or practice. Rest lasts 15 minutes. A carried meal takes eight minutes and is consumed only after completion. Meals occupy a separate pocket, not a parcel slot. An interrupted meal provides no hunger relief.

## Public host calls

| Call | Contract |
|---|---|
| `createGame({seed})` | Create a finite solo round with an unsigned 32-bit seed. |
| `getGameView(game)` / `getActions(game)` | Detached accessible world, parcels, reports, perceived body, practice, available actions and estimates. |
| `startAction(game, actionId)` | Start a legal pending action, with no elapsed time or committed world effect. |
| `advanceTime(game, minutes)` / `finishAction(game)` | Pay actual elapsed time, capped at action completion or the round deadline; settle host effects once. |
| `interruptAction(game)` | Retain paid time, exertion and practice, while discarding unfinished host effects. Blocked requests finish their idle interval. |
| `exportGame(game)` / `importGame(record)` | Versioned active state with the exact pending action and hidden host facts needed for local resumption. |
| `applyCommand(game, command)` | Validate a `start`, `advance`, `finish` or `interrupt` command. |
| `replaySession({version, seed, commands})` | Reproduce an optional separate command transcript. |
| `chooseAction(view, policy)` in `courier-policy.js` | One of three authored host-native heuristics using only the player view. |

The next crossing draw depends on seed, crossing identity and that crossing's **completed trial count**. A fully paid, allowed success or failure consumes it. Starting, reading the UI, inspecting, resting, zero-time interruption, blocked effort and attempts at the other crossing do not. An interruption cannot purchase a fresh draw; paid rest or practice can legitimately change the chance applied to that same draw. Hidden conditions, seed and random counters are omitted from the player/controller view.

Active state contains one latest event and at most one pending attempt, with no transcript. The browser saves it after each command; a page reload restores partial progress. Optional replay starts only with a fresh round, is kept outside the active save, and stops when loading another save. Save import validates field sets, size bounds, immutable condition generation, individual ownership, capacity, clocks, terminal consistency, necessary paid-time lower bounds and the exact host/person pending contract. Local saves are resumable records, not cryptographically verified competition scores.

## Strategy evidence

Reproduce the source-identified final report with:

```sh
node scripts/courier-benchmark.js --seeds 100 --start-seed 301 --json artifacts/courier-benchmark.json
```

The committed report contains SHA-256 identities for host, controller, benchmark and shared sources; all 300 complete command/event records; final state hashes; individual parcel outcomes; and 77 explicit negative comparisons. All controllers share a due-sorted loading rule, a nearest-delivery heuristic with a modest urgency weight, and recovery thresholds. Only route costing and inspection differ. None searches for the best whole itinerary.

| Controller, seeds 301–400 | Full rounds / 100 | Mean delivered | Mean on time | Mean elapsed, all rounds | Mean time among completed rounds | Failed crossings |
|---|---:|---:|---:|---:|---:|---:|
| Reliable roads | 100 | 6.00 | 5.00 | 192.00 min | 192.00 min | 0 |
| Shortest roads | 94 | 5.87 | 5.38 | 162.93 min | 158.01 min | 245 |
| Inspect and estimate | 100 | 6.00 | 4.95 | 182.63 min | 182.63 min | 41 |

Reliable roads require two rests and no meals; routecraft remains at its initial 0.36. Shortest roads occasionally need meals (five consumed across 100 rounds) and expire with three or four parcels delivered at seeds 302, 307, 312, 346, 357 and 383. All such partial deliveries remain recorded. No controller generated a blocked request in this final block. Inspection used 7.5 minutes per round on average. At seed 301 the shortest route completes in 130 minutes and inspection in 148; inspection is not always worth its cost. Mean completion times condition on completion, while expired runs contribute the 240-minute boundary only to all-run elapsed time.

The direct safe medicine route is a useful simpler counterexample to these heuristics: it meets the medicine deadline without inspection or a shortcut. The controllers' late medicine does not show that risky travel is required. Inspection reduces failed crossings relative to blindly taking shortcuts, but does not improve mean on-time deliveries relative to reliable roads in this experiment. The simplest route controller remains a serious alternative.

An **exploratory earlier design**, using seeds 101–200 and a medicine due time of 85, gave reliable roads 100 full/on-time rounds at 192 minutes; shortest roads completed 96 rounds at 170.28 mean elapsed minutes; inspection completed 100 at 180.35. This revealed that the original due time failed to distinguish an unnecessary quay detour. The medicine deadline was then changed to 55 while preserving a direct safe delivery at 46. Those exploratory numbers describe the superseded design; they are not the final source-identified benchmark or evidence from a reserved seed family.

The report also compares 44 minutes of routecraft practice with 44 minutes of rest, followed by identical 60-minute rest, an eight-minute meal, and an 11-minute exposed-crossing retest. Both arms start the retest at fatigue 0.012 and hunger 0. Training increases routecraft from 0.36 to 0.4909; the common retest estimate is 69.12% versus 57.73%. This isolates the implemented practice term under matched recovered body and elapsed time. It does not validate these coefficients against people, establish transfer or prove that practicing before a timed delivery round is worthwhile.

## Verification and playtest limits

The 21 focused tests cover parcel ownership, loading capacity, late versus direct delivery order, paid observation, static-report reuse, interrupted effects, exact pending save/resume, idempotent completion, crossing-specific random consumption, zero-time restart equivalence, task-specific practice, capacity blockage, owned meals, deadline interruption, exact-deadline final handover, malformed saves, bounded state, deterministic controllers and benchmark repeatability. The unchanged baseline had 105 passing tests; the complete lane has 126 passing tests.

Actual headless Chrome interaction used a separate Playwright context and isolated local harness at `http://127.0.0.1:4186/courier/`; no shared user browser was changed and no dependencies were installed. At a one-minute partial medicine load, reload restored `1 / 2 min`. Downloading that save, stopping the action, uploading the file, and finishing restored the same bag ownership. A 390 × 844 viewport had no horizontal overflow, no visible button below 44 pixels, and no JavaScript page errors. The inspect controller completed the resumed seed-1 round in 161 minutes with six deliveries, five on time; terminal controls were disabled. Desktop and full-page narrow screenshots were visually inspected. Section links let narrow-screen players jump between actions, the map and manifest, and starting an action brings its pending controls into view.

Before timing, the pure-command budget was declared as **p95 below 16 ms**, excluding painting and downloads. In desktop Chrome on this Mac, 10,000 start/interruption commands measured approximately 0.10 ms p95 at both 1440- and 390-pixel widths. The respective maxima were 1.20 and 0.20 ms. Browser timing is quantized, so finer precision is not meaningful. The same run grew an idle active save from 950 to 982 bytes; attempt digits and the bounded latest event account for that change. A narrow viewport is not physical mobile hardware, and these short interruption commands are not a rendering benchmark or a worst-case route forecast benchmark.

Final controller runs average 24–26 decisions. The estimated deliberate human play duration is 6–12 minutes; no formative human playtest has measured that estimate, enjoyment or comprehension. A five-person playtest, physical-mobile timing and conditions with changing evidence remain open. These results support a second finite solo host consumer and a reproducible game tradeoff, not whole-framework portability or a calibrated model of human behavior.
