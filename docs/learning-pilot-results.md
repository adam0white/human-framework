# Empirical learning pilot: completed, no runtime calibration

The exponential predictor does **not earn a clear advantage over a recent-performance constant** in this frozen individual forecast test. Mean held-out person RMSE is **0.44331** for exponential and **0.44701** for the recent-ten mean. Their paired difference is **−0.00370**, with a descriptive participant-bootstrap 95% interval **[−0.01557, +0.00768]**. Exponential has lower error for 26 people and higher error for 29. The interval does not establish equivalence, and the small observed difference does not justify a universal learning law or a runtime coefficient change.

This is a completed private secondary analysis of [Zhang, McDougle and Leonard's 2025 Lolli-toss Experiment 1a](https://doi.org/10.1016/j.cognition.2025.106083), using the authors' [CC0 OSF deposit](https://osf.io/xzm5c/). All **55 people × 50 throws** are retained. Each model fits the first 30 throws and forecasts the final 20 without updates. No human playtest, new participant collection, runtime feature or public release occurred. [Qualification](learning-data-access.md) · [Frozen protocol](learning-pilot-protocol.md) · [Review dispositions](reviews/2026-09-08-learning-pilot.md).

## Individual forecasts

Error is Euclidean distance from the lollipop head to the target center, divided by the outer target radius. Lower is better. Primary loss averages each person's twenty-throw RMSE across 55 people. The fitted curves forecast observed performance; they do not measure latent proficiency.

| Predictor | Mean person RMSE | Descriptive 95% interval | Mean person MAE | Pooled RMSE |
|---|---:|---:|---:|---:|
| Power, origin 1 | **0.43495** | 0.36122–0.52970 | 0.31929 | 0.54320 |
| Exponential | 0.44331 | 0.36650–0.54256 | 0.32940 | 0.55858 |
| Recent ten throws, constant | 0.44701 | 0.37017–0.54883 | 0.33443 | 0.56498 |
| All thirty training throws, constant | 0.46795 | 0.39793–0.55425 | 0.37419 | 0.55776 |
| Signed OLS, nonnegative predictions | 0.57347 | 0.48689–0.68589 | 0.44073 | 0.69068 |
| Power, origin 5 — sensitivity only | 0.44276 | 0.36650–0.54115 | 0.32589 | 0.55648 |

Power with origin 1 leads the prespecified descriptive primary ranking. Its paired comparison with exponential remains uncertain: exponential minus power is +0.00836, interval [−0.00237, +0.01954]. Changing only the prespecified power origin to 5 shrinks that difference to +0.00054, interval [−0.00493, +0.00688]. Both origins were prespecified; origin 1 remains primary and origin 5 sensitivity-only. Neither earns replacement of the runtime rule.

The other prespecified summaries remain separate from the primary mean held-out loss:

| Predictor | Median person held-out RMSE | Mean person training RMSE, all thirty throws |
|---|---:|---:|
| Power origin 1 | 0.35263 | 0.47474 |
| Exponential | 0.34632 | 0.46413 |
| Recent-ten constant | 0.35945 | 0.60301 |
| All-thirty constant | 0.39893 | 0.57283 |
| Signed OLS | 0.50947 | 0.52784 |
| Power origin 5 — sensitivity | 0.35310 | 0.46794 |

Training RMSE describes the final predictor on all thirty early throws. For recent-ten, fitting uses only throws 21–30; for OLS, the fit objective is the unclipped line whereas this training metric uses nonnegative predictions. These objectives are stored separately in the [complete result](../artifacts/learning-pilot/run-initial/results.json).

The paired results preserve useful counterexamples:

| Exponential minus comparator | Mean RMSE difference | Descriptive 95% interval | Exponential lower / tied / higher |
|---|---:|---:|---:|
| Recent-ten constant — primary effect | −0.00370 | −0.01557–+0.00768 | 26 / 0 / 29 |
| All-thirty constant | −0.02464 | −0.04619–−0.00217 | 38 / 1 / 16 |
| Signed OLS | −0.13016 | −0.16370–−0.09684 | 47 / 0 / 8 |
| Power origin 1 | +0.00836 | −0.00237–+0.01954 | 19 / 5 / 31 |
| Power origin 5 — sensitivity | +0.00054 | −0.00493–+0.00688 | 23 / 6 / 26 |

The no-change control matters: a curve can outperform the mean of all early training observations without clearly improving on the recent level. Metric choice also matters. Exponential beats the all-thirty constant on mean person RMSE, but has slightly worse **pooled** RMSE (0.55858 versus 0.55776). The former averages person-level errors; the latter weights larger squared errors more strongly. No alternative metric replaces the frozen primary outcome.

Intervals use 10,000 paired resamples of people, PCG64 seed 20260908, not independent resampling of throws. These are descriptive cohort-sampling intervals, without multiplicity correction, causal interpretation or a guarantee of performance for a new individual. No significance stars, equivalence margin or weighted winner score is used.

## Aggregation and numerical limits

Fitting the separate cohort-average trajectory gives a different comparison: held-out cohort-mean RMSE is **0.08937 exponential**, 0.09009 recent-ten constant, 0.13169 power origin 1, 0.10028 power origin 5, 0.15587 all-thirty constant and 0.46642 OLS. This is a different, aggregated prediction target. It does not override individual results or establish that individual people follow the aggregate curve. The initial [diagnostic PNG](../artifacts/learning-pilot/run-initial/diagnostics.png) and [exportable SVG](../artifacts/learning-pilot/run-initial/diagnostics.svg) show both targets with separate legends and every participant's paired error, without selecting favorable examples.

| Individual fit diagnostic | Exponential | Power origin 1 | Power origin 5 |
|---|---:|---:|---:|
| Amplitude zero: constant optimum | 1 | 1 | 1 |
| Explicit instantaneous boundary | 6 | 4 | 7 |
| Asymptote zero | 2 | 18 | 12 |
| Finite shape lower bound | 1 | 1 | 1 |
| Finite shape upper bound | 0 | 0 | 2 |

Flags overlap; the lower-bound case is also the constant optimum. Instantaneous fits encode an initial-step limit, not an infinite human learning rate. Finite fitted shape and positive amplitude do not establish statistical or practical parameter identification. Both the finite shape bounds and the additional instantaneous limit are part of the frozen candidate set; untested shapes beyond the finite cap could matter, particularly for power origin 5. The numerical audit verifies the specified search, not global optimality over every conceivable learning model.

## What this changes in the framework claim

Keep Human/runtime 0.1.1 and all games unchanged. The bounded exponential practice update remains an inspectable **engineering assumption** with tested software consequences. This dataset supplies neither a compelling forecast advantage over recent performance nor an observation of the runtime's latent skill. It provides no evidence-based value for `.008` per minute or `.65` quality, and cannot separately identify their product's factors.

The task's timer fields do not measure total active-practice minutes; exposure is completed throws. The error curve is not the runtime's success-probability or work-duration equation. Changes in execution, strategy, feedback response or condition could affect observed performance; this analysis does not identify those causes. No latent-human assessment or participant attribute is inferred.

The dataset was selected for licensed access and usable chronology, with the published exponential result already known. The authors also report their main results when the five excluded participants are included. Keeping all 55 removes our outcome-dependent exclusion, but cannot remove task selection, online/completion selection, device effects or knowledge of published results. The new chronological comparison is not an untouched external cohort, a replication of the authors' original analysis, or proof that power is a universal replacement. [Primary methods](https://jlnrd.github.io/Publications/Zhang%2C%20McDougle%2C%20%26%20Leonard%202025.pdf) · [Independent source review](reviews/2026-09-08-learning-source.md).

## Reproduction and verification

Analytic decisions were committed at `de2fc86527ec073a89ddba5ea884cc32887c620d`. Private-output wording and source-description corrections at `69c793e0a0a033361cf92ad492b0b0ef99caac33` changed no analysis decision. Runner, tests and independent verifier were committed at `8562f26408fab9c0f35cff4a8ef0164804cc6acd`; the [source/data freeze](../artifacts/learning-pilot/freeze.json) was committed at `1267107` **before the first real fit**. Initial execution succeeded; there is no failed or replaced real-data run and no post-outcome model change.

- All **14 substantive synthetic runner tests** pass. Checks cover exact parametric forecasts, worsening/constant/instantaneous behavior, holdout isolation, fixed bootstrap arithmetic, fail-closed schema/source identities, failure handling, output preservation and deterministic plots.
- The independently authored [verifier](../scripts/verify-learning-pilot.py), importing no runner code, passes all **168 curved training-fit audits** (55 people plus one cohort × three curves), using SciPy NNLS and a 4,001-point grid plus refinement. Every prediction/loss, model summary, paired count and bootstrap interval reconstructs. Maximum candidate-minimum disagreement is about `7.11e-15` SSE; the largest selected-versus-independent minimum difference is about `1.61e-10`, within the frozen tie tolerance and numerical allowance. [Exact audit](../artifacts/learning-pilot/independent-verification.json) · [Numerical review and tolerances](reviews/2026-09-08-learning-numerics.md).
- Root independently matches all **2,750** original main rows, chronology positions, normalized observations and pseudonymized projection entries. [Receipt](../artifacts/learning-pilot/root-projection-verification.json).
- One complete root repeat in the same pinned environment reproduces the initial JSON, CSV, PNG and SVG **byte for byte**. This is software reproduction, not additional participants or independent scientific replication. [Hashes](../artifacts/learning-pilot/root-exact-reproduction.json).

Use Python 3.12 with the isolated [pinned research dependencies](../artifacts/learning-pilot/requirements.txt); these are not runtime dependencies. Run from the repository root with fresh output paths:

```sh
python -m venv /tmp/human-learning-reproduction
/tmp/human-learning-reproduction/bin/python -m pip install -r artifacts/learning-pilot/requirements.txt
/tmp/human-learning-reproduction/bin/python tests/learning_pilot_test.py
/tmp/human-learning-reproduction/bin/python scripts/learning-pilot.py --freeze artifacts/learning-pilot/freeze.json --out /tmp/human-learning-fresh
/tmp/human-learning-reproduction/bin/python scripts/verify-learning-pilot.py --results /tmp/human-learning-fresh/results.json --projection /tmp/human-learning-fresh/projection.csv --output /tmp/human-learning-verification.json
```

All participant-level source and derived data remain private. The public allowlist and build digest remain app 0.14 (`4f9cccf8602c04a2fb7d7f8dd4aec3ba45950d9791791ed37c8eb5ae3f753c20`), deployed from `2ebdb8841215a26f69da1c394ab438b7a1f4d15d`. The last integrated Node suite remains 864 passing tests from the prior meal milestone; it was not repeated for Python-only research with unchanged JavaScript. A fresh public build still checks 43 modules/59 edges and emits 72 files. All four newly checked private research routes return 404, and the live release digest matches that build. [Publication boundary receipt](../artifacts/learning-pilot/publication-check.json). No redeployment is warranted for these unchanged public bytes.
