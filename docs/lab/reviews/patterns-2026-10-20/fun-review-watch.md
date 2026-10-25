Verdict: keep the readable posting screen, but do not count this layout change as a cure for the reasons Sofia stopped; the waits and unclear consequences remain.

# The Night Watch — adversarial fun review

## Evidence and limits

20 October 2026. I read the brief, design change 2026-10-20b, F-250, Sofia's full report, the phone audit, DL-30..33 and the implementation. This is a source-informed design review, not a cold playtest. I played one uninterrupted live Chromium page through Playwright at 360×690 CSS px with touch emulation, starting at 14:49:06 UTC. The last gameplay action was a dawn conversation at 14:59:16 UTC: **10 minutes 10 seconds**, through three nights to the third dawn. I then opened Game menu and downloaded the run locally. I kept Watch speed through the first night, then chose Days and Seasons through ordinary controls. No clock injection, debug inputs, save injection or notebook submission.

The local export is `live-run.json` (seed 20261004, scenario 10, 23 logged inputs, end minute 4680); it was downloaded through Game menu. It was not submitted or replay-tested.

The release manifest at the start identified clean `bf9d1765aafaf9db10f7467eee5a70cc154f4678`, HF 2.9.0. Other games merged during the session; the final manifest identified `7d239386e297f270d9e33750e5bbc721936cf739`. I did not reload. `git diff bf9d176 HEAD -- apps/site/src/watch apps/site/test/watch` was empty at the later source check.

Scratch evidence: `(driver scratch)/fun-watch/`. `actions.jsonl` records wall-clock commands and rendered text; `diary.md` records my reactions; numbered PNGs are viewport captures. This review is the only requested repository write. No implementation changes.

## 1. Did it remove the players' quit reason?

**One obstacle removed; the duration objection remains.** F-250 is a keep verdict, not a rage-quit: Sofia said, “I would return voluntarily for a short session to hear Mara or Joss. I would not choose a whole-winter session during this quiet shift.” Her full report says, “The character conversations kept me interested more than moving the light did.” She first named boredom at 3:27. Her worst moment was the unclear result after Let Joss go. These are distinct from her second-ranked request: “Let me see the watcher pressure choices and their essential reasons without scrolling under the fixed start button on this phone.”

That second request is substantially fixed. In [Tamar / Ask]((driver scratch)/fun-watch/02-tamar-ask.png) and [Tamar / Urge]((driver scratch)/fun-watch/03-tamar-urge.png), Tamar's role, post, impressions, pressure reading and all post buttons are visible together. The pressure reading occupies y498–519 and the post row y582–676. Begin no longer covers them. This matches the audit's actual obstruction (`scratch/patterns/audit-report.md`, Night Watch section).

I reproduced the unresolved first request. At 14:55:05 I chose Let Joss go. The card vanished; “Joss nods off at the mill wall” remained; Watchers and bell said “Everyone is on the wall” ([choice]((driver scratch)/fun-watch/22-joss-choice.png), [afterward]((driver scratch)/fun-watch/24-joss-state.png)). Dawn credited Joss with defending the mill. The code clears his posting without forcing his immediate physical departure (`sim/moments.ts:362–389`). A causal acknowledgment could explain that distinction; the current view does not. The layout increment explicitly leaves this and message history out of scope (`docs/games/watch.md:749`).

## 2. Is it fun for five minutes and a whole run?

**For one short visit: mildly engaging, with a good human payoff. Based on this opening, I would not commit to a whole volume.** There is no new core activity. You still decide where to put people, how hard to press them, where to carry the light, whether to wear the bell rope, and whose sleep to spend on conversation.

The best decisions concern people. Moving Kian east left Tamar alone at the warned Gate; a wolf crossed there. Visiting Kian with the light cost visibility elsewhere. At the third dawn Kian said he stayed because Tamar stayed, and Tamar said she stayed because Kian stayed. That mutual influence is the strongest later payoff. At the first dawn Kian said, “I went home to sleep. I’d have fallen off the east wall otherwise.” Mara, asked whether she would keep the Gate, answered, “Me? I’d try. Someone has to.” Those words made me want another visit. Ringing on the third night's wolf warning answered “Holding!”, disabled the button as Bell swinging, and changed the rope to fraying (`28-wolves-bell-before.png`, `29-bell-response.png`). Keep that immediate act and cost.

The empty time is weaker. From 14:51:57 to 14:52:53 I got no new message or moment in sampled observations. I moved the light once to check Kian, but already wanted faster time to reach the conversations. The first moment arrived near the end of that opening night. Kian was already going home and the alternative said “won't (I'm asleep.)”; letting him go largely chose itself. First dawn was reached by 14:54:04, almost five minutes after the title. Two brief talks were the strongest reward for that visit. Days made subsequent quiet time tolerable but also made messages disappear quickly.

I did not play an entire volume live. The whole-volume judgment is based on this repeated loop and the headless evidence below, not an invented complete playthrough. The long-term inheritance premise remains attractive; this layout does not make the repeated nights more interesting.

## 3. Quit points and strategies

- **Reproduced layout miss: the three-option Joss card still hides a response.** In [the Joss card]((driver scratch)/fun-watch/22-joss-choice.png), the “...or say nothing” control is partly below the sheet's visible body, immediately above the fixed lantern row. The two-option Kian card fit. A short card passing does not prove all timed choices fit. The decline-to-intervene response should be as readable as the interventions. `MomentCard` puts it after the option grid (`ui/App.tsx:636–651`), while the sheet has a maximum height (`ui/watch.css:1649–1653`).
- **Existing wait exposed by explicit nonintervention:** choosing “say nothing” hides the card locally while retaining the pending simulation moment (`ui/App.tsx:745–756`). I chose silence by 14:56:54; it was still at “Slow · watcher decision · 1 min / 60 s” at 14:57:16 despite Seasons being selected, and dawn was reached by the next sample at 14:58:42 (`32-silence-start.png`, `33-silence-fastest.png`, `34-silence-still-slow.png`; the latter already shows dawn). Thus the observed lingering slowdown lasted at least 22 seconds; its exact live duration was not sampled. By 14:56:54, after choosing silence, I had already written that I wanted to move on; the 22-second lower bound therefore exceeds DL-32’s 20-second default for unwanted waiting, although lantern and bell inputs remained available. A separate run of the repository’s text harness on seed 5 measured **120 simulated real seconds** from explicit silence at a fresh moment until that moment cleared, even after selecting Seasons (`silence.json`). This is not a newly introduced rule, but it is a strong remaining quit point. The player has said what they want; the interface still acts as if an answer is pending.
- **No new dominant winning move established.** The tempting attention policy is to light the warned lane and accelerate to human exchanges. That is a low-effort way to play, not proof of optimality. My first night was crossed. Bell spam still costs rope and false-alarm credibility; I found no reason to remove those limits.

## 4. What did it cost?

Autonomy and the people's words survive. I watched Kian leave despite a posting and heard distinct dawn replies. This commit changes UI and camera presentation, not simulation rules. No evidence of changed mechanical difficulty or removed ending was found.

It does cost situational context. Opening a timed card removes Watchers and bell entirely, including off-wall people and the granary (`ui/watch.css:1793–1795`; `ui/App.tsx:679–700`). At Joss's decision I wanted to check the rest of the watch before releasing him and could not use that inspector. The scene becomes shallow, and ticker messages sit across its labels (`22-joss-choice.png`). A fitting response card does not guarantee a readable decision state.

The ending remains reachable headlessly: the repository's own `playYears` policy on seed 2026 reached volume I's closure in year 3: “Tamar’s leg will not take the stair; Mara keeps the Gate.” Its epilogue retained individual voices (`volume.json`). I did not render or accept the ending on the live phone.

## DL-30..33 judgment

| Item  | Result in this session                                                                | Evidence                                                                                                                                                                                                                       |
| ----- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DL-30 | Posting passes; timed-card coverage fails                                             | Selected Tamar fits; the three-option Joss card partly hides say nothing.                                                                                                                                                      |
| DL-31 | Posting improves; night decision context remains insufficient                         | Role and warning persist while posting. During Joss's card the wider watch/granary inspector disappears. Night and answer deadline remain visible.                                                                             |
| DL-32 | Legal availability passes the narrow measure; meaningful frequency is not established | Quiet stretches made me want to accelerate; moving the same light without new information is not a fresh meaningful act. The speed control is a valid chosen way to wait, but explicit silence still holds a pending slowdown. |
| DL-33 | Pass for the acts reached                                                             | Lantern and bell act directly. Moment answers take one tap. The posting sheet offers fine control without making every act a form.                                                                                             |

**Was layout really the weakest phone feature? No.** It was the most concrete preparation defect. Sofia ranked consequence acknowledgment above it and described boredom independently. My play reproduced both the consequence problem and weak stretches after the layout repair. Enlarging the human encounters and making nonintervention readable matter more than adding more buttons.

## Headless check

I ran the repository's `apps/site/test/watch/years.ts` self-play policy through three complete years on seeds 5, 77 and 2026. All reached fourth-winter dusk; logged input counts were 371, 388 and 328. The policy concentrates on the warned approach, lets night moments decide themselves, buys fair offers conservatively, and blesses proposals. It establishes continued simulation and reachable consequences, not human enjoyment or a globally dominant strategy (`self-play.json`).

I also reran the increment's nine-case measure against the current source: seeds 5/77/2026 × passive/patrol/responsive, 300 simulated real seconds each at default Pacer speed. Each reports 300 seconds of lantern availability, 296.25–300 seconds of bell availability and a zero-second gap with both unavailable. Exact replay and midpoint-save continuation passed in all nine (`measure.json`, `measure.log`). This metric counts legal inputs. It does not test visible controls, whether movement yields useful information, or whether a player wants to act. Its zero is not a fun score. Two independent code/standards reviewers checked these conclusions; one also inspected the Joss screenshot and confirmed the clipped response. Their code-only work is separate from my live play.

## Up to three changes, ranked

1. **Acknowledge Let [name] go accurately.** Say that the Keeper released the posting and the watcher still decides whether/when to leave; then show the actual departure when it occurs. Do not force an obedient exit. This targets Sofia's first request and my reproduced ambiguity.
2. **Fit the longest ordinary moment, including say nothing, while retaining a compact watch-state read.** Test Joss's three-option card at 360×690, not only the shorter Kian card. This closes the remaining DL-30 hole and the context loss introduced by the layout's prioritization.
3. **Make explicit say nothing finish the player's involvement.** Hand the decision back without an unexplained two-minute pending-answer slowdown. Keep the person autonomous. Retest the quiet stretch and resumed speed in one round. This addresses a concrete remaining quit point rather than inventing filler work.
