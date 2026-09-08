# Fresh independent Across Cut core review

Date: 2026-09-08. Verdict: **favorable within the reviewed authored-software scope; no actionable correctness or actor-isolation defect found.** This is not evidence about human realism, general cognition, policy superiority, or player usefulness.

## Exact source and scope

- Checkout: `/Users/abdul/code/human-framework`.
- Reviewed HEAD: `caf7a88bf336a33e7b13504f524408e00eb87cbf`.
- Executable-source comparison: `b3ec6942cbb6fb27b3c9a892934ff83b281fd8ba` to reviewed HEAD has only four `artifacts/across-cut-core/` additions. The host and its frozen dependencies are unchanged in this comparison.
- Artifact-only commit supplied for provenance: `7d1623f9a0f8199fef2f5c60dd4730410f3f7ed3`.
- Read the host, contract, its existing test file, runtime export, clock, Human 0.1.1, and transitive model dependency. Also read project workflow/context. Did not read existing Across Cut reviewer verdicts or existing preflight result artifacts.
- Executed no policy runner, policy comparison, or reserved policy cases. All new executions below are individually prescribed API/lifecycle counterexamples.
- Made no repository edits, commits, pushes, or deployments. Probe source and output are under `/tmp`.

SHA-256 at review:

| Source | SHA-256 |
|---|---|
| `src/experiments/across-cut/host.js` | `13200cf52557d5c7c45319548e79512998c020e4c73eb6e8f35f17e5800080db` |
| `docs/across-cut-contract.md` | `bb26d2f9358964141b8c99f6059b4155db5ca9527b35e238bd77839eacf19d57` |
| `tests/across-cut-host.test.js` | `83ef1fdfc7747a72cbe70c03d8b5710b1545b289e3e7e270f23d7adfc9a7802a` |
| `src/runtime/index.js` | `e685a514993fc0e32a84cad54d4a2a23287525e1d9923b4ee479b4cf3421ed7f` |
| `src/runtime/clock.js` | `ab770e36dcbf9a248fae30ce614b42d2e131a72176658c3eb130b40f4a49eb6c` |
| `src/human/v0.1.1.js` | `516c5898b7352847f87abfa34b3a010a19d3461d82d81b398bba252bc9598b00` |
| `src/core/model.js` | `1bf30267083e8e2617fe9964d4654d8da158cba309909ace7bb50c1e6de29c59` |
| `scripts/runtime-release-lock.json` | `f27bd54f0549f5dcb8016099669f3a74f27a4edf2378953a60803711cbd1b165` |
| `scripts/build.js` | `8309e689be84692c2b026690374d5c927d59b7bf43392d140641632415d2d3b0` |

A source comparison from the stated preflight base `38deade67fd25c03809d72e2e5b617c455833040` to reviewed HEAD found no changes under `src/runtime`, `src/human`, `src/core`, `public`, or `games`, or to `package.json`, `scripts/build.js`, and `scripts/runtime-release-lock.json`. No live-site/build output verification was attempted in this core review.

## Verification

| Suite | Node 26.8.1 | Minimum Node 22.0.0 |
|---|---:|---:|
| Existing `tests/across-cut-host.test.js` | 23/23 pass | 23/23 pass |
| Fresh `/tmp/hf-across-cut-core-probes.mjs` | 20/20 pass | 20/20 pass |

New probe SHA-256: `d7509cade9b51612c9c3da730670918302b21027e39d9f1d5bb54357b2399847`.

New test output:

- `/tmp/hf-across-cut-core-node26.txt`
- `/tmp/hf-across-cut-core-node22.txt`

Reproduce from the checkout:

```sh
/opt/homebrew/bin/node --test tests/across-cut-host.test.js
/opt/homebrew/bin/node --test /tmp/hf-across-cut-core-probes.mjs
/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/human-node22-review-xnBFhK/node-v22.0.0-darwin-arm64/bin/node --test tests/across-cut-host.test.js
/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/human-node22-review-xnBFhK/node-v22.0.0-darwin-arm64/bin/node --test /tmp/hf-across-cut-core-probes.mjs
```

## Findings by boundary

**Actor-local information.** Paired worlds varied remote repair requirement, remote body, launch time, seed, remote tasks, and remote zero-time journal history. Own complete views and known boundaries remained structurally equal across the relevant hidden differences. Request outcomes/errors for release, repair, cart, and attempted contact were equal across the remote-state twins and did not mutate inputs. Separate hydraulic-success/failure worlds remained indistinguishable to the keeper through minute 30. Completed transmissions with two-minute, six-minute, and lost outcomes gave identical sender views; only the recipient's actual receipt differed. Eighty peer-only control entries did not change keeper receipt/proposal/message IDs or its budget. This supports isolation for the tested host API, not a blanket proof for arbitrary future code.

**Independent consent and reports.** Own acceptance is stored independently of transmitting a response; withdrawing during an in-flight transmission preserves the acceptance payload captured at request time. Actual promised release can fulfill before any response/confirmation; a confirmation does not create receiver consent or attend work. Receiver attendance with all four promised minutes fulfills without a sent response, while a one-minute gap expires. Reordered progress reports keep both observations and the original source timestamps, with the newer source-time fact retained as latest. Passive received reports carry deliberate message content; no transport outcome or future due time appeared in sender views.

**Resources, cart, and motion.** Tested every interruption minute 0 through 9 of a cart trip, including the outbound endpoint and every return phase. Before outbound delivery the owned unit is recoverable; afterwards it stays consumed. Position and paid return distance persist. A cart unit carried to valve cannot be relaunched there; the actor must pay the actual return to dock. Starts at 21, 22, 23, 26, 27, 28, and 29 demonstrated launch-endpoint admission and horizon interruption. Start 22 delivers at 27 and pays an incomplete return through 30; later departures cannot create on-time service. Partially installed repair fittings cannot be duplicated, interrupted meals do not grant relief, and stopped unsent radio restores its charge. Prior cart service followed by pipe service accounts for one excess unit without minting water. Invariants require nonnegative integer inventories, exact water total 3, own paid minutes equal the elapsed clock, and exact replay.

**Launch and public horizon.** Local launch knowledge may create a known boundary; hidden launch departure does not end the keeper view. A completed release at 30 retains two queued in-transit units beyond the finite episode; a release interrupted at 30 restores its two unused water units. Those cases remain conserved and replayable. The host's geometry, endpoint rules, and unfinished return at episode closure are authored contractual choices.

**Replay and bounded controls.** Fourteen targeted save changes across work, delivery, water, inventory, receipt counters, inbox time, terms, contributions, position, paid time, job endpoint, practice, commands, and injected no-op advance were all rejected. Setup/action/save accessors were rejected without executing getters; non-JSON values were refused and valid null-prototype JSON was accepted. Detached actor views, summaries, saves, and boundaries could be mutated without changing authoritative state. Both actors simultaneously reached used 126 plus two reserved controls, advanced 27 separate minutes, stopped and withdrew to exactly 128 each, and completed three further separate advances. The resulting journal had exactly 286 entries and replayed on both runtimes; further ordinary admissions were refused while required unilateral controls remained available.

## Disposition and remaining boundary

No host change is recommended from this review. The 20 independent probes are suitable as preserved review evidence; selectively moving durable regression cases into the repository is the integrating agent's decision. Exact source freezing and policy/evidence provenance are separate integration work. This review did not run policy comparisons, inspect policies, evaluate a public interface, or establish scientific or theological validity.
