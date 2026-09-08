# Paid-work protocol review

Scope: independent read-only review of docs/work-progress-proposal.md and docs/work-progress-execution.md, using only existing src/games/camp.js, src/games/commons.js, src/runtime/index.js, src/human/v0.1.1.js and src/core/model.js. No candidate/rival implementation, previous verdict, external reviewer, new agent, comparison matrix or repository edit was used. An independent prescribed-payment check under /tmp uses the unchanged Human API only; it is not an alternative host implementation or candidate/D parity result.

## Arithmetic and feasibility

All eight D/candidate times are correct. First bases are A=20-floor(.10*4)=20 and B=20-floor(.60*4)=18. Round only at the integer completion boundary with the inherited EPS; the final partial fraction still costs a full paid minute of practice.

| History | Independent derivation | D/candidate completion | Amended F completion |
|---|---|---:|---:|
| H1 | 20 unchanged A minutes | 20 | 20 |
| H2 | 1 + ceil(.95*14 - EPS) | 15 | 20 |
| H3 | 7 paid work + 3 paid rest + 13 paid work | 23 | 23 |
| H4 | Same fractions and contributions as H2 | 15 | 20 |
| H5 | 1 + ceil(.95*18 - EPS) | 19 | 20 |
| H6 | 1 + ceil((17/18)*20 - EPS) | 20 | 18 |
| H7 | Refusal leaves A's original 20-minute assignment | 20 | 20 |
| H8 | A:20; B:2+18, because earlier rest gives no practice | both 20 | both 20 |

The existing 20-minute garden stage does cost 5 timber/1 salvage and .20 effort. Largest full-job starting forecast is A's fatigue .43/hunger .24; B is .427/.236. C's paid craft is .2215/.202 and B's full hauling duty .246/.208. All are comfortably feasible. The independent check paid 173 work minutes across these eight prescribed schedules, with every one-minute Human capacity check allowed. C pays one crafting minute/.02 in H2/H4 only; H7 B pays four hauling minutes/.04 and receives zero construction credit. Each actor ends at minute40 with 40 paid minutes, nextAttempt41, pending=null, fatigue0 and hunger approximately .28. Output material is 5/1 per item, with no repeated reservation or refund intended.

Payment evidence: /tmp/work-progress-payment-check.mjs and /tmp/work-progress-payment-check.json. All floating values are retained; the check is an accounting oracle, not a performance sample.

## Corrections and required declarations

Three pre-execution ambiguities were reported and are now resolved in the execution amendment: H3 is mandatory for F too (no unscripted F20 path); F keeps its first-item tool latch through stop/resume (H4F20); repair begins with source-frozen H1–H7, then records the gasket and two-item/H8 changes separately, honestly reporting already-supported capability. C's blank is also now explicit: sole-owned stock1/spent0 at minute0, consumed at minute1; no hidden reservation normalization. Stable lastResponse reason codes are declared.

Keep the following explicit in the frozen runner/contract:

- Clamp every driver at the minute1 save boundary, including H1 where there is no minute1 command. Supplier completion and hauling completion count in nextEvent. All paid minutes settle before same-time effects, export and scripted commands.
- Match camp's whole-remaining-job capacity admission on start/transfer and per-minute payment checks; a rejected command must leave all actors/items/material intact. The eight easy-body fixtures cannot establish that rejection works. Include the planned bounded unfit-start/recipient lifecycle checks.
- H3/H4 do not themselves discriminate illegal same-worker basis refresh: construction .10 remains below the .25 threshold even after seven minutes. The separate planned retention check must offer a genuinely different later basis, or cross that threshold. Do not describe these eight timings alone as proof of retention.
- Exact normalized parity needs the declared action IDs, skill maps, reason codes and update ordering. Investigate tiny arithmetic differences without ad hoc rounding away body, effort or progress differences. Count normalized-observation adapters in authoring cost and retain authoritative exports.

At inspection, execution.md line35 contained literal backslash-n sequences before “person is”; this is a formatting correction, not a physics defect.

## What this can justify

All arms finish all prescribed output by40, and every body's fatigue has reached zero then. Thus first-completion/paid intermediate records matter; endpoint body equality cannot show that timing has no cost. F is an honest sufficient contract for these endpoint outcomes and is quicker in H6; candidate/F timing differences measure changed work rules, not abstraction quality.

Promotion requires exact candidate/D behavior in both independently authored consumers, equal ownership/capacity/restore/error coverage, no camp internals or shared exceptions, and an actual reduction in duplicated maintenance/validation obligations after counting the helper, both adapters, observation glue, supplier scheduling, Human payment, material/output settlement and guards. A renamed repair schema using the same law is narrow integration evidence. Passing these scripts or shortening caller files alone does not establish broader portability, gameplay usefulness or human realism. A neutral result should retain direct code.

Source identity: reviewed initial execution SHA256 bdf6e66410a5de6a0c7ec4c14a555253444faf4e4f19e7186110e1f0966655b8; inspected amendment SHA256 1380ed61573ce29d043199f74942c2a224b171a5b1127da2716a6cb30daa6fab. Proposal SHA256 26c2e6700270d41943fe9eecc5099c71821549d5af685251a9b31bd699190424. Camp/Human/model hashes match the proposal's a695c312 / 516c5898 / 1bf30267 source pins. This review approves the fixture arithmetic and feasible payments, not uninspected implementations or package promotion.
