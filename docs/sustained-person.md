# Sustained person: continuous days and retained learning

The user's request after Three moments selected a substantial framework increment: continuous daily condition, retained access to learned material, and continuing obligations, followed through to reuse and evaluation. Games are deferred. This extends stages 2 and 3 of the roadmap; it does not claim the entire human framework is close to complete.

## What the candidate adds

`sustained-person` 0.1.0 is a private composition of the unchanged situated-person 0.1.0 and Human 0.1.1 modules. A single person's chronology, body, purposes, observations and learning state advance together. Explicit awake and sleep intervals cover the time between actions. Pending attempts remain interruptible and saveable. Only the host can report consumed food or fulfillment of a world obligation.

The body state has one owner at a time: the existing Human attempt lifecycle during actions, and the new daily-condition rules outside attempts. Sleep is an authored recovery interval with recorded elapsed time, not a calibrated sleep-stage, circadian or sleep-debt model. Ordinary awake time and sleep have separate rates. Task practice remains in Human; the learning candidate never writes Human skill values.

Retained access is a separate, actor-bound state. Instruction records an attributed claim; completed paid instruction, practice or retrieval opportunities can strengthen later access to a named item. Delays reduce access under an explicitly configured authored rule. That does not erase the historical fact that instruction was received or determine whether a reported claim is objectively true. No gain transfers automatically to unrelated items or skills. `getLearningView` is a researcher/evidence diagnostic. The composed actor view exposes access metadata without taught content; `retrieveLearning` gates the reported content behind an explicit host-selected threshold. Reading does not itself add practice or consume time; a paid retrieval opportunity can subsequently be attested through `learn`. Full receipt IDs remain available for deduplication within the declared finite horizon; recent display evidence is bounded separately.

## Responsibilities and limits

| Owner | Responsibility |
|---|---|
| Sustained wrapper | Synchronize chronology, condition and learning; enforce one pending attempt; preserve snapshots |
| Daily condition | Awake/sleep elapsed time and body update outside attempts |
| Human 0.1.1 | Capacity, actual paid attempts, task practice and confirmed meal effect during attempts |
| Learning candidate | Attributed receipt validation, item-specific retained access and delay |
| Situated person 0.1.0 | Actor-local observations, purpose states, commitment views and traceable authored decisions |
| Host | Actual world outcomes, resources, schedule, canonical commitments, delivered observations and authenticity of learning receipts |

A syntactically valid learning receipt is not proof of an external event. Reference consumers derive it from completed attempts and pay the associated time. Likewise the host's meal receipt asserts consumed food; the component does not own an inventory. Choice rules remain authored; no model of general planning, belief revision, moral worth or automatic purpose development is implied.

New sustained people start at minute zero; existing sustained histories continue through restore, not an invented migration from earlier episodic state. The default scope is at most ninety days with bounded item and receipt counts. This is an adult simulation candidate, not childhood, aging, illness or lifespan physiology. Parameters are engineering assumptions. The previous empirical learning pilot is unchanged and provides no calibration for these new rules.

## Reuse and verification

The fourteen-day reference lives in `examples/sustained-person`; the separately authored library-return consumer imports only installed package exports from `examples/sustained-consumer`. The latter exercises seven complete days, paid rehearsal versus equal-time other activity, a midpoint save/restore, a canonical book return, and an independent recipient whose decision changes only after receiving the return message. Rehearsed access avoids a twenty-minute consultation; the unrehearsed person still returns the book after consulting the source. Resumed and uninterrupted continuations produce identical state.

Build with `node scripts/package-sustained-person.js /tmp/sustained-package`. Run focused tests with `node --test tests/development-*.test.js tests/sustained-*.test.js`. The source allowlist packages only seven selected modules; it does not change the existing runtime or situated-person package. No new module is added to the public site's allowlist.

[Verification](../artifacts/sustained-person/verification.json) records 939 passing tests, 27 focused checks, source/package hashes, and unchanged public delivery. [Comparisons](../artifacts/sustained-person/comparison.json) preserve six interventions and simpler-rival parity; [consumer evidence](../artifacts/sustained-person/consumer.json) records the independent installation and seven-day result. [Review disposition](reviews/2026-09-14-sustained-person.md) records the fixes. Outcomes on authored worlds establish executable causal behavior and portability; they do not establish superiority, human prediction or measured developer savings.

## What follows

With continuous days and retained access present, the next substantial gaps are evidence-sensitive belief revision and short-horizon choice across continuing purposes; relationships beyond commitment records; positive, sourced representations of understood duty and repair; and a defined adult development trajectory. The framework should keep these distinct rather than invent a single character or spirituality score. Empirical and qualified interpretive work remain necessary before corresponding validity claims.

## API boundary

All state transitions return detached values. Times and action durations are integer minutes. New compositions start at zero; restore continues existing state.

| Export | Contract |
|---|---|
| `createSustainedPerson({situated,learning,condition?},catalog)` | Bind a zero-time situated person and empty learning state to one actor |
| `advanceSustainedPerson(state,{to,mode},catalog)` | Advance a non-pending interval as `awake` or `sleep`; `to` is absolute |
| `beginSustainedAttempt(state,action,catalog)` | Start an existing Human action while awake |
| `advanceSustainedAttempt(state,minutes,catalog)` | Advance actual pending time once across all components |
| `finishSustainedAttempt(state,result,catalog)` | Finish/interruption/blockage and optional consumed meal receipt |
| `getSustainedView(state,catalog)` | Actor-local situated view plus condition and content-free retained-access metadata |
| `exportSustainedPerson` / `restoreSustainedPerson` | Validate version, owner, skill namespace and synchronized chronology |
| `learn(state,event)` | Record an attributable completed learning interval; the host attests its actual occurrence |
| `retrieveLearning(state,itemId,{minimumAccessibility})` | Return reported content only when retained access meets the declared threshold; does not grant reinforcement |

The package root exports the sustained APIs and learning helpers. Subpaths `/situated`, `/commitments`, `/human`, and `/learning` expose the selected compositional boundaries. The [independent consumer source](../examples/sustained-consumer/consumer.js) is a complete usage example.
