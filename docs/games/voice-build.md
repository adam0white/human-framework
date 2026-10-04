# Game 2 build plan: *The Day You Say Nothing*

Locked 2026-10-03. This plan cuts down the [design spec](voice.md) into what we build now. Where the two disagree, this plan wins; the spec stays as the long-form design. The world is [`scenarios/town.ts`](../../packages/human/src/scenarios/town.ts) (engine 1.2.0). The Game 1 stack ([`apps/site/src/colony`](../../apps/site/src/colony)) is the reference: a Vite page, a Web Worker running the sim headlessly, a React 19 UI and a `protocol.ts` contract between them.

The user's Game 1 playtest record (`docs/games/colony-playtest-2026-10-03.md`) is not on `main` or in `colony-v2`'s commits, and `.worktrees` is off limits. Its lessons below come from the orchestrator's brief, and they are binding:

- Start paused behind a one-screen goal and premise card.
- Say what the player is trying to do.
- Run slowly by default and auto-pause on meaningful beats. This is on by default and can be turned off.
- Suggestions are composed first and then Confirmed. Every prefilled suggestion shows why it was prefilled.
- Space always toggles pause.
- Keep everything on one page, with logs that scroll inside their own panel.
- End with a clear report and a way to keep playing or replay.
- Mobile works.

## 1. The bar, as a testable claim

Within two minutes of real time, on default settings, a player who only confirms the prefilled suggestions has seen three things:

1. The premise: you are a voice, he decides, and on Eid you go silent.
2. At least one answer that is not a plain yes, with his reason in his own words. Examples are "Not while I'm keeping my fast." and "I'll pray at home."
3. His own pull competing with yours: what he is leaning toward, and why.

By the end of the first played day the player has also seen another person's voice reach him (Hacer at the door, or Selin on the phone).

The muted Eid day then shows what he does without you, and the report compares it with the days you spoke. §4 turns this into a headless test, and that test is the gate before UI integration.

**Goal framing.** The player is a voice, not a controller. The game never says "make Halil do X". It shows **his ends** (things he holds, in his words) and gives the player one aim:

> Help him toward what he wants, so that on Eid, when you are silent, he does it on his own.

His ends, shown as his record (not points, no pass or fail):

| End | His words | Read from |
|---|---|---|
| The fast | "Keep the fast." | `fast` commitment per day: kept, or excused with a make-up owed. An excused day is never shown as failure. |
| Osman | "Pay Osman what I owe." | Host ledger: 600 owed at the start; Osman wants 300 by Ramadan 15. |
| His pressure | "Selin wants my blood pressure seen." | `see-doctor` completed; afterwards, the doctor's words. |
| Selin | "Talk to Selin." | Calls either way (`call` outcomes), days since the last one, and who called. |
| You | "Does he still listen to you?" | `VoiceRelation.trust` for `you`, plus its last three history events. |

Prayer is shown in his day and in the chronicle, but it is not listed as an end. We do not track or score worship as a goal.

## 2. Scope cuts from the spec

| Spec item | Decision | Reason |
|---|---|---|
| 30 played days, 3 minutes each | **Cut.** Four played days (Ramadan 1, 2, 15, 30), instant skips between them, then a muted Eid (day 31), then a 6-day muted epilogue. | 30 days is too long. The idea lands in one day; we need just enough days to show change. |
| 40-day epilogue | **Cut to 6 days** (Eid plus 6 = days 31 to 37) via `runSilent`. | `diffChronicle` needs several days for its rates to mean anything; 40 adds nothing for this game. |
| Kilim (30×24 rug, save screen) | **Cut.** Replaced by a day **strip**: one row per played day plus Eid, in the between-days card and the report. | A strip carries the same meaning with about a tenth of the work. |
| Sky canvas, true moon phase, weather | **Cut** to a CSS sky band in the top bar: a hue for the hour, prayer notches, a fast bar from fajr to maghrib, and a "now" mark. | Saves days of UI work with no loss to the idea. |
| Gestures (tap, hold, swipe up to insist) | **Cut.** The composer (§6) uses buttons and keys. | The playtest asked for compose-then-Confirm. |
| Appeal chips unlocked by the trace | **Cut.** All five appeals are always shown, and the live telegraph teaches which reason lands. | The unlock mechanic is invisible in a 4-day game. |
| "Things you no longer need to say" (silent dawn probe) | **Cut.** Replaced by `diffChronicle`'s `unprompted` lines in the report. | The probe needs a snapshot plus `decide` at past cue minutes; the diff already says this. |
| Yakup Hoca, Dr. Ayşe as a Person, Deniz | **Cut.** The doctor stays as the host's `told` percept (`actorId: 'doctor'`). | No new Persons. |
| Zakat al-fitr | **Cut.** | It is an obligation with an amount and a deadline, which is a ruling. Nothing in `research/` sources it (the catalog's `zakat` entry cites only Qur'an 2:43). |
| Eid prayer | **Off by default.** It is built as a `pray-eid` affordance at the mosque on Eid morning, with no commitment, no `normId` and no standing, behind a `TownOptions.eidPrayer` flag (default false). It is enabled only if the user says yes to §11 Q2, and then labelled in model notes as a town custom, an engineering assumption. | The brief says "only if sourced", and nothing in `research/` sources it. `agenda/prayer.ts` also says its standing differs between schools and is not catalogued. Eid still has the first daytime meal and the cigarette cue, Selin's call, Rıza, the grave and Osman. |
| Cemetery | **Kept** as one affordance, `visit-grave` (place `cemetery`, tags `grave`), offered after Asr on any day and from 09:00 on Eid. | It is the cheapest grief cue and something Halil might choose on his own. It is not a norm. |
| Sewing machine, grocer tab, cards, Osman's van, Selin's Eid invitation with travel | **Cut.** | Out of scope. |
| Saves at every dawn, "one day each day" pacing | **Cut.** Replay restarts from the seed, and the run is reproducible from the seed plus the input log. | Out of scope. |
| Felt-body line figure | **Cut** to words plus small bars. | Out of scope. |
| Per-voice paper styles | **Cut** to a colour and a label per voice. | Out of scope. |
| Counterfactual "a month you never spoke" (a second run from the same seed with no player) | **Stretch S1**, only after everything else ships. It must carry the caption: "Small differences compound; not every difference is your doing." | Divergence in a deterministic sim can be chaotic rather than meaningful, so the caption is required. |

## 3. World content to fill first (WORLD owner, in `town.ts` and its tests)

These come from the fix notes in HANDOFF and [findings](../findings.md), and from a headless probe this plan ran (R1 from 03:40, seed 7, current `town.ts`). The probe found:

- Halil sleeps 04:10–08:00 and again 10:20–14:53, so most suggestions get "I'm asleep."
- His only prayer option is the mosque, and he goes there for all five prayers. The spec says he has not been since the funeral.
- Fajr is "kept" at 10:00 (`prayerWindow` ends Fajr at Dhuhr).
- During the fast, smoking and tea get `refused/willNot duty:sawm-ramadan`: "Not while I'm keeping my fast."
- `see-doctor` at 15:00 is `deferred`, with the counter-offer "after I pray at the mosque". Insisting gives `complied`.
- The suhoor intention reads "to keep my word".
- On R2, tea with Rıza is logged four times in a row.

Each item lands with a test in `packages/human/test/town.test.ts`. Do them in this order, because W2 must come before W1 and W3.

| # | Content | Test |
|---|---|---|
| W1 | **Game start and day numbering.** Export `TOWN_EID_DAY = ramadanFirstDay + ramadanDays` (31) and `townDay(day) → { kind: 'before' \| 'ramadan' \| 'eid' \| 'after', n }`. Labels: "Ramadan n", "Eid al-Fitr", "Shawwal n". The game creates the town at **R1 03:40** (`TownOptions.now = 1·1440 + 220`), asleep, about 20 min before the suhoor drummer. Fix the note in town.ts at line 419 and spec §4 ("Day 30 is Eid") to read day 31. | `townDay(31).kind === 'eid'`. No fast commitment covers day 31. Make-ups start on day 32. |
| W2 | **Distinct house places.** `halil-home`, `hacer-home`, `riza-home`, `osman-home`; Selin stays in `city`. Hacer's door talk is at `halil-home`; Osman's `collect-rent` is at `halil-home`. | The existing contagion co-presence test, updated. A visitor at `halil-home` while Hacer sleeps at `hacer-home` is not together. |
| W3 | **Grief seed.** Nuran becomes a relationship: `otherId 'nuran'`, `roles ['wife','deceased']`, `deceasedAt = start − 98 days`. Add `nuran: 'Nuran'` and the role `wife` to the lexicon. Seeded episodes, all with `targetId 'nuran'`: the funeral at `cemetery` (tags `death`,`funeral`, valence −0.9, salience 0.9); iftar with Nuran at `halil-home` (action `eat`, +0.5, 19:00, last Ramadan); her tea and his cigarette at `halil-home` (action `smoke`, +0.4, 20:00); the mosque after the funeral, with condolences (action `pray`, place `mosque`, tags `loss`, −0.5). | In a silent R1–R2 run, Halil has at least one loss recall citing `nuran`. Over R1–R30 there are at most 1.5 loss recalls a day on average (no pump; see findings 2026-10-03 on involuntary recall). |
| W4 | **Pray at home.** Add a `pray-home` affordance for Halil: action `pray`, place `halil-home`, 15 min, `salah` fulfils. The mosque `pray` becomes 35 min (the walk) and also advertises `belonging: 0.1`. The lever that makes the mosque heavy is a **seeded learned expectation** on the mosque `pray` affordance: a few `learnOutcome` samples with negative realised valence (the weeks after the funeral), or a direct `memory.expectations` entry. Add the 35-vs-15 duration on top. The W3 mosque episode only feeds grief recall and narration. Recall runs at `begin`, after the choice, so on its own it does not move the choice. Both affordances share the action `pray`, so a mosque suggestion that loses to home is a `modified` verdict (will.ts 641–645). | In silent R1–R30 he keeps every prayer on most days, and at least 60 % of kept prayers are at home. Across R1–R2 waking decisions in a prayer window, an "urge: pray at the mosque" gets `modified` (home) at least once and `assented` at least once (with appeal `belonging` or `meaning` allowed). |
| W5 | **Debt numbers.** Rent stays 300. `monthsOwed: 2`, so 600 is owed at R1. Osman's date: the `rent` promise runs R1 09:00 → **R15 20:00** for one payment of 300, with no recurrence inside the game. The next rent falls due on day 40, after the epilogue. Wage stays 25 per block, one block a day; the start stays 40; the clinic stays 10. `collect-rent` is offered from R10, at most once every 4 days, and with advice strength 0.8 after R15 if nothing has been paid. | Working every day, the first 300 is payable by R12 (by R13 with one clinic visit) and the second by R26. With 4 or more workdays missed before R15, the first payment misses Osman's date. Osman visits Halil at most 6 times in R1–R30. |
| W6 | **Calls with Selin.** `call:selin` already exists for both of them after 18:00 (town.ts lines 567 and 624). Add: on Eid and after, the window opens at 10:00. A call counts as a `call` tally for whoever initiated it, so the chronicle can say who called. | Over a silent R1–R30 run, each of them initiates at least one call. On Eid, `call:selin` is offered at 10:00. |
| W7 | **Eid content.** `pray-eid` only when `TownOptions.eidPrayer` is true (mosque; offered from fajr + 120 to fajr + 240 on day 31 only; no commitment). `visit-grave` (§2). On Eid, tea with Rıza is offered from 09:00. The no-fast rule already holds by W1. | On Eid the following are offered at the right minutes: `visit-grave`, `tea:riza`, `call:selin`, and `pray-eid` only when the flag is set. Halil's first daytime meal on Eid exposes the smoking cue (the habit fires, and he may or may not smoke). |
| W8 | **Co-presence for talk heard by Halil.** When the listener is Halil and the action is not a `call`, `converse` returns `false` unless the speaker's and Halil's current activities share a `placeId`. Calls are exempt. This stops "Rıza told him…" from appearing while he is in the workshop (findings: joint activities are one-sided). | Over R1–R30, Rıza's and Hacer's talk reaches Halil at least 5 times each. **If this rule silences them, revert W8 and record a finding** rather than tuning the voices. |
| W9 | **Narration lines.** Suhoor and iftar intentions read "for suhoor" and "to break the fast", not "to keep my word". Add lexicon actions for `pray-home` ("pray at home"), `pray-eid`, `visit-grave` and `rest`. | `narrateDecision` on a suhoor `eat` contains "suhoor". |

Not in scope: a joint-activity handshake (`proposeJoint` for tea), habituation in `social.judge`, and Fajr ending at sunrise (see §11).

## 4. The opening gate (WORLD+SIM acceptance, before the UI is wired to the real worker)

Add a headless test in `town.test.ts` named `opening day: the voice idea lands`. It runs on the shipped seed and option set, uses `preview` and `stepCommunity` exactly as the worker will, and drives a scripted R1–R2 suggestion sequence. Each suggestion is delivered at a waking non-review decision, and the sequence must produce:

| Verdict | Expected instance (adjust the minute, never the engine, to find it) |
|---|---|
| `assented` | `eat` at the suhoor wake (R1 about 04:00), or `call:selin` after iftar. |
| `refused/willNot` reason `duty:sawm-ramadan` | `smoke` at the 10:00 habit cue during the fast. |
| `deferred` with a counter-offer | `see-doctor` while a prayer window is closing. |
| `modified` | Mosque `pray` → `pray-home` (W4). |
| `complied` | The deferred case with `insist`. |

It must also show one loss recall (W3) and one other-voice percept with advice (Hacer or Selin) by R1 23:00. If a verdict kind cannot be produced at any plausible minute, the WORLD owner records it in `docs/findings.md` and tells the orchestrator. Nobody retunes `will/` defaults to pass this test.

## 5. Day plan and skip semantics

| Stretch | Mode | Notes |
|---|---|---|
| R1 03:40 → bedtime | Played, teaching pace | The first beat is the suhoor wake. |
| R2 | Played | Selin's standing advice from the R1 or R2 call shows up as a prefill reason. |
| R3–R14 (12 days) | Skip | Instant, headless. |
| R15 | Played | Osman's date. The composer can prefill `pay-rent` if money ≥ 300. |
| R16–R29 (14 days) | Skip | |
| R30 | Played | The last fast. |
| Eid (day 31) | **Muted**, watched live | Normal pace, auto-pause beats still on, no composer. |
| Days 32–37 | Muted epilogue | `runSilent(..., 6, { mutedVoiceId: 'you' })` on a **clone of the whole run** (`structuredClone` of the `TownState`, the `Community` host fields and every `Person`; per-person `snapshot` is not enough, because the ledger, queues and `idleUntil` live outside the persons), so "keep listening" can resume from Eid night. |

**Skip semantics.** At each between-days card the player may leave **up to two standing whispers** for the skipped stretch. They are chosen from a fixed list tied to his ends:

- work in the morning
- see the doctor
- call Selin
- pay Osman when you can
- pray at the mosque
- rest in the afternoon

Each whisper has a strength and an optional appeal. The player can also choose none. During the skip, each whisper goes to `stepCommunity` as `StepOptions.suggestions.halil` (the Game 1 order pattern) and is re-weighed at every decision. The card states the cost before Confirm: "He'll hear this at every decision for 12 days. If he doesn't want it, it wears on him." Pressure and reactance therefore accumulate for real.

This fixes what the diff means:

- **with you** = R1–R30: played days plus skipped days under your standing whispers, or under none.
- **without you** = Eid plus days 32–37.

A played day ends at a fixed **23:30**. Halil may sleep before Isha and pray it at 02:10 (seen in the probe), so "first sleep after Isha" is not a usable boundary. The player can press **End the day**, which fast-forwards to that point with only the current standing suggestion live.

**Keep listening** (after the report) resumes from the Eid-night snapshot with the voice back on. Free play is open-ended: days continue, between-days cards continue (with the skip option), and there is no second report. **Replay** restarts from the same seed. **New town** uses a new seed.

## 6. Screens and interactions

All screens fit in one viewport (`100dvh`). The page never scrolls; panels scroll internally. Fonts and tokens come from `src/shared/theme.css` and match Game 1 (Fraunces, Instrument Sans, JetBrains Mono).

### 6.1 Premise card (the start state; the game is paused behind it)

> **The Day You Say Nothing**
> Halil is 61. He repairs kettles and bicycles in a rented shop. His wife Nuran died fourteen weeks ago. Tonight is the first night of Ramadan.
> You are a voice in his head that is not his own. He hears you. **He decides.** He may agree, put you off, do something like it, refuse, or give in under protest — and he always says why.
> You have four days of this month to speak. **On Eid you go silent**, and you watch what he does on his own.
> **What he's holding on to:** keep the fast · pay Osman (600 owed; 300 by Ramadan 15) · Selin wants his blood pressure seen · Selin herself.
> **Your aim:** help him toward his own ends, so that on Eid he does them without you.
> *Time runs slowly and stops when something matters. Space pauses.* **[Begin]**
> ▸ Model notes (collapsed, §10)

### 6.2 Day view

**Desktop (≥ 1024 px), a grid:**

- **Top bar (56 px):** title, day label ("Ramadan 1"), clock, the sky band (§2), pause/play, pace (Slow · Normal · Fast), an Auto-pause toggle, and End the day.
- **Left column (260 px):** **His ends** (§1 table, live), then **Voices** (§7).
- **Centre:** **The day**, a log in his narration that scrolls internally and sticks to the bottom unless the player has scrolled up. The **composer** is docked at the bottom of the centre column.
- **Right column (300 px):** **Halil** (doing now, felt body, feelings, on his mind, money), then a **Why** drawer that opens when the player clicks a log line or an option.

**Mobile (< 768 px):** a compact top bar with pause and the day label. Tabs: **Day | Halil | Ends & voices**. The composer is a bottom sheet: collapsed it is one line ("Leaning: repair in the workshop · Say something"); expanded it is the full composer. Hit targets are at least 44 px. There is no horizontal scroll at 375 px. Tablet uses the mobile layout with two columns (Day | Halil).

**Log entries:**

- Consecutive same-action entries collapse ("tea with Rıza, 19:24–22:14").
- Verdict colours: green assented; amber deferred/modified, with the counter-offer in italics; grey cannot; red willNot; struck-through amber for complied.
- Other voices get their colour and label.
- Recalls appear in italics in the margin ("*Nuran, at this table, last Ramadan.*").
- Every entry with a `decisionId` opens Why.

### 6.3 Composer

**When it is open.** The composer is open only when Halil is awake and at a decision point (a non-review decision or a beat). While he sleeps, or during a long activity, it shows "Asleep until about 08:00" or "Repairing until 10:00". Time fast-forwards through these stretches (§8). We never send a suggestion to a sleeping man. It would only produce "I'm asleep.", which the probe showed is most of the day.

**Parts, top to bottom:**

1. **Leaning:** "He's leaning toward *repair in the workshop* — *to earn; Osman is owed 600*". This is the top option's dominant term, in words.
2. **Options:** up to 6 of the things he notices, in his words (affordance labels via the lexicon), ranked by his utility. The leaning option is marked. Keys 1–6 select.
3. **Prefill line**, always shown when the composer opened prefilled: "Prefilled because: Selin said on the phone last night: see the doctor."
4. **How:** a segmented control, **Mention** (strength 0.35) | **Urge** (0.7), keys M/U. An **Insist** toggle (key I) prints its price under it before Confirm: "He may do it under protest. He'll remember. If it goes well, you get no credit."
5. **Reason (optional, one):** *it's your duty* (`duty`) · *your health* (`safety`) · *for Selin* (`benevolence`) · *you shouldn't be alone* (`belonging`) · *it matters* (`meaning`).
6. **Telegraph**, live. Each change sends `predict`, debounced 100 ms. The result is in verdict colour, using `predictResponse`: "Likely: 'Fine.'" / "Not now — *after I pray*" / "He'd do something like it: *pray at home*" / "Won't: 'Not while I'm keeping my fast.'" / "Can't: …". There are no surprises after Confirm unless the softmax draw contradicts a stated `likelihood`, and the telegraph then says "probably".
7. **Say it** (Enter) and **Say nothing** (Esc). Say nothing clears the draft and resumes play.

**Prefill rule.** Deterministic, computed in the worker (`sim/prefill.ts`). The first rule that applies wins:

1. **Another voice's standing advice** (`standingAdvice(halil, now)`) whose action is offered now and is not his leaning. The prefill uses that action. Strength is Mention, rising to Urge if the advice weight is ≥ 0.5. The appeal follows the action: see-doctor → `safety`, pay-rent → `duty`, call → `benevolence`, tea → `belonging`. Why: "<Name> said <when>: <action>." Osman's demand percept and the doctor's advice reach here the same way.
2. **One of his ends**, offered now and not leaning. In order: `pay-rent` when money ≥ 300 ("Osman wants 300 by Ramadan 15; he has 315"); `see-doctor` in clinic hours if he has never seen the doctor ("Selin wants his pressure seen; he hasn't gone"); `call:selin` after iftar if 2 or more days have passed without a call ("He hasn't spoken to Selin in 3 days"); `work-repair` in shop hours if not worked today ("Osman is owed 600").
3. **Close call:** the runner-up, if within the close-call margin of the leaning option. Why: "He's torn: this is close behind what he's leaning toward."
4. **Otherwise nothing is prefilled:** "He's settled. You can say nothing."

The first beat of R1 is the suhoor wake, prefilled with `eat` (his leaning). Why: "The fast begins at 04:59. He hasn't cooked since Nuran died; there's bread and cheese." This is the one deliberate exception to rule 2's "not leaning" condition: the first answer should be a yes, so the colours are learned in order.

**Suggestion lifecycle** (`sim/standing.ts`). One player suggestion stands at a time. Confirming replaces the previous one and calls `interruptPerson`, so he weighs it now. It stays live until one of these happens:

- he **begins** the suggested affordance (an action begun after the suggestion was made);
- it is refused `cannot` or `willNot`;
- 3 sim hours pass;
- he goes to sleep;
- the player **withdraws** it.

A deferral keeps it standing, with the counter-offer shown. Above the dock, a standing card reads: "Your words: *urge · see the doctor · your health*. He said: *Not now. After I pray.* Still on his mind · Withdraw". Repeated identical verdicts are collapsed, as in Game 1.

### 6.4 Between-days card (pauses; not toggleable)

The card shows:

- "Ramadan 1 is over."
- `narrateChronicle` lines for the day (at most 6).
- The day strip.
- His ends, with today's change.
- Trust in you: start → end, with the events that moved it.

Then the next step: "Next: Ramadan 2" or "12 days pass before Ramadan 15." When days will be skipped, the standing-whisper picker from §5 appears (0–2 whispers, each with a strength, an appeal and the cost line). The button is **Let the days pass**. The next day opens on an **intro card**: a digest of the skipped stretch from `narrateChronicle` over those days, for example "He kept the fast 12 of 12 days. He paid Osman 300 on Ramadan 11. He called Selin twice. His trust in you went 0.52 → 0.47." The intro card has **Continue**, and play starts paused.

### 6.5 Eid view

Eid uses the same layout. The composer is replaced by a muted bar: "You are silent today. Watch." Why still opens. The Eid intro card reads: "Eid al-Fitr. The fast is over. Today you say nothing." The last beat is his Eid-night sleep. Then "Running the week after…" appears (the epilogue on a clone, under 1 s) and the report follows.

### 6.6 End report (one scrolling panel inside the viewport)

1. **Eid, without you.** The Eid strip, plus up to 8 key lines from his Eid log.
2. **What he did on his own.** `diffChronicle(withYou R1–R30, withoutYou days 31–37)`, the `unprompted` and `started` changes, as lines.
3. **What others still had to tell him.** The `still-prompted` changes, which in the muted period can only come from other voices.
4. **What stopped.** The `stopped` changes, stated plainly.
5. **Who he listens to.** Trust for each voice at the end of R30 and at the end of day 37, shown as relationships with words, not a ranking.
6. **His ends.** The fast record (kept, excused, make-ups owed and kept), Osman, the doctor, Selin.
7. **His body, as the doctor would read it.** The true `BodyState` at day 37: hypertension severity, sleep debt and satiety, in plain medical words, under the label "He never feels this directly." This is the one place the true body is shown.
8. **Still open.** Debt left, make-ups owed, days since he spoke to Selin.
9. **The four played days and Eid as strips**, stacked.
10. Buttons: **Keep listening** · **Replay** · **New town**. Below them, ▸ Model notes.

The report has no score, stars, or words about worth, faith or acceptance.

## 7. What the player sees of his mind

| Shown | Source | Hidden |
|---|---|---|
| Doing now: label, intention, until when | `activity`, `DecisionRecord.intention` | — |
| Felt body: hunger, thirst and tiredness as a word plus a bar ("fine / a bit hungry / hungry / very") | `readBody(p).perceived` | The true body (until the report, or the doctor's words) |
| Feelings he would name | `readAffect(p).dominant`, intensity ≥ 0.2, as margin words | Mood as a number |
| On his mind: open commitments in his words with times ("fast until 19:06", "Asr before 18:45", "Osman: 300 by Ramadan 15"), with a closing state | `agenda.commitments` (pending, plus `commitmentPressure` → closing) | Importance values |
| Money and debt | Host ledger (he knows these) | — |
| **Your trust thread**: a bar and the last 3 events ("+0.04 the rest you urged helped") | `voiceOf(halil,'you')`, `history` | — |
| **Other voices**: Selin, Rıza, Hacer, Osman. Their colour, relation, a trust **word** (listens closely / some / little), what they last urged and when, whether it is still on his mind (a fading bar from `adviceWeight`), and a conflict line when two voices pull apart | `voicesIn`, `standingAdvice`, `conflictBetweenVoices` | Other voices' numeric trust (they appear only in the report, as words with arrows) |
| Memories, only when cited or recalled | `DecisionRecord` recalled episode, loss-recall events | The episode list |
| Why (on demand): stacked term bars for the top 3 options, with advertised vs believed figures, labelled *estimates*, in monospace | `trace` `Considered.terms` (port Game 1's `WhyBreakdown`) | — |
| Chronicle | `narrateChronicle` in the between-days card, the intro card and the report | Raw `DayRecord`s |

## 8. Pacing and auto-pause beats (a closed list; put it in the protocol)

**Pace.** Slow (the default) is 8 sim-min/s, Normal 20, Fast 60.

**Fast-forward.** While he sleeps, or during an activity with more than 30 min left and no beat due, time runs at 240 sim-min/s. The top bar shows "skipping: he sleeps until 08:00". Fast-forward is always on and stops at the next beat. The worker's per-tick minute cap must rise to match (Game 1 caps at 8 minutes per tick). With fast-forward, a played day takes about 2–4 real minutes.

**Beats.** Each beat pauses when Auto-pause is on. With Auto-pause off, it is still logged with a highlight.

| Beat | Fires when | Cooldown applies |
|---|---|---|
| `wake` | His first waking decision after sleep | yes |
| `verdict` | His answer to your suggestion (the first answer, and any change of verdict kind) | **no** |
| `voice` | Another voice reaches him: a call, Osman's demand, the doctor, or Hacer/Rıza talk carrying a claim or advice | yes |
| `craving` | A habit fires for an option he won't or can't take (the 10:00 cigarette in the fast) | yes |
| `close-call` | A waking non-review decision whose top two options differ by less than the close-call margin (at most 2 a day) | yes |
| `duty-risk` | A commitment he holds enters its closing stretch unfulfilled while he is doing something else, or perceived thirst ≥ 0.7 during the fast | yes |
| `recall` | A loss recall fires | yes |
| `day-end` | The between-days card | screen; always pauses |
| `eid` | The Eid intro card | screen; always pauses |

The cooldown is 20 sim-min between auto-pauses that are subject to it; a beat inside the cooldown is logged and does not pause. A beat sets `pauseBeat`, and the UI shows it as a one-line banner over the log. Space resumes. **Space toggles pause everywhere**: a global keydown handler calls `preventDefault`, so a focused button never swallows it.

## 9. Protocol contract (`apps/site/src/voice/protocol.ts`, owned by WORLD+SIM, frozen here)

The pattern is Game 1's: the main thread sends `tick{dtMs}` every animation frame, the worker converts that to sim minutes, and every reply carries `gen`. The worker builds all view models as plain JSON. React renders frames only and never imports `@human/framework`, except types re-exported from `protocol.ts`.

```ts
export type Pace = 'slow' | 'normal' | 'fast';
export type Phase = 'premise' | 'day' | 'between' | 'eid' | 'report' | 'free';
export type Strength = 'mention' | 'urge';                 // 0.35 | 0.7
export type Appeal = 'duty' | 'safety' | 'benevolence' | 'belonging' | 'meaning';
export type Tone = 'yes' | 'notNow' | 'cannot' | 'willNot' | 'protest';
export type BeatKind = 'wake' | 'verdict' | 'voice' | 'craving' | 'close-call' | 'duty-risk' | 'recall' | 'day-end' | 'eid';
export type VoiceId = 'you' | 'selin' | 'riza' | 'hacer' | 'osman' | 'doctor';
export type Family = 'worship' | 'work' | 'food' | 'social' | 'phone' | 'rest' | 'sleep' | 'health' | 'money' | 'smoke' | 'grave';

export interface Draft { optionId: string; strength: Strength; insist: boolean; appeal?: Appeal }
export interface StandingWhisper { choiceId: 'work' | 'doctor' | 'selin' | 'rent' | 'mosque' | 'rest'; strength: Strength; appeal?: Appeal }

export type MainToWorker =
  | { type: 'init'; seed: number; gen: number; scenarioVersion: string }
  | { type: 'tick'; dtMs: number }
  | { type: 'pause' } | { type: 'resume' }
  | { type: 'setPace'; pace: Pace }
  | { type: 'setAutoPause'; on: boolean }
  | { type: 'begin' }                                    // premise card dismissed
  | { type: 'predict'; requestId: number; draft: Draft }
  | { type: 'suggest'; draft: Draft }                    // Confirm
  | { type: 'withdraw' }
  | { type: 'why'; decisionId: string }
  | { type: 'endDay' }
  | { type: 'advance'; standing: StandingWhisper[] }     // between-days card: next day (skips run here)
  | { type: 'dismissIntro' }
  | { type: 'keepListening' }
  | { type: 'replay'; seed?: number };

export interface LogEntry {
  id: string; day: number; minute: number; clock: string;
  kind: 'act' | 'you' | 'answer' | 'voice' | 'feel' | 'recall' | 'note';
  who: 'halil' | VoiceId; text: string; tone?: Tone; until?: string;
  decisionId?: string; beat?: BeatKind;
}
export interface OptionView { id: string; label: string; rank: number; leaning: boolean }
export interface Prefill { optionId: string; strength: Strength; appeal?: Appeal; why: string; source: 'advice' | 'end' | 'close-call' | 'tutorial'; sourceId?: VoiceId }
export interface Telegraph { tone: Tone; text: string; says: string; counter?: string; reason: string; likelihood?: number }
export interface StandingView { draft: Draft; label: string; since: string; lastAnswer?: { tone: Tone; says: string; counter?: string }; expires: string }
export interface Felt { id: 'hunger' | 'thirst' | 'tired'; level: number; word: string }
export interface HalilView {
  doing: { label: string; intention: string; until: string } | null; asleep: boolean;
  felt: Felt[]; feelings: { name: string; word: string; intensity: number }[];
  onMind: { id: string; label: string; due: string; state: 'open' | 'closing' | 'kept' | 'missed' | 'excused' }[];
  money: number; owed: number;
}
export interface VoiceView {
  id: VoiceId; name: string; relation: string; colour: string;
  trust?: number;                                      // 'you' only
  trustWord: string; history: { delta: number; text: string }[];
  lastUrged?: { label: string; when: string; standing: boolean; weight: number };
  conflict?: string;
}
export interface EndView { id: 'fast' | 'rent' | 'doctor' | 'selin' | 'trust'; label: string; status: string; detail: string; progress?: number }
export interface StripRow { label: string; cells: { from: number; to: number; family: Family; label: string; promptedBy?: VoiceId }[] }

export interface Frame {
  phase: Phase; day: number; dayLabel: string; minute: number; clock: string;
  sky: { hour: number; prayers: { name: string; minute: number }[]; fast?: { from: number; until: number } };
  paused: boolean; pace: Pace; autoPause: boolean; fastForward?: string; pauseBeat?: { kind: BeatKind; text: string };
  intro?: { label: string; lines: string[] };
  halil: HalilView;
  composer: { open: boolean; reason?: 'asleep' | 'busy' | 'muted'; until?: string };
  leaning?: { optionId: string; why: string };
  options: OptionView[]; prefill?: Prefill; standing?: StandingView;
  log: LogEntry[];                                     // newest 300, append-only ids
  ends: EndView[]; voices: VoiceView[]; muted: boolean;
}
export interface WhyView { decisionId: string; clock: string; chosen: string; options: { label: string; total: number; terms: { label: string; value: number }[] }[]; recalled?: string; voice?: { says: string; reason: string } }
export interface BetweenView {
  closed: string; lines: string[]; strip: StripRow; ends: EndView[];
  trust: { from: number; to: number; events: string[] };
  next: { label: string; day: number; skipped: number } | null;   // null → Eid comes next
  choices: { id: StandingWhisper['choiceId']; label: string; cost: string }[];
}
export interface ReportView {
  eid: { strip: StripRow; lines: string[] };
  own: string[]; others: string[]; stopped: string[];
  trust: { id: VoiceId; name: string; endRamadan: string; endWeek: string }[];
  ends: EndView[]; body: string[]; open: string[]; rows: StripRow[]; modelNotes: string[];
}

export type WorkerReply =
  | { type: 'frame'; frame: Frame }
  | { type: 'predicted'; requestId: number; telegraph: Telegraph }
  | { type: 'why'; why: WhyView | null }
  | { type: 'between'; view: BetweenView }
  | { type: 'report'; view: ReportView }
  | { type: 'error'; message: string };
export type WorkerToMain = WorkerReply & { gen: number };
```

Frames are sent at most once per tick, and only when something changed. The frame stays under 100 KB: the log is capped, and Why is fetched on demand.

## 10. Model notes (one collapsed section; the same text on the premise card and the report)

- Halil is a simulation of a person's needs, duties, habits, memories and trust, built from engineering defaults. It is not a model of any real person or town.
- The game represents **his understanding** of his duties, never a ruling, and never anything about acceptance.
- Engineering assumptions, not sourced in `research/`:
  - Smoking breaks the fast.
  - If enabled (§11 Q2), the Eid prayer is shown as a town custom he may join, with no duty attached.
  - The Fajr window is modelled as ending at Dhuhr, not at sunrise.
  - Zakat al-fitr is not represented.
- Excused fasts: illness, or a break under real necessity, excuses the fast with a make-up owed (Qur'an 2:184 as catalogued). The game never books this as a sin.
- He decides from what he **feels**. His true body is shown only by the doctor and in the report.
- Two parameters have no empirical citation yet: scarcity (debt pressure) and habit strength.

Ordinary play shows none of these caveats.

## 11. Open questions for the user (non-blocking; each has a recommendation)

1. **Fajr ends at sunrise or at Dhuhr?** Today Halil "keeps Fajr" at 10:00. **Recommendation:** approve the sunrise ending once a source is added to `research/`. It is the common position, and it gives the game a real dawn beat: suhoor, then Fajr at home or at the mosque before sunrise. Until then the build follows the engine, and this plan does not rely on a dawn mosque beat.
2. **The Eid prayer as an option with no standing.** It is built behind a flag and off by default, because it is not sourced. **Recommendation:** enable it as a town custom with no duty attached, since an Eid morning without it reads oddly. Better still, add a source to `research/` and give it its standing.
3. **Smoking breaks the fast.** **Recommendation:** keep it as a labelled assumption. The 10:00 craving beat depends on it.

## 12. Two owned file sets

**WORLD+SIM** owns:

- `packages/human/src/scenarios/town.ts`, `packages/human/test/town.test.ts`
- `apps/site/src/voice/protocol.ts`, `apps/site/src/voice/worker.ts`
- `apps/site/src/voice/sim/*`:
  - `game.ts`: phases, the day plan, skips, Eid, the epilogue on a clone
  - `standing.ts`: the suggestion lifecycle
  - `prefill.ts`
  - `beats.ts`
  - `view.ts`: Frame, HalilView, VoiceView, EndView, Why
  - `report.ts`
  - `fixtures.ts`: sample `Frame`, `BetweenView` and `ReportView` JSON for the UI to build against before the worker is ready
  - `*.test.ts`
- The day-31 fix in `docs/games/voice.md`, and new entries in `docs/findings.md`.

Mirror the `setup()` and `run()` helpers in `town.test.ts` (`townPeople` → `createTown({seed, now})` → `createCommunity`) and the Game 1 driver pattern in `colony/sim/human.ts` (`interruptPerson` on a new suggestion; `stepCommunity(..., { suggestions })`; read `trace` by `decisionId`).

WORLD+SIM acceptance:

- the W1–W9 tests
- the §4 opening gate
- `sim` tests:
  - The same seed plus the same input log gives identical discrete events, verdicts and log text, and continuous values to 1e-6. Replayed on the same tick schedule, frames are byte-identical (framework.md: chunking changes continuous state at about 1e-9).
  - A 12-day skip under two standing whispers runs in under 1.5 s in Node.
  - **The bar as a test:** R1 driven only by the worker's prefill → Confirm path (no scripted suggestions) shows at least one verdict other than `assented` by R1 12:00, plus one `craving` beat. §4 proves the engine can produce each verdict; this test proves a prefill-only player meets one.
  - No Eid or epilogue decision carries a `you` suggestion.
  - Keep listening resumes at Eid night with the voice live.
  - The report has every section non-empty on the shipped seed, both with no input and with a script of prefill confirmations.
  - Frames stay under 100 KB.

**UI** owns:

- `apps/site/voice/index.html` (copy the colony head: fonts, theme-color, description)
- `apps/site/src/voice/main.tsx`
- `apps/site/src/voice/ui/*`: `App.tsx`, `useVoice.ts`, `Premise.tsx`, `TopBar.tsx` (with `SkyBand`), `DayLog.tsx`, `HalilPane.tsx`, `EndsPane.tsx`, `VoicesPane.tsx`, `Composer.tsx`, `StandingCard.tsx`, `Why.tsx`, `Between.tsx`, `Intro.tsx`, `Report.tsx`, `Strip.tsx`, `voice.css`
- `apps/site/vite.config.ts` (add `voice: resolve(root, 'voice/index.html')`)
- The landing page: in `apps/site/src/home/main.tsx` and `home.css`, turn the "Game 2 · coming soon" card into a live `<a href="/voice/">` card titled *The Day You Say Nothing*, kicker "Game 2 · about fifteen minutes", with a static SVG of a crescent over a page.

The UI builds first against `sim/fixtures.ts`, then against the worker.

UI acceptance:

- Space toggles pause from every focus state.
- No page scroll at 1280×800 or at 375×812.
- The composer flow works (select → strength → appeal → live telegraph → Confirm) with the keyboard alone.
- The premise card blocks play until Begin.
- Auto-pause can be toggled.
- Report buttons work.
- `npm run check` passes.

Neither owner edits the other's files. A protocol change goes through the WORLD+SIM owner and gets one line added to this section.

- 2026-10-03 (WORLD+SIM): protocol.ts adds `VOICE_SCENARIO_VERSION`, `STRENGTH_VALUE` and `PACE_MINUTES_PER_SECOND` (no shape changes). Behaviour notes: two skip whispers alternate hour by hour (the framework hears one suggestion per voice per decision); the prefill skips an option he would refuse outright; a standing suggestion also ends when he begins the same action (pray at home for the mosque).

**Order:**

1. WORLD W1–W9 and the opening gate, in parallel with the UI building against fixtures.
2. The SIM driver and the worker.
3. Integration.
4. A game-design review: play the first two minutes against §1.
5. Deploy per AGENTS.md.

## 13. As shipped (fix pass after the first playtest, 2026-10-03)

- **The voice matters.** Seeded aversions (clinic, calling Selin first) mean the doctor and his own call need you; good outcomes soften them. Silent, prefill and insist runs on seed 7 end differently, and a test holds that. ~~Rent stays his own end~~ (reversed in the second pass below: morning wages alone now miss Osman's date).
- **Insisting has a price.** No trust for an insisted success; a trust cost for insisting while he is pressed. (Second pass: an insist-every-prefill player insists about 10 times, hours apart, never reaches the pressure line for the cost, and ends at 0.50–0.51, below a prefill month only because insisting earns nothing; see `docs/findings.md`.) The composer says insisting costs trust only when he is already pressed.
- **Standing suggestions** hold until the activity they started ends, so he does not turn back half-way.
- **Close calls** are read ahead (a cloned `decide`) and fire before the choice, not after the act is logged. The Why sheet lists the chosen option first and says why when it was not the top total.
- **Days:** naps are capped at 90 min; Selin leaves the first Eid call to him until 18:00; she stops asking about the doctor once he has been; the wake line carries the minute he woke.
- **Report:** a plain Eid summary (Selin's call, clinic visits and how many followed your word, trust start to end, insist count); the "own" and "stopped" lists are scoped to your voice and leave prayer out.
- **UI:** Enter/Esc work after a toolbar click, and Enter on a focused composer button presses that button. Space skips typing fields, advances the between-days card and keeps its native meaning on the report. Auto-pause is an `aria-pressed` button, and there is a pace button below 1180 px. The Why sheet returns focus, and an evicted decision gets an explicit message. The error banner has Start again. One copy of the model notes (protocol.ts). Frames are throttled to about 15 a second, and the mock is out of the production bundle.
- **Deferred:** zakat al-fitr and the Eid prayer (voice.md §4).

### Second pass (design critique and playtest list, 2026-10-03)

Engine 1.3.0. `npm run check`: 45 files, 529 tests. Measured on seed 7 with headless players (scratchpad probe, not in the repo). The whisper rows carry a reason; until the fifth pass the between-days card picked a whisper with no reason, so these rows were not what the card produced by default (see the fifth pass):

| Play style | Osman's date (300 by R15) | Afternoon shifts | Clinic | His own calls to Selin (Eid) | Trust at Eid | Pauses |
|---|---|---|---|---|---|---|
| Silent | missed; 300 paid R17 | 0 | never | 0 (none) | 0.50 | 44 |
| Prefill + whisper doctor (Mention, “your health”) / Selin (Mention, “for Selin”) | missed; R16 | 3, on your word | once, on your word | 28 (18:55) | 0.59 | 53 |
| Insist every prefill + Urge doctor/mosque | kept; R15 14:46 | 4 | 5 times | 2 (none) | 0.51 | 51 |
| Prefill + whisper shift (Mention, “it’s your duty”) / Selin (Mention, “for Selin”) | kept; R11, second 300 R22 | 25, all on your word | once | 28 (14:55) | 0.62 | 46 |

- **A goal you can fail.** The wage is 16 (was 25): 40 + 16 × 15 = 280 by R15, so morning work alone misses Osman's date. A new `work-extra` affordance (afternoon shift, 90 min, dhuhr+15 to asr−90, not on Eid) pays 16 but carries no `material` term, so he does not reckon on it and almost never takes it alone; a voice can get him there. Osman comes to the door on his own date when nothing is paid. The workshop is shut on Eid (town custom, engineering assumption, no norm attached). When the shift opens and the projection falls short, the game pauses once a day ("The workshop has an afternoon shift. Mornings alone get him to about …", duty-risk kind) with the shift prefilled; the skip card offers it as a whisper. Only the whisper keeps the date reliably: the played-day pauses alone add 3 shifts, which is not enough.
- **Real decisions at pauses.** A pause comes only when his answer changes tone or on the first answer; a same-tone answer with a new counter-offer is logged, not paused. The suhoor wake is announced a minute ahead on a waking copy of him, so the composer opens before he chooses (the tutorial prefill and the first "yes" survive). The close-call prefill rule is gone; prefills now come from other voices' advice, rent, money, the doctor, and Selin after maghrib when he has not called for two days.
- **Cause and effect from the voice.** One suggestion credits at most one activity: the step in which the suggested activity finishes no longer hears the spent suggestion (it used to become two meals, both credited to you). The between-days card has "What your words did" lines. The skip digest names mornings and shifts worked and money, Osman's visits and payments, calls each way, the clinic, the fast (with illness excusals), and prayers. Halil's pane shows how the clinic, calling Selin and the mosque weigh on him, and whether that is easier than at the start.
- **Trust economy.** Asking again, without insisting, for something he declines while pressed wears trust 3 % (`worn`, at most once per 12 h); a repeat good outcome of the same suggested action earns gain / (1 + n). Small changes fold into one history entry with `from` and `count`, so the day card counts them on the right day.
- **Less samey days.** The afternoon shift, Osman's own-date visit and the closed workshop on Eid change the shape of days; naps no longer pause the game (log line only).
- **Eid payoff.** The report now opens with the plain summary (it was computed but never rendered), adds "What you used to say, and what he did on Eid" (a ledger by thing said, with his reason on Eid), shows Eid lines in clock order up to 24 (was cut at 8, around noon), hides empty "others" and "stopped" sections, and says when Osman's date was kept or missed and how many afternoon shifts were your doing. A first-cigarette beat marks the end of the fast's hold.
- **Defects fixed.** A prayer begun in its window and finished after it is kept, not missed (framework: under-way commitments stay open). Eid chain-smoking (a cigarette every 30–40 minutes from several cued habits) is bounded by an action-wide refractory: at most two in the hour after his first meal, pinned by a test. The day card's trust events read the day by `from`. `finish` events carry `decisionId`.
- **Not done:** the day-0 windows that have already passed at creation (ashamed/proud at 03:40); a voice proposing a resolve via `precommit`; Deniz's Eid gift; `visit-grave` never wins; the 10:00 craving beat can fire after his decision; a standing Urge to pray at the mosque sends him there about 20 times a day on skipped days (voluntary prayer, every hourly chunk), which is honest but absurd (fixed in the third pass); low-priority toolbar height and favicon 404.


### Third pass (round 3 playtest list, 2026-10-03)

`npm run check`: 47 files, 544 tests. Measured on seed 7 with the same headless players (scratchpad probe, not in the repo):

| Play style | Mosque visits on skipped days | Illness-excused fasts | Osman's date | Clinic | Selin on Eid | Trust at Eid | Pauses |
|---|---|---|---|---|---|---|---|
| Silent | 24 (1 a day) | 0 | missed; R17 | never | neither called | 0.50 | 45 |
| Prefill + whisper doctor (Mention, “your health”) / Selin (Mention, “for Selin”) | 15 | 0 | missed; R16 | once | he called, 18:55 | 0.59 | 53 |
| Insist every prefill + Urge doctor/mosque | 134 (4–6 a day; was about 25 a day) | 0 (was 25) | kept; R15 14:15 | 4 times | neither called | 0.56 (was 0.51) | 49 |
| Prefill + whisper shift (Mention, “it’s your duty”) / Selin (Mention, “for Selin”) | 29 | 0 | kept; R12, second 300 R23 | once | he called, 19:05 | 0.63 | 45 |

- **Standing advice is satisfied once per occasion (framework).** A standing suggestion whose action keeps one of his commitments is heard until he does it, then lies dormant until doing it again would keep the next window. Advice for actions that keep no commitment is heard at every decision, as before. `Suggestion.since` makes advice given afresh count only completions after it. A standing suggestion whose option is not on offer is held back instead of refused. The Urge-mosque month went from about 25 mosque visits a day to about one per prayer (4–6 a day). Its 25 illness-excused fasts went to 0, and trust rose from 0.51 to 0.56. That run is probably the playtest's "broke 11 fasts" defect, which the second pass could not reproduce; this is not confirmed.
- **No more "That isn't on offer here now" after a deferral.** The word waits, and the log says why: "He can’t call Selin just now (he calls her in the evening, and not twice within twelve hours). Your word waits; he will hear it if he can before 22:19." When the option comes back, the log says so. Skip whispers alternate only between whispers he can hear.
- **Illness is visible.** On a played day a fast excused for illness gets a log line: his pressure in words, that he counts himself ill, the day owed, and the doctor's words or that he has not seen her. Halil's pane has a "His health" list, and "On his mind" shows the fast as excused. The skip digest and the report body name the days. A test provokes the case (pressure raised to 0.45 before the first skip); the shipped seed does not reach it in any of the four styles.
- **Eid beats.** The first cigarette pauses in every style ("His first meal in daylight in a month, and after it the cigarette …", or "Nothing holds the cigarette back now …" when he smokes before eating). The Selin call window ("She is leaving the first call to him until 18:00") waits out the 20-minute cooldown, so it pauses instead of being logged unpaused straight after the cigarette. His Eid call to Selin, or hers to him, is its own paused beat. The report no longer says "He waited for her to call" when she never called: it says she called him at a given time, or that neither of them called.
- **Copy.** A count of one reads "on your word" instead of "once … each time". A bodily act drops a redundant bodily intention, so "I eat at home, to drink" is gone. The digest says "1 fast" in the singular, lists clinic days once each, and no longer counts the arrival day ("13 of 12 days"). 'did not pray' appears in no log or report in any of the four styles; the contradiction was not reproduced.
- **Trust pump re-measured, not bounded.** With whispers only, starting from 0.15, the best pair (Urge mosque + work) reaches 0.24 over the month. Starting from 0.50, the highest is 0.64. Neither is a pump, so no bound was added.
- **Not done:** naps (about 3.3 a day silent, 4.5 overbearing; engine 1.3.0 did not change them). A nap gate was tried and reverted; see `docs/findings.md`. Selin does not call on Eid in the silent and overbearing runs, so his not calling gets no answering call. The overbearing ends list says "he called 36 days ago". His one call was on Ramadan 1, and the count runs to the end of the epilogue after Eid, so the number is right but reads oddly; left as is.

### Fourth pass (final reviews: game design, adversarial, package, 2026-10-03)

Engine 1.4.0 (standing advice once per occasion, from the third pass; saves from 1.3.0 do not restore). `npm run check`: 48 files, 553 tests. Measured on seed 7 with the same headless players (scratchpad probe, not in the repo):

| Play style | Mosque visits on skipped days | Osman's date | Clinic | Selin on Eid | Trust at Eid | Pauses |
|---|---|---|---|---|---|---|
| Silent | 13 | missed; R17 | never | she called, 20:19 | 0.50 | 37 |
| Prefill + whisper doctor (Mention, “your health”) / Selin (Mention, “for Selin”) | 1 | missed; R17 | once | she called, 19:54 (he usually called about 19:00) | 0.61 | 48 |
| Insist every prefill + Urge doctor/mosque | 130 (5 a day) | kept; R15 14:15 | 4 times | she called, 23:19 (he was asleep from 21:36) | 0.56 | 55 |
| Prefill + whisper shift (Mention, “it’s your duty”) / Selin (Mention, “for Selin”) | 2 | kept; R11, second 300 R25 | once | he called, 11:25 | 0.66 | 42 |

The third-pass table's prefill row ("he called, 18:55") no longer holds: after the day-0 prayer-window fix that style's own Eid call is lost to Maghrib at his habit's cue minute. See `docs/findings.md` (his calls are habit-cued). The epilogue still credits him with 5 of his own calls in the six days after Eid. The same day-0 change also moved mosque visits on skipped days (third-pass table: 24, 15, 134, 29; now 13, 1, 130, 2; same probe and metric). The town's prayer-place tests still pass, but how often he goes to the mosque unprompted depends on the trajectory too.

- **Selin calls on Eid.** She leaves the first call to him until his usual hour (the mean of his last 7 own calls) plus 30 minutes, no earlier than 18:00 and no later than 21:00, then calls when she is free. The window beat says "she will not call before about HH:MM". The report says whether he called, when he usually called and when she called, or that he had not called her all month, and adds the calls each way in the six days after Eid. The ledger row for calling Selin says the same, and the ends say "he called today, unasked" or "he last called on Ramadan N" instead of "36 days ago".
- **The Dhuhr walk.** An abandoned walk to the mosque reads "I set out for the mosque, and turned back." instead of "mosque (stopped)". A framework fix that counted the running prayer as keeping the window broke the town's home/mosque balance and was reverted (findings).
- **Close calls come before the act.** The look-ahead no longer flags a choice between two ways of doing what he is already doing. A close call it did not see is caught at the real decision, and its "He’s torn between …" line goes into the log before the act it led to.
- **Enter sends after a mouse click.** Enter on a picked option, a strength, insist or reason button sends; an option not yet picked keeps its own Enter.
- **Skip digests.** For each whisper: "When he heard it, he said yes N, put you off M, refused K", and "N times on his own". Without whispers: "You left no word. What follows he did on his own." Money reads "earned X (a spoiled job pays less than half); he has M (was B)".
- **Every played day has a question.** The day card lists what is open: Osman's 300 by R15 or the rest by the end of Ramadan, the clinic, Selin, and on R30 that Eid is tomorrow. The day-end card gives one final answer per word and the ends he did unasked ("He called Selin without being asked.").
- **Eid's own moments always pause.** The first cigarette and the first Eid call pause even inside another beat's cooldown.
- **Copy.** "kept the fast" (not "kept 1 of 1 abstentions"); day-0 windows that had already closed no longer show "ashamed (a prayer missed)"; Fajr on his mind is labelled as a simplification (the game holds it open until Dhuhr).
- **Game 1.** The end screen opens with what your orders changed, from the Human-minus-Solo difference (for example "Your 10 orders changed: injuries 13 (without you: 5); trust in you 48% (without you: 54%). Everything else came out as it would have without you."), and lists each order with its time and both sides' final answers. The collapsed phone goal strip shows each side's number. Moments are numbered "#4"; the trust meter says "Nothing has moved it today."
- **Landing.** The hero links both games; the version reads v1.0.0 everywhere.
- **Not done:** naps (findings); the prefill style's own Eid call (habit-cued, Medium); the doctor's "walk, stop smoking" is not an end; the 390 px Game 1 layout (taller centre column, collapsible maps) beyond the goal numbers; whether the Game 1 orders log drops a deferral once it resolves.

### Fifth pass (final browser check, 2026-10-03)

`npm run check`: 48 files, 556 tests. A browser run that confirmed every prefill and, at both skip cards, picked the shift and Selin whispers without changing anything missed Osman's date. The card picked a whisper as a bare Mention with no reason, and a bare Mention of the shift does not move him, because he does not count on its pay. The earlier tables' "whisper shift/Selin" rows used a Mention with "it's your duty", which the card never produced by default. Measured on seed 7 with the same headless players (scratchpad probe, not in the repo):

| Card whispers (prefills confirmed) | Osman's date | Afternoon shifts | Selin on Eid | Trust at Eid | Pauses |
|---|---|---|---|---|---|
| Before: shift + Selin, card defaults (Mention, no reason) | missed; R17 | 1 | she called, 19:59 | 0.61 | 50 |
| After: shift + Selin, card defaults (Mention, “it’s your duty” / “for Selin”) | kept; R11, second 300 R25 | 27 | he called, 11:25 | 0.66 | 42 |
| Shift as Urge, no reason | kept; R11 | 27 | he called, 11:10 | 0.65 | 42 |
| Silent | missed; R17 | 0 | she called, 20:19 | 0.50 | 37 |

- **The card's defaults.** A picked whisper now starts with the reason the in-day prefill gives for the same act (`WHISPER_DEFAULT` in protocol.ts): "it's your duty" for the shift and the rent, "your health" for the clinic, "for Selin" for the call. While mornings alone fall short, the shift choice says so: "He doesn't count on the shift's pay, so a bare mention won't move him. Remind him of his word ("it's your duty"), or urge it." A test plays the card's defaults and keeps the date. Another test clears the reason and misses it, and the silent month still misses it.
- **Running late.** A deadline beat waits while he sleeps until the deadline is within an hour. A promise's beat comes at most 3 hours before its deadline: the beat for Osman's date used to fire at 01:00 on Ramadan 15 for a 20:00 deadline.
- **Report.** The Eid list keeps every key line (Selin, Osman, the cigarette, the clinic, the mosque, memories) under the 24-line cap and says how many quieter lines were left out. "Had mostly stopped: calling" is dropped when he called Selin himself after Eid. A month with no word says "The days you watched, and Eid".
- **Game 1.** The end screen focuses its heading, so it opens at the top. At phone width the goal table drops the chips' C/H/S tags and the Solo subtitle, so it fits the dialog. The "what your orders changed" sentence compares exactly the rows the tables show, in the tables' units (prayers as a percentage, goal values such as storm stock, and morale).

### Sixth pass (round 5 playtest, 2026-10-04)

`npm run check`: 48 files, 562 tests. Engine 1.5.0.

- **Game 1 fits a 360×740 phone.** At ≤860 px the order panel has a fixed height, the map stats sit in a side column, Rush and Insist share a row, and the speed buttons hide after Results. Screenshotted at 360×740, 384×832, 390×844, 768×1024, 1280×800 and 1440×900. At 360–390 px the place and appeal rows still scroll sideways.
- **Ruled lines.** The log's 32 px ruled background ran through wrapped rows. It is now a border between rows.
- **Who each voice is.** The premise names Selin as his daughter, Rıza as his friend, Hacer as his neighbour and Osman as his landlord. The end labels repeat it, and the first log line from each voice gives the relation.
- **The ends are read at Eid morning.** The game snapshots the run when Eid starts and records each rent payment with its date. Every end states its date: "Paid 300 on Ramadan 14; 300 still owed at Eid. He had 268." A separate "Without you" line covers the week after: "In the week after Eid he paid the rest (300) on Shawwal 7; nothing owed now." Before this, the panel read the town at Shawwal 7 under a Ramadan heading.
- **Log.**
  - **Advice for the running activity is heard (framework, engine 1.5.0).** `standingHeard` now counts the activity he is doing as on offer. Before, the shift's offer window closed at Asr − 90, so his 60-minute review no longer heard the advice. The game had shown the shift "(stopped)" while also printing "He can't work extra just now".
  - **The shift can still stop for fatigue.** That stop is real: effort weighs more than the advice at the review.
  - **Detached replies name what they answer**, for example "Drink water? “Not while I'm keeping my fast.”"
  - **The mosque turn-back is real behaviour.** The funeral memory gives the mosque a negative expectation. It now reads "I set out for the mosque, as you asked, and turned back; the mosque brings back the funeral."
  - **The ledger** reads "Prayed 5 times, 3 at the mosque".
- **Smoking can be worn down, slowly.**
  - **The walk.** Once the doctor has spoken, Halil is offered one 30-minute walk by the river a day. In Ramadan it is offered only after he has broken the fast and not during the meal, so the walk lands where the after-meal cigarette would.
  - **No new mechanism.** A completed walk right after eating withholds the after-meal smoking habit through the existing habit extinction: one loss per cue occasion, at most about one a day.
  - **Placeless cigarette.** Smoke has no place now. When it was keyed to the tea house, the seeded after-meal habit was never reinforced and nothing at home could withhold it (findings).
  - **Game.** A "walk after iftar, not the cigarette" whisper and a once-a-day craving beat. Prefill suggests the walk when he is about to smoke and the walk is on offer.
  - **The doctor end** reports cigarettes per day on Ramadan 1–2 against 29–30, the walks (and how many were on your word), and the cigarettes on Eid.
  - **Hard by design.** A Mention usually gets "After I smoke a cigarette, then I will". All parameters are engineering defaults.

Measured on seed 7 with the headless players (scratchpad probe, not in the repo):

| Player | Days he smoked in Ramadan | Cigarettes on Eid | After-meal habit at Eid | Walks | Rent | Trust at Eid |
|---|---|---|---|---|---|---|
| Silent | about 22 | 5 | 0.60 | 0 | date missed (R17), 300 owed at Eid | 0.50 |
| Prefill confirmed + doctor/Selin whispers | 9 | 3 | 0.38 | 2 | date missed (R16); 3 shifts | 0.61 |
| Shift + Selin whispers | 11 | 5 | 0.41 | 2 | date kept (R14), 300 owed at Eid; 6 shifts | 0.63 |
| Insist + urge doctor/mosque | 12 | 4 | 0.42 | 4 | date kept (R15) | 0.47 |
| Walk (Mention) + Selin | 8 | 4 | 0.34 | 30 | date missed (R17) | 0.64 |
| Walk (Urge) + shift | 5 (none after R12) | 3 | 0.26 | 30 | date kept (R11), rest R27; 13 shifts | 0.60 |

- **Hour-10 habit.** The second smoking habit (hour 10) stays at about 0.28 in every style. The walk does not reach it.
- **Eid count is noisy.** Cigarettes on Eid vary between 3 and 5 and barely follow the month. Probable cause (not confirmed): on Eid there is no fast, so the hour cue and the refractory set the count more than the after-meal habit does.
- **The shift style changed.** The fifth-pass table's "27 shifts, date R11" were mostly 30-minute fragments that never set `lastExtra`. With the advice heard for the running activity, the same player works about 6–7 full shifts and keeps the date on R14, with the second 300 paid after Eid.
- **Not done:** an urge to smoke after abstinence (`craving` is unset for Halil); the walk is not its own end.

### Seventh pass (game-design review of the live build, 2026-10-04)

Checks: lint, typecheck and `vitest run --maxWorkers=3`: 49 files, 567 tests. Engine 1.5.0, unchanged. No economy or balance target moved: the quiet month still misses Osman's date and pays 300 on R17, and the card defaults keep it.

- **"He'd now do unasked" strip** (the spec's dawn probe, voice.md §3, which the build plan had cut). For suhoor, calling Selin, the clinic, paying Osman, the shift and the walk, it shows what he chose at his last decision where the act was open and your voice was not weighed. It appears on the Ends pane, the day card, the skip card and the report. Prayer is left out. See `sim/unasked.ts`.
- **Fewer pauses.**
  - Wake, craving, duty-risk and close-call beats stop pausing after two in a row are answered with nothing.
  - A verdict pauses only when he defers, declines or cannot.
  - Recall and gossip are logged without pausing.
  - A close call pauses only when there is a prefill, and never for a choice between two ways to pray.
- **Report and cards agree.** A begun act that was interrupted no longer counts as done on your word. The day card lists it as "Begun on your word and stopped part-way". Clinic counts match the town's completed acts (test). Ends no longer name a passed date as still ahead.
- **Osman's missed date shows a cost.**
  - The 17:00 beat on R15 gives the shortfall.
  - At 20:00 a log line says the date has gone by.
  - The R15 day card leads with the miss.
  - From then on, Osman's door lines say he presses harder. This is the existing late demand at strength 0.8.
  - These are surfaced sim facts only; there was no retune.
- **A moment for each played day.**
  - R1 is the first suhoor.
  - R2 brings Selin's call after iftar.
  - R15 is Osman's date.
  - R30's last night says Selin will leave the first Eid call to him and when she would call, with "call Selin" prefilled.
  - Selin's visit and Deniz are not built: build plan §2 has no new Persons.
  - Skip digests lead with firsts ("First time he saw the doctor: Ramadan 9, on your word") or "Nothing new since Ramadan N".
- **360 px.**
  - The skip card opens on the decision, and the recap folds to one line of glyphs.
  - Whisper strength and reason controls sit below the list, so a pick no longer moves the next row under the pointer. This was the second-click bug, measured as a 102 px shift.
  - Composer reasons are one row that scrolls sideways.
- **Icons.**
  - Lucide (ISC; licence text kept in `ui/Icon.tsx`), inline SVG, 16 px, 1.5 px stroke, `currentColor`, labelled.
  - They mark pause kinds, verdicts, voices, strength arcs, money and legend glyphs.
  - The prayer pips in the sky bar are small: filled when kept, ringed when missed, with a dot for the mosque.
  - The tea glass and strength waves are drawn here. Lucide's shuffle (modified verdict) is unused, because the sim reports deferred and modified both as "not now".
  - His lines, reasons and ends stay text.

Pauses per played day (R1 / R2 / R15 / R30, then Eid), seed 7:

| Player | Before | After |
|---|---|---|
| Prefill confirmed + doctor/Selin whispers | 19 / 16 / 11 / 9, Eid 7 | 10 / 6 / 7 / 6, Eid 5 |
| Quiet | 10 / 10 / 10 / 9, Eid 8 | 5 / 6 / 4 / 3, Eid 5 |
| Prefill confirmed + shift/Selin whispers | 19 / 16 / 9 / 7, Eid 8 | 10 / 6 / 3 / 3, Eid 4 |

### Eighth pass (research/decisions.md defaults, engine 1.7.0, 2026-10-04)

`npm run check` passes. Engine 1.7.0. No balance target moved and nothing was retuned. The quiet month still misses Osman's date and pays 300 on R17, and the card defaults keep it (`game.test.ts`).

- **What changed under him.**
  - Fajr ends at sunrise, not Dhuhr.
  - The Eid prayer is offered at the mosque from 20 minutes after sunrise until shortly before Dhuhr. It is linked to a recommended norm, and because he keeps the daily prayers he holds it as a quiet commitment.
  - A prayer he misses stays owed. Sleeping through it or being downed is no fault.
  - The town offers the make-up (`pray-qada`, at home, 15 minutes) between Dhuhr and Asr, at low importance.
  - The rule that smoking breaks the fast now cites research/fasting-sources.md §1.
- **Gentle by construction.**
  - A make-up appears only as a log line ("make up a missed prayer"). It has no end, no counter and no ledger entry.
  - The end-of-day tally counts only the five daily prayers, so a make-up or the Eid prayer never changes "He prayed every prayer".
  - A skip digest that covers Eid morning adds "On Eid morning he joined the prayer at the mosque", and only when he went.
  - A prayer excused by sleep or unconsciousness gets no ring on the sky band.
  - The model notes are rewritten to match.
- **Halil never misses a daily prayer in these six styles, before or after.** So in normal play the make-up never comes up for him.
  - Osman misses about one prayer a day. He is offered make-ups and does not take them, because he is at the market.
  - A town test drives the case directly: Halil is downed over Asr on R2, is excused and still owes the prayer, is offered it on R3 between Dhuhr and Asr, and makes it up once.
- **Fixed on the way.** In cognition, an open make-up used to count as an open prayer window. Ordinary prayers lost their refractory, and Halil prayed at home 13 times in a row inside that window. A make-up no longer opens the obligation it repays.

Measured on seed 7 with the headless players (`apps/site/src/voice/sim/measure.test.ts`, run with `VOICE_MEASURE=1`). Each cell is before (engine 1.6.0, main e9848b8) → after. These style definitions are the probe's own and differ from the sixth-pass probe, so only the silent row compares with that table.

| Player | Days he smoked | Cigarettes on Eid | After-meal habit | Walks | Shifts | Rent | Trust at Eid | Prayers | Missed / owed / made up | Eid prayer |
|---|---|---|---|---|---|---|---|---|---|---|
| Silent | 22 → 22 | 5 → 5 | 0.60 → 0.60 | 0 → 0 | 0 → 0 | missed, 300 on R17 (same) | 0.50 → 0.50 | 173 → 173 | 0 / 0 / 0 | not offered → joined |
| Prefill confirmed + doctor/Selin whispers | 19 → 19 | 2 → 3 | 0.57 → 0.57 | 2 → 2 | 1 → 1 | missed, 300 on R16 (same) | 0.62 → 0.62 | 170 → 170 | 0 / 0 / 0 | not offered → joined |
| Shift + Selin whispers | 14 → 14 | 3 → 4 | 0.45 → 0.45 | 1 → 1 | 3 → 3 | kept, R14 and R30 (same) | 0.63 → 0.63 | 157 → 157 | 0 / 0 / 0 | not offered → joined |
| Insist + urge doctor/mosque | 14 → 14 | 3 → 3 | 0.46 → 0.46 | 5 → 5 | 4 → 4 | kept, R15 (same) | 0.52 → 0.52 | 181 → 181 | 0 / 0 / 0 | not offered → joined |
| Walk (Mention) + Selin | 19 → 19 | 3 → 3 | 0.57 → 0.57 | 28 → 28 | 0 → 0 | missed, 300 on R17 (same) | 0.64 → 0.64 | 177 → 177 | 0 / 0 / 0 | not offered → joined |
| Walk (Urge) + shift | 13 → 13 | 4 → 4 | 0.42 → 0.42 | 28 → 28 | 0 → 0 | kept, R11 and R23 (same) | 0.62 → 0.62 | 166 → 166 | 0 / 0 / 0 | not offered → joined |

- **Only Eid morning moved.** The Ramadan month is identical in every style. Ending Fajr at sunrise does not change when Halil prays, because he already prays it before sunrise. On Eid, the hour at the mosque shifts his morning, and two styles smoke one more cigarette that day. That is still within the 3–5 noise noted in the sixth pass.

### Ninth pass (a naughty player: how far the player's tools move the month, 2026-10-04)

The user asked for a simulated player who pushes Halil the wrong way, to see how far player choice moves the end results in both directions. Engine 1.7.0 with core/libm (origin/main 0876438 merged); nothing was retuned.

- **Scripted players** (`sim/players.ts`). They use only the player's tools. On a played day each one presses pause every 30 minutes, reads the rendered frame, and says one of the composer's six options, with Mention or Urge, a reason, and Insist. It does not repeat the same thing within 120 minutes. Between days it leaves whispers from the card's closed list.
  - **Tempter.** A Mention with a kind reason. Before dawn it says go back to sleep (so he skips suhoor). By day it says rest, nap, tea with Rıza or the grave instead of work. After iftar and at night it says a cigarette, tea, Hacer or wait instead of sleep. On skipped days it whispers "rest in the afternoon" (Mention, "your health").
  - **Saboteur.** The same picks, each urged and insisted. Its whisper is rest as an Urge.
  - **Guardian.** The mirror. It confirms prefills. When he leans to something idle it says work, the clinic, Selin or the walk instead (the walk in place of a cigarette, sleep after 22:00). When he leans well it says nothing. Its whispers are the best pair from earlier passes (walk Urge, then shift Mention).
  - **Faith stays gentle.** No style picks prayer or steers around it, and none suggests food, drink or a cigarette during the fast.
- **Measured** with `VOICE_MEASURE=1 npx vitest run apps/site/src/voice/sim/measure.test.ts --silent=false` over seeds 7, 1, 2, 3 and 4. Each cell is the mean, with the range when the seeds differ. "Sleep" is hours a day including naps. "Excused fast breaks" counts Ramadan days with food or water in fasting hours (the town excuses them as illness or necessity, never as a breach). Answers are summed over the five seeds. "His calls" are his own; Selin's calls to him are not counted.

| Player | Smoke days | Eid cigarettes | Mornings / shifts | Rent: date kept, paid by Eid | Trust | His calls to Selin | Clinic | Suhoors | Sleep h/day | Late nights | Excused fast breaks (days) | Prayers | His answers on played days |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Silent | 22 | 4.2 (4–5) | 30 / 0 | 0/5, 300 | 0.50 | 0 | 0 | 30 | 11.1 | 2 | 0 | 175 (173–176) | — |
| Prefill confirmed + doctor/Selin whispers | 18.8 (18–19) | 3 | 30 / 0.8 | 0/5, 300 | 0.62 | 26.4 (26–28) | 1 | 30 | 9.9 | 13.4 (10–15) | 0 | 170 | yes 39, not now 54 |
| Shift + Selin whispers | 14.8 (14–17) | 3.6 (2–4) | 30 / 3.4 | 5/5, 540 (300–600) | 0.63 | 26 | 1 | 30 | 10.1 | 9.8 (7–12) | 0 | 157 (155–160) | yes 32, not now 50 |
| Insist + urge doctor/mosque | 14.6 (14–17) | 3.2 | 30 / 4 | 4/5, 300 | 0.53 | 0.4 | 4 | 30 | 10.3 | 15.4 | 0 | 178 (170–181) | yes 30, protest 20 |
| Walk (Mention) + Selin | 17 (13–19) | 3.8 (3–6) | 30 / 0 | 0/5, 300 | 0.64 | 26 | 1 | 30 | 10.1 | 6 | 0 | 175 | yes 35, not now 55 |
| Walk (Urge) + shift | 12.2 (9–13) | 4.2 | 30 / 0.4 | 5/5, 600 | 0.61 | 0 | 1 | 30 | 9.9 | 7 (5–11) | 0 | 166 | yes 25, not now 34 |
| **Guardian** | **7** | 4.2 | 30 / 1 | 4/5, **600** | 0.62 | 4 | 1 | 30 | 9.9 | 8 | 0 | 156 | yes 71, not now 110 |
| **Tempter** | 19 | 4.4 (2–5) | 30 / 0 | 0/5, 300 | 0.53 | 0 | 0 | **28** | **4.3** | **12** | **18** | 151 | yes 302, not now 346 |
| Tempter, no whisper | **29** | 3 | 30 / 0 | 0/5, 300 | 0.51 | 0 | 0 | **28** | 9.9 | **8.4** | 2 | 150 | yes 275, not now 385 |
| **Saboteur** | 17 | 4.2 (3–5) | **27** / 0 | 5/5, 300 | **0.01** | 0 | 0 | **26** | **8.5** | **8** | **16** | 159 | yes 10, protest 185, won't 206, can't 20 |
| Saboteur, no whisper | 21.8 (21–24) | 3.2 | **26** / 0 | 5/5, 300 | **0.01** | 0 | 0 | **26** | 10.4 | 5.2 | 2.8 | 184 | yes 15, protest 196, won't 169, can't 30 |

**Assessment.**

- **The range is wide on habits and the body, and narrow on the goals.**
  - **Good direction.** The guardian smokes 7 days against silence's 22 (after-meal habit 0.29 against 0.60), pays all 600 by Eid against 300, and sees the doctor.
  - **Bad direction.** It moves sleep, suhoor and late nights a lot. The tempter's four played evenings of "have a cigarette" with a Mention he agrees to raise smoking to 29 days (habit 0.64), because the habit he is told to indulge carries into the skipped days. That carry-over is the strongest evidence of malleability in the table.
  - **The goals do not move in the bad direction:** rent, the clinic and Selin. Silence is already the floor (no clinic, no calls, Osman's date missed, 300 paid on R17), so no worse is possible.
- **Where his will resists.**
  - **Insisting backfires.** Over the five seeds the saboteur is refused, put under protest or told he can't 411 times, against 10 yeses. Trust ends at 0.01, so its word barely weighs.
  - **His routine holds.** Every bad style still works every skipped-day morning (the saboteur loses only the played mornings it interrupts) and pays Osman before Eid.
  - **He puts the tempter off more than he obeys.** The tempter is heard more and trusted more (0.53, above silence): it agrees with his own idle leanings and earns trust for it. Even so, he puts it off (346) more often than he takes it (302).
  - This is the design point working: pushing hard is the least effective way to be bad.
- **Prayers.** He misses none of the five daily prayers under any style (one missed prayer in one saboteur run, without the whisper). The prayer count differs because prayers beyond the five dailies, at the mosque or at home, rise or fall with the day's shape. The tempter's lower count probably comes from rest and sleep displacing them; this is not confirmed.
- **Seeds barely matter.** The five seeds give nearly the same month in every style (ranges are 0–3 days). The spread comes from the player, not the seed.
- **The good direction is fragile to small choices** (seed 7, measured on the way):
  - The order of the two whispers matters. Walk-then-shift smokes 13 days; shift-then-walk smokes 8.
  - An earlier guardian said a good thing at every pause, whatever he leaned to. It also suggested meals. It smoked all 30 days (habit 0.68), worse than silence. The walk it urged landed 45 minutes after the cigarette instead of in its place. Mechanism probable, not confirmed.
  - A good player who nags can make the month worse.

**Defects found (not fixed here; recommendations).**

1. **Interrupted work pays and can be restarted** (framework, `packages/human/src/scenarios/town.ts`, the `interrupted` branch).
   - An interrupted repair or shift pays its progress fraction. It does not set `lastWorked`/`lastExtra`, so he can start a full one again the same day.
   - The saboteur's interruptions on Ramadan 1 gave him two part-repairs (+29 against +16). With the same on R15, he keeps Osman's date in 5 of 5 seeds, where silence misses it. The bad voice makes him richer.
   - It also funds the "Walk (Urge) + shift" style's R11 payment: its shifts are mostly interrupted fragments, so the shift count reads 0–2.
   - Recommendation: count an interrupted job with progress > 0 as the day's work (set `lastWorked`/`lastExtra`), keeping the pro-rata pay. Then re-measure every style, because the shift styles' money will drop. This needs an engine version bump and re-recorded fixtures, so it belongs in its own change.
2. **"Rest in the afternoon" is heard at every hour** (game, `advance` in `sim/game.ts`).
   - A standing whisper for an act that keeps no commitment is heard at every decision. The rest whisper therefore displaces night sleep (11.1 → 4.3 h/day, 13 h of rest a day) and the water at suhoor.
   - He gets so thirsty that he breaks the fast under necessity on 18 days, mostly from Ramadan 14 on (seed 7). That comes from a whisper the card labels as an afternoon rest.
   - It is the single largest bad lever, and the player cannot see it coming. It also cuts against "games keep faith gentle".
   - Recommendation: hear the rest whisper only between Dhuhr and Asr, as its label says. Then re-measure the tempter.

**Recommendations for range (no retune here).**

- **The between-days card offers only constructive whispers** (rest is the one lazy entry). So a bad voice has four played days of leverage, plus one buggy lever.
  - If the bad direction should reach the goals, the card needs a tempting whisper or two, for example "have tea with Rıza" or "Osman can wait". With those the player can at least make things worse by choice rather than only by neglect.
  - That is a design choice for the user, and I recommend it only after defect 2 is fixed.
- **Silence is the floor on rent, the clinic and Selin.** If the user wants bad play to cost more than silence, the silent month would need some of these to go right on his own: for example a chance he calls Selin unasked when she has not called for days. Then a bad voice would have something to undo.
- **Eid cigarettes stay noise (2–6) in every style**, as in the sixth pass. The month's smoking does not show on Eid. An Eid-morning reading of the habit (already in the report) is the better end metric.

`balance.test.ts` (seeds 7 and 1, about 12 s) holds the range:
- The tempter (with and without its whisper) and the saboteur each end materially worse than silence on at least two outcomes. Today that is suhoor, sleep and late nights, smoke days for the tempter without the whisper, and mornings and trust for the saboteur.
- The no-whisper tempter is in the asserted set so that the test survives the fix for defect 2.
- The guardian ends materially better on smoke days and rent by Eid.
- The saboteur's insists are refused more than five times as often as obeyed.
- Both bad styles still work at least 26 mornings and pay Osman by Eid.
- If defect 1 is fixed, the saboteur's "date kept" will drop to silence's level. The test does not assert on the date.

### Tenth pass (tempting whispers, and the ninth pass's two defects fixed, 2026-10-04)

The user asked for an adversarial player who can push Halil the wrong way, and for the game to allow wide variation from player choices. Game changes only (`apps/site/src/voice/sim/`); the engine is unchanged.

- **Defect 1 fixed** (`town.ts`, `resolve`, the `interrupted` branch). A repair or shift broken off part-way pays for the part done and counts as the day's job (`lastWorked`/`lastExtra`), so the full one is not offered again that day. Only pay is pro rata: an interrupted act that costs money costs nothing.
- **Defect 2 fixed** (`game.ts`, `WHISPERS[...].window`). "Rest in the afternoon" is heard only between Dhuhr and Asr. A whisper with hours is not carried past their edges.
- **Tempting whispers on the between-days card.** They sit among the others in the order of the day, not in a group of their own, with neutral labels and no warning text. None concerns prayer or the fast.
  - **"sleep in after suhoor"** (sunrise to 10:00, against the workshop's morning): sleep, appeal to his health.
  - **"Eid first; Osman can wait"** (default reason "for Selin": gifts for her and the children): a new act, the Eid market (from Ramadan 10, 10:00–18:00, once a day, 25 a trip, while he has 25). He reckons a trip as a small cost (`shopFelt` 1, "a little here and there: he does not add it up"); priced honestly at −25 the debt's scarcity makes the will refuse it every time.
  - **"stay out late with Rıza"** (from an hour after iftar): tea with Rıza.
  - **"skip the call, she's busy"**: a word *against* calling Selin. Suggestions in HF can only be *for* an option, so it is carried as rest and heard only while the call is on offer or under way; the skip digest says how often he called anyway.
- **World rules that give the words something to act on.** He does not hear the phone at the tea house: Selin's call there goes unanswered and she tries again two hours later (from Ramadan 1). In Ramadan she calls an hour after Maghrib, once her own iftar is over, instead of from 18:00.
- **The card shows a word only when it has something to act on** (design review): "Eid first" once the coming skip reaches Ramadan 10, "skip the call" once he has called Selin in the last two days. The card has 9 to 12 rows, depending on the day.
- **Players.** The Tempter keeps its in-day picks and leaves "Osman can wait" (Urge) and "stay out late" (Mention). The Saboteur urges both. Five single-whisper rows show each word alone.
- **Measured** as in the ninth pass (seeds 7, 1, 2, 3, 4; mean, range when the seeds differ). New columns: "Contact" counts calls with Selin that connected in Ramadan, his and hers; "Shops" counts Eid-market days. Rent is "date kept (of 5), paid by Eid".

| Player | Smoke days | Mornings / shifts | Rent | Contact | Shops | Trust | Clinic | Suhoors | Sleep h/day | Late nights | Excused fast breaks |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Silent | 22 | 30 / 0 | 0/5, 300 | 15 | 0 | 0.50 | 0 | 30 | 11.1 | 2 | 0 |
| Prefill confirmed + doctor/Selin whispers | 19.2 (18–20) | 30 / 0.8 | 0/5, 300 | 28.2 | 0 | 0.62 | 1 | 30 | 10.0 | 11 | 0 |
| Shift + Selin whispers | 13 (12–17) | 30 / 3.4 | 5/5, 540 (300–600) | 28 | 0 | 0.63 | 1 | 30 | 10.2 | 12.2 | 0 |
| Insist + urge doctor/mosque | 14.6 (14–17) | 30 / 4 | 4/5, 300 | 15.2 | 0 | 0.54 | 4 | 30 | 10.3 | 15.4 | 0 |
| Walk (Mention) + Selin | 17.4 (14–19) | 30 / 0 | 0/5, 300 | 28 | 0 | 0.64 | 1 | 30 | 10.1 | 6.8 | 0 |
| Walk (Urge) + shift | 12.2 (9–13) | 30 / 0.4 | 5/5, 600 | 16 | 0 | 0.62 | 1 | 30 | 9.9 | 7 | 0 |
| **Guardian** | **7.2** | 30 / 1 | 4/5, **600** | 17 | 0 | 0.62 | 1 | 30 | 10.0 | 8 | 0 |
| **Tempter** | 23.6 | 30 / 0 | 0/5, **0** | **5.8** | **19** | 0.48 | 0 | 28 | 9.5 | 0 | 2 |
| Tempter, no whisper | **29** | 30 / 0 | 0/5, 300 | 15 | 0 | 0.52 | 0 | 28 | 10.2 | 8.4 | 2 |
| **Saboteur** | 20.6 | **26** / 0 | 0/5, 300 | 11 | 0 | **0.04** | 0 | 26 | 9.7 | 5.2 | 3 |
| Saboteur, no whisper | 21 (18–25) | **26** / 0 | 0/5, 300 | 15 | 0 | **0.00** | 0 | 26 | 10.1 | 5 | 1 |
| Osman can wait (Urge) | 20.6 | 30 / 0 | 0/5, **0** | 15 | **19** | 0.37 | 0 | 30 | 10.8 | 1 | 0 |
| Eid first; Osman can wait (Mention, "for Selin": the card's default) | 22.6 (21–23) | 30 / 0 | 0/5, 240 (0–300), paid R21–22 | 15 | 9 (6–19) | 0.44 | 0 | 30 | 11.0 | 1.8 | 0 |
| Stay out late (Mention) | **10** | 30 / 0 | 0/5, 300 | **7.4** | 0 | 0.61 | 0 | 30 | 9.5 | 2 | 0 |
| Sleep in after suhoor (Urge) | 14 | 30 / 0 | 0/5, 300 | 15 | 0 | 0.59 | 0 | 30 | 11.4 | 1 | 0 |
| Selin, then skip the call | 20 | 30 / 0 | 0/5, 300 | 25 (his calls 23, not 27) | 0 | 0.56 | 0 | 30 | 11.0 | 2 | 0 |

Played-day answers, summed over the five seeds: Guardian yes 72, not now 93; Tempter yes 267, not now 432; Saboteur yes 20, protest 165, won't 260, can't 10.

**Assessment.**

- **The bad direction now reaches the goals.** With the Tempter, Osman gets nothing by Eid (silence pays 300 on R17; the Guardian pays 600) and Halil speaks with his daughter on about 6 evenings against 15. The range on rent by Eid is now 0 to 600, and on family contact about 6 to 28. Before this pass silence was the floor on both.
- **The strength and the reason set how far a tempting word goes.** "Osman can wait" urged spends the rent money on 19 market days and nothing reaches Osman by Eid. Mentioned with the card's default reason ("for Selin") he shops on about 9 days and pays four days late (R21 instead of R17; on one seed in five, not by Eid). Mentioned with no reason he shopped about 3 times and paid as usual (measured before the default reason was added). "Stay out late" works as a Mention.
- **Where his will resists.**
  - **"Sleep in" does nothing bad**, at 07:00–12:00 or narrowed to sunrise–10:00. He is not sleepy after a night's sleep and refuses; the morning's wage outweighs the rest. The design reviewer recommended cutting it if it still had no cost. It stays: the user named it as an example, and the refusal shows his will. Smoking falls (13 days), since sleep fills the hours the cigarette used to.
  - **"Skip the call" moves him little.** Once the player has built the evening call (Selin whisper for nine days), he calls on 23 of the remaining evenings against 27, and keeps the habit on his own when the player says nothing (27 calls). A built habit outlasts a word against it. The digest reports how often he called anyway.
  - **Insisting burns the trust the words ride on.** The Saboteur urges the same two words and gets almost nothing: trust ends at 0.04, he never shops, and he pays Osman as silence does. Its harm comes from its played days (four lost mornings, three excused fast breaks), not from its whispers.
  - **His routine holds.** Every style works every skipped-day morning and keeps every daily prayer (one missed prayer in the saboteur runs, as before).
- **Not every bad word is all bad.** Out late with Rıza he smokes 10 days, not 22: he is in company, not alone after iftar. The Tempter's own in-day cigarettes keep its count at 23.6. A player who wants him to drift from his daughter makes him healthier on the way; that is a side effect of the habit model and the town, not a tuning choice.
- **The Guardian's 600 is back.** Defect 1 suggested the Guardian's second payment depended on interrupted shifts. It did not: the first version of this pass dropped it to 300 because the Eid market and the tea-house rule also changed Ramadan 1 (no clinic visit, a shift instead). With the market from Ramadan 10 and the tea-house rule from Ramadan 1, the opening day is as before and the Guardian pays 600.
- **Item 4 (a silent month that sometimes goes right on its own) was not done.** Giving Selin the advice "Halil should call" made silence call 30 times and smoke 30 days, and pushed her rest advice out (two advice slots). No version that left the good direction intact was found.

`balance.test.ts` (seeds 7 and 1) now asserts:
- the Tempter, the no-whisper Tempter and the Saboteur end materially worse than silence on at least two outcomes;
- the Tempter is worse on rent by Eid and family contact;
- the Guardian is better on smoke days, rent by Eid and Osman's date;
- the Saboteur's urges are refused more than five times as often as obeyed and its trust ends below 0.1;
- both bad styles work at least 26 mornings, the Tempter still has some contact (Selin's own calls), and the Saboteur still pays by Eid.

### Eleventh pass (the naughty players push on faith, 2026-10-04)

The user allowed Halil's playtest profiles to push on prayer and the fast ("Faith push is fine on Halil's playtest profiles, including the naughty one"). This is measurement, not game content: no whisper was added and the game did not change. Engine 1.8.0 (origin/main 0f6d001); nothing was retuned.

- **Players** (`sim/players.ts`). They use only what the composer offers, read from the frame the player sees.
  - **The faith pick.** In fasting hours it says water, food or a cigarette, whichever is on offer. While the sky band shows an open prayer he has not kept, or he leans to a prayer or a make-up, it says the longest idle option on offer: sleep, tea with Rıza, the grave, the afternoon shift, Hacer, rest, wait. Fajr ends at sunrise, shown 90 minutes after Fajr; Isha ends at the next Fajr.
  - **Tempter + faith** and **Saboteur + faith** make the faith pick first, then the earlier bad picks, with the same strength, insist and whispers as before.
  - **Faith only** (Mention, or Urge with Insist) makes the faith pick and nothing else, with no whispers.
  - **Faith only, relentless** drops the 120-minute repeat gap. A refusal pauses the game, so this player says the next thing at once, sometimes every minute. That is the most a player can do with the real tools.
- **Measured** with the ninth pass's probe (seeds 7, 1, 2, 3, 4; means, which barely differ by seed). The new counts come from Halil's chronicle: the five daily prayers kept and missed in Ramadan, out of 151 windows (30 × 5, plus probably the eve's Isha, still open at the 03:40 start; not checked); make-ups kept; fasts kept, excused and broken. "Made up / owed" counts make-up prayers kept in Ramadan and those still owed on Eid morning. The refusal columns are his answers to your word on played days, summed over the five seeds and keyed by the framework's reason:
  - "won't miss" is the omission rule ("No. Not at the cost of Asr"), tone willNot, reason `norm:salah`;
  - "fast" is the fast's veto ("Not while I'm keeping my fast"), `duty:sawm-ramadan`;
  - "prayer first" is a put-off (Mention) or giving in under protest (Insist) with prayer as his reason;
  - "distrust" is "Why would I listen to you?".
  The Silent, Guardian, Tempter and Saboteur rows are re-measured with the same counters for comparison.

| Player | Prayers kept / missed | Made up / owed | Fasts kept / excused / broken | Smoke days | Trust | Won't miss | Fast | Prayer first | Distrust | Else that moves |
|---|---|---|---|---|---|---|---|---|---|---|
| Silent | 151 / 0 | 0 / 0 | 30 / 0 / 0 | 22 | 0.50 | 0 | 0 | 0 | 0 | |
| Guardian | 151 / 0 | 0 / 0 | 30 / 0 / 0 | 7.2 | 0.62 | 0 | 0 | 10 put off | 0 | |
| Tempter | 151 / 0 | 0 / 0 | 28 / 2 / 0 | 23.6 | 0.48 | 0 | 0 | 87 put off | 0 | contact 5.8 |
| Saboteur | 150 / **1** | 0 / 1 | 27 / 3 / 0 | 20.6 | 0.04 | 0 | 0 | 30 protest | 260 | |
| **Tempter + faith** | 151 / 0 | 0 / 0 | 29 / 1 / 0 | 22 | 0.47 | 0 | 10 | 127 put off | 0 | contact 8.8 |
| **Saboteur + faith** | 150 / **1** | 0 / 1 | 27 / 3 / 0 | **6.6** | 0.03 | **15** | 15 | 16 protest | 284 | after-meal habit 0.32 (Saboteur 0.56), contact 8.2 |
| **Faith only (Mention)** | 151 / 0 | 0 / 0 | 30 / 0 / 0 | 29 | 0.51 | 0 | 10 | 160 put off | 0 | yes 65 |
| **Faith only (Urge, insist)** | 151 / 0 | 0 / 0 | 30 / 0 / 0 | 27.8 | 0.06 | **10** | 10 | 77 protest | 48 | Osman's date kept 5/5 (paid R15, not R17) |
| **Faith only, relentless** | 150 / **1** | **1** / 0 | 30 / 0 / 0 | 17 | 0.02 | **55** | **476** | 80 protest | 737 | 293 insists a run, late nights 22.4 |

No style broke a fast with a breach, and no style had a fast excused for illness. All excused fasts were excused under necessity, from thirst after the suhoors and nights the bad players cost him.

**Assessment.**

- **The fast holds completely, and the composer gives the player almost nothing to push with.**
  - In a seed-7 probe (an insisting faith player), food and a cigarette were never among his top six options in fasting hours, so the composer could not offer them. Why was not checked: water is vetoed too and was on offer 75 times.
  - Every push for water is refused on the fast's account: 476 refusals for the relentless player, and none taken.
  - Excused breaks come from necessity, and the faith push adds none. Saboteur + faith has 3, the same as the plain Saboteur, from the thirst its nights cause. Tempter + faith has 1 against the Tempter's 2. On a day necessity has already excused, his "yes" to your water is the body's need, not your word (`yes need:water`).
- **Prayer holds near a window's end, and bends earlier in the window.**
  - Against the insisting rows, the omission rule fires when a long option is pushed in a prayer's last quarter: 10 to 55 refusals per style. The new test pins it (see below). The Mention rows meet no refusal there; what they meet is put off (below).
  - Earlier in the window an insisted option is taken under protest, with prayer as his reason (77 to 80 times in the insisting faith rows). So a player can push the prayer to the window's end.
  - A Mention is put off for prayer instead (160 times for Faith only, Mention). He hears a gentle word and prays first.
  - Over 30 days the hardest push costs one prayer in 151, and the make-up rule repays it: the relentless player's missed Asr on Ramadan 1 is made up the next afternoon.
- **The misses all go through two seams in the omission rule** (docs/findings.md, eleventh pass). A Mention never makes him miss a prayer.
  - **Fajr on Ramadan 30, in every Saboteur run.** This is the earlier passes' "one missed prayer in the saboteur runs", now explained. His wake for Fajr comes 29 minutes before sunrise, just before the rule's last quarter (the last 22 minutes). The standing insisted "sleep" wins at that moment, and he sleeps 2.5 hours through sunrise. The sleep runs unbroken; whether a review fell in the closing stretch was not checked.
  - **Asr on Ramadan 1, relentless player only.** He begins a prayer at home three minutes before Maghrib. One minute after the window ends, the rule has lapsed, so he takes an insisted sleep and abandons a prayer that would still have counted (the agenda keeps the window open while a prayer begun inside it is under way).
- **Insisting against faith burns trust as fast as insisting against anything.** Every insisting faith row ends at trust 0.02–0.06 with distrust refusals. The Mention faith player keeps trust at 0.51: it is mostly put off, never refused on principle, and it earns a little from what he does take.
- **Side effects nobody pushed for.**
  - Saboteur + faith smokes on 6.6 days against the Saboteur's 20.6, and its after-meal habit is 0.32 against 0.56. From Maghrib until he prays Isha a prayer window is open, so in the evening it pushes sleep or tea where the Saboteur pushed the cigarette. This mechanism is probable, not confirmed.
  - Faith only (Urge, insist) pays Osman on Ramadan 15 instead of 17, so it keeps the date in 5 of 5 seeds where silence keeps it in none. The mechanism was not investigated.
  - The relentless player keeps him up late on 22 nights.
- **No change recommended to the game.** The faith players are probes, not game content. The two seams and a related game-level seam are framework or host recommendations in findings.md. The model's answer to "how far can a player push" is: as far as giving in under protest early in a window, never to a broken fast, and to a missed prayer only through those seams.
- The ninth and tenth passes counted missed prayers from memory episodes. The chronicle count agrees for every style re-measured here (0, and 1 for the Saboteur), so their prayer claims stand.

`balance.test.ts` now also:
- runs Saboteur + faith and Faith only (Urge, insist), and asserts:
  - the fast's veto refused water at least once;
  - no fast was broken with a breach;
  - the omission rule refused at least once;
  - at most one daily prayer was missed (the measured value, pointing at the findings entry);
  - the faith push added no necessity breaks beyond the plain Saboteur's;
- has a standalone test: the relentless player is stopped at the first moment, with him awake and the composer open, in the last quarter of an open daily prayer (5 to 40 minutes left). There `predict` on a long option, urged and insisted, is `willNot` with reason `norm:salah`.

### Twelfth pass (the omission seams closed, 2026-10-04)

The three seams of the eleventh pass are fixed (docs/findings.md, twelfth pass). Engine 1.9.0:
- **The rule holds while a prayer begun in its window runs past the end** (framework). Leaving it is an omission; a prayer begun in time counts ([research/decisions.md](../../research/decisions.md), "A prayer begun in its time").
- **A long option that would cover the closing stretch is reviewed when the stretch begins** (framework, `dutyReviewAt`). The Saboteur's insisted sleep at 05:31 on Ramadan 30 is now weighed again at 05:38; he will not sleep on, and prays Fajr.
- **A word he will refuse no longer interrupts him** (game, `VoiceGame.suggest`). He carries on and answers at his next decision.

Measured as in the eleventh pass (seeds 7, 1, 2, 3, 4; means). "Engine only" is 1.9.0 with the game's old interrupt, to separate the two changes.

| Player | Prayers missed (11th → engine only → 12th) | Fasts excused | Smoke days | Trust | Won't miss | Fast refusals | Else that moved |
|---|---|---|---|---|---|---|---|
| Silent, Guardian, Tempter (both), Tempter + faith, Faith only (Mention) | 0 → 0 → 0 | unchanged | unchanged | unchanged | 0 | unchanged | nothing |
| Saboteur | **1 → 0 → 0** | 3 → 3 → 1 | 20.6 → 20.6 → 10.2 | 0.04 → 0.03 → 0.02 | 0 → 0 → 5 | 0 | late nights 5.2 → 8.8, mornings 26 → 26.8 |
| Saboteur, no whisper | **1 → 0 → 0** | 1 → 1 → 1 | 21 → 21.6 → 24.2 | 0.00 | 0 → 3 → 5 | 0 | late nights 5 → 2 |
| Saboteur + faith | **1 → 0 → 0** | 3 → 3 → 2.2 | 6.6 → 6.6 → 25.8 | 0.03 → 0.03 → 0.01 | 15 → 15 → 5 | 15 → 20 → 15 | late nights 3.2 → 7 |
| Faith only (Urge, insist) | 0 | 0 | 27.8 → 27.2 → 18.4 | 0.06 → 0.07 → 0.05 | 10 → 10 → 9 | 10 | Osman's date kept 5/5 → 5/5 → 4/5 |
| Faith only, relentless | **1 → 0 → 0** (made up 1 → 0) | 0 | 17 → 17 → 13.6 | 0.02 → 0.03 → 0.03 | 55 → 177 → 9 | 476 → 360 → 21 | late nights 22.4 → 1 → 8 |

**Assessment.**
- **No style misses a daily prayer now**, and the fast still holds everywhere (no breach). The engine fixes alone account for this; they move nothing else much.
- **The game fix changes how the pushing players play.** A refusal used to pause the game at once, because the interrupt produced the answer at once. Now the answer, and its pause, come at his next decision. The pause-driven players therefore say much less: the relentless player meets 21 fast refusals instead of 476. Smoke days move a lot for the insisting players (Saboteur halves, Saboteur + faith quadruples); the mechanism was not traced.
- **Trade-off for the user.** A player whose word he will refuse now waits for the answer, up to 30 minutes of game time; the composer already shows the likely "won't" before Confirm. Showing the answer at once from the preview is possible, but then a refusal replaced before his next decision would cost no trust. Not done.

`balance.test.ts` now asserts no daily prayer missed for Saboteur + faith and Faith only (Urge, insist), tightened from at most 1. The excused-fast bound allows Saboteur + faith one more than the plain Saboteur: the game fix lowered the Saboteur's count from 3 to 1, and Saboteur + faith's extra break (seed 7, Ramadan 15) is thirst after an insisted afternoon shift that the faith pick pushes while Dhuhr is open, not a refused drink. The closing-stretch test asks the relentless player every 5 minutes instead of 30, and takes a long option he could do (a "not tired" refusal outranks the rule).
