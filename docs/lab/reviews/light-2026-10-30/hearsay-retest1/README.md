# Hearsay LIGHT panel — first fixed-build retest (prospective source packet)

Date 2026-10-31. Prospective docs path: `docs/lab/reviews/light-2026-10-30/hearsay-retest1/`. This packet claims no CLEAR, no "game finished", no owner acceptance and no source, CI or fix acceptance. The stop labels (TASTE, BORED, CONFUSED) are the producers' own labels for each session. They are session labels. They are not game endings and not ten independent completions. Rosa's opening line "Both sessions are finished" means both sessions stopped, not that the game ended.

## Remaining

- **Nov3 BLOCKING clarity lead, the "A person's chapter could not be saved. Finish outstanding responsibilities and try again." message on Day 2** (F-2469 and F-2462 Emre on both devices, F-2474 Diego on desktop only). The three sessions whose raw stop clock is Day 2 or later (Emre desktop, Emre phone, Diego desktop) all report it. Diego did not see it on his phone, which stopped on Day 1. Neither of those two testers could explain or clear it. Needed: inspect the actual mechanism first. Do not just hide a real export failure. Player reports alone prove no cause and no fix.
- **Nov3 unclear busy reason and availability** (F-2470 Emre, F-2475 Rosa, F-2479 Irena). Dilan and Derya refused as busy with no reason or time while sitting at the garden. Irena was also refused as Hatice on her own reflection ("I am Hatice"). One desktop session reported that last one, so it is unreproduced. Testers praised that the refusal itself is plain. Keep truthful refusal.
- **Nov3 qualified source lead, story and claim provenance and repeated guidance** (F-2480, Irena only). Ece's answer reads as both "what I have heard" and "I saw it myself". Harmless stories turn into "not kind" if repeated. Every reply ends with one Day 4 supply sentence. This is a reported lead from one cold tester. It is not a canonical factual rewrite. Her private hobby "not kind" moral objection stays. Do not force harmful gossip.
- **Nov3 cheap wording leads, source reproduction first** (F-2467 goal paragraph twice in the Garden record, Maya desktop only; F-2477 long Pace sentence, Rosa).
- **C14 human-speed comparison before any clock, story or difficulty change** (F-2466 Maya, F-2471 Emre, F-2472 Diego, F-2478 Irena, and the more-to-do and time preferences). Session lengths here are model and tool time. Emre's two Fast-rate statements differ (four game hours in 30 s in his first-minute line, 12 game minutes per second in section 9). Neither is verified.
- **Nov10 preferences:** F-2468 Maya choosing the listener (a preference, so no automatic change to recipient or control semantics), F-2473 Diego's slandered person gave no visible answer (incomplete result reaction retained), and broader expansion preferences.
- Existing select, recipient, claim and refusal improvements, the Next Day 4 line, who-hears-what before the tap, Ece's refusal in place, the empty-garden hint and the order-screen costs were acknowledged by the testers. They are not globally absent. Emre praises the order cost and Next clarity and dislikes Dilan. Both statements stay.
- Preserve difficulty, truthful refusal, agency, private correction, consequences and records. No automatic easy mode, randomization, faster clock or free time.
- Ledger rows F-2481–F-2490 stay unused. No ask was truly separate from the ranked asks.
- The game stays unfinished. The first fixed-build retest still raised blocking asks, so one further iteration is due. Games-deferred owns the next correction. The next panel may start no earlier than 06:53:52.471506Z (parent-stated). The deployment hold was released after all five returns (parent-stated).
- Current HF PR 87 is frozen and approved. This is a later collection, not an amendment. Canonical import is not part of this packet.

## What this is

Five different fictional people played the same build on two devices each: ten voluntary stops, two fresh device contexts per person in the same evening. Build: clean `ccd8592e90c06a689102ddae20f5376f8fc78cc7`, framework HF 4.12.0, app 0.1.0, `dirty:false` in every completion pin, every release-start and the post-round release (`checkpoint-facts.json`). Round `light-1031-hearsay-retest1`, free stop, floor 0, ceiling 20 min. The URL carries `labRunSource=agent`.

- Four same standing players retesting after actual fixes: Maya Chen, Emre Kaya, Diego Silva, Rosa Alvarez (Sonnet).
- Irena Novotná is a new cold person with an empty history (Opus). Her one-line history is in `irena/own-history.original.md.txt`.
- Device orders: Maya phone→desktop, Emre desktop→phone, Diego desktop→phone, Rosa phone→desktop, Irena desktop→phone.
- The driver is `native-tap-v2`. Its dispatch hash for `lab-play.ts` is `0a0e0c6084f0154e8e2ce7bdf3487a795f02668f18f149b224a7030a17ed67ff`, the same in all five `dispatch.json` files. Input status 200 acknowledges native input. It does not prove the intended game outcome, and `driver_check` is `fork-unverified`.
- The parent read all five complete reports and verified the ten stops, the image reads and allowed reads, the pins, the shot limits and that all 15 recorded process ids are absent. The preparer also read the reports, plan, freeze, audits, notes, cleanup, completions, dispatches, validations, device logs and the two history qualifications in full. Briefs and histories were copied mechanically and not read.
- No match of seed or save, no ten-independent-player claim and no human-speed claim is made.

## Verdict words

All five returns are conditional and are `mixed`. The conditions are literal and differ. They are not votes and not a population estimate. Reasons per row: `logical-tester-ledger.json`.

## Stops, compared with raw

| tester | first device stop        | second device stop     | raw game_clock at stop       |
| ------ | ------------------------ | ---------------------- | ---------------------------- |
| Maya   | phone 71.863 s TASTE     | desktop 22.66 s TASTE  | "Day 1 09:01", "Day 1 06:26" |
| Emre   | desktop 468.833 s BORED  | phone 204.88 s BORED   | "Day 4 12:02", "Day 2 09:37" |
| Diego  | desktop 196.301 s BORED  | phone 74.143 s BORED   | "Day 2 05:12", "Day 1 08:49" |
| Rosa   | phone 108.238 s CONFUSED | desktop 73.576 s BORED | "Day 1 15:00", "Day 1 07:06" |
| Irena  | desktop 250.253 s BORED  | phone 80.308 s BORED   | "Day 1 15:26", "Day 1 07:17" |

Times are driver elapsed seconds from the raw stop records. Reports often state rounder times, which are the tester's own estimates. Full raw stop words are kept (no stop is abbreviated). Several report section 7 stop quotes drop trailing sentences of the raw stop. `logical-tester-ledger.json` flags this with `rawStopReactionLiterallyInReport`. Only Emre reached a Day 4 order (desktop, order screen at 457.9 s per his driver log). Nobody reached Day 8 or later in this round.

## Qualifications kept, not flattened

- Maya read own-history lines 1–349 only. Her earlier own Hearsay report is included. Later cross-game history is unread. Rosa read lines 1–826 of 1419. Her earlier Hearsay report is included. Later Stairwell and cross-game history is unread. The earlier Rosa GoodHands, Glance and Rope alternative-contamination qualification remains in her supplied history. Current target findings cannot erase that exposure. Emre and Diego claim in their reports that the full supplied history was read. The packet holds no tool Read receipts for histories, so that is a self-claim. Irena's history is empty and one line.
- Rosa phone: only the title was viewed, so no phone gameplay layout evidence exists. Diego has no phone empty-garden image. Irena has no phone card-grid or pace-bar image. Emre viewed desktop a-001 only. A named driver target can reveal off-screen controls, so no universal visual reach proof exists.
- Irena: her report says her shell quote for "I'm stopping" failed in both sessions. The actual record is two malformed shell commands, both desktop port 22509, both failed before curl so no request was made. One tap with the text "stopping" found no such target and later point taps were acknowledged. These are tool limits, not game bugs. Her report words stay unchanged. She says she reached no hard blocker after clearing the pending-answer pace state by choosing Hatice. Both what she reached and this qualification stay. Her phone open row is 2.016 s after her desktop stop row, so "the same morning" on her phone refers to her own second device within seconds, not an independent replay on another evening. The Ece heard-and-saw contradiction is a reported source lead only.
- Short durations (22.7–468.8 s) are model and tool time. They are not proof of human reading speed, boring games or too-short difficulty. Maya desktop (22.66 s), Diego phone (74.1 s), Rosa both and Irena phone stopped before 180 s, so no pulse was due. Driver first-minute captures happen automatically. Only image Read receipts count as viewed images. A capture proves no extra play.
- Feedback: every tester opened Menu and Feedback and chose a quick label ("I'm stopping" in nine sessions, "I'm confused" for Rosa phone), then "Not now". Both labels were seen. No notes were typed, Submit was not pressed and no consent or recording setting changed. The supported SDK field is `runSource:agent` through `labRunSource=agent`. No production agent receipt was independently read, so receipt is unverified.

## Method record

- `inputs/hearsay-retest-director-method-notes.json`: 284 Bash calls, 282 valid assigned curl calls, 2 parse failures before any request (both Irena desktop), 0 executed out-of-protocol commands. Provider envelopes and full transcripts stay private and are not in this packet. The command-scope audit is not included and the preparer did not read it.
- Image Read receipts total 20 across ten sessions. 29 PNG files are retained and listed with hashes in `screenshots-manifest.json` (largest per device: 4). No PNG is copied and the preparer opened none.
- Raw errors and refused taps with elapsed seconds stay in each `wall-clock.jsonl`. The three Irena desktop tool errors are in `checkpoint-facts.json`.
- Cleanup: all 15 recorded model and driver process ids are absent and no kill was needed (`inputs/hearsay-retest-cleanup.json`). The post-round release is clean at the same commit. The packet needed no worktree and left no process.

## Files

- `ledger-additions.md`: F-2461–F-2465 tester return rows (opening answer and separate later full return, both literal, all conditions) and F-2466–F-2480 three ranked asks each, with labelled later wording. `ask-ledger.md`: the F-2466–F-2480 rows. Routes use only `fix:hearsay description (open)` and `calibration:C14`, with semicolons only between routes.
- `logical-tester-ledger.json` and `.md`: one row per tester.
- `exact-quote-extraction.json`, `validate-quotes.py`, `primary-quote-validation.json`: every span is an exact, pipe-free, single-line substring of the raw copies. Run `python3 -I validate-quotes.py`. It also checks ledger rows against the extraction, the route grammar, the identity checks and the hash index.
- Per tester: `report.md` and `report.original.md.txt` (byte-identical to the producer reply), `completion.json`, `dispatch.json`, `validation.json`, `brief.original.md.txt`, `own-history.original.md.txt`, `history-source-map.json`, Maya and Rosa `director-history-qualification.json`, and per device `wall-clock.jsonl`, `release-start.json`, `driver.out`. All byte-exact copies.
- `inputs/`: plan, input freeze, final driver audit, stop-and-capture audit, director method notes, cleanup, final release-after-round.
- `checkpoint-facts.json`, `screenshots-manifest.json`, `all-driver-reactions.json` (all 135 raw reaction rows, 0 of them not literally in a report), `identity-index.json`, `source-map.json`, `manifest.original.json.txt` (inert source-epoch snapshot), `sha256.json`.
- `sha256.json` hashes every file except itself. `manifest.original.json.txt` (inert source-epoch snapshot) lists every file except itself and `sha256.json`. `identity-index.json` and `source-map.json` hash no packet index, so the maps have no cycle. Source epochs in `manifest.original.json.txt` (inert source-epoch snapshot) are the recorded timestamps of each source, or null where the source carries none.
- No full transcripts, no provider envelopes, no PNG pixels.

Nothing in the source tree, browser, network or git was touched.

## Preparer status

Prepared by a Sonnet LOW source-packet preparer without any model, advisor or sub-agent call. The preparer is not a tester, not player evidence and not an approval. Row routing follows the parent routing notes. The preparer's own choices are the Nov 10 placement of F-2466, F-2471, F-2472, F-2473, F-2476 and F-2478, the Nov 3 placement of F-2467 and F-2477 (both stated by the parent as Nov 3) and which later spans count as materially different. The parent may change them at the final seal. The Remaining list above is the preparer's reading of the parent routing and has not been sealed.


## Director final seal — 2026-10-31T06:57:33.589289+00:00

All five complete reports were read. Ten voluntary stops, matching clean pins, both-device actual image Reads, allowed Read paths, capture limits and all fifteen recorded PID absences were verified. There were284Bashcalls,282valid assigned curl requests and2desktop shell parse failures before execution; no executed command-scope breach. Producer reports, brief/history inputs and device logs remain byte-exact. No full provider transcripts, envelopes or pixels are published. Partial history reads and all other method limits above remain.

The director accepts the chapter-save and busy-reason source leads for a bounded second correction, followed by the same four standing testers and a new cold person. F2476 is routed to a Nov3 availability-clarity check: show only what the source can truthfully establish, without promising future actor choices. This does not authorize a clock change. Empty-garden/skip/story-timing changes require a separate C14 human-speed comparison; broader preferences remainNov10. Do not hide a genuine export failure, flatten refusals or change difficulty. The real cause remains unverified by players. Remaining requests are dated, not deleted.

Games-deferred has acknowledged sole Hearsay source ownership. The deployment hold is released. This first fixed retest raised new blocking asks; one more iteration remains under LIGHT. Game and Adam acceptance remain open. This packet is a later collection and does not alter approved HFPR87 or the separately prepared three-packet overlay.


## Canonical view note — 2026-10-31

This directory is the canonical view of the packet. Two layers exist, and neither source changed.

- **Original private source epoch.** The sealed private packet (`source-packets/hearsay-retest1`): producer reports, inputs, wall-clock logs, `validate-quotes.py`, `primary-quote-validation.json` and the pre-canonical hash index and manifest (kept here as `source-packet-sha256.original.json.txt` and `manifest.original.json.txt`, inert snapshots). Every statement above about byte-identity, "byte-exact copies", validator runs, `manifest.json` and `sha256.json` describes this source epoch, not the formatted views below. The exact pre-note README is `README.original.md.txt`.
- **Canonical view (this directory).** JSON and Markdown files may be Biome-formatted readable views. Where a view differs from its source, `original-to-view.json` names the exact source bytes as `rawOriginal` (a `<file>.original.txt` snapshot, or `report.original.md.txt` where its bytes equal the source). Briefs, histories, wall-clock logs, `driver.out`, `validate-quotes.py` and every `*.original.*` and `*.preseal.original.*` file are exact copies.

`original-to-view.json` is the current per-file map (`privateFile`, `privateSha256`, `canonicalSha256`, `rawOriginal`). `sha256.json` is the current hash index of every other file here, including the map. Neither lists itself. The `manifest.json` named above exists only as the inert `manifest.original.json.txt`. `validate-quotes.py` and `primary-quote-validation.json` are unchanged source-epoch code and proof: their result applies to the source epoch, and they do not prove the formatted views byte-identical. The old validator was not re-run on the formatted views and would fail by design where it compares `report.md` with `report.original.md.txt` byte for byte; run it only on the private packet.

Every status and verdict in this README is as of its own source epoch and director seal. A later status is a source-epoch statement only until the parent's checkpoint. Game fixes, retests and owner acceptance remain open. Nothing in this note changes a tester's words, a ledger row, a date, a route or a stated limitation.
