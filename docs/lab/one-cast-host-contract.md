# One cast host contract

Approved first wave, 2026-10-23. HF 2.15.0 is additive, engine 2.14.1 unchanged. Client 0.3.0 and kit 0.4.0 ship as exact tarballs. Canonical facts and per-host maps are in [cast-registry.md](cast-registry.md). No cross-device sync or new server infrastructure is authorized. Owner review: 2026-11-03.

## Passport

Use HF `projectPersona(source, mapping)` and `admitPersona(projection, authoredOpening, policy)`. The HF module and package README specify the exact general allowlist. Hosts author semantic maps and canonical source-compatible openings. They keep whole source checkpoints locally, never in the shelf. Source obligations and injury/death conflicts block admission. A transfer is a declared projection, not source-world continuation. Store the complete admitted initial Person and envelope in the replay. A return needs a new chapter with a deterministic source-world prefix, not a time reversal or replacement of a loaded game.

## Shelf


`personaChannel()` is separate from recording. Its `ready: Promise<boolean>` reads the central browser continuity choice through a boolean-only handshake. A fresh target must await `shelf.ready` before checking `shelf.enabled`, deciding an automatic arrival or attaching persona upload hooks. Enabling continuity in one participating game applies to later participating games in this browser; turning it off applies globally. No cast metadata or recording identity is returned by this handshake. Existing loaded runs remain pinned. Call `setEnabled(true)` only after the player enables continuity. The exact participating origins are HTTPS human, pass, murmur, stairwell, hearsay and goodhands on adamwhite.work. A blocked bridge needs a local file fallback. The central screen is `/lab/people/`; it can inspect, download, import and delete browser continuity. Browser eviction can lose it. Deleting continuity does not delete received lab records.

```ts
import { createPersona, personaChannel, watchPersonaCheckpoint } from '@adam0white/lab-client';
const shelf = personaChannel();
await shelf.ready;
// The host gets the player's explicit continuity choice before this call.
shelf.setEnabled(true);
const original = await createPersona({
  format: 'hf-persona/1', castId: 'hf.cast.example.host', castRevision: '1',
  branchId: crypto.randomUUID(), parentRevision: null,
  source: { game: 'pass', build: 'abc123', engine: '2.14.1', rules: '1' },
  transfer: { person: projection, history: [] }, limitations: projection.limitations,
});
// authored:true is only for a newly authored source. Never use it for imported history.
await shelf.request({ action: 'put', envelope: original, authored: true });
```

The host owns HF projection validation, semantic admission and the complete admitted initial snapshot in its replay. `transfer.person` is the strict `PersonaProjectionSnapshot` from HF, serialized as plain JSON. Its source includes schema, engine, simulation minute and complete RNG; the envelope checksum covers all fields. `transfer.history` contains bounded host-approved facts. `transfer.admission`, if used, contains pinned host mapping stamps. This client admits bounded JSON, not fictional meaning.

`list` returns metadata only. `get` requires a selected `castId`. Automatic arrivals after opt-in apply only when creating a fresh run. A loaded run keeps its pinned state. Before returning from admission, advance the shelf with a target claim:

```ts
const arrival = await shelf.request<PersonaEnvelope | null>({ action: 'get', castId });
if (arrival) {
  // Validate and prepare target admission before claiming; keep it immutable afterwards.
  const { revision, ...body } = arrival;
  const claim = await createPersona({ ...body, parentRevision: revision, source: targetStamps });
  await shelf.request({ action: 'put', envelope: claim });
  // Start fresh target run from the prepared admission; pin claim + complete initial Person.
}
```

Each later checkpoint uses the last accepted revision as `parentRevision`. `watchPersonaCheckpoint(callback)` calls the host callback on pagehide and visibility-hidden; the host calls the same callback at chapter boundaries. The callback must check opt-in and serialize concurrent checkpoints. Revision validation precedes storage; CAS happens in one central IndexedDB readwrite transaction. Duplicate revisions are idempotent. A stale parent cannot replace a head. Do not retry with the latest head. Offer file export or an explicit fork: create a new branch id, set parent null, then put with `fork:true`. The fork becomes that person's active branch. Other people keep their active branches. There is no timestamp merge. Limits are 256 KiB per envelope, ten retained revisions and 2 MiB overall. Automatic checkpoints prune oldest accepted non-head cache entries deterministically. Every active head is retained. If those heads cannot fit, admission refuses before mutation. Source saves and receiving replays keep their own pinned history; download a backup.

Recording an arriving history can reconnect recording identities. Set the gate **before attaching any upload hooks**:

```ts
lab.setPersonaRecording(arrival.branchId);
const { sameEpoch } = await shelf.request<{sameEpoch: boolean}>({ action: 'recording', castId });
if (sameEpoch) lab.allowPersonaRecording(true); // No new prompt for unchanged identity.
// Otherwise show the kit's historical-linkage question; default is local-only play.
// Only after an explicit yes:
await shelf.request({ action: 'recording', castId, allowRecording: true });
lab.allowPersonaRecording(true);
```

The central recording association is separate from portable envelopes and never returns the recording id. Files have no association; absent or changed identity needs the explicit choice. `setPersonaRecording(null)` is for a genuinely fresh authored run with no imported history. The gate blocks events, milestones, automatic and explicit runs, saves, logs, notes and legacy Send until allowed. Recording off aborts pending uploads; a new identity invalidates the old association. Same-epoch continuation keeps normal recording. File export and local play always remain available. Character analysis remains a separate consent.

The host also records `transfer.checkpoint`: source schema, simulation minute, full RNG state and a SHA-256 `checkpointDigest` of the full source Person snapshot computed outside HF. The raw checkpoint stays only in source saves/exports. Host mappings and replay headers independently stamp target build, adapter, mapping and opening clock.

## Private measurement

Replay exports include top-level `oneCast`, an array of rows. Each row has `v: 1`, `probe` (`zeynep`, `dilan`, `derya`, `selin`), `arm` (`fresh`, `biography`, `continuing`), `scope` (`shared`, `local`, `file`), `castId`, `branchId`, SHA-256 `revision`, SHA-256 or null `parentRevision`, `stage` and `outcome`. All string fields are bounded tokens, not free text. Use `stage: checkpoint` for an accepted shelf revision and `stage: admitted` for target acceptance. Keep historical rows in the source export. The admitted row names the arriving payload revision and its actual source parent so the inbox can join target.parentRevision to source.revision. Intermediate claim revisions remain replay provenance, not a fabricated source checkpoint.

Use the existing lab milestone channel for source eligibility/completion, bridge failures, encounter/import choices and trial results. `npm run lab:inbox` reconstructs complete received run chunks before extracting rows, retains distinct revision evidence for joins and deduplicates milestone counts by player/game/run/probe/cast/stage, and joins a shared continuing branch only within the same recording identity. File/local scope stays separate. Missing or expired uploads and recording-off/privacy-suppressed play are outside received denominators. Counts do not establish recognition or attachment. Owner words and optional neutral recognition questions remain the evidence for that. Zeynep needs matched target-seed fresh, biography and carried-skill ablation.
