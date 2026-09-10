# Human Framework — research proposal v0.1

Prepared 2026-09-06, America/Chicago; current interpretation updated 2026-09-09. This is the broader **research proposal**, with illustrative mathematics, not a specification of everything implemented. A deterministic body/practice/clock kit and richer host experiments now exist; a comprehensive person model and empirical calibration do not. See the [coverage ledger](coverage-ledger.md) for actual boundaries and the [source method](../research/source-method.md) for evidence limits and attribution.

The [latest user direction](direction-2026-09-09.md) leaves games aside and asks how to reach the full goal of situated human action and development. The [roadmap](roadmap.md) proposes a staged route without reducing that goal to the current kit. An adult-over-days/weeks starting point is a recommendation: the user has not selected the horizon or reference situations. This documentation checkpoint does not authorize the proposed next implementation, and the scheduled task remains paused. The user's Sunni, Hanafi–Maturidi starting point and the positive treatment of purpose, worship and moral development below remain part of the research direction.

The sections below retain the original proposal. Their suggested demonstrator and sequence are historical design proposals; use the current roadmap for further decisions.

## 1. What we should try to build

A reusable framework for **situated human action and development**: how an embodied person notices a situation, understands it, experiences motives, recognizes obligations, chooses, acts, and is changed by what follows. It should support different games through the same causal and observation contracts.

The ambition is holistic, but the deliverable is a model of selected human functions. Complete knowledge of the person is not a prerequisite for a useful engine. Each released version can be computationally complete within its declared scope while remaining open about its explanatory limits.

Three different kinds of completeness matter:

1. **Representational coverage:** every relevant faculty or phenomenon has an explicit place, including “acknowledged, not operationalized.”
2. **Computational closure:** each valid state and input leads to a defined next state, a pending choice, or an explicit error/terminal state.
3. **Explanatory adequacy:** the proposed mechanisms survive relevant empirical and theological scrutiny. This is earned incrementally; it cannot be declared from a diagram.

Calling a placeholder a faculty does not satisfy the third condition. A game that runs without errors does not thereby replicate a human being.

## 2. Truth, interpretation, and simulation

Within this project, revelation is true. Our access to and explanation of it require care: a Qur’anic passage, an English translation, a hadith authenticity judgment, a tafsir, and a formula inspired by them are different things. The user's selected tradition supplies the initial interpretive orientation; the author of an algorithm does not become a theological authority by naming a variable in Arabic.

Science supplies disciplined empirical knowledge about the created world. Observations can be noisy; scientific explanations are revisable; simulation formulas are further approximations. This refines “science as the second source of truth” into something operational without treating every published finding as true.

The framework therefore carries five claim types: revealed source, attributed interpretation, empirical finding, explanatory model, and engineering convention. Keep those labels through derivation. A formula inspired by a text remains a modeling decision, unless the text actually establishes that quantitative relation.

An apparent conflict opens an investigation into transmission, meaning, context, evidence, and assumptions. It does not trigger automatic alteration of data or silent reinterpretation of revelation. Unresolved alternatives can be simulated separately; doctrinal commitments are not averaged with regression coefficients.

## 3. Approaches considered

| Approach | Strongest case for it | Limitation | Decision |
|---|---|---|---|
| Compact trait/skill graph | Easy to author, explain, and run at scale; fits the original three-layer intuition | Stable summaries do not by themselves generate motives, changing beliefs, relationships, or reasons for action | Retain as a descriptive view and a simple baseline |
| Established cognitive architecture | Explicit mechanisms for memory, attention, learning, and problem solving; existing research programs | Substantial integration work; does not settle physiology, Islamic anthropology, or the whole social world | Use selected mechanisms and compare against its baselines |
| Unified dynamical or active-inference model | Integrates perception and action; invites common mathematical treatment of regulation and uncertainty | A unifying vocabulary can hide unconstrained assumptions; empirical superiority is task-dependent | Keep as a competing module where it yields discriminating predictions |
| Modular process framework | Different evidence can support different mechanisms; shared interfaces preserve reuse and replacement | Modules can conflict or double-count causes without careful ownership and validation | Recommended architecture to investigate |

The detailed [architecture comparison](../research/architecture-alternatives.md) includes relational/ecological approaches and planning alternatives. This recommendation is an engineering judgment, not a discovery that humans are internally arranged as software modules. The strongest objection is complexity: if a simpler trait model predicts and plays equally well, prefer it for that task.

## 4. A map of human functions

These are **coverage responsibilities**, not twelve fundamental substances or twelve numeric meters. Several functions may share an implementation; theological concepts cross these boundaries. The associated empirical and theological notes distinguish supporting evidence from proposals.

| Responsibility | Minimum representation | Important boundary or example |
|---|---|---|
| Bodily life and regulation | Energy availability, sleep/wake state, effort, injury/illness, pain, sensory and motor constraints; optional reproductive/lifecycle detail | Keep actual condition separate from perceived condition; detailed physiology requires its own model |
| Perception and attention | External senses, interoception, salience, attention limits, available cues | A missing or distorted observation is not a change to world truth |
| Memory and knowledge | Working, episodic, semantic, and procedural distinctions where needed; confidence and source | Remembering a claim is different from the claim being true |
| Reasoning and metacognition | Inference, planning, language, imagination, uncertainty judgment, awareness of error | Intelligence is not one universal learning-speed multiplier |
| Affect and appraisal | Experienced affect, perceived threat/opportunity, coping appraisal, emotion regulation | No compulsory “fear means flee” or universal stress-performance curve |
| Needs and desires | Bodily demands, safety concerns, affiliation, competence, volition, curiosity, status, sexuality, care, rest and play where relevant | Candidate families require scope/evidence; unmet needs influence action without imposing an inflexible ladder |
| Commitments and meaning | Long-term purposes, love, beauty, truth-seeking, worship, service, promises, life narrative | Meaning is not merely another consumable reward; spiritual value is not identical to pleasant feeling |
| Moral understanding and self-examination | Believed duties, understood reasons, intention, conflict, remorse, repentance and repair as distinct events/practices | Character judgment, social approval, and the project's normative reference can disagree |
| Choice and action control | Consideration of options, inhibition, deliberation, intention formation, external/player choice, motor execution | Capacity, inclination, commitment, choice, and outcome are separate |
| Learning, habit, and character development | Practice history, retention, transfer, cue-linked routines, reflection, revision of commitments | Practice is not automatically virtue; frequent conduct and sincere intention are not the same |
| Relationships and social life | Attachment/care, trust, obligations, roles, communication, reputation and power; directed ties | A relationship belongs between persons and has a shared history, not just an individual “social” stat |
| Lifespan and environment | Developmental stage, health trajectory, culture, institutions, material opportunity, tools and ecology | Do not encode poverty, disability, or a social barrier as an intrinsic lack of human worth or ambition |

Creativity, humor, grief, dreams, consciousness, conscience, and spirituality are not thereby fully explained. For example, creativity can involve recombination, expertise, imagination, affect and social reception; grief can involve memory, attachment, body and meaning. Dreams may require a sleep-specific module. Conscious experience can be acknowledged without claiming the engine generates it. A coverage register must identify these composites and the missing mechanisms.

Digital skills use the same processes with specific knowledge, interfaces and tools. Debugging combines relevant knowledge, working memory, hypothesis testing, persistence, collaboration, and practiced tool use; it does not require a separate kind of “digital soul.” Likewise, archery needs a learned sensorimotor policy and equipment/environment relations, not just a weighted sum of general stats.

## 5. Islamic anthropology shapes the model

The starting constraint is personhood, moral significance, dependence on Allah, and accountable action—not a set of Arabic names attached to a secular optimization engine. The [Islamic foundations memo](../research/islamic-foundations.md) supplies exact passages, attributed Hanafi–Maturidi grounding, and unresolved questions.

- **Qalb:** do not define it simply as emotion, conscience, or a goodness score. Qur’an 22:46 associates hearts with reasoning; translating that into a neural localization claim would be an additional, unsupported step. The working model can represent orientation, receptivity, attention, recognition and commitment as related functions while leaving their theological identification explicit. [Qur’an 22:46](https://quran.com/22/46).
- **Nafs:** do not equate it with a permanently evil impulse generator or with Freud's id. Selfhood, desire, self-reproach, and tranquility require contextual reading. A game's state transitions are not an authoritative ladder of souls.
- **Ruh:** acknowledge its place in the project's ontology without inventing units, a depletion rate, or a causal energy budget. The epistemic restraint expressed in Qur’an 17:85 is relevant here; it does not supply a computational mechanism. [Qur’an 17:85](https://quran.com/17/85).
- **‘Aql and fitrah:** investigate reason/discernment and created disposition without equating them with IQ or a numeric probability of professing faith. Exact operational mappings remain hypotheses.
- **Niyyah:** actions with the same outward result can have different intentions. Record intention separately from success, reputation, and consequences. This distinction is textually motivated; any data structure is our convention. [Sahih al-Bukhari 1](https://sunnah.com/bukhari:1).
- **Tazkiyah and moral development:** allow practice, reflection, correction, repentance, relationships, and changed commitments to matter. Do not award a computable salvation score, infer sincerity from performance, or treat worldly success as a reliable sign of divine approval.

Spirituality must have positive representation: a person can orient life toward Allah, worship, struggle against an impulse, seek forgiveness, value truth above advantage, or act from hope and love. Protecting the unknowable does not mean omitting these phenomena. What remains excluded is a claim to calculate divine acceptance, the essence of ruh, or a person's ultimate standing.

The project’s normative reference, the character's understanding of that reference, and the character's actual conduct need distinct records. A physically possible prohibited act must remain possible in a simulation of temptation and responsibility. Normative evaluation should yield sourced, contextual statements and unresolved questions, not omniscient verdicts on a soul. A prototype should use a few reviewed cases rather than claim to automate all fiqh.

## 6. Agency and causal explanation

The Hanafi–Maturidi starting point requires careful treatment of human choice and divine creation; a software policy cannot adjudicate that metaphysics. The narrower engineering promise is testable: **the model conditions action without silently replacing a supplied choice**.

The engine computes opportunities, perceived options, pressures, expected consequences, and likely NPC actions. A choice provider may be a player, authored intention, experimental intervention, or NPC policy. A person can try something unwise or morally wrong. Physically impossible actions fail with an explicit reason; difficult actions may fail despite sincere intention.

For NPCs, a deterministic or stochastic policy is a representation of behavior, not proof of authentic free will. Randomness does not solve the philosophical problem; replay determinism is not a statement about qadar. A saved seed is an engineering device, never a model of divine decree.

## 7. Provisional mathematical interfaces

Everything in this section is an **illustrative engineering model**, unless a future source record establishes and calibrates a particular relation. There are no scientifically established universal constants here. Normalized variables are conveniences tied to a module's task, not measurements of whole-person worth or fixed natural capacities.

Let \(W_t\) be world state; \(x_t\) a person's modeled body, cognition, motives, skills, commitments and relationship views; \(b_t\) their beliefs; \(\Theta\) a versioned parameter set; and \(\Delta t>0\) elapsed simulated time. Authoritative state is not automatically accessible to a chooser or to the game's viewpoint.

**Observation and belief are distinct from reality:**

\[
o_t\sim O_{\Theta}(W_t,x_t),\qquad
b_t^+=B_{\Theta}(b_t,o_t,\text{attention}_t,\text{memory}_t).
\]

\(O\) returns observations with source, time, omissions and uncertainty; \(B\) is a chosen updating rule. The superscript \(+\) means updated within the current decision event, not one time unit later. The order is prior beliefs → observation → updated beliefs → noticed options → choice → consequences. Exact Bayesian updating is an available idealized baseline, not a requirement that people be rational Bayesians. Confidence and observation noise must be calibrated if interpreted statistically.

Construct an actor-accessible view \(v_t=V(o_t,b_t^+,\text{accessible internal experience})\). It includes perceived bodily condition, available memories, expressed motives and recognized commitments, not privileged access to true fatigue, unknown dangers or another person's intentions. A separate typed channel may let bodily mechanisms influence attention or execution without exposing their hidden state as deliberative knowledge. An omniscient authoring inspector is a different interface.

**Motives can coexist:** a simple need-pressure candidate is

\[
p_i=w_i(x_t,\text{context})\,\max(0,n_i^*-n_i),
\]

where \(n_i\) is a specified satisfaction/resource proxy and \(n_i^*\) a scenario target. Commitments and pursuits of truth, service or worship are represented separately; they need not be reducible to deficits. Candidate policies compare multiple considerations. No rule says all higher pursuits disappear until every lower need is satisfied. Maslow's metamotivation is a source of candidate questions, not the validation of this equation; [Tay and Diener's observational study](https://pubmed.ncbi.nlm.nih.gov/21688922/) also argues against assuming a strict gating order from need associations.

**Choice is an input boundary:**

\[
q_t=\begin{cases}
u_t, & \text{external choice supplied},\\
\pi_{\Theta}(\widehat A_t,v_t), & \text{NPC policy enabled},\\
\text{PendingChoice}, & \text{otherwise}.
\end{cases}
\]

\(q_t\) is a choice request containing the intended attempt and any declared intention; \(\widehat A_t\) contains noticed candidate actions derived from the actor-accessible view. Both external and NPC requests pass through the same attempt validator. A supplied action outside the noticed list is assessed explicitly rather than silently converted to the policy's preference. The validator returns an accepted attempt \(a_t\), a structural rejection, or a pending state. Player choice does not guarantee bodily capacity or success.

The world adapter may use hidden state to resolve an attempt, but diagnostic reasons stay in a developer-only trace. Character-facing feedback passes through the observation interface. Trying a secretly locked door is an action with time/cost and observed feedback, not a free preflight query that reveals hidden locks. Structural errors such as an invalid action identifier can be rejected before world resolution. Unknown obstacles normally produce attempted action and observable consequences, rather than hidden-world information being returned directly to the chooser.

One baseline policy can use a utility vector for anticipated need relief, goals, effort, risk, relationships, and the actor's moral assessment. Scalar weighting, lexicographic priorities and deliberative commitments are competing policies; none is “the human decision equation.” If using a softmax, its temperature models unexplained choice variability, not a quantity of free will. Specify ties, empty action sets, and time budgets.

**Performance is task-specific:**

\[
P(\text{success}\mid a_t)=\sigma\left(\beta_0+\sum_j\beta_j z_{j,t}+\sum_{j<k}\beta_{jk}z_{j,t}z_{k,t}\right),
\qquad \sigma(v)=\frac1{1+e^{-v}}.
\]

\(z\) contains declared, dimensionless task features: relevant practice, fatigue proxy, equipment fit, distance, support, or time pressure. Coefficients require fitting or explicit fictional scenario defaults. This functional form is not itself an empirical claim, and some tasks need continuous error distributions or physical models instead. Do not insert “faith” as a universal accuracy buff.

**Practice, retention and transfer have distinct causes:** for a skill proficiency proxy \(s_j\in[0,1]\), an illustrative session update is

\[
s'_j=s_j+(1-s_j)\big(1-e^{-\eta_j q_j\tau_j}\big),
\qquad
s_j^{\text{after}}=r_j+(s'_j-r_j)e^{-\lambda_j d_j},
\qquad r_j=\min(\bar r_j,s'_j).
\]

\(\tau_j\ge0\) is relevant practice duration; \(q_j\in[0,1]\) is a defined practice-quality proxy; \(\eta_j\ge0\) has units inverse time; \(\lambda_j\ge0\) is an inverse-time retention parameter; and \(\bar r_j\in[0,1]\) is a configured retained-component floor. Its effective value \(r_j\) never exceeds proficiency after practice. Thus retention alone can preserve or reduce proficiency, never increase it. \(d_j\ge0\) is subsequent time without relevant practice; the illustrated interval lasts \(\tau_j+d_j\), and does not apply retention over the practice duration again. This simple split-step approximation requires refinement checks for mixed activity schedules. Consolidation or recovery that increases performance would need a separately justified process. This convenient saturation/retention model is not a claim that all learning has this shape, that all skills decay, or that one means perfect human mastery. Domain, stage, sleep, instruction, health and interference may alter the appropriate model.

For transfer, a candidate target increment is

\[
\Delta s_k^{\text{transfer}}=T_{kj}(\text{task, context})\,\Delta s_j^{\text{direct}}.
\]

Default unsupported transfer links to zero. Allow tested negative transfer. Apply bounds explicitly and report clipped changes. Credit transfer once from direct practice, never recursively from transferred gains: otherwise circular graphs create free improvement. A relation can be changed or removed when it fails held-out tasks. Heredity affects initialization or development only through a declared model; population heritability is not a per-person percentage.

**Consequences and history close the step:**

\[
(W_{t+\Delta t},x_{t+\Delta t},b_{t+\Delta t})=
F_{\Theta}(W_t,x_t,b_t^+,a_t,\Delta t,\xi_t),
\]

where \(\xi_t\) is an explicit disturbance input. Only accepted attempts enter this transition; rejected and pending requests have separate host-defined handling. Updated beliefs persist, with any forgetting or internal revision declared by its owning module. Actual outcomes affect beliefs only when a subsequent observation/communication event makes them available; the world transition cannot copy hidden outcomes into belief records. Reaction or deliberation delays, if modeled, have explicit durations independent of integration step size. Store state transitions, choices, event ordering, model versions and disturbances; language-model descriptions must refer to this record. “PendingChoice” pauses or advances time only under an explicit host policy. Unsupported operations return an error or declared fallback, never invented physiology.

## 8. Uncertainty belongs to the right object

Separate uncertainty about the world, a character's uncertainty, our uncertainty about parameters, disagreement between models, and theological interpretive uncertainty. They can have different representations. Some accept probability distributions; others need alternatives and reasons. A number without an elicitation or measurement basis is not an improvement over saying unknown.

For uncertain empirical parameters, explore an admissible set \(\Theta\in\mathcal T\). Report

\[
\mathcal Y=\{f(\theta,m):\theta\in\mathcal T_m,\ m\in\mathcal M\}
\]

across plausible model variants. Probability-weighted summaries require justified model weights. Otherwise show ranges and disagreements. If behavior reverses across credible parameter settings, label the conclusion fragile. Never force epistemic closure by selecting a pleasing coefficient.

## 9. Reuse and bounded generation

The proposed kernel owns causal state transitions, time, observations, choice contracts, provenance and replay. A game adapter supplies world semantics, opportunities, task outcomes, presentation and chosen time resolution. A domain module owns its quantities and conversions; one canonical fatigue state, for example, can inform multiple processes without each module independently applying the same penalty.

**2026-09-07 integration correction:** this remains a proposal, not the current 0.2 interface. The [direction review](post-mvp-review.md) found that the executable laboratory still owns the world and all actor turns. For the first host integration, the host will own scheduling and authoritative world outcomes; human modules will consume declared elapsed durations and validated observations/outcomes. Replay must include host events or versioned host resolution, and physical task units must be converted explicitly to goal value. Extract this boundary from one consumer before designing a universal interface.

Start headless. Export facts, character reports and causal traces separately. A later inspector can show why an agent acted, what it believed, and which reasons came from the actual policy; a game's HUD can show only what its viewpoint can know. Preserve an accessible way to investigate unreliable reports.

The optional LLM proposes a manifestation with a task definition, existing process/skill references, preconditions, resource costs, uncertainty and an explanation. A validator checks identifiers, units, bounds, opportunity, duplicate effects, transfer attribution and narrative consistency. It cannot create new latent faculties, arbitrary multipliers or historical facts merely by naming them. Prefer authoring-time generation initially. Cache accepted proposals for reproducibility; when a proposal is invalid, use declared authored content or no proposal.

Two adapters should exercise the same core: a small tactical defense scenario and a cooperative workshop/expedition. They change skills, equipment, institutions, opportunities and UI; shared observation, choice, learning and history contracts should not require editing. Performance fidelity can differ, but every approximation must declare what behavior it no longer supports.

## 10. How this proposal could fail

A framework with a place for everything may explain nothing uniquely. Require each new mechanism to improve a discriminating prediction, a gameplay requirement, or a theological representation that cannot be expressed honestly without it. Avoid accumulating theories merely because their vocabulary fits.

An individual-only simulation will misattribute opportunities and institutions to character. A morality-as-reward policy will misrepresent principled sacrifice. A trait-to-skill tree will struggle with tools and compensatory strategies. A vivid LLM explanation may be a post-hoc story. The design above addresses these risks structurally, but the tests must show whether it succeeds.

The next decision should be a **small comparative demonstrator**, not a claim of a final universal ontology. The [validation program](validation-program.md) specifies the experiments, counterexamples, staged scope, and criteria for expanding. The proposal's boundaries are relatively firm; the particular module count, equations and parameter values remain deliberately revisable.
