# Game 1 — *Twice at the Well*

Design spec, 2026-10-03. Implements the Game 1 recommendations of the [game-design review](../reviews/2026-10-02-gamedev-early.md) §4 against the contract in [`types.ts`](../../packages/human/src/types.ts). Architecture is in [framework.md](../framework.md); this file does not restate it.

## 1. Pitch

Six villagers, two days, one well, one storm. You give the same orders to the same village twice, side by side: on the left they obey like colony-sim units, on the right they are people, and by dinner you can see which village you would rather live in.

## 2. The map

One 20×14 grid of 32 px tiles, top-down, flat colour, no outlines, long shadows that swing with the sun. Both panes draw the identical map.

| Place | Tiles | Role |
|---|---|---|
| Homes ×3 | 2×2 each, mudbrick | Maryam+Tariq; Yusuf; Idris+Samira. Danyal sleeps in the well-house. Sleep, eat stored food, rest. |
| Well | 1 tile + stone apron | Only water source. One person draws at a time; others queue. |
| Field | 4×3 | Grain, 1 unit per 20 min of gathering. Open to sky (storm-exposed). |
| Forest | 5×4 edge strip | Timber 1 unit / 30 min; the *big cedar* yields 3 but is risky. Dark and windy at night. |
| Kitchen + granary | 2×2 | Grain + water + 40 min → 3 meals. Stores meals and grain. |
| Building site | 3×3 | The half-built house. 10 build stages; stage 7 is the roof beam. |
| Masjid | 2×2, small whitewashed room | Prayer at the five times; also the storm shelter (stone, roofed). |
| Shelter | = masjid | A second sign on the same building: "shelter". Danyal uses it too. |

Flows: field → grain → kitchen → meals → people. Well → water → kitchen and people. Forest → timber → site. Nothing is traded or researched.

**Clock.** Game starts Day 1 05:00 (Fajr adhan) and ends Day 3 05:00: 2880 sim minutes. Prayer times fixed: Fajr 05:00, Dhuhr 12:30, Asr 16:00, Maghrib 18:45, Isha 20:15. Night is 19:30–05:00 (darker palette, lanterns).

**Weather.** One storm front. Leading edge: a squall Day 1 21:30–23:00 (wind and cold; forest and field become `risky`; buildings unharmed). Main storm: Day 2 19:00 → Day 3 03:00. Outdoors during the storm: injury roll every 10 min; unfinished house stages below 7 lose one stage per hour unless shuttered (a build job available from 16:00 Day 2). A warning percept fires Day 2 16:00 (sky darkens).

**Speed.** Default 16 sim-min per real second (one day ≈ 90 s; one run ≈ 3:00 plus slow-mo). Controls: pause, ½×, 1×, 2×. The worker steps both sides in lockstep one sim minute at a time; the renderer draws the latest snapshot per frame. Bubbles have real-time minimums (§5) so speed never hides a refusal.

## 3. The shared order system

The player is one voice (`voiceId: 'player'`). Every order fans out as one card applied to both sides at the same sim minute.

| Order | Gesture | Classic | Human |
|---|---|---|---|
| Job at place | tap villager → tap place (job inferred: forest = gather timber, field = grain, well = water, kitchen = cook, site = build, masjid = pray/shelter, home = eat/sleep) | sets the unit's task immediately | `Suggestion{action, strength: 0.6}` |
| Rush | hold on the card | work 25 % faster, double hunger/HP drain | `strength: 0.9` |
| Insist | toggle on the card, shows its price ("autonomy −, trust risk") | greyed: "already obeys" | `insist: true` |
| Appeal | optional chip: "for the children" / "it's your duty" / "you'll be safer" | ignored | `appeal: benevolence / 'duty' / safety` |
| Cancel | swipe card away | unit idles | suggestion withdrawn; person re-decides |

**Order lifetime.** A suggestion is per decision, but a card persists: the host re-issues the suggestion at each of that person's decisions until it is assented-and-completed, cancelled, or 2 sim hours old (then the card greys with "lapsed"). A deferral is never a silent drop; the card shows the counter-offer and waits.

**Queue UI.** A vertical strip of cards between the panes (desktop) or a sticky bottom tray (mobile). Each card: villager portrait, place glyph, and two small result chips that fill in from each side — Classic's is always a green tick; Human's is the verdict colour (§5). Hovering or long-pressing a Human villager before issuing shows `predictResponse`: "Likely yes" / "Later: hungry" / "Will refuse: unsafe". A collapsed target (Classic) or a dead one shows a grey no-op chip on that side.

## 4. Classic side rules

An honest, competent generic colony AI, not a strawman.

- Unit state: `task`, `workTimer`, `hunger 0–100`, `hp 0–100`, `asleep`. No needs beyond hunger, no memory, no relationships, no norms.
- Obeys every order instantly. Walks (1 tile / sim-min), works the job's timer, delivers.
- Auto-eat: when idle, or when hunger ≥ 80 regardless of task, walks to the kitchen and eats a meal (hunger −60) if any, else raw grain (−25). Hunger rises 1 / 10 min; ×2 while rushing.
- Hunger 100: collapse (incapacitated, hp −2 / 10 min). hp 0: death. Collapsed or injured units are auto-hauled home by the nearest idle unit (generic sims do rescue downed colonists); the hauler is still subject to auto-eat.
- Sleep 22:00–05:00 unless ordered; an ordered task is finished first, then the unit sleeps (so storm orders run into the night). Sleep-deprived units work 30 % slower.
- Skill: builder/cook/forester tags double speed at the matching job. Anyone can do any job at base speed.
- Storm: units outdoors take hp −5 per injury roll (chance 0.3 / 10 min). They finish their task unless ordered elsewhere. No fear.
- Beam stage: any single unit attempts it; success 35 %; failure costs 30 min and rolls injury 20 %.
- Does not pray, keep promises, or notice anyone else.

Rendered as a blueprint: desaturated slate tiles, white pawn silhouettes, crisp hp/hunger bars. It should look efficient. It is.

## 5. Human side

### Affordances the world offers

All durations include travel (the host folds pathing into `duration`). Places use the ids above. Need deltas are advertised honestly.

| action | place | dur | effort | skill (diff) | advertises | tags | norms | risk |
|---|---|---|---|---|---|---|---|---|
| gather-grain | field | 60 | 0.5 | farming 0.3 | competence +0.1 | work outdoors | — | storm: 0.3/0.4 |
| gather-timber | forest | 60 | 0.7 | forestry 0.4 | competence +0.1 | work outdoors | — | 0.05/0.3; night/squall 0.3/0.5 |
| fell-cedar | forest | 90 | 0.9 | forestry 0.8 | competence +0.2, esteem +0.1 | work outdoors risky | — | 0.5/0.6 |
| draw-water | well | 20 | 0.4 | — | competence +0.05 | work | — | — |
| cook | kitchen | 40 | 0.3 | cooking 0.4 | competence +0.1, belonging +0.1 | work indoors | feed-village fulfills | — |
| build | site | 60 | 0.7 | building 0.5 | competence +0.15 | work outdoors | — | 0.05/0.3 |
| raise-beam | site | 45 | 0.9 | building 0.8 | competence +0.2 | work outdoors risky | — | 0.3/0.5 |
| raise-beam-with | site, `with:[partner]` | 45 | 0.7 | building 0.4 | competence +0.2, belonging +0.15 | work outdoors social | — | 0.1/0.4 |
| shutter-house | site | 40 | 0.6 | building 0.3 | safety +0.2 | work outdoors | — | — |
| eat | kitchen/home | 20 | 0.1 | — | food +0.6 (meal) / +0.25 (raw) | — | — | — |
| drink | well | 10 | 0.1 | — | water +0.5 | — | — | — |
| pray | masjid (or in place, lower belonging) | 15 | 0.1 | — | meaning +0.2, belonging +0.1 (masjid) | worship | salah fulfills | — |
| carry-injured | from injury tile → home | 45 | 0.8 | — | meaning +0.2, belonging +0.1 | social | aid-injured fulfills | — |
| tend-injured | home | 30 | 0.2 | — | belonging +0.1 | social | aid-injured fulfills | — |
| take-grain | Danyal's jar | 15 | 0.2 | — | food +0.25 | — | theft violates | — |
| shelter | masjid | until storm ends | 0 | — | safety +0.4 | indoors | — | — |
| sleep | home | to 05:00 | 0 | — | sleep | mode: sleep | — | — |
| rest-in-place / wait | anywhere | 15 | 0 | — | rest +0.1 | floor | — | — |

Norm catalog (host, with provenance): `salah` obligatory; `aid-injured` recommended; `feed-village` obligatory; `abandon-dependents` **forbidden** (provenance `assumption`: "the sole cook leaving a pending meal unprepared is treated as forbidden by this host"; see §7 M3); `theft` forbidden. Danyal holds `theft`, `aid-injured`, `feed-village` but not `salah`; his worship commitment is `pray` at his own times (dawn, evening), tagged `worship` with no `salah` norm. Norms are each person's understanding, not rulings; the catalog is the host's.

### Percepts emitted

| kind | channel | when | to whom | effect |
|---|---|---|---|---|
| adhan | heard | each prayer time | all | cue for `salah` commitment window |
| injury | saw / heard | someone fails a risky action | `saw` within 6 tiles (salience 0.9); `heard` cry village-wide (0.6) | spawns `carry-injured` affordance for all; fear, concern |
| help | saw | carry/tend completed | witnesses + victim | gratitude; `thanks` percept back to helper |
| meal-ready | heard | cook completes | all | raises eat advertisement to +0.6 |
| no-meal | felt | 13:00 or 19:00 with no meals in store | all | distress, salience 0.6 |
| weather-warning | saw | Day 2 16:00 | all outdoors | claim `storm:tonight` true 0.8; fear |
| wind | felt | squall and storm, each 30 min outdoors | anyone outdoors | fear, cold → rest need |
| theft | saw | `take-grain` completes | Danyal + witnesses | anger toward actor; defined, but with this cast nobody will comply |
| shared-work | social | paired action completes | both | affection, respect |

### Six villagers

| Name, age | Role | Skills (level) | One line |
|---|---|---|---|
| **Hajja Maryam**, 68 | Cook, elder | cooking 0.8, farming 0.3 | Widow, everyone's grandmother. Tradition and benevolence high; `feed-village` conviction 0.95; cooks at 06:30, 12:00, 18:00 by habit. Slow, unhurried, never rushed. |
| **Yusuf**, 34 | Builder | building 0.7, forestry 0.4, cooking 0.1 | Maryam's son, Tariq's father. Conscientious, strong, keeps promises (`keep-promise` 0.9). Prays on time; the `salah` window closing pulls him off any job. |
| **Tariq**, 16 | Apprentice | building 0.3, forestry 0.3, cooking 0.2 | Yusuf's son. Eager, learns fast, trusts the player (`voices: player 0.75`, highest in the village), low fear, high stimulation. |
| **Idris**, 41 | Forester | forestry 0.7, building 0.3, cooking 0.1 | Yusuf's neighbour and friend. Low emotionality, high achievement: the cedar tempts him. Satiety starts low (skipped supper). |
| **Samira**, 29 | Gatherer, water | farming 0.6, cooking 0.25, forestry 0.2 | Idris's wife. High conscientiousness and emotionality: fear weighs risk double; cautious counter-offers ("with someone"). Affection for Idris 0.9. |
| **Danyal**, 52 | Well-keeper | farming 0.4, cooking 0.2 | Christian widower, Maryam's old friend. Careful, honest (0.9), keeps his own grain jar. Shows that norms are per person: works through adhan, prays at his own hours. |

All six start at Fajr with satiety 0.45 (no breakfast yet), well rested, with `salah` recurring commitments (except Danyal), a daily `job` commitment each, and `player` trust 0.5 (Tariq 0.75).

### How people and thoughts are drawn

Warm palette: mudbrick `#C9975B`, palm `#4F7A4A`, well-blue `#3E7C8A`, parchment `#F3E9D6`, ink `#2B2622`, night indigo `#1B2140`, storm slate `#5C6672`. People are 1×2-tile pegs: round head, rounded body, a role sash (cook ochre, builder rust, forester green, water blue); Maryam and Samira wear headscarves, Danyal a flat cap, Tariq is a head shorter. Same silhouettes on the Classic side, bleached white.

Speech bubbles are parchment rounded rectangles with a tail, a 3 px left rule in the verdict colour, and monospace-ish typing: **green** `#4F7A4A` assented, **grey** `#8A8F98` cannot, **amber** `#D9932B` not-now (always followed by the counter-offer in italics: *after I eat*), **red** `#B3362B` will-not, **amber-struck** complied (a strike through the order text, then "…fine."). Three typing dots appear within one sim minute of the order (acknowledgment), hold at least 400 ms real time, then the line from `SuggestionResolution.says` holds at least 2.5 s real time regardless of sim speed. Unprompted decisions show a smaller thought cloud with `narration`, only when the chosen action changes.

**"Why?" panel.** Tap any bubble. A parchment sheet slides up: top three `considered` options, each a horizontal bar of stacked `terms` (positive to the right, negative to the left, coloured by family: needs ochre, norms indigo, commitments rust, emotion plum, social green, effort/risk grey, suggestion blue). Under the chosen option: advertised vs believed deltas as two small rows, and a quoted recalled episode when `recalled` is non-empty ("remembers: the squall, last night"). At the bottom: the trust meter for `player`, with the last three events that moved it. Labelled *trust in you*, never a quality of the person.

## 6. Win, lose, score

No win state; the comparison is the result. The scoreboard sits above both panes and updates live:

| Metric | Classic | Human |
|---|---|---|
| Meals stored | count | count |
| House built | % of 10 stages | % |
| Injuries (incl. collapses) | count | count |
| Prayers kept | — | kept / due |
| Morale | — | mean mood valence |
| Trust in you | — | mean `VoiceRelation.trust` |
| Alive | 6 | 6 |

Lose only if a Human villager dies (the floor affordances make this require deliberate insisting into the storm). The end screen at Day 3 05:00 shows both villages in dawn light, the table above, a ghost third column from the headless solo control (Human people, same seed, no orders; if it beats the player, show it without comment), and five cards: one per witnessed moment with a 3-second replay loop and the single "why" line. Title of the screen: *Same orders. Same seed.*

## 7. The five moments

Real-time figures assume 1× and no pauses; slow-mo (¼× for 3 s with a caption) fires when a moment is detected, adding ~15 s to a run.

| # | Moment | Sim time (real) | How it is engineered | Director nudge if absent |
|---|---|---|---|---|
| 1 | Hungry Yusuf finishes carrying Idris before eating | Day 1 09:30–10:15 (≈0:17–0:20) | The 08:00 card is the trigger on both sides: order Idris to the cedar. Human Idris assents eagerly (achievement, low fear); both sides fell it the same minute and take the same `scenario` roll, which the shipped seed fails at 09:30. The injury percept spawns `carry-injured`; Yusuf's `aid-injured` + affection + commitment outweigh hunger. The host calls `promise()` on begin, so the `reviewAt` hunger interrupt at 09:50 meets a closing commitment plus switch inertia. Classic auto-hauls too (nearest idle unit, Yusuf), but auto-eats at hunger 80 mid-carry and leaves Idris on the path for 20 min. Without the card neither side fells the cedar and the moment is skipped, not inverted. | 08:00: card "Idris could take the big cedar — three timber in one go." Re-shown once at 08:30. |
| 2 | Same man, same job, dawn yes / dusk "after Maghrib" | 05:30 (0:02) and 18:30 (0:51) | Order Yusuf to the site at 05:30: assented. Dinner is cooked at 17:30 and he eats by 18:15, so at 18:30 hunger is not the dominant reason; the `salah` window closing at 19:30 is → deferred, `counterOffer.label` "after Maghrib". Classic builds straight through. The acceptance test asserts the counter-offer names the prayer, not merely `deferred`. | 18:25: card "Light's going. Send Yusuf back to the site?" |
| 3 | Cook sent to the forest | 11:00 (0:23); cost visible by 19:00 (0:52) | Order Maryam to the forest while the 12:00 meal commitment is pending and she is the only one with cooking > 0.3 (see the skills column). The host tags every non-kitchen work affordance for her with `abandon-dependents violates` while that holds; conviction 0.95 → `willNot`, red. Classic: she goes; nobody cooks; units eat raw at half value, hunger 80+ by dinner, work slows, the `no-meal` chime. | 10:45: card "Timber is short. Maryam is free until noon." |
| 4 | Pair succeeds where one fails | 14:30 (0:36) | Stage 7 arrives ~14:00. Yusuf is offered `raise-beam` and `raise-beam-with Tariq`; social and risk terms pick the pair. Joint-assent protocol (§10): Tariq receives a mirror affordance at an immediate interrupt; both begin the same minute. Classic: one unit, 35 %, the shipped seed fails, −30 min and an injury roll. | None needed; if the player orders someone else to the beam, Yusuf's bubble says "modified: with Tariq". |
| 5 | Tariq refuses at normal urgency; trust visibly lower | Day 2 07:00 (≈1:37) | During the squall (21:30 Day 1) the card tempts: "Timber is short; Tariq is awake." He defers (fear, dark); the player insists; he complies under protest, `wind` percepts and a cold `rest` hit; a salient episode with negative valence; `learnFromVoice` drops trust 0.75 → ~0.4. At 07:00 Day 2 any forest order gets `willNot: distrust` with the episode quoted (needs gap 13; the acceptance test asserts `kind === 'willNot'`, not merely that he stayed). Classic: the unit went, lost some hp, and goes again. | 21:35: the card above, with the Insist toggle pre-highlighted once. |

Acceptance test (Vitest, headless): with the shipped seed and the director's five suggested orders issued at their nudge times, all five moments fire by their target minutes.

## 8. Onboarding, first 20 seconds

0 s: both panes fade in at Fajr, adhan audio (short, optional), scoreboard reads 0/0. A single sentence under the title: *Two villages, one voice. Give an order; both hear it.*
3 s: a glowing hand shows tap-Yusuf, tap-site. The player does it. Left: Yusuf walks. Right: dots, then a green "Yes — before breakfast, while it's cool."
10 s: a one-line toast: *Tap any bubble to see why.* Nothing else. The director cards (§7) arrive on the clock and can be swiped away.

## 9. Mobile layout

Portrait, stacked: scoreboard (48 px) · Classic pane (34 vh) · order tray (sticky, 72 px, horizontally scrolling cards) · Human pane (34 vh) · speed bar. Panes pan together; a two-finger pinch zooms both. Bubbles never overflow a pane; the "why" sheet is a full-height drawer. Tap-and-hold a villager for the predicted response. Landscape and desktop: side by side with the queue in a centre column. Hit targets 44 px minimum. Canvas DPR-aware; 20×14 at 32 px = 640×448 scaled to width.

## 10. Engineering notes

**Worker protocol** (one `SharedWorker`-free dedicated Worker, both sides inside).

Main → worker: `init{seed, scenarioVersion}` · `order{atMinute, personId, action, placeId?, strength, insist, appeal?}` · `cancel{orderId}` · `speed{factor}` · `pause` · `resume` · `why{side, personId, decisionId}` · `save` · `load{blob}`.
Worker → main: `frame{minute, classic: UnitView[], human: PersonView[], scoreboard, bubbles}` at most once per animation frame · `verdict{orderId, side, resolution}` · `moment{id, minute, personId, line}` · `why{DecisionRecord}` · `saved{blob}` · `ended{scoreboard, solo, moments}`.

**Determinism.** Three RNG streams from the one seed: `scenario` (weather, cedar and beam rolls, applied identically to both sides regardless of what people do), `classic`, and each `Person.rng`. Orders are stamped in sim minutes and applied at the next boundary on both sides; real time never enters the worker. Identical by construction: start state, weather schedule, order log, the injury roll for a given risky order at a given minute. Legitimately divergent: who does what and when, because Human people decide. Affordances are generated in stable id order per person per decision.

**Save.** `{schema: 'colony@1', engine, seed, scenarioVersion, orderLog, classic, human: Person[] via snapshot(), minute}`. Load replays the order log from the seed when `engine` differs, else restores snapshots. Saves are optional; a run is three minutes.

**Framework APIs this game needs that `types.ts` may not expose yet (gaps):**

1. **Joint assent for `Affordance.with`.** `decide` is per person; nothing in the contract makes two people start one paired activity. Proposed host protocol: proposer chooses the `with` affordance → host offers the partner a mirror affordance at an immediate interrupt → both `begin` the same minute, else the proposer's outcome is `interrupted` and they re-decide. Needs a documented recommendation, ideally a `sim/` helper.
2. **Host-created commitment at `begin`** (`agenda.promise()` taking an affordance and window) so carrying the injured becomes a commitment that survives `reviewAt`.
3. **Host-triggered re-decision**: `interrupt(person, now)` after a salient percept (injury, warning). `perceive` updates beliefs but the contract shows no way to force an immediate decision.
4. **Omission veto.** `normVeto` fires on forbidden norms; an obligatory duty neglected yields only a term. This spec works around it with a `forbidden` host norm; a cleaner rule ("high-conviction obligatory duty whose window is closing vetoes conflicting work") would remove the workaround.
5. **`VoiceRelation` history.** The trust meter needs the last three events that moved trust; the type has totals only.
6. **`Percept.channel`** comment lists `outcome` and `social`; the union lacks them. `shared-work` percepts need one.
7. **`Considered.label`** or a host lookup: the why-panel shows labels, the record stores ids only.
8. **`predictResponse` reachable from the host** without a `DecisionRecord`: needs the current affordance set, so `sim/` should expose `preview(person, affordances, suggestion)`.
9. **Protest quality.** `Activity.protest` is a boolean; the host needs a convention (this game: ×0.7 speed, +50 % injury chance) and `Outcome` has no `quality` field to feed `learnOutcome`.
10. **No spatial model.** Travel is folded into `duration`; the framework should state this is the intended host responsibility.
11. **Recurring worship window per person**: Danyal's non-`salah` worship needs `Commitment.kind: 'worship'` without a `normId`; confirm `recurEvery` handles two different schedules in one village.
12. **Fixed-step world vs event-driven people**: `tick(p, now)` per sim minute for six people is fine, but confirm `nextBodyThreshold` is cheap enough to call every minute or expose it as a cached minute.
13. **Distrust veto rule.** `types.ts` names "broken trust" as a `willNot` cause and allows `reason: 'distrust'`, but nothing states the rule or threshold on `VoiceRelation.trust` that turns a weak suggestion term into a red veto. Moment 5 promises a red bubble at normal urgency; the host needs a documented rule (proposed: trust below 0.45 **and** a salient negative episode caused by this voice within 24 h vetoes suggestions whose action matches that episode).

## 11. Human side as built (2026-10-03)

Code: `apps/site/src/colony/sim/human.ts` (side), `human-world.ts` (host World), `human-cast.ts` (villagers, norms, duties), `human-view.ts` (bubbles, why panel, trust meter). Acceptance, determinism, solo control and timing: `human.test.ts`.

Moment times on the shipped seed with the director's orders, against the §7 targets:

| # | Fires | Target | Why it differs |
|---|---|---|---|
| 1 | ~11:06 | 09:30–10:15 | Idris stops felling at 09:17 to drink and resumes at 09:38, so the cedar falls at ~10:05; Yusuf takes the carry at once and the haul home takes ~60 min. |
| 2 | ~19:26 | 18:30 | Maghrib is at 18:45 (§2), so the prayer only outweighs work once its window is open and closing. The 18:25 order is assented while he is already building, then deferred "after I pray Maghrib" when that session ends. |
| 3 | 10:45 | 11:00 | — |
| 4 | ~15:30 | 14:30 | Stage 7 arrives ~14:10; the first joint attempt is broken off when Yusuf goes to drink. |
| 5 | Day 2 07:00 | Day 2 07:00 | — |

Host rules chosen while building (all in `human-world.ts`, deviations from the tables above marked):
- A cooked meal restores 0.8 food and raw grain 0.3 (tables: 0.6/0.25). With 0.6 the morning hunger interrupt broke every long job.
- The cast pins the body depletion rates the game was tuned on (`COLONY_RATES` in `human-cast.ts`, via `BodyState.rates`). Engine 1.2.0 roughly halved the framework defaults so a dawn-to-dusk fast is keepable; on the defaults the carrier is not hungry at the carry (moment 1) and the house progresses fast enough that the dusk build order completes before Maghrib pressure wins (moment 2). The table above therefore still holds.
- Felling the cedar costs effort 0.8 (table: 0.9); at 0.9 Idris's mid-morning capacity vetoed it as "spent".
- The squall fails forest and field work outright, and the storm rolls exposure every 10 minutes outdoors, so outdoor work whose span overlaps either advertises risk 0.9 / 0.5 rather than the table's 0.3 / 0.5. Insisting on Tariq's squall run therefore yields `complied` (moment 5).
- Building pays 2 timber once per house stage (world-types) rather than per session; gathering interrupted part-way pays pro rata, 1 timber per 30 min worked, rounded.
- `aid-injured` is obligatory on this host (was recommended). At recommended, Yusuf kept laying courses for ~50 min while Idris lay pinned.
- Each villager's standing role goal resets at dawn, since an achieved goal stops pulling.
- Director: cards added at Day 1 05:30 (Yusuf to the site; moment 2 needs the dawn yes) and Day 2 07:00 (Tariq to the forest; moment 5). Issuing a card's order now settles only the visible card, not later cards for the same person and place.
- A card's order keys the shared scenario rolls (the cedar) by the card's minute (`Order.rollKey`), and the Human cedar roll keeps the key of the first ordered session across resumed sessions. The order's lifetime still runs from the minute it was actually given (`issuedAt`), so a card tapped late is not lapsed early. Without this, tapping the 08:00 card one minute late changed the seeded roll and moment 1 vanished in live play. Re-measured after the 2026-10-03 review fixes, with every card tapped the same number of minutes late: 0–4 and 6–10 minutes fire all five moments; at 5 minutes the squall run happens not to hurt Tariq (the exposure rolls are keyed by minute), so moment 5 does not fire.
- A felling stopped within its last 5 minutes still brings the cedar down; the framework's need interrupts do not weigh how little work is left (observed: a hunger interrupt one minute before the tree fell).
- An order that was answered "yes" or "not now" and then carried out shows a done chip on its card.
- An order is completed only by a job begun after it was given. Ordering someone to do what they are already doing leaves the card open until their next session of that job or the 120-minute lapse.
- Lapse (2026-10-03 review): a card whose Human job has begun since the order does not lapse at 120 minutes; it settles when the job finishes, with a hard cap at 240 minutes. A lapse withdraws only the Human side's standing suggestion; Classic received its command once and finishes it (spec §3 describes the re-issue; Classic has none).
- After a yes (or an insisted compliance), a deferral for a bodily need (a drink, a meal) is a pause: the card keeps its verdict and the pause shows as a thought. A deferral for a prayer stays a visible "not now" verdict, since that is moment 2. A refusal on a bodily need (an insisted order overridden by thirst) is shown amber "not now", not grey "cannot", and the order stays open.
- Walking through the storm advertises its exposure risk (0.3 per 10 minutes of travel, capped at 0.9), as outdoor work already did. On the shipped seed this brought director-script injuries from 10 to 8 (solo 8, Classic 3).
- Moments are captioned live over the Human pane, with slow motion at ¼ of the chosen speed for 3 real seconds (§7, §8). The sim is paused while the intro and the coach's hand are up, and the dawn card waits until the coach is done.
- The player's actions are logged with the minute they were applied (`ColonyGame.log`); `ColonyGame.replay(seed, factory, log)` reproduces the run (tested).

Solo control (same seed, no orders) is logged by `human.test.ts`; on the shipped seed it keeps more meals than the director's script and is kept as a negative finding for the orders, not tuned away. Human injuries (8 on the shipped seed, nearly all storm exposure: Tariq and Idris working timber in the squall and the storm, people walking home to sleep after 22:00) exceed Classic's (3), whose units shelter by rule. Praying at home in the storm was tried and raised the count (more cross-village walks), so it was not kept; an interrupt when the storm breaks did not move Idris off the woodpile either.
