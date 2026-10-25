# The Night Watch — Callum

Callum, 44, night-shift security guard. I play Frostpunk, Kingdom Two Crowns and FTL. I want tense defence and people whose placement matters. I dislike squinting at small panels. This is a one-handed phone break.

- URL: https://human.adamwhite.work/watch/
- Build: no build identifier seen in the screens reached.
- Device: 360×690 CSS px, touch emulation, light mode, default text size. One 1280×800 look after stopping; no desktop gameplay.
- Access: Playwright Chromium, one persistent page in a long-lived local Node process. Normal touch taps, button clicks, rendered text and screenshots. No source, bundles, network payloads, hidden state or game debug APIs inspected.
- Timing: eight real minutes maximum. First rendered usable title observed at load +3 s. Stopped voluntarily at load +220 s, approximately 3 min 37 s after the usable title. The first-minute observation was late; details below. No clock acceleration through scripts. I selected the visible Fast control at +176 s.
- No run sent, telemetry submission made, consent changed or export downloaded. This does not establish what automatic page networking does; it was not inspected.
- Evidence: screenshots and original `wall-clock.jsonl` are in `(driver scratch)/retest/watch-shots/`. Times below are real seconds from page load, including the initial three-second loading interval. The browser remained alive across commands and time passed between them.

## First minute

Checkpoint tool result at 79 s from page load, approximately 76 s after the first usable title screen. Tool and report-writing delay made it late. The preliminary answers were logged at 57 s from load, six seconds before the intended checkpoint. At the actual checkpoint Nightfall had become Night; controls and my answers stayed the same. No gameplay input occurred between the two observations. The diary preserves both timing mistakes verbatim.

| Item                       | Status                                                      | Original checkpoint answer                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DL-1 A reason to act       | PASS                                                        | I know I am keeping everyone and the granary alive until the thaw. The Gate tracks make that side urgent.                                                                                                                                                                                                                      |
| DL-2 What can I touch      | PASS                                                        | People, wall posts, speed buttons, Watchers and bell, and Ring the bell look tappable. Tapping people worked. The third watcher and lantern setup sat below the visible setup panel, although the begin button stayed visible. No inert tap found.                                                                             |
| DL-3 Urgency and selection | PASS                                                        | The Gate tracks make that side urgent; Gate has an outline and light, Watch has a speed outline.                                                                                                                                                                                                                               |
| DL-4 Why the limit         | NOT TESTED                                                  | No unavailable action met.                                                                                                                                                                                                                                                                                                     |
| DL-5 Readable situation    | PASS                                                        | I can move the lantern or ring the bell now. Only the lantern’s stretch shows what approaches. Your voice reaches the next stretch.                                                                                                                                                                                            |
| DL-6 A choice soon         | PASS                                                        | The first placement choice was available at 9 s from load, 6 s from usable title; first watcher input at 18 s from load, 15 s from title. The title needed one short goal sentence. First consequential placement input was 25 s from load, 22 s from title.                                                                   |
| DL-7 Learn by doing        | PASS for reached interaction; other interactions NOT TESTED | I have asked Tamar to hold Gate and Kian to Mill wall; the latter showed asked and still on Gate before he moved. Tapping people opens an asking sheet; a post choice returns to watchers. I have not tried urging, insisting, bell consequences or threat responses: four interaction types not tested. I have not used help. |

## Verbatim diary

The JSONL is the original timestamped diary. Reactions below retain their wording, including my premature checkpoint and inaccurate first desktop impression. Later entries correct them.

- **+0 s · 2026-10-20T14:42:30.071Z · Opened live URL** — The first screen is here. I am looking for where to put my people.

- **+9 s · 2026-10-20T14:42:39.273Z · Tapped Go up to the wall** — Bring every soul and the granary to the thaw gives me the job. Go up to the wall is the big obvious button; About keeping watch and Game menu also look tappable. I go up.

- **+13 s · 2026-10-20T14:42:43.065Z · look** — The scout found pack tracks on the gate road. I want a steady guard there, and good eyes on the west. The labels say tap a watcher then a post.

- **+18 s · 2026-10-20T14:42:47.981Z · Tapped Tamar card** — I tap Tamar. His card is clear enough, but Mara is below the phone edge. I can see the gate in the scene and expect to place him there.

- **+25 s · 2026-10-20T14:42:55.099Z · Tapped Gate · tracks with Ask selected** — Ask is outlined, and Gate says tracks. I ask Tamar to hold the Gate. Likely, maybe is a muddy forecast; I cannot tell how much confidence that means.

- **+30 s · 2026-10-20T14:42:59.578Z · Scrolled setup panel down** — That returned me to the watchers. Two people at the Gate seems wasteful, so I look for the lantern and the third watcher.

- **+35 s · 2026-10-20T14:43:04.662Z · Tapped Kian in scene** — The scroll did not move the panel. I try Kian himself in the scene; I want his speed covering the mill side.

- **+38 s · 2026-10-20T14:43:08.547Z · Tapped Mill wall for Kian** — Tapping the person worked. I ask Kian to the Mill wall.

- **+42 s · 2026-10-20T14:43:12.530Z · Tapped Begin the watch** — Kian now says Mill wall, asked, on the Gate. I read that as an order he still has to carry out. I begin the watch; the gate tracks are my worry.

- **+47 s · 2026-10-20T14:43:16.743Z · look** — Now it is Nightfall, Watch at 4 min/s. Only the lantern stretch shows approaches; my voice reaches the next stretch. I will keep the light on the Gate first.

- **+57 s · 2026-10-20T14:43:27.509Z · First minute checkpoint; no gameplay input** — First minute: I know I am keeping everyone and the granary alive until the thaw. The Gate tracks make that side urgent; Gate has an outline and light, Watch has a speed outline. People, wall posts, speed buttons, Watchers and bell, and Ring the bell look tappable. I have asked Tamar to hold Gate and Kian to Mill wall; the latter showed asked and still on Gate before he moved. No unavailable action met. The first placement choice was available at 9 s from load, 6 s from usable title; first watcher input at 18 s from load, 15 s from title. The title needed one short goal sentence. Tapping people opens an asking sheet; a post choice returns to watchers. I have not tried urging, insisting, bell consequences or threat responses. I can move the lantern or ring the bell now. I have not used help. The third watcher and lantern setup sat below the visible setup panel, although the begin button stayed visible.

- **+79 s · 2026-10-20T14:43:49.223Z · First minute at 60 s from usable title; no gameplay input** — Checkpoint now: my earlier first-minute note was recorded six seconds early. Nothing visible has changed. I keep those answers at the actual checkpoint.

- **+90 s · 2026-10-20T14:44:00.376Z · Tapped East wall lantern control** — The actual checkpoint tool time was 79 s from load, about 76 s after the usable title. Nightfall became Night; the controls and my answers stayed the same. I have watched quietly since starting. I move the lantern east because that side has nobody.

- **+99 s · 2026-10-20T14:44:08.630Z · look** — The lantern says it is on its way. Good: it is not pretending to arrive instantly. I am watching the east for movement.

- **+107 s · 2026-10-20T14:44:16.794Z · Tapped Gate lantern control** — Movement in the dark on the gate road. There it is. I bring the lantern back to the Gate so I can see what Tamar faces.

- **+114 s · 2026-10-20T14:44:23.726Z · Tapped Ring the bell** — Grain is already gone: something got over the gate. That was quick. I ring the bell to get people to the danger. The speed has slowed to 1.5 min/s without me changing it.

- **+123 s · 2026-10-20T14:44:33.540Z · Watched bell response** — The bell got Holding! from Tamar and the rope is fraying. I understand the bell has a cost now; I did not know that before pulling it. I cannot tell what Tamar did about the thing before I rang.

- **+131 s · 2026-10-20T14:44:41.025Z · Tapped Tamar in scene during night** — I want to tell Tamar to stay alert after that loss, so I tap him on the wall.

- **+142 s · 2026-10-20T14:44:51.659Z · Tapped Watchers and bell** — Tapping Tamar did not open anything this time. I try the Watchers and bell link to see what he is doing.

- **+162 s · 2026-10-20T14:45:12.507Z · Tapped Watchers and bell to close help** — Everyone is on the wall. The help explains the rope: Every pull wears the rope; a snapped rope leaves it silent. That explains why ringing was not a fighting command. Opening help pushed the bell partly off the bottom of my screen. I close it.

- **+168 s · 2026-10-20T14:45:18.029Z · look** — Tamar drove a wolf off the gate road. That is the payoff I wanted from placing him there. I did not have to ring again. I would like to see how much grain remains, but the little granary drawing is hard to read.

- **+176 s · 2026-10-20T14:45:25.909Z · Tapped Fast speed** — I am getting restless in the small hours. I have people posted and nothing new to ask them. I choose the visible Fast control to get to the morning result, rather than keep staring at the light.

- **+182 s · 2026-10-20T14:45:32.106Z · Tapped granary drawing** — I tap the granary to find out what grain is left. I expect either a stock description or nothing; it has no button outline.

- **+204 s · 2026-10-20T14:45:53.604Z · Waited at Fast** — The granary tap did nothing visible. I let Fast run for about fifteen seconds to see morning.

- **+220 s · 2026-10-20T14:46:09.706Z · Stopped playing at first dawn; no further gameplay inputs** — I stop here at the first dawn. The wall was crossed, yet Tamar says we sent them off, and Kian says I rang for shadows. I can accept different accounts, but I still cannot judge the grain loss. Mara being sleepy is the first person detail that makes me want a follow-up. On this phone the fixed On to dusk button sits over the bottom of Tamar’s attribution, and the morning talks are below the visible area. I have had enough for this break; I would not start another night now.

- **+220 s · 2026-10-20T14:46:09.814Z · Changed viewport once to 1280x800 after stop** — One desktop look after stopping: the whole dawn report, all three people’s replies, Before they sleep and the talk controls fit together. The phone hid that this morning had more to do.

- **+228 s · 2026-10-20T14:46:17.999Z · Closed controlled browser after single desktop look** — Correction to my immediate desktop note: the screenshot fits the full dawn account and reveals Before they sleep plus Tamar’s talk controls. It does not fit all three people’s talk controls; Kian’s controls and Mara remain below the bottom. I took no desktop gameplay inputs.

## What stayed with me

**Best moment:** “Tamar drove a wolf off the gate road” at +162 s. It made the steady guard at the threatened post feel like a useful decision. His reply to the bell was also immediate and personal. See `18-bell.png` and `23-wolf-driven.png`.

**Worst moment:** I returned the light after seeing movement, and immediately read “Grain is gone: something got over the gate.” The lantern still said “on its way.” I could not tell what I should have done sooner or what Tamar had done before that. This is uncertainty about the encounter, not proof that there was no defence rule. See `17-gate-movement.png`.

**Restlessness:** by +176 s I wanted the morning rather than another quiet lantern stretch, so I chose Fast. At +220 s the dawn screen was enough for my break. I did not continue to dusk merely to complete the test.

## Clarity failures and limits of the evidence

| Item                                                  | What I saw                                                                                                                                                                                                                                                                                                                                                                                                                              | Evidence                                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| DL-2 — later failure after the checkpoint pass        | Tapping Kian in the setup scene opened his order sheet. Tapping Tamar on the live wall did not open anything. I expected the same person-selection behaviour and could not find a direct way to warn him. This does not prove no other control exists.                                                                                                                                                                                  | +35 s, `09-scene-kian.png`; +131 s, `20-tamar-night.png`                           |
| DL-22 — FAIL                                          | The initial setup shows Tamar and Kian but puts Mara and the lantern setup below the visible panel. At dawn the fixed “On to dusk” stays visible while “Before they sleep” and its responses are below the viewport. The phone does not show me the immediate morning alternatives.                                                                                                                                                     | `04-assignment.png`, `27-stop-phone.png`; desktop comparison `28-desktop-once.png` |
| DL-30 — FAIL, limited to observed overlap             | At dawn Tamar’s complete sentence, “They came at the Gate. We sent them off.” reaches the panel bottom; its small speaker attribution is partly obscured at the fixed footer. Opening “Watchers and bell” also pushes the lower bell area partly below the viewport. I did not find a sentence visibly cut midway or a “Scroll ↓” marker. I did not test successful panel scrolling, so I cannot claim these contents are inaccessible. | `21-watchers-bell.png`, `26-dawn.png`, `27-stop-phone.png`                         |
| DL-31 — FAIL for reading goal progress while ordering | Tamar’s sheet keeps his name, current post, first-night/Dusk label and scene visible. It does not show the overall “every soul and granary to the thaw” goal or an intelligible remaining-stock read. I could name the person and current night; I could not state progress toward the thaw from this screen.                                                                                                                           | `06-order-sheet.png`                                                               |
| DL-33 — FAIL for the placement interaction reached    | I tap a person, then get “How hard do you press Tamar?” with Ask/Urge/Insist and a post list. I place him through that sheet rather than directly on the post. At night, tapping him does not produce a direct warning. Moving the lantern and pulling the bell do work through single controls. No claim about untested dialogue.                                                                                                      | `06-order-sheet.png`, `20-tamar-night.png`                                         |

Other uncertainties are not established failures:

- “likely, maybe” on the asking sheet did not give me a useful sense of confidence. I still understood Ask and the post choice. I did not test Urge, Insist or their help.
- The bell's rope changed from sound to fraying after one pull. “Every pull wears the rope; a snapped rope leaves it silent” was available through help, which I read later. I cannot claim the information was absent before the pull.
- “The wall was crossed,” Tamar’s “We sent them off,” and Kian’s complaint about shadows left me uncertain about the total result. Different witnesses can have different experiences. I do not label that contradiction a simulation defect.
- The granary drawing was too small for me to judge remaining stock. Tapping it produced no visible detail. I did not interpret it as an exact count.
- My +30 s scroll attempt used a mouse wheel at the header. It did not establish whether a normal swipe within the panel works. Do not treat it as evidence of broken scrolling.

## English, time, layout and hands on

| Item                     | Result and evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-20 English            | PASS for reached play. “Tap a watcher, then a post,” Ask, Gate, Mill wall, lantern, bell and dawn account are understandable English. No necessary untranslated setting term encountered.                                                                                                                                                                                                                                                                                                                                                      |
| DL-21 Dates              | NOT TESTED for comparing a deadline against today or returning across dates. “The first night of the first winter · Dusk/Night/Midnight/The small hours/Dawn” reads in English. “To the thaw” gives a purpose but I did not meet a dated deadline I could compare.                                                                                                                                                                                                                                                                             |
| DL-22 Phone response     | FAIL as above. Normal live lantern and bell controls fit without scrolling (`12-live-watch.png`); setup and morning alternatives do not.                                                                                                                                                                                                                                                                                                                                                                                                       |
| DL-30 Cut-off text       | FAIL for footer overlap described above. No demonstrated mid-sentence clipping. Longer offscreen contents were not tested by a valid panel swipe.                                                                                                                                                                                                                                                                                                                                                                                              |
| DL-31 State while acting | FAIL for goal-progress visibility, with person/current night and scene preserved in the order sheet. No answer sheet used.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| DL-32 Waiting            | No demonstrated stretch where watching was literally my only option. Lantern and bell controls remained available. I wanted a direct warning at +131 s and found no response to the person tap; I then read help and watched. The longest explicit no-input wait was about 22 s between the +182 s granary tap and +204 s dawn observation, at my chosen Fast speed. That was chosen waiting. I became restless at +176 s, but that alone does not prove a >20 s absence of a meaningful available act. Builder availability check NOT TESTED. |
| DL-33 Acting on things   | Placement opened the asking sheet; direct person interaction during night was not found. Lantern and bell were direct single-control acts. Morning talk interaction NOT TESTED.                                                                                                                                                                                                                                                                                                                                                                |

Additional observed evidence: the lantern acknowledged travel (“on its way”) instead of instant arrival (DL-13). The bell answered with “Holding!” and briefly “Bell swinging”; I did not retry during that unavailable state (DL-4 follow-up NOT TESTED). Speed was visible. I saw Watch change from 4 to 1.5 min/s during the gate encounter, then return to 4; I did not complete a live-choice test from Fast, so the full DL-15 condition is NOT TESTED. Dawn said “Clock stopped,” summarized the night and offered “On to dusk,” making that session boundary clear (DL-12). Mara described tiredness in her own words (DL-17).

DL-23 hit-area measurements, DL-25 320 px/200% text/both-theme checks, DL-27 reload/resume, DL-28 sending, DL-29 replay, and all builder-only checks: NOT TESTED. I did not open Game menu or inspect an export.

## Stop and return

I stopped at the first dawn, +220 s from load. I knew the wall had been crossed and Tamar had driven wolves away. I did not know how much of the survival goal remained. I would not return voluntarily on this phone in its current layout: the first night had a useful placement payoff, but I wanted more legible consequences and the morning choices where my thumb could find them. The one desktop look made “Before they sleep” and Tamar’s first talk controls visible; it did not fit all talk controls. I did not resume play after stopping.

## Changes I would want, ranked

1. Put the morning conversations and their sleep cost in view before the large “On to dusk” control draws me away.
2. Give me a readable grain condition alongside the wall and when I order someone. I want to know what losing grain means for getting to the thaw.
3. Let me tap a watcher during the night and give a brief warning or get a clear account of what they are doing. I want to do more than sweep the light and wait.
