# Game 2 — *The Day You Say Nothing*

Design spec, 2026-10-03. Implements the Game 2 premise of the [game-design review](../reviews/2026-10-02-gamedev-early.md) §5 against [`types.ts`](../../packages/human/src/types.ts) and [framework.md](../framework.md). Game 1 is [*Twice at the Well*](colony.md); where this spec needs one of its listed framework gaps it cites the gap number (G1-n) instead of restating it. The boundaries in [islamic-foundations.md](../../research/islamic-foundations.md) §3–5 and AGENTS.md apply throughout: the player is a suggestion, never a judge; nothing here scores worth, faith or acceptance.

## 1. Pitch

You are the one voice in Halil's head that is not his own, for the thirty days of the first Ramadan since his wife died. On the morning of Eid you are muted, and you watch whether the man you spent a month talking to still does, alone, the things you used to have to say.

## 2. The person

**Halil Demirci, 61.** He repairs bicycles, kettles and sewing machines in a rented shop on the market street of a small Anatolian town. Nuran, his wife of 35 years, died fourteen weeks ago after a long illness; the pharmacy bills are open and the rent is two months behind. He has not cooked for himself since. He has smoked after every meal for forty years. He used to pray Fajr at the masjid; he has not been since the funeral. His blood pressure is high and unexamined. None of this is a verdict on him: grief and illness are states of body and memory, and the game never maps them to devotion.

Why him: a student or new parent is about adding a life; a recovering addict is one forbidden norm against one craving, which the veto resolves too cleanly. A widower's life has *collapsed structure*: lapsed commitments, habits that lost their cue (he smoked with Nuran's tea), a job he still has, a daughter who still calls, a debt with a date. That is the framework's content. Ramadan supplies stable daily cues (suhoor, iftar, tarawih), a town that changes routine with him, and a fast that shows the perceived/true body split every afternoon.

**His world.** Every place is an affordance source; every person is a full `Person` in one `Community`.

| Place / person | Role in the simulation |
|---|---|
| Home (Nuran's chair, kitchen, phone) | Sleep, suhoor, iftar alone; the chair as a `placeId` cue for grief recall. |
| Workshop (rented from Osman) | `job` commitment, wages per repair, customers as percepts; Nuran's broken sewing machine under a cloth. |
| Masjid (Yakup Hoca) | Five prayers, tarawih, Eid prayer, the zakat al-fitr box. |
| Kıraathane (tea house) | Rıza, cards, cigarettes after iftar; the gossip channel. |
| Market, grocer, health centre, cemetery | Food costs money and the grocer runs a tab; Dr. Ayşe is the only place the true body is read aloud; the grave is a 25-minute walk. |
| **Selin**, 34, daughter | In the city with Deniz (6); calls most evenings; wants him checked, fed, and with them. |
| **Hacer Teyze**, 70, neighbour | Widow; leaves iftar at his door; carries news both ways. |
| **Rıza**, 63, friend | Retired, warm, bored; "one more hand". |
| **Osman**, 55, landlord | Owed two months; wants it by the 15th; has his own debts. |
| **Yakup Hoca**, 48, imam | Notices absences; asks without pressing. |
| **Deniz**, 6 | Arrives with Selin for the last ten days (`maturity` < 1; her needs become his percepts). |

**Season and pacing.** Thirty simulated days, first suhoor to Eid night. One day ≈ 3 real minutes, a season about 90; saves at every dawn; an optional "one day each day" pacing. Time runs continuously in a Worker (closed-form `tick`); the UI surfaces **moments**: a non-review decision whose top two options are within the close-call margin, a voice arriving, an attended percept with salience ≥ 0.5, every suggestion's acknowledgment. Six to nine a day; between them the day ribbon shows what he did, in his narration. No rewind.

## 3. Core loop

**The frame.** The player is labelled *you*, nothing else. The title card states the stance once: a suggestion is not yet a deed; he decides. The player never acts in the world and cannot see or touch anything Halil does not notice.

**Whispering.** The tray shows the affordances Halil currently notices, in his words ("Hacer's tray is on the step", "Rıza's at the window again"), ranked by his own utility so the player reads his inclination before speaking. One whisper per decision.

| Gesture | `Suggestion` | What it costs |
|---|---|---|
| Tap a card | `strength 0.35` ("a thought") | Nothing if he was going to anyway; `pressure +0.05` if he was not. |
| Hold a card | `strength 0.7` ("a pull") | `pressure +0.1` when against preference. |
| Appeal chip on a held card | `appeal: 'benevolence' \| 'duty' \| 'safety' \| 'meaning' …` | Only chips for motives the player has *seen* in his trace are unlocked; a mismatched appeal earns nothing (`appealBonus` only on match). |
| Swipe up: insist | `insist: true` | Shown on the gesture before release: "autonomy −, he'll remember, no credit if it goes well". `learnFromVoice` gives zero trust for a compliance that went well; insisting can only lose. Never overrides `cannot`, `willNot`, or an obligatory duty in its closing window (the omission-veto decision recorded in HANDOFF). |

Before release, the card shows `predict()`'s verdict: *likely*, *later: after iftar*, *he'll do something like it*, *won't*, *can't*. No surprises after the click.

**How he answers.** Typing dots within one sim minute, then `SuggestionResolution.says` in verdict colour (green assented, amber deferred/modified with the counter-offer in italics, grey cannot, red will-not, struck-through amber complied), then `narration` from `narrateDecision`: templated, deterministic by decision id, citing an episode when memory moved him. No language model anywhere in the loop; richer speech comes from host phrase packs and role names (N6).

**Trust, pressure, autonomy.** `VoiceRelation.trust` for `you` is drawn as a thread at the top of the page with the last three events that moved it, labelled *his trust in you*. Pressure is not a number: at `pressure > 0.4` his lines shorten and the dots take longer; above `0.6` with trust under `0.25` any whisper gets the red *"Why would I listen to you?"* (`distrust` veto, `WILL_DEFAULTS`). Autonomy is his `autonomy` need; when it is low, "My choice, this time" starts winning tray cards you did not pick.

**What the player sees of his mind.** Only what he notices or feels.

| Shown | Source | Hidden |
|---|---|---|
| The felt body: a line-drawn figure shaded by `readBody().perceived` | body | True `BodyState`. At 16:00 of a fast he says "I'm fine" while true satiety is 0.2; `sleepDebt` from 03:30 suhoors is under-perceived by design. Only the doctor reads the true body aloud (a `told` percept). |
| Emotions he would name: `readAffect().dominant` ≥ 0.2, as a margin word | affect | Mood as a number. |
| Memories, only when cited in narration or recalled by a cue (N11) | memory | The episode list. |
| Beliefs, only when he says or acts on them ("Osman won't wait") | beliefs | Credences. |
| His commitments, in his words ("rent by the 15th") | agenda | Importance. |
| His trust in you, with the last three events | will | Other voices' trust, inferred from what he does when they speak. |

**Habits as progression.** Every completed action lands on the kilim (§5): a 30-row weave, one row per day, hours across. A repeated action at the same hour and place darkens a vertical stripe (`Habit.strength` × cue match). Each dawn the host runs a silent `decide` on a snapshot with no suggestions at each of yesterday's whispered cues; actions he would now choose unprompted move to a list titled **things you no longer need to say**. That list is the only progression counter in the game.

The numbers (headless probe, 2026-10-03, default coefficients): a `pray` habit reinforced on 30 spaced days reaches strength 0.69, a term of 0.41, and *loses* to a moderate sleep need (0.77) at 05:10; 66 days (0.55) also loses. Stacked on a held `salah` norm (0.51) and the Fajr commitment (0.29) it wins from day 10. So habits here lower the whisper he needs; they do not replace understood duties. The player's real work is rebuilding structure: getting him to re-adopt the commitment, to make a precommitment of his own ("no cards after Isha", `WillState.precommitments`, unused so far and exactly this game's device), and only then letting habit carry it. Whether a plateau habit should carry a low-cost action against a moderate need is a question for a discriminating experiment (N4), not a tune.

**Other voices.** Every other person is a `Person` in the `Community`. When Selin's own decision chooses `call(Halil)`, the host delivers a `told` percept with her claims at *her* credence and a `Suggestion{voiceId:'selin'}` on his next decision. Same mechanic, same verdicts, same trust learning; the player's whisper competes in the same decision (N1). What each voice says falls out of their own values and beliefs:

| Voice | Typical pushes | Their lever |
|---|---|---|
| Selin | see the doctor; eat; don't fast with your pressure; come to us for Eid | high trust from the start; her appeals are `benevolence` ("for Deniz") |
| Hacer Teyze | eat what I left; come to tarawih, the Hoca asked; don't sit with Rıza every night | gossip: `told` claims about Rıza, Osman, the town's view of Halil |
| Rıza | kıraathane after iftar; one more hand; a cigarette; skip tarawih tonight | trust built on forty years; `belonging` when Halil is lonely |
| Osman | rent by the 15th; fix my van first | material; an appointment commitment with a deadline |
| Yakup Hoca | come to Fajr; the box for zakat al-fitr is by the door; bring Deniz to Eid prayer | `duty` appeals, low pressure |
| Dr. Ayşe | break the fast when ill; pills at dawn; rest | the only `told` source whose claims are about his true body |

Reputation is the others' beliefs about him (`p:halil:owes-osman`) moving through `told` percepts between *them*: what Hacer says on day 12 depends on what Rıza told her on day 11.

## 4. The muted day and the ending

Day 30 is Eid. The tray is gone; the kilim's last row weaves at 1× with the moments shown as always. The day holds only what the month built: zakat al-fitr due before the Eid prayer (an `appointment` with a hard `until`); the prayer itself; the cemetery, Hacer's door, Selin's call, Osman's rent; Rıza at the kıraathane by ten; a cigarette after the first daytime meal in a month, the cue his forty-year habit has waited for. The player can open any why-sheet and say nothing.

**The epilogue** runs the `Community` forty more days headless with the player voice absent and every other voice live, then narrates from the chronicle (N3):

- *What he did without you*: actions on Eid and in the forty days that the player had been whispering during Ramadan and that he now does from habit, commitment or precommitment; the kilim stripes that held.
- *What you were still saying*: whispered actions that never moved to the list; shown plainly, without judgment.
- *Who he listens to now*: his trust in each voice, as relationships, not a ranking of goodness.
- *His body, as the doctor would read it* on day 70: blood pressure, sleep debt, weight. Shown as medical fact, since the doctor is the one source that reads the true body.
- *What is still open*: the debt, the sewing machine, the chair.

Endings emerge along independent axes (prayer structure, the smoking cue, debt, health, three relationships, purposes kept or abandoned) and are not enumerated. For illustration, states the headless controls should be able to produce: he prays Fajr at the masjid alone and still owes Osman; he is debt-free, smoked on Eid afternoon, and Rıza is the voice he trusts most; he went to Selin's, kept nothing of the month, and the chronicle's last line is a `missed worship`. No score, star or word about worth or acceptance. The end card is the man, the kilim and the lists.

## 5. Visual identity and UI

Portrait, mobile-first, one screen, three bands. No map, no sprites of him; the whole game is paper, sky and thread.

- **Sky band (canvas, top 18 %).** The light of the hour: pre-dawn indigo `#1B2140`, a thin orange rim at suhoor's end, white glare at Asr, lantern amber `#E8A33C` after Maghrib. Adhan times are notches on the band's lower edge. The season clock is the **moon**, drawn in its true phase for the day: a sliver on day 1, full on day 15, gone by day 29, the Eid crescent on 30. Weather is a smear.
- **Page band (middle, scrolling).** Cream paper `#EDE6D6` with faint ruled lines at the five prayer times. Halil's lines in a serif (Spectral), his named feelings in the margin in small caps, the felt-body figure at the right edge: a single continuous ink line whose fill darkens where he feels hunger or heaviness. Other voices arrive as a different paper: a torn phone-message slip for Selin, a tray-shaped card for Hacer, a tea-glass ring for Rıza, a window envelope for Osman.
- **Tray band (bottom, 72 px + safe area).** The things he notices as horizontally scrolling cards in his words, hit targets 44 px, telegraph text under each. Hold shows the appeal chips he has revealed. Swipe up on a held card is insist, with the price printed on the card before release.
- **The kilim.** Swipe the page down and the season appears as a woven rug on madder red `#A3322B` and indigo: 30 weft rows, 24 warp hours, each completed action a knot in a colour by family (worship indigo, work ochre, food cream, kıraathane tea-red, rest grey, phone green). Habit stripes darken down the rug; the Eid row weaves live. Tap a knot for its decision record. This is also the save screen.
- **The why-sheet.** As Game 1 §5: stacked term bars for the top three options, advertised vs believed deltas, the cited episode, the trust thread with its last three events. Monospace figures, labelled *estimates*.

React renders snapshots only; the Worker runs the `Community` and emits `moment`, `verdict`, `kilim-row`, `chronicle-day`. Canvas is DPR-aware; nothing requires landscape.

## 6. First ten minutes

Real time at 1×; the first day is slowed to about four minutes so the loop teaches itself. Quoted lines are `narrate.ts` templates or marked as host phrase-pack lines (N6).

| Time | Beat |
|---|---|
| 0:00 | Title card, indigo sky, thin moon: *He decides. You can only say.* Halil asleep, 03:20, Ramadan 1. One tray card: the alarm Nuran used to set. |
| 0:20 | 03:40. He wakes for the seeded suhoor `appointment`. Tray: *tea and bread*, *back to sleep*, *a cigarette first*. Telegraph on *tea and bread*: "likely". Tap; green *"Fine."* The felt body lightens; the first knot lands on the kilim. |
| 1:00 | 04:05. Tray: *a cigarette*, *the masjid for Fajr*, *sit*. Telegraph on *masjid*: "he'll do something like it". Hold it: amber, *"I'll pray at home instead."* (`modified`, same `mainAim`). He prays at home. Toast: *tap any line to see why.* |
| 2:00 | 09:30, workshop. Percept: "Osman's van won't start". Tray: *fix the van first*, *the bicycle he promised the neighbour's boy* (a `promise`). Telegraph on the van: "he'll do something like it". The player says nothing; he keeps the promise; Hacer will hear of it. |
| 3:30 | 15:50. The felt body says "fine"; he nods at the bench (true sleep debt). Margin word *heavy*. Tap *rest*; green. |
| 4:30 | 18:40, Hacer's tray on the step; iftar. 19:20, the cue: *a cigarette*, *tarawih*, *the kıraathane with Rıza*, *call Selin back*. Telegraph on *tarawih*: "later: Rıza's waiting". No appeal chip is unlocked yet. He goes to the kıraathane. No red all day; the colours are earned. |
| 6:00 | Day 2, 03:35. A phone slip on the page: Selin's call last night, *see the doctor this week*, now a standing suggestion. *Tea and bread* sits first in the tray on its own: his inertia, not yours. The ribbon goes to 1×. |
| 7:30 | Day 2, 16:20. Osman at the door: the rent, the 15th. A new line under *things he has said he'll do*; margin word *worried*. Hold *fix the sewing machine*: amber, *"Not now. After I eat."* |
| 9:00 | Day 3, 04:10. Hold *masjid* with the `meaning` chip, unlocked because "something that matters" appeared in his trace yesterday. Green, *"Alright, I'll do it."* (trust still 0.5). |
| 10:00 | Day 3, 04:50. Walking back he passes the cemetery road; a cue recall: *Nuran, Fajr, the winter before last*. Margin word *grief*. Nothing to tap. The prayer's `finish` has run: the trust thread ticks up and names the event, because trust moves on how followed advice felt, not on assent. The session ends on a man in a road at dawn; the kilim has three rows. |

## 7. Systems

**Used as they exist.** `Person` and the `Community` driver for seven people over 30 + 40 days (inside the 20×30-day budget); `decide`/`predict` with typed verdicts; `readBody().perceived`; `Habit`, `habitPull`, `advanceHabits`; `Commitment` kinds `worship`, `job`, `promise`, `appointment` with `recurEvery` and `commitmentPressure`; `Goal`, `proposeGoals`; `normTerms`, `normVeto` with the 2:173 necessity exception, `recordDeed`, `repent`, `recordRepair`, intentions; OCC-lite `appraise` with `grief` on loss and `regulate`; `remember`/`recall`/`learnOutcome` and `Considered.recalled` cited in narration; `attend`/`believe`/`confirm`, `sourceTrust`, `judge`; `Relationship` roles and ledger; `VoiceRelation`, `learnFromVoice` asymmetry, pressure decay, the `distrust` veto, `precommitments`; `lifeModifiers` for 61 and 6; `material` with the saturating term; `Illness`, `sicken`; `snapshot`/`restore` and input-log replay. Game 1 gaps reused as specified there: G1-2, G1-3, G1-5, G1-7, G1-8, G1-13.

**New capabilities needed.**

| # | Pri | Capability | Data / behaviour / API |
|---|---|---|---|
| N1 | must | **Several voices in one decision** | `DecideOptions.suggestions: Suggestion[]` (keep `suggestion` as sugar). `consider` adds one `suggestion:<voiceId>` term per voice; `will.evaluate` returns `resolutions: SuggestionResolution[]`, one per voice, with the winning voice's resolution attached to `Activity.suggestion` so `learnFromVoice` credits the right voice. Counters and pressure per voice. `DecisionRecord.suggestions`. |
| N2 | must | **Abstention commitments** | `Commitment.kind` adds `'abstain'`, with `violatedBy: string[]` (action ids) and optional `exemptWhen: 'illness' \| 'travel'`. Kept at window close if no violating completed outcome fell inside the window; broken on the first violating completion (`onFinished`). Decision-time behaviour, not only bookkeeping: while the window is open `agendaTerms` emits a *negative* term on `violatedBy` actions (importance × held conviction), and N5's omission veto extends to high-conviction `abstain` commitments (`willNot`, reason `duty:sawm-ramadan`) so insisting cannot break the fast either. Food affordances stay on offer all day; the design depends on him choosing not to eat, and today `need:food` at the 0.7 hunger interrupt (≈ 4 × 0.7 × gain) beats any positive norm term. Fasting, "no cards after Isha" and "no cigarette after iftar" all use the kind. The fast's exemption is a catalogued understanding (`sawm-ramadan` gains `sources` for Qur'an 2:184 and an `exemptions` field with provenance), not a coefficient, and is distinct from the forbidden-norm necessity exception. |
| N2b | must | **Fasting adaptation in perception** | `body/`: perceived hunger and thirst are damped while an open `abstain` commitment covers `eat`/`drink`, with the damping strengthening over consecutive fasting days and the true body untouched. Without it `readBody().perceived` masks hunger only by focus and emotion, and the felt body's "I'm fine" at 16:00 (§3) has no mechanism. Earns its place with a test that true satiety still drives capacity and health. |
| N3 | must | **Chronicle (autobiographical consolidation)** | New `chronicle/` module owning `p.chronicle: DayRecord[]` (bounded 120): per day, kept/broken/released commitments, habit strengths that crossed 0.25/0.5/0.75, voice trust deltas, the two most salient episodes, breaches and repairs, material balance delta, illness changes. Written at the day-grid boundary in `tick`. Pure `narrateChronicle(p, from, to)` for the epilogue and `diffChronicle(a, b)` for *what he did without you*. `trace` stays at 32. |
| N4 | must | **Habit term calibration experiment** | Not a tune. A headless discriminating test in `docs/roadmap.md` style: a low-cost cued action at plateau strength vs. moderate needs, compared with the Lally et al. automaticity account; decide whether `habitScale` depends on action cost, or whether habits should instead lower effort/switch cost rather than add utility. The game is designed to work either way (§3), but the result decides how much the kilim stripes mean. |
| N5 | must | **Omission veto for closing obligatory duties** | The HANDOFF decision, implemented: insisting cannot pull a high-conviction holder off an `obligatory` norm's commitment whose `commitmentPressure ≥ wakeCommitmentPressure`; verdict `refused/willNot`, reason `duty:<normId>`. Covers "eat now" during the fast and "skip Fajr". |
| N6 | must | **Narration phrase packs and role names** | `narrate` accepts a host `Lexicon` (`{ names: Record<EntityId,string>, roles: Record<string,string>, lines?: Partial<typeof NEED_LINES> … }`) so `nameOf` says "Selin", "Hacer Teyze", "my daughter", "my landlord" instead of ids; still templated and deterministic. |
| N7 | must | **Per-day prayer times** | `prayerWindows(day, times)` already takes a schedule; add a `PrayerCalendar = (day) => PrayerTimes` so recurrence re-reads the day's times (fast start/end move ~1 min/day over a month). Also the Eid prayer as a one-off `worship` commitment with no `recurEvery`. |
| N8 | should | **Habit extinction by withholding** | `habits.withhold(p, action, ctx)`: when a cue matched ≥ `sameContext` and the person completed a different action, the matching habit loses a fraction of strength (asymmetric, smaller than `gain`). Without it a 120-day half-life means the cigarette habit cannot move in 30 days; with it, Ramadan's cue disruption is modelled rather than asserted. Should earn its place with a test against habit-discontinuity findings. |
| N9 | must | **Standing advice** | A `told` percept whose claims name an action leaves a decaying `advice` term (`suggestion:remembered:<source>`) for that action on later decisions, weighted by `sourceTrust` and salience, half-life about two days. Selin's "see the doctor" keeps pulling after the call ends. Promoted to must: the first session's Day 2 beat depends on it. |
| N10 | should | **Conversation and gossip helper** | `social/converse(speaker, listener, topics)`: from the speaker's beliefs about third parties, produce `told` percepts with `claims` at the speaker's credence and `norms` for judged deeds; the listener's `attend`/`believe`/`judge` do the rest. Also a `talk`/`call` affordance convention that makes the other party's suggestion emerge from *their* chosen action. Reputation is then only beliefs plus this. |
| N11 | must | **Cue-triggered recall** | `memory.recallByCue(p, {placeId, hour, targetId})` invoked by the composite on `begin` and on attended percepts; a recalled high-salience episode is re-appraised at reduced intensity (grief at the chair, the cemetery road), and `recalled` is set on the record so narration cites it. Promoted to must: the first session's Day 3 beat depends on it. |
| N12 | should | **Illness trajectory coupled to behaviour** | `Illness.trendPerDay` adjusted in `advanceBody` by rest, satiety and hydration (fasting while ill worsens; rest and food recover), with the doctor's `told` claims reading true `BodyState`. A chronic condition (hypertension) as an `Illness` with `trendPerDay ≈ 0` whose severity scales with sleep debt and smoking outcomes. |
| N13 | should | **Scarcity-aware material term** | `ConsiderContext.scarcity: Unit` from the host (debt relative to income); the material term and the `security` need gain scale with it, so money matters more to a man two months behind than the saturating `materialScale` alone allows. Debt itself is a host ledger plus `promise` commitments with `toId: 'osman'`. |
| N14 | could | **Purpose revision** | Goals that are repeatedly deferred lose importance and are abandoned with an episode; goals adopted by `proposeGoals` carry `serves` values so narration can say "to be useful to Selin". Needed for "what is still open" to read as his, not the designer's. |
| N15 | could | **Dependent care** | A child `Person` whose urgent needs emit `felt` percepts to a caregiver and spawn `care` affordances tagged `help`; `maturity` already exists. Deniz's ten days exercise it. |
| N16 | could | **Long-horizon epilogue tooling** | `sim/runSilent(community, days, {mute: ['you']})` returning chronicles; a helper, not new behaviour. |

Small items found while probing: `createAgenda` should assign ids to spec commitments (filed as a task), and `Percept.channel` needs `'outcome' | 'social'` (G1-6).

## 8. Risks

| Risk | Mitigation |
|---|---|
| The player optimizes: whispers at every decision. | Pressure shows in his speech; `distrust` is a wall; insisting earns nothing when it works. The only counter that grows, *things you no longer need to say*, rewards silence. A day with no whispers is a legitimate day. |
| He feels like a puppet. | Most moments are his; the tray is ranked by *his* inclination; deferrals carry counter-offers; the muted day is the game's proof of its own claim. If a tester cannot say why within five seconds of the why-sheet, the term vocabulary is wrong. |
| Preachiness. | No score for worship, no praise from the game, no voice called conscience. Yakup Hoca and Rıza are both voices with trust meters. Steer him away from the masjid and the game narrates it without comment. |
| Grief or fasting read as weak faith or a penalty. | Grief is `grief` with cue recall; the fast is an abstention commitment with a catalogued exemption; illness is a body state. Said once, in the collapsed model-notes section AGENTS.md assigns. |
| Habits do not visibly form in 30 days. | Known from the probe: structure (norm + commitment + precommitment) is the carrier, habit the reducer of whispers. N4 decides the rest; N8 is required for any habit to weaken. |
| Thirty days is long on a phone. | Three minutes a day, saves at dawn, "one day each day" pacing, the kilim as the reason to return. |
| Ramadan practice represented wrongly. | Every norm and exemption passes through the host catalog with provenance; prayer times from a calendar; Eid timing and the zakat al-fitr deadline are the host's stated understanding, reviewed by the user before release. |
| The other voices sound scripted. | They are `Person`s; their pushes come from their values and beliefs via N1 and N10. A voice that says the same thing nightly is a finding about the social model, not dialogue to rewrite. |
| Narration monotony over 300 moments. | N6 phrase packs, episode citation, close-call lines; six to nine moments a day; the kilim carries the rest. |
