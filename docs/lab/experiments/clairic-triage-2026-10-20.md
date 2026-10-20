# Ledger triage bake-off: Clairic, Clef and small Workers AI models (2026-10-20)

Experiment #3 of the [frontier scan](../frontier-2026-10-20.md). The owner asked for Clairic ("Check this out … Clairic"), then, the same evening, widened it: "Clef is cool, too. I approve $5 spend for experiments." and "And other small LLMs hosted on Workers AI" ([owner directions](../../owner-directions-2026-10-18.md)).

## Result

- **Clef led on this sample, and it is the only model here built for the job.** Category 72% (79% on the 42 rows I was sure of), Cohen's kappa 0.68, verdict 72%, severity exact 62%, the same answer on every row on a rerun, about 0.35 s a row, $0.0003 a row at list price. The lead over Qwen3 is small: 36 against 32 correct categories of 50, with 8 rows only Clef got right and 4 only Qwen got right. On one labeller's labels that is a sample leader, not a proven winner.
- **Clef's confidence looks useful, on the same sample.** When its category confidence was 0.5 or more (18 rows), it was right 17 times. Below 0.5 (32 rows), it was right 19 times (59%). The 0.5 threshold was read off this sample, and it covers category only, not severity or verdict.
- **Clairic is the wrong tool for classification.** It has no choice or enum field: a `text` field returns a span of the input. Putting the category list into the input made it copy a word from the list, and it reached 56% on category, but it scored below the majority baseline on game, verdict and severity. Its game and verdict fields got bare option lists, without the descriptions the other arms had, so part of that gap is my setup. In 8 of 50 rows its "problem phrase" span lay in the printed lists (7 category words, 1 verdict word), not in the feedback.
- **The best small LLM was Qwen3 30B-A3B** (category 64%, kappa 0.59), close to Gemma 4 26B (60%). Llama 3.2 3B was weakest (44%). At temperature 0, Qwen, Gemma and Llama still changed 8% to 18% of their answers on a rerun. Mistral Small and Clef did not change any. Mistral's 52% depends on parsing: 11 answers were a JSON array, scored as missing; taking the first object instead gives 32 of 50, level with Qwen.
- **The words alone identify the game only partly.** The best was 58%, against an 18% majority baseline; some quotes name nothing game-specific. This does not matter in practice: an inbox run carries its game in the envelope, and a playtest file's path names it.
- **No model predicts "needs a game fix" clearly above the base rate.** Clef got 64%, the same as always answering yes; Gemma got 68%, two rows more. The question also measured two different things: the models were asked whether the words call for a change, and they were scored against the recorded routing, which depends on the lab's state (what is already fixed or frozen).
- **Spend: about $0.094 at list price** for every call in this experiment (12 runs of 50 rows plus probes), against a $0.50 cap. Some or all of it may have fallen within the free daily allocation (10,000 neurons, about $0.11); I did not check the dashboard. The $0.094 is computed from each response's token usage and the published per-model prices. It is not a billed amount.

**Recommendation: try Clef as an opt-in suggestion pass in `npm run lab:inbox`, with a person reviewing every label, after checking it on real inbox notes; not in `lab:ledger`; and do not adopt Clairic for triage.** Details are under "Adoption" below.

## What was tested

**Rows.** 50 of the 325 rows in the [feedback ledger](../feedback-ledger.md), drawn with a seeded shuffle (seed 20261020). Labels: [labels.json](clairic-triage-2026-10-20/labels.json).

**Labels.** I labelled two fields myself, blind to any model output:

- `category`: a closed set of ten. *bug, unclear, layout, pacing, difficulty, repetition, agency, delight, direction, tooling.* Each has a one-line definition in [bakeoff.ts](clairic-triage-2026-10-20/bakeoff.ts). I marked 8 rows `doubt` because two categories fit about equally (for example, F-029, "the cooks wandering", could be agency or difficulty). The "clear" column scores the other 42.
- `severity`: 0 none (praise or neutral), 1 minor, 2 real friction, 3 made the player quit or blocks play.

Three fields come from the ledger as it was triaged on 2026-10-19 and 2026-10-20, checked by me against each row: `game`, `verdict` (keep, quit, mixed, none) and `fix` (whether the row's routes include a game fix).

**Caveats.** I am one labeller, and I wrote the category definitions every model was given. I had seen the ledger's routes when I labelled, so my category and severity labels are not independent of the earlier triage. Fifty rows give wide intervals: on this sample, a 10-point gap between two arms is weak evidence.

**What each model saw.** Only the quoted words and the source kind, for example "Source kind: playtester / Feedback: …". The `who`, `source` and `game` columns were withheld, because they give the answer away ("valley 36324e4", `rope/docs/…`).

**Arms.** Every arm got the same category and severity definitions, in the form that arm accepts. Clairic's game and verdict fields got the bare option lists only (see Result).

- **Clef** (`@cf/cloudflare/clef`): `choice` questions for category, game and verdict; a `score` question over the four severity levels; a `noul` probability for fix.
- **Clairic** (`@cf/cloudflare/clairic`): `text` fields for category, game and verdict, with each list printed into the input so there was a span to copy; an `estimate` field (0 to 3) for severity; a `text` field for the phrase that names the problem.
- **Small LLMs**, one row per call, temperature 0, at most 200 output tokens, thinking off for Qwen and Gemma, a JSON-only prompt:
  - `@cf/meta/llama-3.2-3b-instruct`
  - `@cf/qwen/qwen3-30b-a3b-fp8`
  - `@cf/google/gemma-4-26b-a4b-it`
  - `@cf/mistralai/mistral-small-3.1-24b-instruct`

Every arm ran twice over all 50 rows. Calls went to the REST API with the existing `wrangler login` OAuth token, read inside the script and never printed. The machine's load average was about 100 to 165 during the run, so latencies are upper bounds.

## Scores

| arm | category (clear 42) | kappa | game | verdict | severity exact / MAE | fix | same on rerun | median / p90 ms | in+out tokens per row | USD per 50 rows |
|---|---|---|---|---|---|---|---|---|---|---|
| majority baseline | 16% | 0 | 18% | 40% | 30% | 64% | | | | |
| **Clef** | **72% (79%)** | **0.68** | 58% | **72%** | **62% / 0.42** | 64% | 100% | 349 / 556 | 1237+0 | $0.0148 |
| Qwen3 30B-A3B | 64% (71%) | 0.59 | 54% | 64% | 52% / 0.54 | 58% | 82% | 465 / 654 | 636+34 | $0.0022 |
| Gemma 4 26B-A4B | 60% (64%) | 0.55 | 58% | 70% | 48% / 0.64 | 68% | 84% | 1095 / 1286 | 637+46 | $0.0039 |
| Clairic | 56% (64%) | 0.50 | 12% | 34% | 28% / 1.02 | n/a | 92% | 313 / 383 | 2055+0 | $0.0103 |
| Mistral Small 3.1 24B | 52% (57%) | 0.47 | 44% | 44% | 46% / 0.65 | 44% | 100% | 1761 / 4113 | 640+58 | $0.0128 |
| Llama 3.2 3B | 44% (52%) | 0.38 | 40% | 54% | 46% / 0.75 | 42% | 92% | 397 / 557 | 658+36 | $0.0023 |

Mistral Small answered 11 of the 50 rows with a JSON array of two answers instead of one object. Those 11 are scored as missing, so its row measures format discipline as well as judgement.

The table was generated by [score.ts](clairic-triage-2026-10-20/score.ts). The raw responses are in [raw/](clairic-triage-2026-10-20/raw/), and the numbers in [results.json](clairic-triage-2026-10-20/results.json).

- **Category.** One of the ten categories.
- **Kappa.** Cohen's kappa, which is agreement corrected for chance.
- **Severity.** Clef's probability-weighted score, rounded; Clairic's median; the LLM's integer.
- **Same on rerun.** The share of rows whose answers were identical on the second pass.
- **Clairic, fix.** Clairic has no yes/no field, so there is no fix score.

**Where Clef went wrong.** It made 14 category errors. Five were rows I had marked `doubt`, including F-343, which I labelled bug and Clef read as delight. Most of the other nine were near neighbours, but not all (F-127, agency read as bug):

- agency read as unclear, or pacing read as unclear;
- harness quit reports read as tooling (F-157, F-068);
- one positive "keep" with a reservation read as pacing (F-250).

These are the same splits a second person would argue about. The lab should not take a wrong label from them on trust.

## What Clef is

Clef is a separate Cloudflare model, not the owner's name for Clairic. The [model page](https://developers.cloudflare.com/workers-ai/models/clef/) lists `@cf/cloudflare/clef` and a faster `clef-flash`. Both are confirmed from that page.

- **Input.** A state (text, structured data, or up to four images) and up to 64 questions.
- **Question types.** A question is `choice` (named options, each with a description), `score` (ordered levels) or `noul` (a probability).
- **Output.** Probabilities, not generated text.
- **Price.** $0.24 per million input tokens; output tokens cost nothing.

In Cloudflare's own framing, Clairic extracts typed values, Clef decides among listed options, and an LLM writes text ([frontier scan §1](../frontier-2026-10-20.md)). This bake-off agrees with that split. Labelling feedback is a choice among listed options, so Clef did better than both Clairic and the LLMs.

## Adoption

- **`npm run lab:inbox`: a trial, as a suggestion.** It is a small, separate change, proposed here and not made yet. This test used curated ledger quotes; the inbox would see raw run notes. Before relying on it, label 20 real inbox notes by hand and compare.
  - **The change.** Add an opt-in flag, `--suggest`. It sends each new opt-in run note, with words only, to Clef: one call per note, $0.0003. It shows the suggested category, severity and verdict, with Clef's confidence, beside the note in `.lab-inbox/index.html`, labelled "suggested by Clef".
  - **Order.** Notes with confidence below 0.5 are listed first, for a person to read.
  - **Limits.** Nothing is written to the ledger automatically. The verbatim words stay the record, and the game comes from the envelope.
  - **Cost.** At about 1,250 input tokens per note, 1,000 notes cost about $0.30.
  - **Privacy.** Run notes already sit in Cloudflare R2 under the owner's account. Clef runs on the same account and provider.
- **`npm run lab:ledger`: no.** It does not classify anything. It checks rows a person or agent has already triaged and builds `curated.json`. Routing (fix, lesson, HF request, calibration) depends on the lab's current state, and no model here predicted the fix decision above the base rate.
- **Clairic: not for triage.** Its useful part here was the problem-phrase span, and that needs a longer input than a 40-word quote to be worth anything. A later, separate test could try it on whole playtest transcripts, pulling out quit times and quote spans with offsets. That would be extraction, which is what Clairic is built for.
- **Small LLMs: no.** Qwen3 30B-A3B is the cheapest reasonable fallback if Clef is withdrawn. On this task it scored below Clef, changed some answers on a rerun at temperature 0, and its answer sometimes arrived in the `reasoning` field instead of `content`, a parser quirk the scorer had to handle.

**Outcome (2026-10-20).** On the coordinator's direction the check on real inbox notes was run the same day, and Clef held up ([trial](clef-inbox-2026-10-20.md)). `npm run lab:inbox -- --suggest` is now an opt-in flag that uses the whole-note form.

## Spend record

| item | list-price USD |
|---|---|
| Probes (8 single-row calls) | 0.002 |
| Clef, 2 × 50 | 0.030 |
| Clairic, 2 × 50 | 0.021 |
| Mistral Small, 2 × 50 | 0.026 |
| Gemma 4, 2 × 50 | 0.008 |
| Llama 3.2 3B, 2 × 50 | 0.005 |
| Qwen3 30B, 2 × 50 | 0.004 |
| **Total** | **about 0.094** |

The total counts against the experiments budget the owner approved on 2026-10-20 ($5). The cap for this experiment was $0.50, enforced per process in the script.

## Review

A Codex contrarian review (2026-10-20) checked these conclusions against the data. I checked its numeric points against `labels.json`, `results.json` and `raw/` and accepted them:

- the clear-row count (42, not 43);
- Gemma's fix score (68%);
- Clef's five errors on doubtful rows;
- Clairic's eight spans in the printed lists;
- Mistral's score under first-object parsing.

The Clef-only and Qwen-only counts (8 and 4) are the reviewer's; I did not recount them. I also accepted its framing points: the bare lists Clairic got, the gap between the inbox and the tested quotes, and that the confidence threshold was read off the same sample. Its verdict on the recommendation was "survives as an opt-in trial with human review, pending validation on actual inbox notes". The recommendation now says that.
