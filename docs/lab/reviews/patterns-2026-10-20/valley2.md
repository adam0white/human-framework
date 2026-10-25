# The Valley — Hatice source-unread playtest

## Session

- Persona: Hatice, 45, pharmacist from a small town near Kayseri. Occasional Banished, Townscaper and Frostpunk player. After closing the shop, phone in one hand. I care about families getting through a hard season and want their words in full.
- URL: https://valley.adamwhite.work. No build identifier was visibly encountered.
- Phone: 360×690 CSS px, touch emulation, light mode, default text size. Real Playwright Chromium, headless, one persistent page in a long-lived local Node process. Normal clicks/taps and one panel scroll; no game source, bundles, network payloads, internal state or debug APIs inspected.
- First actionable cover: 2026-10-20 15:24:36.712 UTC (10:24:36.712 America/Chicago). Gameplay appeared by +14.2 s. Stopped voluntarily at +200.5 s (3:20.5), 15:27:57.191 UTC. Eight minutes was the ceiling, not the target. The game continued at its initially selected slow speed throughout; I never changed speed or advanced time artificially. Recording and tool delays consumed real game time.
- One post-stop look at 1280×800 at +200.6 s. No desktop play resumed.
- No run sent, telemetry submitted, consent changed or export downloaded through a player control.
- Screenshots: (driver scratch)/retest/valley2-shots/. Original diary: wall-clock.jsonl in that directory.

## First minute

Checkpoint at 76 real seconds after the cover first allowed action (60-second checkpoint was late during recording). Original answers, before continuing:

| Item | Status | Checkpoint answer                                                                                                                                                                                                                                                               |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | PASS   | I need to get the barley cut before rain on 20 July. The opening and pinned charge told me.                                                                                                                                                                                     |
| DL-2 | PASS   | Household buttons, Your charge, speed buttons, Game menu, the action selector and red call button look tappable. Kavak turns blue when selected. I tried no inert decoration. About exposes household context; Reply returns to the reply view.                                 |
| DL-3 | PASS   | The bold charge and red call button draw me first. Rain is urgent; Kavak is visibly blue and selected. Slow is outlined as the current speed.                                                                                                                                   |
| DL-4 | PASS   | The repeat barley call is unavailable because the current call stays open until 24 July, year one. The reason says another opens when it expires. No other limit reached.                                                                                                       |
| DL-5 | PASS   | The call is underway and replies are at the houses. About 55 cut and 300 standing show progress. I have just seen “I’ll come.” at Kavak. I can choose a house or a house action.                                                                                                |
| DL-6 | FAIL   | The first meaningful call was visible by 14.2 s; I pressed it at 19.7 s. The cover has 58 mandatory words before Take up the seal, followed by the charge and dates. A choice arrived within 30 s, but after more than about 40 mandatory story words.                          |
| DL-7 | PASS   | One call interaction reached: my hamlet request started work and produced a household reply. Opening Kavak/About/Reply taught me where context and reply live. Visiting, sending grain, shares, mill and landowner requests remain NOT TESTED (5 action types). No help opened. |

Checkpoint correction: I wrote “58” cover words at the checkpoint. The two story paragraphs before “Take up the seal” contain 49 words by a whitespace count. The original checkpoint answer above is preserved. The charge and dated status add reading before the harvest call. The first call was still available within 30 seconds; the reported failure concerns the amount of mandatory opening text.

## Verbatim diary

These entries retain the wording written during play. Input times inside entries can precede the recording timestamp. Elapsed time is real wall time from the actionable cover, not the game clock.

### +5.6 s — 2026-10-20T15:24:42.350Z

Input: Opening screen

I am responsible for keeping families fed and collecting the landowner’s due. Rain is the immediate worry. Take up the seal looks like the way in.

### +19.6 s — 2026-10-20T15:24:56.309Z

Input: Take up the seal at 9.8 s; valley appeared by 14.2 s

The rain is two days away. I see the household buttons, speed buttons, Your charge and a red call button. I want everyone to start cutting, then I want to hear the families.

### +43.9 s — 2026-10-20T15:25:20.623Z

Input: Called the hamlet at 19.7 s; tapped Kavak at 33.9 s and About at 37.9 s

The cut total is rising, so the call did something. The second call is unavailable until 24 July; I understand that reason. I was promised replies at the houses, but Kavak first gives me another call button. About tells me I have not been inside. I want Osman’s actual words.

### +76 s — 2026-10-20T15:25:52.710Z

Input: First minute — stopped inputs for checkpoint

I can call the households, and the barley total shows work happening. I am still looking for a proper conversation with this family.

### +92.3 s — 2026-10-20T15:26:09.013Z

Input: Opened House action; Walk down and sit with them is selected at 85.5 s

Rain has already reached us while I was reading. Only about 190 are cut. The visit says a couple of hours away from the residence; I will go because I want to know how the family is doing.

### +99.8 s — 2026-10-20T15:26:16.477Z

Input: Visited Kavak at 92.4 s

That is the first moment I feel invited into a home: “Enough in the jar, if we’re careful.” I can read his whole answer without scrolling, and the barley and dates remain above it. The top says I am still walking, though Osman has already welcomed me; I am unsure whether I have arrived.

### +112.3 s — 2026-10-20T15:26:28.962Z

Input: Chose Ak at 105.3 s

Saliha wants her own barley first. Fair enough. A new family visitor is urgent at the top, but I cannot see the person or an answer while Ak is open. On the previous overview the storm sentence disappeared below the panel after “standing barley”; I want to read the rest.

### +131.8 s — 2026-10-20T15:26:48.514Z

Input: Accepted child invitation at 124.7 s

There is nothing in their jar and a new baby. This matters more to me than pressing Zehra to harvest. I can read Yusuf’s full answer. Hold to press warns that they will remember being pushed; I do not want that. I want to send food.

### +161.9 s — 2026-10-20T15:27:18.645Z

Input: Tried House action picker and Send them grain option, 136.5–152.7 s

I want to send grain, but my browser control could not select that option. This is a test-tool limitation, not evidence that the game refuses food. I will read their household context.

### +178.7 s — 2026-10-20T15:27:35.440Z

Input: About Çoban at 162 s; scrolled its panel at 167.8 s

Zehra came after all, without my pushing her. I like that. The barley is now cut. About expands into a small scrolling reading area; I had to scroll to reach my visit record and Earlier word. I dislike reading a household this way on a phone.

### +200.5 s — 2026-10-20T15:27:57.191Z

Input: Stop playing on phone

I am putting this down now. The barley is cut and I care about the hungry family, but opening the ledger gives me another little scrolling panel. I can see only 30 grain measures before the next row slips under the controls. After work, I do not want to keep sliding a small window to read the village. I would return for the families, but not voluntarily for this phone reading layout.

## Best, worst and stopping

Best: visiting the new baby (+124.7 s, 16-child-visit.png). Yusuf says, “There’s nothing in the jar, steward. The children eat first.” I wanted to help that household. His full reply fitted. Later Zehra came to the barley without my pressing her (+162 s). That made the household feel like people with their own reasons.

Worst: the ledger on the phone (+182.5–200.5 s, 25-ledger-settled.png, 26-ledger-top.png, 27-phone-stop.png). Its small reading area initially showed a sentence ending “rider.” without its beginning. After scrolling to the top, the title, introduction and first quantity used nearly all the space before the controls. I wanted the whole account visible together.

Frustration began with household-context scrolling (+167.8 s); the ledger settled my decision to leave. I was not waiting for the harvest to finish: it already had. I stopped with about 310 cut, 0 standing, on 22 July of year one. I did not finish the three-year term. I would be curious about these families on a larger screen. I would not voluntarily return to this phone reading layout after work.

## Clarity findings

- **DL-6: FAIL, opening text amount.** The cover gives 49 story words before “Take up the seal” (01-opening.png), then the valley adds the charge and dated status before the harvest call (03-first-state.png). Choice availability itself passed the 30-second timing check: visible by +14.2 s, used at +19.7 s. The checkpoint’s word count is corrected above.
- **DL-30: FAIL, report cut by the phone reading area.** On the overview (+99.8 s, 12-houses.png), I could read “It flattened about 52 grain measures of the landowner’s standing barley,” at the lower edge; the continuation was below the fixed action area. The full sentence was not visible together. In household About, I had to scroll to reach the visit record and Earlier word (+162–167.8 s, 21-coban-about.png, 22-coban-about-scrolled.png). The primary Osman and Yusuf visit replies themselves fitted in full (11-visit.png, 16-child-visit.png).
- **DL-13: FAIL, visit wording disagrees about arrival.** Immediately after visiting Kavak, the top said “you are walking to the Kavak house,” while Osman already said “Come in. Sit.” (+92.4 s, 11-visit.png). The child visit repeated this: “you are walking to the Çoban house” alongside Yusuf’s “You came to see the child” (+124.7 s, 16-child-visit.png). I could not tell whether I had arrived. I cannot establish when the visit actually executes internally.
- **DL-26: partial observation; overall NOT TESTED.** Game menu was visible throughout. The ledger footer changed to “The notebook” (+178.9 s onward, 25-ledger-settled.png). I did not open it, so I cannot establish what it contains or whether save/run controls are duplicated.

## English, dates, layout and hands on

| Item                           | Status                                                                   | Observed evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-20 English                  | PASS for encountered actions and terms                                   | Calls, visits, food action label and goals were English. “reeve (local overseer)” appeared in Kavak About; “yayla (summer highland pasture)” appeared in Çoban About (06-kavak-about.png, 21-coban-about.png). No required untranslated term blocked me.                                                                                                                                                                                                                          |
| DL-21 Dates                    | PASS for first-play comparison; return-from-break NOT TESTED             | On 18 July, year one, rain was 20 July: two days away. Sheaves become grain on 5 August; due is 15 September; shares are 9 August. English month names made their order clear. After harvest, the unavailable call explicitly named 30 June, year two. No reload or break was tested.                                                                                                                                                                                             |
| DL-22 Phone immediate response | PASS for encountered primary decisions                                   | The initial call, house visit and child Go/Send your regrets choices fitted with the pinned charge, progress and dates (03-first-state.png, 11-visit.png, 15-family-news-settled.png, 16-child-visit.png). Longer overview and ledger reading failed DL-30 as reported separately. Food-send decision was not reached.                                                                                                                                                            |
| DL-30 Nothing cut off          | FAIL                                                                     | Storm continuation below the reading area; household context and ledger required internal scrolling. See findings. No overlapping sheets were encountered.                                                                                                                                                                                                                                                                                                                        |
| DL-31 State while acting       | PASS for encountered house and invitation decisions                      | With Kavak open: 190 cut, 120 standing, rain 20 July, sheaves 5 August, due 15 September and the Kavak name remained visible. With Yusuf’s reply open, the Çoban name and the same progress/dates remained readable (11-visit.png, 16-child-visit.png). Food order was not reached.                                                                                                                                                                                               |
| DL-32 Something for your hands | NOT TESTED for continuous availability                                   | I encountered no stretch in which I established that all meaningful acts were unavailable. The visit underway cue was gone by my next view 7.4 s after the Kavak input and 7.2 s after the child input; these are observation intervals, not measured forced waits. I wanted to send food; approximately 25 s spent trying the selector was a control-tool limitation, not a wait imposed by the game. I cannot establish the every-20-second criterion across the whole session. |
| DL-33 Scene actions            | FAIL for the visited core interaction; unvisited alternatives NOT TESTED | Tapping Kavak opened a household sheet. To visit, I chose “Walk down and sit with them” in House action and pressed its separate button. “Other house actions” returned to the selector when I wanted to feed the family (17-other-actions.png). The new-baby invitation did give me a direct Go choice. I did not establish every alternative way to speak, visit or send grain.                                                                                                 |

The normal call was promptly acknowledged by “The call is underway”; the harvest total then rose. The household refusal and “Hold to press Zehra” warning made the cost of pressure understandable. I did not press her. The harvest-complete cue explicitly said to visit while sheaves wait for threshing; I did not mistake harvest completion for the end of the game (DL-12: PASS for this phase boundary only).

DL-15 fast-speed pending-choice behavior, DL-23 measured target sizes, DL-24 nested-sheet return/focus, DL-25 200% text/320 px/theme checks, DL-27 reload/resume, DL-28 sending and DL-29 replay: NOT TESTED. All builder checks and unreached interactions are NOT TESTED. This is not a source review or simulation audit.

## Access limitations

The browser stayed alive and the page ran continuously. My helper could click and tap but lacked a selectOption/keyboard control. The native House action picker was not visible in the screenshots. A normal picker attempt left “Walk down and sit with them” selected, which I used. Later I could not select Send them grain. The Playwright option click returned:

```text
getByRole('option', { name: 'Send them grain', exact: true }).click()
locator.click: Timeout 5000ms exceeded.
- element is not visible
```

An earlier exact accessible-name lookup for the Kavak button also timed out; a normal coordinate tap opened the house. Neither error is counted as an inert game control. Some immediately captured screenshots showed a blank panel during a transition (14-family-news.png, 24-ledger.png); subsequent screenshots showed the content. I used the settled screenshots for the layout findings. Body text extraction was used for player-facing text, but content below the visible panel was not treated as read until I scrolled or saw it on screen. The selector failure and time spent recording limit conclusions about pacing and food-giving.

## One desktop look after stopping

At 1280×800, the ledger showed its full account together: 30 grain measures in the granary, about 310 cut and unthreshed, 384 due, rider 15 September, years short 0; the term-end sentence and pause control also fitted (28-desktop-post-stop.png). The map remained alongside it. This made the account much easier to compare. I took no further gameplay inputs.

## Changes I would want, ranked

1. Give the household context, storm reports and ledger enough reading space on my phone. I want whole sentences and the account together, without sliding a small inner panel.
2. Let me visit or help a selected household with a direct action. I do not want the ordinary visit hidden in an action selector.
3. Show the arrival before displaying the conversation, or use words that make it clear when I am still on the road.
