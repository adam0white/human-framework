# Lab design language: the clarity checklist

Adopted 2026-10-20 for every lab game (owner: "Opus taste, a consistent design language", [owner directions](../owner-directions-2026-10-18.md)). Revised the same day after a Codex adversarial review.

**Who owns what.** The [visual language](../design-language.md) owns tokens, type and drawing. This file owns observable clarity tests. [Lessons](lessons.md) keep the feedback and the reasons. Where a lesson reads stronger than an item here, the item's test governs.

**Why it exists.** The coordinator's paraphrase of the owner's 2026-10-20 Valley report: no idea what to do, what is clickable, which text matters, why actions are limited or what comes next; dates and key terms must stay English; the run upload was refused after a little play (verbatim in [ledger](feedback-ledger.md) F-201..F-203). Each is checked here across the whole lab. It is not a claim that every game has every Valley defect.

**What it is not.** Not a demand for tutorials, a task manager or a single best move. Discovery, mystery, natural difficulty and uncertain outcomes stay. Clarity means the player can read the situation and their responses, not that the game plays itself.

## How to use it

- Each item gets one status per tested build: `pass`, `fail`, `not tested` or `exception` (the game's design doc says why). Record the screen, the inputs and the build. A filed fix stays `fail` until retested.
- Test only what you met in play. Nothing unmet counts as a pass or a fail.
- **Player test** lines are run by a cold, source-unread tester ([prompt](playtester-prompt.md)). **Builder check** lines need the code or the export and are run by the game's developer or reviewer; a source-unread tester marks them `not tested`.
- Automated playtesters ([rubric](../../packages/playtester/README.md#clarity-rubric)) report only the signals they measure and mark the rest unmeasured. An adapter that lists actions cannot prove those actions were visible.
- Ranked fixes go to the [feedback ledger](feedback-ledger.md) as `fix:<game> DL-n <what>`. DL-1 to DL-7 are reported for every game in every round.
- Numbers below (20 s, 30 s, 40 words, 60 words, 44 px, 360×690) are lab defaults. They serve comprehension and never override it.

## 1. The first minute

The 60-second clock starts at the first screen where the player can act.

- [ ] **DL-1 A reason to act.** The opening conveys the character's situation or purpose. The larger story and optional goals may stay undiscovered. *Player test:* at 60 s the tester can describe, in their own words, a reason to act now.
- [ ] **DL-2 What can I touch.** Controls look like controls. Interactive people, objects and map regions share one visible cue and a visible selected state. Decorative text and drawings do not imply interaction. *Player test:* before tapping, name what looks interactive, then try it. Record what turned out inert and any control found later by accident.
- [ ] **DL-3 What is urgent, what is selected.** Placement, labels and marks distinguish urgency, selection and available controls, not colour alone. Several things may matter at once. *Player test:* name what the screen draws you to first and any competing cues; say what is urgent and what is selected.
- [ ] **DL-4 Why the limit, and how it changes.** A visible but unavailable action shows the known circumstance or capability that prevents it and how that may change ("Too tired to dig; rest tonight"). When the condition changes, the action and its reason update. *Player test:* for each unavailable action met, say what prevents it and what would free it, if the character would know. *Builder check:* every limit comes from a capability or circumstance that recovers or changes; an arbitrary daily quota is recorded as an exception (AGENTS.md: limits from capabilities, not caps).
- [ ] **DL-5 The situation is readable.** The player can see what is underway, what is waiting and which responses exist. The player chooses what to pursue. An explicit "next" prompt is used only where play would otherwise be unclear, not after every action. *Player test:* at any moment the tester can name an available response or say what is underway, without being told the best move.
- [ ] **DL-6 A choice soon.** A meaningful choice is available within 30 s of the first usable screen, with at most about 40 mandatory story words before it, counted across every intervening screen. *Player test:* record when the first choice became available and, separately, when the tester first acted.
- [ ] **DL-7 Learn by doing.** A new interaction is understandable when it becomes relevant, preferably through an ordinary action and its consequence. Short contextual help is added only where testing finds confusion. *Player test:* ask what the first choices meant, not only whether the tester made them.

## 2. Text and status

- [ ] **DL-8 Priority without discarding story.** Immediate interactions and known urgency have clear visual priority; consequences stay readable; context stays discoverable. A story clue is never styled as disposable decoration. *Player test:* the tester can tell what needs a response now, without being told which details will matter later.
- [ ] **DL-9 Obligations outside the log.** A required interaction or known time-critical obligation can be found outside an easily missed log line, and its status can be checked on request. Not every thread is pinned.
- [ ] **DL-10 Stable labels.** Action-critical labels keep one name across buttons, log, help and end report. Aliases and setting terms are introduced clearly; dialogue may speak naturally if the referent stays recognisable. *Player test:* ask whether two labels met name the same thing; record any unresolved confusion.
- [ ] **DL-11 Short where it counts.** Aim for at most about 60 essential words per immediate decision, labels, reasons and costs included. Longer context stays available on request. Use the shortest sentence that keeps the needed distinction; never cut an explanation just to meet the count. *Builder check:* the rendered layout fits, separately from the word count.
- [ ] **DL-12 Session boundaries are clear.** At the end of a day, chapter or game the tester can tell whether play has ended, what resolved and whether it continues. Waiting at top speed is never the only way to find out that a game is over.

## 3. Feedback and time

- [ ] **DL-13 Inputs are acknowledged.** An accepted input is acknowledged promptly: selected, sent, queued, underway or refused. The game never claims execution before it happens. A delayed answer arrives on the game clock and stays traceable to the request ([L4](lessons.md)). *Player test:* when unsure whether a tap worked, does a repeat cause a duplicate or an unexplained result?
- [ ] **DL-14 Known costs before committing.** Before a consequential choice, show the costs and risks the character knows or can foresee, as estimates where they are not counted. Hidden consequences may stay hidden ([L5](lessons.md), within the character's knowledge).
- [ ] **DL-15 Time is visible; slowdown, not pause.** The screen shows whether time is moving and at what speed. Play stays continuous. A pending consequential choice (an event demanding a response, not any available action) slows time enough to read and answer it; the chosen speed returns when it resolves. Opening an inspection sheet is not a free pause; system menus and a closed page may stop time ([L6](lessons.md)). *Player test:* from fast speed, meet a live choice, inspect it and answer; record real time used and whether the chance was still open. In a quiet stretch, find how to wait or change speed. A harness that freezes between commands cannot test this.
- [ ] **DL-16 Tasks have responses.** A problem presented as the player's task has a response, or makes its prerequisite clear. A response may mitigate, investigate, wait or accept a loss. Background hardship and other people's troubles may stay outside the player's control, as long as no missing control is implied ([L19](lessons.md)).

## 4. Show, don't count

- [ ] **DL-17 Feelings are drawn or said.** A person's tiredness, mood or trust appears as a drawing, a posture or their own words, never a bar or a percentage ([visual language](../design-language.md#marks)).
- [ ] **DL-18 Numbers only where the fiction counts.** Money, a clock, loaves on a shelf: fine, if the character has counted them. A number the character could not know, or has not observed: not fine.
- [ ] **DL-19 Cues mean what they seem.** *Player test:* before a consequential choice, ask what the tester thinks the cue means; afterwards, separate a misleading cue from incomplete knowledge, an uncertain outcome or a risk knowingly taken. Fix misleading cues. A wrong prediction alone is not a clarity failure.

## 5. Language

- [ ] **DL-20 English for what you act on.** Action-critical labels, units, goals and dates are understandable in English. Names, greetings, food, places and the odd word may be in the setting's language (Turkish flavour in The Valley is welcome). A setting term needed for play (kahya, kile, usta) shows a plain English meaning nearby on first use and on request.
- [ ] **DL-21 Dates read at a glance.** Use an English date ("Tuesday 14 May") or a clearly defined relative day or season ("Day 3 of the harvest"), with enough context to tell deadlines apart across months or years. Another calendar may run alongside where the fiction wants it. *Player test:* compare a deadline with today and describe the relevant unit without translation, on first play and after returning from a break.

## 6. Phone layout

The device facts and thumb zone are in the [visual language](../design-language.md#layout). 360×690 CSS px is the lab's content-viewport fixture (an estimate of a Galaxy S26 in Chrome, not a guarantee about any phone).

- [ ] **DL-22 The response is on screen.** At default text size in the 360×690 fixture, the immediate gameplay response and its essential context are visible without scrolling. Frequent actions sit within thumb reach where practical; further actions sit behind a labelled control. Readable text and non-overlapping targets come before bottom-40% placement. Long sheets may scroll; their actions stay reachable with the keyboard open. *Builder check:* test safe areas, long labels and two people on screen.
- [ ] **DL-23 Targets.** Standalone controls have non-overlapping hit areas of at least 44×44 CSS px (the house target; WCAG AA's minimum is 24). Dense scene selection uses zoom, a disambiguation list or a labelled action.
- [ ] **DL-24 One sheet at a time, with a way back.** Sheets never stack. A sheet that opens another task remembers its origin: cancel returns there, closing the outer sheet returns to the scene, and focus returns to the control that opened it.
- [ ] **DL-25 Reflow.** No horizontal page scroll. The 17 px phone base holds; secondary text stays readable in both themes; content and controls survive 200% text size and 320 CSS px width.
- [ ] **DL-30 Nothing is cut off.** Action-critical text (a remedy, a reason, a cost, a label, a person's words) is never clipped, ellipsised, hidden under another element or pushed behind a "Scroll ↓" inside a fixed-height panel. The panel grows to fit the essential sentence, or the copy gets shorter; the box never decides. Longer context may sit behind a labelled control. *Player test:* record any sentence cut mid-way, any text under another element and any panel you had to scroll to find the response. *Builder check:* run `npm run lab:phone` (HF repo) at 360×690 on each main screen and each opened sheet; it reports clipped text, overlapping targets, targets under 44 px and horizontal scroll. No `text-overflow: ellipsis`, `line-clamp` or fixed height on action-critical text; a sheet's actions sit in a commit row that stays visible while its body scrolls.
- [ ] **DL-31 Read the state while acting.** While a sheet is open to give an order or an answer, the state that decision depends on (the goal's progress, the deadline, the person concerned) stays readable, and the part of the scene it concerns stays visible. Lab kit pattern (0.2.0, `lk-stage`): the scene fills the screen; a state strip stays readable when collapsed (chips wrap, never truncate); one bottom sheet with peek, half and full heights never covers the strip, and the scene keeps the selected subject in its visible part. *Player test:* with an order or answer sheet open, say the goal's progress and the deadline from what is on screen.

Origin: the 2026-10-20 design round. Each fix removed its target quit reason, and the next testers left over panel space: "reading clipped safety answers" (Warren, F-275); roof, meals and the storm deadline unreadable on the phone while ordering (Well, F-273).

## 7. Game menu, save, download and send

Names: **Game menu** for save and run controls, **Download this run** for the local export, **Send this run to the notebook** for the private upload (the lab client's label; the notebook is the lab's private store), **All games** for the collection link. A game's own menu is never called "Notebook".

- [ ] **DL-26 One discoverable game menu.** Save and run controls live in one consistently labelled place, expressed in the game's fiction and reachable without scrolling. The All games link is a separate destination.
- [ ] **DL-27 Resume is honest.** The title screen offers Continue only when a valid save exists, with one line saying where it left off ([L8](lessons.md)). Closing the page and resuming does not advance simulated time. *Player test:* reload and resume; nothing lost, nothing done twice.
- [ ] **DL-28 Sending works for ordinary play.** Success shows a reference. Failure (offline, notebook full, too long) says why in one sentence, keeps the note, offers the next step and leaves Download this run working; retry works when the cause clears. No unlimited length is promised. *Player test (only in a session authorized to send):* send after a short session and after a representative long one. *Builder check:* upload bounds are tested against representative exports; a game whose state replays from seed and inputs passes `compact` to the send dialog (lab client 0.1.2) and tests that the compacted run replays; the dialog says what was left out before the player sends.
- [ ] **DL-29 Export replays.** *Builder check:* the export holds seed, input log and state and replays the run exactly (AGENTS.md). *Player test:* only where the game offers a player-facing replay or import; otherwise `not tested`.

## 8. Hands on (agency density)

The same round's other quits were about doing. "I came for running a busy room and mostly watched it run" (Pass, F-276). "There is no chopping or serving action to perform while it cooks" (Pass, F-277). "Say something else…" opened "a form with Mention, Urge, Insist and Reason. I expected another way to speak to him" (Voice, F-271).

A **hands-on act** is something the player's character does to a person or a thing in the scene, in the fiction (turn the meat, call the plate, speak a line, shut the door), with a consequence the player can see or hear soon. Choosing from a form, confirming a preview, setting a timer length and waiting are not hands-on acts. Agency density is how often one is available.

- [ ] **DL-32 Something for your hands.** While the player is attending at the default speed, a meaningful hands-on act is available at least every 20 s of real time. Watching is fine when the player chooses it; the speed control or "let time pass" is then the act. A stretch where the only option is to wait fails, unless the game's design doc names it as deliberate (the held breath before a raid). The act need not be urgent or optimal, and people in the scene may refuse it. *Player test:* note the longest stretch where you wanted to do something and could only watch, and what you wanted to do. *Builder check:* in a scripted or headless run of the first five minutes at default speed, report the longest attended gap with no hands-on act available.
- [ ] **DL-33 Acts happen in the scene, not in forms.** The core verb (cook, speak, dig, send) is done on the scene's people and objects, or in the character's own voice, in one act. A form (a list of actions, a strength, a reason, then Confirm) is for planning ahead and fine control; it is never the only way to do the core verb. Preview-then-confirm stays for consequential or irreversible choices (DL-14). *Player test:* when you wanted to do the obvious thing, did you do it on the thing itself, or did a form open?

Boundaries: acts run on the game clock with DL-15 slowdown, never as reflex timing, combos or scores (AGENTS.md: no action-game polish). A hands-on act draws on a capability that tires and recovers, said in words (DL-4, DL-17). Prayer, fasting and other quiet faith are never offered as filler acts. Each game records how it meets DL-32 and DL-33 in its design doc, as an owner-vetoable design change.

## Boundaries

- **Faith stays quiet.** Clarity applies to the player's available responses, not to every private motive. Quiet religious life never needs an objective, alert, countdown, tutorial or score. "She will be back shortly" is enough when someone steps away to pray. A person's undisclosed motive may stay undisclosed.
- **Approximate reads stay approximate** (AGENTS.md game direction). No item here asks for true numbers, exact odds or an omniscient progress bar.
