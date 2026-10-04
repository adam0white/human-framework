# Game 3 — *The Night Watch*

Draft, 2026-10-04, awaiting the user's go-ahead.

Owner's brief: "a known, deceptively small game type like tower defense, or base building, or idle strategy, within which player connects with each character and develops them." This spec answers with a tower defense whose towers are people. House style follows [voice.md](voice.md) and [colony-v2.md](colony-v2.md); framework gaps cite [rimworld-gap.md](../rimworld-gap.md) §1. AGENTS.md "Games keep faith gentle" applies throughout. Numbers marked *assumed* are unmeasured.

## 1. Promise and fit

**Promise:** you hold a small walled village through one winter, and every tower on the wall is a person who can say no, learn courage, break, or run home to their children.

**Why the genre fits.** Tower defense is placement plus attrition, readable in seconds. The framework replaces a tower's three properties: it stands where put (the will), improves only by upgrade (skills by doing, expectations), and ignores its neighbours (social). The framework already decides "fight, flee or comply on each interrupt" (rimworld-gap §1); TD supplies those interrupts a few times a night, not hundreds.

**The design problem, stated.** TD assumes absolute placement; the framework's signature is that the player is a suggestion. So posting is a Game 2 suggestion with the normal verdicts. The dusk decision is spatial and predictive (more posts than people, a telegraphed threat); the night's decisions are about people: *Mara is wavering, her house is on the east side; do I let her go?*

## 2. Core loop

**Season.** 15 nights, first frost to thaw. A night is 12 sim hours in about 3 real minutes at 1×; a day phase about 2 minutes; a season about 75 minutes, saved at every dawn. No rewind.

| Nights | What comes | Game AI |
|---|---|---|
| 1–4 | Wolves | A pack probes the darkest wall section; a wolf hit twice flees. Bites injure; nobody is eaten. |
| 5–10 | Grain thieves | Bands go for the granary, carry sacks out, run from two defenders. They knock people down, never kill. |
| 4, 8, 11 | Storm embers | Embers land on roofs; fire spreads tile by tile until a bucket post reaches it. |
| 12–15 | Hard nights | Thieves in a storm with wolves; night 15 is the longest. |

**Staggered cast.** Night 1: Tamar and Kian on three posts. Night 2: Joss and Mara join (the family pull). Night 4: Yunus, with the first storm. Night 5: Ruslan arrives with the thieves, a newcomer to the player as to the village.

**Dusk: posting.** A scout line telegraphs the night ("pack tracks by the west wall; smoke to the east"). The map has nine posts for at most six watchers: Gate, East wall, West wall, North wall, Watchfire (spotter: lights the dark), Well (bucket line), Granary, Hall door, Lane. Which posts to leave empty is the core spatial decision. Drag a portrait to a post; before release the slot shows `predict()`: *likely*, *later: after I eat*, *won't: that's next to Joss*, *can't: her leg*.

| Gesture | Effect |
|---|---|
| Drop | suggest (`strength 0.35`) |
| Drop and hold | urge (`strength 0.7`), appeal chip once unlocked |
| Swipe up | insist: a `notNow` becomes `complied`, with the Game 2 price |
| Ring the bell (one charge per night) | **command** one watcher (F1): they hold through fear and refusal, never through `cannot`, a held norm or a break. The card prints the price before release: autonomy and trust drain per hour, break hazard rises, no trust earned if it goes well. |

One suggestion per watcher per dusk and per moment; a re-post after a refusal costs trust every time. The verdict is seeded per (night, watcher, post), so a retry gives the same answer.

**Night: watching.** Posted watchers throw, strike, spot and carry water; the game rolls (§5). The player has one movable resource, **the lantern**: place it on a wall section to light it (enemies there are seen and hit earlier). The framework decides only on interrupts: hold, flee, go home, help a downed neighbour, step off to pray near dawn.

At most three moments a night pause play (*assumed* cap, tuned in W2); each has two or three priced cards from `predict()`:

| Moment | Trigger | Cards and prices |
|---|---|---|
| Waver | `hold-post` within the close-call margin of `flee` or `go-home` | starts as 0.25× slow-motion; tap to pause. *let him go* (post empties) · *urge: hold* (pressure shown) · *bell* |
| Family | a threat percept targets a watcher's home | *let her go* · *send Kian to her house* (his post empties) · *bell* |
| Downed | a watcher is down in the open | *Ruslan, carry her in* (`predict()` shows if he will; his post empties) · *leave her*: severity rises each hour, enemies are drawn to her, she misses tomorrow night |

Breaks and downed-with-nobody-near show as banners without pausing. A setting chooses which moments pause.

**Day: talking.** The dawn report leads with one line per watcher in their voice and, for each departure or refusal, a one-line why with a jump to that moment. Then each watcher lives the day through `stepCommunity` (sleep, family, work, practise) on a ribbon. The player has **three talks**; a talk opens a watcher's card and a tray of topics ranked by their inclination, answered with suggest, urge or insist:

*rest today* · *practise the sling with Tamar* (joint practise) · *mend things with Joss* · *forage* (brings sacks back; costs that watcher's rest before the night) · *tell me about last night* (cue recall, re-appraised) · *take the Gate tonight* (a promise at `begin`) · *move the children to the hall* (only after a Family moment; lasts three nights; costs Joss's comfort and the children's mood, which Mara voices).

**Win and lose.** The granary starts at 80 sacks; foraging adds a few a day. The village needs **50 at thaw**; falling below 50 at any dawn with no way back on the forage rate ends the season early (*assumed* numbers). The second loss is human: a **watch-cohesion meter** (the share of watchers whose `predict()` at dusk is *likely* on some post) warns two dusks ahead; at zero, nobody comes to the wall. Character outcomes are shown, not scored.

**Arc.** Wolves teach posts and the first refusals; thieves bring Ruslan and the outsider question; storms split the watch between wall and fire; the hard nights test what the season built.

## 3. Cast

Each watcher is a full `Person` in one `Community`. Families are host entities with seeded relationships, not Persons.

| Watcher | Strength | Flaw (as terms) | End they move toward | Ties |
|---|---|---|---|---|
| **Tamar**, 54 | Sling 0.7, steady | Pride: under-perceives pain, refuses rest (her card shows felt pain beside the true injury) | Hands the Gate to someone, or wears her body out | Kian's mentor; an old grudge with Ruslan |
| **Kian**, 16 | Fast, eager | Low fear, high achievement: takes the risky post, freezes once hurt | Real courage, or one bad night turns him from the wall | His sister lives by the west wall |
| **Mara**, 34 | Best sight (spotter) | Home on the east edge; family affection outweighs most posts | Trusts the wall enough to stay | Married to Joss; two children |
| **Joss**, 38, smith | Strength, the Gate's anchor | Anger tendency; resents Ruslan over a debt | Puts the grudge down, or it costs a night | Mara's husband |
| **Ruslan**, 45 | Spear 0.8 | Newcomer: low default ties; high emotionality, bad sleep, likeliest to break | Becomes one of them, or leaves at thaw | Suspected when grain goes missing (gossip; the game never confirms it) |
| **Yunus**, 61, miller | Calm, runs the bucket line | Frail, poor sight | Keeps the fire line through the storms | Prays; posted at dawn he asks to step off for Fajr (existing omission rule). Texture only: no goal, score or outcome reads it. |

**Courage made visible.** Each card has a per-post fear bar with last night's change ("East wall: less afraid ▼"), read from the learned expectation of `hold-post@<post>`.

## 4. Framework

**Exercised as built:** `decide`/`predict` and typed verdicts; insist; trust and pressure; `practise` and `successChance` per post skill; `learnOutcome` on `hold-post` (courage: believed risk moves toward the risk met; no fear habituation is added to affect/); `appraise` and `actionTendencies`; `socialEvent` and `judge` (bonds from shared nights, grudges from a watched desertion); `converse` (gossip about Ruslan); cue recall; `begin(..., {promise})`; joint practise and `jointSuccessChance`; `interruptPerson`; the chronicle; save/restore.

**Built for Game 3** (rimworld-gap §1 blockers; general, each with tests and a headless control scenario; engine 1.6.0):

| # | Deliverable | Scope | Test sentence |
|---|---|---|---|
| F1 | **Commanded mode** | `'commanded'` added to `SuggestionVerdict`; `StepOptions.controlled: Record<PersonId, {affordanceId, voiceId, since}>`: the driver ticks, perceives and finishes but does not decide. Each controlled hour costs autonomy and voice pressure and adds stress equal to the utility margin the person's own choice lost by; a "commanded by X" episode is recorded. Ends on `cannot`, a held-norm veto, a break, downed, or release. | A commanded person holds a post they would flee; autonomy falls and break hazard rises with the margin; a break or downing releases them. |
| F2 | **Mental breaks** | A crisis state in affect/: per-hour hazard while mood stays below a threshold, scaled by stress and emotionality; during a break every voice gets `refused`/`cannot`, reason `break`. Host supplies the catalog (here *freeze*, *run home*, *shout at the one they resent*). Clears with time, sleep, or comfort from a bonded person. Exposes the current hazard for UI. | Sustained low mood breaks at the specified rate; a break vetoes all voices; comfort shortens it. |
| F3 | **Capacities and downed** (trimmed) | `Injury.part` keyed to a host part catalog mapping to `moving` and `sight`; `readBody(p).capacities`; `downed` when `moving` falls below a threshold or the host knocks a person down: only floor affordances remain, voices get `cannot`. Manipulation, bleeding, tending, infection stay out. | A leg injury lowers `moving`, not `sight`; downed offers only the floor; healing restores capacity. |
| F4 | **Out-group ties** (trimmed) | `social.groups` and a default tie for people outside them, so a newcomer starts low and grows with shared events, and an act against one's own group is judged harder. Threats use existing `felt`/`saw` percepts with valence plus affordance risk, documented as the convention; a dedicated threat field waits for a second host. | A newcomer's ties start below a neighbour's and rise with shared nights; a threat percept to a person's home raises fear and the pull of `go-home`. |
| F5 | **Save migration** (scoped) | A `migrate(json)` chain scaffold and one 1.5.0→1.6.0 step; `restore` runs it instead of refusing. Needed because Game 2 is live with dawn saves that 1.6.0 would strand. | A 1.5.0 Game 2 dawn save restores under 1.6.0 and resumes deterministically. |

## 5. In the game, not the framework

The 24×24 tile map, walls and nine posts; pathing (a flow field to the granary); enemy AI (wolves probe darkness and flee when hurt; thieves seek sacks and flee from two defenders); hit, work and fire-spread rolls from skill × capacity; the lantern and Watchfire light radii; the grain ledger and foraging yield; family entities and homes; the scout line; posting, moments and the bell; the break catalog. The framework sees only affordances (`hold-post@gate`, `flee`, `go-home`, `carry@mara`, `pray`), outcomes and percepts.

## 6. Classic vs Human

Not in Game 3: Classic towers never refuse, so a per-dawn comparison would mostly say people are worse than turrets. Game 1 carries the before-and-after showcase; the shared night engine keeps a later Classic run cheap.

## 7. UI

React 19 shell, Canvas 2D map, simulation in a Web Worker, React renders snapshots only. Graphics follow Game 1 (tile art, sprites, night lighting); choices follow Game 2 (telegraphed cards, verdict colours, why-sheet). Lucide icons.

- **Map.** Top-down village at night: torch, Watchfire and lantern light radii; enemies hidden until lit or spotted. Each watcher sprite has a ring: green holding, amber wavering, red broken, grey downed.
- **Icons over text.** Chips show portrait plus up to three state icons: fear, fatigue, injured part on a body silhouette, bond and grudge links, home under threat, break hazard. Words on tap.
- **Desktop.** Map centre; roster right; moment cards bottom-centre; dawn report and talks as a side sheet.
- **Phone 360×740, portrait.** Map top (24 tiles × 15 px); roster strip of six 56 px chips; moment cards as a bottom sheet, 44 px targets; talks full-screen. No page or sideways scroll (Game 1's known 360 px failure).

## 8. Build plan

| Phase | Work | Playtest gate |
|---|---|---|
| W1 | Night engine with plain obedient towers (no framework): map, pathing, enemies, rolls, fire, grain, scout line, lantern, dusk posting | Against a telegraphed threat, different testers post differently, and a bad plan visibly loses sacks |
| W2 | F2, F3; Human watchers on posts; moments; a three-line dawn report and one talk | Within three nights a fresh tester names one watcher's fear and one bond unprompted |
| W3 | F5, F1 and the bell, F4; full day talks, cohesion meter, staggered cast, season arc, end screen | The user plays a full season; two seeds give at least two different character outcomes |
| W4 | Phone fit, icons, polish, deploy at `/watch/`, framework.md, api.md, README | The user's playtest round, as Game 1 v2 |

F5 lands before the first deploy that carries 1.6.0.

**Done for Game 3:** a full season playable at https://human.adamwhite.work/watch/ on desktop and a 360×740 phone; F1–F5 in `@human/framework` with tests, documented in framework.md and api.md; `npm run check` passes; the user accepts by playing. This extends AGENTS.md "Done means" from two games to three; record it there on the go-ahead.

## 9. Risks and cuts

| Risk | Mitigation |
|---|---|
| The night is a slideshow | Empty-post choice, scout line, lantern; W1 gate tests planning, not watching. |
| Dominant card answers | Every card prints its price; leaving someone downed costs severity, a target and tomorrow night. |
| Lost season played out | Foraging; one threshold; early end when it cannot be met. |
| Breaks feel random | Hazard icon first; the cause is named. |
| PG slip | No death; bites and knocks; thieves flee. |
| Faith becomes a mechanic | Yunus's prayer is one existing rule, shown as one line. |

**Cut first, in order:** storms; *mend things*; gossip about Ruslan; appeal chips; the break catalog down to *freeze*; the bell (F1 stays in the framework, tested headless).

## Review notes

Adversarial review, 2026-10-04 (senior systemic-game designer, one pass).

**Accepted:** more posts than watchers, scout line, lantern; three-pause cap, slow-motion waver; a price on every card; one suggestion per moment, seeded verdicts; foraging, one threshold, cohesion meter; staggered cast; fear bars and dawn whys; *move the children* temporary and gated; Classic cut; W1 builds the TD without the framework; F3, F4, F5 trimmed.

**Partly accepted:** season shortened from 18 to 15 nights, not to 12 (the brief asked for ~15–20). Command made scarce (one bell charge per night) instead of cut.

**Rejected:** cutting F1: the brief requires commanded mode, and as the rimworld-gap blocker that runs against the framework's design it is worth building generally even if the bell is cut. A per-night urge budget: Game 2's pressure already prices urging.
