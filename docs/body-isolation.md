# When a small game needs separate food and rest

2026-09-08. **With identical saturating practice, pooled stamina meets the declared operational tolerance in 13/25 pairs: 9/12 development and 4/13 reserved.** It suffices for balanced work, resource shortages, the longer mixed workload and both novice/practiced retests. Separate body channels earn one specific authored distinction: equal-load actors can require opposite recovery choices. No result establishes human physiology, learning accuracy, player understanding or measured authoring benefit.

For the next small game, retain separate food/rest only if the player must distinguish those bottlenecks and spend a scarce ration or deadline accordingly. The new 40-minute probe provides a concrete candidate choice to make playable. If that distinction does not affect the intended choices, pooled stamina with the same one-scalar practice update remains a credible smaller representation. Existing released games and package versions stay unchanged; no new mechanism is promoted.

## What was isolated

The [protocol and full matrix](body-isolation-protocol.md) were committed at `780d20d7f1aaa57f49c2ee1fde0d0042b28cd274` before implementation/results. The [implementation freeze](../artifacts/body-isolation/freeze.json) records `f8e146f6451d5649874f3f3637d4c1fd115604fa` and hashes 15 files before reserved, sensitivity and state execution. The earlier [linear-counter experiment](mechanism-comparison.md) is unchanged. Its conditions/results were known: “reserved” here withholds **new-arm outcomes** until freeze, not previously unseen conditions or blind design. Four equal-time recovery-choice conditions are newly authored diagnostics, also source-visible before execution.

Human 0.1.1 and pooled stamina both call the exact frozen `practice()` function and retain one current proficiency per task. There is no initial-proficiency array, practice counter, alternate learning rate, forgetting or transfer in the pooled model. Both use the same initial skills, task difficulty/hazard/exposure, owned food/parts, command durations and start-forecast output rule. Pooled state has one body scalar, mapped as `S=1-(2F+H)/3`; initial success forecasts match within 1e-12. Both practice curves are `s+(1-s)*(1-exp(-0.0052*t))` (implemented using `expm1` for numerical accuracy).

The scalar body integrates analytically matched maintenance, effort, rest and meal effects with its own clamp. Unlike the historical rival, completed pooled meals preserve the full paid maintenance before relief/clamping, matching Human's receipt-order convention. This was fixed in the new protocol before code/outcomes. Pooling, separate clipping boundaries and independent capacity remain intentionally different. No Human body values are retained as a hidden pooled gate.

At an exactly mapped state, Human requires both `F+0.0015t+effort ≤ 1` and `H+0.002t ≤ 1`. Their weighted sum implies the scalar bound `1-S+t/600+(2/3)effort ≤ 1`. Thus the nominal pooled gate is analytically no stricter, with the declared numerical tolerance. Human-blocked/pooled-admitted cases follow from authored rules, not an empirical discovery. Later trajectories can cease mapping because admissions, recovery and clipping differ. Expected production from extra admitted work is not evidence that pooled actors perform better physically.

## A 40-minute choice, with both costs visible

Both starts have load 1.48 and scalar stamina 0.38333: hungry is `(F=.45,H=.95)`, fatigued is `(F=.90,H=.05)`. Each owns one ration and three parts. Routes are rest 20 → work 20, or meal 10 → idle 10 → work 20. Work effort is .12. Both routes cost 40 minutes; meal spends the ration and rest retains it. These are prescribed alternatives, not autonomous policy comparisons.

| Start and recovery | Human work admitted | Pooled work admitted | Expected output H/P | Rations spent H/P |
|---|---|---|---:|---:|
| Hungry, rest | No | Yes | 0 / 5.12497 | 0 / 0 |
| Hungry, meal | Yes | Yes | 4.23115 / 4.23115 | 1 / 1 |
| Fatigued, rest | Yes | Yes | 5.12497 / 5.12497 | 0 / 0 |
| Fatigued, meal | No | Yes | 0 / 4.23115 | 1 / 1 |

Human's feasible recovery choice reverses between the two starts. Pooled stamina predicts the same outcomes for both and rest dominates meal on both expected output and ration retention. This cleanly identifies a representational consequence worth testing in a game. The constructed inputs deliberately expose that consequence; they neither establish prevalence across games nor prove players value it. Missing a bottleneck is only a defect when the host intends that bottleneck to matter.

## Other controls and preserved agreement

H/P means Human/pooled. Values are expected units from admitted completed jobs, not sampled successes. All full traces, refusals, actual exposure and paid resources remain in [development](../artifacts/body-isolation/development.json), [reserved](../artifacts/body-isolation/reserved.json) and [sensitivity](../artifacts/body-isolation/sensitivity.json).

| Condition | Work minutes H/P | Expected output H/P | Equivalent |
|---|---:|---:|---|
| Idle control | 0 / 0 | 0 / 0 | Yes |
| Balanced work | 160 / 160 | 45.61 / 46.01 | Yes |
| Sustained work | 120 / 140 | 25.59 / 29.47 | No |
| Hungry, repeated rest/work | 40 / 120 | 7.39 / 39.73 | No |
| Fatigued, repeated meal/work | 20 / 120 | 2.15 / 31.44 | No |
| Scarce resources | 60 / 60 | 16.41 / 16.52 | Yes |
| Reserved hungry alias + rest | 20 / 80 | 5.02 / 27.59 | No |
| Reserved fatigued alias + rest | 80 / 80 | 26.01 / 27.59 | No |
| Reserved hungry alias + meal | 60 / 80 | 13.78 / 18.85 | No |
| Reserved fatigued alias + meal | 20 / 80 | 3.79 / 18.85 | No |
| Longer mixed work | 320 / 320 | 124.52 / 125.01 | Yes |
| Material shortage | 40 / 40 | 11.87 / 12.02 | Yes |

The tolerance requires identical step decisions and final resources, output gap at most 5% of offered output, and mean jointly admitted forecast gap at most .03. Retests additionally require identical admission and per-branch forecast gap at most .03. These are authored small-game tolerances, not statistical significance or measured player indifference. The fatigued-rest alias has equal admissions and resource use yet fails the forecast threshold; classification alone does not imply a different feasible choice. Idle agreement is retained but says little about useful work.

Sensitivity scales only pooled recovery by .75 or 1.25. Agreement becomes 10/25 and 12/25 respectively, versus nominal 13/25. Human and both practice updates stay fixed. The variants disclose coefficient dependence and were not used to tune or select a new model.

## Learning equality and the remaining forecast gaps

All A/B/idle arms pay 120 exposure minutes, rest 40 and meal 10, with owned food and admitted practice reported explicitly. Independent paid A/B retests then spend 10 more minutes and a part if admitted. No free reset erases body costs. A/B exposure body paths match within each model; idle is a different exertion control.

At the novice endpoint, both active arms admit 120 practice minutes and reach trained proficiency **0.57136 in both models**, with untrained proficiency .2. The A retest after A practice forecasts .81328/.81689; its small gap comes from endpoint load .024/0 after recovery/clipping. After B practice the A forecast is .49650/.50250. Every novice and practiced exposure/retest arm now meets tolerance. This corrects the earlier comparison's curve confound without revising that frozen record.

The strained reserved start admits 100/120 training minutes. Trained A proficiency is .49466/.54457 and trained B proficiency .79192/.81247, exactly as the **same** learning curve predicts for different paid exposures. Its retest endpoint load is .136/.248 after active training; both capacity exposure and remaining body load affect forecasts. The idle strained arm has equal untrained skills but load .136/0, giving A retest forecasts .41921/.45264: the .03343 gap lies just beyond the declared .03 threshold. Keep that near-threshold failure without turning it into a qualitative scientific claim.

The [arithmetic audit](../artifacts/body-isolation/verification.json) checks 75 nominal/sensitivity paired trajectories, 1,512 offered model commands excluding retest branches, and 108 paid retest branches. Across 1,389 endpoint task checks with matched admitted exposure, maximum stored-proficiency difference is **zero**. Maximum error against the cumulative-exposure equation is 1.11e-16. Per-work logit gaps decompose as `4*(pooledSkill-humanSkill) - (pooledLoad-humanLoad)`, with residual at most 2.00e-15. Output gaps decompose into jointly admitted forecast gaps plus each model's exclusively admitted output, with residual at most 1.14e-14. Boundary endpoint counts mark possible clipping involvement; they do not by themselves identify every clipping event. These are arithmetic checks of the authored equations, not independent corroborating evidence about people.

## State, source and host responsibilities

| Measured scope | Human | Pooled |
|---|---:|---:|
| Model module bytes / nonblank lines | 11,580 / 176 | 6,000 / 74 |
| Adapter section bytes / lines | 649 / 9 | 595 / 9 |
| Module + used model declarations + adapter bytes / lines | 13,981 / 214 | 7,300 / 95 |
| Module + entire imported core/model.js + adapter bytes | 19,993 | 14,359 |
| Initial active host/person JSON bytes | 705 | 765 |
| Final JSON bytes after 10,000 commands | 792 | 834 |
| Peak JSON bytes including pending attempts | 1,396 | 1,268 |

Both have one current proficiency per task and one pending trained-skill baseline. Human has two dynamic body numbers; pooled has one. Human retains a body baseline and derived capacity object during attempts; pooled retains one stamina baseline and an allowed flag. The pooled snapshot also saves four body parameters and a recovery-scale field, so its idle state is larger despite fewer body channels. Both hosts keep identical reporting counters, current resources/time and one pending command; neither grows an event history.

The pooled module's action/number/field and state-validation blocks alone occupy 2,741 bytes/29 lines. The selected Human validation blocks occupy 5,544 bytes/81 nonblank lines and implement broader action, capacity and snapshot checks. These partial code categories overlap lifecycle mechanics and are not an algorithmic-complexity theorem. Human additionally supports observation projection, identity and version migration. Attribute neither the full source difference nor those capabilities to having two body numbers. The identical practice function itself is four source lines in either integration; diminishing returns require no extra per-task state.

The controlled host is 7,476 bytes/85 lines, paid by both integrations; its explicit validation block is 3,638 bytes/37 lines. Experiment execution/diagnostics are another 6,364 bytes/91 lines. The frozen host closes over its adapter registry, so the lifecycle was copied into the new scope instead of mutating a historical registry. Schedule decoding/comparison reuse 1,469 bytes/17 lines from the frozen module; importing those helpers also loads its full 16,822-byte experiment/adapter/old-rival source graph, though no old-rival trajectory is used by the new runner. Narrow declaration counts are inspectable source slices, not measured bundles or tree shaking. The optional clock/runtime re-export is frozen for integrity but is not executed by this prescribed-duration host.

There are zero model-specific world/resource/policy branches and zero frozen-source edits. The audit confirms every new Human schedule and retest exactly matches the unchanged historical host, including sensitivity and the four new choice conditions. Resource rejection, capacity refusal, interrupted work, completed-meal receipts and expected-output credit share the same host paths. Pooled model logic controls its own admission and body transition only.

A part is debited on work admission; interrupted work retains spent parts and elapsed practice but earns no output. Food is owned before a meal and debited with relief only on completed settlement; interruption or a second settlement cannot spend or relieve it again. Mid-action JSON resume is tested for both models, alongside malformed envelope/state fields, pending command/action/status/forecast claims, exposure accounting and over-advance rejection. These are validated local experimental snapshots. A mutually consistent forged history, altered initial resources or task definition cannot be authenticated from the snapshot alone; there is no cross-host adversarial-save or production import guarantee. The host's serialized forecast is checked against its pending baseline, but neither that baseline nor earlier earned totals prove real past activity.

The [bounded-state run](../artifacts/body-isolation/state.json) uses 10,000 work/rest/meal commands with 4,000 owned food and parts per arm and samples active snapshots including pending attempts. Both fit the declared 8 KiB budget. No runtime speed comparison was measured. Node v26.8.1 on Apple M4 arm64/macOS was used; no physical-mobile result, player study or human programmer onboarding/maintenance effort was measured. Source bytes, validation code and agent work are not human authoring effort.

## Reproduce and preserve

All **364 tests** passed, including 17 new body-isolation tests. Fresh executions reproduced all four deterministic `result` objects and hashes; environment/timestamps are excluded from the result identity. The [run record](../artifacts/body-isolation/run-record.md), [verification script](../artifacts/body-isolation/verify.mjs) and [full test output](../artifacts/body-isolation/tests.txt) preserve the sequence. Independent parent peer/Fable implementation/report review is pending this evidence commit; these tests and the self-audit are not substitute reviewer verdicts.

```sh
PATH=/opt/homebrew/bin:$PATH npm test
PATH=/opt/homebrew/bin:$PATH node scripts/body-isolation.js run --partition development --freeze artifacts/body-isolation/freeze.json --out /tmp/body-new/development.json
PATH=/opt/homebrew/bin:$PATH node scripts/body-isolation.js run --partition reserved --freeze artifacts/body-isolation/freeze.json --out /tmp/body-new/reserved.json
PATH=/opt/homebrew/bin:$PATH node scripts/body-isolation.js run --partition sensitivity --freeze artifacts/body-isolation/freeze.json --out /tmp/body-new/sensitivity.json
PATH=/opt/homebrew/bin:$PATH node scripts/body-isolation.js state --freeze artifacts/body-isolation/freeze.json --out /tmp/body-new/state.json
PATH=/opt/homebrew/bin:$PATH node artifacts/body-isolation/verify.mjs /tmp/body-new/verification.json /tmp/body-new
```

Use a new directory each time; all outputs refuse overwrite. Freeze validation checks current bytes and the retained implementation commit, plus preregistration and historical model dependencies. Preserve both original new commits after integration, as well as the earlier experiment's commits. This private experiment adds no package export, public route or deployed asset.

## 2026-09-08 review addendum: what the equality checks count

The [read-only breakdown](../artifacts/body-isolation/exposure-check-breakdown.json) disaggregates the original 1,389 matched cumulative task-exposure endpoint checks into three non-overlapping groups:

| Endpoint check | Development | Reserved | Recovery .75 | Recovery 1.25 | Total |
|---|---:|---:|---:|---:|---:|
| Both models have zero exposure to this skill | 147 | 87 | 234 | 234 | **702** |
| Equal positive exposure immediately after both actually practiced this skill | 44 | 39 | 83 | 83 | **249** |
| Equal positive exposure after a step when neither practiced this skill | 47 | 99 | 146 | 146 | **438** |
| Total | 238 | 225 | 463 | 463 | **1,389** |

The third group retains learned proficiency across other work, idle, recovery or refusal steps. The script checks actual admitted-practice increments, not merely an offered work label. These counts cover the same 75 paired trajectories as the original audit; separate paid retest branches were outside this particular count. Maximum matched-exposure proficiency difference remains zero in all groups.

These are repeated consistency checks of an **expected implementation identity**: the same deterministic practice update applied to matched admitted exposure preserves the same proficiency. Untrained skills, repeated endpoints and sensitivity repeats do not constitute independent scientific discoveries, participants or independent learning observations. The 249 immediate post-practice checks more directly exercise the update than the 702 zero-exposure checks; their count still measures software coverage rather than scientific evidence.

The **13/25** nominal result is a diagnostic classification under authored tolerances, not a model score or estimated prevalence across games. Forecast and output criteria are related: expected output sums admitted start forecasts multiplied by ten, so their agreement is not independent corroboration. Admission decisions, actual exposure and resource costs provide the separate operational distinctions. This addendum changes no frozen source, protocol, result or threshold and does not execute a new experiment.

Reproduce the accounting alone, using a fresh output file:

```sh
PATH=/opt/homebrew/bin:$PATH node artifacts/body-isolation/exposure-check-breakdown.mjs /tmp/body-exposure-breakdown-new.json
```
