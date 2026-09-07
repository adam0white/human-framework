# What this prototype proves, and what comes next

The games establish a working loop and reproducible comparisons. The next delivery must show that a separate game can use the human components while owning its own world. The [2026-09-07 independent reviews](post-mvp-review.md) changed the sequence below: integration now precedes broader faculties and does not wait for human-data calibration.

## What is actually running

Three games combine body, hazard beliefs, task practice, promises and simple trust for two actors. **Solo Repair is the persistent single-person control:** work, rest, eat or inspect, with no peers, promises or social effects. Longer workloads allow repeated work, recovery and meals. Choices and consequences are traced and replayed without an LLM.

The loop's “understand” label summarizes accessible facts; comprehension, episodic memory, emotion and multistep planning are absent. Assistance prepares support for another actor without consent or negotiation.

**Every policy and ablation faces the same exertion limit.** When requested exertion exceeds capacity, the body requires recovery; request and execution are recorded. The baseline mostly requests work using output and proficiency. Full weighs body, beliefs and promises and can choose recovery earlier. Matching switches retain identical mechanics; disabling hazard or practice updates also removes expected inspection or learning value. “Full” names the current considerations, not a complete human model.

The logistic success equation, practice curve, trust increments, priority weights and inspection-confidence update are **our invented engineering formulas**. Their exact coefficients were not supplied by revelation or fitted to human data. [Exact implemented rules](model-reference.md).

## A short evidence map

These anchors support distinctions, not our numerical formulas.

| Question | Evidence or precedent | Project decision / status |
|---|---|---|
| Can felt condition differ from performance? | A controlled sleep-restriction study found different trajectories of reported sleepiness and cognitive impairment. [Van Dongen et al.](https://pubmed.ncbi.nlm.nih.gov/12683469/) | Separate actual condition from perceived condition. Implemented coarsely; sleep itself is absent. |
| Must “higher” concerns wait for every basic need? | Cross-country well-being associations did not require sequential need satisfaction. [Tay and Diener](https://pubmed.ncbi.nlm.nih.gov/21688922/) | Allow concurrent reasons for action. Broader needs and meaning remain candidates. |
| Does practice automatically improve unrelated abilities? | One training experiment found trained-task gains without measured untrained transfer. [Thompson et al.](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0063614) | No transfer by default; any proposed connection needs its own test. |
| Can social behavior work without generated language? | Prom Week separates social intent, the recipient's response and templated dialogue. [Original project account](https://promweek.soe.ucsc.edu/page/2/) | Structured social exchanges are a next experiment; current assistance is simpler. |
| How should Islamic grounding affect representation? | Intention matters; knowledge concerning ruh has limits. [Bukhari 1](https://sunnah.com/bukhari:1), [Qur'an 17:85](https://quran.com/17/85) | Preserve intention separately and decline invented soul measurements. Hanafi–Maturidi interpretation remains a scholarly task; there is no automated religious evaluator. |

## What the games test—and leave unanswered

| Existing game | Useful pressure on the loop | Next test that would distinguish mechanisms |
|---|---|---|
| Courier Crossing | Inspection costs time; believed danger can differ from actual danger; safer work competes with a promise. | Changing and redundant reports: when should another inspection change a decision, and when should inspection stop? |
| Repair Bench | Skill, fatigue, recovery and output compete over repeated cycles. | Compare equal-duration work/rest schedules, followed by the same retest, to separate immediate productivity from later capacity. |
| Water Commons | Consumption makes delay costly; helping and personal recovery compete with collecting. | Let someone request a scarce resource and another independently accept or refuse. Does relationship history change choices for traceable reasons? |
| Solo Repair | One person's work/recovery tradeoff, isolated from social causes. | Keep it throughout later iterations: switching off relationships or promise weighting must leave choices and outcomes unchanged. |

All four share an aggregate-progress structure. Another theme alone adds little reuse evidence. The [benchmark](benchmark-report.md) separates voluntary recovery, compulsory recovery, playability and model comparisons; earlier results remain archived.

## What remains on the research shelf

**Promising but unused:** bounded attention; actor-owned memory and forgetting; learned habits versus planning; emotional appraisal and regulation; broader motives including worship, beauty and service; revisable commitments; testimony and mistaken beliefs about others. Each needs a situation where its presence changes a prediction. Existing cognitive and social architectures provide alternatives to compare, not a list of components to install together.

**Rejected formulations, open domains:** inherited formulas converting heritability into individual stats, granting expertise without learning, universal transfer, fixed lifetime caps, sacred-variable meters, and guaranteed emergence are not justified. This does not reject genetics, intelligence, spiritual life or social history. The [decision register](../research/decision-status.md) states what each claim would need to return.

**Deferred scale:** detailed physiology, childhood and aging, inheritance, institutions, economics, community cohesion and cliodynamics. Adaptive interfaces and contracting time remain presentation experiments. Simulating microphysics to obtain people is outside this project's implementation route. [Coverage details](coverage-ledger.md).

## Delivery gates, revised after independent review

These are proposed implementation gates, not completed capabilities. Preserve the current Solo Repair, replay engines and benchmark as controls throughout.

1. **Correct the comparison and value contracts.** Make planned-simple recovery a first-class comparator for every controlled actor. Keep the same world physics when comparing policies; use prescribed actions and equal-duration retests when comparing mechanisms. Separate physical output units from goal value: expressing an equivalent task in units ten times larger must not silently make rest or promises less important. Include urgent last-action cases, ordinary workloads and reserved condition families. Accept when unit conversions preserve equivalent behavior, all policies receive the same accessible information, capacity is enforced, and useful counterexamples remain. Full is a replaceable reactive policy, not a multistep planner or the success criterion.
2. **Embed one worker in a small host-owned game.** Build a two-location workshop with objects, a required tool/part, inventory, travel and a deadline. The host owns these facts, opportunities, action outcomes, time scheduling and victory. Extract only the human-state, choice and experience boundaries needed by this consumer. The worker can be player-controlled or delegated; this first integration has no social effects. Capacity can stop exertion without secretly selecting or obtaining a ration. Accept when targeted actions, a host interruption and external observations work through documented events; an interrupted save resumes identically; duplicate outcomes cannot grant duplicate effects; hidden host facts stay outside the actor view; diagnostics can be disabled without accumulating session history in active state. Keep LLM-free execution.
3. **Make another author use the frozen boundary.** Add a second object interaction outside the core, then compare the integrated behavior with a small host-native controller. Record authoring effort, required exceptions, causal clarity and runtime on the target mobile/browser environment. Run 10,000 events to test bounded active state and declare a latency budget before measuring. Accept only with zero host-specific core edits for that second interaction, no duplicate human-state bookkeeping, and a concrete authoring or player benefit. The game must offer two feasible approaches with different consequences. In a five-person formative playtest with policy hints hidden, use four people correctly explaining the objective, a tradeoff and an observed failure as a practical revision gate; this is not a population estimate. If the simpler controller is equally useful and easier to maintain, use it and ship the narrower shared modules. This gate proves one integration, not every engine or genre.
4. **Add one missing mechanism demanded by play.** After the boundary works, an independent request/accept/refuse interaction can test social value; keep Solo unchanged. Alternatively, changing evidence can test the present confidence rule, or matched-duration practice and retest can test learning. Choose one observed gap, one serious simpler rival and conditions that could reject the addition. A social task needs independent choices, ownership and ambiguous evidence; a new name or a shared progress counter is insufficient. Only then broaden coverage.

The earlier sequence placed social expansion and development before this host test. That order is superseded. Broad cognition, detailed physiology, macro models, multiple engine bindings and a universal plugin/trait ontology remain deferred. Research on sources and interpretations can continue in parallel without adding runtime variables.

## Recovery decision from the new experiment

Keep the normal workloads forgiving. At a **24-round Solo deadline**, another 100-seed block produced **82 Full wins, 81 planned-simple wins and 67 greedy wins** under unchanged 0.2 physics. Planning already helps; Full is not uniquely responsible. At an extreme 18-round deadline in the exploratory sweep, greedy wins more often than either. The [complete recovery exploration](recovery-design-exploration.md) preserves both results and the exact controller.

Do not add an arbitrary efficiency penalty to make Full win. An optional pressure profile is a useful diagnostic candidate, not the next proof of game reuse. Treat capacity and the fallback action as separate responsibilities during integration: stopping impossible exertion does not establish that an actor can access food or chooses to consume it. An authored interruption/setup cost can be tested later only when a host action actually has that cost, with a zero-cost control and a published sensitivity sweep.

Human-data calibration and qualified theological review remain separate tracks. A game can earn a scoped usefulness claim before it explains a human population. Theological representation can earn its place through source fidelity and distinctions the game needs, without having to maximize production. Neither track is replaced by the integration gates.

Your feedback calibrates clarity, tradeoffs and playability. Record the seed, choice and reason—not just whether you won. Improving the game and explaining human behavior require different evidence.
