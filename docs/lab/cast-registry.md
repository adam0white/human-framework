# One cast: wave 1 registry

Updated 2026-10-23. Registry revision: `one-cast/1`.

This is the identity contract for the approved first wave. It supersedes the default counterpart advice in the [proposal](hf-universe-plan-2026-10-23.md) for these four people. Prefer one recurring person when age, era, place and role can be reconciled. A contradiction requires a deliberate new host edition with exact old saves, or a stated reason to keep two people distinct. It never licenses merging people by name alone.

The four entries below are authored decisions. The source receipts distinguish existing facts from new connecting fiction. Listing an allowed host means the design permits that encounter; it does not claim the encounter or transfer adapter is already implemented or live. The owner accepts the wave through play. Cross-device state serving and the Commons remain separate owner decisions.

## Identity and editions

| Person | Stable `castId` | `castRevision` | Source local id | Allowed wave-1 receiving role |
|---|---|---|---|---|
| Zeynep | `hf.cast.zeynep.pass` | `1` | Pass `zeynep` | Good Hands guest cook |
| Dilan | `hf.cast.dilan.murmur` | `1` | Murmur `dilan` | Hearsay delivery visitor |
| Derya | `hf.cast.derya.stairwell` | `1` | Stairwell `derya` | Hearsay nurse contact, reconciled with local `derya` in a new edition |
| Selin | `hf.cast.selin.voice` | `1` | Voice `selin` | Good Hands household enquiry |

The suffix records the original authority. It does not make the receiving appearance a different person. A cast revision is an immutable authored biography and admission contract. A transfer revision is an immutable player history. Changing a cast revision does not change an existing run. Host content/rules editions, adapter versions, mapping versions and HF engine versions have separate stamps.

Each player has a separate branch for each person. A branch has a random opaque id, an explicit parent revision and one active continuation head. Neither id contains the recording player id. The same player can know all four without joining their lives or memories. Two players' Deryas are separate fictional histories. A fresh authored appearance starts without imported lived history. A copied file or competing continuation creates an explicit fork; it never silently replaces or merges a head. A loaded game keeps its pinned admitted snapshot, even if the shelf advances elsewhere.

Use the [proposal's transfer allowlist and privacy rule](hf-universe-plan-2026-10-23.md#2-format-identity-branch-and-host-admission). Store the complete admitted Person, source stamps, mapping and omissions in the receiving replay. Preserve source saves unchanged. In this registry, “archive” means keep a field in the original source checkpoint and name its omission in the transfer report; it does not put unsupported state in the shelf payload. A known biography does not prove the player experienced an event. Do not import a successful outcome from an unplayed or failed source stint.

An existing save remains in its original edition. No automatic conversion of an old Hearsay Derya into the canonical Derya is allowed. Old Hearsay `1`/`2` and Good Hands `1`/`2`/`3` retain their constructors, schedules, dialogue, incident meaning, RNG path and replay results. New content requires a new explicit edition. Its exact numerical version is assigned by the host implementer. An edition stamp, not the latest registry lookup, selects behavior during replay.

## Zeynep: Pass → Good Hands → Pass

| Canonical fact | Authority |
|---|---|
| Female, 45 at the Pass opening; cold-station cook; twenty years in a school canteen | Pass `src/sim/cooks.ts`, `HIRES` and `makeHire` branch `zeynep` |
| Sons at home; she says she is home by ten; youngest may have a fever in a request | Pass `cooks.ts`, hire introduction and request; fever is request context, not a permanent diagnosis |
| Authored traits: honesty `.8`, conscientiousness `.85`, agreeableness `.7`; source initializes grill `.4`, cold `.7`, dish `.6`, oven `.65` | Pass `cooks.ts`, `makeHire`; a continuing branch carries its actual supported current values |
| Daily family promise to `sons`, `home`, 21:30–22:10, importance `.7`, every 1,440 minutes | Pass `cooks.ts`, `promise` |
| Theft held forbidden, conviction `.9`; review style accounting, 22:30 | Pass `cooks.ts`; source-backed norm definitions remain source-scoped unless explicitly compatible |
| Good Hands is an İzmir placement agency; its local Zeynep is the Taş daughter, sixteen, `tass-2` | Good Hands `src/sim/world.ts`, `FAMILIES`, Taş household; these are two distinct people |

**New connecting fiction.** Zeynep takes one daytime cold-supper preparation placement through Nermin after her released Pass stint. The guest remains based near her sons. This chapter uses Good Hands' İzmir setting; Pass has Bornova occupational references but does not thereby establish every character's home address. The new edition explicitly locates this guest stint within her local travel reach. It must not make her relocate away from the boys or work a late evening to explain the crossover.

**Mapping.** Keep `hf.cast.zeynep.pass` under a dedicated guest local id, never `tass-2` or an existing candidate. Map only Pass `cold` to a dedicated cold-food preparation trial with that same meaning. Preserve supported skill evidence and timestamps. Do not convert it to general `cooking`, childcare or a qualification. Carry one bounded, attended work-history fact with provenance. The placement asks HF for assent and uses the admitted skill in its ordinary work resolution. The source Chef and target Nermin are different voices with different relationship priors.

**Departure.** The Pass replay must record Chef releasing the recurring source shift chain. A completed shift alone does not release it. Establish a completed home instance and no running activity. Map the continuing sons promise exactly to the target leave-for-home action at the same local hours, importance and recurrence. Preserve the actual previous kept/broken result. Reject every other unsupported pending promise or active project. Arrival does not satisfy a promise.

**Omissions and return.** Keep grill/dish/oven skill records in the original source checkpoint and report their omission; they do not enter the shelf or grant target competence. Do not carry kitchen equipment, wages, orders, source action ids, habits or Chef trust into live placement state. After the trial, the new Good Hands chapter can release its guest duty and offer a return to a new Pass chapter. Preserve the family window on return. A new kitchen shift needs an authored offer and Zeynep's assent. Never replace a loaded kitchen week. Both crossings are zero-duration modeled chapter boundaries; no physiological recovery or completed travel is simulated.

## Dilan: Murmur → Hearsay → Murmur

| Canonical fact | Authority |
|---|---|
| Female, 33 at opening; delivery worker; Dilan is the only simulated HF person in Murmur | Murmur `src/sim/dilan.ts`, `makeDilan`; work and delivery episodes in `moments.ts` and `week2.ts` |
| Authored traits: honesty `.68`, conscientiousness `.48`, emotionality `.62`, extraversion `.45`, agreeableness `.6` | Murmur `dilan.ts`; source habits have seed-fixed jitter, so branch state is not reconstructed from these numbers |
| Aylin is her sister; Mum is their mother; Ece is her delivery colleague; Murat is her depot supervisor | Murmur `moments.ts` and `week2.ts`; these supporting people have no authored HF trait profile |
| Alarm and call-to-Mum promises recur within each five-day week; the Aylin dinner promise is dated; she starts an unfinished shelf goal | Murmur `dilan.ts`, `renewDailyPromises` and `makeDilan` |
| “you” and “pull” are source voices, not people in Hatice's garden | Murmur `dilan.ts` and `game.ts` |
| Hearsay already has courier Murat, cook Aylin and student Ece | Hearsay `src/sim/world.ts`, `PEOPLE`; none is identified as Dilan's source relation |

**New connecting fiction.** A new Hearsay edition places the tea garden on Dilan's delivery district in contemporary Turkey. Murmur does not establish that district's city. Author this location in the receiving chapter, without claiming it was an existing Murmur fact. Dilan delivers a parcel, stays for one ordinary exchange, and returns to her route. She does not replace Hearsay's courier Murat. Her visit does not make every resident know her family.

**Mapping.** Use a dedicated visitor id for `hf.cast.dilan.murmur`. Carry supported current traits/values and one attended delivery/work fact with provenance. There is no authored common delivery skill to invent: the initial encounter maps no skill. If the encounter uses a retained fact, its consequence must be explicit and replayable. Otherwise label it biography only. The player as Dilan's inner voice does not become Hatice. Keep voice trust separate.

**Constraints, omissions and return.** Departure must follow an authored route/shift boundary with no running action. Release or fulfill the source alarm, call and dinner instances; reject a remaining unsupported obligation. The shelf begins active and unfinished, so it cannot silently vanish: a source-side explicit project pause/release is required and archived, or travel stays unavailable. Do not mark it completed. Archive source snooze/phone/depot habit keys, promptings, rumination/review, source voices and world-specific beliefs. They are not transplanted into tea-garden actions. The encounter ends at a stated route boundary; a return resumes a new Murmur chapter with a deterministic calendar mapping and explicitly authored future calls/work. It does not replay the same week as if the visit never happened. Chapter boundaries have zero modeled travel duration and no invented route performance. Until both adapters support this round trip, return is descriptive history only, not a live import claim.

## Derya: Stairwell ↔ Hearsay, one nurse in a new edition

| Canonical fact | Authority |
|---|---|
| Female, 44; Derya Hanım; single; flat 5, floor 2, Lale Apartmanı, Istanbul; night nurse, sleeps in the mornings | Stairwell `src/sim/people.ts`, `RESIDENTS.derya`; Istanbul and building name in `README.md` |
| Authored traits: honesty `.7`, extraversion `.35`, agreeableness `.6`, emotionality `.5`, openness `.55`; backbiting held forbidden, conviction `.5` | Stairwell `people.ts`, `makeResident` branch `derya` |
| Volkan is her brother; he lost his job and visits late; she asks that the building not make a story of it | Stairwell `src/sim/game.ts`, Derya disclosure; do not reveal it in the target before the branch knows it |
| Existing Hearsay local `derya` is a nurse in household `7` / `home-7` with teacher Zeynep and carpenter Ali | Hearsay `world.ts`; co-residence does not specify parentage, marriage or siblinghood |
| Hearsay `1`/`2` initializes that actor at about 30, male by index, honesty `.55`, extraversion `.75`, conscientiousness `.6`, backbiting disliked | Hearsay `src/sim/game.ts`, `newGame`; these generic defaults still determine old replay behavior |
| Existing Hearsay day 4 places Derya at a 06:30 breakfast before her shift; one nurse greeting says her shift starts later | Hearsay `src/sim/incidents.ts`, day 4; `src/sim/voices.ts`, `derya.open` |

**Identity decision.** Merge the two nurse appearances under `hf.cast.derya.stairwell` in a deliberate new Hearsay edition. Stairwell supplies her age, sex, temperament, held backbiting understanding, night work, main home and brother. Hearsay supplies her existing nurse contact role, local social context and witnessed incidents. The old constructor and day schedule are incompatible with that life, so the edition changes them explicitly. Do not average the profiles or treat the conflict as a hidden transfer omission.

**New connecting fiction.** The new Hearsay district is within Istanbul travel reach of Lale Apartmanı. `home-7` becomes Derya's temporary local lodging during a short relief assignment; Zeynep and Ali remain its existing residents, without invented kinship. Her permanent flat remains flat 5. Keep her single status. A nurse may finish rounds and take a short breakfast before sleeping, but morning sleep must constrain her availability.

**Edition obligations.** New Hearsay uses the canonical female age-44 initial profile for fresh Derya, or the admitted current branch profile. It changes day 4 to breakfast after a night shift, keeps Elif's actual generous act, replaces the conflicting shift greeting, and gives Derya a night-work/morning-sleep schedule. It retains `derya` as the local id and records the cast mapping. Use the canonical backbiting understanding under an explicitly checked norm mapping, rather than silently replacing it with Hearsay's generic disliked stance. Target narrator labels and dialogue must describe that understanding accurately. Other residents keep their own authored identities and norm stances.

**Mapping.** A continuous import carries supported current traits/values and one attended source fact; only disclosure-supported facts may be told to Hatice. Nurse is an occupation, not an HF clinical skill or license established by these sources. Map no invented medical competence. Stairwell's kapıcı and Hearsay's Hatice are different people. Known source residents remain bounded passport references, not added target residents; no transfer of blanket trust or private visitor allegations.

**Omissions and return.** Archive stair notices, water/fund state, tea-money vote, source affordances and unreceived beliefs. Admit no unresolved duty, running activity, death conflict or unknown health incompatibility. A post-shift chapter boundary can lead to the relief assignment; arrival does not heal fatigue. The receiving host supplies a disclosed opening transient state without claiming off-screen recovery. At the assignment's end, Derya returns to flat 5 in a new Stairwell chapter with night-work and sleep intact. That requires a receiving adapter and a pinned new chapter; it never overwrites a saved building week. Old Hearsay Derya remains a legacy edition occurrence outside this travel branch. A legacy save cannot export into the canonical branch merely because its local id matches.

## Selin: Voice → Good Hands → Voice

| Canonical fact | Authority |
|---|---|
| Female, 32; Halil's daughter in the city; her own family is mentioned, with no named members; office skill `.6`; 09:00–18:00 job | HF `apps/site/src/voice/sim/town.ts`, `TOWN_DEFAULTS.selinEidCallFrom` comment, `townSpecs().selin`, and city affordances |
| Traits: conscientiousness `.7`, extraversion `.6`, agreeableness `.65`, honesty `.75`; values: benevolence `.8`, achievement `.6`, tradition `.4` | Voice `town.ts`, Selin spec |
| Halil is 61, a widowed repairman with chronic hypertension and a cigarette habit; Selin urges a doctor visit and rest | Voice `town.ts`, Halil spec, `townPeople`, seeded Selin beliefs |
| Nuran was Halil's wife of 35 years; she died fourteen weeks before Ramadan opening | Voice `town.ts`, Halil's relationship and `seedGrief`; do not invent a resurrection or a living care placement for her |
| Selin's calls and what she knows of the clinic depend on the played run | Voice `town.ts`, call resolution and clinic-slip perception; the passport must distinguish learned fact from seed biography |
| Good Hands has existing carer households and a different Halil, the Taş father/porter | Good Hands `world.ts`, `FAMILIES`; Selin does not replace any household, and her father is not `tass-1` |

**New connecting fiction.** Selin makes a telephone household enquiry to Nermin about practical help for her father in his Anatolian town. This is an enquiry, not an automatic placement, a relocation or proof that Nermin serves his address. The new chapter explicitly checks whether any suitable service reaches him. Voice does not name Selin's city. A telephone call avoids asserting an unestablished move to İzmir. Voice mentions her own family on Eid; it does not specify its members. Leave them unnamed and do not assign her an existing Good Hands spouse or children.

**Mapping.** Use a dedicated enquiry contact id for `hf.cast.selin.voice`. Carry supported current traits/values and one source-attended care/work fact; office skill is archived because the enquiry is not an office-work trial. Kinship to Halil is canonical background. Import only the actual clinic result or failed-call fact Selin received, not the narrator's omniscient health ledger. The target may author a new relationship to Nermin; Halil's voice trust remains a source relationship. A worried enquiry is not medical authority or a diagnosis.

**Constraints, omissions and return.** Place the call after work, with her active source duty ended and supported future obligations declared. Archive prayer/fast calendars, live call retry timers, source money and world-specific norms; do not transplant their clock semantics into agency duties. Reject unsupported pending promises or active projects rather than erase them. The enquiry may end without a placement. Its actual answer can return as a bounded fact in a new Voice chapter; it cannot change Halil's medical state, invent care visits, erase debt or force his consent. A return adapter must give Selin an ordinary chance to pass on only what was said. Until supported, the answer remains passport history and no live Voice change is claimed. Existing Voice saves retain their own edition and chronology.

## Distinct identities and later waves

| Apparent collision | Decision and reason |
|---|---|
| Pass Zeynep / Good Hands Taş Zeynep / Hearsay teacher Zeynep | Adult cook with sons, sixteen-year-old daughter, and teacher with separate household. Only the adult cook recurs in wave 1. No evidence supports joining these lives. |
| Canonical Derya / Good Hands İnce Derya | Nurse in Istanbul and architect mother of Arda and Eylül in Karşıyaka. Keep distinct; a new nurse contact never replaces `inces-0`. |
| Voice Selin / Hearsay Selin | Office worker and Halil's daughter versus student living with Fatma and Hasan. Hearsay is not an allowed Selin host in wave 1; reconciling it would require a separate authored decision. |
| Dilan's Aylin, Ece and depot Murat / Hearsay namesakes | Source sister, delivery colleague and supervisor versus cook, student and courier. No mass merger or inferred family tree. |
| Voice Halil / Good Hands Halil / Hearsay Halil | Repairman father, Taş porter and imam have different roles and relationships. A shared name does not join them. |

Wave 2 proposes only the separate period cluster: Warren Yusuf Usta → Valley as a visiting or remembered craft expert. Establish date order, place, survival and household continuity first; keep Valley Yusuf, Well Yusuf and Good Hands Yusuf distinct. Target: owner decision after wave-1 play, review by 2026-11-03. It is not authorized implementation.

The Rope, Small Works and Neighbours stay frozen. Watch Tamar / Rope Tamar requires an explicit unfreeze and a deliberate reconciliation of ages 54 / 52, setting and history before either canonical merger or counterpart design. No wave-1 adapter admits them. Cross-era travel, cloud sync, cross-device recovery, shared-world state and a marketplace are outside this registry.

## Source receipts and implementation boundary

Read-only source inspection on 2026-10-23:

| Repository | Source commit | Primary files used |
|---|---|---|
| Pass | `87f430210e83c4ce598ea8cc074e4b6eb0f9ed9a` | `src/sim/cooks.ts` |
| Murmur | `6500c7a5cef18f005759dab4d601c22e6a26c2c0` | `src/sim/dilan.ts`, `moments.ts`, `week2.ts` |
| Stairwell | `a2defd8641fe3947c1e3cbcff64c45d31144c5e4` | `README.md`, `src/sim/people.ts`, `game.ts` |
| Hearsay | `b8ec9e9550aefae36f760e2cff90f9bfdc08b9df` | `src/sim/world.ts`, `game.ts`, `incidents.ts`, `voices.ts` |
| Good Hands | `868aa9674878948bd31cf325390afb54d0b1799b` | `src/sim/world.ts`, `index.ts` |
| HF / Voice | `351679a70e1dcf6b64a7fc46401b94686b4bddae` | `apps/site/src/voice/sim/town.ts` |

This registry changes no game source, manifest, ledger or release. Each implementer must pin a content edition and an adapter map before admission. Keep fresh play available. Prove exact legacy replay, deterministic admitted replay, bounded omissions, stale-head forks, unsupported-obligation refusal and recording-reset privacy before claiming a working traveller. The [proposal](hf-universe-plan-2026-10-23.md) retains the technical controls; its old one-person probe limit and default counterpart recommendations are superseded by the approved wave-1 scope here.
