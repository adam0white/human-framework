# Lab client

Default-on, pseudonymous play recording for the HF game lab. The visible notice and menu toggle come from `@adam0white/lab-kit`. Games supply full replay exports and actual saves. Screens remain game-owned.

```ts
const lab = createLab({ game: 'pass' });
const stop = lab.trackRun(() => exportReplay(), { runKey: () => runGeneration });
lab.captureSave(savedValue); // after a successful save
lab.log('game', 'The crossing opened.');
await lab.sendFeedback('The crossing was unclear.'); // queues a note linked to the current run
```

Every automatic record has a random player id, session id and run id, plus game/build and timestamp. The central identity frame shares localStorage identity across lab subdomains using checked messages; blocked frames fall back to an origin-scoped id. No cookies or device fingerprinting. Warn/error console strings and uncaught errors are bounded; game logs come from the adapter. Common email strings and URL queries/fragments are removed from client logs. Arbitrary console objects and browser headers are never read.

`lab.telemetryOn` reports the recording preference with browser privacy signals respected. `lab.eventsOn` reports whether automatic uploads are eligible, including persona linkage approval. `lab.setTelemetryOff(true)` stops recording, clears the local queue, aborts active recording requests and deletes the player id. Explicit feedback remains available as an unlinked note. `setEventsOff` controls the same recording preference. DNT/GPC suppress automatic recording unless the player explicitly selects `setPrivacyOverride(true)` for that game; a normal on toggle does not override a browser signal. Older explicit Send under a browser signal remains separately consented and unlinked.

Runs/saves are JSON, capped at 16 MiB and 128 chunks of at most 64 Ki UTF-16 characters. Each piece is at most 256 KiB gzip / 512 KiB inflated. IndexedDB holds at most 256 pending pieces / 16 MiB for seven days. Delivery retries politely up to five attempts. Stable content ids make server storage idempotent. Queueing does not prove delivery; `sendRun`, `sendFeedback` and the linked `sendEnvelopeText` resolve with an upload reference after queueing. The shared dialog labels that state honestly. `trackRun` snapshots every minute and on hide; browsers closing, offline periods and limits can leave gaps.

`sendFeedback(note, { name?, run? })` requests a current snapshot before queueing a linked note. It always permits explicit feedback. When recording is on but persona linkage is unanswered or declined, a supplied run is sent in an unlinked envelope. Continuing character state remains part of that replay export. When recording is off or a browser privacy signal suppresses it, only the note and optional name are sent. A failed or oversized run cannot block the note. `personaRecordingRequired` identifies an active persona gate; only explicit `allowPersonaRecording(true)` approves linkage. It does not opt the player into character analysis. `sendRun` and `openSendDialog` remain for current screens; the linked path drops the old optional `who` field. The optional name is trimmed to 60 characters and sent at the top level of the linked note envelope, labelling that player id’s whole timeline. Names are unverified labels. `openSendDialog` offers the same optional name, remembers it after submission in origin-local device storage, and prefills it next time; explicit `name` overrides the prefill. Clearing it and submitting clears the saved prefill. Storage failures do not block sending. Programmatic feedback sends only the name explicitly supplied. The privacy page lists retained legacy labels separately.

The site games provide full seed/input/state exports through their worker adapters. External games must adopt `trackRun`, successful-save capture, game logs and the kit notice/toggle; installing the package alone cannot supply their exports. Their CSP must permit `frame-src https://human.adamwhite.work` for cross-game identity. Collection stays off on localhost unless `sendFromLocalhost: true` is explicit.

Private ingestion: `npm run lab:inbox`. Retention, bounds and protocol: [linked telemetry](../../docs/lab/linked-telemetry-2026-10-22.md). Public privacy note: https://human.adamwhite.work/lab/privacy/.

### Fictional-person shelf (browser only)

`personaChannel()` is separate from recording. Its `ready: Promise<boolean>` reads the central browser continuity choice through a boolean-only handshake. A fresh target must await `shelf.ready` before checking `shelf.enabled`, deciding an automatic arrival or attaching persona upload hooks. Enabling continuity in one participating game applies to later participating games in this browser; turning it off applies globally. No cast metadata or recording identity is returned by this handshake. Existing loaded runs remain pinned. Call `setEnabled(true)` only after the player enables continuity. The exact participating origins are HTTPS human, pass, murmur, stairwell, hearsay, goodhands, glance, rope, repair, valley, warren, neighbours and commonstead on adamwhite.work. Voice, Well and Watch share the human origin. A blocked bridge needs a local file fallback. The central screen is `/lab/people/`; it can inspect, download, import and delete browser continuity. Browser eviction can lose it. Deleting continuity does not delete received lab records.

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

Each later checkpoint uses the last accepted revision as `parentRevision`. `watchPersonaCheckpoint(callback)` calls the host callback on pagehide and visibility-hidden; the host calls the same callback at chapter boundaries. The callback must check opt-in and serialize concurrent checkpoints. Revision validation precedes storage; CAS happens in one central IndexedDB readwrite transaction. Duplicate revisions are idempotent. A stale parent cannot replace a head. Do not retry with the latest head. Offer file export or an explicit fork: create a new branch id, set parent null, then put with `fork:true`. The fork becomes that person's active branch. Other people keep their active branches. There is no timestamp merge. Limits are 256 KiB per envelope, forty active people, 120 retained revisions and 16 MiB overall. Automatic checkpoints prune oldest accepted non-head cache entries deterministically. Every active head is retained. If those heads cannot fit, admission refuses before mutation. Source saves and receiving replays keep their own pinned history; download a backup.

Recording an arriving history can reconnect recording identities. Set the gate **before attaching any upload hooks**:

```ts
lab.setPersonaRecording(arrival.branchId);
const { sameEpoch } = await shelf.request<{sameEpoch: boolean}>({ action: 'recording', envelope: pinnedEnvelope });
if (sameEpoch) lab.allowPersonaRecording(true); // No new prompt for unchanged identity.
// Otherwise show the kit's historical-linkage question; default is local-only play.
// Only after an explicit yes:
const epoch = await shelf.request<{recordingEpoch: string}>({ action: 'recording', envelope: pinnedEnvelope });
// Recheck the pinned run and identity generation before and after the await.
await shelf.request({ action: 'recording', envelope: pinnedEnvelope, allowRecording: true, recordingEpoch: epoch.recordingEpoch });
lab.allowPersonaRecording(true);
```

The central recording association is separate from portable envelopes and never returns the recording id. Files have no association; absent or changed identity needs the explicit choice. `setPersonaRecording(null)` is for a genuinely fresh authored run with no imported history. The gate blocks events, milestones, automatic and explicit runs, saves, logs, notes and legacy Send until allowed. Recording off aborts pending uploads; a new identity invalidates the old association. Same-epoch continuation keeps normal recording. File export and local play always remain available. Character analysis remains a separate consent.

## Canonical cast and bounded life (0.4.0)

`CANONICAL_CAST`, `canonicalCast(castId)` and `castForGame(game)` provide40 curated public profiles. Exact host ids are `voice`, `well`, `watch`, `pass`, `murmur`, `stairwell`, `goodhands`, `hearsay`, `rope`, `glance`, `repair`, `neighbours`, `commonstead`, `valley`, `warren`. Every allocation has3–8 people. Secret biography paragraphs are not in this artifact.

A canonical source adds `transfer.life = initialPersonaLife(castId, branchId, nowMs)` to its already validated host passport. Source checkpoints use `anchorPersonaLife(previousLife, castId, nowMs)`. That advances only the monotone absence anchor, so active play is not also counted as offscreen life. Revision1 history for a person whose current canonical revision is2 remains inspectable; it cannot be reinterpreted. An explicit fresh branch must come from current authored play, use a new branch id and null parent, and put with `fork:true`.

```ts
const admitted = await claimCastChapterBatch(shelf, castForGame('goodhands').map(p => p.castId),
  targetStamps, async inputs => Object.fromEntries(inputs.map(input => {
    const facts = lifeAdmission(input, 'goodhands');
    const person = admitSupportedPassport(input.parent, authoredOpeningFor(input.parent.castId));
    return [input.parent.castId, { person: snapshotCompleteInitialPerson(person), input, facts }];
  })), { isCurrent: () => runGeneration === capturedGeneration });
// Pin admitted.initial, inputs and claims. Later owned heads are separate local-save metadata.
```

`prepareBatch` reads every allocated expected head, including null absence, at one quantized time. `putBatch` validates all expected parents and applies all-or-none in one IndexedDB transaction, even for an empty known cast. An old, unsupported or terminal person blocks automatic startup until an explicit fresh-local/alternate decision. `recordingBatch` requires all pinned branch associations for the current epoch; explicit group linkage requires its queried epoch and an unchanged host generation. A terminal envelope from `closePersonaBranch` retains history and blocks any normal continuation. Only an explicit new-branch/null-parent fork can replace it. `claimCastChapter` remains a one-person compatibility helper.

`LifePreparation` pins the full parent, quantized `clockMs` and derived `life`. `preparePersonaLife` is deterministic and touches no Person. It changes an existing qualified assignment, local whereabouts and bounded one-sided public work-note encounters. It grants no mutual acquaintance/trust, consent, payment, completed work, health recovery or settled obligation. No maintained background people are generated. Temperament and values weight coarse opportunities. Modern and historical cohorts never mix. Hosts retain the source passport and private omitted state at the source; this is no full world migration.

The central shelf retains40 active heads and up to80 additional historical revisions (120 total),16MiB overall,256KiB per envelope. Only non-heads are pruned. `history` with a selected cast id returns retained revision metadata; `get` with that cast id and optional `revision` retrieves its exact retained envelope. Recording linkage remains separate and follows the pinned-envelope, manual epoch and generation rules above. Loaded runs stay pinned; fresh runs alone prepare and claim current heads.
