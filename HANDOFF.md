# Handoff — Human Framework v1

Updated 2026-10-04. Read [AGENTS.md](AGENTS.md) for direction, done-definition and rules; [docs/framework.md](docs/framework.md) for architecture.

## Done means

`@human/framework` v1 installable + documented + consolidated, and two games live at https://human.adamwhite.work (generic colony sim before/after the framework; a suggestion-vs-will showcase game). User accepts by playing.

## Phase plan

| # | Phase | Status |
|---|---|---|
| 0 | Archive v0 (`archive/v0`, tag `v0.16-final`), TS/Vite/Vitest/Biome workspace, spine types + architecture doc, game-dev early review | done |
| 1 | Core faculties in parallel (core/body/lifecourse, needs/affect, memory/beliefs, skills/habits/social, conscience/agenda), each with tests | done (10d0723) |
| 2 | Cognition + will + narration + `person.ts` composite + `sim/` Community driver + headless reference scenarios | done (10d0723, 222 tests) |
| 3 | Game 1 *Twice at the Well* ([spec](docs/games/colony.md)): framework API gaps, shell + Classic, Human side, playtest, deploy | done, live at /colony/ (5466c8c) |
| 4 | Framework deepening steered by [Game 2 spec](docs/games/voice.md) §7 (multi-voice, abstention/fasting, chronicle, standing advice, cue recall, habit extinction, conversation/gossip/reputation, illness coupling, economy, life-course trajectories, lexicon) + town scenario | done (engine 1.2.0, 451 tests) |
| 4b | Game 1 v2 from the user's playtest ([record](docs/games/colony-playtest-2026-10-03.md)): goals, paused start, unified orders, harder balance, another day | done, live (11c67c5) |
| 5 | Game 2 *The Day You Say Nothing* ([spec](docs/games/voice.md), [build/as shipped](docs/games/voice-build.md)): two build+playtest rounds, engine 1.3.0 | done, live at /voice/ (9ad6fde) |
| 6 | Game 2 round 3, package installable + README/API/examples, final adversarial + game-design review, fix, final deploy | done, live (456c794) |

## Current position

All phases done; awaiting the user's acceptance by playing. Live release **456c794** at https://human.adamwhite.work (/colony/, /voice/), `@human/framework` 1.0.0. Round 5 playtest fixes are committed on `main` and **not yet deployed** (93d1f04, 10d69ef, 1ea0616, 7ec7a09, 14ee287, plus docs): engine 1.5.0, 562 tests. Game 1 fits a 360×740 phone. Game 2: ends read at Eid morning with the week after apart; voices' relations named; log fixes; the doctor's walk can wear down the smoking habit (voice-build §13, sixth pass). Game 2 seventh pass (design review, also undeployed: ae8ead8..cc6049c, 567 tests): the "He'd now do unasked" strip, fewer pauses, report and cards agree, Osman's missed date shown, a moment for each played day, 360 px skip card and composer, Lucide icons (voice-build §13, seventh pass). Installability proven by `npm pack -w packages/human` + fresh install + strict `tsc` + running the README quick start (see packages/human/README.md).

Open, recorded in docs/findings.md and docs/games/voice-build.md §13:
- Game 2: with advice heard for the running activity (engine 1.5.0), the shift whisper gives about 6–7 full shifts and the date kept on R14 (was 27 fragments, R11). Whether the between-day whispers are too decisive is for a playtest to judge.
- Game 2 smoking: walks lower the after-meal habit (0.60 silent to 0.26 with an urged walk), but cigarettes on Eid stay at 3–5 and the hour-10 habit is untouched. Possible, hard, and noisy on Eid by design; a playtest should judge whether it reads as progress.
- Game 1 at 360–390 px: the place and appeal rows scroll sideways; landscape and large text untested.
- Halil naps ~3 times a day: flat daytime utilities; a nap gate broke other behaviour and was reverted. Needs utility recalibration first.
- Game 2, prefill play: Halil no longer calls Selin himself on Eid (Maghrib wins at his habit's minute); he calls 5 times in the six days after.
- Game 2: a missed date leaves Osman's relationship to Halil unchanged; only his late demand strengthens (findings, seventh pass).
- Game 1: Classic with no orders roofs the house on 3 of 6 seeds; orders cannot starve the Human store; the late-tap moment-1 dependency.
- Joint activities are one-sided in the driver; `social.judge` has no habituation outside conversation.
- Timing budgets moved out of `npm run check` into `npm run bench` (2026-10-04). Measured alone on the Apple Silicon dev machine, 3-run medians: village 20 × 30 days 1555 ms (budget 2000), 50 × 30 days 3693 ms (5000), body threshold 0.6 µs/call, Game 1 director run 276 ms (1500) and balance runs 1203 ms (5000), Game 2 12-day skip 287 ms (1500). The framework bench runs with Vite's module runner off; under the runner the 20-person run takes ~2.4 s (findings, 2026-10-04 item 7). No CI, so budgets are only checked when someone runs the bench.
- TS 5.x consumers untested.

## Deferred questions for the user (non-blocking)

Sourced 2026-10-04 in [research/prayer-times-sources.md](research/prayer-times-sources.md), [research/fasting-sources.md](research/fasting-sources.md) and [research/eid-and-mourning-sources.md](research/eid-and-mourning-sources.md) (Diyanet, TDV and Hanafi fatwa sites; classical texts only cited via those pages; no qualified review). Each item is a code recommendation awaiting the user's yes; none is implemented. Per AGENTS.md "Games keep faith gentle", none of these should become a goal or scored mechanic in a game.

1. **Fajr ends at sunrise** (TDV "Vakit"; Hanafi fatwa sites; Diyanet's 7-minute sunrise temkin). `prayerWindow` in `packages/human/src/agenda/prayer.ts` runs Fajr to Dhuhr, which also covers the sunrise kerahat. Recommend: add `sunrise` to `PrayerTimes` (and `DEFAULT_PRAYER_TIMES`), have `townCalendar` in `scenarios/town.ts` supply a per-day sunrise, and end window 0 at sunrise. Treat the 7-minute temkin as a separate, labelled host choice. Isha to the next Fajr already matches the Hanafi validity bound; makruh after midnight stays unmodelled.
2. **Smoking breaks the fast is now sourced** (Diyanet Kurul fetva, citing al-Hidaya 1/120-121 and Radd al-Muhtar 2/371, 395, 410; Hanafi fatwa sites agree). Recommend: rewrite the comment at `town.ts` ~line 423 ("no source … in research/ yet") to cite `research/fasting-sources.md` §1, and the `agenda/prayer.ts` scope comment likewise; no behaviour change. If consequences are ever modelled: kaza is sourced (press relaying Diyanet); kefaret under Diyanet is unresolved (Hanafi fatwa sites say kaza + kefaret), so do not encode kefaret.
3. **Eid prayer window: after the sunrise kerahat until zawal; Hanafi wajib, so wajib for Halil** (TDV "Bayram"; Hanafi fatwa site; the blog hanafilegalrulings for "never after midday" and "no individual qada"). Today `eidPrayer` offers it at Fajr+120..Fajr+240 with no standing. Recommend: once sunrise exists (item 1), offer it from sunrise + kerahat (Diyanet's 40-50 min; other sites ~20; pick and label) until the Dhuhr time; day 2 only with an excuse; no individual make-up. Whether to attach the wajib standing (an engine norm with provenance) and whether to turn the flag on in Game 2 are the user's calls; either way it stays a quiet morning option, not a goal.
4. **Zakat al-fitr: due at Eid dawn, paid before the Eid prayer (recommended), after Eid makruh; Hanafi allows paying its value in cash; 240 TL per person for 2026** (TDV "Fitre"; Diyanet Kurul fetvas; Diyanet 2026 duyuru, which also sets 240 TL as the daily fidye). Owed for oneself and minor children only (Selin is an adult). Diyanet's nisab is net of basic needs *and* a year's debts, so Halil, owing Osman 600, may not be liable at all, making payment voluntary. Recommend: if added, an optional pre-prayer Eid-morning payment in the town ledger, liability computed from the ledger, the 240 TL to game-money mapping labelled as engineering; frame the before/after-prayer distinction as how the payment is classified, not as acceptance.
5. **Illness and fidya:** Diyanet gives kaza for a temporary or manageable illness and fidye only for permanent inability. Recommend: keep the town's make-up fasts for Halil's hypertension; note that applying this to hypertension is an inference (no Diyanet hypertension page found).
6. **Eid grave visit and first-bayram mourning are custom** (unattributed fetva.net page; Erzurum folklore; some regions visit on arife instead). No code change; cite `research/eid-and-mourning-sources.md` §3/§5 in the `visit-grave` comment.
7. **Tarawih**, if ever added: sunnah mu'akkadah, after Isha until dawn (Diyanet, TDV); the 20-rak'ah figure at Diyanet level is unverified.

Still open: which shafaq (red or white) and which Asr (Diyanet's one length or Abu Hanifa's two) a host uses; both are host choices to label. Kefaret for smoking under Diyanet. A qualified Hanafi review of all three notes.
