# Portable role bindings — client 0.5.5

Done for G2-ROLES means one merged PR, exact green CI, signed client 0.5.5
and kit 0.5.23 GitHub artifacts, downloaded-byte verification, and a coordination
receipt for port workers. Game adoption and owner acceptance remain separate.

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
One behaviour control per family proves projection, admission of changed body
state, wrong-actor refusal, unchanged input and ownership refusal. A retained-v2
headless control carries Master Yusuf from Warren to Valley under its different
role ID, claims and departs the chapter, and verifies the exact HF replay hash.
These are synthetic mechanism controls, not completed gameplay or player evidence.

## Tariq: deferred until Warren deploys per-person skips

At the 2026-10-28 check, live Warren `/release.json` reported HF3 commit
`8cdef1fc31055f6d6ad53302a8c4c63be82f9a4b`, whose package uses client 0.4.15.
The corrected HF4 Warren PR9 is merged at
`b537cc0be4215bbe027241d5dd574695a8bd1462`, but its deployment is blocked by a
browser execution failure (see `warren-rope-hf4.md` in the coordination scratch).
Left Hand's Tariq role therefore remains absent. Recheck the live Warren port
and its per-person skip control by **2026-11-03**, then enable Tariq in Left Hand.
The new Warren and Well maps include Tariq; they do not enable a Left Hand source.
No owner question is needed.

Kit 0.5.23 adds client 0.5.5 to its optional peer range. HF remains 4.8.0.
Distribution stays immutable GitHub release artifacts, without an npm publication
or provenance claim for client and kit. Central deployment and each game's
adoption require their own receipts.
