# Empirical learning pilot evidence

This directory holds research evidence, not game assets or runtime dependencies. It was kept private while the repository was private; the raw files mirror the public CC0 OSF dataset xzm5c, and the directory is published with the repository (owner, 2026-10-05). Earlier "private" wording in the pilot's docs describes that period. Raw CC0 research files include more fields than the analysis uses; preserve the originals and use only the restricted performance projection. Do not publish participant profiles or copy these assets into the public build.

- [Frozen protocol](../../docs/learning-pilot-protocol.md), first committed at `de2fc86527ec073a89ddba5ea884cc32887c620d` before real-data fits or performance trends.
- [Selected data qualification](../../docs/learning-data-access.md) and [exact source files, license and administrative checks](data-access/README.md).
- [Alternative availability dispositions](../../docs/learning-data-alternatives.md); no alternative-data fits were performed.
- [Analysis environment pins](requirements.txt): Python 3.12.14, NumPy 2.3.5, SciPy 1.16.3, Matplotlib 3.10.8 on macOS ARM64. These packages are isolated research tooling, not additions to the Node package or browser runtime.

Create a separate Python environment and install `requirements.txt` to reproduce the analysis. The runner verifies its committed source freeze and data hashes before fitting. Use fresh output paths; retained initial results must not be overwritten. [Completed report and commands](../../docs/learning-pilot-results.md) · [Freeze](freeze.json) · [Initial results](run-initial/results.json) · [Restricted projection](run-initial/projection.csv) · [Independent verification](independent-verification.json) · [Exact repeated output hashes](root-exact-reproduction.json).

The first execution succeeded at freeze `1267107`, with implementation `8562f26408fab9c0f35cff4a8ef0164804cc6acd`. Fourteen runner tests and twelve independently generated synthetic curve fits passed before unsealing. All 168 real-data training-curve audits and result/interval reconstructions pass; no original result was replaced and no post-unsealing model/source changes were made. The initial plots retain their independently labeled panels. All source and derived participant data remain private.

The observation is normalized target error per throw, not latent proficiency or active-practice minutes. All 55 people are retained, including the five excluded from the publication using fitted improvement. The published exponential claim was known before this secondary analysis; this is not an untouched external cohort or a prospective study.
