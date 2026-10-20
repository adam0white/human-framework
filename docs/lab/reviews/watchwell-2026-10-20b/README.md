# Night Watch and Well round 3 retest, 2026-10-20

Protocol 2 retest of the round-3 builds on the live site at `1efbe30` (`/release.json` dirty false): The Night Watch scenario 12 (night requests explained, every answer on screen, opt-in Milder winter, round 3b readability) and Twice at the Well `colony-scenario@6` (order receipts, person over place, notice binding, Rush, opt-in Early warning, round 3b readability). Fresh source-unread Codex testers, driven by `npm run lab:play` after the F-358 fixes (`4127a10`, `711fd15`; the two A Dark Room sessions were rerun on `f6f8a5a` after a driver stop described below). Phone sessions at 360×690 with touch emulation; A Dark Room on desktop. Same personas as the [round-2 retest](../watchwell-2026-10-20/README.md): Sam (Watch), Bram (Well), Sam the idle-game player (A Dark Room). Free arm: floor 0. Floor arm: floor 15 minutes, ceiling 25. Local paths are replaced by "(driver scratch)".

Also here: the two fun reviews of the round-2 build (`aa68c62`) that ran before this retest, [Codex](fun-review-codex.md) (HOLD) and a [wildcard roguelike veteran](fun-review-wildcard.md) (Sonnet, PASS-WITH-FIXES). Both said to keep the difficulty. Their readability blockers became round 3b (`711fd15`, `32604bd`, `1efbe30`).

| File | Game | Arm | Earliest wish to leave (blind) | Stop | Would return |
|---|---|---|---|---|---|
| `watch-free1.md` | Night Watch | free | 6:32.8 CONFUSED | 6:59.6 CONFUSED | no, not tonight |
| `watch-free2.md` | Night Watch | free | 6:08.9 BORED | 6:18.5 BORED | unclear |
| `watch-floor1.md` | Night Watch | floor | 12:58 CONFUSED | 15:11.9 CONFUSED | yes, another evening |
| `watch-floor2.md` | Night Watch | floor | 6:53.2 FRUSTRATED, passed | 15:08.5 FRUSTRATED | yes, once, on Slow |
| `well-free1.md` | Well | free | 4:13.3 FRUSTRATED | 4:17.0 FRUSTRATED | not on this phone |
| `well-free2.md` | Well | free | 6:08.4 CONFUSED | 6:15.0 CONFUSED | no, not tonight |
| `well-floor1.md` | Well | floor | 11:09.0 FRUSTRATED | 15:09 FINISHED | maybe |
| `well-floor2.md` | Well | floor | 9:58.8 FRUSTRATED, passed | 15:14.1 FRUSTRATED | yes, probably on desktop |
| `adr-free1.md` | A Dark Room (control) | free | 7:25.8 BORED | 7:55.1 BORED | yes |
| `adr-floor1.md` | A Dark Room (control) | floor | 10:56.7 BORED | 15:09 BORED | yes |

## What this shows, and what it does not

Confirmed:
- **The driver no longer decides the result.** No session ended on a driver stop (round 2: five of ten). Games: 0 of 8. A Dark Room's first two sessions ended on TOOL, from a separate driver gap (a text button whose hover tooltip changes its text), fixed in `f6f8a5a` and rerun; those two runs are not counted. In this retest, a disabled control or one that left the page was answered as game state, and testers carried on.
- **Watch quit reasons moved.** No tester asked for a way to relieve or help a watcher, and no one failed to find the night requests. The new reasons: what a cover or call-back order actually did (watch-free1, watch-floor1), waiting while a fight resolves instead of running it (watch-free2), and a helper option that left while the tester read the relief sheet. The sheet does not slow the clock the way a watcher's decision does (watch-floor2, and the wildcard review).
- **Well quit reasons moved.** "What did done buy" is not repeated. The new reasons: Home means eat or sleep once, and there is no way to keep a hurt person sheltered (well-floor1, well-floor2); suggestions slow the clock and the sheets hide warnings (well-free1); a House order does not say whether it shutters or builds (well-free2); the round-3b sheets are short, and their answers sit above the visible part (well-floor2).
- **The easier settings were not chosen.** All four Watch testers saw "Hard winter" and none changed it. No tester asked for an easier game. Every complaint was about readability or control, not difficulty. So this retest says nothing about whether Milder winter or Early warning feel easier. That is for the owner.

Free stop against floor (blind coding of the earliest wish to leave, by a reader who did not see the arm; [blind-coding.md](blind-coding.md), codes listed below):
- Free arm, earliest wish: Watch 6:09 and 6:33; Well 4:13 and 6:08; A Dark Room 7:26 (round 2: 7:12 and 6:14).
- Floor arm, earliest wish: Watch 6:53 (it passed) and 12:58; Well 9:59 and 11:09; A Dark Room 10:57.
- In this sample, the games' free-arm wishes came before the control's. The A Dark Room testers would return; the Watch and Well free-arm testers mostly would not, tonight. The floor delays the logged wish in all three games, so floor-arm times are not voluntary stopping times. With two sessions per cell this is a direction, not a finding.

Blind codes: R01 r2 well-free2, R02 well-floor2, R03 r2 watch-floor2, R04 adr-free1, R05 r2 well-free1, R06 well-free2, R07 r2 watch-free1, R08 r2 watch-free2, R09 r2 adr-free1, R10 r2 watch-floor1, R11 well-floor1, R12 r2 well-floor2, R13 watch-floor1, R14 watch-floor2, R15 well-free1, R16 r2 adr-free2, R17 watch-free2, R18 r2 well-floor1, R19 adr-floor1, R20 watch-free1 ("r2" marks the round-2 retest; unmarked rows are this retest). The blind coding of the round-2 retest, owed at F-358, is in the same table.

Ledger rows F-359 to F-366.
