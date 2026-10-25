# Game taste and direction, 2026-10-19

Read-only research brief. Confirmed means read in a file. Assumed means my inference. Nothing here sets a goal; the owner chooses.

Caveat: Adam's notes name few games. A search of `~/code/pkm` (excluding archives) found no mention of RimWorld, Dwarf Fortress, Crusader Kings, Factorio, Stardew, Papers Please or Overcooked. Taste below is inferred from the few games he names and from how he describes the games he wants. Treat it as thin evidence.

## 1. Taste signals

Paths are under `~/code/` and quotes are verbatim.

| #   | Signal                                                        | Source                                                                                                | Quote                                                                                             |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | Likes grand strategy, no time for it now                      | `pkm/05-archive/claude-ai-sessions-2026/039-Europa-Universalis-population-based-strategy-approach.md` | "I like Grand strategy games just don't have time for them anymore."                              |
| 2   | Likes simulation built up from groups of people               | same file                                                                                             | "basing everything on groups of population and simulating up from there is genuinely interesting" |
| 3   | Likes Old World's drama-gated music                           | `pkm/05-archive/gemini-uhtf-selected-evidence-2026-09-06.md` (G1-B)                                   | "the game's music doesn't start until your civilization researches the drama in Old World"        |
| 4   | Likes a game that breaks its own save rules in fiction        | same                                                                                                  | "I loved how the saving and loading a game doesn't function as expected"                          |
| 5   | Likes hidden causes, no visible dice                          | same                                                                                                  | "everything happens for a reason"                                                                 |
| 6   | Likes scouting and uneven growth (football management)        | same                                                                                                  | "football club management games have some of these mechanics"                                     |
| 7   | Wants hired people who differ from their advertisement        | same (G1-A)                                                                                           | "they're not as they market themselves when you're hiring"                                        |
| 8   | Wants a minimal game where the person drives behaviour        | same                                                                                                  | "minimalist game where simulated human factor creates emergent behaviors"                         |
| 9   | Wants an easy-looking game whose interface gets less reliable | same                                                                                                  | "the trusty HUD is all relative to how good their character is" (trimmed)                         |
| 10  | Delayed reward, advisors who blur                             | `pkm/00-inbox/ideas.md` ("Religion-Inspired Game")                                                    | "Delayed gratification, where the rewards aren't immediately clear"                               |
| 11  | Boundary: avoids multiplayer and online games                 | `pkm/02-personal/identity.md`                                                                         | "avoided multiplayer or online games as they're too addictive for me"                             |
| 12  | Childhood games: Planet Blupi, Little Fighter 2               | `pkm/00-inbox/todos.md` (line 96)                                                                     | "You're the boss" (Blupi memory note)                                                             |
| 13  | Night Watch: accepted as a game                               | `human-framework/docs/games/watch-playtest-2026-10-05.md`                                             | "this is already a game, and an interesting one nonetheless"                                      |
| 14  | Night Watch: slowness is right if fed                         | same                                                                                                  | "it's correctly human at human speed"                                                             |
| 15  | Night Watch: wants more to do and delayed feedback            | same                                                                                                  | "delayed feedback to the player on their decisions"                                               |
| 16  | The Pass: time management with a twist                        | task brief (owner, 2026-10-19)                                                                        | "a classic with a twist of better simulated human beings"                                         |
| 17  | The Rope: rejected                                            | task brief (owner, 2026-10-19)                                                                        | "not for me"                                                                                      |

Playtest reactions, a pattern (assumed): he reacted most to surprise that has a cause (Kian leaving the post, the explanation after the night) and to "a game with taste". He disliked waiting with nothing to do. The Rope's failure is plausibly the opposite: a long, silent, low-agency stretch with no moment of decision (assumed; he gave no reason).

Pattern across signals (assumed):
- Classic structure, humans as the twist. The brief says "classic" for The Pass. In his own 2025 words, tower defense and football management are the frames.
- Hidden causes that the player learns to read, with approximate information.
- The interface and the fiction are the same thing (saves, HUD, music).
- Single player, continuous time, slowdown rather than pause.

## 2. Prior concepts, deduplicated

Status: tried means built as a game. Not tried means only proposed.

| Concept                                                                            | Origin                                                          | Status                                           |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------ |
| Twice at the Well (colony, orders with vs without personhood)                      | HF Game 1                                                       | Tried (`human-framework/docs/games/colony.md`)   |
| The Day You Say Nothing                                                            | HF Game 2                                                       | Tried (`docs/games/voice.md`)                    |
| The Night Watch (tower defense with human watchers)                                | Adam, 2025 tower-defense example                                | Tried (`docs/games/watch.md`)                    |
| Small Works (repair workshop, apprenticeship, Repair House theme)                  | Assistant proposal 2026-10-09, Adam chose                       | Tried (`repair-game/`)                           |
| Neighbours (small town on Concordia)                                               | Concordia study                                                 | Tried (`concordia/docs/neighbours/`)             |
| The Rope (mountaineering party)                                                    | Coordinator                                                     | Tried, rejected                                  |
| The Pass (small kitchen time management)                                           | Coordinator                                                     | Tried, positive; in progress (`pass/`)           |
| Morning Bakery                                                                     | Assistant, 2026-10-09                                           | Not tried; The Pass is the nearest relative      |
| Caravan Office (Adam "had been going to choose")                                   | Assistant, 2026-10-09                                           | Not tried                                        |
| The Last Order (cooperative workshop)                                              | Assistant, 2026-10-09                                           | Not tried                                        |
| Disputed building meeting                                                          | Assistant, 2026-10-09                                           | Not tried                                        |
| Delayed-gratification advisors, heaven/hell sandbox                                | Adam, `pkm/00-inbox/ideas.md`                                   | Not tried (promptings now exist in HF 2.4.0)     |
| Train an agent to replace your actions; agent hiring market; micro to macro        | Adam, `ideas.md`                                                | Partly: apprenticeship in Small Works; no market |
| Procedurally generated adaptation instead of a tech tree                           | Adam, `ideas.md`                                                | Not tried                                        |
| Small game with fully LLM-simulated NPCs                                           | Adam, `ideas.md`                                                | Not tried; Neighbours explores it                |
| Small-to-big game with time scale, up to planets                                   | Adam, `ideas.md` (Turkish original)                             | Not tried                                        |
| Population-based simulation from people up                                         | Adam, EU chat (`039-...md`)                                     | Not tried                                        |
| Couple preference game (guess your spouse)                                         | Adam, `ideas.md`                                                | Not tried                                        |
| Minimalist deterministic justice game                                              | Assistant recalling a July question; source not recovered       | Not tried; unverified                            |
| Football-club scouting and uneven growth                                           | Adam, Gemini chat                                               | Not tried                                        |
| Honest-HUD game, interface that evolves, save/load twist                           | Adam, Gemini chat                                               | Not tried                                        |
| Intern to CEO automation game                                                      | Gemini's words, not Adam's                                      | Not tried; not his                               |
| Host candidates (Wesnoth, FreeCol, Endless Sky, OpenTTD, Cataclysm-DDA and others) | `repair-game/docs/research/autonomous-coding-fit-2026-10-16.md` | Hosts, not concepts; none built                  |
| AI Town, Smallville                                                                | same                                                            | Reference only; Codex advised against as a base  |

Codex prior-art notes: `repair-game/docs/research/hf-comparison-consult-2026-10-16.md` and `autonomous-coding-fit-2026-10-16.md` (AI Town and Smallville "not recommended game foundations"; Concordia the comparison runner), and `concordia/docs/neighbours/PRIOR_ART.md` (fork survey). Lesson (confirmed): LLM town machinery is not an HF advantage. Games here stay deterministic.

Private-source note: `repair-game/docs/research/original-game-ideas-2026-10-16.md` is marked private. Do not copy it into public site assets.

## 3. Ranked shortlist: six new concepts

Ranking is my judgment from sections 1 and 2. Fit is to taste first, HF strengths second. Games keep faith gentle (AGENTS.md): concepts 2 and 6 use muhasaba and promptings as ordinary conscience and reflection, never as a named theme.

### 1. The Glance (the honest HUD)

- **Pitch:** a small watch-and-decide game whose gauges look exact but are read through a tiring, worried keeper.
- **Why it fits:** his own 2025 design (signals 5, 8, 9). Uses bodily forecast and fatigue for what the keeper can read, and approximate percepts. It extends Night Watch, which he praised.
- **First minute:** the board looks too easy. One tired worker reports a number that you later learn was low-confidence. You find out by the first small miss, not by a tutorial.

### 2. The Two Voices (conscience as a game)

- **Pitch:** you are one person's inner voice on an ordinary day, and each evening they review it with you.
- **Why it fits:** his own concept (signal 10). Promptings and turning away supply the two advisors. Muhasaba supplies the evening review and the only "score" (how the person feels). Delayed reward is the core loop.
- **First minute:** a dropped wallet or a rude message. Two suggestions arrive in different voices. You can only nudge. The person acts; nothing is graded until night.

### 3. The Caravan Office

- **Pitch:** dispatch drivers and packers on routes, as a time-management game where staff forecast their own tiredness.
- **Why it fits:** the one he nearly chose (section 2). Classic time management with a human twist, the same shape he praised in The Pass (signal 16). Bodily forecast and fatigue make "yes to this leg, no to the next" real. Refusal and trust set who you can lean on.
- **First minute:** assign the first load. A driver says "I can, but not the second leg" and tells you why. Your first decision is whether to believe it.

### 4. Probation (hire, watch, keep)

- **Pitch:** run a small crew where each applicant does a trial shift and their claims differ from how they work.
- **Why it fits:** signals 6 and 7. Trust and refusal build over weeks. Fatigue explains why a good worker has a bad day. Light on faith.
- **First minute:** three applicants stand at three benches for sixty seconds. You can watch one closely; the other two you read from the résumé.

### 5. The Valley (population from named people)

- **Pitch:** a grand-strategy-lite valley where groups are summed from named households you can zoom into.
- **Why it fits:** signals 1 and 2 (EU, population, "everything for a reason"). Strongest taste match, but the heaviest build and the most risk of a dashboard (confirmed as a Neighbours finding). Rank 5 for scope, not for fit.
- **First minute:** one hamlet, one season, speed controls. Grain falls short. Zoom in to see which three households refused the late harvest, and why.

### 6. The Meeting (chair a neighbourhood vote)

- **Pitch:** chair a recurring meeting about one shared problem; each person's stance shifts with trust and tiredness.
- **Why it fits:** an assistant proposal, not his. It matches Othram's consensus culture and uses received plans, trust and refusal. Risk: little to do between meetings (his Night Watch complaint).
- **First minute:** a leaking roof is on the agenda, four people are late, one arrives angry. You choose who speaks first.

## 4. Open questions for Adam

- Is The Rope's failure the silence, the setting or the low agency? One line from him would narrow concepts 1 and 3.
- Which game is the real touchstone: Old World, Europa Universalis or football management? Only these three are named.
- Concept 5 reads strongest but costs most. Should the next slice wait on the owner's pick?
