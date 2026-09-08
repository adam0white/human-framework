**Verdict.** The memory module holds its stated invariants under source inspection. The concrete defects are in the probe's reporting and in unstated spec interactions. Nothing here was executed. The tallies below are hand-traced predictions, not results.

## Concrete defects

1. **Hard-coded conclusion.** `scripts/observation-memory-probe.js:60` emits the decision as a string literal. The design's decision rule is conditional, but the script never reads the correctness counts. A regression that flipped outcomes would still publish the same sentence. Derive the text from the counts.

2. **Missing preregistered assertion.** The design's probe section requires a run of ten thousand unique-cue deliveries asserting bounded entries and serialized size while retaining the receipt mark. The probe function at lines 47 to 63 contains no such run. Tests were not supplied, so it may exist elsewhere, but the published report would lack it.

3. **Weak resume check.** Line 53 compares choice, byte count, entry count and minutes. Equal byte counts do not imply equal state. Compare the serialized states directly.

4. **Unverifiable provenance literal.** Line 69 bakes in a preregistration commit hash. It cannot be checked here and will not change when the script is edited. The runtime source hashes at line 68 are the real evidence.

5. **Unspecified expiry-versus-replacement rule.** In `src/cognition/observation-memory.js:73-77`, an already-expired report for an existing cue is dropped without replacing that cue's fresher entry. The design says conflicts replace by delivery order. The behavior is sensible; the spec should state it.

6. **Time domain looser than the clock.** The time check at lines 18 to 20 accepts fractional values and negative zero. The clock's minute check in `src/runtime/clock.js:48-50` rejects both. Every expiry test uses the same subtraction, so the module stays self-consistent, but a host mixing integer clock minutes with fractional person minutes will see different boundary behavior.

7. **Constructor skips the exact-field check.** `createMemory` at line 58 destructures and ignores unknown fields, unlike the person and clock constructors. Minor inconsistency.

## What holds by inspection

- **Ownership.** Observer must equal owner at line 27. No API changes the owner. There is no shared mutable module state.
- **Replay and causality.** Receipts must strictly exceed the high-water mark at line 71. The mark survives eviction and expiry because line 72 runs before the storage branch. Observation time may not exceed memory time at encode or on restore. Mutation time is monotonic at line 55.
- **Save invariants.** Export and restore validate before cloning. Exact key sets, dense arrays, ordered unique receipts bounded by the mark, unique cues, and no expired or future entries are all rechecked. Pruning precedes every change of memory time, so any API-produced state re-validates.
- **Leaks.** The module has zero imports. Recall returns a copy of delivered fields plus age. The three probe arms receive deliveries, the visible cue and the query time only. The oracle and condition name stay in the harness. `src/runtime/index.js` exports no cognition.

Hand-traced correct choices out of fourteen cases:

| Arm | Correct |
|---|---|
| memory | 10 |
| notebook | 12 |
| none | 8 |

This matches the literal decision text, which is why defect 1 is about mechanism rather than truth.

## Open risks, contracts and the counterargument

- **Recall does not pin time.** A recall at a late time followed by an encode at an earlier time is accepted, because only mutations advance memory time. A host clock bug could make an actor remember at a time it earlier drew a blank. Feed one clock.
- **Split saves strand the memory.** Memory time and host clock are separate snapshots. Restoring a memory ahead of the clock makes every query throw. A host receipt counter restored below the mark locks encoding permanently. Save both together and derive receipts from the clock's never-recycled event counter noted at `clock.js:111`.
- **Encoding returns no retention signal.** A host that charges observation minutes cannot tell whether a report was stored, replaced, evicted or dropped as expired without diffing states.
- **Delivery-order replacement un-corrects.** A late-delivered stale but unexpired report replaces a fresher one, per spec. Second-hand reports have no defined observation time, and expiry keys on it.
- **No migration branch.** The snapshot carries the component version only inside the memory object, unlike the person and clock formats, so a future version has no branch point before validation.
- **Mechanism protocol, forecast source.** `docs/mechanism-comparison-protocol.md` does not say whether Human's start forecast uses actual body or the rounded, biased person view. Rounding alone shifts a forecast by up to about a hundredth, systematically, against the declared tolerance. Specify actual body and zero bias. The coefficient matches in the frozen-models section check out algebraically, and the pooled gate is provably never stricter than Human's two channels. Predeclare that so one-directional admission disagreements are not read as findings.
- **Watch design, arrival in the clock.** Scheduling the arrival at start means the frozen clock export exposes the exact arrival minute in every save before any lookout. Authored scenarios make this a first-play-only reveal. Say so, or target a clock 0.2.0 with opaque event data rather than editing 0.1.0. The neighbor's transfer rule "until timing is known" should say known by whom.
- **Commons-next design.** Cache allocation is a unilateral player decision over jointly produced caches, and Meryem's consent rules cover help only. Label it as a decision, not an agreement. The checkpoint clamp must also hold Meryem's inner scheduled recovery at the paused minute.

**Strongest counterargument.** Every module invariant holds, the arms are structurally blind to the oracle, the hard-coded sentence matches the traced tallies, and the design already refuses promotion. On that view the defects are hygiene in a private probe and change no conclusion. I accept that for the module. I do not accept it for the probe as a claim-bearing artifact. A conclusion that is not derived and a preregistered assertion that is not run mean the report does not evidence what it states, even when the statement happens to be true. No runtime file needs editing for this work.
