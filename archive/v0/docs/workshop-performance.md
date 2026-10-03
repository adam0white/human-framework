# Workshop browser command performance

Measured 2026-09-07 against the source hashes in [the JSON artifact](../artifacts/workshop-browser-benchmark.json). Both separately measured viewports pass the predeclared **pure-command p95 < 16 ms** budget from `docs/workshop-integration.md`.

| Chrome viewport | Timed host commands | Command p95 | Maximum observed command | Individual command fixtures below 16 ms at p95 |
| --- | ---: | ---: | ---: | --- |
| 1280 × 900 | 19,000 | approximately 0.10 ms | approximately 0.20 ms | all 19 |
| 390 × 844 | 19,000 | approximately 0.10 ms | approximately 0.20 ms | all 19 |

Chrome was `152.0.7977.77`, running on macOS `26.6.2` / Darwin `25.6.0`, arm64 Apple M4 with ten reported logical CPUs. The actual measurement used the available **Playwright MCP**, which responded successfully despite an earlier closed transport. Each viewport used a new isolated browser context and page; the user's app/browser state was not reused. This is not CUA evidence or a physical mobile measurement. The 390 px run changes the desktop viewport, with device scale factor 1 and no CPU/network throttling. The MCP browser's original headed/headless launch flag was not exposed or inferred.

Browser `performance.now()` had a minimum observed positive step of approximately **0.10 ms** in both runs. Consequently, most individual commands recorded zero: 17,000/19,000 desktop and 16,923/19,000 narrow viewport samples. Zero means below timer resolution, not instantaneous execution. The p95 result supports the 16 ms acceptance decision on this machine; it does not support microsecond precision or a portable device-performance guarantee.

The browser imported the real host, human component and shared model from a blank local harness. Source bytes were frozen and hashed before serving, and the runner rejected source changes during the measurement. There was no mock runtime or alternate kernel. Only one synchronous public operation and the surrounding timer reads were inside each timed interval; setup, module downloads, fixture selection, validation, reporting, rendering and network I/O were outside.

The deterministic workload contains 19 equally weighted command fixtures: retrieval, travel, inspection, partial advances and interruptions, successful seed-1 and failed seed-2 repair, blocked repair, meals, rest, final verification, deadline interruption and a near-complete fractional interval. The blocked state is reached through legal interrupted work, without editing human state. Every fixture is checked before warmup and again on its last measured result. Each viewport runs 200 untimed warmups per fixture followed by 1,000 measured operations per fixture in a fixed round-robin order. These are warm operations on repeated representative states, not a cold-start or continuously expanding-world workload.

Three save fixtures separately cover export, import and a JSON round trip of an in-progress repair. A fourth separate fixture projects the view and selects the next controller action. Their p95 values were also approximately 0.10 ms; they are **excluded from the pure-command budget distribution**. Nearest-rank percentiles, maxima, zero counts and per-fixture timing histograms are retained in the artifact. No outlier, garbage-collection pause or scheduler delay was discarded.

To reproduce with an already-installed Playwright package and an isolated Chrome process:

```sh
node scripts/workshop-browser-benchmark.js \
  --playwright /absolute/path/to/already-installed/playwright \
  --json artifacts/workshop-browser-benchmark.json
```

The runner does not install a browser or package. On this machine an existing package was found at `/Users/abdul/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`; the recorded run used MCP instead. For the MCP route, start `node scripts/workshop-browser-benchmark.js --serve`, open fresh contexts at 1280 × 900 and 390 × 844, navigate to the printed local URL, import `/benchmark.js`, run `measure()`, and POST each returned object to `/result`. The second result writes the artifact and verifies the source hashes; stop the local harness afterward. This path was exercised for the recorded artifact.

Separately, a read-only lab homepage check in a fresh 390 × 844 context at `http://127.0.0.1:4174/` reported `innerWidth=390`, `document.documentElement.scrollWidth=375` and `document.body.scrollWidth=375`. There was **no horizontal overflow**. The added workshop link occupied x=131.05 through x=275.78 with height 58 px. This DOM check is separate from root's CUA screenshots and manual play verification.

No runtime, app UI or user session was changed for this measurement. Rendering speed, startup/download time, physical mobile behavior and formative playtesting remain separate questions.
