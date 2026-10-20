Screenshots stayed in the driver's scratch folder and are not kept.

# Neighbours — source-unread playtest

## Session

Kerem, 33, a social worker who plays Animal Crossing and A Short Hike. I came to help people in a small town and wanted to see that my help mattered. I was imagining a phone session on the ferry.

- URL: https://neighbours.adamwhite.work
- Build: no version identifier noticed in the screens I reached.
- Access: headless Chromium through Playwright, one persistent page controlled by a local Node HTTP server. Screenshots and normal controls only. No source, bundles, network payloads, hidden DOM state, storage or debug APIs inspected.
- Phone: 360×690 CSS pixels, touch emulation, light mode.
- Clock start: 2026-10-20 10:40:57.374 UTC (05:40:57.374 America/Chicago), first actionable title screen. Initial screenshot caught the opening fade; settled title was captured at +00:06.659.
- Natural quit: 10:45:04.581 UTC, **+04:07.207**. Eight real minutes was a ceiling. It did not expire. I did not resume mobile play after quitting.
- In-game clock: Day 1 08:00 initially; Day 1 09:30 at quit. Kept separate from real elapsed time.
- Speed: default 1×. I pressed Play once; I did not change speed, use Step or Next, accelerate time, or batch decisions. The game later displayed “Paused for a new story.”
- After quitting: one 1280×800 desktop look at the title screen, without entering town again. The viewport was resized, then the live root page was opened. No desktop gameplay.
- Consent: no telemetry/run submission control used, no consent settings changed. No export downloaded.

Only the two assigned instruction documents were read. Tool installation and browser automation files were created in the assigned empty directory. Screenshots and records were written to the assigned output directory.

Evidence: screenshot filenames below are relative to [neighbours-shots](neighbours-shots/). [wall-clock.jsonl](neighbours-shots/wall-clock.jsonl) records UTC timestamps, elapsed times, commands and screenshot paths as the session happened. [diary.md](neighbours-shots/diary.md) preserves the contemporaneous entries, including the timing correction. Exact input timestamps in the log govern where diary times were rounded.

## First minute

Actual checkpoint: **+01:15.530**, 15.530 seconds late. Screenshot: [08-checkpoint.png](neighbours-shots/08-checkpoint.png). The capture request made shortly before 60 seconds returned at +00:57.699; the follow-up checkpoint was delayed by tool use and recording the answers. No gameplay input occurred between +00:49.634 and the checkpoint. The answers below were recorded before continuing and have not been revised using later knowledge. The original estimated checkpoint time was corrected separately after the timestamp returned.

| Item | Status | Original checkpoint answer |
|---|---|---|
| DL-1 A reason to act | PASS | I came to help a town rebuild after a flood. The Hall says Needs help and needs repairs. |
| DL-2 What can I touch | PASS | Enter town, the Hall card, outlined map places, named person circles, Play, Step, Next, the speed selector, Town, Journal, More and Game menu look tappable. I have tried Enter town, Hall and Walk. No inert decorative thing tried. |
| DL-3 Urgency and selection | PASS | Needs help drew me first. The Hall outline and Flooded hall sheet show my selection. The repair need seems urgent, but I have seen no deadline. |
| DL-4 Why the limit | NOT TESTED | I saw “closed pending safe inspection” but no unavailable action control. I do not yet know who can inspect it. |
| DL-5 Readable situation | FAIL | I pressed Walk, but the screen still says “You are at Riverside homes” and offers the same Walk button. I cannot tell whether the walk is queued or did not work. Play may be needed; that is my guess. |
| DL-6 A choice soon | PASS | The town map was visible by +00:22, offering places to choose, within 30 seconds. First input was Enter town at +00:15. First meaningful place selection was Hall at +00:33; first Walk input was +00:50. Opening story before Enter town was about 20 words, plus a technical paragraph. |
| DL-7 Learn by doing | FAIL | Enter town taught me the map. Choosing Hall taught me my location and a 45-minute walk cost. Walk has not yet shown me a consequence or an underway cue. Two gameplay interactions reached: inspect place and request walk. People and repairs not tested (two unmet interaction types identified so far). No help used. |

Timing detail for DL-6: place choice visibly available by +00:21.454, first input Enter town +00:14.588, first meaningful place-selection input +00:33.428, Walk input +00:49.634. The checkpoint's story-word count was an estimate, not a complete word-count test. The title's technical runtime/save paragraph was also visible. There was no further mandatory story page before the map.

## Verbatim diary

The entries below retain the original wording and order, including the original checkpoint timing estimate and the separately recorded correction. The First minute table above reproduces the original checkpoint answers; its original surrounding diary text follows here.

> +00:07 — Opening. “A town rebuilding after a flood. That is a reason I would come here. Enter town looks like the main button.”
>
> +00:15 — I press Enter town. “Preparing the live town… I will give it a moment.”
>
> +00:22 — Town appears, Day 1 08:00, Rain. “The Hall says Needs help. That is where I want to go. Play, Step and Next look like time controls; the named circles look like people.”
>
> +00:34 — I tap the Hall card. The hall gains an outline and then opens a sheet.
>
> +00:41 — “I am at Riverside homes. Walking to the flooded hall takes about 45 minutes. No familiar neighbours there now, but the hall needs repairs. I will go.” Visible: “0/12 repairs; closed pending safe inspection.”
>
> Checkpoint at approximately +01:05 (screenshot records actual elapsed); no gameplay input since +00:50.
>
> +00:50 — I press Walk to Flooded hall. “It looks exactly the same. Did I ask to walk, or do I still need to press Play?” Clock remains Day 1 08:00.
>
> Checkpoint timing correction, recorded before continuing: actual +01:15.530. The +01:05 estimate above was made before the timestamp returned. Original checkpoint answers above remain unchanged.
>
> +01:25 — Tool note: the text-targeted Play click timed out. I reconnected to the same page and tapped the visible Play control at +01:29.
>
> +01:29 — “Now it says Walking to Flooded hall, arriving about 08:45. Good, I did ask to walk. I needed to start time.” The Walk control is grey, with “Your walk must end before you can walk somewhere else.”
>
> +01:39 — At 09:30 I am at the hall. “Paused for a new story — Read story.” “Ada can get an inspector; I want that before we repair a public building.” The Ada response is visible, but Noor's response continues behind the bottom control area.
>
> +01:54 — “I expected the inspector question, but now I have to choose what to ask, my work, and Done by Day 1 18:00. Is this a trade? Offer your work. It binds you only if they take it up. I will look at the ask choices.”
>
> +02:10 — “I tapped Choose what to ask, but I cannot see any choices in this browser image. I do not want to make a blind promise.” Tooling limitation: a native select may have opened outside Playwright's page screenshot; I cannot establish this as a game defect. I will close the form and read the story.
>
> +02:31 — Read story opens Musa's sheet: “Walk to Riverside homes to talk · ~45 min.” “I am not sure what the new story was. Musa is back where I came from. I would rather help at the hall while I am here.”
>
> +02:49 — “That opened Market kitchen, not the hall I meant. I have lost my place on this small moving map.” I had tapped the previous Hall area after closing Musa; I cannot separate a bad tap from a changing layout.
>
> +03:06 — With the sheet closed, I can see the story preview: “A question became a shared meth…” and a “Get an answer” cue. “Maybe the journal tells me what happened.”
>
> +03:35 — I scroll the Hall sheet. Noor's full response is “Work a paid coordination shift by the hall.” “I still have not actually helped. The hall is still 0/12 repairs and closed pending safe inspection. I will check the journal once.”
>
> +03:49 — Journal says “Get an answer” and “Pick someone here and ask for one of the things they could actually do now. You can read how they seem, but you learn their answer only by asking.” “That explains the idea. I still do not know what useful promise I can make from that form.”
>
> +04:10 approximately — “I am going to put this down. I came to help people, but I have only got to the hall and opened forms. On the ferry I would leave it here.” Natural quit; final phone screenshot records exact stop time. No further mobile gameplay.

Diary clarification without changing its wording: “Ada can get an inspector” was my inference from the visible “Leave a question for an inspector and wait up to two hours.” I did not establish that Ada herself could inspect the hall or guarantee an inspector. “Read story opens Musa's sheet” records the input sequence and my experience, not a proven link in the interface. Screenshots caught transitions, and the map changed size as sheets closed. A coordinate error remains possible.

## Best moment, worst moment and leaving

**Best:** the first town map. It felt like a place rather than a list of jobs. “Needs help” on the flood-damaged hall gave me a concrete place to care about. After starting time, “Walking to Flooded hall, arriving about 08:45” made the trip understandable. [03-town-ready.png](neighbours-shots/03-town-ready.png), [09-play-tap.png](neighbours-shots/09-play-tap.png).

**Worst:** opening Ada from a response about an inspector and finding a blank request/promise form. I expected to ask the question I had just selected. I could not yet explain what hour of work I was offering or how it would help the hall. Then I could not see the native select choices in the screenshot, which blocked further assessment of that form. [10-walking.png](neighbours-shots/10-walking.png), [12-ada-sheet.png](neighbours-shots/12-ada-sheet.png), [14-ask-open.png](neighbours-shots/14-ask-open.png).

Frustration first appeared at +00:50 when Walk gave me no clear acknowledgement while paused. It increased around +01:54 with the promise form. At +02:49 I had lost my place. I was not bored by waiting for the town; I was losing patience with finding a useful interaction.

I stopped in the Journal at Day 1 09:30, at the “Get an answer” explanation. Exact stop: +04:07.207, [30-quit-phone.png](neighbours-shots/30-quit-phone.png). I had arrived at the hall, opened Ada's form, made no promise and observed no completed repair or benefit to a neighbour. I would not return voluntarily from this session. I had not yet found the helpful conversation I came for. This is not evidence that such conversations or outcomes are absent.

## Clarity failures and limits of the evidence

| ID | What I saw, in my words | Evidence |
|---|---|---|
| DL-5 | After I pressed Walk, I still saw my old location and the same available Walk control. I could not say whether anything was underway. Later pressing Play resolved my uncertainty; that does not change the checkpoint. | 06-walk-hall.png; 08-checkpoint.png; later 09-play-tap.png |
| DL-13 | My accepted walk request did not give me a visible queued/underway acknowledgement while time was paused. I did not repeat Walk, so duplicate handling is NOT TESTED. | Walk +00:49.634; 08-checkpoint.png still at 08:00; 09-play-tap.png shows walking after Play. |
| DL-7 | The first walk taught me its cost before I clicked, but I did not learn what clicking it had done until I guessed to start time. This failure concerns that first interaction only. | 05-hall-selected.png; 08-checkpoint.png; 09-play-tap.png. Requests, promises and repair consequences were not completed. |
| DL-22 | At the hall, the second immediate response was cut off by the lower controls. I could read Ada's inspector response, but Noor's work response needed scrolling before I could read it in full. | 10-walking.png; 24-hall-sheet-again.png; after scrolling, 27-hall-scrolled.png. |

Additional confusion, without a firm defect attribution:

- **DL-10 / DL-16, NOT ESTABLISHED:** “Talk to Ada · Leave a question for an inspector and wait up to two hours” led to a general form labelled “Talk to Ada,” “Ask them to,” “Your hour” and “Promise an hour.” I could not connect the advertised inspector question to a selected request in that form. The unobserved native choices might have explained it. I am not claiming the necessary response is missing.
- **DL-9, NOT ESTABLISHED:** “Paused for a new story” was visible outside the journal. My Read story attempt left me looking at Musa and his location, without a story I understood. The later preview “A question became a shared meth…” was truncated. I cannot rule out a mistaken tap during a transition. This is evidence of my confusion, not proof that the story control opens the wrong sheet.
- **Map selection:** I opened Market kitchen while intending Hall after closing Musa. Screenshot 22-map-after-close.png shows a much smaller map than 17-story-view.png, and the bottom Hall card let me recover. I did not measure target sizes or prove the wrong place was hit by a correctly placed tap.

## English, dates and phone layout

| Item | Result | Evidence and scope |
|---|---|---|
| DL-20 English | PASS for the interactions reached | I could understand “Needs help,” “Walk to Flooded hall,” “Your walk must end before you can walk somewhere else,” and the request form labels in English. No required untranslated setting term encountered. Understanding the promise interaction remained a separate issue. |
| DL-21 Dates | PASS for a same-day comparison | Current Day 1 09:30 and “Done by Day 1 · 18:00” told me the form's deadline was later that day. The walk's 08:45 arrival was also understandable against 08:00. No promise accepted; no deadline crossed. Cross-day, month, year and return-from-break comparisons NOT TESTED. |
| DL-22 Phone response | FAIL in the hall sheet | At 360×690, Ada's response was readable, while Noor's response continued under the bottom controls. Scrolling exposed the full response. Journal's immediate instruction and Ada's visible form controls did fit. This is not a claim that every screen failed. |

Other checks reached: DL-4's later walking limit was clear: the grey Walk control said the current walk must end before another starts (09-play-tap.png). DL-14 showed an approximate travel cost before committing. The form showed an 18:00 deadline and “It binds you only if they take it up,” but I did not complete a promise or test its costs in use. DL-15's clock/speed were visible, and opening conversation showed “Slow · 1 min/s · conversation”; “Paused for a new story” was also explicit. The prescribed fast-speed live-choice test was NOT TESTED.

DL-23 target measurements, DL-25 200% text/320px reflow, DL-27 resume, DL-28 sending, and DL-29 replay were NOT TESTED. Game menu was visible and reachable; its contents were NOT TESTED. No builder checks were performed. Unmet interactions and inaccessible native popup evidence are not counted as game failures.

## Tooling notes and desktop look

One Playwright text-target click failed at +01:25.497: `TimeoutError: locator.click: Timeout 3000ms exceeded`, waiting for `getByRole('button', { name: '▶ Play', exact: true })`. I kept the same server and page, then tapped the visible control at +01:28.834. This was an automation locator failure, not evidence of a broken Play button. No page restart or game repair followed it.

At +02:00.529 I tapped the visible native “Choose what to ask” select. The screenshots showed focus but no options; a later capture was the same. Headless page screenshots may omit native browser popups. I did not inspect hidden option text, select unseen values, or infer the available requests. Completing a social request is therefore an evidence gap partly caused by tooling.

The 1280×800 title screen showed the full invitation, Enter town, the runtime/save explanation, both disclosure controls and All games without scrolling. It was clear and spacious. [33-desktop-opening-settled.png](neighbours-shots/33-desktop-opening-settled.png). I did not enter town or assess desktop gameplay.

## Changes I would want as this player

1. Tell me immediately that my walk request is waiting for Play, so I know my tap worked.
2. Carry the inspector question into Ada's conversation clearly enough that I understand what I am asking and what work I would promise before I commit.
3. Let me read each immediate hall response in full on my phone without moving the sheet around.
