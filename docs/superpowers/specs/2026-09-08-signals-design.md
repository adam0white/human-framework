# Last Light: changing reports at the canal

New host 0.1.0, save 1, public route `/signals/`. The user has authorized autonomous design, implementation and review; the parent task integrates and deploys. No frozen host, runtime or model changes.

## Play contract

Deliver one replacement lens to the far-bank beacon **before minute 32**. The short canal attempt takes six minutes and one fare; it succeeds only if the landing is open at arrival. A closed landing returns the carrier with the lens, spending the full interval and fare. The ridge carry takes fourteen minutes, needs more capacity and no fare, and succeeds regardless of the landing. There are two fares, three radio charges and one meal. Unused resources, paid time and actual exertion distinguish outcomes without an arbitrary reward score.

Radio costs a charge when its one-minute request completes. The landing keeper observes at that instant; the reply arrives five minutes later, even during another action. A three-minute lookout observes directly at completion. Both are actual paid runtime attempts. Reports carry source, channel, observed time, delivered time and an increasing actor-local receipt. The landing may change while a reply travels or during a crossing. Nothing exposes an undisclosed change to the actor. A report is current only when its observation time equals now; age never becomes a probability.

The default authored schedule starts closed, opens at minute 4 and closes at minute 20. Other fixed situations reverse the change or remain open/closed; their hidden timelines are absent from the actor view and next-visible-event control. No random draw or hidden superiority bonus exists. These schedules are puzzle conditions, not a model of waterways.

A one-task notebook retains the report with the latest observed time, breaking equal-time ties by receipt. Older late replies remain in the bounded delivery strip but cannot silently overwrite a newer observation. Interruption keeps paid body/practice; incomplete lookout/request/travel earns no effect. A completed radio request remains in flight after switching work. Deadline events precede same-time delivery and attempt receipts, making the before-32 objective literal.

## Architecture and alternatives

`src/games/signals.js` owns choices, hidden landing, resources, receipts, notebook, outcomes and deterministic one-minute cadence. Frozen `src/runtime/index.js` 0.1.1 owns person body/capacity/task practice and its frozen clock owns scheduling. Practice is accumulated but does not shorten authored durations. A generic cognition integration would add validation and expiry without a current game need; the smaller notebook is selected for public play. A memory-free public UI would make previously paid information unnecessarily inaccessible.

Saves include a strict bounded command replay and its resulting host state. Import validates plain JSON, length, command chronology and exact deterministic reconstruction, including hidden schedule, person attempts, clock, ownership, reports and outcome. This is consistency validation, not tamper authentication. Both code and exported saves can reveal authored truth. The view excludes it.

`web/signals-session.js` owns pause/run policy. Reload, import, tab departure, new commands and meaningful visible events pause. Time never catches up offline. `web/signals.html`, `.css` and `.js` show the objective and feasible travel buttons before the scene/notebook, with compact mobile controls, visible costs, source/time/age, remaining resources and finite outcome.

## Private matched-access experiment

A preregistered executable matrix compares the exact public host notebook rule, the existing private observation-memory candidate (capacity 2, lifetime 60, unchanged code), and a provider retaining no reports. All receive identical paid deliveries and identical decision times/action options; none can read hidden state. The candidate lifetime exceeds every episode, so expiry is not used to manufacture a gap. The controller chooses canal for a retained/open report and ridge otherwise. Direct report updates, delayed stale overwrite, undisclosed change, no observations and paid failed crossings are retained. Accuracy and delivery success remain separate: hidden changes can make a faithfully retained report wrong.

Record full exposed receipts, decisions, costs, actual outcomes, state bytes and complete resumed-state equality. This is a deterministic engineering comparison of these representations in this host, not human-memory evidence, predictive calibration, measured authoring benefit or an MVP graduation claim. Retain failures. Evidence CLI requires an explicit new output and exclusive creation.

## Verification before delivery

Tests first: both routes, changing report changes choice, inaccessible hidden changes leave identical views/available actions/visible-event time, report sampling versus delayed delivery, old replies versus newer direct observations, deadline ties, charge/fare ownership, paid interruption and practice, duplicate/early receipts, snapshots mid-request/in-flight/travel/terminal, hostile imports, bounded refusals and pause/reload clock policy. Run full suite. Parent registers only `signals/index.html: web/signals.html`; ordinary JS/CSS game assets already fall within the existing allowlist. Private experiment stays under scripts/artifacts/docs and imports cognition only there.
