# Port one game to HF 4.x

G1 recipe, 2026-10-27. Target: **`@adam0white/human-framework@4.4.0`**, an exact pin.
The [needs inventory](hf4-game-needs.md) owns framework gaps and dates.
The owner accepts the all-games outcome; each host maintainer supplies delivery receipts.
This recipe is documented and its published 4.4 public-run control passes. **The first whole-game port remains unproved.** Stairwell's earlier catalogue, trust and forecast prerequisites are published; its additional authored reputation vocabulary is G17.
The control is not evidence that Stairwell, carryover, or all games have upgraded.

## Glossary

- **Host:** the game code that runs HF and handles its requests.
- **Receipt:** the host’s reply that a requested action happened or failed.
- **Boundary:** the point where HF stops and asks the host to respond.
- **Admission:** bringing an existing person into a run.

## Establish the host boundary

Create one managed worktree per repo. Check processes and worktrees before choosing a game.
Pass the repository's absolute path to the worktree helper, for example
`npm run wt -- add ~/code/stairwell g1b` from the HF checkout; a relative `stairwell`
path is resolved from the current directory.
Install with `pnpm install --frozen-lockfile` and `/opt/homebrew/bin` first on PATH.
Inventory every HF import, direct Person read/write, save/export consumer, cast admission and
publication path before changing the pin. The
[4.4.0 public exports](https://github.com/adam0white/human-framework/blob/v4.4.0/packages/human/src/index.ts)
and [data contract](https://github.com/adam0white/human-framework/blob/v4.4.0/packages/human/src/run-schema.ts)
are the authority. A type declaration does not prove its runtime route is implemented.

The game owns places, tasks, inventory, transport, authored dialogue and actual world outcomes.
HF owns actor state, decisions, bodily change, beliefs, trust and replay.
Do not copy an HF kernel or add local belief/trust/body calculations to fill a missing route.
Record a numbered framework gap and retain the released game until it is supported.
Old saves may be explicitly refused. Existing continuing-person features still need supported
admission; fresh authored replacements do not preserve them.

## Map calls and reads

These are routes to implement and prove, not promises of identical 3.x numerical behavior.
Every faculty remains on. Delete every `enable*` option and legacy-continuation call; list each in the port report. Author differences as state.
HF 4 time and durations use **integer milliseconds**. Convert game minutes once at the bridge
(`minute * 60_000`); preserve calendar epochs and birth times in the same units.

| 3.x operation                                                      | 4.4 route and host obligation                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createPerson`, initial `seedTie`, `seedBelief`, `seedSourceTrust` | `createRun(RunSpec)`, then `createPerson(run, PersonAuthoring)`. Author relationships, beliefs, source trust, held norms and provenance in state. Register referenced definitions and sources. No later direct actor mutation.                                                                                                                         |
| `decide`                                                           | `offers.received` with a new revision; `suggestion.received` when applicable; `decision.requested` naming the offer revision. Preserve suggestion identity, source and time. Read admitted events and requests.                                                                                                                                        |
| `begin` / `finish`                                                 | Settle HF action requests at stage `start`, `finish` or `interrupt` using `action.resolved`. Check world availability, then record accepted/rejected start or actual completed/failed/interrupted outcome. `activity.interrupted` requests interruption; it does not fabricate completion.                                                             |
| Authored dialogue and narration                                    | Use `definitions.lexicon.wordings` and `definitions.lexicon.voices`; keep HF narration in HF.                                                                                                                                                                                                                                                          |
| `tick`                                                             | `step(run, {until, inputs})`; serve every `world-required` boundary. Daily fidelity is a separate workload gate, not a conversion of minutes to days.                                                                                                                                                                                                  |
| `perceive`, `told`, `confirm`, `contradicted`                      | `observation.received`, `testimony.received`, `fact.confirmed`, `contradiction.received`. Retain evidence ids, teller/source identity, proposition and direct/heard provenance. Submit observed consequences, not a desired trust target.                                                                                                              |
| `converse` / retelling                                             | `conversation.requested` / `retelling.requested`, followed by `communication.resolved` with actual transport and attention evidence. Emission alone is not receipt.                                                                                                                                                                                    |
| `socialEvent`                                                      | `social.received` with actual event evidence. Initial ties belong in person authoring. Do not replace relationship mutation with a local coefficient.                                                                                                                                                                                                  |
| `readBody`, `credence`, `relationshipWith`, event reads            | `inspect` with explicit perspective, people and selections (`body`, `beliefs`, `relationships`, `events`, etc.). Beliefs are structured evidence, not the old scalar API. Any new projection needed by a UI belongs in HF.                                                                                                                             |
| `trustOf` in Stairwell UI                                          | Use `inspect` with `select:['sourceTrust']`. Host/self receive held trust; another observer receives `unobserved`. Do not use archive internals as the UI interface.                                                                                                                                                                                   |
| `predict`, `bodyForecast`                                          | `preview` returns hypothetical possibilities, a boundary and knowledge limits. Its optional `bodyForecast` accepts labelled duration/load spans and returns `person`, `from`, `endsAt`, `worst`, `worstOf` and a conditional basis. It does not predict host outcomes.                                                                                 |
| `snapshot` / `restore`, whole-game export                          | `exportRun`, `restoreRun`, `replay` for the run, plus validated host data. Portable cast projection is separate: host `inspect` persona/calendar plus `createPerson(...,{portable:{person,mapping},...})` admit supported retained v2 state before the first step. Unsupported active work refuses. The old `admission` field is archived schema only. |

For wording tables, use keys from `NARRATION_TEMPLATES` and matching slots. Each voice id must occur in `lexicon.names` or `lexicon.roles`. HF validates these tables at `createRun`. Voices fall back to wordings, then built-in text. Editing wordings can change replay hashes: keep the tables with the archive spec and re-record golden hashes after edits.

For month-long runs, `StepBatch.fidelity` supports `{mode: 'daily', dayMs, anchor}`, but no month-long game workload has been proved here.

Inputs carry `{id, at, source, kind, payload}`. Use unique, stable ids and registered sources.
Retain accepted batch boundaries and order: replay uses the archive's accepted transactions.
Keep the player's timed input log and the host schema/edition alongside the HF archive.

## Answer HF’s requests before moving time

The public [minimal host](https://github.com/adam0white/human-framework/blob/v4.4.0/packages/human/examples/minimal.ts)
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
require a durable way to prevent a repeated receipt from applying twice outside this recipe.

## Inspect and preview

Use explicit host or person perspective. Privileged host reads support world logic; player-facing
views use admitted observer evidence. Never silently replace an unavailable reading with truth.
A person can preview only their own inputs/actions. Other actors remain represented by that
observer's held evidence. Preview may stop at `world-required`; it cannot supply unknown future
host outcomes. Keep hypothetical narration out of the live log. Compare the complete live archive
before and after inspection/preview for equality.

## Retained people at a new opening

Project one idle source person with host `inspect`, selecting `persona` and `calendar` and supplying
`portable:{person,castId,castRevision}`. Use the v2 passport through `createPerson`'s `portable`
field, with an integer `offsetMs` and explicit injective action/entity/source/norm/proposition mappings.
Admit the cast before the first step. Keep the portable input and admitted identity with the archive.
The receiving opening cannot replace incoming beliefs, trust, memory or duties with fresh defaults.

The published legacy2.21/2.23 route requires verified raw native source, its exact engine,
source calendar and norm catalogue, and explicit researched norm provenance. The core converts
semantic minute clocks to milliseconds before applying the receiving offset. A calendar-only old
passport cannot recover memories it omitted: restore/replay the checkpoint-matching raw source or
refuse clearly and retain the file. Source runtime RNG/continuations stay archived; v2 starts the
receiving Run's own stream. This is not exact legacy whole-game continuation.

Keep one community Run when communication involves its people. An external person source is not
an admitted recipient. Do not replace a mid-run actor by editing an archive or restart active peers.
The current Stairwell route ends one chapter and admits supported people at a new opening; its
unmounted historical return prototypes stay in a separate historical dependency boundary.

Before publishing a source checkpoint, audit both activity and unresolved requests involving that
person. `activity:null` alone can miss a pending start or communication. Keep this host-boundary
check separate from portable actor projection and from the shelf's actual ownership ACK.

## Save active work and replay

Retain the full archive: exact engine package/build/schema, spec, people, transactions, current
actor/world state and hashes. Put replay-critical host data in `world.hostState`, or use a separately
versioned and validated envelope with complete host state and ordered host inputs. Retain outer
host RNG state too. Materialize archives at save/export checkpoints, not every render frame.

Validate the outer schema/edition and input contract, then check `restoreRun` and decode the host
state strictly. Pending requests and active activities must survive. Refuse unsupported versions
with a keep-file/start-fresh message. An archive restores only under the exact HF package, build and schema that wrote it. Every HF upgrade, even a patch, refuses older archives. Show the start-fresh message and keep the old file. Never silently replace refused runs or finish active work.

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
published 4.4.0, including source-trust and conditional body forecasts. It **does not execute Stairwell's game loop**. The actual caretaker action, month,
cast journeys, game export, deployment and owner acceptance remain unproved on HF 4.

| Numbered gap                        | Evidence and required resolution                                                                                                                                                                                                                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G2: portable admission              | Published 4.4 provides retained v2 host projection and pre-step admission through the sole portable route. Replace the old one-cast DTO in the current public new-opening route; verify raw historical source instead of inventing omitted memory. Actual game journey proof remains.                            |
| G3: sourced norms                   | Published 4.4 exports sourced DEFAULT_NORMS with research/interpretation provenance. Use that catalogue for cast/calendar validation; do not copy defaults into the game. Wider worship scheduling remains its separate need.                                                                                    |
| G4: source trust and forecast       | Published 4.4 supports inspect sourceTrust and preview bodyForecast with existing visibility limits. Adopt these readings; broader observer signs are separate.                                                                                                                                                  |
| G17: authored reputation vocabulary | Stairwell authors nosy with -0.03 affection/trust/respect. Published 4.4 changes the belief but has no authored vocabulary route for its relationship effect. Add immutable run-scoped vocabulary through the existing social route, with correction/isolation/replay controls; no game-side reputation formula. |

Recommendation: adopt the published 4.4 G2/G3/G4 subset, resolve G17, then implement the bridge and run the actual host proof. The final exact game pin follows the published G17 minor; its 4.5 candidate is not yet a release. G1 stays open for the first integrated game and delivery.
Existing targets remain recipe 2026-11-10, candidate 2026-11-24 and blocker review 2026-12-01.
The original audit changed no game logic. Framework 4.4 is now published and the game bridge is being implemented; no 4.x Stairwell deployment is claimed.

## Per-game delivery gate

Done: the owner accepts the game’s 4.x release receipt; nothing else counts.

- Preserve Hearsay garden replay artifacts with a separately isolated historical HF 3 runtime for its exact peer and direct legacy imports; do not bypass the peer constraint.
- Replace old calls and direct actor mutations with supported routes. Pin the released package exactly, regenerate the pnpm lockfile, then freeze-install.
- Prove a normal game action/control, active-work and pending-boundary restore, read-only preview, exact HF replay and complete game-log replay. Preserve supported continuing people or record a blocking G-item.
- Run `check:lane` before each signed commit; gated paths run full `check`. Use the repo's suite lock. Include the Codex trailer. Obtain one independent review, open a PR, request `@codex review` and fix verified findings.
- Merge without `--delete-branch`. Require green `ci` on the exact merged commit before deploying. Verify live `/release.json` commit, framework pin and `dirty:false`. Keep the receipt separate from tests and owner acceptance.
- Remove merged/pushed task worktrees and their merged local/origin branches. Stop only task-owned exact PIDs. Preserve patches and untracked files before removing dirty or unmerged work. End the report with each touched repo's worktree list.
