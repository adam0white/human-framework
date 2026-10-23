# Owner directions, 2026-10-18 (Adam, near-verbatim)

These apply to all HF games and to the framework. They add to the game direction in AGENTS.md.

## Experiments
- "I'm really open to anything, and especially multiple experiments though we shouldn't leave things half baked."
- "I'm even open to an eventual finding that HF isn't as useful as we hoped it would become." Record such findings honestly in docs/findings.md.

## Framework scope
- HF's no-quantification rule is confirmed: "We can't implement what we can't know, i.e. ruh. We may still be able to implement our understanding of things, as much as it reconciles with science and merges into HF."
- Science directions HF did not pursue are in scope, and so are capabilities HF doesn't support yet.
- Goal: "I really want the HF to become a one stop shop for many future games, which it already is becoming."

## Games
- A meaningful back story that immerses the player "without being too ambitious or away from reality". Story may be implied and alluded to rather than told.
- The feel of success and achievement for goals, while further complexity is revealed over time.
- Progressive disclosure and hands-on tutorials are in scope.
- "Delight with the UI, immerse with the story … and keep with the gameplay and progressive goals."
- "These are thoughts of mine and not necessarily the only good direction." Agents should bring their own taste.

## Difficulty
- "Naturally difficult games are fun, too, and we can always relax it later. The other way around is more troublesome as it feels like adding artificial difficulty." Start hard where the difficulty is natural, and tune it down later.

## 2026-10-19 (Adam, near-verbatim)
- Playtesters: "happy we found auto play testers that aren't easily satisfied." Keep them hard to please.
- Edges: "we should keep those edges a bit fun and slightly in our calculations." When playtesters push a game to unintended edges, make the edge playable and a little rewarding rather than only closing it; design and measure for it.
- Next games start from player psychology: "what players crave and what keeps them coming back for more, from the start." Open to "an unintended implied naughty edge in a normally innocent game". "With HF, we should be able to afford more open play."
- Wanted: a game that "ticks off all the checkbox of why ant colony simulation ones are irresistible."
- Recursive improvement: expand HF playtesters; open question whether HF designers or developers, or characters for the dev team, are "too much ouroboros".
- Revisit earlier experiments and games: bring them to the latest HF and apply what we learned to level them up.
- Natural difficulty first is confirmed.

## 2026-10-19, later (Adam, verbatim)

"Definitely the opt in extra telemetry (compressed) , with optional notes. And more regular telemetry. I like the idea of a lab dashboard, not as a facade UI toy but as something that helps you, play testers, me, or human visitors. I think we should find ways to benefit the entire lab from almost each specific feedback. I'll share my feedback as I play."

How this is read:
- This lifts the no-server-infrastructure rule for lab telemetry only: a Worker endpoint and R2 storage. It does not lift it for games themselves.
- Regular telemetry is anonymous and minimal. It sends no personal data and sets no cookies, and it honours Do Not Track and Global Privacy Control. Each data point is documented on a privacy note.
- Opt-in runs are compressed replays, optionally with a note. They are stored privately. They are not public.
- Each piece of feedback is triaged once and routed to every place it helps: a game fix, a lab-wide lesson, an HF request, or a calibration of the simulated playtesters.

## 2026-10-20 (Adam, verbatim)

"more games and more grandiose ideas, including starting to think about how we'll publish these more broadly, and ... how we may start earning some money from these without pushing too much."

How this is read: a plan, not a launch. Agents create no accounts and publish nowhere new without the owner; earning stays gentle (no ads during play, no dark patterns, nothing gambling-like) and faith stays gentle. The plan is [docs/lab/publishing-and-earning-2026-10-20.md](lab/publishing-and-earning-2026-10-20.md).

## 2026-10-20, later (Adam, verbatim)

"I like that we're settling a great deal of reusable things across games to evolve the game lab as a whole and keep quality improving. Starting with HF, of course, but also the lab approach itself, the auto play testers which is a great way to auto polish games, and Opus taste, a consistent design language."

How this is read: quality work should land once and reach every game. Four shared layers carry it: HF itself; the lab approach (ledger, lessons, routing); the auto playtesters, which every game's polish round uses; and one design language for clarity and look, kept by Opus review. The clarity checklist is [docs/lab/design-language.md](lab/design-language.md); the visual language stays in [docs/design-language.md](design-language.md).

The same day the owner reported, about The Valley (paraphrased by the coordinator, not verbatim): no idea what to do, what is clickable, which text matters, why actions are limited or what comes next; dates and key terms must stay English, while Turkish flavour is fine. The opt-in run upload was also refused as too complex or too large after a little play. The owner's verbatim words are ledger rows F-201..F-203.

## 2026-10-20, evening (Adam, verbatim)

"I've enjoyed many of our games. This is becoming a new obsession... I tend to be a patient gamer, moreso when I have a stake. I like that you're building better harnesses and procedures to satisfy the auto testers, but be aware of what I said about taste. Don't become bland and objective neutral just to satisfy everyone. It's okay to have slight controversies, for example on difficulty. The games where I look for a setting, a workaround, or even an accessibility toggle to make it easier, while feeling 'can't stop' even for the difficulty, tend to be the games that I enjoy thoroughly. Those reports were probably mine, too. Have a single list of games on human subdomain. I think it's time we rank them there, and then freeze some experiments that rank towards the bottom. We can also get cross-game feedback, like what type of future games fit well into our combination of demonstrated strengths. We can also start thinking about more complex UI and gameplay elements, now that the concepts have been proven."

How this is read:
- Testers are evidence, not the target. Taste governs: the [Taste section](lab/design-language.md#taste) of the clarity checklist. Keep edges, natural difficulty and slight controversy. "Can't stop even though it's hard" outranks smoothness.
- "Those reports were probably mine": the two newest notebook runs (Stairwell `r-4btpch9kdq`, Hearsay `r-qax48tk58y`) are owner runs, as the ledger already records (F-311..F-318). Earlier runs with no note or a stub note may be his too; they stay unattributed (not confirmed).
- One ranked list of games on human.adamwhite.work, at /games/: [ranking](lab/ranking-2026-10-20.md). The bottom of the ranking is frozen: still playable and listed as a frozen experiment, with no further work. The owner can unfreeze any of them.
- Cross-game feedback and the next steps in UI and gameplay: [strengths and next games](lab/strengths-and-next-games-2026-10-20.md).

## 2026-10-20, HF roadmap (Adam, verbatim)

"I also would like a cool roadmap for HF, and possibly an ideation consultation that only has the starting ambition and research and my directions without knowing the current state, so that we can push HF forward, instead of forgetting about it and delving into games."

How this is read: HF gets its own forward plan so that game work does not crowd it out. Three consultants read only the starting ambition, `research/` and these directions, then the proposals were reconciled with what exists. The roadmap is [hf-roadmap-2026-10-20.md](hf-roadmap-2026-10-20.md); it ends with a recommended next increment, which waits for the owner's approval.

## 2026-10-20, night (Adam, verbatim)

"Check this out: https://thenextweb.com/news/mit-claude-agents-virtual-island-play. Also check cloudflare blog post about Clairic. Programming is already going through a seismic shift and now we have more systems and types of models to think about. I think we can consider experimenting with more tools and approaches and demonstrations for our lab. ... latest AI driven development practices to keep up with the pace. I've heard some people are forgoing testing or CI entirely or partially to speed up iteration. I don't want to become a slow enterprise, but always an R&D lab with cool futuristic ideas."

The elision ("...") is the coordinator's, as received. How this is read: a scan and a set of proposals, not a launch. Agents create no accounts and publish nowhere new. Changes to the testing rule in AGENTS.md are a proposal for the owner. The scan, experiments and practice recommendation are [docs/lab/frontier-2026-10-20.md](lab/frontier-2026-10-20.md).

## 2026-10-20, HF next increment approved (Adam, verbatim)

"Sounds good and exciting to me. Keep pushing HF to new directions. It may become a game engine like standalone tool in the future or whatever we need to make more games"

The same evening, as an addition (Adam, verbatim): "2.x should be a good excuse to do a sweep on maintenance and code quality and better practices and refactors and removing depreciations."

How this is read: the recommended increment in [hf-roadmap-2026-10-20.md](hf-roadmap-2026-10-20.md) is approved. The Host kit ships first as a 2.x release and carries a maintenance sweep: an audit of `packages/human` (dead code, deprecated APIs, legacy shims, tangled modules, naming and docs, type strictness, test speed and duplication), then behaviour-preserving refactors with exact legacy continuation. A deprecated API is removed only where no released game pinning HF needs it; otherwise it keeps a deprecation note with a target version, or that game is upgraded. Then HF 2.10.0 / engine 2.10.0, *Word and witness*. The long-term direction, a game-engine-like standalone tool, is recorded as a long bet in the roadmap. Done is recorded in AGENTS.md.

## 2026-10-20, experiments budget (Adam, verbatim)

"Cool progress and good recommendations, keep going."

"Clef is cool, too. I approve $5 spend for experiments."

"And other small LLMs hosted on Workers AI"

How this is read: a further $5 of Workers AI spend for this round of lab experiments, on top of the $5 approved on 2026-10-18, with a hard cap per experiment and spend recorded in each write-up. The Clairic ledger triage widens into a bake-off: Clairic, Clef (Cloudflare's option-picking decision model) and a few small Workers AI LLMs, scored against the same hand labels. Small Workers AI models are a candidate LLM arm for the island pilot. Write-ups: [docs/lab/experiments/](lab/experiments/).

A further addition the same evening (Adam, verbatim): "Maintenance should include bringing deps to the latest, including compat_date. I'm open to seeing if we can migrate from wrangler to the new CF cli, too, abandoning wrangler json."

How this is read: in this repository only, the Host kit sweep also brings dependencies to their latest versions (majors where they work), including the Worker's `compatibility_date`, and checks whether Cloudflare's new CLI can replace wrangler and `wrangler.jsonc`; it migrates only if that CLI is ready, otherwise a note records the blocker and a target date. Game repositories run their own pass.

## 2026-10-20, testing lanes (Adam, verbatim)

After reading the testing/CI recommendation (keep CI; lanes by touched paths, strictest wins; deploy checks CI instead of re-running the suite; one full suite at a time; one worktree per agent):

> Cool progress and good recommendations, keep going.

Adopted as the lane model and the one-worktree-per-agent rule in AGENTS.md (Engineering rules) and [docs/lab/velocity-sweep-2026-10-20.md](lab/velocity-sweep-2026-10-20.md); measured for a week, to 2026-10-27.

## 2026-10-20, decisions approved (Adam, verbatim)

"Oh I thought we settled those decisions. Approve them. Do what you need on GitHub and PRs. Add those faculties and other feat to HF. Trim handoff and other documents. Use fewer reviews and focused/less tests."

How this is read, decision by decision:

1. `~/code/island` gets a private GitHub repository. Done: `adam0white/island`, private.
2. HF gets a curiosity and play faculty, plus bounded multi-step planning (roadmap §3b "Multi-step planning (bounded)", engine 2.12). The island pilot found that HF people do nothing once their needs are met, and that HF cannot value multi-step chains. This is the new bounded increment in AGENTS.md; the slice plan is in [hf-roadmap-2026-10-20.md](hf-roadmap-2026-10-20.md).
3. HANDOFF.md (40 KB) and other documents are trimmed to current state; release receipts and history move to [history.md](history.md) and linked files.
4. Fewer reviews and focused tests: the review and test rules in AGENTS.md (Engineering rules).
5. The archive Dependabot PR (PR 10) is closed and alerts 16 to 24 are dismissed as not used; `.github/dependabot.yml` excludes `archive/**`.

## 2026-10-22, player speed controls (Adam, verbatim)

> I saw your warning about time controls, and you're right. Not only that but I also see that some of my too specific wishes are also hurting the games. Change the time control direction to a general idea and a wish where it makes, but let's give it back to most of the games.

How this is read: automatic pacing is a general wish where it helps the flow. Most games keep player speed controls. Restore the swept games’ speed controls, including Stairwell with automatic pacing as its default. Keep helper popovers, optional end tallies and guarded until-next-event buttons.

## 2026-10-22, linked telemetry (Adam, verbatim)

> Let's change our approach to telemetry. I think we can benefit greatly from however much we can collect. Default to on, connect every piece together, including logs from a player and their saves and runs and linking all together for complete signals. The saves screen can be about sending feedback since we'll have their runs automatically.

How this is read: replace the default-off full-run path with default-on private linked collection of play events, game logs, saves and replay exports. Join records by random player, session and run ids. Keep an off control, respect DNT/GPC unless explicitly overridden per game, and show a first-visit notice. Feedback remains an explicit send. This increment supplies collection and inbox plumbing; game-specific save-screen redesign follows in each game's own work. The shared identity page links approved game origins when browser storage permits it; fallback ids remain origin-scoped. Retain private linked records and runs for 180 days. Player character analysis remains a separate opt-in, as approved on 2026-10-21. See [privacy](lab/privacy.md) and [linked telemetry](lab/linked-telemetry-2026-10-22.md).

## 2026-10-23, One cast approved (Adam, verbatim)

> The universe plan seems solid, proceed please. We don't need to limit it to just one probe. One idea is to sync a persona between games as the user moves between them.

> This might even simplify our simulations for players who play more than 1 game. We'll have less personas in total.

How this is read: implement [the approved universe plan](lab/hf-universe-plan-2026-10-23.md) as a first wave of modern connections: Pass Zeynep to Good Hands, Murmur Dilan to Hearsay, Stairwell Derya to a nurse contact, and Voice Selin to a Good Hands enquiry. Prefer one canonical recurring person across games where era, age, place and role reconcile. Record each canonical fact and its source in [the cast registry](lab/cast-registry.md). If live facts conflict, use a new content/rules edition with exact legacy continuation or retain distinct identities with the reason recorded. Each player has one branch per person.

After persona continuity is enabled, games checkpoint the approved projection on visibility hidden, pagehide and chapter boundaries. Another admitting game takes that pinned revision when opening a fresh run. Existing loaded runs never change underneath the player. Parent checks occur in one IndexedDB transaction, with explicit forks on conflict and no timestamp merging. Fresh play remains available. Historical recording-linkage consent applies only when the recording identity changes. Keep the shelf local to this browser on human.adamwhite.work through the existing bridge frame. Cross-device sync and all new server infrastructure require a separate owner decision. Small Works, Neighbours and Rope remain frozen. Faith stays a quiet background. The completion criteria are in AGENTS.md. Owner play and acceptance review: 2026-11-03.

## 2026-10-23, cast size and between-games life (Adam, verbatim)

> We can forgo old save compatibility altogether for now. I think having less maintained personas in total will allow us to invest more resources into their back stories. And playing a given game gets you to acquaint a persona, which will be a huge 3rd wall breaker once you see them on your next game. One device sync is perfectly fine for this for now. Even frozen games are a fair game for this. HF universe will be an interesting twist. A group of people simulated living across games within your browser is also a great idea. So how many foreground people will we have across the games? Let's keep that number intentional, including our play tester and designer and whatever else personas.

Source: owner message to the cast director, 2026-10-23. The coordinator’s relay in `~/code/.lab-scratch/universe/lead-note.md`, OWNER DIRECTIONS, includes the same direction with opening and closing greetings.

This supersedes the old-game-save compatibility and frozen-host restrictions above for this increment. Old game saves and replay exports may be refused with a clear start-fresh message. Current-version exports still replay deterministically from pinned initial state. HF engine/API opt-in and determinism requirements remain. Small Works, Neighbours and Rope may be recast and connected. One-device browser storage is accepted. No new server is authorized. Selin’s owed fasts travel as her quiet held understanding through an explicit calendar mapping; they never gate transfer or become a score.

Coordinator defaults, subject to newer owner words: 40 canonical foreground people across all 15 games including Commonstead; 3–8 per game; most recur in at least two games. Wider crowds stay generated background. The lab uses 12 standing playtesters plus two newly cold testers per round and three standing designer/reviewer personas. That is 17 roles per round: 15 standing identities and two rotating identities, because reused testers would cease to be cold. These numbers are the coordinator’s proposal, not a verbatim numeric choice by the owner.

Build substantial biographies and an exhaustive old-character mapping. Panelists keep diaries across games, remain cold to each new game, and submit as `playtester <name>`. Build seeded deterministic bounded shelf life computed on return from elapsed real time. Preserve loaded runs, explicit conflict forks, fresh play and recording-linkage privacy. Release the next HF minor and adopt across every game. Completion and owner acceptance are recorded in AGENTS.md. Do recording, cast and panel now; hold package/bridge work and game worker launches until PID 46230 exits, then read the One cast lead’s final report.
