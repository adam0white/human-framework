# The Pass "They came back" retest, 2026-10-20

Protocol 2 retest of pass@9, "They came back" (pass `docs/design.md`). Sessions were source-unread Codex testers on the live site, driven by `npm run lab:play`. Round 1 ran on pass `d8c86e4`. Round 2 ran on `c021f83`, which fixed round 1's oven and future-step defects (display only; live `/release.json` dirty false for both). Every Pass tester started from "Begin at the second week" on the cover. Free arm: floor 0. Floor arm: floor 15 minutes, ceiling 25. Reports are the testers' own words. Local paths were replaced by "(driver scratch)", and screenshots stayed in the driver's scratch folder.

| File | Game, build | Device, arm | Stop | First wish to leave (tester's code / blind code) |
|---|---|---|---|---|
| `leyla-free.md` | The Pass, `d8c86e4` | phone, free | 3:50.2 CONFUSED | 3:41.9 CONFUSED / FRUSTRATED, "guessing at Oven warming" |
| `tobias-free.md` | The Pass, `d8c86e4` | desktop, free | 3:10.2 CONFUSED | 2:57.1 CONFUSED / CONFUSED, "cannot read my remaining move" |
| `leyla-floor.md` | The Pass, `d8c86e4` | phone, floor | 1:37.2 TOOL (a not-yet-due cooking step looked like a live button) | none; invalid run |
| `mert-floor.md` | The Pass, `c021f83` | phone, floor | 15:18.1 BORED, might return for the promised supper | 9:48.7 FRUSTRATED / OTHER, a table left during his lamb |
| `priya-free.md` | The Pass, `c021f83` | desktop, free | 2:12.7 TOOL (the driver twice could not tap an enabled "Work cold side"; not reproduced headless on ten seeds) | none; invalid run |
| `dara-free.md` | The Pass, `c021f83` | desktop, free | 5:30.9 BORED, might return once | 5:16.0 BORED / BORED, "do not want to repeat it for every portion" |
| `adr-free.md` | A Dark Room (control) | desktop, free | 5:11.8 BORED, would return | 4:41.0 BORED / OTHER |

The blind coder read only the seven first-wish reaction strings, shuffled, without game or build. It agreed with the tester on four of seven.

## What this shows, and what it does not

Confirmed from the reports:
- Round 1's two valid stops were the same defect, and it predates pass@9: on week 2 Wednesday nobody is on the oven by default, only a cook at the oven warms it, and the UI said "Oven warming". "Begin at the second week" drops a new player onto that night. Fixed in `c021f83`; in round 2 Dara put Rafi on the oven from the board warning and Mert found the route in service.
- Every valid Pass tester's best moment was the careful-cooking payoff ("You took time with this. I can taste it.").
- Round 2's stops were repetition on the first night: the cook-wait-choose loop for every portion. Mert named the promise as the reason to return.
- A named ticket did not give its table number while the pass calls tables by number (Mert, Dara). Fixed in `b4ad455`.

Not established:
- How a promise feels in play. No tester reached a party's seating with a promise made; promise outcomes are bot-measured only (pass `docs/design.md`, "As built").
- A free-against-floor comparison: one valid floor run.
- Whether the repetition bothers the owner, who asked for more. Taste is the owner's call; the testers' reaction is evidence, not the target.

Ledger rows F-378 to F-388.
