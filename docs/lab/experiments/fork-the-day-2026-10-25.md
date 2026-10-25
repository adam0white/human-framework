# Fork the day, 2026-10-25

## Preregistration

Registered before probes. Source: worktree base `14b7d6cdcff5b66836f8d97eee38ecc22197741a`, workspace HF2.21.0 source, Node26.12.0. No release or player round.

Run seeds1–20. Use the real bench-village setup with six people, alternating devout status, person seeds100+i+1000*seed, world seed=seed, food60, start420. Step in one-minute logical ticks through1860. At tick450 snapshot people, community and world. Fork once: queue one player request to p00, strength0.6, ask to help p01 versus ask to chat with p01. No insistence, forced interruption, altered trait or second request. Both branches otherwise receive identical host input. A no-change restored branch controls exact continuation.

Measure first input-state difference separately from first changed chosen affordance or decision timing. Compare decision events by tick and person; missing decisions count as timing divergence, not a changed choice. Keep actual decision records and source-labelled term differences. A term attribution requires the first changed choice to compare the same offered options with identical nonsuggestion terms and same predecision person RNG, with changed suggestion terms reversing the strict utility ordering of the two chosen options. Otherwise label the term attribution unresolved. Later correlated state differences are never causal explanations.

GO only if no-change restores match every tick, at least10/20 seeds change a choice within one day, first choice divergence has at least three distinct times, and every seed with behavioral divergence has a supported term attribution under the rule above. NO-GO otherwise. Nondivergent seeds are censored at1860. Instrument failure means PENDING until repaired without changing these criteria. This is a controlled mechanism probe, not emergence or player evidence.

Only a GO permits a small opt-in read-only fork diagnostic. No engine changes.

## Results

Pending the registered probe.

## First probe result

**NO-GO.** All 20 seeds changed a chosen affordance, but every first changed choice occurred at minute 480. There was one divergence time, below the registered three. Strict term attribution passed on 0/20 seeds. All 20 no-change restore controls matched every tick through minute 1860. Timing divergence followed at minute 525 in every seed. The forced input difference was at minute 450; it is not counted as behavioral divergence.

The paired first choices were help p01 versus work-field. For seed 1, the help score was 0.4517 with the actual `suggestion:player` term of 0.3, versus 0.1517 without it; work-field scored 0.3349 in both records. RNG at the preceding tick boundary matched. This identifies an observed score difference under the request intervention. It does not isolate the choice's stochastic path or explain all later divergence. The strict comparison also fails because `DecisionRecord.considered` retains only the top eight candidates (`cognition.ts`), so the two ranked records omit different options. Omission is not evidence that their nonsuggestion terms changed. No missing terms were filled in and no post-hoc relaxed criterion was used. The identical time alone is sufficient for NO-GO under this preregistration.

Command: `PATH=/opt/homebrew/bin:$PATH node ~/code/.lab-scratch/h3/fork-lockstep/probe.ts fork` (exit 0). Source is base `14b7d6cdcff5b66836f8d97eee38ecc22197741a`, package manifest 2.22.0, engine stamp 2.21.0. The preregistration's HF2.21.0 wording was imprecise about package version; no source changed for the probes. Seeds 1–20, parameters and horizon were unchanged. Scratch retains the exact executed instrument and its hash, preregistration timestamp/hashes, raw first decision records, per-seed results and console log in `~/code/.lab-scratch/h3/fork-lockstep/`. The durable [instrument](fork-lockstep-2026-10-25/probe.ts) changes the source import to a repository-relative path, formatting, type annotations and missing-record guard; the original executed bytes remain in scratch.

Existing `runSilent` and `diffChronicle` already support a muted-voice epilogue and coarse outcome comparison. They do not claim a complete causal fork explanation. This controlled bench fixture does not establish emergence, varied life sensitivity, regret-game value or player acceptance. It changes one queued player ask, not a full generated conversation. No new fork diagnostic is justified by this probe. A future probe could pre-register varied intervention contexts and full decision capture; it must not retroactively count this sample as passing. Proposed coordinator finding: the current fixed-time request fixture fails the spread criterion, and bounded traces cannot alone certify all-option causal attribution. No shared findings or roadmap file was edited.
