# Days LIGHT panel — first Days round (prospective source packet)

Date 2026-10-31. Prospective docs path: `docs/lab/reviews/light-2026-10-30/days/`. This packet claims no CLEAR, no "game finished" and no owner acceptance. Each tester's FINISHED stop label is the producer's own label for that session.

## Remaining

- Canonical import into docs, diary and ledger is pending the next collection batch. The director sealed the packet and accepted the qualified reproduction leads. Game and owner acceptance remain pending.
- **Nov3 BLOCKING LEAD, visit affordability and irreversible advance or recovery clarity** (F-2409, F-2418; return rows F-2402, F-2405). Pavel on desktop and Miles on phone each pressed an offered visit that cost 2 hours with 1 hour left. The attempt was accepted, the story advanced and no recovery was offered. Needed: a bounded actual-mechanism reproduction, then clear before-commit, decline or fallback semantics that keep meaningful failure. Player reports alone prove neither a full-game bug nor a fix.
- **Player preference disagreement, kept.** Tessa explicitly liked being allowed to fail with a clear reason (laptop wall-clock, `tessa/desktop/wall-clock.jsonl`). Do not automatically disable or hide all failed actions, give free hours, promise the visit, add undo, add a safety plan or flatten difficulty.
- **Nov3 leads on wording**: Selin introduced before she holds the receipt (F-2419, Miles) and contradictory receipt and "saves an hour" cost wording (F-2420, Miles and Pavel). Cheap clear wording only after an actual reproduction.
- **Nov3 qualified REACH LEAD, phone picture and choices below the fold** (F-2408, F-2414). Not proven unreachable. The individual differences stay: Tessa did not scroll the phone; Emre did not fully scroll and his ask rests on a screenshot alone; Pavel scrolled once and viewed no after-image; Nia viewed only the intro image and makes no story-layout claim; Miles scrolled 500 px, found the choices and reports no problem beyond the scroll. A named driver can reveal controls and is not human pointer proof.
- **Nov10 preferences**: numeric savings, an earlier future-budget warning, more branches, free expression, longer runs, replay variety, character responses and stated stakes are taste and clarity preferences. No automatic major rewrite.
- Ledger rows F-2421–F-2430 stay unused. No later ask was truly separate from the ranked asks. Section 8 wording that adds or changes content is kept as a labelled "Later wording" span in the same row.

## What this is

Five fictional people played the same build on two devices each: ten voluntary stops, all labelled FINISHED. Build: clean `2741f06a0e4c96ffdec26e2e5b6b8874765dc126`, framework and engine HF4.8.1, `dirty:false` in every completion pin and every release-start (`checkpoint-facts.json`). Round `light-1031-days1`, free stop, floor 0, ceiling 20 min. URL carries `labRunSource=agent`.

- Four standing players on a first Days visit: Emre Kaya, Pavel Novak, Tessa Williams, Nia Okafor (Sonnet).
- Miles Osei is a new cold person with an empty history (Opus). His one-line history is in `miles/own-history.original.md.txt`.
- Device orders: Emre desktop→phone, Pavel desktop→phone, Tessa phone→desktop, Nia phone→desktop, Miles desktop→phone.
- The driver is `native-tap-v2` with `lab-play.ts` hash `0a0e0c6084f0154e8e2ce7bdf3487a795f02668f18f149b224a7030a17ed67ff`, the same in all five `dispatch.json` files. Its input status 200 acknowledges native input. It does not prove the intended game outcome, and `driver_check` is `fork-unverified`.
- The parent read all five complete reports.

## Verdict words

All five returns are conditional and are `mixed`. Verdict words state each tester's own conditions. They are not votes and not a population estimate. Reasons per row: `logical-tester-ledger.json`.

## Stops and story end, compared with raw

| tester | first device stop | second device stop | raw game_clock at stop |
| ------ | ----------------- | ------------------ | ---------------------- |
| Emre   | desktop 82.995 s  | phone 81.418 s     | "leave ended" on both  |
| Pavel  | desktop 86.663 s  | phone 83.343 s     | "Leave ended" on both  |
| Tessa  | phone 83.799 s    | desktop 84.26 s    | null on both           |
| Nia    | phone 36.04 s     | desktop 32.8 s     | null on both           |
| Miles  | desktop 79.161 s  | phone 73.849 s     | null on both           |

All ten stops have reason FINISHED. Every report says the story ended in each session. The raw stop record itself carries a game clock saying the leave ended only for Emre and Pavel. For Tessa, Nia and Miles the story-end claim rests on the tester's own stop or want_quit words and report, not on a raw clock field. The two Pavel and two Tessa and two Miles want_quit lines are also FINISHED. Quoted times are driver elapsed seconds. Reports often state shorter or rounder times, which are the tester's estimates of model and tool time.

## Qualifications kept, not flattened

- Short durations (32.8–86.7 s) are actual model and tool time. They are not proof of human reading speed, of zero emotion, or that all runs were the same. No wait was pretended and no run was forced to 20 min. Every authored first_minute log is at or after 60 s and valid. No pulse is due because every stop is under 180 s. Nia's desktop has no first_minute line, and her phone's only first_minute line is an automatic shot at 60.026 s, after her stop at 36.04 s (`autoLineAfterStop` in `checkpoint-facts.json`).
- Nia: her own opening return says both runs "ended the same way". Her later desktop stop says "ending text changed". Both literal claims are kept. The reported path and end text actually differed between her runs.
- Nia's supplied Days history lists her earlier Rope report among its selected sources (`days/nia/history-source-map.json`, private and not in this packet). The existing Rope-round continuity qualification stays attached to that report: continuity and recognition evidence drawn from it is qualified. Whether the Days history itself carries any excluded material was not checked, because histories were copied mechanically and not read. Her Days report says her history held nothing about this game.
- Miles: two shell commands with malformed quotes were denied by the CLI before they ran. Two separate ambiguous text-prefix taps were refused before any input. None of these is a game failure (`inputs/days-director-method-notes.json`, `miles/desktop/wall-clock.jsonl` rawErrors).
- Feedback: every tester opened Menu and Feedback and chose the quick "I'm stopping" label. That prefills the note draft. Back closed it. No actual note was typed, Submit was not pressed and no consent or recording setting changed. A prefilled draft is not a submission. The supported SDK field is `runSource:agent` through `labRunSource=agent` (`dispatch.json`). No production agent receipt was independently read, so receipt is unverified.
- Fresh-device cast, tiredness start, opening length and receipt-owner differences between one person's two devices are differences between fresh games. They are not save failures, and the seed cause is unknown (Pavel, Tessa and Miles each noticed some).
- Pavel desktop versus phone: the same offered visit failed at 1 hour and worked at 2 hours. This is a difference of hours, not a proven defect.
- Pavel's contradiction about "obtain the original" after the receipt had arrived and Miles's "saves an hour" wording are tester observations until reproduced.
- Individual differences in phone scroll evidence are listed in Remaining above and in `logical-tester-ledger.json` (`phoneFoldEvidence`).

## Method record

- `inputs/days-director-method-notes.json`: 240 tool calls, 238 valid assigned curl calls, 2 failed before any request (Miles), 0 executed out-of-protocol commands. Provider envelopes stay private and are not in this packet. The command-scope audit is not included.
- Raw error receipts with elapsed seconds stay in each `wall-clock.jsonl` and in `checkpoint-facts.json` (`rawErrors`). `rawTimeoutErrors` is empty everywhere.
- Screenshot limits: image Read receipts come from each `validation.json` (one image block each, all successful, no unexpected reads). `screenshots-manifest.json` lists every retained PNG with its hash, `testerImageReadReceipt` and whether the report names it as viewed. Those two flags agree for every file. Captures with no receipt are the automatic `first-minute.png` shots and are flagged `false`. The preparer opened no image. Testers' screenshot descriptions are their own words.
- Cleanup: all 15 recorded model and driver process ids are absent and no kill was needed (`inputs/days-cleanup.json`). The post-round release is clean at the same commit (`inputs/days-release-after-round.json`).

## Files

- `ledger-additions.md`: F-2401–F-2405 tester return rows (opening answer and the separate later full return, both literal; Miles has one extra labelled answer), F-2406–F-2420 three ranked asks each. `ask-ledger.md`: the F-2406–F-2420 rows. One logical row per tester.
- `logical-tester-ledger.json` and `.md`: one row per tester.
- `exact-quote-extraction.json`, `validate-quotes.py`, `primary-quote-validation.json`: every span is an exact, pipe-free, single-line substring of the raw copies (report text or a wall-clock reaction). Run `python3 -I validate-quotes.py`. It also checks ledger rows against the extraction, the route grammar and the hash index. Routes use only `fix:days description`, `lesson:Lnumber` and `calibration:C14`, with semicolons only between routes and commas for qualifiers.
- Per tester: `report.md` and `report.original.md.txt` (byte-identical to the producer reply, including Miles's leading sentence), `completion.json`, `dispatch.json`, `validation.json`, `brief.original.md.txt`, `own-history.original.md.txt`, and per device `wall-clock.jsonl`, `release-start.json`, `driver.out`. All byte-exact copies. Brief and history hashes match `inputs/days-input-freeze.json`.
- `inputs/`: plan, input freeze, driver audit, stop-and-capture audit, director method notes, cleanup, release-after-round.
- `checkpoint-facts.json`, `screenshots-manifest.json` (hashes computed from bytes, no pixels read, no PNG copies), `sha256.json` and the historical `manifest.original.json.txt`.
- No full transcripts, no provider envelopes, no tool-call identifiers.

Nothing in the source tree, browser, network or git was touched. This packet does not extend any frozen earlier PR.

## Director final routing and source qualification

The director read all five complete reports, checked source-copy identity and validated all88literal spans/20rows against originals. The parent accepts the qualified reproduction leads, not a game or owner completion verdict. Pavel/Miles visit affordability and irreversible advance/recovery clarity need a bounded mechanism check and clear before-commit semantics; Tessa liked the explained failure. Preserve meaningful failure and do not automatically hide every unaffordable action or guarantee the promised visit. Phone reach remains a qualified lead with each tester's scroll and image limits preserved. Selin/receipt/cost wording leads need actual reproduction. Numeric savings, more branches, longer runs, free expression and other taste asks remain dated preferences.

The director mechanically checked the selected Days histories with the CONT-exclusion function: no excluded body remains in those current inputs. Nia's included earlier Rope observations retain their historical continuity qualification; that does not assert new contamination of the selected Days input. Raw producer reports and frozen inputs are unchanged. Nia's automatic phone checkpoint at60.026s occurred after her36.04s stop and extends neither her play nor viewed evidence. Emre/Pavel raw clock fields name the ending; other story-end claims are the testers' words, not an extra clock assertion.

Private preparation result reports one extra advisor call despite the no-model brief. It is not a tester, player evidence or independent approval. Model-use metadata confirms the call; future workers are restricted with an explicit available-tools list. Provider envelopes remain private. All original player words, error receipts and study qualifications remain intact.

The collection hold was released05:27Z. Sole fix ownership is requested, with fallback ownership inventory07:27Z. This packet belongs to the next source collection; it does not extend frozen PR87e8d. Canonical import is pending. F2421–2430 remain unused.


## Source preparation checkpoint — 2026-10-31T06:37:57.592173+00:00

The collection paragraphs above describe the sealed source epoch. This packet is prepared for the next canonical documentation batch after approved PR87; canonical application and review remain pending. The historical manifest snapshot is `manifest.original.json.txt`, not a current manifest. Safe director method notes include command-scope counts; the private full command audit contains provider envelopes and is deliberately excluded. No production agent receipt or human-speed comparison is claimed.


## Canonical view note — 2026-10-31

This directory is the canonical view of the packet. Two layers exist, and neither source changed.

- **Original private source epoch.** The sealed private packet (`source-packets/days`): producer reports, inputs, wall-clock logs, `validate-quotes.py`, `primary-quote-validation.json` and the pre-canonical hash index and manifest (kept here as `source-packet-sha256.original.json.txt` and `manifest.original.json.txt`). Every statement above about byte-identity, "byte-exact copies", validator runs and hash-index checks describes this source epoch, not the formatted views below.
- **Canonical view (this directory).** JSON and Markdown files may be Biome-formatted readable views. Where a view differs from its source, `original-to-view.json` names the exact source bytes as `rawOriginal` (a `<file>.original.txt` snapshot, or `report.original.md.txt` where its bytes equal the source). Briefs, histories, wall-clock logs, `driver.out`, `validate-quotes.py` and every `*.original.*` file are exact copies.

`original-to-view.json` is the current per-file map (`privateFile`, `privateSha256`, `canonicalSha256`, `rawOriginal`). `sha256.json` is the current hash index of every other file here, including the map. Neither lists itself. `validate-quotes.py` and `primary-quote-validation.json` are unchanged source-epoch code and proof: their result applies to the source epoch, and they do not prove the formatted views byte-identical. This note does not claim the old validator was re-run on the formatted views. The pre-canonical private `sha256.json` and `manifest.json` are `source-packet-sha256.original.json.txt` and `manifest.original.json.txt`, inert snapshots.

Game fixes, retests and owner acceptance remain open. Nothing in this note changes a tester's words, a ledger row, a date, a route or a stated limitation.
