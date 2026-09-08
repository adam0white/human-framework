# Experimental social contract probe

## Design recorded before implementation

Base: `9bd93c6`, 229 passing tests. This is a private, non-LLM software experiment, not a new public game, package export, social theory, or theological rule.

The candidate will be a pure bounded ledger in `src/social/contracts.js`. An addressed proposal identifies its proposer, recipient, obligor, a host-owned terms reference, and an exclusive obligation slot. Only the recipient can accept or refuse. Acceptance fails if the obligor already has an accepted commitment in the same host-declared slot. The proposer may withdraw an unanswered proposal. The beneficiary may release an accepted obligation. This release convention is an authored protocol for the two probe contexts, not a universal convention about human or Islamic obligations. An obligor may renounce performance, but that recorded fact does not itself discharge the obligation; the host remains free to stop their physical work.

Fulfillment requires an explicit host-issued receipt referring to this exact contract and its unchanged terms. Receipt sequences and contract identities never repeat; a completed or discarded contract cannot accept another result. The ledger checks authorization fields, lifecycle, binding and chronology. It cannot authenticate the caller or verify the truth of a host's report. No objects, recipes, resource availability, time advancement, trust score, planner or generated language belong in the ledger. At most eight proposal/commitment records remain active or retained; callers explicitly discard terminal records. Saved state is detached, versioned and strictly validated.

Two small independent hosts will challenge the shared shape. A two-bucket water loan transfers owned resources only when the lender explicitly accepts a feasible transfer; the borrower owes repayment, with a due time and lateness. An ongoing repair request commits its recipient to a project whose supplies may arrive later; work reserves a part, can be interrupted, and only a completed host job supplies fulfillment evidence. Recovery can continue when an obligation is released. Resource absence can prevent an immediate loan without forbidding a future project commitment. Renunciation stops physical work but preserves the recorded obligation. The existing courtyard, worksite, human component and clock remain unchanged.

Each host will include a direct host-rule rival, with the same observable choices, physical transition code, consent and recovery affordances. Prescribed scenarios and generated command sequences compare externally meaningful world and commitment states. Equal results are expected when the same protocol is implemented correctly; equality is evidence against claiming that extraction itself improves behavior. The rival must not omit safety or recovery just to create a favorable comparison.

Implementation sequence:

1. Write failing lifecycle/authorization/receipt/save tests, then the smallest ledger that passes them.
2. Write independent water and project adapters with direct rivals; exercise accepted, refused, impossible, conflicted, released, renounced, interrupted, late and duplicate-result cases.
3. Run differential scenarios, hostile inputs, save/resume, mutation isolation and 10,000 discarded-contract cycles. Record exact source hashes, source-line counts, bounded snapshot size and observed implementation effort. Counts describe this implementation; they do not estimate human authoring time.
4. Run the full repository suite, verify no old modules or public/package allowlists changed, and decide whether the abstraction has earned extraction. Keep the candidate experimental when its extra interface and validation cost outweigh demonstrated reuse.

The parent lane owns prior-art research and wider roadmap decisions. This probe supplies engineering evidence from two authored miniature contexts, without claiming independent human consumers or measured player benefit.

## Results and decision

**Keep this experimental. Do not add a public runtime export or replace either existing game's rules.** A common lifecycle can serve both miniature hosts without owning their quantities, jobs or time. However, the tested shared implementation produces no better outcome than direct host rules, has larger saved state, and adds a new authority/terms/receipt interface. Two adapters written by the same author are not independent adoption evidence.

The design was implemented with a 115-nonblank-line, 9,303-byte core and separate water/work hosts. The core removes repeated transition guards from each adapter: the water transition function has 19 nonblank direct-rule lines versus 7 shared-adapter lines; the project function has 16 versus 9. The shared route also needs all 115 core lines. These formatting-sensitive counts exclude host world code and host validation; they are not a total complexity estimate or measured authoring-time saving. The direct rivals retain consent, conflict, renunciation, release, duplicate protection and the same world/recovery affordances. Fixed participant roles are implicit in their host rules, rather than repeatedly serialized.

One author implemented the core, both adapters and both rivals in this lane. The same author's dual role can bias interface fit and comparator quality. Observed integration work included reversing the obligor between hosts (borrower proposes a debt; owner asks a worker to achieve something), binding generic terms references to each host's actual result, separating terminal consent records from physical inventory, and preserving an independent meal during release. No existing human, clock or game module needed an edit. This is inspectable implementation effort, not evidence that a new consumer found the API easy to use.

### Reproduce

From the repository root:

```sh
node --test tests/social-*.test.js
node scripts/social-contract-probe.js /tmp/social-contract-probe.json
npm test
```

The probe emits its complete deterministic comparison, runtime identity and SHA-256 source account to stdout and the optional private JSON path. It does not publish or modify a game. Default generation is 100 runs × 80 commands × two hosts, using seed 1701. The generator includes sensible currently relevant replies/repayments and malformed or unauthorized commands; it is a stress workload, not a population model or a play policy. Each command is attempted independently against both modes. Accepted outcomes must match exactly in the public host projection; rejection must agree, though error phrasing may differ. Each successful command is also repeated from a JSON-restored pre-command snapshot. Every prior state is checked for mutation.

| Observation | Water loan host | Achievement project host |
|---|---:|---:|
| Generated command attempts | 8,000 | 8,000 |
| Final retained fulfilled contracts, summed across runs | 140 | 68 |
| Shared/direct outcome or rejection mismatches | 0 | 0 |
| Maximum sampled shared host snapshot | 2,443 bytes | 2,223 bytes |
| Maximum sampled direct host snapshot | 764 bytes | 931 bytes |

Across the 16,000 attempts, 5,303 were accepted and 10,697 rejected. There were zero save/resume mismatches and zero prior-state mutations. Equality is expected for two correct implementations of the same authored protocol. It establishes consistent integration for these cases; it does not establish the social component's causal value, preference realism, or measured player benefit.

A separate 10,000-contract create/accept/fulfill/discard workload leaves zero retained records, next contract ID 10,001 and last receipt sequence 10,000. Its largest one-record snapshot is 511 UTF-8 bytes; the final empty ledger is 204 bytes. The implementation also rejects a ninth retained record until a terminal record is explicitly discarded. This bounds active retention; it deliberately does not provide a growing relationship memory or a complete historical transcript. JavaScript safe-integer counter bounds remain finite.

The first generator used low-order linear-congruential bits for category selection. It produced 150 water fulfillments and **zero work fulfillments** despite 16,000 commands and no mismatches. A coverage assertion rejected that inadequate workload. Switching category selection to scale the full unsigned draw produced the table above. The zero-coverage result is retained here; it was a harness correction, not a policy change or a discarded unfavorable comparison.

### Meaningfully different host semantics

| Boundary | Water adapter | Project adapter |
|---|---|---|
| Addressed request | Borrower asks lender for two buckets | Owner asks worker to achieve one named repair |
| Accepted obligation | Proposer must repay recipient | Recipient must achieve owner's requested target |
| Availability at acceptance | Owned water and receiving capacity must permit transfer | Missing supplies may arrive after acceptance |
| Host time | Reply, collection, pouring and repayment each pay ten minutes; explicit idle advances also exist | Zero-time decisions start independently running five-minute work or eight-minute recovery jobs |
| Fulfillment evidence | Host completed actual two-bucket repayment; completion after declared due time is late | Host completed the named repair; another person's work may achieve the target while the worker recovers |
| Release | Lender forgives the outstanding obligation; the prior transfer remains real | Owner releases obligation; matching worker construction is canceled/refunded, while meals/rest continue |
| Renunciation | Borrower's declared abandonment leaves debt and slot conflict open | Worker can stop construction and recover its unconsumed part; obligation and slot conflict remain open |

These are miniature protocols inspired by the existing hosts, not compatibility adapters for their live saves or a retrofit of their exact scheduling. The loan's deadline is declared as forty minutes after proposal, and delays do not automatically expire its unanswered offer. The work adapter tests **achievement** of a repair once; it cannot represent maintaining service over an interval. There is no shared belief or awareness model: the ledger is authoritative host infrastructure, and exposing it to every person would be a separate, unjustified observation choice. The parent [cooperation-boundary research memo](../research/cooperation-boundary.md) records the broader distinctions and sources.

### Verification and retained limits

Prescribed tests cover accepted/refused loans, impossible immediate transfers, late repayment, no duplicate repayments, delivery after a project is accepted, interrupted work with refunded unconsumed materials and retained paid time, completion during another person's recovery, release preserving a meal, conflicting obligations, renunciation without discharge, and exact pending save/resume. Core tests additionally cover addressed authority, immutable terms binding, stale receipt sequences, old contract IDs after discard, unknown transitions, malformed snapshots, non-JSON accessors, mutation isolation and bounded long runs.

Host commands are pure, centralized simulation functions. Identity fields express a protocol authority convention; they do not authenticate an untrusted caller. A deliberate negative test shows that a caller possessing the host issuer identity can assert false fulfillment evidence: the core has no world from which to establish truth. Production integration must obtain receipts only from the host's validated transaction path and authenticate commands before invoking this ledger. The miniature hosts reject an external `fulfill` command; repayment and completed jobs produce receipts internally. Their snapshot checks are partial world-consistency checks, not forensic proof of every preceding action. Only the ledger offers the strict versioned import interface tested with hostile records. The adapters' JSON save/resume checks start from legitimate host states; they are not hardened full-host import formats.

The candidate does not infer promises from physical help, automatically perform accepted work, impose sanctions, grant a cooperation bonus, quantify trust, or decide moral/religious validity. Fulfilled/released/refused records can be discarded; renunciation remains an open obligation until factual fulfillment or beneficiary release. A different social protocol may authorize different forms of discharge and needs its own evidence and tests.

Self-review found that an imported refusal could claim different response and closure times, despite refusal being one atomic operation. A failing regression also covered decreasing proposal-creation time across increasing identities; both necessary chronology checks were added. The generated comparison results remained exactly unchanged after this correction.

The publication guard builds the existing public asset set and checks that `src/social/` and these scripts are absent. The existing runtime package source allowlist also excludes them. General gameplay, public packaging and all established simulation versions remain unchanged. The full repository suite passes **255 tests**, including **26 social probe tests**, against the 229-test baseline.

An independent implementation author reviewed resource/receipt authority, recovery versus release, and the value claims. They reported zero outcome, mutation or resume mismatches in another **50,400 differential commands** (seeds 1, 19 and 991; 60 runs × 140 commands × two hosts per seed). Their prescribed checks also preserved unrelated gate work when releasing a pump commitment, retained ownership of already-loaned water after release, and rejected repayment by the wrong actor without mutating state. The review found no blocking issue. Its two documentation corrections were adopted: describe the generator's few appended relevant-ID choices accurately, and distinguish strict ledger imports from legitimate-state host JSON roundtrips. This is independent code review and software execution, not an independent consumer integration or a human playtest.

Final implementation source identities from the probe's source account:

| Source | SHA-256 |
|---|---|
| `src/social/contracts.js` | `7071ea73fd2790feedd0f43ed3c2526f415c56c43386f092e1dbb910bebd4acc` |
| `scripts/social-water-host.js` | `9e9c6ffe945df2f5e9e844fa1b92008575bedca5976b9ac8e93733acf1358c53` |
| `scripts/social-work-host.js` | `40eda2d930d04f2e6dc6d0a0a3adf54e4eb5e316ee39fe297b1bc6f1fa3d8dae` |
| `scripts/social-contract-probe.js` | `40c45884c73e329f48958e72bf773d5d2ece7b029d8ca1ec2ed0e1302941e8f8` |
