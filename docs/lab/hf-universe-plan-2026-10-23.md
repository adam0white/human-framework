# One cast across the HF lab — proposal, 2026-10-23

**What remains:** the owner chooses the first pair, the continuity rule and whether a later online Commons should proceed. This document proposes those decisions. It builds nothing and authorizes no new game infrastructure.

F-416 asks for attachment to HF personas across games, eventually a marketplace. F-417 asks for many recurring personas and synchronization for players who visit several experiments. The first result should be recognition followed by a consequential difference: someone the player knows arrives elsewhere with an experience the player helped cause.

The deliverable for this task is this source-backed plan, one independent Codex review, a signed commit, and green CI on the pushed commit. The owner accepts the design afterwards. The proposed probe has its own acceptance criteria below. No ledger or curated feed is changed; proposed routing is in `~/code/.lab-scratch/sweep/universe-ledger.md`.

## 1. Three steps, with separate meanings

| Step | Meaning | Recommendation |
|---|---|---|
| Recurring cast | An authored fictional person appears in several games; all players start with the same version | Start a small cast registry with explicit identities, ages and settings. Reusing a name alone establishes nothing. |
| Traveller | One player's branch of that person carries an approved part of their lived state into another game | Probe one transfer, in one browser or through an explicit file. Keep an unlinked fresh-game path. |
| Commons | Several players affect the same persistent people or place | Later owner decision on authority, abuse, infrastructure and the kind of shared fiction. |

A marketplace is a possible distribution layer after these work. It would need creator permission, persona licensing, moderation, provenance and a policy on edited or copied persons. It is outside this probe. Never sell an inferred profile of a real player.

The [HF roadmap's Horizon 3](../hf-roadmap-2026-10-20.md#horizon-3-long-bets) already proposes explicit semantic mappings and hand-moving one resident between games. [F-416/F-417](feedback-ledger.md) bring the design forward. F-416's routing says the owner chose a lift for a small private Commons probe; that does not settle its server design, public access or marketplace. This brief requests a plan and keeps the Commons as a later decision. The standing infrastructure lift remains lab telemetry Worker + R2 only.

## 2. Format: identity, branch and host admission

**A persona is fictional. A linked lab player id is a browser recording identity. They are different identifiers.** A stable cast id names the authored character. A random branch id names one player's continuity, with a parent revision for every transfer. Neither contains the lab player id, a real name, email or URL tracking parameter.

Proposed envelope, not an implemented API:

```text
format: hf-persona/1
castId: hf.cast.zeynep.pass
castRevision: immutable authored version
branchId: random opaque token
revision: hash of canonical transfer payload and parent revision
parentRevision: previous accepted revision, or absent at creation
source: game id, game build, HF engine, scenario/rules version
checkpoint: source Person schema, now, complete RNG state, checkpoint digest
transfer: approved portable fields, namespaced references and origin timestamps
admission: target game/build, adapter version, mapping version, target opening minute
limitations: fields omitted, facts archived, semantic conflicts, unsupported features
```

The receiver records the complete admitted initial Person and transfer payload in its replay header. A network service or the latest shelf revision is never required to replay. Source-game replay retains its original checkpoint, world seed and inputs; the transferred character is a declared projection, not byte-for-byte continuation of the source world. The original checkpoint stays in the source save/export. A cryptographic payload hash detects changes; HF's `fingerprint` is a useful state comparator, explicitly **not** an authentication mechanism.

HF already supplies plain JSON `Person`, `snapshot`, validating `restore` and supported `migrate` paths ([types](../../packages/human/src/types.ts), [restore](../../packages/human/src/restore.ts)). They do not merge persons, migrate worlds or translate a cook's world into a placement agency. The host adapter must do that. Put the envelope, registry and transport in a shared lab/host package if two hosts adopt it. Keep game mappings in each game repository. Add no game-specific ids or code to `packages/human`.

### Admission policy, by state slice

The first probe accepts a strict allowlist. An unsupported field stays in the source checkpoint and appears in the transfer report. It never becomes a silent default dressed as continuity.

| HF state | Carries between games | Receiver derives or rejects |
|---|---|---|
| `id`, `name`, `schema`, `engine` | Stable cast identity and immutable source stamps | Local Person id through an explicit cast-to-host map; `restore`/`migrate` must support the source engine. Never overwrite an existing unrelated actor. |
| `traits`, `values` | Exact current values, including supported slow changes | No random reroll to fit the target role. Fictional temperament is not a real-player diagnosis. |
| `life`, `family`, `bonds` | Identity facts, age and known kin/death facts as provenance | First probe uses the same modern period and a stated travel interval. Receiver checks age, sex, alive/dead status and family conflicts. A dead person cannot be revived by importing an older branch. Cross-era counterparts are a separate authored identity, not continuous travel. |
| `now`, `rng` | Source simulation minute and full RNG state | Deterministic clock mapping to the target opening. Preserve admitted person's RNG state; target world has its own seeded RNG. No time-based seeds and no random draw during mapping. |
| `skills`, `skillRetention` | Only skills with an agreed common meaning; exact supported level/evidence with mapped time fields | A source grill skill is not automatically household care. Target qualifications and permissions remain target facts. Unknown skill ids are archived. |
| `habits`, `methods`, `memory` | Only explicitly mapped action/context/place keys, approved episodes or gists, with provenance and timestamps | First probe maps one cooking skill and one attended work-history fact. It does not import all source beliefs or free-form logs. Expectations, sources, contradictions and evidence counters require explicit mappings or are excluded. |
| `social` | Ties and impressions only when the other cast identity also exists and the fiction supports the tie | Unknown people remain passport history, not phantom host residents. Voice trust is scoped to its source role: the same browser playing Chef and agency operator does not make them one fictional person. Target relationship/voice priors remain target-owned. |
| `conscience` | Held understandings only for identical, source-backed norm definitions with stable semantics | Target work duties are authored anew. Never translate a kitchen duty into a religious rule. First probe leaves norm catalog differences out of gameplay and reports them. Faith remains ordinary background, with no spiritual rank or acceptance score. |
| `body`, `needs`, `affect`, `ambient` | Stable health facts only after explicit compatibility checks; archive source condition | Target opening supplies transient hunger, sleep, surroundings and mood under one documented arrival policy. No off-screen simulated recovery is claimed. Injury/chronic illness conflicts block admission rather than silently heal. |
| `agenda`, `activity`, `pursuit`, `projects`, `will` | Durable finished history only where explicitly mapped | Finish the source stint before departure. Reject active promises or projects that would be erased. The first probe supports exactly one mapped recurring family promise, specified below. Recreate target duties, role goals, offers, equipment, schedule and money. Never import running affordance ids or unexplained switching bias. |
| `prospection`, `planning`, `curiosity`, `promptings`, `review`, `character` | Supported long-lived settings/evidence only after owning-slice compatibility is demonstrated | First probe does not copy world-dependent optional stores. Preserve source checkpoint; disclose omitted behaviour settings. Do not opt into a new faculty just because the target supports it. |
| `trace`, `chronicle`, `chronicleDay`, `chronicleYears`, `lexicon`, `retention`, decision timers | Approved bounded biography outside live decision state | Source trace stays source-side. Target opens a new chronicle and sets local scheduling, vocabulary and bounds. No invented memories of events not experienced. |

A source occurrence and a receiving occurrence may share temperament without qualifying as a continuous life. The interface must say which happened. The first version may show “Zeynep, after your kitchen week” and an ordinary factual line. It must not say “all her memories came with her.”

### Determinism and compatibility

Version the envelope, authored cast, admission adapter, mapping, engine and host rules independently. Refuse unsupported combinations before modifying a run. Retain the admitted snapshot and its parent revision, even when a later adapter is released. Keep the receiving world's seed and RNG separate from Person RNG. Use stable sorted mapping order and no wall clock inside the actor loop.

Map simulation timestamps by one declared offset `targetOpening - sourceDeparture`; apply it only to explicitly supported portable fields. Age comes from the declared travel interval and birth mapping. The source checkpoint remains untouched. The first probe has a fixed zero-duration chapter boundary: it makes no physiological or aging claim about travel. Test every transferred timestamp used by the retained skill, evidence and RNG path. Reject unmapped pending commitments instead of translating arbitrary recurring calendars. Zeynep’s family promise is the one explicit exception below.

For implementation, the required focused proof is: identical envelope + target seed + inputs gives identical admitted state and replay digest; supported save/restore roundtrip preserves it; different arrival ordering or later shelf changes do not alter an existing replay. A fresh game without import must retain its old replay hashes. A mapped and an unmapped skill must behave differently only where the mapping permits. None of these tests is run by this design-only task.

## 3. Sync using the existing lab

Confirmed source baseline: lab-client **0.2.0** and lab-kit **0.3.0** in this HF worktree. Publication is still deferred. The [linked protocol](linked-telemetry-2026-10-22.md) stores private events, runs, saves, logs and notes in R2. It reconstructs timelines with `lab:inbox`. Installing a client does not supply each game's export hooks or CSP changes. The 14 games' adoption must be checked individually when choosing implementers; this plan claims no live estate audit.

The [client bridge](../../packages/lab-client/src/identity.ts) uses a hidden `human.adamwhite.work/lab/identity/` frame and checked `postMessage` calls. The [static bridge](../../apps/site/src/lab/identity.ts) persists a random recording id and off preference in localStorage. Its current parent-origin rule accepts HTTPS `adamwhite.work` subdomains; it is broader than a finite two-game allowlist. The bridge does not carry Person state, authenticate users or expose private R2 reads.

### Smallest transport: a browser shelf

Extend the static bridge with a **separate opt-in persona channel** for the two probe origins. Do not send persona data in the existing identity messages. Provide a top-level central shelf screen to inspect, export and delete continuity. Proposed browser storage is IndexedDB on the central origin, with one transaction per revision acceptance. This is browser persistence, not a new server or database service.

```mermaid
sequenceDiagram
  participant A as Pass host
  participant S as Central browser shelf
  participant B as Good Hands host
  participant L as Existing lab Worker + R2
  A->>S: Explicit departure; bounded approved payload + parent revision
  S-->>A: Accepted immutable revision, or conflict
  B->>S: Explicit admission of selected persona
  S-->>B: Pinned payload and limitations
  B->>B: Deterministic host mapping; save initial Person in replay
  A-->>L: Existing linked run/log records, if recording enabled
  B-->>L: Existing linked run/log records, if recording enabled
```

Proposed limits: one persona per browser in the probe, at most 256 KiB per transfer payload, ten revisions and a 2 MiB total shelf budget. Refuse before mutation if a bound is exceeded; offer an explicit local file export. No raw full-run or source-world archive is placed in the shelf. Browser eviction remains possible; explain that the shelf is local and offer a file backup. File import uses the same validator and limits; it gives continuity without claiming automatic linkage.

Validate exact parent and frame windows, exact origin allowlists, schema, nesting, lengths and reference types. Only return the selected approved projection after a visible player choice; no broad “read all personas” message. Treat imported files and every game frame as untrusted. Render text as text. An allowed origin can read any data explicitly returned to it, so keep the payload minimal and never return other games' raw saves.

**One active continuation at a time.** A target admission records its pinned parent revision. Source and target games continue independently offline, but a departure can advance the shelf only if its expected parent matches the current head in one IndexedDB transaction. Duplicate revisions are idempotent. A competing departure becomes an explicit fork; it never wins by latest wall-clock timestamp. Do not merge temperament, deaths, memories or relationship trust. Existing loaded runs never change underneath the player. This is checkpoint sync at chapter boundaries, not live simulation sync.

Partitioned storage, denied frames or storage reset can split the shelf and recording identity. Show “local to this browser/game” when sharing cannot be established. Do not claim cross-device recovery, discover a person by name or reconnect an old id using fingerprints. An offline passport can be copied, so this is player-controlled fiction, not an authenticated competitive economy.

### Recording resets and continuity privacy

A durable persona branch, revision hash, source fact or repeated admitted snapshot can reconnect recording ids. Removing only the branch id does not make those uploads unlinkable. This proposal therefore requires a **fresh explicit historical-linkage choice** whenever a persisted/imported persona is used under a different recording identity: “Recording this continuing person can link this play to earlier recorded games. Record this continuing person?” Default to local continuity without recording that persona-derived run. The identity bridge alone supplies no such consent, and the character-analysis opt-in is still a different choice.

Keep a local recording-epoch association for the persona. If it is missing, reset, changed, or the file came from elsewhere, treat linkage consent as absent. Before that consent, suppress that run's automatic and explicit replay/save/log/note uploads and its persona-specific milestones, including normal `trackRun`, `captureSave` and Send routes; removing a few analytical fields is insufficient because full state can identify history. Ordinary play and local file export remain available. On refusal offer a fresh authored guest, with no imported history, for normally recorded play. General events may say only that the feature was declined, without persona/branch/source identifiers. Explain the lost measurement coverage in the funnel.

On consent, the player permits that historical linkage for this persona in the current recording epoch; the private analyst may then use its durable continuity keys. Recording off revokes it for future epochs and aborts pending uploads through existing controls. It does not erase received records. The focused implementation proof must cover off → new on → old persona/file import and verify that no snapshot, hash, source fact or log escapes before the new choice. Never claim anonymity or unlinkability for a continuing persona the player has chosen to record.

### Infrastructure boundary

The browser shelf needs no new server infrastructure. Continue to use the existing Worker + R2 only for private lab telemetry under the existing limits and retention. There is no client endpoint to fetch another player's uploaded Person. A browser id is public-to-its-client data and must never become an R2 read credential.

Authenticated cloud saves, cross-device sync, a public persona catalog, moderation, payments, realtime presence and a shared-world authority are **new owner decisions**, even if they could run inside the same Worker or bucket. Reusing an existing resource does not make game-state serving telemetry. Do not repurpose ingestion into a state server under the telemetry exception.

## 4. The first probe: Zeynep, kitchen to placement agency

**Recommendation:** The Pass → Good Hands, one optional modern cook, **Zeynep**, as a short cold-supper placement. Pass already offers her as an optional hire: age 45, cold station, twenty years in a school canteen, home by ten for her sons. Good Hands already models cook placements and consequences, which makes carried competence legible. Its current candidates keep their own identities; Zeynep gets one bounded guest placement rather than replacing Fatma or another candidate. Nermin remains the agency operator. Exact roles and trait definitions are in the census.

This is a recommended new encounter, not a claim that she already appears in Good Hands. A receiving placement would need one authored compatible household, hours that respect her existing family constraint, a shared skill mapping and a plausible same-period chapter boundary. If those cannot fit without rewriting either game, stop and bring that incompatibility to the owner. Do not widen the probe into a new game.

The first contract carries current traits/values, one explicitly mapped cooking skill and one factual work-history entry derived from attended source outcomes. Use Pass `cold` as cold-food preparation, with its existing level/evidence, in a dedicated Good Hands cold-supper trial that asks for that same skill. Do not convert it into Good Hands' general `cooking` competence or a childcare qualification. The receiving guest adapter owns this binding; all general-placement skill mappings remain deferred. It excludes a general transfer of all optional faculties. The initial fiction recognizes her canteen history. A completed kitchen stint adds one truthful line about the player's actual week; a failed or unplayed stint does not earn a fabricated success. The target's HF choice uses the admitted skill when resolving the bounded work trial. Her refusal of late hours comes from the mapped family commitment, not proof that a work memory affected HF. Prove the skill transfer in an ablation; do not sell a rewritten line as emergent continuity.

### Departure and the family promise

Pass `src/sim/cooks.ts` gives Zeynep a recurring promise to `sons`, action `home`, 21:30–22:10, importance 0.7, every 1,440 minutes. Waiting for all recurring promises to disappear would make her permanently ineligible. The probe therefore supports this one exact obligation: source departure follows a completed home instance with no running activity; the target chapter opens the next morning on its own calendar, with zero modeled travel duration. Preserve the previous instance's actual kept/broken history as provenance. Recreate the next due family instance with the same local hours, importance and daily recurrence, mapping `sons` to a non-simulated family reference and `home` to the target guest's leave-for-home action. Preserve its subsequent recurrence through ordinary HF agenda logic. Offer only a daytime cold-supper preparation stint; it must permit departure in time for this window. Do not mark the family promise kept merely by crossing a game boundary.

The adapter must distinguish a completed source work stint from this continuing family obligation. Every Pass hire also has a recurring shift commitment (`shiftRule` in `cooks.ts`). At the agreed end of this guest's employment, Chef explicitly releases the source shift chain through the existing agenda API; archive the release in the source replay. A completed shift occurrence alone does not terminate its chain. The target authors a new daytime placement duty. This job release must occur in the source fiction and replay before departure; the importer cannot invent it. All other unfulfilled work promises, live projects and unsupported obligations block departure with a plain explanation. If the source's completed home instance cannot be established, transfer stays unavailable and fresh play continues. This exception is bounded; it is not a general calendar translator.

### What the player notices

1. In The Pass, the player works with Zeynep and can choose to let this version travel after her stint, with unresolved obligations checked first. No universe explanation interrupts the first kitchen service.
2. On a later Good Hands visit, after the player has learned its ordinary loop, the agency receives Zeynep's introduction. Her name, prior work and family constraint let the player recognize her. If continuity is available, a short factual reference recalls that kitchen week. It reveals no hidden temperament numbers.
3. The player offers the bounded placement and sees her own assent or refusal and a later household account. The shared skill can affect that account under the ordinary HF resolution. Recognition should add attachment without making the agency encounter dependent on playing Pass.

An early-run visitor receives the ordinary agency content and can try the guest encounter later. No popup advertises a crossover before the second game's ordinary approach is familiar. Players may choose “fresh version” or decline import. A returning persona never displaces a saved target run.

### Measurement through linked telemetry

Use the existing `milestone`, `log`, replay and note channels, not a new event endpoint. Proposed milestones cover: source stint completed, departure offered, departure accepted, target eligible, encounter shown, import accepted/declined, placement attempted/completed. Milestones count once per session today; per-run detailed attempt data belongs in the replay. Add bounded structured probe metadata to the host replay export: probe/version, arm, source/target builds, shared/local/file identity scope, branch and parent revision references, admitted payload hash, source fact id, encounter outcome. It travels in the existing `run` data payload, not new envelope fields. Free-text logs are not the reliable source for exact join keys.

Join the private records by current linked browser player id, branch/revision and run id. Reconstruct complete exports before counting transfers. Record target eligibility and bridge failures so that “no encounter” is not mistaken for rejection. Deduplicate by probe + run + milestone; count one browser branch per arm, and separate local-file imports from linked same-browser transfers. Missing or expired chunks are missing evidence. Queueing an upload is not a receipt. DNT/GPC/off users remain playable and are excluded from linked denominators, never counted as uninterested.

For the first owner and small volunteer sessions, report a funnel: eligible source runs → completed stints → accepted departures → linked target visits → shown encounters → recognized arrivals → placement attempts → completed trials. Show counts and missing-data counts, not a universal engagement score. Two optional neutral questions follow the target encounter. The first asks who the player thinks they have met and why; the second asks whether the prior game changed their choice. Recognition and attachment need their words; telemetry alone cannot establish either. Do not require a survey to keep playing.

Before collecting sessions, freeze three replayable conditions: fresh guest without source history; same recurring Zeynep with biography only; imported Zeynep with the mapped skill and actual work fact. Use matched target seeds for the technical ablation. For human sessions, assign a condition once per eligible browser branch using a deterministic experiment seed, record it and hold it for that probe; do not treat repeat visits as independent participants. The tiny convenience sample is exploratory, not a causal estimate of retention. Report which condition the owner saw.

**Probe done means:** both games remain independently playable; one complete received linked source/target pair reconstructs and replays exactly; offline/file and blocked-bridge paths retain ordinary play; fresh legacy replays match; the imported skill ablation produces the declared difference under at least one preselected compatible trial; the recording-reset privacy gate passes; no unresolved promise/death conflict is admitted; and the owner plays both encounters and says whether recognizing her adds attachment. Record a no plainly. First feasibility and acceptance review: **2026-11-03**, if the owner approves implementation; this is a review date, not a release promise. The owner is the acceptance authority. Stop after this pair until that verdict.

## 5. Expand the cast, then decide the Commons

After the probe, nominate recurring people by compatible era, age, role and relationships. Use a registry entry with canonical facts, source authority, variant ids, game admissions and prohibited contradictions. Keep the corpus census distinct from that registry: cataloguing an existing person does not make every similarly named person the same individual. Start with several modern ordinary jobs across Pass, Stairwell, Hearsay and Good Hands. Do not force the older Watch, Valley, Warren and Well worlds into the modern chronology. Authored counterparts may share a recognizable temperament, with distinct identity ids and no claimed memory continuity.

Frozen Small Works, Neighbours and Rope remain frozen. A census recommendation does not authorize modifying them. A later slate should propose several repeat personas, not expand the transport contract across all 14 games at once. Review the slate with the probe verdict on 2026-11-03.

**The Commons is a separate shared online space.** Its smallest later proposal is an invite-only place for a few personas to meet, with one server authority and explicit arrival/departure rules. Even that needs an owner decision on hosting permission and operating cost, authentication and identity recovery, conflicting ownership, consent for one player's actions affecting another's person, deletion, moderation, cheating and who accepts the resulting artifact. The marketplace is another decision after that. No hidden off-screen marriage, death or changed memory should enter a Traveller branch from the Commons without a recorded, accepted event history.

## 6. Risks and controls

| Risk | Consequence | Control / open decision |
|---|---|---|
| Linked ids expose a cross-game routine | Pseudonymous records become identifying when combined with timestamps, notes or household use | Private access only, no ids in public aggregates or URLs, no real-world identity enrichment. Do not publish per-player crossover graphs. A shared browser is not one consenting person. |
| Fictional persona mistaken for a player model | Automatic play recording becomes covert personality inference | Persona continuity is explicit fiction. Character analysis retains its separate opt-in; inferred player traits, if ever used, remain visible/editable under the approved exception. No inference in this probe. |
| Shelf and recording preference confused | Turning recording off unexpectedly deletes gameplay, or continuity becomes tracking | Separate controls and stores. Existing off removes the recording id/queue and stops uploads; it does not delete received R2 objects. Persona continuity can remain local/offline with recording off. Offer a separate “erase continuity” action and file warning. Reusing and uploading a continuing persona can reconnect recording identities. Require the fresh linkage choice above; default to local continuity without persona-run uploads. |
| Broad origin trust | Another subdomain can request data | Current identity bridge's broad subdomain rule is a known baseline, not sufficient permission for personas. New persona channel uses exact probe origins, selected projection only, source-window checks and bounded validation. |
| Copies, edits and rollback | Two histories contradict each other, or a dead person reappears | Hashes show content changes but cannot authenticate authors. Reject stale head advancement, expose forks, keep histories distinct. No competitive or commercial value attached. |
| Schema and semantic drift | Valid JSON creates wrong memories or impossible skills | Pin adapters and schemas, reject unsupported engines, test explicit maps, disclose exclusions. `restore` validates shape, not fictional meaning. |
| Seed or timestamp leaks into live decisions | Runs stop reproducing | Store Person RNG, target world RNG, complete admitted initial state and mapping version. No asynchronous shelf refresh inside the loop. |
| Crossover damages a game | Recognition becomes exposition or a compulsory errand | Delay the encounter until the target loop is understood, offer fresh play, keep one ordinary placement. Player words outrank an adoption metric. |
| Retention and deletion misunderstood | Private records outlive the player's expectation | Existing R2 retention is 180 days; off is not deletion; local inbox copies need a separate cleanup. Shelf is browser data with explicit erase/export, no durability guarantee. Do not promise a lifetime passport backed by expiring telemetry. |
| Small biased sample and incomplete delivery | A funnel is misreported as attachment or retention | Publish counts, exclusions and missingness privately; require owner play and optional recognition words. Record negative results. |
| Scope expands into infrastructure | Telemetry permission is used for a game-state service | Browser-only first probe. Cloud state serving and Commons require explicit owner decisions, even on the existing Worker/R2. |

## 7. Character census: source inventory

The in-site source snapshot is HF `46891f1412929a4cefe284613ccacf307b0ea649`, the isolated worktree base. External repository snapshots appear with their groups below; dirty tracker/browser artifacts were read-only and were not used as character authority.

Census follows the 14 entries in [`apps/site/src/games.ts`](../../apps/site/src/games.ts). Island is a faculty control outside that catalogue. A **named character** includes runtime HF people and named story-only people. An unnamed role is recorded where it helps avoid inventing a name. Test fixtures, reviewer personas and examples outside the games are excluded. Generated casts are infinite across seeds/years, so the census distinguishes fixed authored entries, full finite name pools/rules, and a reproducible default-seed population. A default seed is an inventory example, not a claim that every player sees the same generated people.

Temperament means authored HF traits or explicit authored descriptions; it is not inferred from a name or role. Numeric shorthand below uses the source's field names/order. “Default” means no character-specific trait override, not a psychological finding. Recurrence flags are proposals: **modern** compatible modern crossover candidate; **period** compatible within a separate older-setting cluster; **counterpart** distinct identity if reused across incompatible periods; **hold** weak first choice or frozen host. Same-name collisions remain separate until deliberately resolved.


### Source receipts

| Repository | HEAD | Working tree |
|---|---|---|
| pass | 87f430210e83c4ce598ea8cc074e4b6eb0f9ed9a | clean |
| glance | d9ebb9de3955389087e882130d34ad637c179a54 | clean |
| murmur | 6500c7a5cef18f005759dab4d601c22e6a26c2c0 | clean |
| rope | 87c384dd8cc00f44572fe8ccb4bd4ff60db2c66f | clean |
| repair-game | f749f04b06df92cebb0e181a080e526b34cb0376 | clean |
| goodhands | 868aa9674878948bd31cf325390afb54d0b1799b | clean |
| hearsay | b8ec9e9550aefae36f760e2cff90f9bfdc08b9df | ?? .playwright-mcp/ |

All paths below are relative to the named repository. Scanned runtime src trees, actor constructors, scenario data, dialogue/background references, and legacy variants. No installs, builds or source changes were needed for this census.

### Pass

Sources: `src/sim/cooks.ts` (all HF actors); `src/sim/campaign.ts` (four weeks, regulars, parties); `src/sim/lines.ts`, `src/sim/kitchen.ts`, `src/ui/app.ts` (narrative). All supported editions use these constructors; `pass@10`/`pass@11` add firm rule/suggestion reasons, not a different cast. Hires are authored templates, not generated-name pools.

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Selim | HF; 56, founder, grill | honesty: 0.85, conscientiousness: 0.8, agreeableness: 0.4 | High: veteran grill cook; continuity depends on kitchen duties |
| Dilek | HF; 34, founder, cold | honesty: 0.7, conscientiousness: 0.55, extraversion: 0.6, emotionality: 0.65 | High: cold-station cook |
| Rafi | HF; 19, founder, dish; skims jar | honesty: 0.55, conscientiousness: 0.45, agreeableness: 0.65 | High: junior worker; preserve jar history |
| Murat | HF hire; 27, grill; döner work Bornova | honesty: 0.45, conscientiousness: 0.35, extraversion: 0.8, agreeableness: 0.55 | High: cook; other games’ Murats are unlinked names |
| Zeynep | HF hire; 45, cold; school canteen; sons | honesty: 0.8, conscientiousness: 0.85, agreeableness: 0.7 | High: household cook visiting/reference slot; preserve home deadline |
| Can | HF hire; 17, dish; Rafi’s cousin | honesty: 0.6, conscientiousness: 0.4, agreeableness: 0.75, emotionality: 0.6 | Medium: junior help; preserve cousin relation |
| Hülya | HF hire; 38, oven; former Antalya hotel cook | honesty: 0.8, conscientiousness: 0.75, agreeableness: 0.3, extraversion: 0.4 | High: reference or oven work; preserve distrust of chefs |
| Chef | HF player observer; 31 female | No trait overrides | Low: role label, player identity |
| Nevin | Narrative-only; deceased lokanta owner | Liked noise; did not pressure pensioner before payday (narrative, not HF traits) | High as remembered person; cannot recur alive in same timeline |
| Ahmet | Narrative-only; butcher, bill collector | Not defined | High local supplier |
| Hasan Bey | Host-side regular; pensioner, tab | Not defined | High local customer |
| Mrs Arslan | Host-side regular; ledger names her Gül Arslan; grandson | Not defined | High; Gül Arslan is an alias, not a second person |
| the Aksoy sisters | Host-side collective regular; reading group | Argue about börek; leave loudly (authored narrative) | High collective, individual given names absent |
| Kemal | Host-side regular; taxi driver | Not defined | High local driver; not proven identical to other Kemals |
| Ilyas | Host-side regular; night watchman at depot | Not defined | High; exact spelling Ilyas in source |
| the Demirs | Narrative-only party family | Not defined | Medium family cameo |
| Yıldız | Narrative-only wedding-family surname | Not defined | Low until individual identity authored |
| the food writer | Narrative-only party host; unnamed | Not defined | Role only, not a proper named character |

Also present but unnamed: Hasan’s brother; Mrs Arslan’s grandson and his two school friends, his father; the Aksoy reading group; Kemal’s wife and three drivers; Ilyas’s retiring foreman and night shift; Zeynep’s sons, Rafi’s sister, mothers/neighbor in requests, bank and döner-chain representatives. These do not add named identities.

### Glance

Sources: `src/sim/keepers.ts`; all five night plans and background dialogue in `src/sim/dam.ts`; display spelling in `src/ui/app.ts`. Monday/Tuesday Dai only; Wednesday onward Dai and Callum. Nerys becomes reachable Tuesday onward.

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Dai | HF; 63, dam keeper; 31 years here; called Mr Pugh by Callum | honesty: 0.7, emotionality: 0.3, extraversion: 0.35, agreeableness: 0.35, conscientiousness: 0.75, | High local veteran; Mr Pugh is same keeper context, not extra actor |
| Callum | HF; 24, agency keeper, second week; baby at home | honesty: 0.8, emotionality: 0.8, extraversion: 0.55, agreeableness: 0.85, conscientiousness: 0.8, | High work/family continuity |
| Nerys | Host-side observer at Bridge Inn; goodwill and report delays, no HF Person | Not defined | High innkeeper / river witness |
| Morgan | Narrative-only; previous desk engineer, twelve years | Rang at one for level (explicit habit in dialogue) | Medium: predecessor history |
| engineer / you | Player voice id only; no named HF actor | Not defined | Role only |

Unnamed baby, radio/Met Office speakers are not additional named people. `Mr Pugh` refers to Dai in Callum dialogue; source never supplies the full name “Dai Pugh”.

### Murmur / Two Voices

Sources: `src/sim/dilan.ts`, `src/sim/moments.ts` (first week), `src/sim/week2.ts` (second week), `src/sim/game.ts`, `src/ui/reply.ts`. First-week and second-week branches reuse the same cast. Dilan is the only HF Person. “you” and “pull” are voices, not additional HF people.

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Dilan | HF; 33 female delivery worker | honesty: 0.68, conscientiousness: 0.48, emotionality: 0.62, extraversion: 0.45, agreeableness: 0.6, | High as courier; preserve family/work threads |
| Aylin | Narrative-only; Dilan’s sister; birthday dinner, shelf help | Not defined | High local/family cameo |
| Mum | Narrative-only; Dilan and Aylin’s mother | Not defined | Medium; relational label, given name absent |
| Ece | Narrative-only; delivery colleague; columns/routes/scanner | Not defined | High courier colleague |
| Murat | Narrative-only; depot supervisor; writes lateness/keeps bowling score in pen | Not defined | High workplace cameo; not proven Pass Murat |

### The Rope

Sources: `src/sim/party.ts`; three mountains and Ezra story in `src/sim/mountain.ts`; season continuity in `src/sim/season.ts`; `src/sim/camp.ts`. Hollin Crag, The Tooth, Kestrel Pike use the same five actors, carried through the season. No generated names.

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Tamar | HF; 52, experienced climber, Nell’s mentor | conscientiousness: 0.85, emotionality: 0.4, agreeableness: 0.6, openness: 0.5, honesty: 0.8, | High experienced outdoor person |
| Oskar | HF; 34, summit-driven; Wren’s rival | conscientiousness: 0.45, emotionality: 0.2, agreeableness: 0.4, extraversion: 0.75 | High; preserve rivalry |
| Nell | HF; 23, novice, Tamar’s student | emotionality: 0.8, openness: 0.8, agreeableness: 0.7, conscientiousness: 0.5 | High learning continuity |
| Bilal | HF; 41, climber, carries stove and tea | agreeableness: 0.85, conscientiousness: 0.7, emotionality: 0.5, honesty: 0.85 | High outdoor/helper cameo |
| Wren | HF; 29, climber; came because Oskar said she would not | agreeableness: 0.25, extraversion: 0.3, openness: 0.7, conscientiousness: 0.55, emotionality: 0.35, | High; preserve autonomy/rivalry |
| Ezra | Narrative-only; absent former companion; map, chair, mug, turned back on Kestrel | Liked cheap tea (narrative); traits undefined | High as remembered person; present-day status needs confirmation |
| Mum | Lexicon-only `nell-mother`; Nell’s mother | Not defined | Low until independently named |
| you | Player leader voice; not HF Person | Not defined | Role only |

### Small Works (repair-game)

Sources: `src/game/people.ts` constructs the complete cast; `src/game/engine.ts`, `src/game/community.ts`, `src/game/responsibility.ts` use these actors across jobs, workshop and community activities. Engine-5 adds fatigue/fullness to these same people; no separate legacy cast found. No authored trait overrides; values below are values, not temperament scores.

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Sam | HF; 18 male apprentice / learner | Traits unspecified; values achievement .8, stimulation .7 | High repair apprentice |
| Mum | HF; 43 female customer/family | Traits unspecified; values benevolence .9, security .8 | Medium; identity relational |
| Nora | HF; 28 female neighbor/customer, own designs | Traits unspecified; values selfDirection .9, stimulation .8 | High maker/designer |
| Evan | HF; 36 male neighbor/customer; children | Traits unspecified; values conformity .8, security .9 | High local customer |

Unnamed Sam’s sister, Evan’s children, bike club/family/event participants do not add named people. Player is an external voice, not a named actor.

### Good Hands

Sources: `src/sim/world.ts`; byte-identical `src/sim/v1/world.ts` and `src/sim/v2/world.ts` preserve the same cast for runtime versions 1, 2 and 3. `src/sim/index.ts` explicitly routes legacy states to v1/v2. Dialogue, references and arrangements in each version do not add separate named actor constructors. All listed candidates, household members, referees and Nermin are HF actors, not merely cards.

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Nermin | HF; 45 female agency operator | honesty .75, agreeableness .65, conscientiousness .75, extraversion .6, emotionality .5, openness .65 | High central connector; distinct from Hearsay tailor unless explicitly reconciled |

#### Candidates (all versions)

Every candidate’s private traits are seeded and can exchange within outward-presentation bands; therefore names are not permanent fixed personality labels. Seed 1 keeps the authored donor identity. Other seeds use a nonzero cyclic donor offset within the same presentation band. For donor d, V(k)=.22+.72*draw(1,`${d.id}:${k}`). honesty=V(honesty), except Gül donor .16; conscientiousness=V(conscientiousness), except Pınar donor .2; agreeableness=V(agreeableness), except Sevda donor .94; emotionality=V(emotionality); openness=V(openness). Extraversion is .18+.19*draw(seed,`${id}:reserve`) for reserved, .72+.22*draw(seed,`${id}:chat`) for chatty, else V(extraversion). These are authored formulas, not measured constants. Presentation is public style, not reliable evidence of private traits.

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Gül | HF candidate; 38; nanny, housekeeper; Buca | chatty presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Sevda | HF candidate; 32; nanny, carer; Bornova | reserved presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Pınar | HF candidate; 29; nanny, housekeeper; Karşıyaka | polished presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Fatma | HF candidate; 51; cook, housekeeper; Alsancak | plain presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Cem | HF candidate; 43; driver; Bornova | chatty presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Ayla | HF candidate; 46; carer; Buca | reserved presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Emine | HF candidate; 57; cook; Göztepe | chatty presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Murat | HF candidate; 35; driver, carer; Buca | plain presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Dilek | HF candidate; 26; nanny; Bornova | polished presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Hatice | HF candidate; 48; housekeeper, cook; Buca | reserved presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Selim | HF candidate; 54; driver; Alsancak | polished presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Zehra | HF candidate; 40; carer, housekeeper; Göztepe | chatty presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Leyla | HF candidate; 34; nanny, cook; Karşıyaka | plain presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Osman | HF candidate; 60; carer; Alsancak | reserved presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Esra | HF candidate; 31; housekeeper; Bornova | polished presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Safiye | HF candidate; 53; cook, carer; Buca | plain presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Burak | HF candidate; 28; driver; Göztepe | chatty presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Meltem | HF candidate; 44; nanny; Karşıyaka | reserved presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Huriye | HF candidate; 58; housekeeper, cook; Bornova | chatty presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Yusuf | HF candidate; 47; carer, driver; Göztepe | plain presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Aysun | HF candidate; 36; nanny; Buca | polished presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Nurten | HF candidate; 50; cook; Alsancak | reserved presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Ergün | HF candidate; 41; driver, housekeeper; Bornova | plain presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |
| Feride | HF candidate; 45; carer, nanny; Karşıyaka | chatty presentation; seeded traits above | High occupational cameo; keep current identity, not name-match merge |

#### Households (all versions)

All members receive seeded traits: honesty .3+.6*draw(seed,`${id}:honesty`); agreeableness .3+.6*draw(seed,`${id}:agreeable`), except patient-pressure household: Arslan grandmother or other family index 1 gets .2; conscientiousness .35+.6*draw(seed,`${id}:reliable`); extraversion .25+.65*draw(seed,`${id}:social`); emotionality .3+.6*draw(seed,`${id}:emotional`); openness .3+.5*draw(seed,`${id}:open`). Household pressure is a situation, not a personality.


**the Arslans** (Karşıyaka; nanny requested; pressure patient).

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Ece | HF; mother, returning to work; id arslans-0 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Mert | HF; father, a pharmacist; id arslans-1 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Ada | HF; daughter, three; id arslans-2 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Saadet | HF; grandmother, lives with them; id arslans-3 | Seeded household traits; agreeableness .2 | Medium/high family/local cameo; retain household identity |
| Deniz | HF; son, three; id arslans-4 | Seeded household traits above | Medium/high family/local cameo; retain household identity |

**the Kayas** (Bornova; carer requested; pressure patient).

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Aylin | HF; daughter, a teacher; id kayas-0 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Kemal | HF; father, needs help dressing; id kayas-1 | Seeded household traits; agreeableness .2 | Medium/high family/local cameo; retain household identity |

**the Demirs** (Alsancak; driver requested; pressure discreet).

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| İpek | HF; mother, an accountant; id demirs-0 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Onur | HF; father, works nights; id demirs-1 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Deniz | HF; son, seven; id demirs-2 | Seeded household traits above | Medium/high family/local cameo; retain household identity |

**the Aks** (Göztepe; carer requested; pressure warm).

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Suna | HF; retired headteacher; id aks-0 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Rauf | HF; husband, recovering from surgery; id aks-1 | Seeded household traits above | Medium/high family/local cameo; retain household identity |

**the Erdems** (Karşıyaka; nanny requested; pressure hardworking).

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Berrin | HF; mother, runs a shop; id erdems-0 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Levent | HF; father, travels; id erdems-1 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Ela | HF; daughter, five; id erdems-2 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Efe | HF; son, five; id erdems-3 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Naciye | HF; grandmother; id erdems-4 | Seeded household traits above | Medium/high family/local cameo; retain household identity |

**the Yılmazs** (Buca; driver requested; pressure reliable).

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Fikret | HF; father, a mechanic; id yilmazs-0 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Sevil | HF; mother, a nurse; id yilmazs-1 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Can | HF; son, twelve; id yilmazs-2 | Seeded household traits above | Medium/high family/local cameo; retain household identity |

**the Çeliks** (Bornova; cook requested; pressure honest).

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Tülay | HF; mother, a lawyer; id celiks-0 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Ali | HF; father, an engineer; id celiks-1 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| İdil | HF; daughter, nine; id celiks-2 | Seeded household traits above | Medium/high family/local cameo; retain household identity |

**the Özkans** (Göztepe; carer requested; pressure patient).

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Nesrin | HF; widow, lives upstairs; id ozkans-0 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Barış | HF; son, lives downstairs; id ozkans-1 | Seeded household traits; agreeableness .2 | Medium/high family/local cameo; retain household identity |

**the Aydıns** (Alsancak; nanny requested; pressure warm).

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Selda | HF; mother, a florist; id aydins-0 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Hakan | HF; father, a printer; id aydins-1 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Bora | HF; son, two; id aydins-2 | Seeded household traits above | Medium/high family/local cameo; retain household identity |

**the Taş family** (Buca; housekeeper requested; pressure hardworking).

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Melek | HF; mother, works at a bakery; id tass-0 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Halil | HF; father, a porter; id tass-1 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Zeynep | HF; daughter, sixteen; id tass-2 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Ömer | HF; son, ten; id tass-3 | Seeded household traits above | Medium/high family/local cameo; retain household identity |

**the Şahins** (Karşıyaka; driver requested; pressure reliable).

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Gaye | HF; mother, works at the port; id sahins-0 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Serdar | HF; father, a surveyor; id sahins-1 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Lale | HF; daughter, eight; id sahins-2 | Seeded household traits above | Medium/high family/local cameo; retain household identity |

**the Uğurs** (Bornova; housekeeper requested; pressure honest).

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Perihan | HF; retired seamstress; id ugurs-0 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Tahir | HF; husband, retired bus driver; id ugurs-1 | Seeded household traits above | Medium/high family/local cameo; retain household identity |

**the Karas** (Göztepe; nanny requested; pressure patient).

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Aslı | HF; mother, a doctor; id karas-0 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Tolga | HF; father, a chef; id karas-1 | Seeded household traits; agreeableness .2 | Medium/high family/local cameo; retain household identity |
| Nil | HF; daughter, four; id karas-2 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Mina | HF; daughter, one; id karas-3 | Seeded household traits above | Medium/high family/local cameo; retain household identity |

**the Polats** (Alsancak; cook requested; pressure discreet).

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Sevim | HF; mother, hosts large lunches; id polats-0 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Erhan | HF; father, a wholesaler; id polats-1 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Füsun | HF; aunt, staying for winter; id polats-2 | Seeded household traits above | Medium/high family/local cameo; retain household identity |

**the Tekins** (Buca; carer requested; pressure warm).

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Aysel | HF; daughter, a librarian; id tekins-0 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| İsmail | HF; father, limited mobility; id tekins-1 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Rukiye | HF; mother, exhausted from caring; id tekins-2 | Seeded household traits above | Medium/high family/local cameo; retain household identity |

**the İnces** (Karşıyaka; driver requested; pressure reliable).

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Derya | HF; mother, an architect; id inces-0 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Cenk | HF; father, a dentist; id inces-1 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Arda | HF; son, six; id inces-2 | Seeded household traits above | Medium/high family/local cameo; retain household identity |
| Eylül | HF; daughter, eleven; id inces-3 | Seeded household traits above | Medium/high family/local cameo; retain household identity |

#### Referees (all versions)

Each named referee is an HF actor. Bias cycles cagey, stingy, fond, fair by candidate order. Authored traits: honesty fair .85 / cagey .3 / otherwise .48; agreeableness stingy .18 / fond .85 / otherwise .55; extraversion cagey .3 / otherwise .6; conscientiousness .65. Bias is authored, not inferred from title.

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Mrs Ak | HF referee for Gül | cagey; numeric traits above | Medium employer/reference cameo |
| Mrs Uslu | HF referee for Sevda | stingy; numeric traits above | Medium employer/reference cameo |
| Mrs Eren | HF referee for Pınar | fond; numeric traits above | Medium employer/reference cameo |
| Mr Bayram | HF referee for Fatma | fair; numeric traits above | Medium employer/reference cameo |
| Mr Tunç | HF referee for Cem | cagey; numeric traits above | Medium employer/reference cameo |
| Mrs Soyer | HF referee for Ayla | stingy; numeric traits above | Medium employer/reference cameo |
| Mrs Bulut | HF referee for Emine | fond; numeric traits above | Medium employer/reference cameo |
| Mr Şen | HF referee for Murat | fair; numeric traits above | Medium employer/reference cameo |
| Mrs Acar | HF referee for Dilek | cagey; numeric traits above | Medium employer/reference cameo |
| Mrs Öz | HF referee for Hatice | stingy; numeric traits above | Medium employer/reference cameo |
| Mr Kurt | HF referee for Selim | fond; numeric traits above | Medium employer/reference cameo |
| Mrs Baş | HF referee for Zehra | fair; numeric traits above | Medium employer/reference cameo |
| Mrs Çam | HF referee for Leyla | cagey; numeric traits above | Medium employer/reference cameo |
| Mr Işık | HF referee for Osman | stingy; numeric traits above | Medium employer/reference cameo |
| Mrs Koç | HF referee for Esra | fond; numeric traits above | Medium employer/reference cameo |
| Mrs Duman | HF referee for Safiye | fair; numeric traits above | Medium employer/reference cameo |
| Mr Yalçın | HF referee for Burak | cagey; numeric traits above | Medium employer/reference cameo |
| Mrs Güneş | HF referee for Meltem | stingy; numeric traits above | Medium employer/reference cameo |
| Mrs Kılıç | HF referee for Huriye | fond; numeric traits above | Medium employer/reference cameo |
| Mr Ay | HF referee for Yusuf | fair; numeric traits above | Medium employer/reference cameo |
| Mrs Sezer | HF referee for Aysun | cagey; numeric traits above | Medium employer/reference cameo |
| Mrs Alkan | HF referee for Nurten | stingy; numeric traits above | Medium employer/reference cameo |
| Mr Yüce | HF referee for Ergün | fond; numeric traits above | Medium employer/reference cameo |
| Mrs Toprak | HF referee for Feride | fair; numeric traits above | Medium employer/reference cameo |

#### Good Hands recurrence constraints

24 candidates + 51 household members + 24 referees + Nermin. Household surnames are collective identifiers, not extra HF actors. No random-name pool: all names are authored; seed varies private profiles. Pass Zeynep is a plausible visiting household-cook placement or professional reference; Good Hands already has a Zeynep household member, so use explicit identity/context. Pass Hülya fits oven expertise/reference. Avoid replacing a named existing candidate or conflating Dilek, Selim, Murat, Hatice, Fatma etc. by name.

### Hearsay

Sources: `src/sim/world.ts` defines 32 exact names, jobs, households and norm stances; `src/sim/game.ts:newGame` constructs an HF Person for every entry; `src/sim/voices.ts` and `src/sim/incidents.ts` supply voices, background and incident variants. Version 1/2 use this same cast. All seeds retain these names; no random-name pool. Ages/sex are generic constructor choices, not reliable authored biographical evidence.

Each actor has extraversion .75 and conscientiousness .6. Honesty follows norm stance: forbidden .95; disliked .55; permitted .12. These standings concern the game’s backbiting norm, not the permissibility of a person. Norm stance is permitted for Ayşe, Selma, Orhan, Murat; otherwise forbidden for even global index or Fatma (index 9); otherwise disliked. These numeric priors differ from truth of any single incident.


Household group 0 (source array; Zehra lives in group 2 and Ayşe in group 1 after explicit swap):

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Hatice | HF; Tea garden keeper; id hatice | honesty .95, extraversion .75, conscientiousness .6; forbidden | High neighborhood cameo; match occupation/family, not just name |
| Emre | HF; Apprentice carpenter; id emre | honesty .55, extraversion .75, conscientiousness .6; disliked | High neighborhood cameo; match occupation/family, not just name |
| Osman | HF; Retired porter; id osman | honesty .95, extraversion .75, conscientiousness .6; forbidden | High neighborhood cameo; match occupation/family, not just name |

Household group 1 (source array; Zehra lives in group 2 and Ayşe in group 1 after explicit swap):

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Rıza | HF; Baker; id riza | honesty .55, extraversion .75, conscientiousness .6; disliked | High neighborhood cameo; match occupation/family, not just name |
| Elif | HF; Student; id elif | honesty .95, extraversion .75, conscientiousness .6; forbidden | High neighborhood cameo; match occupation/family, not just name |
| Zehra | HF; Grocer’s assistant; id zehra | honesty .55, extraversion .75, conscientiousness .6; disliked | High neighborhood cameo; match occupation/family, not just name |

Household group 2 (source array; Zehra lives in group 2 and Ayşe in group 1 after explicit swap):

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Kemal | HF; Grocer; id kemal | honesty .95, extraversion .75, conscientiousness .6; forbidden | High neighborhood cameo; match occupation/family, not just name |
| Ayşe | HF; Bakery assistant; id ayse | honesty .12, extraversion .75, conscientiousness .6; permitted | High neighborhood cameo; match occupation/family, not just name |
| Murat | HF; Courier; id murat | honesty .12, extraversion .75, conscientiousness .6; permitted | High neighborhood cameo; match occupation/family, not just name |

Household group 3 (source array; Zehra lives in group 2 and Ayşe in group 1 after explicit swap):

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Fatma | HF; Seamstress; id fatma | honesty .95, extraversion .75, conscientiousness .6; forbidden | High neighborhood cameo; match occupation/family, not just name |
| Hasan | HF; Teacher; id hasan | honesty .95, extraversion .75, conscientiousness .6; forbidden | High neighborhood cameo; match occupation/family, not just name |
| Selin | HF; Student; id selin | honesty .55, extraversion .75, conscientiousness .6; disliked | High neighborhood cameo; match occupation/family, not just name |

Household group 4 (source array; Zehra lives in group 2 and Ayşe in group 1 after explicit swap):

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Nermin | HF; Tailor; id nermin | honesty .95, extraversion .75, conscientiousness .6; forbidden | High neighborhood cameo; match occupation/family, not just name |
| Yusuf | HF; Bus driver; id yusuf | honesty .55, extraversion .75, conscientiousness .6; disliked | High neighborhood cameo; match occupation/family, not just name |
| Deniz | HF; Nurse; id deniz | honesty .95, extraversion .75, conscientiousness .6; forbidden | High neighborhood cameo; match occupation/family, not just name |

Household group 5 (source array; Zehra lives in group 2 and Ayşe in group 1 after explicit swap):

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Selma | HF; Barber; id selma | honesty .12, extraversion .75, conscientiousness .6; permitted | High neighborhood cameo; match occupation/family, not just name |
| Ahmet | HF; Electrician; id ahmet | honesty .95, extraversion .75, conscientiousness .6; forbidden | High neighborhood cameo; match occupation/family, not just name |
| Ece | HF; Student; id ece | honesty .55, extraversion .75, conscientiousness .6; disliked | High neighborhood cameo; match occupation/family, not just name |

Household group 6 (source array; Zehra lives in group 2 and Ayşe in group 1 after explicit swap):

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Aylin | HF; Cook; id aylin | honesty .95, extraversion .75, conscientiousness .6; forbidden | High neighborhood cameo; match occupation/family, not just name |
| Mehmet | HF; Mechanic; id mehmet | honesty .55, extraversion .75, conscientiousness .6; disliked | High neighborhood cameo; match occupation/family, not just name |
| Can | HF; Student; id can | honesty .95, extraversion .75, conscientiousness .6; forbidden | High neighborhood cameo; match occupation/family, not just name |

Household group 7 (source array; Zehra lives in group 2 and Ayşe in group 1 after explicit swap):

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Zeynep | HF; Teacher; id zeynep | honesty .55, extraversion .75, conscientiousness .6; disliked | High neighborhood cameo; match occupation/family, not just name |
| Ali | HF; Carpenter; id ali | honesty .95, extraversion .75, conscientiousness .6; forbidden | High neighborhood cameo; match occupation/family, not just name |
| Derya | HF; Nurse; id derya | honesty .55, extraversion .75, conscientiousness .6; disliked | High neighborhood cameo; match occupation/family, not just name |

Household group 8 (source array; Zehra lives in group 2 and Ayşe in group 1 after explicit swap):

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Safiye | HF; Retired teacher; id safiye | honesty .95, extraversion .75, conscientiousness .6; forbidden | High neighborhood cameo; match occupation/family, not just name |
| İbrahim | HF; Caretaker; id ibrahim | honesty .55, extraversion .75, conscientiousness .6; disliked | High neighborhood cameo; match occupation/family, not just name |

Household group 9 (source array; Zehra lives in group 2 and Ayşe in group 1 after explicit swap):

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Leyla | HF; Florist; id leyla | honesty .95, extraversion .75, conscientiousness .6; forbidden | High neighborhood cameo; match occupation/family, not just name |
| Cem | HF; Driver; id cem | honesty .55, extraversion .75, conscientiousness .6; disliked | High neighborhood cameo; match occupation/family, not just name |

Household group 10 (source array; Zehra lives in group 2 and Ayşe in group 1 after explicit swap):

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Esra | HF; Accountant; id esra | honesty .95, extraversion .75, conscientiousness .6; forbidden | High neighborhood cameo; match occupation/family, not just name |
| Orhan | HF; Coffee house keeper; id orhan | honesty .12, extraversion .75, conscientiousness .6; permitted | High neighborhood cameo; match occupation/family, not just name |

Household group 11 (source array; Zehra lives in group 2 and Ayşe in group 1 after explicit swap):

| Exact display name | Role / status | Authored temperament | Recurrence suitability (inference) |
|---|---|---|---|
| Meryem | HF; Midwife; id meryem | honesty .95, extraversion .75, conscientiousness .6; forbidden | High neighborhood cameo; match occupation/family, not just name |
| Halil | HF; Imam; id halil | honesty .55, extraversion .75, conscientiousness .6; disliked | High neighborhood cameo; match occupation/family, not just name |

Hatice is the player’s tea-garden keeper HF actor; Emre and Elif’s engagement/wedding are central threads. “Anne (Mother)” is a relational form of address in family dialogue, not an additional proper-name actor. Named incidents reference this same 32-person cast.

### Source gaps and cautions

- Temperament is not authored for narrative-only people. No traits invented for them. HF defaults were not substituted for absent game authorship.
- Good Hands profiles are deliberately seed-variable. A cross-game recurring person needs an explicit policy about seeded profile continuity. Fixed name alone does not establish fixed private temperament.
- No source establishes cross-game identity between repeated names. Recurrence recommendations above are proposals only.
- No generated name pools found in these seven runtime src trees. Authored collective surnames and unnamed relatives are called out separately.
- Glance’s Mr Pugh is contextual alias for Dai, not a full independently authored name. Rope Ezra is remembered/absent story context; source does not explicitly confirm death, and no actor spec or numeric traits exists.
- This census covers currently reachable runtime and preserved legacy source, not abandoned concepts existing only in design docs, test-only fabricated actors, historical exports, fonts, or third-party package source.

### Runtime variant coverage

| Game | Reachable scenario / edition coverage | Cast difference |
|---|---|---|
| Pass | `src/sim/kitchen.ts` export compatibility accepts `pass@3` through `pass@11`; four-week `WEEKS`/`NIGHT_PLANS`, founders plus hire choices in `src/sim/campaign.ts` | Same authored people; roster depends on hires/leavers; no additional edition-specific name pool |
| Glance | `glance@1`; Monday through Friday plans in `src/sim/dam.ts` | Dai Monday/Tuesday; Callum joins Wednesday; Nerys reachable from Tuesday; Morgan background only |
| Murmur | `0.2.1` legacy, `0.3.0`, `0.4.0`, `0.4.1`, `0.4.2` supported by `src/sim/game.ts:isEdition` and `src/sim/listening.ts:listens`; first and second weeks | Same named cast; listening config changes habits/choice temperature, not authored trait overrides |
| Rope | Single climbs Hollin Crag, The Tooth, Kestrel Pike and three-climb season; serialized narration revisions in `src/sim/climb.ts` / `src/sim/season.ts` | Same five HF actors; Ezra story expands across climbs; no new party member |
| Repair | Current and replay-compatible engine versions; workshop jobs, mentor/responsibility and community garden/reading/theatre scenarios | Same four HF actors; no generated people |
| Good Hands | Runtime versions 1, 2, 3 explicitly routed by `src/sim/index.ts`; each contains byte-identical world data | Same 100 HF people per seed; private candidate traits swap within presentation bands |
| Hearsay | Runtime versions 1, 2 in `src/sim/game.ts`; daily incidents 1–14 plus basket, Emre repair/shopping/bread scenes 15–18 in `src/sim/incidents.ts`; engagement/wedding branches | Same 32 HF people in every branch; no extra named actor |

Good Hands count: 24 candidates + 51 family members + 24 referees + Nermin = 100 actors. Across these seven games: 152 instantiated named HF actors (8 Pass, 2 Glance, 1 Murmur, 5 Rope, 4 Repair, 100 Good Hands, 32 Hearsay), counting identities separately across games and counting potential Pass hires. Narrative-only names and relational/role labels are additional rows above.

### Repository snapshot

| Repository | HEAD | Dirty state |
|---|---|---|
| stairwell | a2defd8641fe3947c1e3cbcff64c45d31144c5e4 | clean |
| valley | 9b47bbbf3b36e2b33b23a6387181ef66a8fb1b5d | clean |
| warren | da6441ce6931f427ab8bf1838de043a28dcaa967 | clean |
| concordia | 76e8febab1a5c4da7f21ba261aa5fae2f9143673 | M .beads/issues.jsonl; ?? neighbours/.8027 |

### Stairwell

Fixed cast. No population generator or alternate cast found in src/sim. Seven residents and the player body are HF persons. Source: stairwell/src/sim/people.ts:18–122, :160–267, :325–348.

| Exact name (ID) | Authored role | Authored temperament | Recurrence suitability |
|---|---|---|---|
| Nermin (nermin); Nermin Hanım | 72; flat 1; Widow. Her window is next to the front door. | honesty=0.45, extraversion=0.85, agreeableness=0.5, openness=0.7, emotionality=0.6 | Strong: fixed resident with authored relationships; preserve building and age context. |
| Sevim (sevim); Sevim Hanım | 69; flat 2; Retired teacher. Corrects the notices on the board. | honesty=0.6, extraversion=0.6, agreeableness=0.35, conscientiousness=0.85, openness=0.4 | Strong: fixed resident with authored relationships; preserve building and age context. |
| Burak (burak); Burak Bey | 31; flat 3; Accountant. Polite, quiet, out all day. | honesty=0.8, extraversion=0.3, agreeableness=0.7, conscientiousness=0.8, openness=0.5 | Strong: fixed resident with authored relationships; preserve building and age context. |
| Hüseyin (huseyin); Hüseyin Bey | 63; flat 4; The building manager. Keeps the fund book. | honesty=0.85, extraversion=0.45, agreeableness=0.35, conscientiousness=0.9, openness=0.3 | Strong: fixed resident with authored relationships; preserve building and age context. |
| Derya (derya); Derya Hanım | 44; flat 5; Night nurse. Sleeps in the mornings. | honesty=0.7, extraversion=0.35, agreeableness=0.6, emotionality=0.5, openness=0.55 | Strong: fixed resident with authored relationships; preserve building and age context. |
| Elif (elif); Elif Hanım | 27; flat 6; Illustrator. Moved in last month. | honesty=0.65, extraversion=0.6, agreeableness=0.65, openness=0.85, emotionality=0.55 | Strong: fixed resident with authored relationships; preserve building and age context. |
| Tarık (tarik); Tarık Bey | 81; flat 7; Retired ferry captain. Top floor. | honesty=0.8, extraversion=0.5, agreeableness=0.7, conscientiousness=0.6, emotionality=0.4 | Strong: fixed resident with authored relationships; preserve building and age context. |
| Kapıcı (kapici) | Player; new building caretaker, male 38 | honesty=0.6, extraversion=0.5 | Role/title, not a personal name; avoid merging with named caretakers. |
| Rıza Efendi / Rıza (riza in narrator messages) | Former kapıcı; notebook/margin voice and resident recollections; not created as a Person | No authored traits | Strong background connection; notebook voice, not a currently simulated resident. |
| Volkan | Derya’s brother; lost his job; late-night visitor, revealed in dialogue | No authored traits | Usable background visitor; no HF person/temperament yet. |

Additional sources: stairwell/src/sim/game.ts:1392, :1479, :1845. Narrator is a message channel, not another person. Named allegations are beliefs or player fabrications; do not promote them to true character traits. Burak/Elif affection is seeded, not proof of a committed relationship.

### The Valley

30 fixed lower-hamlet villagers, one player kahya, six generated upper houses. The UI draws a random new-game seed (valley/src/ui/app.ts:328); therefore seed 42 below is an explicitly chosen reproducible example, not a fixed UI default. Source: valley/src/sim/people.ts:144–427. All are villagers of their listed house; role claims beyond that are only those in the authored house description or source ties.

| Exact name (ID) | Age; household and role | Authored temperament | Recurrence suitability |
|---|---|---|---|
| Osman (osman) | 52; Kavak, house head | honesty=0.35, conscientiousness=0.75, agreeableness=0.45, extraversion=0.65 | Fixed identity; strong authored story hook. |
| Hatice (hatice) | 47; Kavak, house member | honesty=0.7, agreeableness=0.6 | Fixed identity; usable supporting family member. |
| Ali (ali) | 22; Kavak, house member | extraversion=0.6, conscientiousness=0.5, openness=0.6 | Fixed identity; strong authored story hook. |
| Emine (emine) | 17; Kavak, house member | conscientiousness=0.6, emotionality=0.6 | Fixed identity; usable supporting family member. |
| Hasan (hasan) | 44; Ak, house head | honesty=0.65, conscientiousness=0.7, agreeableness=0.6 | Fixed identity; strong authored story hook. |
| Fatma (fatma) | 40; Ak, house member | conscientiousness=0.7 | Fixed identity; usable supporting family member. |
| İsmail (ismail) | 15; Ak, house member | No authored trait override | Fixed identity; usable supporting family member. |
| Kadir (kadir) | 12; Ak, house member | No authored trait override | Fixed identity; usable supporting family member. |
| Sultan (sultan) | 8; Ak, house member | No authored trait override | Fixed identity; usable supporting family member. |
| Yusuf (yusuf) | 38; Çoban, house head | honesty=0.75, agreeableness=0.4, extraversion=0.3, emotionality=0.55 | Fixed identity; strong authored story hook. |
| Zehra (zehra) | 31; Çoban, house member | No authored trait override | Fixed identity; strong authored story hook. |
| Cemal (cemal) | 9; Çoban, house member | No authored trait override | Fixed identity; usable supporting family member. |
| Gül (gul) | 6; Çoban, house member | No authored trait override | Fixed identity; usable supporting family member. |
| Saliha (saliha) | 58; Dere, house head | honesty=0.9, agreeableness=0.3, conscientiousness=0.8, emotionality=0.4 | Fixed identity; strong authored story hook. |
| Musa (musa) | 26; Dere, house member | honesty=0.7, conscientiousness=0.65, extraversion=0.35 | Fixed identity; usable supporting family member. |
| Mustafa (mustafa) | 30; Kara, house head | honesty=0.55, conscientiousness=0.45, extraversion=0.7, openness=0.7 | Fixed identity; strong authored story hook. |
| Elif (elif) | 26; Kara, house member | emotionality=0.65 | Fixed identity; usable supporting family member. |
| Nuri (bebek) | 1; Kara, house member | No authored trait override | Fixed identity; usable supporting family member. |
| İbrahim (ibrahim) | 63; Demirci, house head | honesty=0.8, conscientiousness=0.8, agreeableness=0.65 | Fixed identity; usable supporting family member. |
| Havva (havva) | 60; Demirci, house member | No authored trait override | Fixed identity; usable supporting family member. |
| Halil (halil) | 31; Demirci, house member | conscientiousness=0.6 | Fixed identity; usable supporting family member. |
| Meryem (meryem) | 24; Demirci, house member | No authored trait override | Fixed identity; usable supporting family member. |
| Ahmet (ahmet) | 2; Demirci, house member | No authored trait override | Fixed identity; usable supporting family member. |
| Ömer (omer) | 48; Kuyucu, house head | honesty=0.6, conscientiousness=0.55, agreeableness=0.7 | Fixed identity; usable supporting family member. |
| Gülsüm (gulsum) | 45; Kuyucu, house member | No authored trait override | Fixed identity; usable supporting family member. |
| Esma (esma) | 19; Kuyucu, house member | extraversion=0.65, openness=0.65 | Fixed identity; strong authored story hook. |
| Hanife (hanife) | 15; Kuyucu, house member | No authored trait override | Fixed identity; usable supporting family member. |
| Recep (recep) | 29; Tepe, house head | honesty=0.45, conscientiousness=0.3, extraversion=0.8, agreeableness=0.55 | Fixed identity; strong authored story hook. |
| Şerife (serife) | 63; Tepe, house member | No authored trait override | Fixed identity; usable supporting family member. |
| Zeynep (zeynep) | 21; Tepe, house member | conscientiousness=0.75, honesty=0.7, extraversion=0.55 | Fixed identity; usable supporting family member. |
| the kahya (kahya) | Player, male 41; seal-holder / steward | conscientiousness=0.6 | Office title, not a personal name; do not merge automatically. |

Authored role/context detail by house:
- Kavak: The reeve’s house: whitewashed, the only one with glass in a window.
- Ak: Osman’s brother’s house. Three boys’ shirts on the line.
- Çoban: The shepherd’s house at the edge, a dog on a chain, the flock up on the yayla.
- Dere: Widow Saliha’s house by the stream. The ox stall is empty.
- Kara: A young house, roof half-mended. A baby crying most evenings.
- Demirci: The smithy. The old man still swings the hammer; his son does the rest.
- Kuyucu: The well-digger’s house. Two daughters, and the whole lane knows it.
- Tepe: Up the slope. The son is at the coffeehouse more than at the plough.

Specific explicit hooks: Osman and Hasan are brothers. Ali and Esma have a seeded mutual tie (“the whole lane knows”). Zehra is Yusuf’s pregnant wife, due in the first days. Saliha’s late husband and the previous kahya appear in the ox-confiscation memory; neither has a personal name. Recep has a coffeehouse habit. Mustafa holds a city-work inclination. Source: valley/src/sim/people.ts:625–677. İbrahim has smithing skill 0.85 and Halil 0.6; these are skills, not temperament.

Generated upper population rule: six houses Yayla, Ceviz, Pınar, Uzun, Topal, Sarı. For house index i, r(k)=hashUnit(seed,3,i,k); head age round(32+30*r(2)); male iff r(3)>0.15; spouse only for male head younger than 60, age headAge−3−round(4*r(6)); children floor(r(9)*4), age max(0,round(headAge−22−3*k−4*r(20+k))), boy iff r(30+k)>0.5. Head honesty, conscientiousness, agreeableness, extraversion, emotionality each 0.25+0.5*r(11..15). No authored child/spouse trait overrides. Male/female names cycle independent counters through these pools; IDs are house-based, including a male-pool-derived head ID even for a female head. Source: valley/src/sim/people.ts:429–553 and src/sim/rng.ts:8–22.

Male upper name pool: Mehmet, Hüseyin, Mahmut, Bekir, Veli, Rıza, Salih, Ramazan, Davut, Süleyman, Kâmil, Yakup, Zeki, Nazım, Cafer, Hamza.

Female upper name pool: Ayşe, Hacer, Fadime, Esra, Nuriye, Dürdane, Gülizar, Rukiye, Cennet, Halime, Nazlı, Safiye, Hayriye, Sevda, Asiye, Kezban.

Seed 42 upper census (19 people; no kahya in this subtotal). Generated recurrence is weak until a seed-specific identity is adopted; every row is a real source-generated Person at this seed.

| Exact name (ID) | Age; house; role | Authored temperament |
|---|---|---|
| Mehmet (yayla-mehmet) | 32; Yayla; head | honesty=0.5175000629387796, conscientiousness=0.5126544656231999, agreeableness=0.48726648243609816, extraversion=0.5238609851803631, emotionality=0.32332080346532166 |
| Ayşe (yayla-w) | 28; Yayla; spouse | No authored trait override |
| Hacer (yayla-c0) | 8; Yayla; child | No authored trait override |
| Fadime (yayla-c1) | 5; Yayla; child | No authored trait override |
| Hüseyin (ceviz-hüseyin) | 61; Ceviz; head | honesty=0.47830302629154176, conscientiousness=0.4257750465767458, agreeableness=0.7117676081834361, extraversion=0.4271726266015321, emotionality=0.7035401833709329 |
| Esra (ceviz-c0) | 37; Ceviz; child | No authored trait override |
| Nuriye (ceviz-c1) | 33; Ceviz; child | No authored trait override |
| Mahmut (pinar-mahmut) | 33; Pınar; head | honesty=0.2828427884960547, conscientiousness=0.4360680017853156, agreeableness=0.7261382628930733, extraversion=0.2922066430328414, emotionality=0.7307466289494187 |
| Dürdane (pinar-w) | 27; Pınar; spouse | No authored trait override |
| Bekir (uzun-bekir) | 57; Uzun; head | honesty=0.6592312592547387, conscientiousness=0.5362021378241479, agreeableness=0.30260167294181883, extraversion=0.32716440549120307, emotionality=0.6557014811551198 |
| Gülizar (uzun-w) | 54; Uzun; spouse | No authored trait override |
| Veli (uzun-c0) | 33; Uzun; child | No authored trait override |
| Rıza (uzun-c1) | 30; Uzun; child | No authored trait override |
| Salih (uzun-c2) | 28; Uzun; child | No authored trait override |
| Ramazan (topal-ramazan) | 41; Topal; head | honesty=0.3919238745002076, conscientiousness=0.5387910872232169, agreeableness=0.3475530855357647, extraversion=0.4562057738658041, emotionality=0.4600967416772619 |
| Rukiye (topal-w) | 35; Topal; spouse | No authored trait override |
| Davut (sari-davut) | 41; Sarı; head | honesty=0.4772301168413833, conscientiousness=0.2662674165330827, agreeableness=0.6962436003377661, extraversion=0.6664379297289997, emotionality=0.5597650610143319 |
| Cennet (sari-w) | 35; Sarı; spouse | No authored trait override |
| Halime (sari-c0) | 15; Sarı; child | No authored trait override |

Birth population is open-ended, not an initial character list. Source: valley/src/sim/valley.ts:1912–1978. Boy pool: Ali, Hüseyin, Mehmet, Yunus, Emin, Halit, Osman, Hasan, İsa, Cemal, Nuri, Kemal, Hamza, Bilal, Adem, Zeki. Girl pool: Ayşe, Fatma, Hatice, Gülsüm, Elif, Zehra, Meryem, Hacer, Şerife, Emine, Nazlı, Havva, Rukiye, Saliha, Hanife, Döndü. Sex keyed by seed, mother ID hash and count of current+gone house members. Name excludes living names if possible, then uses keyed DRAW.name over the available list. ID `${house}-b${nextNote}`; HF birth creates child state, not an independently authored temperament. Do not treat every pool name as a pre-existing resident.

Unnamed narrative people: agha, agha’s rider/man, previous kahya, Saliha’s late husband, miller’s boy, distant family in the city. No personal names or authored temperament found for these roles. Recurrence requires new identity authoring.

### The Warren

Nine fixed founders. Source: warren/src/sim/people.ts:141–254. All help establish the refuge, except Yusuf Usta whose action is special.

| Exact name (ID) | Age; house and role | Authored temperament | Recurrence suitability |
|---|---|---|---|
| Hasan (hasan) | 41; the Kaya house; house head | honesty=0.38, conscientiousness=0.6, agreeableness=0.45, extraversion=0.55, emotionality=0.35 | Fixed supporting identity; preserve household context. |
| Elif (elif) | 37; the Kaya house; house member | honesty=0.62, emotionality=0.75, agreeableness=0.6, conscientiousness=0.65 | Fixed supporting identity; preserve household context. |
| Kerem (kerem) | 16; the Kaya house; house member | honesty=0.5, extraversion=0.8, conscientiousness=0.35, openness=0.7 | Fixed supporting identity; preserve household context. |
| Zehra (zehra) | 11; the Kaya house; house member | openness=0.8, extraversion=0.6 | Fixed supporting identity; preserve household context. |
| Musa (musa) | 29; the Demir house; house head | honesty=0.8, conscientiousness=0.75, agreeableness=0.7, extraversion=0.4 | Fixed supporting identity; preserve household context. |
| Ayşe (ayse) | 25; the Demir house; house member | honesty=0.55, extraversion=0.7, agreeableness=0.65, openness=0.6 | Fixed supporting identity; preserve household context. |
| Hatice (hatice) | 58; the Demir house; house member | honesty=0.9, conscientiousness=0.8, agreeableness=0.55, emotionality=0.5 | Fixed supporting identity; preserve household context. |
| Yusuf Usta (yusuf) | 74; the dig-master’s house; dig-master | honesty=0.75, conscientiousness=0.7, openness=0.75, extraversion=0.5 | Strong: explicit dig-master / named household context. |
| Meryem (meryem) | 19; the dig-master’s house; house member | honesty=0.6, openness=0.85, conscientiousness=0.55, extraversion=0.45 | Strong: explicit dig-master / named household context. |

Do not infer exact kinship from age alone: tieHouse procedurally marks spouses for opposite sexes with the head, within 15 years and adult, otherwise parent/child at a 16-year age gap or sibling. The source calls Meryem a house member; these rules are the source of her ties. Source: warren/src/sim/people.ts:257–278. Yusuf Usta’s unnamed father struck water under the western fields (warren/src/sim/warren.ts:2460). Player is the keeper/bell voice usta; no separately named player Person.

Editions 0.2.x, 0.3.0, 0.4.0 use the same newWarren founder function; no alternate cast found. Source: warren/src/sim/game.ts:22–53.

Arrival family-name pool: Arslan, Yıldız, Çelik, Şahin, Aydın, Öztürk, Kılıç, Doğan, Koç, Kurt, Polat, Erdem, Kara, Ak, Bulut, Tekin, Güneş, Ateş, Uçar, Duman, Ekinci, Bağcı, Çoban, Tuncer, Yalçın, Sarı, Bozkurt, Ünal.

Men’s given-name pool: Ali, Ömer, İbrahim, Osman, Halil, Mehmet, Yakup, Selim, Rıza, Cemal, Bekir, İsmail, Kadir, Salih.

Women’s given-name pool: Fatma, Emine, Zeynep, Havva, Sultan, Gül, Rabia, Nuriye, Saliha, Hacer, Esma, Şerife, Leyla, Dilek.

Arrival rule: seeded stream mixSeed(seed,DRAW.arrival,n), 2+floor(r()*4) people (2–5). Unused family name chosen by rotating through FAMILY_NAMES from n+floor(r()*length), fallback Yeni. Head age 24+floor(r()*30), male with probability .7; opposite-sex adult partner age max(18,headAge−3−floor(r()*6)); remaining children age max(1,headAge−18−floor(r()*14)), sex random. Unique given name attempted 40 times, fallback `${list[0]} ${n}`. Person ID lowercase name stripped to a–z plus arrival n. All six traits honesty, emotionality, extraversion, agreeableness, conscientiousness, openness = .2+.6*r(). House ID h<n>. Source: warren/src/sim/people.ts:305–445. Arrival depends on world progress and input, so no complete fixed later census exists. Recurrence suitability: weak before a chosen seed/run identity is established. This rule can create Ali, Ömer, etc.; it does not identify them with people in The Valley.

### Neighbours (Alder Quay)

Default createRuntime(seed=42,population=208): eight known principals and 200 background residents. Population can be 8–300; total synthetic candidate pool is 324. Source: concordia/neighbours/src/core/scenario.ts:23–181; state.ts:12–55. All 208 are HF Persons. No traits object is authored anywhere in scenario.ts: each gets HF defaults. Benevolence is a value, .35+keyed(seed,0,id)*.5, not a temperament trait. All have generated age 23+(i%47), alternating female/male by even/odd i, person seed (seed+i*7919)>>>0. These formulas also apply to the eight principals.

| Exact name (ID) | Occupation; initial place; authored description | Authored temperament | Recurrence suitability |
|---|---|---|---|
| Ada (ada) | carpenter; workshop; Kept the hall tables dry; wants to repair its doors. | None | Strong: fixed named resident with explicit occupation and commitments. |
| Musa (musa) | gardener; garden; Lost seedlings in the flood; grows food for neighbours. | None | Strong: fixed named resident with explicit occupation and commitments. |
| Elin (elin) | nurse; clinic; Moved evening care into a small clinic. | None | Strong: fixed named resident with explicit occupation and commitments. |
| Sam (sam) | cook; market; Promised a shared meal when the hall opens. | None | Strong: fixed named resident with explicit occupation and commitments. |
| Jo (jo) | ferry keeper; quay; Carries supplies from the quay. | None | Strong: fixed named resident with explicit occupation and commitments. |
| Lea (lea) | teacher; school; Evening classes need somewhere dry. | None | Strong: fixed named resident with explicit occupation and commitments. |
| Ravi (ravi) | mechanic; workshop; Shares a crowded workshop with Ada. | None | Strong: fixed named resident with explicit occupation and commitments. |
| Noor (noor) | organiser; homes; Visits neighbours who have not heard the hall news. | None | Strong: fixed named resident with explicit occupation and commitments. |

Lea is the returning player’s cousin; Sam a former stall partner and Jo the next-door neighbour per PLAYER_TIES comment and player fiction. Player is “you”, voice player, not a named HF Person. Lea’s family is mentioned but not individually named. Source: core/state.ts:57–66; core/player.ts:1–16, :299. Ada/Lea share a seeded neighbour relationship; Ada wants to understand the timber, Lea can teach the inspection method. Cast positions resolve by occupation, not name, so renaming a person does not alter mechanics (core/cast.ts:1–17).

Generated names are synthetic labels: 18 given names × 18 surnames. Given-name pool: Alex, Ariel, Avery, Blair, Cameron, Casey, Charlie, Ellis, Finley, Frankie, Hayden, Jamie, Jordan, Morgan, Quinn, Reese, Robin, Rowan. Surname pool: Brooks, Carter, Chen, Das, Diaz, Evans, Grant, Khan, Kim, Lane, Martin, Patel, Reed, Rivera, Singh, Silva, Stone, Ward. Sort every pair by keyed(seed,0,`neighbour-name:${name}`), tie-break original pair index, take first population−8. IDs resident-1 onward. Background role uses global index i%4: shop assistant, parent, retired neighbour, student. All begin at homes; narrative description “A persistent neighbour with food, rest and social needs.” No differentiated authored temperament. Recurrence judgment for all generated rows: weak; usable only if an explicit seed-specific identity is adopted. Source: core/neighbour-names.ts:3–58 and core/scenario.ts:45–181.

Complete deterministic default background census, seed 42, population 208 (plus the eight principal rows above = 208):

| ID | Exact synthetic name | Role |
|---|---|---|
| resident-1 | Ellis Brooks | shop assistant |
| resident-2 | Alex Das | parent |
| resident-3 | Charlie Chen | retired neighbour |
| resident-4 | Casey Ward | student |
| resident-5 | Finley Carter | shop assistant |
| resident-6 | Finley Rivera | parent |
| resident-7 | Alex Brooks | retired neighbour |
| resident-8 | Cameron Evans | student |
| resident-9 | Quinn Reed | shop assistant |
| resident-10 | Charlie Diaz | parent |
| resident-11 | Hayden Lane | retired neighbour |
| resident-12 | Robin Ward | student |
| resident-13 | Jamie Reed | shop assistant |
| resident-14 | Quinn Khan | parent |
| resident-15 | Rowan Das | retired neighbour |
| resident-16 | Rowan Martin | student |
| resident-17 | Quinn Rivera | shop assistant |
| resident-18 | Rowan Singh | parent |
| resident-19 | Finley Martin | retired neighbour |
| resident-20 | Finley Evans | student |
| resident-21 | Blair Grant | shop assistant |
| resident-22 | Hayden Reed | parent |
| resident-23 | Charlie Rivera | retired neighbour |
| resident-24 | Hayden Khan | student |
| resident-25 | Jamie Evans | shop assistant |
| resident-26 | Ellis Diaz | parent |
| resident-27 | Casey Stone | retired neighbour |
| resident-28 | Casey Diaz | student |
| resident-29 | Frankie Evans | shop assistant |
| resident-30 | Jamie Brooks | parent |
| resident-31 | Hayden Kim | retired neighbour |
| resident-32 | Rowan Carter | student |
| resident-33 | Casey Lane | shop assistant |
| resident-34 | Robin Rivera | parent |
| resident-35 | Hayden Stone | retired neighbour |
| resident-36 | Quinn Evans | student |
| resident-37 | Avery Reed | shop assistant |
| resident-38 | Avery Stone | parent |
| resident-39 | Ellis Kim | retired neighbour |
| resident-40 | Quinn Stone | student |
| resident-41 | Ariel Khan | shop assistant |
| resident-42 | Blair Singh | parent |
| resident-43 | Charlie Das | retired neighbour |
| resident-44 | Reese Evans | student |
| resident-45 | Jamie Rivera | shop assistant |
| resident-46 | Robin Reed | parent |
| resident-47 | Avery Martin | retired neighbour |
| resident-48 | Charlie Silva | student |
| resident-49 | Alex Ward | shop assistant |
| resident-50 | Finley Das | parent |
| resident-51 | Frankie Das | retired neighbour |
| resident-52 | Robin Chen | student |
| resident-53 | Cameron Kim | shop assistant |
| resident-54 | Robin Stone | parent |
| resident-55 | Blair Khan | retired neighbour |
| resident-56 | Quinn Martin | student |
| resident-57 | Blair Das | shop assistant |
| resident-58 | Cameron Silva | parent |
| resident-59 | Quinn Diaz | retired neighbour |
| resident-60 | Casey Grant | student |
| resident-61 | Jordan Diaz | shop assistant |
| resident-62 | Jamie Chen | parent |
| resident-63 | Alex Diaz | retired neighbour |
| resident-64 | Alex Grant | student |
| resident-65 | Finley Chen | shop assistant |
| resident-66 | Hayden Silva | parent |
| resident-67 | Reese Das | retired neighbour |
| resident-68 | Reese Carter | student |
| resident-69 | Alex Carter | shop assistant |
| resident-70 | Morgan Lane | parent |
| resident-71 | Jordan Carter | retired neighbour |
| resident-72 | Frankie Diaz | student |
| resident-73 | Alex Silva | shop assistant |
| resident-74 | Hayden Singh | parent |
| resident-75 | Morgan Brooks | retired neighbour |
| resident-76 | Ariel Chen | student |
| resident-77 | Blair Silva | shop assistant |
| resident-78 | Morgan Diaz | parent |
| resident-79 | Frankie Carter | retired neighbour |
| resident-80 | Reese Reed | student |
| resident-81 | Charlie Lane | shop assistant |
| resident-82 | Cameron Patel | parent |
| resident-83 | Charlie Martin | retired neighbour |
| resident-84 | Morgan Rivera | student |
| resident-85 | Jordan Grant | shop assistant |
| resident-86 | Casey Martin | parent |
| resident-87 | Reese Ward | retired neighbour |
| resident-88 | Quinn Lane | student |
| resident-89 | Charlie Kim | shop assistant |
| resident-90 | Alex Singh | parent |
| resident-91 | Morgan Ward | retired neighbour |
| resident-92 | Casey Evans | student |
| resident-93 | Rowan Rivera | shop assistant |
| resident-94 | Robin Diaz | parent |
| resident-95 | Reese Stone | retired neighbour |
| resident-96 | Jordan Stone | student |
| resident-97 | Reese Silva | shop assistant |
| resident-98 | Rowan Khan | parent |
| resident-99 | Ariel Silva | retired neighbour |
| resident-100 | Reese Martin | student |
| resident-101 | Ariel Reed | shop assistant |
| resident-102 | Frankie Martin | parent |
| resident-103 | Cameron Grant | retired neighbour |
| resident-104 | Casey Carter | student |
| resident-105 | Morgan Singh | shop assistant |
| resident-106 | Jamie Carter | parent |
| resident-107 | Morgan Stone | retired neighbour |
| resident-108 | Reese Brooks | student |
| resident-109 | Ariel Stone | shop assistant |
| resident-110 | Robin Carter | parent |
| resident-111 | Morgan Silva | retired neighbour |
| resident-112 | Rowan Stone | student |
| resident-113 | Charlie Carter | shop assistant |
| resident-114 | Avery Ward | parent |
| resident-115 | Frankie Lane | retired neighbour |
| resident-116 | Blair Lane | student |
| resident-117 | Blair Martin | shop assistant |
| resident-118 | Avery Lane | parent |
| resident-119 | Quinn Ward | retired neighbour |
| resident-120 | Avery Kim | student |
| resident-121 | Hayden Chen | shop assistant |
| resident-122 | Casey Patel | parent |
| resident-123 | Alex Kim | retired neighbour |
| resident-124 | Frankie Reed | student |
| resident-125 | Hayden Das | shop assistant |
| resident-126 | Rowan Chen | parent |
| resident-127 | Casey Reed | retired neighbour |
| resident-128 | Charlie Grant | student |
| resident-129 | Finley Lane | shop assistant |
| resident-130 | Finley Kim | parent |
| resident-131 | Ariel Singh | retired neighbour |
| resident-132 | Hayden Brooks | student |
| resident-133 | Reese Chen | shop assistant |
| resident-134 | Robin Singh | parent |
| resident-135 | Ellis Martin | retired neighbour |
| resident-136 | Ariel Ward | student |
| resident-137 | Alex Lane | shop assistant |
| resident-138 | Charlie Reed | parent |
| resident-139 | Rowan Grant | retired neighbour |
| resident-140 | Reese Diaz | student |
| resident-141 | Robin Brooks | shop assistant |
| resident-142 | Ellis Carter | parent |
| resident-143 | Ariel Diaz | retired neighbour |
| resident-144 | Jordan Kim | student |
| resident-145 | Morgan Carter | shop assistant |
| resident-146 | Ariel Evans | parent |
| resident-147 | Jordan Patel | retired neighbour |
| resident-148 | Ellis Rivera | student |
| resident-149 | Quinn Das | shop assistant |
| resident-150 | Hayden Evans | parent |
| resident-151 | Quinn Carter | retired neighbour |
| resident-152 | Robin Khan | student |
| resident-153 | Blair Reed | shop assistant |
| resident-154 | Jordan Reed | parent |
| resident-155 | Ellis Lane | retired neighbour |
| resident-156 | Morgan Grant | student |
| resident-157 | Charlie Ward | shop assistant |
| resident-158 | Cameron Chen | parent |
| resident-159 | Ellis Grant | retired neighbour |
| resident-160 | Jordan Das | student |
| resident-161 | Casey Rivera | shop assistant |
| resident-162 | Avery Patel | parent |
| resident-163 | Avery Singh | retired neighbour |
| resident-164 | Avery Rivera | student |
| resident-165 | Cameron Ward | shop assistant |
| resident-166 | Ellis Chen | parent |
| resident-167 | Frankie Grant | retired neighbour |
| resident-168 | Cameron Das | student |
| resident-169 | Jordan Rivera | shop assistant |
| resident-170 | Rowan Evans | parent |
| resident-171 | Morgan Patel | retired neighbour |
| resident-172 | Hayden Carter | student |
| resident-173 | Blair Rivera | shop assistant |
| resident-174 | Morgan Khan | parent |
| resident-175 | Reese Patel | retired neighbour |
| resident-176 | Frankie Silva | student |
| resident-177 | Frankie Khan | shop assistant |
| resident-178 | Alex Chen | parent |
| resident-179 | Cameron Singh | retired neighbour |
| resident-180 | Hayden Grant | student |
| resident-181 | Finley Patel | shop assistant |
| resident-182 | Jordan Chen | parent |
| resident-183 | Blair Kim | retired neighbour |
| resident-184 | Jamie Lane | student |
| resident-185 | Blair Carter | shop assistant |
| resident-186 | Avery Carter | parent |
| resident-187 | Frankie Chen | retired neighbour |
| resident-188 | Quinn Singh | student |
| resident-189 | Casey Kim | shop assistant |
| resident-190 | Jordan Martin | parent |
| resident-191 | Casey Silva | retired neighbour |
| resident-192 | Rowan Brooks | student |
| resident-193 | Jamie Diaz | shop assistant |
| resident-194 | Blair Diaz | parent |
| resident-195 | Jordan Lane | retired neighbour |
| resident-196 | Ariel Rivera | student |
| resident-197 | Ariel Kim | shop assistant |
| resident-198 | Rowan Patel | parent |
| resident-199 | Alex Patel | retired neighbour |
| resident-200 | Jamie Das | student |

Additional experimental identities, outside town cast: “Learner” (inspection-learner), female age 30, seed defaults to 19, no trait override (src/experiments/runner.ts:145–158); “Person” (person), female age 30, seed 19, no trait override, received-route control subject (src/experiments/received-route.ts:56–75). These are controlled experiment labels, poor recurrence candidates. “teacher” is an evidence source ID in inspection experiment, not a further named town person. No alternate scenario cast found in src.

### Identity limits

Repeated exact given names across games are collisions, not links: Elif, Yusuf, Hasan, Musa, Zehra, Hatice, Meryem, and numerous name-pool entries. Ages, houses, and role differ. Kapıcı/kahya/usta are roles, and none should be equated with another game’s person without an explicit author decision. Background references do not imply a simulated agent. Temperament tables report only source-authored traits; occupations, player allegations, recollections and generated synthetic labels do not establish personality.

### Twice at the Well

Sources: `apps/site/src/colony/sim/world-types.ts` VILLAGERS; `human-cast.ts` CAST / ROLE_GOALS in the same directory. `village.ts` selects warning timing and defines no additional people.

| Name | Role and authored prose | Authored traits |
|---|---|---|
| Hajja Maryam | 68; cook. Widow, everyone’s grandmother. Cooks at 06:30, 12:00 and 18:00 by habit. | honesty=0.8, emotionality=0.6, extraversion=0.6, agreeableness=0.8, conscientiousness=0.8, openness=0.4 |
| Yusuf | 34; builder. Maryam’s son, Tariq’s father. Keeps promises; prays on time. | honesty=0.75, emotionality=0.4, extraversion=0.5, agreeableness=0.6, conscientiousness=0.85, openness=0.5 |
| Tariq | 16; apprentice. Yusuf’s son. Eager, learns fast, trusts your voice most. | honesty=0.6, emotionality=0.3, extraversion=0.7, agreeableness=0.6, conscientiousness=0.5, openness=0.7 |
| Idris | 41; forester. Forester, Yusuf’s friend. Low fear, high ambition: the cedar tempts him. | honesty=0.6, emotionality=0.15, extraversion=0.5, agreeableness=0.5, conscientiousness=0.6, openness=0.5 |
| Samira | 29; gatherer. Idris’s wife. Careful; weighs risk double and offers to go “with someone”. | honesty=0.7, emotionality=0.85, extraversion=0.5, agreeableness=0.7, conscientiousness=0.85, openness=0.5 |
| Danyal | 52; well-keeper. Christian widower, Maryam’s old friend. Keeps the well and his own grain jar. | honesty=0.9, emotionality=0.4, extraversion=0.4, agreeableness=0.7, conscientiousness=0.8, openness=0.5 |

All six are strong recurring-cast candidates: distinct roles and family/friend ties. Maryam–Yusuf–Tariq are three generations; Idris and Samira are married; Danyal is Maryam’s friend. Maryam and Danyal have unnamed deceased spouses; these are not additional named characters. No temporal or geographic link to the other games is established here.

### The Day You Say Nothing

Sources: `apps/site/src/voice/sim/town.ts` townSpecs, TOWN_DEFAULTS and memories; `fixtures.ts` is sample UI data, not runtime authority. `beats.ts` and `prefill.ts` refer to the same cast and add no named people.

| Name | Role and authored prose | Authored traits |
|---|---|---|
| Halil | 61; widowed repairman. Hypertension; cigarette habit; owes two months of rent (600). Wife of 35 years died 98 days before game. Learned avoidance of clinic, mosque and calling daughter after funeral. | conscientiousness=0.6, extraversion=0.35, agreeableness=0.6, emotionality=0.5, honesty=0.7 |
| Selin | 32; Halil’s daughter, office worker in the city; own family; urges him to see doctor. | conscientiousness=0.7, extraversion=0.6, agreeableness=0.65, honesty=0.75 |
| Rıza | 63; Halil’s friend at the tea house. | extraversion=0.7, agreeableness=0.7, honesty=0.65, conscientiousness=0.45 |
| Hacer | 58; neighbour who talks about people; weak conviction against backbiting (0.15). | extraversion=0.8, agreeableness=0.45, honesty=0.5, emotionality=0.6 |
| Osman | 55; landlord and market trader; seeks rent repayment. | conscientiousness=0.75, agreeableness=0.35, honesty=0.6, extraversion=0.5 |
| Nuran | Halil’s deceased wife; narrative and relationship entry, not a live Person. Funeral and last-Ramadan iftar are memories; grave can be visited. | No authored trait profile. |
| You | Player’s voice in Halil’s head; not a named independent person. | No authored trait profile. |

Halil, Selin, Rıza, Hacer and Osman support recurrence through a defined social network. Nuran supports memories or earlier-time scenes; a living present-day return would contradict this opening. Unnamed doctor, drummer and visiting children have no proper names here.

### The Night Watch

Sources: `apps/site/src/watch/sim/config.ts` WATCHERS / FOUNDER_KIN; `people.ts` watcherSpec / kinPerson / createKeeper; `life.ts` NAMES / newcomer / bear.

| Name | Role and authored prose | Authored traits |
|---|---|---|
| Tamar | 54; watcher. Sling, steady. | emotionality=0.2, conscientiousness=0.85, agreeableness=0.45, extraversion=0.35, honesty=0.6, openness=0.4 |
| Kian | 16; watcher. Fast, eager. | emotionality=0.6, extraversion=0.75, conscientiousness=0.4, agreeableness=0.6, openness=0.8, honesty=0.6 |
| Mara | 34; watcher. Best sight. | emotionality=0.7, agreeableness=0.7, conscientiousness=0.6, extraversion=0.45, openness=0.5, honesty=0.7 |
| Joss | 38; watcher. Smith, strong. | emotionality=0.35, agreeableness=0.3, conscientiousness=0.65, extraversion=0.5, openness=0.35, honesty=0.6 |
| Yunus | 61; watcher. Miller, calm. | emotionality=0.2, agreeableness=0.8, conscientiousness=0.7, honesty=0.85, extraversion=0.4, openness=0.5 |
| Ruslan | 45; watcher. Spear, newcomer. | emotionality=0.75, agreeableness=0.5, conscientiousness=0.55, extraversion=0.3, openness=0.6, honesty=0.65 |
| Lena | 10; daughter of Mara and Joss; initially at home. | No explicit traits in kinPerson. |
| Pell | 7; son of Mara and Joss; initially at home. | No explicit traits in kinPerson. |
| Ada | 8; Kian’s little sister and ward; parents are gone, unnamed. | No explicit traits in kinPerson. |
| Keeper | Male, 40; player-facing keeper of the wall; full Person holding impressions, never stepped. | No explicit authored traits. |

Tamar mentors Kian; her reserve hides pain (pain=0.85, fear=0.6). Mara and Joss are spouses. Joss distrusts Ruslan; Ruslan is a newcomer. Yunus is Tamar’s friend and prays. Founders and kin are strong recurrence candidates, but age, death and migration depend on the run; freeze one continuity before reusing them. Keeper is a role-name rather than a proper personal name.

#### Generated names (pool entries, not fixed authored people)

Female: Nell, Iva, Sena, Maren, Dilan, Petra, Yara, Elif, Rosa, Tova, Asel, Brin, Hale, Inge, Leyla, Mira, Noor, Oda, Saba, Wren, Zehra, Agnes, Cansu, Edda, Fern, Gul, Hana, Jale, Kira, Lise.

Male: Oren, Tobi, Emre, Bram, Davit, Hamid, Ivo, Luka, Nico, Rafe, Sami, Teo, Umut, Vas, Aras, Bo, Cem, Dario, Efe, Finn, Goran, Hugo, Ilya, Jonas, Kerem, Lev, Matti, Nazim, Osman, Piet.

Newcomers get each of six traits as `0.25 + 0.5 × seeded random`, with no fixed profile per name. Children use HF birth and parental transmission, not a fixed name profile. `freshName` avoids names of cast members whose status is exactly `here`, then falls back to the full sex-specific pool if no unused name remains. Coming, dead and departed cast members do not reserve names. Names can therefore be reused after death or departure. A name-pool match (notably Osman) does not establish identity with a character in another game. Recurrence requires an explicit identity decision and a saved run, not name matching.


## 8. Recommended recurring cast after the probe

| Candidate connection | Why it could work | Required identity decision |
|---|---|---|
| Pass Zeynep → Good Hands guest cook | Same modern occupational world; carried skill matters | New guest identity, distinct from Good Hands' sixteen-year-old Zeynep and Hearsay's teacher Zeynep. First probe only. |
| Murmur Dilan → Hearsay delivery visitor | An ordinary delivery worker fits a tea-garden encounter | Author geography and chronology; keep Aylin and depot Murat as her own relations. |
| Stairwell Derya → Hearsay / Good Hands nurse contact | Shift work and a placement reference can expose a recognizable constraint | Derya the 44-year-old Istanbul night nurse is not automatically Hearsay's Derya or Good Hands' architect. |
| Voice Selin → Good Hands household enquiry | Daughter caring about a parent's health gives an ordinary reason to seek help | Preserve Halil, deceased Nuran and Selin's city/family history; no automatic merger with a current household. |
| Warren Yusuf Usta → Valley remembered or visiting craft expert | Existing practical skills and age make a period-cluster connection plausible | Establish period/geography and time order first. Keep Well Yusuf, Valley Yusuf and Good Hands Yusuf separate. |
| Watch Tamar ↔ Rope Tamar | Recognizable mentor role could support an authored counterpart | Ages 54 vs 52, histories and settings differ. Distinct counterpart ids unless owner deliberately reconciles them; Rope is frozen. |

These are options for a later slate, not six authorized integrations. A repeat cast should add familiar people to ordinary encounters across several games over time. It should not explain away different ages, jobs and families as one sprawling canon.

## 9. Independent review

One independent Codex reviewer read the full proposal and checked selected primary game/telemetry sources on 2026-10-23. It found two P2 issues, both resolved in this design:

- Durable branch/revision/snapshot metadata could reconnect recording identities after off/on. The design now names that risk, requires a fresh explicit historical-linkage choice for a continuing persona in a new recording epoch, blocks every persona-run upload path until that choice, and adds the reset case to the privacy proof.
- Rejecting every pending commitment made Zeynep ineligible because her family promise and shift repeat. The design now maps exactly the family obligation, requires an authored source-side release of the job chain, and rejects unsupported obligations.

The reviewer found no other blocking issue in source spot checks. The census is a systematic source scan, not a formal proof that no narrative proper name was missed. Raw review and resolution receipts are retained in `~/code/.lab-scratch/sweep/universe-review.md`. No second review is claimed.

## 10. Three decisions for the owner

1. **Which two games and person start?** Recommend **The Pass → Good Hands, Zeynep**, one optional short cook placement with one mapped skill and one actual work-history fact. Approve this probe only; leave the 14-game rollout and frozen hosts untouched. Review feasibility and the owner's play by 2026-11-03.
2. **What continuity should the probe promise?** Recommend **explicit chapter-boundary transfer in a local browser shelf, with file fallback**, strict allowlist, pinned replay snapshot, visible omissions and explicit forks. Recurring identity is canonical; a player's branch is private fiction. Cloud sync and real-player trait inference remain outside this probe.
3. **Should the Commons follow immediately?** Recommend **a separate owner decision after the probe verdict**. Keep the marketplace as a direction. Before any shared online place, decide the infrastructure lift, authentication, authority, moderation, retention, cost and acceptance artifact. The current task builds none of it.
