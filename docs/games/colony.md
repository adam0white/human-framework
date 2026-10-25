# Game 1 — *Twice at the Well*

The game as shipped, on HF 2.0. Built from the Game 1 recommendations of the 2026-10-02 game-design review §4 (removed in the docs consolidation; see history), then revised after the [2026-10-03 playtest](colony-playtest-2026-10-03.md) (v2) and the [2026-10-04 playtest round](playtest-2026-10-04.md). Architecture is in [framework.md](../framework.md); this file does not restate it. Unless marked otherwise, numbers were measured headless on the shipped seed 20261003. The game is host code only: nothing in `packages/human` is game-specific.

## 1. Pitch

Six villagers, two days, one well, one storm. You give the same orders to the same village twice, side by side: on the left they obey like colony-sim units (Classic), on the right they are people (Human). Both sides have the same three goals. A third, unseen village (Solo: Human people, same seed, no orders) is the control on the end screen.

## 2. Map, clock, weather and speed

One 20×14 grid of 32 px tiles, top-down, flat colour, long shadows that swing with the sun. Both panes draw the identical map. `PlaceId` `'site'` is shown as **House** everywhere (map, job labels, suggestions, goals).

| Place | Tiles | Role |
|---|---|---|
| Homes ×3 | 2×2 each, mudbrick | Maryam+Tariq; Yusuf; Idris+Samira. Danyal sleeps in the well-house. Sleep, eat stored food, rest. |
| Well | 1 tile + stone apron | Only water source. One person draws at a time; others queue. |
| Field | 4×3 | Grain. Open to sky (storm-exposed). |
| Forest | 5×4 edge strip | Timber; the *big cedar* yields 3 but is risky. Dark and windy at night. |
| Kitchen + granary | 2×2 | A pot: 2 grain + 1 water + 40 min → 4 meals (both sides). Stores meals and grain. |
| House | 3×3 | Starts at stage 2 of 10; stage 7 is the roof beam. On Day 3 the same place holds the store-room. |
| Masjid | 2×2 | Prayer; also the storm shelter (stone, roofed). Danyal shelters there too. |

Flows: field → grain → kitchen → meals → people. Well → water → kitchen and people. Forest → timber → House. Nothing is traded or researched.

**Clock.** Day 1 05:00 to Day 3 05:00 (minute 2880), or Day 4 05:00 (4320) after "Another day" (§6). Prayer times are the framework's `DEFAULT_PRAYER_TIMES` (Fajr 05:00, Dhuhr 12:30, Asr 16:00, Maghrib 18:45, Isha 20:15), so the adhan and the villagers' prayer windows cannot drift apart. Night is 19:30–05:00.

**Village choice (@6).** At the start, choose “The storm comes when it comes” (the unchanged default) or “Early warning: the elders read the sky early.” Early warning starts preparation at Day 2 noon rather than 16:00: both villages raise their cooking stock cap, the Human villagers hear the elders’ forecast, and the extra-pot suggestion arrives at 12:30. Actual weather, shelter, shutters, injuries, meals, deadlines and personal priorities keep their existing timings. The choice stays visible during play. A validated dawn entry records the named option and its preparation minute in the hashed log and both worlds. Solo uses the same choice.

**Weather.** A squall Day 1 21:30–23:00 (wind and cold; forest and field work fails outright). A warning Day 2 16:00 (sky darkens). The storm Day 2 19:00 → Day 3 03:00: an exposure roll every 10 minutes outdoors; no cooking on either side. Scripted storm meals at D2 19:30 and D3 04:45: each living villager takes one meal from the store if one is left; the Human side eats in the shelter. An unfinished, unshuttered house at stage 1–9 loses 1 stage per 2 storm hours, at most 4 (*assumed*, see Deferred). Day 3 weather is clear.

**Shuttering.** An order to the House infers `shutter-house` below the beam from the warning, and for an unfinished roof from 18:00 (`SHUTTER_ROOF_FROM`), when a roof stage can no longer be finished. Never after the storm ends, so Day-3 orders build. A roofed house is never shuttered; an order to it is "cannot" on the Human side.

**A finished house matters.** From the storm on, Idris and Samira live in the new house if it is at 10 (`homeOf`, shared by both sides). Below 10 they shelter in the crowded masjid: Human sleep there advertises 0.5 instead of 0.8, and at 19:00 each gets a felt `crowded` percept (valence −0.4, salience 0.7: "No roof of our own tonight."). Classic is only relocated. The roofed house is indoors on both sides (`indoorsAt`), so resting or sleeping in it rolls no storm exposure; before 2026-10-07 Classic took indoors from the map's `site` (outdoors) and its family was hurt resting at home. On Day 3 an unroofed family goes back to its old home.

**Speed.** `SIM_MINUTES_PER_SECOND = 8`; `MAX_MINUTES_PER_TICK` 8.

| Control | sim-min per real second | One day | Two-day run |
|---|---|---|---|
| ½× | 4 | 6 min | 12 min |
| **1× (default)** | **8** | **3 min** | **6 min** |
| 2× | 16 (the v1 1×) | 1.5 min | 3 min |

## 3. Orders

The player is one voice (`voiceId: 'player'`). Every order is applied to both sides at the same sim minute.

| Order | Classic | Human |
|---|---|---|
| Job at place (job inferred from the place: forest = timber, cedar = fell, field = grain, well = water, kitchen = cook, House = build or shutter, masjid = pray/shelter, home = eat/sleep) | sets the unit's task immediately | `Suggestion{action, strength: 0.6}` |
| Rush | work 25 % faster, double hunger drain | `strength: 0.9` |
| Insist ("may cost trust") | already obeys | `insist: true` |
| Appeal ("for the children" / "it's your duty" / "you'll be safer") | ignored | `appeal` |
| Cancel | unit idles | suggestion withdrawn; person re-decides |

**Composer.** One composer in the centre column. Step 1, who: tap a villager (roster chip or a unit on either map). Step 2, where: tap a place (map or chip: House, Forest, Cedar, Field, Well, Kitchen, Masjid, Home); it shows the inferred job and the Human prediction (`predict`) as one line ("Yusuf: likely yes"). Step 3, optional: Rush, Insist, appeal. Step 4: Confirm or Enter sends the order to both sides and resets. Esc clears.

**Suggestion card.** At most one visible; others queue behind a "+1" chip. It shows text, a one-sentence reason that states the risk, a ring timer and countdown ("lapses 06:30 · in 47 min"), **Use** and × **skip**. Use fills the composer (who, where, prefilled toggles), leaving only Confirm; Confirm sends `order{input, nudgeId}`. Skip is logged as `dismiss`; expiry counts as dismissal and is not logged.

**Keys.** Space always toggles pause (a capture-phase `keydown` on window plus `preventDefault` on `keyup`, so a focused button is not clicked), except in `input`, `textarea`, `select` or `[contenteditable]`. Enter confirms; Esc clears or closes the inspector.

**Order lifetime (@3 and @4).** A card persists: the host re-issues the Human suggestion at each of that person's decisions until it is assented-and-completed, cancelled, or 120 sim minutes old (the card greys "lapsed"). A card whose Human job has begun does not lapse at 120; it settles when the job finishes, with a hard cap at 240. A lapse withdraws only the Human standing suggestion; Classic received its command once and finishes it. A card whose Human side has finished is done at the lapse, not greyed, even while Classic is still on it (its Classic chip turns to done when the unit finishes). An order is completed only by a job begun after it was given. A deferral is never a silent drop: the card shows the counter-offer. The framework does not hear a standing suggestion whose job is not on offer, so the host answers it from the same conditions that withhold the offer (`ColonyHostWorld.notOffered`): hurt ("when I’ve healed"); cooking with the store full ("We’ve food enough put by. I’ll cook when it runs low."), in the storm ("when the storm passes") or without grain or water; building without timber ("when there’s timber"); outside prayer time or bedtime. These are "not now" and the order keeps standing until it is heard or lapses. A finished house ("The house is finished. There’s nothing left to do there.") and a beam beyond the person's skill are "cannot". The composer predicts the same ("Later: food enough put by"), and these answers do not auto-pause (§8). Each order carries the minute it was given (`Suggestion.since`), so an earlier completion of the same job (the noon pot) does not count as already doing it.

**Order lifetime (@5).** A stated conditional deferral stands beyond 120 minutes: after a meal or prayer, after healing, when supplies arrive, or when the storm passes. HF weighs the standing suggestion again when the condition clears. It may refuse and choose the person's own work. An outright refusal (`willNot` or `cannot`), replacement or cancellation ends the promise. Beginning the ordered job returns it to the existing begun-job completion rules above. If the person sleeps for the night before beginning it, the promise lapses with a spoken loss, such as “Idris didn’t get to the house today.” An unstated delay retains the 120-minute limit. Classic receives its command once and continues independently. The person’s name tag and selected-person line retain the latest order’s state; tapping the person shows the latest reply, Ask again and Cancel order. Insist retains its trust warning.

**Order receipts (presentation only).** The person line and History retain the completion time and actual result. Construction names the House or store-room and the visible progress. A shared job that became unavailable names its known result, such as shuttering. Home requests the existing eat or sleep action: one meal, or one sleep normally until dawn. It does not hold someone indoors. The receipt retains the first activity chosen after Home ends and also shows the current activity. These observations are rebuilt during replay and do not enter comparable simulation state.

**Order words.** Classic's chip is a tick, or "could not (reason)" for a no-op, e.g. "could not (no free stage)". The Human chip shows its first reply (`SideChip.first`) and its last reply. A refusal settles the card and reads "refused". An order answered "yes" or "not now" and then carried out shows a done chip.

## 4. Classic side

An honest, competent generic colony AI, not a strawman. Code: `sim/classic.ts`.

- Unit state: `task`, `workTimer`, `hunger 0–100`, `hp 0–100`, `asleep`. No needs beyond hunger, no memory, relationships or norms. It does not pray, keep promises or notice anyone.
- Obeys every order instantly. Walks 1 tile per sim minute, works the job's timer, delivers.
- Auto-eat when idle, or at hunger ≥ 80 regardless of task: a meal relieves 40, raw grain 25. Hunger rises 0.1 per minute, doubled while rushing.
- Hunger 100: collapse (hp −2 per 10 min). hp 0: death. Downed units are hauled home by the nearest idle unit, which is still subject to auto-eat.
- Sleeps 22:00–05:00 unless ordered; an ordered task is finished first. Sleep-deprived units work 30 % slower.
- Role tags (builder, cook, forester) double speed at the matching job.
- Storm: units outdoors take hp −5 per injury roll (0.3 per 10 min). No fear.
- Beam: any one unit attempts it; success 35 %; failure costs 30 min and rolls injury 20 %.
- **Stocks.** The role cook stocks up to 6 meals, and up to 12 from the warning (`STOCK_CAP.stormMeals`).
- **Building.** A builder claims one stage when work begins and pays for that stage only. A second builder takes the next free stage; the beam and the roof never start before the stage below them stands. An ordered builder with no free stage helps the builder nearest done; a role builder does other work. (This fixed walls skipping the beam roll, a roof stage paid twice and the store-room overshooting to 7/6.)

Drawn as a blueprint: desaturated slate tiles, white pawn silhouettes, crisp bars. It looks efficient, and it is.

## 5. Human side

Code: `sim/human.ts` (side), `human-world.ts` (host world), `human-cast.ts` (villagers, norms, duties), `human-view.ts` (bubbles, why panel, trust meter). Tests: `human.test.ts`.

### Affordances

Durations include travel (the host folds pathing into `duration`; the framework has no spatial model by design). Need deltas are advertised honestly. Values are as shipped; where they differ from the v1 design the reason follows the table.

| action | place | dur | effort | skill (diff) | advertises | tags | norms | risk |
|---|---|---|---|---|---|---|---|---|
| gather-grain | field | 60 | 0.5 | farming 0.3 | competence +0.1 | work outdoors | — | storm 0.9/0.5 |
| gather-timber | forest | 60 | 0.7 | forestry 0.4 | competence +0.1 | work outdoors | — | 0.05/0.3; squall/storm 0.9/0.5 |
| fell-cedar | forest | 90 | 0.8 | forestry 0.8 | competence +0.2, esteem +0.1 | work outdoors risky | — | 0.5/0.6 |
| draw-water | well | 20 | 0.4 | — | competence +0.05 | work | — | — |
| cook | kitchen | 40 | 0.3 | cooking 0.4 | competence +0.1, belonging +0.1 | work indoors | feed-village fulfils | — |
| build | House | 60 | 0.7 | building 0.5 | competence +0.15 | work outdoors | — | 0.05/0.3 |
| raise-beam | House | 45 | 0.9 | building 0.8 | competence +0.2 | work outdoors risky | — | 0.3/0.5 |
| raise-beam-with | House, `with:[partner]` | 45 | 0.7 | building 0.4 | competence +0.2, belonging +0.15 | work outdoors social | — | 0.1/0.4 |
| shutter-house | House | 40 | 0.6 | building 0.3 | safety +0.2 | work outdoors | — | — |
| eat | kitchen/home/shelter | 20 | 0.1 | — | food +0.8 (meal) / +0.3 (raw) | — | — | — |
| drink | well | 10 | 0.1 | — | water +0.5 | — | — | — |
| pray | masjid (or in place, lower belonging) | 15 | 0.1 | — | meaning +0.2, belonging +0.1 | worship | salah fulfils | — |
| carry-injured | injury tile → home | 45 | 0.8 | — | meaning +0.2, belonging +0.1 | social | aid-injured fulfils | — |
| tend-injured | home | 30 | 0.2 | — | belonging +0.1 | social | aid-injured fulfils | — |
| take-grain | Danyal's jar | 15 | 0.2 | — | food +0.25 | — | theft violates | — |
| shelter | masjid | until storm ends | 0 | — | safety +0.4 | indoors | — | — |
| sleep | home (or House / masjid, §2) | to 05:00 | 0 | — | sleep | mode: sleep | — | — |
| rest-in-place / wait | anywhere | 15 | 0 | — | rest +0.1 | floor | — | — |

- Meal and raw food 0.8 / 0.3 (design 0.6 / 0.25): at 0.6 the morning hunger interrupt broke every long job.
- Felling effort 0.8 (design 0.9): at 0.9 Idris's mid-morning capacity vetoed it as "spent".
- The squall fails forest and field work outright and the storm rolls exposure every 10 minutes, so outdoor work overlapping either advertises 0.9 / 0.5 (design 0.3 / 0.5). Walking through the storm advertises 0.3 per 10 minutes of travel, capped at 0.9; this brought director-script injuries from 10 to 8.
- Building progress per 60-minute session: walls 0.30 + 0.40×skill of a stage, roof 0.06 + 0.08×skill, ×0.7 under protest (the host's protest convention). Gathering interrupted part-way pays pro rata, 1 timber per 30 min worked, rounded.
- Cook is offered while meals < 6, from the warning while meals < 12 ("she cooks for the storm"), or when a meal duty is due (`HOST.cookBelow`, `cookBelowStorm`). The v2 plan had 12 / 18, which put 21–25 meals in store at the storm; 6 / 12 gives 13–17.
- The cast pins the body depletion rates the game was tuned on (`COLONY_RATES`, via `BodyState.rates`). Engine 1.2.0 roughly halved the framework defaults; on the defaults the carrier is not hungry at moment 1 and the dusk build order finishes before Maghrib pressure wins moment 2.

**Norm catalog** (the host's, with provenance): `salah` obligatory; `aid-injured` obligatory on this host (recommended in the design; at recommended, Yusuf kept laying courses for ~50 min while Idris lay pinned); `feed-village` obligatory; `abandon-dependents` forbidden (provenance `assumption`: "the sole cook leaving a pending meal unprepared is treated as forbidden by this host", §7 M3); `theft` forbidden. Danyal holds `theft`, `aid-injured`, `feed-village` but not `salah`; he prays at his own times (dawn, evening), tagged `worship` with no `salah` norm. Norms are each person's understanding, not rulings.

### Percepts

| kind | channel | when | to whom | effect |
|---|---|---|---|---|
| adhan | heard | each prayer time | all | cue for the `salah` commitment window |
| injury | saw / heard | a risky action fails | `saw` within 6 tiles (0.9); `heard` village-wide (0.6) | spawns `carry-injured` for all; fear, concern |
| help | saw | carry/tend completed | witnesses + victim | gratitude; `thanks` back to the helper |
| meal-ready | heard | a pot completes | all | raises the eat advertisement |
| no-meal | felt | 13:00 or 19:00 with no meals | all | distress, salience 0.6 |
| weather-warning | saw | D2 16:00 | all outdoors | claim `storm:tonight` true 0.8; fear |
| wind | felt | squall and storm, each 30 min outdoors | anyone outdoors | fear, cold → rest need |
| crowded | felt | D2 19:00, house below 10 | Idris, Samira | §2 |
| theft | saw | `take-grain` completes | Danyal + witnesses | anger; defined, but nobody in this cast complies |
| shared-work | social | paired action completes | both | affection, respect |

### Six villagers

| Name, age | Role | Skills | One line |
|---|---|---|---|
| **Hajja Maryam**, 68 | Cook, elder | cooking 0.8, farming 0.3 | Widow, everyone's grandmother. Tradition and benevolence high; `feed-village` conviction 0.95; cooks at 06:30, 12:00, 18:00 by habit. |
| **Yusuf**, 34 | Builder | building 0.7, forestry 0.4, cooking 0.1 | Maryam's son, Tariq's father. Conscientious, keeps promises (0.9). The `salah` window closing pulls him off any job. |
| **Tariq**, 16 | Apprentice | building 0.3, forestry 0.3, cooking 0.2 | Eager, trusts the player most (0.75), low fear, high stimulation. |
| **Idris**, 41 | Forester | forestry 0.7, building 0.3, cooking 0.1 | Yusuf's friend. Low emotionality, high achievement: the cedar tempts him. Starts with low satiety. |
| **Samira**, 29 | Gatherer, water | farming 0.6, cooking 0.25, forestry 0.2 | Idris's wife. Fear weighs risk double; cautious counter-offers ("with someone"). |
| **Danyal**, 52 | Well-keeper | farming 0.4, cooking 0.2 | Christian widower, Maryam's old friend. Honest (0.9), keeps his own grain jar. Shows that norms are per person. |

All start at Fajr with satiety 0.45, well rested, `salah` recurring commitments (except Danyal), a daily job commitment, and `player` trust 0.5 (Tariq 0.75). Each villager's standing role goal resets at dawn, since an achieved goal stops pulling.

### How people and thoughts are drawn

Palette (shared by all games via `shared/theme.css`): mudbrick `#C9975B`, palm `#4F7A4A`, well-blue `#3E7C8A`, parchment `#F3E9D6`, ink `#2B2622`, night indigo `#1B2140`, storm slate `#5C6672`. People are 1×2-tile pegs with a role sash (cook ochre, builder rust, forester green, water blue); Maryam and Samira wear headscarves, Danyal a flat cap, Tariq is a head shorter. Classic uses the same silhouettes, bleached white.

Bubbles are parchment with a 3 px left rule in the verdict colour: **green** `#4F7A4A` assented, **grey** `#8A8F98` cannot, **amber** `#D9932B` not now (with the counter-offer: *after I eat*), **red** `#B3362B` will not, **amber-struck** complied ("…fine."). Typing dots hold at least 400 ms real time, then the line from `SuggestionResolution.says` holds at least 2.5 s regardless of speed. Unprompted decisions show a smaller thought cloud only when the chosen action changes. After a yes, a deferral for a bodily need (a drink, a meal) is a pause shown as a thought and the card keeps its verdict; a deferral for a prayer stays a visible "not now" (moment 2). A refusal on a bodily need shows amber "not now", not grey, and the order stays open.

**Why panel** (in the inspector, §9): top three considered options as stacked term bars (positive right, negative left; needs ochre, norms indigo, commitments rust, emotion plum, social green, effort/risk grey, suggestion blue); advertised vs believed deltas; a recalled episode when there is one; the *trust in you* meter with the last three events that moved it.

## 6. Goals and the end screen

Both sides get the same goals, shown on the goal card at start and on the goal strip.

| id | Label | Target | Judged at | Status rule |
|---|---|---|---|---|
| `roof` | Roof before the storm | house 10/10 | D2 19:00 (minute 2280) | `met` on reaching 10; `failed` at 19:00 if below; fixed after 19:00 |
| `stock` | Storm stock | ≥ 12 meals in store (supper plus breakfast for six) | D2 19:00 | `open` until 19:00, then `met` or `failed` |
| `lives` | Everyone lives | 6 alive | D3 05:00 | `failed` at the first death; `met` at the end |

- Prayers kept, morale and trust are Human **character outcomes**, not goals; they appear under the Human pane and on the end screen. Where Classic lacks a concept the cell reads "Classic has no such concept" (grey ∅ mark with the phrase as tooltip and hidden text), not "—".
- Following every suggestion does not roof the Human house (§11). Retuning the D2 cards moved it by at most +0.1 ([findings](../findings.md)), so the cards were kept and the goal card says that winning takes your own orders.

**End screen.** One day's report: goals for Classic, Human and Solo, character outcomes, and the moments that fired with their lines. Each goal row says when it is judged (D2 19:00, or D3 05:00 for lives); the village rows say "Day 3 dawn, after the storm", so 9/10 in the goal row and 90 % in the house row are two different moments.

- **Near misses** (Day 2, both sides). A roof finished after 19:00 gets its exact minutes late. A roof one or two stages short gets the next stage's percentage. A store short by at most one pot (4 meals) gets a meals line.
- **What would have won.** `sim/hindsight.ts` replays the player's log to a branch minute, then runs the balance tests' good-order policy (`GOOD2` with Rush, `sim/policies.ts`) to the end of Day 2. Branches run latest first: D2 09:00, D2 05:00, D1 12:00, dawn; the report names the first that wins all three Human goals. It runs in its own worker (`hindsight-worker.ts`), only for a Day-2 report with a missed Human goal, and is deterministic (tested).

**Another day.** After D3 05:00 the end screen offers **Another day** once (`frame.canContinue`). `continue` calls `game.continueDay()`, which logs `{minute, kind:'continue'}` and raises `endMinute` to 4320; `replay` honours it. Day 3: clear weather, no moments, no suggestions. The project on both sides is a **store-room** at the House: 6 stages, each 2 timber and work 120, no beam. A side whose house is below 10 finishes the house first; its store-room opens when the roof goes on. Day-3 goals: store-room 6/6 by D3 18:00, at least 12 meals at 18:00, all alive at D4 05:00. People, memories, trust and debts carry over; Solo continues from its own Day-2 end. The Day-2 report stays available as a tab beside the Day-3 report.

## 7. The five moments and the suggestion script

When a moment fires it pauses play (auto-pause on) or runs slow motion at ¼ speed for 3 real seconds (auto-pause off), with a live caption over the Human pane.

| # | Moment | How it is engineered | Fires (target) |
|---|---|---|---|
| 1 | Hungry Yusuf finishes carrying Idris before eating | The `cedar` card sends Idris to the cedar; both sides take the same `scenario` roll, which the shipped seed fails. The injury percept spawns `carry-injured`; Yusuf's `aid-injured`, affection and the commitment from `promise()` at begin outweigh hunger. Classic auto-hauls too but auto-eats at hunger 80 mid-carry and leaves Idris on the path. Without the card neither side fells the cedar and the moment is skipped, not inverted. | ~11:06 (09:30–10:15): Idris stops to drink 09:17–09:38, so the cedar falls ~10:05 and the haul takes ~60 min |
| 2 | Same man, same job: dawn yes, dusk "after Maghrib" | `dawn-site` is assented. At dusk the `salah` window closing outweighs work → deferred with a counter-offer that names the prayer (the test asserts the name). Classic builds straight through. | ~19:26 (18:30): Maghrib is 18:45, so prayer outweighs work only once its window is open and closing; the 18:25 order is assented, then deferred "after I pray Maghrib" when that session ends |
| 3 | Cook sent to the forest | While the 12:00 meal is pending and Maryam is the only cook above 0.3, every non-kitchen work affordance for her is tagged `abandon-dependents` violates; conviction 0.95 → `willNot`, red. Classic goes; nobody cooks; units eat raw. | 10:45 (11:00) |
| 4 | Pair succeeds where one fails | At stage 7 Yusuf is offered `raise-beam` and `raise-beam-with Tariq`; social and risk terms pick the pair. Joint assent: Tariq gets a mirror affordance at an immediate interrupt and both begin the same minute. Classic: one unit, 35 %, the shipped seed fails. | ~16:26 (test deadline 17:00); in v1 ~15:30, the first joint attempt broken off when Yusuf went to drink |
| 5 | Tariq refuses at normal urgency; trust visibly lower | `squall-tariq` prefills Insist. He complies under protest; wind and cold make a salient negative episode; `learnFromVoice` drops trust 0.75 → below 0.45. At D2 07:00 any forest order gets `willNot: distrust` with the episode quoted (the test asserts `willNot`). Classic went, lost hp, and goes again. | D2 07:00 (D2 07:00) |

Fire times were measured at v1, except moment 4 (v2). Acceptance (`human.test.ts`): with the shipped seed and the script's orders issued on time, all five fire by D1 11:30, 19:45, 11:00, 17:00 and D2 07:30, with the verdicts above. A card's order keys the shared scenario rolls by the card's minute (`Order.rollKey`), and the cedar roll keeps the key of the first ordered session across resumed sessions, so a card tapped late gets the same roll; the order's lifetime still runs from `issuedAt`. In v1 (before the fuller v2 store) every card tapped 0–4 or 6–10 minutes late fired all five moments; at 5 minutes the squall run happened not to hurt Tariq. Since v2, moment 1 needs Yusuf hungry at the injury, which a late dawn tap no longer guarantees; auto-pause makes on-time taps the default. A felling stopped within its last 5 minutes still brings the cedar down, because the framework's need interrupts do not weigh how little work is left.

**Suggestion script.** Each card's order is shown on both sides; prefilled toggles stay editable.

| id | Shows → lapses | Text | Reason | Order / prefill |
|---|---|---|---|---|
| dawn-site | D1 05:30 → 06:30 | First light. Send Yusuf to the house? | He is your best builder and walls are cheap now. | yusuf → House |
| cedar | D1 08:00 → 09:00 | Idris could take the big cedar: three timber at once. | Fast timber, but the cedar can hurt whoever fells it. | idris → cedar |
| cook-forest | D1 10:45 → 11:45 | Timber is short. Maryam is free until noon. | Timber now, but the pot sits cold while she is gone. | maryam → forest |
| dusk-site | D1 18:25 → 19:25 | Light's going. Send Yusuf back to the house? | One more wall before dark, if he is not spent. | yusuf → House |
| squall-tariq | D1 21:35 → 22:35 | Timber is short; Tariq is awake. | It is night and a squall is blowing. Forcing him may cost his trust. | tariq → forest, Insist |
| tariq-again | D2 07:00 → 08:00 | Morning. Timber is still short. Send Tariq to the forest? | He remembers last night in the squall. He may refuse, and pushing him costs more trust. (If nobody ordered Tariq to the forest during the squall: `TARIQ_AGAIN_FRESH`, "He is rested. By day the forest carries only the usual small risk of a slip.") | tariq → forest |
| roof-hands-1 | D2 09:00 → 10:00 | The roof needs hands. Rush Samira to the house? | Roof stages are slow; a rushed helper speeds them up. | samira → House, Rush |
| roof-hands-2 | D2 09:30 → 10:30 | And Danyal? | The well can wait an hour. | danyal → House, Rush |
| storm-pot | D2 16:30 → 17:30 | The storm will put the fire out. Maryam, cook a pot to keep? | Nobody can cook from 19:00 until 03:00. | maryam → kitchen |
| storm-shutter | D2 18:00 → 19:00 | The roof will not be on before the storm. Shutter the house? | An unshuttered, unfinished house loses stages in the storm. Shuttering stops the roof work. | yusuf → House |

`storm-pot` follows the warning because before it the Human cook is offered only below 6 meals, so a village on track answered "not on offer"; it sits 30 minutes after the warning pause so the two do not stack. `storm-shutter` matches the 18:00 shutter window and hides once each side is roofed or shuttered. Issuing a card's order settles only that card, not later cards for the same person and place.

## 8. Playback: start, pause and auto-pause

The worker decides pausing, so every UI behaves the same and it is testable headless (`sim/playback.ts`).

- **Start.** The worker inits paused (`pause.kind 'start'`) behind the goal card: the three goals, the storm time and one line on the two sides. **Play** resumes. A one-time "Tap any bubble" toast follows the first frame.
- **Auto-pause** (one toggle, on by default, kept in `localStorage` `colony.autoPause` inside try/catch). It fires after the causing minute has been stepped, stops stepping at that minute and drops the rest of the tick. Reasons, in priority order: `suggestion` (a card becomes visible, once per card); `refusal` (the first Human `notNow`, `willNot` or `complied` on a player card, once per card; not `cannot` such as "I'm asleep", not the host's answer for a job not on offer (§3), not bodily-need thoughts, and since 2026-10-19 not a "not now" for a drink, a meal, sleep or a due prayer (`passesByItself`), which shows on the card and over the map without stopping play); `moment` (once per moment); `storm` (the warning and the storm start). Several reasons in one minute coalesce into one `PauseInfo`: the first decides `reason`, `text` lists the rest.
- **Resume on act.** Any order that settles the pausing suggestion resumes, by `nudgeId` or a plain composer order with the same person and place (`game.lastSettled`). Other orders leave it paused. Turning auto-pause off stops new auto-pauses; the current one stays.
- **Inspector.** Opening it pauses (`cause:'inspector'`); closing resumes only if that pause is still the current one.
- Auto-pause changes only when the player acts. It is not logged, and replay ignores it.

## 9. Layout

**Desktop, ≥ 1024 × 700.** `height: 100dvh; overflow: hidden`; nothing scrolls the page.

| Row | Height | Contents |
|---|---|---|
| Topbar | 56 px | title · clock · timeline (day line, squall, warning, storm band, now-cursor; "Day 1 of 2 · storm in 13 h", "Storm · ends 03:00", "Day 3 · dawn") · ½× 1× 2× · pause · auto-pause |
| Goal strip | 44 px | each goal as label · Classic chip · Human chip, plus the deadline |
| Stage | 1fr | Classic pane · 320 px centre column · Human pane |

Each pane has a header (meals · house n/10 with a progress bar · injuries · alive; Human adds prayers · morale · trust) and the canvas. When a pane has at least 180 px spare under the width-bound map, `PaneBody` adds one row per person: what they are doing and two bars (Fed and HP for Classic, Food and Sleep for Human); clicking a row selects that person. At 1366×850 this fills the lower band. The centre column holds the composer, the suggestion slot and the order log (the only scroll box).

**Phones.** One column, no page scroll: topbar (48 px; clock, speed, pause; auto-pause in a ⋯ menu), goal strip (40 px), Classic pane (~30 vh), sticky composer tray (the suggestion card overlays it), Human pane (~30 vh), and an "Orders (n)" button that opens the log as a bottom drawer. The roster is a 6-column grid with the portrait above the name; place chips are an 8-column grid with an icon above a short label; appeals use short labels in a 3-column grid. Nothing scrolls sideways at 360×740, 384×832 or 390×844. Collapsed, the goal strip shows one pair of bars per goal (C over H) with a tick at the target (roof 10, meals 12, alive 6, store-room 6 on Day 3); the meals scale is the larger of target and highest value, ×1.25. Hit targets are at least 44 px. Tapping a unit selects it; a long press opens the inspector.

**Inspector.** A centred modal `<dialog>` (~720 px, focus trapped, Esc closes; full-screen sheet on mobile). Left: the Classic unit's task, hunger, hp, rush, captioned "That is all a Classic unit has.", and "Classic has no such concept" for each row it lacks. Right: the Human person's needs, emotion, trust meter, why bars for the current decision, recent memories and what they think of the player.

**Icons.** `ui/Icon.tsx`: path data from Lucide (ISC, notice in the file; `moon` from Feather, MIT), drawn in `currentColor`; decorative beside text, otherwise `role="img"` with a label. It also holds the suggestion ring timer and the ∅ mark.

## 10. Engineering

**Worker contract.** `apps/site/src/colony/protocol.ts` is the source (the UI reads it through `ui/contract.ts`). The main thread sends `tick{dtMs}` once per animation frame plus control messages (`init`, `setSpeed`, `pause`, `resume`, `setAutoPause`, `order`, `cancel`, `dismissNudge`, `why`, `predict`, `continue`, `exportPlaytest`, `loadPlaytest`); the worker replies with `frame` (frame plus `PlaybackState`), `why`, `predicted`, `ended`, `playtest`, `replayed` and errors. Frames carry `goals`, `timeline`, `day`, `endMinute` and `canContinue`.

**Determinism.** Three RNG streams from one seed: `scenario` (weather, cedar and beam rolls, applied identically to both sides), `classic`, and each `Person.rng`. No `Math.random` or `Date.now` in the sim. Orders are stamped in sim minutes and applied at the next boundary on both sides. Identical by construction: start state, weather, order log, the roll for a given risky order at a given minute. Divergent by design: who does what and when. `SCENARIO_VERSION` is `colony-scenario@7` (2026-10-21; fresh orders, below). A rule or wording change that changes the same seed/log hash requires a new scenario edition and its own fixture. Rules @3, @4, @5 and @6 remain in the build: their exports and saves load under their original rules. The @6 default village is identical to @5. Older unsupported editions are refused with both versions named.

**Replay and playtest export.** The player's actions are logged with the minute they were applied (`ColonyGame.log`, including `continue`); `ColonyGame.replay(seed, factory, log)` reproduces the run (tested). The playtest file (seed + input log + state) replaces the v1 save blob; `apps/site/test/fixtures/playtest-colony-v6.json` is the current default regression run; `playtest-colony-v6-early.json` pins the early-warning village. `playtest-colony-v5.json` remains unchanged under @5. `playtest-colony-v4.json` and `playtest-colony.json` remain unchanged and replay under @4 and @3 respectively. Save loading reconstructs from the seed and log; the included slim snapshot is for inspection. Historical midpoint save/load and continuation hashes are pinned as well.

**Locked numbers** (`world-types.ts`, read by both sides; v1 in brackets).

| Item | Value |
|---|---|
| House start / beam stage | 2 / 7 |
| Wall stages 3–6 | 2 timber, work 120 [work 240] |
| Beam (stage 7) | 2 timber, roll 0.35 |
| Roof stages 8–10 | 5 timber, work 600 [2 timber, work 240] |
| Store-room (Day 3) | 6 stages, 2 timber, work 120 |
| Pot | 2 grain + 1 water → 4 meals, 40 min, both sides [Classic 1+1 → 3; Human 2+1 → 6] |
| Classic meal / raw relief | 40 / 25 [60 / 25] |
| Human meal / raw food | 0.8 / 0.3 |

**Framework gaps found by the design.** Commit 5466c8c closed the gaps this game needed; `packages/human/test/gaps.test.ts` pins the framework's behaviour. Numbering is kept because [voice.md](voice.md) cites them as G1-n.

1. Joint assent for `Affordance.with` (moment 4).
2. Host-created commitment at `begin` (`promise()`), so a carry survives `reviewAt`.
3. Host-triggered re-decision (`interrupt`) after a salient percept.
4. Omission veto: a high-conviction obligatory duty whose window is closing vetoes conflicting work. The game keeps its `forbidden` `abandon-dependents` host norm (§5), designed as the workaround.
5. `VoiceRelation` history (last three trust events).
6. `Percept.channel` lacking `outcome` and `social`.
7. `Considered.label` or a host lookup (met host-side: `human-side.ts` keeps readable labels).
8. `predictResponse` reachable without a `DecisionRecord` (`preview`).
9. Protest quality (`Activity.protest` boolean; `Outcome` had no `quality`).
10. No spatial model: travel in `duration` is the host's responsibility.
11. A recurring worship window per person without a `normId` (Danyal).
12. `nextBodyThreshold` cheap enough per minute, or cached.
13. A documented distrust veto rule (proposed: trust below 0.45 and a salient negative episode by this voice within 24 h vetoes matching suggestions).

**Findings kept from the build.** Solo (same seed, no orders) keeps more meals than the director's script; it is logged by `human.test.ts` as a negative finding for the orders and not tuned away. At v1, Human injuries (8 on the director script, nearly all storm exposure: Tariq and Idris working timber in the squall and the storm, people walking home to sleep after 22:00) exceed Classic's (3), whose units shelter by rule. Praying at home in the storm raised the count (more cross-village walks) and was dropped; an interrupt when the storm breaks did not move Idris off the woodpile.

## 11. Balance

`sim/balance.test.ts` runs on the shipped seed with the locked numbers in code and asserts: Solo fails `roof` only, with storm stock within 6 of the goal; Classic with no orders fails `roof` only; `good2rush` (rush all but Maryam to the House; Maryam to the kitchen D2 13–18) wins all three on both sides and every Day-3 goal on the Human side; `allForest` (everyone to the forest, re-issued) loses at least one goal on each side and leaves the Human roof more than a stage below Solo's; `good2insist` costs the Human roof; following only the suggestions fails the Human roof (stock and lives met) and wins all three on Classic; on Day 3 Solo misses the store-room deadline; each side eats at least 35 meals. It runs in under 5 s.

Current measured outcomes, engine 2.0.0, colony-scenario@3 (§12, 2026-10-07). R S L = roof, stock, lives; values at D2 19:00.

| Pattern | Classic | Human |
|---|---|---|
| none (Classic alone / Solo) | ✗✓✓ · 13 meals | ✗✓✓ · 16 meals · house 9.72 |
| suggestions only (every card, squall insisted) | ✓✓✓ · 15 · 3 injuries | ✗✓✓ · 16 · house 8.97 · 11 injuries |
| good2rush | roofed at minute 1474 | 23 meals, 11 left at the end, roofed 1863 |
| allForest | 149 injuries, 6 dead | 16 meals |
| good2insist | ✓✓✓, roofed 1744 · 19 meals | ✗✓✓ · 12 meals · house 9.74, not roofed |

Day 3, measured on the shipped seed at v2: with no orders, Classic meets all three and Solo misses the store-room by 18 minutes (done 18:18); good2rush meets all three on the Human side (store-room done 14:04).

Other seeds (1–5, probe, not pinned, at v2): Solo fails the roof only on 6/6; good2rush wins all three on both sides on 6/6; allForest loses on both sides on 6/6; Classic with no orders roofs on 3/6 (it misses on the shipped seed); good2insist costs the Human roof on 6/6. Meals are really eaten: at v2 Classic ate 41–42 and Human 40–43 over the run (Classic ate 29 in v1).

## 12. History

- **v1, 2026-10-03** (5466c8c): design spec and build; the framework gaps in §10 closed alongside.
- **v2, 2026-10-03** (6a03c11, merged 11c67c5): answers [playtest items 1–17](colony-playtest-2026-10-03.md): stated goals, paused start, auto-pause, one composer, harder balance (walls cheap, roof slow, smaller pots), the finished house mattering, Another day; then a fix pass (Classic stage claims, storm stock, cook thresholds, shutter window).
- **Playtest round, 2026-10-04** (b92badf, 9441e2a, dfe7e58; notes 8eba127): phone fit, people rows, icons, order words, which-roof wording, hindsight, near misses, playtest export, Solo stepped alongside play.
- **HF 2.0 upgrade, 2026-10-04** (d48d8f6). Released on HF 1.2.0 (engine 1.7.0); main then moved to engine 1.8.0 (long-run state, deaths told) and 1.9.0 (two omission-rule seams); 2.0.0 changes no behaviour here and its API renames touched no colony code. The only code change: `playback.ts` and `human-world.ts` declare fields plainly instead of as constructor parameter properties, so the site bench runs on Node's own loader (bench full run 410 → 273 ms, balance 1772 → 978 ms). The recorded playtest replays under 2.0.0 to the 1.9.0 state once each person's `engine` stamp is written back; the fixture was re-recorded only for the stamps (hash 143eb69ef4f165). From 1.7.0 to 1.9.0 the Human side moved where the omission rule applies (a prayer begun in its window is protected past the end; long activities are reviewed near their end): a few more meals, small shifts in the roof minute. The balance tests tolerated it (good2insist's Human stock flipped from failed to met), so a release should keep reporting the balance table across engine versions, not only whether the bounds hold. Classic moved too under good2rush, allForest and good2insist, although it has no HF people (see Deferred).

| Pattern | Engine 1.7.0 | Engine 1.9.0 |
|---|---|---|
| none | C ✗✓✓ 13 meals · H ✗✓✓ 16, house 9.72 | identical |
| suggestions | C ✓✓✓ 15 · H ✗✓✓ 17, house 8.99 | C identical · H 16, house 8.97 |
| good2rush | C roofed 1693 · H 18 meals, 6 left, roofed 1852 | C roofed 1464 · H 23 meals, 9 left, roofed 1875 |
| allForest | C 21 injuries, 6 dead · H 12 meals | C 149 injuries, 6 dead · H 16 meals |
| good2insist | C ✗✓✓ (house 7) · H ✗✗✓ (11 meals, roofed 2370, after the deadline) | C ✓✓✓ (roofed 2077) · H ✗✓✓ (12 meals, house 9.82) |
- **Export fixes, 2026-10-07** (colony-scenario@3). Four bugs from the owner's export ([playtest](colony-playtest-2026-10-07.md)): Classic resting in the roofed house took storm exposure (§2); orders whose job was not on offer got no Human reply, and a new order was not heard when the person had done that job earlier for a commitment (§3); cards greyed at the lapse after the Human side finished (§3); tariq-again's reason claimed a memory Tariq did not have (§7). After a game-design and an adversarial review: the not-on-offer answer names its real cause, the Human side no longer offers to shutter a roofed house after the warning, the answer does not auto-pause, a refused card still lapses, and tariq-again reads the order log rather than the card. The owner's log replayed under the new rules: Classic injuries 10 → 2; o10 and o27 answer "not now: when the store runs low" (o27 then "Fine." at 16:00, when cooking came on offer); o4, o5 and o9 end done; o42 still cooks. No goal status changed in the balance table; the moves:

| Pattern | Before (scenario@2) | After (scenario@3) |
|---|---|---|
| none | C 7 injuries | C 6 injuries; otherwise identical |
| suggestions | C 10 injuries | C 3 injuries; Human identical |
| good2rush | C roofed 1464, 20 injuries · H roofed 1875, 23 meals, 9 left, 8 injuries | C roofed 1474, 10 injuries · H roofed 1863, 23 meals, 11 left, 10 injuries |
| allForest | — | identical |
| good2insist | C roofed 2077, 15 meals, 24 injuries · H house 9.82, 14 injuries | C roofed 1744, 19 meals, 25 injuries · H house 9.74, 12 injuries |

  The policy patterns move through re-issue timing: they re-order a person only when no card for them is open, and cards now settle differently (a build order to the roofed house is "cannot" at once instead of hanging for 120 minutes; nobody shutters a roofed house), and every order interrupts the person. Classic moves through the same timing (the Deferred note on Classic drift). An intermediate version of this fix, which answered every builder sent to the roofed house "cannot" while the Human side still offered shuttering, cost good2rush 4 Human storm meals; the shipped version does not.

### 2026-10-19 level-up (colony-scenario@4)

An audit by playing a text harness (`apps/site/scripts/play-colony.ts`, the worker's own `Playback`), then HF playtester personas through `apps/site/scripts/hf-colony-adapter.ts`. What the audit found: the first real choice is the cedar card at D1 08:00 (about 22 s in); dawn had five auto-pauses in forty minutes for drinks, meals and the morning prayer, with nothing to decide; "Not that — I'll draw water." refused without a reason; "you'll be safer" was free; the storm night hurt eight people on screen with nothing said; the why panel showed a lower-scored job as chosen without saying why; predictions leaked reason ids; replaced cards hung (Deferred, 2026-10-07).

What changed, and why:

- **Refusals say why** (@4). A "something else instead" answer names its reason: "Not that — I'll draw water; that is my work." A refusal should be said in the moment with its reason.
- **"You'll be safer" is a promise** (@4). Hurt on the ordered job, the person says "You said I would be safer." at once and trust falls (`noteVoicePromise`, kept false). The job finished unhurt counts as kept only when it was risky (the cedar, the beam, or bad weather at its start or end), so a safe job cannot farm trust. The composer says so when the appeal is on. "For the children" and "it's your duty" are unchanged (Deferred).
- **Replaced cards** (@4). A newer order to the same person settles the older card as "replaced by oN" (`OrderBook.replaceOlder`, in issue order, so two orders in one minute do not replace each other).
- **Hurt line** (display). Injuries on either side are said as they happen, over the panes ("Idris (Human) hurt in the storm, out in the open"), at most four, for 90 minutes. Not hashed.
- **Why panel** (display). When a review kept the running job over a higher-scored rival, the narration says "already at it, and a change has to be clearly better." Prediction reasons read as words ("busy with own work", "too weak for it now").
- **Dawn pauses** (Playback only, §8). A "not now" for a drink, a meal, sleep or a due prayer no longer auto-pauses; it shows on the card and over the map. A prayer deferral stays a quiet part of the day, not a stop.

**Saves.** `SCENARIO_VERSION` is `colony-scenario@4`. The @4 hash moves for the same seed and log (tested), so the recorded run is a new fixture, `apps/site/test/fixtures/playtest-colony-v4.json`. The @3 fixture `playtest-colony.json` is unchanged and still replays to its recorded hash under @3 rules. An @3 export loads in the page and plays on under @3 rules, with a line saying so (`parseColonyPlaytest`; tested). The display changes and the dawn-pause change apply under both.

**HF personas** (`node apps/site/scripts/hf-colony-session.ts seeds=2 [rules=3]`, 2 seeds, after the change; the adapter's event valences are my design choice, so read quits as signals). Unwinder and completionist play to D4 05:00 on both rules (Human: house project failed, stock met, lives met). Commuter and restless stop on Day 1 under both rules (at D1 07:17–13:58 under @4; 07:17 and 08:51 for restless), mostly from distress after streams of "not now" and "Not that" answers to orders they sent faster than people could take them (restless: 56 and 35 orders). The level-up does not fix the impatient player's Day 1; it makes each refusal readable.

## Deferred

| Item | Target |
|---|---|
| Storm decay (1 stage per 2 storm hours, at most 4) is assumed, not measured: it acts after the 19:00 goals, but it sets the end-screen house stage and the starting stage of a Day-3 house-first project, also not measured. | unscheduled |
| Crowded-masjid sleep value 0.5 and the `crowded` percept's numbers are assumed; no balance effect was measured (they act after 19:00). | unscheduled |
| Mobile heights were set by assumption and checked at emulated widths (360–390 px) only; check on a real phone screen. | unscheduled |
| Day-3 balance is measured on the shipped seed only. | unscheduled |
| Map fill on desktop panes with less than 180 px spare under the map: those keep a smaller band, not people rows. | unscheduled |
| Seeds other than 20261003 were probed only for none, good2rush, directorCedar and allForest (and at v2); other patterns on the shipped seed only. | unscheduled |
| Hindsight covers Day 2 only with one policy; it does not search for the smallest change that would have won. | unscheduled |
| Near misses give no minutes estimate for an unfinished roof, because no pace model was built. | unscheduled |
| Classic drifting under engine changes is inferred, not verified: those patterns issue orders from `visibleNudges()`, which read Human-side state, so a Human change reorders Classic's orders. | unscheduled |
| Classic with no orders roofs the house on 3 of 6 seeds; whether that weakens the contrast on other seeds is undecided (HANDOFF open item, 2026-10-04). | unscheduled |
| Orders cannot starve the Human store, and moment 1 depends on a late tap (HANDOFF open items, 2026-10-04). | unscheduled |
| Human villagers are injured more than Classic's (suggestions pattern 11 vs 3 on the shipped seed; the owner's 2026-10-07 run had 5 vs 10 before the Classic resting fix and 5 vs 2 replayed after it): they keep working timber in the storm. Risk perception of storm work is weak against commitment and role-goal pull ([findings](../findings.md), 2026-10-03). | unscheduled |
| The hindsight branch from dawn roofs at D2 11:52 with 18 meals, not the pinned good2rush 12:01 with 17; cause not investigated ([findings](../findings.md), 2026-10-04). | unscheduled |
| Landscape phones and large text are untested on a device. | unscheduled |
| Appeals: "for the children" and "it's your duty" still cost nothing (only "you'll be safer" became a promise on 2026-10-19); storm-shutter's "roof will not be on" claim was wrong in the owner's 2026-10-07 run; Human storm injuries move no health bar. | 2026-10-28 |
| Orders barely matter on the Human side: on the shipped seed the house reaches 9 of 10 with or without 17 player orders (harness audit, 2026-10-19). Balance, not rebalanced in the level-up. | 2026-11-02 |
| Dead stretches with nothing to decide: D1 08:03–10:45 and 11:18–16:29, D2 10:08–16:00, the night, and most of Day 3 (harness audit, 2026-10-19). | 2026-11-02 |
| Impatient HF personas (commuter, restless) stop on Day 1 under @3 and @4 from distress after streams of deferrals; a kitchen order with no grain answers "There’s no grain for a pot." with no hint of where grain comes from (HF session, 2026-10-19). | 2026-11-02 |
| Round-2 playtest ([colony-playtest-2026-10-19.md](colony-playtest-2026-10-19.md)): conditional deferrals now stand as promises under @5 (design change 2026-10-20c). Balance tuning remains: a good plan should clearly beat solo on the Human side (the fan: 36 orders gave 8/10; no orders gave 9/10). No balance tuning in this change. | 2026-11-05 |
| Round-2 playtest: honest readings. The pane says trust 54% and the inspector says 50%. Human Idris shows "Health 100" while hurt and carried. "-2 Hurt by your order: timber run" names no source. "Distress" shows without a reason. Explain `!`, Rush and the appeal toggles in place. The composer should warn when the Human side has already said "cannot". Note plainly, in the same quiet tone as sleep, that people stop to sleep and to pray. | 2026-11-05 |
| Round-2 playtest: suggestions. Do not suggest what someone already does. Say what skipping costs. A suggestion that arrives during a wait must not pass unanswered. Add auto-pause modes (suggestions and storm only). | 2026-11-05 |
| Round-2 playtest bugs. Moment 2 says "at dusk" for a morning. The under-protest line leaks `~Build~` markup. `cancel` on a closed order should say why (accepted, done or refused). `until` gives "That time has passed" or a bare "Paused". The "that is my work" line repeats. Harness: an unquoted `new 5`, `wait 20` or `inspect idris` must work, and `new <seed>` must honour the seed. | 2026-11-05 |
| Round-3 retest ([README](../lab/reviews/watchwell-2026-10-20b/README.md), F-363): a way to keep a hurt person sheltered. Implemented 2026-10-23 under @8: Home requests shelter until dawn. Bram: “I cannot find a shelter instruction.” Owner retest remains. | 2026-11-05 |
| Round-3 retest (F-364): implemented 2026-10-23: a House order names building or shuttering before and after. Owner retest remains. Bram: “I do not know whether I protected it.” | 2026-11-03 |
| Round-3 retest (F-365): implemented 2026-10-23: answer first in the rebuilt sheet, bounded ten-second reading slowdown for unopened suggestions. Owner retest remains. Bram: “the actual cedar answer and trust explanation are above the tiny visible body.” | 2026-11-03 |
| Round-2 playtest: show the economy (timber stock, what each house stage needs). | 2026-11-05 |
| Owner taste direction (2026-10-20): "Don't become bland and objective neutral just to satisfy everyone. It's okay to have slight controversies, for example on difficulty." The @5 promises keep people's own priorities: a promise still yields to "that is my work", and no difficulty value changed. An opt-in early-warning village is implemented under @6 (design change 2026-10-20d). A later-storm option remains deferred: it changes the shared goal/end clock, shelter duration, meals and housing as well as weather. Review after the owner plays early warning. | 2026-11-03 |

## Design change 2026-10-20 (owner may veto)

The phone now shows one large village map and a short order sheet. Classic and Human view buttons keep the same prepared order. Worker and place chips stay behind labelled pickers. The selected worker, destination and connecting line stay visible while composing. Confirm shrinks the sheet, keeps the worker selected, and follows their actual movement. Dragging looks elsewhere; Follow restores tracking. Names, current work postures and nearby Human replies make activity visible. The log retains replies. Switching workers preserves the destination. Suggestions warn that availability may have changed, and preparation refreshes the forecast as the village changes. Ordinary moments retain the previous round's continuous clock; only pending suggestions slow playback.

Aiko (F-249): “I would not return voluntarily on this phone layout today.” Pedro (F-258): “I would not return voluntarily on this phone layout. The differences in people's replies interest me, but I want to see the people act.” His first request was: “Let me see the workers and the selected job while giving an order on the phone. I need to watch somebody go and do it.”

Cost and risk: the phone shows one village at a time. Its portrait camera crops the village and needs dragging to look elsewhere; framing a distant worker and destination zooms out. Extra order options and the suggestion explanation scroll inside the bounded sheet. Only actual simulation travel is drawn: completion does not invent a return trip when the person chooses something else. Real phone feel and voluntary return still need a fresh playtest. This is UI only: no edition, rules, HF pin or export format change. Existing @3 and @4 exports must retain their exact replay hashes.

Revert: revert the commit headed `Put the village first on phones` (listed in the design-round well report). No saved-run migration is needed.

### Follow-up c: stable order selection

Hana's live retest: “That selected House. The map shifted since I looked.” She stopped at 4:05: “I would return if selecting orders on the phone felt easier.” This follows F-249/F-258 above; the new retest has no ledger id yet. The map now holds its camera while composing and opening pickers. Only Confirm or Follow frames the worker and destination. People keep moving; taps use the last painted bodies and names. Nearby targets open a named choice list. All eight place chips fit together in a three-column phone grid. Suggestions put the actual worker/place and trade-off beside Use. Maryam's known food-duty refusal adds “Ask again after she cooks the meal.”

Cost and risk: the picker and suggestion temporarily cover part of the map. A distant worker may remain offscreen until Follow or Confirm. The release condition invites a fresh forecast; it does not promise agreement. Simulation, HF 2.8.0, @3/@4 replay and exports stay unchanged. Revert only the commit headed `Hold the map still while composing orders` to restore the preceding UI. Owner phone acceptance remains pending.

### Follow-up d: reachable choices and person news

The adversarial fun review's three ranked UI changes are implemented. The short sheet keeps Confirm and Watch village in one permanent row; open options sit above it. The cedar's specific danger precedes Use; general availability advice follows the decision. Injury news offers Show followed by the person's name. That click follows the person on the reported village, keeps the prepared order, and offers Back to the previous worker (or village). News never moves the camera by itself. Open suggestions offer Keep watching: the card remains, the chosen speed returns, and the card still expires with simulation time. Pausing to read preserves that behavior.

This follows Aiko's F-249 frustration and Pedro's F-258 wish to see people act, quoted above, plus the observed options obstruction and offscreen injuries in `scratch/design-round/fun-well.md` §5. Cost: suggestion, options and news temporarily cover part of the map; multiple injury reports scroll in a bounded region. The map itself retains its height. This changes no Rush balance, simulation rule, edition, HF pin or replay format. Revert the commit headed `Keep Well decisions reachable while watching` to remove this follow-up alone. Owner acceptance and voluntary return remain unverified.

## Design change 2026-10-20b (owner may veto)

The phone now keeps the selected village's roof progress, stored meals and dated storm deadline above the scene while ordering. One sheet replaces the order composer, worker/place picker, options, suggestion or order history. Back returns to the prepared order; Watch village closes the sheet. The order starts at half height. Confirm and Watch village stay outside the scrolling body. The canvas fits the selected worker and destination inside the scene that remains above the sheet.

Omar (F-273) asked: “Let me read current roof progress, stored meals and the storm deadline on the phone as easily as on desktop.” He also asked: “Make the suggestion reflect the refusal I just watched, or say plainly that it is an old suggestion.” A scheduled suggestion after the same worker's refusal now replaces its availability claim with its original time and the recorded answer. This changes display only. Hana (F-272) asked: “Keep the full place choice reachable without searching below the visible first row.” Worker and place choices now replace the sheet body, with Back and the commit row retained. These changes serve DL-21..25 and DL-30..31.

Cost: the phone presents one village at a time and shorter scene height during selection. Full height is an explicit choice. Desktop keeps its comparison layout. Simulation rules, framework pin, order payloads and replay editions stay unchanged. Revert by removing PhoneStage.tsx and its App/Pane wiring, removing the final phone-stage CSS rules and restoring the previous SuggestionCard copy. No save migration is needed.

Enlarged-text exception: when the state's computed type exceeds 24 px (the 200% text check), the phone uses vertical page flow. The village retains at least 300 px and the sheet body grows to fit its sentences. The commit row sticks to the page bottom. The state strip scrolls with the page at this size: keeping its enlarged 227 px block sticky covered worker and place controls. This is a deliberate DL-31 tradeoff for readable, reachable controls at 200%; ordinary phone text keeps the state always visible. Real Chromium at 320×690 with each computed font doubled produced no phone-audit findings at either the top or bottom of the page. Real-device follow-up is targeted for 2026-11-03 to check enlarged text, page scrolling and state comparison on a phone. Revert this exception by removing the `data-reflow` detection and its final CSS block.

### Round 2: ordinary orders in the scene

Bram's fresh retest says “It takes several taps to send one person” and “I keep giving orders for jobs people are already doing” (`scratch/patterns/retest/well.md`, no ledger id assigned yet). This follows Hana's F-272 picker friction and Omar's F-273 wish to see more village while ordering. Selecting a person now leaves the scene open. Each place shows the likely answer; one tap sends the default ordinary order. Order options keeps appeals, reasons and Confirm available. The unfelled cedar retains danger review before Confirm (DL-14). A repeat job says it keeps that person at it. The latest spoken answer appears once in the scene; History holds older orders and injury news. Controls consume their own space, and place labels avoid workers, their names and speech. Injury news offers Send home through the existing order path. After the storm, the strip shows the active project deadline and food target, with the passed storm in Weather history. These changes serve DL-22..25 and DL-30..33.

Cost: dense destinations may move from their anchor (connected by a line) or into More places; Order options leaves less scene height. Send home requests the existing daytime eat or nighttime sleep job, and can be refused; it adds no rest or shelter rule. Scripted first-five-minute availability had a 0-second longest gap both before and after; this is availability, not evidence that repeated orders are fun. Ordinary orders from an already selected worker fell from three observed taps to one. The simulation, HF pin, editions and slowdown/expiry rules are unchanged. Owner phone acceptance remains outstanding. Revert the commit headed `Send ordinary Well orders from the scene` to remove this round alone; no save migration is needed.

### Round 3: clean watching and ordinary suggestions

Kwame's live round-2 retest (no ledger id assigned yet; following F-272/F-273) asked: “Let me clear the destination cards and watch the people after sending an order.” He also asked: “Tell me on the phone that an order goes to both villages” and “Let me send ordinary safe suggestions more quickly.” Sending now clears destination cards and follows the person. Watch village clears the cards and destination highlight, closes the sheet and keeps the draft available in Order options; Enter cannot send a hidden draft. Selecting a person restores destination choices. The phone says once before the first order that each order goes to both villages. Each order acknowledgement repeats that scope. Injury news from the other village names that village, marks it not shown and offers Show for that person.

A suggestion without a known danger sends in one tap from its card through the same input and nudge-id path as preparation plus Confirm. Known cedar/beam/weather dangers, Rush, Insist, appeals and authored cooking/shuttering trade-offs retain review and Confirm. Both villages' current jobs inform danger review. People still refuse or defer through the existing simulation. These changes serve DL-5, DL-10, DL-13..14, DL-22, DL-30..31 and DL-33.

Cost and risk: the one-tap route removes the ordinary preview; the card retains its proposal and reason, and says the person may refuse or wait. Destination choices require selecting a person again after watching. Repeated scheduled suggestions for work already underway remain possible; addressing them is deferred to 2026-11-03 because it is outside this UI follow-up. No rule, edition, HF pin, export or clock change. Revert the commit headed `Clear Well orders while watching` to remove this round alone. Owner acceptance and voluntary return remain unverified.


## Design change 2026-10-20c (owner may veto)

F-306 ([Bram’s report](../lab/reviews/calibration-2026-10-20/a2-well-20.md)): “She went back to grain. Roof still eight, meals down to seven. I am done here. I like that they have their own priorities, but on a lunch break I want an order to stick without chasing it through more sheets. I would not come back on this phone.”

### The place under the finger

Scene cards retain the destination and sender resolved at pointerdown. Their layout stays fixed during the press. Releasing outside that card, moving the finger or cancelling sends nothing. Keyboard activation still works. The acknowledgement names the ordered place. Baseline Chromium at 360×690 reproduced House → Well after a 180 ms look-to-press delay while following Idris after an earlier order. A held-pointer sample sent House on both builds; it did not establish that movement during a held pointer caused Bram’s mismatch. Regression tests force movement during a press and release on a different card; they fail on the old handlers. Cards can still move before the press.

### The order stays on the person

Name tags and the selected-person line say House: waiting, later, on it, won’t, done, or didn’t get to it. Tapping a person opens their latest Human reply with Ask again and Cancel order. Ask again preserves the original request options. A refusal offers Insist with its trust warning. Long name-tag text wraps. Speech yields space to workers and names; when no space remains, the reply stays in the person’s order sheet. The phone’s state strip and selected-person line remain above that sheet.

### Conditional deferrals under @5

A stated delay now survives the old 120-minute expiry until the job begins, HF refuses, the player replaces or cancels it, or the person sleeps for the night (§3). HF still chooses the work. Its own-role refusal now ends the promise rather than masquerading as a delay. Existing HF meal/prayer completion decisions and host-offer interrupts reweigh the suggestion; no framework code or Classic behavior changed. New exports use @5. The unchanged @3 and @4 fixtures retain hashes `0e3098aa7a50ab` and `094447bbacb73f`; @5 is pinned at `0282691f605d0b`.

### Measurement, cost and risk

At 360×690, Choose person → Idris → House takes **3 taps before and after**, excluding Play. This measures the direct route’s activations, not human completion time. A scripted **600 emulated seconds** sent five House orders at 0/120/240/360/480 seconds to Idris/Samira/Tariq/Yusuf/Idris. Both runs used 19 activations and reached sim minute 1754 with default slowdown. DOM text was checked each second without opening History.

| Measure | @4 before | @5 after |
|---|---:|---:|
| Orders that lapsed | 4 | 1 |
| Lapsed orders with no original answer exposed | 0 | 0 |
| Lapses with no visible lapse notice | 4 | 0 |

These are browser-script observations, not a human playtest or proof that someone read the words. The script drives the real worker in quarter-second ticks and advances the browser clock; it does not measure attention.

Cost: a standing promise may make people look stubborn or keep the player waiting. A promise that lapses at night is a loss the player must notice. Persistent status and retry controls take scene space; compressed scenes may hide speech while retaining it in the person sheet. Balance tuning remains targeted for 2026-11-05. Owner acceptance and voluntary return remain unverified.

Revert: revert `Keep deferred Well orders as promises (colony-scenario@5)`, `Show each Well order’s state on the person`, and `Order the place under the finger on Well phones` in that order.

**Round 2 (fun review).** The reviewer wrote, “A repeated role refusal attached to a suggested roof helper feels like stubbornness when I am still waiting on roof 8.” A current refusing forecast now puts the reason first and offers **Insist · may cost trust**, with its warning and review before Confirm. HF still decides the answer. Person tags wrap within the visible camera bounds; previews name only the selected person and destination. The labelled selected-person status reopens the latest order. The place-picker row stays reserved to prevent a resize loop. Cost: surrounding tags yield space during previews, the picker uses a row, and extra order options live under More → Order options. This is UI only: no new ruleset or fixture; @3, @4 and @5 exports and historical midpoint continuations retain their exact hashes. Owner phone acceptance remains pending. Revert: revert `Keep Well refusals and tags readable`.

**Retest (2026-10-20, Protocol 2, live `05f124b`):** testers could read each order's state when they gave it. They could not tell what a done order or a Home order had achieved once the person was hurt outdoors again (F-352, F-354). A tap on a person at a place became an order to the place (F-353). A quick order from a notice went to the person a newer notice named (F-355). Rush could not be found on the phone (F-356). These are open with target 2026-11-03 ([reports](../lab/reviews/watchwell-2026-10-20/README.md)).


## Design change 2026-10-20d (owner may veto)

**What changed.** Completion receipts name the work and its time on the person and in History. Home says it asks for one meal or one sleep, then returns the choice to the person. Its receipt retains the first choice afterwards. A person or name tag takes selection priority over the place beneath it. An injury notice holds its rendered person through a pointer press. Rush is directly available in the phone Order options panel.

**Tester words.** F-352: “I cannot tell what done and home actually bought me.” F-353: “I tapped Idris under his name and that sent Tariq to Masjid.” F-354: “I sent Idris home last night, and now he is hurt out in the open again. I cannot tell whether my home order wore off or whether shuttering happened.” F-355: “I tapped Send Yusuf home, but the answer says Idris Home. The injury notice changed while I was reading.” F-356: “The game tells me to use Rush, but I cannot find it in Order options even with a full panel and a scroll.” These are the verbatim ledger excerpts supplied in the round-3 brief; the motivating playtests are in [the review folder](../lab/reviews/watchwell-2026-10-20/README.md).

**A village with more warning.** @6 adds the start-only early-warning choice described in §2. One knob, `preparationAt`, lives with the named villages in `sim/village.ts`. It applies to both cooking caps and the warning. It does not move the storm or the shelter/shutter windows. People keep their own work and refusals. The default stays exact. On three no-order seeds (20261003–20261005), early warning gave Human 17 meals at the deadline rather than 16. Classic kept 13. Roof stages, injuries and living villagers were unchanged at that deadline. This is a small preparation benefit; owner acceptance and sustained engagement remain untested.

**Cost and risk.** Receipts add text to tags, the selected-person line and History. A short scene shows a complete name tag when the receipt will not fit; the line and sheet retain the result. Home still uses the old eat/sleep rules: its name can imply a lasting assignment that the simulation does not make, so the text says its actual duration. The early warning is a forecast, not early physical darkening. Raising a stock cap does not force the cook to choose cooking. The option gives warning and a modest food margin; it does not make the roof easy. Two independent reviews found the initial store-room mislabelling and missing retained post-Home choice; both were corrected.

**Versioning and replay.** The clarity fixes add no simulation rules. Receipts are derived presentation records, rebuilt on load. @6 versions only the opt-in preparation setting. The named dawn choice and its minute enter the export, save and state hash; @3–@5 reject it. Default @6 and @5 compare equal as complete simulation states on the same seed and orders, without dropping fields. Historical fixtures and encoded midpoint continuations pass:

| Edition | Full fixture, unchanged | Midpoint | After 40 more minutes |
|---|---|---|---|
| @3 | `0e3098aa7a50ab` | `1347c6790d6af0` | `1778b892677e4f` |
| @4 | `094447bbacb73f` | `19a50932e6dfad` | `0aebd284d7354b` |
| @5 | `0282691f605d0b` | `02758c2e2bb9fa` | `01b6fc9edd1657` |
| @6 default | `0282691f605d0b` | equal to @5 | equal to @5 |
| @6 early warning | `0600476948949f` | `134caa6c3962af` | `171cdb3b9f7fcd` |

The historical comparisons normalize only the embedded person-engine metadata, as before. Pointer tests cover the person over a place and the injury changing during a Home press. The 360×690 touch layout check covers the start card, early-warning selection, watching, Rush in the ordinary panel and the full panel: no audit findings; Rush is a visible 44 px target. Real-device and owner acceptance remain pending.

**Round 3b (fun reviews).** The wildcard reviewer wrote, “I could not see who stood where while deciding” and “Paying a cost and not seeing it is the worst kind of hidden number.” The Codex reviewer wrote, “I would keep that qualitative.” Phone sheets now retain about 40% of the viewport for the map, with a one-line injury notice. Full injury details remain in History. Classic notices offer Show, never a Home order. Canvas taps retain the painted person/place and sender at pointerdown; drags and cancellation send nothing. Rush appears beside the selected person. Disabled Confirm says what is missing. The person sheet describes recorded protest and dated recent trust losses; it does not infer a loss from Insist alone. Prayer has no scored ending comparison. Cost: the smaller sheet scrolls, and the selected-person line and village-setting caption yield space while it is open. This is UI only: @3–@6, their fixture hashes and midpoint continuations stay exact. Independent correctness and game-design reviews informed the fixes. Cold-player and owner acceptance remain pending.

Revert (Round 3b): revert `Keep Well scene and order costs readable`.

Revert (Round 3): revert `Explain Well orders and offer an early-warning village`.


## Fresh orders (2026-10-21, F-424)

The owner chose to try orders that stick a little longer. Under @7, the Human host adds up to 0.15 to a fresh order’s suggestion strength, capped at 1. This extra weight fades linearly to zero over 60 simulation minutes from receipt. The original strength and receipt time stay in the save, so a deferral or load does not renew the boost. Prediction uses the same fresh strength. The Why panel explains the first-hour pull.

HF still chooses each action. Needs, duties, risk, trust and refusal remain in its weighing. This does not extend the order’s lifetime or force an accepted job to finish. Classic receives its usual command. @3–@6 retain their original rules and fixtures; @7 has its own full-run replay fixture. Owner feel acceptance remains pending.


## Home shelter (2026-10-23, F-363)

New runs use `colony-scenario@8`. Home asks a person to stay sheltered until the next 05:00 dawn, at most one day. Classic obeys and still eats and sleeps. Human receives a standing shelter request, keeps competing choices, and can refuse or leave for needs and duties. A new order or Cancel ends the request. The host chooses the person's actual storm housing; Home does not promise immunity while travelling or recovery from an injury.

Rules @3–@7 retain one-meal/one-sleep Home, their recorded hashes and exact continuation. The order's action determines its displayed explanation, so old loaded runs retain the old Home wording. The @8 fixture and focused shelter control cover dawn expiry, meal and sleep interruptions, cancellation, replacement, autonomy and save continuation.

The open-fix sweep also puts fresh suggestion forecasts before earlier context, marks matching work already underway in both villages, retains the refused destination when changing workers, and names the House action in its receipt. An unopened suggestion gets ten seconds of reading pace, then returns to the normal pace; opening its sheet keeps reading pace. These presentation changes do not alter recorded inputs or legacy simulation rules. Owner acceptance remains a playtest.


## HF 2.21.0 narration adoption (2026-10-25)

The site pins HF 2.21.0. Fresh actors opt into persisted `Lexicon.plainEnglish`; saved actors keep their choice. Canonical chapters pin that choice in the admitted initial actor. No new faculty is enabled. Current exports retain the runtime version and replay checks; Voice and Well refuse files from earlier narration versions with a start-fresh message.

Regression: `src/shared/plain-narration.test.ts` covers fresh actors, later Watch arrivals and births, saved choice, export stamps and pinned canonical replay. Existing game export/replay and cast-chapter tests cover the upgrade. The before/after proof captures seeds 7, 42 and 1001: six Voice months, nine three-day Well runs with intermediate states, and three Watch years. All eighteen text-projected hashes match. It retains RNG, numbers, action IDs and semantic histories; only verified bijective Voice pause-word identities, display fields, the engine stamp and the narration opt-in differ. External evidence: `~/code/.lab-scratch/hfadopt/seeded-hashes.json` and `semantic-history-maps.json`.

Lesson: narration can also be a comparison key. Well's HF duty counter and host duty counter previously shared a phrase. Plain narration changed only one and emitted an extra bubble. Preserve the existing counter identity separately from the displayed sentence. Never blank a history to make an upgrade proof pass.
