# The Two Voices second week retest, 2026-10-20

Protocol 2 retest of murmur 0.4.0, the second week ("getting better causes trouble"; murmur `docs/design.md`, "The second week"). Sessions were source-unread Codex testers on the live site, driven by `npm run lab:play` at `aa68c62`. Round 1 ran on murmur `a04b847`; round 2 ran on `5c1c471`, which fixed the round-1 defects (live `/release.json` dirty false for both). Each Two Voices tester used a 360×690 phone with touch emulation and started from "Begin at the second week" on the cover; the A Dark Room control ran on desktop. One persona (Mina) appeared in both arms with identical text; Deniz is a second persona, free arm only. Free arm: floor 0. Floor arm: floor 15 minutes, ceiling 25. Reports are the testers' own words. Local paths were replaced by "(driver scratch)", and screenshots stayed in the driver's scratch folder.

| File             | Game, build           | Arm   | Stop                                                                                                                                                         | First wish to leave (blind-coded)                           |
| ---------------- | --------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `mina-free.md`   | Two Voices, `a04b847` | free  | 4:32.7 BORED                                                                                                                                                 | 4:09.4 BORED, "another bedtime with the same three answers" |
| `mina-floor.md`  | Two Voices, `a04b847` | floor | 1:09.8 TOOL (a 4 s choice expired during a 30 s wait; the stale driver copy repeated cached controls, so it stayed listed; fixed in human-framework 922daed) | none; invalid run                                           |
| `mina-floor2.md` | Two Voices, `5c1c471` | floor | 15:23.0 BORED, would return for the weekend                                                                                                                  | 10:54.9 BORED, the fourth bus call-or-scroll choice         |
| `deniz-free.md`  | Two Voices, `5c1c471` | free  | 3:03.0 TASTE, would return                                                                                                                                   | 3:02.8 satisfied, "a good place to put the phone away"      |
| `adr-free.md`    | A Dark Room (control) | free  | 6:47.2 BORED, would return                                                                                                                                   | 6:33.4 BORED                                                |

The blind coder read only the reaction strings, without the arm or the game build, and agreed with each tester's own first want_quit, except Deniz, whom it coded SATISFIED rather than TASTE.

## What this shows, and what it does not

Confirmed from the reports:
- All three valid Two Voices testers named the same best moment: Dilan giving Ece the advice the player gave her ("Feet on the floor. Drive it round yourself."). That is the new slice's core mechanic.
- The worst moments were the routine cards (alarm, bus call, bedtime) that repeat each day with the same answers. Two of three first wishes to leave came at one of them.
- Round 1 defects were real and fixed in `5c1c471`: the cover shortcut showed week one's Saturday page with "You suggested" lines the player never said, and week-two labels said "her" in Dilan's first-person sentences. Round 2's Deniz passed DL-6 (choice at 3 s).
- "say nothing" and lower answers fall below 690 px on cards with three answers (Mina, Deniz).

Not established:
- A free-against-floor comparison: one valid run per arm.
- Whether the routine repetition would bother the owner. He asked for "more of the same", and these routines are week one's design. Taste is the owner's call; the testers' reaction is evidence, not the target.

Ledger rows F-367 to F-377.
