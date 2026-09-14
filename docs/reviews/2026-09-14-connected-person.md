# Connected-person review and disposition

Date: 2026-09-14. Scope: private situated-person 0.1.0 candidate, canonical commitments, connected reference sequence, independent package consumer and delivery documentation.

The lead used separate GPT-5.6 Sol subagents at medium effort for person implementation, canonical commitments and external integration. Two further independent review assignments examined goal alignment/reuse and correctness/information boundaries. These are AI engineering reviews, not empirical or theological validation.

## Findings checked and corrected

- The first person implementation imported the legacy Human entry point. The connected sequence and isolated consumer exposed the incompatible component version. The candidate now imports frozen Human 0.1.1 explicitly; packaging includes only its declared dependencies.
- Purpose setup cloned before validating, which could normalize invalid wire objects. Validation now precedes cloning; an accessor regression checks it is rejected without execution. Duplicate receipt equality is field-based rather than dependent on object key order.
- Interaction selection used the latest global status for another actor. It now requires an actor and commitment context. An unrelated success with the same colleague cannot replace the relevant earlier supply breach or change coordination.
- Actor commitment observations omitted terms, deadline and revision. They now retain a strict attributed details record and reject older delivered revisions. The revised-meeting-place control executes a different delivery action and records the changed destination.
- Fulfillment accepted a debtor-labelled receipt and discarded its reference. It now requires a host event (`actorId:null`), stores the outcome reference, and rejects late changes that skip an accepted commitment's deadline. Receipt authenticity remains the trusted host's responsibility; this is a simulation API, not a security boundary.
- Packaging inferred its allowlist from recursive discovery. It now declares the candidate source files explicitly and rejects unexpected JavaScript. Fresh staging permits repeated output builds without deleting arbitrary contents.

## Recommendation not adopted

Both reviewers recommended limiting external supplied choices to the baseline's noticed options. That contradicts the explicitly approved interface and original agency boundary: a supplied choice outside the noticed list is assessed explicitly rather than silently converted to the baseline preference. The candidate keeps external selection among authored offered actions, marks `provider:'external'`, and never treats the request as success. The host must keep that authored vocabulary independent of hidden world truth and execute the request through its action/outcome boundary. Baseline NPC decisions still use only actor-local observations and noticed options. No automatic policy receives hidden world data.

## Verification scope

The lead independently ran focused tests after integration and the correction round, including observation ordering/schema checks, revision and context regressions, external contrary choice, hidden-obstacle behavior, deadline authority, segmented chronology, snapshot restore, causal controls and isolated installation. The full repository suite and frozen runtime packaging are recorded in [verification](../../artifacts/connected-person/verification.json).

There was one consolidated review correction round; reviewers did not issue a second blanket approval of every final line. The lead checked the changed contracts and test evidence. The direct host notebook remains a successful smaller baseline. Neither passing tests nor independent AI implementation establish a calibrated whole-person model or measured developer usefulness.
