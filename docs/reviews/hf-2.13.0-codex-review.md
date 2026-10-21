# HF 2.13.0 independent review

**Verdict: fix first.**

Reviewed HEAD 8ab3414 against origin/main 2fd14b3 (engine 2.12.0), read-only.

1. P2 — Multi-offer suggestions can report the wrong margin and separating term.
   Location: packages/human/src/will/will.ts:905; target selected at :982.
   Reproduction: run explanation-213-review.mjs from the candidate root. Suggest action `task`, matching a current offer (utility 0.20, inertia 0.15) and another offer (utility 0.30); the winner scores 0.40. Current terms are a=0.20, other-target terms b=0.30, winner terms b=0.25/a=0.15.
   Actual: decidedBy={kind:'term',source:'a',margin:0.10}. The closest suggested offer scores 0.35, so the documented adjusted-score comparison requires source 'b', margin 0.05.
   Cause: the explanation receives the raw-utility best target rather than the inertia-adjusted best target. This contradicts docs/framework.md:30 and CHANGELOG.md:21.
   Fix: select the highest adjusted-score live target for explanation calculations only; preserve legacy verdict/counter-offer selection. Add this focused regression.

2. P3 — The stochastic exclusion claim is broader than its implementation.
   Location: packages/human/src/will/will.ts:906; CHANGELOG.md:21; docs/framework.md:33.
   Reproduction: explanation-213-review.mjs uses seed 1, temperature 1, utilities top=0.60, middle=0.40, suggested=0.20. The stochastic winner is middle; it carries decidedBy={kind:'term',source:'middle',margin:0.20} despite being below the maximum.
   Actual exclusion covers only winners below the suggested option, not all lower-scoring stochastic winners. The relative gap is valid, but the published claim does not state that narrower meaning.
   Fix: suppress explanations when the selected score is below the maximum live score, as the stated contract implies. If relative-to-suggestion exclusion is intended, explicitly narrow the documentation instead.

Checks completed:
- Read the complete diff, CHANGELOG [2.13.0], The Pass requests 1/4, AGENTS engineering rules, HANDOFF, architecture and roadmap.
- Extracted origin/main with git archive into scratch. legacy-213-review.mjs passed 20 runs: seeds 1–10, with/without existing curiosity/planning/prompting/review opt-ins, deterministic/stochastic choices, suggestions/insistence, norm/self abstentions, and a save/restore midpoint.
- All 1,200 decision JSON records, 2,400 prediction/decision resolution JSON records and 1,200 snapshot SHA-256 digests matched the baseline. Only the top-level engine stamp was removed from snapshots.
- Focused Vitest: why-not.test.ts, examples.test.ts and migrate.test.ts — 24 tests passed. No full suite ran.
- Explanation probes: 200 opt-in/off decisions preserved verdicts, counters, RNG, traces and state after removing only the opt-in flag/explanations. Prediction preserved the entire input state. Source aggregation/ties, score ties (margin 0), modified resolutions, vetoes, insistence and winners below the suggestion passed.
- Firm-rule review: suggestion and self-choice vetoes, insistence, self recipient variants/id fallback, non-firm behavior, open-window/status/exemption handling, food/water survival threshold and necessity disabled. Linked obligatory norms retain the old conviction threshold; another recipient does not gain a personal-rule veto.
- Restore: valid flags round-trip; malformed firm/suggestionReasons values are dropped, including hostile JSON scalar/array/object values; non-abstention firm is dropped. No new unsafe access found.
- why-not-control.ts output matches all five documented arms: inertia margin 0.14; norm:boundary refusal; habit margin 0.59; rule:leave it alone refusal; non-firm abstain:c1 term (margin 0.99).
- Package/lockfile framework version, FRAMEWORK_VERSION, ENGINE_VERSION and migration destination agree on 2.13.0. The 2.12.0 migration is stamp-only. Site remains pinned to 2.12.0, outside the framework version stamps.
- No game-specific framework code, ruh quantity, or qalb/nafs/fitra/ʿaql scalar introduced. git diff --check passed; repository status remained clean.
- Independent delegated lenses checked firm rules and explanations; findings above were reproduced by the primary reviewer. All artifacts are in scratch.

## Outcome

1. Fixed. `decidedBy` now compares the winner with the closest live suggested offer by the same inertia-adjusted score the choice used; verdict and counter-offer selection are unchanged. Regression in `why-not.test.ts` (fails before the fix).
2. Fixed as the contract states: a stochastic winner below the best live score gets no `decidedBy`. Same regression test. The control output is unchanged.
