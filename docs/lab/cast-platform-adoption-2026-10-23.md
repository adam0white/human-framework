# Cast and life adoption

HF2.18.0 is published with engine2.17.0 and verified npm provenance. Client0.4.0 and kit0.5.0 are distributed as immutable local artifacts, not npm publications. Exact source, CI and publication receipts are in [releases](../releases.md).

Use `castForGame()` with the exact source host id. The generated artifact is `packages/lab-client/src/cast.ts`, emitted by `scripts/cast-artifact.py` from the curated registry. Hosts import it through client0.4.0; no manual biography copying. It includes every canonical public profile, cast revision and3–8-person allocation. The registry remains authority for private facts and role-specific outcomes.

## Fresh admission

Await `personaChannel().ready`. Local continuity opt-in is separate from recording and analysis. Only fresh runs call `prepareBatch`/`claimCastChapterBatch`; a loaded run uses its pinned input and admitted state. Project/admit the actual HF passport through a versioned, explicit semantic map. Source projects, activities, duties, owed obligations, clinical body/circadian conflicts, family and qualification mismatches remain refusals. Do not clear them to make travel work. The newest life opportunities do not simulate full days or travel.

`claimCastChapterBatch(shelf, allocation.map(p => p.castId), sourceStamps, admitAll)` prepares the whole applicable cast, validates every semantic target admission, then accepts all claims in one central readwrite transaction. The preparation pins every allocated expected head, including null for absent people. Even an entirely fresh cast performs an expected-absence transaction. One stale, newly appearing, old-edition, closed or incompatible person refuses the whole startup. No partial chapter starts and no current person silently resets. Offer explicit fresh local play or keep the existing chapter. The single-person `claimCastChapter` helper remains a compatibility wrapper; it is not the default universe admission contract.

The callback returns complete initial actors keyed by canonical identity. Consume each `lifeAdmission(input, hostId)` assignment, place and one-sided public-note encounter in actual tasks/locations/conversations. Qualified assignments never erase existing occupation, family, duties or health. Site Watch validates all detached initial actors before CAS, including deferred arrivals. Its actual arrival restores the pinned actor and applies the versioned zero-duration HF calendar/age clock offset against that actor's clone, then location/assignment. It does not use a later fresh target default or infer lived travel, duty completion or health recovery.

Source checkpoints carry the previous life and call `anchorPersonaLife`. Checkpoints use their last accepted parent. A stale source refuses; export or an explicit new branch is recovery. The central shelf retains40 heads and80 non-head revisions within16MiB. History metadata and exact retained revision downloads remain available. To replace an old cast edition, project a real current played person, then use an explicit fresh branch with a new id and null parent. Do not relabel old state.

## Passport dialects

Life is additive metadata. It does not change the semantic dialect of `transfer.person`. Keep a host's existing supported passport mappings explicit.

- Voice Selin's household enquiry uses the existing `voice-selin-calendar/1` / Good Hands return mapping and pinned local departure prefix. Current revision is2. Its `transfer.life` and return header `life` now pin coarse outcomes; all existing source calendar/digest/identity checks still apply.
- The three site games' general dialect is `transfer.castPassport: 'site-cast/1'`, `sourceRole` and `person: CalendarPersonaSnapshot` with mapping `site-cast-calendar/1`. This dialect is not a replacement for external host mappings. The receiving host must register an exact source role/cast id, explicitly map supported actions/skills/episodes/calendars and check exact trusted norm meanings. Unknown skills remain at source and are disclosed as omitted; they never certify a target trade. The site adapter's source table deliberately supports only Voice, Well and Watch. External sources need their own receiving map; never broaden it to arbitrary strings.
- Voice Rıza/Osman can provide current general calendar passports from naturally finished actions through the menu. Hearsay must explicitly admit that source dialect or refuse it. A cast id or public profile by itself does not establish portable experience.

A source request observes a naturally finished action without changing the next offers or source state. Finish existing projects first. While waiting for a boundary, close the menu and continue play. Kian's unsupported Ada-care arrangement and an active Watch night refuse travel. The ordinary-input control performs real Well water orders, completes Danyal's role goal, captures minute707, and carries his Christian calendar and actual fitness into Watch. This is a headless mechanism control; live cross-origin proof remains a separate receipt.

## Three site games

All constructors use canonical ages, six traits and ten values. Watch replaces the four retired source identities with Samira29, Idris41, Danyal52 and Meryem19. Danyal stays Christian. Meryem has apprentice observation skills and no old spear expertise or inherited Idris hostility. Lena/Pell remain Samira and Idris's background children; Ada remains Kian's sister/ward. Generated newcomers and later generations remain episode background.

Choice-dependent clues are author-side, outside the public artifact. Voice: completed Halil repair, connected Selin call, actual tea/talk with Rıza/Hacer/Osman. Well: completed player-requested cook/build/timber/gather/water work reveals each worker's bounded clue. Watch: a receptive night-topic dawn conversation discloses one clue; refusal leaves it undiscovered. These are disclosures, not completion of the larger hidden outcomes in the registry. The registry's restitution, corrected maps, family agreements and other long outcomes remain authored possibilities unless separately implemented.

## Browser and recording

The browser shelf is one-device storage. No server, cross-device sync or shared multiplayer world is added. Every imported run is recording-gated before upload hooks; positive linkage requires the current pinned envelope, explicit epoch acknowledgement and unchanged generation. File-local choice stays scoped to that loaded run. Analysis consent is independent.

Use only the existing signed-in Chrome profile. Serialize journeys and global preference mutations with atomic `mkdir /Users/abdul/code/.lab-scratch/cast/browser-journey.lock` and `owner.json` containing exact PID, game and scenario. Wait for a live owner. Release only your own lock after exporting evidence and restoring task-owned state. Local previews without central-state changes may overlap. Never launch an isolated profile fallback.

Toolchain receipt correction: the local2154-pass runs used actual installed Vitest5.0.3; exact green release CI used pinned5.0.5. A fresh exact-lock install verified actual TypeScript7.0.2, Biome2.5.15, Vitest5.0.5, Vite8.3.4 and React19.3.1 under Node26.12.0. The immutable client0.4.0/kit0.5.0 artifacts retain their verified TypeScript7.0.2 build and hashes. Ordinary control5/5 has authoritative log mtime2026-10-23 23:55:10UTC; the earlier01:55UTC receipt was incorrect. Raw logs remain retained.

Prefix runtime commands with `PATH=/opt/homebrew/bin:$PATH` and verify Node≥24; zsh login can reset inherited PATH. Full suites hold `scripts/suite-lock.ts` once. HF `npm test` already holds it, so do not wrap another lock around HF full check/release. External game full checks use the machine-wide wrapper where their scripts do not.

## Copyable host calls

Import every type below from the exact client artifact. Keep your existing HF passport projection/admission functions; `projectSupportedSource` and `admitSupportedPassport` below stand for those explicitly authored host functions.

```ts
import {
  canonicalCast, castForGame, createPersona, initialPersonaLife, anchorPersonaLife,
  claimCastChapterBatch, closePersonaBranch, lifeAdmission, personaChannel,
  type PersonaEnvelope, type PersonaLife, type LifePreparation,
} from '@adam0white/lab-client';

const game = 'goodhands'; // Hearsay uses 'hearsay'; Small Works uses 'repair'.
const allocation = castForGame(game); // exact3–8 public canonical records
const shelf = personaChannel();
await shelf.ready;
// The player's continuity control owns shelf.setEnabled(true/false).
```

Create/checkpoint only after the real source Person passes your source projection gates. Keep the full source save and checkpoint digest locally. A current chapter's `ownHead` is its last accepted immutable envelope, never a newly fetched head belonging to another chapter.

```ts
const castId = 'hf.cast.selin.voice';
const cast = canonicalCast(castId); // revision2, never relabel revision1
const branchId = ownHead?.branchId ?? crypto.randomUUID();
const oldLife = ownHead?.transfer.life as PersonaLife | undefined;
const life = oldLife
  ? anchorPersonaLife(oldLife, castId, Date.now())
  : initialPersonaLife(castId, branchId, Date.now());
const transfer = projectSupportedSource(actualSourcePerson);
const next = await createPersona({
  format: 'hf-persona/1', castId, castRevision: cast.revision, branchId,
  parentRevision: ownHead?.revision ?? null,
  source: { game: 'voice', build, engine: '2.17.0', rules: 'voice-4' },
  transfer: { ...transfer, life }, limitations: transfer.person.person.limitations,
});
// Initial authored recording association additionally needs the current queried epoch,
// unchanged source generation, authored:true, no imported history and no fork.
await shelf.request({ action: 'put', envelope: next });
ownHead = next;
```

Worker hosts await atomic admission and send prepared init before queued deliberate controls. Keep the queue finite and scoped to run/identity generation; load, replacement, identity cancellation and failed CAS discard it. Discard pre-start ticks and stale preview queries. Fresh receiving play gates recording before preparing any imported history. Semantic admission validates every person before the batch CAS. Pin complete initial actors, all inputs and initial claims in the replay. Keep the last accepted ownership heads separately in local-save metadata; a new source checkpoint must never replace an initial replay actor.

```ts
lab.setPersonaRecording(`pending-group-${crypto.randomUUID()}`);
const generationAtStart = generation;
const chapter = await claimCastChapterBatch(shelf, allocation.map(p => p.castId),
  { game, build, engine: '2.17.0', rules: hostRules },
  async (inputs: LifePreparation[]) => {
    const people: Record<string, unknown> = {};
    for (const input of inputs) {
      const initial = admitSupportedPassport(input.parent, authoredOpeningFor(input.parent.castId));
      applyAuthoredAssignmentPlaceAndEncounters(initial, lifeAdmission(input, game));
      people[input.parent.castId] = snapshotCompleteInitialPerson(initial);
    }
    return people;
  }, { isCurrent: () => generationAtStart === generation });
if (chapter && generationAtStart === generation) {
  loadedReplayHeader = structuredClone({ initial: chapter.initial, inputs: chapter.inputs, claims: chapter.claims });
  ownedHeads = Object.fromEntries(chapter.claims.map(p => [p.castId, p]));
  startPreparedGame(chapter.initial);
}
```

A host invalidates its generation on run or identity changes. No latest-head retry is allowed. A transaction already accepted cannot be silently rolled back; a replaced run never starts from its late receipt. Every independently eligible checkpoint uses the exact previously accepted head. Local autosaves carry these latest receipts outside simulation state. Restore them only after a successful explicitly local save load, with envelope validation and the same run generation. Imported files remain separately gated and do not acquire ownership from an embedded receipt. A changed active head still conflicts.

Mixed histories record only if **all** pinned branches permit the current epoch, or the player explicitly permits the complete pinned group. One denial keeps the derived run local. Do not use one person's permission for another person's history.

```ts
const pinned = Object.values(ownedHeads); // exact envelopes, not freshly fetched heads
const attempt = ++recordingChoiceGeneration;
const run = loadedRunGeneration;
const identityOrRunGeneration = generation; // increment on every run OR recording identity change
const revisions = pinned.map(p => p.revision).join('/');
const stillOwns = () => attempt === recordingChoiceGeneration
  && identityOrRunGeneration === generation
  && run === loadedRunGeneration
  && Object.values(ownedHeads).map(p => p.revision).join('/') === revisions;
lab.setPersonaRecording(`group-${crypto.randomUUID()}`); // closed until permission passes
const query = await shelf.request<{
  sameEpoch: boolean; revisions: string[]; recordingEpoch: string | null;
}>({ action: 'recordingBatch', envelopes: pinned });
if (stillOwns() && query.revisions.join('/') === revisions)
  lab.allowPersonaRecording(query.sameEpoch);
if (playerExplicitlyPermittedAllHistories && stillOwns()) {
  const epoch = await shelf.request<{recordingEpoch: string | null}>({action:'recordingBatch',envelopes:pinned});
  if (!stillOwns()) throw new Error('Identity or run changed. Choose again.');
  await shelf.request({action:'recordingBatch',envelopes:pinned,
    allowRecording:true,recordingEpoch:epoch.recordingEpoch ?? undefined});
  if (stillOwns()) lab.allowPersonaRecording(true);
}
```

A real owned actor death closes the branch rather than attempting a living passport. Preserve the source death event and full local save. The reducer refuses both preparation and any normal child of a closed head. Inspect/export history and an explicit alternate fresh branch remain available.

```ts
const parent = ownedHeads[castId]; // exact accepted parent belonging to this loaded source
const terminal = await closePersonaBranch(parent, sourceStamps, actualDeathMinute);
if (generationAtCapture !== generation) throw new Error('Run replaced.');
await shelf.request({action:'put',envelope:terminal}); // exact-parent CAS
if (generationAtCapture === generation) ownedHeads[castId] = terminal;
```

Automatic site checkpoints are attempted after an actual played chapter changes day/phase, on visibility becoming hidden, and on pagehide while continuity is enabled. They use the same source projection, natural action boundary and exact-parent CAS as the manual control. They never refresh a loaded simulation or reset the absence clock without a successful source checkpoint. A browser can suspend or unload before the asynchronous boundary/capture/write completes; pagehide is best effort, not guaranteed persistence. Save manually before leaving when the saved-person status matters. Active projects and unavailable boundaries still refuse. Source workers reject checkpoints before play begins.


## Full source receipt

The generic site checkpoint is captured after a real action finishes, before the next decision. The source worker computes SHA256 outside HF over canonical JSON of the full actual `snapshot(person)`. Its transfer includes `checkpoint: { schema, sourceMinute, rng, sha256 }`; `rng` is the complete captured RNG. The raw snapshot travels separately to the source page. It is excluded from shelf transfer JSON. The page verifies the digest, retains a bounded1MiB source-local journal and includes current-run `castSources` in exports. Unmapped episodes/skills remain in that raw source archive; the projection's limitations list omissions.

```ts
// Site adapter example; other hosts implement an equally explicit mapping.
const captured = await captureSiteCastBoundary('voice', actualPerson, actualWorld);
postMessage({
  type: 'castReady', requestId,
  transfer: { ...captured, engine: ENGINE_VERSION }, // non-enumerable raw snapshot excluded
  sourceSnapshot: captured.sourceSnapshot, // source-local save/export only
});
// The source UI verifies SHA256(canonicalPersona(sourceSnapshot)) against
// transfer.checkpoint.sha256 before publishing the bounded passport.
```

The two-person ordinary Voice control carries changed fitness for Rıza and Osman and Osman's completed market trade practice together. RNG is retained exactly; no extra draw is required merely to prove transfer. Source memories remain archived because this dialect does not claim their host-specific references are portable.

## Finite native site returns

Site adapters additionally recognize actual Hearsay edition6 (`hearsay-cast/1`, `hearsay-calendar/1`) Rıza/Osman and Stairwell rules7 (`stairwell-cast/1`, `stairwell-calendar/1`) Hacer into Voice. Stairwell must provide an explicit empty hostObligations array. Actual Valley rulesvalley-cast-3 (`valley-cast/1`, `valley-calendar/1`) supports Danyal/Maryam/Yusuf into Well and Danyal/Samira/Meryem into Watch; Valley role meryem-visitor maps to Watch meryem. Source engine2.17.0, exact role/cast revision, trusted calendar norm meanings, full-source schema/minute/RNG/checksum header and HF body/family/project checks remain binding. Unsupported actions/entities/owed duties refuse before whole-batch CAS. Source builds remain recorded provenance rather than an obsolete single-build allowlist. Native skills remain archived, except Osman's explicitly equivalent established trade skill.

An actual native checkpoint differs from a target claim retaining its passport. Site-owned native claims retain a bounded site-native-claim/1 receipt with the original validated source stamps/revision. Only the SAME site host may use that receipt for a fresh chapter before another source checkpoint. A Watch-owned Valley passport is not a new Valley source for a different host, and an external claim retaining a site passport is not a native checkpoint. Ordinary current source capture replaces the old dialect with its actual site checkpoint.

## Watch source: Kian and Ada

At an actual off-duty dawn the player may ask Kian and Ada about a one-day refuge visit. Their modeled assent is observed separately; Ada remains Kian's ward and Tamar remains mentor only. Existing home-threat/work/care duties are never replaced. The new agreement creates distinct care-ada and return-with-ada duties with actual ids, Ada beneficiary and a finite next-dawn deadline. A deliberate logged preparation input advances normal HF daylight actions for at most600minutes, before16:59. Completed source care consumes grain and changes Ada's actual food/water/rest reservoirs. A read-only exact-actor observer captures Kian at a natural idle boundary before his next choice, only after the meal duty is kept and return remains pending. No actor clock assignment, activity clearing, health recovery or completed journey is inferred.

The site-cast/1 source adds watchCare versionwatch-warren-ada/1: exact agreement/assent/deadline/new duty ids, explicit actual kept-care commitment/completion time, and bounded Ada care reservoirs with her actual source minute. Kept care is separate because the continuing calendar correctly omits it. Raw captured Kian remains in source save/export; raw child memories never enter the shelf. A receiving Warren adapter must validate this finite contract, preserve the pending return under its pinned zero-duration offset, implement actual care and an explicit return/end choice, and preserve changed dependent reservoirs or refuse unsupported onward transfer. This source implementation alone does not claim that Warren has accepted anyone or that a return occurred.

While the agreement is open, the next watch waits. Explicit Stay here together releases only still-pending new agreement duties, keeps completed care and older obligations, and clears the prepared source capture. A stale source still conflicts after another host claims the branch.
