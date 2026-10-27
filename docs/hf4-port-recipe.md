# Port one game to HF 4.x

G1 recipe, 2026-10-27. Target: **`@adam0white/human-framework@4.1.0`**, an exact pin.
The [needs inventory](hf4-game-needs.md) owns framework gaps and dates.
The owner accepts the all-games outcome; each host maintainer supplies delivery receipts.
This recipe is documented and its public-run control passes. **The first whole-game port is blocked.**
The control is not evidence that Stairwell, carryover, or all games have upgraded.

## Establish the host boundary

Create one managed worktree per repo. Check processes and worktrees before choosing a game.
Install with `pnpm install --frozen-lockfile` and `/opt/homebrew/bin` first on PATH.
Inventory every HF import, direct Person read/write, save/export consumer, cast admission and
publication path before changing the pin. The
[4.1.0 public exports](https://github.com/adam0white/human-framework/blob/v4.1.0/packages/human/src/index.ts)
and [data contract](https://github.com/adam0white/human-framework/blob/v4.1.0/packages/human/src/run-schema.ts)
are the authority. A type declaration does not prove its runtime route is implemented.

The game owns places, tasks, inventory, transport, authored dialogue and actual world outcomes.
HF owns actor state, decisions, bodily change, beliefs, trust and replay.
Do not copy an HF kernel or add local belief/trust/body calculations to fill a missing route.
Record a numbered framework gap and retain the released game until it is supported.
Old saves may be explicitly refused. Existing continuing-person features still need supported
admission; fresh authored replacements do not preserve them.

## Map calls and reads

These are routes to implement and prove, not promises of identical 3.x numerical behavior.
Every faculty remains on. Remove `enable*` selectors; author differences as state.
HF 4 time and durations use **integer milliseconds**. Convert game minutes once at the bridge
(`minute * 60_000`); preserve calendar epochs and birth times in the same units.

| 3.x operation                                                      | 4.1 route and host obligation                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createPerson`, initial `seedTie`, `seedBelief`, `seedSourceTrust` | `createRun(RunSpec)`, then `createPerson(run, PersonAuthoring)`. Author relationships, beliefs, source trust, held norms and provenance in state. Register referenced definitions and sources. No later direct actor mutation.                                                             |
| `decide`                                                           | `offers.received` with a new revision; `suggestion.received` when applicable; `decision.requested` naming the offer revision. Preserve suggestion identity, source and time. Read admitted events and requests.                                                                            |
| `begin` / `finish`                                                 | Settle HF action requests at stage `start`, `finish` or `interrupt` using `action.resolved`. Check world availability, then record accepted/rejected start or actual completed/failed/interrupted outcome. `activity.interrupted` requests interruption; it does not fabricate completion. |
| `tick`                                                             | `step(run, {until, inputs})`; serve every `world-required` boundary. Daily fidelity is a separate workload gate, not a conversion of minutes to days.                                                                                                                                      |
| `perceive`, `told`, `confirm`, `contradicted`                      | `observation.received`, `testimony.received`, `fact.confirmed`, `contradiction.received`. Retain evidence ids, teller/source identity, proposition and direct/heard provenance. Submit observed consequences, not a desired trust target.                                                  |
| `converse` / retelling                                             | `conversation.requested` / `retelling.requested`, followed by `communication.resolved` with actual transport and attention evidence. Emission alone is not receipt.                                                                                                                        |
| `socialEvent`                                                      | `social.received` with actual event evidence. Initial ties belong in person authoring. Do not replace relationship mutation with a local coefficient.                                                                                                                                      |
| `readBody`, `credence`, `relationshipWith`, event reads            | `inspect` with explicit perspective, people and selections (`body`, `beliefs`, `relationships`, `events`, etc.). Beliefs are structured evidence, not the old scalar API. Any new projection needed by a UI belongs in HF.                                                                 |
| `trustOf` in Stairwell UI                                          | No source-trust inspection selection in 4.1.0. G4 owns the required reading. Do not use archive internals as the permanent UI interface.                                                                                                                                                   |
| `predict`, `bodyForecast`                                          | `preview` returns hypothetical visible possibilities, a boundary and knowledge limits. It is not a drop-in quantitative prediction or bodily forecast. G4 owns missing forecast evidence.                                                                                                  |
| `snapshot` / `restore`, whole-game export                          | `exportRun`, `restoreRun`, `replay` for the run, plus validated host data. Portable cast projections are a different contract; G2 remains blocked in 4.1.0.                                                                                                                                |

Inputs carry `{id, at, source, kind, payload}`. Use unique, stable ids and registered sources.
Retain accepted batch boundaries and order: replay uses the archive's accepted transactions.
Keep the player's timed input log and the host schema/edition alongside the HF archive.

## Settle before advancing

The public [minimal host](https://github.com/adam0white/human-framework/blob/v4.1.0/packages/human/examples/minimal.ts)
provides the complete protocol loop, staging and restored-host decoder. Its communication resolver
delivers nothing because the example has no transport. Real games resolve actual communication.

1. Call `step` with the target and inputs. Check the `Result`.
2. At `world-required`, resolve all pending requests, including those at `until`.
3. Echo each request's id/hash, actor/activity/stage and current world revision.
4. Stage host changes on a copy. Chain world revisions in the same deterministic order as the resolution inputs. Publish the candidate only after HF accepts the batch. Rejection must leave both live states unchanged.
5. Return receipts at their `boundaryAt`. Continue toward the original target. Stop on errors or a bounded non-progress failure; do not skip unresolved work.

Accepted starts record active work in host state. Finish/interrupt receipts refer to that activity
and actual outcomes. Communication settlement supplies requested items, recipients, received item ids
and attention. Preserve disclosure/transmission chains in the host.
Use stable receipt ids and HF's settled-request ledger to prevent duplicate effects.
These games use deterministic local world state; irreversible external effects would additionally
require durable idempotency outside this recipe.

## Inspect and preview

Use explicit host or person perspective. Privileged host reads support world logic; player-facing
views use admitted observer evidence. Never silently replace an unavailable reading with truth.
A person can preview only their own inputs/actions. Other actors remain represented by that
observer's held evidence. Preview may stop at `world-required`; it cannot supply unknown future
host outcomes. Keep hypothetical narration out of the live log. Compare the complete live archive
before and after inspection/preview for equality.

## Save active work and replay

Retain the full archive: exact engine package/build/schema, spec, people, transactions, current
actor/world state and hashes. Put replay-critical host data in `world.hostState`, or use a separately
versioned and validated envelope with complete host state and ordered host inputs. Retain outer
host RNG state too. Materialize archives at save/export checkpoints, not every render frame.

Validate the outer schema/edition and input contract, then check `restoreRun` and decode the host
state strictly. Pending requests and active activities must survive. Refuse unsupported versions
with a keep-file/start-fresh message. Never silently replace refused runs or finish active work.

Save after an accepted start and before finish. JSON round-trip the archive. Continue both original
and restored runs with identical target times and inputs. Require equal complete archives and
host state. Also save at an unresolved boundary and verify identical pending request identities.
Require `replay(archive)` to return `verified:true` and `fullHash` equal to the exported full hash.
This proves the recorded step chunking; new chunking need not produce the same full hash.
HF replay alone does not prove an outer game log: rebuild the game from that log and compare its
complete state/export too.

## First candidate: Stairwell

Audited source: [stairwell@329919a](https://github.com/adam0white/stairwell/tree/329919a).
Production pin remains HF 3.0.0. Process/worktree inspection found no Stairwell writer;
Hearsay had a running Vite preview. The deferred director's named games were excluded.

The intended normal action is a caretaker job: accept start, save the active task, then record
completion. The headless control offers rest with the same seed. The
[executable public-run control](hf4-port-control.md) proves this protocol in the minimal host on
published 4.1.0. It **does not execute Stairwell's game loop**. The actual caretaker action, month,
cast journeys, game export, deployment and owner acceptance remain unproved on HF 4.

| Numbered gap                  | Evidence and required resolution                                                                                                                                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G2: portable admission        | `src/sim/one-cast.ts` uses `projectPersona`, `validatePersonaProjection` and `admitPersona`; cast/native routes also use portable contracts. Published 4.1.0 rejects any `createPerson` input containing `admission` and host inspection of `persona`/`calendar`. Ship supported admission/projection first. |
| G3: sourced norms             | `src/sim/cast-life.ts` imports the sourced default norm catalogue for cast/calendar validation. That export is absent from 4.1.0. Resolve the shared catalogue contract; copying framework defaults into the game is not the port.                                                                           |
| G4: source trust and forecast | `src/sim/game.ts:3193` exposes `trustOf` through `readOf`; `:683` uses `bodyForecast` for climb guidance. 4.1.0 inspection lacks source trust and preview lacks that forecast reading. Add supported readings with the existing visibility restrictions and forecast gate.                                   |

Recommendation: the HF director resolves G2/G3/G4; the Stairwell maintainer then implements the
bridge and runs the actual host proof. G1 stays open for the first integrated game and delivery.
Existing targets remain recipe 2026-11-10, candidate 2026-11-24 and blocker review 2026-12-01.
No framework source or game logic changed for this audit. No 4.x game deployment is claimed.

## Per-game delivery gate

- Replace old calls and direct actor mutations with supported routes. Pin the released package exactly, regenerate the pnpm lockfile, then freeze-install.
- Prove a normal game action/control, active-work and pending-boundary restore, read-only preview, exact HF replay and complete game-log replay. Preserve supported continuing people or record a blocking G-item.
- Run `check:lane` before each signed commit; gated paths run full `check`. Use the repo's suite lock. Include the Codex trailer. Obtain one independent review, open a PR, request `@codex review` and fix verified findings.
- Merge without `--delete-branch`. Require green `ci` on the exact merged commit before deploying. Verify live `/release.json` commit, framework pin and `dirty:false`. Keep the receipt separate from tests and owner acceptance.
- Remove merged/pushed task worktrees and their merged local/origin branches. Stop only task-owned exact PIDs. Preserve patches and untracked files before removing dirty or unmerged work. End the report with each touched repo's worktree list.
