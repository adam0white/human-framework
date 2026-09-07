# Implemented model reference — 0.1.0

Recorded 2026-09-07. This describes the actual JavaScript kernel, not every mechanism proposed in the earlier research. Every coefficient below is an **engineering default**, with no fitted human dataset or revealed numerical authority. The source code and benchmark source hashes identify this version.

## State and units

Each actor has fatigue and hunger in `[0,1]`, task proficiency in `[0,1]`, a hazard estimate and confidence proxy, four authored priority weights (duty, care, caution, mastery), one optional announced promise, directed trust estimates, and temporary support. These are local state proxies. A value of `0.8` is neither a clinical measurement nor the 80th population percentile. Priors and initial conditions are supplied by scenario data.

The shared world holds objective progress, integer food rations and hidden hazard in `[0,1]`. Hazard is stationary in this version. The presets have different progress units; scores cannot be averaged across them. Each round is a scenario-defined number of simulated minutes. Per-attempt effort and per-minute maintenance are distinct: changing the time step changes the experiment, rather than producing equivalent finer integration automatically.

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

This is a heuristic weighted estimator, **not a Bayesian posterior or calibrated confidence**. Work outcomes do not update the hazard belief. Actors do not communicate reports or infer hidden causes. Disabling belief updates preserves inspection cost/report but freezes stored estimate/confidence. The policy can consequently pay repeatedly for information it cannot incorporate; the benchmark reports this weakness.

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

Each actor pays maintenance once per interval. Work then adds per-attempt effort; rest reduces fatigue; eating tries to consume exactly one shared ration. An unavailable ration is a failed attempt that still costs time. Help adds its authored effort (default `0.08`). Body states are clipped after each update.

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

At fatigue `1` an actor can still attempt work. Injury, incapacity, sleep pressure, dehydration, autonomic regulation and disease are unmodeled, not hidden mechanisms behind that number. This is why the body interface must eventually be replaceable.

## Deliberation

The NPC chooses the highest score, breaking ties by action ID. Selection is deterministic; stochasticity is in outcomes and inspection noise. A player may choose any supported action instead. Scores are sums in arbitrary utility units:

| Action | Score contributions |
|---|---|
| Work | `forecast × output − effort × (0.6 + 2fatigue) − caution × believedHazard × exposure × 0.7 + mastery × (1 − skill) × 0.3` |
| Rest | `3.7 × fatigue² − 0.15` |
| Eat | With food: `3.8 × hunger² − 0.18`; without food: `−1` |
| Inspect | `(1 − confidence) × maxWorkExposure × clip(remainingRounds / 4) × (0.8 + caution) × 2 − 0.15` |
| Help | `care × maxPerceivedPeerFatigue × meanTrust × 2.5 − 0.15 − actionEffort` |

In help scoring, omitted effort is `0`; shipped presets explicitly supply it. Relationships off removes the positive help term. Body coupling off removes own fatigue/hunger and peer-fatigue influence from scoring. There is no multistep planning, value-of-information optimization, habit arbitration or counterfactual reasoning. The contribution table explains the arithmetic actually used, not an invented psychological explanation after the event.

For a matching pending promise, add:

```text
promiseWeight × duty × (1 + 1 / max(1, dueRound − currentRound))
```

The promise concerns an **attempt by its deadline**, not guaranteed production. An unsuccessful work attempt can fulfill it. Other scores or player choice can outweigh it. The promise-weight ablation removes this term while preserving fulfillment/expiry and relationship consequences; it does not remove all commitment effects.

The baseline gives work `output × (0.35 + 0.65 × skill)`, rest `0.25`, eat `0.2`, and other actions `0.1`. It has identical action access and permitted inputs. It is a simple task-oriented comparator, not an optimal planner or representative human population.

## Practice and transfer

For proficiency `s`, duration `d`, quality `q` and rate `k`:

```text
s' = s + (1 − s) × (1 − exp(−kqd))
```

Work and inspection receive task practice, including failed work attempts. No intention or success narrative is parsed. Quality is fixed; feedback, sleep, aptitude, task variation and consolidation are absent. Learning off freezes proficiency updates.

Cross-skill transfer defaults to **none** in every shipped scenario. Explicit links carry source skill, target skill, signed rate and provenance. Each applies `rate × directPracticeDelta` once and clips its target. Transfer never recursively triggers another link, so cycles cannot manufacture practice. Direct practice and signed transfer appear in separate trace fields. A provenance string records an assumption; it does not validate it scientifically.

The exported `retain` helper implements `r + (s − r) × exp(−kd)`, with effective floor `r = min(configuredFloor, s)` to prevent unpracticed gains. It is tested but **not invoked by these short scenarios**. Runtime forgetting is not implemented.

## Relationships and ordering

Assistance targets a peer using perceived fatigue and stable ID ties. It prepares support for that person's next work attempt, which consumes the support. It does not compel a social choice. Initial trust is `0.5` in each direction; observers update their estimate following an announced promise's fulfillment or expiry when relationships are enabled. These co-located scenarios assume those acts are public. Deception, testimony, consent, institutions and theory of mind need different experiments.

`step` validates a command, clones state, then visits actors in scenario array order. Each gets a fresh view, ranks actions, receives the player override if addressed, attempts, resolves and learns. Later actors see earlier public resource/support changes. They do not receive the other actor's private inspection report. At round end, time advances, due promises expire, consumption is subtracted, and target/horizon determines termination. Every actor completes the final round before success is checked, so progress can overshoot the target.

Serial scheduling can favor an early eater or let help reach a later actor within the same round. It is not simultaneous decision-making. Alternative scheduling requires a separate experiment.

## API, reproducibility and unknown inputs

The [MVP specification](mvp-spec.md) lists exported functions. `rankActions(view, overrides = {})` validates and merges partial policy/module overrides, including nested flags. It does not mutate a view or state. `step` accepts one optional externally chosen actor action per round; other actors use the configured policy. There is no dynamic plugin loader, persistence service or natural-language action compiler. Reuse currently means importing ES modules and supplying validated data/commands.

The stateless keyed pseudo-random generator uses seed, round, actor and purpose. Work action ID is intentionally excluded so paired variants see the same exogenous quantile for a given actor/round. This is an experiment generator, not cryptographic randomness or a philosophical account of agency. Replay is checked within the current numerical/version contract, not across arbitrary engine edits or every floating-point platform.

Replays embed JSON-safe scenario data, normalized options and canonical commands. Unknown kinds/IDs, incompatible versions, invalid numbers, cycles and non-JSON metadata are rejected. Every **supported** action has defined behavior. Unknown phenomena do not silently become generic work, a random coefficient or generated prose; extension requires an explicit schema and model decision. See the [coverage ledger](coverage-ledger.md) for prioritized replacement experiments.
