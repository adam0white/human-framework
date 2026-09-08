# Across Cut comparison amendments

## 2026-09-08: exact host contract, before controller implementation or outcomes

Original protocol `69fb67a` remains immutable. Host contract original `2c02ffb33913902af0e099c9d33a24a6be22f9b7` is the first concrete dependency. Its cart delivers after five outbound minutes and returns after five more; the proposal's “ten-minute cart trip” describes total occupied time, not the delivery instant. Pipe release starts after local repair, pays two minutes and arrives three minutes later. Short and long uninterrupted keeper paths therefore release at7/13 and arrive at12/18 after inspection0–1. The easy retained control is fixed pipe arrival12 plus cart insurance afterward (cart service17, return22), conditional on actual paid capacity; these are hypotheses pending execution, not results.

Controllers may inspect at their local station, use its actual repair progress, and price own recovery from admitted/refused effort. The fixed early policy aims at release7/arrival12. The conservative policy aims at release13/arrival18 and attends over the feasible window; the earliest policy releases upon actual local repair completion while the receiver uses common possible arrival bounds12/18. Each receiver can prefer cart by its own known latest departure minus five minutes. It need not wait for permission, a response or confirmation. Fixed schedules may finish the pipe before that fallback; early-departure cases may rationally take cart rather than miss both. Keep those tradeoffs visible.

Eight shared development configurations, each executed under every main arm:

| ID | Valve/inlet work | Local launch | Channel |
|---|---|---|---|
| D1 timely/easy retained | 6 / 2 | 27 | reliable delay2 |
| D2 long reply | 12 / 2 | 27 | bounded, every sender/minute slot delay6 |
| D3 missing receiver traffic | 6 / 2 | 15 | lossy, all receiver completion slots lost; keeper delay2 |
| D4 slow inlet | 6 / 14 | 27 | reliable delay2 |
| D5 both repairs long | 12 / 14 | 27 | bounded delay6 |
| D6 early slow inlet | 6 / 14 | 15 | reliable delay2 |
| D7 easy early overhead | 6 / 2 | 15 | reliable delay2 |
| D8 contact opportunity | 12 / 2 | 27 | lossy, all radio completion slots lost |

All initial bodies use host default fatigue/hunger .15/.15 and one owned meal. Slot maps are exogenous by sender and completion minute1..30 and stable across policies. A dropped receiver transmission can be a report or response depending on the arm; D3 is a channel intervention, not a clean acceptance-only ablation.

Separate source-prescribed paid development scripts instantiate original families D4 newer revision/old response; D5 newer readiness/old report; D6 omitted or withdrawn accepted work; plus interrupted transmission and contact. Their command times are declared in case source before outcomes, not supplied to actor-local policies. Same-script bookkeeping compares newest-source-time with last arrival and keeps the exact paid journal/world outcome fixed. These scripts do not count as autonomous controller successes.

Optional-confirmation policy pairs differ only by whether a receipt-only confirmation is sent after an accepted response; without it a receiver may retry once if the channel can lose messages and its chosen work has time. No receiver conditions physical attendance on a confirmation. Bounded reliable inference marks completed transmission arrival as inferred after maximum delay; this does not certify response, acceptance or work.

Reserved source-defined cases cover early-launch/arrival ties, upper bounded delay, lost confirmation and interrupted contributions using only legal host setup/actions. They remain sealed until root confirms finalized core review and a committed source/manifest freeze. Reserved outcomes cannot change these controllers. A post-freeze correctness fix needs separate evidence.

## 2026-09-08: strengthen the cheap report rival before the first full matrix

Root requested a direct one-way factual-report rival after initial source `264ef6d`; only the retained D1 fixed-early two-unit unit check had executed, not the matrix. Add ninth arm `one-way-report`: receiver sends its local inlet-work/launch facts once; keeper uses these to delay a physically legal release for a long inlet or avoid a known late arrival. Receiver may attend across the common short/long keeper arrival window. This changes paid exposure and factual information without requiring any proposal, response or acknowledgment. It is a serious simpler intervention, not a representation ablation.

The `reactive-radio` name means a **retained last-report policy**. The latest report remains usable if it arrived while the actor was busy; calling this no-retention would be inaccurate. A common schedule derived from a received fact also retains information. Full notebook policy still retains all source-timed facts and exact responses.

The committed core now exposes actual locally observed `serviceUnits`, `peerPresent` and an own `cartDelivery` observation. Policies can stop spending supplies after observing two served units. Confirmation and equal-cost response scripts carry no fresh physical-readiness report; their fixed physical actions are deliberately identical and cannot establish a confirmation-induced policy benefit.

With the integer-minute clock and one-minute radio action, canceling before radio completion has zero transmission exposure. The cancellation script reports that boundary honestly; positive partial exposure is demonstrated with repair/travel/attendance, not invented fractional radio work.

## 2026-09-08: retained first outcomes and development rival corrections

First matrix source `be1f104`, original core `335cfe`, and all 80 runs are preserved in `artifacts/across-cut/development-initial.json.gz` (evidence commit `dbf1553`). These are development outcomes, not reserved evaluation. Six contact runs retained errors: five cart requests at22 hit an erroneous whole-trip horizon admission check, and one attempted contact when the receiver was visibly away. The core owner accepted the former as a contract implementation defect: delivery27 should remain legal with the remaining return interrupted at30.

Before the second development matrix, strengthen three plainly weak choices and retain the old source/results: (1) contact receiver uses actual paid contact receipt to choose the later return/repair rendezvous; absent contact it keeps the useful ordinary broad12–18 arrival window, instead of blindly waiting for25 even when the keeper never visited; (2) one-way report receiver with a short inlet covers the feasible early arrival before its own launch rather than taking cart at10 merely because the longer possible arrival18 is late; (3) notebook keeper with no received departure notice protects the common earliest possible launch15, so a lossy missing report does not license an optional proposal delay past that launch. None grants hidden knowledge. Reports received during paid work remain usable. Observed completed service and known impossibility can end unnecessary work; no controller must keep paying useless repair after its own launch is known missed.

These are disclosed outcome-informed controller revisions. Any improvement belongs to a stronger local policy, not to a cognitive representation or confirmation. The first matrix is not discarded, and reserved source freeze remains pending independent review.

## 2026-09-08: execute the older fixed/cart-insurance plan explicitly

The competent D1 fixed policy already supplies two at12 and stops after actual local service observation. To retain the original draft's less efficient fixed/cart-insurance plan literally, add a ninth development script: inspect0–1, keeper repair1–7 and release7–9, receiver repair1–3 and attend11–12, then receiver cart12–22 with delivery17. Under the original host cap of two served units, the cart's third unit must be recorded as excess, not a third service or regenerated resource. This is an explicit preserved historical control, not a new controller improvement or reserved case. The two existing 80-run artifacts remain unchanged.

## 2026-09-08: exact response source times before final freeze

Self-review before reserved execution added a same-revision withdrawal/old-acceptance counterexample. The representation table previously kept separate revision identities but chose the last arrival inside one revision; `560a261` now keeps the latest decision source time. The notebook's optional confirmation previously selected the first received acceptance; `85835a7` now consults the latest source-timed response for its current own proposal/revision and does not spend a confirmation on an acceptance already superseded by a received withdrawal. Both regression tests failed before the correction. Old development sources/artifacts remain replayable; these defensive cases were not exercised by their autonomous controller trajectories and do not explain the observed service counts.
