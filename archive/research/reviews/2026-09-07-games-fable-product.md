# Independent Claude Fable review: product

Working-tree snapshot, source hashes and exact request recorded in the paired provenance. Read-only review; no code execution or live browsing.

---

**Verdict.** The software is disciplined: deterministic, replayable, save-hardened, and the shared component has stayed byte-frozen across four hosts. The framework thesis is not yet demonstrated. Three of the four hosts are one wrapper with different nouns, the code that actually repeats lives outside the shared component, and every player-facing benefit of the body and practice model is still assumed. The roadmap names the evidence it needs, then built three games before collecting it. Continue, but move the reuse boundary and stop adding hosts until one game has player evidence.

Evidence limits: the core model and random modules are absent from the snapshot, so exact capacity thresholds and success curves are unknown. Benchmark artifacts are absent too, so the numbers in the documents are claims I could not check. I ran nothing.

## Findings

1. **The repeated code is the host scaffold, not the component.** Concrete. The attempt lifecycle, two-minute blocked rule, deadline truncation, settle, command replay and hash function are duplicated nearly verbatim across the three solo hosts. The forecast trick of cloning a person from the view and advancing it appears three times as well.
   - `src/games/shift.js:76-115`, `src/games/courier.js:106-163`, `src/games/workshop.js:105-177`
   - Courtyard is the only integration with a different shape: atomic ten-minute turns, two persons, no partial intervals, in `src/games/courtyard.js:128-158`. So the answer is one different integration and three wrappers.

2. **Save validation dominates host authoring cost and is not a player feature.** Concrete. Roughly a quarter of each host is adversarial import checking, including a minimum spanning tree travel bound at `src/games/shift.js:162-164`. These are local single-player games with no leaderboard. Every future author inherits this burden, and none of it is shared.

3. **Felt versus actual condition can silently punish the player.** Concrete. Forecast capacity uses the rounded view body at `src/games/shift.js:65`, while execution uses the true body inside the component. Observation bias is zero in every host, so the only "perception" is rounding to the nearest five percent at `src/human/index.js:97`. When true fatigue sits within that band of the threshold, a button with no warning produces a blocked event with no explanation. How often it fires depends on the missing constants. That it can fire is visible in code.

4. **The blocked penalty was propagated before it was validated.** The roadmap says its causal contribution "has not been established" and a zero-cost control is outstanding at `docs/roadmap.md:63`. It is now hard-coded in three hosts. In courtyard a blocked lift costs a whole move instead, so the same mistake costs different amounts across the family.

5. **Inspection in Pump Yard changes only a displayed number.** Concrete. The revealed condition shifts the estimate by five hundredths of difficulty at `src/games/shift.js:66`, while the outcome always used the true condition at line 87. Patch and replace difficulties differ by far more, so the information rarely flips a choice. The design document admits no controller inspects. Courier's inspection is the one place information has real value, because expected crossing cost depends on it at `src/games/courier-policy.js:10-11`.

6. **Courier due times have no consequence.** Concrete. The summary counts on-time and late deliveries at `src/games/courier.js:103`, but nothing scores lateness. There is no end command, so a player who cannot reach the last parcel must click rest until the clock expires. The one-minute advance button in the pending panel is a research control in a player surface.

7. **Courtyard records social history it never uses.** Concrete. Ignored proposals and refusals by either side are counted at `src/games/courtyard.js:179-194`, but Meryem's decisions read only gifts and late loans at lines 89 and 94. Player proposals have no cooldown and always cost Meryem a full move, so repeated asking drains her turn budget with no recorded consequence.

8. **Unused component surface.** Hazard and exposure are never passed by any host. Observation bias is enforced to zero on import at `src/games/courier.js:172`. Courier's interrupt command lacks the reason string the other hosts require, so replays differ in shape across hosts.

9. **Density is a reuse cost.** The hosts are written as very long single lines with one-letter names. The roadmap's plan to have a different author review each host and to record authoring effort will pay for this.

| Claim | Status | Where |
|---|---|---|
| Component unchanged across four hosts | Demonstrated by hash pins | `tests/shift.test.js:100` |
| Interrupted attempts keep elapsed practice, blocked attempts earn nothing, meals relieve once | Demonstrated at component and host level | `tests/human.test.js`, host tests |
| Mid-action save, replay, bounded state | Demonstrated | host tests |
| Practice changes a later outcome | Demonstrated as arithmetic only | `research/learning-through-work.md:57` |
| Body model improves play or authoring | Assumed. No host-native comparator, no playtest | `docs/roadmap.md:50` |
| Felt condition is a meaningful mechanic | Assumed. Rounding only | `src/human/index.js:97` |
| Social memory changes outcomes | Partly. Controllers never borrow, so the late-loan rule never fires in the benchmark | `scripts/courtyard-benchmark.js:59` |

## Claims, comparisons and sequencing

**Learning.** The probe shows that switching the exponential curve on raises a retest chance. That confirms the authored formula is monotone, and the research note says so itself. No simple policy needs the curve to win. The courier policy test asserts every heuristic delivers at least three parcels on every tested seed, and the shift document reports fixed-order routes restoring all three pumps in most seeds. That is good for playability, and it means the model is not load-bearing. What a player sees is a meter moving a few points. In Courier the meter never moves for anyone who takes reliable roads, since only crossings train routecraft at `src/games/courier.js:53`.

**Social.** Courtyard is honest and traceable: Meryem states her reason, and her rule reads only visible facts. She is also fully predictable from the hint text, and the ending has four labels with no ranking, so the player is never told whether both households ready beats their own household ready. Hypothesis: on the default supply the cistern plus carried water exceeds both targets by six buckets, so real tension appears mainly on the scarce profile. The Prom Week comparison overstates the pilot. Prom Week separates intent, response and dialogue over a large social state. Meryem is two counters and a dozen rules.

**Human and theological claims.** The evidence map at `docs/roadmap.md:19-25` places sleep research, needs research, Prom Week, and Qur'an and hadith citations in one table. None is tested by the software, and the code takes no parameter from any of them. The theological entries are a commitment about what not to model, and the code complies trivially because no such variable exists. They are design constraints and should be labeled that way, not as evidence.

**Weak comparisons.** Shift controllers differ only in job order and spare placement, share one recovery rule, and never inspect. Courier controllers vary route costing only, and none varies recovery. Courtyard's memory contrast exercises one of its two memory rules. No host anywhere is compared against a plain stamina counter, which is the comparison the roadmap itself demands.

**Sequencing.** Gate three requires a host-native comparator, recorded authoring effort, and a small explanation playtest before further hosts at `docs/roadmap.md:54`. Gate four's social pilot was to follow. The 0.4 milestone added three hosts and started the social pilot with gate three open, which the document concedes at lines 50 and 55. It then proposes the right next experiment, a shared scheduling and serialization helper, at line 75. That experiment should have preceded the third host, not followed the fourth.

## Competing direction and next steps

**Ordinary alternatives.** Pump Yard is a three-job scheduling puzzle: drop the mandatory flow test, fold hunger into one energy meter with a snack, and let inspection reveal something that changes the plan, such as which pump needs the spare. Courier Round is the strongest game: give due times teeth, add an end-round action, drop hunger, and build around the inspect-or-gamble crossing. The last water would be better as a hotseat two-player game, which makes independent responses real rather than simulated.

**The competing direction.** Invert the reuse boundary. Ship the scaffold as the framework: one pending action, a minute clock with deadline truncation, keyed randomness, settle with duplicate-effect protection, command replay, structural save checks, a controller loop and a benchmark harness. Reduce body and practice to a plain-function stamina module the scaffold calls, with no attempt identities, because the scaffold already owns the single pending action. Then build one game to a playtested standard rather than four to an integrity-tested standard.

**Conditions to choose.** If a courier variant using a thirty-line stamina module passes courier's own game tests, hash pins aside, with fewer host lines and identical behavior, the lifecycle is not paying for itself and the boundary should move. If instead playtesters explain outcomes with fatigue, hunger and practice unprompted, and notice and value the felt-versus-actual gap, the component is load-bearing and only the scaffold should move.

**Next two steps.**

1. Extract the shared scaffold from shift, courier and workshop and confirm all three suites pass unchanged. Record the host line delta. This is the first option at roadmap line 75 and needs no users.
2. Run the one ordinary run the roadmap asks for on Courier Round, hints hidden, with three to five people. Record seed, choice and reason, and ask each person to explain one blocked action and one failed crossing. Decide the blocked penalty and the rounding from those answers before writing another host.
