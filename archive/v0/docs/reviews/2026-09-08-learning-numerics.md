# Learning pilot: independent numerical review

2026-09-08. This reviewer read the original frozen protocol at `de2fc86` and the pre-execution source, then independently authored [the verifier](../../scripts/verify-learning-pilot.py). The final pre-execution wording is recorded separately at `69c793e`; protocol SHA-256 is `1dd92ae266ee29b38023518366df7a50cf5aef8b997cb6bf089b95206006cfae`.

**Final status:** the frozen verifier passes the first real-data output, including all 168 independent curved-fit audits, every prediction and loss, all paired/bootstrap summaries and the cohort diagnostic. No post-unsealing code correction or failed verification was required. The primary comparison remains inconclusive about a useful exponential advantage over the recent-ten control; numerical correctness does not change that empirical limitation.

## Source reviewed before real fitting

Runner SHA-256: `2afac99481e02ba90a43ce45533eb17c3fa6ebc5f36946927d260a51818c21ac`.

Verifier SHA-256: `6261d583373f9cb67083f1876b4f9a4be1618e61b7f73a15080b30e6ae8348a6`.

The inspected runner passes only an explicit copy of throws 1–30 into `fit_models`. That API rejects vectors of another length. The fixed 50-position predictions are computed before holdout scoring; no per-person fitter receives other participants' observations or holdout outcomes. Cohort-mean fitting is separate and does not feed individual fits. No fit-dependent participant selection is implemented.

The curved coefficient solver compares feasible unconstrained least squares with the two nonnegative coefficient boundaries. Shape search includes both endpoints, every prescribed grid candidate, eligible local refinements and the explicit instantaneous boundary; the selected candidate uses the frozen objective tolerance and finite-shape-first ordering. Linear estimation uses unrestricted ordinary least squares; clipping applies to prediction, not its fitting objective. Power offsets remain fixed at 1 and 5, with power5 consistently labeled sensitivity-only.

The participant resampling uses the stated PCG64 seed and 10,000 draws of 55 participant indices, shared across models. Paired summaries use the same resamples, preserve all individual differences and use the stated absolute tie tolerance. Mean individual RMSE, pooled RMSE, median RMSE, MAE and mean training RMSE remain separate quantities. The plot code includes all analysis IDs and labels the cohort diagnostic separately.

Two pre-execution metadata clarifications were incorporated before source freeze: `recent10` records the squared-error objective on its fitted throws 21–30, while its final predictor's training RMSE still covers all 30 training throws; and a positive finite amplitude is labeled `nonconstant_finite_shape`, avoiding a claim of statistical rate identification. The root-owned protocol wording records those clarifications. A transient protocol-hash mismatch observed during simultaneous edits was rechecked and resolved: the runner's final constant matches the SHA above. No data-dependent repair occurred.

## Independently implemented checks

The verifier imports no runner code. It reads only `results.json` and the four-column restricted `projection.csv`, requiring all 55 analysis IDs and all 50 chronological observations per ID. It never reads raw study identifiers, timestamps, demographics, scores, questionnaire answers or free text.

It reconstructs all fitted predictions, each training/holdout loss, every primary and sensitivity summary, every paired difference/count/percentile interval, and the separate cohort-mean diagnostic. It verifies the recent10 fitted window and linear raw/clipped objective distinction. It checks recorded coefficient/boundary flags, refinement brackets and iteration bounds, and rebuilds each reported refinement's training SSE.

For all three curved models it uses SciPy's independent active-set `nnls` solver on 4,001 equally spaced log-shapes, four times the runner's grid resolution, and refines every eligible local grid minimum. It also evaluates the instantaneous limit. Every fourth independent grid point corresponds to the runner's 1,001-point grid. Only the first 30 errors enter this optimization. The check compares achieved objectives rather than requiring identical fitted rates in flat or degenerate cases. Objective comparison allows the protocol tie tolerance plus `2e-8 + 2e-9*abs(minimum SSE)` for numerical disagreement. A denser grid plus refinement is a numerical cross-check, not a proof of a global continuous optimum or parameter identification.

## Synthetic execution

The final verifier completed twelve synthetic curved-fit checks in approximately 0.35 seconds on Python 3.12.14, NumPy 2.3.5 and SciPy 1.16.3. These checks cover constant outcomes, an exact decreasing exponential, both fixed-offset powers, worsening outcomes under every declining family, and the instantaneous boundary under every declining family. Exact generating-family objectives were within `1e-9` of zero; worsening outcomes correctly returned the constant objective rather than excluding the trajectory. All refinements succeeded. Separate checks exercise nonnegative linear prediction and loss changes under altered holdout values with an unchanged training prefix. No participant observations were loaded.

```sh
/tmp/human-learning-pilot-venv/bin/python scripts/verify-learning-pilot.py --synthetic
```

## Frozen-output verification

Root completed the first real-data run under implementation commit `8562f26408fab9c0f35cff4a8ef0164804cc6acd` and committed freeze `1267107c7c74954f4f9211514bdcdccf1c3f9003`, then explicitly released the restricted output to this reviewer. The verifier was not changed after that release. Its first actual invocation passed:

```sh
/tmp/human-learning-pilot-venv/bin/python scripts/verify-learning-pilot.py \
  --results artifacts/learning-pilot/run-initial/results.json \
  --projection artifacts/learning-pilot/run-initial/projection.csv \
  --output artifacts/learning-pilot/independent-verification.json
```

The [complete verification report](../../artifacts/learning-pilot/independent-verification.json) retains all 168 curved checks: 55 individual fits plus one cohort diagnostic, across three curved models. All 153 independent local refinements succeeded. The maximum absolute difference between the runner's candidate minimum and the independent minimum was `7.105427357601002e-15` SSE. The maximum difference between the runner's selected objective and that independent minimum was `1.6079937381618947e-10` SSE, within the specified objective tie allowance. The chosen-objective comparison is distinct from the minimum comparison because the protocol intentionally selects the smallest eligible shape within its tolerance.

All 55 IDs and 2,750 observations were retained. Every model's full predictions, training RMSE, holdout RMSE/MAE/SSE, aggregate metrics, participant percentile intervals and paired differences/counts reconstructed successfully. Power5 remained sensitivity-only and the cohort diagnostic remained outside the individual ranking. The report binds:

| Evidence | SHA-256 |
| --- | --- |
| Frozen initial `results.json` | `796b71e95d79d57c1549049ce7d6ff15f640378b7629d7980c47768db8410f08` |
| Restricted `projection.csv` | `9d859f36295e2d8c22ed29c0e30a7fffff1f880e835f404beb7745a5fda861e0` |
| Independent verification report | `965e6a96ba3bab2873add4d01bc60a9379dffe2a031fc1edc982dfeac3d732c7` |

Reproduction requires a new output path because the verifier refuses to overwrite evidence. No adverse participant, no-improvement fit or sensitivity was removed. One participant's amplitude-zero constant optimum remains in every declining family; the six exponential instantaneous-limit fits are also retained rather than assigned invented finite rates.

## Interpretation checked against the verified output

The mean individual holdout RMSE is 0.44331 for exponential and 0.44701 for recent10. Their paired mean difference is −0.00370 target-radius units, with descriptive participant-bootstrap interval [−0.01557, 0.00768]. Exponential has lower error for 26 participants and higher error for 29, with no ties. The interval and mixed individual outcomes do not establish a useful advantage over the prespecified strong control; they also do not prove equivalence. Lower mean error than the whole-training mean and linear extrapolation does not resolve that primary comparison.

Power1 has the lowest descriptive primary mean individual RMSE (0.43495). Power5 is sensitivity-only (0.44276); it cannot be selected as a replacement primary result. The cohort-mean diagnostic instead has exponential RMSE 0.08937, recent10 0.09009 and power1 0.13169. That different ordering is a concrete reason to keep cohort prediction separate from individual prediction. Averaging outcomes can conceal different individual forecasting behavior, and the aggregate curve does not identify an individual's learning law.

This review does not independently validate raw measurement geometry or the raw-ID-to-analysis-ID projection; those belong to the separate primary-measurement review. It also does not establish a universal learning law, a per-minute coefficient, a latent proficiency measurement, or causal learning effects.
