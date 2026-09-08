# Private direct and fixed camp-shaped rivals

Implementation lane for [the declared execution contract](work-progress-execution.md), protocol commits `1d20c5d` and `eeaec86`. This lane implements only D and F; it has not read the new shared candidate or its camp adapter. Root owns source freezing, the eight-history comparison, independent repair authoring and the final complexity decision. No old game, released runtime, public UI or save migration changes here.

## Boundary and independent costs

`src/experiments/work-progress/camp-direct.js` and `camp-fixed.js` each export `createWorld`, `command`, `advanceTo`, `nextEvent`, `observe`, `exportWorld` and `restoreWorld`. Each is a complete standalone host importing only the existing Human 0.1.1 module and its existing model `practice` function. Neither imports a new helper or the other rival. The two standalone source/validation shells must both be counted where used; F's smaller work law is not a claim of fewer total source bytes.

Active worlds and normalized observations are deeply frozen. Save exports are detached plain records. The normalized observation includes every required actor/person/paid field, stock/spent, tool, output, item/reservation/contribution, assignment and latest response. Raw exports also retain setup, hauling cancellation time and each worker's paid-construction baseline at their first assignment. These extra baselines make saved productivity bases checkable against the actual paid practice curve; they are included in state/source costs, not hidden in the observer.

Initial actors and supplies match the execution contract. C's blank stays in stock while its exclusive crafting assignment owns it, then is consumed at minute 1; the tool becomes available only after every actor paid that minute. Busy B pays hauling until completion at minute 4 or an explicit stop. Stopping hauling keeps effort/practice, removes the assignment and never auto-resumes it. All free actors pay actual one-minute Human rest attempts. No meal, food relief or material output is invented.

## D: prospective durable work

Each item owns its one-time 5-timber/1-salvage reservation. Per-worker duration basis is latched at that worker's first assignment from actual construction practice. Each paid minute advances `min(remaining, 1 / max(6, basis - currentToolBonus))`, charges .20 times that fraction, and pays one actual construction minute through Human. New tool effects apply only to later minutes. Stop retains installed materials, fraction and each person's existing contribution. A capable free recipient may accept remaining work using their own first-assignment basis; past effort and practice stay with the original worker.

All actors pay before same-minute completion/tool effects settle. Completion transfers the installed reservation to spent material, increments output once and clears its assignment. Complete items retain bounded contribution records. Repeating advancement at a completion minute cannot settle output again.

## F: first-item tool snapshot and finish-first preference

**Declared before comparison execution:** F snapshots tool availability on the item's first start and preserves it through every later mandatory stop/resume. It does not refresh that snapshot when tools arrive or when another worker explicitly starts a stopped item. Each worker still keeps their own first-assignment skill basis. Mandatory stops retain progress/material/paid credit.

F refuses optional handover requests under its smaller contract. A later explicit start remains that actor's own command and must satisfy free assignment, material and whole-remaining-work capacity. It is not an automatic takeover or a transfer of prior credit. Refusal reason precedence is recipient busy, recipient capacity, then F's `fixed-assignment` preference; D uses `accepted` when both recipient conditions pass. Both hosts retain start/stop's previous `lastResponse` and charge no time for a request.

The declared expected F completion vector is **20, 20, 23, 20, 20, 18, 20, and both 20** for H1–H8. Those are protocol expectations, not a claim that this lane executed the full matrix. Differences from D are physical/work-contract or policy differences, not a shared-helper performance result. In particular, retaining the faster original worker can beat the optional slower handover.

## Validation and limits

Both hosts check the exact raw schema and setup, known actors/items, item progress/contribution sums, first-assignment basis against recorded paid exposure, per-worker construction minutes and effort, task-specific practice, full per-person elapsed accounting, material/output conservation, paid tool creation, hauling lifecycle, exclusive assignments, completion state and bounded response shape. Work starts and handover acceptances assess whole remaining exertion; every actual paid minute checks Human capacity. Active saved construction and auxiliary assignments must retain capacity for their remaining work.

Safe-tree traversal precedes cloning or property use on untrusted input and rejects aliases/cycles, accessors, custom prototypes, invalid arrays, excessive nesting and nonfinite numbers. State contains at most two work items, three people and one latest response; there is no command journal or accumulating receipt list. The private time limit is 1,000,000 minutes and a single advance is bounded to 1,440; admission preserves enough future time to complete the assigned work. Recipient-capacity refusal also covers insufficient remaining world time. Root's separate workload remains limited by the protocol's 500-transition budget.

This is deterministic continuation from a validated current snapshot. It does not authenticate a complete history or independently reconstruct every past body change. Capacity regressions use synthetic current-body snapshots accepted by Human; no assertion is made that those snapshots arose from the fixed initial fixture's missing history. Paid/practice/material cross-field checks still apply, and unfit starts/recipients are refused from that actual current condition.

## Focused verification completed

Eleven scoped tests pass on Node 26.8.1 and minimum Node 22.0.0. They exercise unchanged stage completion and no duplicate output, paid supplier timing, D/F tool-on-resume differences, own-worker handover credit, busy-recipient refusal, stopped hauling, simultaneous completions, differing outer advance chunks, JSON active-work continuation, immutable rejection and malformed saved accounting.

Separate tests cover whole-remaining-work refusal for unfit starts and recipients, and a real skill-floor crossing: after one completed item and sixteen paid minutes on a second, A's current skill would suggest a 19-minute new basis, but its already-latched second-item basis remains 20. A forged changed basis rejects. H3/H4 alone are not counted as evidence of that threshold case. The numeric endpoint test uses a labeled synthetic current-state validation fixture; it is not evidence of a million-minute played history.

Observed first test failures were the missing implementation modules, explicit `null` setup values accidentally receiving defaults, missing whole-remaining-capacity validation for active hauling/crafting imports, and a start admitted with no execution interval at the numeric endpoint. Those admission defects were corrected before handoff; fixture physics and expected outcomes did not change. The root conversation retains their failed tool output; this lane does not claim a separately frozen pre-fix artifact or completed independent review.

No full old suite, external review, shared-candidate parity matrix, independent repair result, state-size measurement or latency result is claimed here. Root must establish those comparison outcomes from the frozen selected source and preserve both positive and negative results.
