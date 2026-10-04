# Changelog

Releases of `@human/framework` (Human Framework, HF). The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).
The release version is the package version and `FRAMEWORK_VERSION`, tagged `vX.Y.Z`. Each entry also names the
`ENGINE_VERSION` (simulation behaviour and save format) it ships; see the version policy in
[packages/human/README.md](packages/human/README.md#versions). The games in `apps/site` are not covered here.

`npm run release` publishes the section whose heading matches the package version as the GitHub release notes.
Each released section opens with `Engine: X.Y.Z.` matching `ENGINE_VERSION`; the script refuses otherwise. Use
absolute links in sections, since they are copied into the release page.

## [Unreleased]

Engine: 1.8.0. `restore` upgrades 1.7.0 saves by a version stamp; runs that use none of the new slices are unchanged.

### Added

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
  (`upbringingMinutes`) and leaves the bookkeeping `stepCommunity` needs to resume. 25 people for 50 years run in
  about 3.5 s (`npm run bench`). New `SimEvent` kinds `onset` and `stage`; `advanceAffect` takes an optional
  substep cap.
- Lasting memory (L5): `enableGists`, `consolidate`, `gistsFor`. Episodes that are forgotten or older than 180 days
  fold into bounded gists of what mattered, which still shape choices through a `memory` term (a fear learned at 20
  still counts at 40). Yearbook: `enableYearbook`, `foldDay`, `yearRecord`, one bounded summary per year.
- Experience over years (L1): `Affordance.skill.domain` picks a learning age curve; `finish` applies a host
  `SkillTransfer` (`FinishOptions.transfer`, `World.skillTransfer`); `Outcome.practice` sets practice quality and
  instruction (`instructionFrom`); `observeSkill` and `Percept.demonstrates` teach by watching;
  `enableSkillConsolidation` lengthens forgetting with practice hours; `enableCharacterChange` matures traits and
  values with age and moves traits slowly with sustained experience around a set point, within ±0.15 of the
  anchor. Sources and assumptions: [research/long-run-sources.md](https://github.com/adam0white/human-framework/blob/main/research/long-run-sources.md).
- Impressions (HF 2.0 L6, `social/impressions.ts` and the composite `impression.ts`): what one person believes about another's state (fatigue, pain, fear, mood), fear of places, traits, ties and trust in a voice, each with a confidence, learned only from observations the host reports (`glimpse`/`glimpseOf`, `observeAct`, `hear`, `acquaint`/`acquaintWith`). A person's reserve (`setReserve`, default from emotionality) hides pain and fear from faces and more from words (`selfReport`); a limp always shows. `predictAs` and `previewCommandAs` run `predict`/`previewCommand` on the person as the observer pictures them (`imagine`), so a player's read and a villager's judgement use one function. Cognition adds a `companion:<id>` term on risky offers shared with people one holds impressions of (`companionSteadiness`). New optional state `social.impressions` and `social.reserve`, absent until used; observing draws no randomness, so runs that do not use it replay byte for byte.
- `tellDeath(c, dead, at)`: a told `death` percept to everyone with a tie; a spouse is widowed.

### Changed

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

[Unreleased]: https://github.com/adam0white/human-framework/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/adam0white/human-framework/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/adam0white/human-framework/releases/tag/v1.0.0
