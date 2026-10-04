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

**Done for Game 3:** endless play live at /watch/ on desktop and phone, with a playtest export; L1–L6 released in HF 2.0 with tests; `npm run check` passes; the user accepts by playing.

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
