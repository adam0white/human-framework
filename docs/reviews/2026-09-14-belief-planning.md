# Belief revision and planning review disposition

Independent review covered evidence provenance, planner correctness and budgets, host execution, and separate installed reuse. Reviews used focused tests and concrete counterexamples. Private source was not sent to an external service.

## Corrected findings

- A semantic no-op correction could suppress its own claim. Such corrections now fail explicitly; forwarded copies cannot change the original claim's expiry.
- The planner accepted impossible belief-view provenance shapes. Status, supporting/opposing origins, effective receipt IDs and global receipt counts now must be consistent. This is structural checking, not authentication of a caller's evidence.
- Forecast achievement was incorrectly permanent when a later action undid a resource or condition predicate. State goals now remain achieved only while their predicates hold. Restoring a predicate after its deadline cannot recover its earlier achievement time.
- The reference host duplicated purpose state outside its person. Situated purpose state is now authoritative, including after restore.
- The reference recipient originally incremented a world counter without actor-local input. Actual delivery now produces a received observation and a separate recipient decision.
- The original direct comparison repeated the greedy policy's omission of preparation. It now uses a serious duty-first preparation heuristic and retains its parity with bounded search.
- Direct preparation traces contained a null completed-goal ID. Preparation now records an empty completion list.
- A stopped decision episode could leave an unresolved accepted duty before its deadline. The host now advances actual sustained/belief chronology and settles breach after the inclusive deadline. A suggestion to use `>=` was rejected because the frozen commitment API permits fulfillment at the deadline and requires breach strictly afterward. The boundary test settles dueAt 25 at time 26.

## Explicit design decisions

Goal-array order is the declared lexicographic priority order, not an accidental sorting behavior; reversing it is an intentional policy change. Beliefs are fixed inside a forecast and advanced only through actual host time/evidence before replanning. Prediction cannot fulfill a canonical commitment or alter a world resource. The state and search caps are engineering bounds, not models of human memory or computation limits.

The separate installed consumer reserves a fallback room after a newer closure report despite an older report arriving later, then completes the actual obligation and paid work. Both resumed and uninterrupted runs agree. The exact test results, source hashes and comparative outputs are recorded in artifacts/deliberating-person.
