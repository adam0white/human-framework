# Proposed milestone: portable paid work progress

**Status: proposed; no candidate, second consumer or new comparison has been executed.** This is the next framework experiment, not another chapter or a claim of package graduation. The user permits rebuilding examples and breaking old saves. This work requires neither migration nor a public UI, campaign, merged games or tutorial sequence.

## Evidence and source pins

Inspected at repository commit `cad4d3ce81de5fef4bc9e5f4444edd3961788ddf`. Capture these exact Git objects and hashes in the new experiment's manifest before implementation; historical results are not targets to retune.

| Source | SHA256 / evidence identity |
|---|---|
| `src/games/camp.js` (last changed by `11f542051cf4f9ecec85d9248954f06a8510dced`) | `a695c31258b8bc5339a20cd49f238e5a8f7fa1bed52c1cf2c0706822f804c078` |
| `src/runtime/index.js` (runtime 0.1.1) | `e685a514993fc0e32a84cad54d4a2a23287525e1d9923b4ee479b4cf3421ed7f` |
| `src/human/v0.1.1.js` | `516c5898b7352847f87abfa34b3a010a19d3461d82d81b398bba252bc9598b00` |
| `src/runtime/clock.js` (clock 0.1.0) | `ab770e36dcbf9a248fae30ce614b42d2e131a72176658c3eb130b40f4a49eb6c` |
| Transitive `src/core/model.js` | `1bf30267083e8e2617fe9964d4654d8da158cba309909ace7bb50c1e6de29c59` |
| `src/coordination/attempt-clock.js` | `1319b239e980bbf6a9a79461382d543284d406c7945cf16ef9587bf109c54948` |
| [Reviewed camp comparison](camp-comparison-reviewed.md) | Source/freeze `5fd5ac3` / `959d764`; report SHA256 `5621ac0b7cde9385f941bfd8af4ce9488513a0c21cd4686240deecb95b68f345` |
| [Earlier helper comparison](coordination-probe.md) | Reviewed source `09cdc80`; report SHA256 `72185e82380fccd16487ad832bd50b71a53425d16a0130b96ea158d223adff61` |

The camp established a real requirement: prospective work finishes the legal garden case at 202 rather than 207 without a restart, retaining .20 effort and each person's paid practice. That mechanism is still inside the camp host; runtime exports body/practice and clock primitives. Conversely, the earlier attempt/clock helper preserved behavior but added 510 inclusive bytes and 21 nonblank lines. Sharing code must earn its maintenance cost.

## Question, boundary and serious rivals

Can a small shared work component preserve already-paid progress, apply future productivity changes and keep worker-specific credit in two different hosts, while reducing actual authoring and validation obligations?

The candidate may own one work item's identity, progress, latched per-worker productivity basis, contribution records and completion status. Existing Human owns body/capacity/practice; the host owns resources, reservations, tool availability, acceptance/refusal, assignment exclusivity, time and output effects. No camp names, project catalog, arbitrary neighbor control or duplicated person state may enter the component. It returns explicit paid fraction/effort/exposure information; one integration path applies that information to Human exactly once.

**Rival D:** direct host code implementing the identical prospective work law and commands, with full ownership/lifecycle validation. Give it sensible recovery and equal implementation attention. Candidate/D differences must be exact behavioral parity; a helper cannot earn a gameplay win by changing physics.

**Rival F:** a smaller fixed-duration, start-snapshot work contract that completes the current assignment before adopting optional new tools or replacement workers. It retains real capacity, paid practice, owned material and unilateral stop. This intentionally changes the work contract; it is not an exact-physics comparator. Report where it suffices or is preferable, and never attribute its timing difference to abstraction quality. Mandatory interruption must stop work; no comparator may override consent to finish a job.

## Prescribed histories

Use fresh synthetic states, not player exports. Camp-shaped work is the existing 20-minute first garden stage with .20 effort and its owned 5-timber/1-salvage reservation. A has construction .10 (20-minute basis); B has .60 (18-minute basis), both starting at fatigue/hunger .20. Latch basis on each person's first assignment, as camp does. The tool subtracts six future duration-basis minutes, with the existing six-minute floor. These are inherited authored coefficients, not human measurements.

The independent repair host maps one owned seal into a physically persistent repair with the same work law but a different world schema, action names and completion effect. It has no camp structures, caches or legacy importer. A tool-availability event must have an explicit owned/paid supplier setup shared by all arms; record that setup separately rather than gifting a tool. Freeze its legal script before outcomes. Budget each history through minute 40, reporting first completion separately from that common endpoint; A/B and supplier costs remain distinct.

| ID | Fixed intervention and discriminating observation |
|---|---|
| H1 | A works with unchanged conditions and no tool. Candidate, D and F should agree; retain this null case. |
| H2 | A works one minute; the paid tool becomes available at minute 1, after that minute settles. Candidate/D apply it only to future work. F finishes with its original basis. |
| H3 | A pays seven work minutes, stops, pays three actual recovery minutes, then resumes without a tool. Candidate/D retain material/progress and latched basis; no extra skill refresh or lost exposure. F's finish-first route is optional-policy comparison, with its different time/body path disclosed. |
| H4 | Repeat H2 with a zero-time same-worker stop/resume at minute 1. It must not beat uninterrupted H2 under candidate/D; compare complete contributions, not only completion time. |
| H5 | After A pays one minute, free B explicitly accepts the remaining stage without a tool. Past effort/practice stays with A; B pays future work using B's own first-assignment basis. F keeps A working. |
| H6 | Reverse H5: B starts, then slower A accepts after one paid minute. Preserve any slower result; the mechanism is not required to improve output after every legal handover. |
| H7 | A requests handover after one paid minute while B is busy on a disclosed paid job. B refuses; assignment/progress remain with A. The host must not invoke an accepted-transfer operation or grant B construction credit. |
| H8 | Two separately owned work items: A starts at 0 and B starts at 2, producing an intended same-minute completion tie without a tool. Settle paid work before effects; replaying a completion receipt must not grant output twice. Each item retains its own reservation and contributors. |

For each history, run candidate and D with whole-minute, next-event and uneven-chunk drivers, including one save/restore at an active boundary. These are eight histories with driver/serialization checks, not a multiplied count of independent conditions. Derive exact expected completions from frozen source before execution; preserve first failed scripts and distinguish fixture corrections from mechanism changes.

## Freeze and independent second author

1. Build only the camp-shaped candidate and D first. Commit the proposed public interface, state schema, invariants, error/ownership rules, examples and tests **before** the independent repair-host author starts. Record the source hash and the eight concrete scripts; no placeholder interface freeze.
2. Give a separate implementer only the frozen boundary documentation, package and repair requirements; no camp internals or helper edits. They implement the repair consumer and its direct rival, recording setup steps, integration code, exceptions, ambiguities, changes requested and validation obligations. An AI implementer supplies engineering evidence, not measured human authoring effort.
3. Run the eight source-bound histories in both consumers. Keep initial source/results and any corrected execution separate. No rerun of old camp/helper matrices, old coefficient tuning or new hostile conditions chosen to guarantee a candidate win.

## Observables and decision gates

Record physical output and unfinished fraction; actual completion and elapsed times; free, reserved and consumed material; per-actor work/recovery/meal/idle minutes, effort, body and task practice; who requested/accepted/refused; first-assignment bases; completion identities and duplicate handling. Record full input/command hashes and state parity, with no guessed past history.

Measure candidate plus both adapters versus both direct hosts: inclusive source/dependencies, authoritative state fields, save bytes, validations/guards, error cases, host-specific branches and required maintenance touch points. Separate one-time framework implementation, second-consumer integration and later-change cost. After interface freeze, predeclare two small repair-only requirement changes (a different owned consumable and an additional independently owned work item); record whether either requires shared-code changes. Do not conceal validation code or callback protocols when counting savings.

Use a bounded maximum of 500 real work transitions per implementation to check stable active state. Predeclare a desktop budget of 5 ms p95 per work transition excluding rendering, and 8 KiB for the work-component state of two active items (host/person state reported separately). Repeat focused lifecycle/serialization checks on Node >=22. Physical-device latency and cold whole-story journal cost are separate, not silently included benefits.

**Stop and fix correctness first** for free/refunded paid exposure, duplicated resources/output, changed candidate/D physics, transferred past practice, refreshed same-worker basis, forced consent or driver divergence. Preserve the first failure. **Reject promotion** if the independent consumer needs camp internals, a shared-code exception, shadow body/work accounting, unbounded history, or either predeclared repair-only change needs a shared rule change.

**Reject the abstraction on value** if inclusive implementation plus adapters grows without a measured reduction in duplicated maintenance/validation obligations, or if validation/error/callback obligations increase without a documented second-consumer benefit. Source length alone is not an authoring metric; a smaller caller with a larger hidden helper is no victory. If results are neutral, keep direct host code and record the negative. F remains a sufficient smaller choice wherever interruptions/productivity changes add no useful distinction.

Only a passed boundary may be proposed for a separately reviewed package version. This protocol does not require promotion, migration, public deployment or a new game. Completion means a defensible implementation decision with source-bound evidence; it establishes neither human realism, broader cognition, empirical learning laws nor theological claims.
