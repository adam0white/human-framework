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
