# The Day You Say Nothing — interactive synthetic skim

One gpt-6.1-terra tester at low effort played candidate `fcb1cbc` in a fresh desktop browser context on 2026-11-05, skimming screenshots and control labels without reading body text or game source. The candidate declares site HF 4.16.0 and workspace library 4.17.0; this is candidate UI evidence, not final HF 4.17 qualification or human acceptance. Time was not instrumented and included one tool locator timeout and inspection delays.

It started New game and chose Speak. Its first suggestion expired while it inspected the choices, and the game reported that nothing was said because the moment had passed. It then reopened Speak and suggested seeing the doctor. Halil deferred that suggestion until after workshop repairs; the plan and Withdraw control appeared. The tester understood that suggestions can be declined, deferred or missed and do not guarantee a visit. Its exact words included:

> “I understood the suggestion did not take effect, but the clock moved faster than I expected while I was finding the controls.”

> “I can see my suggestion is pending and not a guaranteed visit.”

No doctor visit, missed goal or ending was observed. Skip was visible and unused. The expired first suggestion was a real visible outcome; this test does not measure human timing or justify changing the clock or difficulty.

## Live first-minute controls — 2026-11-05

The clean live site at commit `843f76fcd6ce6dd1a579ddcb01e316b8e2623964` used HF 4.17.0. The original six-case control passed five cases: Voice phone, both Watch sizes and both Well sizes. Voice desktop did not produce the expected request account within 30 seconds. Its selected suggestion had already expired, and the page showed “Unsaid” and said nothing was sent. One unchanged-flow desktop-only retry also missed the decision window. These are preserved negative observations, not evidence of a missing reply to a sent request.

A later six-case run showed an actual Voice reply at both sizes, an actual Watch arrival and a Well refusal followed by Continue at both sizes. A subsequent run of the final formatted script passed all six controls, with a matching visible “Unsaid” at both Voice sizes instead of a sent request; it did not show timely Voice replies. The script distinguishes a new, matching visible “Unsaid” consequence from an actual request account; it retains the request and answer checks when a request is sent. Both sizes also passed a separate expiry regression that waited for the existing earlier-moment notice before selecting the retained choice. A prior 30-second desktop observation did not reach that state; the dedicated regression allows up to 180 seconds of observation. This is a test wait, not a change to the game clock or deadline, and is not a first-minute or speed claim. No network or bridge timing was captured, and no human retest or reliability estimate follows.

To run the default controls against a served site, set `FIRST_MINUTE_URL` and `FIRST_MINUTE_OUTPUT`, then run `node scripts/central-first-minute.cjs`. For the separate two-size expiry regression, also set `FIRST_MINUTE_SCENARIO=voice-expiry`. Both use DNT and permit only same-origin GET/HEAD requests. Five-point checks do not establish full accessibility or every later interaction.
