# Time, persistent projects and the next host

Reviewed 2026-09-07. These are game-design precedents, not empirical evidence about human behavior.

## WazHack

The developer's [official Steam widget](https://store.steampowered.com/widget/264160/34263/), linked from [the official website](https://www.wazhack.com/), says time advances with the player's actions. The [developer's press kit](https://www.wazhack.com/press) discusses the difficulty of showing its time-stopping mechanic in video. This establishes a useful precedent for separating time in the simulation from continuous screen activity. It does not establish WazHack's internal scheduler implementation.

Our inference: a host can expose step-to-event and running-clock controls while preserving a single simulation transition system. Common Ground tests concurrent jobs with distinct durations; its Play control is an adapter, not evidence of more realistic cognition.

## Universal Paperclips

The [original playable page](https://www.decisionproblem.com/paperclips/index2.html) exposes manual production, production rates, purchasable automation, resource conversion, projects and later exploration. The useful precedent is changing productive capacity and the set of decisions available as structures accumulate.

Our choice: keep a small worksite whose shelter, workbench and garden alter later job economics; preserve visible resource costs and permit continued play after the first construction milestone. Avoid exponential scale, a hidden narrative or cosmetic currencies solely to imitate the reference.

The [author's first patch notes](https://decisionproblem.com/paperclips/patch1notes.html) record progression traps: an allocation can make required projects inaccessible for an unreasonable period, and a transition can leave insufficient material for a first factory. This is a concrete warning against assuming all reachable states retain a useful path forward. Common Ground therefore needs renewable basic resources, recovery paths and testing beyond its first milestone.

## What would change our design

If players find assigning projects and waiting less meaningful than the present puzzles, merely adding duration did not solve the problem. Keep next-event advance and change decision content. If a small host-native stamina model offers the same causal clarity with less integration work, keep the narrower module and do not make the laboratory policy mandatory. A general social API should be extracted only after a second host needs the same response or commitment semantics; water amounts and project stages belong in their hosts.
