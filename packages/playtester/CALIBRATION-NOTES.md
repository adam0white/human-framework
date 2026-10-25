# Calibration notes

These are notes for the owner of `packages/playtester`. They are not code. Each item says where simulated testers (the HF-character cohort, or the LLM persona testers) disagreed with real or owner play, with each other, or behaved in a way that looks implausible. Evidence is ledger ids from [docs/lab/feedback-ledger.md](../../docs/lab/feedback-ledger.md). "Confirmed" means read in a source file. "Assumed" means the note writer's inference. Seeded 2026-10-19 from the playtests of 2026-10-18 and 2026-10-19; the package was changing on that day, so check each note against the current code.

### C1 — Simulated personas are never bored; people and LLM testers were.

In Pass, Murmur and Glance every HF persona stopped for its agenda or tiredness, quit from distress, or finished, with engagement 0.5 to 0.87 and no boredom stop (one Glance session put it down on a joy-novel stop in a quiet stretch). In the same builds the owner reported easy early nights and LLM testers reported dead air, silence and "waiting, not playing". Confirmed: the harness reported no boredom stop in these runs. Assumed: the harness's boredom is too forgiving.
Evidence: F-035, F-066
Suggested calibration: Make boredom rise with time since the last event that answered an input or changed the scene, not with any event. Run the Pass owner export (seed 1984246569) as a check: the harness should flag Tuesday's first 134 quiet minutes.
Status (2026-10-19): partly addressed. An event without stakes now adds 0.12 × salience to engagement (it was 0.4), so a busy screen can bore. The Glance now puts 8 of 24 sessions down bored; The Pass and The Two Voices still bore almost nobody. The rule proposed here was not tried, and the owner export check was not run (docs/findings.md, 2026-10-19 calibration).

### C2 — Reward events depend on how the adapter scores events.

Glance's HF runs show `rewarded 0x` in every session. The adapter author thinks its event valences never reach the harness threshold (0.15 for a report). Valley's first run also had zero rewards until the host added progress notes, so the signal there depends on adapter valences too (its report says the numbers are a relative signal between builds, not independent evidence). Assumed, not confirmed in Glance.
Evidence: F-050
Suggested calibration: Document a default valence table per event kind (report, refusal, progress, loss) in the adapter contract, and warn when a whole cohort rewards zero times. Compare against what real testers called delight (a kept phrase, a remembered line).

### C3 — Personas answer faster than a person reads.

Murmur's adapter has each persona answer a card inside a 3-second beat. The game's author says real play likely takes two to three times longer. Confirmed: the beat is fixed. Assumed: the real ratio.
Evidence: F-067
Suggested calibration: Make the beat depend on text length shown and on the persona's patience, and compare to the owner's real input timing in exports.

### C4 — Engagement scores do not separate good from weak builds.

Engagement was 0.63 to 0.81 in Pass, 0.75 to 0.87 in Murmur and 0.52 to 0.72 in Glance, while LLM testers scored these games 5 to 7 out of 10 and gave different reasons. The owner values testers that are not easily satisfied, so a score that sits near 0.8 for everything does not help.
Evidence: F-002, F-066
Suggested calibration: Pick scores that separate. Report the spread across personas for one build and the change from the last build, and mark a build as changed only when the spread moves more than seed noise. Check against owner verdicts as they come.

### C5 — Session ends come from the persona's agenda, not the game.

In Pass all 8 sessions ended on agenda or tiredness at 13 to 21 minutes; in Glance 5 of 8 ended on game over, 2 on agenda and 1 on a joy-novel stop. Quit points therefore say little about the game.
Evidence: F-035, F-051
Suggested calibration: Report the first moment boredom or distress passed a threshold, even if the session ended for another reason. Randomise agenda lengths per seed.

### C6 — Refusals count as frustration; real players read reasoned refusals as people.

HF personas were frustrated by refusals in all three builds ("Not yet. I've nothing left in me.", "I'll have a third coffee instead."). Human and LLM testers praised refusals that carried a reason and disliked ones that did not (Gwen on "Arms are gone"). The harness cannot tell a refusal with a reason from one without.
Evidence: F-041, F-049
Suggested calibration: Appraise a refusal by whether the screen showed a cause. A refused ask with a visible reason should be neutral or mildly positive for a persona with openness or agreeableness; one without should be negative.

### C7 — Personas trust the board; people learn to doubt it.

Glance's adapter picks gates from the reported level and does not correct for Dai reading low, by design. Priya and Tomás used the margin note and a second reading to correct. So the HF cohort measures only naive play there.
Evidence: F-048
Suggested calibration: Add a learner persona that reads margin notes and cross-checks, so a game about information is measured on both.

### C8 — HF bots were more attentive than LLM testers in Pass week 1.

The HF-character bots fed 143 to 149 of 149 tables in week 1; both LLM testers missed the bank by 200 and 320 lira; the owner fed 143 of 149 and won. The bots never look away (see C12).
Evidence: F-036
Suggested calibration: Give personas attention lapses (looking away in the middle of a rush) and compare bank outcomes with the owner's export.

### C9 — Valley: every persona quit from distress, LLM testers did not all quit.

All four HF personas quit in 3 to 8 minutes from distress before progress notes were added, with no reward. The casual Haiku tester quit after about 50 taps; the veteran finished three years; the story-seeker quit in winter. So the HF quit rate matched the weakest LLM tester and not the median. After the progress notes some sessions ended on joy.
Evidence: F-069, F-081
Suggested calibration: Check that distress comes from refusals with no progress, as intended, by running the casual and veteran personas against the same build. Treat a cohort that all quits as a signal about the build, not a ranking.
Status (2026-10-19): the harness part is addressed. One hard event is now a `setback` moment, not a reason to quit. Stopping favours rest only after 3 hard minutes in 5 and a window lost by 1.5× or more. On The Night Watch the distress quits moved from 3–20 min to 5–35 min, and the remaining quits come from windows the adapter scores as clearly lost (docs/findings.md).

### C10 — Agreement: Murmur's harder Thursday.

After the polish round, two HF personas (commuter seed 1, restless seed 1) quit on Thursday from distress. The Haiku first-timer called Thursday hard and unfair in the same build. This is one case where simulated and LLM play agree. Real players are unknown: the owner's Thursday has not been played.
Evidence: F-054, F-068
Suggested calibration: Keep this as a positive calibration case. When the owner plays Murmur, compare his Thursday with these runs.

### C11 — Edge detection should cover the edges testers found.

LLM testers found: hold always works (Murmur), install then go silent (Murmur), press and urge cost nothing (Valley, Rope, Neighbours) and re-asking idle cooks (Pass). The owner wants edges kept a bit fun. The edge rules in `edges.ts` read traces only (dominant input, loop, unexpected win, ignored mischief, silent input).
Evidence: F-003, F-023, F-055, F-056
Suggested calibration: Check that the cohort flags each of these four on the recorded builds before the fixes. If it does not, tune the thresholds (`dominantShare`, `loopRun`).

### C12 — Personas never look away; people do.

Every HF run reports `looked away 0x`, and Murmur's longest lull is 0 seconds. The owner played Pass Tuesday for 134 minutes with no input and still fed 20 of 20; LLM testers left Murmur alone for 30 seconds to two minutes and missed a dinner.
Evidence: F-017, F-066
Suggested calibration: Let personas look away by persona trait and by what is on screen, and report what they missed while away.
Status (2026-10-19): not addressed directly. After the engagement change, personas look away sometimes (The Night Watch: 5 of 16 sessions, was 0).

### C13 — Use the owner's exports as the first sim-versus-human calibration set.

The owner's exports exist with seeds: Pass 1984246569 (six nights), Rope 334144833 (two climbs). The owner asked for opt-in telemetry with notes. The lab ideas list proposes comparing runs on the same seed.
Evidence: F-005
Suggested calibration: Replay each owner export through the harness's own input policy and compare input density, quiet gaps and stop points. Record the differences here as new C items.

### C14 — LLM text-harness reports are not all the game's behaviour.

Two Pass reports came from the text harness: "No such cook here" after open (replay showed all three cooks on shift) and rail glyphs and tips left out of the printed screen. The playtester package should not copy those gaps into its adapters.
Evidence: F-024, F-027
Suggested calibration: Make each adapter print the same one-line tips and legends the page shows, and add a test that the adapter's first action after each phase change succeeds.

### C15 — LLM testers disagree with each other on small taste.

The speedrunner liked "You took my no at 20:36" as a remembered specific. The cozy tester said quoting the exact minute sounds like a log file. Both are source-unread LLM testers on the same build. Style preference is not a defect.
Evidence: F-022, F-031
Suggested calibration: Do not tune a persona to one LLM tester's taste. Record split verdicts and let the owner decide.
