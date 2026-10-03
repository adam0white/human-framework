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

Engine 1.3.0. `npm run check`: 45 files, 529 tests. Measured on seed 7 with headless players (scratchpad probe, not in the repo):

| Play style | Osman's date (300 by R15) | Afternoon shifts | Clinic | His own calls to Selin (Eid) | Trust at Eid | Pauses |
|---|---|---|---|---|---|---|
| Silent | missed; 300 paid R17 | 0 | never | 0 (none) | 0.50 | 44 |
| Prefill + whisper doctor/Selin | missed; R16 | 3, on your word | once, on your word | 28 (18:55) | 0.59 | 53 |
| Insist every prefill + Urge doctor/mosque | kept; R15 14:46 | 4 | 5 times | 2 (none) | 0.51 | 51 |
| Prefill + whisper shift/Selin | kept; R11, second 300 R22 | 25, all on your word | once | 28 (14:55) | 0.62 | 46 |

- **A goal you can fail.** The wage is 16 (was 25): 40 + 16 × 15 = 280 by R15, so morning work alone misses Osman's date. A new `work-extra` affordance (afternoon shift, 90 min, dhuhr+15 to asr−90, not on Eid) pays 16 but carries no `material` term, so he does not reckon on it and almost never takes it alone; a voice can get him there. Osman comes to the door on his own date when nothing is paid. The workshop is shut on Eid (town custom, engineering assumption, no norm attached). When the shift opens and the projection falls short, the game pauses once a day ("The workshop has an afternoon shift. Mornings alone get him to about …", duty-risk kind) with the shift prefilled; the skip card offers it as a whisper. Only the whisper keeps the date reliably: the played-day pauses alone add 3 shifts, which is not enough.
- **Real decisions at pauses.** A pause comes only when his answer changes tone or on the first answer; a same-tone answer with a new counter-offer is logged, not paused. The suhoor wake is announced a minute ahead on a waking copy of him, so the composer opens before he chooses (the tutorial prefill and the first "yes" survive). The close-call prefill rule is gone; prefills now come from other voices' advice, rent, money, the doctor, and Selin after maghrib when he has not called for two days.
- **Cause and effect from the voice.** One suggestion credits at most one activity: the step in which the suggested activity finishes no longer hears the spent suggestion (it used to become two meals, both credited to you). The between-days card has "What your words did" lines. The skip digest names mornings and shifts worked and money, Osman's visits and payments, calls each way, the clinic, the fast (with illness excusals), and prayers. Halil's pane shows how the clinic, calling Selin and the mosque weigh on him, and whether that is easier than at the start.
- **Trust economy.** Asking again, without insisting, for something he declines while pressed wears trust 3 % (`worn`, at most once per 12 h); a repeat good outcome of the same suggested action earns gain / (1 + n). Small changes fold into one history entry with `from` and `count`, so the day card counts them on the right day.
- **Less samey days.** The afternoon shift, Osman's own-date visit and the closed workshop on Eid change the shape of days; naps no longer pause the game (log line only).
- **Eid payoff.** The report now opens with the plain summary (it was computed but never rendered), adds "What you used to say, and what he did on Eid" (a ledger by thing said, with his reason on Eid), shows Eid lines in clock order up to 24 (was cut at 8, around noon), hides empty "others" and "stopped" sections, and says when Osman's date was kept or missed and how many afternoon shifts were your doing. A first-cigarette beat marks the end of the fast's hold.
- **Defects fixed.** A prayer begun in its window and finished after it is kept, not missed (framework: under-way commitments stay open). Eid chain-smoking (a cigarette every 30–40 minutes from several cued habits) is bounded by an action-wide refractory: at most two in the hour after his first meal, pinned by a test. The day card's trust events read the day by `from`. `finish` events carry `decisionId`.
- **Not done:** the day-0 windows that have already passed at creation (ashamed/proud at 03:40); a voice proposing a resolve via `precommit`; Deniz's Eid gift; `visit-grave` never wins; the 10:00 craving beat can fire after his decision; a standing Urge to pray at the mosque sends him there about 20 times a day on skipped days (voluntary prayer, every hourly chunk), which is honest but absurd; low-priority toolbar height and favicon 404.

