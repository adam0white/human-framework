# The Two Voices — source-unread playtest

## Session

- Persona: Leyla, 34, a nurse on a night-shift break. A few phone games each week; likes story games. Curious, half-attending, one hand available, about five minutes of patience.
- Live page: https://murmur.adamwhite.work
- Visible build: Game 0.2.1; Human Framework 2.8.0; Week 1570628891. These appeared in the run menu, not on the cover.
- Access: headless Chromium through Playwright. Screenshots, rendered visible text, normal taps, and one normal pointer hold. No source, bundles, network payloads, hidden state, storage inspection, or debug APIs.
- Phone: 360×690 CSS px, touch emulation, device scale 1, light mode. The insist action used a 1.2-second mouse-pointer hold on the touch-emulated page. Actual sustained touchscreen behavior was not separately tested.
- First actionable cover: 2026-10-20 08:10:44.576 UTC. Phone session ended at 285.2 real seconds (4:45.2), before the eight-minute ceiling. The budget did not force the stop.
- After stopping: one fresh-context look at the cover at 1280×800, light mode. No desktop gameplay.
- Read only the two assigned instruction documents. Installed Playwright in the assigned empty working directory. No other project documents or prior reports were read.
- No telemetry submission, run sending, consent change, export download, or replay. Chromium closed normally; no process-kill command was used.

### Timing and access limitation

At 27.5 seconds, an attempted control lookup for “on with the day” waited 30 seconds and timed out. It did not tap the page. The game continued during that delay. The first-minute checkpoint was consequently recorded at 66.9 seconds. The missed Mum interaction during that interval is partly a tooling interruption, not clean evidence about ordinary half-attentive play. Later taps used screenshot coordinates.

I used “on with the day” normally at 95.3 and 124.4 seconds. I did not choose a speed setting or alter the clock through scripts. After those two taps I let the quiet stretches run. The game clock moved much faster between responses than while choices were open. Reading, recording, and screenshot handling also consumed real time; there was no frozen-time harness.

Screenshots are in [murmur-shots/](murmur-shots/). Immediate screenshots 04 and 08 caught the scene before the response text appeared in the image; later images such as 11, 13, and 24 show completed response feedback. I do not use the early images to claim that feedback never appeared.

## First minute

Recorded at 66.9 seconds. A control lookup delayed the checkpoint; it timed out without tapping “on with the day.” These are the original checkpoint answers, written before continuing. Later discoveries do not change them.

| Item | Status and original checkpoint answer                                                                                                                                                                                                                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | PASS — “I’m accompanying Dilan and saying things that may influence her. Right now I can answer Murat about being late.”                                                                                                                                                      |
| DL-2 | PASS — “The outlined replies, dashed ‘say nothing,’ and menu look tappable. ‘Wake her up’ and ‘Five more’ worked. I haven’t tapped anything that proved inert.”                                                                                                               |
| DL-3 | PASS — “The bottom card draws me first. ‘She won’t wait long’ made the alarm choice feel urgent. The red line groups the replies; I don’t see a selected reply now.”                                                                                                          |
| DL-4 | NOT TESTED — “I haven’t met an unavailable action.”                                                                                                                                                                                                                           |
| DL-5 | PASS — “Murat is asking ‘Traffic?’ I can say she overslept, blame the ring road, or say nothing.”                                                                                                                                                                             |
| DL-6 | PASS — “The first meaningful choice was visible by 14.1 seconds, after a short alarm scene. My first input was ‘Wake her up’ at 7.4 seconds; my first meaningful choice input was ‘Five more’ at 20.9 seconds.”                                                               |
| DL-7 | PASS for the one reply tried — “I chose to let her sleep; ‘Fine’ acknowledged it, then she slept through more alarms and arrived late. The screen explained that the pencil is the other voice and the small words are her mood. Other reply interactions remain NOT TESTED.” |

Evidence: [01 cover](murmur-shots/01-first-screen.png), [03 first choice](murmur-shots/03-morning.png), [06 checkpoint](murmur-shots/06-first-minute.png).

DL-7 scope at the checkpoint: one conversational choice tried, “Five more.” Two visible alternative replies were untried: “Up. Feet on the floor.” and “say nothing.” Insisting had not been encountered or tested. No extra help was opened; I read the inline instructions. The first meaningful choice was observed at 14.1 seconds; its exact earlier appearance time was not measured.

## Verbatim diary

These reactions retain their original wording and original rounded elapsed-time labels. Input times below are more precise where logged separately.

- **0:08:** “Wake her up looks clear. I’m curious about whose two voices these are. Now her alarm is about to go, so I’ll wait.”
- **0:21:** “Five more is exactly what I’d want on a night-shift break. The little notes sound like her willingness, not a guarantee. She said ‘Fine.’ That felt like she heard me.”
- **1:07:** “I looked away and she carried on. ‘While you were away’ helps, but I missed the chance to answer about Mum. Now I want her to tell the truth about being late.”
- **1:29:** “Oh, she can refuse me. ‘Not now. After I blame the ring road.’ The willingness note meant something. I’m interested now; I’m advising her, not steering her directly.”
- **1:50:** “I’d talk the crying driver through it. Dilan puts that off too. I can see the work pressure, but I’m wondering whether she’ll ever try my less convenient suggestion.”
- **2:04:** “Laughing at someone crying is nasty. ‘She found it, didn’t she?’ sounds like a small way to stand up for her. I’ll try that even though Dilan is against it.”
- **2:17:** “She laughed anyway. That’s the third kinder suggestion she’s declined. I understand her answer, but I don’t yet understand how my words can become her own. I’ll give it another scene.”
- **2:35:** “Her eyes closing at work feels familiar. I chose the coffee this time. ‘Alright, I’ll do it.’ It’s easier to get agreement when I’m telling her what she already wants.”
- **2:52:** “The menu calls itself ‘the back page.’ I found run controls, but nothing about the pace. I’m going back to the bus. Calling Mum sounds worth trying.”
- **3:09:** “She scrolled two stops past home. That detail feels real. But another ‘not now’ is starting to feel like I’m just watching her avoid things.”
- **3:27:** “The bedtime page is the first thing that makes me feel she’s been keeping track. ‘You had something to say about everything’ is a little pointed. I want to see whether tomorrow remembers any of it.”
- **3:41:** “Now she says, ‘I said I’d get up when it goes.’ That sounds like yesterday stayed with her. And now it tells me I can hold to insist. I’ll try that on getting up.”
- **3:53:** “That worked: ‘If you insist. I’d rather not.’ Then ‘She kept that one.’ This is the first time I feel I changed something she resisted. I wish I’d known about holding when Ece needed help.”
- **4:21:** “Murat’s cousin doesn’t even drive. That made me smile. Now Dilan is willing to admit the routing error. I’m guessing saying it plainly earlier helped, but I can’t prove that from what I’ve seen.”
- **4:36:** “They fixed it together in ten minutes. That’s a satisfying little result. Tuesday feels less hopeless than Monday. I’m near the end of my break; I’d rather leave on that than rush through the week.”
- **4:45:** “Ece is alone again, and now I know how to push for sitting with her. I’d come back to try that. For this break, I’m done.”

## Inputs and important visible answers

Real elapsed time is separate from the fictional clock. Quotes in this table were read from rendered page text; the linked images show the corresponding scene or subsequent result. The failed lookup is recorded as a tool failure, not a refused game input.

| Real elapsed  | Input / observation             | Visible answer or situation                                                                                                                                                         |
| ------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00          | Cover available                 | “Accompany Dilan through her week. Your words can change her choices and become her own.” “Wake her up,” “More about Dilan,” and replay looked interactive.                         |
| 0:07.4        | Tap Wake her up                 | Mon 06:39. “Her alarm is about to go.”                                                                                                                                              |
| 0:14.1        | Observe first choice            | “she won’t wait long”; “the pencil is the other voice”; “Tap one to say it.” Up / Five more / say nothing. [03](murmur-shots/03-morning.png)                                        |
| 0:20.9        | Tap Five more                   | Mon 06:43. “Fine.” she says.                                                                                                                                                        |
| 0:27.5        | Attempt on with the day         | Control lookup timed out after 30 seconds. No tap reached the page.                                                                                                                 |
| 1:06.9        | Stop inputs for checkpoint      | Mon 08:26. Slept through alarms; missed Mum voice-note choice recapped under “while you were away”; Murat asks “Traffic?” [06](murmur-shots/06-first-minute.png)                    |
| 1:29.1        | Tap Say you overslept           | “Not now. After I blame the ring road.” “She put yours off, so the pencil’s way, for now.”                                                                                          |
| 1:35.3        | Tap on with the day             | The ring-road excuse worked. “Nobody checked. It worked, which was almost worse.” [09](murmur-shots/09-afternoon.png)                                                               |
| 1:40.6        | Observe Ece choice              | Mon 10:41. New driver is lost and trying not to cry. Talk her through it / send the pin / say nothing.                                                                              |
| 1:50.2        | Tap Talk her through it         | “Not now. After I send her the pin.” Later: “She sent the pin and went back to the board.” [11](murmur-shots/11-driver-refusal.png)                                                 |
| 2:04.4        | Tap on with the day             | Mon 12:42. Murat mocks Ece at lunch. Three replies and say nothing all fit on screen. [12](murmur-shots/12-next.png)                                                                |
| 2:13.1        | Tap “She found it, didn’t she?” | “I'll laugh along instead.” “She didn’t. She went the pencil’s way.” Later: “She laughed. The impression got a second act.” [13](murmur-shots/13-lunch-response.png)                |
| 2:34.6        | Tap Have the coffee             | “Alright, I'll do it.” Later: “The third coffee. The board was green by five.” [15](murmur-shots/15-coffee-response.png)                                                            |
| 2:45.9        | Tap menu icon                   | “THE BACK PAGE.” Export / send / replay / new week / cover / Close. Build text visible. No run action selected. [17](murmur-shots/17-menu-open.png)                                 |
| 2:59.7        | Tap Close                       | Returned to bus-home choice.                                                                                                                                                        |
| 3:03.4        | Tap Call Mum                    | “Not now. After I scroll for a bit.” Later: “She scrolled to her stop, and two stops past it.” [18](murmur-shots/18-mum-response.png)                                               |
| 3:21.8        | Tap Write the day down          | “After I watch one more video, then I will.” Then Monday’s bedtime reflection arrived.                                                                                              |
| 3:26.6        | Observe day boundary            | “Monday, in bed”; “I keep going back over my alarm and my call to Mum.” “You had something to say about everything.” Clear Tomorrow control. [20](murmur-shots/20-bed-response.png) |
| 3:36.0        | Tap Tomorrow                    | Tue 06:39. “She lay awake past midnight. The third coffee.”                                                                                                                         |
| 3:41.3        | Observe Tuesday alarm           | “I said I’d get up when it goes.” “Press and hold an option to insist.” Up is “only with a push.” [21](murmur-shots/21-tuesday.png)                                                 |
| 3:51.8–3:53.1 | Hold Up for 1.2 seconds         | “you insisted”; “If you insist. I'd rather not.” “She took it as ‘Feet on the floor.’ She kept that one.” Subsequent log: up before the second alarm.                               |
| 4:11.7        | Tap Say you overslept           | “Alright, I'll do it.” “She took it as ‘Just say it plainly.’ She kept that one.” Later: “I overslept. Sorry about the road thing.” Murat: “I know. My cousin doesn’t drive.”       |
| 4:21.0        | Observe routing-error choice    | “That was me,” blame the system, keep your head down; all labelled willing. [23](murmur-shots/23-truth-kept.png)                                                                    |
| 4:29.0        | Tap “That was me.”              | “Alright, I'll do it.” Later: Murat sighed, and they fixed it together in ten minutes. [24](murmur-shots/24-routing-result.png)                                                     |
| 4:45.2        | Stop; close phone page          | Tue 12:42. Ece eats alone. Sit with Ece / eat at your desk / say nothing. Left unanswered. [25](murmur-shots/25-stop.png)                                                           |

## Best, worst, and attention

**Best moment:** Tuesday’s insist action, followed by “She kept that one.” It connected my input to something Dilan might carry forward. Admitting the routing error and fixing it with Murat was the most satisfying ordinary consequence.

**Worst moment:** Monday lunch. I tried a small defense of the crying driver; Dilan laughed along instead. This was clearly explained, but unpleasant. Three resistant replies in succession made my influence feel weak.

**Frustration began at about 2:17.** I understood that she could refuse. I could not yet tell what I could do differently. At 3:09 I was close to feeling like a spectator. The bedtime reflection and Tuesday’s hold instruction recovered my interest. I did not quit from boredom.

**Stop:** voluntary at 4:45.2, near the end of the persona’s break, on Tuesday’s lunch scene. I would return to try sitting with Ece. I did not finish the week or resume after quitting.

## Clarity findings

### Observed failures

- **DL-15 — FAIL for speed visibility; the full fast-speed interaction test is NOT TESTED.** “The clock is moving, but I can’t tell its speed from a label.” The header showed Mon/Tue and a clock, with no speed indication in the screens I reached. It moved slowly during open choices and very quickly after replies. I found no speed control in the menu. This made it harder to judge whether I could look away. I did not start from a selected fast-speed setting, so I cannot claim the specified fast-speed test passed or failed. See [06](murmur-shots/06-first-minute.png), [15](murmur-shots/15-coffee-response.png), and [17](murmur-shots/17-menu-open.png).
- **DL-26 — FAIL for the prescribed menu/control names; discoverability worked.** The icon was easy to find and run controls opened without scrolling, but the panel said “THE BACK PAGE” and “Export this run,” rather than “Game menu” and “Download this run.” The collection link said “all notebooks.” I understood the export control; this was a naming mismatch, not an inability to find the controls. See [17](murmur-shots/17-menu-open.png) and [01](murmur-shots/01-first-screen.png).

### Uncertainty and checks that worked

- **DL-7:** The first-minute result remains scoped to one reply. Later, the hold instruction successfully taught insisting when I encountered it on Tuesday. I wanted it earlier. I do not know whether insisting was available on Monday, or whether a prerequisite changed. That is an unresolved player question, not proof of a missing or broken control.
- **DL-13 — PASS for reached inputs.** Replies were attributed to the selected suggestion; refusal was explicit. “She put yours off” separated my suggestion from what she did. “you insisted” acknowledged the hold. No accidental duplicate or unexplained repeat was observed. I did not deliberately repeat an uncertain input.
- **DL-12 — PASS for the reached day boundary.** “Monday, in bed” and Tomorrow made the transition clear. The end of the game is NOT TESTED.
- **DL-17 — PASS for the feelings encountered.** Willingness appeared as words; tiredness appeared as “Her eyes keep closing.” No feeling bar was encountered.
- **DL-19:** “she’d put it off” and “she’s against it” correctly warned me that agreement was uncertain. The refusals were disappointing, not evidence that those cues lied. “Only with a push” and the hold instruction led to an acknowledged insist action.
- **DL-4 — NOT TESTED throughout.** Resistant replies were still tappable. I met no disabled action whose unlocking condition could be tested.

No inference here establishes the simulation’s internal rules. In particular, Tuesday’s increased willingness might relate to earlier replies, but I cannot establish the cause from this run.

## English, dates, and phone layout

| Item  | Status                                    | Evidence and scope                                                                                                                                                                                                                                                                                                                                                                      |
| ----- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-20 | PASS for reached play                     | All necessary labels and dialogue were understandable in English. Dilan, Aylin, Murat, and Ece were names, not unexplained action terms. “The pencil is the other voice” explained the pencil reference.                                                                                                                                                                                |
| DL-21 | NOT TESTED for deadline comparison        | Mon/Tue, Monday/Tuesday, 06:40, “tomorrow,” and “ten minutes” were readable. No dated deadline requiring comparison with today, month, or year was encountered. No return-from-break deadline check occurred.                                                                                                                                                                           |
| DL-22 | PASS for reached choices and day boundary | The entire immediate choice, its situation, willingness notes, and say-nothing response fit at 360×690 without scrolling. This held even at Monday lunch with three full replies. The menu’s Close control was reachable. Older history extended above the viewport, but the current response remained visible. See 03, 06, 12, 19, 21, and 25. No text-input keyboard was encountered. |

The single desktop cover look at 1280×800 showed readable text and unobstructed controls in a narrow centered column. No desktop response-layout claim follows from that look. [26 desktop cover](murmur-shots/26-desktop-first-screen.png).

Not tested: unavailable-action recovery; game ending; reload/Continue/save honesty; export or import; replay; sending; 200% text; 320 px width; dark mode; measured hit-area dimensions; keyboard-open layout; builder checks. These are evidence gaps, not game failures. No export path exists because no export was downloaded.

## Changes I would want as Leyla

1. Tell me sooner whether I can insist, or why I cannot yet. I wanted another response after several “not now” answers. I do not need her to obey every suggestion.
2. Make the current pace explicit. I want to know whether I have time to put the phone down for a moment.
3. Give me a small early sign when a declined suggestion still matters, if it does. The bedtime page finally gave me that feeling; I nearly lost interest before reaching it.
