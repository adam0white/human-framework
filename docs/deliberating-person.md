# Deliberating person: evidence revision followed by planning

The user authorized continuing across more than one remaining gap. This delivery addresses evidence-sensitive belief revision first, then bounded planning across competing purposes. These are private compositional candidates; games and scheduled work remain deferred.

## Evidence revision

The ledger belongs to one actor and only receives reports delivered to that actor. Original source attribution, relay identity, observation time and receipt time remain separate. A later arrival cannot make an older observation newer. Forwarded copies do not multiply independent support. Disagreement remains explicit, and unknown is not treated as false. Expiration, correction and retraction are declared transitions rather than silent changes to world truth.

Origin/source attribution is a host attestation, not cryptographic identity verification. Resolution rules are authored engineering choices; there is no calibrated confidence, source reliability score or general account of belief formation. Existing situated-person facts and retained-learning records remain unchanged; the new ledger is a distinct evidence interface for the planner.

## Planning

The planner consumes an actor-visible belief view, known resources, declared goals and available action descriptions. It compares short sequences under fixed horizon, depth and node limits. Preparation can enable an important later action; immediate work can consume a deadline. Unknown/conflicted propositions do not satisfy positive or negative preconditions.

Plans are forecasts under the host-supplied action model. They cannot consume resources, fulfill promises or make an actor observe a predicted fact. A host executes the first selected action through the actual attempt lifecycle, applies real results, delivers observations, then replans. Authored purpose priorities are not moral worth or psychological predictions. This is bounded symbolic planning, not general reasoning or automatic purpose development.

## Composition and evaluation

The separate `deliberating-person` 0.1.0 package selects the new cognition modules and the unchanged sustained-person, situated-person and Human sources through an explicit allowlist. It adds no public asset and requires no inference service.

The reference host compares successful forecasts, hidden failures, conflict and changed evidence. A greedy controller and a direct purpose-aware controller remain useful simpler alternatives. A separate installed consumer checks reuse with repository access denied. [Verification](../artifacts/deliberating-person/verification.json) records 966 passing tests, including 27 new focused tests, and exact source/package identities. [Twenty-one comparison runs](../artifacts/deliberating-person/comparison.json) retain direct-rule parity and failures under impossible deadlines/resources. The [actual sequence](../artifacts/deliberating-person/sequence.json) records failed pickup, revision and replanning; the [independent consumer](../artifacts/deliberating-person/consumer.json) changes from a primary room to a fallback after a newer closure report despite a stale report arriving later. [Review disposition](reviews/2026-09-14-belief-planning.md).

## Remaining gaps

Long-term planning, probabilistic uncertainty, learned source reliability, affect, relationships beyond agreement records, positive sourced moral/spiritual representation, and adult development remain open. These additions provide two usable software capabilities without settling those wider claims.

## API and priority contract

`createBeliefs({ownerId,now,propositions,sources})`, `advanceBeliefs`, `receiveEvidence`, `retractEvidence`, `getBeliefView`, `exportBeliefs`, and `restoreBeliefs(snapshot,expectedOwnerId)` form the evidence API. The default and maximum history size is 256 receipts. Source catalogs and proposition catalogs are explicit. Relays must preserve a claim's original expiry; only its attributed origin can author a correction or retraction. Semantic no-op corrections are rejected.

`plan(input,options)` and `greedyPlan(input,options)` consume the same input. It includes `actorId`, `now`, `beliefView`, situated `purposes`, known `resources`, known boolean `conditions`, `goals`, and `actions`. Goal-array order **is the explicit strict priority order**: achieving the first eligible goal takes precedence over any combination of later goals. `eligibleGoalIds` preserves that order. Completed or withdrawn purposes make their goals inactive. This is a caller-authored convention, not a normative or psychological ranking.

Each action declares positive integer duration, preconditions and expected condition/resource effects. Preconditions may require a resolved belief, a known condition, or a minimum resource count. Effects cannot change beliefs. A goal's predicates must continue to hold to remain achieved in a forecast; achieving a resource threshold and then spending below it does not count as satisfying both goals. First achievement time survives its deadline only while its predicates remain true. The host marks actual completed purposes separately before replanning.

Defaults are depth 6, 1,024 nodes and 480 minutes. Fixed ceilings are depth 8, 4,096 nodes, 10,080 minutes, 32 actions and 16 goals. Root counts as one node. `nodeLimitReached` identifies truncated enumeration; `frontierComplete` applies only inside the declared depth/time scope. A returned plan is the best visited candidate under the declared ordering, not a claim of unrestricted optimality.

Beliefs are frozen within a forecast. The planner does not predict future reports, belief expiry, probabilistic branches or the value of information. A host must advance evidence time and replan before acting on a later step. Supplied conditions/resources are caller-attested actor-visible facts. Structural validation can reject inconsistent belief views but cannot authenticate a fabricated, internally consistent input. No plan mutates the supplied input.

## Reproduce

Use Node >=22.

```sh
node --test tests/cognition-beliefs.test.js tests/cognition-planner.test.js tests/deliberation-sequence.test.js tests/deliberating-consumer.test.js
node scripts/run-deliberating-person.js /tmp/deliberating-review
node scripts/package-deliberating-person.js /tmp/deliberating-package
npm test
```

The package root exports belief and planner APIs. `/sustained`, `/situated`, `/human`, `/learning` and `/commitments` expose selected unchanged composition boundaries. The [independent consumer](../examples/deliberating-consumer/consumer.js) provides a complete installed-only example.
