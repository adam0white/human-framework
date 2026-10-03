# Frozen 0.2.0 replay engine

The five implementation files (`model.js`, `simulation.js`, `observation.js`,
`policy.js`, `random.js`) are byte-for-byte copies of `src/core/` at commit
`08aab973bcaef51693d94beeed4d882e9c3124ee`. `tests/fixtures-v0.2.js` preserves that
commit's `tests/fixtures.js`; it is test data, not a runtime dependency.
`index.js` is an archive-specific direct-export entry point, because the live
facade at that commit refers to its sibling legacy directory.

These files preserve the old policy scores, capacity correction and replay
semantics. New changes belong in the live kernel under a new version. The live
facade can replay, inspect and export 0.2.0 states, but cannot advance them with
current physics. State and source hashes in `tests/legacy.test.js` protect the
archive against accidental edits.
