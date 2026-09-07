# Human Framework MVP specification

Accepted direction: the user's instruction on 2026-09-07 to build, test and iterate the proposal into a usable MVP. This document records implementation choices within that authorization. It narrows the first release, not the eventual research goal.

## Central loop and boundaries

Observe → understand → weigh motives and commitments → choose → attempt → resolve → learn and remember. Each round retains a structured trace of these phases. Shared world facts, private actor beliefs/intentions, and omniscient diagnostics are distinct. No LLM, external service, text inference, or API key is needed to run, inspect, test or replay the engine.

Use browser-native JavaScript ES modules plus Node's built-in test runner and local HTTP server. No runtime dependencies or build step. The browser laboratory is an adapter over the same headless functions as the CLI and benchmark. Four data-defined microgames: Courier Crossing, Repair Bench, Water Commons and Solo Repair. The first three have two actors working toward one public objective with limited shared resources; Solo Repair has one actor, no peers and no social effects. The player may direct one actor or delegate the round. Stable actor order and fixed per-scenario simulated minutes make event order explicit.

MVP quantities are designed proxies, not calibrated measurements: fatigue, hunger, task proficiency, hazard belief/confidence, situational priorities, explicit commitments, relationship trust and temporary assistance. Detailed physiology, genetics, developmental trajectories, automated jurisprudence, cliodynamics, consciousness and metaphysical faculties are not simulated. The coverage ledger records future interfaces or explicit unmodeled status. No religious term is a scalar score. Commitments are authored promises, not divine judgments.

## Public API

- `createSimulation(scenario, options = {})` → JSON-safe state. Options: integer `seed`, `policy` (`full` or `baseline`), `modules` (body, beliefs, commitments, learning, relationships booleans). Defaults are full policy/modules. Validate finite values, unique IDs, supported action kinds, actor references and task skills.
- `getView(state, actorId)` → detached actor-accessible projection with public progress/food/time, actor's perceived body/skills/beliefs, recognized commitments, visible peers, and action descriptors. It never includes actual hidden hazard or another actor's private intention/weights.
- `rankActions(view, overrides = {})` → candidates with `actionId`, numeric `score`, forecast and structured contributions. Partial policy/module overrides are validated and merged with the current view, including nested module flags. It receives no world state and does not mutate the view. Full and baseline share available inputs; baseline uses a simpler static task score, not privileged observations. Ablations and baseline are labeled modeling alternatives.
- `step(state, command = {type:'auto'})` → a new state; original is untouched. A player command is `{type:'act',actorId,actionId,intention?}`. Structural rejection throws before advancing time. World-dependent failure is an attempted action with costs and observable feedback. Each actor acts once per round, then shared time advances. Player choice remains recorded even when it differs from policy. Unknown commands and stepping terminal states fail explicitly.
- `exportReplay(state)` → scenario/options/command log and format version. `replay(record)` reproduces the run from its initial state with no external input. Reject incompatible formats/engine versions. The manifest embeds scenario data so edited presets cannot silently alter old runs.
- `runSimulation(scenario, options)` → autonomous run to terminal state. Public result includes objective progress, action outcomes, practice gains, commitments, body costs and decision traces. Do not call objective success a measure of personhood or goodness.

Scenario actions use a small validated vocabulary: `work`, `rest`, `eat`, `observe`, `help`. Work differs through skill, difficulty, effort, output and exposure to hazard. Action properties are known task descriptions; hazard is a hidden environmental variable. A failed attempt remains valid and may yield practice. Unsupported action kinds are rejected rather than coerced into existing ones.

Random draws use deterministic independent keys including seed, round, actor and purpose; unrelated streams cannot consume each other's draws. No calls to `Math.random` in the kernel. Exact replay is within the same engine/numerical contract, not a claim of bit-identical numerical behavior across every future platform.

The five experimental switches isolate defined pathways. `body` disables graded body influence on deliberation/performance while maintenance and mandatory capacity limits remain active. `beliefs` disables hazard-belief updating and the full policy’s inspection information-value term, while paid inspection reports and practice remain available. This is a coupled ablation; the initial hazard prior still informs work scoring. `commitments` disables promise weighting in deliberation while keeping fulfillment/expiry and public relationship consequences observable. `learning` disables proficiency changes and their expected practice-value contribution while existing proficiency remains usable. `relationships` disables care-weighted assistance preferences, assistance efficacy and trust updates. These are targeted ablations, not claims to remove a whole human faculty. Scenario commitments are publicly announced promises to attempt an action, not hidden intentions or guaranteed success.

## User interface and deliverables

A polished, readable local laboratory provides scenario selection, seed, model/ablation controls, an action board, manual and automatic play, progress and round history, an animated/action-highlighted central loop, actor-view versus clearly marked researcher diagnostics, and JSON replay import/export. Character-facing estimates are labeled as estimates. Diagnostics are deliberately omniscient and are never fed back into a run. All generated prose is deterministic formatting of structured records.

The laboratory must be responsive, keyboard usable, and usable without animation. Mid-run model/scenario changes require an explicit new run so displayed settings and replay parameters agree. Time advances in explicit simulated rounds; real-time contraction and metagame interfaces remain researched extensions.

CLI commands run scenarios, export JSON, and run reproducible paired-seed model comparisons. Benchmark all four settings plus null controls; include cases where complexity has no benefit or worsens the objective. Report mechanism/trace checks separately from performance. Never tune solely until the richer model wins.

## Acceptance

Meaningful tests cover action sovereignty, immutable transitions, state/view separation, paid information acquisition, same-round belief availability at the next decision phase, empty shared resources, bounded body/skills, unsupported transfer staying absent, no unpracticed retention gains, replay/version rejection, independent randomness, terminal state handling, all four adapters and adversarial seeds. Browser QA completes one run, manual choice, reset/model change, diagnostics and replay roundtrip, desktop and narrow layout. A source audit extracts historical references and investigates consequential claims; prior-art work distinguishes borrowed mechanisms from project contributions. Independent code, scientific and usability reviews are addressed and recorded.

## Capacity and historical replay update — 0.2.0

The full-interval capacity contract and exact formulas are in [model-reference.md](model-reference.md). Both policies and player commands use the same resolver guard. Decision records preserve `requestedActionId` / `requestedActionLabel`, while `actionId` / `actionLabel` / `actionKind` identify what actually ran. `intervention` is null or records fatigue/hunger as the reason for forced recovery. This is compatible with the conceptual request/execution split; it replaces the earlier MVP guarantee that every supported request executes verbatim.

`assessCapacity(body, action, roundMinutes)` exposes the pure capacity calculation. UI callers supply perceived body; the resolver supplies actual body. `actionEffort(action)` centralizes work/help effort defaults. Current `getView` includes `engineVersion`. Historical 0.1.0 `replay`, view, ranking and export route through a frozen kernel; current `step` rejects old states. The app displays old runs read-only and starts current presets explicitly.
