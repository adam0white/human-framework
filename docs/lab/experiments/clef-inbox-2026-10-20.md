# Clef on real inbox notes: the `--suggest` trial (2026-10-20)

This is the check that the [triage bake-off](clairic-triage-2026-10-20.md) asked for before Clef could join `npm run lab:inbox`. The coordinator directed it: "hand-label 20 real inbox notes, score Clef against them, and adopt it as opt-in in lab:inbox only if it holds up." It counts against the owner's $5 experiments budget for 2026-10-20.

## Result

- **There are only 11 real notes.** The lab inbox (R2 `private/index.json`, refreshed today) holds 16 runs. Five carry the note "integration test" from agents; the other 11 are the owner's. So I labelled two units, both before any model output:
  - **36 statements.** Single-topic sentences cut verbatim from the 11 notes. These give the 20-plus items the brief asked for.
  - **The 11 whole notes.** These are what the inbox actually shows.
- **Clef held up well enough to try, as an 11-note sanity check.** The 36 statements are correlated pieces of 11 notes, not 36 independent samples.

  | unit      | measure                                             | Clef                        | baseline            |
  | --------- | --------------------------------------------------- | --------------------------- | ------------------- |
  | statement | category                                            | 24/36 (67%)                 | majority 8/36 (22%) |
  | statement | category, clear rows only                           | 19/25 (76%)                 |                     |
  | statement | severity, exact                                     | 28/36 (78%)                 |                     |
  | statement | severity, mean absolute error                       | 0.22                        |                     |
  | statement | same category on rerun                              | 36/36                       |                     |
  | note      | verdict                                             | 11/11                       |                     |
  | note      | worst severity, exact                               | 9/11                        |                     |
  | note      | categories present (one `noul` per category, ≥ 0.5) | precision 0.89, recall 0.76 |                     |

  On statements, category was a little below the bake-off on curated ledger quotes (67% against 72%) and severity was better (78% against 62%).
- **What the aggregates hide.**
  - Clef got the exact set of categories on only 5 of the 11 notes; mostly it missed one.
  - The one note that reports a blocker (Good Hands, "Trial morning is stuck") got a severity score of 1.98, so it shows as "Real friction", not as a block.
  - Clef's verdict was right on all 11 notes, but its verdict confidence was below 0.5 on 7 of them, so the page's "low confidence" mark appears on correct answers. That mark carries no information on this sample.
- **One bias.** Seven of Clef's 12 category errors called a sentence `direction`. Most were praise or a request phrased as advice ("Find ways to improve the UI on mobile" is layout to me). A person reading the suggestion will see this quickly.
- **Category confidence still sorts statements.** At category confidence 0.5 or more Clef was right 14 of 18 times; below it, 10 of 18. This is statement-level category confidence, which the inbox page does not show.
- **Spend.** $0.0165 at list price for two passes of 47 calls. The cap was $0.05 per process. Median latency was 327 ms.

**Decision: adopted, opt-in.** `npm run lab:inbox -- --suggest` asks Clef about each note. It shows a verdict, the worst severity and the categories present beside the note, labelled as a suggestion to check. The whole-note form is used because the notes raise several things at once and the multi-label answer was the most precise.

- **No pass mark set in advance.** I did not fix a threshold beforehand. My criterion was "close to the bake-off, and safe as a suggestion a person reads". The result meets that loosely: category accuracy is 5 points lower, and verdict and severity are as good or better. For new notes, the mark to beat is the one set here: verdict at least 9 of 11, and no blocking note shown below "Real friction".
- **Changes from the review.** The page now flags a possible blocker when Clef gives the top severity level 0.25 or more. A Clef failure on one note no longer stops the inbox from being written.
- **What the flag does not do.** Nothing is written to the ledger, and nothing goes back to R2.

## Caveats

- **These notes were already public.** All 11 are already in the [feedback ledger](../feedback-ledger.md), and I had read their triage before labelling. One labeller, small n: 11 notes is a sanity check, not a measure.
- **The statements were cut by me.** Where I split a note sets the difficulty. Eleven of the 36 statements are marked `doubt`, because two categories fit.
- **Only owner notes.** Clef was not tried on testers' notes or on a note in Turkish.

## Files

- [labels.json](clef-inbox-2026-10-20/labels.json): statements and notes with my labels.
- [run.ts](clef-inbox-2026-10-20/run.ts): collect with `--pass=N`, score with `--score`.
- `raw.pass1.json`, `raw.pass2.json`: Clef's answers.

## Review

A Codex contrarian review (2026-10-20) found the headline arithmetic correct. Its verdict on the adoption: it "survives as an experimental, human-checked aid; fix failure isolation". I checked its points against the raw answers and accepted them:

- the 11-note framing;
- the 67% against 72% comparison;
- 5 of 11 exact category sets;
- the blocker shown as friction;
- category confidence is not the confidence displayed.

The code fixes are described under "Decision".
