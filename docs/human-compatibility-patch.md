# Human 0.1.1 compatibility patch

Human 0.1.1 fixes two software boundary defects while preserving the 0.1.0 body, capacity and practice equations. It is the next implementation, not an independently tuned alternate model. The historical `src/human/index.js` remains byte-identical for existing hosts and recorded experiments. The candidate is `src/human/v0.1.1.js`; its only runtime dependency remains `../core/model.js`.

## Defects and changes

The pending-snapshot validator in 0.1.0 compared serialized capacity objects. Reversing the six object members rejected the snapshot even though every value was unchanged. Alphabetical order does not reproduce that defect because the generated object already uses that order. Version 0.1.1 compares the actual typed fields and the ordered cause array. Missing, extra, mistyped or inconsistent fields still reject. It validates before copying so a clone cannot conceal non-enumerable or symbol extras. JSON object member order has no significance; cause array order remains part of the receipt.

Version 0.1.0 separately added each fractional advance to person time and attempt time. At a valid imported origin of 100,000,000 minutes, two advances of 0.1 minutes produced person time `100000000.19999999` and elapsed attempt time `0.2`. Their discrepancy exceeded the pending-state tolerance, so the returned state could not export itself. A legal API history reaching 32,768 minutes followed by second-sized steps reproduces the same defect without importing a time origin.

Version 0.1.1 derives person time from the pending attempt's start plus its accumulated elapsed time. Effort, maintenance, recovery, hunger clamping, practice, capacity assessment and completion receipts retain the original arithmetic. The existing interval and total-time limits remain in place. This fixes self-inconsistent time bookkeeping; it does not claim bitwise equality between all fractional chunkings of body or practice calculations.

## Explicit import migration

`restorePerson(record)` accepts the existing `human-framework-person` snapshot format, snapshot version `1`, and component versions `0.1.0` or `0.1.1`. The envelope's `componentVersion` must equal `person.version`. Unsupported or mixed versions reject. Every ordinary API still requires an in-memory 0.1.1 person: passing an old person directly to `beginAttempt` does not implicitly migrate it.

Import validates the source record's complete current invariants using the corrected capacity comparison, creates a detached person and sets its version to `0.1.1`. A subsequent export writes component version `0.1.1`; snapshot format version remains `1`. All other values, including identifiers, pending elapsed time, body, practice, attempt counter and start time, remain unchanged. The caller's old snapshot is not modified.

```js
import {restorePerson, exportPerson} from '../src/human/v0.1.1.js';

const person = restorePerson(oldSnapshot);
const migratedSnapshot = exportPerson(person);
```

A legacy snapshot with merely reordered capacity members now imports. An internally inconsistent legacy state, including one already damaged by the old fractional accumulation defect, still rejects. Migration does not invent elapsed work, change body values, reset practice or repair invalid history. As before, snapshots validate current state rather than authenticate the entire past of a fully rewritten save.

## Verification

The two defining tests were first executed against the frozen implementation and failed with `Inconsistent pending capacity` and `Inconsistent elapsed person time`. An additional regression first exposed clone-before-validation discarding invalid hidden capacity fields; validation now precedes detachment.

The compatibility suite covers reversed keys; malformed capacity fields; 100 fractional steps with save/resume at each step; a legally elapsed 32,768-minute history followed by 3,600 second-sized steps; unsupported and mixed versions; explicit settled and pending imports; rejection of the actual invalid legacy fractional state; and interval/total-time bounds. Nine prescribed integer lifecycle histories compare whole states, public views and exported snapshots against 0.1.0 after normalizing only version metadata. They include completed, failed, blocked and interrupted work, completed and interrupted rest, and completed/absent/interrupted meal receipts.

Commands run in the isolated compatibility worktree:

```sh
/opt/homebrew/bin/node --test tests/human-compatibility.test.js
/opt/homebrew/bin/node --test tests/*.test.js
```

The nine original Human tests were additionally copied to a temporary file with only their import redirected to `v0.1.1.js`; all passed, including 10,000 settled attempts and the time limit. No tests or implementation files belonging to the historical hosts were edited. Package selection, export wiring and release integration are separate changes owned by the integrator; this candidate alone does not change the delivered games.

On Node 26.8.1, all 11 compatibility tests and all 277 repository tests passed. The 11 compatibility tests and nine redirected original tests also passed on the declared minimum Node 22.0.0, using the official Darwin arm64 binary obtained for the independent consumer review. That minimum-version check exercises the component; package installation and release wiring are tested separately by the integrator.

Independent review is pending for this candidate commit. Passing tests and the commit itself do not imply release approval.

Source preservation checks against base commit `34dd851204a68adf9aed961e04f71b767a62f017`:

| File | SHA-256 |
| --- | --- |
| Historical Human | `0f6d30cf2b5e07f5e18dc791fecd691b9004f290e138abeab7336b1c2e2ee308` |
| Core model | `1bf30267083e8e2617fe9964d4654d8da158cba309909ace7bb50c1e6de29c59` |
| Clock | `ab770e36dcbf9a248fae30ce614b42d2e131a72176658c3eb130b40f4a49eb6c` |
| Candidate Human 0.1.1 | `516c5898b7352847f87abfa34b3a010a19d3461d82d81b398bba252bc9598b00` |

This patch establishes compatibility behavior for the tested API boundaries. It introduces no faculties, coefficient changes or new claim about the empirical adequacy of the model.
