# Learning-data pilot: access and measurement qualification

Verified 2026-09-08 America/Chicago (2026-09-09 UTC). **Experiment 1a of Zhang, McDougle and Leonard (2025) qualifies for a narrow, individual chronological toss-count pilot.** Two public raw files contain all 55 released participants and 2,750 observed tosses, including the five participants omitted from the paper's principal analysis. No model was fit and no outcome trajectory was inspected during this access check. The [pilot proposal](learning-data-pilot-proposal.md) still requires a committed comparison specification before fitting.

## Primary source and access terms

Xiuyuan Zhang, Samuel D. McDougle and Julia A. Leonard, *People accurately predict the shape but not the parameters of skill learning curves*, **Cognition 258 (2025), 106083**, [DOI 10.1016/j.cognition.2025.106083](https://doi.org/10.1016/j.cognition.2025.106083). Methods are in §2.1, printed page 3, available in the [author-hosted paper](https://jlnrd.github.io/Publications/Zhang%2C%20McDougle%2C%20%26%20Leonard%202025.pdf). [OSF project xzm5c](https://osf.io/xzm5c/) supplies the original data and task/analysis code; [Experiment 1a preregistration cw7g2](https://osf.io/cw7g2/) records the prospective exclusion rule.

The public [project API](https://api.osf.io/v2/nodes/xzm5c/) links [license 563c1cf88c5e4a3877f9e96c](https://api.osf.io/v2/licenses/563c1cf88c5e4a3877f9e96c/): **CC0 1.0 Universal**, year 2024, with the copyright-holder field empty. This is the project's declared license for its deposited materials; the separately published journal article retains its own copyright. Preserve attribution despite CC0. The exact license response and text are archived; no conflicting per-file notice was found in the selected task and analysis source. The project was public and readable without credentials. The web renderer returned 403 for the project landing page; the public OSF API and its supplied versioned download URLs succeeded.

All acquired files remain under the [data-access directory](../artifacts/learning-pilot/data-access/), outside the site's public asset allowlist. They mirror the public CC0 OSF dataset xzm5c and are published with this repository (owner, 2026-10-05); this replaces the earlier instruction to keep them private. [Download manifest](../artifacts/learning-pilot/data-access/download-manifest.json) records version, original OSF path, file ID, retrieval time, bytes and hashes. Every downloaded original's SHA-256 matches its OSF file metadata. Metadata snapshots and [source references](../artifacts/learning-pilot/data-access/sources.json) preserve provenance. The study's available task code is source evidence for interpretation, not proof that the deposited code bytes are identical to every collection-time deployment.

## Cohort and task

The paper describes adult U.S. Prolific participants in a nonclinical online visuomotor task. Its principal sample has 50 people, with five additional participants excluded for a nonnegative fitted linear error slope. The task uses Space to stop a horizontally moving lollipop and the duration of Enter to control its vertical toss. Participants receive instructions, a keyboard-function check without a live target, and comprehension questions. They then play ten blocks of five tosses with outcome feedback and intervening block-score screens. These are 50 actual tosses per participant, not ten block means. This paragraph describes published methods, not independently verified participant demographics.

The archived [task instructions](../artifacts/learning-pilot/data-access/originals/index-v6-1000.html) and [task JavaScript](../artifacts/learning-pilot/data-access/originals/moving-dart-v6-1000.js) independently define the keyboard controls, block structure, score feedback, and record fields. The [analysis source](../artifacts/learning-pilot/data-access/originals/Experiment%201a.Rmd) lines 37–79 loads both batches, selects `condition == "main"`, and reconstructs the cumulative toss index. Lines 81–130 apply the outcome-dependent exclusion: the fitted linear slope is rounded to four decimals before testing whether it is negative. The latter rule is **not adopted** here. The author's cleaned-data and fitted-learning-rate/model-output files were not downloaded or used.

## Exact raw files and administrative checks

| Original file | OSF versioned download | All rows | Observed main tosses | Participants | SHA-256 |
|---|---|---:|---:|---:|---|
| `00.exp1a-raw-batch1.csv` | [rbc8d, v1](https://osf.io/download/rbc8d/?version=1) | 2,550 | 2,500 | 50 | `25b454aa2cbe878f0db25d3c054c545cbc867829c861d74ef826155a9eb8c7a3` |
| `02.exp1a-raw-batch2.csv` | [qf8bc, v1](https://osf.io/download/qf8bc/?version=1) | 255 | 250 | 5 | `53322c18dc906de306798a4c24e20acc2f683ad44bc571d6bf9d954aa8828cee` |

Every participant has exactly one complete sequence of tosses 1–50; there are no shared participant IDs across the batches. The remaining 55 rows are `attention_checks` records, not tosses. The separately deposited attention-check CSVs were archived as auxiliary originals; they are not needed to select the performance series and were not used to choose participants. No incomplete participant appears in these two released raw files; this does not establish how many people may have begun but never submitted the original study.

[Schema checks](../artifacts/learning-pilot/data-access/schema-checks.json) record headers, row/participant counts, chronology, finite-field counts and measurement identity. All 2,750 distances and coordinate fields are finite, distances are nonnegative, and each distance matches the Euclidean distance reconstructed from its coordinates within the stated numerical tolerance. There was no averaging by practice dose, performance ranking, slope computation, parameter estimation, trend plot or holdout comparison. Reproduce the administrative checks with:

```sh
python3 artifacts/learning-pilot/data-access/check-schema.py
```

## Measurement dictionary for the frozen specification

| Field or derivation | Meaning and treatment |
|---|---|
| `unique_id` | Study-generated random `WLL-` identifier. The task code creates it with random base-36 strings, separately from Prolific ID. Use for within-person grouping, with a batch namespace; do not publish identifier-level profiles. |
| `condition` | `main` denotes an actual toss. `attention_checks` denotes an auxiliary questionnaire record. Experiments 1b/1c/2 contain predictions and are outside this selection. |
| `trial_num` | Block index 1–10, not the cumulative toss index. |
| `which_throw` | Zero-based position 0–4 within a block. |
| `(trial_num - 1) * 5 + which_throw + 1` | Cumulative observed toss number 1–50. Equal-dose trial opportunity measure; not elapsed or active minutes. For performance on toss `t`, prior completed tosses are `t - 1`. Freeze the model's origin explicitly. |
| `distance_from_radius` | Despite the name, Euclidean distance of the landed lollipop head from the target center, in rendered CSS-pixel coordinates; lower is better. JavaScript lines 247–288 obtains DOM offsets/dimensions, calculates distance, and records terminal coordinates. It is not radial overshoot beyond the target boundary. |
| `arrow_V_stopping_x/y`, `board_center_x/y` | Terminal head and target-center coordinates supporting the distance identity check. Absolute page position is not itself proficiency. |
| `board_outerRing_radius`, `board_bullseye_radius` | Rendered geometry. Outer radius is 139.922, 139.974 or 140 CSS pixels across the deposited records; the bullseye is approximately 14. Use raw pixels or explicitly freeze normalization before fitting. Do not adjust based on fitted performance. |
| `throw_score`, `trial_score`, `total_score` | Discrete toss points, accumulating block score and accumulating total score. They are distinct outcomes; the cumulative fields are not independent per-toss performance. |
| `arrow_H_moving_duration` | Milliseconds between task animation start and the Space stopping action; a task-component timer, not total practice dose. |
| `strength_duration` | Milliseconds holding Enter, used to control vertical displacement. An observed motor-control input; changing it need not mean more learning exposure. |
| `trial_duration`, `startTrialTime`, `endTrialTime` | Do not treat as a valid uniform active-practice timer. The deposited code starts `startTrialTime` on block entry, clears it after each toss, and does not start it again until the next block. Correspondingly `startTrialTime` is missing on 2,200/2,750 main rows, all within-block positions 1–4. `trial_duration` remains numeric because subtraction from an empty string can produce an epoch-like value. |
| `id` | Export record index; it increases within each person's sequence but restarts across batch files. It is not a global participant or trial identifier. |

The code includes feedback animation and participant-controlled progression through block screens. Wall-clock differences would mix action, feedback, pauses and platform behavior. This dataset **does not supply a verified total active-practice-time measure**, even though component timers and dates are present. A toss-count comparison cannot calibrate the runtime's per-minute learning coefficient.

## Privacy and limits of admission

The public files omit the platform ID columns written by the acquisition source and instead retain the separate random study IDs. They do retain timestamps, demographics and questionnaire text; they are deidentified research deposits, not an assertion of irreversible anonymity. `names_response` asks for names of similar games, not a participant's name. No identity lookup, demographic profiling or clinical inference was performed. The eventual analysis projection should retain only its frozen task fields and omit questionnaire responses and calendar timestamps. Preserve raw originals unchanged for provenance; they mirror the public CC0 OSF dataset xzm5c and are published with this repository (owner, 2026-10-05).

Selection is already informed by the paper's reported exponential result and by its deliberate choice of a task expected to produce that pattern. This is **not an untouched independent cohort**. The access check does not claim replication, later-trial prediction success or comparative superiority. A prospective chronological split is a new analysis rule on an already published dataset, not a new preregistered data collection. The paper also reports that its main results replicate when the five excluded people are included. The complete 55-person release removes that learning-based exclusion from our proposed eligibility rule, but does not make the enlarged sample's published result unknown; it cannot remove online self-selection, completion selection, device effects, task-design selection, feedback effects or the short 50-toss horizon.

No fallback dataset was searched after this source qualified. Root must freeze the exact all-55 selection, observation link, dose origin, exclusions, competing models and chronological split before fitting. Any later normalization, alternative outcome, additional exclusion or block aggregation must be identified as an amendment rather than silently inherited from the original analysis. The released Human/runtime and delivered games remain unchanged.
