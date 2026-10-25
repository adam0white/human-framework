# Player approximation and a Show HN for HF

Research date: 2026-10-21. Read-only research. No repository changes or public submission.

**Evidence key.** **Confirmed** means the cited source was inspected today. For local documents, the file URL identifies the inspected checkout. Confirmation establishes what a document or author reports. It does not independently validate the underlying model. **Assumed** marks inference, predictions, design choices, and untested ideas. This label applies to every sentence in its paragraph or table cell unless another label intervenes.

## A. Prior art and relevant, buildable ideas

### 1. What HF can honestly offer

**Confirmed.** HF describes a deterministic TypeScript person model. Its host supplies available actions, percepts, and actual outcomes. HF scores actions using named terms, applies vetoes, and resolves suggestions. The package explicitly excludes calibrated human behaviour. Its parameters are engineering defaults. Maps, inventories, payment, and physical action resolution belong to the host. Sources: [architecture](https://github.com/adam0white/human-framework/blob/main/docs/framework.md), [package README](https://github.com/adam0white/human-framework/blob/main/packages/human/README.md).

**Assumed.** The strongest connection between the two research threads is a demonstration: create an editable approximation of yourself, place that character in two situations, and inspect why its choices differ. The useful claim is that the same character remains interpretable across situations. Whether it predicts you is a separate question.

### 2. Personality and motivation prior art

| Prior art        | Confirmed finding and source                                                                                                                                                                                                                                                     | Assumed implication for HF                                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Big Five / BFI-2 | The authors describe 60-, 30-, and 15-item forms. They report domain-level measurement tradeoffs and warn against using the shortest form for facets. [Soto and John](https://www.colby.edu/wp-content/uploads/2013/08/Soto_John_2017b.pdf)                                      | Use continuous estimates. A tiny scene sequence cannot inherit questionnaire validity. Keep item scores separate from the HF mapping.                          |
| HEXACO           | The inventory has self-report and observer forms. Its site restricts free use to specified academic research and requests contact for other uses. [Inventory and terms](https://hexaco.org/hexaco-inventory)                                                                     | Its dimensions are relevant to HF temperament. Do not copy the official questionnaire into a public game without resolving permission.                         |
| IPIP             | Its items and scales are public domain, including permission to edit and translate. [Project](https://www.ipip.ori.org/)                                                                                                                                                         | It offers a practical starting point for explicit questions. Rewriting items as dialogue still creates a new measurement problem.                              |
| Myers-Briggs     | McCrae and Costa found no support for truly dichotomous preferences or qualitatively distinct types in their study. They found dimensional relationships with personality measures. [Paper abstract](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1467-6494.1989.tb00759.x) | Avoid assigning players permanent types. Offer plain descriptions with visible uncertainty. This critique does not establish that every MBTI use is worthless. |
| Bartle           | The original paper concerns interests and interactions in MUDs, organised around four player orientations. [Original paper](https://mud.co.uk/richard/hcds.htm)                                                                                                                  | Use it to ask what play someone wants. Do not convert a MUD preference into a general personality diagnosis.                                                   |
| Quantic Foundry  | Its authors describe a survey-based model of 12 gaming motivations, derived through statistical analysis of how motivations cluster. [Model development](https://quanticfoundry.com/2015/07/20/how-we-developed-the-gamer-motivation-profile-v2/)                                | Keep gaming preferences separate from temperament. Wanting fictional destruction does not by itself establish aggression outside games.                        |

**Confirmed.** Kosinski, Stillwell, and Graepel reported predicting personality and sensitive attributes from Facebook Likes. They also warned about application without individual consent or awareness. [Original study](https://doi.org/10.1073/pnas.1218772110).

**Assumed.** That is a reason to avoid covert inference, not a recipe for HF. Do not import social accounts, browsing history, session timing, or inferred religious and political attributes. A player should choose whether the output represents themselves, an aspirational self, or a fictional person.

### 3. Games as character tests

**Confirmed.** In a developer interview, _Silent Hill: Shattered Memories_ producer Tomm Hulett describes an evolving profile based on play. He explicitly says the opening survey is a small part of it. He describes changing encounters and rejects a simple good/evil track interpretation. These are developer claims, not published evidence of psychometric validity. [Interview](https://www.siliconera.com/our-silent-hill-shattered-memories-interview-delves-into-the-games-psyche/).

**Assumed.** Borrow the feeling that a world responds personally. Reject the concealed profiling method for HF. Every scored scene should announce that it contributes to the character test. Ordinary play must remain outside that channel.

**Confirmed.** _Ultima IV_'s transcribed opening questions pit virtues against each other, including honesty versus compassion. This is evidence of the game's question design, not evidence that it measures a real person's virtues. [Dialogue transcript](https://wiki.ultimacodex.com/wiki/Ultima_IV_transcript).

**Assumed.** Borrow conflicts between defensible motives. A hungry traveller can keep a promise, help someone, or seek food. Ask what constraint motivated the answer. Do not interpret one choice as a fixed moral ranking.

**Assumed, source gap.** Persona-style social stats are a useful presentation reference: named qualities developed through daily activities. The official [Persona 5 Royal page](https://persona.atlus.com/p5r/?lang=en) inspected today did not expose enough mechanic detail to confirm that comparison. Treat this as a design analogy. HF should distinguish learned capability from an estimate of temperament, rather than presenting both as points to maximise.

**Confirmed.** _Undertale_'s official description offers nonviolent resolutions for every enemy. The original _Mass Effect_ guide hosted by EA advises concentrating on one morality path to reach milestones faster. [Undertale](https://undertale.com/about/), [Mass Effect guide](https://na.llnet.bioware.cdn.ea.com/u/f/eagames/bioware/masseffect/prima/prima_guide_me_pc.pdf).

**Assumed.** These suggest two distinct lessons. Make alternatives playable, as the _Undertale_ description promises. Avoid rewards that turn expressive answers into score optimisation, as the _Mass Effect_ guide encourages. This is a design critique, not a finding about either game's players. HF should record intended reasons, perceived circumstances, and actual consequences separately. Never export a universal goodness score.

### 4. An explicit character test and passport

**Confirmed.** The roadmap says: “No player modelling from telemetry.” It also limits a character's reading of the player to in-game acts. It proposes portable casts in Horizon 3. [Roadmap, Guardrails and Horizon 3](https://github.com/adam0white/human-framework/blob/main/docs/hf-roadmap-2026-10-20.md).

**Assumed.** Consent alone does not dissolve that rule. Propose a separate, explicit character-creation tool. It collects answers given for that stated purpose. It never mines normal gameplay or lab telemetry. The owner would need to accept this interpretation before implementation.

**Assumed.** Use this sequence:

1. Choose “approximate me” or “invent someone.” Explain the limits before collection.
2. Answer a short questionnaire and optionally play three declared assessment scenes.
3. Inspect each proposed trait and its supporting answers. Skip or correct anything.
4. Preview the character in two situations. Show where its choice surprises the player.
5. Export only after a separate confirmation. Import separately in each game.

| Input                                                   | Assumed mapping                           | What remains unknown                                    |
| ------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------- |
| Repeated self-reports about planning and follow-through | Tentative conscientiousness setting       | Actual behaviour under unfamiliar pressures             |
| Choosing exploration after safety is secured            | Tentative openness setting                | Whether curiosity, reward-seeking, or guessing drove it |
| Explicitly ranking autonomy, security, or helping       | Candidate HF value settings               | Strength and stability of those priorities              |
| Reporting hunger, fatigue, or loneliness                | Optional starting state for this scenario | Medical condition, physiology, and future need rates    |
| Asking for difficult combat or quiet exploration        | Game preference metadata                  | Temperament or moral character                          |

**Assumed.** Present “several consistent answers” or “little evidence,” not fabricated confidence percentages. A statistical interval requires an error model that has been evaluated. Keep the player-facing approximation distinct from the exact parameters needed to execute a simulation.

**Assumed.** An HF passport should contain a schema version, mapping version, selected temperament and values, evidence status, player edits, and optional starting-state choices. Exclude raw answers by default. Exclude account identifiers, health diagnoses, private memories, and inferred faith. Store locally. Offer inspection and deletion. Revoke future imports by removing the file; do not promise deletion of copies already shared.

**Assumed.** Separate a creation passport from a lived-character save. A game should instantiate a fresh person from the former. Moving an existing person requires semantic mappings for skills, norms, relationships, and remembered places. Unsupported meanings must be disclosed. JSON compatibility alone does not preserve identity.

**Assumed.** NPCs should not receive the passport's private parameters. They should learn about the imported character through witnessed acts and testimony. Otherwise a portable persona would defeat subjective UI by making everyone omniscient.

### 5. Show HN: observed precedents

**Confirmed.** These threads were inspected today, directly or by a research delegate. Counts are observed snapshots, not popularity forecasts. The GOAP demo is explicitly a Show HN submission. The other rows are linked discussions, not evidence of Show HN launch outcomes. **Assumed.** The relevance-selected sample cannot represent all launches.

| HN discussion                                                                                                                                   | Confirmed reception                                                                                                                                         | Assumed lesson                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Generative Agents, April 2023](https://news.ycombinator.com/item?id=35517649)                                                                  | 391 points, 252 comments. Discussion includes memory, reflection, externally supplied directives, and whether eating reflects needs or narrative imitation. | Demonstrate bodily constraints. Avoid treating plausibility as proof of humanity. |
| [Generative Agents open source, August 2023](https://news.ycombinator.com/item?id=37073938)                                                     | 174 points, 55 comments. Enthusiasm coexists with usefulness disputes, dependency concerns, and interest in classical planners.                             | Explain what runs locally and what the system accomplishes.                       |
| [AI Toolkit, January 2024](https://news.ycombinator.com/item?id=38925802)                                                                       | 146 points, 55 comments. Readers discuss FSMs, behaviour trees, utility AI, and GOAP.                                                                       | Acknowledge those predecessors directly.                                          |
| [GOAP and Utility AI demo, April 2024](https://news.ycombinator.com/item?id=40173540)                                                           | 3 points, 1 comment. The visible explanation is from the author; it supplies no independent reception evidence.                                             | A runnable demo cannot guarantee attention.                                       |
| [ACT-R, December 2023](https://news.ycombinator.com/item?id=38663960) and [Soar, September 2021](https://news.ycombinator.com/item?id=28463289) | Comments dispute symbolic cognition, usefulness, and explanation. The Soar thread criticises unclear introductory material.                                 | State purpose and evidence before listing faculties.                              |
| [The Futures of Inform, August 2022](https://news.ycombinator.com/item?id=32571293)                                                             | Discussion includes teaching, documentation, examples, and initial confusion over English syntax.                                                           | Give developers a small executable example.                                       |
| [What is ZIL anyway?, April 2019](https://news.ycombinator.com/item?id=19699792)                                                                | Discussion includes parsing versus play, branching costs, and NPC planning. A comment names Versu. This is not a Versu launch thread.                       | Rich expression still needs an interesting interaction.                           |

**Confirmed.** Versu's own site describes independently modelled characters, personality, remembered treatment, and social reactions. ACT-R explicitly describes comparing task models with human timing and accuracy. _Generative Agents_ reports a 25-agent sandbox and component ablations evaluating believability. [Versu](https://versu.com/), [ACT-R](https://act-r.psy.cmu.edu/about/), [Generative Agents paper](https://arxiv.org/abs/2304.03442).

**Assumed.** HF should borrow Versu's playable social situation, ACT-R's separation of model assumptions from measured outcomes, and the Generative Agents paper's component comparisons. None establishes HF's scientific validity.

### 6. Framing and claims likely to draw criticism

**Assumed.** Suggested title: **“Show HN: HF — deterministic game characters that can refuse your suggestions.”** Suggested opening: “I built a TypeScript library for simulated people. Try asking someone to work while hungry, tired, or committed elsewhere. Inspect the terms behind the answer and replay it. The parameters are game-model defaults; I have not validated it as a predictor of real people.”

**Confirmed.** Show HN guidelines require something people can try and encourage access without signup barriers. A separate notice currently describes temporary restrictions after an influx of submissions. These pages establish policy, not this owner's posting eligibility. [Guidelines](https://news.ycombinator.com/showhn.html), [restriction notice](https://news.ycombinator.com/showlim).

**Confirmed.** The root README calls HF a “model of a simulated person,” says choices can be explained, and labels 2.10.0 latest. The package version section still says 2.2.1. The roadmap contains later released slices alongside older status text. These are documentation inconsistencies observed today, not a live release audit. [Root README](https://github.com/adam0white/human-framework/blob/main/README.md), [package README](https://github.com/adam0white/human-framework/blob/main/packages/human/README.md), [roadmap](https://github.com/adam0white/human-framework/blob/main/docs/hf-roadmap-2026-10-20.md).

| Assumed criticism                            | Assumed preparation                                                                                                                                                  |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “Grandiose claims about simulating humanity” | Keep history prediction in the speculative vision. Describe demonstrated behaviours precisely.                                                                       |
| “It is just utility AI”                      | Agree that scoring is utility-based. Show what supplied faculties, refusal protocols, private knowledge, saves, and controls save the host from implementing.        |
| “Where is the psychology validity?”          | Separate source-inspired shapes, chosen coefficients, internal controls, and external predictions. A passing replay test establishes repeatability.                  |
| “Why religion in a general framework?”       | Explain the Islam-guided default and held understandings. Demonstrate a replacement catalog. Do not claim every architectural assumption disappears when it changes. |
| “Deterministic means unrealistic”            | Show seeded variability and repeated outcomes under controlled inputs. Treat realism as a separate empirical question.                                               |
| “Why no LLM?”                                | Show offline execution and inspectable decisions. Acknowledge bounded language and world knowledge.                                                                  |
| “Only your own games use this”               | Seek one independent host integration. Do not count internal games as independent adoption.                                                                          |
| “The documentation is overwhelming”          | Offer one short path: play, inspect, change a motive, replay, install. Keep the architecture available afterward.                                                    |

**Confirmed.** The architecture's `decidedBy` description has important limits: its term case names the largest positive difference, while its inertia case checks removal. It excludes several outcome classes. [Architecture, Why a suggestion lost](https://github.com/adam0white/human-framework/blob/main/docs/framework.md).

**Assumed.** Therefore qualify “every choice can be explained.” A score decomposition explains the program. Its largest term need not be a sufficient causal explanation, and neither establishes the person's true psychological reason.

**Assumed.** Critics may request editors, scenario authoring, integrations, richer conversation, stronger planning, population benchmarks, accessibility controls, and empirical comparisons. Some are adoption aids. Others are new research programmes. Do not accept all as launch prerequisites. Keep slowdown selectable and preserve the owner's menu-pause rule; real people need time to read.

## B. Utopic ideas, unlinked from feasibility

**Assumed — speculative throughout this section.** These are desired experiences without feasibility claims, delivery dates, or implied scientific validity.

**A person across a lifetime of games.** Begin with an approximate self. Carry its altered habits, loyalties, and private recollections through radically different worlds. Meet versions shaped by choices you declined. Identity includes continuity, contradiction, and change rather than one permanent type.

**History from every participant's partial view.** Watch an entire civilisation without a privileged human narrator. A ruler, child, traveller, and craftsperson encounter different evidence about the same event. Slow time to inhabit one misunderstanding. Widen the view to see its consequences across centuries.

**A history that contains competing futures.** Ask how institutions, migration, teaching, climate, and individual commitments might produce different histories. Preserve paths that disagree with the observer's preferred story. The ambition is a modelled history of humanity whose assumptions remain inspectable.

**An encounter with yourself that can disagree.** Let an approximate persona live without your supervision, acquire commitments, and refuse your advice. Its disagreements invite reflection. They confer no authority to diagnose you or tell you how to live.

## C. Concrete proposals for HF

**Confirmed.** Roadmap horizons are H1 through 2026-11-30, H2 through 2027-02-28, and H3 long bets. Portable casts are H3. Its “Predicting real players” bet concerns playtesters predicting quit and confusion points before opt-in runs. It does not schedule questionnaire-based personality prediction. [Roadmap](https://github.com/adam0white/human-framework/blob/main/docs/hf-roadmap-2026-10-20.md). **Assumed.** The following are proposals, not authorised increments. The personal-approximation study and its H2 placement are new proposals. Dates are suggested preparation windows.

| What                                              | Why                                                             | Horizon                                  | First cheap experiment                                                                                                                                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explicit, editable character-test sketch          | Explore player approximation while keeping telemetry outside it | H1 lab proposal; mature mapping H2       | By November: show five volunteers a paper consent flow and three scenes. Ask what they believe is inferred and shared. Revise any misleading wording before building.                                                     |
| Separate questionnaire scoring from HF conversion | Expose uncertainty introduced by the mapping                    | H2 replication work                      | By December: predeclare one mapping and compare repeated responses and held-out scene choices against a generic persona. Record errors; do not tune against the held-out choices. Small samples support exploration only. |
| Versioned creation passport                       | Enable explicit reuse without claiming a complete human copy    | H3 portable cast, preceded by H1 sketch  | Map one hand-authored persona into two host scenarios. List every lost meaning. Verify NPCs cannot read imported private settings.                                                                                        |
| One refusal demo with a reason inspector          | Make HF's present contribution immediately testable             | H1 host kit and readable reasons         | By November: one task, three motives, a subjective player view, and a separate developer trace. Ask outsiders to predict refusals before revealing terms.                                                                 |
| Compact comparison and limits page                | Answer utility AI and validity questions honestly               | H1 docs; H2 empirical gate               | Explain one scenario using HF and a minimal utility baseline. Report authoring work, state requirements, failures, and behaviour differences. Avoid declaring a winner in advance.                                        |
| Independent integration and measured scale        | Test usefulness beyond lab-authored games                       | H1 bench; H2 integration gate            | Over December–February: invite one willing developer to build a tiny host from the published package. Record time and missing contracts. Measure population cost separately.                                              |
| Launch readiness pass                             | Prevent stale claims from dominating useful feedback            | H1 preparation; posting date conditional | Before any submission: reconcile version text, verify a fresh install and live demo, check current HN rules, and prepare concise answers. Submit only under separate owner authorisation.                                 |

**Assumed.** Keep the passport out of the initial launch's critical path. A clear refusal demonstration can test interest in HF now. A real-player prediction claim should wait for evidence gathered expressly to test it.
