# Voice HF 4.9 audit — 2026-10-29

The port is blocked by two existing contract needs, G4 and G2. Voice remains on its released HF 3.2 runtime. No public 4.9 game bridge, deployment, new playtest or carryover receipt is claimed. The protocol control below is independent of the game.

## G4: current feelings and learned expectations

The live game displays Halil's named feelings, their intensity and cause in `sim/view.ts:240`. It displays learned clinic, telephone and mosque expectations and their change in `sim/view.ts:118`. `sim/game.ts:370` records their opening values. These are current HF-owned readings, including while he works or sleeps.

Published 4.9 accepts those states in person authoring. Its public `inspect` contract has no `affect`, `memory` or `expectations` selection. The isolated control authors grief, gratitude and a learned negative work expectation. Requests for those three selections fail with `invalid-schema` at pending and active work. `condition` and `summary` contain neither the named emotion instances and their causes nor the learned expectation. Current targeted fear is supported as `condition.selfReport.fearOf`; it cannot stand for a learned adverse expectation after fear has faded.

An idle `persona` projection contains retained memory expectations. Active `persona` projection refuses with `invalid-admission`. It is a portable departure route, not a live reader. Raw exported actor fields are not a public game reading. Recalculating decay or learned expectation in Voice would copy framework ownership. Replacing these readings with empty lists would remove existing gameplay information.

Watch and Well share this need. Watch uses learned adverse expectation in `watch/sim/voices.ts` to select the feared section even without a current fear instance. Well uses `colony/sim/human-view.ts` `emotionOf` to display named current feelings about another person. Their specific audits remain with those hosts.

Required resolution: extend the existing knowledge-bounded inspection route to return current named affect with intensity, cause and target, and learned action expectations with their key and valence. Prove the result during active and pending work, read-only behavior, exact restore and replay. Keep host/self/other perspective limits. A new local coefficient or archive reader does not resolve G4.

## G2: Voice source and receiving roles

The released lab-client 0.5.8 artifact has no Voice entry in its source/receiving role map. Its exported `projectPortablePerson` rejects all five existing Voice cast roles with “This person has no authored chapter in this game.” The control creates a valid retained v2 Selin passport from a Days opening through public HF `inspect`. The SDK's `portablePersonRole(envelope, 'voice')` rejects it with “This person has no matching authored role here.”

The SDK's verified-reader map is empty. The exported `portableWriteBlockers` reports Days among Selin's blocked Voice peers and Well among Yusuf's blocked Left Hand peers. Registering a role alone would not lift that write gate. Shared carryover requires both a released SDK role binding and verified peer reader/per-person-skip evidence. Do not bypass the gate or claim a journey from the registry alone.

Required resolution: publish the Voice role bindings through the existing SDK route, then establish actual source/receiving deployment and per-person-skip evidence before shared writes. The parent owns shared adapters and release decisions. The old Selin mid-run Good Hands replacement is not the blocker: the port recipe permits a new opening at a chapter boundary and forbids replacing a live actor by archive edits.

## Executable released-artifact control

`sim/hf49-contract.test.mjs` supplies three focused tests. `sim/hf49-contract-fixture.mjs` contains authored example data, not copied HF kernels. The separate `sim/hf49.vitest.mjs` config keeps this 4.9 contract probe outside the released 3.2 game's ordinary suite.

The positive work/rest control proves accepted action starts, an unresolved start checkpoint, active-work JSON restore, identical continuation from that checkpoint, unchanged preview and exact `replay(...).fullHash`. The negative tests prove the unsupported live readings and SDK role/write refusals without changing the complete HF archive. These results do not prove the complete Voice month or whole-game input log replay. Existing Voice replay-hash and headless game tests remain unchanged.

Verified packages:

| Artifact   | Release                                                       | SHA-256                                                            |
| ---------- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| HF         | npm `@adam0white/human-framework@4.9.0`                       | `97485db053f24639003d4bc5e2e0958d7550a809a8affeeae924c8c765aece80` |
| lab-client | GitHub `lab-client-v0.5.8`, `adam0white-lab-client-0.5.8.tgz` | `167f40647320d45738e15e6d8ce72e691cf7cc5fe1d5d565716282d410b04cdc` |

The client is a GitHub release artifact, not an npm publication. The control ran on Node 26.12.0 with Vitest 5.0.5: **3 passed**.

Extract the two artifacts into `$HF49_ARTIFACT_ROOT/node_modules/@adam0white/human-framework` and `.../lab-client`, stripping their `package/` prefix. Also supply the client's declared `@adam0white/hf-legacy` alias to released HF 3.0.0 in that directory. The config checks exact package versions. From the repository root, run:

```sh
env HF49_ARTIFACT_ROOT=/absolute/path/to/artifacts PATH=/opt/homebrew/bin:$PATH \
  pnpm exec vitest run --config apps/site/src/voice/sim/hf49.vitest.mjs
```

The reviewed local extraction is `/Users/abdul/code/.lab-scratch/codex/central-voice49-runtime`. The release artifacts are immutable; the extraction is a local test convenience.

Next decision checkpoint: 2026-11-03, recheck published G4 inspection and G2 SDK/reader evidence. This is a proved contract refusal, not a deferral based on implementation time. The migration remains required after those contracts are available. The owner accepts the final game release receipt.
