# Game-design review of the v1 spine (2026-10-02)

Reviewer stance: systemic-sim designer/engineer. Inputs: the "Urge → Assent → Act" plan, `research/islamic-foundations.md`, `research/empirical-models.md`, `AGENTS.md`. Statements of current practice are marked; the rest is judgment.

## 1. Lock now

| Decision | Why |
|---|---|
| Seeded PRNG in person state; `Math.random` and `Date.now` banned in `packages/human` by lint rule. | Determinism breaks once, silently, and never recovers. |
| Deterministic iteration: affordances sorted by stable id; event queue tie-breaks by (time, person id, sequence). | Key order and insertion order are where "same seed, different run" hides. |
| Snapshot = JSON with `schemaVersion` + `engineVersion`; replay = seed + input log. Ship both. | Snapshots debug state; input logs reproduce bugs. AGENTS.md already requires versioned incompatibility. |
| Sim in a Web Worker; UI receives snapshots and traces. | Enforces UI-independence mechanically and decouples tick from frame. |
| Closed-form body update must expose `nextThresholdCrossing(state, now)`. | Deciding only on activity end misses "got hungry mid-task". The solver is what makes interrupts correct. |
| Add a `perceived` body view separate from true body state. | empirical-models §1 and the rejection test list ("sleep restriction without proportional awareness") require it; the plan has no interoception layer. |
| Change: drop "self-control" as a WILL input. Use competing actions, cue habits, real fatigue cost, precommitment devices. | empirical-models §6 rejects the single willpower fuel. The plan contradicts its own research. |
| HEXACO enters only as coefficients on utility and appraisal terms, never a branch. | empirical-models §4: traits parameterize, they do not command. Keeps the trace honest. |
| Default arbitration: argmax with hysteresis; softmax temperature opt-in per person. | For an explainable product, "the dice said so" explains nothing. Noise belongs in perception and outcomes. |
| Trace records intention (the goal served), not only term weights. | islamic-foundations §4: intention separate from behavior and observers' beliefs. Game 2 narration needs it. |
| Episodic memory bounded: fixed capacity, consolidation, decay. | Unbounded memory is the Dwarf Fortress perf cliff and makes saves grow forever. |
| Typed refusal `{kind: cannot \| notNow \| willNot, reason, counterOffer?}` on every rejected suggestion. | Untyped refusal is indistinguishable from a bug. §3 depends on this. |
| No theological names for mechanisms: seed is not "qadar", scheduler is not a divine actor, trust is not worth. | islamic-foundations §3 and §5 say so. Make it a repo naming rule. |
| Stack as planned. React renders snapshots only. | Fine. |

## 2. Pitfalls and the API mitigation each needs

| Pitfall | Mitigation |
|---|---|
| Dithering (two bites, one minute of sleep, repeat) | Commitment inertia: current activity gets a bonus decaying with elapsed fraction; interrupts need urgency above a hysteresis band. `switchCost` appears in the trace. |
| Need death spiral | Super-linear urgency plus guaranteed floor affordances (rest in place, drink from hand) with zero prerequisites. Test: nobody starves while food is reachable. |
| Interrupt starvation in event-driven loops | `maxDeliberationInterval` (~30 min) forces re-decision during long activities. |
| Illegible behavior | Every decision returns top three candidates, term breakdown, one templated sentence. Sentence shown by default, breakdown on demand. If a tester cannot say why in five seconds, the term vocabulary is wrong. |
| Refusal reads as bug | Typed refusal, acknowledged within one sim minute; moral veto visually distinct from capacity refusal. |
| Emotion as noise | OCC-lite emotions carry a target and an action tendency: anger at a person becomes avoidance of that person, not a mood penalty. |
| Invisible memory | Narration cites the episode when memory changes a decision ("refuses the night shift; remembers last week's collapse"). |
| Mislearned affordance value | Clamp learned deviation per outcome; trace shows `advertised` and `believed`. |
| Perf drift | Benchmark in Vitest: 20 people, 30 sim days, under 2 s headless. |

## 3. WILL: making refusal fair

Frame it as the notes do (Bukhari 5269): the player supplies the suggestion, the person supplies assent. The fairness rules follow.

**Telegraph before commit.** On hover, show the predicted response from the same trace the decision uses: "Likely yes" / "Later: hungry" / "Will refuse: unsafe". This is the Crusader Kings 3 acceptance-breakdown pattern and current practice for ask-not-command systems. No surprise after the click.

**Acknowledge instantly.** A nod or head shake within one sim minute, even if the action starts later. Latency without acknowledgment reads as unresponsiveness.

**Three kinds, three visuals.** Cannot (grey: injured, asleep, unskilled), not now (amber, always with a counter-offer: "after I eat", half the load, with a partner), will not (red: moral veto or broken trust). Only red should feel like a wall, and it should be rare.

**Insist is a button with a visible price.** It converts a suggestion into compliance-under-protest: degraded quality or speed, autonomy drops, the person remembers. Show the price on the button. Never free, never impossible for amber.

**Trust is readable.** Per-person trust-in-voice meter with the last three events that moved it. Harm from a followed suggestion costs more than a good outcome earns. Label it trust, never a quality of the person.

**Partial compliance beats binary.** A worker who dug half the trench and sat down is forgiven; one who stood still is not.

## 4. Game 1

The before/after concept is right; the toggle is a trap. Three minutes is one run, so a mode switch means the contrast is never seen. Make it simultaneous split-screen on the same seed with one shared order queue: Classic left, Human right.

Named failure mode: Human just looks slower. The scenario must contain a tempting bad order where obedience costs Classic something visible, so refusal is vindicated on screen. Also run a headless solo control (Human people, no orders) per AGENTS.md; if they beat the player, that is a finding.

**Smallest scope:** six people, three jobs (gather, build, cook), two sim days, one hazard (storm on night two), prayer times on the clock, one well. No tech tree, combat or trade.

**Five moments** (1, 2 and 4 are rejection tests from empirical-models):
1. A hungry worker finishes carrying the injured neighbor before eating. Classic never had a commitment to keep.
2. The same person works hard at dawn and refuses the same job at dusk, counter-offering "after Maghrib". Classic treats both orders identically.
3. Classic sends the only cook to the mine; nobody eats. Human's cook refuses ("will not: everyone goes hungry") and the player sees why by dinner.
4. Two people paired on a task succeed where either alone fails; the pairing was the Human side's idea.
5. Day two: Classic is fine on paper; a Human villager remembers being pushed into the storm and now refuses at normal urgency with trust visibly lower. This is where the framework becomes the product.

## 5. Game 2 premise

Keep the inner voice, but make the ending the hook: on the final day of the season the voice is muted and the player watches the person act alone. Habits, commitments and trust either hold or do not, narrated by the person's own trace. Trust in the voice is the resource; the person no longer needing it is the win. It stays inside the notes' boundaries (the player is a suggestion, never a judge or a scorer of worth), makes retained learning and habits the content rather than decoration, and gives the framework a showcase no command-based game can copy.
