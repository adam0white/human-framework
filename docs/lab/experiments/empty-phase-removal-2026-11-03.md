# Empty-phase removal — 2026-11-03

The unchanged discovery filter finds events at the current time and phase. When it finds none, the complementary removal filter would retain every queue entry, so the candidate skips that traversal and copy. When discovery is nonempty, the original removal filter runs at the same point. Retaining the array identity on empty discovery is a change that normal integration checks must cover.

This was a private, identity-preserving 4.16.2 prototype, not a published build. The upcoming 4.16.3 has a newly generated engine identity. Older 4.x saves require a fresh start under the existing exact-engine policy; there is no legacy continuation or repair.

The instrumented seed 21 arrange prefix aborted after 31 days. One excluded observer and two excluded warmups preceded seven fixed, serial alternating AB/BA pairs. Each run used a fresh Node 26.12 Worker isolate; warmups cannot warm the later isolates' JIT or heap. A is published 4.16.2 and B is the single guard. The metric is wall time through the prefix sentinel, before archival. Alternation is not randomization; instrumentation may affect timings.

| Pair | Order |       A (ms) |       B (ms) |     B−A (ms) | Reduction (%) |
| ---- | ----- | -----------: | -----------: | -----------: | ------------: |
| 1    | AB    | 13241.566083 | 12015.495209 | −1226.070874 |      9.259259 |
| 2    | BA    | 13321.613709 | 11933.201959 | −1388.411750 |     10.422249 |
| 3    | AB    | 13427.753333 | 12173.785750 | −1253.967583 |      9.338625 |
| 4    | BA    | 13474.010834 | 12162.278666 | −1311.732168 |      9.735276 |
| 5    | AB    | 13488.191583 | 12217.003458 | −1271.188125 |      9.424452 |
| 6    | BA    | 13535.770667 | 12106.798667 | −1428.972000 |     10.557005 |
| 7    | AB    | 13499.119042 | 12256.010584 | −1243.108458 |      9.208812 |

All seven pairs favored B. Paired median B−A was −1271.188125 ms; median per-pair relative reduction was 9.424451878%. The difference of arm medians was −1311.732168 ms, not the paired median. The observer recorded 26,320 empty and zero nonempty first-month discoveries, with 158,881,416 queue-entry opportunities. Those counts do not bound CPU time. Root recorded matching complete native, raw-host and count comparisons for all 17 runs. The prior public native replay 777/hash `70f7cbd3` is a finite checkpoint, not a 4.16.3 save or a repeated replay of this prototype.

The positive branch was not exercised in this fixture. This experiment does not replace normal focused/full checks, exact review or CI. This experiment does not qualify browser performance, a full game, a two-second target, saves or general performance.

Private evidence under `/Users/abdul/code/.lab-scratch/games-deferred/`:

| File                                                                   | SHA-256                                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `hf-empty-phase-macro-claims-review1103/review.md`                     | `de9de8147b30903b72b125a835a27f448c57b0565bf02f4271a87dd567920206` |
| `hf-empty-phase-macro-run1103/root-verification.json`                  | `ec60840d3090243b01c71d73921f3ef0e5593ee08299c14a53f2950a58a302d7` |
| `hf-empty-phase-macro-run1103/runtime/summary.json`                    | `149cfb921e65cceca1cb38caf1b5dbfb783bfd69bbd172167557417aa2ecec76` |
| `hf-empty-phase-macro-run1103/runtime/observer/phase-observation.json` | `20bc0b38347b42a3767588bcc76da784bbb0824141ea603670a2b517d2e892a8` |
| `hf-empty-phase-removal-candidate1103/candidate.diff`                  | `e8af2817e4144453af333f5cf985fe4f5a50e2744b22b13a3b9daa951cc3330d` |
