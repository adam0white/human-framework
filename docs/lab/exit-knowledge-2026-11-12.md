# Durable directions and proposals, 2026-11-12

This is a navigation and decision record, not a new authorization or a claim that all work is complete. [Owner directions](../owner-directions-2026-10-18.md), [project rules](../../AGENTS.md), the [roadmap](../roadmap.md), and each game's design and Deferred list remain authoritative. Check current source and releases before acting.

## Goals and deferred work

The owner sets goals. The framework remains one deterministic TypeScript person engine, demonstrated by games. The November 5 direction calls for Codex-heavy work, fixes from human playtesting, tutorials that teach through actual play, an ongoing idea list, and original games in familiar genres. All games should move to a current published HF 4.x; sacrificing old saves is allowed, but a pin or a deployment does not prove a game's replay, performance, or player acceptance. The earlier four-game cap and permission to remain on 3.x are superseded. See the owner directions and AGENTS for the full done criteria. Record outstanding work in the appropriate roadmap or game Deferred list with its reason and date; never replace a failed gate with a weaker one.

[Thirty concepts](game-ideas-2026-11-05.md) are proposals, with the first five ranked by design judgment rather than player evidence. Their cast names are fictional proposals and require a registry check. [Larger visual proposals](visual-proposals-2026-11-05.md) retain their November 24 review target. Synthetic reactions and source inspection are not human acceptance. Island's recorded-frame viewer is not an interactive game.

F-3158 proposes multiplayer and needs discussion of player roles. F-3162 proposes account or save transfer and needs clarification of the intended experience and constraints. Both remain proposed for discussion on 2026-11-24, not authority to build multiplayer, accounts, a server, or transfer. See [the human playtest](../games/murmur-playtest-2026-11-01-human.md) and the feedback ledger for the original observations.

## Consolidation and decision desk

The [November 5 consolidation draft](consolidation-proposal-2026-11-05.md) proposed a games monorepo and single game origin, while treating repository migration, origin migration, and HF version convergence as separate decisions. The owner subsequently approved the games repository, play origin, and old-domain redirects. Functional migration has since been reported complete; check its current receipts rather than treating that draft as the current plan. Human acceptance and actual Workers AI cloud scheduler cutover were outside that functional migration. Do not infer save custody or transfer from redirects: a path does not isolate same-origin storage, redirects cannot read old-origin data, and service workers, pending notes, consent, replay, and recovery need their own evidence. Old-save compatibility was waived in the later direction; do not claim a migration bridge was delivered merely because the draft proposed one.

[Approach rules, visuals and category mapping](decision-desk-2026-10-27.md) preserve the original table. The [owner decision-desk record](../owner-directions-2026-10-18.md#2026-10-27--decision-desk-approaches-categories-first-classic-adam-verbatim) preserves accepted direction and proposals. Present new proposals on the decision desk for owner review. Do not turn a proposal into a decision. Outside publishing remains paused pending the owner's employment/IP check; verify whether that decision has changed before acting.

## Coordination and operation

The coordinator owns cross-repository sequencing and release locks. UPKEEP inherited the retired GD director's work. Use one worktree per worker and keep one combined PR per repository. Before a merge, check the latest coordination rulings for a later hold; do not assume an older hold remains active or that a release of one hold releases another. The November 5 private-repository hold was lifted after owner approval. The Neighbours competing-release hold was released after its corrected deployment. The November 12 scoped HF competing-merge/deploy hold was released after verified central delivery. Those rulings do not establish later acceptance or qualification.

The November 11 history ruling for Neighbours/Concordia requires importing only the Neighbours subtree history; if its split contains unsigned commits, use a single signed import commit and link the retained original repository for full history. Apply the same rule to other unsigned histories. Never weaken signature or branch-protection rules. Consult current repository state before changing archives or history.

Use exact-head green CI and a clear hosted Codex review for normal integration, signed commits, the applicable lane checks, and normal deployment with live release identity verification. A source candidate, review, release, deployment, replay proof, and human acceptance are separate stages. Serialize HF releases. For machine-heavy work, the director grants one bounded job at a time, specifies its unchanged workload and stop conditions, and records numeric exit and physical process return before admitting the next. Signal only processes owned by that job. Do not launch work below 8 GB free disk. These are operating controls, not reasons to change game qualification criteria.

The launcher selects the cheapest model suited to the task; workers do not infer process ownership from their own model or parent process. Keep credentials and private evidence outside the public repository. Scheduled work and Workers AI must retain their existing budget, reservation, and admission controls; do not delete budget records to create capacity. The daily WAI process, limits, and evidence distinctions are in [daily testers](wai-playtesters.md). Synthetic play is weaker evidence than human play. Verify the actual scheduler and deployment before calling a cloud cutover complete; a local plan or functional migration alone does not prove it.

## Decision desk snapshot and owner steps

The October 27 decision desk contained five proposal IDs. The owner answered all five that day; the original desk choices and the later owner-direction record distinguish proposals from decisions:

- `ap-set`: adopt Chronicle, Inner Voice, Desk and Clock. Chronicle follows autonomous people and a written chronicle; Inner Voice presents one person's faculties as voices; Desk uses sourced claims and consequential readings; Clock uses continuous time and short, losable rounds.
- `ap-reach`: apply the named approach to the whole game, including type, palette, renderer, menu and title card.
- `ap-probe`: no two- or four-game probe first; move all games after 4.x.
- `site-cats`: adopt Keep a village, Live one life, Read people, Against the clock and Make the journey. The desk also proposed plain-language length badges and approach labels.
- `classic-first`: choose the wagon trail. The other five desk candidates were dropped: night-village deception, household life, clan council, squad manager and farm village. Working parody titles were not cleared names.

The owner still needs to play and judge the approaches. The owner must check the employment/IP question before outside publishing; no later answer was established in this audit. Friends and Show HN remain paused until owner readiness acceptance. Easier opt-ins remain as built and player reports may reopen them. These are dated decisions, not proof that all games now implement them. See [owner answers](../owner-directions-2026-10-18.md#2026-10-27--decision-desk-approaches-categories-first-classic-adam-verbatim).

## Director, launcher and scheduled checks

A director receives a bounded brief with an owned area, dependencies, output directory, STATUS and COMPLETE. The director checks current reports and coordination before assigning work, avoids another director's open PR or owned repository, integrates the actual results, and reports shipped and unshipped work. A coordinator can stop or resume a director from its saved status; a resume must inspect live workers before relaunching. The November 6 instruction was to keep progress light; don't treat earlier requests for abundant agent use as a perpetual launch order.

The historical `run-retry.sh` launcher runs the supplied brief through Codex, honors its STOP file before each attempt, and retries only an output containing “at capacity,” at most 12 attempts, with five minutes between. On retry it instructs the worker to read its STATUS and report, reread coordination, and check its own live work. This is a historical Mac-local launcher, not a portable scheduler or proof that a job ran. Preserve it privately until active dependencies are resolved; do not blindly reproduce its broad sandbox or infer a successful result from its exit.

The historical coordinator heartbeat checked status, live owned processes, inbox and delivery gates, then followed up or relaunched work as needed. It was separate from the once-daily 16:00 Chicago WAI LaunchAgent; the WAI documentation says manual game attempts had an external cadence, not an hourly LaunchAgent in the repo. A 2026-10-25 v3 resume brief says its attempted separate heartbeat was not loaded; it is not evidence of a currently running cron. This audit found no user crontab. Check actual scheduler state and current task ownership before enabling, disabling or recreating any recurring job. See [daily testers](wai-playtesters.md) for the current documented sequence, limits, stop and reporting rules.

## Exit brief operating rules

The November 12 common brief requires Codex workers and no Claude workers. Use the cheapest fitting model; bounded work uses Terra 6.1 and difficult work uses the default Codex model. Use one worktree per worker. Do not start work below 8 GB free disk. Signal only an exact owned PID. Do not touch unrelated owner projects or ChatGPT/Codex application processes.

Read project rules and HANDOFF first. Before merging, inspect the current coordinator's ruling record for a later HOLD. Combine related work into one PR per repository. Run `npm run check:lane` before committing where present. Keep commits signed. Require one hosted `@codex review` with no findings at the exact head plus green CI. Merge with `gh pr merge --merge --match-head-commit <sha>`; never use `--admin`. Deploy only exact green CI source and verify the served `release.json` commit and `dirty:false`.

Keep STATUS at every milestone. COMPLETE records what shipped and what did not, separately per repository. Clean up only the worker's own worktrees, branches, servers and temporary files. For the exit cleanup, do not move scratch until both cleanup PRs have merged. Move evidence to dated Trash, never use rm on evidence. Keep briefs, `codex/run-retry.sh` and every active director dependency until the coordinator releases them. Private material is listed for coordinator custody and never copied to public source.
