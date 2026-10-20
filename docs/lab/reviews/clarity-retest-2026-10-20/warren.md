# The Warren — source-unread playtest

## Assignment and method

- Persona: Ilse, 48, nurse and mother of three. I play mobile puzzle games, want to keep people safe, read the first lines and skim, and have ten minutes before bed.
- Live URL: https://warren.adamwhite.work
- Visible build: The Warren 0.2.0; HF 2.8.0. Seen in the notebook's page tab at 2:38 (`17-notebook-page.png`).
- Phone: 360×690 CSS px, touch-enabled mobile Chromium, light mode, default text size. Inputs were ordinary coordinate clicks/taps and scrolling. Single taps made individual chalk and furnishing marks; I did not perform a drag or a two-finger pan.
- Access: headless Chromium through Playwright, kept open by a Node HTTP command server. I used screenshots and ordinary controls. I read only the two assigned existing documents. I did not inspect game source, bundles, DOM state, storage, network payloads, debug APIs or prior reports.
- Wall clock: first actionable title screen at **2026-10-20 08:31:14.027 UTC** (03:31:14.027 CDT). I quit at **08:37:18.674 UTC**, **6:04.647 elapsed**. The eight-minute ceiling did not end the session. Game dates advanced separately from wall time, from 19 August to 3 September, Year 1.
- Timing limitation: this was screenshot-driven observation, with real time continuing between inputs. I did not see every intervening animation or warning. In particular, the later journal established that a smoke warning occurred during my fast-speed wait; I did not see it live. No tool step failed, and the same page stayed open throughout play.
- After quitting, I made one 1280×800 look at the opening screen by resizing and reloading the same page. I did not resume. It offered “Go back down · 3 September · Year 1 under the hill.” See `37-desktop-first-screen.png`.
- No telemetry send, consent change or export download was initiated. No replay was tested.
- Evidence directory: `warren-shots/`. Timestamped inputs and original diary entries were appended during play to `warren-session.jsonl` beside this report. Both are newly written outputs.

## First minute

Checkpoint observed at 61.6 real seconds after the first actionable screen. I stopped inputs for the checkpoint. Evidence: `warren-shots/05-first-minute.png`. These answers were written before continuing play.

| Item | Status | Original checkpoint answer |
|---|---|---|
| DL-1 A reason to act | PASS | I want these nine people to have somewhere safe when the riders come. The opening said to dig a refuge; now the red line says the harvest needs room below. |
| DL-2 What can I touch | PASS | Begin and More about the hill looked tappable. In play, look, chalk, rub out, store, beds, lamp, door, the speed chevrons, bell, notebook and Open journal look like controls. I tried chalk, a patch of stone and look. The selected tool has a darker fill and heavier outline. The stone accepted my tap. I have not found an inert thing I mistook for a control. |
| DL-3 Urgency and selection | PASS | The red sentence draws me first. Now it says to mark open ground as a store for the jars. That sounds like the immediate need. Look is selected; the clock and the room full of people compete for my attention, but the red instruction is stronger. I do not know when the riders will come. |
| DL-4 Why the limit | NOT TESTED | I have not met an unavailable action. |
| DL-5 Readable situation | PASS | People are digging the chalked space, or have just done it. The journal says, “Elif broke through the first chalked wall and stood in the new space, coughing dust.” I can choose store and mark the new ground. |
| DL-6 A choice soon | PASS | The chalk tool and the stone were available by about 8.0 seconds, after I pressed Begin. My first input was Begin at about 7.8 seconds. My first tool choice was chalk at about 19.7 seconds; my first work mark was at about 39.5 seconds. A meaningful choice was available within 30 seconds, before any long text. |
| DL-7 Learn by doing | PASS for interactions reached | My chalk tap made a red X and said, “The chalk is laid. People choose when to take up a pick.” Then the room grew and the journal named Elif. I learned that I mark a place and the people decide to dig. Look selected an inspection tool. I used only the opening instruction and the visible journal preview, with no help opened. Six other named interactions remain NOT TESTED: rub out, store, beds, lamp, door and bell. |

## Verbatim diary

These are the original reactions, in order. Wording is retained, including guesses later resolved. Times are wall-clock elapsed times, rounded to tenths of a second.

**0:07.8:** “I need to dig somewhere safe before the riders arrive. Begin looks like the button; More about the hill looks optional. I will start.”

**0:19.6:** “The jars are empty and there are nine souls. The red instruction says choose chalk and drag beside the cellar. The little room is the cellar, I think. Chalk is a clear button.”

**0:45.8:** “I tapped beside the room and got a red X. It says the chalk is laid and people choose when to take up a pick. So I am marking work for them, not doing it myself. Days are already passing quite quickly. I do not see riders or a deadline yet.”

**1:29.9:** “First minute checkpoint, observed at 61.6 seconds: I can see the room has grown and Elif broke through. I can mark the new space as a store. I want them to have food and shelter. I still do not know when riders come.”

**1:41.5:** “There are jars on the right now. That is reassuring. The faint handwritten hint became readable after I did it: grain goes where the jars are. I would rather know whether this is enough room for everyone.”

**1:50.4:** “Musa is hungry: Food first. But the jars say food for the winter. I am guessing he has to go upstairs to eat. I like that he has a name and says what he needs. Now it says beds, so I will make sleeping space. I want the days slower while I read.”

**2:03.2:** “One little bed mark appeared. I cannot tell how many people it sleeps. Nine people in this narrow room feels cramped. I will dig another space below it.”

**2:17.2:** “The journal has ticks for chalk, waiting and jars. Beds has not got a tick yet. Perhaps I need more of them, but it has not told me how many. I will look at the people.”

**2:27.9:** “Hatice is worn out and hungry, and says Keeping at it. I want her to rest. The new square below is dug now. I will put beds there rather than keep her working.”

**2:48.5:** “Ah, ring the bell when there is smoke. I am glad I did not ring it just to see. Nobody obeys is a little ominous. I can offer them shelter, but I cannot make Hatice rest. I found the explanation in More about the hill.”

**3:06.3:** “Looking at the bed did not show me anything. The red instruction still says mark beds, although I can see two bed marks. I do not know whether those count or whether they need a bigger room. I will make a wider sleeping room and let them work a little faster.”

**3:12.8:** “Now the journal says Sleeping places, three to a mark. That answers it: I need three marks for nine people. I only have two. I wish I had seen that when I put the first one down.”

**3:47.6:** “Three marks should sleep everyone now. I will put a lamp by the lower room, because the journal says the picks stop in the dark. That is a reason I understand.”

**3:54.9:** “There is room to sleep below. Good. That is the first moment I feel I have made them properly safer. Now I need to watch the road for smoke. I do not know whether I should add a door before trouble comes.”

**4:24.9:** “The door hint was pale and then disappeared. Tapping door again did not show it again. I caught something about a narrow opening and rolling stone, so I will try the shaft above the room. A door there seems safer than an open entrance.”

**4:40.9:** “Meryem is carving the rolling stone. Good, the circle was a work mark, not a finished door. The journal says they will carve it when someone has time. Everyone seems to be carrying on. I will speed up while I watch for smoke; I do not want to spend bedtime waiting through quiet days.”

**5:11.0:** “Riders are at the hill. I did not catch smoke first, but the red instruction is clear: ring the bell. Do it now.”

**5:20.4:** “Ayşe was caught near the entrance and struck. Oh no. I thought I had got them ready. I am slowing down to see whether she is hurt and whether I can help. I do not see a treatment button.”

**5:50.1:** “Ayşe is alive, hungry and nursing a hurt, but sleeping at home. Now Yusuf Usta has been struck too. The bell is sounding, yet I cannot tell how to get the injured people down. I do not want to close a door on them. This is upsetting rather than reassuring.”

**6:04.6 — quit:** “I am stopping now. I wanted to keep everyone safe, and two people have been hurt while I was trying to find out what to do. The journal shows smoke gave half a day, maybe less; I missed that warning at the fast speed. I could ring again, but I do not feel I understand how to protect them. This is enough for tonight. I would not return before bed.”

## Inputs and visible answers

| Elapsed | Input or observation | Visible answer and evidence |
|---|---|---|
| 0:00 | Opening screen | “Dig a refuge where the village can outlast the riders.” Begin and optional help fit on screen. `00-first.png`. |
| 0:08 | Press Begin | Nine souls; empty jars; little water; red chalk instruction; tool and speed buttons. `01-begin.png`. |
| 0:19.8 | Select chalk | Chalk selection changed. `02-chalk.png`. |
| 0:39.5 | Tap stone immediately right of cellar | Red X; “The chalk is laid. People choose when to take up a pick.” `03-stone-tap.png`. |
| 0:45.9 | Select look | Visible chalk task tick. `04-look.png`. |
| 1:01.6 | Observe; stop inputs for checkpoint | Larger room; journal names Elif's breakthrough; red prompt asks for a store. `05-first-minute.png`. |
| 1:30–1:34.7 | Select store, tap open right-hand ground | Jar outlines appear. Handwritten help: “Drag over open ground to make it a store. Grain goes where the jars are.” `06-store-tool.png`, `07-store-mark.png`. |
| 1:41.7 | Select look, tap person | Musa, 29: “eat at the hearth · hungry”; “My stomach is growling. Food first.” Red prompt asks for beds. `08-person-look.png`. |
| 1:50.6 | Close sheet; choose first speed chevron | I chose slower time to read. Selected speed is outlined. `09-slow.png`. |
| 1:55.1 | Select beds, tap open ground | One bed mark appears. No capacity shown in this immediate screenshot. `10-beds.png`. |
| 2:03.4 | Select chalk, tap below room | Red work mark. `11-more-space.png`. |
| 2:11.5 | Open journal | Completed chalk/wait/store entries; no completed beds entry visible. `12-journal.png`. |
| 2:17.4–2:22.0 | People tab, Hatice | Hatice, 58: hungry, worn out, “Keeping at it.” New space has been dug. `13-people.png`, `14-hatice.png`. |
| 2:28.1–2:32.1 | Close Hatice; select beds; tap new lower tile | Second bed mark. `15-bed-select.png`, `16-bed-below.png`. |
| 2:38–2:48.6 | Notebook → page → More about the hill; scroll | Help says to hang a lamp where darkness stops digging, ring the bell when there is smoke, and “Nobody obeys.” It defines the calendar and touch gestures. `17-notebook-page.png` through `19-help-lower.png`. |
| 2:56.2 | Close notebook; select look; tap bed | No inspection sheet or explanation appeared. `20-bed-look.png`. |
| 3:06.4 | Select chalk; mark beside lower room | Red work mark. Journal now reads “Sleeping places, three to a mark.” `21-sleep-expand.png`. |
| 3:12.9 | Choose second speed chevron | I increased speed to wait for digging. `22-faster.png`. |
| 3:31.7 | Wait, observe | Wider room. “Where the daylight stops, the picks stop. A lamp hung beside a face lets them work it.” `23-wait.png`. |
| 3:40.4 | Select beds; tap new tile | Third bed mark. `24-third-bed.png`. |
| 3:47.7 | Select lamp; tap lower room | Lamp appears. Red instruction changes to “There is room to sleep below. Keep the lamps lit and watch the road for smoke.” `25-lamp.png`. |
| 3:55.0–4:14.3 | Select door; observe after delay; press door again | A pale hint appeared initially, then vanished. Pressing the selected button again did not restore it. `26-door-tool.png` through `28-door-help.png`. |
| 4:25.0 | Tap one-cell shaft with door selected | Circular mark appears in the shaft. `29-door-place.png`. |
| 4:29.6 | Select look; tap shaft mark | Meryem, 19, “carve the rolling stone · well enough.” Journal: “A door marked. They will carve the rolling stone when someone has the time and a…” The preview truncates the rest. `30-door-look.png`. |
| 4:41.1 | Close sheet; choose fourth/fastest chevron | Door is drawn as a rolling stone; I wait for smoke. `31-fast-watch.png`. |
| 5:04.0 | Observe after a real wait | “Riders are at the hill. Ring the bell to call the village below.” Journal: “Riders on the hill. Hooves over our heads, voices at the entrance.” `32-fast-wait.png`. |
| 5:11.1 | Press bell | Red rings above scene; “The bell is sounding; watch who comes below.” Journal says Ayşe was caught near entrance and struck. `33-bell.png`. |
| 5:20.4–5:23.9 | Choose first speed chevron; open people; select Ayşe | “sleep at home · hungry, nursing a hurt”; “Alright, I'll do it.” Her injury remains in the sheet. Journal now names Yusuf Usta as struck too. `34-raid-people.png`, `35-ayse.png`. |
| 5:50.2 | Close sheet; open journal | Smoke warning: “Riders, then. Half a day, maybe less.” Entries show arrival, Ayşe struck, my bell, then Yusuf struck. The red instruction has returned to “Ring the bell…” `36-raid-journal.png`. |
| 6:04.6 | Quit | I stop without ringing again or trying to close the door. |

Speed changes were all through visible controls. I chose the first chevron at 1:50.6 to read, the second at 3:12.9 to let digging proceed, the fourth at 4:41.1 to pass quiet days, and the first again at 5:20.4 after the injury. I did not accelerate time through code or batch decisions.

## Best, worst and stopping point

**Best:** At 3:47.7 the instruction changed to “There is room to sleep below.” I had food, sleeping places and light. That acknowledged the safety work I cared about. Elif breaking through and Meryem carving the door also made the work feel like something people did, rather than an instant building command.

**Worst:** At 5:11.1, immediately after my bell, the journal said Ayşe had been struck. I then found her sleeping at home with a hurt and saw Yusuf had been struck too. The journal later showed Ayşe's injury preceded my bell. I do not claim ringing caused the injury.

I began losing patience around 3:06, when the unchanged beds instruction did not tell me whether two marks counted. I chose fast time at 4:41 because waiting through quiet days felt too long for bedtime. The injuries upset me at 5:11. I quit at 6:04.6 on the journal, while the riders remained at the hill, with nine souls still reported. I did not reach an ending or establish anyone's final outcome. I would not return voluntarily before bed; I might try again when I had more attention, but this session did not make me want to do so.

## Clarity findings

These are player observations, not claims about the simulation's implementation. The first-minute answers above remain unchanged.

- **DL-7 — FAIL for the later beds interaction:** “I cannot tell how many people it sleeps.” The first bed mark appeared at 1:55.1. I did not learn “Sleeping places, three to a mark” until 3:06.4, after making a second mark and trying inspection. During that interval, “Mark beds so the village can sleep here too” stayed unchanged. The capacity clue eventually answered the question. Evidence: `10-beds.png`, `16-bed-below.png`, `20-bed-look.png`, `21-sleep-expand.png`. The first-minute chalk interaction still passed.
- **DL-7 — FAIL for access to the later door explanation:** “The door hint was pale and then disappeared.” I could not recover it by pressing the selected door button again. I placed the door based on the part I caught, then learned from Meryem and the journal that it was work to be carved. Evidence: `26-door-tool.png` through `30-door-look.png`. The immediate screenshot may catch a visual transition; the observed problem is that I could not get the hint back, not a claim that its final text always has poor contrast.
- **DL-13 — uncertainty on a look input:** I tapped a bed with look selected at 2:56.2 and saw no sheet or explanatory answer. I could not tell whether beds were inspectable. `20-bed-look.png`. I did not repeat the furnishing input, so I cannot claim a duplicate or lost accepted action. Chalk, furnishings and the bell otherwise had visible responses.
- **DL-24 — FAIL for return to origin:** From Notebook → people I opened Hatice, then closed her sheet. That returned me to the scene rather than the people list. `13-people.png`, `14-hatice.png`, `15-bed-select.png`. I had to reopen the notebook for further browsing. I did not see stacked sheets.
- **DL-26 — FAIL for the menu label:** The persistent button says “notebook”; save/run controls are under its “page” tab. It contains “Send this run to the notebook” and “Export this run (seed, inputs, state)”. These differ from “Game menu” and “Download this run” in the supplied checklist. `17-notebook-page.png`. As this player I found the journal naturally; I did not initially expect the page tab to contain run controls.

The raid left me unsure how to help injured people or bring them below. That is an unresolved player question, **not an established DL-16 failure**: help explicitly says “Nobody obeys,” and I had a visible response, ringing the bell. I did not test whether further waiting, another bell or a different layout would help. I did not establish that treatment should be an available action.

## English, dates and phone layout

| Item | Result | Observed evidence and limits |
|---|---|---|
| DL-20 English | PASS for encountered actions | Chalk, store, beds, lamp, door, bell, hunger and injury were understandable in English. Turkish names did not stop me acting. “Yusuf Usta” was introduced in help as the house over the cellar, and the people tab grouped him under the dig-master's house. I did not need to translate a title to choose an action. |
| DL-21 Dates | PASS for the encountered same-year warning; return comparison NOT TESTED | The game showed English month names and Year 1. Help says years have 365 days and Year 1 begins on 19 August (`19-help-lower.png`). At the end I could compare the 2 September warning with the 3 September current date: the warning was yesterday. “Half a day, maybe less” was understandable. I missed it live and only read it later in the journal. I did not meet an advance deadline spanning years or resume play after a break. |
| DL-22 Phone response visibility | PASS for reached immediate responses | Red situation text, scene, journal preview, tools and bell were visible together without scrolling on 360×690. Musa, Hatice and Ayşe sheets were readable with a close button on screen. The journal and expanded help scrolled; they were long sheets. The persistent notebook button stayed visible in play. I did not test a keyboard-open sheet or safe-area behavior. |

The desktop opening look had no visible overlap or horizontal clipping. It showed the saved date, optional help and both return/new-hill buttons (`37-desktop-first-screen.png`). This one view does not establish desktop gameplay or resume correctness.

## Evidence gaps

- **DL-4:** No visibly unavailable control was encountered. A journal entry explained darkness stopping picks and a nearby lamp enabling work; I did not establish that digging had actually stalled or test a limit recovering. The first-minute NOT TESTED stands.
- **DL-12:** No ending reached. I quit during the raid.
- **DL-15:** I found and used speed controls, then met a live threat from fast speed and answered the bell instruction about seven real seconds after my first screenshot of it. I did not establish whether the game automatically slowed, whether an earlier smoke choice remained open, or what speed it restored. Full test NOT TESTED.
- **DL-23:** I did not measure hit areas. No mistaken neighboring-button input was observed. NOT TESTED for the numerical target requirement.
- **DL-25:** I used default text size at 360 px and one 1280 px opening view. 320 px, 200% text and dark theme NOT TESTED.
- **DL-27:** Reload showed a saved-date return button. I did not press it or verify state preservation, absence of duplicate actions or time behavior. Full resume test NOT TESTED.
- **DL-28:** NOT TESTED; sending was not authorized and I did not send.
- **DL-29:** NOT TESTED; no export, import or replay attempted.
- Rub out was never used. I marked a door but did not test opening or closing it. I did not pan, inspect every person or exhaust every interaction. Unmet interactions and builder-only checks are not passes or failures.

## Changes I would want as Ilse

1. Tell me “three people per bed mark” when I choose beds, and show whether I have room for all nine while I place them.
2. Let me reopen the selected tool's explanation. I want to read what a door does before I decide where it belongs.
3. During a raid, let me see who remains above ground and what ringing the bell can still do for them. I want enough information to choose whether to ring again or secure the entrance.

