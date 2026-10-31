# Good Hands retest 1 source packet (future docs/lab/reviews/light-2026-10-30/goodhands-retest1/)

## Remaining (read first)
- Parent sealed this source packet after independent verification. Canonical import, game fixes and acceptance remain pending.
- Parent accepted these ledger target dates: 2026-11-03 for F-2521 (Jonas), F-2522 (Aisha), F-2524 (Rosa), F-2525 (Nadia) and asks 2527, 2528, 2529, 2530, 2535, 2538, 2539, 2540; 2026-11-10 for F-2523 (Diego) and asks 2526, 2531, 2532, 2533, 2534, 2536, 2537.
- Aisha’s later return references the opening answer and adds the unsent-letter condition. The complete later line and opening are quoted separately, without reconstructing an expanded sentence (see exact-quote-extraction.json).
- No tester image was opened by the preparer. Screenshot hashes only.
- Run `python3 -I validate-quotes.py` from this directory. The check count is in primary-quote-validation.json.

## Frame
- First fixed-build retest. It is NOT a second iteration and NOT finished.
- Build 2e67317e6a0aa187bf41de5d9bac5369916700f2, Framework 4.8.1, app 0.1.0. Round light-1031-goodhands-retest1.
- Closed 2026-10-31T08:14:43.043376Z. Next panel not before 08:29:43.043376Z. The HOLD is released. GD owns the bounded second correction.
- Panel: Jonas, Aisha, Diego and Rosa (same standing testers) and Nadia (new, cold). Driver native-tap-v2, fork-unverified.
- No canonical write, CLEAR, source CI, deploy, player acceptance or owner acceptance is claimed.

## Stops (generated from wall-clock.jsonl)
| Tester | Device | Elapsed (s) | Reason | game_clock |
| --- | --- | --- | --- | --- |
| Jonas Berg | desktop | 131.509 | BORED | Mon 10:15 |
| Jonas Berg | phone | 31.231 | BORED | Mon 08:54 |
| Aisha Rahman | desktop | 101.683 | BORED | Mon 2 Nov 10:21 |
| Aisha Rahman | phone | 32.985 | BORED | Mon 2 Nov 09:03 |
| Diego Silva | desktop | 98.728 | BORED | Mon 2 Nov 11:00 |
| Diego Silva | phone | 87.446 | BORED | Mon 2 Nov 09:58 |
| Rosa Alvarez | phone | 70.146 | BORED | None |
| Rosa Alvarez | desktop | 43.144 | BORED | None |
| Nadia Petrović | desktop | 298.662 | CONFUSED | Mon 2 Nov 15:32 |
| Nadia Petrović | phone | 234.607 | BORED | Mon 2 Nov 11:37 |

Device order: Jonas, Aisha, Diego and Nadia desktop then phone. Rosa phone then desktop. All five reached only Monday.

## Reactions
142 raw reaction rows in all-driver-reactions.json. 3 are not literally in the report (Jonas desktop 13.884 has Gülce in the raw log and Gulce in the report; Nadia desktop 110.844 and 270.3 are JSON-escaped in the report). Raw words are kept as written. The diary was not reconstructed.

| Tester | Device | Rows | Reaction rows | Not literally in report |
| --- | --- | --- | --- | --- |
| Jonas Berg | desktop | 41 | 12 | 1 |
| Jonas Berg | phone | 15 | 4 | 0 |
| Aisha Rahman | desktop | 32 | 13 | 0 |
| Aisha Rahman | phone | 15 | 4 | 0 |
| Diego Silva | desktop | 31 | 14 | 0 |
| Diego Silva | phone | 33 | 14 | 0 |
| Rosa Alvarez | phone | 28 | 10 | 0 |
| Rosa Alvarez | desktop | 19 | 4 | 0 |
| Nadia Petrović | desktop | 74 | 42 | 2 |
| Nadia Petrović | phone | 52 | 25 | 0 |

## Ledger
- ledger-additions.md: F-2521 to F-2540 (20 rows). F-2521 to F-2525 are one row per person with the opening return and a separate later full return. F-2526 to F-2540 are three ranked asks per person, with the opening wording and the materially different later wording as labelled spans. F-2541 to F-2550 are unused.
- Verdict: Rosa keep. The other four mixed. Caveats are kept; the verdicts are not votes.
- Routes: one `fix:goodhands <description> (open)` per row; `calibration:C14` only on F-2525, conditional on any later clock change. F-2533 is a balance preference, not a clock-speed measurement.
- ask-ledger.md/.json and logical-tester-ledger.md/.json hold the same rows by person.

## Routing notes (parent-stated)
- New blocking source leads, 2026-11-03: F-2529 (draft letter) and F-2538 (belief explanation). Aisha saw the draft and no send in the screen she reached; the later continuation and the "What happens to these people next" menu were not visited. Do not force an automatic send, payment or actor compliance. Nadia's bad references concern different people, traits and knowledge; inspect the actual meaning and reason, and force no equal belief or certainty.
- Clarity and source-inspection leads, 2026-11-03: F-2527, F-2528, F-2530, F-2535, F-2539, F-2540. Nadia did find kept numbers on the phone with the card closed, so desktop absence is not global absence. Pace visibility does not change the default clock.
- Broader preferences, 2026-11-10: F-2526, F-2531, F-2532, F-2533, F-2534, F-2536. A source inspection may find a duplicate copy; do not remove the actual two-party terms or assent. F-2537 is already met at both sizes: preservation-only review, no unmet bug or new feature.
- This bounded correction addresses clarity and preserves clock, difficulty and economy. Broader preferences stay for Nov10 review. Use C14 before changing clocks. Dates and evidence reviews do not add a blanket permission gate. No automatic new penalties or story facts.
- The early-rent disagreement stays: Diego dislikes it, Nadia likes it.
- No trial or later-week outcome was reached. An unchecked promise accepted now does not prove no later cost. Cash above the rent target is not a rent payment or a game end.

## Method qualifications (parent-stated unless a file is named)
- Jonas: history has 939 lines, he read 599; his full-read claim is false. Aisha read all 874 (tool render 875). Diego read all 1116 (render 1117). Rosa: 1682 lines, read 468, and she wrongly called the file cut; her own earlier Good Hands report was included and the later cross-game tail was unread. The earlier Rosa CONT/exposure qualification stays. Nadia: one-line empty history, read in full. Line counts are re-checked against the copies by the validator.
- Jonas, Aisha and Diego viewed only the desktop title image, so there is no gameplay geometry from them. Rosa's unscrolled full cards were unseen.
- Rosa made no rereads: a positive finding on the screens reached, with no new blocker. Jonas and Diego also have none. Aisha has a new letter lead; Nadia has a new belief lead.
- No pulse was due for the four standing testers. Rosa's phone first minute was not logged despite 70 s. Nadia's pulses at 179.1 and 177.8 s were early. Her phone first minute at 111.7 s was late but valid. Her "an hour ago" phrase is wrong: the device gap was 2.006 s.
- Two Nadia stale-Skip names were refused before input, with no timeout or game fault. The cause of the Task-line tap and time jump is unknown; the model clock latency is qualified.
- Aisha used "I’d stop here" after quote failures, not a successful exact "I'm stopping" tap. The labels offered were seen.
- 335 Bash calls, 322 valid assigned JSON curls, 13 shell parse failures before curl, 0 executed protocol breaches.
- No notes, Submit or consent change. The agent query was set; no production receipt was read independently.
- 15 recorded model and driver PIDs are absent; no signals were sent. No complete browser-descendant journal exists and none is invented here.
- The parent verified: all 5 reports read, 10 stops, both-device image Reads, allowed Reads, capture caps, clean pin and all 15 PIDs absent.

## Files (100 files in this directory, including this README and the two indexes)
- Per tester directory: report.md and report.original.md.txt (byte-identical), brief.original.md.txt, own-history.original.md.txt, history-source-map.json, completion.json, dispatch.json, validation.json, director-method-qualification.json, and per device: wall-clock.jsonl, release-start.json, driver.out.
- inputs/: the eight goodhands-retest-* JSON files named in the brief.
- Generated: exact-quote-extraction.json, all-driver-reactions.json, checkpoint-facts.json, logical-tester-ledger.json/.md, ledger-additions.md, ask-ledger.json/.md, screenshots-manifest.json (hashes, no pixels), identity-index.json, source-map.json, primary-quote-validation.json, validate-quotes.py.
- Indexes: manifest.json (all files except itself and sha256.json) and sha256.json (all files except itself). source-map.json and identity-index.json hold no hash of any index, so there is no hash cycle.

## Preparer
Sonnet, low effort, source-packet preparer. Read, Write, Edit and Bash only; no helper, model, advisor or subagent calls; no git, network, browser or process inventory. The command-scope audit files were not read. No PNG or provider envelope or full transcript is in this packet. Histories and briefs were byte-copied mechanically. Original source file times are kept in manifest.json (`sourceMtimeUtc`).

## Director seal — 2026-10-31T08:41:28.049943+00:00

Parent independently matched all83mapped source copies and their hashes, retained all literal return and ask cells, and accepted the dated routes. Parent clarified Aisha’s later added condition and the direction of Jonas’s spelling difference. The missing ask-ledger.json named by the preparer was created from the15literal Markdown rows and checked against them. F-2533 remains a Nov10 balance preference; its currency threshold is not a clock-speed measurement, so its C14 route was removed. Current clarity work keeps the economy and difficulty; no blanket owner-permission gate is introduced. The preparer printed the empty77-byte cold history once; it held no observations. Original draft/result remain private and unchanged. Current validator/indexes were rerun on this sealed epoch.
