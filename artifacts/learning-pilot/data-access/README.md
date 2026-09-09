# Lolli-toss Experiment 1a: private access evidence

Source: Xiuyuan Zhang, Samuel D. McDougle and Julia A. Leonard (2025), *People accurately predict the shape but not the parameters of skill learning curves*, [Cognition 258, 106083](https://doi.org/10.1016/j.cognition.2025.106083), [OSF xzm5c](https://osf.io/xzm5c/).

Read [the access decision](../../../docs/learning-data-access.md). The OSF project declares CC0 1.0 Universal; its exact license metadata and text are preserved here. Published-paper copyright is separate.

- `originals/`: unchanged versioned raw/auxiliary CSVs and task/analysis source, with OSF-matching SHA-256 hashes in `download-manifest.json`.
- `metadata/`: unchanged anonymous OSF API responses, hashed in `metadata-manifest.json`.
- `sources.json`: primary-source methods references and scope of access.
- `schema-checks.json`: administrative counts, chronology and measurement-identity checks; no model outcomes.
- `check-schema.py`: offline reproduction and original/metadata hash verification.

Run from the repository root:

```sh
python3 artifacts/learning-pilot/data-access/check-schema.py
```

The data contain 55 released participants with 50 actual tosses each. Keep originals private and use task-only projections for eventual analysis. No fitted learning-rate files, published model-output tables, other experiments or clinical records were acquired. No models were run, and no learning-based eligibility rule was applied. Freeze the pilot's specification before fitting.
