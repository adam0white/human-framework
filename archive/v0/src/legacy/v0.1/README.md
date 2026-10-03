# Frozen 0.1.0 replay engine

These six JavaScript files are byte-for-byte copies of `src/core/*.js` at commit `f4a7d7cf45adabbd6038c1148f3d1ee5b33f2986`. They preserve old exports, including the old saturation behavior. Do not repair their numerical semantics: changes belong in the current kernel with a new version.

The current entry point routes 0.1.0 replay, projection, ranking and export here. It does not route `step` here: imported historical runs are read-only in the current app. Restart creates a new current preset and does not relabel or silently migrate the archived record. Golden state hashes in `tests/legacy.test.js` protect the historical behavior.
