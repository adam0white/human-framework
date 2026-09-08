**Verdict: conditionally favorable.** The proposal conserves parts, meals, the clinic slot and paid minutes, and never forces either actor into work. Its problems are specification holes at exact minutes, one physics change presented as unchanged, and silence about cheaper legal bypasses in the control host. Everything below is source inspection of the six files plus hand arithmetic. Nothing was executed, and no tests, artifacts or the cited control trajectory were available.

## Deadline arithmetic

| Item | Design value | Control check |
|---|---|---|
| Latest full-delivery start | 57 | 57+6=63; closing at 64 is processed before same-minute receipts, `src/games/service.js:124` |
| Safe cart start | 45 | 45+18=63 |
| Discussion cost | 2 active minutes each | matches idle spec: fatigue and hunger accrue, no recovery, `src/games/service.js:36` |
| Deniz's default cart minute | unstated | control carts at 42, `src/games/service.js:82` |
| Readiness window where a short hold helps | 43 to 45 | only if the default stays 42 |
| Last proposal that can ever be accepted | 49 | 49+2 discussion+6 pump=57 |

The per-minute order at `docs/service-plan-design.md:40` mirrors the control loop, so readiness landing exactly on `waitUntil` correctly wins, and closing ties correctly lose.

## Findings

- **Deniz's own cart trigger is unspecified.** The view exposes `safeWaitUntil:45` at `docs/service-plan-design.md:28`, but the control's Deniz departs at 42. If the copied loop keeps 42, short terms only matter when the keeper's pump finishes in the three-minute window above, and the "final safe cart window" clause at line 34 is largely moot. Specification defect. Fix: state the minute.

- **Tie at minute 45 after withdrawal or interruption.** Line 40 has actors choose at the end of each elapsed minute. The control lets Deniz choose at the command minute through the leading call at `src/games/service.js:122`. Without that, a withdrawal at 45 pushes the fallback cart to 46 and closing defeats it. Fix: one sentence stating a freed Deniz chooses in the command minute.

- **Departure at first readiness versus at `waitUntil`.** Line 42 reads as if Deniz departs only at the boundary. The control delivers in the first ready minute at `src/games/service.js:81`. Waiting needlessly adds fatigue exposure. Ambiguity. Fix: state departure at the first minute where readiness and capacity both hold.

- **Statically infeasible terms are charged after listening.** Line 34 defers all schedule checks, yet `readyBy >= pumpStartAt + 6`, `waitUntil <= 57`, and discussion end before the predecessor's deadline at line 38 are all computable at submission. Every proposal after minute 49 is guaranteed refused after both actors pay. Line 34 frames this as authored overhead, but charging for arithmetic the view already exposes is a playability defect. Fix: throw for static violations, derive `fallback` from `waitUntil` instead of accepting a mismatched pair, and reserve paid refusal for the body forecast.

- **Permanent slot commitment is a physics change labeled unchanged.** Line 27 makes an interrupted trip consume the day's slot. The control frees it, since refusals at `src/games/service.js:63` and `:66` check only recorded delivery and current jobs. Line 3 says tasks are unchanged and the loop copyable. Authored choice, but the freeze wording misleads, and "may abandon" is undefined. Fix: label it a deliberate divergence and define when abandonment occurs.

- **Strongest simpler counterexamples, all legal in the control.** First, share instead of promise. The keeper repairs both gate sections, salvages the shed spare, and hands it over. Share has zero effort at `src/games/service.js:36`, so a fatigued keeper is never capacity-blocked. Deniz then repairs both pump sections and delivers by minute 42, with no plan and no keeper rest. Second, rest chaining. Idle Deniz accepts any rest request because the only applicable refusal at `src/games/service.js:71` is capacity and rest is non-exertive. The keeper may interrupt requested work at `src/games/service.js:115` and re-request in the same minute. That holds Deniz past 42 indefinitely while Deniz actually recovers, whereas the plan's hold credits no recovery per line 40. Third, the keeper can deliver alone. Nothing requires Deniz's labor. The hold exists only to stop Deniz's cart. Consequence: the plan is strictly dominated unless the plan host restricts keeper requests to an idle or held Deniz. Lines 14 and 34 are silent. Line 48 honestly disclaims necessity, but the comparison lane must either refuse recovery requests that would carry Deniz past their own cart trigger without an accepted hold, or report rest chaining as the baseline. Fix: add that refusal code, or document the bypass.

- **Advisory forecast can flip.** Views round to 0.05 at `src/human/v0.1.1.js:116`. Keeper actual fatigue 0.974 rounds to 0.95. The forecast after six minutes of rest then one pump section is 0.978, allowed. The actual is 1.002, blocked by `src/core/model.js:28`. Line 36 admits this, so it is authored, and it matches the control's estimate-versus-execution split. Note that in the standard scenario Deniz's own delivery capacity never fails, since fatigue is roughly 0.59 at 57 after waiting. The "advisory-capacity refusal" test at line 46 needs a contrived body.

- **Overstated consent.** Line 12 says Deniz independently decides whether to listen, but the only refusal is being busy or a precondition failing. An idle Deniz always pays two minutes. Authored NPC rule. Reword.

- **Vacuous supply term.** The named contribution includes inlet supply, but acceptance at line 36 requires supply already ready, and supply is monotone at `src/games/service.js:35`. Drop it or extend terms to gate work.

- **Requests to a held Deniz are unspecified.** A keeper rest request ending after `waitUntil` would leave Deniz busy at the fallback minute, breaking the promised cart at line 42. Fix: refuse requests that overrun the hold, or trigger fallback at the next idle minute if still feasible.

## Unverifiable claims

Byte-identity of the existing host, the "timed-request control at 59 with 12 paid Deniz rest minutes" at line 48, and the lifecycle tests at line 46 could not be checked. A delivery starting at 59 ends at 65, so that label likely refers to an arrival minute. The Node version requirement is plausible from the APIs used but unexecuted.

## Recommendation

Proceed after four one-line corrections: state Deniz's default cart minute, choose in the command minute, depart at first readiness, and reject static term violations at submission. Then decide explicitly whether rest chaining stays legal in the plan host, because that decision determines whether the mechanism is ever chosen.
