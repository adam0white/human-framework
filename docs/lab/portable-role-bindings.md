# Portable role bindings — client 0.5.6

Done for G2-ROLES-FIX means one merged PR, one hosted Codex review, exact green
merged CI, signed client 0.5.6 GitHub artifacts, downloaded-byte verification,
and a coordination receipt. Game adoption and owner acceptance remain separate.

The cast registry is the identity authority. Client roles bind those identities
to authored actor IDs. No aliases based on display names or new admission route
are introduced. Existing clinical, unfinished-duty, source, ownership and atomic
head checks remain. Receiving hosts own reference/calendar mapping and complete
replay inputs. Old saves and HF3 links may be refused by the HF4 ports.

| Game key               | Foreground bindings | Host source for actor IDs                                                          |
| ---------------------- | ------------------: | ---------------------------------------------------------------------------------- |
| `valley`               |                   6 | `valley/src/sim/cast.ts`; Master Yusuf is `yusuf-usta`, Meryem is `meryem-visitor` |
| `glance`               |                   5 | `glance/src/sim/cast.ts`                                                           |
| `rope`                 |                   5 | `rope/src/sim/party.ts`                                                            |
| `warren`               |                   6 | `warren/src/sim/people.ts`; Master Yusuf is `yusuf`                                |
| `hearsay`              |                   8 | `hearsay/src/sim/garden-cast.ts`                                                   |
| `repair` (Small Works) |                   4 | `repair-game/src/game/cast.ts`                                                     |
| `well`                 |                   6 | central `apps/site/src/colony/sim/human-cast.ts`                                   |
| `watch`                |                   6 | central `apps/site/src/watch/sim/config.ts`                                        |
| `goodhands`            |                   7 | existing bindings retained                                                         |
| `pass`                 |                   7 | existing bindings retained                                                         |
| `murmur`               |                   4 | existing bindings retained                                                         |
| `stairwell`            |                   5 | existing bindings retained                                                         |

Well and Watch are included because Valley and Warren need genuine passports
from those sources. A target binding without its source binding still refuses
that source. Other games outside this port brief retain their existing coverage.
Two representative cross-game journeys prove projection and admission of changed
body state with simulated ready deployments. Existing portable tests retain
ownership, clinical and unchanged-input checks. A retained-v2 headless control
carries Master Yusuf from Warren to Valley under its different role ID, refuses
writes while rollout verification is absent, and verifies the exact HF replay
hash. These are synthetic mechanism controls, not gameplay or player evidence.

## Portable head write gate

A host may write a person's portable head only after **every other game binding
that person is live on client 0.5.5 or later with per-person skips**. A merged
port or a package pin is insufficient. Until then the role is read-only: existing
portable heads still validate and admit, but projection and arrival claims refuse
before replacing history. Batch arrival skips only the blocked person.

`portableWriteBlockers` derives peers from the registry's `games` and the source
bindings above. Registry peers count even when their SDK binding is absent
(for example Neighbours and Voice). There is no hand-written list of blocked
people. `portable-readers.ts` records only verified live deployments with the
required skip behaviour. Missing, older, prerelease or unverified entries close
the gate. Recheck live manifests, their exact client pins and per-person skip
controls by **2026-11-03**, then update that deployment record in a reviewed patch.
No deployment is certified there at this release; shared people remain read-only.
The writing host is excluded from its own peer check.

At the 2026-10-28 source review, Warren was still live on HF3/client 0.4.15.
Its six bindings block foreign writes for Master Yusuf, Meryem, Maryam, Tariq,
Kian and Tamar of the Wall. Older Rope/Glance deployments block Bilal and Wren;
Bilal also has a Neighbours binding. These are examples, not the gate's input.
Left Hand's Tariq source remains absent; Warren and Well's Tariq roles are now
subject to the same general gate as every other person.

Tests simulate ready deployments for two representative role journeys (Valley
Master Yusuf and coast Bilal), reject swapping the two Yusufs, and exercise
closed/open gates, claims and batch skips. The unmocked retained-v2 headless
control proves read-only admission, refused writes and exact replay. Synthetic
controls do not establish gameplay or live adoption.

HF stays 4.8.0; kit 0.5.23 is unchanged. Distribution stays immutable GitHub
release artifacts, without an npm publication or provenance claim. Central
deployment and each game's adoption require their own receipts.
