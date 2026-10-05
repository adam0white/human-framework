# Game 3 — *The Night Watch*

Approved 2026-10-04; revised for endless play.

Owner's brief: a known, deceptively small genre "within which player connects with each character and develops them". On approval he added: "potentially infinite play (until the characters die of natural causes? I dunno). We could see longer time effects of our framework. Though it should have more UI than just text, and showcase some stuff happening, yet similarly deeply integrate the human framework". AGENTS.md "Game direction" applies (approximate, subjective readouts; show rather than count; tactical slowdown, not pauses; continuous speed; limits from capabilities; saves and menus in the fiction), as does "Games keep faith gentle". Numbers marked *assumed* are unmeasured.

## 1. Promise and fit

**Promise:** you keep the watch of a small walled village, winter after winter. Every tower on the wall is a person who can say no, learn courage, break, marry, grow old, and hand the Gate to a grandchild.

**Why tower defense.** TD is placement plus attrition, readable in seconds. HF replaces a tower's three properties: it stands where put (the will), improves only by upgrade (skills), and ignores its neighbours (social). The night's decisions are about people: *Mara is wavering, her house is on the east side; do I let her go?* Years add the decisions only time can ask: *who takes the Gate when Tamar's knees go?*

**The player is the Keeper:** the office that writes the village chronicle, carries the lantern and rings the bell. It outlives any one person, so the same voice carries across generations. Villagers hold trust in the Keeper like any voice (HF `trust`); children learn it from their parents' stories.

**The story it should produce** (player-advocate review): "My old Gate keeper hid her bad knees for two winters. When she died, her apprentice's daughter took the Gate and refused the east wall, because of a story her father told her." A system that does not serve a story across years is cut first.

## 2. Time

**One continuous clock.** Speeds: 1/16× (card open), ¼× (tactical), 1× (a night of 12 sim-hours in about 3 real minutes), 3×, *Days* (a day in about 10 s) and *Seasons* (a week in about 10 s). Only the chronicle (the menu) stops the clock.

**Tactical slowdown.** A moment (§4) eases play to ¼×; while its card is open, 1/16×. Moments queue and show one card at a time. The decision window is counted in sim time (about 2 sim-minutes, *assumed*), and inputs are logged by sim-minute, so replays are deterministic. Doing nothing is always legal: the person decides alone. A flyleaf setting chooses which moments slow play. *Days* and *Seasons* drop to 1× when something person-changing begins (a fight, a birth, a quarrel at the well).

**The year, about 15 minutes at default** (*assumed*):

| Season | What happens | Default |
|---|---|---|
| **Winter: the Watch** | 6–8 nights, one sharp peak. Nights where no moment fires run on standing posts and appear only as dawn-page lines. | 1× nights with moments; routine nights summarized |
| **Spring: the thaw** | The thaw page (§3); repairs, weddings, births, who leaves. | *Days* |
| **Summer** | Fields, practice, building; some years an event (a house fire, a sick well). | *Seasons* |
| **Autumn: the reckoning** | Harvest fills the granary; the fair; 2–3 decade decisions (§4); who comes of age (15); next winter's tracks. | *Days* |

At 15 minutes a year, Mara's children come of age around evening 3: the inheritance is reachable.

## 3. Endless structure

**What ages and changes (all HF, §7):** bodies (recovery and fitness by age, chronic illness, scars), skills (practised on posts, rusting, slower to learn late), fears (believed risk of each post moves toward what was met), bonds and grudges, marriages, children (temperament drawn loosely from both parents), and natural death (age hazard raised by poor health). Combat never kills: wolves bite, thieves knock people down. Death comes from age and illness, offstage: a funeral line, an empty place at the wall, grief in those close.

**Permanent losses short of death** (so the long run never settles into a safe equilibrium): whole households leave after a bad winter (HF decides from mood, ties and trust); some wounds end a person's time on the wall (a limp for life); a house burns; a wall section is lost for a year. Growth costs too: more grain draws more thieves, a longer wall has more posts than people. These are irreversible map and chronicle changes, never undone within a volume.

**What carries across generations:**
- **Stories.** Memorable nights become lasting gists people retell (HF L1, conversation); a child who hears how the east wall broke fears it before standing there.
- **The Keeper's reputation:** a newborn's trust starts from the household's stories.
- **Habits and values** by upbringing exposure (L2), **temperament** by loose heredity (`createChild`; a tendency with wide noise, never a destiny).
- **Grudges and debts** carried by children (Joss's grudge in his son).
- **Places** named in the chronicle ("Tamar's stone" at the Gate).

**Volumes.** A volume of the chronicle is one generation with a named question and a visible end that is not failure, for example "the Gate is handed on" or "the last of the founders dies". When it resolves, the volume closes with an epilogue (each living person's fate, in their voice), however the village stands, and the next volume opens with a new question drawn from the living cast. **Blank leaves** at the back of the current volume each print the condition that will fill them ("when a child born here first stands the wall"; "when an outsider is married in"), so the player sees that more exists and roughly what opens it.

**What makes year 3 different from year 1.** Year 1 is authored and gentle (§4). From year 2 a game-side director generates each winter from the village: prosperity draws thieves, a dark thin wall draws wolves, a bad harvest brings desperate outsiders, a dry summer brings fire. No two consecutive winters share a lead threat; a threat's second appearance carries a twist (wolves learn the dark section; thieves come with a man inside). Each winter states one question from the cast's life stages, as a goal that can fail with a visible cost ("Tamar can no longer climb the Gate stair: name who holds it, or the Gate stands empty on the peak night").

**The village falls** when at a thaw dawn the granary cannot reach the harvest, or when for three nights nobody comes to the wall. The volume ends early with its epilogue; survivors and their children resettle a ruin nearby in a new volume, carrying temperaments, stories, scars and their trust in the Keeper, which may now be low. If every line dies out, the chronicle closes and a fresh village starts from a new seed. The director brings newcomers (refugees, a fair-day marriage) so a small founding cast does not run out of partners.

## 4. Play

**The opening.** The chronicle opens with the clock stopped on a page that states the goal: *bring every soul and the granary to the thaw.* Night 1 is one wall section, two watchers (Tamar and Kian) and one wolf pack. The cast arrives over the first nights (Joss and Mara, then Yunus, then Ruslan with the thieves).

**Dusk: posting.** A scout line telegraphs the night ("pack tracks by the west wall"). There are always more posts than people. Tap a portrait, tap a post; a card offers *suggest*, *urge* or *insist* in words, with the person's likely answer **seen through the Keeper's impression** (L6): a well-known watcher reads "likely" or "won't: next to Joss"; a newcomer reads "you can't tell"; a hidden trait can make the preview wrong. The dawn page shows what actually happened, so the player checks their reads. Posts stay as standing suggestions. Posting is closed at night.

**Night: watching.** The night is abstract. Each wall section is a lane; enemies are tokens that advance along it; each sim-minute resolves as rolls from skill × capacity. No projectiles, no pathing, no fire spread. The Keeper's night actions are the lantern, the bell and moment cards:

- **The lantern is the Keeper's position.** It lights one section: enemies there are seen and hit earlier, and the Keeper sees the people there. A waver on an unlit section raises no card: the player sees only a figure moving in the dark.
- **The bell (HF `command`)** commands one named watcher within earshot to hold. It costs that watcher autonomy and trust and raises their break hazard, scaled by how much they wanted otherwise; the card says so in words ("Joss will resent this"). No charges: overuse is limited by what it does to people, and by the rope, which frays visibly and must be mended by someone's day.

| Moment (lit section only) | Trigger | Cards |
|---|---|---|
| Waver | `hold-post` within the close-call margin of `flee` or `go-home` | let go · urge hold · bell |
| Family | a threat percept targets a watcher's home | let her go · send someone else (their post empties) · bell |
| Downed | a watcher is down in the open | name a carrier (preview through the impression) · leave her |

At most three moments a night (*assumed*). Yunus may step off for Fajr near dawn: shown as a figure leaving, with no card and no slowdown.

**Day: talking.** The dawn page gives one line per watcher in their voice and a why for each refusal or departure. Talks cost the Keeper's daylight (about an hour each) and the person's sleep after a night on the wall, so influence trades against their rest. A talk is also how the Keeper learns: *tell me about last night* (cue recall), *how is the knee?* Topics are ranked by the person's inclination: *rest* · *practise with Tamar* · *mend things with Joss* · *take the Gate tonight* (a promise) · *teach Kian's daughter the sling*.

**Autumn: decade decisions.** The fair is the drafting phase: 2–3 choices that cannot be undone and draw on the same grain and labour. Admit the outsider family or keep the grain; extend the wall (a new post, more posts than people); buy a bigger bell (the rope lasts longer, the bell carries further) or seed grain; name the Gate heir (pride and trust move on both sides).

**The thaw page** closes each year: the chronicle writes what changed permanently (who left, who died, who married, what burned) and shows it before spring begins.

## 5. Show, don't count

**Three managed limits:** **grain** (sacks drawn in the granary: harvest, theft, the fair), **the Keeper's time** (daylight and one place at a time; lantern position at night), and **the bell rope** (fraying, mended by someone's day; a bigger bell from the fair). Stones and lamp oil are ambient: children gather stones and oil comes with the harvest; a dwindling pile or a guttering flame shows a bad year, but the player does not manage them. Stamina and the size of the watch are people, read through them.

**Show.** Sprites slump, then sit, as fatigue rises; a bandage and a limp; a torch gutters; a dog barks before a threat is lit; voices in short bubbles ("not the east wall again"); grey hair and a stick. No HP, fatigue or ammo numbers in play.

**Subjective readouts.** A card shows the Keeper's impression, not true state: phrases with a confidence ("afraid of the east wall, *you think*") and soft bars whose width is uncertainty. It sharpens with nights watched under the lantern, talks, and what others say. Only what has actually changed goes stale, shown as "last seen at harvest" rather than a blur. The roster shows people of watch age. Hidden traits are a gap the Keeper can learn: Tamar's words say "fine", her limp says otherwise. A wrong read costs: post Tamar on "fine" and she cannot climb the stair, and the Gate stands empty. There is no truth toggle in play; HF's terms appear only in the playtest export.

## 6. Saves and menus in the fiction

- **The chronicle is the menu.** Opening it stops the clock. Each volume is a book on a shelf (the save slots); pages are the record; the flyleaf holds settings (speeds, which moments slow play, text size). No rewind within a volume.
- **Storage:** a full snapshot at each season boundary plus the sim-minute input log since, compressed in IndexedDB; loading restores the season snapshot and replays the log. No server. The permanent chronicle text is game data; HF's own chronicle stays capped.
- **Playtest export:** "copy this volume" writes seed, input log and state JSON (with HF terms); a replay test pins that it reaches the same state.
- **Upgrades:** pages carry the engine version; HF `migrate` upgrades old volumes.

## 7. Framework and game

**HF faculties shown, as built (1.6.0):** `decide`/`predict` and verdicts; insist, trust, pressure; standing suggestions; `command`; breaks; capacities, `tend`, downed; outsiders and threat percepts; `practise`; `learnOutcome` (courage); `appraise`; `socialEvent`, `judge`, `converse`; cue recall; promises; bereavement; lifecourse, chronic illness, `mortalityEvent`; `createChild`; snapshot, `migrate`; `skip`.

**New for HF 2.0** (general, no Night Watch names; each with tests, a headless control scenario and a scope paragraph):

| # | Deliverable | Scope | Test sentence |
|---|---|---|---|
| L1 | **Experience over years** | Episodes past a horizon consolidate into a few lasting, valenced gists that keep recall, fear and retelling alive; skills age (slower learning, rust); state stays bounded. | A fear learned at 20 still shapes choices at 40 after its episodes are gone; a 50-year snapshot stays under a stated size. |
| L2 | **Upbringing and heredity** | Per-skill aptitudes, loosely inherited; childhood exposure to household habits and values; parents' gists and voice trust passed by conversation. | A child of fearful parents believes a place riskier before going there; a child's trust in a voice starts from household stories. |
| L3 | **Attraction and partnering** | Attraction from familiarity, shared events and trait fit; slow courtship; a proposal resolved by a host-supplied custom (consent, age); kin prohibition; household formation. PG. | Two people with many good shared events partner under a custom requiring family consent; a forbidding custom or kinship prevents it. |
| L4 | **Ambient context** | A host `ambient` input on `tick` (cold, dark, crowding, comfort) feeding mood, sleep and fatigue. | Cold dark nights lower mood and raise fatigue; a warm hall restores them. |
| L5 | **Long-run community driver** | Mixed fidelity: full stepping, or a coarse community `skip` with social events summarized. The switch happens only at dawn, by host request; coming of age and life transitions are events; a budget. | 25 people run 50 years headless, deterministically, within the bench budget; resume from a season snapshot plus log is byte-equal. |
| L6 | **Impressions** | One person's estimate of another's state and likely answer, with uncertainty, from familiarity and observations; hidden pain and pride bias it. The Keeper's readout and the preview use the same function as villagers' judgements of each other. | An estimate narrows with shared time and errs where the target hides pain. |

**Game-side only:** lanes, tokens and rolls; the seasons calendar and threat director; grain, the fair and decade decisions; the bell's earshot and rope; marriage customs and coming-of-age age as host data; the break catalog; talk ranking; the permanent chronicle and storage. HF sees only affordances (`hold-post@gate`, `flee`, `go-home`, `carry@mara`, `court@kian`), outcomes, percepts, ambient input and what the Keeper observed.

## 8. Cast, year 1

| Watcher | Strength | Flaw | Long arc | Ties |
|---|---|---|---|---|
| **Tamar**, 54 | Sling, steady | Pride: under-reports pain | Hands the Gate on, or wears herself out | Kian's mentor; grudge with Ruslan |
| **Kian**, 16 | Fast, eager | Takes the risky post; freezes once hurt | Courage, or turns from the wall; may raise a watcher | Sister by the west wall |
| **Mara**, 34 | Best sight | Home on the east edge | Trusts the wall enough to stay | Married to Joss; two children |
| **Joss**, 38, smith | Strength | Anger; resents Ruslan over a debt | Puts the grudge down, or passes it to his son | Mends the bell rope |
| **Ruslan**, 45 | Spear | Newcomer; high emotionality, bad sleep | Becomes one of them, or leaves at thaw | Suspected over missing grain (never confirmed) |
| **Yunus**, 61, miller | Calm | Frail, poor sight | Likely the first natural death | Prays; texture only |

## 9. UI scope

React 19 shell; Canvas 2D; simulation in a Web Worker; React renders snapshots. A village map with lanes along the wall, simple sprites and shapes (stand, walk, throw, slump, sit, down), light as radial gradients, weather as a tint. No WebGL, no engine, no projectiles, no pathing. Lucide icons. Phone portrait (research real viewports such as the Galaxy S26 first): map top, roster strip, cards as a bottom sheet with tap-only input and 44 px targets; fullscreen and wake lock at night. **Guardrail:** UI work stays under a third of G3 effort; anything beyond sprite frames, gradients and tweened positions is cut.

## 10. Build plan

| Phase | Work | Playtest gate |
|---|---|---|
| G3-1 | Abstract lane night without HF (obedient tokens): lanes, rolls, grain, scout line, lantern, dusk posting, continuous clock with speeds and slowdown. Small by design. | Against a telegraphed threat, testers post differently and a bad plan visibly loses sacks |
| G3-2 | People on HF: verdicts, impressions (L6) on cards and previews, bell (`command`), breaks, injuries and downed, outsiders, moments, dawn page, talks, sprites; the year-1 winter | A fresh tester names one watcher's fear and one bond, unprompted, within three nights |
| G3-3 | L1–L5 in HF; seasons, director, decade decisions, permanent losses, volumes, blank leaves, fall and resettlement, season snapshots | Headless: 3 seeds × 50 years; population and mood must swing by decade (flat lines fail) and years 10 and 20 must differ across seeds. Played: a tester plays three years and retells one cross-year story unprompted |
| G3-4 | Phone fit, playtest export and replay, deploy `/watch/`, framework.md, api.md, README | The user plays; his words go in `watch-playtest-*.md` |

### G3-1 as built (2026-10-04)

At `/watch/`, linked from the landing page as an early prototype. Code: `apps/site/src/watch/` (rules in `sim/night.ts`, with a scope paragraph). No HF. Four wall sections are lanes, each with two posts: eight posts for three placeholder watchers with fixed aim and sight, who always obey. Wolves and thieves are tokens that walk to the foot of the wall, climb, and take sacks. Each sim minute resolves as seeded rolls.

- **Lantern.** It is the Keeper's position. Walking it costs five sim-minutes per section, and nothing is lit on the way. The lit lane shows kinds and throws; dark lanes show only moving grass and sounds at the foot of the wall. At a stretch nobody stands, the lantern alone slows a climb and turns some climbers back.
- **Scout.** He names the lead threat's approach. He is right about each wave three times in four, and about every wave on the first night.
- **Dusk.** Posting happens at 1/16 speed. The watch begins on a button or at nightfall.
- **Night.** It runs at Slow, Watch or Fast. A moment eases play to Slow for three sim-minutes; there are no modal pauses. The chronicle menu holds the clock.
- **Bell.** A placeholder: it rouses the whole wall for 15 minutes. Each pull frays the rope, drawn as strands, until it snaps; pulls while it still rings are refused.
- **No numbers in play.** Grain shows as sacks, the hour and rope wear as words.
- **Records.** Inputs are logged by sim minute. The chronicle menu copies the playtest export (seed, log, end state); `sim/run.test.ts` replays it to the same state, also under a different real-time tick schedule.

**Gate, headless** (`sim/gate.test.ts`). 24 seeds × 3 nights, with one plan at every dusk and no night inputs. The table shows mean sacks lost of 20:

| Plan | Lantern at Gate | Lantern at the plan's focus | Granary emptied (focus lantern) |
|---|---|---|---|
| Matched: two watchers where the scout said | 5.7 | 5.1 | 0/24 |
| Usual: the standing posts | 14.4 | 14.4 | 4/24 |
| Mismatched: two watchers at the far end | 16.4 | 17.9 | 15/24 |

The first night alone loses 0.5, 4.0 and 6.3 sacks. The matched plan beats the mismatched one on at least 18 of 24 seeds, and the test asserts this.

**Played (desktop 1280×800, phone 360×690).** A matched first night lost nothing. Standing posts against an east warning lost sacks at the empty east wall, and the dawn page said "Nobody stood the east wall."

**Review (game designer, Opus).** Accepted:
- The dawn page names an empty section and says where the scout was wrong.
- The Keeper's lantern counts at an empty stretch.
- No rope wear while the bell still rings.
- Repeated and stale ticker lines are dropped.
- Dark motion is easier to see.
- The phone hides the panel copy of the warning, since the map shows it.
- A clearer dawn heading.

Rejected for G3-1:
- A vaguer warning spanning two sections, to make posting a real split. It is a director question for G3-3; G3-2's people add choice of their own.
- A gentler first night. The first night is already one threat with an honest scout. Losing a third of the granary by ignoring him is what the gate asks for.

### G3-2 as built (2026-10-04)

Watchers are HF `Person`s run by `stepCommunity` (`sim/people.ts`, `sim/night.ts`); no game code went into `packages/human`; the framework change is L6 impressions, which draw no randomness and leave the engine version alone.

- **Cast.** Tamar, Kian and Mara stand the first night. Joss and Yunus come through the gate on night 2. Ruslan, the newcomer the Keeper doesn't know, comes on night 3. Arrivals, and anyone who turns away from an old grudge, show in the day summary.
- **Staying or leaving.** A posting is a suggestion with a duty appeal. At night a posted watcher is offered only their own post, so the choice is to stay or to leave: flee, go home to family, sleep, freeze, or doze where they stand (a 30-minute sleep on the wall). Sitting and eating on an exposed stretch carry the risky tag, so fear does not keep people idling on the wall.
- **Moments.** At most three cards a night, only on the lit stretch. A card opens as a watcher wavers from fear or tiredness, when one starts to leave (`catchLeaving`: let them go or call them back), when family is threatened (let go, send someone else, or ring), or when someone is downed. While a card is open, play runs at the dusk rate.
- **Bell.** A command on the watchers within earshot for 90 minutes. It costs trust and autonomy, and every pull wears the rope until it snaps. The dawn line scales with resentment, from "I heard the bell. I held." to "You rang me down like a dog."
- **Impressions.** The roster shows the Keeper's words for each watcher (HF `impressionOf`), drawn with how sure he is. Dusk reads by press (ask, urge, insist) use `predictAs` on the Keeper's imagined person, read the warned stretch as dangerous already, and carry their reason ("might (…)", "won't (…)"). A post someone else holds reads "might", not "won't".
- **Dawn.** Each watcher speaks one or two lines. What they say is also told to the Keeper (HF `hear`, weight 0.5). A fright on a stretch (shaken, bitten, downed, fled, ran, froze) is learned with `learnOutcome` as a bad `hold-post@<section>`, weighted as five stints so the night's ordinary stints don't average it away. It lasts into the next dusk and then fades (`sim/fear.test.ts`: 13 of 13 cases still feared at the next dusk; the Keeper reads 8 of 13 as "might" or "won't").
- **Export.** The compact export holds the seed, the input log, an end-state summary and a full hash; `sim/run.test.ts` replays it.

**Gates, headless.** 24 seeds × 3 nights. G3-1 (`sim/gate.test.ts`), now with people, mean sacks lost of 20:

| Plan | Lantern at Gate | Lantern at focus | Granary emptied (focus) |
|---|---|---|---|
| Matched | 12.1 | 7.3 | 0/24 |
| Usual | 16.5 | 16.5 | 9/24 |
| Mismatched | 18.3 | 19.3 | 17/24 |

G3-2 (`sim/gate2.test.ts`) approximates "a tester names one fear and one bond within three nights" by matching dawn lines against fear and bond phrasings: matched plan 24/24 seeds both, usual 19/24; cards 3.9–4.3 per run. This is a templated-text check, not a tester.

**Played (desktop 1280×800, phone 360×690, two nights each).** A tired Kian walked home before dawn and the card offered to call him back. On the phone the card overlays the top of the map.

**Review (game designer, Opus).** Accepted and done:
- Dozing no longer reads as fear.
- Fear lasts across nights.
- Reads show their reason.
- One dozing line a night at most.
- The bell has a dawn cost.
- Arrivals and grudges show in the day summary.
- The splice line no longer names a watcher.

Not done:
- Talks (spec §4) are deferred to G3-3.
- Mara and Joss sharing a night, and spreading cards across the cast, are left to tuning.
- Urge and insist share strength 0.6 by design: insist differs by HF's flag (compliance under protest, no trust earned).
- Day sleep is unchanged. Drowsiness by 02:00–04:00 comes from the framework's sleep-pressure calibration.

**Review (wildcard: a charge nurse, Sonnet, played on a phone).** Accepted:
- Say what ask, urge and insist do, and what the rope is.
- Hide ties to people who haven't arrived ("close to Joss" on night 1).

Found while acting on the reviews:
- A family card read the substitute against a post still held by the leaver.
- Walking home was read as fear of the place.

Rejected:
- Cards that hold until answered. Slowdown rather than pause is the game direction.
- Dawn advice ("put someone on the east wall"). The dawn page already says "Nobody stood the east wall."

Deferred: saving a night in progress (done in G3-4) and two small UI overlaps (still open; see [§12](#12-after-graduation-deferred-features)).

### G3-3 as built (2026-10-04)

This phase adds the year around the winter and play across generations.

Code:
- `sim/season.ts`: the year.
- `sim/director.ts`: winters from year 2.
- `sim/life.ts`: aging, courtship, births, leaving, newcomers.
- `sim/fair.ts`, `sim/volume.ts`, `sim/talk.ts`.
- `store.ts`: saves.
- New UI pages: `ui/pages.tsx`, `ui/chronicle.tsx`.

The only framework change is one opt-in cue kind. HF impressions now read `skill:<id>` keys with a half-life of a year. The Keeper learns someone's aim from their lit throws, and that read lasts across winters.

- **The year.**
  - Winter is the first 6–8 nights, played back to back from the first dusk. The rest of the winter passes by routine.
  - The thaw page follows the last dawn.
  - Spring, summer and autumn advance a day per step with HF `liveCommunity`, with natural death and chronic onsets on.
  - The harvest comes in mid-autumn and the fair two weeks later. The next winter opens at midnight of day 365.
- **Speeds.**
  - Five speeds: Slow, Watch, Fast, Days, Seasons. In the seasons they run a quarter of a day to seven days per second. At night they run 1 to 60 minutes per second.
  - A season opens at Days unless Seasons was chosen. The first dusk of a winter sets Watch.
  - A season card slows play to the slow pace. Nothing pauses. Opening the chronicle still stops the clock.
- **Director (from year 2).**
  - Each winter has a lead threat with a reason in words and a peak night.
  - On its second appearance a threat gets a twist: wolves learn the dark stretch, thieves have a man inside.
  - 35 % of winters give a two-section warning.
  - Some winters set a question: keep everyone alive, the first stand of someone born here, or the Gate.
  - Waves grow with the size of the watch.
  - A stretch of wall that was climbed all winter may come down in the thaw and stay closed for a year.
- **Grain.**
  - From night 4 of the first winter, a night carries off at most three sacks, plus one for every eight sacks above the starting twenty. The first three nights are the authored opening the G3-1 and G3-2 gates measure, and they take what they take.
  - Grain is lost only on played nights.
  - The thaw eats 0.4 sacks a head.
  - An empty granary does not end the winter. The dawn page still tells that night. At the thaw an empty granary means a hungry spring: the households most ready to leave go until the rest can be fed. This holds from the first year.
  - The village ends only when nobody aged fifteen or more is left.
  - Harvest is 14 sacks plus 1.5 per worker, scaled by the weather and the seed. The granary holds 45.
- **People over years.**
  - Courtship and marriage use HF `court`, `proposeOffer` and `familyVoices`. A proposal arrives as a season card: the Keeper may bless it, oppose it or leave it.
  - Births use `conceptionChance`, lowered when grain is short and when the village is above twenty-two people.
  - Above twenty-two, young couples from outside leave first, so the village's own families continue.
  - Below ten, refugees may come.
  - Households with low trust, low mood and a hard winter leave at the thaw.
  - Watchers stand from fifteen to sixty-seven. A wound can end someone's time on the wall for life.
- **The fair.** The Keeper takes up to two of three offers. Each is irreversible and paid in grain:
  - let in a burned-out family;
  - raise a third post on a stretch;
  - a heavier bell;
  - better seed;
  - name an heir to the Gate.
- **Volumes and leaves.**
  - There is one volume per generation, with a question that ends it: the Gate keeper's going, or a child of the village standing the wall.
  - A closed volume shows an epilogue page, not a game over. Each person in the epilogue speaks a line chosen by their life and mood, and no line repeats within one epilogue.
  - Blank leaves at the back fill in when their condition happens.
- **Talks (§4, minimal).**
  - Two talks a day at dawn: "tell me about last night" and a question about the body.
  - The Keeper hears what is said at a lower weight than what he sees.
  - A talk costs the watcher a little sleep.
- **Show, don't count.**
  - The frame gives the date, ages and fair costs in words, grain as sacks, and impressions drawn with how sure the Keeper is.
  - Winter pages warn in words when the granary runs low: "running low", then "nearly bare", then "empty".
  - Old watchers stoop and carry a stick. A limp shows.
- **Phone.**
  - The Begin button stays in reach under 600 px.
  - A tap picks the nearest post within a wider radius.
- **Saves.**
  - The worker keeps a page per season, and an autosave at each dawn and page, in IndexedDB. Pages are gzipped where the browser supports it.
  - Every storage call is wrapped. Without storage the game plays on and the shelf stays empty.
  - A page holds the seed, the input log and the whole state.
  - Resuming a page reaches the same end state as the unbroken run (`sim/years.test.ts`), and an export made after resuming still replays from the seed.

**Checks, headless.**
- `sim/years.test.ts`:
  - Three years on one seed: harvest, fair and winter lines, and annals.
  - The three-year export replays to the same full hash.
  - A snapshot taken halfway and resumed ends on the same hash.
  - Pacing in the seasons: Days on entering spring, whole days per step, the card slowdown, Watch at the next dusk.
  - With storage absent, the shelf comes back empty without throwing.
  - The first winter: on seeds 1–3, an unplanned winter reaches the thaw with a dawn for every night.
- `sim/years.timing.ts` (`npm run bench`) runs 50 years on seed 1 and fails on flat lines.
  - Run time: 326 s under Vitest on the dev machine, with other agents running.
  - Population: 177 people lived; 15 at the start, 24–31 later.
  - Life events: 21 births, 5 deaths, 11 marriages, 52 leavings, 51 arrivals; top generation 3; 7 volumes.
  - Grain: winter losses 6–28 sacks; harvests 25–61; granary at winter 20–40; 7 hungry springs.
  - Mean mood by decade: 0.32, 0.28, 0.35, 0.35, 0.32.
- Three seeds × 50 years, run in node before the first-winter change at about 2.5 minutes a seed:
  - All three reached year 51.
  - Living 10–31; hungry springs 7, 12 and 16; marriages 11–14; births 21–47.
  - Seeds 2 and 3 vary the granary at winter between 22 and 40 through the run.
  - Seed 1 sits at the granary's cap for about twenty years. That is a weak spot, recorded here, not fixed.
- The G3-1 and G3-2 gates still pass. They measure the first three nights, which are unchanged.

**Decisions.**
- Played nights run back to back from the first dusk.
- Failing a winter question costs only a chronicle line.
- Resettlement is cut: a village that falls ends its volume.
- "Three nights nobody comes" is not built.

**Review (wildcard: a phone player on 360×690, Sonnet).**
- *What they said:* the player lost the first winter twice, on nights 4 and 5, when the granary ran out. They got no dawn for the last night and no warning beforehand. "a village that scatters after four or five nights is too harsh for a first winter."
- *What mattered most to them:* dawn quotes that name a person and a place ("Joss got me off the wall. I owe him.").
- Accepted and done:
  - The first winter cannot end the village. The losing night gets its dawn.
  - Words warn of a low granary at dusk and dawn.
  - Begin stays in reach on a phone, and post taps have a wider hit area.
  - Epilogue lines no longer repeat.
- Deferred to G3-4: eleven phone and feedback items (repeated dawn lines, the shifting lantern row, the card over the scene, the chronicle menu, the stale watcher at a post, the blank map, the hidden speed bar, bell feedback, similar talk answers, tap-to-move, leftovers). All were done in G3-4.

**Review (game designer, Opus, 1280×800).** The reviewer played two years. Part of the play came before the first-winter change, so their run 1 fell on night 4.
- *Their verdict:* the second year produced the first real long-run story: a wall came down where it was climbed, a hungry spring, refugees, a birth, aging in words, bonds from shared nights.
- Accepted and done:
  - The Keeper's read of people no longer fades to "you don't know them yet" over the summer. Lasting cues hold and are marked "from last winter" (`sim/reads.ts`, tested in `sim/years.test.ts`).
  - A watcher who went home no longer says "I didn't blink till dawn".
  - Quiet, tired and "fine" lines vary by person. A hidden hurt shows as a tell ("They shift their weight off one leg").
  - "Bring every soul…" counts as done only if spring is fed. A hungry spring is not "It was done".
  - The thaw names the fears the winter left. Its empty line no longer says "Nothing changed for good".
  - Season labels no longer go from "Late autumn" back to "Early autumn".
  - A fallen stretch is drawn as a gap, and its lantern chip reads "· fallen" and is disabled.
  - The year-1 fall and warning (#5, #23) are covered by the first-winter change.
- Rejected:
  - The empty "Today" heading (#17): it is a collapsed list that has lines.
  - Hiding speeds by season (#15): the brief asks for speeds up to Seasons. Nights at Days and Seasons still raise cards.
- Deferred to G3-4: #3–#22. G3-4 did the heir, routine nights, the fair, the birth card, saves, winter questions, taglines and ranked talks. Still open: #7, #13 (more person cards), #16, #19 and #21 (sprites); see [§12](#12-after-graduation-deferred-features).

**Played (Claude Browser pane, 2026-10-04).**
- Desktop 1024×768:
  - The first winter of a new chronicle with no planning reached the thaw. The granary emptied on night 4, and each later dawn said "The granary is empty. The spring will be hungry."
  - The thaw page brought the west wall down, then came a hungry spring and refugees.
  - Spring and summer ran at Seasons.
  - A page reload in autumn was followed by Continue, which restored the fair.
  - I bought the bigger bell, left the fair, and autumn ran to the second winter's dusk.
  - At that dusk the reads showed "from last winter" and the west wall was drawn as a gap.
- Phone 360×690, the same chronicle:
  - The Begin button stays on screen.
  - The chronicle shelf listed the saved pages. Load on "the first year, summer" returned to early summer.
  - Seasons ran summer on to autumn.
  - The map was blank for a moment after the resize (deferred above).
- The spring page was missing from the shelf. The page reload happened during the run, and I did not establish the cause.

### G3-4 as built (2026-10-04)

The aim of this phase: Game 3 ready for the user's own playtest, on a Galaxy S26 and on desktop, over many years.

**Saves follow §6 (no rewind).** Decided:
- A chronicle has one running page (`<chronicle>:auto`). It is kept as you go: 1.5 s after an input, every 8 s while the clock runs, when the clock is held, when the tab is hidden or closed, and before a load or a new village. Reloading loses at most a few seconds.
- "Continue" is the only way back into a chronicle. There is no list of older pages to rewind to.
- Each closed or fallen volume is kept as a page on the shelf. "Take up again" on a closed volume starts a **new** chronicle from that page, so the original chronicle is never rewritten.
- Season pages (the last two) are backups only. The UI does not show them. If the running page cannot be read, the newest backup is used.
- The shelf keeps four chronicles. Volume pages of a kept chronicle are never pruned.
- Loading keeps the Pacer (one per worker, `adopt(run)`) and the clock hold. The current chronicle id reaches the UI with the shelf.
- Pages from an older build (the scenario version is now 6) are refused with a note that says so.

**Playtest export.**
- Where: the chronicle menu, the closed-volume page and the fallen page.
- How: copy to clipboard (the size is shown in KB) or save as a file named `night-watch-seed{seed}-year{year}.json`. A text box is the fallback when both are blocked.
- What: seed, input log, end state and hash.
- Sizes, seed 1:
  - Year 3: 432 inputs, 68 KB (8.9 KB gzipped).
  - Year 12: 2,506 inputs, 280 KB (25.6 KB gzipped).
  - For comparison, a save page is 2.5 MB at year 3 and 5.8 MB at year 12, 284 KB and 666 KB gzipped.
- Test (`saves.test.ts`, through the real IndexedDB store via fake-indexeddb):
  - Play to year 2 summer, save, load, resume, play on to year 4.
  - The log of the loaded run starts with the saved prefix. Its export replays to the same end hash.
  - Gzip round-trip, pruning and the backup fallback are tested too.

**Phone.**
- The night panel has a fixed height at ≤480 px, so the lantern and bell row no longer shifts.
- The moment card docks at the bottom (safe-area aware), and "…or let it be" closes it for that moment.
- The chronicle menu scrolls within the screen. Its Load buttons are at least 44 × 96 px.
- A watcher who left a post is drawn as a dashed empty ring with a faint name.
- The map paints on mount and resize, so it is not blank for a frame after a load.
- The speed bar shows in every phase after the goal, dimmed when idle. Days and Seasons are hinted in years 1–2.
- The bell rings visibly, and someone answers it in the ticker (by trust and fear).
- The lantern hint says you can tap the wall.
- `nightName` and `frame.night` are removed.
- Wake lock, fullscreen and safe areas were read in code, not checked on a device.
- Galaxy S26 (confirmed from spec sites): 1080×2340, DPR 3, CSS 360×780. Inferred, to be measured on a device: about 640–690 px tall with the browser's bars. Tested at 360×660 and 360×780.

**Long-run depth.**
- Talks: four topics, ranked per watcher by the Keeper's read (`topicsFor`), and the top two are offered:
  - the night;
  - the body;
  - home, which reveals the spouse tie and warms trust a little;
  - "Would you keep the Gate?", for watchers aged 17–39 while no heir is named.
- Winter questions are drawn from the cast's lives: the first winter on the wall, a last winter before retiring, a new parent, newlyweds; otherwise "every soul". The question is chosen from the candidates by seeded draw.
- Each thaw writes the routine nights ("The other 84 nights of winter went by routine…", who stood most, and a feared stretch that eased).
- Births come to the Keeper as a card: call on them, or send a sack. Winter births wait for the first open day.
- Mid-summer, the weakest young watcher asks to learn the sling from the surest arm. Allowed, they practise together, taught (HF `instructionFrom`), until winter. One lesson per young watcher.
- The heir: the fair offers two names, ranked by what they said at dawn and their sling. Naming one costs the other some trust.
- The fair previews each offer as the granary after it. The granary, not a count, is the limit.
- A wall that the thaw brought down can be rebuilt at the fair for 5 sacks.
- Taglines age with the person: trade, winters on the wall, "old on the wall", "keeps the Gate", "heir to the Gate".

**The granary at its cap.** Annals over 25 years:
- Seed 1 reaches winter with 39–40 sacks every year from year 10 on.
- Seed 2 reaches winter with 39–40 sacks from year 21 on.
- Hungry springs still happen at the cap (seed 1: years 17, 19, 20), because a winter now carries off 22–28 sacks.
- So the cap is not making the autumn meaningless the way G3-3 feared. This phase added sinks (rebuild, a granary-limited fair) and did not retune the cap.

**Wildcard review: a historian of medieval rural life (Sonnet, about 45 minutes, seed 23, two years into the third winter, 1280×800 and 360×660).**
- Kept, in the reviewer's words: Mara's "Joss keeps the fire in till I'm home" ("That is a person"), the heir line, and the fallen west wall.
- Also worked: reload mid-night then Continue (twice), and Copy the playtest (28 KB).
- Acted on:
  - **Dawn voices repeated verbatim** across nights and between speakers on one dawn. Each case now has three to eight phrasings. No line is said twice on one dawn, and a watcher avoids their own last dawn's words (`lastVoices`). Test: the first winter of seeds 1–3 has no duplicate on any dawn, and under 10 % of voices repeat the speaker's last dawn.
  - **Nobody aged in the taglines over three years.** Winters on the wall now count from the first winter. An incomer's "newcomer" or "fleeing a raid" gives way to "one winter here", then "one of ours now".
  - **Continuity: posted east, but spoke of the west wall.** A fear of another stretch is now said from where they stood ("From the east wall I kept looking over at the west wall").
  - **Births without lead-up.** A conception is now news ("X and Y are expecting a child."), and the child is born 200 days later (`expecting`). Test: every birth in three years was announced first. Courtship already writes "seen walking out together" and opens a proposal card. The reviewer's village had founders married from the start.
  - **The thaw read the same every year.** The routine-nights line changes by year. A hungry spring names who it showed on: the oldest grows thin, the youngest cries with hunger.
  - **A card vanished in seconds.** Season cards now stay six days, and the tactical pace is 0.15 days/s (was 0.25), so a card stays about 40 s.
  - **"Raise gate"** now reads "the wall by the Gate".
  - **"Lately written"** was a closed fold that looked empty; it now opens by default.
  - **Phone:** names under the wall are outlined, and on a narrow map neighbours' names stagger. "Begin the watch" sits in an opaque band, so cards scroll under it instead of showing around it.
- Deferred: the outsider family's story, head knocks, summer and autumn scenes, a taller phone map, deaths and leavings as cards; see [§12](#12-after-graduation-deferred-features).

**Designer review (Opus, rerun on f3f35f8, seed 11, about 35 minutes, mostly at 360×660, played passively; the first designer run stalled when the dev server dropped).**
- Kept, as the reviewer listed them:
  - The thaw's hunger line.
  - Joss's fire line.
  - The sling card's trade-off.
  - The heir card with two names.
  - The bell answer.
  - The docked card at 360 px.
  - Reload, then Continue.
  - Copy the playtest (33 KB).
- Acted on:
  - **Desertions without a cause.**
    - The ticker now says why someone leaves, from outward signs: white-faced, stumbling with tiredness, favouring a leg, going home to sleep, or having heard something near home.
    - Leaving while the bell holds them is said as "The bell rang for them, but …".
    - Their dawn words give a cause they will own to: fear, sleep, a leg, or the cold.
    - The night talk with someone who left starts from that, not "Long and cold".
  - **Reports against voices.**
    - Someone named as driving a threat off says so ("They came at the Gate. We sent them off."), not "Cold, and nothing else".
    - "The wall held" now needs nothing to have got over, not just an unchanged granary (`DawnPage.crossed`).
    - A watcher who went home to sleep says so.
    - No two watchers say the same words on one dawn. Bell lines now vary too.
  - **Moment cards.**
    - The family card no longer offers to send someone who has just left the wall. Only unposted villagers, then watchers on other stretches, are offered.
    - The leaving card says the act is under way ("is climbing down from the mill wall, heading for the hall"). Decided: this card catches the act itself, by design (G3-2), because the person's next decision may come too late to warn about.
    - "…or let it be" now reads "…or say nothing: they decide alone", distinct from "Let X go", which releases them from the post.
  - **One tap ended a chronicle.**
    - "Begin a new village…" now asks first and says the current chronicle stays on the shelf.
    - Other chronicles are named "The village of seed N", with year and season.
    - The title's Continue says which village and when.
  - **The ticker on phones.** At ≤480 px only the newest line shows. Lines now come from the current season only, so spring news no longer hangs over the fair.
- First-winter grain, scripted, seeds 1, 2, 3, 5, 7, 9, 11 and 23, no balance change:
  - The matched-plan Keeper reached the thaw with 2–10 sacks on seven seeds and with 0 on seed 11.
  - A Keeper who never plans emptied the granary by night 3–6 on every seed.
  - Passive play is meant to struggle in the first winter (G3-3: an empty granary is a hungry spring). Seed 11 is hard even with planning.
- Deferred: thirteen items. H2 did seed 11 and the named bell; the bell's set span (`BELL_COMMAND_MIN`) and wear per pull are in the code; the granary's need mark and third-post labels were done in the 2026-10-05 playtest fixes. The rest are open; see [§12](#12-after-graduation-deferred-features). A React duplicate-key warning for "joss" came from another dev server, not this build.

**Deferred, with targets.** H2 did seed 11's first winter, the named bell and bounded state. The G3-5 and "after Goal 2" items are now in see [§12](#12-after-graduation-deferred-features).

**Done for Game 3:** endless play live at /watch/ on desktop and phone, with a playtest export; L1–L6 released in HF 2.0 with tests; `npm run check` passes; the user accepts by playing.

### H2 as built (2026-10-04)

Game 3 moved to HF 2.0 with the release and took two of its G3-4 deferrals. Scenario version 7 (pages from scenario 6 are refused with the usual note).

**Seed 11's first winter.** On seed 11 both waves of opening nights 2 and 3 came at stretches the scout had not named, and the planning Keeper lost 17 of 20 sacks in two nights. Two changes, both limited to the authored opening (year 1, the first three nights):
- The scout is right about at least one wave a night (night 1 stays right about every wave).
- One night carries off at most half of what the granary held at dusk (`OPENING_CARRY_SHARE`); after the opening the usual cap of three sacks plus the rich-granary extra applies.

Scripted matched-plan Keeper, sacks left at the thaw, seeds 1, 2, 3, 5, 7, 9, 11, 23: 10, 6, 10, 9, 10, 3, 2, 7 (G3-4: 10, 6, 10, 9, 10, 2, 0, 7). Seed 11 now reaches the thaw with 2, a hungry spring rather than a lost one; the other seeds barely moved. The G3-1/G3-2 opening gates were not re-run.

**The bell rings for one named watcher** (spec §4). Of the watchers in earshot, it rings for the one the Keeper reads as least likely to hold: someone gone to the hall first, then "won't", "might", "can't tell", "grudgingly", "likely", a less certain read before a surer one. A second pull while the first still holds calls the next. The night panel shows whom it would ring for and how they would take it ("Ivo: holds, resents it"); the alert reads "The bell rings for Ivo: hold your post!". A pull with no one in earshot still wears the rope.

**Nights leave memories and children hear winter stories** (spec §3). At dawn, whoever stood a stretch where something got over remembers a bad night there; whoever drove a threat off remembers a night held (ordinary HF episodes placed at the stretch, so they fold into lasting gists and weigh on later postings there). At the thaw each child aged 4 to watch age hears their parents' and guardians' lasting gists of the wall (HF `retell`, scaled by trust), so a child fears the east wall before ever standing there, until their own nights outweigh the story.

**State growth bounded.** Every villager now keeps no decision trace and 40 days of day records (HF 2.0 `setRetention`; days older than that fold into the yearbook at once). Nothing in Game 3 read the trace. Measured on seed 1 (playYears, 50 years): per person 55.0 KB at year 1, 81.9 at year 12, 98.4 at year 25 and 111.6 at year 50 (G3-4: 110 KB at year 1 and 207 at year 12). A page is 0.84 / 1.97 / 2.71 / 1.49 MB raw and 125 / 314 / 419 / 228 KB gzipped, with 15 / 23 / 26 / 11 people. What still grows (about 0.5 KB a person a year) is the yearbook, one record a year. The same seeds with and without retention reach the same state apart from trace, day records and yearbook (seeds 1 and 2, 8 years).

**Faster checks (performance review P4, P7, P9; output unchanged, same hashes on seeds 1–3 at 1, 8 and 25 years).** Lookups of a person, of a household's children and of who is here use maps instead of scanning everyone who ever lived; `years.test.ts` plays its three years once (41 s → 24 s); the site bench runs on Node's own loader (`apps/site/bench-resolve.ts` points `@human/framework` at its source). The 50-year headless check: 258 s → 133 s, measured before the HF retention change.

### Playtest fixes as built (2026-10-05)

After the owner's playtest ([his words](watch-playtest-2026-10-05.md)), bugs and confusion were fixed with small changes; feature ideas went to §12. Scenario version stays 7: new state fields are optional and RNG draws are unchanged. Correction (2026-10-05, owner's exports): saves still load, but exports made on d48d8f6 no longer replay to their `fullHash`. The thaw lesson line and `pairings.from`/`told` (a177d72) and the per-climber alerts (d241b54) change state text, and the hash covers the whole state. Rules and RNG did not change: grain, people, postings and the RNG state match at every checkpoint. See §12 for the fix.

- **Choppy and freezing (Firefox).** Measured in headless Firefox Nightly on Apple Silicon. No long worker tasks were found. The "freeze" was the designed slowdown (tactical, then a card at 1/16) with nothing moving, then a snap back. Fixes: sprites tween between sim minutes at every speed; a slowdown eases back over 1.5 s; frames post only when something changed (1,766 → 408 frames in 90 s at Watch); villagers are cached per sim hour; the running save waits 30 s during a night; the frame step is clamped at 250 ms.
- **Seasons pace.** Spring opens at Seasons and runs on its own. It eases to Days for five days after news and to the tactical pace for a card. Winter and the seasons show the eased pace the same way, on the speed bar.
- **The bell's name** holds for 15 sim minutes unless that watcher drops out of reach or someone leaves for the hall. The pull sends the name shown.
- **Empty posts** carry one word under the name: afraid, asleep, went home, hurt, refused, not yet or moved when seen or told; otherwise only where they are now. A ring widens for half an hour. The night panel says that posts are set at dusk.
- **Threats** are drawn climbing the wall face and going into the village, a thief with or without a sack. Each one over the lit stretch is told with what it took, including "away with nothing".
- **Upgrades on the map:** a raised stretch has a timber walk and three spread posts; the bell hangs by the Gate, bigger once bought; better seed shows as fuller rows.
- **Understanding.** The granary marks what the village eats from the thaw to the harvest. "Twelve souls in five homes" appears, and the map has one hut per household plus recent ruins. Arrivals open the dusk's "Today", and the first dusk says more hands will come.
- **Delayed feedback.** The thaw after a blessed sling lesson compares the pupil's arm with the day it was blessed.

## 11. Risks and cuts

| Risk | Mitigation |
|---|---|
| A dead equilibrium | Permanent losses, growth costs, decade-swing gate |
| Years feel the same | Generated winters, twists, life-stage questions |
| Saves bloat | L1 bounded state; season snapshots plus log |
| Mixed fidelity breaks determinism | Switch only at dawn; byte-equal resume tested |
| UI eats the schedule | Abstract lanes; tap-only input; §9 guardrail |
| Faith becomes a mechanic | Prayer, weddings, funerals are quiet events; no card, score or slowdown reads them |

**Cut first, in order:** summer events; resettlement (a fallen village just ends its volume); blank leaves; the bigger bell; *mend things*.

## Review notes (round 2)

Three reviews of the endless-play draft, 2026-10-04.

**(a) Adversarial systemic designer (Opus).** *Top:* the long run settles into a dead equilibrium. **Accepted:** permanent non-death losses and growth costs; decade-swing gate; ~15-minute years with routine nights summarized; decade decisions at autumn; preview through the impression, L6 made core and kept in HF; queued cards, 1/16× while open, sim-time windows, sim-minute input log, no night posting; season snapshots plus log; permanent chronicle game-side; L3 kin prohibition and director-supplied partners; fidelity switch at dawn only; abstract lane night with no fire spread; Yunus without a card. **Rejected:** merging G3-1 into G3-2 (G3-1 stays, abstract and small, because its gate tests planning before people); talks made scarce by sleeping watchers is kept, but children's stone-gathering competing with chores and oil competing at the fair are dropped for (c)'s fewer components.

**(b) Player advocate (Opus, owner's quotes only).** *Top:* no stated goal and nothing that can really go wrong. **Accepted:** stopped-clock goal page; gentle night 1 (one wall, two watchers); each winter's question as a failable goal with a visible cost; 6–8-night winters with routine nights as dawn lines; staleness only for what changed, "last seen at harvest"; watch-age roster; generations as volumes with inherited stakes; tap-only posting with suggest/urge/insist in words; prices in words; a setting for which moments slow play; replay jumps cut. **Rejected:** none.

**(c) Wildcard: legacy board-game designer (Fable).** *Top:* a volume needs an end that is not failure. **Accepted:** volumes with a named question and end; blank leaves with printed conditions; irreversible map changes; the lantern as the Keeper's position, so unlit wavers raise no card; wrong reads cost; no truth toggle in play (export only); three managed limits, stones and oil ambient; the thaw page as cleanup; the fair as drafting. **Rejected:** none.

## 12. After graduation: deferred features

The owner graduated Game 3 at the 2026-10-05 playtest. This is the one list of deferred game work; earlier sections point here. Targets:
- **T1:** the first pass if Game 3 is picked up again.
- **T2:** needs a framework (HF) release first.
- **T3:** polish, whenever convenient.

Review this list by 2026-11-05; the owner decides which T1 items to schedule and which to drop.

**From the owner's playtest (2026-10-05).**
- T1, **more to do in winter and the other seasons.** "we just need to nourish it with more things to do, and variety". Night tools beyond the lantern, the bell and cards, and season actions beyond answering cards.
- T1, **investigating events.** For example, why someone left despite an urge. A follow-up the Keeper can open from the ticker or the dawn: asking, looking, asking others.
- T1, **more and pricier upgrades.** "I've been buying all possible improvements". A deeper fair with costly, lasting works.
- T1, **granary protections.** "when will we have better protections at the granary?" Locks, a watch on the store, a second store.
- T1, **delayed feedback on other decisions.** Only the sling lesson reports back today. Heir, urge or insist, the fair and the family card should get later lines too.
- T1, **re-posting at night.** Moving someone from another wall. Posts are set at dusk by design (§4); this would be a costly night action, not free re-posting.
- T2, **feeling connected to a larger cast, and repetition.** "I got more people now but I'm less connected to everyone, and it's starting to feel repetitive." Fewer, deeper focal people a year; varied event families.
- T3, **graphics and moving parts.** "representative graphics and actually moving parts". Within §9's guardrail unless the owner lifts it.
- T3, **performance on a real phone.** Occasional 50–100 ms frame gaps remain at 360 px and DPR 3 in headless Firefox. Not measured on a device or with a CPU throttle.

**From the owner's exported run (2026-10-05, seed 20261004, years 1 to 4).** Bugs found there are fixed (findings.md, same date); these remain.
- T1, **exports name their build.** Game 3's playtest export carries no build commit, unlike Games 1–2, so a replay must guess which commit made it.
- T1, **the export hash covers rules, not wording.** Hash the state without chronicle text and alerts, or bump the scenario on any change to state text. Today a wording change breaks every older export's replay.
- T1, **separate RNG streams** (for example, director spawns drawn per night from their own stream). One input more or less reshuffles every later spawn: dropping one of his 272 inputs moved the grain lost from 28 to between 28 and 51 sacks, so a single run reads as random to the player.
- T1, **expecting mothers on the wall.** Sena was posted at the Gate while expecting. The spec is silent; decide whether that is allowed or whether she should be offered as off-duty.
- T3, **routine openers and winter goals repeat.** Thaw routine-line openers cycle every four years (repeats from year 5); the goal "Bring every soul and the granary to the thaw" came back in years 2 and 4.
- T3, **fair picks per year are unbounded** while grain lasts (four picks in his year 1). Decide whether that is intended.
- T3, **a press tap re-sends `post`** for a watcher already posted (App.tsx, the press handler), so the log has same-minute duplicates. Harmless; dedupe if the log is tidied.
- T3, **`talks.asked` is never pruned** (26 entries by year 4). It only feeds a score bonus.

**Carried from G3-2 to G3-4 and H2.**
- T1, **posting pressure once families are admitted** (#19).
- T1, **talk topics that change behaviour directly**: rest tonight, practise with, mend.
- T1, **more than one person card per off-season** (#13), and deaths and leavings as cards.
- T1, **collapse quiet watchers into one dawn line** (#7).
- T2, **talks with children and in the open seasons.**
- T3, **sprites that age** (#21): stoop, grey hair.
- T3, **summer and autumn scenes**: sowing, haying, a harvest-home evening.
- T3, **the outsider family's story**: it repeats the refugees'.
- T3, **whether a head knock matters** after the next day.
- T3, **a newcomer's posting read**: it says "likely" where the spec says "you can't tell".
- T3, **the volume question** stays after the heir is named.
- T3, **the fair's "good share" wording** against small costs.
- T3, **child roster wording** (#16).
- T3, **a per-page scenario version**, so the shelf marks old pages before you tap them.
- T3, **two chronicles of the same seed** read alike on the shelf.
- T3, **retuning the granary cap** if a playtester finds autumns flat.
- T3, **phone layout**: the header truncates; the map is short (about 110 px at 360×660 at night); the dusk panel grows long on the first two nights.
- T3, **desktop layout**: empty space at 1280×800.
- T3, **small overlaps**: postures sit a few pixels apart at small sizes, and the Keeper's sprite can overlap names.

**Carried from the H2 reviews** ([summary](../reviews/2026-10-04-h2-summary.md); targeted "G3-5" there).
- T1, **saves**: P8, the save cadence while the clock runs (night saves now wait 30 s; seasons still save every 8 s), and S7, storage that stops saving silently.
- T2, **Q50**: the game writes framework slices directly. Add the two HF gaps first (an additive trust gesture, host-caused tiredness), then move the game.
- T3, **Q49**: pregnancy through HF `conceive`/`deliver`. This changes every run (gestation 268 days, not 200), so it needs a scenario bump.
- T3, **Q51**: households leave by a game formula, not through `decide` over leave and stay offers.
- T3, **P10**: the yearbook grows by one record a person a year and is never shown. Either show it or drop it.
