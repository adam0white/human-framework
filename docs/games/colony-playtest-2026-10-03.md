# Game 1 playtest — 2026-10-03 (user, first three runs)

The user played the live build (5466c8c) three times on desktop. Verdict: "I like this simulation. It leaves one desiring more." They liked the hidden depth behind a simple surface, and the refusals taught them the Human side: a suggested Cedar order injured Idris, Maryam then refused to leave cooking, and the player Rushed and Insisted into a suggestion. Main problem: the sim is too easy and the goals are never stated.

## Scorecards

| Run | Player intent | Meals C/H/Solo | House C/H/Solo | Injuries C/H/Solo | Prayers H/Solo | Morale H/Solo | Trust H/Solo |
|---|---|---|---|---|---|---|---|
| 1 | followed nudges, rushed orders | 1 / 12 / 20 | 100 / 100 / 100 | 3 / 9 / 8 | 96 / 100 | 0.50 / 0.39 | 53 / 54 |
| 2 | sent Danyal to pray; tried to starve Classic by sending Maryam to the forest | 0 / 17 / 20 | 100 / 100 / 100 | 8 / 10 / 8 | 98 / 100 | 0.37 / 0.39 | 54 / 54 |
| 3 | sent everyone to the forest constantly | 3 / 12 / 20 | 0 / 100 / 100 | 17 / 5 / 8 | 100 / 100 | 0.37 / 0.39 | 54 / 54 |

All six survived on every side in every run. Moments seen in run 1: 3, 1, 4, 2 (moment 5 did not fire).

## Findings → v2 changes

Onboarding and pacing
1. Starts running before the player understands anything. **Start paused** behind a one-screen goal card; the first Play click starts the clock.
2. Default speed too fast; keep up to 2×. **Default to half today's rate** (1× = 8 sim-min/s); ½×, 1×, 2× remain.
3. **Auto-pause** on director suggestions, refusals/deferrals and moments; one toggle, on by default.
4. A full tutorial isn't needed ("It's pretty simple anyway"), but **the goals are**. State them on the goal card and in a persistent goal strip with live progress.
5. No sense of time left. **Day/storm markers on the progress bar**, and "Day 1 of 2 · storm in 13 h" in the header.

Orders
6. Nudges are good but don't say why. **Each suggestion explains its reason** in one line.
7. **One order composer** for both cases: pick villager → place → optional Rush/Insist → Confirm. A director suggestion prefills the composer with its reason, so only Confirm remains. Rush/Insist work on suggestions.
8. **Dismiss becomes an expiring timer** (visible countdown) when not acting is the default.
9. **Space always toggles pause.** Today Space sometimes re-clicks the last focused button.

Layout
10. **One page, no page scroll** on desktop: the order log scrolls in its own box.
11. The person inspector slides in from the left. **Make it an anchored popover/modal** that clearly separates the Classic summary from Human detail.
12. "Site" vs "House" naming is inconsistent. **Use one name.**
13. Check mobile (not yet tested by the user).

Goals and difficulty
14. **Too easy: too many hands for too little work.** Even with every villager sent to the forest all game, Human and Solo still finish the house. The scorecards' meal counts show food is never under pressure. Rebalance so that:
    - Solo (no orders) narrowly fails at least one goal on the shipped seed; good orders can win all goals; careless or hostile orders lose something visible.
    - Classic (no orders) is still an honest competent AI and does not simply win.
    - Meals actually get eaten from the store, and the storm night needs a stock.
15. **Finishing the house must matter.** Today it does nothing visible. Proposed: the finished house is where Idris+Samira (or a family) shelter for the storm; an unfinished house means a family in the crowded masjid (morale/sleep cost), and roof stages exposed to the storm decay (already implemented; keep).
16. The Classic columns show "—" for prayers/morale/trust. Label it: **"Classic has no such concept"**, which is the point of the comparison.
17. **Keep playing.** After the end, offer "Another day": the sim continues with a new building job (e.g. a second house or a well cover) and the same people, memories and debts. The end-of-run report remains available.

## Answers given to the user's questions

- Why the nudges? They are director suggestions on a clock (`NUDGES` in `sim/game.ts`), placed to set up the five moments; v2 adds the reason.
- How many days? Two: Day 1 05:00 → Day 3 05:00, storm Day 2 19:00 → Day 3 03:00.
- Why doesn't Classic do prayers, morale or trust? By design: it is the "before" side, a generic colony AI with hunger and hp only.
- Half-done tasks? Building is staged and persists (and a storm can undo stages, which the user saw). Other jobs complete per activity.
- Realistic timings? No, they're compressed (a 10-stage house in ~10 work-hours). v2 rebalances for pressure, not realism.
