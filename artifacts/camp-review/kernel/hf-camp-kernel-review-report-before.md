# Independent executed camp kernel review — pre-fix

Reviewed worktree `/Users/abdul/code/human-framework/.worktrees/camp-kernel`, clean head `8defa5a55d7e1102b33ad496c586643a2486163c`, implementation `ffe8fb4`.

## Finding

[P2] `src/games/camp.js:235–245` overlooks player recovery readiness in `nextStop`. Its predicates only see completed jobs, newly assigned jobs, and the zero-fatigue floor. Legal reproduction: finish timber/salvage/timber/salvage, reaching minute 74 with fatigue approximately .911; request workbench so Meryem starts its 22-minute first stage. Next Event returns 96/job-complete. Actual player timber capacity returns at 77, salvage79, garden80, shelter81. The call skips the earliest meaningful resumption point by 19 minutes. The same flaw exists with explicitly selected active-idle recovery. `/tmp/hf-camp-kernel-review-readiness.mjs` is the minimal executed regression. Root accepted this as the intended contract and is patching it.

No second correctness defect was found in the executed scope below. Review does not authenticate historical state or assert general human validity.

## Execution

- Independent targeted probes: initial 18 tests pass17/fail1 on Node26.8.1 and minimum Node22.0.0. Failure is readiness. Added nineteenth test covers selected versus unselected active-idle recovery and reproduces the same defect. My first run had an additional inappropriate exact floating point assertion (5/24); corrected to a 1e-12 tolerance. Original failure output retained separately.
- Independent deterministic randomized commands: each runtime passes4000 legal transitions,4800 mixed legacy imports with45-minute continuation,112 chunk-equivalence pairs,19981 advertised-job admission/execution checks. 51 observed original job signatures. Fuzzer max full game JSON11401 characters includes fixed original import snapshots.
- Independent ongoing campaign: each runtime reaches20000 minutes,454 caches,20979 commands, maximum full game JSON7115 characters. Legacy driver reaches1600 minutes,30 caches, then supplies428 additional four-arm imports including mixed active cache/meal/rest/gather states. JSON continuation agrees with uninterrupted continuation. Long-campaign and fuzzer reports are identical across runtimes after excluding version metadata.
- Independent targeted scope includes durable materials/fractions, paid fatigue/skill/effort,250 stop/resume cycles, consent and both handover directions, self-owned meals through release, gather cancellation, prospective versus snapshot tool timing, assembly/fixed tied completions, actual versus rounded availability, assembly+meal and rest import, JSON accessor non-execution/cycle/shared/sparse/NaN/depth rejection, resource/practice/receipt corruption rejection, and final finite world-limit stop/export.
- Synthetic finite-counter boundary checks for attempt/event/started counters after100 project requests still advance1440 minutes and export/view successfully. These are bound tests, not earned historical fixtures.
- Original Common Ground, frozen Human0.1.0/0.1.1, model, clock and runtime source have empty diffs against pre-kernel base and match their release lock hashes.

## Retained source SHA256

- camp.js: ccb71f95881382cb7a2e90ad03da994bc92e191526f695ac746db02d9cbabb47
- commons.js: b2c6f5e8bd38e84b729d73182170c88034edc3767e00c71cd65784233283aedb
- human/index.js: 0f6d30cf2b5e07f5e18dc791fecd691b9004f290e138abeab7336b1c2e2ee308
- human/v0.1.1.js: 516c5898b7352847f87abfa34b3a010a19d3461d82d81b398bba252bc9598b00
- core/model.js: 1bf30267083e8e2617fe9964d4654d8da158cba309909ace7bb50c1e6de29c59
- runtime/clock.js: ab770e36dcbf9a248fae30ce614b42d2e131a72176658c3eb130b40f4a49eb6c
- runtime/index.js: e685a514993fc0e32a84cad54d4a2a23287525e1d9923b4ee479b4cf3421ed7f
- camp-kernel-contract.md: 3246d683df146597d50cb4166033d2410ebf57ade8411eea72976e69fff3b289

## Artifacts and limits

Scripts `/tmp/hf-camp-kernel-review-{probes,fuzz,campaign,readiness}.mjs`; raw results `/tmp/hf-camp-kernel-review-{fuzz,campaign}-node{26,22}.json` and `/tmp/hf-camp-kernel-review-probes-{node26-corrected,node22,19-before}.txt`. Initial source copied to `/tmp/hf-camp-kernel-review-camp-before.js`. Scripts default to the original worktree; set `HF_CAMP_KERNEL_REVIEW_ROOT` to independently recheck an integrated source tree.

Reviewed actual source and dependencies, not merely author tests. No prior camp review verdict or player-feedback file was consulted; MVP/HANDOFF/contract context was consulted. Story wrapper/source journals and UI are separately assigned; no browser/device/performance claim, statistical proof, historical authenticity, or general-faculty promotion. No repository file edited, commit, push, deployment or user request was made by this reviewer.
