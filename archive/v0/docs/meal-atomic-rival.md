# Ordinary meals: independent atomic-rival preflight

2026-09-08. Exploratory source-bound review of the current Camp host; no retained-progress meal was implemented or executed. This lane tests the strongest existing controls for one reachable rain boundary. Root owns the final case freeze and admission decision in [the proposal](meal-interruption-proposal.md).

**Finding: actual meal preemption can save a current objective relative to finishing the meal, but the existing wait-first control saves that same objective without preemption.** This is evidence that action ordering matters, not evidence that meals need retained progress. The other lane's earlier ferry boundary and any changed controller tails have their own records; this document does not count them as independently reproduced here.

## Exact source and reachability

The [probe](../artifacts/meal-preflight/atomic-rival/probe.mjs) materializes the host and its entire five-file import graph from Git commit `f5ced4473769ceedbe10cded297599231b052bb5`, never from mutable workspace implementation files. Camp 0.3.0 SHA-256 is `73a535b879e552c7d1bcbd592b82cb751362f42ee7eeb95ad16f8f4473d69d9a`; released Human/runtime 0.1.1 and clock 0.1.0 are unchanged. The result lists every source's SHA-256 and Git blob.

It creates a default fresh game and replays the first 69 commands of `artifacts/camp-maintenance/release-current/earned-supply-success.json.gz`. The initial snapshot and all 69 resulting complete snapshots match the archived trace exactly. This preserves the entire paid prefix, actual materials, both people's condition and practice, acceptance, ferry dispatch and existing household allocations. Trace SHA-256: `2d7c2045210d30bdd8fa37f12e1463e51aa68697d1a6b10787f17fbab7701e7d`; Git blob `e38d81552ff6102b4cd5898204fbabc7745df4a5`.

The reached minute-381 state is ordinary but selected, not a random player sample. The player has fatigue 0, hunger .432 and no job. Meryem owns the third cache's ongoing assembly until minute 383, with two minutes left; her fatigue is about .8393. Shared available stock is seven timber, four salvage and five food, in addition to the already installed current cache materials. Two households are equipped, no camp cache is allocated yet, and the visible rain checkpoint is 404. The ordinary view exposes both active job timing and that a second cache assembly is currently unavailable. No future hidden state or altered deadline is required to identify the opportunity.

The material for the fourth cache is already present at 381, but the exclusive assembly slot is occupied. At 383 Meryem's cache completes. She then needs recovery; asking for the next cache does not make her immediately take the work. The player can allocate her completed cache and start the final cache, which pays 20 minutes and completes at 403. Thus the intervening event is real task availability, not a gifted resource or a researcher-edited body.

## Executed controls

All arms share the exact prefix through 381. At 383 the continuing arms allocate the third cache to camp and request the fourth cache; these zero-time controls are legal even while the player eats. Both successful arms allocate the final cache at 403. They start a full meal at 403, pay its first minute to the actual rain checkpoint at 404, finish/return using existing controls, and pay its remaining seven minutes to 411. A common recovery-only continuation ends at 420. Meryem's full state and actions remain recorded throughout.

| Existing control | Final-cache work | Camp nights at rain 404 | Player meal completion | Player fatigue at 411 |
| --- | --- | ---: | --- | ---: |
| Start competing cache before meal at 381 | Rejected: someone is already building this stage | No continuation of this refused arm | None | — |
| Eat 381–389, then cache | 389–409; five minutes still unpaid at rain | 2 of 4 | 389 | Not a recorded boundary for this arm |
| Eat 381–383, cancel, cache, full replacement meal | 383–403 | 4 of 4 | 411 | .245 |
| Wait with automatic recovery 381–383, cache, full meal | 383–403 | 4 of 4 | 411 | .242 |

The refused start leaves its input unchanged and is preserved as an expected error. The late arm reaches rain, closes with the real two-night shortfall, returns and completes the late cache at 409; it does not retroactively allocate it. Both successful arms have four camp nights at 403. At that time wait-first has fatigue .230 versus cancel/restart .233, with identical hunger .476. Both have five available food before beginning the final meal, four after consuming it, identical construction work/practice, and the same Meryem trajectories. Wait-first used two additional recovery minutes; cancel/restart paid two additional meal minutes with no relief. At 420 they still have the same food, physical cache output, hunger and Meryem state, while wait-first's fatigue remains .003 lower.

This directly rejects an alleged nutrition or resource advantage from atomic cancellation. The portion is returned, not wasted. Atomic cancellation does discard two already-paid meal minutes, but preserving those minutes would not produce an additional camp night here: wait-first already finishes the exact objective at 403. A hypothetical retained meal could finish earlier after the cache, but that is an unexecuted scheduling inference. Earlier relief after all current supply needs are covered is not by itself the missing useful objective.

One separately recorded **upstream counterplan** branches after original command 68, minute 365, while Meryem still has 18 cache minutes left. It reproduces the initial snapshot and first 68 command results exactly (69 matched snapshots), eats a complete meal during 365–373, recovers through 383, builds during 383–403, and covers all four camp nights at 403. This is a feasible earlier plan, not an action available after already reaching the original 381 or partial-meal 383 state. The four original arms above remain unchanged.

This early-meal plan consumes the same one portion and retains both people's real body trajectories. At cache start 383 the player has fatigue .1395 and hunger .020; at completion 403 these are .3695 and .060. The player is more fatigued but much less hungry than wait-first at 403, so this is a scheduling tradeoff, not blanket body dominance. At the common minute 411 it has fatigue .1815 and hunger .076, versus wait-first's .242 and 0. By 420 it has fatigue 0 and hunger .094, versus .0305 and .018. Source rounding is retained in the full record. Both arms have the same stock, output and Meryem trajectory at those common times. The normal early opportunity is enough for a whole meal; the executed wait-first rival independently suffices at the later 381 decision.

## Semantic and ownership constraints

The source calls the action **“Eat a portion”**, not cooking, fetching or preparation (`src/games/camp-current.js:22`). One shared portion is removed from free stock when the action starts; eight paid meal minutes precede a single consumption/relief receipt. A cancellation returns the entire reserved portion and preserves elapsed time without relief (`:76–96`, `:104–111`). This is a deliberately atomic authored abstraction. Referring to partial minutes as “saved preparation” silently changes its meaning; the preflight has no evidence that those minutes represent reusable preparation or that partially eaten food is shareable. It also does not establish that indivisible eating is physiologically realistic.

A resumable variant, if ever admitted elsewhere, would have to distinguish the actor's paused meal from abandonment. The same portion cannot simultaneously remain reserved for that actor and reappear in shared stock for Meryem. Keeping it reserved can change her independently chosen food/forage path when stock is scarce; returning it can mean it is unavailable for a later restart. Five portions at this anchor do not test that scarcity tradeoff. No custom low-food state was introduced to manufacture it. Releasing Meryem's project intentionally preserves her own meal/forage (`:176–179`); her self-care is not the player's freely preemptible resource.

Automatic waiting and eating have different body effects. Each meal minute raises fatigue .0015 and hunger .002 before the sole completion relief. Available recovery pays the same maintenance but subtracts .025 fatigue, bounded at zero (`src/human/v0.1.1.js:134–148`; Camp `:155–158`). At this anchor fatigue was already zero, so two recovery minutes avoid .003 fatigue rather than banking .05 extra recovery. Where fatigue is above zero, the readiness difference can be larger. Completion before a task can instead reduce hunger enough to make the task feasible; partial meal minutes grant no such capacity. Any comparison must retain these different body trajectories and cannot value meal minutes as free recovered time.

The runtime's completed-meal receipt computes relief from that pending attempt's starting hunger plus its paid duration (`src/human/v0.1.1.js:156–172`). Carrying a pending baseline across unrelated activity would require explicit correct accounting for intervening time; a stored scalar “progress” alone is not a demonstrated implementation. No runtime change is warranted by the present result.

Allocation, requests, dispatch, finish and return are zero-time host controls, so they often need no freed eater at all. Real preemption requires an actor-paid competing task, legal post-interruption capacity, actually available resources/task ownership, and a consequential timing difference that survives choosing the task first or waiting for it before starting a whole meal. This anchor meets the first conditions but fails the final comparison against waiting.

## Evidence and limitations

Node 26.8.1 completed two exploratory invocations successfully: four same-381 arms (one expected refusal, zero unexpected errors, 70 exact archived prefix snapshots) and the one upstream control (zero errors, 69 exact prefix snapshots). The repeated prefix is attribution/reachability verification, not a second independent sample. No broad matrix, suite, state edit, external call, player export, public change or candidate implementation was used.

- [Full source-bound result](../artifacts/meal-preflight/atomic-rival/exploratory-b-v1.json.gz): all original prefix commands/snapshots, all alternative inputs/commands/snapshots, errors, body/paid summaries and source identities.
- [Append-only attempted controls](../artifacts/meal-preflight/atomic-rival/exploratory-b-v1.json.gz.attempts.jsonl): every attempted alternative action, including the refusal.
- [Process output](../artifacts/meal-preflight/atomic-rival/exploratory-b-v1.stdout.json) and [empty stderr](../artifacts/meal-preflight/atomic-rival/exploratory-b-v1.stderr.txt).
- [Separate upstream result](../artifacts/meal-preflight/atomic-rival/exploratory-upstream-v1.json.gz), [all attempted controls](../artifacts/meal-preflight/atomic-rival/exploratory-upstream-v1.json.gz.attempts.jsonl), [process output](../artifacts/meal-preflight/atomic-rival/exploratory-upstream-v1.stdout.json) and [empty stderr](../artifacts/meal-preflight/atomic-rival/exploratory-upstream-v1.stderr.txt).

Runner SHA-256 for this invocation is `276805ad0f85564faba46a594caac2d9092ccdffd5b928732ebf7d164d5c98a4`. Reproduce only to a fresh path; the runner refuses to overwrite attempted-control or result artifacts:

```sh
/opt/homebrew/bin/node artifacts/meal-preflight/atomic-rival/probe.mjs /tmp/meal-atomic-rival-new.json.gz
```

The separate [upstream runner](../artifacts/meal-preflight/atomic-rival/upstream-probe.mjs) SHA-256 is `9282ae9a0f95de0a605a0be0e7a3ba8189efc4949454006a5f04e96373e46a03`; it uses the same source graph and trace identity:

```sh
/opt/homebrew/bin/node artifacts/meal-preflight/atomic-rival/upstream-probe.mjs /tmp/meal-atomic-upstream-new.json.gz
```

This selected anchor does not prove atomic meals are globally optimal or that retaining consumed/prepared work can never be useful. It does demonstrate a strong existing solution to the best rain-boundary objection examined here. Admission would require a different concrete current benefit against that solution, rather than renaming the two discarded minutes as the benefit.
