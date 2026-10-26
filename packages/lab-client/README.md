# Lab client

This README describes the client 0.4.12 candidate. Client distribution uses immutable GitHub release artifacts, not npm publication. It depends on exact HF 3.0.0. Use the [SDK adoption guide](../../docs/lab/navigation-journal-adoption-2026-10-25.md) and verify the [release digests](../../docs/releases.md#lab-package-artifacts--2026-10-25).

Workspace candidate version: **0.4.12**. This candidate adds exact-origin admission for smoke, word, child, days and lefthand. Recording off and notice fallback create no player ID. The **0.4.11** [GitHub artifact](https://github.com/adam0white/human-framework/releases/tag/lab-client-v0.4.11) is published from separate source `569bfeed`, with exact CI 40241110596. Its source is integrated into this 3.2 candidate; live host adoption still needs deployment. See [SDK adoption](../../docs/lab/navigation-journal-adoption-2026-10-25.md) before using its opt-in Feedback choices.

Default-on, pseudonymous play recording for the HF game lab. The visible notice and menu toggle come from `@adam0white/lab-kit`. Games supply full replay exports and actual saves. Screens remain game-owned.

```ts
const lab = createLab({ game: 'pass' });
const stop = lab.trackRun(() => exportReplay(), { runKey: () => runGeneration });
lab.captureSave(savedValue); // after a successful save
lab.log('game', 'The crossing opened.');
await lab.sendFeedback('The crossing was unclear.'); // resolves only after the note is stored
```

Every automatic record has a random player id, session id and run id, plus game/build and timestamp. The central identity frame shares localStorage identity across lab subdomains using checked messages; blocked frames fall back to an origin-scoped id. No cookies or device fingerprinting. Each redacted log message is limited to 1,000 bytes of JSON-escaped UTF-8 content, stopping between whole codepoints. Warn/error console strings and uncaught errors are bounded; game logs come from the adapter. Common email strings and URL queries/fragments are removed from client logs. Arbitrary console objects and browser headers are never read.

`lab.telemetryOn` and `lab.eventsOn` report recording eligibility. `lab.setTelemetryOff(true)` stops recording, clears the local queue, aborts active recording requests and deletes the player id. Explicit feedback remains available as an unlinked note. `setEventsOff` controls the same recording preference. DNT/GPC sets the default to off. Turning the single recording switch on with `setTelemetryOff(false)` is explicit opt-in, including under DNT/GPC. Recorded play is linked across games on this device to continuing people. The first-visit notice covers recording and linkage; no separate continuing-person permission is required.

Runs/saves are JSON, capped at 16 MiB and 128 chunks of at most 64 Ki UTF-16 characters. Each piece is at most 256 KiB gzip / 512 KiB inflated. IndexedDB holds at most 256 pending pieces / 16 MiB. Automatic pieces expire after seven days; notes remain until receipt or recording is turned off. Automatic recording retries politely up to five attempts. Notes retry while recording is on and are not discarded after server or network refusals. Stable content ids make server storage idempotent. Queueing does not prove delivery; `sendRun` and the linked `sendEnvelopeText` resolve with an upload reference after queueing. `sendFeedback` bypasses a busy snapshot queue and resolves only on stored HTTP 200. The dialog says Sent only after that receipt; otherwise it retains the text and explains how to retry. `trackRun` snapshots every minute and on hide; browsers closing, offline periods and limits can leave gaps.

`sendFeedback(note, { name?, run?, sharePlay? })` requests a current snapshot before sending a linked note when recording is on. Recording off sends only the note and optional name, without linkage. `sharePlay:true` is the explicit checkbox choice applied on Submit: it turns recording on, includes the supplied run and links the note. A failed or oversized run cannot block the note. Explicit notes carry privacy override; the Worker also accepts older queued notes under DNT/GPC because submitting a note is explicit consent. Automatic recording keeps its privacy gates. Recording identity resets do not cancel note-only requests. The compatibility methods `setPersonaRecording` and `allowPersonaRecording` never gate recording. Old per-person permission state is ignored and removed when the host identifies the persona. `personaRecordingRequired` is always false. Character analysis remains a separate opt-in.

`openSendDialog` shows verdict, note, optional name and Submit in one sheet. When recording is off, it adds one unticked checkbox: “Share this run and my play with the lab”. Checkbox changes do not enable recording until Submit. The optional name is trimmed to 60 characters, stored locally after submission and sent at the top level of the note envelope. Clearing and submitting removes the saved name. Names are unverified labels. Storage failures do not block sending. Programmatic feedback sends only the name explicitly supplied.

The site games provide full seed/input/state exports through their worker adapters. External games must adopt `trackRun`, successful-save capture, game logs and the kit notice/toggle; installing the package alone cannot supply their exports. Their CSP must permit `frame-src https://human.adamwhite.work` for cross-game identity and `connect-src https://human.adamwhite.work` for the default recording endpoint. Collection stays off on localhost unless `sendFromLocalhost: true` is explicit.

Private ingestion: `npm run lab:inbox`. Retention, bounds and protocol: [linked telemetry](../../docs/lab/linked-telemetry-2026-10-22.md). Public privacy note: https://human.adamwhite.work/lab/privacy/.

### Fictional-person shelf (browser only)

`personaChannel()` supplies fictional continuity automatically in participating games on this device. It starts enabled and sends an enabled handshake to the central shelf. A fresh target must await `shelf.ready` before deciding an automatic arrival or attaching persona upload hooks. The boolean handshake returns no cast metadata or recording identity. Existing loaded runs remain pinned. `setEnabled` remains a compatibility method; do not add a separate continuing-person switch or consent gate. Recording and linkage follow the single Recording switch. The exact participating origins are HTTPS human, pass, murmur, stairwell, hearsay, goodhands, glance, rope, repair, valley, warren, neighbours and commonstead on adamwhite.work. Voice, Well and Watch share the human origin. A blocked bridge needs a local file fallback. The central screen is `/lab/people/`; it can inspect, download, import and delete browser continuity. Browser eviction can lose it. Deleting continuity does not delete received lab records.

```ts
import { createPersona, personaChannel, watchPersonaCheckpoint } from '@adam0white/lab-client';
const shelf = personaChannel();
await shelf.ready;
// Continuity starts automatically; no separate player permission is required.
const original = await createPersona({
  format: 'hf-persona/1',
  castId: 'hf.cast.example.host',
  castRevision: '1',
  branchId: crypto.randomUUID(),
  parentRevision: null,
  source: { game: 'pass', build: 'abc123', engine: '2.14.1', rules: '1' },
  transfer: { person: projection, history: [] },
  limitations: projection.limitations,
});
// authored:true is only for a newly authored source. Never use it for imported history.
await shelf.request({ action: 'put', envelope: original, authored: true });
```

The host owns HF projection validation, semantic admission and the complete admitted initial snapshot in its replay. `transfer.person` is the strict `PersonaProjectionSnapshot` from HF, serialized as plain JSON. Its source includes schema, engine, simulation minute and complete RNG; the envelope checksum covers all fields. `transfer.history` contains bounded host-approved facts. `transfer.admission`, if used, contains pinned host mapping stamps. This client admits bounded JSON, not fictional meaning.

`list` returns metadata only. `get` requires a selected `castId`. Automatic arrivals apply only when creating a fresh run. A loaded run keeps its pinned state. Before returning from admission, advance the shelf with a target claim:

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

Each later checkpoint uses the last accepted revision as `parentRevision`. `watchPersonaCheckpoint(callback)` calls the host callback on pagehide and visibility-hidden; the host calls the same callback at chapter boundaries. The callback must check that continuity is enabled and serialize concurrent checkpoints. Revision validation precedes storage; CAS happens in one central IndexedDB readwrite transaction. Duplicate revisions are idempotent. A stale parent cannot replace a head. Do not retry with the latest head. Offer file export or an explicit fork: create a new branch id, set parent null, then put with `fork:true`. The fork becomes that person's active branch. Other people keep their active branches. There is no timestamp merge. Limits are 256 KiB per envelope, forty active people, 120 retained revisions and 16 MiB overall. Automatic checkpoints prune oldest accepted non-head cache entries deterministically. Every active head is retained. If those heads cannot fit, admission refuses before mutation. Source saves and receiving replays keep their own pinned history; download a backup.

Recording and continuing-person linkage follow the single recording switch. First-visit disclosure covers linkage across games on this device. Old shelf epoch receipts may still be used by older hosts, but they are not permission gates. Loaded runs, admission snapshots and transactional parent checks remain unchanged. File export and local play remain available. Character analysis still requires separate opt-in.


Regular event and log flushes first save immutable chunks synchronously in localStorage, then use the linked outbox. Each chunk keeps its captured build, viewport, player/session/run and time. Independent chunk keys prevent tabs from replacing each other's copies. A copy is removed only after IndexedDB commits it or the receiver acknowledges HTTP 200. It retries on a later visit while recording is on and expires after seven days. Recording off and identity reset erase it. Admission is bounded to256 chunks,256 events,60 log lines and128 KiB per game; at capacity, old copies stay and the40-event memory queue can reject later events. Rejected milestone/screen/end markers may be retried after space opens. A crash before a flush or lifecycle callback, denied browser storage, or never revisiting can still leave gaps. Explicit note receipts and retention are separate and unchanged.

## Canonical cast and bounded life (0.4.0)

`CANONICAL_CAST`, `canonicalCast(castId)` and `castForGame(game)` provide40 curated public profiles. Exact host ids are `voice`, `well`, `watch`, `pass`, `murmur`, `stairwell`, `goodhands`, `hearsay`, `rope`, `glance`, `repair`, `neighbours`, `commonstead`, `valley`, `warren`. Every allocation has3–8 people. Secret biography paragraphs are not in this artifact.

A canonical source adds `transfer.life = initialPersonaLife(castId, branchId, nowMs)` to its already validated host passport. Source checkpoints use `anchorPersonaLife(previousLife, castId, nowMs)`. That advances only the monotone absence anchor, so active play is not also counted as offscreen life. Revision1 history for a person whose current canonical revision is2 remains inspectable; it cannot be reinterpreted. An explicit fresh branch must come from current authored play, use a new branch id and null parent, and put with `fork:true`.

```ts
const admitted = await claimCastChapterBatch(
  shelf,
  castForGame('goodhands').map((p) => p.castId),
  targetStamps,
  async (inputs) =>
    Object.fromEntries(
      inputs.map((input) => {
        const facts = lifeAdmission(input, 'goodhands');
        const person = admitSupportedPassport(input.parent, authoredOpeningFor(input.parent.castId));
        return [input.parent.castId, { person: snapshotCompleteInitialPerson(person), input, facts }];
      }),
    ),
  { isCurrent: () => runGeneration === capturedGeneration },
);
// Pin admitted.initial, inputs and claims. Later owned heads are separate local-save metadata.
```

`prepareBatch` reads every allocated expected head, including null absence, at one quantized time. `putBatch` validates all expected parents and applies all-or-none in one IndexedDB transaction, even for an empty known cast. An old, unsupported or terminal person blocks automatic startup until an explicit fresh-local/alternate decision. `recordingBatch` remains a compatibility protocol; its result must not block recording or feedback. A terminal envelope from `closePersonaBranch` retains history and blocks any normal continuation. Only an explicit new-branch/null-parent fork can replace it. `claimCastChapter` remains a one-person compatibility helper.

`LifePreparation` pins the full parent, quantized `clockMs` and derived `life`. `preparePersonaLife` is deterministic and touches no Person. It changes an existing qualified assignment, local whereabouts and bounded one-sided public work-note encounters. It grants no mutual acquaintance/trust, consent, payment, completed work, health recovery or settled obligation. No maintained background people are generated. Temperament and values weight coarse opportunities. Modern and historical cohorts never mix. Hosts retain the source passport and private omitted state at the source; this is no full world migration.

The central shelf retains40 active heads and up to80 additional historical revisions (120 total),16MiB overall,256KiB per envelope. Only non-heads are pruned. `history` with a selected cast id returns retained revision metadata; `get` with that cast id and optional `revision` retrieves its exact retained envelope. Recording linkage follows the recording switch without another prompt. Loaded runs stay pinned; fresh runs alone prepare and claim current heads.

## Stop and confusion choices (candidate artifact)

Opt in with `lab.openSendDialog({ getRun, feedbackChoices: true })`. The Feedback
sheet offers “I'm stopping” and “I'm confused”. Selecting either only updates the
preview. Submit sends its literal text as an ordinary bounded note, with any
optional written note. No selection preserves the existing payload. These choices
do not stop the game or change recording.

Custom Feedback menus can import `FEEDBACK_LABELS`, `FeedbackLabel` and
`sendFeedbackLabel` from this artifact. For example,
`await sendFeedbackLabel(lab, 'confused', { run: getRun() })` explicitly submits
that label and returns the existing stored-note receipt. Without a supplied run,
the client tries its registered `trackRun` snapshot. Recording off or DNT/GPC
without override sends an unlinked note and excludes the supplied run. Ordinary
`sendFeedback` remains unchanged. Never display success before the promise resolves.

The v2 linked envelope has no agent attribution field. `LabOptions` has no `who`
option, and the linked path of `sendRun` does not forward its legacy `who` option.
Worker admission rebuilds the envelope without unknown top-level fields. Thus a
synthetic session cannot safely mark linked records as agent evidence through this
API. Do not submit synthetic labels or runs to production. A separately reviewed
client/Worker/index attribution contract is required first; name and note text are
not substitutes.
