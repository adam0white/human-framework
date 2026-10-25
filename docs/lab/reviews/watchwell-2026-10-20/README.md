# Night Watch and Well retest, 2026-10-20

Protocol 2 retest of the night relief and help acts (Night Watch, scenario 11, HF `0a1c9e1`, `43ba4c8`) and of orders that stay set on the phone (Twice at the Well, `colony-scenario@5`, `76d50d5`, `eee2660`, `eff7743`, `269c50f`). Sessions were source-unread Codex testers on the live site at `05f124b` (`/release.json` dirty false), driven by `npm run lab:play` at `64ffc8c`. Each tester used a 360×690 phone with touch emulation, except the A Dark Room control, which ran on desktop. Each game used one persona in both arms. Free arm: floor 0. Floor arm: floor 15 minutes, ceiling 25. Reports are the testers' own words. Local paths were replaced by "(driver scratch)", and screenshots stayed in the driver's scratch folder. `fun-review.md` is the Codex adversarial fun review of the round-1 build. It held the retest, and round 2 addressed its five blockers. Round 2 itself was not re-reviewed.

| File              | Game                  | Arm   | Stop                                    | First wish to leave                                              |
| ----------------- | --------------------- | ----- | --------------------------------------- | ---------------------------------------------------------------- |
| `watch-free1.md`  | The Night Watch       | free  | 2:37.7 TOOL ("Ring the bell")           | none; never found the night acts                                 |
| `watch-free2.md`  | The Night Watch       | free  | 7:04.3 TOOL ("Rest")                    | none; relieved Kian with Yunus                                   |
| `watch-floor1.md` | The Night Watch       | floor | 11:17.3 TOOL ("Rest")                   | none; used Send help, Send down, Rest                            |
| `watch-floor2.md` | The Night Watch       | floor | 14:06.3 TOOL ("Tamar")                  | 12:22.1 BORED, would come back at dawn; relieved Tamar with Mara |
| `well-free1.md`   | Twice at the Well     | free  | 6:26.7 CONFUSED                         | 6:14.2 CONFUSED (what "done" and Home bought)                    |
| `well-free2.md`   | Twice at the Well     | free  | 7:26.3 CONFUSED                         | 7:17.9 CONFUSED (Home order wore off?)                           |
| `well-floor1.md`  | Twice at the Well     | floor | 6:36.0 TOOL ("Insist · may cost trust") | none                                                             |
| `well-floor2.md`  | Twice at the Well     | floor | 15:13.5 FRUSTRATED (cannot find Rush)   | 10:01 CONFUSED, passed; 13:48.5 FRUSTRATED                       |
| `adr-free1.md`    | A Dark Room (control) | free  | 8:35.6 BORED, would return              | 7:19.3 BORED                                                     |
| `adr-free2.md`    | A Dark Room (control) | free  | 6:51.1 BORED, would return              | 6:39.2 BORED                                                     |

## What this shows, and what it does not

Confirmed from the reports:
- Three Watch testers used the new acts and said these acts were the work they came for (watch-free2, watch-floor1, watch-floor2). Those three did not ask for a way to relieve a tired watcher, which was the reason every calibration Watch session gave for leaving (F-309). watch-free1, who never found the acts, asked for a way to move or wake a watcher (F-347). No tester said the acts made the night easy.
- The acts are hard to discover. watch-free1 never found them. watch-floor2 found them late.
- Well testers could read each order's state when they gave the order. They could not tell what a "done" order or a Home order had achieved once the person was hurt outdoors again. Two quick taps went to the wrong person or place. Rush could not be found on the phone.

Not established:
- Voluntary stopping times. Five of ten sessions ended on a driver TOOL stop. Each one had the same pattern: a control listed as enabled was refused twice, and the game state changed (dawn, or a new decision) right after. The cause is unknown and was not reproduced. It may be a stale control list at a phase change, or a control covered at that moment.
- The free-against-floor comparison. Too few voluntary stops in either arm.
- Blind coding of the earliest wish to leave, by a reader who does not know the arm. It is owed (target 2026-11-03).

Ledger rows F-347 to F-358.
