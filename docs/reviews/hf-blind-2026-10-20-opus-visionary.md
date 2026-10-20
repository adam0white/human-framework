# Blind consultation, 2026-10-20: Opus, visionary and contrarian

Raw output of one of three blind consultants for [the HF roadmap](../hf-roadmap-2026-10-20.md). The consultant read only the blind packet (starting ambition, `research/`, owner directions; architecture, roadmap, code and game docs excluded). Condensed from the original final message; substance and order unchanged.

## 1. What HF should become

HF's real asset is not its list of faculties. It is a **deterministic, replayable, sourced person whose inner state the player can never read directly**. Most game engines simulate bodies and physics. A few simulate opinions as scalars, and LLM characters simulate talk with no persistent self. The game HF uniquely enables has its core loop in *understanding someone*: earning their trust, misreading them, raising them, being overruled by them, rewinding a day of their life to see what you changed. To get there HF has to stop growing as one faculty per release. It should be organized around three things: the **gap between what is true and what is perceived**, **minds that model other minds**, and **time you can fork**. "Show, don't count" should be a property of the framework's API, not only a UI preference in the games.

**Vision line:** HF is the engine for games about people you can't see inside, whose decisions you can always replay and trace to a reason.

## 2. The 10 most important capabilities, ranked

1. **Theory of mind: fallible beliefs about other persons, including the player.** Each person holds a record of what they believe others want, know and will do, updated from acts they actually observed, and it can be wrong. Without it, a single-actor framework produces isolated people side by side, not a society. Unlocks stranger-earns-trust, social deduction, rumour games, and a game whose central mechanic is the character's (wrong) read of you. Test: Sally-Anne false belief. Control: a 3-person household over 30 days where one broken promise seen by only one person splits the others' beliefs about the promiser.
2. **A "perceived twin" for every state slice.** Each slice (fatigue, hunger, injury, skill, mood, standing) exposes a self-perceived value with its own calibration error; games read the perceived value by default (S1, S3). Unlocks every known-information game. Test: under 14 days of restricted sleep, perceived sleepiness plateaus while performance keeps declining. Control: the same restriction for a careful and a careless person; only calibration differs, choices diverge.
3. **A structured speech-act grammar.** A small closed set of social inputs (ask, offer, promise, refuse, warn, confide, praise, blame, lie) passing through the person's own loop and leaving a record. Deterministic social moves with real consequences, no LLM. Unlocks negotiation, courtship within sourced norms, mediation, interrogation. Test: a request conflicting with a held norm is refused, citing the norm's provenance. Control: two persons negotiate a scarce resource for 30 days; byte-identical replay.
4. **A reason trace on every decision.** Candidates considered, deciding considerations, source ids, each labelled R/I/E/M/C. Serves narration, tutorials, debugging and playtester triage. Test: traces deterministic and labelled. Control: a narrator that sees only traces reproduces a followable 7-day story.
5. **Cheap fork and diff of a timeline.** Snapshot, run two branches, report where and why they diverge. Unlocks regret or rewind games and a sensitivity map for designers. Test: a no-change fork gives identical hashes forever. Control: change one speech act on day 1; report the first divergent decision and the divergence curve over 20 seeds.
6. **Population scale with level of detail.** 1,000+ persons, off-screen ones stepped coarsely with the same invariants and matching distributions. Needed for the ant-colony appeal. Test: coarse and fine stepping agree on aggregate means within a stated tolerance over 30 days. Control: a 1,000-person town for one year within a ms-per-day budget.
7. **Reconstructive autobiographical memory.** Memories fade and are re-appraised; mood and held readings colour retelling while who-did-what stays anchored. Implied backstory. Test: after a low-mood stretch, a retold event's tone shifts, facts fixed. Control: a 5-year life where a loss is reappraised through muhasaba-style review versus a person without review.
8. **Concealment and deception as acts.** Felt versus expressed state; lying as a deliberate act with a cost under held norms. A truthfulness norm **needs a source entry**; it must not be invented. Test: an observer detects inconsistency only from acts actually observed. Control: a 10-day village with one concealed debt; track who suspects and why.
9. **Intergenerational transmission.** Children absorb norms, held readings and practices with variation, by exposure duration (S20); fitra only as held belief and openness, never a score. Unlocks a household or dynasty game over 20–40 years. Test: a child exposed to two norm sources adopts each at rates ordered by exposure. Control: two siblings, 20 years, different seeds, different held readings.
10. **Portable persons with versioned migration.** A person's JSON moves between games and versions. A shared cast across titles. Test: an old fixture migrates and invariants hold. Control: 30 days in game A, export, 30 days in game B; memory and beliefs survive, nothing game-specific leaks.

Uncertain: confident about the order of 1–5; scale could rank first if the ant-colony game becomes the next goal; some may already be partly built.

## 3. Ambitious long bets

1. **The rewind game.** One person's day replayed with one change. Risk: chaotic divergence reads as noise. First experiment: fork and diff on 20 seeds; a wide spread of divergence times with traceable causes means go.
2. **A shared cast across games.** Risk: schema coupling and compounding migration work. First experiment: hand-move one character into another game for a week; record what broke.
3. **Pre-registered prediction of real players.** HF playtesters are worth something only if they predict humans. Risk: tiny, biased opt-in sample. First experiment: before the next game's 20 opt-in runs, write down predicted quit and confusion points, then score them; record a failure honestly.
4. **HF as a public replication suite.** The rejection tests in empirical-models.md as CI; later a published suite of which findings HF reproduces and which it deliberately refuses. Risk: read as validation. First experiment: turn two tests into headless controls and see how many HF fails.
5. **The ant farm of people.** 1,000 persons, no player goal, gentle levers. Risk: performance; dull emergence. First experiment: 200 persons for a year; does unscripted social structure (cliques, a trusted elder) form?

## 4. What to avoid

1. **Letting HF playtesters grade HF games** (the packet wants this). They share HF's blind spots; the "ouroboros" worry is correct. Keep them as adversarial smoke tests, trusted only as far as bet 3 shows. No HF designers or developers.
2. **One faculty per release as the unit of progress.** Add an integration gate: every few releases, a small new game built from HF alone in a fixed number of days; the framework changes it needs are the roadmap.
3. **Lab infrastructure and earning plans displacing HF.** Cap their time; telemetry earns its place only when it feeds bet 3.
4. **Lenses becoming scalars in disguise.** Lens output must be descriptive and categorical, cite sources, never be comparable between people, never a decision input. Test: no game may branch on lens output.
5. **Over-investing in specific rule catalogs.** Games keep faith gentle; general machinery for held norms of any community pays more than more catalog depth.
6. **False precision in coefficients.** Prefer competing model families and sensitivity reports; flag coefficients results are sensitive to.
7. **Any LLM in the decision path**, including narration that feeds back into state.
8. **Modelling the real player from telemetry into persons.** A character's read of the player comes only from in-game acts.

Cannot settle: which capabilities exist; whether deterministic speech acts feel rich enough without language (cheapest thing to prototype first).
