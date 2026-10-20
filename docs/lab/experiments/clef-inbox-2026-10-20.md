# Clef on real inbox notes: the `--suggest` trial (2026-10-20)

This is the check that the [triage bake-off](clairic-triage-2026-10-20.md) asked for before Clef could join `npm run lab:inbox`. The coordinator directed it: "hand-label 20 real inbox notes, score Clef against them, and adopt it as opt-in in lab:inbox only if it holds up." It counts against the owner's $5 experiments budget for 2026-10-20.

## Result

- **There are only 11 real notes.** The lab inbox (R2 `private/index.json`, refreshed today) holds 16 runs. Five carry the note "integration test" from agents; the other 11 are the owner's. So I labelled two units, both before any model output:
  - **36 statements.** Single-topic sentences cut verbatim from the 11 notes. These give the 20-plus items the brief asked for.
  - **The 11 whole notes.** These are what the inbox actually shows.
- **Clef held up.**

  | unit | measure | Clef | baseline |
  |---|---|---|---|
  | statement | category | 24/36 (67%) | majority 8/36 (22%) |
  | statement | category, clear rows only | 19/25 (76%) | |
  | statement | severity, exact | 28/36 (78%) | |
  | statement | severity, mean absolute error | 0.22 | |
  | statement | same category on rerun | 36/36 | |
  | note | verdict | 11/11 | |
  | note | worst severity, exact | 9/11 | |
  | note | categories present (one `noul` per category, ≥ 0.5) | precision 0.89, recall 0.76 | |

  The statement scores are close to the bake-off on curated ledger quotes (category 72%, severity 62%).
- **One bias.** Seven of Clef's 12 category errors called a sentence `direction`. Most were praise or a request phrased as advice ("Find ways to improve the UI on mobile" is layout to me). A person reading the suggestion will see this quickly.
- **Confidence still sorts.** At category confidence 0.5 or more Clef was right 14 of 18 times; below it, 10 of 18.
- **Spend.** $0.0165 at list price for two passes of 47 calls. The cap was $0.05 per process. Median latency was 327 ms.

**Decision: adopted, opt-in.** `npm run lab:inbox -- --suggest` asks Clef about each note. It shows a verdict, the worst severity and the categories present beside the note, labelled as a suggestion to check. The whole-note form is used because the notes raise several things at once and the multi-label answer was the most precise.

- **No pass mark set in advance.** I did not fix a threshold beforehand. My criterion was "no worse than the bake-off on the comparable fields, and safe as a suggestion a person reads", and the result meets it.
- **What the flag does not do.** Nothing is written to the ledger, and nothing goes back to R2.

## Caveats

- **These notes were already public.** All 11 are already in the [feedback ledger](../feedback-ledger.md), and I had read their triage before labelling. One labeller, small n: 11 notes is a sanity check, not a measure.
- **The statements were cut by me.** Where I split a note sets the difficulty. Eleven of the 36 statements are marked `doubt`, because two categories fit.
- **Only owner notes.** Clef was not tried on testers' notes or on a note in Turkish.

## Files

- [labels.json](clef-inbox-2026-10-20/labels.json): statements and notes with my labels.
- [run.ts](clef-inbox-2026-10-20/run.ts): collect with `--pass=N`, score with `--score`.
- `raw.pass1.json`, `raw.pass2.json`: Clef's answers.
