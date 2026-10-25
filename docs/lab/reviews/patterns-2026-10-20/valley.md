# The Valley — Elif, source-unread phone playtest

## Session

Elif, 38, primary-school teacher, raised in a Black Sea village. Plays Banished, Stardew Valley and Crusader Kings occasionally. Wants to care for a community and understand people's situations. Dislikes scrolling panels to find what matters. Evening tea-break persona, one hand on a phone.

- URL: https://valley.adamwhite.work
- Build: no version visibly encountered.
- Device: 360×690 CSS px, touch emulation, light mode, default text size.
- Access: Playwright Chromium in one persistent local Node process and one page. Screenshots, rendered text and ordinary controls only; no game source, bundles, network inspection or game debug API.
- First actionable screen: cover, 2026-10-20 14:48:07 UTC (09:48:07 CDT). The evening context was the persona, not the actual local clock.
- Stop: 14:50:57 UTC, **170 seconds / 2 minutes 50 seconds** after the cover. Quit voluntarily before the eight-minute ceiling. First meaningful harvest choice seen at 9 seconds; sent at 15 seconds. Cover button pressed at 5 seconds.
- First-minute checkpoint recorded at **72 seconds**, 12 seconds late because of tool and recording delay. No gameplay input between About at 56 seconds and the checkpoint. The live clock continued.
- Default selected speed was **slow**. I never changed it. Game time advanced from 18 July, year one, to 21 July, year one, by the stop. Tool delays consumed real time and game time.
- After stopping, one look at 1280×800 on the same page, with no further gameplay input. Browser then closed. No run sent, telemetry submitted, consent changed or export downloaded.

Screenshots and original diary: `(driver scratch)/retest/valley-shots/`. Screenshot filenames below refer to that directory.

## First minute

These are the original checkpoint answers, preserved verbatim from `wall-clock.jsonl`. They describe what I had reached then, not what I learned later. Screenshot: `07-first-minute.png`; the preceding About view is `06-about.png` at 56 seconds.

| Item | Original answer                                                                                                                                                                                                                                                               |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | PASS — I must bring in the barley before rain; the charge says so.                                                                                                                                                                                                            |
| DL-2 | FAIL — the buttons and house tabs look tappable and Kavak selected visibly, but the map labels overlap so I cannot distinguish its places. The first attempt to find Kavak by button role was an automation failure; a coordinate tap worked.                                 |
| DL-3 | PASS — the red barley call draws me first; slow is selected and Kavak is selected blue with a circled house. Rain in two days is the urgency, though the later dates compete with it.                                                                                         |
| DL-4 | PASS — the repeat call is unavailable while the current call is open; another opens on 24 July, year one.                                                                                                                                                                     |
| DL-5 | PASS — the call is underway; the charge says read replies, and I found We’ll be there under About. I can choose a household action.                                                                                                                                           |
| DL-6 | FAIL — a meaningful harvest choice was visible at 9 seconds and I first sent it at 15 seconds, within 30 seconds. But the cover required reading about 55 story/instruction words before Take up the seal, above the roughly 40-word allowance. Cover input was at 5 seconds. |
| DL-7 | PASS for 1 reached interaction — calling the hamlet changed the charge to Read the replies and disabled a second call until 24 July; About revealed We’ll be there. Other household actions NOT TESTED (0 executed). No help used.                                            |

## Verbatim diary

UTC timestamps and elapsed seconds come from the live log. Reactions are the original wording. The native-select access failure was recorded when acknowledged, at 104 seconds; that entry is not its execution timestamp. Blank opening reaction is preserved as blank.

### 0 s — 2026-10-20T14:48:07.355Z

Input: Open game

Reaction:



### 5 s — 2026-10-20T14:48:12.189Z

Input: Take up the seal

Reaction: I am looking after a valley. Bringing in the harvest before rain sounds like the first job. Take up the seal is the clear starting button.



### 15 s — 2026-10-20T14:48:22.216Z

Input: Call the hamlet to the landowner’s barley the crier carries your request; they can refuse

Reaction: The red harvest button looks urgent. Slow is selected. The map is too crowded to read, but the household names look tappable. I will ask everyone to help first.



### 30 s — 2026-10-20T14:48:37.252Z

Input: Tap 39,340

Reaction: I am tapping Kavak to hear their reply.



### 40 s — 2026-10-20T14:48:47.296Z

Input: Tap 178,594

Reaction: I can see the selected house now, but not its reply. I want to sit with them and find out what is wrong.



### 56 s — 2026-10-20T14:49:03.134Z

Input: About

Reaction: The action list has not shown me a reply. About might tell me about this family.



### 72 s — 2026-10-20T14:49:19.032Z

Checkpoint: First minute

Reaction: I know I must get the barley cut before rain. The red call button was clear, and slow and Kavak have selected outlines. I sent the call, but I had to open About to see We’ll be there. The map names are cramped. The explanation is running behind the action panel.



### 104 s — 2026-10-20T14:49:51.408Z

Input: Attempted visit option via Playwright locator click

Recorded answer: Controller returned TimeoutError: option is not visible; visit not selected or executed.

Reaction: The controller could not operate this native select. That is an access limitation; I cannot say the game refused my visit.



### 104 s — 2026-10-20T14:49:51.517Z

Input: Close

Reaction: I will go back and see how much harvest is in. I still do not know whether enough people came.



### 104 s — 2026-10-20T14:49:51.714Z

Input: The landowner’s ledger

Reaction: The ledger sounds like the place to check the harvest.



### 117 s — 2026-10-20T14:50:04.664Z

Input: Go walking and sitting take time away from the residence

Reaction: A new baby! Yes, I want to go. The rain has already come, and I would like to meet someone rather than issue another order.



### 123 s — 2026-10-20T14:50:10.491Z

Input: Scroll 287

Reaction: I want to read the ledger while I am walking, but it starts below this small window. I am scrolling to find the numbers.



### 128 s — 2026-10-20T14:50:15.692Z

Input: Scroll -220

Reaction: I have scrolled past most of the ledger and found Years short. I want the grain and due together, not one row at a time.



### 135 s — 2026-10-20T14:50:22.729Z

Input: The notebook

Reaction: Thirty in the granary, about 190 cut, about 120 still standing. I cannot see the due and its date here without another scroll. I would like to hear how the baby visit went.



### 141 s — 2026-10-20T14:50:28.063Z

Input: Read more notes

Reaction: The notebook says no new word today. Perhaps the visit is in the older notes.



### 146 s — 2026-10-20T14:50:33.574Z

Input: Scroll 200

Reaction: Who feeds mine while I cut his? That makes sense. I want to find the visit beneath this reply.



### 152 s — 2026-10-20T14:50:39.607Z

Input: Scroll 79

Reaction: Yusuf sounds exhausted, and I care about this family now. But Don’t tell my wife I disappears at the bottom. I have to scroll in the middle of what he is saying.



### 170 s — 2026-10-20T14:50:57.047Z

Input: Stop session

Reaction: I am leaving now. I like Yusuf and I want to help with food, but I am spending my tea break scrolling a narrow strip to finish his sentence and find the harvest numbers. I would try this on a larger screen; I would not return to this phone layout tonight.



### 170 s — 2026-10-20T14:50:57.102Z

Input: Post-stop desktop look at 1280x800

Reaction:



### 177 s — 2026-10-20T14:51:04.775Z

Input: One post-stop desktop look

Reaction: At 1280 by 800 I can distinguish the houses and read Yusuf’s whole paragraph at once. The right column still has a fixed action row, but this is much less cramped. No further gameplay inputs.



## Important visible answers

This evidence table supplements the diary; it does not rewrite its reactions.

| Elapsed           | Input or observation      | Visible answer and screenshot                                                                                                                                                                              |
| ----------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 s               | Open                      | Steward's purpose; “The rain will not wait.” Clear “Take up the seal” button. `00-opening.png`.                                                                                                            |
| 9 s               | First valley view         | “Call households to cut the landowner’s barley before the rain.” Today is 18 July; note says rain in two days. Harvest button visible. `02-valley.png`.                                                    |
| 15 s              | Send harvest call         | Charge changes to “Read the replies to your standing call”; repeated call becomes unavailable until 24 July, year one. `03-call.png`.                                                                      |
| 30 s              | Tap Kavak                 | Blue selected tab and circled house; “the Kavak house”, About and Close, household action selector. `04-kavak.png`.                                                                                        |
| 56 / 72 s         | About / checkpoint        | “We’ll be there.” Household explanation continues below the small reading area into the action-panel boundary. `06-about.png`, `07-first-minute.png`.                                                      |
| 104–110 s         | Close, ledger             | New-child invitation from Çoban becomes visible above the ledger: “Come and see the child, steward, if you will.” Go and Send your regrets. `11-ledger-settled.png`.                                       |
| 117 s             | Go                        | Charge says to read the notebook while finishing the visit; date line says “you are walking to the Çoban house.” `12-go-child.png`.                                                                        |
| 123 s             | Scroll ledger             | Walking cue has gone. I did not see the visit conversation appear automatically in this view. Ledger shows “Years short” and term-end text at this scroll position. `13-scroll-ledger.png`.                |
| 128 s             | Scroll back               | 30 grain measures in granary; about 190 cut; about 120 standing. Due row is at the lower boundary, with its deadline out of view. `14-ledger-top.png`.                                                     |
| 135–141 s         | Notebook, Read more notes | Notes expand; the small viewport still shows the current refusal and controls, rather than the visit paragraph farther down. `15-notebook.png`, `16-more-notes.png`.                                       |
| 146 s             | Scroll                    | Yusuf's paragraph appears: exhausted household, no sleep and no food since yesterday. Sentence ends in view at “Don’t tell my wife I” and continues below the action-panel boundary. `17-yusuf-start.png`. |
| 152 s             | Scroll again              | Can finish “told you.” and see the record of walking down to see the child. `18-yusuf-end.png`.                                                                                                            |
| 170 s             | Stop                      | Charge now says barley is cut and suggests a household visit before threshing. Disabled call says harvest calls return on 30 June, year two. `19-stop-phone.png`.                                          |
| 170 s, after stop | One desktop look          | Houses are distinguishable and Yusuf's paragraph fits at once in the right column. `20-desktop.png`. No gameplay resumed.                                                                                  |

## Best, worst and leaving

**Best:** Yusuf at the hearth. “I haven’t eaten since yesterday. Don’t tell my wife I told you.” I recognised a tired household rather than a workforce. The earlier “Who feeds mine while I cut his?” also made the refusal understandable. I wanted to help with food.

**Worst:** reading that conversation in a narrow strip between the map/tabs and fixed action controls. At 146 seconds I reached the interesting part, then at 152 seconds had to scroll in the middle of his sentence. The ledger had already required scrolling back and forth to compare grain with the obligation.

Frustration was explicit at 128 seconds: “I want the grain and due together, not one row at a time.” I did not reach a separate long boredom spell. At 170 seconds I left because finding and finishing the information was taking over my tea break. I did not leave because the game ended or because the time budget expired.

At the stop, the barley had been cut according to the charge. I had sent one hamlet harvest call and accepted the invitation to see the child. I had not paid the due, completed a year or completed the term. I would not return voluntarily on this phone layout tonight. I would try a larger screen: the single desktop look made the map and conversation much easier to read.

## Clarity findings

- **DL-2 / DL-22 — FAIL, phone map:** “The map is too crowded to read.” In `02-valley.png`, `07-first-minute.png` and `19-stop-phone.png`, map names and houses cluster over one another. The household tabs gave me a usable alternative; Kavak's selected state was clear. This is not a claim that the tabs were inert.
- **DL-6 — FAIL at the original checkpoint:** the meaningful choice was available quickly, but the cover put about 55 story/instruction words before its start button. I did not find the opening emotionally difficult to understand. The failure is the checkpoint's word allowance, not late choice availability.
- **DL-22 — FAIL, essential context:** harvest controls stay on screen, but the useful reply and ledger state compete for a small reading area. `14-ledger-top.png` shows grain and sheaves without the deadline. `11-ledger-settled.png` shows the child's response controls, with the ledger out of view. An immediate response can be reachable while its surrounding context is not.
- **DL-30 — FAIL, text behind the fixed panel:** in `07-first-minute.png`, the explanation reaches “call for this work opens when it expires on 24 July, year” before the fixed action area. In `17-yusuf-start.png`, Yusuf reaches “Don’t tell my wife I” before the same boundary. Scrolling reveals the continuation (`18-yusuf-end.png`), so I am not claiming the text was absent from the game. Having to scroll within the sentence was the problem. No stacked sheets were established.
- **DL-31 — FAIL, state while ordering:** with Kavak's action sheet open (`04-kavak.png`, `07-first-minute.png`), I could name the person and see today's date plus the threshing/share dates. I could not read the harvest amount or the landowner's 15 September deadline there. The ledger itself needed scrolling to compare progress and obligation (`14-ledger-top.png`). The scene remained visible but its map labels were cramped.
- **DL-13 — PASS for accepted inputs reached:** sending the call changed the charge and disabled a duplicate. Selecting Kavak marked the house and tab. Go immediately showed walking. The failed native-select operation below is not evidence that a game input went unacknowledged.
- **DL-4 — PASS for the encountered call limit:** the unavailable repeat call explained its expiry date. At the stop the reason changed to barley already cut and the next harvest date. Other limits, and whether the underlying rules satisfy the builder check, were not tested.

## English, dates, phone layout and hands on

| Item  | Result                                              | Evidence and limits                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-20 | PASS for encountered action language                | Call, barley, grain measures, Go, household names and instructions were understandable in English. About supplied “reeve (local overseer)”. No necessary untranslated setting term blocked an action.                                                                                                                                                                                                                                  |
| DL-21 | PASS for encountered date labels                    | At first play I could compare 18 July, year one, with the current call's 24 July, year one. Threshing on 5 August follows July; final next-harvest label explicitly says 30 June, year two. No translation needed. Deadline comparison after returning from a break: NOT TESTED; no break/resume. I did not bring the 15 September ledger row into the phone screenshot, so simultaneous readability of that date is not a pass.       |
| DL-22 | FAIL                                                | Immediate controls were reachable, but essential reply/ledger context needed scrolling; map labels overlapped. See findings above.                                                                                                                                                                                                                                                                                                     |
| DL-30 | FAIL                                                | Mid-sentence panel cutoffs in `07-first-minute.png` and `17-yusuf-start.png`. No evidence of stacked sheets; no “Scroll ↓” label encountered.                                                                                                                                                                                                                                                                                          |
| DL-31 | FAIL                                                | Person and today remained visible; harvest progress and final due date did not remain readable with the household order sheet.                                                                                                                                                                                                                                                                                                         |
| DL-32 | NOT TESTED for a greater-than-20-second forced wait | Go at 117 seconds showed walking; by the 123-second observation it had ended, an observed interval of at most about six seconds. I could read meanwhile. My later wish to feed Yusuf was not followed by a completed attempt because the controller could not operate the native action selector. I cannot establish that the game had no response or no hands-on act available. No longer stretch with only watching was established. |
| DL-33 | Partial evidence; core-verb claim NOT TESTED        | I called through an action selector plus the displayed call button. Go on the child invitation started the visit in one act. The resulting conversation was something I read later in notes; I did not speak a line, cook or deliver food. I wanted to help Yusuf, but did not complete that action. I cannot claim the game only permits forms for those unmet verbs.                                                                 |

No judgment is offered on unmet choices. Other untested checks include full-speed live-choice slowdown, save/reload, game-menu contents, upload, replay, 200% text, 320 px reflow, exact hit-area measurements and all source/export builder checks. DL-28 was deliberately not exercised because sending was prohibited. There was no export.

## Access limitations

The controller used a persistent browser throughout. Two locator operations failed; they must not be counted as game refusals:

1. `page.getByRole('button', {name: 'Kavak', exact: true}).click({timeout: 5000})` returned `TimeoutError: locator.click: Timeout 5000ms exceeded`, waiting for that role. A normal coordinate tap at (39, 340) then selected Kavak. I do not infer the control was unavailable to a person.
2. `page.getByText('Walk down and sit with them', {exact: true}).click({timeout: 5000})` returned `TimeoutError: locator.click: Timeout 5000ms exceeded`, with `element is not visible` for an `<option>`. I did not select or execute this visit. The controller lacked a native-select selection operation. I did not repair the controller or game during play. The separate child-invitation Go button worked.

Both were invoked through POST requests to my local controller at `http://127.0.0.1:39847`; these are browser-access errors, not server/game errors. This limits what I can say about household visits, sending grain and other selector actions.

Rendered `body.innerText()` was returned alongside screenshots. It included off-viewport text and native option labels. I used screenshots to establish visibility; text extraction alone does not establish that the player could see a sentence or option. The ledger figures and Yusuf quotation were brought into view by scrolling before counting them as seen. No hidden game state was inspected.

## Changes I would want, as Elif

1. Let me read a person's whole immediate reply without scrolling in the middle of a sentence.
2. Keep the relevant harvest progress and deadline visible when I am asking a household to work.
3. Give me a phone map where I can distinguish the houses and names.
