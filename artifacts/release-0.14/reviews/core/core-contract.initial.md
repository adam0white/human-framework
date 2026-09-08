# Across the Cut public host 0.2.0

Selected implementation contract, 2026-09-08. This is the public-eligible factual host for the [actor-local player execution boundary](actor-local-player-execution.md); delivery remains the release owner's responsibility. The host imports released Human/runtime 0.1.1 and clock 0.1.0 through `src/runtime/index.js`. It executes authored software rules, with no empirical calibration claim and no actor policy inside transitions.

## Derivation and changes

`src/games/across-cut.js` derives directly from the frozen private `src/experiments/across-cut/host.js` (SHA-256 `13200cf52557d5c7c45319548e79512998c020e4c73eb6e8f35f17e5800080db`). The old host, its experiments and their outcomes remain unchanged. New host identity is `0.2.0`; its save envelope is `{format:'human-across-cut',saveVersion:1,hostVersion:'0.2.0',state}`. Private study saves are incompatible; there is no migration.

The derivative removes proposal, contribution, acceptance, refusal, withdrawal and confirmation commands, storage, views and fulfillment logic. Reports admit only the sender's own first-hand absolute observations. Public API states are deeply frozen; detached states and imported saves must validate through exact replay before use. This adds no saved fields.

Before evaluation source freeze, the release owner applied the user's available-time recovery instruction: an actor with no job receives one paid minute of released Human **rest** activity at each tick, recorded as `paid.availableRecovery`. That minute finishes immediately, leaving no held job. It replaces the private host's active `idle` behavior. Explicit timed rest and owned meals remain available. All new comparison arms use this same rule. Repair, release, attendance, cart, travel, radio, meal, channel and water timing/cost rules remain the frozen host's rules.

## API and actor ownership

Exports retain `ACROSS_CUT_VERSION`, frozen `ACTORS=['keeper','receiver']`, and `create`, `request`, `interrupt`, `advance`, `getActorView`, `getKnownLocalBoundary`, `exportState`, `restoreState`, `getWorldSummary`.

`create(options={})` retains the private contract's setup: `valveMinutes` 6/default or 12, `inletMinutes` 2/default or 14, `launchAt` 27/default or 15, `channelMode` reliable/default, bounded or lossy, nonnegative integer `channelSeed` up to 2147483647, optional `channelOverrides`, and optional own `bodies` fatigue/hunger (both .15 by default). Each override names an exogenous `sender:completionMinute` slot, with delay 2, delay 6 when permitted, or `loss` in lossy mode. A channel slot does not depend on earlier traffic.

The ordinary actor view retains own body, position/location, inventory, job, local facts, notebook/latest, received inbox, completed sent envelopes, paid minutes, last result, own budget and known boundary. `body` is the complete own Human view; fatigue/hunger are under `body.body`. There is no remote body, remote decision budget, pending arrival, transport outcome or global service result in this view. `local.launchAt`, departure and service fields are known claims and may come from an old report; render their notebook provenance rather than describing them as current remote truth. `peerPresent` remains a local contact affordance.

Views, summaries and save envelopes are detached plain data. Host states returned by create, transition and restore are deeply frozen. A mutable structured clone of a valid state remains admissible after replay verification. Unknown fields, accessors, foreign prototypes, sparse arrays, nonfinite numbers, negative zero and cyclic inputs reject. Refused commands leave caller state unchanged. Bad state errors use `INVALID_STATE`; malformed envelopes use `INVALID_SAVE`. Actor policies and ordinary presentation must receive only their actor view; raw state, saves and `getWorldSummary` are researcher-only data.

## First-hop facts and timestamps

The only message request is `{task:'transmit',message:{kind:'report',observationIds:[...]},via?:'radio'|'contact'}`. Select 1–32 distinct own notebook receipt numbers. At admission each record must have `via:'local'` and match one of these absolute facts:

| Source | Allowed cue |
|---|---|
| `valve` or `dock` | Matching `repairMinutes:station`, `repairProgress:station` |
| `dock` | `launchAt`, `launchDeparted`, `serviceUnits` |
| `cart`, receiver only | Own `cartDelivery` result |

Absent records reject with `UNKNOWN_OBSERVATION`, received relays with `NOT_LOCAL_OBSERVATION`, and local observer-relative presence with `UNREPORTABLE_OBSERVATION`. A chosen record is copied unchanged into the outgoing report: original cue, value, source, receipt, observation time, local receipt time and `via` are preserved. The recipient's notebook assigns its own receipt number and actual receipt time while retaining source and observation time. The inbox envelope preserves the sender and complete original source records. No new witness chain is inferred.

Message IDs are sender-local; sent time is the paid transmission completion boundary. Inbox entries add actual recipient receipt time. `latest` selects the greatest `observedAt` per source/cue, breaking equal-source-time ties by receipt order. A late old arrival remains in the notebook without displacing a newer claim. Completed `sent` records never gain delivery, delay or loss information.

## Paid action and physical rules

The episode ends publicly at minute 30. Valve is position 0, dock/inlet position 6 and the cart loading endpoint position 11. Both actors may walk; own station work is role-restricted. Dock notice and tally are locally visible; an inspection reveals the station's repair requirement. Progress and peer presence are locally visible. A cart actor observes its own delivery result while away.

| Action | Paid duration and ownership |
|---|---|
| Inspect | 1 active minute at a station |
| Repair | Requested positive integer minutes up to known remainder, default whole remainder; one fitting installed on the first paid minute |
| Release | Keeper, repaired valve, 2 active minutes; reserve 2 water, consume on completion, restore on stop; pipe arrival 3 minutes later |
| Attend | Receiver, dock, requested positive integer interval; paid preceding interval must cover arrival |
| Cart | Receiver, 10 active minutes: 5 outbound, delivery, 5 return; owned water consumed at delivery |
| Travel | One active minute per remaining segment to valve or dock |
| Rest | Requested positive integer interval of Human rest |
| Meal | 2 paid minutes; one owned meal consumed on completion, restored on stop |
| Transmit | 1 active minute; radio reserves/consumes one of four charges, contact needs co-location at start and completion |

Effort per minute is repair .012, release .015, attend .006, cart/travel .010, inspect/transmit .003. Each whole requested interval must pass the released Human capacity check, including a job whose nominal endpoint extends beyond horizon. Repair practices `repair`; cart/travel practices `carry`. Explicit and automatically available recovery both use released Human rest. All elapsed intervals advance each person's body/time.

Stops retain paid repair/progress/practice and physical position. Stopping outbound cart restores undelivered owned cart water at the actor's actual position; the actor must pay travel back before starting another cart. Stopping return cannot restore delivered water. Reception is passive and never cancels a job. With integer time a one-minute transmission can only be interrupted at zero elapsed transmission minutes; no positive fractional transmission payment is claimed.

At each boundary the host pays both preceding actor intervals, moves the clock, settles cart delivery and job completion in keeper/receiver order, settles due pipe arrivals, then due radio messages, closes a launch at its deadline, and records accessible station observations. Contact delivery occurs during its completing job, preserving the private host's order. Minute 30 then stops remaining jobs and restores unused reservations. Attendance ending exactly at arrival and delivery exactly at launch count; a newly requested attendance at an already settled timestamp is too late. Pipe/carts serve at most two units. Delivered + lost + excess + in-transit + available/reserved owned water always equals the initial three units.

Known future boundaries consult only own job endpoint, a known launch notice and public horizon. They never consult pending receipts or hidden launch/work. `advance(state,target,{actorId,stopOnReceipt:true})` may stop only after an actual new receipt, including local observation receipts. The public driver must distinguish continuous local repair progress from a meaningful presentation stop. A hidden launch cannot end the remote keeper's episode before minute 30.

## Bounded save validation

The existing finite command list remains to reconstruct actual first-hop report origins, resource reservations, pending work and queue state on cold load. Restore reruns setup and commands and requires canonical structural equality with the submitted state. This is a bounded integrity choice for this thirty-minute host, not authentication or evidence that journals are universally necessary. No second journal, history migration or portable cognition mechanism is introduced.

Each actor has 128 local request/stop entries. A current job reserves exactly one remaining entry for its stop; another actor cannot spend or observe that room. There are at most 30 elapsed-time commands, so the total maximum remains 286 entries. Ordinary consecutive advances coalesce only with matching options; receipt-stopped advances retain distinct observed stops. Failed commands do not spend budget. Transient weak identity tracking lets the module trust its own deeply frozen output; detached input still replays. No cache or trust flag is serialized.

Focused verification is in `tests/across-player-core.test.js`. It covers the preserved minute-eight report/release stop and continue branches, source-time order and relay rejection, interrupted work/travel/cart, exact arrival/launch endpoints, available recovery and meals, horizon closure, budget exhaustion, strict state/save validation and hidden-world view/error/boundary equality. Driver/NPC, comparison outcomes, DOM/controls, deployment and broader usefulness are separate release checks.
