# A Dark Room — Marta — access-limited playtest

Marta, 33, hospital pharmacist. I play Cookie Clicker, Kittens Game and Melvor Idle. I like watching something I built grow and unlocking the next thing. I dislike waiting with nothing to decide. This was an eight-minute lunch break on a work laptop.

URL: https://adarkroom.doublespeakgames.com/

Device: desktop Chromium, 1280×800 CSS px, mouse/keyboard controls, light mode, default text size. Access: Playwright in one persistent local Node process, one browser context and page, controlled over 127.0.0.1:43309. No visible build identifier was seen. I used screenshots and rendered text, with visible-label clicks. No source, bundles, network payloads or debug APIs were inspected. No run was sent, no telemetry submission control was used, and no consent setting was changed. I chose the in-game disable-audio option for the work setting.

The first actionable screen appeared at 2026-10-20T16:06:45.334Z. The budget was eight real minutes, a ceiling. I stopped at 136.785 s because the prescribed text-click access failed, before meaningful gameplay. Time ran at the offered speed. I did not use hyper, a speed control, or a clock override. The sound prompt was visible by 29.759 s; I cannot establish its exact appearance time or whether it caused the first timeout.

## First minute

Recorded at **86.371 real seconds**, 26.371 s late. The last screen observation before 60 s was at 57.672 s. No gameplay input occurred after the second attempt at 48.784 s. Tool delays and a failed checkpoint-writing command delayed this record. These are the original checkpoint answers; no later gameplay informed them.

| Item | Original checkpoint answer                                                                                                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-1 | PASS — I want to warm the freezing room. The opening says the fire is dead and the room is freezing.                                                                                                      |
| DL-2 | PASS — light fire has a clear rectangular border. The sound choices also have borders. Footer links look clickable. I did not try inert text; neither fire attempt completed through the text locator.    |
| DL-3 | PASS — light fire draws me first; the freezing-room lines explain the immediate need. A Dark Room is underlined. No gameplay selection was reached. The sound prompt temporarily took priority.           |
| DL-4 | NOT TESTED — no gameplay limit encountered. A modal interrupted access, and text-locator timeouts do not establish a game rule.                                                                           |
| DL-5 | PASS — the fire is dead and the room is freezing; lighting the fire is the visible response. I have not observed it underway.                                                                             |
| DL-6 | PASS — light fire was available on the first screen at 0 s, before a long passage. First attempted input time is in the diary; neither attempt completed. The audio preference was not a gameplay choice. |
| DL-7 | NOT TESTED — zero completed gameplay interactions. I learned how to dismiss the audio prompt, but no fire consequence was reached.                                                                        |

For DL-6, the first attempted gameplay input was **6.854 s**. The visible action was available at **0 s**; no gameplay input completed. This establishes an immediate offered act, not a tested choice between competing gameplay options. For DL-2, the pass covers the visible opening control and audio choices, not selection states in unreached play. DL-4's builder check and DL-7's unreached interactions are NOT TESTED.

Evidence: [opening](c1b-adr-old-shots/00-opening.png), [sound prompt](c1b-adr-old-shots/02-click-pending.png), [57.672 s screen](c1b-adr-old-shots/05-first-minute.png), [checkpoint screen](c1b-adr-old-shots/06-stopped.png).

## Verbatim diary

The following preserves the reactions as recorded. Error entries were written when I collected the failed command's result, not at the exact instant its timeout expired. Full timestamped records: [wall-clock.jsonl](c1b-adr-old-shots/wall-clock.jsonl).

- **0.000 s — 2026-10-20T16:06:45.334Z** (start)
  Input: open live page
  Reaction: “I am starting cold on my lunch break.”

- **6.854 s — 2026-10-20T16:06:52.188Z** (observation)
  Input: look at opening screen
  Visible answer / recorded error: the fire is dead. the room is freezing. Box around light fire.
  Reaction: “Light fire is clearly what I can press. I want to get the room warm and see what opens up.”

- **6.854 s — 2026-10-20T16:06:52.188Z** (input)
  Input: click light fire

- **29.759 s — 2026-10-20T16:07:15.093Z** (access-check)
  Input: inspect visible page while click is pending
  Reaction: “The click command has not returned yet; I cannot tell whether the fire was lit.”

- **41.335 s — 2026-10-20T16:07:26.669Z** (observation)
  Visible answer / recorded error: Sound Available! enable audio / disable audio
  Reaction: “A sound prompt is covering the room. I am at work, so I want silence.”

- **41.351 s — 2026-10-20T16:07:26.685Z** (input)
  Input: click disable audio
  Reaction: “I closed the sound prompt so I can get back to the fire.”

- **48.784 s — 2026-10-20T16:07:34.118Z** (access-error)
  Input: initial light fire click
  Visible answer / recorded error: TimeoutError: locator.click: Timeout 30000ms exceeded. waiting for getByText(light fire, exact true)
  Reaction: “The first scripted click failed; this is an access delay, not evidence that a normal fire click is ignored.”

- **48.784 s — 2026-10-20T16:07:34.118Z** (input)
  Input: click light fire after dismissing sound prompt

- **57.672 s — 2026-10-20T16:07:43.006Z** (observation)
  Input: look after audio dismissal
  Reaction: “The text locator failed again. I am checking the actual screen before deciding whether to stop.”

- **86.371 s — 2026-10-20T16:08:11.705Z** (checkpoint)
  Input: no gameplay input since 57.672 s; record checkpoint
  Reaction: “I know I want to light the fire, but I have spent this first minute on a sound prompt and two failed browser click commands.”
  Original checkpoint answers appear in First minute above.

- **136.785 s — 2026-10-20T16:09:02.119Z** (stop)
  Input: stop playtest without more gameplay inputs
  Visible answer / recorded error: light fire; the fire is dead.; the room is freezing.
  Reaction: “I am stopping because the prescribed browser text clicks failed twice. I still want to see what grows out of this room, but I cannot judge the game loop from this attempt.”
  Stop reason: Access failure; obeying the instruction not to repair the game or harness.

## Access errors

The first gameplay command was:

```javascript
await page.getByText('light fire', { exact: true }).click();
```

It returned:

```text
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByText('light fire', { exact: true })
```

After clicking disable audio through its visible label, I attempted:

```javascript
await page.getByText('light fire', { exact: true }).click({ timeout: 3000 });
```

It returned:

```text
TimeoutError: locator.click: Timeout 3000ms exceeded.
Call log:
  - waiting for getByText('light fire', { exact: true })
```

The final screenshot still shows “light fire”, “the fire is dead.” and “the room is freezing.” I did not inspect why the locator failed or alter the game or access harness to get around it. These failures do not establish a game clarity defect or ignored normal mouse clicks. A separate checkpoint-recording call returned “SyntaxError: Invalid or unexpected token”; a corrected recording call wrote the checkpoint at 86.371 s. That error did not involve a gameplay input.

## Best moment, worst moment, and leaving

Best: the opening immediately made me want to warm the room and find out what it could become. The two short sentences and one bordered action were enough.

Worst: at 29.759 s I was still waiting for the first browser command. At 57.672 s the second text click had also failed. I could not reach the part I came for. This is access frustration, not evidence that the game's pacing bored me.

I stopped on the unchanged opening room at 136.785 s. The budget did not expire. I stopped under the access-failure instruction, not because I had decided to quit the game. I would voluntarily try a working session; I have no evidence yet about whether its growth loop would bring me back.

## Clarity findings and remaining checks

No gameplay clarity failure is established by this attempt. The opening's purpose and main control were readable. The sound prompt temporarily occupied the middle of the room and interrupted my access attempt; [02-click-pending.png](c1b-adr-old-shots/02-click-pending.png) shows both choices. Its appearance is observed; its causal connection to the timeout is unknown.

| Item                            | Status and evidence                                                                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DL-20 English                   | PASS for reached screens: “light fire”, “the fire is dead.”, “the room is freezing.”, “enable audio”, “disable audio”. No necessary local term encountered. Later play NOT TESTED.        |
| DL-21 Dates                     | NOT TESTED — no date or deadline encountered.                                                                                                                                             |
| DL-22 Phone response visibility | NOT TESTED — assigned device was 1280×800 desktop; no phone fixture used.                                                                                                                 |
| DL-30 Clipping                  | PASS for observed desktop opening and audio prompt: no cut-off sentence or obscured essential text seen. Phone layout and later screens NOT TESTED.                                       |
| DL-31 State while acting        | NOT TESTED — no order or answer sheet with a goal, deadline and person was reached. The audio preference prompt is not that interaction.                                                  |
| DL-32 Hands on                  | NOT TESTED — no completed gameplay action, so no valid longest game-enforced waiting interval. The browser command waited up to 30 s; that is access latency. I wanted to light the fire. |
| DL-33 Scene acts                | NOT TESTED — I intended to light the fire with the single bordered action, but did not observe the act or a gameplay form.                                                                |
| DL-13 Feedback                  | NOT TESTED for gameplay — locator failure cannot establish that a received game input lacked feedback. The audio prompt did dismiss.                                                      |

Other checklist observations: DL-8 and DL-11 PASS only for the short, readable opening. DL-10, DL-12, DL-14–19, DL-23–29 and all builder checks NOT TESTED. DL-9 NOT TESTED: no time-critical obligation reached. DL-15's speed and live-choice test was not performed. No save/reload, export, replay or send test was performed. There is no export path.

## Changes I would want as Marta

No ranked game change is supported by this attempt. I need a working play session before I can say whether growth, decisions or waiting should change. My immediate wish was simply to light the fire and see a consequence.
