# Two completed host-only change records

The current `src/` and `tests/` are the two-pump stage. The original baseline documentation/evidence remains unchanged. Read the separate staged change records for the later work:

- `stages/00-baseline/src/` and `tests/`: preserved baseline source. Additional exact audit: `exact-comparison.json`; interpretation: root `BIT-EQUALITY.md`.
- `stages/01-gasket/CHANGE.md`: gasket-only change; preserved source/tests, `changes.json`, `freeze.json`; complete new evidence under `evidence-gasket/`.
- `stages/02-two-pumps/CHANGE.md`: two independently owned pumps; preserved source/tests, `changes.json`, `freeze.json`; complete new evidence under `evidence-two-pumps/`.

| Stage | Restricted tests | Candidate inclusive bytes/lines | Direct inclusive bytes/lines |
|---|---:|---:|---:|
| Archived one-seal baseline | 28 passing | 48,285 / 712 | 43,724 / 665 |
| One owned gasket | 28 passing | 48,323 / 712 | 43,762 / 665 |
| Two owned pumps/gaskets | 35 passing | 50,653 / 739 | 46,198 / 693 |

H1–H7 retain completion times 20, 15, 23, 15, 19, 20, 20. H8 starts Mara on south at0 and Tomas on north at2; both pumps complete at20, with distinct owned gaskets consumed once. Host checks cover item-specific stop/handover, busy recipient refusal, per-item restoration and ownership, actor exclusivity and aggregate paid contribution reconciliation.

The exact baseline audit and both new recorders confirm that **strict full-projection bit equality is not met**. Only the contribution-effort projection differs: the direct arm derives `.20 * covered`, while candidate stores accumulated per-minute effort. Actual people, paid ledgers, progress, timing, resources and consent match exactly across arms. No values were rounded, and no redundant effort state was added. The failed exact criterion is recorded rather than redefined as a pass.

The frozen kit remains byte-identical. Neither host-only requirement requested an interface exception. These two change records are returned before any source-bound correction or other new work. Source line/byte and validation costs are descriptive evidence, not human authoring-time or general maintenance claims. Candidate remains larger in inclusive runtime source in these stages; the second-item delta is slightly smaller for its adapter plus shared host. No promotion decision follows from these counts alone.
