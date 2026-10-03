# Independent Across Cut isolation evidence

Registered before execution at `4ca425c`; initial tests at `42f1e18`; final tests/report/runner at `36cf635`. Corrected host source is `b3ec6942cbb6fb27b3c9a892934ff83b281fd8ba`, SHA-256 `13200cf52557d5c7c45319548e79512998c020e4c73eb6e8f35f17e5800080db`.

`verified-node26.json` and `verified-node22.json` each bind source hashes, frozen dependencies, command, runtime,24 passing tests and complete TAP output. The one presence gate and23 behavior checks are detailed in `docs/across-cut-isolation.md`; all fixtures use legal setup/action histories except explicitly labeled forged-save validation attacks. No reserved policy case ran in this lane.

`initial-node26.txt` preserves the first13-test run with two incorrect fixture assumptions. `expanded-node26.txt` preserves the later22-test run. `final-node26.txt` and `final-node22.txt` retain24-test results before the final source-bound verification. These are distinct dated executions; earlier outputs were not overwritten. The fixture corrections are documented and are not counted as host defects.

Reproduce with a fresh path using either supported Node binary:

```sh
node artifacts/across-cut-isolation/verify.mjs /tmp/across-cut-isolation-fresh.json
```

The runner refuses overwrite, verifies the recorded host source and unchanged frozen dependencies, and imports no policy experiment or reserved partition. This is private software-boundary evidence, not human validation or general faculty promotion.
