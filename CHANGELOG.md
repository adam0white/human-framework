# Changelog

Releases of Human Framework (HF), packaged as `@adam0white/human-framework` (`@human/framework` up to 2.1.0). The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).
The release version is the package version and `FRAMEWORK_VERSION`, tagged `vX.Y.Z`. Each entry also names the
`ENGINE_VERSION` (simulation behaviour and save format) it ships; see the version policy in
[packages/human/README.md](packages/human/README.md#versions). The games in `apps/site` are not covered here.

`npm run release` publishes the section whose heading matches the package version as the GitHub release notes.
Each released section opens with `Engine: X.Y.Z.` matching `ENGINE_VERSION`; the script refuses otherwise. Use
absolute links in sections, since they are copied into the release page.

## [Unreleased]

### Added

- Opt-in curiosity and play (`enableCuriosity` or `PersonSpec.enable.curiosity`): uncertainty, falling prediction error and recent repetition with variation add bounded decision terms, scaled by physiological and safety urgency, fear, openness and maturity. Completed and failed acts retain bounded histories and reward leisure and competence through the needs owner. `curiosityOf` is a read-only view. Without the slice, legacy continuation remains exact.
- A one-day headless curiosity control with familiar, learnable and noisy options, comparing enabled, disabled and hungry arms.

## [2.10.0] - 2026-10-20

Engine: 2.10.0. *Word and witness* ([roadmap](https://github.com/adam0white/human-framework/blob/main/docs/hf-roadmap-2026-10-20.md) §1.1): who first said a thing, what it costs a source to be caught telling two stories, and how a person believes others now see them. Everything is opt-in by data: a person, percept or call that uses none of the new fields gives byte-identical state and decisions to 2.9.x, and legacy digests are unchanged. The engine stamp moves because the new term can change decisions when a host supplies the evidence. Saves migrate from 2.9.0 by stamping the version.

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

Engine: 2.9.0. The *Host kit* ([roadmap](https://github.com/adam0white/human-framework/blob/main/docs/hf-roadmap-2026-10-20.md) §1.2) and the owner's maintenance sweep. Behaviour-neutral: the engine stamp is unchanged, and every replay, fixture, hash and full-state legacy digest is unchanged. Patch number, not minor, because 2.10.0 is the approved name of *Word and witness*; nothing is removed.

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
