# Game 3 — _The Night Watch_

**Current cast and opening.** The six canonical watchers are Tamar, Kian, Samira, Idris, Danyal and Meryem. Tamar, Kian and Samira arrive on night 1; Idris and Danyal on night 2; Meryem on night 3. The two-person opening in §2 and the Mara/Joss/Ruslan/Yunus table in §8 record the earlier design. Their names remain historical evidence.

The central site was verified on 2026-10-26 at signed `00dcdad`, with published HF 3.2.0 / engine 3.2.0, library 3.2.0 and `dirty:false`. It includes lab-client 0.4.11 and lab-kit 0.5.12. See the [site receipt](../releases.md#central-site-32-delivery-2026-10-26) and live [release.json](https://human.adamwhite.work/release.json). External-game adoption and player acceptance need separate receipts.

Approved 2026-10-04; revised for endless play.

Owner's brief: a known, deceptively small genre "within which player connects with each character and develops them". On approval he added: "potentially infinite play (until the characters die of natural causes? I dunno). We could see longer time effects of our framework. Though it should have more UI than just text, and showcase some stuff happening, yet similarly deeply integrate the human framework". AGENTS.md "Game direction" applies (approximate, subjective readouts; show rather than count; tactical slowdown, not pauses; continuous speed; limits from capabilities; saves and menus in the fiction), as does "Games keep faith gentle". Numbers marked _assumed_ are unmeasured.

## 1. Promise and fit

**Promise:** you keep the watch of a small walled village, winter after winter. Every tower on the wall is a person who can say no, learn courage, break, marry, grow old, and hand the Gate to a grandchild.

**Why tower defense.** TD is placement plus attrition, readable in seconds. HF replaces a tower's three properties: it stands where put (the will), improves only by upgrade (skills), and ignores its neighbours (social). The night's decisions are about people: _Mara is wavering, her house is on the east side; do I let her go?_ Years add the decisions only time can ask: _who takes the Gate when Tamar's knees go?_

**The player is the Keeper:** the office that writes the village chronicle, carries the lantern and rings the bell. It outlives any one person, so the same voice carries across generations. Villagers hold trust in the Keeper like any voice (HF `trust`); children learn it from their parents' stories.

**The story it should produce** (player-advocate review): "My old Gate keeper hid her bad knees for two winters. When she died, her apprentice's daughter took the Gate and refused the east wall, because of a story her father told her." A system that does not serve a story across years is cut first.

## 2. Time

**One continuous clock.** Speeds: 1/16× (card open), ¼× (tactical), 1× (a night of 12 sim-hours in about 3 real minutes), 3×, _Days_ (a day in about 10 s) and _Seasons_ (a week in about 10 s). Only the chronicle (the menu) stops the clock.

**Tactical slowdown.** A moment (§4) eases play to ¼×; while its card is open, 1/16×. Moments queue and show one card at a time. The decision window is counted in sim time (about 2 sim-minutes, _assumed_), and inputs are logged by sim-minute, so replays are deterministic. Doing nothing is always legal: the person decides alone. A flyleaf setting chooses which moments slow play. _Days_ and _Seasons_ drop to 1× when something person-changing begins (a fight, a birth, a quarrel at the well).

**The year, about 15 minutes at default** (_assumed_):

| Season                    | What happens                                                                                                       | Default                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| **Winter: the Watch**     | 6–8 nights, one sharp peak. Nights where no moment fires run on standing posts and appear only as dawn-page lines. | 1× nights with moments; routine nights summarized |
| **Spring: the thaw**      | The thaw page (§3); repairs, weddings, births, who leaves.                                                         | _Days_                                            |
| **Summer**                | Fields, practice, building; some years an event (a house fire, a sick well).                                       | _Seasons_                                         |
| **Autumn: the reckoning** | Harvest fills the granary; the fair; 2–3 decade decisions (§4); who comes of age (15); next winter's tracks.       | _Days_                                            |

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

**The opening.** The chronicle opens with the clock stopped on a page that states the goal: _bring every soul and the granary to the thaw._ Night 1 is one wall section, two watchers (Tamar and Kian) and one wolf pack. The cast arrives over the first nights (Joss and Mara, then Yunus, then Ruslan with the thieves).

**Dusk: posting.** A scout line telegraphs the night ("pack tracks by the west wall"). There are always more posts than people. Tap a portrait, tap a post; a card offers _suggest_, _urge_ or _insist_ in words, with the person's likely answer **seen through the Keeper's impression** (L6): a well-known watcher reads "likely" or "won't: next to Joss"; a newcomer reads "you can't tell"; a hidden trait can make the preview wrong. The dawn page shows what actually happened, so the player checks their reads. Posts stay as standing suggestions. Posting is closed at night.

**Night: watching.** The night is abstract. Each wall section is a lane; enemies are tokens that advance along it; each sim-minute resolves as rolls from skill × capacity. No projectiles, no pathing, no fire spread. The Keeper's night actions are the lantern, the bell and moment cards:

- **The lantern is the Keeper's position.** It lights one section: enemies there are seen and hit earlier, and the Keeper sees the people there. A waver on an unlit section raises no card: the player sees only a figure moving in the dark.
- **The bell** hangs over the Gate; its rope runs along the wall-walk, so the Keeper pulls it from wherever the lantern is. A pull is heard by everyone in range, loudest at the Gate and fainter each stretch away (the hall by the Gate fully; a house only near the Gate, where it wakes the sleepers). Everyone who hears it is roused (a doze ends, and nobody nods off for a while) and called back to their post, more strongly the louder they heard it; with no posting, it calls them to any post, so the village can turn out. The call is an HF suggestion, weighed by trust, so its cost is small and spread over those who would rather do otherwise. Calling one watcher by name over the bell (a card's choice) is the strong form, an HF `command`, and needs the Keeper's own voice to reach them (his stretch and the next). It costs that watcher autonomy and trust and raises their break hazard, scaled by how much they wanted otherwise; the card says so in words ("Joss will resent this"). A pull with nothing out there is a false alarm, and the next call is weaker ("Again?"). No charges: overuse is limited by false alarms, by what a named call does to people, and by the rope, which frays visibly and must be mended by someone's day.

| Moment (lit section only) | Trigger                                                         | Cards                                                       |
| ------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| Waver                     | `hold-post` within the close-call margin of `flee` or `go-home` | let go · urge hold · bell                                   |
| Family                    | a threat percept targets a watcher's home                       | let her go · send someone else (their post empties) · bell  |
| Downed                    | a watcher is down in the open                                   | name a carrier (preview through the impression) · leave her |

At most three moments a night (_assumed_). Yunus may step off for Fajr near dawn: shown as a figure leaving, with no card and no slowdown.

**Day: talking.** The dawn page gives one line per watcher in their voice and a why for each refusal or departure. Talks cost the Keeper's daylight (about an hour each) and the person's sleep after a night on the wall, so influence trades against their rest. A talk is also how the Keeper learns: _tell me about last night_ (cue recall), _how is the knee?_ Topics are ranked by the person's inclination: _rest_ · _practise with Tamar_ · _mend things with Joss_ · _take the Gate tonight_ (a promise) · _teach Kian's daughter the sling_.

**Autumn: decade decisions.** The fair is the drafting phase: 2–3 choices that cannot be undone and draw on the same grain and labour. Admit the outsider family or keep the grain; extend the wall (a new post, more posts than people); buy a bigger bell (the rope lasts longer, the bell carries further) or seed grain; name the Gate heir (pride and trust move on both sides).

**The thaw page** closes each year: the chronicle writes what changed permanently (who left, who died, who married, what burned) and shows it before spring begins.

## 5. Show, don't count

**Three managed limits:** **grain** (sacks drawn in the granary: harvest, theft, the fair), **the Keeper's time** (daylight and one place at a time; lantern position at night), and **the bell rope** (fraying, mended by someone's day; a bigger bell from the fair). Stones and lamp oil are ambient: children gather stones and oil comes with the harvest; a dwindling pile or a guttering flame shows a bad year, but the player does not manage them. Stamina and the size of the watch are people, read through them.

**Show.** Sprites slump, then sit, as fatigue rises; a bandage and a limp; a torch gutters; a dog barks before a threat is lit; voices in short bubbles ("not the east wall again"); grey hair and a stick. No HP, fatigue or ammo numbers in play.

**Subjective readouts.** A card shows the Keeper's impression, not true state: phrases with a confidence ("afraid of the east wall, _you think_") and soft bars whose width is uncertainty. It sharpens with nights watched under the lantern, talks, and what others say. Only what has actually changed goes stale, shown as "last seen at harvest" rather than a blur. The roster shows people of watch age. Hidden traits are a gap the Keeper can learn: Tamar's words say "fine", her limp says otherwise. A wrong read costs: post Tamar on "fine" and she cannot climb the stair, and the Gate stands empty. There is no truth toggle in play; HF's terms appear only in the playtest export.

## 6. Saves and menus in the fiction

- **The chronicle is the menu.** Opening it stops the clock. Each volume is a book on a shelf (the save slots); pages are the record; the flyleaf holds settings (speeds, which moments slow play, text size). No rewind within a volume.
- **Storage:** a full snapshot at each season boundary plus the sim-minute input log since, compressed in IndexedDB; loading restores the season snapshot and replays the log. No server. The permanent chronicle text is game data; HF's own chronicle stays capped.
- **Playtest export:** "copy this volume" writes seed, input log and state JSON (with HF terms); a replay test pins that it reaches the same state.
- **Upgrades:** pages carry the engine version; HF `migrate` upgrades old volumes.

## 7. Framework and game

**HF faculties shown, as built (1.6.0):** `decide`/`predict` and verdicts; insist, trust, pressure; standing suggestions; `command`; breaks; capacities, `tend`, downed; outsiders and threat percepts; `practise`; `learnOutcome` (courage); `appraise`; `socialEvent`, `judge`, `converse`; cue recall; promises; bereavement; lifecourse, chronic illness, `mortalityEvent`; `createChild`; snapshot, `migrate`; `skip`.

**New for HF 2.0** (general, no Night Watch names; each with tests, a headless control scenario and a scope paragraph):

| #   | Deliverable                   | Scope                                                                                                                                                                                                                                              | Test sentence                                                                                                                        |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| L1  | **Experience over years**     | Episodes past a horizon consolidate into a few lasting, valenced gists that keep recall, fear and retelling alive; skills age (slower learning, rust); state stays bounded.                                                                        | A fear learned at 20 still shapes choices at 40 after its episodes are gone; a 50-year snapshot stays under a stated size.           |
| L2  | **Upbringing and heredity**   | Per-skill aptitudes, loosely inherited; childhood exposure to household habits and values; parents' gists and voice trust passed by conversation.                                                                                                  | A child of fearful parents believes a place riskier before going there; a child's trust in a voice starts from household stories.    |
| L3  | **Attraction and partnering** | Attraction from familiarity, shared events and trait fit; slow courtship; a proposal resolved by a host-supplied custom (consent, age); kin prohibition; household formation. PG.                                                                  | Two people with many good shared events partner under a custom requiring family consent; a forbidding custom or kinship prevents it. |
| L4  | **Ambient context**           | A host `ambient` input on `tick` (cold, dark, crowding, comfort) feeding mood, sleep and fatigue.                                                                                                                                                  | Cold dark nights lower mood and raise fatigue; a warm hall restores them.                                                            |
| L5  | **Long-run community driver** | Mixed fidelity: full stepping, or a coarse community `skip` with social events summarized. The switch happens only at dawn, by host request; coming of age and life transitions are events; a budget.                                              | 25 people run 50 years headless, deterministically, within the bench budget; resume from a season snapshot plus log is byte-equal.   |
| L6  | **Impressions**               | One person's estimate of another's state and likely answer, with uncertainty, from familiarity and observations; hidden pain and pride bias it. The Keeper's readout and the preview use the same function as villagers' judgements of each other. | An estimate narrows with shared time and errs where the target hides pain.                                                           |

**Game-side only:** lanes, tokens and rolls; the seasons calendar and threat director; grain, the fair and decade decisions; the bell's reach, loudness and rope; marriage customs and coming-of-age age as host data; the break catalog; talk ranking; the permanent chronicle and storage. HF sees only affordances (`hold-post@gate`, `flee`, `go-home`, `carry@mara`, `court@kian`), outcomes, percepts, ambient input and what the Keeper observed.

## 8. Cast, year 1

| Watcher               | Strength      | Flaw                                    | Long arc                                             | Ties                                           |
| --------------------- | ------------- | --------------------------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| **Tamar**, 54         | Sling, steady | Pride: under-reports pain               | Hands the Gate on, or wears herself out              | Kian's mentor; grudge with Ruslan              |
| **Kian**, 16          | Fast, eager   | Takes the risky post; freezes once hurt | Courage, or turns from the wall; may raise a watcher | Sister by the west wall                        |
| **Mara**, 34          | Best sight    | Home on the east edge                   | Trusts the wall enough to stay                       | Married to Joss; two children                  |
| **Joss**, 38, smith   | Strength      | Anger; resents Ruslan over a debt       | Puts the grudge down, or passes it to his son        | Mends the bell rope                            |
| **Ruslan**, 45        | Spear         | Newcomer; high emotionality, bad sleep  | Becomes one of them, or leaves at thaw               | Suspected over missing grain (never confirmed) |
| **Yunus**, 61, miller | Calm          | Frail, poor sight                       | Likely the first natural death                       | Prays; texture only                            |

## 9. UI scope

React 19 shell; Canvas 2D; simulation in a Web Worker; React renders snapshots. A village map with lanes along the wall, simple sprites and shapes (stand, walk, throw, slump, sit, down), light as radial gradients, weather as a tint. No WebGL, no engine, no projectiles, no pathing. Lucide icons. Phone portrait (research real viewports such as the Galaxy S26 first): map top, roster strip, cards as a bottom sheet with tap-only input and 44 px targets; fullscreen and wake lock at night. **Guardrail:** UI work stays under a third of G3 effort; anything beyond sprite frames, gradients and tweened positions is cut.

## 10. Build plan

| Phase | Work                                                                                                                                                                            | Playtest gate                                                                                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G3-1  | Abstract lane night without HF (obedient tokens): lanes, rolls, grain, scout line, lantern, dusk posting, continuous clock with speeds and slowdown. Small by design.           | Against a telegraphed threat, testers post differently and a bad plan visibly loses sacks                                                                                                                             |
| G3-2  | People on HF: verdicts, impressions (L6) on cards and previews, bell (`command`), breaks, injuries and downed, outsiders, moments, dawn page, talks, sprites; the year-1 winter | A fresh tester names one watcher's fear and one bond, unprompted, within three nights                                                                                                                                 |
| G3-3  | L1–L5 in HF; seasons, director, decade decisions, permanent losses, volumes, blank leaves, fall and resettlement, season snapshots                                              | Headless: 3 seeds × 50 years; population and mood must swing by decade (flat lines fail) and years 10 and 20 must differ across seeds. Played: a tester plays three years and retells one cross-year story unprompted |
| G3-4  | Phone fit, playtest export and replay, deploy `/watch/`, framework.md, api.md, README                                                                                           | The user plays; his words go in `watch-playtest-*.md`                                                                                                                                                                 |

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

| Plan                                       | Lantern at Gate | Lantern at the plan's focus | Granary emptied (focus lantern) |
| ------------------------------------------ | --------------- | --------------------------- | ------------------------------- |
| Matched: two watchers where the scout said | 5.7             | 5.1                         | 0/24                            |
| Usual: the standing posts                  | 14.4            | 14.4                        | 4/24                            |
| Mismatched: two watchers at the far end    | 16.4            | 17.9                        | 15/24                           |

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
- **Export.** The compact export holds the seed, the input log, an end-state summary and a full hash; `sim/run.test.ts` replays it. (2026-10-05: it also names its build and carries a rule-state hash; see Export provenance and hash policy.)

**Gates, headless.** 24 seeds × 3 nights. G3-1 (`sim/gate.test.ts`), now with people, mean sacks lost of 20:

| Plan       | Lantern at Gate | Lantern at focus | Granary emptied (focus) |
| ---------- | --------------- | ---------------- | ----------------------- |
| Matched    | 12.1            | 7.3              | 0/24                    |
| Usual      | 16.5            | 16.5             | 9/24                    |
| Mismatched | 18.3            | 19.3             | 17/24                   |

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
- _What they said:_ the player lost the first winter twice, on nights 4 and 5, when the granary ran out. They got no dawn for the last night and no warning beforehand. "a village that scatters after four or five nights is too harsh for a first winter."
- _What mattered most to them:_ dawn quotes that name a person and a place ("Joss got me off the wall. I owe him.").
- Accepted and done:
  - The first winter cannot end the village. The losing night gets its dawn.
  - Words warn of a low granary at dusk and dawn.
  - Begin stays in reach on a phone, and post taps have a wider hit area.
  - Epilogue lines no longer repeat.
- Deferred to G3-4: eleven phone and feedback items (repeated dawn lines, the shifting lantern row, the card over the scene, the chronicle menu, the stale watcher at a post, the blank map, the hidden speed bar, bell feedback, similar talk answers, tap-to-move, leftovers). All were done in G3-4.

**Review (game designer, Opus, 1280×800).** The reviewer played two years. Part of the play came before the first-winter change, so their run 1 fell on night 4.
- _Their verdict:_ the second year produced the first real long-run story: a wall came down where it was climbed, a hungry spring, refugees, a birth, aging in words, bonds from shared nights.
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

**Saves follow §6, with explicit local recovery added 2026-10-24.** Decided:
- A chronicle has one running page (`<chronicle>:auto`). It is kept as you go: 1.5 s after an input, every 8 s while the clock runs, when the clock is held, when the tab is hidden or closed, and before a load or a new village. Reloading loses at most a few seconds.
- "Continue" opens the running page. An explicit season-backup recovery can replace later local progress with an earlier saved page; it keeps that page’s exact accepted cast receipts and makes no new claim.
- Each closed or fallen volume is kept as a page on the shelf. "Take up again" on a closed volume starts a **new** chronicle from that page, so the original chronicle is never rewritten.
- Season pages (the last two) remain backups. The Shelf offers explicit recovery only when the actual local snapshot contains the exact owned initial claims for that chapter. Files cannot grant ownership or qualify for this recovery. If the running page cannot be read, the newest backup is used.
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

**Faster checks (performance review P4, P7, P9; output unchanged, same hashes on seeds 1–3 at 1, 8 and 25 years).** Lookups of a person, of a household's children and of who is here use maps instead of scanning everyone who ever lived; `years.test.ts` plays its three years once (41 s → 24 s); the site bench runs on Node's own loader (`apps/site/bench-resolve.ts` points `@adam0white/human-framework` at its source). The 50-year headless check: 258 s → 133 s, measured before the HF retention change.

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

### The bell from the Gate as built (2026-10-05)

The owner asked: "if it stays at the gate how do we ring it when we're watching another wall with a lantern at hand? Are we carrying it? Does using it only keeps the named person more attentive and holding? Shouldn't it affect most of people hearing it?" ([playtest](watch-playtest-2026-10-05.md)). Answer, after a game-design review (approve with changes): the bell stays at the Gate and is heard by everyone in range; naming someone is a separate, stronger act. Scenario version 8; pages saved under 7 still load (see below).

- **Where it is.** The bell hangs over the Gate (bigger once bought, "hung on a wheel"); its rope runs the length of the wall-walk, drawn as a dashed line, so the Keeper pulls it from any stretch. The lantern does not move it.
- **Who hears it.** Loudness 1 at the Gate, 0.8 one stretch away, 0.6 two away (`BELL_FALLOFF` 0.2; the bigger bell 0.1, so 0.9 and 0.8). The hall by the Gate hears it fully; someone out in the village hears it as on the wall above their house; at home half of that, and only if it reaches the wake threshold (`BELL_WAKE` 0.35), so the small bell wakes the houses under the Gate (0.5), the west wall and the mill wall (0.4) and not the east wall (0.3); the bigger bell wakes them all. Away from the village, nothing.
- **What it does to each hearer.** A heard percept that interrupts them. A sleeper is woken: the game ends the doze or sleep as interrupted, because an HF interrupt only brings the review forward and a sleeper's review keeps the sleep (docs/findings.md). For `BELL_ROUSE_BASE + BELL_ROUSE_LOUD × L` minutes (10 + 25L) the doze is not on offer. For `BELL_CALL_MIN` (45) the Keeper's posting is said louder: strength `max(press, (0.35 + 0.5L) / (1 + 0.5 × false alarms))`; a hearer with no posting is called to any post (`hold-post`). The call is a suggestion, so HF prices declining it as usual.
- **Calling a name.** A card's bell choice reads "Ring and call Ivo by name". It is the old command (`BELL_COMMAND_MIN`, 90 minutes) and needs the Keeper's voice to reach them: a post on his stretch or the next, or the hall when the Gate is in reach. The bell button no longer names anyone; the owner's log, which sends `{k: 'bell', who}`, still applies.
- **Swinging.** For 5 minutes after a pull (`BELL_SWING_MIN`) the button reads "The bell is still swinging" and a plain pull is refused; a name can still be called over it, with no new pull and no wear.
- **False alarms.** A pull with no threat seen or at the foot within `BELL_CRY_MIN` (30) minutes adds one false alarm; pulling again does not restart that clock, and a pull still unanswered at dawn counts. Each night forgives half. The ticker answers "“Again?” Ivo calls."; at dawn one voice may say "“You rang us up for shadows.”"
- **Words.** The alert says where it carried ("The bell rings out from the Gate; the east wall hears it faintly."), whom it woke under the lantern, and who answers there, or "No answer from the mill wall." Leaving while called is said as "The bell rang, but …", or "You called them by name, but …". Dawn has woken lines ("The bell had me out of my bed."). The night panel's line under the button says where it carries.
- **Measured.** Seeds 100–129, night 1, one pull when someone first nods off at a post: awake watcher-minutes on posts in the next hour rose in 30 of 30 seeds, 4184 → 5175 (+24%). Night-1 grain lost moved in 2 of 30 seeds. The bell does not lower fatigue: HF has no acute-arousal faculty, so a woken watcher is as tired as before.
- **Turning out.** A hearer with no posting is called to any post. In year 1 almost everyone is posted: unposting three watchers at dusk on seeds 100–119 left 3 villagers off the wall at 23:00, 2 heard a pull, and both were on posts within 20 minutes (none without the pull). In later years, with more people than posts, this is how the bell calls the village out; it was not measured there.
- **Review (adversarial, 2026-10-05): approve with changes.** Fixed: a pull every few minutes never counted as a false alarm (each pull restarted the clock), and a pull in the last half hour before dawn never counted; a named call on the pull that snaps the rope was not said. Kept: the bell knows whether a threat was out there even when the Keeper does not (a false alarm is judged on the true state; the player learns of it only by the weaker answers); naming someone stays on the cards.
- **Old pages.** `migrateSnapshot` loads a scenario-7 page by shape only (the bell's state starts empty) and stamps it with `origin {scenario: 7, minute}`. Its saves keep the stamp; its export carries it, and `replay` refuses such an export, because the minutes before the stamp were played under the old rules.

### World streams as built (2026-10-05)

§12 T1, separate RNG streams. One input more or less used to reshuffle every later threat, because the director, the scout, the spawns and the weather drew from the same stream as combat and the rope. Scenario version 8 (with the bell).

- **What has its own stream.** The night's plan (lead, the scout's words, waves, strays), the winter (its length, lead, peak and question), the harvest weather, the fair's offers, the thaw's collapse and the refugees. Each is drawn from `s.world`, reseeded before use from the seed, the purpose, the year and (for a night) the winter night (`worldRng`), so nothing the Keeper does moves the draws themselves. A token's pace is a hash of the seed, the token and the minute (`hashUnit`).
- **What stays on the shared stream (`s.rng`), and why.** Combat (hits, bites, strikes, the Keeper scared off), the rope's wear, births, courting, households leaving, newcomers' names and ages. How many of these are drawn follows from what the Keeper and the people do, so they cannot be made independent of play without losing their meaning. People's own decisions were already per person: every HF person rolls from their own `rng` (sfc32), so no change there.
- **What still moves the plans.** The director reads the village by design: wave sizes grow with the watch and a rich granary, the winter's lead follows grain and how thin the wall is, and the "dark" twist sends wolves to the least-posted stretch. So from year 2 a run that has diverged meets different plans, for reasons the chronicle can name.
- **Measured on the owner's log** (seed 20261004, 272 inputs, replayed tolerantly to the end of year 4; variants: as played, urge turned to ask, no bell, no talks, no input, first bell dropped, first lantern dropped). Same rules (the bell from the Gate), before and after:
  - Dusk plans identical to the played run's: before, 1–4 of 22 nights for every variant that changed something (the first difference on night 2–5 of year 1); after, every year-1 night for every variant, and 16–22 of 22 overall except no input (6 of 22, its winters differ from year 2).
  - Grain lost over four years: before 43–64 (45, 45, 43, 64; one dropped bell 51; as played 46). After 52–56 (as played 54, urge→ask 56, no bell 53, no talks 55, no input 52, dropped bell 54, dropped lantern 54). For context, the owner's own run on d48d8f6 lost 28, and dropping one input there gave 28–51.
  - Living at the end: before 15–19, after 13–17.
  - Caveat: the log was made under scenario 7, so only 182–212 of its inputs still apply in these replays; "as played" is not his game, and that no input lost the fewest is a finding about this seed under a partial log, not a verdict on his play (docs/findings.md).
- **The G3-1 gate moved.** Seeds and plans as before; mean sacks lost over three nights, before → after: matched 11.33 → 11.54 (lantern 5.92 → 4.79), usual 14.71 → 15.33, mismatched 16.13 → 15.67 (lantern 16.79 → 16.92). A wrong plan without the lantern now loses only 0.33 more than the usual one (1.42 before): every plan meets the same threats, and the usual posting already loses 17–18 of 20 on half the seeds. The gate's no-lantern margin is 0.2 (was 0.5), with the reason in `gate.test.ts`.

### Export provenance and hash policy (2026-10-05)

§12 T1, exports name their build, and the hash covers rules, not wording.

- **Provenance.** The export now carries `build` (the deployed commit from `/release.json`, stamped by the page when the player copies or saves it, `'dev'` otherwise) and `framework` (the HF package version), the same mechanism Games 1 and 2 use (`shared/playtest.ts`, `fetchBuild`). A page resumed from a scenario-7 save also carries `origin` (see The bell from the Gate as built).
- **Hash policy: hash the rule state, not the words.** Chosen over bumping the scenario on every text change, because a text-only change is common (the 2026-10-05 fixes changed four kinds of state text in a day) and a bump would refuse every earlier export and page each time. The export's end state has two hashes:
  - `ruleHash`, FNV-1a of `ruleState`: the clock and phase; the shared and world RNG streams; grain and the year's grain; the winter's plan without its words (nights, lead, twist, peak, the question's kind, people and whether it was met); the night's plan (lead, warned stretches, waves, spawns) and the threats; postings, presses, places, who was let go and carried; the lantern, the rope and the bell; commands and asks by target and end; the people (id, home, usual post, status, limp, parents), the marks, the Gate keeper, the heir and who is willing; pairings by who, with whom and until when; expecting mothers and newborns; the night history; moments by kind, person, minute and choice; every person's summary (needs, health, injuries, capacities, fear, stress, break, downed, trust in the Keeper, ties) and the Keeper's impressions. A replay of the same scenario must match it on any build.
  - `fullHash`, FNV-1a of the whole state with every word: advisory, equal only on the build that made the export. A mismatch with an equal `ruleHash` means the wording changed and the rules did not.
  - Left out of the rule state: the chronicle, alerts, the dawn and day pages, the scout's words, night notes, last voices, the season card and the fair's offers (their texts), talks, volumes and leaves, and `slowUntil` (pacing).
  - Rule: a change that moves `ruleHash` for the same seed and log is a rule change and bumps the scenario version; a change that moves only `fullHash` does not. A field added to state that rules read must be added to `ruleState`. `run.test.ts` pins that wording, alerts, the scout's line, pacing and pairing flags leave `ruleHash` alone and that grain, either stream and the rope move it.

### 2026-10-19 level-up

Owner, 2026-10-19: bring the earlier games to the latest HF and apply what the other games taught. **Save version: none changed.** Every change is words or pacing, so scenario 9 stands, every scenario 9 export still replays, and the owner's scenario 7 fixture replays tolerantly as before. A scenario 9 export pinned today (`apps/site/test/fixtures/watch-scenario9-2026-10-19.json`, harness policy, seed 1, two years) must replay to its `ruleHash`, so a later rule change has to bump the scenario.

**Tools.** Both run from the repository root with Node 24 and need no build.
- `apps/site/scripts/play-watch.ts` is a text harness over the game's own sim. It prints what the page shows: sacks, rope strands and pips as glyphs, and reads in words. It never prints needs, trust or dice. The run lives in a state file passed by `--state`. `help` lists the commands, and `export` writes the page's playtest export.
- `apps/site/scripts/hf-watch-adapter.ts` and `hf-watch-session.ts` let the playtester's HF personas play the Keeper through that harness.

**Audit, played through the harness before any change** (seeds 7 and 11, year 1, plus an auto-policy year):
- The first choice that matters (the first card) came about 47 real seconds after Begin. The first dusk already asks where the warned stretch is held.
- **Refusals were not said in the moment.** A refused posting printed "X won't take the post you gave" with no reason, and only under the lantern. A leaving in the dark showed one word on the empty post, and the reason waited for dawn. This was the owner's first ask.
- **The seasons were a dead stretch.** In seed 7, Tamar (the founder, the Gate keeper, the volume's subject) died in late autumn of year 1. At Seasons pace her death passed in about 2.5 real seconds of a "news" ease, so a player waiting through the autumn never saw it.
- **Delayed feedback** existed only for the sling lesson.
- **Hints:** "Urge X to hold" and "Call X back" carried no read, though the bell option beside them did.
- **Bland lines:** under the lantern, a doze, a bell answered, a waking or a prayer fell back to "Joss at the mill wall."

**Built.**
1. **Refusals said as they happen, with the watcher's reason** (`night.ts`, `refusalLine`, `ownReason`).
   - A refused posting, a "not yet" or another post is a slowing ticker line in the watcher's own voice. Example: "Mara says the east wall will have to wait. 'The cold's in my bones. Find someone else.'"
   - The reason comes from `selfReport`, so a proud or reserved person may blame the cold for fear. That is the existing design for dawn voices, now said in the moment.
2. **A leaving in the dark is called along the wall by a neighbour** (`neighbourCall`). Example: "Tamar calls from the Gate: 'Kian's gone home to bed.'"
   - The neighbour adds what they saw (white as milk, half asleep, limping), so the reading has a source.
   - With nobody else on the stretch there is no call: the post just stands empty. This gives a reason to watch the ticker, not only to wait for dawn.
3. **Every option that asks something of a person shows a read.** "Urge X to hold" and "Call X back to the wall" now carry the Keeper's read of an urged posting (`readPosting`, a pure read), as the bell option and the substitute already did.
4. **Plain ticker lines** for every act seen under the lantern: nods off, jerks awake, answers the bell, starts at every sound, keeps close to a friend, stands a while with head bowed, is bitten, goes down, is carried off. Prayer stays a quiet posture with no named faith.
5. **Delayed feedback on decisions** (part of §12 T1):
   - On the dawn after a posting was urged or insisted, the watcher answers it: "You pressed me for the east wall. I held it." or "I know you pressed me." Insisting on someone who values their say is remembered bitterly.
   - At the first thaw after a fair, the chronicle says what came of a raised or rebuilt wall (climbed how often this winter) and of a named heir (how many routine nights they stood the Gate). An heir who never stood the Gate gets "The Gate is learned on the Gate."
6. **Grave news slows the seasons** (`pace.ts`, `GRAVE_DAYS`). A death or a household leaving eases the open seasons to the slowest pace for two sim days, about 13 real seconds, and the header says "the days slow: a death in the village". The harness's `wait` stops there too.

**HF 2.4–2.8 features considered, not adopted.** Each would move decisions and need a scenario bump.
- **Fatigue store (2.6):** standing a post costs effort 0.15–0.2, below the store's 0.3 floor, and watchers sleep by day, so the store would barely move. The night's tiredness is already HF sleep pressure (negative finding).
- **`forecastAt`/`followedBy` (2.5/2.8):** a posting is one leg with no declared follow-on.
- **`reconsider` (2.8):** a re-ask at night is already a card plus `interruptPerson`.
- **Promptings and muhasaba (2.4/2.7):** not used. Dawn voices already serve as the evening's reflection, and the faith rule keeps the game away from them.

**HF playtester personas** (`node apps/site/scripts/hf-watch-session.ts seeds=2`, after the change):

| persona       | seed | ended | min | reached       | engagement | longest lull |
| ------------- | ---- | ----- | --- | ------------- | ---------- | ------------ |
| commuter      | 1    | quit  | 4   | year 1, night | 0.80       | 0 s          |
| commuter      | 2    | quit  | 3   | year 1, night | 0.81       | 0 s          |
| unwinder      | 1    | quit  | 20  | year 2, night | 0.85       | 0 s          |
| unwinder      | 2    | quit  | 14  | year 2, night | 0.85       | 0 s          |
| completionist | 1    | quit  | 16  | year 2, night | 0.86       | 0 s          |
| completionist | 2    | quit  | 14  | year 2, night | 0.87       | 0 s          |
| restless      | 1    | quit  | 12  | year 2, night | 0.74       | 3 s at dusk  |
| restless      | 2    | quit  | 12  | year 2, night | 0.76       | 0 s          |

How to read it:
- No persona got bored. Every one quit on distress (HF `distress:rest`) during a winter night, after wolves over the wall and watchers going home.
- The table before the change was the same within a minute. That is expected: this pass changed words and pacing, and the adapter weighs losses, not reasons.
- Signal for the next pass: a wolf in the store feels like a loss with nothing to do about it. That points at §12 T1 granary protections and night tools, not at more words.

## 11. Risks and cuts

| Risk                              | Mitigation                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| A dead equilibrium                | Permanent losses, growth costs, decade-swing gate                                  |
| Years feel the same               | Generated winters, twists, life-stage questions                                    |
| Saves bloat                       | L1 bounded state; season snapshots plus log                                        |
| Mixed fidelity breaks determinism | Switch only at dawn; byte-equal resume tested                                      |
| UI eats the schedule              | Abstract lanes; tap-only input; §9 guardrail                                       |
| Faith becomes a mechanic          | Prayer, weddings, funerals are quiet events; no card, score or slowdown reads them |

**Cut first, in order:** summer events; resettlement (a fallen village just ends its volume); blank leaves; the bigger bell; _mend things_.

## Review notes (round 2)

Three reviews of the endless-play draft, 2026-10-04.

**(a) Adversarial systemic designer (Opus).** _Top:_ the long run settles into a dead equilibrium. **Accepted:** permanent non-death losses and growth costs; decade-swing gate; ~15-minute years with routine nights summarized; decade decisions at autumn; preview through the impression, L6 made core and kept in HF; queued cards, 1/16× while open, sim-time windows, sim-minute input log, no night posting; season snapshots plus log; permanent chronicle game-side; L3 kin prohibition and director-supplied partners; fidelity switch at dawn only; abstract lane night with no fire spread; Yunus without a card. **Rejected:** merging G3-1 into G3-2 (G3-1 stays, abstract and small, because its gate tests planning before people); talks made scarce by sleeping watchers is kept, but children's stone-gathering competing with chores and oil competing at the fair are dropped for (c)'s fewer components.

**(b) Player advocate (Opus, owner's quotes only).** _Top:_ no stated goal and nothing that can really go wrong. **Accepted:** stopped-clock goal page; gentle night 1 (one wall, two watchers); each winter's question as a failable goal with a visible cost; 6–8-night winters with routine nights as dawn lines; staleness only for what changed, "last seen at harvest"; watch-age roster; generations as volumes with inherited stakes; tap-only posting with suggest/urge/insist in words; prices in words; a setting for which moments slow play; replay jumps cut. **Rejected:** none.

**(c) Wildcard: legacy board-game designer (Fable).** _Top:_ a volume needs an end that is not failure. **Accepted:** volumes with a named question and end; blank leaves with printed conditions; irreversible map changes; the lantern as the Keeper's position, so unlit wavers raise no card; wrong reads cost; no truth toggle in play (export only); three managed limits, stones and oil ambient; the thaw page as cleanup; the fair as drafting. **Rejected:** none.

## 12. After graduation: deferred features

The owner graduated Game 3 at the 2026-10-05 playtest. This is the one list of deferred game work; earlier sections point here. Targets:
- **T1:** the first pass if Game 3 is picked up again.
- **T2:** needs a framework (HF) release first.
- **T3:** polish, whenever convenient.

Review this list by 2026-11-05; the owner decides which T1 items to schedule and which to drop.

**Round 2 retest (2026-10-20).**
- Target **2026-11-03**, **a brief spoken warning at night.** Callum: “tapping him does not produce a direct warning.” No general spoken-warning input exists. The named bell rings, wears the rope and presses a hold command; relabelling it would conceal those costs. Accounts are read-only in this round. A warning needs a separately justified edition and exact legacy replay controls.

**Round 3 retest (2026-10-20, [README](../lab/reviews/watchwell-2026-10-20b/README.md)).** No tester missed the night requests; none chose Milder winter or asked for an easier game.
- Target **2026-11-03**, **say what a cover or call-back order did** (F-359, F-362). Sam: “I would rather stop than spend another night guessing what my orders mean.”
- Target **2026-11-03**, **the relief and help sheets slow the clock like a watcher's decision** (F-361). Sam: “I want to make an order after reading it; I do not want to race the menu.”
- Target **2026-11-05**, **a during-fight call** (F-360), a candidate only: the Keeper still does not fight. Sam: “I wanted to run the defence during the fight.”

**Owner taste direction (2026-10-20).** "Don't become bland and objective neutral just to satisfy everyone. It's okay to have slight controversies, for example on difficulty." The 2026-10-20c night acts keep the pressure: each is an ask the watcher may refuse, the reliever's stretch thins or empties, nothing happens beyond the Keeper's voice, and no difficulty value changed. Done **2026-10-20**, **an opt-in easier watch** in scenario 12: Milder winter gives later packs and earlier movement warnings, chosen on the flyleaf and recorded in the export. Hard winter remains the default. See [the design change](#design-change-2026-10-20d-owner-may-veto). Fresh human acceptance is targeted for **2026-11-03**.

**From the owner's playtest (2026-10-05).**
- T1, **more to do in winter and the other seasons.** "we just need to nourish it with more things to do, and variety". Night tools beyond the lantern, the bell and cards, and season actions beyond answering cards.
- T1, **investigating events.** For example, why someone left despite an urge. A follow-up the Keeper can open from the ticker or the dawn: asking, looking, asking others.
- T1, **more and pricier upgrades.** "I've been buying all possible improvements". A deeper fair with costly, lasting works.
- T1, **granary protections.** "when will we have better protections at the granary?" Locks, a watch on the store, a second store.
- Done in part 2026-10-19, **delayed feedback on other decisions** ([level-up](#2026-10-19-level-up)): urge and insist are answered at the next dawn, and a raised or rebuilt wall and a named heir are reported at the first thaw. Still T1: the fair's other picks, the family card, and heir feedback beyond routine Gate nights.
- Done 2026-10-19, **refusals and leavings explained in the moment** (the owner's first ask): said as they happen in the watcher's voice, or called along the wall by a neighbour ([level-up](#2026-10-19-level-up)).
- T1, **re-posting at night.** Moving someone from another wall. Posts are set at dusk by design (§4); this would be a costly night action, not free re-posting.
- Unscheduled, **sticky posts are a design decision, kept as a deferred discussion.** The owner: "Yeah sticky posts is a design decision, don't reopen those just because I complain about it, keeping as a deferred discussion is fine." Post behaviour stays as built (standing postings, set at dusk, people who hold their own spot). Reopen only when the owner raises it as a decision, not on a complaint.
- T3, **thieves as humans.** The owner: "Probably defer, but it would be interesting to model the thieves as humans, too." Today a thief is a token with hit points, a speed and a climb (`THREATS` in `config.ts`). What it would take:
  - Each band's thieves become HF `Person`s from outside the village, stepped only while they are near the wall, with a need (hunger: a failed harvest down the valley is already the director's reason for thieves), fear (of the lit stretch, of slings that hit, of a watcher they have seen) and deterrence (a turned-back thief remembers the stretch and the lantern; the director reads those memories when it plans the next band).
  - The lane rolls stay; the token's choices (come on, wait, climb, turn back) become the person's decisions over game affordances, which makes the night more costly to step. Budget it against the phone frame time first (§12 T3, performance).
  - Outsiders who might become villagers: a thief caught, fed or let go could come back at the thaw as a newcomer (the outsiders and newcomer paths in `fair.ts` and `life.ts` already make people), carrying the night in memory and the village's trust or grudge.
  - Needs: no HF release (the person, memory, fear and decisions exist), but a scenario bump, and a designer pass on what the Keeper sees of a thief in the dark (still only motion).
- T2, **feeling connected to a larger cast, and repetition.** "I got more people now but I'm less connected to everyone, and it's starting to feel repetitive." Fewer, deeper focal people a year; varied event families.
- T3, **graphics and moving parts.** "representative graphics and actually moving parts". Within §9's guardrail unless the owner lifts it.
- T3, **performance on a real phone.** Occasional 50–100 ms frame gaps remain at 360 px and DPR 3 in headless Firefox. Not measured on a device or with a CPU throttle.

**Found 2026-10-06.**
- Done 2026-10-07, **almost nobody dies over fifty years.** `npm run bench` (`watch/sim/years.timing.ts`, seed 1) had 195 villagers ever lived and 0 deaths on bdd1c43 (1 at a371afd and 29c7b09). Traced: the death path works (a ×200 hazard gave chronicled deaths; person clocks never lag the game's), and winter was not the gap (the routine winter days after the played nights go through `liveDays` with mortality; only the 6–8 played nights do not). Two causes. (1) HF's age hazard is a modern, uncalibrated baseline (0.0005 a year at 30, doubling every 8 years), and the village stays young: one or two people over 55 in most years, because crowded couples under 35 leave and arrivals are young. The living's summed hazard was 0.016–0.16 a year, about two expected deaths in fifty years, so 0 or 1 is the expected draw. (2) The two oldest, alone, left by the household-leaving rule at 69 and 79. Fix (scenario 9): natural death runs at `MORTALITY_MULTIPLIER` 4 times HF's hazard (a pre-modern village; `config.ts`), and a household whose adults are all past `RETIRE_AGE` no longer leaves (`householdPulls`, test in `years.test.ts`). After: seed 1 has 187 ever lived, 8 deaths, 4 generations and 49 leavings (before 195, 0, 3 and 53), and the bench passes; seeds 2 and 3 (probe, same policy) 8 and 5 deaths, all at 45–81. The multiplier is a tuning choice, not a sourced rate. Open: the played winter nights still roll no natural death (about 2% of the year); deaths from 15 to 59 all read "a sickness that would not lift".

**From the owner's exported run (2026-10-05, seed 20261004, years 1 to 4).** Bugs found there are fixed (findings.md, same date); these remain.
- Done 2026-10-05, **exports name their build** and **the export hash covers rules, not wording**: see [Export provenance and hash policy](#export-provenance-and-hash-policy-2026-10-05).
- Done 2026-10-05, **separate RNG streams**: see [World streams as built](#world-streams-as-built-2026-10-05).
- T1, **expecting mothers on the wall.** Sena was posted at the Gate while expecting. The spec is silent; decide whether that is allowed or whether she should be offered as off-duty.
- T3, **routine openers and winter goals repeat.** Thaw routine-line openers cycle every four years (repeats from year 5); the goal "Bring every soul and the granary to the thaw" came back in years 2 and 4.
- T3, **fair picks per year are unbounded** while grain lasts (four picks in his year 1). Decide whether that is intended.
- T3, **a press tap re-sends `post`** for a watcher already posted (App.tsx, the press handler), so the log has same-minute duplicates. Harmless; dedupe if the log is tidied.
- T3, **`talks.asked` is never pruned** (26 entries by year 4). It only feeds a score bonus.

**From the polish playtests (2026-10-19)** ([record](watch-playtest-2026-10-19.md)). Three testers who had not read the source, plus HF personas. Only the harness fixes were made before the owner's soft stop; everything below targets **2026-11-05** (review with this list). Ranked by fun per effort, text that contradicts state first (believing the people is the game's strongest feature).
- **Text that contradicts state:**
  - The thaw says the goal "It was done" while households leave that same thaw. Name the leavings beside it.
  - A dawn says wolves "tore into the store" or "carried sacks off", then "(No sacks lost)" when the store was bare.
  - "Everyone is on the wall" shows while watchers are missing from the map.
  - Joss is drawn under Mara's name on the map (winter 3, seed 11).
  - Two people give the same dawn line word for word ("I left the east wall. I was frozen through.", neither posted there).
  - One dawn quote contradicts itself ("I ran." then "I stayed because Yunus stayed.").
  - The thaw says "For 83 nights nothing came" beside the level-up line "still climbed 14 times". The level-up's count includes routine nights; count played nights only, or say so.
  - "Nine souls in five homes" counts an empty hut.
  - Joss says he had a stone in the sling; Tamar has the sling.
  - A card says "Yunus looks back at the steps" while he dozes.
  - The marriage card says "walking out a long while" for someone who arrived that spring.
  - "Nobody stood the east wall" when the posted watcher went home mid-night; say "nobody held".
  - Refusal reasons read like a template ("Not now. After I sit down at the post." while already sitting).
- **Closing loops:**
  - Inge's marriage card came back five times after both answers. An answered card must close (a rules change: scenario bump).
  - The Kian/Tamar sling matter repeats every year word for word when ignored. Close it, or word the return as "asks again".
  - A night card left alone resolves silently. Say what the person decided.
  - After "call back", show the outcome (a refusal appeared only later, on the map).
- **Visible state:**
  - Show fatigue at dusk in show-don't-count words (tired, rested) on the roster, so rotation is predictable.
  - Vary the dawn excuses, and make dawn talks change something visible.
  - Give a per-stretch outcome at dawn (which stretch lost sacks, who held it) instead of "The wall was crossed" every time.
  - Show the granary mark on the fair page.
- **First night:** a short in-fiction explanation of a figure, the granary mark, a post's two slots and the rope fraying, with progressive disclosure.
- **Honest hints and controls (check in the UI, not only the harness):**
  - "Call him back" put Ruslan on the mill wall, not the east wall he left.
  - "Urge … likely" read as a probability and did not hold. Calibrate the word, or soften it.
  - `post X off` leaves the watcher free to go up on their own. Say so ("no post: may go up on their own"), or make it a told-to-rest suggestion (a rules change).
  - "Call back" is offered when its own read says it will fail.
  - Insist's read looks the same as Ask's. Show what insisting changes.
  - The harness refuses a `begin` (the watch had already begun) or a talk (cap or repeat) without a reason; give one.
  - `show` sometimes prints nothing; dusk at Seasons pace needs `wait!`.
- **Already deferred, raised again:**
  - A night decision or threat per wall (the fan's "real tower-defence decisions"; T1 "more to do").
  - Stakes once the granary is empty (nights with nothing to lose).
  - A paid "for good" raised wall falling at the next thaw without warning.
  - The skip to "the other N nights" triggers inconsistently.
  - The bigger bell still snaps after about 7 pulls.

**Carried from G3-2 to G3-4 and H2.**
- T1, **posting pressure once families are admitted** (#19).
- T1, **talk topics that change behaviour directly**: rest tonight, practise with, mend.
- T1, **more than one person card per off-season** (#13), and deaths and leavings as cards. In part 2026-10-19: grave news now slows the open seasons for two days so it is seen; cards with choices remain.
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

## Consistency fixes (2026-10-19)

Scenario 10 holds a proposal between the same pair for one year after it opens or settles. It prevents the daily courtship hook from answering a second proposal while the first card is still open. This is a host pacing rule; HF still decides whether to propose and how to answer. The optional `proposalHolds` record is saved and included in the rule hash. Scenario 9 exports still replay under their original proposal rules. Older saved pages retain their rules when the record is absent and keep their origin stamp.

At the thaw, the displayed souls question includes households who left after its saved flag was settled. The chronicle uses the same display result. The stored historical flag is retained for exact legacy continuation. A breach on a night with no grain lost no longer claims sacks were stolen. `show` keeps an open chronicle visible in the text harness.

- Map-name report (2026-10-19): no mismatch in the three retained exports' final frames; investigate the reported earlier Mara/Joss frame during replay by 2026-10-20. No speculative rename was applied.

## Design change 2026-10-20b (owner may veto)

The phone uses lab kit 0.2.0's stage with the existing night palette. A wrapping strip keeps the night, hour, scout warning and selected watcher's role, post and impressions above the scene. Choosing a watcher replaces the roster with one posting sheet. Back returns to that watcher. Ask, Urge and Insist show the current choice's full reading; the post buttons stay in the commit row. Begin has its own row outside the roster scroller. The night explanation fits above the lantern and bell. A timed moment uses the sheet body and reveals itself when it arrives; optional watch details return after the moment. Reading pages keep their advance button in the commit row. Game menu replaces the panel and restores its origin. At enlarged text sizes the page scrolls as a document. Short canvas scenes reserve room for names below the wall.

Sofia (F-250): “Let me see the watcher pressure choices and their essential reasons without scrolling under the fixed start button on this phone.” The owner-directed phone audit also found the dusk header ellipsised, Tamar's role lost during posting, and the lantern/voice explanation below the night panel. This layout serves DL-22..25 and DL-30..31. It preserves the accepted game: Adam's 2026-10-05 words, “this is already a game, and an interesting one nonetheless,” remain the boundary. No new action, rule, pacing change or framework upgrade is part of this change.

Cost: a shorter scene while posting, one pressure reading at a time, and optional bell/roster context behind “Watchers and bell.” The scene keeps the same posts and pointer geometry. Long rosters, talks, fair offers and save shelves still scroll; their offscreen targets are phone-audit exceptions, not hidden explanations. F-250's separate acknowledgment and message-history requests remain outside this layout increment. DL-32/33 are unchanged: the lantern and bell remain direct night acts. Nine five-minute headless cases found no rule-level gap with both unavailable, before or after; that measures legal inputs, not whether a player finds each act meaningful.

Verification: real Chromium renders at 360×690 and 1280×800, plus 320 px and 200% text; DOM/focus, short-camera and existing replay/save tests. Nine captured pre-change exports and midpoint saves replay/continue to identical full-state hashes. No edition or save migration. Evidence and audit exceptions: `scratch/patterns/watch-report.md` in the coordinating repository; screenshots under `/Users/abdul/code/.lab-scratch/patterns/watch-shots/`.

Revert this increment's commit (the Watch UI, SheetActions, camera layout/test and this section). No simulation file, framework pin or lab-kit source changes are needed.


**Round 2.** Callum's fresh retest asked, “Put the morning conversations and their sleep cost in view before the large 'On to dusk' control draws me away,” and “Give me a readable grain condition alongside the wall and when I order someone.” His report is `scratch/patterns/retest/watch.md` in the coordinating repository (no ledger id assigned there yet); F-250 remains the earlier phone-pressure evidence above. The persistent winter strip now gives coarse grain against spring food needs, progress through the played watches and the remaining routine winter to the thaw, and the known souls still here (not a claim that all are unhurt). Dawn puts talks and their sleep cost first; continuation follows every talk and account in the scrolling page, with no fixed dawn footer. Scene placement sends the existing default Ask; Urge and Insist remain sheet controls. A night tap selects the drawn watcher, including shared posts and hall/home figures, and opens a short current account. A conscious watcher within voice reach speaks from their own activity and existing local danger read; distant, sleeping and downed people do not produce invented replies. This serves DL-2, DL-13, DL-22, DL-24, DL-30, DL-31 and DL-33. No simulation, input vocabulary, speed or edition changed.

Round-2 cost: the goal strip takes more scene space; the optional pressure explanation can need a scroll, and later dawn accounts follow the conversations. During a timed moment the rope's drawing yields to its unchanged written condition so every decision option fits. Accounts keep the clock running and yield to a newly arriving decision; an inspection can reopen while it is pending. The warning is deferred above rather than added as a rule. DL-32's nine five-minute policies still have a **0-second longest gap in legal lantern/bell availability**, before and after; this is not a claim of meaningful acts every twenty seconds or a fresh player's willingness to return. Original saved exports and midpoint saves retain identical full-state replay/continuation hashes. Round-2 evidence: `scratch/patterns/watch-report.md`, section “Round 2”; real preview renders and phone-audit JSON under `watch-shots/after-b/` and `watch-shots/lab-phone-b/`, with `-b` screenshot suffixes.

Revert round 2: revert its single commit on `pt-watch2` (view/account projection and test, App, MapCanvas, words/progress test, map/hit tests, clarity tests, CSS and these round-2 notes). Keep round 1 at `bf9d176`; no saved run, framework pin or lab-kit source needs migration.

## Design change 2026-10-20c (owner may veto)

Night accounts now offer in-person asks to relieve a tired watcher, help a hurt watcher, or ask them down to sleep or to the hall. Each is one tap, with the Keeper's impression and the cost of leaving another post. Both people must be within voice: the lit stretch and its neighbour. A distant act stays visible with a reason and where to carry the light. HF decides; acceptance and refusal speak in the person's voice. Relief takes over before the outgoing watcher is asked to sleep. A downed watcher needs the existing carry ask, including its existing tending. There is no new healing rule. Accounts report tiredness and injury through the existing self-report, so reserve can hide either. The clock keeps running; bite alerts retain their three-minute slowdown.

This reverses 2026-10-20b's “the lantern and bell remain direct night acts” and “No new action, rule” boundary, and §4's “Posting is closed at night” for relief only. Dusk posting stays the plan. These night acts are asks within the Keeper's voice. At dusk, “Off the wall” becomes “Choose own post”: it removes the assignment and permits choosing an open post. It does not grant the night off. The explanation points to asking for rest at night.

Callum (F-305): “Yunus was just bitten, but tapping him only gives the same keeping-watch line and I cannot find a way to help or move another guard in.” Sam (F-309): “I want to rotate the tired people before they fall asleep, and tapping Tamar only gives me the same nothing-close line.” Sam's second free session: “I wanted her to rest.” Sources: [Callum](../lab/reviews/calibration-2026-10-20/a1-watch-20.md), [Sam](../lab/reviews/calibration-2026-10-20/e-free1.md), [dusk rest](../lab/reviews/calibration-2026-10-20/e-free2.md).

Cost and risk: more ways to repair a bad dusk plan may reduce the weight of posting. Sending relief still leaves the reliever's old post empty. A watcher can refuse, and relief does not guarantee the outgoing watcher will sleep. Fresh-player retests for F-305/F-309 and posting weight remain targeted for 2026-11-03.

Scenario 11 versions the new `relieve`, `help` and `down` inputs. Scenarios 9 and 10 reject them and retain their original rules. The optional request record enters the rule hash only when present. Existing moment kinds, IDs, cap and answer choices are unchanged. The scenario-9 fixture remains `05460984`; a captured scenario-10 run remains `1c799a04`; its midpoint continuation remains `26d92083` (full state `efe70d11`). The owner's older scenario-7 run retains its existing tolerant replay, `42c2c2f6` before and after, with 210 applied and 62 skipped inputs; it is not claimed as an exact replay of the historical export. The one existing test edit updates its current-export version assertion from 10 to 11. The new pinned scenario-11 fixture and `node apps/site/scripts/watch-night-control.ts` exercise each new act and replay to `3c84c1c3`.

`node apps/site/scripts/hf-watch-session.ts seeds=2`, before:

| persona       | seed | ended | min | reached | engagement | longest lull | looked away |
| ------------- | ---- | ----- | --- | ------- | ---------- | ------------ | ----------- |
| commuter      | 1    | quit  | 8   | 1 night | 0.73       | 0s           | 0           |
| commuter      | 2    | quit  | 10  | 1 night | 0.73       | 0s           | 0           |
| unwinder      | 1    | quit  | 21  | 2 night | 0.77       | 0s           | 1           |
| unwinder      | 2    | quit  | 13  | 2 night | 0.78       | 0s           | 0           |
| completionist | 1    | quit  | 26  | 3 night | 0.8        | 0s           | 1           |
| completionist | 2    | quit  | 12  | 2 night | 0.82       | 0s           | 0           |
| restless      | 1    | quit  | 14  | 2 night | 0.64       | 21s dusk     | 0           |
| restless      | 2    | quit  | 11  | 1 fair  | 0.66       | 18s night    | 0           |
| mischief      | 1    | quit  | 17  | 2 night | 0.68       | 3s night     | 0           |
| mischief      | 2    | quit  | 14  | 2 dusk  | 0.69       | 0s           | 0           |
| exploiter     | 1    | quit  | 16  | 2 dawn  | 0.69       | 0s           | 0           |
| exploiter     | 2    | quit  | 35  | 3 night | 0.67       | 0s           | 1           |
| rulesLawyer   | 1    | quit  | 14  | 2 night | 0.7        | 3s night     | 0           |
| rulesLawyer   | 2    | quit  | 19  | 2 night | 0.68       | 0s           | 0           |
| returner      | 1    | quit  | 15  | 2 night | 0.73       | 0s           | 0           |
| returner      | 2    | quit  | 10  | 1 night | 0.74       | 0s           | 0           |

The same command after, with the adapter offering the new acts:

| persona       | seed | ended  | min | reached  | engagement | longest lull | looked away |
| ------------- | ---- | ------ | --- | -------- | ---------- | ------------ | ----------- |
| commuter      | 1    | quit   | 14  | 2 night  | 0.74       | 0s           | 0           |
| commuter      | 2    | quit   | 19  | 2 night  | 0.72       | 0s           | 0           |
| unwinder      | 1    | quit   | 18  | 2 dusk   | 0.77       | 0s           | 0           |
| unwinder      | 2    | quit   | 17  | 2 night  | 0.76       | 0s           | 0           |
| completionist | 1    | quit   | 15  | 2 dawn   | 0.8        | 0s           | 0           |
| completionist | 2    | quit   | 16  | 2 night  | 0.79       | 0s           | 0           |
| restless      | 1    | quit   | 14  | 2 night  | 0.65       | 21s dusk     | 0           |
| restless      | 2    | quit   | 11  | 1 autumn | 0.65       | 18s night    | 0           |
| mischief      | 1    | agenda | 20  | 2 night  | 0.66       | 3s night     | 0           |
| mischief      | 2    | quit   | 14  | 2 night  | 0.68       | 0s           | 0           |
| exploiter     | 1    | quit   | 17  | 2 night  | 0.68       | 0s           | 0           |
| exploiter     | 2    | quit   | 14  | 2 night  | 0.68       | 0s           | 0           |
| rulesLawyer   | 1    | quit   | 16  | 2 night  | 0.68       | 3s night     | 0           |
| rulesLawyer   | 2    | quit   | 12  | 2 night  | 0.68       | 0s           | 0           |
| returner      | 1    | quit   | 9   | 1 dusk   | 0.72       | 0s           | 0           |
| returner      | 2    | quit   | 9   | 1 night  | 0.73       | 0s           | 0           |

These are deterministic simulated sessions with two seeds per persona, not fresh human retests. The action policy changed as well as the available inputs. Session duration, engagement and quitting do not establish that the new controls are discoverable or that posting still carries the same weight.

Verification: act legality, reach, candidates, actual acceptance/refusal, relief without a gap, withdrawal to the hall, account words and exact legacy controls; full repository check and site build; Chromium at 360×690 on tired, hurt, distant and dusk posting screens. New request labels and reads fit when scrolled into view, with no text overflow or target below 44 px.

Revert: revert “Let the Keeper relieve and help watchers at night”.


**Round 2 (fun review).** “Watch hides the exact response the retest needs.” Rest / Send down now stays below a short, explicit tired/hurt account; the lantern and bell return on Back. Send relief / Send help replaces the account with candidates and their reads and departure costs. Unavailable people collapse into one line per reason. Dusk fatigue reads say “seemed tiring at dusk” and remain actionable through the night until a newer observation replaces them; the current body still decides the answer and destination. Options seen during an account visit stay listed, with a reason if no longer available. Departure costs name who remains on the stretch. The strip distinguishes a call awaiting an answer, a reliever holding the post, an outgoing watcher asked down, and actual departure. Existing rules move people at acceptance, so it does not invent a travelling phase. Cost and risk: one extra sheet to choose a helper; older reads can prompt a refused rest request. This broadens ask eligibility but adds no saved state or HF rule. Scenario 11 stays: pinned 9/10/11 exports and midpoint continuations retain their exact hashes (`05460984`, `26d92083`, `3c84c1c3`). Fresh-player acceptance remains targeted for 2026-11-03. Revert: revert “Keep the night acts on screen and honest”.

**Retest (2026-10-20, Protocol 2, live `05f124b`):** three of four phone testers used the relief and help acts and called them the work they came for. Those three did not ask again for a way to rotate a tired watcher, and no tester said the night became easy. One tester never found the acts and another found them late. Discoverability and the reason for a disabled post stay open (F-347, F-349, F-350). All four sessions ended on a driver TOOL stop, so voluntary stopping times are not established ([reports](../lab/reviews/watchwell-2026-10-20/README.md)).

## Design change 2026-10-20d (owner may veto)

Every night account now keeps applicable Rest / Send down, Send relief and Send help in its action row. An account with no request says why: outside voice reach, off the wall, asleep, or no observed condition that offers relief or help. These are explanations of existing eligibility, not new night orders. Every disabled dusk post has a reason beside it: assigned, not open tonight, or fallen. A phone moment temporarily uses the lantern and bell's space; all its answers, including “say nothing,” fit at 360×690. The controls return after an answer or dismissal. The clock continues at the existing slowdown.

Sam (F-347): “Let me find a request to move or wake a watcher from their night account, or tell me there why I cannot. I want to defend the threatened stretch with the people I have.” Sam (F-349): “Tell me why a post is unavailable beside the disabled post button. I should not have to guess whether it is full.” Sam (F-350): “Tamar can go down with Kian taking over. That is the sort of decision I came for.” The same report asked that every live answer remain visible, including saying nothing. Sources: [free first session](../lab/reviews/watchwell-2026-10-20/watch-free1.md), [free second session](../lab/reviews/watchwell-2026-10-20/watch-free2.md), [floor first session](../lab/reviews/watchwell-2026-10-20/watch-floor1.md).

The flyleaf offers **Hard winter — as the village knows it**, the default, and **Milder winter — packs come later; movement is seen sooner**. It is available before starting and in the Game menu. The strip names the winter in force. A change after the opening page waits until the next dusk, including a change made during dusk; it cannot revise that night's plan. No loss prompt suggests a change. Scenario 12 records `winter` inputs and the active and next choices in saves. The default has no extra state and keeps scenario 11's rules.

`WINTER_RULES` in `sim/config.ts` owns the few tuning values: packs wait up to 45 extra sim-minutes; unlit motion becomes known at approach position 0.1 rather than 0.3. Each night's delay is capped to leave at least 100 minutes after its last pack, and every pack receives the same delay so spacing stays intact. Counts, sizes, sections, threat speed, injuries, fatigue, refusal, grain costs and night length retain their existing rules. The tuning enters the rule hash when the option is used. These values are design choices, not measured historical weather. The control demonstrates later arrival and an earlier warning on the approach; it does not establish that a fresh player finds the night easier or more compelling.

Cost and risk: the moment hides the lantern and general bell until it is answered or dismissed, and its scene is shorter. Longer warnings can also move a watcher's fear or retreat earlier. Delaying a pack gives more preparation time but does not make watchers obey or prevent losses. Fresh human testing of both winters, account discovery and return interest remains targeted for **2026-11-03**; F-351's voluntary return-at-dawn preference remains evidence, not a defect this change claims to cure.

Verification: `winter.test.ts` checks next-dusk activation, save continuation, warning lead, unchanged packs and the default state/event sequence against scenario 11. `watch-winter-control.ts` pins the milder scenario-12 run. `watch-phone-layout.ts` drives the full App through frozen frame transport at 360×690 touch, including generated waver, family, downed and leaving cards, one-tap watcher accounts and unavailable posts. Existing scenario 9/10/11 replay and midpoint controls remain exact: `05460984`, `26d92083` (full state `efe70d11`) and `3c84c1c3`. The milder fixture is `8a4472d8`. The frozen default sequence digest is `f51bd92a1f1f6b79a71b50acd01d105f73e31de15f0803aefdda314a1169e424`. Final check receipts are in the worker report under `~/code/.lab-scratch/watchwell3/watch-report.md`.

Revert: revert “Make night requests clear and offer a milder winter”.

**Round 3b (fun reviews).** The wildcard reviewer said “Nothing on the wall screen says people can be tapped for these asks”; the Codex reviewer said “I know the feature exists but am hunting for a moment when it works.” The wall now says to tap a watcher for rest, help or going down, with a Watchers entry beside a live decision. Accounts repeat a recent “nods off” message as heard history and distinguish a person who can answer now. Retained requests name the current known reason, grouped once per reason; a person who has gone down loses the old Rest / Send relief controls. The remote account wraps without overlap. Cost and risk: the entry uses reading space, and a longer sleep account uses a shorter scene; accounts retain uncertainty in the dark. This is UI only: scenario 12 and both winter settings stay unchanged, with scenario 9–12 replay and midpoint controls retaining `05460984`, `26d92083` (full `efe70d11`), `3c84c1c3` and `8a4472d8`. The extended 360×690 touch check covers live healthy reads, sleeping/departed helpers, a completed relief and a doze followed by an awake account. Toast relocation is deferred to **2026-11-03**, with fresh player testing already due that day; difficulty and costs stay as they are.

Revert: revert “Clarify watcher access and changing night requests”.

### Owner trial, 2026-10-21 (F-422 and F-423)

Morning now gives a plain outcome above the talks and four rough marks for watched-night progress. Routine winter still follows the last watch. Scenario 13 adds **0.08 exertion** once when HF accepts a relieve/help request that takes a helper off a different post, including a carry. The Keeper names the tiring crossing and the people left behind. Requests remain available; a refusal, same-post relief or helper from the hall pays no crossing cost. This adds no travel delay. Saved states without `nightDepartureEffort` and scenario 9–12 replays keep the old cost; their captured hashes still hold. Focused tests include an accepted-crossing control against the legacy arm. Owner feel remains to be tested; revisit by **2026-11-03** with the existing Watch retest.


## HF 2.21.0 narration adoption (2026-10-25)

The site pins HF 2.21.0. Fresh actors opt into persisted `Lexicon.plainEnglish`; saved actors keep their choice. Canonical chapters pin that choice in the admitted initial actor. No new faculty is enabled. Current exports retain the runtime version and replay checks; Voice and Well refuse files from earlier narration versions with a start-fresh message.

Regression: `src/shared/plain-narration.test.ts` covers fresh actors, later Watch arrivals and births, saved choice, export stamps and pinned canonical replay. Existing game export/replay and cast-chapter tests cover the upgrade. The before/after proof captures seeds 7, 42 and 1001: six Voice months, nine three-day Well runs with intermediate states, and three Watch years. All eighteen text-projected hashes match. It retains RNG, numbers, action IDs and semantic histories; only verified bijective Voice pause-word identities, display fields, the engine stamp and the narration opt-in differ. External evidence: `~/code/.lab-scratch/hfadopt/seeded-hashes.json` and `semantic-history-maps.json`.

Lesson: narration can also be a comparison key. Well's HF duty counter and host duty counter previously shared a phrase. Plain narration changed only one and emitted an extra bubble. Preserve the existing counter identity separately from the displayed sentence. Never blank a history to make an upgrade proof pass.

## HF 3 maintenance and watch information (2026-10-25)

The host uses published HF3.0.0 (engine2.23.0), lab client0.4.10 and kit0.5.11. Numerical rules, winter difficulty, night requests and seeded outcomes retain their existing meaning.

F-469: selecting a watcher at dusk now explains that posting does not grant a night off, and points to the existing Rest request at night when offered. This does not add a dusk rest order or a generic night posting input. F-470: the ordinary strip now shows how many controlled watches remain, including the current watch at dusk/night and excluding the finished watch at dawn. The count remains beside a pending decision/helper cue. Final dawn and the thaw have zero controlled watches left; the descriptive progress account still distinguishes the usual winter watches from those the player controls.

Regression: focused count tests cover early, singular, final and thaw boundaries; the ordinary DOM test requires visible count text, and the dusk component test requires the rest explanation. Lesson: updating an SVG's accessible description alone does not make a count visible in ordinary play.

F-299's reference to F-290 is a stale umbrella, not a new failure of the three closed F-290 routes. Morning outcomes and the watched-night bar remain. F-423's scenario13 departure cost remains unchanged, with owner feel due2026-11-03. F-289's warning remains a deferred design question, review2026-11-03. F-360's during-fight Keeper call remains a candidate, not a commitment or a new fighting role; review2026-11-05. Existing handover messages, night helper sheets and named accounts require current UI verification rather than a second implementation. F-492 readiness, F-465 receiving acceptance and F-491 owner retest remain due2026-11-03.


### Source delivery pending — 2026-10-26

Source now implements an explicit new-village dusk night-off option (scenario15); omitted selection keeps14. Actual HF decisions and events own refusal, rest, expiry and observed return. Dawn does not guarantee a return. This is the bounded F469 dusk capability, not guaranteed obedience or a full request-history faculty. Normal related checks and raw legacy/export controls passed at author handback. Independent source review and exact CI remain required before integration. Public deployment is held with the Voice round; follow-up target 2026-10-27 after the hold clears. Browser verification, same-tester observations and Adam’s 2026-11-03 acceptance remain separate.

## Design change 2026-10-27: loss carries across the year (owner may veto)

Cold play (2026-10-26, 3d199d8): a careless Keeper lost "much of the granary" and heard "someone is down", then autumn brought "An ordinary harvest". Nobody died and no winter failed. Headless, a passive or wrong-end Keeper emptied all 20 sacks every winter for three years and kept the same village; the harvest (18–29) refilled the granary each autumn. Owner directions: death is allowed where the design needs it; bold over safe; keep difficulty edges; show rather than count.

New villages get the **hardship rules** (`WatchState.hardship`, scenarios 17, 18 and 19 for the three editions 14, 15 and 16). Each consequence is a chronicle line or a roster note:

- **Seed for sowing.** After the spring's eating, the sowing takes up to 4 sacks. Unsown fields cost the harvest: it is 70% (kitchen gardens and what was sown anyway) plus the other 30% in proportion to the seed. The thaw says "There was no seed grain left to sow…", and the harvest line says why it is poor.
- **The hunger can kill.** In a hungry spring, the frailest face the thaw already names (the oldest from fifty, else the youngest under six) dies with a chance of 75% times how short the granary fell. The shortfall is measured before households leave, so a spring that also loses a family still counts its full hunger. At most one death a spring. It is a world draw, so nothing else moves it. The death goes through HF `die` and `tellDeath`, so the bereaved grieve and a spouse is widowed.
- **A lean winter.** A winter is lean when it opens with less grain than the spring will eat plus the seed, or after a hungry spring. Every watcher's fitness drops to 60% of what it was, so they tire sooner. The roster says "weak from hunger", and the winter opens with a line saying so.
- **Wounds last.** Bites heal at 0.035 a day (was 0.12) and blows to the head at 0.08 (was 0.2). A watcher bitten early is still hurt at the last played night, and the roster says "still hurt". The limp roll at dawn reads only the night's new wounds, so an old wound is not rolled again. A watcher with a leg wound who went down and lay on the wall until dawn, carried by nobody, is lamed at severity 0.4 with a 60% chance (otherwise 0.55 and 30%).
- **The fall.** A second hungry spring in a row ends the village when it runs half short or worse: "A second hungry spring in a row. The families could not stay to starve, and the village went down the valley." This is the fall at the thaw from spec §3. A milder second hungry spring is survived, so one bad winter followed by careful play can still recover.
- **Plain warnings (F-290).** The granary line on the dusk and dawn pages names what the grain left can still do. It says when the granary cannot feed the village to the harvest, when there will be no seed, and, after a hungry spring, that another short spring will end the village. The thaw headline says when next winter will start thin.

Saves and exports: a page saved under 14–16 has no `hardship` and keeps its rules exactly. A 14–16 export still replays under its own rules (`replay` drops `hardship` for it). Nothing old is refused.

Headless evidence (scripted Keeper, seeds 1, 2, 3, 5, 7, 9, 11, 23, 4 years, no fair purchases):

| Keeper                             | Before                                               | After                                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Matched (careful) every winter     | never hungry                                         | 7 of 8 standing after 4 years, never hungry. Seed 9 (the hard seed) had a hungry spring in year 2, lost one person and fell at the year-3 thaw. |
| Mismatched or passive every winter | hungry most springs, 0–1 households left, never fell | 20 of 20 sacks lost in winter 1; the hungry spring killed the frailest in 14 of 16 runs; the harvest was 13–21; all 16 fell at the year-2 thaw  |
| Passive in winter 1, matched after | not measured                                         | 2 of 8 standing after 4 years (seeds 3 and 5); seed 7 recovered and fell in year 4; 5 fell at the year-2 thaw                                   |

The third row is the difficulty edge: one careless winter is usually fatal, but not always. Tuning constants (`SOWN_FLOOR`, `FALL_SHORT`, `LEAN_FITNESS`, `HUNGER_DEATH` in `sim/season.ts`) are the levers if the owner wants it gentler.

Not covered: eating the seed or keeping it as a Keeper's choice; hunger in the routine days of winter; a death on the wall from a wound. The scenario 13 departure cost and the night acts (F-423, kept by the owner) are unchanged.

WATCH-cold-timing: the downloaded playtest file now carries `clock`, kept by the worker outside the game state. It holds the ticks the page sent, the real milliseconds offered and admitted (each tick capped at 250 ms), the capped and held ticks, and the same counts for the timed decision open at export. Replay ignores it. It covers this page session only: a run loaded from a file starts a fresh count. The foreground decision timeout is still undecided; this field is the evidence for that decision.

## Retest fix 2026-10-27: posts and Urge say they worked

The [2026-10-27 retest](watch-playtest-2026-10-27-retest.md) asked that "my taps on Urge and the posts tell me they worked".

**What went wrong (confirmed from the driver log).** Neither the east-wall post nor the Urge reached the game. The tester's taps were refused by the lab driver, not by the game:
- At dusk of night 2 the button read "East wall · tracks", because the scout found tracks there. The tap asked for "East wall", so the driver found no such control. The tester then pressed Done and Begin the watch, so no post was sent.
- Each Urge option carries its likely answer ("Urge Kian to hold The watcher will probably agree."). Two taps by the name "Urge Kian to hold" matched nothing. The tap that worked, "Ring and call Kian by name The watcher will stay.", used the full name. A third Urge tap, by text, was refused as "not on the page now" although the control was there just before. Its cause is not confirmed.
- Assumed, not confirmed: the tester's helper script dropped the driver's error replies, so the failures looked silent.

From the code, not observed in that run: the post rule, the hit area and the disabled state work, and a tap on "East wall · tracks" posts the watcher. The live check below confirms it at 360x690.

**What changed (words only; rules and difficulty unchanged).**
- An Urge or call-back answer now puts the watcher's reply in the ticker, as a named bell call does: "You urge Kian to hold the Gate. “I’ll hold,” Kian answers." The reply follows the same read the card's option shows, so "will not agree" is answered "Kian does not answer." It is not a promise; they still decide. Sending someone else to the post says so too ("“I’ll go,”"). An Urge with no post to go back to says that it changes nothing; it used to close silently.
- After a post at dusk, the roster says "Idris is posted on the east wall (asked)", or that the post did not take.
- Beside Begin the watch, a line warns when nobody is posted on the stretch where the scout warned of trouble.
- The night-off and refuge buttons no longer render as a white box with pale text.

The rule hash ignores alerts, so replay hashes do not move.

**Deferred.** Target **2026-11-10**, **a taller phone map at dusk** (360 px wide). The watcher sheet covers the map at dusk, so posts cannot be tapped on the map. The post buttons in the sheet work. Also open from the retest, target 2026-11-10: the "in the new village" checkbox wording, and a raid headline beside "It was quiet enough."
