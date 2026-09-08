# Independent consumer evidence

`node26/` and `node22/` are the final runs after the host review corrections. Each records the actual executable, installed package and source hashes, 15 repository-denied checks, the demonstration and the declared CPU workload. `repository-tests-node26.txt` records the 230-test repository run on the same final code. These are local execution observations, not a mobile performance claim.

`node23-initial/` retains the first shell-resolved run before review corrections; its test-output note explains why the inherited test reporter's binary output was discarded. `before-review-summary.json` preserves only the available initial Node 26/22 measurements. Their full reports were overwritten by the final runs; unavailable statistics were not reconstructed.

`before-review-source/` is a historical source snapshot, not another maintained example. The initial host was recovered by reversing the three subsequent host corrections (preserve the first warning, reject blocked imported work, bound imported warning time). Its SHA-256 and the unchanged measurement script's SHA-256 were checked against the original recorded hashes. These bytes identify what the initial measurements exercised.

`public-boundary-probe.js` and its recorded JSON reproduce two original human 0.1.0 limits through installed public exports: reordered capacity keys and fractional time increments at a large origin. A later compatibility patch is evaluated separately; these records retain the original behavior.

The reproducible installation harness is `tests/maintenance-package.test.js`; the runnable consumer is `examples/maintenance-watch/`. See `docs/independent-consumer.md` for constraints, authoring assistance and the before/after findings.
