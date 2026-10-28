# Changelog

Releases of Human Framework (HF), packaged as `@adam0white/human-framework` (`@human/framework` up to 2.1.0). The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).
The release version is the package version, tagged `vX.Y.Z`. Up to 3.x each entry also names the
`ENGINE_VERSION` (simulation behaviour and save format) it ships; from 4.0.0 the engine version is the package
version, stamped with build and schema hashes in `RUN_ENGINE`. See the version policy in
[packages/human/README.md](packages/human/README.md#versions). The games in `apps/site` are not covered here.

`npm run release` publishes the section whose heading matches the package version as the GitHub release notes.
Each released section opens with `Engine: X.Y.Z.` matching `ENGINE_VERSION`; the script refuses otherwise. Use
absolute links in sections, since they are copied into the release page.

## [4.5.0] — 2026-10-27

Engine: 4.5.0.

- Add optional immutable `definitions.reputationTraits` authoring. Additional character words use the existing belief-reputation owner and conversation classification; builtin traits remain active and cannot be replaced. Finite signed coefficients, distinct IDs and valid trait names are required before a run is constructed.
- Belief corrections reverse the corresponding relationship effect through the same received-evidence route. Run archives retain the vocabulary for exact replay; concurrent runs do not share it. Coefficients are engineering assumptions, not moral worth or religious rulings.
- Migration: add `{id, affection, trust, respect}` rows for host-authored character words. No new input kind, setter or runtime call is introduced. Current engine identity changes; older run archives require the existing explicit start-fresh refusal.

## [4.4.0] — 2026-10-27

Engine: 4.4.0.

- Extend the existing portable route with `hf-portable-person/2`. Host `inspect` projects retained beliefs, trust, memory, duties, exemptions, age and calendar provenance; `createPerson` admits them through explicit clock and reference mappings. Unsupported active work, missing references, conflicting duties and incompatible source norms refuse atomically. Native legacy engine 2.21 and 2.23 controls preserve minute-based duties and history through millisecond conversion and exact replay. The approximate v1 passport remains supported.
- Lab client 0.5.2 extends the same shelf helpers to retained v2 passports, finite Stairwell roles and explicit mapped authoring. Lab kit 0.5.19 adds the exact client compatibility declaration. The central receiver pins those source versions while its actor engine stays on 3.2.0. Artifact publication and host deployment have separate receipts.
- Export `DEFAULT_NORMS` as sourced working understandings, retaining research records, interpretation references, exemptions and pending source-review limitations. These describe a person's understanding, never a ruling.
- Admit `sourceTrust` in `inspect`. Host and self readings expose the person's held source trust; other observers receive `unobserved`.
- Add optional declared body-load spans to `preview` and return structured conditional bodily forecasts through the existing body owner. Every span records its end, worst perceived need and severity. Forecast reads preserve the live run and keep unknown host outcomes explicit.
- Migration: use `preview(..., {bodyForecast: [{label, durationMs, load}], ...})` for bodily forecasts and `inspect(..., {select: ['sourceTrust'], ...})` for source trust. Current engine identity changes; old run archives still require an explicit start-fresh refusal.

## [4.3.1] — 2026-10-27

Engine: 4.3.1.

- Patch the companion shelf client and central host admission: an unsupported or dead person is named and skipped while eligible people continue. The full original cast remains in the atomic parent check. The actor and portable projection rules are unchanged.
- A local start belongs to this game and preserves the shared carryover preference. Skipped people keep their saved histories through play and local reload.

## [4.3.0] — 2026-10-27

Engine: 4.3.0.

- Add the pure `./portable` projection/admission contract for approximate people across HF3 and HF4. Existing shelf envelopes, registry checks, CAS and replay inputs remain authoritative. Identity, profile, body resources, mood and bounded source summaries travel; unsupported source obligations and clinical state refuse plainly.
- Add reciprocal Days/Commonstead shelf adapters through lab-client 0.5.0, and central receiving admission. The site and Commonstead retain their HF3 actor engines.
- Migration: this does not convert old run saves or enable the previously rejected lossless portable admission DTO. Games opt into the new versioned passport through the HF-owned shelf helpers and pin its complete admission input for replay. Unknown passports refuse without replacing saved history.

## [4.2.0] - 2026-10-27

Engine: 4.2.0.

- Games can give each person reviewed wording in `definitions.lexicon.voices[personId]`. Each missing template key falls back to `lexicon.wordings`, then built-in text. The same renderer serves all tables. Each person's choices for each line stay in their own seeded sequence, replay checks them, and alternatives do not repeat immediately.
- Decision intention text depends on the selected wording and is stored in person state; it has no effect on behaviour. Wording randomness remains separate from actor randomness.
- Every template slot and its possible values are documented for offline voice writers. No table preserves built-in narration byte for byte. Existing 4.1 archives must start fresh under the new engine stamp.

## [4.1.0] - 2026-10-27

Engine: 4.1.0.

- Games can ship reviewed alternative wordings in `definitions.lexicon.wordings`. HF checks template keys and named slots before creating a run. Workers AI can generate these files offline; gameplay never calls a model.
- Each person and template has a seeded wording stream. HF records the choice when an event happens, so repeated reads, paginated reads, restored runs and replays keep it. Two or more alternatives never repeat immediately. Missing entries keep today's wording.
- The existing renderer handles both default and authored wording. Wording randomness stays separate from person and world randomness. Existing 4.0 archives must start fresh under the new engine stamp.

## [4.0.2] - 2026-10-27

Engine: 4.0.2. Fix crisis advancement after recovery.

- Stop crisis hazard integration at the end of its refractory period. Eligibility remains fixed within each numerical interval, then rebases at that boundary. A person with sustained grief can recover and later enter another crisis without stalling the run.
- **Archives.** 4.0.2 refuses 4.0.1 saves with `unsupported-archive` at `$.engine`; games start fresh. Replay hashes change: on the same one-hour fixture inputs, `hashes.initial`, `hashes.current` and `hashes.full` differ from 4.0.1 because the engine stamp and stored crisis hazard identity changed. `hashes.history` matches in that control.
- Pin a public 48-hour control with two onsets and recoveries. Whole and hourly stepping produce identical events and actor RNG; each current-version archive restores and replays exactly.
- Qualify the architecture's retained 3.x reference so removed comfort percepts, body-threshold interrupts and default protest-quality penalties are not claimed as 4.x behavior. Distinguish ordinary suggestion inputs from the separate coercion route.

Use the exact package version for saved-run replay. These are engineering controls, not clinical validation. No playtest or panel run is included.

## [4.0.1] - 2026-10-27

Engine: 4.0.1. A speed patch with no change in behaviour: every decision, `hashes.current` and `hashes.history` match 4.0.0 on the same inputs.

- **Diagnosis corrected.** A 4.0.0 `step` did not copy or hash the whole run; its cost stays flat as a run grows. The time went to fixed per-step work ([finding](https://github.com/adam0white/human-framework/blob/main/docs/findings.md#hf-401-step-cost-2026-10-27)).
- **Cheaper steps.** Hazard draining skips its physiology probes when nothing they read has changed. Memory validated on entry is not validated again. Validators build an issue path only when they report one. `sha256` reuses one buffer, and stream origins and per-span id hashes are memoized. A Smoke night costs about a third less CPU; its whole-frame p95 at 4x CPU throttle fell from 25.0 to 16.6 ms.
- **Linear replay.** `replay` reads each re-stepped transaction from the newest history node instead of rebuilding the history list per step, which made replay quadratic in run length.
- **Archives.** `hashes.initial` and `hashes.full` cover the engine stamp, which names the exact package version, so they change while `hashes.current` and `hashes.history` do not; `replay` and `restoreRun` in 4.0.1 refuse a 4.0.0 archive with `unsupported-archive` at `$.engine`; games start fresh. Archives still grow with every step; bounding events and receipts changes the archive format and is a [roadmap row](https://github.com/adam0white/human-framework/blob/main/docs/roadmap.md).

## [4.0.0] - 2026-10-27

Engine: 4.0.0. One run API, with every faculty always on. The owner set the goal on 2026-10-26: "Let's make every opt in feature default v4 go! Sacrifice compatibility and saves." People now differ through their state, never through switches. Each concern has one way in and one way out. 3.x saves, exports and option selectors are not read by 4.0. Games may stay on 3.x, and 3.x patches keep explicit opt-in and exact legacy continuation.

- **Eight calls.** `createRun`, `createPerson`, `step(run, { until, fidelity?, inputs })`, `inspect`, `preview`, `exportRun`, `restoreRun` and `replay` are the whole callable API, plus the pure `projectChapterClock`. Every host change enters as a timestamped `Input`. Every reading leaves through `inspect` (actual state, from the host or one person's perspective) or `preview` (a counterfactual that never changes the run). The host is the only writer of the world. Two runs in one process share no state, including tuning.
- **Always on.** The `enable*` flags, `PersonSpec.enable`, feature selectors, version markers and legacy-continuation branches are deleted. Faculties that 3.x left opt-in are always on in 4.0: assent cost, literal wording, curiosity, projects, planning, promptings, review, crisis, community death handling and the warmth-through-25 upbringing. Where no sourced default exists, the faculty runs with an engineering default recorded in docs/findings.md. A zero coefficient never switches a faculty off. An authored `review.style: 'none'` or `promptings.reading: 'none'` is a held reading in the person's state, not a switch.
- **One clock, with a daily step.** `skip`, `catchUp: 'events'`, `runSilent`, `liveRoutine` and `liveCommunity` are deleted as public paths. A batch chooses `fidelity: { mode: 'fine' }` (the default) or `{ mode: 'daily', dayMs: 86400000, anchor }`. The daily clock is a first-class larger step, not a separate simulation. This reverses two 3.0 decisions: Q15 kept `skip`, and Q5 kept assignment-based tuning of module-wide mutable defaults. Tuning now belongs to the run spec and is copied per run.
- **Replay.** `exportRun` gives a closed `hf-run` version 4 archive. `replay` rebuilds it from its spec and input log and checks every hash. Replaying the same input log with the same step chunking is byte-exact. Different chunkings of the same inputs keep clocks, counters, RNG, the set of events and their order exact; continuous values such as mood and needs agree within 1e-9 (ruling 26, owner-approved). Fields that count step calls (`counters.nextTransaction`, `cursor.frameOrdinal`, `history`), the acceptance order of `receipts.inputs`, the stored order of `queue` and the hashed trajectory condition ids differ across chunkings, so `hashes.current` and `hashes.full` differ too; only `replay` of the same log is promised. Each accepted step adds about 240 bytes of history to the archive.
- **One renderer.** Narration, review, promptings and forecasts are rendered from structured events by one renderer with stable variation. The plain pack and the selectable wording modes are deleted; literal wording is the one vocabulary, and the host lexicon supplies names and action forms. Host prose given with an observation is kept verbatim and reaches that person's own events. Death news carries who died as data (`observation-attended.died`), and the renderer words it from the lexicon.
- **Reviews and necessity.** A person who goes on with a long activity is asked again every `reviewInterval` (30 minutes awake, 120 asleep) until it ends; those decisions carry `review: true` and do not count as new decisions in the chronicle. A firmly held prohibition on theft or forbidden food lifts at survival desperation, only for an act that meets a food or water need, and the act is recorded with `activity.necessity` (Qur'an 2:173, as the person understands it).
- **Errors.** A host input the engine refuses is `invalid-admission`; an engine budget is `limit-exceeded`; an engine fault (a `TypeError`) is thrown, not returned. A batch that resolves pending requests keeps the paused fidelity, and one that names a different fidelity is refused. A calendar must use 86 400 000 ms days with simulation time 0 at midnight.
- **Communication** goes through the same step boundary: a `CommunicationRequest` is issued, the host resolves it with `communication.resolved`, and the listener hears only what was delivered.
- **Portable admission is rejected.** `PersonAuthoring.admission`, and host `inspect` selections of `persona`, `calendar` or `chapter`, fail with one documented `invalid-admission` message (`PORTABLE_ADMISSION_REJECTED`). A person enters a 4.0 run only as authored state. A new design must first pass the third-world admission gate that failed on 2026-10-26.
- **Performance** (one Apple Silicon machine under load from other work; engineering measurements, not a budget proof): 50 ms steps for one person, p50/p95 0.57/2.02 ms; for six people, 2.98/6.02 ms; one 24-hour fine step for one person, about 0.5 s. Plain-data copies replace `structuredClone` in the engine (it remains only as the fallback for a non-plain host value), and trajectories are memoized per segment.

### Owner-approved scope

The owner approved the scope rulings on 2026-10-27: "All good decisions (codex to 4.1, delete code, allow difference), keep going." ([owner directions](https://github.com/adam0white/human-framework/blob/main/docs/owner-directions-2026-10-18.md#2026-10-27--hf-40-scope-rulings-approved-adam-verbatim)). Deferred to 4.1 with a target of 2026-11-17, listed in [the roadmap](https://github.com/adam0white/human-framework/blob/main/docs/roadmap.md): the JSON wire adapter, the request and settlement ledger beyond what retelling needs, the 44-coefficient tuning surface, a sourced default norm set with research references, a run route for the Zakat al-Fitr planner (4.0 keeps the pure planner and its sourced norm unexported; a host authors the commitments itself), a portable admission design, run-level controls for death news and communication with retelling, the Qalb reading, the 4.0 docs prose, the 3.x feelings and percepts listed under Removed, a calendar route for worship schedules, and the test-only display modules.

### Host migration

There is no migration path from 3.x. Start a fresh 4.0 run and author each person with `createPerson`; a 3.x save restored into 4.0 is refused. Pin the exact package `4.0.0` and keep the archive (`exportRun`) as the save and the playtest export: it carries the seed, the input log and the state, and `replay` verifies it. Replace each 3.x call with an input to `step`, a read with `inspect`, or a what-if with `preview`. Hosts that need a 3.x API stay on 3.2.x. Node 24 or later and TypeScript 7 or later remain required.

### Removed

- Source: `person.ts`, `restore.ts`, `migrate.ts`, `persona.ts`, `persona-calendar.ts`, `feature-selectors.ts`, the 3.x `types.ts`, the old narration packs, `presentation.ts` and `body/quantity.ts`, and unused helpers in `core/math.ts`, `core/random.ts` (`chance`, `pick`), `run-person.ts`, `run-scheduler.ts`, `narrate/lexicon.ts`, `needs.ts`, `span.ts` and `agenda.ts`. The `WireRequest` and `WireResponse` types return with the 4.1 wire adapter. The legacy 3.x code is deleted rather than ported (ruling 25).
- 3.x behaviours with no 4.0 reader, with their parameters (4.1 rows in the roadmap): loneliness and boredom felt from belonging and leisure urgency (`lonelinessFrom`, `boredomFrom`); a comfort percept easing a mental break (`comfortCloseness`); night tags on episodes (`nightFrom`, `nightTo`); the trust penalty for needs left urgent during a suggested activity (`voiceHarmGain`, `voiceHarmUrgency`); the default quality of work done under protest (`protestQuality`); body-need interrupt thresholds (`interruptThresholds`; reviews now come on the review cadence, at most 30 minutes late awake and 120 asleep). Removed as duplicates: `promiseSlack` (the offer's own promise is kept) and `PERSON_DEFAULTS.moodEmotionGain` (affect owns its gain).
- Worship schedules: `RAMADAN_DEFAULTS` and `MAKRUH_DEFAULTS` leave the effective parameters. The sourced window helpers in `agenda/prayer.ts` (prayer, makruh, Ramadan, Eid, retiming) stay in source, unexported, until the 4.1 calendar route.
- Tests that pinned removed behaviour or restated code: 3.x migration fixtures, legacy continuation, feature selectors, event catch-up, the 3.x community simulation and long-run timing. One control per merged faculty and the replay-hash test are kept.
- Examples in `packages/human/examples/`: assent-cost-control, body-forecast-control, chapter-clock-control, community-death-repair-control, curiosity-control, death-dispatch-control, event-catch-up-control, event-catch-up-profile, feature-inputs-control, felt-body-control, game-requests-29-control, game-requests-control, h3-starter (README.md, control.ts, starter.ts), host-api-control, literal-wording-control, method-alternatives-control, method-control, narration-control, observation-aptitude-control, observed-reputation-control, persona-control, plain-narration-control, plain-surfaces-control, planning-control, projects-control, promptings-control, q26-conditioned-forecast-control, qalb-control, received-consequences, reset-prospect-control, review-control, tick-input-control, upbringing-warmth-control, why-not-control and zakat-al-fitr-control. Their faculty controls are now 4.0 tests. Kept and rewritten for 4.0: minimal, suggestions, community, host-gifts-and-work-control, word-and-witness-control and plain-world-control.

## [3.2.0] - 2026-10-26

Engine: 3.2.0. Explicit literal wording, assent cost and payment planning, with repairs to opted-in community death handling and upbringing. New people use engine 3.2.0. Valid loaded 3.1 people keep their raw state and RNG through default mutators with optional behavior selectors omitted. Restoring a supported snapshot separately migrates its engine stamp to 3.2.0 without inferring options or rewriting retained text.

- Add `lexicon.wording: 'literal-v1'` for literal task, duty and recall wording. It requires plain English where that route already does; custom lines and existing variation slots keep their priority. Omitted selectors retain old generated and stored text.
- Add explicit `enableAssentCost` configuration for the final assented ordinary advice, including a promoted adviser. Insisted, refused and displaced suggestions retain their existing rules. Coefficients and provenance are host choices, not a universal cost of thought.
- Add opt-in `zakatAlFitr`, `readZakatAlFitr` and a sourced held norm. A preferred appointment and an outstanding payment are separate. Host-confirmed amounts determine payment; generic `Commitment.completion: 'end'` admits completion by the window. Existing prayer and duty spans keep their rules. This models a person's held understanding, never divine acceptance.
- Export read-only `validateFeatureInputs` and bounded issue types for selected creation and observation inputs. It does not enforce, coerce or validate whole people or worlds. Hosts validate a batch before mutation if they need atomic rejection.
- Export event catch-up helpers for an explicit fine-driver `catchUp: 'events'` mode and host read barriers. Inactive people can be stale; delayed discovery and changed floating-point tick partitions are declared limits. No eager equivalence or general performance improvement is claimed. See [the host contract](https://github.com/adam0white/human-framework/blob/v3.2.0/docs/event-catch-up.md).
- Community death handling now interrupts work involving a dead community partner without completing it or granting credit. Participation means `with`, actual joint membership, or the existing talk/call/conversation target convention. A generic `targetId` alone remains a referent and does not prevent remembering someone who died. Pending proposals retain their public status and gain an optional involuntary settlement reason. Actual running participant loss is retained by decision identity in optional `Community.partnerDeaths`, including after proposal pruning and JSON restore; proposal review alone is not cancellation evidence. Unrelated work still completes. Explicit attended death delivery establishes factual widowhood at the declared death minute independently of news attention; knowledge and grief still require attended notice.
- Correct the warmth-through-25 attachment response rate so warmth enters responsiveness once. Preserve age plasticity and the explicit age taper. Living zero-warmth carers still move attachment toward the existing zero-warmth responsiveness (0.3 × normalized mood), equally weighted when every warmth weight vanishes. This boundary is an engineering assumption. No living carers creates no attachment exposure. Values, norms and voice trust receive no zero-warmth influence; the omitted model keeps its original zero-warmth gate. These are authored rules, not a fitted human model. Reject unsupported defined death, upbringing and forecast selectors before mutation; save and reapply valid host options after restore.
- Community-mode running work now synchronizes lagging declared participants before resolution even when nobody dies. This adds tick boundaries and can change floating-point state, threshold discovery and later choices relative to opted-in 3.1. Generic target-only work does not receive that preflight. Old opted-in replays require their exact old package; omitted-policy continuation remains unchanged.
- Keep portable-person admission finite, including published engine 3.1.0 provenance. Restore migrates supported snapshots to current rules; replay old opted-in rules with the exact old package. No new cast API, game-specific framework code or automatic host feature adoption is added.

### Host migration

Pin package 3.2.0, engine 3.2.0, effective tuning and the ordered input log for new runs. Existing supported Person snapshots restore through the explicit 3.1-to-3.2 migration; the stamp is the only migration change. A host's saved configuration still owns options. Do not relabel old replay exports or infer option use from the engine stamp. The central site dependency advances to 3.2.0; external game upgrades and public deployment have separate gates. TypeScript 7 or later and Node 24 or later remain required. Lab client 0.4.11 and kit 0.5.12 remain the existing immutable release artifacts.

## [3.1.0] - 2026-10-25

Engine: 3.1.0. Explicit community death handling, continuous household influence and conditioned body forecasts. Omitted options preserve the HF3.0 continuation, apart from the engine stamp. No new Person state or automatic opt-in is added.

- Add `deathHandling: 'community'` to fine and routine community stepping and joint acceptance. Driver-owned alive-to-dead transitions emit one death at the resulting clock, deliver attended news and release pending joint proposals. Cover catch-up, partner/wait synchronization, daily batches and future-dated `finish` advancement. `tellDeaths: false` suppresses news while retaining cleanup. Direct `tellDeath` gains `receipt: 'attended'`; it keeps its existing clock behavior.
- Add `RaiseOptions.model: 'warmth-through-25'` and matching `LiveCommunityOptions.upbringing`. Living parents or guardians can provide routine upbringing through young adulthood. Warmth scales norm and attachment learning continuously; guardianship supplies no affection. The age horizon and rates are engineering assumptions. Existing calls retain their old arithmetic and parent-only routine cutoff.
- Add per-call `forecastContext: 'conditioned'` to body forecasts, decisions, predictions and command previews, including driver and observer wrappers. Only the forecast term uses current pregnancy/environment modifiers and effective body parameters, held through the bounded horizon. The existing observer model remains partial for traits, motives and selected body cues; pregnancy and surroundings are copied from the target, so these are not inferred observer knowledge. This predicts no future weather, pregnancy progression or clinical outcome. Direct forecast helpers gain an optional body-parameters argument.
- Hosts save these options in their run configuration and supply them after restore. The options are never inferred from Person or community snapshots. Keep exact package pins for replay.
- Add the missing setting-choice and supported-task-completion engineering controls; strengthen existing sleep-awareness, unrelated-skill and age-peak assertions. These are program regressions, not participant-data replication or calibrated human predictions. Correct N4's evidence wording without changing its formulas.
- Preserve released engine 2.23 portable fields and the existing finite native-person admission guard when advancing the current engine. Keep the same validation, calendar, health, norm and obligation gates. No new cross-game journey is established by the metadata guard test.
- Preserve the upstream Sun fdlibm notices in source, emitted package JavaScript and README. Exponential and other kernel arithmetic stays unchanged. Internal community helpers remain outside the public root exports.

## [3.0.0] - 2026-10-25

Engine: 2.23.0. Breaking API cleanup and current toolchain. Seeded numerical behavior and saved Person state stay unchanged relative to HF 2.23.0.

### Migration from 2.x

- Rename the Person composites: use `glimpsePerson` instead of `glimpseOf`, and `acquaintPerson` instead of `acquaintWith`. Keep primitive `glimpse` and `acquaint`.
- Use positional time in `glimpse`, `glimpsePerson`, `hear`, `conceive` and `retell`; the deprecated options-object forms are removed. In `conceive`, seed comes before time. In `retell`, optional settings come after time. Untyped callers passing removed options objects receive `TypeError` before Person state changes; positional time must be finite.
- Remove `TRAIT_NAMES` (use `TRAIT_KEYS`), `expit` (use `sigmoid`), and the accidentally public internal `keysOf` helper (hosts use `Object.keys`; enumeration order stays unchanged). Remove the unused third argument from `repent` and `recordRepair`.
- Use the callable `RoutineSource = (person, day) => Routine` in both routine drivers. Wrap fixed routines in `() => routine`; capture community context in a closure instead of a third argument. Selection order stays unchanged.
- Keep `skip`. Drop the proposed `skipTo` rename because it adds no player value (roadmap item Q15).
- Retain assignment-based tuning of existing mutable defaults (roadmap item Q5). Settings apply to the whole module instance. Hosts save effective settings or baseline-relative overrides and restore the pristine baseline before applying them; Person snapshots do not capture tuning. Keep settings fixed during a run. Existing frozen defaults remain frozen.

Exact before/after calls and routine restore guidance: [v3 migration](https://github.com/adam0white/human-framework/blob/v3.0.0/packages/human/README.md#migrating-to-v3).

### Horizon 3

- Export opt-in `canonicalTickInputs`, `TickInput` and `TickInputKey`: a bounded same-runtime complete-input barrier with deterministic sender/sequence ordering. It adds no transport, consensus, payload validation or actor-loop behavior. The lexical priority is a host policy.
- Include the recorded first probes, bounded host starter and contingent-speech recipe. Traditions uses existing method-learning APIs; no duplicate faculty. Negative probes and future prospective prediction evidence remain explicit. See [the Horizon 3 results](https://github.com/adam0white/human-framework/blob/v3.0.0/docs/hf-roadmap-2026-10-20.md#horizon-3-long-bets).

### Maintenance

- Accept npm 11 array and npm 12 package-keyed pack metadata in release and packed-consumer smoke checks; both require exactly one local tarball.
- Upgrade Biome to 2.6.3, Vite to 8.3.5, Wrangler to 4.152.0, and release-workflow npm to 12.2.1. Add pinned Knip 6.43.0 and Playwright 1.64.1; other direct external dependencies were already current at the registry check. Advance Worker compatibility to 2026-10-25.
- Remove private dead site exports and files, share duplicate hook setup, and resolve formatter and TypeScript lint findings. Keep legacy continuation, replay hashes and headless controls. CSS cascade warnings have explicit dispositions; Watch visual decisions follow the active plain-English pass.
- Keep Undici 7.30.1 for Miniflare's legacy dispatcher contract; 8.12.3 replaces the callbacks its HTTP 421 guard wraps. Review this upstream compatibility exception by 2026-11-03. No telemetry logging or privacy settings change.

## [2.23.0] - 2026-10-25

Engine: 2.23.0. Doze and plain-English fixes change opted-in runs. Runs using neither option retain exact state and seeded RNG continuation after normalizing engine metadata. Existing saves restore under the corrected rules; replay old opted-in runs with their original package.

- A dozing person can wake from a detectable urgent percept that occurred during the current doze span and arrived at a later checkpoint. Other delivered percepts pass through ordinary bounded attention instead of being discarded.
- `begin` refuses every replacement of unfinished dozed work, including voluntary sleep and choices made after waking. Hosts must call `finish` for the interrupted activity first.
- Correct plain-English shared-task proposals, interrupted-doze logs, named held-rule and trust descriptions, listener memories, singular urge counts, bodily-state lists and bladder explanations. Listener wording follows the listener's plain-English choice; mixed-lexicon conversations can therefore produce different stored memories. Legacy conversation and actor narration remain unchanged when plain English is absent; the explicitly called `qalbReading` reader now names its subjects.
- Replace application-specific wording in framework comments and examples with neutral descriptions.

## [2.22.0] - 2026-10-25

Engine: 2.21.0. The new observation input is explicit. Existing input behavior and saved Person shape are unchanged; legacy continuation remains byte-identical.

- Add explicit inherited aptitude for `observeSkill` and attended demonstrations. Earlier observation calls retain their exact rate, state and RNG, including authored families.
- Add a reset-world prospect identity control and host guidance. Current progress can fall while the peak and advancement clock persist; stale abandonment still applies. This does not improve the measured performance of moving objects to a destination across repeated world resets.

## [2.21.0] - 2026-10-25

Engine: 2.21.0. Existing callers retain continuation when the new faculties remain disabled.

- Add optional minute-grid doze onset from true sleepiness, posture and stimulation. A dozed person wakes only when the host delivers a current, detectable heard, felt or social percept with high salience. There is no spontaneous wake. The host resolves stopped work; enabled minute checkpoints can change continuous body state and cost time proportional to elapsed minutes.
- Add explicit `estimateQuantity(p, { truth, difficulty })`. A valid nonzero request consumes one seeded draw and returns a value and confidence; zero truth or difficulty is exact without a draw. Error shape and confidence coefficients are engineering constants.
- Add optional bladder storage and urgency. A toilet offer declares `voidsBladder`; a successfully completed outcome declares `voidedBladder`. An advertised toilet does not itself empty the bladder, and pain `relief` is separate. Filling and choice coefficients are engineering constants, not clinical calibration.
- The migration from engine 2.17.0 stamps 2.21.0 without enabling the new faculties. With no opt-in, full-state continuation matches HF 2.20.0 after engine metadata normalization only. The site games remain pinned to HF 2.20.0; Watch's helper adoption uses that pin. Library 2.21.0 metadata is separate from game delivery.

## [2.20.0] - 2026-10-25

Engine: 2.17.0. Existing callers retain their state and RNG continuation.

- Reject non-finite pregnancy dates and seeds during restore while retaining other usable family fields. Finite engine-produced saves follow the same path.
- Consolidate need-key enumeration through `keysOf`, preserving saved insertion order and existing sorted readouts.
- Add optional authored `PersonSpec.habits` and `expectations`, copied defensively in order with explicit validation and existing bounds.
- Add explicit `gestureVoiceTrust` and `addTiredness` host calls. Magnitudes remain host premises; neither ticks or draws RNG.
- Ignore inherited or non-finite reputation trait effects instead of allowing invalid effects to corrupt relationships.
- Add `confirmObservedReputation`, equivalent to the existing manual primitive composition, and the read-only attributed `qalbReading` narration lens. No spiritual score, state mutation or decision input.
- Add a bounded thousand-lives measurement harness. Fine and coarse workloads remain explicitly distinct; no engine tuning.

## [2.19.0] - 2026-10-25

Engine: 2.17.0. Actor-loop behaviour and save format are unchanged.

- Add explicit `Lexicon.plainEnglish`: complete, literal English for built-in narration, suggestion replies, intentions, person summaries, generated memories, stock village outcomes, family events and community logs. Template keys, counts and selection order stay stable. Host phrase packs retain precedence.
- Add opt-in plain prompting and bodily-forecast explanations. Preserve each held interpretation of a thought, the response, and the meaning of duty and review; no religious ruling is added.
- Add `labelLine`, `commitmentLabel`, `normLabel` and `reasonLine` display readers. Stored labels and machine reason codes stay exact. Unknown host prose is not translated; unknown reason codes need host-authored display text.
- Default narration and full-state continuations remain exact against npm2.18.0, including the opt-in faculty and project-loop controls. Plain-language choices are saved and must be pinned for game replay. Game adoption follows each game's separate plain-English delivery.

## [2.18.0] - 2026-10-23

Engine: 2.17.0. Actor-loop behaviour is unchanged.

- Add an optional pure chapter clock: seeded hourly opportunities, monotone return watermark, bounded24-slot catch-up and explicit skipped intervals. It does not simulate full days, resolve obligations or alter a Person.
- Browser hosts can pin these clock outcomes alongside existing strict persona passports. Canonical profiles, qualified assignments, local life fiction, storage and consent remain host-side.

## [2.17.0] - 2026-10-23

Engine: 2.17.0.

### Added

- Explicit `enableProjects(p, { protectProgress: true })`: an offer or received successor can declare `diminishes` prospect ids. A project no longer credits its own undo, including a planned chain containing that step. The person can also learn an exact action/target/place link from a directly perceived drop after its own completed act. Learning is bounded and excludes explicitly witnessed acts by another person.
- `adoptProjectTask` converts a matching active project to a host task while retaining its identity, net progress, highest credited reading, progress clock and pursuit. An absent match returns `undefined`; abandoned projects stay abandoned.
- Opt-in per-person and per-minute assent/deferral variants, noun-safe chronicle action forms, a host resource noun for material narration, plain third-person prompting lines, actor-addressed recall and varied cause-aware review lines. These are presentation options; review wording never excuses a duty.
- Per-call host reputation traits, loyal warnings when word gets back to the subject, a relay-confidence threshold and a conversation phrasing callback after selection.

### Compatibility

- Existing enabled projects keep their prior behaviour unless `protectProgress` is explicitly true. Other narration and social options remain absent by default. Migration from engine 2.14.1 only stamps the version; existing state, RNG and continuation remain exact apart from the engine stamp.
- Published persona and calendar-passport payloads stamped 2.14.1 continue to validate and admit with their source provenance unchanged. Unknown source engines remain rejected.
- Focused tests and the `projects-control.ts` and `narration-control.ts` headless controls accompany the changes. Island results are recorded separately from these controlled cases.

## [2.16.0] - 2026-10-23

Engine: 2.14.1.

### Added

- Separate opt-in calendar passports: `projectCalendarPersona`, `validateCalendarPersona` and `admitCalendarPersona`. The versioned wrapper carries continuing obligations, owed records and actual receipts, exact held understandings and explicitly matched source-backed norm definitions. Every reference and timestamp requires a declared mapping. Hosts choose calendars; HF invents no dates, rulings, waivers or scores.
- Read-only `isContinuingCommitment` exposes the agenda's existing continuation semantics, including an exempt released recurrence. Existing actor-loop behavior and the original persona format remain exact.

### Fixed

- Correct the passport source-schema TypeScript declaration to the actual `Person['schema']` string type.

## [2.15.0] - 2026-10-23

Engine: 2.14.1.

### Added

- Opt-in, deterministic persona projection and admission. Explicit skill, episode and commitment mappings preserve approved state across unrelated hosts. Unsupported ongoing obligations and incompatible identity or health facts are rejected. Existing actor behavior and legacy continuation remain unchanged.
- Opt-in `retirePaidMakeUps` archives only a recorded kept make-up and returns detached frozen receipts. Unpaid or unproven obligations still block travel. Pregnancy and temporal relationship stores are outside passport v1.
- One cast browser shelf through the existing identity frame, with versioned checksummed envelopes, atomic parent revision checks, explicit conflict forks and inspect/export/delete controls. Client 0.3.0 and kit 0.4.0 ship as local tarballs.
- Canonical first-wave cast registry and private inbox measurement from complete received exports. Same-epoch continuity retains normal recording. Changed recording identities require explicit historical-linkage consent before any persona-derived upload.


## [Unreleased]

## [2.14.1] - 2026-10-20

Engine: 2.14.1. Corrects a modelling assumption inside the released projects and persistence faculties: restoring an earlier perceived reading is not net progress, and a started pursuit's pull should fade without progress.

### Fixed

- Newly enabled perceived-progress projects retain their highest reading in `Goal.project.peak`. Only a new high refreshes staleness and importance; contributions below that high restore rather than earn advancement credit. Event-credited projects cannot observe reversals and retain their existing credit.
- `onFinished.advanced` counts a contribution made from at or above the high-water mark before the host shows the result; only the next perception confirms a new high and moves the clock, importance and pull, and the composite does not consume `advanced`.
- Newly enabled persistence halves both continuation and switching terms every 30 minutes without goal progress (`stallHalfLifeMinutes`, bounded 1..1440). The goal's progress clock survives pursuit release and re-formation. Existing release rules remain unchanged.

### Compatibility

- Enabling either faculty stamps its slice with `behaviour: 2`. Re-enabling projects seeds missing peaks on active perceived-progress goals from their current progress without lowering existing peaks. Re-enabling on every load opts in by that act.
- Migration from 2.14.0 only stamps the engine version. Slices restored without the marker retain exact 2.14.0 crediting and an undecaying pull until the host re-enables them.

### Release

- Tag `v2.14.1` on source commit `3ed1633` (CI passed after a lockfile fix-forward); the release's `npm run check`: 2022 passed, 8 skipped. Trusted npm workflow 39549741147 succeeded. Registry integrity `sha512-3TZrIG7OSvor5X9hf00yh+NSeiI+ZogXS4u3S/ivKD3J2kL6W/TTezzEKyz/SMJ63KybMUwZyco3QgRjtVmgpQ==`; `npm audit signatures` in a fresh install reports a verified attestation; the installed package reports 2.14.1, engine 2.14.1.
- Legacy continuation: a mid-loop save made by the published 2.14.0 package continues for 90 minutes with the same hash under 2.14.0 and 2.14.1 (engine metadata normalized); the earlier projects, persistence and opt-in fixture hashes are unchanged.
- Control: on one's own pile, taking a piece and putting it back for 120 minutes, the 2.14.0 behaviour completes 60 rounds with an undecaying pull; behaviour 2 completes 14, the pull halves by minute 30, the pursuit releases at minute 47, and the person then chooses the alternative. The existing arms keep their numbers.
- Review: one independent Codex review ([review](https://github.com/adam0white/human-framework/blob/main/docs/reviews/hf-2.14.1-codex-review.md)), which also re-reviewed the 2.14.0 post-review fixes `8da7aff` and `54408c7`. Verdict "fix first": a public `adoptGoal` could skip the high-water mark (fixed with a test); `onFinished.advanced` at the old high (documented); a second maximum-duration release replaces an earlier rest interval (from `8da7aff`; reachable only with a maximum shorter than the defaults; documented); a tiny event credit resets the decay clock (accepted, P3). Restore reconciliation and the `materialIds` truncation passed.
- Site pins 2.14.1 at commit `ba15e32`, deployed (Cloudflare version `e1c3ea23-c979-40bd-92d3-e737affaebbd`); live `/release.json` shows framework 2.14.1, that commit, `dirty: false`.
- Island rerun on the published package: [experiment](https://github.com/adam0white/human-framework/blob/main/docs/lab/experiments/island-2026-10-20.md#rerun-with-engine-2141-hf5).

## [2.14.0] - 2026-10-20

Engine: 2.14.0. _Projects and persistence_ (owner, 2026-10-20: "Add those faculties and other feat to HF"; sources in [research/projects-and-persistence.md](https://github.com/adam0white/human-framework/blob/main/research/projects-and-persistence.md)). The island rerun on 2.12.0 found that a person with met needs set no free-time goal and built nothing, and that a started chain was not kept. A person can now turn what they perceive into a self-set project, and keep a started pursuit going. Both are opt-in: without them, state, decisions and digests are the same as 2.13.0 with only the engine stamp normalized, including when percepts carry prospect data. Saves migrate from 2.13.0 by stamping the version.

### Added

- Projects (`enableProjects(p, spec?)` or `PersonSpec.enable.projects`; `projectAppeal`, `PROJECTS_DEFAULTS`; state `Person.projects`). A host shows a prospect on a percept (`Percept.prospect`: `id`, `label`, `kind` of `make`, `arrange`, `gather` or `finish`, optional `placeId`, `materialIds` and perceived `progress`). An attended prospect is retained (at most 8, newest wins, forgotten after a day). When physiological and safety urgency is below 0.35, fear is low, no commitment window is open and no project is active, the person adopts at most one, at most every 30 minutes: appeal rises with openness (conscientiousness for `finish`), with unmet leisure, competence or autonomy, with a resumption pull for a half-finished thing, and a little with curiosity. The project is an agenda goal with `Goal.project` and a 120-minute temporal half-life, so 2.12 planning values routes to it. An offer, outcome or received successor (`successor.advances`, new) whose `advances` lists the prospect id advances it. With perceived progress, only re-perceived progress moves it (it can fall; 1 achieves it). A project without a progress rise for 180 minutes is abandoned, with a 60-minute cooldown. Restore keeps one active project.
- Persistence (`enablePersistence(p, spec?)` or `PersonSpec.enable.persistence`; `pursuitOf`, `PERSISTENCE_DEFAULTS`; state `Person.pursuit`). Beginning an option with positive direct or planned goal credit starts one pursuit. Options serving that goal gain `pursuit:<goalId>`; other options pay `pursuit:switch`, except options carrying a commitment term. Both are capped and scaled down by physiological and safety urgency and by fear, so hunger, duty and danger still interrupt; a short interruption is followed by resumption. A pursuit ends when its goal ends, after 20 minutes unserved, or after 240 minutes, after which the same goal rests for 20 minutes. This is a bounded bias and a switching cost, not a planner.
- Headless control [`projects-control.ts`](https://github.com/adam0white/human-framework/blob/main/packages/human/examples/projects-control.ts). One free day: projects on adopts and finishes a five-placement project; off, and on while hungry, adopt and place nothing. A three-step project under two distractions for 180 minutes: both faculties complete 59 chains, projects alone 2, persistence alone and neither 0; a person turned hungry at minute 60 eats within a minute and places 40 more afterwards.

### Notes

- All thresholds and coefficients are engineering defaults, not fitted values; the research note keeps findings and defaults apart. A prospect's `materialIds` keeps the first eight distinct ids rather than rejecting a longer list (found by the island candidate run).
- The narration batch moves to engine 2.15.

### Release

- Tag `v2.14.0` on source commit `febc37c` (CI run 39544694811 passed); the release's `npm run check`: 2014 passed, 8 skipped. Trusted npm workflow 39545020547 succeeded. Registry integrity `sha512-GzDr88kyt0JhV0RFrSvkvZV7ko41Q6ZwzQvE6oiDRJAJTLBVVbNwvgeQFQAmhJ1rrXzMp20n4TXU5ctdllmckw==`; `npm audit signatures` in a fresh install reports a verified attestation, and the installed package exports `enableProjects` and `enablePersistence` (2.14.0, engine 2.14.0).
- Review: one independent Codex review ([review](https://github.com/adam0white/human-framework/blob/main/docs/reviews/hf-2.14.0-codex-review.md)), verdict "fix first", two findings (a pursuit could re-form at once after its maximum duration; restore accepted several active projects and bypassed the cooldown), both fixed before release with tests. The later fix that truncates `materialIds` to eight was not re-reviewed. Legacy continuation was checked against 2.13.0 fixture digests.
- Site pins 2.14.0 at commit `604f22b`, deployed (Cloudflare version `dee2b6ba-dd86-4883-ae1a-290a83a981c9`); live `/release.json` shows framework 2.14.0, that commit, `dirty: false`.
- Island rerun on the published package: [experiment](https://github.com/adam0white/human-framework/blob/main/docs/lab/experiments/island-2026-10-20.md#rerun-with-engine-214-hf5).

## [2.13.0] - 2026-10-20

Engine: 2.13.0. _Why not_ ([slice plan](https://github.com/adam0white/human-framework/blob/main/docs/hf-roadmap-2026-10-20.md#slice-3-if-time-allows); The Pass's requests 1 and 4 in [game-requests-2026-10-18.md](https://github.com/adam0white/human-framework/blob/main/docs/game-requests-2026-10-18.md)). A declined suggestion can say what decided it, and a person can hold a rule of their own as a will-not. Both are opt-in: without them, state, decisions, resolution JSON and digests are the same as 2.12.0 with only the engine stamp normalized. Saves migrate from 2.12.0 by stamping the version.

### Added

- Suggestion reasons (`enableSuggestionReasons(p)` or `PersonSpec.enable.suggestionReasons`, flag `Person.will.suggestionReasons`). A score-decided `deferred` or `modified` resolution gains `decidedBy: { kind, source?, margin }`. `kind: 'inertia'` means that without the running activity's inertia the suggested option would have won ("not straight off my break"). Otherwise `kind: 'term'` names the source whose summed terms most favour the winner over the closest suggested offer, with ties broken by source string. `margin` is the rounded gap the suggestion failed to close; both sides are compared by the inertia-adjusted score the choice used. It changes no verdict, sentence, counter or RNG draw. Vetoes, outcomes imposed by insistence and stochastic winners below the best live score carry no `decidedBy`.
- Firm self-rules (`Commitment.firm: true` on a self abstention, one with no linked obligatory norm). While its window is open, the abstained action is a will-not, `refused/willNot` with reason `rule:<label>` (the id if there is no label), for suggestions and for the person's own choice. Insisting does not override it. The norm abstention's survival exception applies unchanged: with `necessity` on, a person past the desperation threshold may break it to meet a bodily need. Without `firm`, a self abstention stays a negative term as before. Restore keeps a valid flag and drops a malformed one.
- Headless control [`why-not-control.ts`](https://github.com/adam0white/human-framework/blob/main/packages/human/examples/why-not-control.ts): one suggestion in five arms. Break inertia: deferred, `decidedBy` inertia, margin 0.14. A norm: refused, `norm:boundary`. A habit: deferred, `decidedBy` term `habit`, margin 0.59. A firm rule: refused, `rule:leave it alone`. The same rule without `firm`: deferred, `decidedBy` term `abstain:c1`.

### Notes

- A firm rule models a rule the person holds, not a religious ruling. The narration batch of §1.3 (per-person deferral and assent lines) is a separate release, engine 2.14, so default voice wording is unchanged here.

### Release

- Tag `v2.13.0` on source commit `7586ada` (CI run 39539504674 passed); the release's `npm run check`: 1984 passed, 8 skipped. Trusted npm workflow 39539828142 succeeded. Registry integrity `sha512-OLYZxBohnCuwvAiQNmMJaHe6Zme/3ke0P6e7sXiRbPhRZ5HGrMP4Hzy9Z/VhyJP6NU1AMcoAOMF790qSXAKL8w==`; `npm audit signatures` in a fresh install reports a verified attestation, and the installed package exports `enableSuggestionReasons` (2.13.0, engine 2.13.0).
- Review: one independent Codex review ([review](https://github.com/adam0white/human-framework/blob/main/docs/reviews/hf-2.13.0-codex-review.md)), two findings (`decidedBy` compared against the wrong suggested offer when several matched; a stochastic lower winner still got an explanation), both fixed before release with a regression test.
- Site pins 2.13.0 at commit `7cd5d55`, deployed (Cloudflare version `afa6f7d5-3341-476f-b0f2-23713f2dda57`); live `/release.json` shows framework 2.13.0, that commit, `dirty: false`.

## [2.12.0] - 2026-10-20

Engine: 2.12.0. _Steps ahead_ ([slice plan](https://github.com/adam0white/human-framework/blob/main/docs/hf-roadmap-2026-10-20.md#current-increment-curiosity-and-play-then-bounded-planning-owner-2026-10-20); sources in [research/curiosity-and-play.md](https://github.com/adam0white/human-framework/blob/main/research/curiosity-and-play.md#bounded-planning-and-present-bias)). A person can value the first step of a short chain toward a goal: go, take, carry, put. Opt-in: a person without the planning slice gives the same state, decisions and digests as 2.11.0 with only the engine stamp normalized, and received consequences keep their single successor. Saves migrate from 2.11.0 by stamping the version.

### Added

- Opt-in bounded planning (`enablePlanning(p, { depth?, presentBias? })` or `PersonSpec.enable.planning`, state `Person.planning`, owned by `prospection/`). Chains link retained consequences where one claim's successor is exactly the next claim's trigger (action, target, place). Depth is 2 to 5 steps including the current action (default 4). The search is depth first in stable source and id order, with a budget of 64 node expansions and no claim used twice. A route never uses a claim whose trigger an earlier step of the same route already performed, because completing an action consumes every open claim it triggers. Access probabilities multiply along the chain, waits and the goal's temporal half-life discount later steps, and one whole route contributes per offer. An optional present bias (0 < β ≤ 1) discounts value and cost that arrive only through later steps. Depth 2 gives exactly the 2.3.0 single-successor result.
- Known consequences: `seedConsequences(p, sourceId, claims)` is host setup for what a person already knows about how their world works (channel `known`, weighted by stated chance and confidence, not source trust). Nothing is inferred from the person's history.
- With planning, a person retains up to 64 claims and accepts batches of 16. Without it, the bounds stay at 16 and 4. Revision memory stays at 64.
- Explanation: `planRoute(p, aff, now?)` reads the best route's steps, timing, access and per-goal values without changing anything. A route of two or more successors sets `Term.ref` on its cost term to the chain's claim ids, joined by `>`.
- Headless control [`planning-control.ts`](https://github.com/adam0white/human-framework/blob/main/packages/human/examples/planning-control.ts): one goal reached in four steps in two renamed domains (parcel, garden). The planner (depth 4) completes it in four minutes. With planning off, or at depth 3, the person never starts it and does a nearer two-step task instead. With present bias β = 0.5, the person does the nearer task first and only then starts the far one.

### Notes

- This is not a general planner. It searches only claims the person holds, never the host's world, and it executes nothing.

### Release

- Tag `v2.12.0` on source commit `8d46688` (CI run 39536610111 passed); the release's `npm run check`: 1976 passed, 8 skipped. Trusted npm workflow 39536936399 succeeded. Registry integrity `sha512-eG39H2oK27P1EellS2qYADicbe1RyKXGwXIcmX4RSe58hMk28LXrNSCLWE8K3OUOn17TxwsD0HN9VV3UgeIlsw==`; `npm audit signatures` in a fresh install reports a verified attestation, and the installed package exports `enablePlanning`, `planRoute` and `seedConsequences` (2.12.0, engine 2.12.0).
- Review: one independent Codex review ([review](https://github.com/adam0white/human-framework/blob/main/docs/reviews/hf-2.12.0-codex-review.md)), two findings (a route could use a claim its own first step consumed; a stale state comment), both fixed before release with a regression test.
- Site pins 2.12.0 at commit `56944f5`, deployed (Cloudflare version `8e673552-aac0-448b-84b9-b70b911b081b`); live `/release.json` shows framework 2.12.0, that commit, `dirty: false`.

## [2.11.0] - 2026-10-20

Engine: 2.11.0. _Curiosity and play_ ([slice plan](https://github.com/adam0white/human-framework/blob/main/docs/hf-roadmap-2026-10-20.md#current-increment-curiosity-and-play-then-bounded-planning-owner-2026-10-20); sources in [research/curiosity-and-play.md](https://github.com/adam0white/human-framework/blob/main/research/curiosity-and-play.md)). When a person's needs are met, they are drawn to try what they cannot yet predict, to keep at what they are getting better at, and to vary what they just did. Opt-in: a person without the slice gives the same state, decisions and digests as 2.10.0 with only the engine stamp normalized (the public `fingerprint` includes the stamp, so it changes). Saves migrate from 2.10.0 by stamping the version.

### Added

- Opt-in curiosity (`enableCuriosity(p, spec?)` or `PersonSpec.enable.curiosity`, state `Person.curiosity`, module `curiosity/`). `consider` adds three bounded terms. `curiosity:unknown` comes from the person's own uncertainty about the option's outcome. `curiosity:progress` is learning progress: prediction error falling. Noise earns only small, passing progress from chance runs, well below a learnable option's. `curiosity:vary` pulls toward an action kind done within the last hour with a different target or place. All three scale with a relaxed-field gate (physiological and safety urgency, fear), openness and age. Completed and failed acts update bounded histories (32 keys, 8 recent acts) and give a small intrinsic reward to leisure and competence in proportion to learning progress, capped at 0.03. Identifiers over 512 characters are not tracked. `curiosityOf(p, aff, now?)` reads the signals without changing anything. Boredom is unchanged and still acts through host `novel` tags.
- Headless control [`curiosity-control.ts`](https://github.com/adam0white/human-framework/blob/main/packages/human/examples/curiosity-control.ts): one adult with familiar, learnable and noisy options for one day of 96 decisions. With curiosity on and needs met, the adult chose familiar 20, learnable 62 and noisy 14 (in the last third: learnable 19, noisy 4). With curiosity off, it chose familiar 96. With curiosity on and the adult hungry, it chose familiar 96, because the gate closes. The control shows exploration followed by a preference for the option that became reliable. It does not isolate learning progress: in this setup, ordinary outcome learning alone also separates learnable from noisy (a review run with `progressScale: 0` gave 24 and 2 in the last third). The unit tests pin the progress term itself.

### Notes

- The coefficients are engineering defaults, not fitted values. Curiosity adopts no goals or projects. That waits on the island rerun after planning (roadmap §3b).

### Release

- Tag `v2.11.0` on source commit `da7377b` (CI run 39534894283 passed); the release's `npm run check`: 1962 passed, 8 skipped. Trusted npm workflow 39535394836 succeeded. Registry integrity `sha512-sa520xSTG6cEzbpPXH7YExMJtqNyul23MIljI7JW1X8C7KWpx4FBQxko8GyGkX2MGdyc+YR/y/scSZUEi9GYUw==`; `npm audit signatures` in a fresh install reports a verified attestation, and the installed package exports `enableCuriosity` and `curiosityOf` (2.11.0, engine 2.11.0).
- Review: one independent Codex review ([review](https://github.com/adam0white/human-framework/blob/main/docs/reviews/hf-2.11.0-codex-review.md)), five findings, all applied before release.
- Site pins 2.11.0 at commit `010c551`, deployed (Cloudflare version `fddb79b5-6d71-4496-8031-1e18065e759d`); live `/release.json` shows framework 2.11.0, that commit, `dirty: false`.

## [2.10.0] - 2026-10-20

Engine: 2.10.0. _Word and witness_ ([roadmap](https://github.com/adam0white/human-framework/blob/main/docs/hf-roadmap-2026-10-20.md) §1.1): who first said a thing, what it costs a source to be caught telling two stories, and how a person believes others now see them. Everything is opt-in by data: a person, percept or call that uses none of the new fields gives byte-identical state and decisions to 2.9.x, and legacy digests are unchanged. The engine stamp moves because the new term can change decisions when a host supplies the evidence. Saves migrate from 2.9.0 by stamping the version.

### Added

- Provenance: an attended claim may carry `origin` and an opaque host `lineage` (at most 64 characters). The belief keeps `provenance = { origin, firstFrom, at, lineage? }` from its first acquisition; later tellings and direct confirmation never overwrite it. `converse(..., { provenance: true })` relays origin and lineage; repetition still compares only proposition and value. `provenanceOf(p, prop)` reads it. Decisions never read provenance.
- Contradiction: `contradicted(p, { sourceId, prop, value, reporterId?, at? })` lowers source trust when the person learns that one source gave opposite accounts of one proposition: `after = before - 0.25 * w * before`, with `w = 1` when the person heard both accounts and the testimony weight of the reporter otherwise. It applies only against a retained first-hand account from that source with the opposite value, once per source and proposition, never raises trust and touches no other store. Two independent sources disagreeing stays ordinary uncertainty. An attended `told` percept may carry up to four `reports` that run this check.
- Believed regard: the impression a person holds of another gains an opt-in `regard` cue (how I believe they see me, −1 to 1, half-life 60 days), fed only by the person's own evidence that the other knows: own-act percepts listing `witnesses`, or `noteKnownBy(p, { otherId, act, via: 'told', sourceId })` weighted by trust in the teller. A witness the person did not see changes nothing. `regardOf(p, otherId, now)` reads it. `socialTerms` adds `regard:<id>` (at most 0.3) to repair offers towards someone believed to think badly of the person. The architecture documents how a broken promise reaches the breaker, the promisee and the witnesses.
- Headless control [`word-and-witness-control.ts`](https://github.com/adam0white/human-framework/blob/main/packages/human/examples/word-and-witness-control.ts): four people over 20 days in two renamed domains, with full, no-regard, no-contradiction, no-provenance and secret-witness arms giving the same verdicts in both domains.

### Notes

- `regard` is now a reserved impression cue key. HF never wrote it before 2.10.0; a host that stored its own cue under that key should rename it before upgrading.
- The repair term persists while believed regard stays negative. HF does not judge whether an apology was accepted; the host delivers that as feedback.
- A contradiction from a reporter at or below the trust floor records nothing (`untrusted-reporter`). A pair loses trust once, at the strongest reporter weight seen.

### Fixed

- Source trust reads and writes use own properties only, so an id such as `constructor` or `__proto__` behaves like any unseeded source (trust 0.5) instead of reading an inherited value or throwing; `confirm` no longer writes such an id by plain assignment. Ordinary ids are unaffected.

## [2.9.1] - 2026-10-20

Engine: 2.9.0. The _Host kit_ ([roadmap](https://github.com/adam0white/human-framework/blob/main/docs/hf-roadmap-2026-10-20.md) §1.2) and the owner's maintenance sweep. Behaviour-neutral: the engine stamp is unchanged, and every replay, fixture, hash and full-state legacy digest is unchanged. Patch number, not minor, because 2.10.0 is the approved name of _Word and witness_; nothing is removed.

### Added

- Host setup: `seedSourceTrust` authors testimony trust and `seedBelief` authors starting knowledge without an observation marker or reputation update. Both clamp finite values; source trust rejects self ids. The architecture documents relationship, voice and source trust separately.
- Saves: `fingerprint(person)` hashes the restored, recursively key-sorted saved form with a browser-safe 64-bit string hash. Key insertion order and optional empty slices removed by restore do not change the digest; this is a change detector, not a cryptographic check.
- Host recipes: [host-kit](https://github.com/adam0white/human-framework/blob/main/docs/host-kit.md) covers travel, effort and duration, need and work utility, community-state write-back and feeding residents, with executable tests.
- Death news: `tellDeath` accepts `{ late: 'now' | 'throw' }`. The existing tolerant default is preserved; explicit strict mode rejects ahead-of-time listeners before delivering news to anyone. The reported default throw did not reproduce on this baseline.

### Maintenance

- Update Vitest 5.0.3 → 5.0.5 and Wrangler 4.149.0 → 4.151.3; retain latest TypeScript 7.0.2, Vite 8.3.4, Biome 2.5.15, @vitejs/plugin-react 6.1.2 and @types packages.
- Update React and React DOM 19.3.0 → 19.3.1, fake-indexeddb 6.2.5 → 6.2.6 and happy-dom 20.14.6 → 21.0.4. Align the site HF pin 2.8.0 → 2.9.1 with the local source its build and tests already use; lab-client, lab-kit and playtester workspace versions stay unchanged.
- Refresh the lockfile and allowScripts for esbuild 0.28.2 and workerd 1.20261019.1. Remove the sharp override because the new miniflare dependency pins the patched 0.35.5 version itself.
- Advance the Worker compatibility date 2026-10-01 → 2026-10-20 after reviewing Cloudflare's compatibility flag history; no additional flags needed. Update the documented tool versions.
- Pin Vite 8.3.4 across the workspace (`overrides`): Vitest had hoisted Vite 8.3.2, which has open advisories fixed in 8.3.3.
- Refactors without behaviour change, from the [maintenance audit](https://github.com/adam0white/human-framework/blob/main/docs/reviews/hf-maintenance-audit-2026-10-20.md): `finish` (person), `evaluate` (will) and `stepCommunity` (sim) split into private helpers; three internal-only `export` keywords dropped (`effortValue`, `materialValue`, `goalValue`, never in the package entry); shared test builders; a validated-revision comparison without a double cast; stale scope and architecture comments corrected.
- CI: `npm run api-doc -- --check` fails when docs/api.md is stale, and a packed-tarball consumer smoke test runs a public example outside the workspace.

### Deprecated

- `expit` (use `sigmoid`, the same function), removed in 3.0. The `now` argument of `repent` and `recordRepair` is optional and is removed in 3.0. The 2.0 options-object forms and `TRAIT_NAMES` keep their 3.0 removal: the audit found no game using them, but the README promises them until 3.0 and removing an export is breaking. The owner's direction allowed removals where no game needs them; none were made, and the owner can call a 3.0 for them.

### Not migrated

- Cloudflare's `cf` CLI (1.0.0-beta.19) was tried as a replacement for wrangler; its build and dry-run deploy reject this workspace root, so deployment stays on wrangler (recheck 2026-12-01, docs/findings.md).

## [2.9.0] - 2026-10-19

Engine: 2.9.0. Takes the games' polish requests filed against 2.8.0 (The Two Voices 1, 2 and 5; The Pass 8), each opt-in or additive, plus doc notes (Voices 3 and 4). New state is optional and starts absent; engine 2.8.0 saves migrate by a version stamp. Persons that use no opt-in slice continue exactly (full-state digests match npm 2.3.0 with the engine stamp normalized); persons on the promptings and review slices without 2.9.0 options continue exactly as 2.8.0 (digests measured against the 2.8.0 release source, with the engine stamp and the new review-term `ref` normalized).

- Several named commitments: when `Outcome.fulfills` (or the activity's `Affordance.fulfills`) lists two or more ids, `finish`/`onFinished` keeps every listed commitment that is pending and in window, and no other. With one listed (or none of several eligible), one completion keeps the earliest-ending match, explicit or by action, as before. This is the one behaviour change for existing options: a host that named several commitments in 2.8.0 had one kept; no game in this repository names more than one.
- Cued turning-away responses: `PromptingResponse.cue` (and in `PromptingsSpec.responses`) names what a response was learned for: an action, an offer tag, or the opposing norm or goal (`n1`, `norm:n1`, `goal:g1`). At a prompt the person uses the most practised response whose cue matches, else the most practised uncued response; a cued response never serves a prompt it does not match. Each response used at a decision point gains practice once. New `responseCueMatches`, `PromptContext`; `promptingsReading` shows cues.
- Host-set practice half-life: `enablePromptings(p, { practiceHalfLifeDays })` (state `PromptingsState.practiceHalfLifeDays`), one value per person, default 60 days unchanged; `practiceAt(r, now, halfLifeDays?)`.
- A resolve term names its resolve: `Term.ref` (new optional field) carries the resolve's key on `review:resolve` when exactly one resolve weighed in; `source` is unchanged so hosts matching `review:resolve` exactly keep working.
- Docs: commitment labels should be noun phrases for `reviewLine` (`Commitment.label`, review SCOPE); a recurring commitment lapses on any unlived day (review SCOPE); goal terms are never negative, by design (`agendaTerms`).
- Headless control `packages/human/examples/game-requests-29-control.ts`: one or two named commitments (1 kept, then 2), uncued and cued responses, a week of disuse at 60 and 7 days (0.74, 0.40), and the resolve `ref`.

## [2.8.0] - 2026-10-19

Engine: 2.8.0. Takes the games' requests (docs/game-requests-2026-10-18.md) and adds an HF-character playtester beside the framework. All new state is optional and starts absent; engine 2.7.0 saves migrate by a version stamp. Persons and hosts that use none of it continue exactly (full-state digests match npm 2.3.0 with only the engine stamp normalized).

- Going along: `Affordance.alongside: PersonId[]` names people going this way; each known, living tie adds `together:<id>` = 0.12 × closeness. `decide(p, offers, { reconsider: true })` drops the running activity's inertia bonus for that decision (promise inertia stays) and is recorded as `DecisionRecord.reconsider`. The Rope's tug case.
- Fullness (opt-in, `enableFullness(p)` or `enable: { fullness: true }`): an offer advertising food, water or relief to a need past comfort gets `full:<need>` = −0.03 × gain × over², so idle choice stops looping on drinks. The Rope's Kestrel loop.
- A voice's word: `seedVoice(p, voiceId, trust, { replace })` sets an authored trust on an existing person; `noteVoicePromise(p, voiceId, { kept, at, action })` moves trust by whether the voice kept its own promise (kept +0.1 of headroom, diminishing per action; broken −0.25 of trust). New `WILL_DEFAULTS.promiseKeptGain`, `promiseBrokenLoss`.
- Forecast thresholds per offer: `Affordance.forecastAt: { comfortAt, spentAt }` and `forecastThresholds(aff)`; invalid pairs fall back to the defaults. The Glance's night keepers.
- Headless control `packages/human/examples/game-requests-control.ts`: partner leaving (N, C, T, CT arms: only CT goes on, 12 of 12), fullness off and on (120 sips to 2), kept and broken promises.
- New private workspace package `packages/playtester` (not published): an HF person plays a game through a four-call adapter (observe, actions, apply, advance) and the session traces where it got bored, frustrated, rewarded or stopped. Four personas; toy-game controls; an example adapter for The Pass (https://github.com/adam0white/pass), read-only against that repository.
- Rejected or deferred requests, with reasons, are in the triage table; the shape and source references of the new defaults are in research/empirical-models.md §6b (unaudited citations).
- Scope excludes a bladder, partner handshakes, promise excuses or size, and narration variety (engine 2.9).

## [2.7.0] - 2026-10-18

Engine: 2.7.0. Adds the evening self-review (muhasaba), the second slice of research/reconciliation.md. The review is optional state (`review`) that starts absent; engine 2.6.0 saves migrate by a version stamp. Persons without the review decide exactly as before.

- `review/`: `enableReview(p, spec)` (or `enable: { review }`), `reviewIfDue`, `reviewTerms`, `reviewLine`, `resolveKey`, `REVIEW_DEFAULTS`, `sanitizeReview`. From 21:00 (or at the day's close) the person reviews the commitments kept and broken since their last review; a broken one forms a resolve, an if–then intention that leans on that commitment's own term (`review:resolve`, bounded) at its next occasion. Released and excused commitments form none.
- Held review styles: `accounting`, `ruminating` (weaker resolves, some distress), `none`. Sources in reconciliation.md §8 (Q 59:18; ʿUmar's athar after Tirmidhi 2459; Gollwitzer & Sheeran 2006; Breines & Chen 2012; Watkins 2008).
- Headless control `packages/human/examples/review-control.ts`: no review, accounting, ruminating, and a person who never lapses.
- Scope excludes revising methods or prompting responses, tawba conditions, divine reckoning and sleep effects.

## [2.6.0] - 2026-10-18

Engine: 2.6.0. Adds an opt-in slow fatigue store and applies an open fast's hunger damping in the bodily forecast. The store is optional state (`body.depletion`) that starts absent; engine 2.5.0 saves migrate by a version stamp. Offers without `followedBy` decide exactly as before, and so does any person without the store who is not fasting; a fasting person's `followedBy` offers now see damped hunger.

- `body.depletion` (opt-in via `enableFatigueStore(p)` or `enable: { fatigueStore: true }`): accumulated exertion that fills while effort stays above `depletionFloor`, more slowly for fit people, and recovers with rest and faster with sleep (scaled by `recovery`). It raises perceived fatigue and so lowers capacity. Five new required `BodyParams` keys: hosts that build `BodyParams` by hand must spread `BODY_DEFAULTS`.
- The bodily forecast carries the store forward, so hours of climbing now make a declared descent weigh.
- The forecast reads the body as the person perceives it under an open fast: hunger is damped, thirst is not (N2b).
- Control arms `store-morning` and `store-undeclared` in both domains.
- Replay review: the three site games do not enable the store and declare no `followedBy`; their regression tests pass unchanged, so no behaviour-version migration is needed.
- Scope excludes injury, route search, planned rests and separate muscle/glycogen compartments.

## [2.5.0] - 2026-10-18

Engine: 2.5.0. Adds a bodily forecast over known follow-on exertion. The person state shape is unchanged; engine 2.4.0 saves migrate by a version stamp. Offers without the new field decide exactly as before.

- `Affordance.followedBy: FollowOn[]` declares exertion the person knows must follow an act (the way back, carrying the load home). The person forecasts their own body through the act and those spans with the ordinary body model, as they perceive it.
- One bounded term, `forecast:body`, weighs the worst perceived fatigue, sleepiness, hunger or thirst during the follow-on. It is pure and draws no randomness.
- `body/ forecastBody`, `bodyForecastFor`, `bodyForecastTerm`, `forecastLine`, `FORECAST_DEFAULTS` and the composite's `bodyForecast(p, aff)`, which returns the spans and a line such as "I can do it, but I'll be spent for the descent."
- Headless control `packages/human/examples/body-forecast-control.ts`: rested, depleted, depleted without the declared return (ablation) and evening arms in two renamed domains.
- Scope excludes cumulative exertion (the body model has none), route search, planned rests, injury prediction, fasting perception and host surroundings in the forecast.

## [2.4.0] - 2026-10-18

Engine: 2.4.0. Adds opt-in promptings and turning away, the first slice reconciling the Islamic understanding of the human with current science as interpretations people hold. Engine 2.3.0 saves migrate by a version stamp; persons without the slice continue exactly (full-state digests match npm 2.3.0 with only the engine stamp normalized).

- New module `promptings/` owning optional `Person.promptings`: `enablePromptings(p, spec)` or `PersonSpec.enable.promptings`. A prompt is a noticed pull (habit, emotion, need, host `temptation` tag) toward an option a held norm or goal opposes. It is recorded as `assented`, `turned` or `passed` and is never a breach or an intention; only an assented, finished act reaches the conscience record.
- Practised responses (`refuge`, `redirect`, `leave`) add a bounded `promptings:turn` term, absent at survival desperation. Practice grows with use and halves over 60 days of disuse. No RNG is drawn.
- Held readings per person (`whisper`, `inclination`, `intrusion`, `fault`, `none`) with provenance. The first three and `none` give identical decisions and differ in vocabulary only. `fault` (scrupulous) adds guilt at the prompt; an optional `echoRate` recurrence term is a labelled assumption, off by default.
- Read-only lenses: `promptingsReading(p)`, `promptingLine`, and `nafsReading(p)` (the three Qurʾanic descriptions with evidence, never a level).
- Headless control `packages/human/examples/promptings-control.ts`: no response, practised redirect, `fault`, and a fixed penalty at two strengths over 60 days.
- Scope excludes: the source of any thought, a measure of faith, spiritual rank, reward for resisting, clinical OCD, abstention-window prompts and chronicle lines (roadmap).

## [2.3.0] - 2026-10-17

Engine: 2.3.0. Adds opt-in expected completion valuation and bounded received consequences. Engine 2.2.0 saves migrate by a version stamp; old optional method records remain intact.

- An attended external `told` percept addressed to the person or broadcast can carry `consequences` or `withdrawConsequences`. Source-labelled knowledge lives in optional `Person.prospection`, with exact action/target/place matching, completion windows, revisions, expiry, consumption and conservative restore. Self testimony and explicit other recipients are rejected; revision records serialize identically before and after restore. There is no inferred consent or automatic execution.
- `Goal.temporal.halfLifeMinutes` explicitly enables time **and action-success** valuation for direct actions as well as one described successor. Existing `deadline` remains urgency, not a cutoff. Without temporal opt-in, existing goal formulas and decisions remain unchanged.
- One coherent received route can contribute to active goals. Expected successor effort and material cost use the same readers as actual offers, remain undiscounted and are charged once without maturity scaling. Routes compete in the rounded units emitted in ordinary decisions. Own completed requests consume their opportunity without advancing terminal goals.
- State retains at most 16 opportunities and 64 source/id revision records. A batch that would exceed still-valid revision capacity is rejected atomically. Consumed entries leave before unused entries when entry capacity is exceeded. Deduplication is bounded to seven days; capacity is shared globally rather than allocated by source trust. The query is current retained evidence, not a durable audit.
- A frozen domain-neutral control covers useful, late, costly, uncertain, withheld, removed-knowledge, removed-goal, temporal-off and refused arms in two renamed domains. Legacy continuation digests compare full person state against npm 2.2.1 with only the engine stamp normalized.
- Scope excludes graph search, waiting opportunity cost, future body prediction, goal synthesis and guarantees of consent or outcome. Favorable control parameters are explicit engineering premises, not calibrated human estimates.

## [2.2.1] - 2026-10-14

Engine: 2.2.0. Corrects acquired method evidence. The person state shape is unchanged; engine 2.1.0 saves migrate by a version stamp that preserves optional method records.

- Modeling-assumption correction: independently successful actions do not prove exclusivity. Evidence grades each action independently, so another successful procedure no longer counts as its failure. Same-action failure, attention, source trust, decay and restore bounds remain unchanged.
- A domain-neutral control covers two independently successful procedures, withheld teaching, skill-only support, same-action failure, ordinary need-driven choice and snapshot restore. Existing game replay controls still pin behavior after normalizing only engine metadata.
- Missing or mismatching required cues do not match a method. An unobserved hidden exception can still match received cues; hidden exception detection remains unsupported.

## [2.2.0] - 2026-10-10

Engine: 2.1.0. Adds optional demonstrated conditional methods. Existing hosts without method state retain their previous decisions; engine 2.0.0 saves migrate by a version stamp.

- Acquired categorical cue conjunctions and attended success/failure examples live in `Person.methods`, independently of scalar skills. `receiveMethodCues`, `clearMethodContext`, `demonstrateMethod` and `methodEvidence` expose the bounded faculty. Ordinary cognition includes source-labelled method evidence for offers carrying a matching received context.
- Missing cues remain unknown; conflicting examples reduce support. Attention, source trust, disuse and failed practice grade evidence. Conditions/actions are canonicalized independently of arbitrary method labels. Restore validates bounds and safe ids, and retains a 256-example deduplication horizon across evidence/rule eviction.
- Existing Game 1/2 playtest packets retain their original full-state hashes. Their replay behavior is verified by normalizing only the person-engine stamp; runtime exports honestly retain the current stamp, so loading an older packet reports an engine-metadata hash difference.
- A domain-neutral headless control keeps two methods and one exception, with identical offers across trained, valid-alternative teaching, withheld, scalar-skill-only and acquired-state-ablation arms. The exception's ordinary safe fallback is not claimed as learned exception recognition. This is bounded explicit conditional acquisition, not a universal planner or calibrated human-learning model.

## [2.1.4] - 2026-10-07

Engine: 2.0.0. Unchanged. A packaging release: no API or simulation behaviour changes; replays, fixtures and state
hashes are byte-identical to 2.1.3.

- The first version published to npm by the release workflow (trusted publishing), with an npm provenance
  attestation linking the package to this repository and commit. 2.1.3 was published by hand and has none.

## [2.1.3] - 2026-10-07

Engine: 2.0.0. Unchanged. A packaging release: no API or simulation behaviour changes; replays, fixtures and state
hashes are byte-identical to 2.1.2.

- The package is published to npm as `@adam0white/human-framework` (`npm install @adam0white/human-framework`). This
  version is published by hand; from the next one, a release workflow publishes each version with trusted publishing
  (OIDC, no stored token) and an npm provenance attestation.

## [2.1.2] - 2026-10-06

Engine: 2.0.0. Unchanged. A security fix; replays, fixtures and state hashes are byte-identical to 2.1.1.

### Fixed

- A host id of `__proto__`, `constructor` or `prototype` (a person, action or skill) is refused with an error. Before, it could write through to `Object.prototype` when `stepCommunity`, the village scenario or `skillFamilies` filed per-id records (found by CodeQL once the repository went public). No other ids change behaviour; replays and hashes are unchanged.

## [2.1.1] - 2026-10-06

Engine: 2.0.0. Unchanged. A packaging release: no API or simulation behaviour changes; replays, fixtures and state hashes
are byte-identical to 2.1.0.

- The package is renamed from `@human/framework` to `@adam0white/human-framework` (the `@human` npm scope is not ours). Imports change; the API does not.
- The package is licensed under MIT (was `UNLICENSED`); the tarball includes `LICENSE`. The repository's `docs/` and `research/` are CC BY 4.0.

## [2.1.0] - 2026-10-05

Engine: 2.0.0. Unchanged from 2.0.0. A polish release: no simulation behaviour changes; playtest replays, engine fixtures and
state hashes are byte-identical to 2.0.0. Deprecated forms listed below are removed in 3.0.

### Added

- `PersonSpec.enable: { gists, yearbook, character, skillRetention }` turns those long-run faculties on at creation,
  the same as calling `enableGists`, `enableYearbook`, `enableCharacterChange` and `enableSkillRetention` after it.
- `emotionLevel(p, id, targetId?)`: the summed intensity of one emotion (optionally toward one target).
- `ageAt(p, at)`: age in years at a given minute (`ageYears(p)` is `ageAt(p, p.now)`).
- `TRAIT_KEYS`, `VALUE_KEYS` (the canonical key order) and `DAYS_PER_YEAR`.
- Positional forms for host events, which take `at` as the last required argument:
  `glimpse(observer, targetId, signs, at, clarity?)`, `glimpseOf(observer, target, at, clarity?)`,
  `hear(observer, targetId, key, value, at, weight?)`, `conceive(mother, father, seed, at)`,
  `retell(teller, listener, at, opts?)` with the new `RetellOptions` type. The rule is in
  [docs/framework.md](https://github.com/adam0white/human-framework/blob/main/docs/framework.md#argument-order).

### Changed

- `snapshot` and `restore` moved to their own module (`restore.ts`); each optional slice is now checked by its
  owning module. Same exports, same results.
- `restore` checks the entries of saved year records too: malformed actions, episodes and illness entries are
  dropped, each list is held to its live bound, and one record per year is kept, in year order. A save the engine
  wrote is unchanged.
- `MAX_MINUTE` is defined in `types.ts` (still exported from the package root).
- `sanitizeInjuries`, `sanitizeGroups` and `sanitizeImpressions` are marked `@internal` like the other restore
  sanitizers, so they leave docs/api.md; they are still exported at runtime.
- Doc comments, docs/framework.md and the package README match the code; game-specific wording is out of the
  framework source.

### Deprecated (removed in 3.0)

- The 2.0 options-object forms `glimpse(…, { at, clarity })`, `glimpseOf(…, { at, clarity })`,
  `hear(…, { at, weight })`, `conceive(…, { seed, at })` and `retell(…, { at, … })`: pass `at` positionally.
- `TRAIT_NAMES`: use `TRAIT_KEYS`.

## [2.0.0] - 2026-10-04

Engine: 2.0.0. HF 2.0 adds the faculties a life over decades needs: experience over years, upbringing and heredity,
courtship and marriage, surroundings, multi-year stepping and impressions of others, each opt-in or absent until
used. Engine 2.0.0 changes no behaviour for a valid save; the engine versions in between (1.8.0, 1.9.0) are listed
under Changed.

### Upgrading from 1.x

- **Saves.** `restore` upgrades every save from engine 1.4.0 onward: HF 1.0.0 (engine 1.6.0), 1.1.0 (1.6.0), 1.2.0
  (1.7.0) and pre-release 2.0 builds (1.8.0, 1.9.0). A 1.9.0 save continues exactly as 1.9.0 would; the only shape
  change is `ambient.now` → `ambient.percept`, which the migration renames. Saves from 1.4.0 to 1.8.0 restore and
  continue under the current rules (the 1.7.0 prayer rules, the 1.9.0 omission rule), so they do not replay what the
  old engine would have done next. Saves older than 1.4.0 are refused. `restore` is stricter about crafted saves: a
  non-finite `now`, or one beyond `MAX_MINUTE`, is refused, and every list and value is held to its live bound and
  range ([security review](https://github.com/adam0white/human-framework/blob/main/docs/reviews/2026-10-04-h2-summary.md#security)); a save the engine wrote is unchanged.
- **Renamed.** `consolidate` → `foldGists`; `enableSkillConsolidation` → `enableSkillRetention`; `underWay` →
  `isUnderWay`; `believed` → `believedValue`; the skills primitive `observe` → `learnByWatching` (the composite
  `observeSkill` is unchanged); `RoutineLifecourse` → `LifecourseOptions` (it was a copy); `AmbientState.now` →
  `AmbientState.percept`.
- **Removed.** `courtshipOf` (use `courtshipStage` or `p.bonds`), the town scenario (below), and exports that only
  their own module used: `injuryAffects`, `experiencePush`, `habitKey`, `dayFold`, `crowdingExcess`, `exposureRisk`,
  `qualityFactor`, `instructionFactor`, `cueKind`, `priorOf`, `hasImpression`, `isJointOffer`, `isConversation`,
  `awaitingJoint`, `warmthNow`, `fastingCtx`.
- **Behaviour.** Two fixes change runs only where they apply: `answerNow` no longer books (and tallies) a refusal for
  a voice it did not hear because `maxVoices` crowded it out, and an unknown `Affordance.skill.domain` learns on the
  general curve instead of resetting the skill to 0. Games 1 and 2 replay their recorded playtests unchanged.

### Added

- `retell(teller, listener, { at, trust?, limit?, placeIds? })` (memory, L2): a teller's strongest lasting gists
  become the listener's weaker told gists, scaled by trust, so a child fears a place their parents fear before ever
  standing there and their own visits later outweigh it. No randomness. With `RETELL_DEFAULTS`.
- `setRetention(p, { trace?, chronicleDays? })`, `PersonSpec.retention` and the optional `Person.retention`: per-person
  bounds for hosts that live people sparsely over decades. A shorter trace (0 keeps none) and day records bounded by
  age as well as count (dropped days fold into the yearbook at once). No decision changes. Game 3 uses it to halve
  its save pages ([performance review](https://github.com/adam0white/human-framework/blob/main/docs/reviews/2026-10-04-h2-summary.md#performance)).
- `MAX_MINUTE`, the largest minute `restore` accepts.

- Family (`family/`, HF 2.0 L2): `conceptionChance`, `conceive`, `pregnancyDue`, `deliver` (pregnancy and birth as
  host-driven events; gestation from research), `raise` (ongoing upbringing: warmth-weighted values, the lived
  example of norms, attachment security, trust in the household's voices), `aptitudeOf`, and inherited learning
  aptitudes through `createChild`'s opt-in `ChildSpec.aptitudes`. New optional `Person.family`, `PersonSpec.family`.
- Courtship and marriage (`partnering/`, L3): `attraction`, `compatibility`, `court`, `courtshipStage`, `betroth`,
  `kinship`, `canMarry`, `marry`, `widow`, `widowhoodMortality`; offers `courtingOffer`, `proposeOffer`,
  `proposalOffers` (accepting is an ordinary decision, so a person can refuse); `familyVoices` (relatives' approval
  as weighed voices); customs `GENERIC_CUSTOM` and `MUSLIM_CUSTOM`; a separate `MARRIAGE_NORMS` catalog. A spouse's
  perceived death ends the marriage and starts any waiting period. Divorce is not modelled yet. New optional
  `Person.bonds`. Sources: [research/marriage-sources.md](https://github.com/adam0white/human-framework/blob/main/research/marriage-sources.md), decisions in [research/decisions.md](https://github.com/adam0white/human-framework/blob/main/research/decisions.md).
- Surroundings (`environment/`, L4): `setAmbient`, `clearAmbient`, `ambientMood`. Cold, darkness, crowding, beauty
  or squalor, weather and day length shift mood (small, research-bounded offsets), body (cold metabolism, slower
  recovery and sleep) and needs. New optional `Person.ambient`. Sources: [research/family-environment-sources.md](https://github.com/adam0white/human-framework/blob/main/research/family-environment-sources.md).
- `understandNorm` (conscience) and `adoptVoiceTrust` (will); `advanceAffect` takes an optional mood offset.
- Multi-year stepping (L5): `routineDay` and `liveRoutine` live a person by a host `Routine` one coarse day at a time
  (decays, skill practice, companions, remembered events, one appraisal, opt-in chronic onsets and natural death on
  the person's RNG); `liveCommunity` steps a settlement day by day, tells deaths, raises minors with their parents
  (`LiveCommunityOptions.upbringingMinutes`) and leaves the bookkeeping `stepCommunity` needs to resume. 25 people for 50 years run in
  about 3.5 s (`npm run bench`). New `SimEvent` kinds `onset` and `stage`; `advanceAffect` takes an optional
  substep cap.
- Lasting memory (L5): `enableGists`, `foldGists`, `gistsFor`. Episodes that are forgotten or older than 180 days
  fold into bounded gists of what mattered, which still shape choices through a `memory` term (a fear learned at 20
  still counts at 40). Yearbook: `enableYearbook`, `foldDay`, `yearRecord`, one bounded summary per year.
- Experience over years (L1): `Affordance.skill.domain` picks a learning age curve; `finish` applies a host
  `SkillTransfer` (`FinishOptions.transfer`, `World.skillTransfer`); `Outcome.practice` sets practice quality and
  instruction (`instructionFrom`); `observeSkill` and `Percept.demonstrates` teach by watching;
  `enableSkillRetention` lengthens forgetting with practice hours; `enableCharacterChange` matures traits and
  values with age and moves traits slowly with sustained experience around a set point, within ±0.15 of the
  anchor. Sources and assumptions: [research/long-run-sources.md](https://github.com/adam0white/human-framework/blob/main/research/long-run-sources.md).
- Impressions (HF 2.0 L6, `social/impressions.ts` and the composite `impression.ts`): what one person believes about another's state (fatigue, pain, fear, mood), fear of places, traits, ties, trust in a voice and seen skill (`skill:<id>` keys, weight halving over a year), each with a confidence, learned only from observations the host reports (`glimpse`/`glimpseOf`, `observeAct`, `hear`, `acquaint`/`acquaintWith`). A person's reserve (`setReserve`, default from emotionality) hides pain and fear from faces and more from words (`selfReport`); a limp always shows. `predictAs` and `previewCommandAs` run `predict`/`previewCommand` on the person as the observer pictures them (`imagine`), so a player's read and a villager's judgement use one function. Cognition adds a `companion:<id>` term on risky offers shared with people one holds impressions of (`companionSteadiness`). New optional state `social.impressions` and `social.reserve`, absent until used; observing draws no randomness, so runs that do not use it replay byte for byte.
- `tellDeath(c, dead, at)`: a told `death` percept to everyone with a tie; a spouse is widowed.
- `answerNow(p, affordances, suggestion, opts)` (person.ts), with `answerSuggestion` (will) and `noteAnswer`
  (chronicle): answer a suggestion between decision points without touching the running activity. A refusal is booked
  as a decision books it (pressure, refused counter, `pushed`/`worn` trust costs, chronicle tally) and returned with
  `booked: true`; any other verdict writes nothing and equals `predict`. No RNG, no trace entry. Game 2 uses it so a
  refused word is answered at once and does not interrupt him.

### Changed

- Engine 2.0.0: `AmbientState.now` is renamed `percept` (migrated); `restore` validates impressions, character, bonds
  and gists by range and bound in their owning modules (`sanitizeCharacter` is new) and holds every list to its live
  cap; `tick` returns on a minute it cannot step instead of looping. No valid run changes.
- Engine 1.8.0 adds the optional long-run state above, each piece absent until used; runs that use none of it are
  unchanged apart from deaths being told (below).
- Engine 1.9.0, the omission rule (found by Game 2's faith-pushing simulated players, docs/findings.md). A duty stays
  protected past its window's end while an activity that keeps it, begun inside the window, is under way: a prayer
  begun in its time counts ([research/decisions.md](https://github.com/adam0white/human-framework/blob/main/research/decisions.md)), so an insisted option no longer abandons it. An
  activity that would cover a protected duty's whole closing stretch and run past the window's end is reviewed when
  the stretch begins, so a sleep begun just before Fajr's last minutes no longer runs through sunrise unweighed.
  Capacity and necessity still lift the rule. New exports `agenda.isUnderWay`, `will.dutyReviewAt`. The village
  continuation hashes are unchanged; the Game 1 playtest run shifts by minutes.
- `stepCommunity` tells each death to everyone alive with a tie (`StepOptions.tellDeaths`, default true): they
  grieve, keep the tie as a memory, and a spouse is widowed. Runs without deaths are unchanged; no playtest fixture
  changed.

### Removed

- **Breaking:** the town scenario (`createTown`, `townPeople`, `townSpecs`, `townCalendar`, `townDay`, `homeOf`,
  `selinEidCallMinute`, `TOWN_IDS`, `TOWN_DEFAULTS`, `TOWN_EID_DAY`, `TOWN_GAME_CREATE`, `TOWN_GAME_START` and the
  `Town`, `TownState`, `TownOptions`, `TownDay`, `TownPersonId` types). It was Game 2's world, not a reference
  host, so it moved to the game (`apps/site/src/voice/sim/town.ts`). `createVillage` stays as the framework's
  reference host. Hosts that used the town should copy that file; it only uses the public API. Town edits no
  longer change `ENGINE_VERSION`.

## [1.2.0] - 2026-10-04

Engine: 1.7.0. `restore` upgrades saves from engine 1.4.0, 1.5.0 and 1.6.0; they continue under 1.7.0 rules.

### Added

- Faith defaults from [research/decisions.md](https://github.com/adam0white/human-framework/blob/main/research/decisions.md) (most common position across schools): `PrayerTimes.sunrise` with Fajr ending at sunrise; `makruhWindows` / `inMakruhTime` for the three disliked times; `eidWindow` and a recommended `eid-prayer` norm linked by default.
- Make-up debt (qada): a missed obligatory prayer or broken obligatory fast adds an `OwedMakeUp`. Sleep through the whole window and being downed lift the blame but keep the debt; more than five windows lost in one downing drop that stretch's debt; a mental break stays accountable. `missedExcuse`, `owedMakeUps`, `scheduleMakeUp`.
- Platform-independent math: `dexp`, `dlog`, `dcos`, `dpow` (`core/libm.ts`). The engine uses them everywhere instead of `Math.exp`/`log`/`cos`/`**`, so a run gives the same bits on every OS, CPU and JavaScript engine; a test fails on any platform transcendental in engine code. Hosts with deterministic game code can use them too.

### Changed

- Behaviour wherever prayer windows are used (see the 1.7.0 entry in [docs/framework.md](https://github.com/adam0white/human-framework/blob/main/docs/framework.md)). The town reference scenario supplies sunrise, holds the Eid prayer and offers make-ups between Dhuhr and Asr.
- About 8% slower simulation from the portable math (village bench, median 1695 ms to 1823 ms).

### Fixed

- Replays were not bit-identical across platforms: native transcendental functions differ in the last bit between macOS arm64 and Linux x64 on the same Node version.

### Security

- `migrate` looks versions up as own properties only; `restore` drops unknown top-level keys and malformed new optional state.

## [1.1.0] - 2026-10-04

Engine: 1.6.0. `restore` upgrades person saves from engine 1.4.0 and 1.5.0; older saves are refused.

### Added

- Save migration: `migrate`, `migratableVersions`, `MIGRATIONS` and the `MigrationStep` type. `restore` passes a
  save from an earlier engine through a chain of steps keyed by the version each upgrades from. The steps only
  restamp the version: a migrated save continues under 1.6.0 rules and does not replay the old engine where rules
  changed. Tested against real 1.4.0 and 1.5.0 saves (`test/fixtures`), whose continuations stay byte-identical to
  the old engine's own. Community and world state are not migrated.
- Commanded control: `command`, `releaseCommand`, `previewCommand` and `StepOptions.controlled`. A command is a
  separate input to the will, not a stronger suggestion; it yields the verdict `commanded` and charges autonomy,
  voice pressure and trust per controlled hour by how much the person would rather have done something else. A
  pressing need suspends it for a decision; death, a mental break, being downed or an order to break a held norm
  ends it. Suggestion and `insist` semantics are unchanged.
- Mental breaks (crisis state in affect): `enableBreaks`, `inBreak`, `checkCrisis`, `breakHazard`,
  `breakBehaviour`, `breakAllows`, `easeBreak`, `skipCrisis`, `strain`, `CRISIS_DEFAULTS` and the `CrisisEvent`
  type. Opt-in per person; the host supplies the break behaviours. During a break only the behaviour's offers are
  open and no voice reaches the person. Off by default, with no state and no RNG draws.
- Injury depth: per-part capacities read from injuries (`DEFAULT_PARTS` or the injury's own `affects`), an opt-in
  `Affordance.requires` veto, host-set bleeding with clotting (`bleedRate`, `bleedStep`) and `tend`, and a downed
  state set by `knockDown` / `standUp` or derived for people with `enableDowned` (`isDowned`). Downed narrows
  offers to floor, rest and sleep.
- Insiders, outsiders and threats: `joinGroups`, `meet`, `careFor`; harm to insiders weighs in judgement and
  appraisal. `Percept.threat` becomes a fear prospect aimed at its source (`threatFrom`), stronger for a wary
  person facing an outsider, and the person avoids options at a feared place.
- Town scenario: once the doctor has spoken, Halil is offered a once-a-day 30-minute walk by the river (in Ramadan
  only after breaking the fast and not during the meal); finishing it right after eating withholds the
  after-meal smoking habit through habit extinction. New optional state `lastWalk`, `lastAte`.

### Changed

- Engine 1.5.0: standing advice counts the running activity as on offer, so advice that started an activity is
  still heard at its reviews after the offer's start window has closed.
- Engine 1.5.0: Halil's cigarette in the town scenario has no place. It had been keyed to the tea house, so the
  seeded after-meal habit was never reinforced and nothing at home could withhold it.
- `npm run check` (and `npm test`) no longer asserts wall-clock budgets; they moved to `npm run bench`, which runs
  the framework with Vite's module runner off.

### Known issues

Recorded in [docs/findings.md](https://github.com/adam0white/human-framework/blob/main/docs/findings.md) (2026-10-04): duties missed during a mental break are booked as
missed like any other; a downed villager still "rests at home" because the village has no places; threat fear
fades in hours unless the host keeps sending the threat.

## [1.0.0] - 2026-10-03

Engine: 1.4.0. First release of Human Framework v1: one `Person` actor with body, needs, affect, memory, beliefs,
skills, habits, relationships, values, an understanding of moral norms and a will that can refuse a suggestion;
the community driver (`stepCommunity`), `predict`, snapshots and input-log replay; the village and town
scenarios. Shown live by Games 1 and 2 at https://human.adamwhite.work.

[Unreleased]: https://github.com/adam0white/human-framework/compare/v2.1.2...HEAD
[2.1.2]: https://github.com/adam0white/human-framework/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/adam0white/human-framework/compare/v2.1.0...v2.1.1
[1.1.0]: https://github.com/adam0white/human-framework/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/adam0white/human-framework/releases/tag/v1.0.0
