# Architectures for a reusable human simulation

Research design, 2026-09-06. Independently developed from primary papers and official documentation; this comparison does not assume the earlier Gemini taxonomy. The proposed architecture and evaluation thresholds below are engineering hypotheses, not validated descriptions of humanity. Sources were checked on 2026-09-06.

The strongest starting point is a **small, causally explicit hybrid kernel with replaceable models**, tested against simpler alternatives. A complete runnable specification is attainable; a scientifically complete account of a human is not established by making that specification executable. Coverage should mean that every relevant faculty has an explicit modeling status, including “unmodeled” or “not computationally identified.”

## Five alternatives worth keeping distinct

| Architecture | What it contributes | Strongest case for adopting it | Main failure risk | Proposed role |
|---|---|---|---|---|
| ACT-R, Soar, Common Model of Cognition | Structured perception, working and long-term memory, selection, learning | Task mechanisms can generate inspectable errors and timing predictions | Treating task cognition as a sufficient model of a whole person | Reference architecture and benchmark competitors |
| Dynamical systems and active inference | Continuous feedback; inference under partial observation; regulation and exploration | A body, changing needs, and uncertain perception belong in the same causal process | A flexible generative model explains everything after tuning | Continuous subsystem models; optional active-inference policy |
| BDI, utility scoring, GOAP | Beliefs, commitments, preference comparisons, action planning | Authorable, debuggable, reusable behavior with modest deployment demands | A designer's utility function becomes an unsupported theory of human motivation | Initial deliberation baseline |
| Embodied, ecological, relational multi-agent models | Action possibilities depend on body, environment, others, institutions | Prevents reducing social or bodily problems to personality numbers | Emergence looks convincing while underlying rules remain arbitrary | Affordance, interaction, and institutional layers |
| Explicit modular hybrid | Shared state contracts with replaceable mechanisms | Different phenomena can demand different explanatory resolutions | Unprincipled combinations, duplicated causes, too many parameters | Candidate integration architecture, conditional on ablation and transfer tests |

**Cognitive architectures.** ACT-R exposes theoretical cognitive modules through buffers while explicitly distinguishing software infrastructure from cognitive theory. Soar separates architectural machinery from task knowledge and organizes deliberate behavior through proposed, compared, selected, and applied operators. These distinctions should be borrowed directly: a scheduler or random generator is not a human faculty. The Common Model offers a reference structure, not a certified complete mind; its authors explicitly acknowledge gaps. Emotion and metacognition extensions proposed in 2024 and 2025 make incompleteness especially concrete. Importing a complete ACT-R or Soar runtime may be worthwhile for experiments; mandating one as the production kernel before cross-genre tests would be premature. [ACT-R manual](https://act-r.psy.cmu.edu/actr7.x/reference-manual.pdf), [Soar architecture](https://soar.eecs.umich.edu/soar_manual/02_TheSoarArchitecture/), [Common Model proposal](https://doi.org/10.1609/aimag.v38i4.2744), [emotion extension](https://arxiv.org/abs/2412.16231), [metacognition extension](https://arxiv.org/abs/2506.07807).

**Dynamics and active inference.** These are related options, not synonyms. Differential equations can describe bodily regulation without subscribing to a universal theory of cognition. Active inference adds a generative model, state estimation, preferences, and policy evaluation; discrete and mixed continuous/discrete formulations are available. Its attraction is integrating information seeking with goal pursuit. Its cost is specifying a model and preference structure rich enough to do the work. For this project, compare an active-inference module with a simpler controller on identical tasks; do not use free-energy minimization as evidence that the model captures the soul, morality, or all behavior. The cited synthesis describes a theoretical framework and outstanding validation challenges. [Da Costa et al., 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7732703/).

**BDI, utility, and GOAP.** These should also remain separable: BDI concerns beliefs, desires and continuing intentions; utility scoring compares candidates; planning assembles action sequences. BDI's commitment machinery is useful for promises and resisting constant goal switching. GOAP supplies modular actions with prerequisites and effects; its original real-time game work explicitly discusses CPU cost and caching. Together they provide a strong baseline without claiming biological fidelity. Their uncomfortable implication is that “personality” may merely encode whatever behaviors the designer preferred. Every such weight therefore needs a provenance label. [Rao and Georgeff, 1995](https://cdn.aaai.org/ICMAS/1995/ICMAS95-042.pdf), [Orkin, 2005](https://doi.org/10.1609/aiide.v1i1.18724).

**Embodied and relational models.** Affordances are action possibilities relative to an actor and environment: a stair is not equally climbable for every body. Warren tested body-scaled stair perception; that supports a concrete interaction model, not a universal theory of every faculty. Ecological theorists also disagree with some representational interpretations of affordances. Adopt the engineering insight without pretending to resolve that dispute. Extend the same attention to relationships and institutions: access to food, trusted testimony, duties, and coercion depend on social arrangements as well as individual traits. The proposed social extension is our modeling choice, not a finding from the stair experiment. [Warren, 1984](https://pubmed.ncbi.nlm.nih.gov/6238127/), [Chemero and Turvey, 2007](https://doi.org/10.1177/1059712307085098).

**Hybrid.** The integration claim is modest: a shared causal interface may make competing mechanisms reusable. Keep one authoritative writer per state variable, declared dependencies, physical units, update timing, and recorded influences. Hunger can have several causal effects, but the same estimated effect must not be counted repeatedly under bodily costs, needs scores, and personality adjustments. A hybrid earns its complexity only when it improves a declared evaluation target over a simpler model.

## Functional coverage without invented organs

Use a coverage ledger rather than a fixed inventory of metaphysical parts. Each entry records phenomena, representation, causal scope, evidence, unresolved questions, and disabled-mode behavior.

| Functional domain | Initial representation and boundary |
|---|---|
| Body and lifespan | Nutrition, hydration, sleep, pain, illness, movement capacity, development and aging; include reproductive and sensory capacities where the scenario requires them. Use units and bounded applicability. |
| Perception and attention | Exteroception, interoception, proprioception, selective access, distraction; observations can omit or misrepresent world events. |
| Memory and learning | Working, episodic, semantic and procedural distinctions; forgetting, skill acquisition, habit, and retrieval uncertainty. |
| Reasoning and imagination | Inference, counterfactuals, planning, creativity, language, temporal projection; distinguish generated possibilities from known facts. |
| Affect and motivation | Appraisals, bodily arousal, needs, desires, commitments, curiosity, attachment and meaning; no mandatory universal hierarchy. |
| Volition and self-regulation | Intention formation, deliberation, inhibition, effort, habit conflict, self-monitoring and revision. |
| Relationships and institutions | Mutual histories, testimony, care, trust, roles, duties, group membership, resources, power and coercion. |
| Moral and spiritual life | Revelation-informed normative interpretation; character knowledge, intention, practice, temptation, remorse and aspiration. Distinguish those representations from a measurement of the unseen. |

Terms such as *qalb*, *nafs*, *ruh*, and *aql* should link to theological interpretation records rather than receive compulsory one-to-one software modules. Functional overlap is permitted; identification with a numerical variable requires a separate argument. “All faculties” becomes an expandable obligation to examine omissions, not a claim that this table exhausts a person.

## Closure and choice contracts

Let \(z_t\) be modeled world state, \(x_{i,t}\) an individual's modeled internal state, \(o_{i,t}\) observations, and \(a_{i,t}\) attempted actions. A generic contract is:

\[
o_{i,t}\sim O_m(z_t,x_{i,t};\theta_O),\qquad
(z_{t+\Delta},x_{t+\Delta})\sim T_m(z_t,x_t,a_t,\Delta;\theta_T).
\]

Here \(m\) identifies the selected model. A deterministic observation or transition is a permitted special case. These equations specify interfaces, not laws of human nature. Continuous modules may integrate \(\dot{x}=f_m(x,z,a;\theta)\); discrete modules update on events. Integration accuracy, boundary behavior, simultaneous-event ordering, and unsupported inputs must be specified. An unsupported spiritual effect should return an explicit unmodeled result, never silently become evidence that no such effect exists.

Keep four separate objects: **world conditions, character beliefs, normative evaluation, and presentation**. A rumor changes available testimony; it does not rewrite world history. A designer-visible intention is not automatically known to other characters. A theological interpretation can assess an action while the character misunderstands that interpretation. Empirical evidence about obedience or happiness cannot establish moral truth by optimization.

The chooser receives perceived options, anticipated consequences, commitments and conflicts. It returns an attempted action and declared intention. The world resolves feasibility and consequences afterward, allowing mistaken attempts. Autonomous agents can use BDI, utility or another policy. Player-controlled agents accept player choice, with optional assistance; fatigue or fear can alter information, effort and execution without silently selecting the player's moral decision.

A prohibited act can remain mechanically possible. Hard physical impossibility, a game's deliberate content restriction, a character's self-imposed commitment, and a revelation-derived prohibition require different representations. Record coercion, knowledge, intention and capacity where modeled; do not turn them into a purported divine judgment score. This supports authored agency compatible with the user's desired emphasis on choice while making no claim to simulate metaphysical freedom or divine decree. Randomness is not a substitute for freedom.

For a simple optional policy:

\[
a^*\in\arg\max_{a\in C_i}\sum_k w_{ik}v_{ik}(a).
\]

This is an engineering baseline. \(C_i\) contains proposed attempts, not a list of morally permitted actions. Values, weights, normalization, tie breaking, and missing-value handling must be declared; use priority rules or incomparable alternatives when tradeoffs should not be collapsed. An empty candidate set produces an explicit blocked or waiting state, with a defined next review event. The interface permits a player or competing policy to choose differently.

## Uncertainty, runtime, and language

Record parameter name, units, population and context, source/version, estimation method, uncertainty representation, and whether it is empirical, interpretive, or designed for play. Do not assign a precise probability to every uncertainty: distinguish measured variation, measurement error, unknown parameters, competing mechanisms, and unquantified ignorance. Use ranges or model sets where distributions lack justification. Expose sensitivity and out-of-scope use; a polished numerical answer must not erase either.

Use event-driven updates and several resolutions: detailed foreground deliberation, summarized background schedules, and explicitly approximate population processes. Escalate detail for meaningful interaction, injury, conflict or a player's intervention. Preserve identity, commitments, resources and important episodes across transitions. Approximation must carry an error budget and be tested against a detailed reference; changing distance from the camera must not arbitrarily change a promise or survival outcome. Orkin's practical experience motivates attention to scheduling and caching, but these particular contracts are proposals. [Orkin, 2005](https://doi.org/10.1609/aiide.v1i1.18724).

Replay requires versions of models and interpretation packs, initial states, parameters, event order, external inputs, and independent random streams. Log player decisions. Pin numerical behavior or declare tolerance; seed equality alone does not establish cross-platform reproducibility.

LLMs may verbalize an authorized state snapshot, propose candidate plans, and generate dialogue acts for validation. They do not silently write canonical state or invent remembered events. Dialogue that affects others becomes an explicit event. Preserve generated outputs in replays because provider behavior can change. Maintain a non-LLM fallback and test that disabling language generation preserves core causal outcomes. Generative Agents demonstrates a useful memory/reflection/planning design and believability evaluation; believability is not validation of all human faculties. [Park et al., 2023](https://arxiv.org/abs/2304.03442).

## Experiments that can reject the design

1. **Transfer without hidden rewrites.** Build a survival action RPG adapter and a settlement strategy adapter using the same kernel, character schema, memory and commitment semantics. Only perception, action vocabulary, world mappings, presentation and declared resolution may differ. Freeze shared parameters before the second adapter. Fail if routine transfer requires genre conditionals inside shared mechanisms.
2. **Mechanism competition.** Compare a simple controller, BDI/utility, and active inference on matched uncertainty, scarcity and information-seeking tasks. Give comparable observation access and planning budgets. Predeclare held-out behavioral outcomes and computational cost. Reject additional complexity if gains vanish out of sample or require unrestricted refitting.
3. **Causal separation.** Independently alter real danger and testimony about danger. Check whether beliefs follow received evidence while bodily consequences follow world conditions. Fail on omniscient knowledge leakage or an agent learning an unobserved event without a communication pathway.
4. **Faculty ablations.** Remove memory limits, bodily coupling, commitment persistence, or relationship history one at a time. Predict which outcomes should change before running. Fail a purported mechanism if it changes nothing relevant or every unrelated outcome indiscriminately. Human validity additionally requires matched human evidence; simulation coherence alone is insufficient.
5. **Resolution and replay.** Repeat identical logged scenarios at detailed and coarse resolutions, with changed scheduling and module random streams. Declare acceptable errors before inspecting results. Fail on lost commitments, resource creation, or unrelated-module randomness changing a character's decision.
6. **Agency and norm separation.** Present temptation, uncertainty, coercion and costly helping. Verify that intentional choice and outcome can diverge, prohibited actions remain representable where scenario content allows them, and player decisions survive autonomous-policy disagreement. This tests an interface contract, not free will or divine judgment.

The two adapters should share one small scenario: a tired character promised aid, hears uncertain danger reports, and finds scarce food. The RPG realizes bodily exertion, direct perception and immediate choice; settlement strategy realizes schedules, testimony networks and competing duties. Success means the same mechanisms remain intelligible and causally consistent at both scales. It would justify a reusable simulation kernel; it would not yet justify calling that kernel a replica of humanity.
