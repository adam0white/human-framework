**Verdict: favorable, with two spec fixes before implementation.** A frozen human component, a tiny serializable clock, and one deadline-free host whose NPC accepts or declines named projects is the experiment the roadmap asked for at `docs/roadmap.md:75`. The persistent game tests the user's deadline complaint directly. The accepted project exercises the commitment seam, not the social bar of gate 4, and the spec rightly claims no more. Two gaps would make the first implementation duplicate bookkeeping or leave the module's value untestable.

## Concrete errors

- **Idle people cannot be advanced.** The host loop at spec line 34 advances every person through each interval. The component throws when no attempt is pending at `src/human/index.js:116`, and nothing else moves a person's minutes. Between assignments the player stays fresh while Meryem works. The host must synthesize idle attempts and interrupt them on assignment. Specify that once, or every host will reinvent it.
- **Skill has no stated effect.** Spec line 42 removes sampled uncertainty, so the success estimator at `src/human/index.js:32` is never called. Nothing else in the spec consumes skill. Keeping practice on cancellation, line 40, is then inert, and the stamina-only rival at line 55 wins by default. Give skill a deterministic effect such as job duration, or drop the practice claim for this host.
- **Unstated bounds.** The clock advances to any target when nothing is due, spec line 31, while the component caps every advance at 1440 minutes at `src/human/index.js:117`. Timestamps are integers at spec line 29, but durations may be fractional at `src/human/index.js:42`. State that job durations are integer minutes and that the host chunks long advances.
- **Package surface leaks laboratory content.** The component re-exports every parameter at `src/human/index.js:4`. Those include trust and assistance coefficients defined at `src/core/model.js:7`, which the package contents at spec line 18 do not list. Copying the whole model file also carries the scenario validator and policy names. The build must extract the six imported functions only.
- **One attempt per person.** A second pending attempt is refused at `src/human/index.js:104`. "Concurrent jobs" must mean one per person. State it before the reservation tests are written.

## Open questions

- **Save compatibility.** Restore demands an exact component version at `src/human/index.js:163`. Any package patch invalidates every consumer save, which conflicts with cross-game saves at `docs/roadmap.md:71`. Decide whether the format version or the component version gates restore.
- **Meryem** is named at spec line 40 without introduction. Is Meryem the neighbor of deliverable 2? Deliverable 2 is unverifiable here because no courtyard code was supplied.
- **Chunk-invariance testing.** Body values accumulate in floating point. Compare resources, stages and timestamps exactly and body within 1e-9. Avoid knife-edge capacity values.
- **The clock ships with one consumer.** It becomes "shared" only when a second host uses it. Mark that as a follow-up claim.

## Recommendation

**Strongest competitor.** Build Common Ground host-native: one stamina scalar, an inline scheduler, no package, no courtyard edits. It reaches the player question fastest, and the fallback is already named at `research/ongoing-play-prior-art.md:21`. It loses because it cannot answer the framework question, and reuse of the frozen component costs only the idle-attempt shim. Extending the courtyard instead of adding a host is the other rival. It conflicts with the unchanged-host boundary at spec line 17 and would entangle water rules with time. Keep the spec's structure and cut its scope.

**Two discriminating checks.**

1. **Idle and chunk invariance.** Meryem works 60 minutes from t=0, the player idles until t=90, then starts a 30-minute job. Run with next-event steps, one-minute ticks, and a single advance to t=120. Snapshots must match, and the player's hunger at t=90 must have risen in every path. This exposes the idle gap and the 1440 cap together.
2. **Module value.** Two scripted runs identical except one includes an earlier cancelled job that practiced the build skill. If every later visible quantity is identical, the practice track is inert here and the module has not earned its place.

**MVP finish line.** Stop when the package installs externally, Common Ground runs with next-event advance, one job per person, reservation and cancellation, Meryem's accept and decline with visible reasons, paused save and resume, and both checks pass. Play and speed are adapters over the same transition and can follow. Mobile overflow and the five-person test stay open.

**Complexity.** Add no physiology, trust scalar, map or extra resource. Do not collapse two body scalars into stamina before check 2 runs, because hunger is what makes shared food bite. Do not reduce Meryem's decline to a capacity check, because then no commitment exists to persist across saves. Two structures with different effects already create the order decision. The third is fine if cheap.
