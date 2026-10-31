# The Glance LIGHT panel — first fixed-build retest (prospective source packet)

Date 2026-10-31. Prospective docs path: `docs/lab/reviews/light-2026-10-30/glance-retest1/`. No CLEAR and no completion verdict is claimed here.

## Remaining

- Canonical import into docs, diary and ledger is pending.
- Director accepts the bounded leads below for GD reproduction/fix, with the stated qualifications. Canonical import and exact source review remain pending.
- New blockers to route for target2026-11-03: Rosa's call sentence repeated under all six turns buttons, and Ida's Tuesday weir scale and phone inspection-panel reach (F-2355, F-2358, F-2360).
- Existing asks F-2198–F-2209 remain open. This packet is the **first fixed-build retest**, not a completed second iteration.
- Ledger rows F-2361–F-2370 stay unused. No later ask was materially distinct from the ranked asks, so no rows are invented.

## What this is

Five fictional people played the same build on two devices each: ten stops. Build: clean `2e3fd995fb3ed855b4fe75eaa8e449fe2914cc7f`, framework HF4.14.0, `dirty:false` in every completion pin and every release-start (`checkpoint-facts.json`).

- Four standing players returned: Mei Tan, Samir Haddad, Leila Mansour, Rosa Alvarez (Sonnet).
- Ida Mikkelsen is genuinely new and cold, with an empty history (Opus). Her empty-history line is in `ida/own-history.original.md.txt`.
- Device orders: Mei desktop→phone, Samir phone→desktop, Leila desktop→phone, Rosa phone→desktop, Ida phone→desktop.

## Attribution limits

- The driver is `native-tap-v2`, which differs from the initial round's driver. Changes between rounds cannot be credited solely to the game fix. The approved instrument record is `inputs/native-tap-v2-approved.json`; `driver_check` is `fork-unverified` there.
- The v2 driver's input status acknowledges physical input. It is not proof of the intended game outcome. Ida's unwanted "This week's mornings" dialog and her scroll that did not move the view might be an instrument issue. That is not established either way.
- No injected or fake feedback was submitted. All ten sessions chose a stopping or confused label, typed no note and pressed no Submit.
- The supported SDK field is `runSource:agent` through `labRunSource=agent` (`dispatch.json` linkedEnvelopeSource). No production agent receipt was independently read.
- No pixels and no full transcripts are in this packet. Screenshots were seen by testers; their descriptions are only their own words. The director has not independently viewed these images in this packet.

## Session facts retained

- Each person's first voluntary stop is retained, including tiny sessions: Rosa phone 26.1 s and desktop 19.8 s, Samir phone 75.3 s. See `checkpoint-facts.json` for all stops.
- Leila's desktop pulse at 172.387 s is premature (before 180 s). Her report says so. The raw line stays and is not a valid scheduled checkpoint.
- Rosa wrote no first-minute tag on desktop and none of her sessions reached 60 s or 180 s. Lines of kind `first_minute` with op `shot` at about 60 s, and the `ceiling` BUDGET stop at 1200.006 s in Ida's phone log, are automatic driver lines with no tester words. The BUDGET line follows her voluntary stop at 542.2 s and is not a second quit.
- Actual clock 30 s waits are intentional CLI `wait` ops. Raw logs show no timeout error in any session; Ida has one stale-name no-press refusal, retained separately (`rawTimeoutErrors` is empty in `checkpoint-facts.json`). Samir's wording "about 30 real seconds per step" is his experience, not a driver-stall claim.
- Silent 1 turn: Leila's desktop 1-turn request produced no visible outcome. This is observed pending/refusal unknown. It is not a simulation defect and not a guaranteed lost action.

## Differences kept, not flattened

- Mei saw the phone Dai strip still clipped on the right. Samir saw the sketch and gauges fully on screen at 360x690. Both are their own words.
- Ida did see a delayed "Marked for another check" a few seconds after pressing Doubt. Leila saw no mark after Doubt. Qualify, do not merge.
- Rosa's "caught" fold guess is untested: she did not open it. Ida wrote that the definition of "caught" was clear.

## History and exposure

- Rosa: the original round's supplied history carried an excluded Warren continued alternative, and that qualification stays (`inputs/prior-round-ask-ledger.md` is the prior ledger; the original qualification file is in the existing glance packet). Her retest `own-history.original.md.txt` states that body is absent. Her words are still not clean cross-game recognition evidence.
- Ida: two fresh games were required. Her desktop session came after her phone session, so what she learned on the phone is actual exposure within one person. It is not a separate cold person and not a save failure; she wrote "No sign it remembers my phone game; I expected that."

## Verdicts and conditional returns

Verdict words follow plain evidence. Four returns are conditional and are `mixed`: Mei (laptop, if the first hours hold a decision), Samir (desktop, if he can answer Dai and steps cost far less waiting), Leila (desktop, if nights ask for more than about four choices), Ida (new cold person, conditional desktop return, no phone return). Rosa's answer is a plain "No, not on my own" with a narrow reopening condition, so `quit`. Reasons per row: `logical-tester-ledger.json`.

## Routes

- target2026-11-03 for new blockers, delayed receipt, literal truth and narrow wording (`fix:glance`).
- target2026-11-10 for preferences: more decisions, pace, river panels.
- No route forces harder or more choices, freezes the clock or removes authored design or player autonomy. Readings stay a fallible person's knowledge: the weir scale ask is about meaning and gets no automatic hidden state or ground-truth reveal.

## Files

- `ledger-additions.md`: F-2341–F-2345 tester return rows, F-2346–F-2360 three ranked asks each. `ask-ledger.md`: prior F-2198–F-2209 rows plus F-2346–F-2360.
- `logical-tester-ledger.json` and `.md`: one row per tester. The primary return is the opening answer in each report. The later full return is the separate section 7 answer, kept exactly in the JSON.
- `exact-quote-extraction.json`, `validate-quotes.py` and `primary-quote-validation.json`: every span checked as an exact substring of the raw copies (report text or wall-clock reaction). Run `python3 -I validate-quotes.py`.
- Per tester: `report.md` and `report.original.md.txt` (producer reply, byte-identical), `completion.json`, `dispatch.json`, `validation.json`, `brief.original.md.txt`, `own-history.original.md.txt`, and per device `wall-clock.jsonl`, `release-start.json`, `driver.out`. All byte-exact copies.
- `inputs/`: plan, input freeze, native-tap-v2 approval, prior ask ledger. `glance-retest-audit.json` did not exist when this was built.
- `sha256.json` and `manifest.json`.

Nothing in the source tree, browser, network or git was touched.

## Director final method readback

`inputs/glance-retest-director-method-notes.json` and command-scope audit preserve four executed ls commands outside the curl-only protocol. Each listed only its own run-directory filenames, no file contents; effect unknown. Four malformed quotes failed before requests. Ida had no command-scope exception. Ida desktop227.577s stale level name was refused before input; no31s timeout. Raw maximumelapsed includes automatic poststop records, not further play. Exact5model/10driverPIDs are absent, no kill needed. Actual screenshot image-block Read receipts are retained in driver-audit; screenshots-manifest records hashes only, no pixels/full transcript.

The director read all5 complete producer reports. New blockers require second bounded fix and same-standing retest; game is unfinished. Rosa's repeated per-button paragraph is F2355; Tuesdayweirmeaning is F2358; phone inspectionreach F2360 needs actual naturalwheel/ancestorclip reproduction, instrument cause unknown. ExistingGDGlancefollowup retains sole ownership, no parallel fixer. Insist/refusal/indirectknowledge and game difficulty stay. Split pace/newscenes/preferences to dated owner review; no guaranteed assent or automatic hidden-state reveal. Full opening AND separate later returns are literal in each tester row. F2361–2370 unused.
