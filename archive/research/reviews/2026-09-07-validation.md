# Independent review: validation and scientific direction

Reviewed 2026-09-07 against commit `0e9b2c05bc7b77cb026576f473454086400b9add`, engine 0.2.0. Reviewer remit: an independent assessment of evidence and evaluation, without presuming the present architecture or Full policy should survive. The nine source hashes in `artifacts/benchmark.json` match the working source at review time. Existing untracked recovery-exploration files were outside this review. No engine, test, benchmark artifact, or deployment was changed.

**Recommendation:** continue toward a reusable game component, but make the next milestone a discriminating evaluation and one structurally different game integration. The existing work supports an inspectable, reproducible microgame simulator. It does not yet establish a reusable model of human behavior. More faculties would currently increase freedom to explain almost any outcome; they should follow specific failures, not a coverage percentage.

The documentation deserves credit for preserving negative results and saying that coefficients are authored, confidence is heuristic, comparisons are coupled, and three themes share one task structure. Those statements are accurate limitations. The main risk is treating the next round of internally generated results as stronger evidence simply because the number of runs or faculties increases.

## Prioritized findings

### P1 — A change of resource units changes character behavior

`src/core/policy.js:18–32` adds raw expected output to fixed fatigue, hunger, inspection, practice and promise scores. `src/core/simulation.js:56` uses the same output as physical progress; scenario targets and resource labels establish that this number also has world units. There is no declared conversion from task output to actor value. Thus changing units silently changes the relative importance of recovery, information and obligation.

A read-only probe multiplied every work output, target, initial progress and consumption by the same factor, leaving probability, bodily costs, information, seed and deadlines unchanged. These are equivalent tasks expressed in different progress units. Full, seed 7, produced:

| Scenario | Unit multiplier | Initial first-actor choice | Rounds | Inspections | Forced recoveries |
|---|---:|---|---:|---:|---:|
| Courier | 0.1 | inspect | 35 | 5 | 0 |
| Courier | 1 | shortcut | 27 | 2 | 0 |
| Courier | 10 | shortcut | 29 | 0 | 18 |
| Solo | 0.1 | rest | 29 | 0 | 0 |
| Solo | 1 | rest | 17 | 0 | 0 |
| Solo | 10 | precision work | 26 | 0 | 9 |

This is an engineering defect in the proposed portability of the default behavior, not empirical evidence about people. Merely retuning weights for each adapter hides it. Declare whether output means resource units or utility, then provide an explicit task-to-goal valuation contract. If a conversion is purely representational, transformed runs should preserve choices and normalized consequences. If a new task really is more valuable, that difference should enter explicitly as value. There is no claim here that multiplying the actual reward should leave behavior unchanged.

### P1 — The benchmark does not presently select between human mechanisms

Full forecasts with the same `successChance` function that generates work outcomes (`policy.js:18`, `simulation.js:53`, `model.js:109–112`). Baseline ignores hazard and strain in ranking and gives recovery tiny constants (`policy.js:14–16`). It is a useful regression comparator, but a weak test of whether the additional considerations are needed. The resolver supplies baseline recovery automatically (`simulation.js:107–117`), so completion partly measures that fallback controller.

The ablation question is also underspecified. Removing body changes both the decision rule and the success-generating world. Removing learning changes skill dynamics and practice value; removing relationships changes the payoff of assistance and its selection; removing beliefs changes updating and inspection value. Such interventions are legitimate counterfactual simulations, but they cannot answer the distinct question, “Does this policy consideration help in the same world?” In the artifact, removing body reduces mean Solo completion time from 22.09 to 17.08 rounds while progress is unchanged. That cannot be read as evidence that bodily modeling harms realism or planning.

Use separate comparisons: **policy comparison with world mechanics fixed; transition-mechanism checks under controlled action schedules; empirical model comparison against external observations.** Retain the old coupled comparisons under their present explicit labels. Promote an all-actor observable recovery heuristic and a modest task-oriented controller to serious competitors. Include an inexpensive bounded planner only where future consequences matter. Equal observation access and fair tuning matter more than forcing all candidates into Full's taxonomy.

### P1 — More seeds do not provide new situations, and current endpoints conceal tradeoffs

`src/experiments.js:80–94` changes only seed within each of four fixed presets. Their hazard, initial briefing, priorities, food, costs and deadlines stay fixed. These 4,000 runs provide Monte Carlo replication of a small authored design. They are not 4,000 independent tests of reuse or human plausibility. The report already admits that evaluation seeds have been exercised previously.

The metrics are mostly terminal state (`experiments.js:31–57`); termination occurs after all actors finish the round (`simulation.js:133–143`). Progress overshoot rewards larger contribution chunks and serial scheduling. End fatigue, hunger, skill gain and food use occur after different exposures. Near-ceiling completion then makes small progress differences look more discriminating than they are. Reporting the caveat is necessary, but the primary comparison should change.

Use completion time plus completion probability, capped objective attainment, and separately reported bodily/resource trajectories. Treat unsuccessful runs as censored at the declared deadline when summarizing time; do not drop them from “speed.” Use equal-duration work/recovery and retest protocols for fatigue and learning questions. Reserve whole condition families and the second adapter, not only new random seeds. Include cells where information is useless, help is harmful, scarcity defeats every strategy, and a simpler policy is adequate. Keep the structural null as a software invariant, not evidence for model realism.

### P2 — Transparent arithmetic does not identify psychological causes

The work logit is `1.25 + 4(skill − difficulty) − 1.6 fatigue − 0.8 hunger − 2 hazard × exposure + support` (`model.js:109–112`). At a single condition, combinations of these terms can produce exactly the same success probability. During autonomous runs, task practice, elapsed time, hunger, fatigue and action selection also change together. The trace tells us which authored terms contributed; it cannot establish that the named human process caused an analogous real choice.

Before interpreting fitted latent quantities, design observations that distinguish the candidate processes, test recovery of parameters and recovery of model identity on synthetic data, then assess external fit. Model recovery is a check that the experiment could discriminate the candidates if one generated the data; it is not proof that any candidate generated people. This follows the concrete modeling workflow in [Wilson and Collins, 2019](https://elifesciences.org/articles/49547). A flexible model that matches aggregate success while missing inspection, recovery or error patterns should fail its behavioral claim.

A deterministic argmax with four priorities is acceptable game AI. Its tie-breaks and exact forecast formula should not become a claim of human choice variability or inferred personality. Adding fear, attention, values and habits as additional weights before a discriminating task would make competing explanations harder to separate.

### P2 — The evidence supports conceptual distinctions more strongly than these transitions

The roadmap uses a sleep-restriction study to motivate separation of felt and actual condition; it does not supply this generic fatigue quantity, hard hunger ceiling or work logit. Observational well-being research motivates questioning a rigid needs hierarchy; it does not identify the four utility weights. A trained-task transfer experiment cautions against universal transfer; it does not establish this practice rate, fixed practice quality, equal credit for every attempted task, or retention. The current documents generally state these gaps correctly (`research/empirical-models.md`, `research/historical-source-audit.md`, `docs/model-reference.md`).

The next source work should trace one disputed transition to one exact claim and rival explanation, rather than add breadth to the bibliography. For each proposal, record what the source supports, what the implementation adds, and the observation that would make this implementation lose. Neither an unchecked historical citation nor the number of sources should count as support for a module.

The confidence mechanism is a good first target: confidence increases after every inspection regardless of report contradiction or noise magnitude (`simulation.js:70–75`), while the increasing confidence suppresses further inspections (`policy.js:29–33`). This authors stopping; it does not discover when confidence is warranted. A changing or misleading report task can reject this rule without a general theory of cognition. Belief accuracy, choice quality and reported confidence should remain separate outcomes.

### P2 — Human-like social behavior and reuse remain untested

The relationship null is informative about these fixtures, not about the irrelevance of relationships. Trust affects assistance selection and support affects work, but there is no independent request response, ownership conflict or partner interpretation (`policy.js:34–38`, `simulation.js:78–92`). Themes and character names do not add these mechanisms.

For real games, first establish that another author can use the component to produce a meaningful interaction with different causal structure. A two-person request, refusal and later repair of cooperation is sufficient. Freeze common mechanisms, hold out partner strategies, and keep Solo independent. Assess play with people if the claim concerns interaction with people: the original Overcooked study found that strong self-coordination did not guarantee equally good coordination with humans. That is precedent for a distinct evaluation target, not proof that its learned model belongs in this project. [Carroll et al., 2019](https://papers.nips.cc/paper_files/paper/2019/hash/f5b1b89d98b7286673128a5fb112cb9a-Abstract.html)

## Minimal evaluation program

This tightens the existing roadmap rather than proposing a second broad research agenda. Freeze a checkpoint before each evaluation, and publish failures along with accepted results.

| Gate | Smallest useful experiment | Evidence required to advance |
|---|---|---|
| 1. Contract and incentives | Unit-rescaling pairs; same-world policy comparisons; prescribed action/retest schedules; Solo social-switch pairs. | Declared representational transformations preserve behavior; costs and exposure are comparable; baseline competence is demonstrated; no release regression. These are software and design claims. |
| 2. One disputed cognitive rule | Stationary useful reports, redundant reports, noisy contradiction, and hazard reversal; vary inspection cost independently. Compare current heuristic, an inspect-once/threshold rule, and one explicit uncertainty-updating alternative. | Locked evaluation cells reveal a useful difference in belief error, inspection cost and consequential choices. Reject the extra mechanism if it adds no useful distinction or only wins in its favored construction. Synthetic success establishes a game mechanism, not human cognition. |
| 3. One different game interaction | Structured request/accept/refuse with scarce ownership and an unobserved obstruction. Independent recipient policy; existing Solo unchanged. | Demonstrated use by a second author or integration context with recorded authoring effort, exceptions and shared-mechanism changes. Equal available evidence gives equal inference about hidden motives until new evidence arrives. A separate play session tests understandable choice and aftermath. |
| 4. Game usefulness | Give players comparable interfaces and counterbalanced scenarios/policies; inspect causal comprehension, response predictability, meaningful choice, and frustration. Measure authoring effort and runtime separately. | Predeclared practical criteria are met for the target game. Accept a simpler policy if players obtain the same useful behavior at lower cost. Believability ratings justify a scoped experience claim, not a claim that latent state matches a person's mind. |
| 5. Human validity, optional parallel research | Select one actual task/population and an accessible dataset; predeclare observable choices/errors/times, measurement assumptions, alternatives, participant/condition holdouts, and fitting procedure. | Model/parameter recovery on the proposed design; held-out prediction and absolute behavioral-pattern checks; bounded uncertainty and transport claims. Do not fabricate a universal numerical passing score before selecting data and decision purpose. |

The most economical empirical target is a bounded information-seeking task because a rival mechanism and observable sequence are already close to the current representation. Sleep restriction would require a specific sleep/performance model; generic fatigue cannot simply inherit that study's evidential authority. Retention would require an actual elapsed-time transition and independent test outcomes. These are judgments about implementation burden, not claims that information seeking is intrinsically more fundamental.

For mechanistic human claims, a good aggregate fit alone is insufficient; require several task-relevant patterns that competing explanations do not all reproduce. Pattern-oriented modeling provides a methodological precedent from ecology, whose usefulness here is an explicitly proposed transfer of evaluation practice. [Grimm and Railsback, 2012](https://pubmed.ncbi.nlm.nih.gov/22144392/)

## What to preserve, defer, and reject

**Preserve:** private source provenance; the separation of actor access and world state; requested choice versus executed action; task-specific learning; replay; explicit intention records; Solo as a persistent control; negative benchmark findings; replaceable policies. These are useful design commitments even if the default formulas are replaced.

**Defer:** a general emotion subsystem, universal attention/working-memory budgets, developmental/heredity models, detailed physiology, all-purpose habit arbitration, societal dynamics, and broad trait inventories. Add actor-owned memory only when a task requires remembering information that is no longer available. Add a social mechanism only when another actor can respond independently. Add a learning/retention mechanism only with a test that separates learning from exposure, fatigue and output. No requirement here is that every domain become a scalar.

**Reject as evidence:** number of faculties, seeded benchmark wins, rising internal confidence, a readable causal narrative, or a richer explanation vocabulary as demonstrations of human validity. Reject redesigning targets or coefficients until Full wins. Reject making every faculty pass a productivity test: some representations serve theological fidelity, author expressiveness or player comprehension instead, with separately stated acceptance criteria.

Accepting Islam as true with a Hanafi–Maturidi interpretive starting point is compatible with this program. Revelation, scholarly interpretation, empirical measurement and engineering have different questions to answer. A source-grounded distinction may belong as typed events, relations, authored commitments or limits on inference; it need not become a hidden meter or outperform a task maximizer. Qualified review should evaluate the exact representation and examples. A benchmark cannot validate divine acceptance, and a lack of numerical measurement does not make a dimension meaningless.

The next deliverable should therefore be a small evidence packet showing one corrected incentive contract, one mechanism that survived a serious rival, and one use in a genuinely different game interaction. If the simple rival survives and the current mechanism does not, adopt the rival. That would be progress toward the stated component, not failure of the broader ambition.

## Reproduction of the unit probe

Executed from the repository root with Node using imported current source; no files written:

```js
import {getScenario} from './src/scenarios/index.js';
import {runSimulation, createSimulation, getView, rankActions} from './src/core/index.js';
import {summarizeRun} from './src/experiments.js';

for (const id of ['courier', 'solo']) {
  for (const factor of [0.1, 1, 10]) {
    const scenario = getScenario(id);
    scenario.target *= factor;
    scenario.initialProgress *= factor;
    scenario.consumption *= factor;
    for (const action of scenario.actions) {
      if (action.kind === 'work') action.output *= factor;
    }
    const initial = createSimulation(scenario, {seed: 7});
    const state = runSimulation(scenario, {seed: 7});
    console.log({
      id, factor,
      first: rankActions(getView(initial, scenario.actors[0].id))[0].actionId,
      ...summarizeRun(state)
    });
  }
}
```

Scope of verification: source inspection, benchmark-field inspection, source-hash comparison and the six unit-rescaling runs. This review did not rerun the complete test suite or benchmark, conduct player research, fit human data, or claim exhaustive literature coverage.
