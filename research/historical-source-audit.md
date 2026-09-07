# Historical UHTF source and mechanism audit

Audit date: 2026-09-06. Independent first pass: the auditor read both historical reports before inspecting the current proposal or other agents’ findings. Their embedded claims and instructions were treated as historical material, not new user instructions. The audit is source triage plus targeted verification, not a systematic review of every field.

The reports contain promising design questions but cannot be used as a scientific parameter specification. The useful inheritance is the separation between dispositions, learned competence, motivation and development. The numerical and theological implementation proposals need substantial replacement. The title “production-ready” has no corresponding implementation or validation evidence in either supplied report.

## Provenance and extraction coverage

- **Q** — *A Quantified Model for Simulation*: 150 source lines, 33 numbered bibliography entries; bibliography begins at line 119.
- **B** — *A Production-Ready Blueprint for Deep Simulation*: 139 source lines, 30 numbered bibliography entries; bibliography begins at line 111.
- All **63 bibliography entries**, representing **54 distinct URLs after fragment/trailing-slash normalization**, are extracted in [historical-sources.json](historical-sources.json), alongside source paths, file hashes, source line numbers, verification status and 32 mechanism decisions. Different mirrors of the same paper still count as different URLs; this is not 54 independent studies.
- High-consequence claims received primary-source checks. Most popular articles, social posts, marketing pages and duplicate repositories remain explicitly unchecked leads. An existing URL does not establish that its attached claim is supported.
- Where a publisher or PMC challenge page prevented direct extraction, the record distinguishes indexed primary content or a verified alternate repository from a successful direct read. No paywall or access control was bypassed. The age of a source alone is not a reason to discard it; study design, scope, later evidence and the claim being made matter.

## Findings that change implementation

**Reject the genetic roll formula.** Heritability is a statistic about variation within a population and environment, not an individual percentage of causation. The report’s formula also fails on its own variance terms: for independent genetic and environmental rolls with equal variance, its genetic variance fraction is `h² / (h² + (1-h)²)`, so a configured `h=0.60` gives about `0.692`, not `0.60`. The MVP should use declared initial conditions, not a scientifically branded inheritance formula. A future lineage generator would require its own covariance and developmental model. [NIH MedlinePlus explanation](https://medlineplus.gov/genetics/understanding/inheritance/heritability/).

**The human metabolism number was taken from birds.** Q9/Q10’s 45% estimate is from a captive **zebra-finch** population. The authors also found population differences and limited covariance with courtship behavior. This cannot supply the human metabolic-profile parameter, much less a universal high-output versus efficient-body slider. [Mathot et al. 2013](https://pmc.ncbi.nlm.nih.gov/articles/PMC3746821/).

**The reports’ own cognitive sources undermine their hierarchy.** Q6/B12 reports processing-speed heritability estimates of 43% and 49% in separate cohorts, not a universal 45%. Q8/B10 reports 40% for fluid reasoning, 64% for processing speed and 58% for the acquired-knowledge grouping in a meta-analysis; it therefore does not support B’s “most heritable” claim about Gf. These estimates are evidence against importing the old constants, not replacement values for character generation. [Kochunov et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC4691385/), [2023 specific-cognitive-abilities synthesis](https://pmc.ncbi.nlm.nih.gov/articles/PMC10184120/).

**Zero heritability for attachment and locus of control is also unsupported.** A study of 551 twin pairs aged 15 suggested genetic influence on adolescent attachment; infancy findings should not be generalized across development. An adult twin study estimated locus-of-control heritability around 0.30. Neither supplies a deterministic relationship style or a fixed individual genetic fraction. For simulation, beliefs about particular relationships and controllability are more actionable than presumed immutable types. [Fearon et al.](https://pubmed.ncbi.nlm.nih.gov/24256475/), [Mosing et al.](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0047958).

**The malleability caps have no demonstrated basis and contain a mathematical defect.** The historical ±15–30% birth-relative caps are not established by the cited outreach articles. `Base ± Base*m` reverses minimum/maximum for negative baselines and prevents change at zero; changing the arbitrary origin of the scale changes a person’s allowed development. A randomized digital intervention demonstrated some desired personality change over months, but does not establish unlimited plasticity or a lifetime percentage ceiling. Use operational bounds and revisable transition models. [Stieger et al. 2021](https://doi.org/10.1073/pnas.2017548118).

**Do not convert aptitude into unlearned competence.** B’s dozens of weighted formulas have no fitted dataset, units or criterion measure. They would grant programming, medicine or deception ability from personality/ability values without learning those tasks. Its athletics formula is also truncated. Store task-specific competence and knowledge independently; allow capacities, fatigue, opportunity and practice quality to affect execution or learning only through explicit adapters. Treat trait-to-skill coefficients as hypotheses requiring data, not defaults inherited from the reports.

**Reject automatic skill-to-intelligence transfer.** Q28, the citation attached to the 1–5% transfer mechanism, is a study that found trained-task gains after 20 sessions but no transfer to its untrained measurements. Q26 found positive transfer in a specific earlier dual n-back design; Q27 is a commentary on that paper, not independent replication. These are competing findings in a limited paradigm, not evidence that lockpicking or running must raise general intelligence. Keep transfer zero unless an explicit directed mapping is justified. [Thompson et al. 2013](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0063614), [Jaeggi et al. 2008](https://pubmed.ncbi.nlm.nih.gov/18443283/), [Sternberg commentary](https://pmc.ncbi.nlm.nih.gov/articles/PMC2383939/).

**Keep elapsed time, retention and performance separate.** An exponential decay curve is a usable experiment; the asserted universal inverse relationship between expertise level and decay constant is not verified. The recent empirical retention paper explicitly identifies measurement and design shortcomings in the field and studies multiple tasks. There is also no single cognitive peak or common physical decline schedule that licenses the reports’ annual constants. Defer lifespan physiology while retaining an explicit clock and swappable transition function. [Ackerman and Tatel](https://pubmed.ncbi.nlm.nih.gov/38108800/), [Hartshorne and Germine](https://pmc.ncbi.nlm.nih.gov/articles/PMC4441622/), [Fleg et al.](https://www.ahajournals.org/doi/epdf/10.1161/CIRCULATIONAHA.105.545459).

**Keep Islamic grounding; reject unvalidated sacred-variable mappings.** B supplies no Qur’an, hadith, tafsir or theological primary source for its soul-components table or 0–100 heart health. Qur’an 22:46 connects hearts with reasoning, which complicates its neat heart/reason split. Qur’an 17:85 limits knowledge concerning ruh. Qur’an 91:7–10 does not reduce nafs to an intrinsically evil impulse. Bukhari 1 makes intention material to evaluating action. The Quran.com passages display Dr. Mustafa Khattab’s *The Clear Quran* translation; the English interpretation remains distinct from the Arabic revelation. These observations constrain the simulation; they do not produce a replacement “Islamic psychology equation.” The Hanafi–Maturidi starting point remains an attributed interpretive program requiring its own careful sources, not something authenticated by these reports. [Qur’an 22:46](https://quran.com/22/46), [17:85](https://quran.com/17/85), [91:7–10](https://quran.com/91/7-10), [Bukhari 1](https://sunnah.com/bukhari:1).

For the MVP, use ordinary operational names for bodily pressure, commitments, intentions, appraisal, deliberation, habit and repair. Do not calculate spiritual attainment, assign a “dead heart” from a float, or turn nafs descriptions into mandatory RPG ranks. A character’s stated intention, action, consequences, regret and later repair may be represented separately. The numeric transitions remain engineering conventions even when religious commitments guide scenario design.

## Citation failures and salvageable ideas

| Historical connection | What the source actually contributes | Disposition |
|---|---|---|
| B’s autonomy/competence/relatedness sentence cites B3 | B3 models **E. coli metabolism**, not motivation; its metabolic trade-off is itself conditional | Replace citation and reservoir interpretation; keep SDT as one motivational lens |
| B’s crystallized-knowledge paragraph cites B11 | Supplied bibliography identifies **genetic influences on weight**; body not individually fetched | Citation mismatch pending direct page verification; not usable support |
| Q’s muscle-fiber percentage becomes global force/finesse aptitude | A human muscle-fiber review reports 40–50% genetic contribution to a specific fiber proportion | Reject construct substitution; defer physiology |
| Popular Big Five articles and a PDF mirror recur | The five precise percentages are traceable to **one** twin study | Retain provenance; do not count repetitions as corroboration |
| Q’s personality aging evidence becomes annual increments | The cited national-sample study examines cross-sectional age differences, with nonlinear patterns | Defer individual aging algorithm |
| Q’s skill-transfer source becomes positive 1–5% universal transfer | The cited experiment reported no measured untrained transfer | Reject numerical mechanism |
| B’s moral mappings have blank or absent references | No attached authoritative source chain | Rebuild interpretive work independently |

SDT’s original synthesis provides an actual source for autonomy, competence and relatedness. It does not establish “three tanks that must constantly be replenished” as a differential equation, nor an exhaustive account of worship, truth-seeking or morality. The distinction between a need, its perceived satisfaction, an available opportunity, an intention, and an action is useful to the core loop. [Ryan and Deci 2000](https://www.selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf).

The historical bodily axes may still inspire deliberately fictional gameplay presets, provided the game declares them conventions. Strong/precise and energetic/efficient combinations should not be forbidden by an unsupported biological opposition. [Human fiber-composition review](https://pubmed.ncbi.nlm.nih.gov/22645169/). The old precise personality percentages are historically traceable, but their population scope must travel with them. [Original twin-study mirror](https://static1.squarespace.com/static/5a372ca9f9a61ed6e86178a7/t/5c22ed70032be4789680f2ef/1545792883473/Heritability+of+the+Big+Five+Personality+Dimensions+and+Their+Facets+-+A+Twin+Study.pdf).

## MVP contract implied by this audit

1. **Central action loop:** bodily/context state → available observations → actor beliefs/appraisal → candidate actions and intentions → choice → attempted execution → world consequences → actor learning. The historical evidence does not determine this exact loop; this is an architectural recommendation to keep distinct constructs distinct.
2. **Runnable without language models:** typed action IDs, observations, parameters and state transitions suffice. Generated prose may explain logs; it never supplies an otherwise missing transition, outcome or moral judgment.
3. **Separate world and actor knowledge:** an ignorant actor cannot exploit hidden hazard values or gain perfect knowledge of another person’s motives through an “insight” trait.
4. **Separate competence and inclination:** willingness to try, knowledge of what to do, physical capacity, proficiency and outcome are different variables.
5. **Local learning, explicit transfer:** use relevant practice only; retain evidence labels for any cross-task link. No global XP-to-intelligence promotion.
6. **Operational completeness:** each supported input produces a transition, explicit invalid-action result or declared unsupported result. This is computational closure; it is not complete human science.
7. **Interchangeable policies and models:** a scripted baseline, utility agent and player can share execution/learning mechanics. Model choices and random seeds must be recorded so differences can be tested.
8. **Deferred extensions:** pedigree inheritance, lifespan changes, endocrine/detailed physiology, full institutions and cliodynamics remain interfaces/research questions. Do not pretend macro-cohesion is guaranteed by agent complexity. Subjective UI and contracted display time may consume the loop’s observations and clock without changing its physical meaning.

## Deliberately simple tests that would expose the historical errors

These are proposed tests; this audit did not implement or execute them.

| Scenario or invariant | Failing historical behavior | Useful criterion |
|---|---|---|
| Two equally untrained agents attempt an unfamiliar repair | High Gf directly grants engineering proficiency | Both lack the procedure; relevant practice or instruction changes performance |
| Practice one task; retest a dissimilar task | Automatic 1–5% transfer improves everything | Unconfigured transfer is exactly absent; any configured transfer is explicit |
| Hungry actor considers keeping an important promise | Lowest need or “ego” necessarily wins | Pressure affects choice while a commitment can still be selected |
| Same apparent action, different stated intention or knowledge | Action automatically heals/damages a spiritual bar | Logs preserve the distinctions; no numeric divine/spiritual verdict |
| Two people with different attachment expectations meet | Archetypes guarantee pursuer/distancer roles or dishonesty | Local beliefs, received evidence, goals and available actions affect outcomes |
| Advance equal simulated duration in different chunk sizes | Decay/fatigue depend on UI tick rate | Tolerance-bounded equivalent state for equivalent elapsed time; stochastic policy schedules documented |
| Repeat identical scenario with baseline versus richer model | More variables claimed to prove realism | Measure predictiveness, narrative legibility, reuse and sensitivity; accept baseline when sufficient |
| Run short games using the same agent in different settings | Domain formulas silently bake in one genre | Core transition contract is unchanged; action/environment adapters differ |

## Complete mechanism decision register

The JSON retains detailed rationales and architecture consequences for each item. “Reject” refers to the historical modeling claim, not the human faculty it attempts to represent. “Experiment” means a candidate convention that still requires validation. “Defer” preserves the research question outside the initial running scope.

| ID | Historical mechanism / numerical claim | Decision | Consequence |
|---|---|---|---|
| C01 | Foundational attributes govern all expressed abilities; skills always derived from Tier 1. | **modify** | Store independently learned skills and explicit access/knowledge; capacities modulate task-specific performance. |
| C02 | BaseValue = Genetic_Roll*h + Environmental_Roll*(1-h), both rolls 0–100; fixed heritability per attribute. | **reject** | No genetic roll pipeline in MVP. Future population generators need specified covariance, context, and independent validation. |
| C03 | Gf 60% heritability (Q); 40–80% and most heritable intelligence component (B); Gs 45%. | **reject** | Keep capacities operationally defined; no hereditary truth labels or inherited learning ceilings. |
| C04 | Metabolic Profile heritability 45%. | **reject** | No imported human metabolic genotype coefficient. |
| C05 | High BMR implies peak performance; low BMR implies efficiency/scarcity resilience, represented on −100…100 axis. | **defer** | Use declared energy/fatigue abstractions now; physiology adapter later. |
| C06 | Biomechanical aptitude heritability 45%; force versus finesse on −100…100 axis. | **reject** | Do not force a character strong in one dimension to be weak in the other. |
| C07 | Big Five fixed heritabilities O 61%, C 44%, E 53%, A 41%, N 41%; −100…100 scales. | **modify** | Optional tendencies as priors; behavior also depends on situation, goals and learning. |
| C08 | Attachment Schema 0% hereditary; categorical secure/anxious/avoidant; anxious–avoidant pair naturally produces pursuer–distancer pattern. | **modify** | Relational expectations belong to relationship/context-sensitive beliefs, not hardwired deterministic pairing rules. |
| C09 | Locus of control 0% hereditary; internal failure means train, external means wait/give up; −100…100 scale. | **modify** | Use actor-specific causal belief updates; preserve external constraints and mistaken self-blame as possible. |
| C10 | Lifetime change cap BaseValue ± BaseValue*Malleability_Index; Gf ±15%, Gs ±25%, metabolism ±20%, biomechanics ±15%, O ±20%, C ±30%, E ±20%, A ±30%, N ±30%. | **reject** | Use explicit bounded state domains with model-specific learning dynamics; no birth-relative moral/trait cages. |
| C11 | Gf and Gs +0.5/year ages 1–25, then Gf −0.25/year and Gs −0.2/year; Gf peak 25–30. | **defer** | MVP spans hours/days; lifespan adapter needs longitudinal task-specific calibration. |
| C12 | Physical peak 25–35; ~10% decline/decade with acceleration after 60; table uses −1%/year after 35 offset by training. | **defer** | Separate skill retention from bodily capacity; aging outside first scenarios. |
| C13 | Personality annual O −0.1 and E −0.1 after 20; C +0.2 ages 20–50; A +0.2 and N −0.2 ages 20–60. | **defer** | No hidden annual stat drift in MVP. |
| C14 | XP=BaseXP*Difficulty*(1+(Gf−50)/100); Gf is global learning multiplier, +50% at Gf100; Gf controls knowledge library size. | **reject** | Task-specific learning rates, practice quality, opportunity and known procedures; no omnipotent intelligence stat. |
| C15 | Relevant practice accumulates a Dosage Meter and crosses level thresholds. | **experiment** | Track relevant practice and competence change, expose coefficients as provisional. |
| C16 | Every skill XP gain transfers 1–5% to underlying Gf/Gs XP pools. | **reject** | Zero transfer by default; explicit directed task-to-task transfer adapter only. |
| C17 | Skill decays as last_value*exp(−k*time_since_use); k inversely proportional to skill level. | **experiment** | Separate practice/retention/expression; allow task-specific decay and elapsed-time-invariant integration. |
| C18 | All expressed abilities range 1–1000; cognitive attributes 1–100; several traits −100…100. | **modify** | Use units/ranges per operational variable; normalized internal scale declared as simulation convention. |
| C19 | Endurance=.7 metabolic efficiency+.2 conscientiousness+.1 internal locus. | **reject** | Compute ability, intent and effort separately. |
| C20 | Melee=.6 force+.3 Gs−.1 neuroticism; ranged=.6 finesse+.3 Gs−.1 neuroticism; dexterity=.7 finesse+.2 Gf+.1 conscientiousness. | **reject** | Task-specific execution adapters with uncertainty and learned proficiency. |
| C21 | Persuasion=.4 extraversion+.3 agreeableness+.3 secure attachment; leadership=.4 extraversion+.3 internal locus+.3 conscientiousness. | **reject** | Social outcomes depend on listener beliefs, relationship, legitimacy, content and context. |
| C22 | Deception=.4 Gf+.4 avoidant attachment−.2 agreeableness; insight=.5 secure attachment+.3 openness+.2 Gf. | **reject** | No attachment-to-dishonesty rule; inference remains uncertain and audience-specific. |
| C23 | Humanities=.6 Gf+.4 openness; sciences=.7 Gf+.3 openness; medicine/engineering=.6 Gf+.2 finesse+.2 conscientiousness; programming=.8 Gf+.2 conscientiousness; data=.7 Gf+.3 openness; cybersecurity=.6 Gf+.2 Gs−.2 neuroticism. | **reject** | Separate domain knowledge from skill and ability. No programming skill simply from birth stats. |
| C24 | Athletics formula truncated after (Metabolic_Pace*.5)+(. | **reject** | Do not treat production-ready title as implementation evidence. |
| C25 | Gs globally changes crafting, aiming, searching, reading and dialogue-selection time. | **modify** | Use per-action duration; display time and simulation time separated. |
| C26 | Autonomy, competence, relatedness meters continuously cause replenishment actions; cites B3. | **modify** | Represent perceived opportunities/constraints or motives, with explicit engineering dynamics and no obligatory fixed ordering. |
| C27 | Nafs=impulsive System1 ego; ruh=altruistic ideal; aql=Gf/Gc calculator; qalb=weighted arbiter. | **reject** | Use ordinary names for motivations, deliberation, intention and commitments; keep theological concepts as attributed interpretive annotations. |
| C28 | Qalb health 0–100; altruism/sacrifice/honesty heal; selfishness/cruelty/deception damage; low score boosts ego weights. | **reject** | No spiritual health scalar or divine approval score. Track declared commitments, observed action, intention and consequences separately. |
| C29 | Three compulsory self-development stages: commanding default, reproaching, tranquil; final stage unlocks abilities/status. | **reject** | Character development can be modeled with revisable habits, commitments and repair actions without assigning religious attainment. |
| C30 | Positive/negative choices alter future tendencies and generate traceable emergent narratives. | **retain** | Keep causal logs and reversible counterfactual replay; distinguish world effects, beliefs, habits and choices. |
| C31 | Complex emergent behavior is guaranteed by interconnected tiers; blueprint is production ready. | **reject** | Demonstrate modular reuse and compare against simpler baselines; emergence is a result to measure, not a certification. |
| C32 | Intellect example predicts a 70% chance of being caught stealing. | **experiment** | Treat the estimate as the actor’s belief; keep it distinct from the world’s outcome generator. |

## Complete historical bibliography inventory

The IDs map to the supplied bibliography numbers. Status is deliberately narrow: “not individually checked” does not imply invalidity; “verified” does not imply the report’s claim follows. All original titles, source lines and normalized URLs are in the JSON. This inventory is not an endorsement list.

| ID | Supplied source | Existence check | Claim assessment |
|---|---|---|---|
| Q1 | [g factor (psychometrics) - Wikipedia](https://en.wikipedia.org/wiki/G_factor_%28psychometrics%29) | not individually checked | not assessed |
| Q2 | [Gene polymorphisms and fiber-type composition of human skeletal ...](https://pubmed.ncbi.nlm.nih.gov/22645169/) | verified direct | limited construct support |
| Q3 | [Genetics of muscle fiber composition / Request PDF - ResearchGate](https://www.researchgate.net/publication/335508550_Genetics_of_muscle_fiber_composition) | not individually checked | not assessed |
| Q4 | [www.simplypsychology.org](https://www.simplypsychology.org/big-five-personality.html#:~:text=Factors%20that%20Influence%20the%20Big%205&text=%281996%29%20conducted%20a%20study%20with,%2C%20and%2053%25%2C%20respectively.) | not individually checked | not assessed |
| Q5 | [Heritability of the Big Five Personality Dimensions ... - Squarespace](https://static1.squarespace.com/static/5a372ca9f9a61ed6e86178a7/t/5c22ed70032be4789680f2ef/1545792883473/Heritability+of+the+Big+Five+Personality+Dimensions+and+Their+Facets+-+A+Twin+Study.pdf) | verified direct pdf | supports sample estimates only |
| Q6 | [The common genetic influence over processing speed and white matter microstructure: Evidence from the Old Order Amish and Human Connectome Projects - PubMed Central](https://pmc.ncbi.nlm.nih.gov/articles/PMC4691385/) | verified primary search content | supports sample estimates only |
| Q7 | [Heritability estimates of the Big Five personality traits based on common genetic variants](https://www.researchgate.net/publication/280125157_Heritability_estimates_of_the_Big_Five_personality_traits_based_on_common_genetic_variants) | not individually checked | not assessed |
| Q8 | [The genetics of specific cognitive abilities - PMC - PubMed Central](https://pmc.ncbi.nlm.nih.gov/articles/PMC10184120/) | verified direct | contradicts related blueprint claim |
| Q9 | [Basal metabolic rate can evolve independently of morphological and behavioural traits](https://www.researchgate.net/publication/236599593_Basal_metabolic_rate_can_evolve_independently_of_morphological_and_behavioural_traits) | work verified via primary alternative | wrong species |
| Q10 | [Basal metabolic rate can evolve independently of morphological and behavioural traits](https://pubmed.ncbi.nlm.nih.gov/23632896/) | work verified via primary alternative | wrong species |
| Q11 | [Locus of Control: What It Is and How It Shapes Motivation - BetterUp](https://www.betterup.com/blog/locus-of-control) | not individually checked | not assessed |
| Q12 | [Internal vs External Locus of Control: 7 Examples & Theories - Positive Psychology](https://positivepsychology.com/internal-external-locus-of-control/) | not individually checked | not assessed |
| Q13 | [Just how malleable is your personality? - ID37](https://www.id37.io/en-post/just-how-malleable-is-your-personality) | not individually checked | not assessed |
| Q14 | [How Do Personality Traits Change from 16 to 66? / Psychology Today](https://www.psychologytoday.com/us/blog/the-athletes-way/201808/how-do-personality-traits-change-16-66) | not individually checked | not assessed |
| Q15 | [www.shortform.com](https://www.shortform.com/blog/how-to-become-a-new-person/#:~:text=To%20become%20who%20you%20want,and%20physically%20ingrained%20in%20you.) | not individually checked | not assessed |
| Q16 | [Neuroplasticity: How Experience Changes the Brain - Verywell Mind](https://www.verywellmind.com/what-is-brain-plasticity-2794886) | not individually checked | not assessed |
| Q17 | [Change Your Brain to Change Your Personality - The New Personality Self-Portrait](https://npsp25.com/change-your-brain/) | not individually checked | not assessed |
| Q18 | [Can Your Personality Change Over Your Lifetime? - Greater Good Science Center](https://greatergood.berkeley.edu/article/item/can_your_personality_change_over_your_lifetime) | not individually checked | not assessed |
| Q19 | [Physical Activity in Ageing and Falls - Physiopedia](https://www.physio-pedia.com/Physical_Activity_in_Ageing_and_Falls) | not individually checked | not assessed |
| Q20 | [Why your performance will decline with age by Precision Fuel & Hydration](https://www.precisionhydration.com/performance-advice/performance/age-aging-performance-decline/) | not individually checked | not assessed |
| Q21 | [Age Differences in the Big Five Across the Life Span: Evidence from ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC2562318/) | verified primary search content | qualitative only |
| Q22 | [Personality and Birth Cohort: Does the Decade Make a Difference?](https://www.psychologicalscience.org/publications/observer/obsonline/2022-march-personality-and-generations.html) | not individually checked | not assessed |
| Q23 | [Age Differences in the Big Five Across the Life Span: Evidence From Two National Samples](https://www.researchgate.net/publication/23274153_Age_Differences_in_the_Big_Five_Across_the_Life_Span_Evidence_From_Two_National_Samples) | not individually checked | not assessed |
| Q24 | [How Age Changes Your Personality / Psychology Today](https://www.psychologytoday.com/us/blog/people-unexplained/202204/how-age-changes-your-personality) | not individually checked | not assessed |
| Q25 | [Development of Big Five Domains and Facets in Adulthood: MeanLevel Age Trends and Broadly Versus Narrowly Acting Mechanisms - CiteSeerX](https://citeseerx.ist.psu.edu/document?repid=rep1&type=pdf&doi=5b8dc1b33df7701fcbd9ab4fe20c8f4836688cdd) | not individually checked | not assessed |
| Q26 | [Improving fluid intelligence with training on working memory - PNAS](https://www.pnas.org/doi/10.1073/pnas.0801268105) | work verified via primary alternative | limited contested transfer |
| Q27 | [Increasing fluid intelligence is possible after all - PNAS](https://www.pnas.org/doi/10.1073/pnas.0803396105) | work verified via primary alternative | commentary not independent replication |
| Q28 | [Failure of Working Memory Training to Enhance Cognition or Intelligence / PLOS One](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0063614) | verified direct | contradicts claim it is attached to |
| Q29 | [Factors Influencing Attenuating Skill Decay in High-Risk Industries: A Scoping Review](https://www.mdpi.com/2313-576X/8/2/22) | not individually checked | not assessed |
| Q30 | [SKILL DECAY CURVES](https://mari.com/wp-content/uploads/The-Science-of-MARi-Skill-Decay.pdf) | not individually checked | not assessed |
| Q31 | [Measuring Learning Transfer and Decay From Initial Skill Training - CNA.org.](https://www.cna.org/archive/CNA_Files/pdf/d0022799.a3.pdf) | not individually checked | not assessed |
| Q32 | [(PDF) Developing a Model of Team Skill Decay - ResearchGate](https://www.researchgate.net/publication/320091360_Developing_a_Model_of_Team_Skill_Decay) | not individually checked | not assessed |
| Q33 | [Resolving problems with the skill retention literature: An empirical demonstration and recommendations for researchers - PubMed](https://pubmed.ncbi.nlm.nih.gov/38108800/) | verified direct abstract | warns against universal decay |
| B1 | [The evolutionary significance of variation in metabolic rates / Royal Society](https://royalsociety.org/blog/2024/01/variation-in-metabolic-rates-phil-trans-b/) | not individually checked | not assessed |
| B2 | [Metabolism / Better Health Channel](https://www.betterhealth.vic.gov.au/health/conditionsandtreatments/metabolism) | not individually checked | not assessed |
| B3 | [Metabolic enzyme cost explains variable trade-offs between microbial growth rate and yield](https://pmc.ncbi.nlm.nih.gov/articles/PMC5847312/) | verified primary search content | citation mismatch |
| B4 | [my.clevelandclinic.org](https://my.clevelandclinic.org/health/body/basal-metabolic-rate-bmr#:~:text=Your%20BMR%20is%20your%20body's,energy%20fuels%20your%20physical%20movement.) | not individually checked | not assessed |
| B5 | [Proprioception, the regulator of motor function - PMC - PubMed Central](https://pmc.ncbi.nlm.nih.gov/articles/PMC8411041/) | not individually checked | not assessed |
| B6 | [Proprioception in Biomechanics: A Comprehensive Guide - Number Analytics](https://www.numberanalytics.com/blog/proprioception-in-biomechanics-ultimate-guide) | not individually checked | not assessed |
| B7 | [Gene polymorphisms and fiber-type composition of human skeletal muscle - LJMU Research Online](https://researchonline.ljmu.ac.uk/id/eprint/23068/3/Gene%20polymorphisms%20and%20fiber-type%20composition%20of%20human%20skeletal%20muscle.pdf) | work verified via primary alternative | limited construct support |
| B8 | [Gene polymorphisms and fiber-type composition of human skeletal ...](https://pubmed.ncbi.nlm.nih.gov/22645169/) | verified direct | limited construct support |
| B9 | [g factor (psychometrics) - Wikipedia](https://en.wikipedia.org/wiki/G_factor_%28psychometrics%29) | not individually checked | not assessed |
| B10 | [The genetics of specific cognitive abilities - PMC - PubMed Central](https://pmc.ncbi.nlm.nih.gov/articles/PMC10184120/) | verified direct | contradicts claim it is attached to |
| B11 | [Genetic Influences on Weight - MyHealth Alberta](https://myhealth.alberta.ca/Health/pages/conditions.aspx?hwid=ug1798) | not individually checked | apparent citation mismatch |
| B12 | [The common genetic influence over processing speed and white matter microstructure: Evidence from the Old Order Amish and Human Connectome Projects - PubMed Central](https://pmc.ncbi.nlm.nih.gov/articles/PMC4691385/) | verified primary search content | supports sample estimates only |
| B13 | [Testing the Effectiveness of Computerized Cognitive Training on an At-Risk Student Population - PubMed](https://pubmed.ncbi.nlm.nih.gov/39199107/) | not individually checked | not assessed |
| B14 | [Big Five Personality Traits: The 5-Factor Model of Personality - Simply Psychology](https://www.simplypsychology.org/big-five-personality.html) | not individually checked | not assessed |
| B15 | [Big 5 Personality Traits: The 5-Factor Model of Personality - Verywell Mind](https://www.verywellmind.com/the-big-five-personality-dimensions-2795422) | not individually checked | not assessed |
| B16 | [www.simplypsychology.org](https://www.simplypsychology.org/big-five-personality.html#:~:text=Factors%20that%20Influence%20the%20Big%205&text=%281996%29%20conducted%20a%20study%20with,%2C%20and%2053%25%2C%20respectively.) | not individually checked | not assessed |
| B17 | [Heritability of the Big Five Personality Dimensions ... - Squarespace](https://static1.squarespace.com/static/5a372ca9f9a61ed6e86178a7/t/5c22ed70032be4789680f2ef/1545792883473/Heritability+of+the+Big+Five+Personality+Dimensions+and+Their+Facets+-+A+Twin+Study.pdf) | verified direct pdf | supports sample estimates only |
| B18 | [What Are Attachment Styles — And Can I Change Mine? - Alma](https://helloalma.com/blog/attachment-styles/) | not individually checked | not assessed |
| B19 | [A quick rundown of the four attachment styles. : r/attachment_theory - Reddit](https://www.reddit.com/r/attachment_theory/comments/d9fwik/a_quick_rundown_of_the_four_attachment_styles/) | not individually checked | not assessed |
| B20 | [Attachment Theory, Bowlby's Stages & Attachment Styles - Positive Psychology](https://positivepsychology.com/attachment-theory/) | not individually checked | not assessed |
| B21 | [Locus of control - Wikipedia](https://en.wikipedia.org/wiki/Locus_of_control) | not individually checked | not assessed |
| B22 | [Locus of Control: What It Is and How It Shapes Motivation - BetterUp](https://www.betterup.com/blog/locus-of-control) | not individually checked | not assessed |
| B23 | [Internal vs External Locus of Control: 7 Examples & Theories - Positive Psychology](https://positivepsychology.com/internal-external-locus-of-control/) | not individually checked | not assessed |
| B24 | [7 Must-Have Skills for Data Analysts - Northeastern University Graduate Programs](https://graduate.northeastern.edu/knowledge-hub/data-analyst-skills/) | not individually checked | not assessed |
| B25 | [Understanding variation in metabolic rate - Company of Biologists Journals](https://journals.biologists.com/jeb/article/221/1/jeb166876/19531/Understanding-variation-in-metabolic-rate) | not individually checked | not assessed |
| B26 | [Top 16 Cybersecurity Skills in High Demand - Champlain College Online](https://online.champlain.edu/blog/top-cybersecurity-skills-in-high-demand) | not individually checked | not assessed |
| B27 | [Impact of energy intake and exercise on resting metabolic rate - PubMed](https://pubmed.ncbi.nlm.nih.gov/2204100/) | not individually checked | not assessed |
| B28 | [ADHD Brain Training & Memory Games: Lumosity, Cogmed, Neurofeedback - ADDitude](https://www.additudemag.com/adhd-brain-training-neurofeedback-memory/) | not individually checked | not assessed |
| B29 | [The Sensorimotor System, Part II: The Role of Proprioception in Motor Control and Functional Joint Stability - ResearchGate](https://www.researchgate.net/publication/7219970_The_Sensorimotor_System_Part_II_The_Role_of_Proprioception_in_Motor_Control_and_Functional_Joint_Stability) | not individually checked | not assessed |
| B30 | [Dual Process Theory - Exercises in Clinical Reasoning](https://clinicalreasoning.org/dual-process-theory-2/) | not individually checked | not assessed |


## Limits and follow-up

This pass verifies enough high-consequence claims to reject blind parameter ingestion. It does not certify every popular article, rule out every possible far-transfer effect, establish a total taxonomy of Islamic faculties, or calibrate a human simulator. Positive learning-transfer research deserves further investigation under active controls and untrained outcomes; specific domain transfer can be useful even when universal transfer is unjustified. Likewise, demonstrated trait malleability is not proof of unlimited change.

The next evidence investment should follow model sensitivity: investigate assumptions that change outcomes or user choices, rather than accumulating citations for unused faculties. The complete model should be evaluated against observations and simpler alternatives, never by whether it reproduces behavior that its own rules stipulated. No individual religious judgment or clinical assessment follows from an MVP trace.
