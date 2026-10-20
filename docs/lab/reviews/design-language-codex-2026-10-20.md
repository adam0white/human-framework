# Adversarial review: lab design language

2026-10-20. Read-only review; this report is the only file written by this reviewer. Reviewed the five requested sources and the linked testing/client material. HEAD when review began: `f11e35d1fa2b69ba57895758f862af95c1222958`. Other agents were changing testing and client files during the review. References below describe observed text, not a frozen release or a live-game audit.

**Verdict: revise before treating this as a lab acceptance checklist.** It can reward a game that tells the player every next move, explains arbitrary quotas, and politely refuses ordinary uploads. It can penalize an uncertain outcome, an unsolvable hardship, or a player who takes time to think. Those are the wrong incentives.

Two blockers concern the checklist's acceptance claims. The remaining findings are **should** fixes or **nits**. “Blocker” means a blocker to using this document as acceptance evidence, not a claim that an existing game cannot ship. The game-direction bullet calls its directions ambitions, and the checklist permits documented exceptions; neither qualification makes contradictory defaults useful.

## Blockers

### B1 — The advertised source-unread acceptance contract cannot be fulfilled

**Evidence:** `docs/lab/design-language.md:7,14–16,61–66`.

DL-2 asks the tester to prove that no control was missed. DL-3 asks whether their answer matches what “the game meant.” DL-4 asks about missing actions. DL-29 asks whether a callback was supplied. None is knowable from ordinary play. DL-30 supplies no player-facing replay procedure. The reporting rule then records encountered failures, allowing untested conditions to vanish. Filing a fix is not a pass.

**Replace the usage/reporting contract:**

> Each item records `pass`, `fail`, `not tested`, or `documented exception`, with the screen, input sequence and build tested. A filed fix remains failed until retested. Test only encountered controls and states. Put checks requiring implementation knowledge in a separate builder review. A checklist pass does not establish owner acceptance.

**Replace the affected tests:**

| Item | Observable replacement |
|---|---|
| DL-2 | Before tapping, name what appears interactive. Try those things. Record inert-looking controls discovered later and apparently interactive things that do nothing. Do not claim exhaustive coverage. |
| DL-3 | Name the first event or choice the presentation draws you toward. Record competing cues; do not infer author intent. |
| DL-4 | For each visibly unavailable action encountered, say what prevents it and what would make it available, if the character knows. Undiscovered actions are outside this test. |
| DL-29 | Test a short run, a representative long run, offline failure and recovery. Report the visible receipt or failure and whether download works. |
| DL-30 | Export a run. Use the supplied player-facing replay/import route. Compare the ending and selected visible events. If no route exists, mark player verification untested; a separate builder test must establish exact replay. |

Merely downloading JSON does not prove replay. A screenshot cannot establish that a displayed estimate comes from perceived rather than hidden state. Exact target/font measurements also need a measurement method; a text harness cannot establish visual hierarchy, hit areas, wrapping or clipping. Keep these evidence boundaries explicit.

The newly linked source-unread prompt also prohibits sending runs or changing consent (`docs/lab/playtester-prompt.md:32`). Its tester cannot execute DL-29's happy-path test. **Add:** “Upload tests belong to a separately authorized integration session. A source-unread playtester who is instructed not to send reports that condition as not tested.” Do not silently relax that tester's boundaries to improve coverage.

### B2 — DL-29 can pass the owner's upload failure unchanged

**Evidence:** `docs/lab/design-language.md:61`; `docs/owner-directions-2026-10-18.md:55`; `packages/lab-client/src/limits.ts:2–8`; `packages/lab-client/src/util.ts:33–46`.

The owner reported rejection after a little play. The proposed criterion mostly asks for a nicer rejection. Saying that a download “still has everything” neither uploads the feedback nor gives the owner a working recovery path. Requiring a `compact` callback and claiming “long runs still send” is also false as a guarantee: the replacement can exceed the same bounds. Gzip size is only one bound; bytes after decompression and structural complexity matter too.

**Replace DL-29:**

> Sending has a clear outcome and works for ordinary play. Send an exported run after a short session and after a representative long session. Success shows a receipt reference. Failure preserves the run and note, explains the next available action and provides a working Download control. Restore connectivity and retry. Verify that any compact upload reproduces the run. Record the session length, build and outcome; do not promise unlimited run lengths.

**Builder note, outside the player checklist:**

> Check all upload bounds against representative exports. If replay permits a compact representation, test its replay equivalence and both transport and allocation limits. Describe what is omitted before the player consents. Reference the client version actually released and adopted.

The manifest changed from `0.1.1` to `0.1.2` during review, and the dialog acquired a compaction option. Those are local implementation changes, not proof of a release or consumer adoption. Verify the dependency before treating the checklist's `0.1.2` reference as delivered. The finding is about the checklist's unsupported success guarantee, not a claim that the concurrent client lacks a compactor.

## Should fix

### S1 — Known information must bound every disclosure rule

**Evidence:** DL-14 (`docs/lab/design-language.md:32`), DL-18–19 (`:39–40`), L5 (`docs/lab/lessons.md:21–22`); `AGENTS.md:11`.

“What a choice will cost and risk” lacks a knowledge boundary. “If players keep guessing wrong, the wording is too vague” mistakes uncertain outcomes for bad wording. L5's “show the numbers” and “how near the goal is” can turn estimates into omniscient progress readouts. DL-18 helps, but conflicting instructions should not require a builder to choose which wins. Even a number the character *could* know is not necessarily something they have observed or counted.

**Replace DL-14:**

> Before commitment, show costs and risks the character knows or can reasonably foresee. Use estimates and distinguish uncertainty from counted facts. Hidden consequences may remain hidden.

**Replace DL-19:**

> Before a consequential choice, ask what the tester thinks the cue means. Afterwards, distinguish misunderstanding from incomplete knowledge, uncertain outcomes and a knowingly accepted risk. Fix misleading cues; a wrong prediction alone is not a clarity failure.

**Replace L5 heading and opening:**

> Show the information a decision needs, within the character's knowledge. State known costs, deadlines and progress in plain words. Use approximate readings for uncounted resources and bodily capability. Do not turn fatigue, ammunition or injury into exact counters just because they affect a decision.

### S2 — “What next” becomes a permanent strategy instruction

**Evidence:** DL-1, DL-5, DL-8–9 (`docs/lab/design-language.md:13,17,23–24`); owner directions `:15–19,27`.

A mandatory next-step line after *every* action, with the largest text devoted to “what to do now,” makes discovery play fail by design. Pinning every logged task also breaks down when several obligations coexist. The owner asked for progressive goals and allowed hands-on tutorials. They did not require a task manager to choose the player's strategy.

**Replace DL-5:**

> Make the current situation readable: what is underway, what is waiting and which responses are available. The player chooses what to pursue. Use an explicit next-step prompt when interaction is otherwise unclear, not after every action.

**Test:**

> The tester can identify an available response or explain what is underway without being told the best move.

**Replace DL-1's prescription:**

> The opening conveys the character's immediate situation or purpose. The tester can describe a reason to act; the larger story and optional goals may remain undiscovered.

**Replace DL-9:**

> A required interaction or known time-critical obligation is discoverable outside an easily missed log entry. Keep its status available on request. Do not pin every thread as an instruction.

### S3 — The limit rule accepts arbitrary caps with plausible prose

**Evidence:** DL-4 (`docs/lab/design-language.md:16`); `AGENTS.md:11`; Valley complaint in owner directions `:55`.

“Too tired to dig again today” can explain an arbitrary daily counter. It says nothing about recovery, changed capability or when trying again makes sense. Midnight refills can pass this checklist while violating the capability direction. Explaining why a control is disabled is only half the Valley failure.

**Replace DL-4:**

> For a visible unavailable action, show the known circumstance or capability that prevents it, and how it may change. When the condition changes, update the action and explanation. Do not imply a daily quota unless the game deliberately has one.

**Separate builder check:**

> Identify what creates each limit and how it recovers or changes. Record arbitrary caps as deliberate exceptions. The player test verifies the explanation and observed changes; it cannot prove the underlying model.

### S4 — “No dead problems” erases uncontrollable life

**Evidence:** DL-16 (`docs/lab/design-language.md:34`), L19 (`docs/lab/lessons.md:77–78`), natural difficulty in owner directions `:22,31`.

“Never states a problem” and “either give the verb, or do not name the problem” prohibit background hardship, irreversible loss and another person's troubles. A drought need not have a Solve drought button. The failure is implying a player task while providing no meaningful response, not allowing the world to resist the player.

**Replace both rules:**

> A problem presented as a current player task has an available response, or makes its prerequisite clear. A response may mitigate, investigate, wait or accept a loss. Background hardship and irreversible consequences may remain outside the player's control; do not imply a missing control.

### S5 — One attention target contradicts the shared accent and simultaneous stakes

**Evidence:** DL-2–3 (`docs/lab/design-language.md:14–15`), DL-13 (`:31`); visual tokens (`docs/design-language.md:16,20`).

The same accent marks actions, selection and the player's voice. DL-3 then permits at most one attention-demanding thing in that accent. A selected person, two available actions and an urgent knock cannot all follow that prescription literally. More seriously, forcing one priority can suppress the competing demands that make continuous-time play interesting.

**Replace DL-3 and clarify the token rule:**

> Distinguish urgency, selection and available controls through placement, labels and marks. Several events may matter at once. The tester can tell what is urgent and what is selected without color alone. Use the shared accent consistently; its presence does not by itself mean “do this next.”

### S6 — Banning tappable drawings removes a natural scene interaction

**Evidence:** DL-2 (`docs/lab/design-language.md:14`); scene-first layout (`docs/design-language.md:34`).

“Body text and drawings never look tappable” is an overcorrection. Tapping a house on a map or a person in a scene may be the clearest interaction. Turning every scene interaction into a separate button list wastes the small screen and makes the games generic.

**Replace that sentence:**

> Decorative text and drawings do not falsely imply interaction. Interactive people, objects and regions have a consistent visible cue and a visible selected state. The tester can discover those interactions without guessing at unmarked scenery.

### S7 — The clock rule has no test for readable time or useful slowdown

**Evidence:** DL-15 (`docs/lab/design-language.md:33`), L6 (`docs/lab/lessons.md:25–26`); `AGENTS.md:11`.

DL-15's slowdown supports the owner direction. It is not itself a pause/turn contradiction. But any speed reduction can pass, even if the choice expires while its sheet is still being read. Neither rule checks whether the tester knows time is moving, how to wait or how to change speed. Treating every inspection sheet as a “menu” would also permit a free pause before every decision.

**Replace DL-15:**

> Show whether time is advancing and the current speed. Keep ordinary play continuous. Reduce speed for a consequential pending choice enough that the intended reading and input are possible. Opening an inspection sheet does not become a free turn boundary. System menus and a closed page may stop time; an explicit accessibility exception may do so too.

Here “pending choice” means an event demanding a response, not the mere existence of available actions. Otherwise continuous play slows permanently. Restore the chosen speed when that event resolves, unless another pending event still requires slowdown.

**Test:**

> From fast speed, encounter a live choice, inspect its information, and respond. Record real elapsed time and remaining opportunity. During a quiet stretch, identify how to wait or change speed. A harness that freezes between commands cannot establish this result.

### S8 — One-second feedback must mean acknowledgement, not a forced outcome

**Evidence:** DL-12 (`docs/lab/design-language.md:30`), L4 (`docs/lab/lessons.md:17–18`), Valley delayed-answer evidence F-122 (`docs/lab/feedback-ledger.md:145`).

An order may be received now and answered tomorrow. Requiring a reply within one second can collapse travel, deliberation and refusal into instant UI gratification. A tester may double-tap by accident; “never taps twice” is not a reliable failure definition.

**Replace DL-12:**

> Acknowledge an accepted input promptly. Show whether it is selected, sent, queued, underway or rejected. Do not claim execution before it happens. Delayed answers occur on the game's clock and remain traceable to the request. Test whether an uncertain repeat causes duplicate action or an unexplained result.

### S9 — The phone rules lack an overflow priority

**Evidence:** DL-23–26 (`docs/lab/design-language.md:52–55`), bottom 40% (`docs/design-language.md:33`), L9 (`docs/lab/lessons.md:37–38`).

The constraints are possible for a small set of actions. They are not universally possible:

| Constraint | Consequence at 360×690 |
|---|---|
| Bottom 40% | 276 px of height. |
| Six stacked 44 px targets | 264 px before gaps or padding. |
| Add even one 15 px next-step line | At least 279 px. Already exceeds the thumb region; realistic line height makes it worse. |
| Long reasons, two people, larger text or an open keyboard | Further shrink the usable space. A default-size fold promise cannot remain absolute. |

These are counterexamples to an unconditional layout rule, not measurements of an existing game. Do not shrink targets or text to make the rule pass. DL-23 must also distinguish gameplay from a long export/consent sheet.

**Replace the combined phone rule:**

> At default text size in a 360×690 CSS px content viewport, keep the immediate gameplay response and its essential context visible. Put frequent actions within thumb reach when practical. Group additional actions behind a labelled control. Preserve readable text and non-overlapping targets before preserving bottom-40% placement. Long sheets may scroll; their actions must remain reachable with the keyboard open. Test safe areas, long labels and multiple people.

**Replace L9's dimensions:**

> Test a 360×690 CSS px content viewport, not a 360×780 screen. Also test real browser chrome and safe areas.

An action at y=730 passes L9's current 780 px test and fails DL-23's 690 px test. The visual guide presents device dimensions as fact although AGENTS calls the visible-height number an estimate. Call 360×690 a lab fixture, not a guarantee about a named phone.

### S10 — The numeric budgets confuse player behavior, text length and layout

**Evidence:** DL-6, DL-11, DL-24, DL-26 (`docs/lab/design-language.md:18,26,53,55`); phone base (`docs/design-language.md:24`); owner wording F-191 (`docs/lab/feedback-ledger.md:214`).

| Number | Finding and concrete rewrite |
|---|---|
| **44 px** | Keep it as a deliberate house target, not an alleged universal minimum. Specify the hit area, not the drawn glyph. **Rewrite:** “Use non-overlapping hit areas of at least 44×44 CSS px for standalone controls. Handle dense scene selection with zoom, a disambiguation list or an equivalent labelled action. Test adjacent controls for accidental activation.” W3C's enhanced target criterion uses 44 px at AAA with exceptions; its AA minimum is 24 px with exceptions. [Enhanced target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html), [minimum target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). |
| **60 words** | A budget is not a fit test. Long names and six short button labels can exceed the available layout without exceeding the count. “Must-read” also lacks a counting rule. **Rewrite:** “Aim for at most 60 essential words per immediate decision, including labels, reasons and costs. Verify the rendered layout separately. Keep longer context available on request.” |
| **30 s** | The test times the player's first input, not when the choice becomes available. An attentive player may deliberate for 45 seconds. **Rewrite:** “Make a meaningful choice available within 30 seconds of the first usable screen. Record availability time separately from first-input time. Treat this as a lab default, not a player deadline.” |
| **40 words** | An uncited house budget, not evidence that the opening is clear or engaging. Splitting the same setup across popups would game the count. **Rewrite:** “Aim for at most 40 mandatory story words before the first choice, counting all intervening screens. Permit a recorded exception when tested context improves comprehension.” |
| **15 px** | An absolute floor does not establish readability and can encourage shrinking copy below the visual guide's 17 px base. **Rewrite:** “Keep the 17 px phone base. Test secondary text for readability in both themes. Preserve content and controls at 200% text enlargement and at 320 CSS px content width; allow vertical scrolling.” W3C's resize/reflow criteria test retained access, not a universal minimum font size. [Resize text](https://www.w3.org/TR/WCAG22/#resize-text), [reflow](https://www.w3.org/TR/WCAG22/#reflow). |

The same problem applies to “sentences under about 20 words.” The owner's own current feedback says slightly longer sentences may clear confusion. **Rewrite:** “Use the shortest sentence that conveys the necessary distinction. Do not remove the explanation merely to meet a word count.” The 60-second checkpoint can remain a sampling convention; define its start consistently and do not call unencountered rules failures.

### S11 — Hierarchy treats story clues as disposable flavour

**Evidence:** DL-7–8 (`docs/lab/design-language.md:19,23`); implied story and progressive complexity (`docs/owner-directions-2026-10-18.md:15–18`); visual voice (`docs/design-language.md:38`).

“Three levels, no more” conflates function with a fixed style hierarchy. A remark can be a clue now and become meaningful later. Asking the tester whether they “must read” every line requires knowledge they have not earned. Marking all background as smaller, soft and skippable teaches players to ignore the very story that should immerse them. “One rule at a time” can also become a compulsory series of tutorial interruptions.

**Replace DL-8:**

> Give immediate interactions and known urgency a clear visual priority. Keep consequences readable and context discoverable. Do not mark necessary clues as expendable decoration. The tester can identify what needs an immediate response without being told which story details will matter later.

**Replace DL-7:**

> Make a new interaction understandable when it becomes relevant. Prefer learning through an ordinary action and its consequence. Add a short contextual explanation only where testing finds confusion. Do not require tutorial popups or help-page avoidance as proof of understanding.

**Test:** ask what the first choices meant, not merely whether the tester managed three taps without help. A sandbox or mystery may legitimately keep strategic rules undisclosed.

### S12 — English dates do not require Gregorian dates in every fiction

**Evidence:** DL-20–22 (`docs/lab/design-language.md:44–46`); owner complaint (`docs/owner-directions-2026-10-18.md:55`).

The owner required English dates and key terms. The checklist adds a Gregorian mandate. “Day 3 of 12” is not a Gregorian date, so the alternatives even contradict each other. Day-of-week plus day-number can omit month/year in a multi-year game. “Harvest” must not erase a specific unfamiliar unit or institution whose meaning affects play.

**Replace DL-20–22 with a shared rule and two tests:**

> Keep action-critical labels, units and dates understandable in English. A setting-specific term needed for play has a nearby plain-English meaning. Use an English date or a clearly defined relative day/season with enough context to distinguish deadlines across months or years. Add another calendar only when useful; do not require a Gregorian calendar where the fiction has no need for one.

> Test: the player can compare a deadline to the current date and describe the relevant unit without translation. Test first use and returning after a break, not only the opening.

### S13 — The checklist can promote quiet faith into an objective or status explanation

**Evidence:** DL-4–5, DL-8, DL-14 (`docs/lab/design-language.md:16–17,23,32`), L1 (`docs/lab/lessons.md:5–6`); visual faith rule (`docs/design-language.md:39`); `AGENTS.md:24`.

No item explicitly commands religious prominence. The danger is the combination: explain every refusal's deciding reason, elevate what comes next, and disclose every cost. If a person quietly leaves to pray, literal compliance can turn it into a pinned religious obligation, repeated refusal tooltip or countdown. That would make faith more central than the owner directed. Do not “fix” this by adding a faith tutorial or a religious compliance meter.

**Add this boundary to the clarity rules:**

> Apply clarity to the player's available response, not to every private motive. Quiet religious life does not require an objective, alert, countdown, tutorial or moral score. An ordinary line such as “She will be back shortly” may be enough. Preserve uncertainty about motives when the person would not disclose them.

**Align the visual rule with AGENTS:**

> Faith stays quiet. Prayer and fasting may be ordinary parts of life, never the theme, goal or central mechanic.

“Never a mechanic” is stricter than “never a central mechanic.” Removing quiet everyday effects is not required to keep faith gentle.

### S14 — Save placement is standardized, but save behavior is barely tested

**Evidence:** DL-27–30 (`docs/lab/design-language.md:59–62`), L8 (`docs/lab/lessons.md:33–34`), fictional saves/menus and replay (`AGENTS.md:11`).

“Continue first” can pass while a background tab advances a deadline, the wrong slot resumes, or closing a sheet returns to the title page. Putting save/resume inside Notebook also sits awkwardly beside title-screen Continue. A single identical footer location can be below the phone fold. Consistency should cover discoverability and behavior, not require the same furniture regardless of fiction.

**Replace DL-27–28:**

> Use a consistently labelled, discoverable place for save and playtest controls, expressed through the game's fiction. Offer Continue on the title screen only when a valid save exists, with a short description of that save. Closing an inspection panel returns to the same scene. Closing the page and resuming does not advance simulated time. Verify reload and resume without loss or duplicate actions. Download remains available when sending fails.

Keep exact replay verification in its own builder check, as B1 describes.

### S15 — “Notebook” names incompatible destinations

**Evidence:** DL-27 and DL-29 (`docs/lab/design-language.md:59,61`); visual metaphor and footer (`docs/design-language.md:7,35`).

Notebook names the visual metaphor, the per-game save/export menu, the all-games collection and the private lab upload destination. This violates the useful part of DL-10. A player looking for their saved run can follow “all notebooks” out of the game. The footer is also specified as a single collection link in the visual guide, while DL-27 permits the save/export entry there.

**Replace the navigation copy and placement rule:**

> Use “Game menu” for save and run controls, “Download this run” for the local export, “Send this run to the lab” for the private upload, and “All games” for the collection link. Keep the game menu discoverable without scrolling. The footer collection link is a separate destination. The notebook remains the visual metaphor, not a name for every operation.

The exact menu position can follow the game's fiction and phone layout. Another universal top-right prescription would merely replace one arbitrary constraint with another.

### S16 — The lessons prescribe filler and a sequel hook where neither may belong

**Evidence:** L7 (`docs/lab/lessons.md:29–30`), L14 (`:57–58`), L15 (`:61–62`); owner directions `:15–19,22,27`.

“Fill” quiet stretches by adding “small life” can produce decorative event spam instead of agency. A mandatory open question at *every* session ending can prevent an earned, complete ending. “Check that week one bites” can also turn natural difficulty into a compulsory early punishment schedule. These are generalizations from useful feedback, not universal game structures.

**Replace L7's prescription:**

> Test whether quiet time creates anticipation, room to think or boredom. If it bores, expose a meaningful response, offer a visible way to advance time, or shorten the wait. Do not add repeated flavour events merely to make the screen busy.

**Replace L14's ending prescription:**

> Resolve threads the game has presented as promises. At an interim stopping point, make an unfinished consequence or question available when it gives the player a reason to return. A final ending may close cleanly.

**Replace L15's opening prescription:**

> Test attentive and inattentive play for meaningful differences where the opening has natural stakes. Keep consequences proportional to the fiction. Do not add an artificial early crisis merely to prove difficulty.

## Nits

### N1 — Keep DL ids, but give each repeated rule one owner

**Evidence:** `docs/lab/design-language.md:3` claims not to repeat the visual language; the following rules repeat both it and the lessons.

| Overlap | Concrete rewrite/ownership |
|---|---|
| DL-1, 3, 5, 8, 9 | Separate purpose, visual priority and current status. Let DL-5 own current-status wording; DL-9 tests its discoverability rather than demanding a second pinned copy. |
| DL-14, 17, 18, 19; L5; visual marks | Let one knowledge-boundary rule govern known quantities, perceived state and uncertainty. Keep distinct tests for readable cues and inappropriate numerical displays. |
| DL-20, 21, 22 | One English/terminology policy; separate first-use comprehension and deadline-reading tests. |
| DL-23, 24, 26; L9; visual layout/type | Visual guide owns type/tokens; checklist owns viewport and interaction tests. L9 links to the current viewport fixture instead of copying 780 px. |
| DL-12/L4, DL-15/L6, DL-16/L19, DL-28/L8 | Lessons retain evidence and rationale. Checklist supplies the observable test. Link instead of restating different-strength absolutes. |

**Replace the opening distinction:**

> The visual guide owns tokens, type and drawing conventions. This file owns observable clarity tests. Lessons retain feedback and rationale. Where a rule appears in more than one place, link to its owner rather than copying it.

### N2 — “One name everywhere” must allow recognisable speech

**Evidence:** DL-10 (`docs/lab/design-language.md:25`), personal voice (`docs/design-language.md:38`).

Literal compliance would make people repeat UI labels and ban an established nickname. “The tester never asks” is also not proof; silent confusion is common.

**Replace DL-10:**

> Keep action-critical labels stable. Introduce aliases and setting terms clearly. Dialogue may use natural speech when the referent remains recognisable. Ask the tester whether two encountered labels name the same thing; record unresolved confusion.

### N3 — One-sheet navigation needs a return destination

**Evidence:** DL-25 (`docs/lab/design-language.md:54`) and Notebook/send flow in DL-27 (`:59`).

Opening Send from Notebook and replacing the first sheet can satisfy “one sheet” but lose the player's location. “Closing one returns to the scene” makes cancelling Send unexpectedly close Notebook too.

**Replace DL-25:**

> Show one sheet at a time. When a sheet opens another task, preserve its origin. Cancel returns to that origin; closing the outer sheet returns to the scene. Focus returns to the control that opened it.

### N4 — Preserve the owner's evidence boundary and measured coverage

**Evidence:** checklist `:5,7`; owner directions `:55`; `packages/playtester/README.md`.

The Valley report is the coordinator's paraphrase, not a verbatim owner quote or a diagnosed cause. Rewrite the introduction as **“The coordinator's paraphrase of the owner's Valley report identified these failures. Test whether they recur across the lab.”** Do not claim every game already has every Valley defect.

The source-unread prompt and linked README rubric both landed during this review; the initially missing-link observation is withdrawn. The rubric correctly distinguishes warnings, measurements and unmeasured evidence. Carry that distinction into the checklist itself. **Rewrite its usage claim:** “Human reports use these ids. Automated checks report only the signals they actually measure and mark the rest unmeasured.” A headless adapter offering actions cannot prove those actions were visually discoverable.

## Coverage of the owner's Valley complaint

| Complaint | What the current draft misses | Finding |
|---|---|---|
| No idea what to do | Knowing an immediate response without being assigned an optimal strategy; understanding the effect of one's action rather than tapping any first verb. | S2, S8, S11 |
| What is clickable | Interactive scenery, selected state, ambiguous hit regions; a complete control inventory cannot be proved from first play. | B1, S5, S6 |
| Which text matters | Clues versus decoration, multiple urgent demands, readability after wrapping and enlargement. | S5, S9–S11 |
| Why actions are limited | Capability origin, recovery and when trying again makes sense; an explanation alone can legitimize a quota. | S3 |
| What comes next | Time visibly passing, waiting/speed controls, enough time to respond, completion or end conditions distinguishable from an empty interval. | S2, S7 |
| English dates and terms | Units and deadlines remain understandable after returning, including month/year where relevant; a Gregorian mandate is unnecessary. | S12 |
| Upload refused after a little play | Actual successful short-session upload, long-session bounds, preserved note, usable download and retry, verified replay after compaction. | B2 |

The remaining missing test is an explicit **end-state check**. Add under current status: **“At a session boundary, the tester can tell whether play has ended, what resolved, and whether continuation is possible. Waiting at the fastest offered speed must not be the only way to discover that a game is over.”** This does not reveal a mystery's ending in advance.

## Limits and review method

Three independent read-only subagent reviewers covered direction/faith, source-unread evidence and phone/numeric constraints. A Claude Opus reviewer supplied a separate game-design/taste review. All four completed; findings were checked against the requested documents and consolidated here. Some reviewers ranked policy risks as blockers; this report reserves blocker for broken acceptance claims. Suggestions that would force a single optimal next move, guarantee every cost, make device estimates factual, or read private design waivers into a cold tester's experience were rejected. This is a document review. No game was played and no live device measurements, upload receipts or replay runs were produced. The phone arithmetic establishes a conflicting layout example, not a universal impossibility. The numeric defaults are not all wrong: 44 px is defensible; 360×690 is useful as a fixture; budgets can help if they remain subordinate to observed comprehension. No processes were killed.
