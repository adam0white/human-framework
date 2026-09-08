The review is complete. The architecture is sound in outline: a pure event clock, a host-owned economy, a frozen human component, and integer-minute advancement from the browser. The direction is acceptable. But the clock-to-person contract at spec line 34 cannot be implemented against the frozen component, and two mechanisms let UI chunk size leak into results despite the promise at line 42. Both are fixable in the host without touching `src/human` or `src/core`. Spec: `docs/superpowers/specs/2026-09-07-portable-ongoing-milestone.md`.

### Concrete errors

- **Idle people cannot be advanced.** Spec line 34 has the host advance "each person through the elapsed interval". `src/human/index.js:116` throws without a pending attempt, and person minutes move only inside that function, so a person between jobs accrues no hunger and no time. The host needs a documented idle convention, such as a non-exertive placeholder attempt ended as interrupted, plus a host-owned per-person settled-at world time. `src/human/index.js:104` also permits one attempt per person, so "player jobs" at line 40 means one at a time.

- **Chunk invariance is not bitwise.** `src/human/index.js:121-129` accumulates fatigue, hunger and practice per call. Sixty one-minute advances and one sixty-minute advance can differ in the last bits, and `src/core/model.js:28` decides capacity on a threshold. The identity claim at spec line 48 holds only if person state is settled solely at event and command timestamps, never on an advance-to-target return with no event. The spec does not say this.

- **NPC decisions on advance return break determinism.** Spec line 34 schedules "new NPC work" after each loop pass. If Meryem's recovery rule reads body state at every return, one-minute Play ticks trigger rest at a minute that next-event advance never visits. NPC decision points must be scheduled clock events or fixed-cadence checks.

- **Structures cannot change recovery rate.** Spec line 38 says structures alter "recovery". The rest rate is frozen at `src/core/model.js:5` and applied without any host parameter at `src/human/index.js:123`. Shelter can change rest availability or duration only. Say so, or the implementer will fork the component.

- **Deliverable 2 has no acceptance evidence.** Spec line 12 promises unchanged 0.1 courtyard outcomes and imported runs, but lines 46 to 51 contain no replay of the four exported snapshots named at line 7.

- **The "narrow" package carries laboratory surface.** `src/human/index.js:4` re-exports `PARAMETERS`, including the trust scalars at `src/core/model.js:7`. Only six exports are needed, but a file-level copy of the model also ships scenario validation and the policy names at `src/core/model.js:100`. Spec line 17 should require function-level extraction plus an identity check against the source.

### Open questions

- **Command ordering at shared timestamps.** Events at now drain before the browser regains control, so Meryem's scheduling sees resources before a player command at the same minute. Make that priority visible, per spec line 40.
- **Event ID reuse after cancel.** Spec lines 29 to 30 do not say IDs are monotonic and serialized. Reuse could let a stale job reference cancel the wrong event.
- **Blocked exertion rule.** `src/human/index.js:145-146` forces the host to report blocked attempts. The spec does not say whether a blocked player job costs time or is refused before reservation.
- **What reads skill?** With no sampled uncertainty at spec line 42, success chance is unused. Unless skill shortens durations or raises yields, practice is dead weight here, weakening the case at spec line 55.
- **Bounded state under continuation.** Supply caches repeat forever, but no test bounds job history, unlike gate 3 at `docs/roadmap.md:54`.
- **Runtime requirements.** `structuredClone` at `src/human/index.js:5` needs Node 17 or newer, and the module is ESM only. The tarball should declare both.

**Strongest competing approach.** Build Common Ground host-native first: two linear counters for fatigue and hunger and a local sorted event array, driven by the same timestamped command script. This is what `research/ongoing-play-prior-art.md:21` and `docs/roadmap.md:75` prescribe, and spec line 55 concedes the question is open. The spec supersedes that roadmap paragraph but drops its comparator. Keep the package, but ship the stamina variant behind the same command harness so the milestone can answer its own discriminating question.

### Discriminating acceptance checks

1. **Strict chunk invariance.** One command script with a cancellation, a meal, and a Meryem recovery triggered by a fatigue threshold. Run it under next-event only, one-minute ticks, seven-minute ticks, and a save plus restore at a non-event minute. Require the full save export to be string-identical, not tolerance-equal. Per-tick settlement or decision-on-return fails this. Boundary settlement with projected views passes.

2. **Stale completion is inert and goods are conserved.** Start job A reserving timber, advance partway, cancel, start job B for the same person, then advance past A's original end. A must yield nothing, B must settle normally, and `src/human/index.js:140` must reject A's old attempt ID if its event survives. Assert stock plus reserved plus consumed equals initial plus produced at every boundary.
