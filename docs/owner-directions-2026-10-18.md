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

How this is read: the recommended increment in [hf-roadmap-2026-10-20.md](hf-roadmap-2026-10-20.md) is approved. The Host kit ships first as a 2.x release and carries a maintenance sweep: an audit of `packages/human` (dead code, deprecated APIs, legacy shims, tangled modules, naming and docs, type strictness, test speed and duplication), then behaviour-preserving refactors with exact legacy continuation. A deprecated API is removed only where no released game pinning HF needs it; otherwise it keeps a deprecation note with a target version, or that game is upgraded. Then HF 2.10.0 / engine 2.10.0, _Word and witness_. The long-term direction, a game-engine-like standalone tool, is recorded as a long bet in the roadmap. Done is recorded in AGENTS.md.

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

## 2026-10-23, bugs and friends playtesting (Adam, verbatim)

> I'm excited to play all the games soon, and I think I'll hire some friends to playtest as well. The lab is becoming more fun every day; we just gotta find & squash those nasty bugs across games

Source: owner message to the bug-hunt coordinator, 2026-10-23.

Use linked telemetry, the 2026-10-23 playtest round and a fresh live smoke at 360×690 and 1280×800. Keep one public bug list in [bugs-2026-10-23.md](lab/bugs-2026-10-23.md). Fix confirmed bugs without redesign or softened difficulty. Old saves need not load. Use at most two game workers, each in its own worktree, and wait for any existing writer in that repo. Each fix gets focused proof where possible, one independent Codex review, signed commits, lane checks, rebased push, exact green CI, deployment and live verification. Add a short How to playtest page linked from the lab. Consolidate ledger routes and deploy the HF site with a matching clean release manifest. Owner acceptance of the games remains separate.


## 2026-10-23 frictionless recording and feedback (Adam, verbatim)

> Why can't we make linking and all that automatic? We already notify at first visit that we're gonna record stuff. I want to make it as frictionless as possible. Hit send feedback, type something, agree to share everything if not agreed before, submit. My mobile firefox, I'm unable to enable recording. And "enable recording even though your do not track is on" being a separate button is just wrong.

Owner implementation direction: first-visit notice covers recording and automatic linking across games on this device. There is no separate continuing-person consent or gate, including after recording identity changes or file imports. One menu recording switch explicitly opts in even with DNT/GPC, which only sets the default off. Send word has verdict, note, optional name and Submit on one page. When recording is off, one unticked checkbox says “Share this run and my play with the lab”. Submit with the box ticked enables recording and linking and sends the run. Unticked Submit sends the note alone without linkage. Old separate consent state migrates silently. Character analysis retains its separate opt-in.


## 2026-10-24 — Simplify the games (Adam, verbatim)

Wife doesn't like reading, especially in English, so we lost her as a gamer already lol. We may never be able to cater to her. When she plays some games, they're like tiny puzzles for kids and stuff like that.
Noting down some feedback from first BIL player, Safari on iPad. Do we already receive his logs?
Some sentences are difficult to understand, like "20 minutes for a plate" isn't interpreted as meal break. He also disliked that the games cater to Turkish culture with some Turkish words. I never asked for this, I think we can target a more HN friendly culture for English speaking world. Though let's discuss this first, since kapıcı and whatnot may not translate immediately, and I like that we have a specific taste.
iPad serves mobile version I think, which has tiny text. We don't need to think about every device, but we can have a more dynamic approach to the UI. We don't need branch protection.
He tried and quit Pass and the two voices because of the same issue, it felt like reading broken sentences. He's studying at university and reading a lot of books. Yet he disliked that it's difficult to understand. I had the same thing but couldn't name it. I don't think our games are ready for more eyes yet.
It appears that you can't find some of the issues by yourself without me specifically naming them. The lab notice appears in every game. Turning continuity off, begin without carrying history, seed, verify, even import, these are useless or too much to throw at the player. We need to simplify, a lot. I was hoping we could have a much better experience by just doing a lot of automated play tests. "Send word" why do we overcomplicate everything? Just say feedback.
On the Ramadan game, for example, menu has tons of options. All increases cognitive load, new topics and concepts for the player they don't even need to know at all. I'm asking for background, opinionated auto decision on a lot of these. The difficulty of the English appears across games. I don't know if it's because of a claimed taste or consistent design, but it makes things harder to understand. Minor thing, also work on the artwork on the list of all games. Change the one for the Rope, it seems like a hanging man.

Commonstead branch protection is dropped. Friends’ playtests and Show HN are paused until Adam says the games are ready. The later setting direction below resolves the vocabulary discussion; places, names and setting remain. F-491 remains mandatory: automatic recording linkage follows the recording switch; feedback stays on one page with optional sharing when recording is off.


## 2026-10-24 — Keep the setting (Adam, verbatim)

> Yes keep the setting, fix and cater it better.

Keep setting, places and personal names; make every sentence understandable without Turkish; translate common nouns; introduce the building’s caretaker in English and later use caretaker; retain at most two explained flavour words per game; keep faith quiet and sourced from research/; preserve meaning, rules and difficulty. This is a copy pass. Friends’ playtests and Show HN remain paused pending Adam’s readiness decision.

## 2026-10-25 — Push HF and use every allowance (Adam, verbatim)

> "codex reset its own limits, which we means we got a fresh week, as well as a banked reset expiring Oct 29th. Let's utilize codex abundantly."

> "I think we can keep pushing HF further, especially with codex tokens. Keep using our allowance across codex, Claude, and workers AI every heartbeat"

Coordinator reading: the heartbeat keeps work in flight instead of only checking. Codex workers build HF roadmap items (soonest targets first) and game fixes, one writer per repo, HF releases serialized. Claude does reading, taste and audits. Workers AI spends its daily free allowance on playtesters. The 5 GB disk guard and the existing review, test and release rules still apply.

## 2026-10-25 — HF v3 and a codebase-wide sweep (Adam, verbatim)

> "I think HF horizon 2 is almost done, and even some things from horizon 3 are partially addressed. Well this is exciting. Today, let's keep implementing and verifying everything that is on the HF roadmap, with some Claude and many Codex. Keep on checking and pushing things on your hourly heartbeats. Get things reviewed. As part of v3, we should upgrade all dependencies and compat_date and clean up deprecated methods. Do a codebase wide cleaning, maintenance, and best practices and whatever else sweep. We don't need to limit to the roadmap, we can address stuff play testers asked for and improvements. Let's go."

> "Yeah, but we can include the horizon 3 goals into this, too."

## 2026-10-25 — Everything remaining (Adam, verbatim)

> "Let's address everything remaining from all horizons and roadmap, and update docs, websites, games and whatnot."

Coordinator reading: the v3 increment widens from Horizon 2 closure and Horizon 3 first experiments to every open item. That covers Horizons 1–3 of the HF roadmap, docs/roadmap.md, and each game's Deferred list. Each item is implemented, or recorded with a reason and a dated target. Items stay recorded only where they need owner or player input (player rounds and Show HN stay paused) or where a guardrail excludes them. Docs, the HF site, game sites and READMEs are brought up to date with what shipped. The guardrails, faith rules, review, test and release rules still apply.

## 2026-10-25 — Finish everything, and four decisions (Adam, verbatim)

> "TypeScript 5? What about 7? Keep going until you finish all the tasks and playtests and iterations. It's okay to take some time. If there are things that need my decision, ask now."

Answers to the coordinator's questions (the option labels the owner chose):
- Playtests: **"Lab panel only"**. Rounds resume with the 12 standing playtesters and 2 cold slots (Codex, Claude and Workers AI personas) on every game, and the games iterate on what they say. Friends' playtests and Show HN stay paused.
- Player labels: **"Add it in Feedback"**. Two quiet choices, "I'm stopping" and "I'm confused", sit inside the existing Feedback menu. They are recorded with the run while recording is on. Nothing pops up during play.
- Lab client on npm: **"Keep artifacts"**. The lab client and kit stay GitHub release artifacts. The Deferred items that ask for the npm install close as not needed.
- TypeScript 5 consumers: **"TypeScript 7+ only"**. The README states that the package needs TypeScript 7 or later, and the TS 5.x roadmap row closes. The repo is already on TypeScript 7.0.2, the current release.

Coordinator reading of "finish … playtests and iterations": each game gets a lab-panel round on its HF 3.0 build. Fixes from that round follow, then a retest by the same testers. A game is finished when a retest raises no new blocking ask, or after two iterations, with what remains recorded in the game's Deferred list with a date.

## 2026-10-26 — pnpm and a shared store (Adam, verbatim)

> Thanks, keep going. A codex thread checking for redundant storage space found (with my prompt though) that HF games repos can save some space.
> For HF, use pnpm with Node and a shared store on the internal drive. We measured roughly 2.5 GiB of redundant identical workerd binaries. The HF thread can test the actual savings before other repositories adopt it.
> Test, switch, and let me know. I'm open to switching to bun instead as well, if it performs and saves better.

## 2026-10-26 — cf CLI instead of Wrangler (Adam, verbatim)

> "Yeah, and cf cli instead of wrangler + wrangler.json, too. Worth experimenting and probably switching."

Trial HF first. Merge after the package-manager switch. Switch deployment only after resolved config and upload-manifest equivalence, exact green CI and the Voice deployment hold permit it. A proven beta gap keeps Wrangler with a dated re-check.

## 2026-10-26 — tsrs trial (Adam, verbatim)

> "I've also heard about now-Cloudflare-owned tsrs experiment for ts compiler, and we can check that, too."

Trial result: wait, re-check 2026-11-09. tsrs `0.18.0-ts7.1.0-dev.20260929` halved the full HF typecheck (3.6 s to 1.7 s cold) with about a third of the memory, but its process exit codes differed from tsc on injected errors. tsc stays the gate.

## 2026-10-26 — Bold: new games, HF further, pnpm everywhere (Adam, verbatim)

> "Alright, good progress, thanks. Now, Claude limits reset Tuesday 2 am, so we have a little more than 24 hours to spend about 40% of our weekly limits. Good job on spending Codex, I reset it, too. So let's be bold and abundant, including some Fable and Astra consults and light reviews for good measure. Is it time to get another game or four, now that the existing ones have been polished greatly? Let's go bold. Push HF further, too. Maybe it's time to push our own limits, like a faith themed game, or an action type one? What's that question for me? We should cleanly move everything under your control to pnpm and possibly a shared node, sure. Enable pnpm specific best practices, too, unless you think we should switch to bun in the near future. If there are your folders under code that aren't on GitHub, either clean up properly or push them too. Anything else from me right now?"

Coordinator reading, acted on now: spend Claude abundantly until the Tuesday 02:00 reset (Fable and Opus subagents, plus Astra as `gpt-6-astra` through Codex) on new-game concepts, HF horizon consults and light reviews. Move every lab-controlled repo to pnpm with HF's settings, one at a time, skipping games whose playtest round is open until it closes. "Shared node" is read as one pinned Node version across repos (pnpm-managed runtime where it works), not per-repo installs. Stay on pnpm; bun is not planned. Clean up or push lab folders under `~/code`; the owner's personal repos are left alone.

Both lifts were then granted for one game each (answers below).

Owner answers, 2026-10-26 (to the coordinator's three questions):
- Faith-themed game, lift "Games keep faith gentle" for one game: **"Yes, for one game"**.
- Action game, lift "no action-game polish, real-time graphics" for one game: **"Yes, for one game"**.
- New games before the 2026-11-03 review: **"Up to 4, added (Recommended)"**: build every concept that passes review, on top of the current goal; playtests of the existing 15 keep priority.

## 2026-10-26 — New approaches for new games (Adam, verbatim)

> "I'm open to new approaches as well, like using a different coding language or a technology or tool to build the game. Many of our games have been looking similar so far. And some are more like simulations than games anyway."

Coordinator reading: new games may use another language, engine or tool (for example Godot web export, Rust and WASM, PixiJS or WebGL, a text engine), as long as HF stays the actor engine through a JS or WASM bridge with no framework logic in the game. Each new game must be a game, with a goal, stakes, failure and decisions with tension, and must look different from the existing 15.

## 2026-10-26 — HF 4.0: everything on, holistic, bolder games (Adam, verbatim)

> "Catching up. Juicy! Let's make every opt in feature default v4 go! Sacrifice compatibility and saves. Shall we even make everything permanently on, like you can't turn it off, so every persona stays holistic? It's okay if we leave some games on older HF versions. The separate fast option or others may cause problems, we should consolidate and eliminate redundancy in the input/output, features and code across HF itself. I like the boldness with tech, like Godot and ink. I like that we're making sure to not quantity faith, but it might be okay to have a goal about it, you know? Otherwise we can't make faith the stakes in anywhere and then it stays internal. My vision for HF is to reconcile faith and science and have a holistic simulation that handles both, letting anything affect anything. I like that the new games wanted to push HF forward, exposing weaknesses and missing features. We don't need to keep cutting death from games. I wonder which of our limitations like this are holding us back. I think our simple English rule should change alder Quay name altogether lol. We can shovel those features for HF from games into HF. Okay, good progress so far, let's keep going. It sounds like we're finally pushing things bolder and further, we'll see if the games prove that."

Coordinator reading, acted on now:
- **HF 4.0 is one holistic person.** Every opt-in faculty is on, permanently: the `enable*` switches, legacy-continuation paths and the separate fast option are removed, and HF's inputs, outputs, features and code are consolidated so each concern has one way in and one way out. Coordinator answer to "permanently on": yes. People differ through their state (someone may hold faith lightly, tire slowly, or never have learned a method), never through switches. Hosts still choose what they show and what they feed in. Old saves, old exports and 3.x compatibility are given up at 4.0; games may stay on 3.x until they choose to move. Cost, stated once: a game on 4.0 can no longer turn off a faculty that misbehaves in its setting, so such a problem is fixed in HF itself.
- **Game asks go into HF.** HF requests from the new games (fiction context, retelling drift, fatigue in being downed, and others in the coordination file) are built into 4.0 as ordinary faculties, not opt-ins.
- **Faith may be a goal and a stake.** A game may set a goal about faith and let the player fail it: keeping a prayer, a fast, a vow or a duty to the dead under pressure. The rules against computing divine acceptance, putting quantities on the ruh and stating rulings still hold, and claims are still sourced from `research/`. HF's aim is a holistic simulation that reconciles faith and science, in which anything can affect anything.
- **Death is allowed in games again** where the design needs it. The coordinator's earlier "no canonical death" ruling for Smoke on the Stairs is withdrawn.
- **Alder Quay gets a plain name** under the plain-English rule, applied in each game at its next build after any open playtest round closes.
- **Limits review.** The lab's standing limits (rules, rulings and habits) are audited for which ones hold the games and HF back, with a keep, change or drop recommendation for each.

Sent with it (Adam, verbatim): "I think as HF moves major versions, we can shed some rules and clean up agents.md and other files, too."

Coordinator reading: at 4.0, AGENTS.md and the other instruction files are slimmed. Rules made obsolete by the removal of opt-ins and legacy continuation are dropped, history moves to `docs/history.md`, and a short set of binding rules stays.

## 2026-10-26 — Godot, the five limits, daily clock, useless tests (Adam, verbatim)

> "Let's have one godot game for the learnings and limitations it'll bring into the lab. What about unity? Yes to 1, 2, 3, 4. 5, too; as in we can choose to lift it whenever we want and upgrade/update them, too. Larger clock such as daily mode would unlock new paths for us. Get rid of useless tests as well; such as ruh number checker; it's not the end of the world and we would fix it once we see it."

The five were the coordinator's questions from the limits audit (`~/code/.lab-scratch/hf4/limits-audit.md`): (1) faith may be a theme, goal or stake in any game; (2) only unexplained flavour words count against plain English; (3) names that are hard to read get plain names generally; (4) the action-game polish rule is dropped; (5) frozen games (Small Works, Neighbours, Rope) may be unfrozen and updated whenever the work needs it.

Coordinator reading: one new game is built in Godot (web export) for what it teaches the lab, despite the measured 10 MB and slow phone load; the load time is a finding to record, not a reason to stop. Unity is not planned: its web builds are larger and slower to start than Godot's, its runtime is closed source under a commercial licence, and bridging HF into C# in the browser is awkward; Godot already covers the "real engine" lesson. HF 4.0 keeps a daily clock as a first-class larger step alongside the fine clock. Tests that only guard against an unlikely mistake (such as a check that no ruh number exists) are deleted; such a mistake is fixed when seen. AGENTS.md was slimmed to the binding rules in the same change.

## 2026-10-26 — Next games are classics with HF baked in (Adam, verbatim)

> "Cool, thanks. Keep iterating and building. Once we have HF v4.x with planned new faculties folded in and most of the games migrated into it, and when it's time to think about next set of new games, I'd like to hold off on finding new ideas, and instead visiting classics, or known game categories/types. to simply rebuild replicas with HF baked in. That will be an interesting idea as well; since HF itself is interesting, we may not need to invent a new game to show its strengths."

Coordinator reading: the current new-games increment (four games plus the Godot game, The Left Hand) finishes as planned. After HF 4.x carries the planned faculties and most games run on it, the next set of games rebuilds classics or well-known game types with HF people inside, instead of new concepts. Recorded in [the roadmap](roadmap.md), section 4.

## 2026-10-26 — Big picture: taste, named design approaches, categories (Adam, verbatim)

> "Stepping back to check the big picture here. There's a real case on catering these games more to LLMs lol. Built by and for LLMs, almost. I yield that my interest faded a bit, hence I'm not playing a lot here. But however sparse, my attention and time here will be worthwhile. And then I plan to bring more friends to test select games. And I think the main benefit from show HN will be getting actual, human feedback.
> But we didn't deviate much from my original idea and I keep steering us back towards achieving it fully. I really love that a large project like this, let alone with multiple games, would not be feasible at all just a few months ago. I have you to thank for it.
> It appears so that the main thing that's still difficult to land with games is taste and feel. Which makes sense. I don't mean to say that we are not onto a good thing here, cause what we do is great and it matters. I do like that we have a consistent design language across games. However, that itself might be one of the things that's setting us back. Now that our designers are HF personas, I'd like to explore if we could have a few persistent design approaches across games. These should be named, carefully chosen, and even follow the footsteps of great games and game devs. Also, this, and maybe categorization can help us better showcase the list of games we have, instead of a single list of 20+ things to look at. This can be done post v4, in parallel with expanding to known types of games and some targeted classics."

Coordinator reading: after HF 4.x, alongside the classics work, the lab defines a few named design approaches, each modelled on great games and their makers, held by designer personas across games; each game is assigned one. The games list on the site is grouped into categories instead of one flat list. Human feedback (owner, friends on selected games, later Show HN) is the taste signal that LLM testers cannot supply; the lab panel stays a bug and clarity filter. Recorded in [the roadmap](roadmap.md), section 4.

## 2026-10-26 — Agents record too; dev cleanup before playtests (Adam, verbatim)

> "Wait, why do your agents need to block recording? Wasn't getting more data from them the whole point? Yes, I'm okay with default-on recording and linking all the things. Keep friends paused. It looks like we have quite a few tasks building up, even some for post-v4, let's lean more on the dev side to clean all that up nicely, holding play testers tokens as secondary to that."

Coordinator reading: agent players (panel, cold plays, bots, verification runs) leave recording and linking on, as any player would; where the lab can label a record as an agent run, they set that label so human records stay separable. Blocking the lab API in harness runs ends. Friends' playtests stay paused. Allowance order: development work (HF 4.0, game fixes, the roadmap backlog, post-v4 preparation) comes first; panel and playtester runs use what remains.

## 2026-10-27 — Pause Codex; use Claude liberally (Adam, verbatim)

> "Alright, once the current codex runners come back, stop codex usage until further notice. However, we have much Claude usage left expiring at 2 am today. Use those liberally"

Coordinator reading: Codex runs already in flight finish; no new Codex processes start until the owner lifts the pause. Claude subagents take building, reviews and play in the meantime, under the same delivery rules (one worktree per agent, check:lane, signed commits, one independent review, exact green CI before deploy). "2 am today" is read as Central time, 2026-10-27 07:00 UTC.

## 2026-10-27 — Bold classic names; proposals on the decision desk (Adam, verbatim)

> "I like the approaches and direction so far. I mean, it sounds good on paper, gotta see it. I think we can approach our classic redos with a bold approach, such as "Orion Trail" (I see this one wasn't picked though). No one is gonna sue us for some rip offs of nostalgia. Instead of an md file, reuse decisions artifact to propose for me to review. I ain't gonna answer the current pending decisions anyway. I'm reading through your other messages in the meantime"

Coordinator reading: the named approaches and categories are accepted in direction; the owner judges them by playing a probe. Classic rebuilds may carry bold parody titles that openly nod to the original. Proposals for owner review go on the decision-desk artifact, not in markdown files. The pending desk slips (easier opt-ins, Othram IP) stop waiting: the opt-ins stay as built, and outside publishing stays paused until the owner checks the IP question. The wagon trail is on the shortlist in both drafts; "Orion Trail" itself is an existing game, so ours gets its own title.

## 2026-10-27 — Thaw games; analytics everywhere; difficulty aim approved (Adam, verbatim)

> "We can thaw games. Love the upcoming reorg of games. Oh wagon trail is much better lol. I like your difficulty aim. Allow cloudflare analytics everywhere, whitelist or whatever. I'll check your decisions deck now. Can't wait for you to push the rest of the work out and then play test them!"

Coordinator reading: Small Works, Neighbours and The Rope are no longer frozen; they take ordinary work like any game. The wagon trail is the first classic. The difficulty aim (careless play loses well over half the time; careless spam costs something visible) stands across games. Every site on `adamwhite.work`, central and each game, loads Cloudflare Web Analytics: its CSP allows `https://static.cloudflareinsights.com` in `script-src` and `https://cloudflareinsights.com` in `connect-src`. Then the in-flight fixes ship and go to the panel.

## 2026-10-27 — Decision desk: approaches, categories, first classic (Adam, verbatim)

Answers on the decision desk, 03:28–03:33 UTC:

- **Approach set:** adopt all four (Chronicle, Inner Voice, Desk, Clock).
- **Reach:** the whole game (type, palette, renderer, menu and title card).
- **Probe:** none; move all games after 4.x. Note: "Only one way forward, no easy exit! "
- **Site categories:** adopt the five (Keep a village, Live one life, Read people, Against the clock, Make the journey).
- **First classic:** the wagon trail. Note: "Now that I think this through, the other 5 will be too difficult or involved to pull off nicely. They're classics because they have been carefully balanced and polished; we can't replicate that easily. Oregon Trail is maybe an easier one to attempt. "

Coordinator reading: after HF 4.x, every game moves to its named approach in full, with no probe pair first. The site groups games into the five categories. The wagon trail is the only classic planned; the other five shortlisted classics are dropped.

## 2026-10-27 — HF 4.0 scope rulings approved (Adam, verbatim)

> "All good decisions (codex to 4.1, delete code, allow difference), keep going."

Approves the coordinator's HF 4.0 rulings: the Codex additions (portable admission beyond an explicit rejection, the JSON wire adapter, the settlement ledger and the tuning surface) move to 4.1; legacy 3.x code, tests and examples are deleted rather than ported; continuous fields may differ within 1e-9 across chunking while clocks, counters, RNG and event order stay exact.

## 2026-10-27 — Soft stop on new Claude agents (Adam, verbatim)

> "Alright let's soft stop launching new Claude agents as well. Thanks"

Coordinator reading: no new Claude agents start. Agents already running finish their current task at a clean checkpoint and do not fan out further. Heartbeats keep doing the checks, the coordinator's own deploys and the report. Codex stays paused.

## 2026-10-27 — Finish HF 4.0 despite the soft stop (Adam, verbatim)

> "Let's resume the hf4 agent to let it run reviewers and fully finish the v4 work"

Coordinator reading: the soft stop on new Claude agents is lifted for HF 4.0 only. The HF 4.0 lead may start the two release reviewers and per-game migration builders, and carries 4.0 to its done-means: release, docs and site, and every game moved to 4.0 or recorded as staying on 3.x. Everything else stays under the soft stop.

## 2026-10-27 — Abolish feature flags; automatic carryover (Adam, verbatim)

> "Okay why the carryover isn't public, and what other features are we holding behind the flag? I thought we would use the flag only for a few basic, permanently testing-only things; I never imagined it to become a feature flag for actual features being held back. I think this is hurting the dev process. Convince me otherwise. Jokes are fine."

> "Well we need much more automatic carryover. You see, a lot of the things are basically opinionated decisions we make and enforce. Lab is giving a way out on those and others, just for debugging.
> I don't understand why we can't make it automatic to simply carryover people across the games, the personas that exist on multiple games. The cast controls and more precise persona experiments, some intentionally picked ones, can be exposed on the public personas page where it lists from your browser, the shelf which is public and central. I like your suggestion, but let's go further. Abolish flags altogether. Whatever we need must be public. Hide some needed features by lab into a small, always collapsed "Debug" menu at the bottom of the menus. Not even an extra line, same line with lab privacy. However, we still need to be careful of the scope of extra things we offer there. Move cast controls to the shelf. I'd like to experiment with offering that at the end screen of games: it's a natural stopping point, an option to move a character you know into another game or two would keep the player hooked. The pace and extra speed controls; if your testers need them, the players do too. We can bring them back for those games. The why's can be extra I buttons after their source, not on a new line by themselves.
> Once we confirm this direction is working, we'll remove the mentions of a lab flag or any query string altogether, keeping history in agents and other popular MD files isn't a good idea. I'll let you know once soft stops are lifted. For now, focus on making sure to not lose tasks, and finishing v4 properly. Thanks"

Coordinator reading:
- No feature flags and no query-string switches. Every gameplay feature is public.
- People who appear in more than one game carry over automatically, with no opt-in.
- Cast controls and chosen persona experiments move to the public, central shelf (the personas page that lists people from this browser).
- Experiment: the end screen of each game offers to move a known person into one or two other games.
- Pace and speed controls come back for players in the games where testers use them.
- The "why" explanations become small "i" buttons right after the thing they explain, not on a line of their own.
- The few diagnostics that are still needed (export, verify, import, seed, replay, error detail) sit in an always-collapsed "Debug" item on the same line as Lab privacy, at the bottom of the menus. Keep that list small.
- Left Hand F-1631: a joke reply is approved.
- After the direction is confirmed, remove every mention of the lab flag and query strings from AGENTS.md and other widely read docs.
- The work waits for the soft stop to lift; until then, keep the task list whole and finish HF 4.0.

## 2026-10-27 — Codex limit lifted; natural death kept (Adam, verbatim)

> "Codex limit is lifted fully. Go back to your original vision of running many of them in parallel in order to speed up the progress here. Yes death from natural causes can give a story stakes. Keep that seed so we track what happens. Codex PR reviewers should also work now. I'd get reviews and fixes on your merger v4 work, just so we're safe."

Coordinator reading: Codex runs many workers in parallel again; Claude stays at one agent. Always-on old-age death in 4.0 is accepted, including an authored grandparent in What the Child Saw dying before the child is grown; the seeds where it happens are kept and tracked. The merged HF 4.0 work gets Codex PR reviews and an independent Codex review, and its findings are fixed.

## 2026-10-27 — Every game on 4.x, one game at a time (Adam, verbatim)

> "Cool thanks, keep going. I'd like all games to work 1:1 on improving HF for their needs so everyone can upgrade to v4 properly without compromising much. Eventually."

Coordinator reading: staying on 3.x is no longer an end state. Each game works with HF, one game at a time, to name what it needs from 4.x; HF gains those as ordinary faculties or fixes, and the game then moves to 4.x with little compromise. This changes the 4.0 done-means clause "each existing game on 4.0 or recorded as staying on 3.x with a reason": a recorded reason now becomes a list of HF needs with targets, and the end point is every game on 4.x.

## 2026-10-27 — Cheaper models for speed: Terra 6.1 and Sonnet 5.5 (Adam, verbatim)

> "Just like how we sporadically get Fable or Astra reviews, it's also fair to sometimes use chatgpt's new Terra 6.1 and your Sonnet 5.5 for speedier work. These shouldn't count towards your agents limit as these are cheaper. I'd welcome some experiments about how these compare as a code reviewer, documentation writer, play tester, easy implementation dev. This way we can go both faster and further with existing allowance."

Coordinator reading: `gpt-6.1-terra` (through `codex exec -m`) and Claude Sonnet 5.5 may be used for faster work and do not count toward the agent limit. A first experiment compares them on four roles with identical packets and known answers; results go to `docs/lab/experiments/model-roles-2026-10-27.md`.

## 2026-10-27 — Workers AI for games first; reading sweep (Adam, verbatim)

> "No need to have a split or precise calculation. I'm not sure of the benefit of the free-text; though I allow it since it's an experiment anyway. What value were we able to extract so far from the free WAI testers? I guess you can set a scheduled reminder for yourself to spend the remaining amount every day an hour before experimentation; that way games can be allowed to spend it fully, and you'll always finish the quota every day."

> "The safety gap can also be shrank much more, by just reconciling our historical calculated usage so far with the actual usage."

> "That's what I thought. The free quota isn't enough for a full play tester session, but can be a useful addition to enrich the games themselves. 23:50 may not give a model enough time to spend it all. I guess we can allow more tokens to a focused set of play testers, that way they'll be able to finish the task fully. I'm okay to switching it to more useful jobs such as reading, yeah. Make sure your terra/sonnet instruction is visible to the Opus and Sol agents you launch as well, so they can also choose those for their subagents."

Coordinator reading: games may spend the free Workers AI pool during the day with no reserved split. The daily run moves from hourly to once a day at 16:00 America/Chicago, so it has several hours before the 00:00 UTC reset. It spends the remainder on reading jobs (plain-English checks of on-screen text, inbox triage) and on a few focused testers given enough budget to finish. The safety margin is set from a reconciliation of local and Cloudflare usage. Free-text stays an experiment. Of 28 tester sessions from 10-23 to 10-27, none completed. The model-choice rule goes in AGENTS.md and in the rule every brief includes.

## 2026-10-27 — Pre-generated wording variants (Adam, verbatim)

> "Yes. pre-generate only seems enough and a good direction."

Coordinator reading: the question was whether Workers AI should vary persona replies and narration. The daily sweep pre-generates wording variants for persona lines and narration templates. Each variant is reviewed against the plain-English guide, the cast registry and the faith rules, then committed as game data. HF picks a variant with its seeded RNG, so exports replay exactly and players cost nothing. No live in-game rewriting.

## 2026-10-28 — Spend the Codex week; fewer reviews, combined PRs (Adam, verbatim)

> "Just a reminder that we have 25% of weekly limits left in Codex. The reset is coming around midnight PST. I'd appreciate it if you can actually exhaust the limits by then, then still keep going with your regular good pace afterwards. I think having less code reviews and combining PRs and addressing work together in one coding sessions and whatever else are good ways to speed up and parallelize work here."

Coordinator reading: before a Codex reset, launch enough parallel workers to use the remaining allowance. Each worker combines related work into one session and one PR per repo. Game work takes one hosted Codex review per PR; behaviour-changing HF releases keep their two reviews.

## 2026-10-30 — Billing waits for reset; panels resume lightly; Claude-first until Tuesday; scratch is disposable (Adam, verbatim)

> "No need for actions until they reset. Panels can resume lightly. Claude has more usage than Codex until Tuesday. I don't care about the lab scratch, we can evaluate and fully clean up the entire folder. Cool progress, keep going. I'll try to play and give more feedback soon."

Coordinator reading:

- **Billing:** no change to GitHub Actions billing, and the private repos stay private. Small Works and Commonstead wait for the Actions allowance to reset, then their CI reruns. The recheck is 2026-11-01.
- **Panels:** lab panels resume at a light pace, with a small round per game and retests only where a round raised a blocking ask.
- **Allowance:** until Tuesday 2026-11-03, Claude subagents take more of the build work and Codex takes less. Sonnet handles bounded work, and Opus handles hard work and reviews.
- **Scratch:** `~/code/.lab-scratch` is disposable. It is evaluated and cleaned up, keeping only what running workers and the heartbeat need.

## 2026-10-30 — Delete bloated tests (Adam, verbatim)

> "Deleting tests is fine, too. I'm sure there's some bloat."

Coordinator reading: Tests that restate code, duplicate another test or form a matrix may go; keep replay-hash and one control per faculty.

## 2026-10-31 — Brake on Claude (Adam, verbatim)

> "Alright, thanks for ramping up Claude usage, let's brake on that, too. Until Tuesday 2 AM, don't run play testers on it, save Claude tokens."

Coordinator reading: Run no playtesters on Claude until Tuesday 2026-11-03, 2 AM; spend fewer Claude tokens.

## 2026-11-01 — Codex returns (Adam, verbatim)

> "Codex is back, but not Claude. let's keep going."

Coordinator reading: Codex is available again, Claude is not; work continues.
