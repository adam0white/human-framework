# Frozen D/F counterpart audit

Repository HEAD: `563cc95c524a6e1299d810ca95abf397ae0d3423`.

- D SHA256: `38322c721383639f6095b8a86055b07757d1e732ed26b46723d2eefcb9204c90`.
- F SHA256: `6b1a0e7e83f351e84c081a6aa758e35d28cfd5ba97bca52fd64d69bf2e030b6c`.
- Human SHA256: `516c5898b7352847f87abfa34b3a010a19d3461d82d81b398bba252bc9598b00`.

All four probes are accepted by both rivals on Node 26.8.1 and Node 22.0.0, and their changed snapshots survive export/restore exactly. Original control snapshots also roundtrip. No candidate/repair source was read; no repository source changed; no matrix ran. `probe.mjs`, copies of both executed rival sources, per-case original/changed snapshots with observations, and both runtime reports are retained beside this file.

1. **Extra terminal exposure:** generate a normal completed stage at minute20 and its minute21 continuation. Change A's construction/work total and contribution minutes from20 to21, recovery from1 to0, and replace A's person with the actual Human result of one additional zero-effort construction minute after minute20. Fraction1, effort.20, completion20 and all material/output counts remain. Both imports accept21 construction minutes for a basis20 full stage.
2. **Inflated no-tool minute:** start A and pay one minute with no tool. Change progress and credited fraction from.05 to1/6, update contribution/paid effort to.2/6 and adjust fatigue by that effort delta. Both imports accept even though the only legal rate is1/20.
3. **Impossible completion timestamp:** retain all20 paid work minutes from a normal completed stage but change completedAt from20 to1. Both imports accept.
4. **Zero terminal recipient exposure (additional same-family case):** after a normal stage is complete, add B's basis18 contribution with1 minute,0 fraction,0 effort, set basisPaid.B=0, and replace one of B's recovery minutes with an actual Human zero-effort construction minute. Both imports accept the added construction practice despite B contributing no physical fraction.

Cause locations in the frozen source: D lines108–114, F lines109–115. Fraction validation uses broad global6/20-minute bounds and an inclusive lower bound; completion time is only bounded between1 and current world time. Paid/person checks establish internal agreement between counters and practice, but coordinated changes to both sides pass.

Minimal corrective direction (not implemented):
- Validate fraction/exposure against the worker's actual reachable duration, not the universal six-minute ceiling. F and no-tool D have constant known duration per worker, so exact full-step/one-terminal-remainder bounds are available without another engine.
- Require positive physical contribution for every paid construction minute and prevent an extra zero/final minute. Tighten the lower bound so numerical tolerance cannot legalize an entire additional paid minute. For completed multi-worker items, only the final worker may own a truncated last step.
- Require cumulative item work minutes <= completedAt (or completedAt - firstStartedAt if that bounded field is retained), since an item has one worker at a time. This catches the shown minute1/20-minute contradiction without a journal.
- D's rate change may require a small bounded per-rate count or equivalent interval evidence to prove stronger amount/rate claims; charge that extra state and validation in the comparison. Do not claim full historical authentication from these corrections.

Fair comparison implication: D/F cannot currently be called stronger than the candidate for these specific assurance classes. This does not establish identical assurance in all other classes. Preserve frozen results, distinguish live execution from malformed-input acceptance, and compare any corrected arms at matching assurance scope.
