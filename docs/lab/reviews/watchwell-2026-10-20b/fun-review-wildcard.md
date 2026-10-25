Verdict: PASS-WITH-FIXES for the next cold retest. Round 2 removed three of the five round-1 blockers outright and left two half-fixed. Both games are fun in the way I want a hard game to be fun. The remaining blockers are about readability, not difficulty.

Reviewer: Dwarf Fortress / roguelike veteran, phone commuter. Informed reviewer (I read the design docs first), not a cold player. Live build aa68c62, driver lab:play at 360x690 touch, floor 0, ceiling 15. Times are seconds from each driver's `open`. Screenshots: `watch-shots/` and `well-shots/` beside this file. No run uploaded, no consent changed. Watch ran 442 s (7:22); Well ran 421 s (7:01, the game ended at D3 05:00). I did not reach the 8-10 minutes asked, for Well because the game ended, for Watch because I stopped after night 4 (I had seen each act at least once).

## 1. Did round 2 remove the round-1 blockers?

| Round-1 blocker                          | Now                     | Evidence                                                                                                                                                                                                                                                                                             |
| ---------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Watch hid the response below the fold | Mostly fixed            | At 241 s Yunus's account shows the answer, the cost line and the Send down / Send help buttons without scrolling (11-yunus-account.png). At 355-357 s Rest / Send relief are on screen, and the relief sheet lists each helper with "likely, maybe; leaves Tamar at the Gate" (18-relief-sheet.png). |
| 2. "Tiring" impression gave no relief    | Fixed in the case I hit | Yunus 355 s: "Keeper's read: seemed tiring at the last look." with Rest and Send relief offered. Tamar 429 s the same.                                                                                                                                                                               |
| 3. False "post empty" warning            | Fixed                   | "leaves Tamar at the Gate", "leaves the east wall empty" (the east wall really was empty).                                                                                                                                                                                                           |
| 4. Well steered me into a known refusal  | Fixed                   | Suggestion at 277 s says "Samira · Will refuse: busy with own work" and leads with "Insist · may cost trust". The Maryam card at 85 s did the same.                                                                                                                                                  |
| 5. Well clipped tags / crowded scene     | Half fixed              | Tags are readable. The scene is not: with a hurt notice plus a suggestion or order sheet open, the map shrinks to an 80 px strip (06-review.png, 11-insist2.png, 19.png). I could not see who stood where while deciding.                                                                            |

Are the Watch night acts findable cold, in one tap, and readable? Partly.
- The route works: tap the person on the wall, then the act. It is one tap per act after the account opens. Send relief opens one sheet, Send Kian is one more tap, and the strip then says "Kian has the mill wall; Yunus has been asked to go down." (19-after-relief.png, 360 s). That is good.
- Cold discoverability is still weak. Nothing on the wall screen says people can be tapped for these asks. "Watchers and bell" is collapsed (08-watchers.png). While a watcher decision is open (the common case at night), that collapse is not on screen at all. I found the acts only because I read the docs and tapped the scene. This is F-347 and it is not fixed.
- The acts are inconsistent from the same screen. At 352 s the toast said "Joss nods off at the mill wall" and "Yunus nods off at the mill wall". Joss's account said "I'm keeping watch. Nothing close that I can make out." with no act and no reason. Yunus's account, three seconds later, offered Rest and Send relief. Same toast, two outcomes, no explanation (17-joss-asleep.png).
- After a successful relief, the sent-home Yunus still shows Rest / Send relief with "no longer available" text, and the "Too far away" line overlaps clipped text (19-after-relief.png).
- One tap works, but the clock does not wait. At Fast (12 min per s) I opened the relief sheet at 357 s and the night went from "small hours" to "Before dawn" while I read it. Slowdown applies to watcher decisions only, not to the player's own act sheet.

## 2. Is it fun?

Watch: yes, and it is the better of the two. Decisions have real costs. Evidence:
- 149 s: Joss hears something near his two children. Options "Let him go; send Tamar to the post / might (someone else stands there now)". I sent Tamar. By 176 s "Grain is gone: something got over the east wall" and Joss ran home. That is a trade I made and I felt the loss.
- 244-260 s: I asked Yunus down. He answered "I can see more from the mill wall", and a wolf then bit Joss. A refusal with a cost.
- 360 s: Kian relieves Yunus ("I'll take the mill wall"). I wanted this since the first night. It is the right kind of decision.
- Dawn lines are people, not stats: "I'll own it: I dozed at the mill wall, more than once." "I went to my two children. I'd go again." (372 s).
- Show-don't-count held. I saw no numbers on bodies, only words, rings and sleepers. Slowdown-not-pause held: the clock dropped to "Slow · watcher decision · 1 min / 60 s" and kept running (countdown 114 s to 96 s while I read).
- Dawn stops the clock. Fine, it is a phase boundary.

Well: also fun, but it plays more like arguing with colleagues, and it punishes in a way that is hard to read.
- People feel like people more than merely stubborn. Maryam, 108 s: "And leave the pot cold at noon? No. They eat from my hands." Idris to Home: "Later, when I've healed." Samira under Insist: "on it, under protest", "Build ...fine." Tariq next morning: "He remembers last night in the squall." Suggestion text is honest about age: "This is an old suggestion; the person may answer differently now." These are the best lines in either game.
- It becomes mere stubbornness in two places. (a) Maryam 'We've food enough put by. I'll cook when it runs low' while the goal says 12 meals stored and I had 6 to 8. Her reason is sound, mine is too, and nothing tells me which of us is wrong. (b) Insist on Maryam at 91 s cost me a "won't" anyway; the sheet said "Insist was used. Asking again may cost trust" but I could not see whether I lost trust. Paying a cost and not seeing it is the worst kind of hidden number.
- Result, 420 s: roof 9/10 failed (Classic 10/10), storm stock 12 vs solo 16, injuries 7 vs solo 5. "Same orders. Same seed. Your 14 orders changed..." This is the best thing in the game: honest, harsh and a little controversial. I lost to doing nothing (solo) on three measures. That is the hard-game charm. Keep it.
- Show-don't-count: partial. Roof 9 of 10 and Meals 6 / 12 are counts the header insists on. That is fiction (goal numbers), acceptable. Injuries do not show a number during play (good).
- Slowdown-not-pause: held and slightly too sticky. "Slow · 1 min/s · suggestion pending" stays on until the suggestion is answered, so the clock crawls while I do anything else. At 166-197 s I lost 30 real seconds waiting at 1 min/s on a suggestion I had not opened. The card is collapsed behind a plain "Suggestion" button.

Where I first wanted to stop:
- Watch: never. I stopped on the time budget.
- Well: 301 s, after Rush: I tapped "Rush · faster, hungrier" then Confirm and nothing happened (Confirm stayed disabled, no message), while the clock sat at 1 min/s. That was a dead control with no reason. Second place: the first accidental order at 122 s.

Where it was unreadable, not hard:
- 122 s: I tapped Idris to select him; at 2x he had walked off and the tap landed on a place with Maryam selected, which sent Maryam to Forest ("later, after I pray Asr") with no confirm. Fast clock plus tap-to-order equals accidents on a phone. It is the F-353 family, but caused by motion, not by overlap.
- 61 s: "Send Idris home" for a hurt "Idris (Classic)", the village not shown. A notice for the other village with a send button for my person (F-355 family, one more variant).
- 204 s: suggestion said "Tariq is awake", preview said "Can't: asleep". Contradiction in the same sheet.
- 395 s: the header still said "Storm Day 2 19:00" on D3 02:00, a stale countdown; at 395 s it flipped to "Roof by Day 2 19:00" with no explanation of what that now means.
- I missed the storm. At 2x the squall passed with no slowdown; Samira (20:40) and Tariq (21:50) were hurt "out in the open". My Home order for Idris had worn off (F-354). I got no alert that the clock should slow for the storm start.

## 3. Ranked blockers before the next cold retest (five)

1. Watch: say on the wall screen that watchers can be tapped, and keep the entry visible while a decision is open. Small fix: one line under the lantern ("Tap a watcher on the wall to ask them to rest, help or go down") and a persistent "Watchers" chip that is not hidden behind a decision. Covered partly by F-347 and F-350. The chip-during-decision part is not covered.
2. Watch: same toast, different account. When a person "nods off" the account must say tired or asleep and offer Rest/relief, or say why not. Small fix: if the toast said it, the account gets the same word and the same acts; if an act is unavailable, show one grey line with the reason. Joss at 352 s. Partly F-347; the toast-versus-account mismatch is not covered.
3. Well: the scene must stay visible while ordering. Small fix: when a hurt notice and a sheet are both open, collapse the notice to one line, and never let the map go below roughly 40% of the viewport. Not covered by the listed items.
4. Well: taps commit orders from a moving scene. Small fix: freeze target hit areas for the 300 ms before pointerdown, or ask one confirm at 2x. A second small fix: never send an order to the other village's person from a notice that says "(Classic), not shown". Related to F-353 and F-355, not the same; the moving-target and the Classic notice are not covered.
5. Well: show the cost I paid. Small fix: after Insist, Rush or a forced night order, write one line in the person's sheet, "Maryam trusts you less" or "Tariq remembers", and make dead controls say why (Rush plus Confirm with no place). Overlaps F-352 and F-354 only for "what an order achieved". The trust-paid line and the dead Rush/Confirm are not covered.

F-356 (Rush findable): Rush is now reachable at Village actions, Order options, and I found it at 294 s with the appeals ("for the children", "your duty", "you'll be safer"). I count F-356 as covered, but the label should appear once a person is selected, not only after More.

## Nice to have (not blockers)

- Stack Watch toasts at most two high, and move them off the wall; three at once hide the whole wall (04-decision.png, 07-joss-home.png).
- Watch "Everyone is on the wall" at 193 s while Joss was on his way home.
- Say where to carry the light when a watcher is "Too far away" (15-yunus-asleep.png).
- A one-line "why they refuse" on Maryam's pot at the time of the 12 meals goal, so a hard refusal reads as a judgment call.
- Offer a "Hold" button that actually pauses, as the owner's opt-in easier setting, not as default.

## Difficulty

Do not flatten it. Both games take away more than they give. Watch's relief act is good because Kian can say no and Yunus can be right. Well's final comparison ("you made it worse than doing nothing") is the controversy the owner asked for. Fix the three readability problems (blockers 1, 3, 4) and leave the cost alone.

## Cleanup

Watch driver PID 44284 and Well driver PID 56204 killed by exact PID. Nothing in the repository was edited.
