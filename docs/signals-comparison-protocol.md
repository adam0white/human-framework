# Last Light representation comparison: fixed protocol

2026-09-08. Commit this file before implementing or executing the comparison. This protocol is a new bounded host test; previous observation-memory evidence remains unchanged.

## Providers and common decision rule

Use the unmodified public host, frozen Human/runtime 0.1.1 and private memory candidate 0.1.0. Notebook applies the public `retainReport` function to full delivered reports. Candidate uses capacity 2 and lifetime 60 minutes; no episode exceeds minute 32, so expiry cannot create a result difference. No-retention uses only a report delivered at the current decision minute, or null after that minute. This current *delivery* may itself describe an old observation; do not confuse it with world truth.

All arms receive the same paid host requests, minute-by-minute advances and delivered receipts. Host transcript/notebook and hidden landing are inaccessible to the controller. The shared adapter advances candidate time with host time and delivers each increasing receipt once. All arms see the same available travel actions, prices and deadline. Choose canal iff the supplied report says open; otherwise choose ridge. A failed canal attempt gets the same immediate ridge fallback, without free observation. If an action is refused, record it and end at closing without inventing a substitute. Compare complete host and provider state after restore after every input with uninterrupted execution.

## Fixed cases

Notation: `lookout` advances its full 3 minutes; `radio` its full 1 minute; a number advances to that absolute minute. Query after the last operation.

| Case | Situation | Common paid exposure schedule |
|---|---|---|
| no-observation | steady | none, query 0 |
| visible-open | steady | lookout, query 3 |
| retained-open | steady | lookout, 4 |
| visible-closed | turning | lookout, query 3 |
| changed-report | turning | lookout, lookout, query 6 |
| old-reply-turning | turning | radio, lookout, 6 |
| old-reply-falling | falling | radio, lookout, 6 |
| undisclosed-close | falling | lookout, 5 |
| undisclosed-open | turning | lookout, 5 |
| paid-radio | steady | radio, 6 |
| late-old-reply | falling | 16, radio, lookout, 22 |
| deadline-tie | falling | 20, radio, 26 |

Also execute immediate ridge and immediate canal in all four situations. These have different information costs from the matched-provider matrix and must be reported separately. Immediate ridge is expected to complete the primary lens delivery in all four situations; it cannot release the before-12 launch. This is a strong simpler strategy, not a memory-free arm secretly receiving free information.

## Outcomes and rejection conditions

Record every delivered report including observation/delivery time, all selected actions/refusals, complete final outcome, paid time/resources, first-report agreement with current hidden landing (oracle diagnostic only), whether primary delivery succeeds, whether the launch sails, failed crossings and serialized provider bytes. Report agreement is not human accuracy and a hidden change can make proper retention disagree with truth. Preserve paid failed attempts and deadline ties. There is no optimization, seed search, expiry sweep, capacity tuning or weighted victory score.

Reject the run if matched arms differ in common paid exposure, if a controller sees hidden landing, if a replayed resume changes any final state or decision, or if the CLI would overwrite evidence. Record source hashes, original protocol commit/hash and its equality with the current protocol. Results may show the smaller notebook suffices, no-retention suffices, or all providers choose a bad route. Neither arm performance nor source/state bytes establish human-memory validity, enjoyment or measured authoring benefit.
