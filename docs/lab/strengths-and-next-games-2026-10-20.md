# Strengths and next games, 2026-10-20

Owner, 2026-10-20: "We can also get cross-game feedback, like what type of future games fit well into our combination of demonstrated strengths. We can also start thinking about more complex UI and gameplay elements, now that the concepts have been proven" ([owner directions](../owner-directions-2026-10-18.md)).

This reads across all fourteen games, using the [ranking](ranking-2026-10-20.md), the [ledger](feedback-ledger.md), the [lessons](lessons.md) and the owner's taste signals in [game-taste-2026-10-19.md](../game-taste-2026-10-19.md). Evidence cutoff: ledger F-346 and the owner notes of 2026-10-20 evening. Three levels are kept apart: **said** (an owner's or tester's words), **reproduced** (seen again in a replay or test) and **interpretation** (my reading). The [Taste](design-language.md#taste) rule applies: these are proposals with edges, written for this owner, not a design that pleases every tester. A Codex adversarial review (contrarian game designer) changed this document; [what changed](#adversarial-review).

## The working hypothesis

Interpretation: **make the player care about particular people, then make the player's influence on them matter.** The owner's strongest words are about attachment and influence, not about a genre:

- "I am now connected to her. I am her. I want to keep pushing her to do better" (The Two Voices).
- "And despite the low stakes, it connects with the player in such a deep level that the little achievements feel really good" (The Two Voices).
- "I can't stop making up something about everyone" (The Stairwell, F-184).
- "it felt good to impact his life" (The Day You Say Nothing, 2026-10-04).

Close range, a small cast, a week and speech are how the top games implement this. They are useful defaults, not rules. This rests on one owner's verdicts on fourteen games with different builds and devices. It is decisive for what to build for him, and it does not show that these properties cause success in general.

## Demonstrated strengths

1. **Identification with a person.** Said: "I am her" (The Two Voices). The player takes a person's side over days and feels their small wins.
2. **Expressive mischief with consequences.** Said: "I can't stop making up something about everyone … I can't, you know, just shut up and only do the work" (The Stairwell). The player invents, and people carry it on. L11 keeps such edges playable.
3. **Talk as the material.** Reproduced in code: beliefs carried with their source, gossip that changes as it travels, norms that refuse to pass it on (The Stairwell, Hearsay, Good Hands).
4. **The imperfect read and the hidden layer.** Said: "Love the simplicity and the hidden layer behind" (The Glance, owner run 3). The player reads a tired keeper's gauges, a candidate's pitch or a neighbour's greeting, never true numbers. The Glance shows this works through instruments as well as people.
5. **Credible people.** HF people answer from their own constraints, commitments and memories, deterministically, so an answer can be traced to a cause. A refusal with a reason in the person's voice (L1) is one form. It supports the others; it is not the explanation of success. The Pass's praised six-night run had no outright refusal.
6. **Show, don't count.** Said: "Love the font showing the sleep visibly" (The Glance). Named replies from woken watchers gave several of the strongest Night Watch moments (F-309 round).
7. **Implied story with permanent gaps.** Said: "is it a gym membership? We'll never know" (The Two Voices, F-187). Some mysteries should stay unresolved.
8. **Expiring decisions and a look back.** Said: "the right amount of expiring decisions, backstory, the buildup, habits" (F-190). The evening review (HF 2.7) gives a day its meaning.
9. **The lab process.** Shared replayable exports, a feedback ledger, lessons and an evolving tester calibration. It lets one finding reach every game. It is not a certificate that the testers measure enjoyment ([calibration](playtester-calibration-2026-10-20.md)).

## Demonstrated weaknesses

These are recurring failure modes on named builds. Several have recorded fixes that no player has confirmed yet.

1. **Doing that does not change anything.** Said: "I came for running a busy room and mostly watched it run" (The Pass, F-276); prep and plating felt like "successive label changes beside the same drawing" after acts were added (F-284); four of four Night Watch testers wanted to relieve a tired watcher and could not (F-309). The fault is a missing consequential response, not a missing tap. DL-32 measures availability, not effect.
2. **The player stops trusting what changed.** Separate faults with separate fixes: a false memory ("'Coffee. Same as yesterday' wasn't the same as yesterday", F-188; L3), duplicate presentation (F-189), an act that stays available after it can teach nothing (Hearsay's 13 repeated tellings, F-317; Good Hands' repeat reference calls, F-344), a stuck state (Good Hands' trial morning, F-341), and stock prose (L2). A person who remembers the wrong thing harms an HF game more than a familiar sentence does.
3. **The goal and the state on first contact.** Said by the owner on The Valley, The Warren, Hearsay and The Glance ("what are we doing here", "is there an end to this?"). He kept playing; several source-unread testers stopped at the same point, on often unmatched builds and devices.
4. **Dense text worlds on a phone.** Clipped answers, scrolling panels, the building too small (DL-22, DL-30, DL-31; F-312, F-316). Lab kit 0.2.0's stage pattern is the shared answer.
5. **More people, less connection.** Said: "I got more people now but I'm less connected to everyone" (The Night Watch, 2026-10-05); "Too many people to keep track of" (Hearsay, F-314). HF scales a cast more easily than a player's attention.
6. **Thin long arcs.** The owner asks for "actual backstories that progress and are well hidden … with real outcomes like hidden achievements or unlockable story paths" (The Stairwell, F-184 run), "other campaigns" (The Two Voices) and "the back stories" (Good Hands, F-340).

## Future games that fit

Expansions of the games that already work come first; they are cheaper and the owner asked for them. Then four distinct new bets, in order. The order is design judgement, not a measured result. An imperfect read (strength 4) is a technique for all four, not a type of its own.

**Expand first:** a Stairwell thread with hidden backstories; another bounded Two Voices campaign; The Pass's existing four-week campaign (`pass/docs/design.md`), tested and improved rather than designed again; Good Hands' negotiation and family conversation (F-342, F-346).

| Order | New bet | Why it fits | Nearest proof | Must solve first |
|---|---|---|---|---|
| 1 | **A compact management game where delegating authority changes people and outcomes** | "A classic with a twist of better simulated human beings"; football-management scouting is a named love; a staff member you trusted changes because of it | The Pass, Good Hands | Weakness 1: delegation has a visible cost and aftermath |
| 2 | **A social game where the player invents, conceals and repairs consequential claims** | Strengths 2 and 3, the Stairwell's pull, the owner's open "naughty edge" | The Stairwell, Hearsay | Weakness 2: what was said, to whom, stays true and checkable |
| 3 | **Making rules and later living under them, across three generations** | Delayed consequences of his own decisions (game-taste signal 10); a promise that helped the founder binds the heir | The Night Watch (generations), Small Works' learned methods | Weakness 5: three important relationships per generation, one inherited dispute, no town |
| 4 | **Population built up from people over many generations** | The owner's grand-strategy love (signals 1-2) | The Valley, The Night Watch | Bet 3 first: succession at small scale before scale itself |

Bet 3 is the bold one. It is [The Long Table](grand-ideas-2026-10-20.md) (#12) cut to three generations of one household or council: an apprentice inherits a method and a grievance, an old promise constrains the heir. It tests continuity, upbringing, learning and authority without a large cast.

Kept as boundaries: no multiplayer or online games (the owner avoids them, signal 11); no action-game polish or game servers (AGENTS.md); faith stays a quiet part of a character's life, never the theme, goal or a score.

## More complex UI and gameplay now worth attempting

Ordered by what each must prove. None needs a shared component first: build the cheapest version that tests the experience in one game, and extract shared machinery only when a second game needs the same thing.

1. **A consequential response, with readable aftermath.** Before any new system. For the Night Watch's relief: who takes over, what that costs in work or rest, whether they agree (HF may refuse), and how the relieved watcher answers. Drag-to-post is one input for it, with a tap alternative. For The Pass's food: name the quality, time and delegation trade-off before adding gestures. **First:** The Night Watch (F-309), The Pass (F-284).
2. **Truthful, checkable consequences.** Each consequential interaction leaves a checkable change, an honest refusal, or a plain statement that nothing new can be learned. **First:** Good Hands (F-341, F-344), Hearsay, The Two Voices.
3. **One hidden story thread, game-owned.** Clues spread across several people, a decision, then a changed relationship or event; some details stay unresolved for good. Not a lab-wide secrets-and-unlocks system: that would commit architecture and content before either is tested, and would harm The Two Voices' "We'll never know". **First:** The Stairwell; a second bounded Two Voices campaign separately, without turning its mysteries into unlocks.
4. **Fewer people in view before a notebook.** Foreground the people involved and present, show a short remembered exchange, keep source labels (Hearsay's F-314 fix is this). Then test whether players want to keep their own notes; if they do, try one pin on an existing line before any relationship map. A player notebook is a hypothesis, not an answer to "too many people".
5. **Standing plans that people may defy.** Occasional staffing choices with visible consent, interruption and cost. The trap is a schedule editor that needs constant repair. **First:** The Pass's existing rota proposal (pass@5 section of its design), evaluated before anything new.
6. **Assist options, default kept hard.** Only where a specific reading, timing or difficulty barrier is identified; offered in the game's fiction. The trap is calling a broken control "difficulty". **First:** wherever the owner next looks for an easier setting and keeps playing (Taste).
7. **Campaign carryover.** One earlier choice changes a later situation in a way the player can follow. The trap is more weeks whose state persists while the decisions repeat. **First:** The Two Voices, The Pass.
8. **A wider view as the place grows.** The camera follows the growing playable space and selection stays legible (owner, F-199). Group summaries only after that is tested. **First:** The Warren.
9. **The day replayed as a reveal.** One causal chain the player wants to understand, shown at the end, never an omniscient view during play or a compulsory log. **First:** Hearsay (its full trail is end-only by design).

## What this does not settle

- Real minutes of owner play are unknown on every game, so "patient when he has a stake" rests on game time, input counts and his words.
- Hearsay and Good Hands have owner verdicts on builds before their latest fixes; nobody has confirmed the fixes.
- Whether shared pieces (story threads, assist options) later belong in the lab kit or HF is open until two games need them.

## Adversarial review

Codex (gpt-6.1-sol, as a contrarian game designer, 2026-10-20) reviewed the first draft: one blocker, ten should-fix, one nit. Text: `scratch/ranking/strengths-review.md` (local). Changes made:

- **Blocker: the "winning shape" was fitted to four games and then used to exclude genres.** Replaced by the attachment-and-influence hypothesis, labelled as interpretation. The exclusions of expeditions, instruments and workshops are gone; The Glance itself is an instrument game.
- **Identification and mischief** were missing as strengths; added. Refusal is now a supporting capability, not the explanation.
- **Stale evidence.** Good Hands has an owner verdict (F-340..F-346; the ranking moved it from 11 to 7). The Pass already designs a four-week campaign and rotas; the proposals now say evaluate, not commission. Fixed faults are described as failure modes with unconfirmed fixes.
- **Doing that changes nothing** replaces "watching" as the first weakness, and a consequential response leads the UI list.
- **The new-game types overlapped.** Now four distinct bets, with expansions separate, and the bold missing type added: making rules and living under them across three generations.
- **Lab-wide secrets system and player notebook** were costly traps; both are now single-game tests.
- **Freezes** keep separate reasons and are not evidence against genres (also in the [ranking](ranking-2026-10-20.md)).
- **Repetition** is split into five faults; truthful consequences become their own item.
- **Overclaimed "confirmed"** labels, citation pointers (F-184, Glance run 3, named Watch replies) and the faith boundary wording were corrected.
