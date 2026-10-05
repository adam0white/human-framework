## Verdict

By inspection only — I ran nothing, so treat every claim below as a source-level argument, not an observed result. The arithmetic core is sounder than the surface density suggests. Four issues are real; the replay/payment concerns that look alarming are explicitly host-owned.

## Real issues

**R1 — `validate`: truncation slack is per-worker, not per-item.**
`const minimumFraction=(work.status==='open'?worker.minutes:Math.max(0,worker.minutes-1))/worker.basisMinutes` grants *every* worker a full `1/basis` shortfall once the item is `complete`, but at most one minute in an item's life is truncated (`Math.min(1-p,1/D)`), and truncation always completes the item. Repro:

```js
restoreWork({format:'paid-durable-work',version:1,work:{
 version:'0.1.0',id:'r1',effort:1,minimumDuration:10,progress:1,status:'complete',
 workers:{A:{basisMinutes:10,minutes:5,fraction:0.4,effort:0.4},
          B:{basisMinutes:10,minutes:6,fraction:0.6,effort:0.6}}}})
```

With `basis === minimumDuration === 10` every paid minute credits exactly `0.1`, so A's five minutes must be `0.5`; A cannot hold the truncated final minute because B's six plus A's four already reach `1.0`. Unreachable by any `advanceWork` sequence, accepted here. Direction is under-credit only (the `minutes/minimumDuration` upper bound stays tight), so the harm is effort mis-attribution on restore, up to `1/basis` × 16. Fix: budget the shortfall once — `Σ(minutes_i/basis_i − fraction_i) ≤ max_i(1/basis_i)`.

**R2 — `prepareWorker` rejects a resume on an argument it discards.**
`prepareWorker(work,{workerId:'A',basisMinutes:2000})` throws `'Expected whole work minutes'` before the `Object.hasOwn` early return, even though A is latched and the basis is documented as ignored. Host rule 3 requires passing the *current* skill-derived basis on every accepted assignment; a skill change that pushes it outside `[minimumDuration,1440]` converts a legal resume into an exception. Move the range check into the absent branch.

**R3 — ambient `structuredClone` contradicts "dependency-free".**
`copy=structuredClone` is an unqualified global reference in a top-level `const`, so an unsupported runtime (Node ≤16, older embeddings) throws `ReferenceError` at *module evaluation*, killing the import graph rather than one call. Related realm assumption: `record` compares `Object.getPrototypeOf(value)` against this realm's `Object.prototype`, so a work record arriving from a `vm` context or worker rejects as `'Expected an unshared plain work record'`. A small internal deep-copy removes both.

**R4 — `TOLERANCE` is far looser than the error it covers.**
Worst-case accumulation/reordering across ≤1440 additions is ≈1440·2⁻⁵³ ≈ 1.6e-13 per sum, so `Math.abs(fraction-work.progress)` legitimately spreads ~3e-13, plus ≤1e-12 from the completion clamp. `1e-10` therefore admits restored snapshots with fabricated progress the doc implies is impossible. ~1e-11 keeps a wide margin. Whether this matters is a judgment call for a frozen version.

## Host-owned, not defects

Settling an *older* complete snapshot yields a second `{id}`; `settleWork(settled)` correctly returns `completion:null` for the current state. Exactly-once external effect is assigned to the host (§7–8), and no history-free component can do better. Likewise: `advanceWork` crediting without payment proof (§5); no clock, exclusivity or resource conservation; basis not refreshed on repeat `prepareWorker` (intentional, correctly implemented). Because `durationReduction` is unrecorded, the upper bound must be `minutes/minimumDuration` — a one-minute worker can legitimately hold `fraction:1` when `minimumDuration` is 1. That is the documented "host owns productivity," not a hole.

## Checked and sound

Progress cannot exceed 1 (`p+fl(1-p)` is exact for `p≥0.5`; monotone rounding otherwise). Truncation implies completion, so the open-status lower bound is never self-violated. 1440 paid minutes force `progress ≥ 1−1e-12`, so no open item can strand. `identity`'s leading-letter rule excludes `__proto__`; `Object.hasOwn`/`Reflect.ownKeys` are used throughout; `seen` catches aliased worker records.

## Maintenance

One generic message per five-condition predicate makes a rejected snapshot undiagnosable without the source — the dominant cost, and it bears directly on the stated rejection gate. The work law is encoded twice (`quoteWork` computes, `validate` bounds) with no cross-check. `prepareWorker`/`settleWork` `seal` without `validate` while `advanceWork` validates; a future transition bug would surface only at a later `restoreWork`.

**Uncertainty:** code alone cannot decide whether sharing pays. That depends on whether the consumer truly needs zero shared-code change for a second item, and whether R1's attribution slack matters to practice reconciliation — neither is visible here.
