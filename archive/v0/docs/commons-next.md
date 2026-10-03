# Common Ground: Before the rain

Implemented 2026-09-08 as a separate episode, game 0.1.0 / save wrapper 1. Integration and delivery are handled by the parent task. The preserved continuing worksite remains Common Ground 0.1.0 at `/commons/`; this episode uses `/commons-next/` when registered. No original player save is used as its opening.

[Design fixed before implementation](superpowers/specs/2026-09-08-commons-next-design.md) · [Implementation plan](superpowers/plans/2026-09-08-commons-next.md) · [Wrapper](../src/games/commons-next.js) · [Headless tests](../tests/commons-next.test.js) · [Executable comparison](../scripts/commons-next-comparison.js) · [Retained results](../artifacts/commons-next/comparison.json).

## What changed

The original game turns surplus into an unbounded cumulative cache count. The episode starts from an established camp and gives completed caches two exclusive uses: one household kit across the river, or two wet nights of camp supplies. Two households and four wet nights can be provided for. The ferry leaves halfway through the 180-minute afternoon, so late production can only help camp. Each cache retains the original 6 timber / 3 salvage and paid assembly costs; gathering and recovering retain their original time and body effects.

Time pauses at the ferry and dusk for explicit allocation and departure/ending decisions. Allocating a completed cache is immediate and final. Work may remain pending at a checkpoint, saves preserve it, and no unfinished job grants a cache at dusk. The final result names delivered household kits, camp nights supplied, unmet needs, unused caches and pending jobs. The player chooses their priority; there is no hidden weighted victory score.

The UI makes the initial available actions accessible near the clock, retains explicit Meryem request/response/release, shows approximate condition and job timing, and labels jobs that cannot finish before a checkpoint. The historical opening's garden acceptance is suppressed from the new-afternoon response area; the original state remains unchanged.

## Narrow implementation boundary

The episode wrapper calls the frozen Common Ground host for every world command. It owns only the authored opening, checkpoints, bounded production/allocation receipts and ending. Inner `caches` remains cumulative production; allocations never rewrite stock or the original conservation ledger. Human 0.1.0 and clock 0.1.0 are unchanged. The installed Human/runtime 0.1.1 package is unchanged.

The opening is replayed through the existing build-first controller and public host commands, reaching the milestone at minute 220 with 2 timber, 1 salvage, 2 food, no caches and no active jobs. Its fatigue, hunger and practice remain those earned through the opening. It does not import, imitate or reset the supplied player snapshot. Startup caches a private copy of that deterministic opening; every new afternoon receives a clone.

Save format `human-common-ground-before-rain`, version 1, and device key `human-common-ground-before-rain-v1` are separate from the original game. Import validates the original world plus exact wrapper fields, fixed times, sequential paid cache completions, unique allocation ownership, destination capacities, deadline consistency and ending. These are consistency checks, not authentication of an adversarially rewritten history. Allocation receipts are bounded by four useful allocations; production is bounded by the finite afternoon.

## Bounded comparison

This is an exploratory comparison, not a preregistered player study. Six deterministic runs combine three work approaches with two first-cache destinations from the same synthetic opening. Every work command and exact elapsed minute is replayed against unchanged Common Ground; its world snapshot matches the wrapper's inner world after every command. The comparator uses existing build-first and stock-first policies. The third approach performs paid rest, meal and food gathering first, then uses build-first. No policy or body coefficient was tuned to make a winner.

| Approach | First allocation | Caches at ferry / dusk | Household kits | Camp nights | Food at dusk | Unused caches |
|---|---|---:|---:|---:|---:|---:|
| Build-first | Households | 1 / 3 | 1 / 2 | 4 / 4 | 2 | 0 |
| Build-first | Camp | 1 / 3 | 0 / 2 | 4 / 4 | 2 | 1 |
| Stock-first | Households | 1 / 2 | 1 / 2 | 2 / 4 | 5 | 0 |
| Stock-first | Camp | 1 / 2 | 0 / 2 | 4 / 4 | 5 | 0 |
| Recover and stock food | Households | 0 / 3 | 0 / 2 | 4 / 4 | 4 | 1 |
| Recover and stock food | Camp | 0 / 3 | 0 / 2 | 4 / 4 | 4 | 1 |

Build-first cache completions fall at afternoon minutes 73, 92 and 144. The recovery/food opening completes caches at 93, 127 and 164. Both produce three caches, but the latter misses the ferry and retains more food. Stock-first permits two nondominating allocations: one household plus two camp nights, or no household plus four camp nights.

Keep the less favorable findings. Allocating the first build-first cache to camp leaves a usable cache unassigned at dusk; the early choice can look unnecessary in hindsight. None of these scripts equips both households. The episode does not produce more physical output than the original under matched commands. It adds authored uses and a timing distinction; it has not established that players find them interesting or explain them correctly. Rain, ferry travel and households are represented as stakes and outcomes, not simulated weather or further actors.

**Bounded conclusion:** At least two useful allocation outcomes are reachable, and equal final production can produce different timely deliveries. That justifies a playtest of the surplus-use question. It does not establish preference over the continuing original, a stronger Human model, optimal policies or a general late-game solution.

## Verification and integration

The lane ran 290 tests on Node 26.8.1 with no failures, including ten new headless episode/comparison tests. New tests cover opening reproduction, immutable matched-world behavior, allocation conservation, two useful branches, checkpoint clamping, pending JSON resume, consent/release, paid recovery, dusk outcomes, malformed snapshots and the missed-ferry counterexample. Browser JavaScript and wrapper syntax checks pass. Parent desktop/mobile QA and adversarial review remain release gates, followed by deployment and live identity verification.

Reproduce the private report without overwriting the retained artifact:

```sh
PATH=/opt/homebrew/bin:$PATH node --test tests/commons-next.test.js
PATH=/opt/homebrew/bin:$PATH node scripts/commons-next-comparison.js /tmp/commons-next-repeat.json
PATH=/opt/homebrew/bin:$PATH npm test
```

Parent integration edits:

- Register `'commons-next/index.html':'web/commons-next.html'` in `scripts/public-pages.js`; the existing build automatically copies the new top-level game and web JS/CSS.
- Add a games catalog link to `/commons-next/`, identifying the finite afternoon and keeping the original `/commons/` link.
- Update delivery/version/handoff records consistently with other integrated lanes, without changing Human or clock versions or the original game/save boundary.
- Check initial mobile actions, ferry/dusk allocation and time stopping, response labels, pause/hidden-tab behavior, separate export/import, reload paused and final result. Do not infer physical-device performance from desktop emulation.

No deployment is performed by this lane. Five-person explanation testing, user preference and physical-mobile timing remain open.
