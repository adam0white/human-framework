# Habits, purpose revision and constrained opportunity

This private **adaptive-person 0.1.0** candidate adds four bounded capabilities over frozen developing-person: cue-linked action habits, voluntarily accepted purpose revision, functional restrictions with alternative methods, and shared institutional access. It addresses the next gaps in the [roadmap](roadmap.md), following the user's instruction to continue autonomously before another game.

The same actor carries actual paid attempts into later choices. Hosts retain canonical restrictions, resources, permissions and facility outcomes. None of these authored rules is a clinical model, a calibrated theory of habit or a complete account of institutions.

## Learned routines and changed purposes

`src/adaptation/habits.js` derives habit streaks from actual paid attempt receipts. Three successful repetitions under the configured cue and active purpose can suggest the repeated method. A different cue, insufficient repetition, unavailable method or inactive purpose removes that suggestion. Failed paid work and positive-time interruptions reset the cue's streak. Merely waiting cannot train a habit. The threshold is an engineering convention; the suggestion remains optional.

Configured purpose revision requires relevant failed attempts, an actual completed review of sufficient duration, and explicit actor selection. Failure evidence is attributed to the cue and purpose captured when work began. A review cannot reuse failures already consumed by an accepted revision. The adaptive wrapper derives review payment and then calls the existing situated-purpose owner to withdraw the old purpose and activate the alternative. It does not create new purposes or infer moral worth from task success.

In the reference, repeated delivery by walking changes the next method from cart to walk. Two subsequent paid route failures can offer review. Choosing and completing review, then accepting the change, activates coordination and enables a desk task under the host's policy. With one failure, no paid review, or declined revision, the actor continues the original purpose. Task output is a demonstration of changed action, not a universal criterion for worthwhile purposes.

## Functional restrictions and accommodation

`src/constraints/functional.js` owns explicit restrictions against task demands. A method declares its demands, duration, effort and resource costs. Admission checks canonical restrictions and resource availability before beginning Human work. A refused method creates no paid attempt, practice or output. An alternative method has its own cost and duration; it does not erase the restriction.

Restrictions remain active after their review date until an explicit reassessment clears them. Multiple restrictions on the same demand remain independent. Notices identify the specific restriction and source; the host separately records when the notice reaches an actor. Canonical truth is not automatically actor knowledge. This represents functional opportunity; it does not infer a diagnosis, predict recovery or apply a universal disability penalty.

The reference delivers a carrying restriction to the worker. A cart method permits a fifteen-minute delivery if its resource is available; the ordinary ten-minute method remains blocked. Removing the notice, accommodation or resource prevents delivery under the same world rule. The restriction remains active even after its review date has passed.

## Institutional allocation

`src/institution/access.js` owns one facility's grants, reservation, FIFO queue and finite holds. Unauthorized requests do not spend the accepted-request budget. Revocation, withdrawal, release and actual expiry can promote the next entitled request. Reservations confer access; they cannot manufacture completed work.

The reference worker reserves a desk and performs eight paid minutes of work. A peer's request promotes the peer after release and causes the worker's next request to queue. Without the peer request, or after the peer withdraws, the worker can reserve again immediately. The peer's actual work also pays Human time and must fit inside its reservation. This is one authored allocation rule, not general employment, institutional justice or culture.

## One actor lifecycle and portable reuse

`src/adaptive/person.js` composes a developing person and habits under one identity and observed clock. Begin captures action context; finish derives paid evidence from Human's actual attempt. All existing body, learning, beliefs, relationships, duties, course and appraisal owners remain unchanged. Whole-person persistence validates component agreement, pending context and recent payment. Snapshots remain trusted host data; structural validation cannot authenticate a coherently forged history.

The separate package has an exact 21-source allowlist. Its root exports the adaptive lifecycle; `/developing`, `/cognition`, `/sustained`, `/learning`, `/situated`, `/commitments` and `/human` expose the existing components; `/habits`, `/constraints` and `/institution` select the new modules. An independent installed consumer runs with repository reads denied. Public assets and existing package identities remain unchanged.

[Comparison evidence](../artifacts/adaptive-person/comparison.json) records thirteen cases, each run with the candidate policy, an equally informed direct rule and JSON continuation. Direct policies match these authored cases. The adaptation reference tests the first purpose revision only. Cue context is supplied by the host, not independently perceived. The direct arms still carry candidate state and override policy decisions; they share the execution layer. parity does not measure independent implementation cost or human authoring benefit. [Verification](../artifacts/adaptive-person/verification.json) records **1,064 passing tests**, including 37 added checks, and exact identities for all 21 package sources. [Review disposition](reviews/2026-09-15-adaptive-person.md) records findings and fixes.

## Limits and next work

Habits and failure evidence have bounded histories of 128 receipts; configured cues/revisions are bounded. Facility requests have an explicit finite lifetime budget, and restriction histories are bounded. Exhaustion rejects new records rather than silently forgetting evidence. No unlimited production-scale claim is made.

General autobiographical memory, attention, inference, probabilistic cognition, long-horizon planning, spontaneous purpose development, broader emotion, biological aging, childhood and family development remain open. Worship and moral/spiritual development need positive representation and qualified interpretive evaluation. Cross-context usefulness, human evidence and calibration remain separate from software correctness. The next work should address these gaps, not another game or more polishing of the completed reference.

## Reproduce

```sh
node --test tests/adaptation-habits.test.js tests/constraints-functional.test.js tests/institution-access.test.js tests/adaptive-*.test.js
node scripts/run-adaptive-person.js /tmp/adaptive-review
node scripts/package-adaptive-person.js /tmp/adaptive-package
npm test
```

Use Node >=22; on this machine place `/opt/homebrew/bin` first on PATH. The public review site remains [human.adamwhite.work](https://human.adamwhite.work), on its separately recorded app 0.15 commit.
