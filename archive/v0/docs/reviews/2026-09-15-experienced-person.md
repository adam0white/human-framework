# Experience milestone review disposition

Implementation used three bounded GPT-5.6-sol/medium subagents, followed by cross-reviews of provenance, lifecycle integrity and causal evidence. Private source stayed within subagents; no external review service received it. The later game-idea round used three fresh GPT-5.6-sol/low agents only after framework verification.

## Concrete findings resolved

- **Old relay after correction:** an unchanged forwarded episode arriving after an origin correction could be rejected or mishandled. The episode history now accepts a valid old relay while retrieval retains the correction; the regression failed before the fix.
- **Duplicate attention availability:** an already processed origin claim forwarded under a new message ID still appeared available. Availability now agrees with processing eligibility. A forwarded expiry change is rejected both at delivery and restore.
- **Invalid correction at completion:** evidence validation could throw only after paid reading had completed, leaving the caller with its earlier pending state. Selection now preflights the original claim against the current ledger before work begins. Expiry during reading separately preserves paid completion with no belief update.
- **Contradictory restored projection:** a processed message could match a belief by receipt ID/time but disagree on its content. Workspace validation now compares every projected field.
- **Pending work used as payment:** Human increments its counter at begin, so checking only `attemptId < nextAttempt` could admit a currently unpaid pending attempt. Every processing now requires a matching actual completed adaptive receipt, configured action, minimum duration and exact time; pending attempts are excluded.
- **Unread ID injected as a direct observation:** a host could inject an inbox message ID into the evidence ledger and later cause an idempotence collision at paid completion. Unread message IDs are now reserved. Independent observations require distinct receipt IDs.
- **Independent consumer output not governed by its world:** the installed application initially counted each completed operation as a ticket. It now owns canonical access/authorization and settles actual visits. A hidden closure test pays for a failed inferred-direct visit and produces zero output.

Focused tests were run after fixes, followed by the complete 1,102-test suite. Source hashes bind the installed consumer to the final package. The full test baseline was 1,064; 38 checks were added.

- **Standalone payment responsibility was unclear in documentation:** the standalone attention module accepts a host-supplied receipt. The delivery and integration guide now distinguish that responsibility from the workspace's derivation and verification against actual Human work.

## Review conclusions and retained limits

The route reference grounds remembered experience in an actual paid failed trip. Relevant context and unexpired retrieval change a later method. Paid reading of both premises enables a derived route conclusion; unread, expired, conflicting and corrected information produces the expected differing actions and canonical outcomes. Eleven interventions preserve direct-controller and JSON-continuation parity.

Direct controllers share candidate execution state and receive equivalent information. They establish a bounded behavioral comparison, not a full module-absent ablation, third-party developer study or authoring advantage. The separately authored installed maintenance application provides additional portability evidence with repository reads denied, not independent human validation.

Developer validation errors can depend on unread message content during correction preflight. They are host integration errors and must not be rendered as actor observations. Likewise full snapshots are host-held state, not an actor/public disclosure view. Original context/source labels and coherent saved histories remain host-attested; structural validation cannot authenticate them.

No broad cognition, clinical, moral-standing or complete-framework claim is inferred from these checks. The game proposals remain separate design suggestions.
