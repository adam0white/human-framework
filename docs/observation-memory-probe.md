# Observation retention: executable candidate, no promotion

The private [observation-memory candidate](../src/cognition/observation-memory.js) can retain an actor's delivered report, recall it with source/channel/age after a cue disappears, replace it after a contradictory report, and forget it through bounded displacement or authored expiry. It rejects another actor's observations and replayed receipts, including after eviction. It has no access to world truth, no trust judgment, and no calibrated human forgetting mechanism.

The [protocol](superpowers/specs/2026-09-08-observation-memory-design.md) was committed as `d3ed0d1` before implementation/outcome execution. The [complete result](../artifacts/observation-memory/2026-09-08-probe.json) includes the protocol and source hashes and all fourteen deterministic cases. These are enumerated software counterexamples, not independent samples from people.

| Choice provider | Correct / 14 | Largest serialized decision state |
|---|---:|---:|
| Capacity-2, six-minute observation memory | 10 | 346 bytes |
| Task-keyed last-report notebook | 12 | 44 bytes |
| No retained reports, left fallback | 8 | 4 bytes (`null`) |

All arms receive identical reports and pay one simulated minute per observation. Retention helps when a report disappears from view. The notebook keeps reports that the candidate loses to interference or expiry and therefore performs better in those cases. Neither retained representation discovers an undisclosed world change: both confidently choosing the old report would be wrong. The actual candidate returns a report and its age; it does not label the report true or manufacture confidence.

The notebook is a serious smaller engineering alternative. It has unlimited cue retention in this small probe, so its comparison does not isolate a capacity effect. State bytes exclude program code, common host scheduling, UI and any audit transcript. The candidate's schema/provenance/receipt validation is additional functionality whose usefulness remains unproven by answer accuracy. Ten thousand unique deliveries keep its active record below 1,000 serialized bytes with at most two reports; this software bound is not a human-memory measurement. All fourteen cases preserve the same candidate result through JSON restore after every delivery.

**Decision:** keep the candidate private, outside public assets and runtime exports. The experiment establishes a use for retaining experienced information, not a reason to prefer this memory contract to a notebook. A real game must need its ownership/provenance/bounds, then a second independent host and a simpler comparison must establish value before promotion. The authored expiry/capacity will not be retuned to manufacture a win.

Reproduce with Node >=22:

```sh
node --test tests/observation-memory.test.js tests/observation-memory-probe.test.js
node scripts/observation-memory-probe.js /tmp/observation-memory-repeat.json
```

The runner refuses to overwrite an existing result. Eight focused tests cover report isolation, eviction/expiry, monotonic time/receipts, contradictory and stale reports, hostile snapshots, bounded state, exposure parity, counterexamples and resume. The integrated suite at this stage passes 288 tests; the eventual app release record supplies its own later test count.
