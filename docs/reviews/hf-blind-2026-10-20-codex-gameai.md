# Blind consultation, 2026-10-20: Codex, game-AI and simulation architect

Raw final message of one of three blind consultants for [the HF roadmap](../hf-roadmap-2026-10-20.md), run with `codex exec` in the blind packet directory (starting ambition, `research/`, owner directions; architecture, roadmap, code and game docs excluded). Unedited; its links point into the packet copy at `~/code/.lab-scratch/hf-blind/`, whose `research/` files match this repository's apart from a few redacted implementation-status passages.

## (1) What a framework with this ambition should become

HF should become a reusable system for characters whose decisions create playable consequences: people who misunderstand, persist, refuse, negotiate, learn, and change. Its central abstraction should connect bodily condition, perceived circumstances, commitments, intentions, attempts, and consequences without collapsing them into one score. Studios should author situations and action possibilities, then inspect why a particular person responded as they did. One person remains the semantic unit; optional population tooling coordinates many people. The adoption advantage should be reliable contracts, excellent authoring tools, and portable evidence of failures. These are proposals from the packet’s ambition, not an assessment of implementation. The [source method](/Users/abdul/code/.lab-scratch/hf-blind/research/source-method.md) supplies the right discipline: distinguish evidence, interpretation, explanatory models, and engineering choices.

**Vision: Give game makers people whose choices remain understandable, consequential, and reproducible across games and populations.**

## (2) The 10 most important capabilities, ranked

The proofs below establish software behavior and usefulness, not human validity. Comparative scenarios should share event-keyed random draws; sharing an initial seed alone is insufficient.

1. **A deterministic decision-and-consequence contract.**  
   **What:** Explicit observation, decision, intent, world resolution, and outcome phases. The host owns physical facts. HF owns personal responses. Specify clocks, numeric operations, stable ordering, and state-held seeded randomness. Keep the actor loop LLM-free.  
   **Why / games:** Everything else depends on this; it enables replayable colony sims and multiplayer integrations.  
   **Unit:** Reverse actor storage order during contention for one tool; obtain identical results.  
   **Headless control:** Run identical commands through two local peer harnesses with different delivery delays. Canonically order accepted commands and compare per-tick hashes. Report the first divergence.

2. **An authoring language for actions and situations.**  
   **What:** Typed definitions for requirements, duration, interruption, perceived costs, intentions, and outcome receipts. Previewing candidates must not mutate state. Authors need reusable templates and useful validation errors.  
   **Why / games:** Studio adoption depends on authoring effort; this unlocks systemic immersive sims without bespoke character code everywhere.  
   **Unit:** Candidate evaluation leaves state and RNG unchanged; interrupted work retains only declared progress.  
   **Headless control:** Independently author repair and evacuation through the same contracts. Compare effort and duplicated rules against direct host implementations.

3. **Save and replay as a durable product contract.**  
   **What:** Plain-JSON person state plus a coordinated host snapshot, pending actions, RNG state, ordered commands, and pinned engine/content/model versions. Preserve an old-runtime replay path; distinguish migration from exact replay.  
   **Why / games:** Long campaigns, bug reports, mods, and updates require continuity.  
   **Unit:** Save halfway through an interrupted activity; restore and reproduce its continuation exactly.  
   **Headless control:** Compare uninterrupted and repeatedly restored campaigns. Inject duplicate commands and speculative rollback; verify that committed effects occur once.

4. **Agency with competing reasons and sustained commitments.**  
   **What:** Distinguish feasibility, willingness, knowledge, competence, and intention. Support refusal, delay, alternatives, and reconsideration. Offer interchangeable scripted, utility, and GOAP policies through one execution contract.  
   **Why / games:** This unlocks suggestion-driven play, caregiving, leadership, and natural difficulty.  
   **Unit:** Hunger changes pressure without deleting a commitment; an unavailable action cannot execute.  
   **Headless control:** Give one tired worker conflicting requests and an offer of assistance. Compare persistent commitment reasoning against stateless utility under equal information and deliberation budgets.

5. **Private knowledge, attention, and attributed memory.**  
   **What:** Separate world facts from observations, beliefs, testimony, and self-reports. Preserve source, occurrence time, receipt time, and audience. Forgetting must not manufacture knowledge.  
   **Why / games:** Misunderstanding becomes playable rather than arbitrary; this unlocks mysteries, stealth, diplomacy, and unreliable testimony.  
   **Unit:** An absent witness cannot learn a relocation from the authoritative world ledger.  
   **Headless control:** Three people coordinate a delivery after its destination changes. Vary disclosure alone. Compare mistakes and recovery against an omniscient control.

6. **A causal debugger with controlled interventions.**  
   **What:** Inspect considered actions, exclusions, decisive comparisons, remembered evidence, and the rule versions involved. Branch from a snapshot and change one declared cause. Keep developer inspection separate from subjective player views.  
   **Why / games:** Authors need to distinguish character behavior from defects; players need legible consequences.  
   **Unit:** Reconstruct a selection from its recorded inputs and reproduce it. Enabling tracing changes no state.  
   **Headless control:** Compare predicted and actual responses to removing an obstacle or correcting a belief. Include redundant reasons so explanations cannot pretend every reason is individually necessary.

7. **Relationships and commitments with explicit lifecycles.**  
   **What:** Represent requests, acceptance, release, fulfillment, abandonment, and renegotiation. Separate material outcomes from personal interpretations and recipient responses. Never force compliance through the bookkeeping system.  
   **Why / games:** This creates continuing social consequences for colony sims and household dramas. The [cooperation boundary](/Users/abdul/code/.lab-scratch/hf-blind/research/cooperation-boundary.md) provides a strong foundation.  
   **Unit:** A failed attempt cannot fulfill a commitment; duplicate receipts cannot fulfill it twice.  
   **Headless control:** Compare reusable commitments against direct host rules during a shared-resource shortage. Measure continuity, authoring cost, and explanation quality—not maximum production alone.

8. **Population scheduling with declared fidelity.**  
   **What:** Sparse interactions, event-driven updates, deterministic work budgets, and bounded memory. Start with exact optimizations. Make approximate modes explicit and versioned. Never schedule decisions according to available wall-clock time.  
   **Why / games:** This unlocks towns and large colonies without making simulation speed alter personalities.  
   **Unit:** Exact event skipping matches reference stepping across every relevant boundary.  
   **Headless control:** Benchmark 100, 1,000, and 10,000 people through a disruption. Report throughput, memory, missed deadlines, and decision starvation. Compare smaller populations against the full-detail reference.

9. **Change across bodily, learning, and biographical timescales.**  
   **What:** Separate bodily condition, perceived condition, current performance, learned competence, habits, and slow commitments. Use task-specific learning and explicit transfer links. Keep active obligations outside disposable memory summaries.  
   **Why / games:** Apprenticeship, recovery, aging, and generational games need histories that affect later choices.  
   **Unit:** Temporary fatigue cannot erase learned competence; unconfigured transfer remains absent.  
   **Headless control:** Compare practice, rest, instruction, and frozen-learning conditions with matched exposure and retests. Measure useful performance separately from accumulated practice, following the cautions in [empirical models](/Users/abdul/code/.lab-scratch/hf-blind/research/empirical-models.md).

10. **A studio SDK with conformance and evidence tools.**  
    **What:** Small adapters, versioned schemas, batch runners, compatibility checks, minimal examples, and provenance-bearing content packs. Every capability declares scope, unsupported cases, and a simpler baseline.  
    **Why / games:** External teams must adopt HF without adopting its original games or vocabulary.  
    **Unit:** Reject incompatible content versions and missing dependencies with actionable diagnostics.  
    **Headless control:** Have independent developers integrate the same person model into two unlike games without editing HF. Compare integration time, defects, runtime cost, and duplicated logic against simpler alternatives. Accept a negative result.

## (3) Ambitious long bets

- **Procedural stories assembled from actual consequences.** Build story queries over interrupted plans, conflicting accounts, broken expectations, and attempted repair. A director may select presentation, but must preserve simulated facts. **Risk:** repetitive disputes or retrospective stories that invent motives. **First cheap experiment:** six people, one shared workshop, three resources; test whether players can reconstruct and influence three distinct causal stories without scripted twists.

- **Learned methods and local traditions.** Let people acquire bounded procedures, demonstrate them, and revise them after observed results. **Risk:** unsupported transfer, runaway optimization, or culture reduced to copying. **First cheap experiment:** two repair methods, one demonstrator, one changed condition. Compare imitation, individual discovery, and frozen methods, including transmission of a bad method.

- **A continuous population from intimate interaction to regional scale.** Preserve identity and consequential obligations while allocating detail by declared relevance. **Risk:** unseen lives become implausible, and detail transitions create exploitable discontinuities. **First cheap experiment:** move one household repeatedly between detailed and coarse modes. Compare commitments, knowledge, and resources against a fully detailed reference. I am uncertain how far useful fidelity can survive this compression.

- **Portable people across different games.** Transfer biography, relationships, commitments, and learned procedures through explicit semantic mappings. Reject transfers whose required meanings are missing. **Risk:** portability becomes cosmetic biography or forces genres into one ontology. **First cheap experiment:** move one worker between a repair scenario and a negotiation scenario; identify exactly which personal consequences survive.

- **Executable negotiation as an action system.** Treat requests, conditions, counteroffers, disclosures, and refusals as composable deterministic actions. **Risk:** combinatorial authoring and mechanical bargaining exploits. **First cheap experiment:** three people negotiate one shift with one concealed constraint. Compare against fixed dialogue choices for authoring cost, understandable outcomes, and meaningful alternatives.

## (4) What to avoid

- **A universal human optimizer.** One utility score or grand equation will erase distinctions authors need. Let competing policies earn their place through discriminating tests.

- **Spiritual measurements or hidden verdicts.** Never quantify ruh or compute divine acceptance. Qalb, nafs, fitra, and ʿaql remain read-only lenses plus provenance-bearing held readings per person, never scalars. Follow the [reconciliation boundaries](/Users/abdul/code/.lab-scratch/hf-blind/research/reconciliation.md).

- **Invented rulings and faith optimization.** Source norms from `research/`; otherwise mark **source needed**. Preserve interpretive differences and review status. Religious practices remain quiet parts of life, never the central mechanic or a productivity strategy.

- **Scientific branding for authored coefficients.** Personality must not dictate destiny. Reject universal willpower fuel, global learning transfer, automatic cooperation bonuses, and individual genetic percentages inferred from heritability.

- **LLMs inside the actor loop.** Decisions, memory updates, explanations, and outcomes must remain reproducible. Authoring assistance must compile to inspectable, versioned content before play.

- **Scale achieved through silent semantic loss.** Do not erase promises, private knowledge, or vulnerable people to improve benchmarks. Declare approximation and measure its consequences.

- **Expansion without a playable reason.** Each faculty needs a bounded scope, meaningful tests, a headless control, and evidence that it improves authoring or play. More internal variables do not establish more useful people.
