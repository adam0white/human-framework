# A Shared Promise: playable clinic continuation

2026-09-08. UI lane for the separate `/service-plan/` route, using the real Shared Promise host 0.1.0 and save identity `human-service-plan` version 1. The original [Service Day](/service/) remains directly linked and unchanged. Root owns gallery, routing, app release and deployment; this document records local implementation evidence, not a production release.

The initial entry is minute 37 at the clinic. `createClinicSession()` executes ordinary host commands from minute 0: your meal 0–4, gate sections 4–10 and 10–16, shed spare 16–24, rest 24–30, then advance to 37. Deniz independently eats and repairs their first pump section. Actual body, owned parts, installed work, paid exposure and full replay commands carry forward; no snapshot, reset or experiment module supplies this start. The day record exposes that morning and the new-day setup explains it. “The whole day · minute 0” remains an alternative starting mode.

The player sees the clinic agreement separately from actual pump work, inlet supply and part ownership. The two presets retain the minute-45 one-unit cart or explicitly risk it for a minute-53 full delivery. Editable fields state when the keeper promises to stop resting and start pump work, when readiness is promised, and how long Deniz waits. The invitation costs two active minutes per consenting person. Pending terms are labeled proposed and have no accepted response; a revision shows that the current agreement remains in force. The response names invitation consent, terms acceptance/refusal, interruption or contribution withdrawal.

Nothing automatically performs the keeper’s promised work. When that work comes due, a prominent action offers the actual pump section, with its time and part cost. If a promised pump start occurs during rest, the player can explicitly stop rest, then separately start pump work. Both Play and Next event honor the host’s promised start and readiness boundaries. A missed readiness time is explained while a longer accepted wait can remain active. Actual readiness and a fulfilled contribution are not called water delivery; the receiving slot and arrival remain physical host facts. Withdrawal names its limited effect: it ends this contribution and hold, stops no work, and cannot erase Deniz’s clinic obligation.

Session state keeps wall-clock playback outside the host save. Imports validate fully before replacement; the original control’s saves are rejected. Reload, tab departure, import, download, reading details, editing terms and writing notes pause playback and clear fractional elapsed time. There is no offline catch-up. Save download is the exact host export; malformed imports preserve the previous device save. Optional notes use the existing local note component with an explicit projection of at most eight public summary lines. The note contains no host replay, actor internals, identity or assessment. No upload runs automatically.

## Verification

- [15 session tests](../tests/service-plan-session.test.js) pass on Node 26.8.1 and the minimum Node 22.0.0. [Node 26 output](../artifacts/service-plan-ui/node26-session-tests.txt) and [Node 22 output](../artifacts/service-plan-ui/node22-session-tests.txt) retain the runs. Tests exercise real immutable host transitions, exact import/replay, paid mid-discussion interruption, refusal retaining old terms, withdrawal preserving underway work, and both promised-time pauses.
- The real [browser runner](../artifacts/service-plan-ui/browser-qa.mjs) uses installed Chrome 152.0.7977.77 through Playwright. [Local evidence](../artifacts/service-plan-ui/local-browser.json) binds hashes of the actual host and all four UI files. Initial and accepted screenshots are retained at 320×700, 390×844 and 1280×900. All three widths perform a paid proposal and acceptance without horizontal overflow. The initial discussion affordance fits the first viewport, including y=627 through 671 at 320×700. The accepted view brings the keeper’s actual work action to the top.
- Nine interaction groups on the 390-width page verify exact mid-discussion download/import and paused reload; malformed and old-control save rejection; paid interruption; safe readiness at 45 and arrival at 51; a useful paid revision arriving at 59; refused/interrupted revisions retaining the cart at 45–63; post-departure invitation refusal preserving work; a failed risky promise yielding zero units; a readiness miss at 45 before a wait at 53; contribution withdrawal; optional note export; and real work/meal reservation from the minute-0 entry. Several related checks share one recorded group.
- Final local browser results: zero page/console/request errors, zero HTTP error responses and zero non-GET requests. No Cloudflare exception was needed on the local server. The [downloaded note](../artifacts/service-plan-ui/synthetic-play-note.json) is explicitly synthetic; these checks do not represent human playtesting, measured authoring benefit, or a physical phone.

The development server ran only on `127.0.0.1:4197` using the root-owned real route mapping, not a temporary HTML replacement. Reproduce with a fresh output path:

```sh
PORT=4197 /opt/homebrew/bin/node scripts/serve.js
/opt/homebrew/bin/node --test tests/service-plan-session.test.js
/opt/homebrew/bin/node artifacts/service-plan-ui/browser-qa.mjs http://127.0.0.1:4197 /tmp/shared-promise-browser-new/report.json
```

The runner defaults to the desktop’s bundled Playwright module and installed Chrome; `PLAYWRIGHT_MODULE` can point to another installed module. It refuses to overwrite its JSON evidence. Production verification, independent review, full suite and the exact deployed release remain root integration responsibilities.

## Root review fixes

Slot permanence is explicit before both cart and pipe departure and before a permitted trip stop. Note focus, editing and submission each pause playback even if a player resumed while the form stayed open; the shared note component and earlier games remain unchanged. Primary agreement prose uses readable state descriptions, with record IDs retained in the collapsed researcher view. No-agreement guidance now follows a committed or forfeited slot instead of suggesting a new wait.

A draft timing preview flags impossible start/readiness/wait arithmetic before another discussion. It is hidden during an existing pending discussion and never rewrites accepted terms; submitting unsuitable new terms still exercises the real paid-listening/refusal path. Root browser regressions preserve the before/after cases in `artifacts/release-0.9/`. No simulation or frozen comparison source changed for these fixes.
