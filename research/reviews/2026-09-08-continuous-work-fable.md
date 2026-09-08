Read all four files. Everything below comes from reading source. Nothing was executed, so no claim here is a runtime verification.

**Verdict:** the work lifecycle is coherent in the common paths, but one path destroys near-complete physical work when participant availability changes, and one display path overstates the player's capability. Both have one-to-two-line fixes.

What holds up on inspection:

- **Materials are reserved, not consumed,** at start and refunded on cancel. Conservation is checked in validate at `src/games/commons.js:207`.
- **Elapsed exposure stays paid.** An interrupted attempt keeps accrued fatigue, hunger and practice because `finishAttempt` only clears the pending record. Canceled minutes still count toward the work receipts, and validate only lower-bounds them.
- **Construction benefits are snapshotted at start,** and validate rebuilds the pre-benefit world to check the snapshot. A timber trip under way when the woodshed completes still yields the old amount. That matches the "later assembly" wording.
- **Rest and idle are distinct and receipted separately.** Idle never recovers. By inspection, the neighbor's rest threshold leaves enough headroom that idling through the longest stage does not block the next assembly.
- **Capacity is assessed for the whole job before it starts,** so a running job is never blocked mid-way.

### Counterexample 1: release discards a nearly finished assembly

1. Player requests the woodshed. The neighbor accepts and starts the 24-minute frame stage. Stock drops to zero timber.
2. Player advances 23 minutes.
3. Player calls releaseProject. The clause at `src/games/commons.js:137` stops any neighbor job that is not eat, rest or forage. The build is stopped, the stage stays at zero, and the reserved timber and salvage return.
4. The neighbor keeps 23 minutes of fatigue and practice. The frame does not exist. Any restart is a full 24 minutes.

The same clause discards a salvage trip at minute 21 of 22 with nothing brought back. The player's own cancel has the same effect, but that is an explicit choice with a message stating the cost. Release is a commitment change, and the neighbor gets no say about abandoning a frame.

**Smallest correction, separately versionable:** on release, let the neighbor finish the job already under way and only prevent the next stage. The released status already does the second part, because desired receives a null project once status is not accepted. Remove the stop call and reword the pending-job reason:

```js
next.commitment.status='released';next.commitment.finishedAt=next.clock.now;
next.commitment.reason=next.jobs.neighbor
  ?'You released our project. I’ll finish what I started, then I’m available.'
  :'You released our project. I’m available for another request.';
```

Validate does not cross-check commitment status against the neighbor's pending job, so no invariant changes. The host still owns task effects, and the human component's paid exposure is untouched. A fallback that keeps current semantics is to throw from releaseProject while a build is pending. That is one line but removes player agency, so I recommend the first.

### Counterexample 2: the choice list says available when start will throw

getGameView passes the rounded view body into unavailable at `src/games/commons.js:164`, while startJob assesses the actual body. The view rounds to steps of 0.05.

| Actual fatigue | Viewed fatigue | 24-minute build projection | Outcome |
|---|---|---|---|
| 0.77 | 0.75 | 0.986 viewed, 1.006 actual | view says available, start throws |

**Smallest fix:** drop the fourth argument so the view uses the same body as execution. Validate pins observation bias to zero, so the perceived-body forecast buys nothing in this host.

### Scope limits, not defects

- **No partial progress or resume.** A stage is all or nothing. Adding a progress field touches state, blueprint, stop and validate. Defer unless a player run shows it matters.
- **No handover mechanism.** After fix 1, release plus wait is a sufficient handover: the neighbor finishes the stage, the player takes the next.
- **The neighbor does not anticipate imminent benefits.** It may start a timber trip one minute before the woodshed completes and bring back the smaller load. Fixing that means planning logic. Leave it.
- **The idle neighbor eats shared food when hungry** even without a project. Consistent with a commons. Leave it.

None of the numbers above is a claim about human realism. They are the engineering defaults declared in model.js.

Recap: two concrete lifecycle defects found by source inspection, both with one-to-two-line fixes in commons.js, and four scope limits that I recommend leaving alone. Next step is applying the releaseProject change and the getGameView argument change as one small version bump, then confirming with an executed run that a release at minute 23 of 24 yields a completed frame.
