# The Pass — LIGHT same-tester retest, 2026-10-30

Remaining: reproduce and fix the new takeover/recovery blockers, then run the second same-tester retest. Pass is not finished. Source integration of this packet is pending the HF source-window handback. Game readiness still belongs to Adam.

Build: live b6e919a8601554aa2aac34045286f1b3cf8f9245, HF4.12.0, dirty:false. Release manifests before all sessions and after collection agree. Collection ended2026-10-30T20:01:20Z. Earlier full R1 is pass/docs/playtests/panel-2026-10-27.md at9930eef (live dc0eda1/HF3.0.0). This is the first fixed-build retest under the owner's LIGHT ruling.

Four returning standing testers: Maya, Emre, Nia, Rosa, each given only their own R1 report. One new never-HF cold tester: Amal Haddad. Four Sonnet low, one Opus low. Each used separate fresh Chromium contexts at360x690 touch and1280x800 mouse/keyboard. At most two full testers/four browser sessions concurrently. No owner profile was used. These are fictional synthetic observations, not human recruitment or population evidence.

The four returners describe conditional returns. The cold tester declines the current build and leaves open a return after a fix. Full original wording is in each report. Voluntary stop reasons and actual elapsed seconds come from the raw driver logs. No timed limit cut any session short.

## What changed in the returning players' words

- Maya: “Both cooks told me their stories right away, answers show where I asked.” Follow-up options and Dilek's story were reached.
- Emre: “Orders now show how long they wait and the lira at risk. That is the visible tradeoff I wanted.” He also reached Tuesday and the repeat-plan shortcut.
- Nia: “Greyed People offers now say why: busy with work or break, ask when free. Better than last time. Will retry later.”
- Rosa: “Station and rush are now explained at the top. I open the doors.”

These observations do not close every R1 ask. Money growth, waiting, repeated wording and planning clarity remain conditional return concerns.

## Blocking asks handed to games-deferred

F-2166: An accepted takeover answer needs a visible, understandable result and must not appear as the same unanswered question with a moving deadline. Amal's desktop Leave the station empty taps at96.198,129.352,158.561,179.430seconds were accepted. Phone Ask Dilek to take over at435.246seconds was accepted; the claimed return to cold side is a player observation requiring reproduction. b-003.png shows Dilek labelled free at the pass beside a19-minute uncovered-station prompt. No simulation cause is established.

F-2167: Explain a cook's actual absence/refusal in the main view and make the available recovery legible. Amal stopped both sessions after repeated toilet-first refusals without a visible departure or recovery. Preserve the need and the refusal; establish whether the cook can actually act on it. Maya's assumption that a conversation caused a departure remains uncertain. The main-view status, response and actual activity need to agree.

F-2168: Make the specific default first-order coverage risk clear before opening. Rosa stopped when Selim's default meal break left the grill empty and Dilek declined. The early-table/planning warning exists (Emre and Amal saw it); do not claim it is absent or make the default automatically succeed. Reproduce whether a short explicit coverage consequence addresses her ask.

F-2169: Remove duplicated need clauses in the displayed answer while retaining the real need and individual reply. Maya and Nia report repetition; the director viewed Maya phone/a-002.png and confirmed repeated bathroom-first/toilet-first clauses. Nia names this as new return-blocking wording. Route shared narration to all if reproduction identifies a framework cause.

Targets:2026-11-03. Retest only after the chosen fixes are deployed with an exact clean manifest. Do not reduce difficulty, remove refusals, auto-cover stations or remove bodily needs to obtain positive verdicts. A new blocking ask keeps the game open; after a second fix/retest iteration remaining issues become dated Deferred entries.

## Other retained asks

F-2170 waiting/slowed time even on Fast; taste ask, not a demonstrated human-speed timing defect. F-2171 visible route to the Saturday sum and per-night/table growth. F-2172 how to follow Selim's later Nevin invitation. F-2173 carry on from a save (Resume was not tested; no save defect established). F-2174 shorter repeated planning quotes. F-2175 readable desktop order cards (director viewed Emre desktop/a-002.png; one ingredient label is clipped). Target2026-11-10, except save inspection2026-11-03. Raw asks remain distinct from these coordinator routes.

## Evidence limits

- The initial CLI reports retain final replies without tool transcripts. Image viewing there is self-reported. Maya initially did not view phone images; Nia did not view desktop images. Two separately labelled short fresh return visits supply those observations, with Read-tool receipts. They do not replace original diaries, verdicts or elapsed checkpoints.
- Several testers logged first_minute before60seconds. Those tags are invalid as first-minute checkpoints; use raw elapsed_s. Early pulses are not valid three-minute checkpoints. No retrospective timing is accepted.
- Amal's desktop private-talk invitation at203.492seconds was disabled. Its apparent no-answer is NOT an accepted-input failure. Nia's Insist tap does not establish hold-to-insist; the driver cannot hold a button. Timing complaints were not reproduced at human speed and are not routed as timing defects.
- Rosa and Amal used both Feedback labels; the separate supplements used I'm stopping. Labels filled the note box. No tester typed a note or tapped Submit/Send in the logs. Linked runs use labRunSource=agent; no fake player note was submitted.
- As in panel-1027a, no continued-exposure arm or A Dark Room control. No paired-arm or instrument-calibration claim.
- Initial seeds were not captured or matched; this is not a matched-state causal comparison. Reported ingredient-count differences do not establish their cause. Export replay and Resume were not tested here.
- The earlier private panel-1027a folder was removed by scratch cleanup. This packet retains current raw reports/logs, and the dispatched own-history files were copied before that deletion. No claim that all historical raw artifacts survive.

## Files

Each tester folder has the complete producer report copied byte for byte as report.original.md.txt, a formatted report.md view, and both raw wall-clock.jsonl files. Original reports can contain estimates, report errors or paraphrases; canonical diary words are reaction fields in the raw logs. Formatting changes only the readable view; original-to-view.json records the exact original hashes. Operational JSON metadata may be formatted without changing its values. Supplements are separate. screenshots-manifest.json identifies retained private screenshots by SHA256; a capture alone is not a view receipt. sha256.json binds this packet's raw files. Five logical tester ledger rows are reserved F-2161–F-2165; routed asks are F-2166–F-2175. Canonical ledger integration is pending.

Additional retained ask F-2176: Nia wants an effect from an ordinary Insist tap. Hold-to-insist is not operable in this driver, so this is not a demonstrated game input defect. Review2026-11-10. The logical-tester-ledger files preserve the complete opening return passage; each original report also preserves its later, sometimes different return passage. Amal is coded quit for the current build because she explicitly says she would not come back on her own; her future-fix condition stays verbatim.

Three coordinator-viewed screenshots are retained in evidence/: duplicated-need-clauses.png, order-cards.png, takeover-prompt.png. They support displayed-wording/layout observations; they do not establish the underlying simulation cause.
