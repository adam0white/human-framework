# Design round retests, 2026-10-20

Five games whose testers still quit after the clarity follow-ups (ledger rows F-243, F-249, F-251, F-253, F-256 to F-259) got a reversible design change each. Each game's own doc records the change and the reason, so the owner can veto it. This folder holds the source-unread Codex playtests of the live builds, using the [canonical prompt](../../playtester-prompt.md) at 360×690 with touch emulation, from an empty working directory, plus one read-only adversarial Codex fun review per game. Reports are the testers' own words. Screenshots stayed in the driver's scratch folder and are not kept (each copy says so at the top). Absolute local paths were replaced by relative names or "(driver scratch)"; no other wording was changed.

| Game            | Design change                                                                                                           | Round 1                                   | Round 2                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------ |
| Murmur          | edition 0.3.0: suggestions against her leaning sometimes land; refusals can return later                                | Priya, murmur 052ad26, keep (`murmur.md`) | Tomás, murmur 60a10ec, keep (`murmur-round2.md`) |
| Voice (HF site) | conversation scenes are the main view; suggestions second                                                               | Leila, HF 222e472, mixed (`voice.md`)     | Marguerite, HF 210b2e1, quit (`voice-round2.md`) |
| Well (HF site)  | map-first phone layout; watch workers while ordering                                                                    | Hana, HF 222e472, quit (`well.md`)        | Omar, HF 210b2e1, quit (`well-round2.md`)        |
| Warren          | room safety shown before calling people in; first raid only scouts; edition 0.4.0 call stays active until the all-clear | Kofi, warren 96e84ba, mixed (`warren.md`) | Ines, warren a9abf2e, quit (`warren-round2.md`)  |
| Pass            | editions pass@5 and pass@6: a standing rota the cooks agree to; one staffing decision when it breaks                    | Tomasz, pass 7116cfc, quit (`pass.md`)    | Adaeze, pass 19419a9, quit (`pass-round2.md`)    |

Fun reviews: `fun-review-murmur.md`, `fun-review-voice.md`, `fun-review-well.md`, `fun-review-warren.md`, `fun-review-pass.md`.

Two sessions were tool failures and are not counted or kept: a Well session whose browser page was lost, and a Warren session whose local browser controller crashed on the opening screen. Each was rerun with a new persona.

Pass currency: the earlier "£600" versus "₺1,000" (scratch follow-ups report) was not a build change. The display code is the same at a606f2d and at the current build; the tester's own screenshot showed ₺600 at Monday close, so "£600" was the tester's transcription, and ₺1,000 was a later moment. The only change was a first-use gloss, "Turkish lira", in pass@5.

Ranked follow-ups: ledger rows F-268 to F-282.
