# Empirical learning pilot evidence

This directory holds private research evidence, not game assets or runtime dependencies. Raw CC0 research files include more fields than the analysis uses; preserve the originals and use only the restricted performance projection. Do not publish participant profiles or copy these assets into the public build.

- [Frozen protocol](../../docs/learning-pilot-protocol.md), first committed at `de2fc86527ec073a89ddba5ea884cc32887c620d` before real-data fits or performance trends.
- [Selected data qualification](../../docs/learning-data-access.md) and [exact source files, license and administrative checks](data-access/README.md).
- [Alternative availability dispositions](../../docs/learning-data-alternatives.md); no alternative-data fits were performed.
- [Analysis environment pins](requirements.txt): Python 3.12.14, NumPy 2.3.5, SciPy 1.16.3, Matplotlib 3.10.8 on macOS ARM64. These packages are isolated research tooling, not additions to the Node package or browser runtime.

Create a separate Python environment and install `requirements.txt` to reproduce the analysis. The runner must verify its committed source freeze and data hashes before fitting. Use fresh output paths; retained initial results must not be overwritten. Exact execution, result and independent-verification links are recorded in the final report after execution.

The observation is normalized target error per throw, not latent proficiency or active-practice minutes. All 55 people are retained, including the five excluded from the publication using fitted improvement. The published exponential claim was known before this secondary analysis; this is not an untouched external cohort or a prospective study.
