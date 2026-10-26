# Event-only catch-up prototype

P3 adds `StepOptions.catchUp: 'events'`. It requires `deathHandling: 'community'`.
Omit `catchUp` to retain the exact eager driver. This is a host contract prototype,
not an automatic optimization for Watch or another game. `runSilent` rejects
event-only options before mutation because it reads chronicles internally.

```ts
const run = { catchUp: 'events', deathHandling: 'community' } as const;
const events = stepCommunity(community, world, until, run);
// Persons may still have now < until. Do not read them yet.
events.push(...synchronizeCommunity(community, world, until, run));
requireCommunityCurrent(community, until);
// Read a HUD, compute outside-driver offers, preview, save or mutate people here.
```

Keep targets monotone. Pin both options in the host run configuration and restore
them with the community and people. Retain events returned by synchronization.
It runs the ordinary eager driver for the entire community; it can discover death,
notify tied listeners and release pending proposals. Death discovery can be delayed
until the next scheduled event or explicit barrier. It does not infer the biological
death minute. Hosts that need earlier death or duty discovery must place barriers
at those times or retain eager stepping.

Scheduled decisions, perception windows, day hooks, interruptions and passive doze
checkpoints still run. A barrier does not pull percepts earlier than the normal
scheduler. Use `interruptPerson` for an immediate event. Scheduling that interruption is safe
without first reading or directly mutating Person state. A zero event log cap still
limits logging only. No perception, duty or death is removed from advancement.

Call the barrier before every outside-driver read or mutation of Person state,
including UI frames, moments, forecasts, save/export and offer construction.
`requireCommunityCurrent` only detects lagging clocks. It cannot detect stale host
projections or a forgotten read. World callbacks receive their current subject;
other people can be stale. Audit callbacks that read partners or the whole cast.
Do not recursively synchronize from a callback. A host needing such reads should
keep eager stepping until its callback contract is redesigned.

Different tick partitions can change floating point state, threshold discovery
and later choices. Event-only runs are deterministic for the same pinned calls,
options and inputs; they are not promised to equal an eager run with additional
intermediate ticks. Exact equality controls compare the same tick boundaries.
The 3.2 community-death repair also preflights lagging living participants before
resolving running work, even in eager mode and when nobody dies. Participants are
`with`, actual retained joint membership, and a `targetId` under the existing
talk/call/conversation convention. A generic referent alone gets no preflight.
These additional ticks change partitions, possible threshold crossings and later
choices relative to opted-in 3.1. Omitted-policy continuation remains exact on
valid old input. Replay an old opted-in run with its exact old package.

Actual participant loss survives proposal-history pruning and world-percept
interrupt overwrites in optional `Community.partnerDeaths`, keyed by running
decision identity. Save it through `communityState` with Person and world state;
restore all three and reapply the policy. Pending-proposal review is not proof
that a different running activity lost a partner. No RNG is added by this record.

This is fine stepping. Coarse stepping has separate fidelity rules.

## Watch remains eager

The source audit found direct post-step Person reads in
`apps/site/src/watch/sim/night.ts` (`stepPeople`: placement and percept pruning),
`apps/site/src/watch/sim/moments.ts` (`checkMoments`: body/downed and helpers), and
World offer construction. These paths assume current people. Watch's existing
`stepCommunity` call has no `catchUp` option. Host adoption requires a separate
read audit and barriers; this prototype changes no site or game source.

## Bounded current measurement

Run `node scripts/suite-lock.ts -- node packages/human/examples/event-catch-up-profile.ts`.
It profiles 32 and 128 fine-driver people over 30 simulated minutes, using 120
quarter-minute calls, empty offers/percepts and a final explicit barrier. Each size
has a warmup per mode and two measured runs per mode in alternating order.
V8 samples allocations at 16 KiB, including collected objects. These are estimates;
timings include sampling overhead and concurrent machine load.

The final 2026-10-25 run on Apple Silicon/Node 26 measured (fixture creation and
result hashing excluded from timing and sampling):

| People | Eager ms     | Event-only ms | Eager sampled bytes    | Event-only sampled bytes | Events per run |
| ------ | ------------ | ------------- | ---------------------- | ------------------------ | -------------- |
| 32     | 12.15, 11.19 | 1.84, 1.39    | 32,323,640, 31,886,552 | 2,592,688, 2,658,944     | 192            |
| 128    | 32.09, 32.26 | 6.13, 7.38    | 96,284,624, 90,904,072 | 7,928,712, 8,208,000     | 768            |

The sampled stacks include needs/body/affect tick allocations. This workload shows
benefit from avoiding repeated final ticks. It does not establish that per-event
Maps, arrays or proposal filtering are the bottleneck in R2 V11. No allocation
order or data structure is changed here. Frequent barriers still perform the final ticks; savings depend on host read schedules.
Active populations, longer spans, other seeds and a quiet-machine repeat remain
unmeasured. Neither these timings nor old timing shares justify host adoption.

Repeated runs within each mode had identical complete-state/RNG hashes. The modes
produced different complete-state hashes from each other, confirming that the new
contract changes tick partitions. Host adoption must accept that behavior change.
