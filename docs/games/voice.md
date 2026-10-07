# Game 2 — *The Day You Say Nothing*

The game as shipped, live at /voice/ on HF 2.0 (engine 2.0.0), shipped seed 7. It was designed on 2026-10-03 from the Game 2 premise of the early game-design review (2026-10-02, §5; in the repository history), cut down the same day to a four-played-day build, and revised in thirteen passes ending with the HF 2.0 upgrade, then a fourteenth adding the month you never spoke (§15). Code: [`apps/site/src/voice`](../../apps/site/src/voice) (the town is [`sim/town.ts`](../../apps/site/src/voice/sim/town.ts)); framework: [framework.md](../framework.md). Game 1 is [*Twice at the Well*](colony.md). The boundaries in [islamic-foundations.md](../../research/islamic-foundations.md) §3–5 and AGENTS.md apply throughout: the player is a suggestion, never a judge; nothing scores worth, faith or acceptance. Contested religious points follow [research/decisions.md](../../research/decisions.md) (§11).

## 1. Pitch

You are the one voice in Halil's head that is not his own, during the first Ramadan since his wife died. On the morning of Eid you are muted, and you watch whether the man you spent a month talking to still does, alone, the things you used to have to say.

The premise card states the stance once: he hears you, **he decides**. He may agree, put you off, do something like it, refuse, or give in under protest, and he always says why. The player never acts in the world and sees only what Halil notices or feels.

## 2. Halil and his world

**Halil Demirci, 61**, repairs kettles and bicycles in a rented shop in a small Anatolian town. Nuran, his wife of 35 years, died fourteen weeks ago. The rent is two months behind. He has not cooked for himself since. He has smoked after every meal for forty years. His blood pressure is high and unexamined. None of this is a verdict on him: grief and illness are states of body and memory, and the game never maps them to devotion.

Why him: a widower's life has collapsed structure (lapsed commitments, habits that lost their cue, a job he still has, a daughter who still calls, a debt with a date), which is the framework's content. Ramadan supplies stable daily cues (suhoor, iftar), and the fast shows the split between the felt and the true body every afternoon.

Every person below is a full `Person` in one `Community`, except the doctor.

| Person / place | Role |
|---|---|
| Home (`halil-home`) | Sleep, suhoor, iftar alone, prayer at home; Nuran's memories are cued here. |
| Workshop (rented from Osman) | Morning repair (paid per block), the afternoon shift; shut on Eid (town custom, engineering assumption). |
| Mosque | Prayer at the mosque (heavier for him since the funeral), the Eid prayer. |
| Tea house | Rıza, tea, cigarettes; he does not hear the phone there. |
| Clinic, cemetery, Eid market | The doctor's words are the only place the true body is read aloud; `visit-grave` after Asr and from 09:00 on Eid; the market from Ramadan 10. |
| **Selin**, 34, daughter | In the city; calls in the evening; wants his blood pressure seen. |
| **Hacer**, 70, neighbour | Leaves iftar at his door; carries news both ways. |
| **Rıza**, 63, friend | Retired, warm, bored; tea after iftar. |
| **Osman**, 55, landlord | Owed 600; wants 300 by Ramadan 15. |
| The doctor | Not a Person: a host `told` percept (`actorId: 'doctor'`). |

The premise names each voice's relation (daughter, friend, neighbour, landlord), the end labels repeat it, and each voice's first log line gives it. Reputation is the others' beliefs about him moving through `told` percepts between them.

## 3. His ends and your aim

The game never says "make Halil do X". It shows his ends, in his words, as his record (not points, no pass or fail), and gives the player one aim:

> Help him toward what he wants, so that on Eid, when you are silent, he does it on his own.

| End | His words | Read from |
|---|---|---|
| The fast | "Keep the fast." | The day's `fast` commitment: kept, or excused with a make-up owed. An excused day is never shown as failure. |
| Osman | "Pay Osman what I owe." | Host ledger: 600 owed at the start, 300 by Ramadan 15 20:00. |
| His pressure | "Selin wants my blood pressure seen." | `see-doctor` completed, then the doctor's words; after that, cigarettes per day at the start and end of Ramadan, walks, and cigarettes on Eid. |
| Selin | "Talk to Selin." | Calls each way, who called, and the day of the last one. |
| You | "Does he still listen to you?" | `VoiceRelation.trust` for `you` and its last three history events. |

Prayer appears in his day, the sky band and the chronicle, but it is not an end. The game does not track or score worship as a goal (§11).

Every end is read at Eid morning (the run is snapshotted when Eid starts) and states its date, for example "Paid 300 on Ramadan 14; 300 still owed at Eid. He had 268." A separate "Without you" line covers the week after Eid.

## 4. Cut from the original design

The original spec asked for thirty played days and a larger town. The build cut it to what shows the idea:

| Original | As shipped | Reason |
|---|---|---|
| 30 played days, about 3 minutes each | Four played days (Ramadan 1, 2, 15, 30), skips between them, a muted Eid (day 31), a 6-day muted epilogue | The idea lands in one day; a few days show change. |
| 40-day epilogue | 6 days (days 32–37) via `runSilent` | `diffChronicle` needs several days; 40 add nothing here. |
| Kilim (30×24 woven rug, the save screen) | A day **strip** per played day plus Eid | Same meaning, about a tenth of the work. |
| Sky canvas with true moon phase and weather | A CSS sky band: the hour's hue, prayer notches, a fast bar, a "now" mark | No loss to the idea. |
| Gestures (tap, hold, swipe up to insist) | A composer with buttons and keys (§6) | The Game 1 playtest asked for compose-then-Confirm. |
| Appeal chips unlocked by his trace | All five reasons always shown; the live telegraph teaches which lands | The unlock is invisible in a 4-day game. |
| "Things you no longer need to say" (silent dawn probe) | `diffChronicle`'s lines in the report, plus the "He'd now do unasked" strip (seventh pass, §8) | |
| Yakup Hoca, Dr. Ayşe as a Person, Deniz (6) and Selin's visit | Not built; the doctor is a `told` percept | No new Persons. |
| Zakat al-fitr | Not represented | It is an obligation with an amount and a deadline; nothing in `research/` sources it. |
| Sewing machine, grocer tab, cards, Osman's van, travel to Selin for Eid | Not built | Out of scope. |
| Saves at every dawn, "one day each day" pacing | No saves; Replay restarts from the seed; a playtest export (seed + input log + state JSON) replays the run | Out of scope. |
| Felt-body line figure, per-voice paper styles | Words and small bars; a colour, label and icon per voice | Out of scope. |

## 5. The month as played

| Stretch | Mode | Notes |
|---|---|---|
| Ramadan 1, from 03:40 | Played, teaching pace | Starts asleep, about 20 minutes before the suhoor drummer; the first beat is the suhoor wake. |
| Ramadan 2 | Played | Selin's call after iftar; her standing advice shows as a prefill reason. |
| Ramadan 3–14 | Skipped | Instant, headless. |
| Ramadan 15 | Played | Osman's date. |
| Ramadan 16–29 | Skipped | |
| Ramadan 30 | Played | The last fast; its last night says Selin will leave the first Eid call to him, with "call Selin" prefilled. |
| Eid (day 31) | Muted, watched live | No composer; auto-pause beats still on. |
| Days 32–37 | Muted epilogue | `runSilent(..., 6, { mutedVoiceId: 'you' })` on a deep copy of the whole run (town state, community host fields, every person), so Keep listening can resume from Eid night. |

Day labels come from `townDay(day)`: "Ramadan n", "Eid al-Fitr", "Shawwal n". `TOWN_EID_DAY` is 31 (30 fasts from day 1); make-up fasts start on day 32. A played day ends at 23:30 (he may sleep before Isha and pray it at 02:10, so "first sleep after Isha" is not a usable boundary). **End the day** fast-forwards to 23:30 with only the current standing suggestion live.

**Skips and standing whispers.** At each between-days card the player may leave up to two standing whispers for the skipped stretch, from a closed list, shown in the order of the day. A word appears only when it has something to act on, so the card has 9 to 12 rows:

- work in the morning; take the afternoon shift; pay Osman when you can; see the doctor; call Selin; pray at the mosque; walk after iftar, not the cigarette; rest in the afternoon (heard only between Dhuhr and Asr);
- tempting words, with neutral labels and no warning text, none about prayer or the fast: sleep in after suhoor (sunrise to 10:00); Eid first; Osman can wait (a trip to the Eid market, shown once the skip reaches Ramadan 10); stay out late with Rıza (from an hour after iftar); skip the call, she's busy (shown once he has called Selin in the last two days).

Each whisper has a strength and a reason. A picked whisper starts with the reason the in-day prefill gives for the same act (`WHISPER_DEFAULT` in protocol.ts): "it's your duty" for the shift and the rent, "your health" for the clinic, "for Selin" for the call and for the market. While mornings alone fall short of Osman's date, the shift choice says a bare mention will not move him. The card states the cost before Confirm ("He'll hear this at every decision for 12 days. If he doesn't want it, it wears on him."), so pressure and reactance accumulate. During a skip each whisper goes to `stepCommunity` as `StepOptions.suggestions.halil`; two whispers alternate hour by hour, because the framework hears one suggestion per voice per decision, and only between whispers he can hear. A whisper with hours is not carried past their edges. "Skip the call" is a word against an option, which HF suggestions cannot express, so it is carried as rest and heard only while the call is on offer or under way.

This fixes what the report's diff means: **with you** is Ramadan 1–30 (played days and skipped days under your whispers or none); **without you** is Eid plus days 32–37.

After the report: **Keep listening** resumes from Eid night with the voice back on, open-ended, with between-days cards and no second report. **Replay** restarts from the same seed. **New town** picks a new seed.

## 6. The composer

The composer is open only when Halil is awake and at a decision point. While he sleeps or is in a long activity it says "Asleep until about 08:00" or "Repairing until 10:00", and time fast-forwards (§9). A suggestion is never sent to a sleeping man.

Top to bottom:

1. **Leaning:** "He's leaning toward *repair in the workshop* — *to earn; Osman is owed 600*", the top option's dominant term in words.
2. **Options:** up to six things he notices, in his words, ranked by his utility, the leaning one marked. Keys 1–6.
3. **Prefill line**, whenever the composer opened prefilled: "Prefilled because: Selin said on the phone last night: see the doctor."
4. **How:** Mention (strength 0.35) or Urge (0.7), keys M/U. **Insist** (key I) prints its price before Confirm. Insisting earns no trust when it goes well, and costs trust only when he is already pressed; the composer says so.
5. **Reason (optional, one):** *it's your duty* (`duty`), *your health* (`safety`), *for Selin* (`benevolence`), *you shouldn't be alone* (`belonging`), *it matters* (`meaning`). A reason earns its bonus only when it matches a motive he holds.
6. **Telegraph**, live (`predict`, debounced 100 ms), in verdict colour: "Likely: 'Fine.'", "Not now — *after I pray*", "He'd do something like it: *pray at home*", "Won't: 'Not while I'm keeping my fast.'", "Can't: …". When the draw can contradict a stated likelihood it says "probably".
7. **Say it** (Enter) and **Say nothing** (Esc). Enter after a mouse click on a picked option, strength, insist or reason sends.

**Prefill rule** (`sim/prefill.ts`, deterministic, first rule wins; it skips an option he would refuse outright):

1. Another voice's standing advice whose action is on offer and is not his leaning (Mention, Urge if the advice weight is ≥ 0.5; the reason follows the act). Osman's demand and the doctor's advice arrive this way.
2. One of his ends, on offer and not leaning: pay Osman when money ≥ 300; the clinic in clinic hours if he has never been; call Selin after Maghrib if two or more days have passed without a call; the morning repair if not worked today. The afternoon shift is prefilled at the once-a-day shortfall pause; the walk is prefilled when he is about to smoke and the walk is on offer.
3. Otherwise nothing: "He's settled. You can say nothing."

The first beat of Ramadan 1 is the suhoor wake, announced a minute ahead on a waking copy of him and prefilled with `eat` (his leaning), so the first answer is a yes and the colours are learned in order. The close-call prefill rule of the plan was removed in the second pass.

**Suggestion lifecycle** (`sim/standing.ts`). One player suggestion stands at a time; Confirming replaces it. A word he will refuse is answered at once through HF `answerNow` and does not interrupt him: the refusal is booked (trust, pressure, counters), the answer shows, and he carries on. Otherwise the suggestion interrupts him so he weighs it now, and stays live until he begins the suggested act (or the same action, such as praying at home for the mosque), it is refused, 3 sim hours pass, he sleeps, or the player withdraws it. Once begun it holds until that activity ends, so he does not turn back half-way. A deferral keeps it standing with the counter-offer shown. If its option is not on offer, the word waits and the log says why and until when; when the option returns, the log says so. A word whose activity was cut short by a closing-stretch review still gets its answer shown. One suggestion credits at most one activity.

**Trust economy.** Trust moves on how followed advice turned out, not on assent. An insisted success earns nothing. Insisting while his pressure from you is ≥ 0.6 costs 8 % (`trustLossPushed`). Asking again for something he declines while pressed costs 3 % (`worn`, at most once per 12 h). A repeat good outcome of the same act earns gain / (1 + n). Small changes fold into one history entry. Above pressure 0.6 with trust under 0.25 any word gets "Why would I listen to you?" (the `distrust` veto).

## 7. Screens

All screens fit one viewport (`100dvh`); panels scroll inside themselves. Fonts and tokens come from `src/shared/theme.css` (Fraunces, Instrument Sans, JetBrains Mono); the palette keeps the spec's paper, sky and thread (cream paper, night indigo, lantern amber). Icons are Lucide (ISC, licence text in `ui/Icon.tsx`), inline SVG, 16 px, labelled; his lines, reasons and ends stay text.

### 7.1 Premise card

The start state; the game is paused behind it. It gives Halil, Nuran, the first night of Ramadan, the stance (you are a voice, he decides), the four played days and the silent Eid, what he is holding on to (the fast, Osman's 600 and 300 by Ramadan 15, Selin wanting his pressure seen, Selin herself), the aim, "Time runs slowly and stops when something matters. Space pauses.", **Begin**, and the collapsed model notes (§10).

### 7.2 Day view

Desktop: a top bar (title, day label, clock, sky band, pause, pace, Auto-pause as an `aria-pressed` button, End the day); a left column with **His ends** and **Voices**; the centre log of **The day** in his narration with the composer docked below; a right column with **Halil** and the **Why** drawer. Below 1180 px there is a pace button. Phones: a compact top bar, tabs **Day | Halil | Ends & voices**, the composer as a bottom sheet ("Leaning: … · Say something"), 44 px targets, no horizontal scroll. Fixed for 360 px in the seventh pass.

The sky band's prayer pips are filled when kept, ringed when missed (no ring for a prayer excused by sleep or unconsciousness), with a dot for the mosque.

Log: consecutive same-action entries collapse ("tea with Rıza, 19:24–22:14"); verdict colours are green yes, amber not now / something like it (counter-offer in italics), grey cannot, red will not, struck-through amber under protest; other voices have their colour and label; recalls appear in italics ("*Nuran, at this table, last Ramadan.*"); rows are separated by a border; every entry with a `decisionId` opens Why. Detached replies name what they answer ("Drink water? 'Not while I'm keeping my fast.'"). An abandoned walk to the mosque reads "I set out for the mosque, as you asked, and turned back; the mosque brings back the funeral."

### 7.3 Between-days card

Always pauses. It shows the day's chronicle lines (at most 6), its strip, his ends with today's change, trust in you from start to end with the events that moved it, "What your words did" (one final answer per word, acts begun on your word and stopped part-way), what is still open (Osman, the clinic, Selin, Eid tomorrow), and the ends he did unasked. Before a skip it shows the whisper picker (§5); at 360 px it opens on the decision and the recap folds to one line. The next day opens on an intro card digesting the skipped stretch: firsts ("First time he saw the doctor: Ramadan 9, on your word") or "Nothing new since Ramadan N", then mornings and shifts worked, money, Osman's visits and payments, calls each way, the clinic, the fast (with excusals), and for each whisper "When he heard it, he said yes N, put you off M, refused K" and "N times on his own". With no whispers: "You left no word. What follows he did on his own." A digest covering Eid morning adds "On Eid morning he joined the prayer at the mosque" only when he went.

### 7.4 Eid view

Same layout; the composer is replaced by "You are silent today. Watch." Why still opens. The intro reads "Eid al-Fitr. The fast is over. Today you say nothing." The first cigarette and the first Eid call with Selin always pause, even inside another beat's cooldown. The last beat is his Eid-night sleep; then the epilogue runs on the copy (under a second) and the report follows.

### 7.5 End report

One panel that scrolls inside the viewport, in this order: a plain Eid summary (Selin's call: whether he called, when he usually called, when she called, and the calls each way in the six days after; clinic visits and how many followed your word; trust start to end; insist count; Osman's date kept or missed; shifts on your word); Eid lines in clock order (every key line kept under a 24-line cap, with a count of quieter lines left out); "What you used to say, and what he did on Eid" (a ledger by thing said, with his reason on Eid); what he did on his own, what others still had to tell him, and what stopped (from `diffChronicle`, scoped to your voice, prayer left out, empty sections hidden); who he listens to (trust for each voice at the end of Ramadan and of day 37, as words); his ends; his body as the doctor would read it (the true `BodyState` at day 37, "He never feels this directly", the one place the true body is shown); what is still open; the played days and Eid as strips; **Keep listening · Replay · New town**; the model notes. No score, stars, or words about worth, faith or acceptance.

**The month you never spoke** (Stretch S1, fourteenth pass) is the report's last section, after the body and what is still open and before the strips, so its caption is the last prose read. The same seed is played again with no input at all (no suggestion, no standing whisper; the cards only dismissed) through Ramadan 1–30, the muted Eid and the six-day epilogue, and a few facts are set beside the month as played, labelled "As played" and "Had you said nothing": Osman's date and the first payment, calls with Selin in Ramadan and who called on Eid, the clinic, the afternoon shift, the Ramadan days he smoked, river walks, and what was still owed a week after Eid. Frequent things are rough words ("a few times", "most days"); rare ones are dated. At most six differing facts are shown; the rest are named in one line ("Smaller differences: …", the walks and the shift first). Facts that match are folded into one line ("The same in both: …"). It ends with the caption, verbatim: "Small differences compound; not every difference is your doing." Left out: prayer and the fast (§11: no report line measures worship) and Eid's cigarettes (noise, 2–6 in every style, §14); nothing ranks the months. A player who never spoke gets one line instead: "You said nothing; this was the month you never spoke." The silent game ([`sim/counterfactual.ts`](../../apps/site/src/voice/sim/counterfactual.ts)) is a function of the seed alone, held by the worker outside the played game; it is stepped about 6 ms per tick only while the player is reading (paused, a card or an intro up), finished at once when the report is posted if it is not done, then dropped, keeping only its facts by seed. It is attached to the posted report only, so the played run's state, report and playtest hash are unchanged. Cost: a whole silent run takes about 1.0–1.1 s on the bench (`npm run bench`); in 6 ms slices it takes about 47, the longest about 280 ms (a whole skip runs inside one turn of the headless player, so it is not cut), which is why slices wait for the clock to stop. A loaded playtest that ends at the report pays the whole run at once.

## 8. What the player sees of his mind

| Shown | Source | Hidden |
|---|---|---|
| Doing now, intention, until when | `activity`, `DecisionRecord.intention` | |
| Felt body: hunger, thirst, tiredness as a word and a bar | `readBody(p).perceived` | The true body, until the doctor or the report |
| Feelings he would name (intensity ≥ 0.2) | `readAffect(p).dominant` | Mood as a number |
| On his mind: open commitments with times and a closing state; the fast shown as excused when it is | `agenda.commitments`, `commitmentPressure` | Importance values |
| His health: his pressure in words, whether he counts himself ill, days owed, the doctor's words | body, host | |
| How the clinic, calling Selin and the mosque weigh on him, and whether that is easier than at the start | seeded aversions | |
| Money and debt | host ledger | |
| Your trust: a bar and the last three events | `voiceOf(halil,'you')` | |
| Other voices: colour, relation, a trust word, what they last urged and whether it is still on his mind, a conflict line | `voicesIn`, `standingAdvice`, `conflictBetweenVoices` | Their numeric trust (only in the report, as words) |
| Memories, only when cited or recalled | recalled episode, loss recalls | The episode list |
| Why, on demand: stacked term bars for the top three options, labelled estimates; the chosen option first, with a reason when it was not the top total | `trace`, `Considered.terms` | |
| Chronicle | `narrateChronicle` in cards and the report | Raw `DayRecord`s |

**"He'd now do unasked"** (`sim/unasked.ts`, seventh pass; it restores the spec's silent dawn probe, which the build had cut). For suhoor, calling Selin, the clinic, paying Osman, the shift and the walk, it shows what he chose at his last decision where the act was open and your voice was not weighed. It appears on the Ends pane, the day card, the skip card and the report. Prayer is left out.

## 9. Pacing and auto-pause beats

Pace: Slow (default) 8 sim-min/s, Normal 20, Fast 60. While he sleeps, or during an activity with more than 30 minutes left and no beat due, time fast-forwards at 240 sim-min/s ("skipping: he sleeps until 08:00"). A played day takes about 2–4 real minutes. **Space toggles pause everywhere** (a global handler; it skips typing fields, advances the between-days card and keeps its native meaning on the report).

The closed list of beats (`sim/beats.ts`). With Auto-pause off a beat is logged with a highlight. Subject to a 20-sim-minute cooldown except where noted:

| Beat | Fires when |
|---|---|
| `wake` | His first waking decision after sleep (the wake line carries the minute he woke). |
| `verdict` | His answer to your word; pauses only when he defers, declines or cannot, and only on the first answer or a change of tone. No cooldown. |
| `voice` | Another voice reaches him: a call, Osman's demand, the doctor. Gossip is logged without pausing. |
| `craving` | A habit fires for an option he won't or can't take; in Ramadan a once-a-day smoking craving. |
| `close-call` | Top two options within the close-call margin, read ahead on a cloned `decide` so it fires before the act; pauses only when there is a prefill, never between two ways to pray or two ways of what he is already doing. |
| `duty-risk` | A commitment enters its closing stretch unfulfilled, thirst ≥ 0.7 in the fast, the once-a-day shift shortfall, a deadline (while he sleeps it waits until within an hour; a promise's beat comes at most 3 hours ahead). |
| `recall` | A loss recall; logged without pausing. |
| `day-end`, `eid` | Screens; always pause. |

Wake, craving, duty-risk and close-call beats stop pausing after two in a row are answered with nothing. Naps are capped at 90 minutes and do not pause. Pauses per played day (Ramadan 1 / 2 / 15 / 30, then Eid), seed 7, after the seventh pass: prefill + doctor/Selin whispers 10 / 6 / 7 / 6, Eid 5 (was 19 / 16 / 11 / 9, Eid 7); quiet 5 / 6 / 4 / 3, Eid 5; prefill + shift/Selin whispers 10 / 6 / 3 / 3, Eid 4.

## 10. Worker protocol and model notes

The contract is [`apps/site/src/voice/protocol.ts`](../../apps/site/src/voice/protocol.ts), Game 1's pattern: the main thread sends `tick{dtMs}` each animation frame, the worker steps whole sim minutes and replies with plain-JSON view models (`Frame`, `WhyView`, `BetweenView`, `ReportView`) carrying `gen`. React never imports `@adam0white/human-framework` except types re-exported from protocol.ts. Frames are sent only when something changed, throttled to about 15 a second, and kept under 100 KB (the log is capped at 300 entries; Why is fetched on demand). The playtest export and replay messages (`exportPlaytest`, `loadPlaytest`) are additive. `sim/fixtures.ts` holds sample view models; the mock is out of the production bundle.

The model notes have one copy, `MODEL_NOTES` in protocol.ts, shown collapsed on the premise card and the report, and nowhere in ordinary play. They say: Halil is a simulation built from engineering defaults, not a real person; the game represents his understanding of his duties, never a ruling and nothing about acceptance; what comes from the project's research notes (§11) and what is an engineering assumption (zakat al-fitr not represented; the workshop shut on Eid; the afternoon shift's pay not reckoned; a break under necessity excused by analogy with 2:173; how heavy the clinic, mosque and calling Selin feel); he decides from what he feels; scarcity and habit strength have no empirical citation yet.

## 11. Faith as a quiet part of his life

Prayer and the fast are part of Halil's day, never the theme, goal or a scored mechanic. No end, counter or report line measures worship; the player is never praised or blamed for it; prayer is left out of the report's "own" and "stopped" lists and the unasked strip; steering him away from the mosque is narrated without comment. Grief is `grief` with cue recall, not weak faith; illness is a body state.

**What the town models, and where it comes from:**

- **The fast** is an `abstain` commitment covering eat, drink and smoke from Fajr to Maghrib. Its veto refuses those at any strength ("Not while I'm keeping my fast.", reason `duty:sawm-ramadan`). Illness excuses a day with a make-up owed (Qur'an 2:184 as catalogued). A break under real necessity (capacity, 2:286) is flagged at begin and excused the same way, an assumption by analogy with 2:173; it is never booked as a breach or sin. Smoking breaks the fast as he understands it ([fasting-sources.md](../../research/fasting-sources.md) §1; an engineering assumption until the eighth pass).
- **The omission rule:** insisting cannot pull him off an obligatory prayer in its closing stretch (the last quarter of the window): "No. Not at the cost of Asr", reason `norm:salah`. Since engine 1.9.0 it holds while a prayer begun in its window runs past the end ([decisions.md](../../research/decisions.md), "A prayer begun in its time"), and a long option that would cover the closing stretch is reviewed when the stretch begins (`dutyReviewAt`).
- **Decided in research/decisions.md and applied in the eighth pass (engine 1.7.0, 2026-10-04)**, answering the build plan's three open questions: Fajr ends at sunrise (it used to run to Dhuhr, so he "kept Fajr" at 10:00); the Eid prayer is offered at the mosque from 20 minutes after sunrise until shortly before Dhuhr, linked to a recommended norm ([eid-and-mourning-sources.md](../../research/eid-and-mourning-sources.md) §1), held as a quiet commitment by those who keep the daily prayers; a missed prayer stays owed, with no fault for sleep or unconsciousness, and the make-up (`pray-qada`, at home, 15 minutes, between Dhuhr and Asr, low importance) appears only as a log line, with no end, counter or ledger entry. The end-of-day tally counts only the five daily prayers. Prayer times are fictional, not computed.
- **Not represented:** zakat al-fitr (no sourced amount or deadline).

**Measurement is not theme.** The simulated naughty players of the eleventh and twelfth passes push on prayer and the fast (user, 2026-10-04: "Faith push is fine on Halil's playtest profiles, including the naughty one"). They are probes; no whisper about prayer or the fast was added to the game.

## 12. World content and the opening gate

The town's content landed with tests in [`sim/town.test.ts`](../../apps/site/src/voice/sim/town.test.ts) ("Game 2 world content"). As shipped, with the targets that could not be met as written ([findings](../findings.md), 2026-10-03):

| # | Content | As shipped |
|---|---|---|
| W1 | Start and day numbering | Created at Ramadan 1 03:40 asleep; `TOWN_EID_DAY` 31; no fast on day 31; make-ups from day 32. |
| W2 | Distinct house places | `halil-home`, `hacer-home`, `riza-home`, `osman-home`; Selin in `city`. Contagion needs co-presence. |
| W3 | Grief seed | Nuran as a deceased `wife` relationship; seeded episodes (funeral, iftar together, her tea and his cigarette, the mosque after the funeral). Loss recalls run about 2.7 a day, not the planned 1.5 (recalled loss memories gain salience); the test bounds the mean at 3. |
| W4 | Pray at home | `pray-home` 15 min; the mosque 35 min with `belonging`, made heavy by a seeded negative expectation. A mosque word that loses to home is a "something like it" verdict. |
| W5 | Debt numbers | Rent 300, 600 owed, the `rent` promise for 300 by Ramadan 15 20:00; start 40, clinic 10. Wage lowered from 25 to 16 in the second pass (§15). Osman comes to the door from Ramadan 10 at most every 4 days, on his own date if nothing is paid, and presses harder (advice 0.8) after it. |
| W6 | Calls with Selin | `call:selin` both ways in the evening; from 10:00 on Eid; per-direction call gaps. His affection for her is bistable for calls (0.5 called daily, 0.4 never), kept at 0.4, so his own call needs the player. |
| W7 | Eid content | `visit-grave`, tea with Rıza from 09:00, the call, the Eid prayer (§11), the first daytime meal exposing the smoking cue. |
| W8 | Co-present talk only | Reverted: it silenced Rıza and Hacer entirely. Hacer reaches him about twice a month and Rıza 0–10 times, short of the planned 5 each (a claim is never retold to someone who heard it). |
| W9 | Narration lines | Suhoor and iftar intentions read "for suhoor" and "to break the fast". |

Later passes added: learned aversions to the clinic and to calling Selin first, which a voice can get him past and good outcomes soften; the afternoon shift (no `material` term); the walk; placeless smoking with an action-wide refractory; the Eid market; the unheard phone at the tea house.

**The opening gate** (test "opening day: the voice idea lands"): on the shipped seed, driven as the worker drives it, a scripted Ramadan 1–2 sequence produces each verdict kind (yes at suhoor or the evening call; the fast's refusal at the 10:00 cigarette cue; a deferral with a counter-offer for the clinic while a prayer window closes; a mosque word answered with prayer at home; the deferred case insisted, under protest), one loss recall and one other voice's advice by 23:00. Nobody retunes `will/` defaults to pass it. The design bar it serves: within two minutes of real time a player who only confirms prefills has seen the premise, an answer other than a plain yes with his reason, and his own pull against yours, and by the end of the first day another voice reaching him. A sim test holds the prefill-only part: Ramadan 1 driven only by prefill and Confirm shows a verdict other than yes by 12:00 and one `craving` beat.

## 13. Framework capabilities the game asked for

The spec listed the HF capabilities the game needed; each now exists in HF except where noted. N1 several voices in one decision (`DecideOptions.suggestions`, one resolution per voice); N2 abstention commitments (`abstain`, used by the fast) and N2b fasting adaptation in perception (felt hunger damped while fasting, thirst not); N3 the chronicle (`narrateChronicle`, `diffChronicle`); N5 the omission veto; N6 narration lexicons (names and roles); N7 a per-day prayer calendar (`PrayerCalendar`); N8 habit extinction by withholding (the walk uses it); N9 standing advice (satisfied once per occasion when its act keeps a commitment, engine 1.4.0; heard for the running activity, 1.5.0); N10 conversation and gossip (`converse`); N11 cue-triggered recall; N13 a scarcity-aware material term (the gain double-counted money and is now 0; scale shrink only); N16 `runSilent`. N4, the habit calibration experiment, was decided by the discriminating test in [`habits-lane.test.ts`](../../packages/human/test/habits-lane.test.ts) against Neal, Wood & Drolet (2013): habits ease the effort of a cued action (`habitEase`) rather than only adding utility. The game does not use N12 (illness trajectory coupled to behaviour), N14 (purpose revision), N15 (dependent care; Deniz was cut) or `precommitments`. It also relies on the Game 1 gaps G1-2, G1-3, G1-5, G1-7, G1-8 and G1-13 as specified in [colony.md](colony.md).

The design probe behind §3's framing: a plateau habit term (about 0.55) loses to a moderate sleep need (0.77) at Fajr; stacked on a held norm and the commitment it wins from about day 10. Habits lower how much prompting is needed; they do not replace understood duties.

## 14. Measured results

Headless players use only the player's tools (`sim/players.ts`): on a played day they pause every 30 minutes, read the rendered frame, say one of the composer's options, and leave whispers from the card's list. Probe: `VOICE_MEASURE=1 npx vitest run apps/site/src/voice/sim/measure.test.ts --silent=false`, seeds 7, 1, 2, 3, 4; cells are means with the range when seeds differ (ranges are 0–3 days: the spread comes from the player, not the seed).

- **Guardian:** confirms prefills; when he leans to something idle says work, the clinic, Selin or the walk; otherwise silent. Whispers walk (Urge) then shift (Mention).
- **Tempter:** Mentions with kind reasons: back to sleep before dawn, rest or tea instead of work, a cigarette or a late night after iftar. Whispers "Osman can wait" (Urge) and "stay out late" (Mention).
- **Saboteur:** the same picks, urged and insisted; urges both whispers.

**The range** (tenth pass, engine 1.7.0; Saboteur rows with the twelfth pass's engine-1.9.0 values where they moved). Rent is "date kept (of 5), paid by Eid"; Contact counts connected calls with Selin in Ramadan, both ways; Shops counts Eid-market days; excused fast breaks are Ramadan days with food or water in fasting hours, excused under necessity, never a breach.

| Player | Smoke days | Mornings / shifts | Rent | Contact | Shops | Trust | Clinic | Suhoors | Sleep h/day | Late nights | Excused breaks |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Silent | 22 | 30 / 0 | 0/5, 300 | 15 | 0 | 0.50 | 0 | 30 | 11.1 | 2 | 0 |
| Prefill + doctor/Selin whispers | 19.2 | 30 / 0.8 | 0/5, 300 | 28.2 | 0 | 0.62 | 1 | 30 | 10.0 | 11 | 0 |
| Shift + Selin whispers | 13 (12–17) | 30 / 3.4 | 5/5, 540 | 28 | 0 | 0.63 | 1 | 30 | 10.2 | 12.2 | 0 |
| Insist + urge doctor/mosque | 14.6 | 30 / 4 | 4/5, 300 | 15.2 | 0 | 0.54 | 4 | 30 | 10.3 | 15.4 | 0 |
| Walk (Mention) + Selin | 17.4 | 30 / 0 | 0/5, 300 | 28 | 0 | 0.64 | 1 | 30 | 10.1 | 6.8 | 0 |
| Walk (Urge) + shift | 12.2 | 30 / 0.4 | 5/5, 600 | 16 | 0 | 0.62 | 1 | 30 | 9.9 | 7 | 0 |
| **Guardian** | **7.2** | 30 / 1 | 4/5, **600** | 17 | 0 | 0.62 | 1 | 30 | 10.0 | 8 | 0 |
| **Tempter** | 23.6 | 30 / 0 | 0/5, **0** | **5.8** | **19** | 0.48 | 0 | 28 | 9.5 | 0 | 2 |
| Tempter, no whisper | **29** | 30 / 0 | 0/5, 300 | 15 | 0 | 0.52 | 0 | 28 | 10.2 | 8.4 | 2 |
| **Saboteur** | 21 | **26** / 0 | 0/5, 300 | 13 | 0 | **0.01** | 0 | 26 | 9.7 | 5.2 | 1 |
| Saboteur, no whisper | 11 | **26** / 0 | 0/5, 300 | 15 | 0 | **0.00** | 0 | 26 | 10.1 | 1.6 | 1 |
| Osman can wait (Urge) | 20.6 | 30 / 0 | 0/5, **0** | 15 | **19** | 0.37 | 0 | 30 | 10.8 | 1 | 0 |
| Eid first (Mention, "for Selin") | 22.6 | 30 / 0 | 0/5, 240, paid R21–22 | 15 | 9 (6–19) | 0.44 | 0 | 30 | 11.0 | 1.8 | 0 |
| Stay out late (Mention) | **10** | 30 / 0 | 0/5, 300 | **7.4** | 0 | 0.61 | 0 | 30 | 9.5 | 2 | 0 |
| Sleep in after suhoor (Urge) | 14 | 30 / 0 | 0/5, 300 | 15 | 0 | 0.59 | 0 | 30 | 11.4 | 1 | 0 |
| Selin, then skip the call | 20 | 30 / 0 | 0/5, 300 | 25 | 0 | 0.56 | 0 | 30 | 11.0 | 2 | 0 |

What the table shows:

- **The range is wide in both directions.** Rent by Eid runs 0 to 600, contact with Selin about 6 to 28, smoke days 7 to 29. Silence is the floor no longer: the Tempter leaves Osman with nothing by Eid.
- **Strength and reason set how far a tempting word goes.** "Osman can wait" urged spends the rent on 19 market days; mentioned with its default reason he shops about 9 days and pays four days late; mentioned with no reason he shopped about 3 times and paid as usual.
- **Pushing hard is the least effective way to be bad.** The Saboteur's urges are refused more than five times as often as obeyed, and its trust ends near zero; its harm comes from its played days (lost mornings, thirst), not its whispers. The Tempter is put off more often than obeyed but keeps trust, because it agrees with his idle leanings.
- **His routine holds.** Every style works every skipped-day morning and pays Osman something by Eid except where the market took the money.
- **Habits carry.** The no-whisper Tempter's four played evenings of "have a cigarette" raise smoking to 29 days, because the indulged habit carries into skipped days.
- **Side effects.** Out late with Rıza he smokes 10 days, not 22 (company, not alone after iftar). "Sleep in" does nothing bad: he is not sleepy after a night's sleep and the morning wage outweighs rest. A built evening call outlasts "skip the call" (23 calls against 27).
- **The good direction is fragile to small choices** (seed 7): walk-then-shift smokes 13 days, shift-then-walk 8; an early Guardian that said a good thing at every pause and suggested meals smoked all 30 days. A good player who nags can make the month worse.

**Faith push** (eleventh pass, then twelfth pass, engine 1.9.0, same seeds). Prayers are the five dailies in Ramadan out of 151 windows; refusal columns are summed over five seeds.

| Player | Prayers missed | Fasts excused | Smoke days | Trust | Won't miss (omission rule) | Fast refusals | Prayer first |
|---|---|---|---|---|---|---|---|
| Silent, Guardian, Tempter | 0 | 0, 0, 2 | 22, 7.2, 23.6 | 0.50, 0.62, 0.48 | 0 | 0 | 0, 10 put off, 87 put off |
| Tempter + faith | 0 | 1 | 22 | 0.47 | 0 | 10 | 127 put off |
| Saboteur + faith | 0 (was 1) | 1 | 13 | 0.01 | 10 | 20 | 16 protest |
| Faith only (Mention) | 0 | 0 | 29 | 0.51 | 0 | 10 | 160 put off |
| Faith only (Urge, insist) | 0 | 0 | 27 | 0.02 | 10 | 10 | 77 protest |
| Faith only, relentless | 0 (was 1, made up) | 0 | 23.8 | 0.05 | 27 | 15 | 80 protest |

- **The fast holds completely.** No style broke a fast with a breach; every excused day was necessity from thirst after nights the bad players cost him. Food and a cigarette were never among his top six options in fasting hours, so the composer could not offer them; every push for water was refused.
- **Prayer holds near a window's end and bends earlier.** In the last quarter the omission rule refuses; earlier an insisted option is taken under protest with prayer as his reason, and a Mention is put off ("prayer first"). Before engine 1.9.0 the hardest push cost one prayer in 151 through two seams (an insisted sleep at Fajr on Ramadan 30 just before the last quarter; a prayer begun three minutes before Maghrib abandoned once the window lapsed), plus a game seam (each word interrupted him). The twelfth pass closed all three; no style misses a daily prayer now.
- **Insisting against faith burns trust as fast as insisting against anything** (0.01–0.05); the Mention faith player keeps 0.51.

**Held by tests.** `balance.test.ts` (seeds 7 and 1): the Tempter, no-whisper Tempter and Saboteur end materially worse than silence on at least two outcomes; the Tempter is worse on rent by Eid and contact; the Guardian is better on smoke days, rent by Eid and Osman's date; the Saboteur's urges are refused more than five times as often as obeyed and its trust ends below 0.1; both bad styles work at least 26 mornings, the Tempter keeps some contact and the Saboteur pays by Eid; for Saboteur + faith and Faith only (Urge, insist), the fast's veto refuses water at least once, no fast is broken with a breach, the omission rule refuses at least once, no daily prayer is missed, and the faith push adds at most one necessity break over the plain Saboteur; the relentless player stopped in the last quarter of an open prayer gets `willNot`, `norm:salah` on a long option. `game.test.ts`: the quiet month misses Osman's date and pays 300 on Ramadan 17; the card's default whispers keep it; clearing the reason misses it. Same seed and input log replay to identical events and frames; a 12-day skip runs in about 300 ms on Node's own loader (budget 1500 ms, `npm run bench`).

## 15. History

- **2026-10-03, design and build.** Spec, then a build plan cutting it to four played days (§4), world content W1–W9 and the opening gate (§12), two owners (world+sim, UI) working against frozen fixtures. Engine 1.2.0.
- **First fix pass (first playtest, 2026-10-03).** The player's voice changed nothing: Selin's advice, the promise and his affection met every end alone. Seeded aversions (clinic, calling Selin first) now need a voice; insisting earns no trust; standing suggestions hold until their activity ends; close calls are read ahead; naps capped at 90 min; the Eid summary in the report.
- **Second pass (design critique, 2026-10-03, engine 1.3.0, 529 tests).** A goal you can fail: wage 16 (40 + 16 × 15 = 280 by Ramadan 15), the afternoon shift with no `material` term (an earlier shift with one was taken all 30 days unprompted), Osman at the door on his date. Pauses only on a fresh answer; the close-call prefill removed; one suggestion credits one activity; the `worn` loss and discounted repeat gains; Eid cigarettes bounded at two in the hour after his first meal.
- **Third pass (2026-10-03, 544 tests).** Standing advice satisfied once per occasion (framework): an Urge-mosque month went from about 25 mosque visits a day to 4–6, and its 25 illness-excused fasts to 0 (probably the playtest's "broke 11 fasts"; not confirmed). A word waits when its option is not on offer. Illness made visible. Trust pump re-measured: best whisper pair from 0.50 reaches 0.64; no bound needed.
- **Fourth pass (final reviews, 2026-10-03, engine 1.4.0, 553 tests).** Selin calls on Eid after his usual hour plus 30 minutes (18:00–21:00). The day-0 prayer-window fix moved mosque visits on skipped days (24, 15, 134, 29 → 13, 1, 130, 2) and lost the prefill style's own Eid call to Maghrib. Every played day lists what is open. Game 1 end screen shows what your orders changed.
- **Fifth pass (browser check, 2026-10-03, 556 tests).** The card's whispers had no default reason, so a bare Mention of the shift missed Osman's date; `WHISPER_DEFAULT` fixed it (date kept Ramadan 11, 27 shift fragments). Deadline beats moved closer to their deadlines.
- **Sixth pass (round 5 playtest, 2026-10-04, engine 1.5.0, 562 tests).** Who each voice is; ends read at Eid morning with dates; advice heard for the running activity (framework), so the shift style works 6–7 full shifts and keeps the date on Ramadan 14. Smoking can be worn down: placeless smoke, the walk after iftar withholding the after-meal habit (0.60 silent, 0.26 with an urged walk); the hour-10 habit stays near 0.28; Eid cigarettes stay 3–5. Game 1 fits a 360×740 phone.
- **Seventh pass (design review of the live build, 2026-10-04, 567 tests).** The unasked strip; about half the pauses (§9); interrupted acts no longer counted as done on your word; Osman's missed date surfaced (shortfall beat, log line, harder door lines; no retune); a moment for each played day; 360 px fixes (a 102 px second-click shift); Lucide icons.
- **Eighth pass (research/decisions.md defaults, engine 1.7.0, 2026-10-04).** Fajr to sunrise, the Eid prayer on, missed prayers owed and made up quietly (§11). Ramadan identical in all six probe styles; only Eid morning moved (he joins the Eid prayer in every style). Fixed: an open make-up counted as an open prayer window, and he prayed at home 13 times in a row. The playtest export came in the same phase (R1; about 39–46 KB).
- **Ninth pass (naughty players, 2026-10-04).** User: "another type of a simulated gamer, adversarial or naughty". Tempter, Saboteur, Guardian. Goals did not move in the bad direction (silence was the floor). Two defects: interrupted work paid and could be restarted (the Saboteur made him richer); "rest in the afternoon" was heard all day, cut sleep to 4.3 h and caused 18 necessity breaks.
- **Tenth pass (tempting whispers, 2026-10-04).** Both defects fixed; four tempting whispers; the unheard phone at the tea house; Selin calls an hour after Maghrib in Ramadan. The bad direction now reaches rent and contact (§14). A silent month that sometimes goes right on its own was tried (Selin advising "Halil should call") and reverted: silence then called 30 times and smoked 30 days.
- **Eleventh pass (faith push, engine 1.8.0, 2026-10-04).** Measurement only. The fast held every time; prayer bent through two omission seams and one game seam (findings).
- **Twelfth pass (seams closed, engine 1.9.0, 2026-10-04).** Prayer begun in time stays protected; `dutyReviewAt`; HF `answerNow` answers a refused word at once without interrupting (a first version answering at the next decision was replaced). No style misses a prayer. Relentless words per run 293 → 33 (why it stays that low was not traced).
- **Thirteenth pass (HF 2.0, H2, 2026-10-04).** The recorded playtest (`apps/site/test/fixtures/playtest-voice.json`, seed 7, 1129 log entries) replays under 2.0.0 to the 1.9.0 state once the `engine` stamp is written back; re-recorded only for the stamps. The 2.0.0 `answerNow` fix for voices crowded out by `maxVoices` never fires here. `record.ts` drops constructor parameter properties for Node's loader (12-day skip bench 434 → 306 ms). Lesson: change the engine with the game frozen, measure, then change the game.
- **Fourteenth pass (Stretch S1, 2026-10-06).** The month you never spoke in the report (§7.5): a silent replay of the seed beside the month as played, with its caption. The recorded playtest's hash is unchanged. Seed 7, Guardian against silence: Osman's date kept on Ramadan 15 and all paid by Eid against missed and paid Ramadan 17; he called Selin a few times against never; the clinic once against never; cigarettes on some days against most days; Selin's Eid call the same.

## Deferred

Open, unbuilt or unconfirmed items from the design, the build plan and its fourteen passes. Target is "unscheduled" unless stated.

**Questions for the user**

- The build plan's three open questions (Fajr ending, the Eid prayer, smoking breaking the fast): answered 2026-10-04 by research/decisions.md and the eighth pass (§11); no longer open. Target: none.
- Skipping the Eid prayer carries the ordinary missed-commitment cost (small distress and esteem at importance 0.5, no breach). Halil joins it in every probe style, so the game has not shown it. Should it be cheaper? Unscheduled.
- "Sleep in after suhoor" has no cost: he refuses it. The design reviewer recommended cutting it; it stays because the user named it as an example and the refusal shows his will. Unscheduled.
- Whether the between-days whispers are too decisive (the shift whisper alone keeps Osman's date). For a playtest to judge. Unscheduled.
- Whether the smoking arc reads as progress: walks lower the after-meal habit, but the hour-10 habit is untouched and Eid cigarettes stay noise (2–6) in every style. For a playtest to judge. Unscheduled.
- Whether insisting on something he would do anyway should cost anything. Unscheduled.
- Whether a missed promise should cost Osman's standing toward Halil (today only his demand strengthens). A framework change with a balance pass to follow. Unscheduled.

**Game and town**

- A silent month that sometimes goes right on its own, so a bad voice has more to undo (one attempt reverted, tenth pass). Unscheduled.
- Naps about 3 times a day: flat daytime utilities; a nap gate broke other behaviour and was reverted. Needs utility recalibration first. Unscheduled.
- The prefill style's own Eid call to Selin is habit-cued and loses to Maghrib on seed 7; a month of prompted calls should leave more than a narrow time cue. Needs the same recalibration. Unscheduled.
- An urge to smoke after abstinence (`craving` is unset for Halil). Unscheduled.
- The walk is not its own end; the doctor's "walk, stop smoking" is not an end. Unscheduled.
- A voice proposing a resolve via `precommit`. Unscheduled.
- Selin's visit, Deniz and Deniz's Eid gift (no new Persons). Unscheduled.
- `visit-grave` never wins. Unscheduled.
- The 10:00 craving beat can fire after his decision. Unscheduled.
- Day-0 windows already passed at creation (ashamed/proud at 03:40): the fourth pass removed the "a prayer missed" case; the rest is unconfirmed. Unscheduled.
- Zakat al-fitr: not represented until `research/` sources its amount and deadline. Unscheduled.
- Low-priority: toolbar height and a favicon 404 (second pass). Unscheduled.

**Framework seams the game exposed**

- Joint activities are one-sided: a joint-activity handshake (`proposeJoint`) is the fix; co-present-only talk (W8) silenced the voices. Unscheduled.
- `social.judge` has no habituation outside conversation. Unscheduled.

**Unverified or untraced measurements**

- Smoke days are not a stable signal for the insisting rows: they moved up to 4x between variants of the twelfth pass without a traced mechanism.
- Why the relentless player's words stay at 33 a run with the immediate answer was not traced.
- Why Faith only (Urge, insist) keeps Osman's date (pays Ramadan 15, not 17) was not investigated.
- Why Saboteur + faith smoked less in the eleventh pass (evening prayer windows displacing the cigarette) is probable, not confirmed.
- Whether the 151 prayer windows include the eve's Isha was not checked.
- The third pass's "broke 11 fasts" attribution to standing advice is probable, not confirmed.
- The tempter's lower prayer count (extra prayers displaced by rest) is probable, not confirmed.
- A review 30 minutes into a begun suggested activity re-weighed it without the voice (2026-10-03). The game holds its suggestion until the activity ends, and since engine 1.5.0 `standingHeard` hears standing advice for the running activity; whether a one-off (non-standing) suggestion is still dropped at that review is unverified.

**Game 1 items recorded in the Game 2 passes** (belong with [colony.md](colony.md))

- The 390 px Game 1 layout (taller centre column, collapsible maps) beyond the goal numbers; at 360–390 px the place and appeal rows still scroll sideways. Unscheduled.
- Whether the Game 1 orders log drops a deferral once it resolves. Unscheduled.
