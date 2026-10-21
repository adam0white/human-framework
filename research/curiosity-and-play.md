# Curiosity, play and bounded planning

2026-10-20. The sources behind the curiosity faculty (HF 2.11.0) and bounded multi-step planning (HF 2.12.0) ([slice plan](../docs/hf-roadmap-2026-10-20.md#current-increment-curiosity-and-play-then-bounded-planning-owner-2026-10-20)). Each row keeps the claim kind apart, as [source-method.md](source-method.md) requires: empirical finding, explanatory model or theory, and the engineering convention HF takes from it. Every HF number is an engineering default. None is fitted to these studies.

**Access.** The bibliographic records (authors, year, venue, DOI) were checked against Crossref on 2026-10-20. Snider et al. 2015 was read in full text, apart from its last pages. The rest are cited from the index record and the checker's prior knowledge of the paper, not from a fresh reading. Burghardt 2005 and Berlyne 1960 were confirmed only from secondary or catalogue pages. Do not quote their wording from this note.

## Curiosity and play

| Source | Kind | What it supports | HF use (engineering) |
|---|---|---|---|
| Oudeyer, Kaplan & Hafner 2007, *IEEE Trans. Evol. Comput.* 11(2), [10.1109/TEVC.2006.890271](https://doi.org/10.1109/TEVC.2006.890271) | Explanatory model (robotics) | A reward for the rate at which prediction error falls (learning progress), not for error itself, yields exploration that leaves unlearnable noise behind | `curiosity:progress`: the slow minus the fast average of prediction error, floored at zero |
| Ten, Kaushik, Oudeyer & Gottlieb 2021, *Nat. Commun.* 12, 5972, [10.1038/s41467-021-26196-w](https://doi.org/10.1038/s41467-021-26196-w) | Empirical finding (one study; no independent replication known) | People's free choice among learning activities tracks their estimated learning progress, not only uncertainty or error | Same term; it is why noise earns no progress |
| Loewenstein 1994, *Psychol. Bull.* 116(1), [10.1037/0033-2909.116.1.75](https://doi.org/10.1037/0033-2909.116.1.75) | Theory (review) | Curiosity arises from a noticed gap between what one knows and what one wants to know | `curiosity:unknown`: the person's own uncertainty about an option's outcome |
| Gottlieb, Oudeyer, Lopes & Baranes 2013, *Trends Cogn. Sci.* 17(11), [10.1016/j.tics.2013.09.001](https://doi.org/10.1016/j.tics.2013.09.001) | Review of models and neural data | Information-seeking can be valued for its own sake and is linked to attention and learning progress | Curiosity is a positive pull, separate from boredom |
| Kidd & Hayden 2015, *Neuron* 88(3), [10.1016/j.neuron.2015.09.010](https://doi.org/10.1016/j.neuron.2015.09.010) | Review | Curiosity's definitions, its link to reward and learning, and its neural substrates | Background for keeping curiosity distinct from need relief |
| Wilson, Geana, White, Ludvig & Cohen 2014, *J. Exp. Psychol. Gen.* 143(6), [10.1037/a0038199](https://doi.org/10.1037/a0038199) | Empirical finding | Human choice shows both an information bonus (directed exploration) and decision noise (random exploration) | HF's term is the directed part only; random exploration stays with the host's choice rule |
| White 1959, *Psychol. Rev.* 66(5), [10.1037/h0040934](https://doi.org/10.1037/h0040934) | Theory | Effective interaction with the environment motivates on its own, apart from tissue needs | The intrinsic reward on `finish` feeds competence |
| Ryan & Deci 2000, *Am. Psychol.* 55(1), [10.1037/0003-066X.55.1.68](https://doi.org/10.1037/0003-066X.55.1.68) | Theory; parts have mixed replication (for example the reward-undermining effect) | Autonomy, competence and relatedness support intrinsic motivation | HF's existing need list; curiosity adds no new need |
| Burghardt 2005, *The Genesis of Animal Play*, MIT Press (secondary sources only) | Theory and comparative review | Play is repeated with variation, not fully functional, voluntary, and begun when the animal is fed, safe and unstressed | `curiosity:vary`, and the gate: curiosity weighs only when physiological needs and safety are met and fear is low |
| Schulz & Bonawitz 2007, *Dev. Psychol.* 43(4), [10.1037/0012-1649.43.4.1045](https://doi.org/10.1037/0012-1649.43.4.1045) | Empirical finding (small preschool sample, one lab; no large direct replication known) | Children explore a toy more when the evidence about how it works is confounded | Supports uncertainty as a pull; not used for any number |
| Gopnik 2020, *Phil. Trans. R. Soc. B* 375, 20190502, [10.1098/rstb.2019.0502](https://doi.org/10.1098/rstb.2019.0502) | Theory with developmental evidence | Childhood favours exploration; adults exploit more | Age factor: curiosity is stronger before planning matures |
| DeYoung 2015, *J. Res. Pers.* 56, [10.1016/j.jrp.2014.07.004](https://doi.org/10.1016/j.jrp.2014.07.004) | Theory (Cybernetic Big Five) | Openness/Intellect reflects a function of exploration | Temperament factor: openness scales curiosity |
| Berlyne 1960, *Conflict, Arousal, and Curiosity*, McGraw-Hill (catalogue only) | Theory; the inverted-U of arousal and preference has mixed support | Novelty, complexity and surprise drive exploration | Not used for a curve. Familiarity fades the unknown term; HF models no inverted U |

## Bounded planning and present bias

| Source | Kind | What it supports | HF use (engineering) |
|---|---|---|---|
| Snider, Lee, Poizner & Gepshtein 2015, *PLoS Comput. Biol.* 11(9), e1004501, [10.1371/journal.pcbi.1004501](https://doi.org/10.1371/journal.pcbi.1004501) | Empirical finding (one foraging task) | People planned a few steps ahead. Results: depth about 3.3 (slow) and 2.8 (fast) from path overlap, 5.0 (slow) and 3.5 (fast) from score advantage; less under time pressure. The abstract gives no number | Depth 2 to 5 steps, default 4 |
| Huys et al. 2012, *PLoS Comput. Biol.* 8(3), e1002410, [10.1371/journal.pcbi.1002410](https://doi.org/10.1371/journal.pcbi.1002410) | Empirical finding with a model | People prune decision trees, especially below aversive outcomes | A fixed node budget; branches beyond it are not seen |
| Keramati, Smittenaar, Dolan & Dayan 2016, *PNAS* 113(45), [10.1073/pnas.1609094113](https://doi.org/10.1073/pnas.1609094113) | Empirical finding with a model | Habit values serve as leaf estimates that cut planning depth | Planning is one pull among habit and other terms, never an override |
| Callaway et al. 2022, *Nat. Hum. Behav.* 6(8), [10.1038/s41562-022-01332-8](https://doi.org/10.1038/s41562-022-01332-8) | Empirical finding with a model | Human planning spends limited computation where it is most valuable | Bounded search in stable order, no full lookahead |
| Laibson 1997, *Q. J. Econ.* 112(2), [10.1162/003355397555253](https://doi.org/10.1162/003355397555253) | Model | Quasi-hyperbolic (β-δ) discounting gives time-inconsistent choice | Optional β on value and cost that arrive only through later steps |
| O'Donoghue & Rabin 1999, *Am. Econ. Rev.* 89(1), [10.1257/aer.89.1.103](https://doi.org/10.1257/aer.89.1.103) | Model | Present-biased agents who are naive about it procrastinate | The present-biased arm of the planning control |

Present bias and hyperbolic discounting have wide support, but their exact functional form is disputed and estimates depend on how they are measured. HF's β is a style setting, not a fitted value.

## Faith framing

None. Curiosity and planning are psychological faculties. They add no lens or norm. Curiosity is not ʿaql, which stays a descriptive lens ([reconciliation.md](reconciliation.md)), and nothing about the ruh is computed.
