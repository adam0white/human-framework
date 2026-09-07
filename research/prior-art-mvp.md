# Prior art and scope decisions for the first runnable framework

Research snapshot: 2026-09-06, America/Chicago. Primary papers, original developer accounts, official documentation, and repository license files were checked live. This is a bounded architecture investigation, not a systematic review or a runtime benchmark. No external engine was installed, executed, or vendored. Recommendations below are engineering judgments informed by these sources.

## 1. The useful target is a reusable causal contract

Build a small, inspectable action loop and two or three deliberately ordinary scenarios. The contribution to investigate is the combination of explicit observation limits, competing motives, chosen intention, consequences, and development under the project's Islamic interpretive boundaries. Neither utility selection, social simulation, symbolic cognition, nor agent-driven narrative is new. Existing systems already demonstrate rich, legible behavior without LLM calls.

The two newly supplied UHTF reports are useful historical proposals. The production-ready report's claims of completeness and assured emergence are not evidence of those outcomes. Both contain equations but do not specify enough scheduling, observation, action-execution, or validation detail to constitute an executable contract. Their faculties and coefficient tables should therefore enter the candidate register individually, not become the engine's mandatory ontology. The current user request independently establishes that the runtime must work with structured data and algorithms alone.

Our first kernel should connect **world/body → observation → belief → appraisal and competing motives → choice → attempt → consequence → memory/development → next observation**. Relationships and social contexts influence several steps. A rendered explanation is a view of this trace; it never becomes the authoritative state that the next step has to interpret.

## 2. Close predecessors and what each actually buys

| Predecessor | Verified mechanism or capability | What to borrow | What it does not establish |
|---|---|---|---|
| **The Sims / Edith** | Objects provide executable behaviors, feasibility checks, and advertisements describing satisfaction of motives. The original document also separates simulation operations from audiovisual presentation. | Let scenario objects supply action definitions and predicted effects; keep selection distinct from execution and rendering. | A happiness-maximizing character is not a complete model of human motivation or moral agency. [Forbus and Wright, 2001](https://www.qrg.northwestern.edu/papers/Files/Programming_Objects_in_The_Sims.pdf) |
| **Versu** | Social practices supply available actions and role-specific expectations; characters evaluate consequences using desires. Practices can be instantiated with different characters in the same roles. | Author reusable practices such as making a request, taking turns, borrowing, or fulfilling a promise. Distinguish person from role. | Its social conventions and utility weights are authored content, not universal social laws. [Evans and Short, architecture paper](https://versu.com/wp-content/uploads/2014/05/versu.pdf) |
| **Comme il Faut / Prom Week** | Social exchanges separate an initiator's desired relationship change, the responder's acceptance/rejection, and the dialogue scene that realizes the result. Multiple social considerations influence choices. | An attempt to persuade or apologize must allow an independent response. Generate text after the structured result. | Popularity, romance, or fictional social appropriateness cannot substitute for the project's normative reference. [Original project explanation](https://promweek.soe.ucsc.edu/page/2/) |
| **Ensemble** | A JavaScript evolution of CiF, with authored schemas, history, trigger rules, volition rules, characters, and actions. | A concrete later comparison for rule-driven social interaction; its explicit authoring burden is informative. | Having a flexible schema does not supply culturally valid rules or demonstrate empirical accuracy. [Official repository](https://github.com/ensemble-engine/ensemble) |
| **FAtiMA Toolkit** | Modular emotional appraisal, emotional decision making, social-importance dynamics, and a role-play character perception-action cycle; C# assets and authoring tools. | Appraisal as an interpretation of an event in light of beliefs/goals; an authored interface between emotion and action. | Emotion labels and appraisal rules remain model choices requiring validation for their intended population and task. [Official toolkit](https://github.com/GAIPS/FAtiMA-Toolkit), [authors' 2021 paper](https://arxiv.org/abs/2103.03020) |
| **PsychSim** | Decision-theoretic agents maintain uncertain private beliefs and models of other agents. The original paper supports role interventions and explanations grounded in beliefs/preferences. | Conflicting world models, source credibility, bounded reasoning about another person's likely response. | Recursive theory of mind is not a license to make every NPC perfectly strategic. [Pynadath and Marsella, 2005](https://people.ict.usc.edu/~pynadath/Papers/ijcai05.pdf) |
| **Soar** | Operator proposal, selection, and application over working memory, with distinct procedural knowledge and additional memory/learning facilities. The manual explicitly distinguishes the architecture from task knowledge. | A later deliberation/planning adapter and a disciplined separation of engine mechanics from authored knowledge. | A general cognitive architecture does not arrive knowing this game's world, social customs, or obligations. [Official architecture manual](https://soar.eecs.umich.edu/soar_manual/02_TheSoarArchitecture/) |
| **ACT-R** | A theory and software system for modeling cognition with explicit mechanisms; its implementation exposes an external RPC interface. | A specialist comparison when a scenario needs memory retrieval, attention, or response-time predictions. | Importing the entire runtime would not validate our physiology, ethics, relationships, or lifespan assumptions. [Official project](https://act-r.psy.cmu.edu/), [reference manual](https://act-r.psy.cmu.edu/actr7.x/reference-manual.pdf) |

These are overlapping alternatives, not eight components to stack. In particular, utility scoring, FAtiMA's decision rules, PsychSim's planning, and Soar's operator selection should compete behind a choice-policy interface. Running all four without a causal ownership rule risks counting the same concern repeatedly.

### Reuse feasibility, checked rather than assumed

| Candidate | Current published license / integration surface | MVP decision |
|---|---|---|
| FAtiMA | [Apache-2.0](https://github.com/GAIPS/FAtiMA-Toolkit/blob/master/License.txt); C# library assets, with authoring tools | Strongest later appraisal comparator, particularly for a Unity adapter. First verify its examples in isolation. |
| PsychSim | [MIT](https://github.com/usc-psychsim/psychsim/blob/master/LICENSE); Python package | Strongest later uncertain-belief/planning comparator. Bound horizon and recursive-model depth. |
| Ensemble | [BSD-4-Clause, University of California-specific](https://github.com/ensemble-engine/ensemble/blob/master/LICENSE.md); standalone JavaScript library | Relevant browser-native comparator. Its license includes an advertising acknowledgement requirement; do not treat it as generic MIT/BSD-3-Clause. |
| Soar | [BSD license file](https://github.com/SoarGroup/Soar/blob/development/LICENSE.md); native runtime and language bindings | Defer until a planning or learning experiment justifies integration. |
| ACT-R | LGPL 2.1 according to the [official manual](https://act-r.psy.cmu.edu/actr7.x/reference-manual.pdf); Common Lisp with external interaction support | Defer to a specialist cognitive benchmark. Packaging obligations and dependencies need review if redistributed. |
| Sims, Versu, commercial game references | Public descriptions were read; no reusable engine-code grant was established by this review | Learn from described ideas. Do not copy game code, authored content, assets, or assume a paper licenses an implementation. |

License labels are a dated repository check, not a dependency audit or assurance of current Apple Silicon compatibility. Before adding a package, pin an exact revision, execute an example, check transitive dependencies and included assets, and measure the relevant workload. For the first few toy scenarios, an independently written, dependency-light core is easier to inspect and compare.

## 3. What the loop must preserve

The following are proposed contracts, not claims about a discovered anatomy of the mind:

1. **Observation is a projection.** An NPC policy receives its observation/belief view, not world truth. Unavailable information remains unknown. A world-side execution check may fail an attempted action without revealing an unseen reason.
2. **Actions carry structured intentions and advertised consequences.** Estimated costs and benefits may be mistaken. Only execution determines actual outcome. This also makes mistaken trust, learning from disappointment, and unreliable tools possible.
3. **Capacity, preference, and supplied choice are separate.** A fatigued person may still choose to help. A player or experimental intervention can choose against the NPC's ranking. If an attempt fails, record whether the problem was capacity, circumstance, consent, or chance rather than silently substituting another action.
4. **Each change has an owner.** World execution owns resource transfers; bodily dynamics own fatigue; a memory rule owns retained observations; a relationship rule owns a directed trust update. Appraisal can read them but should not quietly apply the same consequence again.
5. **Runtime explanations use records.** Store available options, the factors considered, the chosen intention, observed results, and updates. Templates can express these. An optional later LLM may translate arbitrary input into a validated command proposal, but its prose cannot bypass validation or repair missing state.
6. **Time is explicit.** Include simulation duration and scheduling order. Use a seeded random source, explicit tie handling, and serializable state. Replays must not depend on wall-clock timing or animation frame rate.

An inexpensive NPC policy can initially score competing considerations. That is a behavioral approximation, not a reduction of worship, duty, love, or truth to pleasure. Some commitments may be represented as policies, constraints, or priorities rather than interchangeable reward terms. A character's self-understanding, community approval, and sourced normative assessment remain distinct. No predecessor above supplies the project's Islamic interpretation, and none should determine it by architectural accident.

One failure to test immediately is **action thrashing**: if tiny score changes cause a worker to rest, work, rest, and work on successive ticks, the simulation may look responsive while achieving nothing. Conversely, a hard action lock can make an agent ignore an urgent danger. Test modest switching costs or action duration with explicit interruption conditions; treat their coefficients as engineering conventions.

## 4. Ordinary scenarios that can expose unnecessary complexity

All three proposals below use finite structured actions and can run headlessly. Their apparent simplicity is useful: a more complicated policy must earn its cost through observable behavior and intelligible intervention effects.

| Scenario proposal | Simple playable objective | What it probes | How the framework could fail |
|---|---|---|---|
| **One parcel, two routes** | Deliver one parcel before a deadline; choose a known long route or an uncertain short route, with optional rest and inspection. | Fatigue, information gathering, promised arrival, chosen risk, time costs. | The rich policy cannot outperform or explain anything beyond a shortest-path/threshold baseline; hidden route truth leaks into the UI. |
| **The shared workbench** | Two people complete a small order using one tool and limited material; they can request, lend, wait, help, work, or rest. | Directed relationships, refusal, coordination, costly assistance, skill-specific practice. | Social scores automatically force acceptance; “help” creates resources; both agents deadlock; every action teaches every skill. |
| **A doubtful signal** | Keep a small outpost supplied while deciding whether to inspect an uncertain warning or continue work. | Belief versus fact, source reliability, preparation, possible false alarms, interruption. | Warnings receive arbitrary story outcomes; unknown is treated as safe; uncertainty is shown as exact knowledge. |

For each, compare a fixed script, a simple threshold/utility policy, and the full loop using the same world rules. Keep identical seed sets and authored starting states; also test multiple seeds because one attractive replay is weak evidence. Measure completion, resource use, interruption, observation errors, unresolved choices, and runtime cost. Use counterfactual pairs that change exactly one factor, such as promise strength or cue reliability.

Passing these tests demonstrates operational reuse and causal intelligibility. It does not demonstrate that the probabilities match real humans. Empirical claims require human data and a declared population/task; simulated outputs generated from our assumptions cannot be recycled as validation data. The ODD protocol's updated purpose-and-pattern requirement is useful here: specify what the model must explain and which observations count before expanding its mechanism list. [Grimm et al., 2020](https://www.jasss.org/23/2/7.html)

## 5. Macro history and community cohesion: future constraints, not automatic emergence

The strongest case for the user's cliodynamics direction is that individual plausibility alone is insufficient. A collection of locally convincing decisions might yield implausible institutions, migration, conflict, or cooperation. Multiple patterns at different scales can constrain model structure and parameter choices; this is a central proposal of pattern-oriented modeling. It offers a principled answer to “where should detail stop?”: retain detail when it improves specified patterns or intervention responses. [Grimm et al., 2005](https://todd.bendor.org/upload/Grimm%20et%20al%202005.pdf)

But macro agreement is not sufficient either. Different micro mechanisms can generate the same aggregate curve. Our inference is that a tuned collapse cycle would not validate the psychology that produced it, especially if collapse was already encoded in the scoring rules. Turchin and colleagues' historical modeling explicitly includes geography, military technology, intersocietal competition, and institutions; this differs from simply multiplying a two-person trust model. Their 2013 model tests a particular cultural-evolutionary hypothesis against historical spatial patterns. Their 2022 study compares candidate predictors of sociopolitical complexity using Seshat data. Neither establishes one universal human update equation. [2013 paper](https://doi.org/10.1073/PNAS.1308825110), [2022 paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC9232109/)

There is a concrete evidence-handling lesson. The 2019 Seshat article *Complex societies precede moralizing gods throughout world history* is marked **retracted**. A published reanalysis showed that treating missing records as known absences could change the inferred temporal relationship. This is a reason to examine coding, time resolution, uncertainty, and alternative analyses; it is not a refutation of all historical modeling or a judgment about revelation. [Original article's retracted status](https://www.nature.com/articles/s41586-019-1043-4), [Beheim et al., 2021 reanalysis](https://www.nature.com/articles/s41586-021-03655-4)

Likewise, “cohesion” needs an operational definition. Chan, To, and Chan distinguish the construct from its causes and consequences; this warns against naming a weighted sum of prosperity, trust, and obedience “cohesion” and then using that same score to prove cooperation. [Original 2006 article](https://link.springer.com/article/10.1007/s11205-005-2118-1)

A later macro study should choose a bounded phenomenon, such as trust repair after an unreliable public signal. Add actual communication networks and institutional rules; predeclare metrics; reserve some communities or periods for evaluation; test competing micro models and parameter ranges. Do not encode cohesion as moral worth, equate agreement with justice, or force historical events because the model is expected to reproduce them.

## 6. Adaptive UI and nonzero time: preserve the seam now

**Knowledge-dependent interface.** Cogmind's developer describes sensors that reveal the presence of a robot and separate interpreters that refine the information into size or identity. Equipment can therefore change what the interface can tell the player. This is direct precedent for information as a gameplay capability. [Original developer account](https://www.gridsagegames.com/blog/2014/11/information-warfare/)

Our extension could let knowledge, attention, tools, and testimony change annotations, confidence, remembered map detail, and available interpretations. A debug observer may inspect world truth, but the player view should be explicitly separate. Accessibility controls and basic command legibility should remain available; obscuring actionable information can represent uncertainty without making text physically unreadable. This is a design hypothesis to playtest, not an established benefit of adaptive UI.

**Contracting time.** SUPERHOT's official FAQ explicitly acknowledges that time continues very slowly when the player does not move. The user's proposal therefore has a close mechanical predecessor. [Official FAQ](https://superhotgame.com/faq)

Use a presentation adapter mapping wall-clock duration to simulation duration with a positive minimum rate in the eventual mode. Preserve ordering of events, deadlines, and duration-sensitive costs. First implement controlled stepping for reproducible experiments; slowing the experience later should not change the core's answer for the same sequence of simulation inputs. Save/load and operating-system suspension require explicit policies rather than an unqualified promise that time literally never pauses.

**Adaptive pacing.** Valve's Left 4 Dead director uses a deliberately rough intensity estimate to control the timing of threat populations. It is evidence that useful pacing can arise from limited models; it is not a validated measurement of a player's emotion. [Booth's original slides, 2009](https://cdn.cloudflare.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf)

Keep a future drama/pacing controller distinct from the human model. Its interventions must be logged. Otherwise a director secretly rescuing or pressuring agents could be mistaken for emergent human behavior.

## 7. Decision boundary for this MVP

**Build now:** the structured loop, explicit observation views, external and NPC choice providers, action execution, bounded resource and skill updates, directed relationship history, seeded replay, finite scenario adapters, and an inspectable UI. Include the trivial baseline in the same runner. Document all numerical defaults as uncalibrated unless specific evidence establishes them.

**Reuse later after isolated comparison:** FAtiMA for appraisal, PsychSim for uncertain social reasoning, Ensemble for authored social rules, and Soar/ACT-R for a specific cognitive benchmark. Adopt a dependency when it beats the small implementation on the declared test, authoring effort, or maintenance cost.

**Defer with explicit extension points:** detailed physiology; lifespan and inheritance; institutional and historical dynamics; adaptive perception UI beyond basic uncertainty; nonzero wall-clock time; free-text command compilation; and longer narratives.

**Reject as default direction:** simulating microphysics to obtain people; demanding every faculty have a numeric meter; adopting inherited coefficient tables as empirical laws; filling missing data with false certainty; claiming population heritability determines an individual's stat; using LLM prose as required runtime state; and advertising predictable community cohesion or realistic civilizations merely because agents interact. A bounded executable approximation is achievable. Its whole-human realism remains a research question.
