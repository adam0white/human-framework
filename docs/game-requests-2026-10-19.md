# Game requests to HF, found in the feedback ledger (2026-10-19)

Source: [lab/feedback-ledger.md](lab/feedback-ledger.md), seeded 2026-10-19. These two requests were not in [game-requests-2026-10-18.md](game-requests-2026-10-18.md) or in any game's `hf-requests.md` on this date. Every other HF request the ledger touches is already filed there and is cited by title. "Confirmed" means read in a file. Nothing here is triaged yet: the coordinator decides targets.

## N1 — Travel or setup cost on an offer

- **Source.** Neighbours, `docs/neighbours/hf-requests.md` item 3 on the `neighbours` branch of `concordia` ("Travel time is free in choice", 2026-10-18, Phase C). The visitor review in the ledger (F-090) saw the same thing as play: Sam walked home twice in a few hours just to drink water.
- **Confirmed (by the game's own measure).** A drink at home scored by `need:water` alone, the same as a drink where the person stood, and the 30 to 60 minute walk had no cost. Residents walked home to drink 2,787 times in 8 days (208 people, seed 42).
- **Host fix.** The host stopped offering water only at home. The long route is gone, so the gap is hidden, not closed.
- **Proposal.** An optional travel or setup cost on an `Affordance` that choice weighs against what the offer advertises, or a documented recipe for expressing it through `effort` or `duration`. Generic: any game with places.
- **Not yet checked.** Whether `effort` and `duration` already express this. The game author asks for a documented recipe as an acceptable answer.

**Outcome (2026-10-20):** done in HF 2.9.1 as the host-kit travel-cost recipe ([host-kit](host-kit.md#declare-travel-and-setup-cost)).

## N2 — The evening lapse line is one template, and it blames the person for what another voice ordered

- **Source.** Two ledger rows: F-034 (Pass, rule-breaker) and F-045 (Glance, Priya). Glance's Tomás reported the same lines on every debrief (not a separate row).
- **Confirmed (read in `packages/human/src/review/review.ts`, `reviewLine`).** A lapse always reads "I didn't keep <list>. Next time I'll be ready when it comes." (accounting style) or "I keep going back over <list>." (ruminating style). There is one sentence per style, for every person and every night.
- **What players saw.** Pass: the same line on all three cooks and again at the next day's open, including for a lapse the player ordered ("blaming themselves for things I ordered", rule-breaker). Glance: the line in every debrief, "even on a night when the dam went over". Both reports call it a template.
- **Assumed (not confirmed).** That HF would excuse a lapse caused by an insisted order. The module comment says exemptions, sleep and necessity are excused. Compliance under protest is not on that list.
- **Proposal.** (a) A deterministic choice among several phrasings per style, from person and day, never from the RNG stream (the same rule as rank 4 of the 2026-10-18 triage). (b) An optional host input that names a lapse's cause (for example `ordered`) so the line and the resolve can change. Batch with the engine 2.9 narration items.
- **Host workaround today.** Pass and Glance compose their own lapse lines.
