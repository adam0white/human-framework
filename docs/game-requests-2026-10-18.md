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
