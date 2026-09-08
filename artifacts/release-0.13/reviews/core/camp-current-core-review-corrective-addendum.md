# Camp 0.3.0 core review corrective addendum

The two original findings are resolved for their exact independent counterexamples at `src/games/camp-current.js` SHA-256 `1b0842a932aff34a94a30b474edfb3f862378bc378dfb54b3be3bb44db1511b5`, verified unchanged before and after this rerun. The initial review and first-failure artifacts remain unchanged.

Only the two counterexamples were reconstructed from fresh current constructors, plus valid pending/completed counterparts. No source edits, author-test reliance, or broader audit was performed.

| Check | Result |
| --- | --- |
| Fresh three-minute pending meal with its owned meal minutes moved to recovery | Correctly rejects: `Pending meal lacks owned paid time` |
| Fresh completed sixteen-minute timber trip with its `.13` paid effort changed to zero | Correctly rejects: `Inconsistent total paid time or effort` |
| Valid three-minute pending meal | Restores identically, advances five remaining minutes, completes with eight owned meal minutes and one consumed food, and restores identically again |
| Valid fifteen-minute pending timber trip | Restores identically with no premature output, advances its last minute, completes with three produced timber and `.12999999999999995` cumulative effort, and restores identically again |

All four independent corrective checks passed. Restored and uninterrupted valid progression also matched exactly.

Executable probe: `/tmp/camp-current-core-corrective-probes.mjs`.
Machine-readable results: `/tmp/camp-current-core-corrective-results.json`.
