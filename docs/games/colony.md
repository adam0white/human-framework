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

**Weather.** A squall Day 1 21:30–23:00 (wind and cold; forest and field work fails outright). A warning Day 2 16:00 (sky darkens). The storm Day 2 19:00 → Day 3 03:00: an exposure roll every 10 minutes outdoors; no cooking on either side. Scripted storm meals at D2 19:30 and D3 04:45: each living villager takes one meal from the store if one is left; the Human side eats in the shelter. An unfinished, unshuttered house at stage 1–9 loses 1 stage per 2 storm hours, at most 4 (*assumed*, see Deferred). Day 3 weather is clear.

**Shuttering.** An order to the House infers `shutter-house` below the beam from the warning, and for an unfinished roof from 18:00 (`SHUTTER_ROOF_FROM`), when a roof stage can no longer be finished. Never after the storm ends, so Day-3 orders build.

**A finished house matters.** From the storm on, Idris and Samira live in the new house if it is at 10 (`homeOf`, shared by both sides). Below 10 they shelter in the crowded masjid: Human sleep there advertises 0.5 instead of 0.8, and at 19:00 each gets a felt `crowded` percept (valence −0.4, salience 0.7: "No roof of our own tonight."). Classic is only relocated. On Day 3 an unroofed family goes back to its old home.

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

**Order lifetime.** A card persists: the host re-issues the Human suggestion at each of that person's decisions until it is assented-and-completed, cancelled, or 120 sim minutes old (the card greys "lapsed"). A card whose Human job has begun does not lapse at 120; it settles when the job finishes, with a hard cap at 240. A lapse withdraws only the Human standing suggestion; Classic received its command once and finishes it. An order is completed only by a job begun after it was given. A deferral is never a silent drop: the card shows the counter-offer.

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
| tariq-again | D2 07:00 → 08:00 | Morning. Timber is still short. Send Tariq to the forest? | He remembers last night. | tariq → forest |
| roof-hands-1 | D2 09:00 → 10:00 | The roof needs hands. Rush Samira to the house? | Roof stages are slow; a rushed helper speeds them up. | samira → House, Rush |
| roof-hands-2 | D2 09:30 → 10:30 | And Danyal? | The well can wait an hour. | danyal → House, Rush |
| storm-pot | D2 16:30 → 17:30 | The storm will put the fire out. Maryam, cook a pot to keep? | Nobody can cook from 19:00 until 03:00. | maryam → kitchen |
| storm-shutter | D2 18:00 → 19:00 | The roof will not be on before the storm. Shutter the house? | An unshuttered, unfinished house loses stages in the storm. Shuttering stops the roof work. | yusuf → House |

`storm-pot` follows the warning because before it the Human cook is offered only below 6 meals, so a village on track answered "not on offer"; it sits 30 minutes after the warning pause so the two do not stack. `storm-shutter` matches the 18:00 shutter window and hides once each side is roofed or shuttered. Issuing a card's order settles only that card, not later cards for the same person and place.

## 8. Playback: start, pause and auto-pause

The worker decides pausing, so every UI behaves the same and it is testable headless (`sim/playback.ts`).

- **Start.** The worker inits paused (`pause.kind 'start'`) behind the goal card: the three goals, the storm time and one line on the two sides. **Play** resumes. A one-time "Tap any bubble" toast follows the first frame.
- **Auto-pause** (one toggle, on by default, kept in `localStorage` `colony.autoPause` inside try/catch). It fires after the causing minute has been stepped, stops stepping at that minute and drops the rest of the tick. Reasons, in priority order: `suggestion` (a card becomes visible, once per card); `refusal` (the first Human `notNow`, `willNot` or `complied` on a player card, once per card; not `cannot` such as "I'm asleep", not bodily-need thoughts); `moment` (once per moment); `storm` (the warning and the storm start). Several reasons in one minute coalesce into one `PauseInfo`: the first decides `reason`, `text` lists the rest.
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

**Determinism.** Three RNG streams from one seed: `scenario` (weather, cedar and beam rolls, applied identically to both sides), `classic`, and each `Person.rng`. No `Math.random` or `Date.now` in the sim. Orders are stamped in sim minutes and applied at the next boundary on both sides. Identical by construction: start state, weather, order log, the roll for a given risky order at a given minute. Divergent by design: who does what and when. `SCENARIO_VERSION` is `colony-scenario@2`.

**Replay and playtest export.** The player's actions are logged with the minute they were applied (`ColonyGame.log`, including `continue`); `ColonyGame.replay(seed, factory, log)` reproduces the run (tested). The playtest file (seed + input log + state) replaces the v1 save blob; `apps/site/test/fixtures/playtest-colony.json` is the recorded regression run.

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

Current measured outcomes, engine 1.9.0 (identical under 2.0.0; §12). R S L = roof, stock, lives; values at D2 19:00.

| Pattern | Classic | Human |
|---|---|---|
| none (Classic alone / Solo) | ✗✓✓ · 13 meals | ✗✓✓ · 16 meals · house 9.72 |
| suggestions only (every card, squall insisted) | ✓✓✓ · 15 | ✗✓✓ · 16 · house 8.97 |
| good2rush | roofed at minute 1464 | 23 meals, 9 left at the end, roofed 1875 |
| allForest | 149 injuries, 6 dead | 16 meals |
| good2insist | ✓✓✓, roofed 2077 | ✗✓✓ · 12 meals · house 9.82, not roofed |

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
| Human villagers are injured more than Classic's (8 vs 3 on the shipped seed; the owner's 2026-10-07 run had 5 vs 10, mostly from the Classic bug below): they keep working timber in the storm. Risk perception of storm work is weak against commitment and role-goal pull ([findings](../findings.md), 2026-10-03). | unscheduled |
| The hindsight branch from dawn roofs at D2 11:52 with 18 meals, not the pinned good2rush 12:01 with 17; cause not investigated ([findings](../findings.md), 2026-10-04). | unscheduled |
| Landscape phones and large text are untested on a device. | unscheduled |
| Owner's export 2026-10-07 ([playtest](colony-playtest-2026-10-07.md)), bugs: Classic villagers roll storm exposure resting in the finished house (`site` is not indoors); cook orders made while cooking is not on offer get no Human reply; cards lapse when only the Human side finished; tariq-again's line assumes squall-tariq was taken. | 2026-10-21 |
| Same export, design: appeals cost nothing ("for the children" became a default); storm-shutter's "roof will not be on" claim was wrong that run; Human storm injuries move no health bar. | 2026-10-28 |
