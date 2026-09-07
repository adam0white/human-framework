# What this prototype proves, and what comes next

Make each mechanism earn its place in a small, understandable situation. The games establish a working loop and reproducible comparisons; their weaknesses give us the next experiments.

## What is actually running

Three games combine body, hazard beliefs, task practice, promises and simple trust for two actors. **Solo Repair is the persistent single-person control:** work, rest, eat or inspect, with no peers, promises or social effects. Player choices override automatic ranking. Consequences are traced and replayed without an LLM.

The loop's “understand” label summarizes accessible facts; comprehension, episodic memory, emotion and multistep planning are absent. Assistance prepares support for another actor without consent or negotiation.

**Baseline and full use the same world rules when their module switches match.** Both get tired, learn from practice, face the same hazards, and can fail. The baseline chooses with a fixed scoring recipe: work output adjusted by current proficiency, and small fixed scores for other actions. It mostly ignores its available bodily, hazard, relationship and commitment information when choosing. The full policy weighs those signals, so it sometimes sacrifices immediate output to inspect, recover or keep a promise. “Full” means all current considerations, not a complete human model.

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
| Repair Bench | Skill, fatigue, recovery and output compete. The full policy currently completes fewer orders. | Compare equal-duration work/rest schedules, followed by the same retest, to separate immediate productivity from later capacity. |
| Water Commons | Consumption makes delay costly; helping and personal recovery compete with collecting. | Let someone request a scarce resource and another independently accept or refuse. Does relationship history change choices for traceable reasons? |
| Solo Repair | One person's work/recovery tradeoff, isolated from social causes. | Keep it throughout later iterations: switching off relationships or promise weighting must leave choices and outcomes unchanged. |

All four share an aggregate-progress structure. Another theme alone adds little reuse evidence. The [benchmark](benchmark-report.md) retains losses and mechanisms with no objective effect.

## What remains on the research shelf

**Promising but unused:** bounded attention; actor-owned memory and forgetting; learned habits versus planning; emotional appraisal and regulation; broader motives including worship, beauty and service; revisable commitments; testimony and mistaken beliefs about others. Each needs a situation where its presence changes a prediction. Existing cognitive and social architectures provide alternatives to compare, not a list of components to install together.

**Rejected historical claims:** an individual's stats computed from population heritability percentages; innate personality instantly granting medicine or programming; universal skill-to-intelligence gains; fixed lifetime malleability caps; qalb health points, ruh as an altruism meter, and guaranteed emergence from interconnected sliders. The [historical audit](../research/historical-source-audit.md) explains the specific failures.

**Deferred scale:** detailed physiology, childhood and aging, inheritance, institutions, economics, community cohesion and cliodynamics. Adaptive interfaces and contracting time remain presentation experiments. Simulating microphysics to obtain people is outside this project's implementation route. [Coverage details](coverage-ledger.md).

## Three practical iterations

1. **Make decisions legible; repair information seeking.** Compare simple inspection stopping rules against the current policy on fresh, redundant and changing evidence. Accept when traces explain the actual choice, unavailable facts stay hidden, and useless repetition stops without suppressing useful inspection. Play one seed manually, then replay it automatically: mark the first unclear, predictable or apparently unfair decision and what information you expected.
2. **Add one genuinely social task; preserve Solo Repair.** Implement a request, independent response and observable aftermath, including an unsuccessful attempt with an unknown cause. Accept when actors can disagree, outcomes do not reveal sincerity, and the solo control remains independent of social settings. Compare replays differing in one promise or piece of evidence; explain whether the response made sense.
3. **Test development and choose a calibration target.** Compare practiced, unpracticed and delayed-retention conditions at equal durations; vary action costs and deadlines. Accept when gains stay task-specific unless justified, simpler explanations are compared, and conclusions survive reserved scenarios/seeds. Separately choose one real task and population before fitting human choice or timing data.

Your feedback calibrates clarity, tradeoffs and playability. Record the seed, choice and reason—not just whether you won. Improving the game and explaining human behavior require different evidence.
