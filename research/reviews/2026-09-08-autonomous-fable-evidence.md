Source inspection only, across the twelve supplied files. Nothing was executed. Game hosts, adapters, the stamina rival and the protocol.json condition table are not supplied. Claims about them below derive from the protocol text and the frozen Human and model source.

## Defects

1. **Probe verdict is a constant.** Line 60 of scripts/observation-memory-probe.js hardcodes the decision string. The design's decision rule in observation-memory-design.md is conditional on arm results. The artifact would carry the same conclusion whatever the numbers show. Compute it from the correct counts and state sizes, or drop it.

2. **Preregistered bound check is absent.** The design's probe section requires 10,000 unique-cue deliveries with bounded entries and a retained high-water mark. The probe's run function contains no such loop. That is the one measure where the candidate's bound could beat the unbounded notebook, yet the fixed verdict already calls the notebook smaller. If the check lives in an unsupplied test, the report must cite it.

3. **Visible control deviates from the table.** The protocol row lists only a visible target at minute 1. The probe's protocol builder at line 13 always delivers a gate report at minute 0, so memory and notebook show one retained report and one paid minute in a condition meant to have none. Choice is unaffected. The cost and state columns are misleading.

4. **Practice rival is neither smaller nor fairly matched.** The protocol's rival keeps an initial value plus a paid-minute counter per task, two numbers against Human's single skill. Human's practice function at model.js:108 is itself a saturating counter. The linear cap guarantees a retest gap: after 120 admitted minutes the rival closes 62% of the remaining gap and Human 46%, beyond the 0.03 forecast tolerance for most starts. A counter with the same saturating form would be equally small and erase the "diminishing returns" distinction. The 0.75 and 1.25 sensitivity multipliers cannot change curve shape. The learning half tests an authored curve, not extra state earning its keep.

5. **Body-gate disagreement direction is derivable and undeclared.** From the protocol's constants and model.js:22-31, admission of a work interval with effort e, duration t, fatigue f and hunger h is:

```
rival:  e <= 1.5 - f - h/2 - t/400
human:  e <= 1 - f - 0.0015t   and   h <= 1 - 0.002t
```

The rival is stricter only when h exceeds 1 minus 0.002t, where Human already blocks on hunger. At any matched state the rival admits everything Human admits. All admission disagreements go one way. Declare this as a prediction so recorded disagreements are not presented as discovered.

6. **Commons-next ferry choice is dominated by its own pacing.** The Play section gives caches at 73, 92 and 144 minutes, a ferry at 90, and at most two caches at camp.

| Route at the ferry | Households | Camp nights | Unused caches |
|---|---|---|---|
| Send cache one | 1 | 4 | 0 |
| Retain cache one | 0 | 4 | 1 |

Retaining is never useful unless a second cache reaches minute 90, which the design does not show. Deliverable 1's "competing understandable outcomes" is unmet as scheduled.

7. **Watch has one dominant route per scenario.** In the 32-minute default, repair gives protection and service while diversion gives protection, no service and a spare part with no stated downstream use. In the 22-minute scenario repair is infeasible by design. The only live decision is committing parts before or after the lookout. That matters only if the displayed forecast window and the scenario selector in the UI section do not reveal which scenario is running.

## Open risks

- **Sequencing against the contract.** The mvp-contract sequence forbids adding a game "merely to demonstrate activity" and gates the watch UI on choices warranting it. The program runs two hosts and a faculty lane in parallel, skips the attempt/clock helper, and no lane touches the open five-person explanation gate. The heartbeat's "executable work, not audits" rule pushes the same way.
- **The memory probe cannot favor the candidate by construction.** No condition rewards capacity, expiry or provenance, and the notebook's retrieval behavior is a superset. It is a regression suite. Label it so until a host pays for retention. The watch lookout report is the obvious first consumer.
- **Recall does not pin time.** The recall function at observation-memory.js:81 leaves the memory clock unchanged, so a host may recall at minute 10 and then encode at minute 5 without error. The "rejects decreasing time" claim holds only across encode and advance calls.
- **Expected output is forecast times ten**, so the 5% output and 0.03 forecast criteria measure the same quantity twice. Admissions, blocked minutes and resources are the only host-level discriminators.
- **Blocked-interval rule is host-enforced.** Human's finishAttempt at v0.1.1.js:156 accepts a blocked outcome at zero elapsed time. The protocol's full-duration maintenance idle depends on adapter code I could not inspect.
- **Laboratory code inside the frozen kit.** model.js ships scenario validation, controller policy names and module flags as the kit's transitive dependency. The narrow line count and the check-1 release boundary should exclude or explain it.
- **Undisclosed-change scoring** counts correct software behavior as a wrong answer, so the summary blends boundary tests with accuracy.

## Counterargument and next milestone

The documents already disclose most of this. The memory design refuses promotion, the protocol denies that either model is truth and keeps rival-favoring cases, and commons-next calls its pacing exploratory. Load-matching the stamina rival is a genuine strength. It isolates gate and clamp structure with no fitted parameters, and the reserved alias-pair partition is exactly where the two-channel body can show a real distinction. One can also defend the linear practice counter as what a game author would naively write. That defense holds only if the report calls the result a curve comparison.

The result that should change the next milestone is the scripted timing pair commons-next already promises. If no feasible schedule from the fixed opening finishes two caches by minute 90, move the ferry or raise camp need to three caches before any page work. Otherwise the afternoon has one right answer and the explanation gate learns nothing from it. Apply the same test to the watch slice: if the forecast window reveals the scenario, widen it before shipping.
