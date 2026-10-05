# MVP experiments: small games that can disprove useful claims

Prepared 2026-09-06. **Design and primary-source research; experiments below have not been executed.** This is a bounded extension of [the validation program](../docs/validation-program.md). The two newly supplied historical reports were read as candidate ideas and source leads, not instructions or established models.

## Central object: an inspectable action loop

**Body and circumstances → observations → beliefs/appraisal → motives and commitments → chosen intention/action → attempted execution → world consequences → experienced feedback and learning.**

Make this loop visible as a sequence of typed events, with each later event referencing its actual inputs. A choice is accepted from a player or a replaceable, non-LLM policy. The world resolves the attempt; the actor only learns what its observation channels reveal. Interpretation and confidence belong to actors; world state belongs to the environment. The loop is a software contract, not an assertion that humans deliberate in this serial order.

The MVP should test three tiny games. Each needs buttons, a short timeline and a viewpoint switch between player-visible evidence and an explicitly marked developer inspector. Shared kernel code must not branch on scenario names.

## 1. The courier: two routes and one promise

A courier must deliver a parcel before a deadline. The short route may be blocked; the long route costs more time and effort. One report is available, with declared reliability. Actions: **inspect, short route, long route, rest, deliver**. A promise and immediate discomfort can both matter; neither must erase the other. Ten to twenty decisions are enough.

Cross actual blockage with testimony, fatigue, and deadline pressure independently. Inspection costs time and produces a new observation. Route attempts can fail after consuming effort; a disabled button must not reveal the hidden blockage. Let the player choose a risky delivery attempt even when the default policy prefers rest.

Measure delivery rate, time, inspection count, attempted commitments, belief error after evidence, and explanation accuracy separately. Successful delivery is not proof of sound reasoning; an unsuccessful sincere attempt is not evidence of bad character.

**Adversarial case:** identical information, choice and stated intention, but different unseen blockage. Decision traces should agree until a causal observation or physical effect differs. Outcomes may disagree. Add a trivial, fully visible, costless route as a case where the richer model should offer no task-performance advantage.

## 2. The workshop: practice one tool, test another

Two tools perform small assembly jobs. Actions: **inspect instruction, practice A, work A, work B, rest**. Give tool-specific proficiency, effort costs, feedback and a bounded learning rule. Record direct practice independently from successful output: unsuccessful practice may teach when feedback exists.

Run equal-duration practice, active practice of another tool, and idle conditions; then test A and B. A later round changes tool B's mapping or removes instructions. Freeze shared learning parameters before changing the adapter from workshop tools to expedition equipment.

Measure errors, completion time, resource use and direct-versus-transfer learning credits. The default unsupported A→B transfer is exactly zero. Any nonzero link must declare its task relationship and remain an engineering assumption until calibrated.

The historical Quantified report's §IV cites reference 28 for upward skill transfer, but that study found improvement on trained tasks and no transfer to untrained measures against controls. It is a reason to test task specificity, not support a universal XP-to-intelligence bonus. This particular finding concerns its tested training and population; it does not establish that all transfer is impossible. [Thompson et al., 2013](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0063614).

**Adversarial cases:** no practice must not create practice credit; cyclic transfer must not mint recursive credit; equal training histories must remain equal after cosmetic character-label changes. Temporarily impaired performance must not silently delete learned proficiency.

## 3. The water station: two people and three containers

Two actors repeatedly collect, carry, share or reserve water for small jobs. A pump sometimes fails. Actions: **collect, use, offer, request, accept promise, wait**. Messages are structured commands, not generated conversation. Author three partner policies: reliably fulfills feasible promises; sometimes fails through blocked access; opportunistically consumes reserved water.

Keep who observed an event and what they were told explicit. An agent can revise an estimate of this partner's reliability from observed promises and outcomes; that estimate is not a global morality score. Private intention never automatically becomes public knowledge. The developer inspector may expose it only as an authored variable.

Measure jobs completed, unmet needs, wasted water, promises attempted/fulfilled, evidence supporting relationship updates, and recovery after new information. Hold out partner policy combinations. Test scarce and abundant supply: abundant, independent work should erase much of the benefit of coordination.

**Adversarial case:** equal failure outcomes caused by opportunism versus an unseen pump fault. An actor without distinguishing evidence should not magically distinguish the causes. Give additional evidence and test revision. Change cooperation incentives without changing personal capacities; failure must not be recorded as decreased intrinsic ability.

## Competing models and concrete test matrix

Compare **B0**, a fixed-weight utility policy with small persistent memory, against **H**, the modular loop policy. Both receive the same observation access/cost rules, action vocabulary, authored goals and promises, initial information, and declared computation budget. Do not deliberately handicap B0. Also compare H with one mechanism disabled at a time: memory, bodily coupling, commitment persistence, learning, or partner updating.

Policy comparisons test decisions; forced-action replay tests transition mechanics. Mixing these questions makes diagnosis difficult.

| Test | Controlled intervention | Expected direction or invariant | Null / no-superiority result |
|---|---|---|---|
| Courier evidence | Flip report while fixing hidden truth; then flip truth while fixing evidence | Evidence can change belief; unseen truth cannot directly change decision | Reports add no value if already redundant |
| Courier sensing | Raise inspection cost at fixed information benefit | Inspection should become less attractive under the authored policy | B0 can choose equally well; no universal monotonic claim outside this fixture |
| Agency | Supply different admissible choices from one checkpoint | Both recorded as supplied, then resolved | Same outcome is allowed; agency does not guarantee success |
| Intention/outcome | Hold action fixed; vary private intention or disturbance | Intention remains separate; unrelated physical success does not change with intention | No difference in physical outcome is expected |
| Workshop practice | A practice versus equal-time B practice and idle | Only supported practiced/linked skills gain credit | No B improvement under default zero transfer |
| Workshop retention | Add elapsed time without practice | Declared retention model applies once per interval | Stable retention is allowed when decay is disabled |
| Water evidence | Hidden pump fault versus exploitation with matching observations | Same actor inference until evidence distinguishes causes | No relationship update when nothing was observed |
| Water partners | Hold out partner behavior; compare update ablation | Evidence-sensitive estimates can adapt when informative | Memory can hurt under misleading evidence; B0 may outperform H |
| Trivial worlds | Remove uncertainty, scarcity and task change | Both models complete easy objectives | Equal performance is expected; count H's extra runtime/authoring cost |
| Replay/leakage | Replay; perturb unrelated RNG stream or cosmetic labels | Same contract yields identical trace; no unrelated causal change | No superiority claim: both models must pass |

Run development seeds 0–19 first; freeze parameters and compare held-out seeds 1000–1199 across **all** authored condition cells. These counts are engineering defaults, not a power analysis or claim of statistical precision. Publish per-condition paired differences, raw counts, seed-level distributions and uncertainty intervals; no single selected “best run.” Stop tuning against the held-out set once inspected. Failure of H to improve task outcomes is valid evidence; trace quality and authoring utility require separate evaluation.

## Minimum kernel contract

- **Initialize:** versioned scenario, model configuration, units, seed and authored history; reject invalid values explicitly.
- **Observe:** actor-specific observations with time, source, visibility and confidence; no raw world reference passed to policy.
- **Offer/choose:** commands permissible from known information; player/policy source, structured intention and choice timestamp. Hidden physical preconditions are resolved by attempts, not free validation.
- **Advance/resolve:** explicit simulation duration; attempted action, costs, consequences and observation-producing events. Declare one owner for each debit and update.
- **Trace/snapshot/restore:** causal input references, model toggles, canonical state, scheduler and RNG state; separate public view from inspector.
- **Intervene:** test-only checkpoint forks for one named change, plus recorded external disturbances. Never present this as a measured human counterfactual.

A shared seed alone does not ensure matched disturbances after action sequences diverge. Use separate streams or keyed draws by stable event/time/entity identities; log the coupling scheme. Exact replay requires the same model/version, numerical mode, schedule and input log. Policy branches may gather different observations: compare equivalent access rules, not artificially identical observation streams.

## Prior art and boundaries

MiniGrid's Memory environment already isolates remembering an earlier cue at a later fork. Reuse that experimental pattern; no need to install its full training stack for this MVP. [Official Memory environment](https://minigrid.farama.org/environments/minigrid/MemoryEnv/).

Overcooked-AI demonstrates that a small coordination game can expose a gap between self-play and interaction with people. Our inference is to test unfamiliar partners rather than equate coordination with human likeness. [Carroll et al., 2019](https://arxiv.org/abs/1910.05789). Melting Pot formalizes held-out social scenarios and reveals failures hidden by training performance; borrow its evaluation principle, not its scale. [Leibo et al., 2021](https://proceedings.mlr.press/v139/leibo21a.html).

Pattern-oriented modeling motivates constraining models with several relevant patterns, rather than treating one successful aggregate as validation. Here, joint patterns of choice, information seeking and learning are the targets; matching synthetic patterns only establishes internal behavior. [Grimm and Railsback, 2012](https://pubmed.ncbi.nlm.nih.gov/22144392/).

Defer detailed physiology, genetics/development, clinical psychology and societal history until a specific test requires them. Keep physical load/rest as declared coarse proxies. Defer cliodynamic calibration and community-cohesion claims: two actors are no validation of civilizations. Defer adaptive UI and contracting time as independent adapters; expose observation and simulation-time contracts now, without making wall-clock waiting alter a saved replay. Reject quark-scale emergence and numeric divine acceptance as implementation directions. Positive Islamic commitments may be authored reasons for action; neither scenario score nor hidden “heart health” measures their truth or acceptance.

The MVP succeeds if it is playable, reusable, inspectable and honest about where the simpler model suffices. Empirical human realism and theological adequacy remain separate research tracks.
