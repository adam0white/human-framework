# Handoff — HF (Human Framework)

Updated 2026-10-04. Read [AGENTS.md](AGENTS.md) for direction, done-definition and rules; [docs/framework.md](docs/framework.md) for architecture.

## Goal 1 (done): HF v1.0

Package installable, documented and consolidated; Game 1 *Twice at the Well* and Game 2 *The Day You Say Nothing* live. Accepted by the user on 2026-10-04 ("Congrats team on HF v1.0"). Tag `v1.0.0` = 456c794, the release the user played. Phase history: 0 archive + workspace; 1–2 faculties, cognition, will, community driver (10d0723); 3 Game 1 (5466c8c); 4 framework deepening for Game 2 (engine 1.2.0); 4b Game 1 v2 (11c67c5); 5 Game 2 (9ad6fde); 6 package + final review (456c794). After acceptance: playtest rounds 5–7 for both games (live at abde83c), engine 1.6.0 closing the five RimWorld blocking gaps (e73b94d), timing moved to `npm run bench` (59b4ed2).

## Goal 2: HF 2.0 + The Night Watch

Done means (AGENTS.md): HF 2.0 released on GitHub, closing the blocking gaps in docs/rimworld-gap.md plus the long-run faculties Game 3 needs (aging and experience over years, heredity, social effects), each tested; CI runs check and benchmarks; performance, quality and security reviews done and acted on; *The Night Watch* live at /watch/ with endless play and a playtest export; Games 1–2 upgraded to HF 2.0. The user accepts by playing Game 3.

| # | Phase | Status |
|---|---|---|
| R0 | Releases and CI: tag v1.0.0, release v1.1.0 (engine 1.6.0 gaps) on GitHub; version policy; GitHub Actions running check + bench (hyperfine) | done: GitHub releases v1.0.0, v1.1.0 (33f9e89, engine 1.6.0; known issue: replays differ across platforms) and v1.2.0 (f85c825, engine 1.7.0: faith defaults, make-up debt, portable math in core/libm). CI green on main (run 37195428751). Live site at f85c825 shows framework 1.2.0 and the /watch/ prototype |
| R1 | Faith decisions in code ([research/decisions.md](research/decisions.md)): Fajr ends at sunrise, majority Asr, red shafaq, Eid prayer on, qada debt with blame lifted for sleep/unconsciousness; Game 2 rebalanced; playtest export (seed + input log + state JSON, replayable) in Games 1–2 | merged, not deployed (engine 1.7.0; Game 2 eighth pass in docs/games/voice-build.md §13: no retune needed; export about 39–46 KB for Game 2, 31 KB for Game 1). Open: the Eid-prayer commitment's missed cost (findings) |
| R2 | Reviews: performance, quality, security, acted on; phone research (Galaxy S26 viewport) and mobile web practice (fullscreen, input capture, safe areas) | reviews written (docs/reviews/2026-10-04-*.md); Cloudflare HSTS + TLS 1.2 applied; fix pass in progress (town.ts out of the framework, headers, phone fullscreen/wake lock/safe areas, perf, quality) |
| R3 | HF inventory: what HF has vs the full ambition ([docs/hf-status.md](docs/hf-status.md), [docs/faculty-inventory.md](docs/faculty-inventory.md)) | done |
| G3-0 | *The Night Watch* spec revised for endless play (aging, natural death), visual UI and the game direction in AGENTS.md; wildcard and adversarial reviews | in progress |
| G3-1 | Plain tower defense, no HF; gate: dusk planning against the warning matters | merged, prototype at /watch/: gate passes (24 seeds × 3 nights, mean sacks lost of 20: matched plan 5.7, no plan 14.4, mismatched 16.4); design review applied (docs/games/watch.md "G3-1 as built"). Open: dusk at 1/16 starts the night on its own vs holding at dusk; rope mends by a fixed amount until G3-2; two-section warnings (G3-2 or G3-3); `sim/plans.ts` test-only code in src |
| G3-2 | People on HF (commanded bell, breaks, injuries, outsiders); gate: a tester names one watcher's fear and one bond within three nights | |
| G3-3 | Season and endless play over years; long-run faculties in HF (aging/experience, heredity, social effects) | |
| G3-4 | Phone, playtest export, deploy /watch/; user playtest | |
| H2 | HF 2.0 release; Games 1–2 upgraded; deploy | |

## Current position

Goal 2 started 2026-10-04. Live: f85c825 (HF 1.2.0, engine 1.7.0; Games 1–2 with playtest export; Game 3 prototype at /watch/).

Open, recorded in docs/findings.md and docs/games/voice-build.md §13:
- Game 2: with advice heard for the running activity (engine 1.5.0), the shift whisper gives about 6–7 full shifts and the date kept on R14 (was 27 fragments, R11). Whether the between-day whispers are too decisive is for a playtest to judge.
- Game 2 smoking: walks lower the after-meal habit (0.60 silent to 0.26 with an urged walk), but cigarettes on Eid stay at 3–5 and the hour-10 habit is untouched. Possible, hard, and noisy on Eid by design; a playtest should judge whether it reads as progress.
- Game 1: landscape and large text untested.
- Halil naps ~3 times a day: flat daytime utilities; a nap gate broke other behaviour and was reverted. Needs utility recalibration first.
- Game 2, prefill play: Halil no longer calls Selin himself on Eid (Maghrib wins at his habit's minute); he calls 5 times in the six days after.
- Game 2: a missed date leaves Osman's relationship to Halil unchanged; only his late demand strengthens (findings, seventh pass).
- Game 1: Classic with no orders roofs the house on 3 of 6 seeds; orders cannot starve the Human store; the late-tap moment-1 dependency.
- Joint activities are one-sided in the driver; `social.judge` has no habituation outside conversation.
- Timing budgets moved out of `npm run check` into `npm run bench` (2026-10-04). Measured alone on the Apple Silicon dev machine, 3-run medians: village 20 × 30 days 1555 ms (budget 2000), 50 × 30 days 3693 ms (5000), body threshold 0.6 µs/call, Game 1 director run 276 ms (1500) and balance runs 1203 ms (5000), Game 2 12-day skip 287 ms (1500). The framework bench runs with Vite's module runner off; under the runner the 20-person run takes ~2.4 s (findings, 2026-10-04 item 7). CI (from R0) runs the bench at 3× budgets as information, not a gate. hyperfine, `node scripts/bench-village.ts` (20 × 30 days, full run, 59190 events, including Node start-up), M4 under other agents' load (load average ~6–7): 1.914 s ± 0.057 s, range 1.829–1.993 s, 10 runs (2026-10-04).
- TS 5.x consumers untested.
- Naughty players (user, 2026-10-04) merged: Tempter, Saboteur and a good Guardian in apps/site/src/voice/sim/players.ts; table in docs/games/voice-build.md §13 "Ninth pass". Player choice moves smoking (7 to 29 days), sleep and trust widely; insisting backfires (Saboteur trust 0.01); bad play cannot reach rent, clinic or Selin because silence already fails them and the between-days card offers only helpful whispers. Next, after the R2 fix pass moves town.ts into the game: fix interrupted work paying and restarting the same day (gives the Saboteur the date), limit the afternoon-rest whisper to Dhuhr–Asr (it causes 18 excused fast breaks), add tempting whispers (e.g. "Osman can wait"), re-measure. Fonts stay on Google Fonts (user: fine, cached by Cloudflare); security headers are tuned deliberately via Cloudflare settings and `_headers`.
- [docs/faculty-inventory.md](docs/faculty-inventory.md): 142 faculties from the v0 research proposal, 65 Done / 33 Partial / 38 Missing / 6 Excluded, checked against code; plus 16 v0 approaches worth keeping. For G3-3/L1: wire skill transfer (exists in skills.ts, never passed), `learningMultiplier`, teaching that raises learning, observational learning.

## Decisions

Contested religious points are decided in [research/decisions.md](research/decisions.md) (user, 2026-10-04: most common position overall, post-sectarian, pragmatic, no scholarly review). Implementation is phase R1.
