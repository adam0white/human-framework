# Last Light

`/signals/` is a new, self-contained host (`signals` 0.1.0 / save 1). It uses frozen Human/runtime 0.1.1 and clock 0.1.0. The original games, runtime release lock and transitive model bytes are unchanged. Parent integration must register `signals/index.html: web/signals.html` and add its gallery entry; no deployment is performed by this lane.

Carry a replacement lens to the beacon before minute 32. If it arrives **before minute 12**, the waiting evening launch can sail; later arrival still restores the overnight beacon while the launch remains in harbor. The six-minute canal spends one fare and needs an open landing at arrival. The fourteen-minute ridge spends more body capacity and no fare, and is always open. A failed crossing spends its full time and fare, returns the lens, and permits a ridge pivot if enough time remains.

The initial design only reported time/resources/condition. Coordinator review correctly identified the immediate ridge as a universal one-action solution with no downstream use for earlier arrival. The explicit launch service window was added before experiment implementation and recorded in the [design amendment](superpowers/specs/2026-09-08-signals-design.md). Immediate ridge remains a serious simple strategy: four of four situations complete the overnight-beacon objective at minute 14, with zero observation charges or fares, and none releases the launch. Immediate canal followed by ridge after failure also completes all four primary deliveries; it releases the launch in two situations, and pays a failed crossing in the other two. The game does not require memory for primary delivery, and these are not claims of optimal play.

## Paid reports and useful provenance

A radio request takes one minute and one charge on completion. The keeper observes at completion; the reply arrives five minutes later, including while the carrier is already travelling. A three-minute lookout directly observes at its completion. Both are actual Human attempts with paid maintenance and, where declared, effort/practice. Partial attempts keep their paid effects but grant no unfinished observation. A sent radio request remains in flight when the carrier changes work.

Every delivered report keeps its source, channel, observation time, delivery time and actor-local receipt. The public one-task notebook keeps the newest **observation time**, using receipt order only to break equal-time ties. Older late replies remain in the delivery strip. Age is elapsed time, not truth probability. Hidden changes never alter the actor's view, available choices or next-visible-event control before an accessible observation. Exported saves and source are inspectable and can reveal the authored timeline; this is an information boundary for actor execution, not a secrecy system.

Useful default route, expressed as actual UI actions:

1. Call the keeper; advance to minute 1. Climb the lookout; advance to minute 4. It now reports open.
2. Take the canal immediately. At minute 6 the old radio reply says closed, observed at minute 1. The notebook keeps the newer minute-4 lookout; the carrier remains on the canal.
3. Advance to minute 10. The lens arrives and the launch sails.

Other retained outcomes: two consecutive lookouts finish at minutes 3/6, changing the report from closed to open but delaying canal arrival until 12, too late for the launch. Waiting for a radio reply before departing likewise misses the launch. A current observation is no guarantee of the landing at arrival. In Harbor II, an earlier open observation can become wrong before crossing, while choosing the safe ridge still succeeds later.

## Private comparison and limits

The [exact twelve-case protocol](signals-comparison-protocol.md) was committed as `1f8b2f8` before comparison implementation or execution. The [retained output](../artifacts/signals/2026-09-08-comparison.json) verifies that original commit's protocol bytes, records source hashes and preserves all decisions, receipts, complete final states and resume-checkpoint hashes. The current game state is JSON-restored after every input in the resumed arm, together with candidate state; complete results equal uninterrupted runs in every case. Shared exposure includes actual paid time, resources and person view and is exactly equal across providers at each decision.

| Provider | Lens deliveries / 12 | Launches sailed / 12 | Failed crossings | Largest provider data |
|---|---:|---:|---:|---:|
| Public one-task notebook | 11 | 2 | 1 | 143 bytes |
| Existing private candidate | 10 | 2 | 2 | 257 bytes |
| No retained report | 10 | 1 | 1 | 4 bytes (`null`) |

These are enumerated software cases, not sampled people or a general accuracy estimate. Common host, exposed-delivery adapter, controller, program code and UI are excluded from provider bytes. The candidate additionally validates schema/ownership/receipts; the notebook relies on this host's validated delivery lifecycle. The byte comparison does not measure authoring effort.

All providers choose canal when their supplied report says open and ridge otherwise, with the same paid ridge fallback after a failed canal. The no-retention provider can use a report delivered at the current query minute; that visible delivery may describe an older observation. Candidate capacity is two and lifetime is sixty minutes, longer than every episode, so **expiry contributes nothing to these differences**. There is no expired-memory penalty or coefficient tuning.

Retention preserves a useful early-service choice after a report disappears. Timestamp ordering also matters: in the late-old-reply case, the notebook retains a minute-20 open observation, delivers at 28, while the candidate replaces it with a delayed minute-17 closed reply and takes a ridge journey that misses closing. Conversely, both retained representations choose a failed crossing after an undisclosed close, where the no-retention provider's conservative ridge happens to do better. All providers fail a crossing that finishes exactly at minute 32. These failures remain in the output. Retention cannot discover inaccessible changes, and current-world agreement is only an oracle diagnostic.

The public notebook suffices. Generic cognition remains under private `src/cognition/`; neither it nor this comparison enters public assets or runtime exports. This host establishes a concrete use for observation timestamps, not a general theory of belief, trust or human forgetting, and does not graduate the full MVP. Human playtest explanations, measured authoring usefulness, physical-device timing, calibration and theological review remain open.

## Lifecycle, review fixes and verification

Saves include a bounded strict replay plus complete reconstructed host state. Import rejects unknown/accessor fields, excessive structures, changed resources/body/clock/reports/timeline/outcome, malformed commands and inconsistent results. It recomputes the full host, rather than trusting imported resource totals. This validates consistency, not ownership or historical authenticity. Reads/reloads/imports begin paused, visibility changes pause, and wall-clock gaps never earn offline progress.

Independent review found two defects in the initial implementation. First, 96 zero-time rest/stop cycles exhausted the replay limit while leaving a valid imported state unable to advance. A regression reproduces that failure. New action admission now stops at 188 records, reserving four entries for advancement, optional interruption, terminal advancement and terminal refusal. The view explains that current work can finish or the clock can reach closing. Repeated refused clicks coalesce and cannot consume the budget; accepted zero-time actions remain a finite pathological limit. Idle and active saturation, JSON resume, interruption and terminal advancement are tested. Second, the generic journal label called a direct failed-crossing observation a keeper reply. It now says “At the canal lock”; receipt and journal source/channel agree. Both initial failures and fixes are recorded, not silently treated as passing first checks.

**379 repository tests pass** on Node 26.8.1, including 32 Signals host/session/comparison tests. Cases cover hidden-fact invariance, two travel/service outcomes, changed reports, causal sampling/delivery, equal-time world/deadline order, paid failed work, resource exhaustion, duplicate receipts, hostile snapshots, playback and exact resume. The focused evidence CLI rejects missing and existing output paths and tests a preserved sentinel file. No frozen runtime/model/release-lock diff exists against delivered app commit `ac4e544`.

[Browser evidence](../artifacts/signals/2026-09-08-browser.json) uses desktop Chrome 152.0.7977.77 at 320/390/1280 widths. It executes paid radio/lookout, old-reply retention, an actual downloaded/reimported save, invalid-import preservation, early launch and later ridge outcomes, a failed-canal pivot, closing failure and paused reload. No page errors or horizontal overflow occurred. The first feasible route is fully visible by 442px at width 320. [Initial narrow screenshot](../artifacts/signals/2026-09-08-320-initial.png). This is local isolated-route QA, not physical-phone or production delivery evidence; the parent release record must supply public verification.

```sh
PATH=/opt/homebrew/bin:$PATH node --test tests/signals*.test.js
PATH=/opt/homebrew/bin:$PATH node scripts/signals-comparison.js /tmp/signals-new-result.json
PATH=/opt/homebrew/bin:$PATH node artifacts/signals/browser-qa.mjs /tmp/signals-new-browser-directory
```

Evidence commands require fresh destinations and never replace retained output. The browser harness uses this machine's already-installed Playwright runtime; it adds no project runtime dependency.
