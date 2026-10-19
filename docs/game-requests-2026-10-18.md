# Game requests to HF, triaged 2026-10-18

Sources:
- The Rope: `/Users/abdul/code/rope/docs/hf-requests.md` and `docs/findings.md`.
- Neighbours: `/Users/abdul/code/concordia/docs/neighbours/hf-requests.md`.

Ranked by how much each would improve the games. "Confirmed" means read in the code or the game's own measurements. "Assumed" means not yet reproduced in HF.

| Rank | Request | Game | Generic? | Proposed API | Target |
|---|---|---|---|---|---|
| 1 | A resting roped partner keeps resting when tugged | Rope | Yes: any joint activity where one person's leaving should make the other reconsider | `Affordance.with?: { partnerId, leaving?: boolean }`, a `joint:with` term from closeness, and `decide(p, offers, { reconsider: true })` | 2.8.0 |
| 2 | A voice keeping or breaking its own promise | Rope and Neighbours | Yes | `noteVoicePromise(p, voiceId, { kept, at, action, promisedAt? })` | 2.8.0 |
| 3 | Seed a voice after creation | Neighbours | Yes | `seedVoice(p, voiceId, trust)`, or `adoptVoiceTrust(p, voiceId, trust, 1, { seeded: true })` | 2.8.0 |
| 4 | The same deferral sentence repeats across people | Rope (findings) | Yes: narration variety | Per-person phrasing variants in `narrate/`, chosen deterministically from person and minute, never from the RNG stream | 2.9.0 |
| 5 | Prospection of one's own future body | Rope | Yes | Done: 2.5.0 `followedBy` and `bodyForecast`; 2.6.0 fatigue store. Close the request | Done |

## 1. A resting partner ignores the tug (rank 1)

**Observed (confirmed in Rope's findings):** rope pairs split in all 12 careful runs, at about 08:00 on the glacier. One partner rests. A tug makes them decide again, but they keep resting, and the other unties and goes on.

**Cause (assumed, not reproduced):**
- `will/` adds an inertia bonus to the running activity: up to `switchMargin` 0.15, with half of it kept even near the activity's end (will.ts, selection).
- With the 2.6.0 fatigue store, resting now also relieves more felt fatigue.
- Rope's own belonging term (±0.3) apparently does not outweigh rest plus inertia.

**Generic shape:** a joint activity, where one person's going should make the other weigh going with them.
- `Affordance.with` names the partner. A `joint:with` term from relationship closeness favours the option the partner is taking.
- `reconsider: true` drops the inertia bonus for a decision the host forces because something changed, such as a tug or a call. The person reconsiders on the merits instead of defending what they are already doing.

**Before building:** reproduce on a Rope seed and confirm which term holds the rest.

## 2. A voice's own promise (rank 2)

**Gap (confirmed):** `learnFromVoice` only learns from the outcome of a suggestion the person followed. Whether a voice did what it said it would is different evidence.
- Neighbours approximates it with a felt ±0.6, and loses the case where the request was only deferred.
- The Rope uses a host-chosen `adoptVoiceTrust` step.

**API:** `noteVoicePromise(p, voiceId, { kept, at, action })`.
- It moves `VoiceRelation.trust` by a bounded step. A broken promise moves trust more than a kept one: an engineering default, to be sourced from trust research in `research/`.
- It records the event in the voice's history.
- It needs no prior resolution.

## 3. Seed a voice after creation (rank 3)

**Gap (confirmed):** no public call sets an authored starting trust, marked `seeded`, for a person who already exists.

**API:** `seedVoice(p, voiceId, trust)`. It is a no-op if the voice already exists, unless `{ replace: true }` is passed.

## 4. Deferral template repetition (rank 4)

**Gap (confirmed):** one sentence appeared 22 times in 24 Rope runs. Rope now phrases the answer per person in the host.

**Proposal:** HF offers a small set of variants, keyed by a hash of the person and the minute, so replay stays exact.

## 5. Future bodily state (done)

Shipped in 2.5.0 and 2.6.0. The Rope has opted into the fatigue store and retuned its leg efforts.

## The Rope, owner Kestrel playtest (2026-10-19)

Source: docs/playtests/owner-2026-10-19.md in the rope repo (export seed 334144833). Both items are confirmed from the export, causes unconfirmed.

1. **Idle drink and relieve loop at full hydration.** One person, with nothing asked of them, alternated `drink` and `relieve` every four minutes for hours at hydration 0.98 to 1.00 (about 90 drinks in a day). Proposal: saturate the drink value as hydration nears full, and gate `relieve` on a bladder state, so idle choice falls through to rest or wait.
2. **Deferral sentence about the current path.** Three minutes into a climb a person answered five asks with "Not till I go down the tarn path. I'll still have enough for the descent", where the goal's target is the leg they are already on. Proposal: use "turn back" wording when the target is the current leg, and make the reason for an early goal inspectable.

## The Pass, owner playtest (2026-10-19)

Source: `/Users/abdul/code/pass/docs/playtests/owner-2026-10-19.md` and `docs/hf-requests.md` in that repo. Items 1 and 2 are confirmed headlessly on the live build (HF 2.7.0). The proposed causes are read from the decision terms and not reproduced inside HF.

1. **A deferral names the counter-offer, not what decided it (owner-reported).** The owner wrote: "someone is taking a break and they wouldn't accept a task, but they accept other tasks, after which they accept the original task anyway, like a workaround." Seed 1, Monday 19:24: a cook one minute into a self-chosen break defers the grill ("Not now. After I take ten out back."): grill 0.093, including `forecast:body` -0.149, against the break's 0.029 plus inertia. He assents to the cold side (0.224, no forecast cost). Two minutes later, from the cold side (a voice-chosen activity), he assents to the grill (0.105). Every verdict follows the will's rules, but the sentence implies the break blocks everything. Proposal: `SuggestionResolution.decidedBy?: { kind: 'inertia' | 'term'; source?: string; margin: number }`, the gap the suggestion failed to close and the largest term separating the suggested option from the winner. `voiceLine` could then say "not the grill, not straight off my break" instead of "after X". Generic: any running activity that protects against heavy asks but not light ones. Target 2.8.0 (the coordinator's call). The Pass phrases this in the host meanwhile.
2. **`promptingLine` lens vocabulary is not caption-ready.** "The self pulled; held back." was shown to players three times in one night and read as jargon. Proposal: an optional third-person, plain-language variant (`promptingLine(..., { person: 'third', name })`), e.g. "Rafi looked at the jar, then back at the sink." The Pass composes its own meanwhile.
3. **`diffChronicle` and `narrateChronicle` derive verbs from action ids that are nouns.** The output reads "They colded every day." and "By the end I dished without being told." `ChronicleNarrationOptions.lexicon` exists, but the fallback could at least avoid inflecting non-verbs (e.g. "did cold every day"). Low priority.
4. **A personal rule without a norm cannot be a will-not.** `abstentionVeto` needs a linked obligatory norm, so a self-rule such as "I don't wash plates during the rush" can only add a commitment term. The answer is then "not now" or "rather", never "no, that's my rule". Proposal: an opt-in `Commitment.firm?: true` on a self abstention, giving `refused/willNot` with reason `rule:<label>` that insisting cannot override. Engineering default off.
5. **A voice granting or refusing the person's own request.** When a cook asks the chef for something ("can I ring my mother?") and the chef says yes or no, there is no HF event for it. Hosts use `adoptVoiceTrust` with an invented rate. This is the mirror of rank 2 (`noteVoicePromise`): `noteRequestAnswered(p, voiceId, { granted, importance, at })`.
6. **A duty held by a group.** "Somebody stays on the line" is met if any one member keeps it. HF commitments are per person, so The Pass enforces it as a host rule (a cook will not leave the line when no one else is on it). Proposal, deferred: a shared commitment that releases each member's instance while another member is keeping it.

## The Glance (2026-10-19)

Source: `/Users/abdul/code/glance/docs/hf-requests.md` (HF 2.7.0). A night-desk game: dam keepers report gauge figures through their own fatigue. Each item has a host workaround.

1. **Forecast thresholds are not host-tunable** (confirmed by reading `prospection/forecast.js`). `comfortAt 0.8` and `spentAt 0.97` sit above where night keepers live (sleepiness 0.6 to 0.85 in the trough), so the forecast is silent and then "spent". Proposal: optional `{ comfortAt, spentAt }` per person or per call, defaults unchanged.
2. **No involuntary sleep onset** (confirmed: no faculty). HF sleeps only by decision. Proposal: an opt-in doze hazard from true sleepiness, posture and stimulation, from the person's seeded RNG, ended by a salient percept. The Glance rolls it in the host.
3. **No faculty for reading a quantity** (confirmed: no API). Proposal: `estimate(p, { truth, difficulty })` returning `{ value, confidence }`: error from true body state, confidence from perceived state, bias left to the host. The Glance's version is engineering assumptions in `src/sim/reading.ts`.
4. **Generic assent words repeat** ("Aye." 57 times in three measured weeks). Same as the Rope's rank 4. The Glance keys per-keeper pools by seed and minute.

## Outcome, HF 2.8.0 (2026-10-19)

Released as HF 2.8.0 / engine 2.8.0 ([CHANGELOG](../CHANGELOG.md), [framework.md](framework.md#game-requests-going-along-fullness-a-voices-word-280)). Deferred items have targets in [roadmap.md](roadmap.md) §3b.

| Item | Outcome | Reason |
|---|---|---|
| Rope rank 1, resting partner | Done, with a changed API: `Affordance.alongside` and `reconsider: true` | `Affordance.with` already exists as `PersonId[]` ("other people taking part"); the requested `{ partnerId, leaving }` shape would break 2.x. `leaving` was dropped: the host names who is going on the offer that goes. Reproduced: `reconsider` alone suffices once the partner's move is visible; see findings for the possible host-ordering cause |
| Rank 2, `noteVoicePromise` | Done | `promisedAt` not taken: no sourced effect for promise age |
| Rank 3, `seedVoice` | Done | |
| Rank 4, deferral template repetition | Deferred, engine 2.9 | Moves narration fixtures in every game; batched with the other narration items |
| Rope Kestrel 1, drink/relieve loop | Done as opt-in fullness | No bladder in HF (inventory Missing); Rope uses `relief` for the toilet, which HF reads as pain relief. Rope should enable `fullness` and stop advertising `relief` for stepping aside |
| Rope Kestrel 2, "Not till I go down the tarn path" | Rejected as an HF change | Reproduced: the host-adopted goal `g1` chose the descent (`res.reason` and the record terms already show it). The sentence is Rope's template; Rope can say "turn back" when the counter-offer reverses the running leg |
| Neighbours 4, residents repair once | Deferred, review 2026-11-01 | Not a request in its own doc and not reproduced; the town finishes all twelve hall repairs by day 2, so the work may simply run out |
| Pass 1, why a suggestion failed (`decidedBy`) | Deferred, engine 2.9 | Generic and wanted, but it adds a field to recorded resolutions and needs voice-line design |
| Pass 2, third-person `promptingLine` | Deferred, engine 2.9 | Narration batch |
| Pass 3, chronicle verbs from nouns | Deferred, engine 2.9 | Narration batch |
| Pass 4, a firm self-rule | Deferred, engine 2.9 | A new will veto; needs its own control |
| Pass 5, `noteRequestAnswered` | Deferred, engine 2.9 | Needs a sourced effect size before an API |
| Pass 6, a duty held by a group | Unscheduled, review 2026-11-15 | Proposed as deferred by The Pass |
| Glance 1, forecast thresholds | Done: `Affordance.forecastAt` | Per offer, defaults unchanged |
| Glance 2, involuntary sleep onset | Deferred, engine 2.10 | New faculty |
| Glance 3, reading a quantity | Deferred, engine 2.10 | New faculty |
| Glance 4, assent repetition | Deferred, engine 2.9 | Same as rank 4 |

## Outcome, HF 2.9.0 (2026-10-19)

Framework part of HF 2.9.0 / engine 2.9.0 ([CHANGELOG](../CHANGELOG.md), [framework.md](framework.md#game-requests-several-commitments-cued-responses-a-resolves-name-290)). The Valley's requests are not triaged here; they are targeted in [roadmap.md](roadmap.md) §3b. The items the 2.8.0 table deferred to engine 2.9 (narration batch, Pass 1, 4, 5) are not in 2.9.0 and move to engine 2.10.

| Item | Outcome | Reason |
|---|---|---|
| Voices 1, several commitments by one act | Done: with two or more listed in `fulfills`, every eligible listed one is kept | With one listed, the earliest-ending rule stays (exact for every current host); an act listing several keeps exactly those, no implicit match besides |
| Voices 2, one response serves every prompt | Done: `PromptingResponse.cue` | Fallback is the most practised *uncued* response, not the global best: the global best would still let the alarm phrase serve gossip |
| Voices 3, noun-phrase review labels | Documented (`Commitment.label`, review SCOPE) | `reviewLabel` would thread through commitment, chronicle note, resolve and record for a wording need; deferred, review 2026-11-15 |
| Voices 4, goals never weigh against a temptation | Documented as intended (`agendaTerms`) | A goal is an attractor; opposition comes from a held norm, an abstention or a commitment |
| Voices 5, host-set practice half-life | Done: `enablePromptings({ practiceHalfLifeDays })` | Per person, not per response: the need is the host's time scale, and no source gives phrases different decay |
| Pass 8, a resolve term that names its resolve | Done: `Term.ref` on `review:resolve` | A `review:resolve:<key>` source would break hosts that match the source exactly; `ref` is set only when one resolve weighed in |
| Pass note, unlived days count as lapses | Documented (review SCOPE) | Host behaviour, as The Pass found |

## The Pass, polish round (2026-10-19, against HF 2.8.0)

Filed by The Pass after four source-unread playtests and the HF-character playtester. None blocks the game; the workaround is in the game.

- **Pass 8, a resolve term that names its resolve.** `reviewTerms` returns one `review:resolve` term with no key, so a host cannot say which resolve weighed in a choice ("Rafi turned from the jar, as he said he would"). Proposal: carry the resolve key on the term (`review:resolve:<key>` or a `ref` field). Workaround: the host infers it from the chosen act and `p.review.resolves`.
- **Note, not a request: days a host does not live count as lapses.** On days without service the game did not live Selim's evening, so the review counted a recurring maghrib commitment as missed, and his close line said so every week. This was the host's fault: it now lives the prayer on days off. It may still deserve a line in the review docs: a recurring commitment lapses on any day the host skips.

## The Valley (2026-10-19, against HF 2.8.0)

Filed by The Valley ([valley](https://github.com/adam0white/valley), `docs/hf-requests.md`), a valley of about 50 to 60 HF people in 14 households over three years, mixed full and routine living. None blocks the game; each workaround is in the game.

- **Valley 1, a voice's own acts move trust in that voice.** Voice trust moves only from followed-advice outcomes, insisting and commands. A steward's gift, a seizure, a visit or sending someone away from the door never reaches it. Workaround: `adoptVoiceTrust` with a hand-set target and rate per act (engineering assumption), plus a remembered percept.
- **Valley 2, material help between households as an HF act.** No HF act moves goods from one person's household to another's, so a neighbour feeding a hungry house is a host world rule (agreeableness-gated, seeded) and nobody remembers it.
- **Valley 3, recall summaries in the second person.** `recall` returns third-person summaries ("the kahya gave us 6 kile"); a game where a person speaks a memory back to its actor rewrites them by regex. Proposal: `voiceOf(episode, toActor)` or a stored addressee form. Batches with the engine 2.9 narration items.
- **Valley 4, `tellDeath` with listeners past the death.** In a mixed full and routine community some listeners have already lived past the death minute; `tellDeath` throws for them. Workaround: catch, and those people do not hear. Proposal: a tolerant mode that delivers at the listener's `now`.
- **Valley 5, a canonical form for saved persons.** `restore(snapshot(p))` reorders keys and drops an empty `family`, so a plain JSON fingerprint changes across a save. Workaround: sorted keys and a dropped empty `family` before hashing. Proposal: document the canonical form or export `fingerprint(person)`.
- **Valley 6, memory bounded per person.** About 90 to 100 KB of JSON per person after a month, of which memory is about 42 KB and is not bounded by `Retention`; a 60-person valley saves at several megabytes. Workaround: IndexedDB with gzip. Proposal: an episode bound in `Retention` (per actor, or by salience).

## The Two Voices (2026-10-19, against HF 2.8.0)

Source: `docs/hf-requests.md` in `adam0white/murmur`. Items 1, 2 and 5 were checked against the 2.8.0 dist. The game works around each one in the host.

- **Voices 1, one completion keeps one commitment, even with `fulfills`.** `onFinished` keeps only the earliest-ending match, even when `outcome.fulfills` lists several. A dinner should keep "my word to Aylin" and also the daily "my call to Mum"; the host stages a second five-minute act. Proposal: keep every commitment listed explicitly in `fulfills`, and apply the earliest-ending rule only to action matching.
- **Voices 2, one turning-away response serves every prompt.** `bestResponse` uses the most practised response whatever the cue, so a phrase learned at the alarm also turns her away from gossip. Proposal: an optional `cue` on `PromptingResponse` (action, tag or norm), preferred when it matches, with the global best as fallback.
- **Voices 3, `reviewLine` needs noun-phrase labels.** "I didn't keep calling Mum" reads badly, so labels are written as "my call to Mum". The Pass reported the same. Proposal: document this, or add an optional `reviewLabel`.
- **Voices 4, goals cannot weigh against a temptation.** Goal terms are never negative. Assumed intended; a line in docs/api.md would settle it.
- **Voices 5, host-set practice half-life.** The practice half-life is fixed at 60 days, and `enablePromptings` keeps existing practice. A one-week game has no public way to make a phrase fade, so the host scales `practice` nightly, writing into HF-owned state. Proposal: `practiceHalfLifeDays` in `enablePromptings`, or per response.
