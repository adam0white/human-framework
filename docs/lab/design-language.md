# Lab design language: the clarity checklist

Adopted 2026-10-20 for every lab game (owner: "Opus taste, a consistent design language", [owner directions](../owner-directions-2026-10-18.md)). This file covers **clarity**: whether a new player knows what to do. The **look** (tokens, type, marks, voice) is the Field Notebook language in [../design-language.md](../design-language.md); this file does not repeat it.

Why it exists: on 2026-10-20 the owner played The Valley and could not tell what to do, what was clickable, which text mattered, why actions were limited or what came next, and Turkish dates hid the calendar. Each of those is a lab failure, not a Valley failure, so each becomes a check here.

**How to use it.** Every item has an id (`DL-n`) and a test a playtester can run without reading source. A game passes an item or files a fix for it. Playtest reports, the auto playtesters ([rubric](../../packages/playtester/README.md#clarity-rubric)) and the [source-unread prompt](playtester-prompt.md) all report failures by these ids. A game may break an item on purpose; it then says why in its own design doc.

## 1. The first minute

A cold player, with no tutorial skipped and no prior knowledge, can answer five questions within 60 seconds of the first playable screen.

- [ ] **DL-1 Goal.** The screen says what this session is for, in one plain sentence ("Feed the room until close", "Get everyone down before dark"). *Test:* after 60 s, the tester can state the goal in their own words.
- [ ] **DL-2 What can I touch.** Every control looks like a control: a button has a border or fill, and a link or tappable row has the accent or an underline. Body text and drawings never look tappable. *Test:* the tester lists everything tappable; nothing they list is inert, and nothing they missed is a control.
- [ ] **DL-3 What matters now.** At most one thing on screen asks for attention, in the one accent (`--rope`). *Test:* the tester names the one thing to look at first, and it is the thing the game meant.
- [ ] **DL-4 Why the limit.** When an action is unavailable, greyed out or capped, the screen says why in the fiction, next to the action ("Too tired to dig again today", "Only two hands free"). A limit never appears unexplained. *Test:* for each disabled or missing action the tester can say why.
- [ ] **DL-5 What next.** After any action, and after any quiet stretch, one line says what comes next or what to do now ("Next: the delivery at 10:00", "Pick who carries the rope"). *Test:* at any moment the tester can say what they are waiting for or what they should do.
- [ ] **DL-6 First verb fast.** The first meaningful choice comes within 30 seconds, before any long text. Story before the first choice is at most about 40 words. *Test:* time from first screen to first input that changes the game.
- [ ] **DL-7 Teach by doing.** New rules appear when they first matter, one at a time, attached to the thing they explain (progressive disclosure). No rules page is required reading. *Test:* the tester never needs the help page to make the first three choices.

## 2. Text hierarchy

- [ ] **DL-8 Three levels, no more.** (1) What to do now: largest, near the actions. (2) What just happened: the journal or log, normal size. (3) Flavour and background: soft ink (`--ink-soft`), smaller, skippable. *Test:* the tester can say, for any line, whether they must read it.
- [ ] **DL-9 The log is not the instructions.** Instructions never live only in a scrolling log. If a log line carries a task, it is also pinned as the "what next" line (DL-5).
- [ ] **DL-10 One name per thing.** A person, place, resource or verb keeps one name everywhere: button, log, help, end report. *Test:* the tester never asks whether two words mean the same thing.
- [ ] **DL-11 Short lines.** Sentences under about 20 words; a screen's must-read text fits in about 60 words on a phone.

## 3. Affordances and feedback

- [ ] **DL-12 Every verb answers.** Each input gets a visible answer within a second: the thing changes, a person replies, or a line says why nothing happened ([L4](lessons.md)). *Test:* the tester never taps twice to check whether the first tap worked.
- [ ] **DL-13 Selection is visible.** Whatever is selected or in progress stays marked until it ends.
- [ ] **DL-14 Before, not after.** What a choice will cost and risk is shown in plain words before the player commits ([L5](lessons.md)).
- [ ] **DL-15 Slow down, don't stop.** When a choice is waiting, the clock slows and the screen says so ([L6](lessons.md)). Pauses are for menus only.
- [ ] **DL-16 No dead problems.** The game never states a problem the player has no verb for ([L19](lessons.md)).

## 4. Show, don't count

- [ ] **DL-17 Feelings are drawn or said, not numbered.** A person's tiredness, mood or trust appears as a drawing, a posture or their own words; never a bar or a percentage ([visual language](../design-language.md#marks)).
- [ ] **DL-18 Numbers only where the fiction counts.** Money, time on a clock, loaves on a shelf: fine. A number that the character could not know: not fine.
- [ ] **DL-19 Approximate, but readable.** "Most of the water is gone" is enough to decide by. If players keep guessing wrong, the wording is too vague, not too honest.

## 5. Language

- [ ] **DL-20 English for the load-bearing words.** Dates, times, days of the week, units, button labels, goals and key terms are in English ("Tuesday 14 May", "Harvest", "Rest"). *Test:* the tester never needs a translation to act.
- [ ] **DL-21 Local flavour as seasoning.** Names, greetings, food, place names and the odd word may be in the setting's language (Turkish in The Valley is welcome). A non-English word that the player must understand to act appears with its English meaning the first time, or is replaced by the English.
- [ ] **DL-22 Dates read at a glance.** Day of week plus day number, or "Day 3 of 12"; the calendar the player must plan by is the Gregorian one, in English, even when the fiction keeps another calendar alongside.

## 6. Phone layout

The device facts and thumb zone are in the [visual language](../design-language.md#layout) and [L9](lessons.md).

- [ ] **DL-23 Actions above the fold.** At 360×690 visible CSS px, the current actions and the "what next" line are visible without scrolling.
- [ ] **DL-24 Targets 44 px or more.** Every tap target is at least 44×44 CSS px with room between targets.
- [ ] **DL-25 One sheet at a time.** Drawers and sheets never stack; closing one returns to the scene.
- [ ] **DL-26 No horizontal scroll** on the page, and text is never smaller than 15 px.

## 7. Notebook, save and export

- [ ] **DL-27 Same place everywhere.** Each game has one "Notebook" entry (a menu item or the footer) holding: save and resume, download the playtest export, and "Send this run to the notebook" (the lab client dialog).
- [ ] **DL-28 Resume is obvious.** A returning player sees "Continue" first, with where they left off in one line ([L8](lessons.md)).
- [ ] **DL-29 Sending never fails silently.** If a run cannot be sent (too large, offline, notebook full), the dialog says why in one sentence and says the downloaded export still has everything. A game whose state replays from seed and inputs passes a `compact` function to the dialog, so long runs still send (lab client 0.1.2).
- [ ] **DL-30 Export replays.** The export holds seed, input log and state, and replays the run (AGENTS.md).

## How failures are reported

A playtest report lists each failed item as `DL-n: what the tester saw, in their words`, and the ranked fixes go to the [feedback ledger](feedback-ledger.md) as `fix:<game> DL-n <what>`. The first-minute items DL-1 to DL-7 are reported for every game in every round; the rest when the tester meets them.
