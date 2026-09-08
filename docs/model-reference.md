# Implemented model reference — lab 0.3.0

Recorded 2026-09-07. This describes the laboratory kernel at `src/core/`, with the separate host-integration component identified at the end. Every coefficient below is an **engineering default**, with no fitted human dataset or revealed numerical authority. The source code and benchmark source hashes identify this version.

## State and units

Each actor has fatigue and hunger in `[0,1]`, task proficiency in `[0,1]`, a hazard estimate and confidence proxy, four authored priority weights (duty, care, caution, mastery), one optional announced promise, directed trust estimates, and temporary support. These are local state proxies. A value of `0.8` is neither a clinical measurement nor the 80th population percentile. Priors and initial conditions are supplied by scenario data.

The shared world holds objective progress, integer food rations and hidden hazard in `[0,1]`. Hazard is stationary in this version. Each scenario requires `goalUtility`, an authored dimensionless value for completing its shared objective, independent of resource quantities. Converting units rescales `target`, `initialProgress`, `consumption` and each work action's `output`; it leaves `goalUtility` unchanged. The four presets use utilities 60, 60, 45 and 30, preserving their former initial output-value scale. Neither physical progress nor independently authored utilities justify averaging unlike scenarios.

Each lab round is a scenario-defined number of simulated minutes. Per-attempt effort and per-minute maintenance are distinct: changing the lab round duration changes the experiment, rather than producing equivalent finer integration automatically. The separate human component supports partial attempt timing; it does not change this lab contract.

There is no scalar human quality, faith, soul, moral worth or universal intelligence. The default full-loop configuration enables all five couplings; the full policy also supports targeted ablations. Neither means complete human functioning.

## Observation and belief update

Perceived fatigue is `clip(round(20 × (fatigue + observationBias)) / 20)`; perceived hunger is `clip(round(20 × hunger) / 20)`. For these co-located scenarios, peer body cues use the same coarse representation. This is an authored observability assumption, not a proven method of reading another person's physiology. Actual hidden hazard, replay seed, peer intentions and peer priorities are absent from the policy view. Action descriptors are public task descriptions, including author-supplied metadata; hidden facts must not be placed there.

An inspection occupies an entire interval. With survey proficiency `s`, scenario noise amplitude `n`, hidden hazard `h` and keyed uniform draw `u`:

```text
report = clip(h + (2u − 1) × n × (1 − 0.6s))
w = 0.5 + 0.4s
estimate' = (1 − w) × estimate + w × report
confidence' = clip(confidence + (1 − confidence) × w)
```

This is a heuristic weighted estimator, **not a Bayesian posterior or calibrated confidence**. Work outcomes do not update the hazard belief. Actors do not communicate reports or infer hidden causes. Disabling belief learning freezes stored estimate/confidence and removes the full policy’s inspection information-value contribution. Paid manual inspection still produces a report and task practice; a promise may still favor it. The initial hazard prior remains available for work scoring. This is a coupled ablation of updating and information-seeking value, not learned stopping or a pure isolated effect of updating. Version 0.1.0 retained the positive score while preventing the update, causing repetitive inspections; that score/update mismatch is fixed.

## Attempt, bodily costs and outcome

For work, one logistic function supplies the forecast and resolution probability. The actor's forecast uses perceived body, believed hazard and available support. Resolution uses pre-action actual body and actual hazard:

```text
z = 1.25 + 4 × (proficiency − difficulty)
    − 1.6 × fatigue − 0.8 × hunger
    − 2 × hazard × exposure + support
p(success) = 1 / (1 + exp(−z))
success = keyedUniform(seed, round, actor, "work-outcome") < p(success)
```

Successful work adds the action's output; failure adds zero. Body coupling off removes fatigue/hunger terms. Relationship coupling off removes support. No spiritual or intention bonus enters the probability.

Each actor pays maintenance once per interval. Work then adds per-attempt effort; rest reduces fatigue; eating tries to consume exactly one shared ration. An unavailable ration is a failed attempt that still costs time. Help adds its authored effort (default `0.08`). Maintenance and action effects are integrated together and clipped once per interval. Clipping before subtracting recovery would erase maintenance at the ceiling; version 0.2.0 fixes that error.

| Constant | Default | Units / meaning |
|---|---:|---|
| Fatigue maintenance | 0.0015 | fatigue proxy / simulated minute |
| Hunger maintenance | 0.002 | hunger proxy / simulated minute |
| Rest recovery | 0.025 | fatigue proxy / simulated minute |
| Ration relief | 0.55 | hunger proxy / ration |
| Practice rate | 0.008 | inverse simulated minutes, multiplied by quality |
| Practice quality | 0.65 | fixed dimensionless proxy |
| Assistance | 0.18 | support increment; added to work logit |
| Trust gain on promised attempt | 0.025 | trust proxy / fulfillment |
| Trust loss at missed deadline | 0.04 | trust proxy / expiry |

Before **work or help**, the resolver checks the whole interval, using actual body state:

```text
projectedFatigue = fatigue + 0.0015 × minutes + effectiveEffort
projectedHunger = hunger + 0.002 × minutes
exertion permitted iff both projections ≤ 1 (tolerance 1e−12)
fatigue′ = clip(fatigue + maintenance + executedEffort − executedRestRecovery)
hunger′ = clip(hunger + maintenance − executedMealRelief)
```

An over-capacity request executes a recovery interval instead. If hunger prevents exertion and a ration remains, the actor eats; otherwise the actor rests. Without food, recovery cannot relieve hunger. The resolver supplies recovery even when a scenario offers no rest/eat action. Requests that exceed the entire capacity budget even from zero fatigue cannot become possible through more rest; adapters must offer a smaller task or change the authored interval.

Requested action and declared intention are preserved; `actionId`, `actionLabel` and `actionKind` describe **execution**. `intervention` records the cause of substitution. Synthetic `_rest` / `_eat` IDs cannot collide with scenario IDs. A blocked work request earns no progress, practice, work-promise fulfillment or support consumption. `outcome.success` describes the executed recovery, not a successful work attempt. Public outcomes omit an unexecuted requested action and its private intention.

This guard applies equally to the player, baseline, planned-simple, full policy and all ablations. Body coupling off removes body influence on scoring and success probability; it **does not** abolish execution capacity. Forecasts and UI capacity estimates use perceived body, so they can differ from actual resolution. The ceiling is an authored simulation contract, not a clinical hunger threshold or a claim that ordinary hunger removes human choice. Injury, sleep pressure, dehydration and detailed physiology remain outside this version.

## Deliberation

The NPC sorts by descending `selectionTier`, then descending `score`, then action ID. `score` remains the sum of named contributions within a tier; `selectionReason` explains a tier preference. Selection is deterministic; stochasticity is in outcomes and inspection noise. A player may request any supported action instead.

Full gives perceived capacity-blocked exertion tier 0 and other choices tier 1. For blocked work its productive forecast, practice interest and promise contribution are zero. This uses only perceived body and is disabled with the body coupling; it is not an oracle for actual execution. For unblocked work, define:

```text
U = world.goalUtility
R = max(0, target − progress + consumption)
N = max(1, horizon − round)
usefulOutput = min(output, R)
expectedGoalProgress = forecast × U × usefulOutput / target
deadlineOpportunity = forecast × U × (usefulOutput / R) / N  if R > 0; else 0
```

The relative completion tolerance below also sets negligible `R` to zero. The deadline term values the fraction of the remaining gap that this attempt could close, with greater weight as opportunities run out. Consumption is included because reaching the target before end-of-round use does not necessarily finish the task. This is a deadline-aware utility heuristic, not multistep planning or an estimate of eventual victory. Goal utility can still be outweighed by other authored motives; there is no unconditional final-round work override.

Full's remaining score contributions are:

| Action | Score contributions |
|---|---|
| Work | `expectedGoalProgress + deadlineOpportunity − effort × (0.6 + 2fatigue) − caution × believedHazard × exposure × 0.7`, plus `mastery × (1 − skill) × 0.3` when learning is enabled and perceived capacity permits work |
| Rest | `3.7 × fatigue² − 0.15` |
| Eat | With food: `3.8 × hunger² − 0.18`; without food: `−1` |
| Inspect | With belief learning: `(1 − confidence) × maxWorkExposure × clip(remainingRounds / 4) × (0.8 + caution) × 2 − 0.15`; without: `−0.15` |
| Help | `care × maxPerceivedPeerFatigue × meanTrust × 2.5 − 0.15 − actionEffort` |

Omitted help effort is `0.08` consistently in ranking, resolution, capacity and UI guidance. Version 0.2.0 fixes the former ranking-only zero default. Relationships off removes the positive help term. Body coupling off removes own fatigue/hunger and peer-fatigue influence from scoring. There is no multistep planning, value-of-information optimization, habit arbitration or counterfactual reasoning. The contribution table explains the arithmetic actually used, not an invented psychological explanation after the event.

For a matching pending promise on an action not perceived as capacity-blocked, add:

```text
promiseWeight × duty × (1 + 1 / max(1, dueRound − currentRound))
```

The promise concerns an **attempt by its deadline**, not guaranteed production. An executed but unsuccessful work attempt can fulfill it. A blocked request followed by forced recovery cannot. Other scores or player choice can outweigh it. The promise-weight ablation removes this term while preserving fulfillment/expiry and relationship consequences; it does not remove all commitment effects.

The baseline gives work `(output / target) × goalUtility × (0.35 + 0.65 × skill)`, rest `0.25`, eat `0.2`, and other actions `0.1`; all candidates have tier 1. Its work ranking remains fixed rather than adapting to remaining progress. Forced rest or meals are resolver interventions, not newly learned baseline preferences.

`planned-simple` uses the same fixed scores with a separate threshold rule for **every actor**: if perceived hunger is at least `0.6`, food remains and an eat action exists, eat; otherwise, if perceived fatigue is at least `0.65` and rest exists, rest. Matching recovery actions have tier 2, work tier 1 and other choices tier 0. With no matching recovery, it chooses the highest fixed work score if work exists. With body coupling disabled, neither threshold activates. Missing recovery actions are not invented by this policy; the common execution guard still applies. All three policies have identical action access, permitted inputs and bodily physics.

None of these controllers is an optimal planner or a representative human population. Version 0.2.0 mixed physical output directly into utility and ignored goal proximity/deadline in work scoring. Version 0.3.0 corrects those contracts without tuning recovery costs to reward a particular controller.

## Practice and transfer

For proficiency `s`, duration `d`, quality `q` and rate `k`:

```text
s' = s + (1 − s) × (1 − exp(−kqd))
```

Work and inspection receive task practice, including failed work attempts. No intention or success narrative is parsed. Quality is fixed; feedback, sleep, aptitude, task variation and consolidation are absent. Learning off freezes proficiency updates and removes the full policy’s expected practice-value contribution. Existing proficiency still affects work success. This is a coupled ablation, not an isolated estimate of learning’s effect.

Cross-skill transfer defaults to **none** in every shipped scenario. Explicit links carry source skill, target skill, signed rate and provenance. Each applies `rate × directPracticeDelta` once and clips its target. Transfer never recursively triggers another link, so cycles cannot manufacture practice. Direct practice and signed transfer appear in separate trace fields. A provenance string records an assumption; it does not validate it scientifically.

The exported `retain` helper implements `r + (s − r) × exp(−kd)`, with effective floor `r = min(configuredFloor, s)` to prevent unpracticed gains. It is tested but **not invoked by these short scenarios**. Runtime forgetting is not implemented.

## Relationships and ordering

Assistance targets a peer using perceived fatigue and stable ID ties. It prepares support for that person's next work attempt, which consumes the support. It does not compel a social choice. Initial trust is `0.5` in each direction; observers update their estimate following an announced promise's fulfillment or expiry when relationships are enabled. These co-located scenarios assume those acts are public. Deception, testimony, consent, institutions and theory of mind need different experiments.

`step` validates a command, clones state, then visits actors in scenario array order. Each gets a fresh view, ranks actions, receives the player override if addressed, attempts, resolves and learns. Later actors see earlier public resource/support changes. They do not receive the other actor's private inspection report. At round end, time advances, due promises expire, consumption is subtracted, and target/horizon determines termination. Every actor completes the final round before success is checked, so progress can overshoot the target.

Completion uses `(target − progress) / target ≤ 1e−12`, including initial-state completion. The same relative tolerance defines the remaining gap for scoring, with consumption included there. This prevents equivalent unit conversions from changing terminal status because ten `0.1` additions produce `0.9999999999999999`. Recorded progress is not rounded or awarded extra work. This numerical correction is separate from the unchanged bodily capacity tolerance.

Serial scheduling can favor an early eater or let help reach a later actor within the same round. It is not simultaneous decision-making. Alternative scheduling requires a separate experiment.

## API, reproducibility and unknown inputs

The [MVP specification](mvp-spec.md) lists exported functions. `rankActions(view, overrides = {})` validates and merges partial policy/module overrides, including nested flags. It does not mutate a view or state. `step` accepts one optional externally chosen actor action per round; other actors use the configured policy. There is no dynamic plugin loader, persistence service or natural-language action compiler. Reuse currently means importing ES modules and supplying validated data/commands.

The stateless keyed pseudo-random generator uses seed, round, actor and purpose. Work action ID is intentionally excluded so paired variants see the same exogenous quantile for a given actor/round. This is an experiment generator, not cryptographic randomness or a philosophical account of agency. Replay is checked within the current numerical/version contract, not across arbitrary engine edits or every floating-point platform.

Current replays embed JSON-safe scenario data, normalized options and canonical commands. Version 0.1.0 and 0.2.0 records are reconstructed by their frozen kernels and displayed read-only. They retain their original scores, physics and completion behavior; 0.2.0 does not acquire `goalUtility` or `planned-simple`. Five 0.2.0 implementation files were frozen byte-for-byte from commit `08aab973bcaef51693d94beeed4d882e9c3124ee`; source hashes and state goldens protect them. The facade routes historical replay, projection, ranking and export, while current `step` rejects historical states. A new attempt uses the current preset. Unknown kinds/IDs, incompatible versions, invalid numbers, cycles and non-JSON metadata are rejected. See the [coverage ledger](coverage-ledger.md) for extension decisions.

## Separate host-integration component

`src/human/index.js` exposes `HUMAN_VERSION = '0.1.0'` independently of lab engine 0.3.0. It owns one person's body, practice, observation and pending attempt. `beginAttempt`, `advanceAttempt` and `finishAttempt` separate declaration, actual elapsed time and a matching host outcome. Effort/practice accrue only for elapsed permitted activity; rest reduces fatigue during its actual elapsed time; a completed meal needs a host-confirmed `mealConsumed` receipt. Capacity-blocked exertion supplies neither automatic rest nor food. Snapshots preserve a pending attempt without accumulating an event history.

The workshop game in `src/games/workshop.js` owns locations, objects, inventory, prerequisites, deadline, random outcomes and victory. It imports the human boundary rather than the lab world engine. Its `task-aware`, `planned-simple` and `greedy` controllers are host-authored; the lab's Full loop and social/belief mechanisms have not been ported into that component. This is a test of a narrower reusable boundary, not a claim that the complete laboratory framework is already embedded.
