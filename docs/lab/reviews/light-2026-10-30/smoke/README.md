# Smoke on the Stairs LIGHT panel — first Smoke round (prospective source packet)

Date 2026-10-31. Prospective docs path: `docs/lab/reviews/light-2026-10-30/smoke/`. No CLEAR and no completion verdict is claimed here. Nothing in this packet says the game is finished or that the owner accepted anything.

## Remaining

- Canonical import into docs, diary and ledger is pending.
- The director accepted the qualified reproduction leads after validation. Game and owner acceptance remain pending. Canonical source review is pending.
- The first LIGHT panel raised blocking leads on movement clarity and reach (F-2376–F-2380, F-2383–F-2385, F-2388–F-2390, the rows routed to target2026-11-03). They need a bounded fix, then a retest by the same four standing players, and a new cold player later.
- Routes: target2026-11-03 for movement destination, progress, current position, Street meaning and why the player is waiting. target2026-11-10 for preferences. Details are in `ledger-additions.md`.
- Ledger rows F-2391–F-2400 stay unused. No later ask was materially distinct from the ranked asks in the original reports. The only later wording differences (Leila ask 3, Marta ask 1) are kept as labelled spans in their rows. Jonas's desktop wish about what happens if smoke kills someone and whether Burak matters is in the raw desktop stop line only, not in his report, so no row is invented.

## What this is

Five fictional people played the same build on two devices each: ten stops. Build: clean `7070afb11b2262ffc5fef8997189f749238ef653`, framework HF4.8.0, `dirty:false` in every completion pin and every release-start (`checkpoint-facts.json`). Round `light-1031-smoke1`, free stop, floor 0, ceiling 20 min.

- Four standing players on their first Smoke visit: Jonas Berg, Aisha Rahman, Diego Silva, Leila Mansour (Sonnet).
- Marta Kowalska is a new cold person with an empty history (Opus). Her empty-history line is in `marta/own-history.original.md.txt`.
- Device orders: Jonas desktop→phone, Aisha desktop→phone, Diego phone→desktop, Leila phone→desktop, Marta desktop→phone.
- The parent read all five complete reports.
- The driver is `native-tap-v2` (`lab-play.ts` hash `0a0e0c6084f0154e8e2ce7bdf3487a795f02668f18f149b224a7030a17ed67ff`, from each `dispatch.json`). Its status 200 acknowledges native input. It is not proof that the intended game outcome happened, and `driver_check` is `fork-unverified`. No claim here says input status 200 proves an outcome.

## Verdict words

Four returns are conditional and are `mixed`: Aisha, Diego, Leila, Marta. Jonas is `keep` (his words: "Yes, another evening"). Verdict words state each tester's own conditions. They are not votes and not a population estimate. Reasons per row: `logical-tester-ledger.json`.

## Qualifications kept, not flattened

- Jonas: his context was compacted after the desktop session. His report omits the desktop diary and estimates "about 15 real minutes". The raw desktop stop is at 148.884 s. The director extracted the raw desktop reactions separately, which is not a reconstructed diary and is not copied here. The original report stays unedited. His phone `FINISHED` is the producer label. His words say a personal stop after seeing the shape of it, not proof that the whole game ended. His desktop session includes a successful night, then a retry, then a personal stop.
- Diego phone: `FINISHED` is a personal stop. No end card appeared and about 22 s were left on the clock. His own report calls the label inaccurate. No whole-game inference.
- Aisha: a desktop `first_minute` tap tag at 36.117 s is premature and not a valid checkpoint. The valid `first_minute` log is at about 80.9 s (the raw line reads 80.89; the director notes write 80.891).
- Marta: her "an hour ago" is her estimate and is inaccurate. Raw stamps put her phone open about 3 s after her desktop stop, and her whole round spans about 6 minutes (`checkpoint-facts.json`, `martaDesktopStopToPhoneOpen_s`). The 3 s is driver time between the two logs, not a claim about how long she rested. Her desktop learning before the phone is actual exposure within one person, not a separate cold person and not a save failure.
- Fresh-device cast and smoke location differ between a person's two devices. That is a difference between fresh games, not a cross-device save failure.
- Movement and death: dynamic accessible names, offscreen named landing buttons (which may be screen-reader-only controls) and tool latency qualify every movement and death claim. All five describe walking confusion. That needs an actual pointer and native public-map reprobe before any defect. It is not an automatic clock or difficulty retune. Not all touch or game keys are broken. Causal death is not proved. Human-speed C14 comes before any timing defect or speed retune.
- Preserved design: character agency, Sevim's books refusal, the short clock, smoke and deaths.
- Selected-versus-approach two-tap semantics and the action-ready wording reproduce for Marta. No automatic one-tap compliance or sprint. Marta's Show the stair unlock after a delay, and her torch guess, are unproved.
- Numeric individual death clocks: use authored observable urgency only unless the owner chooses otherwise. No automatic hidden health or future countdown. Faster walk, longer stake and new death narration are preferences for 2026-11-10, not an automatic difficulty change.
- Feedback: Leila's empty-note and extra-Back asks are a preference for 2026-11-10. She selected the quick label, the normal draft preloads the selected words, "Not now" closed it, and zero actual notes were submitted. Marta's phone menu was covered by the end card and the end-card "Tell us about this night" route worked, so the covered pause button is not a globally unreachable Feedback. No fake feedback, no manual POST and no consent change. The supported SDK field is `runSource:agent` through `labRunSource=agent` (`dispatch.json`). No production agent receipt was independently read.
- Authored dark art appeared despite a light browser preference (Jonas, Aisha, Leila). That is not proof of a broken app setting.

## Method record

- `inputs/smoke-director-method-notes.json`: 349 tool calls, 346 valid assigned curl calls, three failed shell quotes (Jonas 1, Diego 1, Leila 1) that failed before curl and never executed a request. Executed out-of-protocol commands: 0. Provider envelopes stay private and are not in this packet.
- Actual error receipts with elapsed seconds stay in each `wall-clock.jsonl` and in `checkpoint-facts.json` (`rawErrors`). Examples: "covered or off screen" refusals, stale-name refusals, a disabled books button. `rawTimeoutErrors` is empty.
- Screenshot limits: the parent validated the image Read receipts for all ten device sessions (`*/validation.json`, `inputs/smoke-driver-audit.json`; each successful read is one image block). Retained captures without a receipt are listed in `screenshots-manifest.json` with `testerImageReadReceipt:false` (automatic `first-minute.png` shots, Aisha desktop `a-003.png`, Marta desktop `a-003.png`). The director later viewed two images, recorded separately in director-image-observations.json; these views do not extend tester image evidence. Testers' screenshot descriptions are their own words.
- Cleanup: every recorded process id is absent and no kill was needed (`inputs/smoke-cleanup.json`). The post-round release is clean (`inputs/smoke-release-after-round.json`).

## Files

- `ledger-additions.md`: F-2371–F-2375 tester return rows (opening answer and the separate later full return, both literal), F-2376–F-2390 three ranked asks each. `ask-ledger.md`: the F-2376–F-2390 rows.
- `logical-tester-ledger.json` and `.md`: one row per tester.
- `exact-quote-extraction.json`, `validate-quotes.py`, `primary-quote-validation.json`: every span is an exact, pipe-free, single-line substring of the raw copies (report text or a wall-clock reaction). Run `python3 -I validate-quotes.py`. It also checks ledger rows against the extraction, route syntax and the hash index.
- Per tester: `report.md` and `report.original.md.txt` (byte-identical to the producer reply), `completion.json`, `dispatch.json`, `validation.json`, `brief.original.md.txt`, `own-history.original.md.txt`, and per device `wall-clock.jsonl`, `release-start.json`, `driver.out`. All byte-exact copies. Brief and history hashes match `inputs/smoke-input-freeze.json`. The histories were copied mechanically and not read for this packet.
- `inputs/`: plan, input freeze, driver audit, stop-and-capture audit, director method notes, Jonas memory qualification, cleanup, release-after-round. The command-scope audit is not included.
- `checkpoint-facts.json`, `screenshots-manifest.json` (hashes of retained PNGs, computed from bytes, no pixels read, no PNG copies), `sha256.json` and the historical `manifest.original.json.txt`.
- No full transcripts, no provider envelopes, no tool-call envelope text.

Nothing in the source tree, browser, network or git was touched.

## Director final routing and source qualification

The director read all five complete reports. The movement destination/progress and phone reach leads need a bounded native public-pointer reproduction and fix before the same four standing retest. Do not infer broken game movement, a reset-on-extra-tap rule or causal deaths from stale accessible names, off-screen screenreader controls and model latency. Preserve people deciding, the books refusal, smoke, deaths and the short stakes. Individual death timers and faster walking remain player framing; no automatic hidden-health display, speed change or easier game.

`all-driver-reactions.json` preserves surviving reactions from all devices, including Jonas's omitted desktop lines. This extraction is not a new producer diary. Jonas's readable report has a separate director header correcting the duration and raw-record availability; his producer original is exact. Diego's phone FINISHED was a personal stop before the end card. Marta's hour-ago estimate is not the actual interval. `director-image-observations.json` records the director's two actual image views and their limits.

There were three malformed shell quotes and no executed out-of-protocol Bash command. Images/allowed Reads/shot budgets and all15recorded model/driverPID absences were audited; no kill was needed. No raw provider envelopes or full transcripts/pixels are published. All stop reasons and original words stay unchanged. Source import is pending in the next collection batch; this packet does not extend frozen PR87e8d. New-game/coordinator ownership is requested; no fixer claimed yet. The parent accepts the qualified reproduction leads, not a game/owner-completion verdict.

The director corrected three calibration routes to the exact `calibration:C14` token and retained qualifiers in separate `fix:smoke` routes, as required by the real parser. `ledger-route-normalization.json` and the before-normalization ledger snapshots preserve the exact change; tester words are untouched.

The director reconciled the validator with the already-documented Jonas header and the parser-required exact calibration:C14 route. It now verifies the pinned header separately and keeps the producer body byte-exact; all other reports remain byte-identical. The prior validator is retained as validate-quotes.original.py.txt. No tester wording or route was changed by this reconciliation. The current hash index is authoritative; preparer manifest/hash snapshots are historical.


## Source preparation checkpoint — 2026-10-31T06:37:57.592173+00:00

The collection paragraphs above describe the sealed source epoch. This packet is prepared for the next canonical documentation batch after approved PR87; canonical application and review remain pending. The historical manifest snapshot is `manifest.original.json.txt`, not a current manifest. Safe director method notes include command-scope counts; the private full command audit contains provider envelopes and is deliberately excluded. No production agent receipt or human-speed comparison is claimed.


## Canonical view note — 2026-10-31

This directory is the canonical view of the packet. Two layers exist, and neither source changed.

- **Original private source epoch.** The sealed private packet (`source-packets/smoke`): producer reports, inputs, wall-clock logs, `validate-quotes.py`, `primary-quote-validation.json` and the pre-canonical hash index and manifest (kept here as `source-packet-sha256.original.json.txt` and `manifest.original.json.txt`). Every statement above about byte-identity, "byte-exact copies", validator runs and hash-index checks describes this source epoch, not the formatted views below.
- **Canonical view (this directory).** JSON and Markdown files may be Biome-formatted readable views. Where a view differs from its source, `original-to-view.json` names the exact source bytes as `rawOriginal` (a `<file>.original.txt` snapshot, or `report.original.md.txt` where its bytes equal the source). Briefs, histories, wall-clock logs, `driver.out`, `validate-quotes.py` and every `*.original.*` file are exact copies.

`original-to-view.json` is the current per-file map (`privateFile`, `privateSha256`, `canonicalSha256`, `rawOriginal`). `sha256.json` is the current hash index of every other file here, including the map. Neither lists itself. `validate-quotes.py` and `primary-quote-validation.json` are unchanged source-epoch code and proof: their result applies to the source epoch, and they do not prove the formatted views byte-identical. This note does not claim the old validator was re-run on the formatted views. `validate-quotes.original.py.txt` is the exact earlier validator. Jonas: `jonas/report.md` carries a separate director header; its readable view is `jonas/report.md`, its exact header-epoch bytes are `jonas/report.md.original.txt`, and `jonas/report.original.md.txt` is the raw producer report without that header. The two are different files and are not asserted identical. `original-to-view.source-epoch.json.txt` and `sha256.source-epoch.json.txt` are the exact older private map and hash index of this packet, kept as inert snapshots.

Game fixes, retests and owner acceptance remain open. Nothing in this note changes a tester's words, a ledger row, a date, a route or a stated limitation.
