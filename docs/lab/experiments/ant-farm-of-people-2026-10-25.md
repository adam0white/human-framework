# The ant farm of people — 2026-10-25

## Preregistration

Registered before probes. Base source: `14b7d6cdcff5b66836f8d97eee38ecc22197741a`.
Use registry HF 2.22.0, downloaded and integrity checked in scratch. No release.
Seeds: 7, 19, 43, paired full and relationship-learning ablation.
200 real HF people per arm, 365 days, starting at minute 360. No player goal.
Age is seeded uniformly across integer ages 20–79; no elder/leader/friend/enemy labels or initial ties.
Use the published village world for bodily actions and outcomes. Replace its first-two-id neighbour offers with four daily partners from a seeded uniform shuffle, circular offsets ±1 and ±2. Pair scheduling reads no actor state. Preserve ordinary HF decisions, activity reviews, body thresholds, perception, social learning and bounded retention. No routine/coarse day stepping. Daily calls are collection boundaries, not replacement dynamics. Cap returned events only; keep simulation active. Food starts at 20000. No added drought or engineered conflict.
The ablation restores each person's social slice to its initial value after each simulated day. It keeps other learned state and is not a whole-person random baseline. Exogenous pairing is identical; endogenous world RNG may diverge.

Budget: 60 wall seconds per arm, checked between days; one day may overrun. Stop the bet on the first incomplete year. At most six arms and 360 seconds total plus one day overrun. Stop if free disk falls below 5 GB. This cheap-run budget is a feasibility gate, not a claim about browser performance.

GO requires all six full years within budget, at least 95% alive per arm, and at least one of the following signatures in at least two full seeds, exceeding its paired baseline:

- Clique: at least two disjoint maximal triangles whose six directed ties each have affection ≥0.35 and trust ≥0.60, present at days 335 and 365; full has at least two more persistent triangles than baseline.
- Trusted elder: an age ≥60 person has incoming trust ≥0.70 from at least 20 living people at both days 335 and 365; full exceeds baseline count by at least one person. Age is an independent covariate, not an authored role.
- Feud: at least one pair has both directed affection ≤−0.30 and trust ≤0.30 at days 335 and 365; full exceeds baseline by at least one persistent pair.

These thresholds are operational engineering criteria, not a calibrated definition of human community. No threshold changes after observation. Budget failure is NO-GO for this cheap configuration. An incomplete run says nothing about absence of emergence over a year. Record partial days and do not shorten the horizon to claim completion.

## Result

NO-GO on the preregistered runtime gate. The first full arm (seed 7) reached only 28 of 365 days in 60.410 seconds. All 200 people remained alive at that partial checkpoint. The year was not completed. Per the stopping rule, no baseline arm or later seed ran. Clique, elder and feud outcomes are PENDING prospective full-year evidence, not absent or passing. No missing HF slice is established and no implementation is justified by this run.

### Method and exact artifacts

Used published `@adam0white/human-framework@2.22.0`, imported directly from the extracted `package/dist/index.js`. Registry `gitHead` equals base source `14b7d6cdcff5b66836f8d97eee38ecc22197741a`. Registry/tarball SHA512 match: `sha512-cPKdbCJ69cFNKErcGrxClnJ8CHcNVgN7GtDWa6UvmBewgA3ouxhzV5zntVhEKXYH97NksZMns+0N/68yfdU8dQ==`. This is not the workspace alias. Node 26.12.0 on Apple Silicon, concurrent machine load; disk started at 17 GiB free and was checked between days.

Scratch root: `~/code/.lab-scratch/h3/population-traditions/`. `preregistration.json` contains the original timestamp (2026-10-25T17:11:46.984356Z) and SHA256 (`0eb10bfe5bf2737f426a93dc72fbc5f3c96600af60ad5aa249be2b1eed2a4abb`); the `.preregistered` copy preserves the registered text. Signed preregistration commit: `e37e7f4`, before the first probe. `npm-pack.json` and `integrity-check.json` identify/check the package. `ant-farm.mjs` is the exact executed harness. `ant-progress.jsonl` records each complete simulated day. `ant-result.json` includes completed action counts, final state/world digests, survivors and size; `ant-stdout.log` is its terminal summary. Final people JSON size: 24,842,003 UTF-8 bytes; this includes inline state and bounded retained history, not world or external archives. The people JSON itself was hashed, not retained as a separate snapshot.

```sh
export PATH=/opt/homebrew/bin:$PATH
npm pack @adam0white/human-framework@2.22.0 --pack-destination ~/code/.lab-scratch/h3/population-traditions --json
node ~/code/.lab-scratch/h3/population-traditions/ant-farm.mjs
```

The harness uses `stepCommunity` for every day with ordinary event-driven decisions and body thresholds. `maxEvents:0` drops returned event copies only; the simulator continues. `setRetention({trace:12, chronicleDays:7})` declares bounded trace/chronicle retention. Initial food 20000, no ties, seeded ages, no suggestions or group labels. The host replaces each village social action template with offers to four uniformly shuffled daily neighbours. The default village's fixed first-id neighbour bias is removed. Existing host actions still define social consequences; this is a fixture world, not an observation of human society. We made no claim that this schedule or these coefficients represent a real village.

### Limits and remaining design

The 60-second limit is checked at day boundaries, so the final day overran by 0.410 seconds. Body and HF event simulation were not replaced by routine days. Calendar-year lifecourse mortality/onsets were not enabled; ordinary body survival was active. Age only initializes the independent elder covariate. No long-term migration, births, institutions, physical travel or new environmental disruption was simulated. Relationship storage remains HF's existing 80-tie bound despite 199 possible partners; that is an explicit fidelity limit. The paired baseline and persistence metrics were never reached. In particular, no triangle extractor or elder/feud threshold was executed at a planned checkpoint. Partial-day runtime is not enough to estimate a whole year reliably, because accumulated state changes cost.

Follow-up target 2026-11-15: coordinator may authorize a larger declared runtime budget, validate the maximal/disjoint persistent-triangle classifier, then preregister and run all paired years at this same fidelity. Do not replace fine decisions with routine days and report the same experiment. Proposed exports: none. No HF source or actor RNG code changed. Coordinator owns any findings/roadmap entry.

## Full-year extension preregistration

Director extension registered after the original60-second feasibility probe stopped at day28. The original budget verdict remains NO-GO and its criteria stay unchanged. This extension completes the requested year; it cannot rescue that gate or establish a passing three-seed emergence result. Run the identical published HF2.22.0 full arm, seed7,200 people,365 days, with a35-minute wall budget and the same disk guard. No ablation or additional seeds. Record days335/365 signatures, alive count, total time and final complete state. Report signatures descriptively; one full arm alone cannot establish unscripted emergence beyond the paired baseline. No new faculty, host intervention, parameter tuning or coarse stepping. If it cannot finish, record the exact limit. The harness changes only the runtime cap, selected arm/seed and checkpoint persistence.

## Full-year extension result

Seed7 full arm completed365/365 days in498.879 seconds with200/200 alive, on published HF2.22.0. Same fine event-driven driver; no coarse replacement, new intervention or engine tuning. Timings include concurrent load and are not a quiet-machine or browser benchmark. Original60-second feasibility gate remains **NO-GO**.

Days335/365 raw mutually strong triangle counts were1/2. Independent checkpoint analysis excludes any triangle contained in a larger strong clique and intersects identities across both checkpoints: **one persistent maximal triangle**, `p017|p050|p135`. There are not two disjoint persistent maximal triangles. Trusted-elder and feud signatures were zero at both checkpoints. This single full arm shows a surviving mutual-affection/trust group, not learning-specific emergence: no paired ablation or later seeds ran. It meets the descriptive200-person-year probe, without passing the original six-arm gate. The authored uniform partner schedule and village social coefficients remain causal premises; HF relationships retain at most80 ties per person.

Final people JSON46,364,546 bytes (about232KB/person), excluding host/community/checkpoint overhead. Final people SHA256 `885a0c8009dbda861c0d46da4bffbf4f26d9b3731a8aaad48f6a881b452a0074`; world SHA256 `063e62aa4a6003f07f8f68f15ad1309d88159aeb8ad2ac5178ba97ae5d5a0ef6`. Extension registration, exact harness, all365 daily progress records, final result, checkpoints and classifier output are in `~/code/.lab-scratch/h3/ant-year-extension/`. The original harness listed triangles but did not enforce maximality/disjointness/persistence; that did not change its runtime failure. The extension's separate analysis corrects this before any signature claim.

No new faculty or release is justified. Next step2026-11-15: a fresh feasible paired design, balanced over seeds, and a stated retention/fidelity budget before any emergence claim.

## V3 report scope — 2026-10-25

The original60-second budget failure is a feasibility proxy, not a negative result for emergence. The later full year is one seed and has no paired baseline. Next: register feasible paired contexts and emergence classifiers, target2026-11-15; review the bounded result2026-11-03.
