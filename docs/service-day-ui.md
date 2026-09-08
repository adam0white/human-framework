# Service Day browser surface

The new `/service/` screen is a browser consumer of the bounded Service Day host. Its service board exposes both obligations from the beginning: protect the inlet at minute 24, then supply the clinic before minute 64 using the same people and remaining parts. The initial gate choice is fully visible in the first 844-pixel-high viewport at 320, 390 and 1280 widths.

The page shows work, owned and reserved supplies, rounded condition estimates, and task time/resource costs. The clinic phase retains partial gate work and can restore supply after a missed morning obligation. Completed or permanently inapplicable actions disappear; the service board and day record retain their consequences. Partial delivery and missed morning water remain separate outcomes rather than a combined score.

Deniz is an independent actor. Their stated clinic commitment, current accepted or self-chosen work, and request response remain visible. Known impossible requests show their refusal reason and cannot be issued. Rounded capacity estimates remain advisory: their warning leaves the button enabled for the actual host check. A request to cancel Deniz's self-chosen clinic work can be refused without canceling it.

## Session and persistence contract

`web/service-session.js` owns playback state only. The host save never contains a wall-clock timestamp, speed, animation remainder or running flag. New games, imports and reloads start paused; choosing, requesting, stopping, opening details, downloading, changing speed and leaving the tab pause and clear fractional wall time. Play stops at the next visible boundary, including the morning result and independent actor decisions. One-minute stepping preserves paid partial recovery and work. A delayed frame is capped at one second, and hidden tabs do not tick.

The page validates an entire import before replacing or persisting its active game. Invalid JSON, incompatible saves and oversized input leave the prior valid save intact. A game save is distinct from the optional play note: the latter downloads self-authored words and an explicit public summary, with no grading, identity, hidden state or automatic upload. The four-question form includes the other person's response.

## Verification

Seven session tests exercise paused reload/import, concurrent unfinished work, fractional-time resets, the morning boundary, clock-driver parity, invalid-import atomicity and delayed-frame limits. They run against the real headless host.

`artifacts/service-day/browser-qa.mjs` exercises the actual UI and real host in desktop Chrome with 320, 390 and 1280 pixel viewports. The recorded run includes initial objective/action visibility, no horizontal overflow, explicit reserve refusal, accepted concurrent work, self-chosen clinic work and cancellation refusal, both service routes and their distinct resource consequences, a paid cart fallback following morning failure, paid partial rest, completion pausing, save download/import, invalid-import preservation, paused reload and the bounded public play-note export. Screenshots, actual exported saves and the result JSON are retained under `artifacts/service-day/browser/`.

The visibility event and note text are synthetic automated fixtures. These checks establish browser behavior, not human enjoyment, physical-device timing or the five-person explanation gate. The local runner uses a narrowly scoped fixture server for `/service/` and its actual modules; the parent integration checks the public allowlist and deployed release separately.

Reproduce against a running integration server with:

```sh
PATH=/opt/homebrew/bin:$PATH node --test tests/service-session.test.js
PATH=/opt/homebrew/bin:$PATH node artifacts/service-day/browser-qa.mjs http://127.0.0.1:4196 /tmp/service-day-browser-new
```

The browser runner's Playwright import follows the machine's existing bundled-runtime convention. Its output directory can be changed without altering the game.

## Integrated value-review clarification

The final app places meals among optional recovery/supply actions and states that a keeper meal is not physically necessary for timely work in the standard day. Clinic copy names the sole receiving slot and Deniz's possible self-chosen cart from minute42, including its ability to preempt a still-feasible pipe delivery. The objective says delivery **before**64. A completed diversion at the minute24 surge gets an accurate counted-work presentation label while raw host records and all saved physics stay unchanged; an incomplete diversion retains its stopped label. [Final browser recheck](../artifacts/release-0.8/astra-final-ui-review.md).
