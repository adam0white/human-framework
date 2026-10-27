# Linked telemetry, 2026-10-22

> Current-client clarification, 2026-10-25. The first-visit notice covers recording and linking play across games on this device. One Recording switch explicitly opts in despite DNT/GPC. Central outgoing links may carry a short-lived identity fragment; the destination validates the direct central referrer, destination and age, then removes it immediately. This changes future recording identity, not earlier records. These statements qualify the older notice and URL-free linkage description below. Adoption differs by game.

Owner direction: [verbatim](../owner-directions-2026-10-18.md#2026-10-22-linked-telemetry-adam-verbatim). The output is collection and private inbox plumbing. Game-specific save-screen redesign is outside this change.

The first-visit notice is: “The lab records your play to improve the games. Turn off in the menu.” The [privacy text](privacy.md) is also served as HTML at `/lab/privacy/`.

## Protocol and scope

`POST /lab/api/linked` accepts gzip JSON `{v:2,id,player,session,runId,game,kind,at,build,data,name?:string,privacyOverride?:true}`. All ids are 32 lowercase hex characters. `kind` is `events`, `run`, `save`, `logs` or `note`. `at` is epoch milliseconds. `build` retains the reviewed `c`, `hf` and `a` fields. Player, session and run ids are random; record and upload ids are hashes of the linked content, not device fingerprints. Feedback notes may carry an optional top-level `name`, trimmed to at most 60 characters; automatic records do not add names. The dialog remembers submitted names in origin-local device storage and prefills later feedback. The private inbox labels the whole player timeline with its latest non-empty feedback name in the fetched window. Legacy `who` or `name` labels can be shown as possible matches only when they exactly match one current name or player id. Duplicate names never merge ids, and names are unverified. The protocol stores no emails, IP addresses or cookies.

The central `/lab/identity/` iframe holds player identity and the off preference in human.adamwhite.work localStorage. Parent and frame check message origins against approved lab origins. This permits cross-subdomain linkage without a cookie or an id in a URL. Storage partitioning, blocked frames or an unavailable bridge can prevent linkage. The fallback is explicitly origin-scoped. Different browsers and storage resets do not automatically join. Record linkage says “this browser identity”, not “this person”.

Automatic collection remains suppressed on localhost and under DNT/GPC, unless the player explicitly chooses the per-game browser-signal override. Off stops uploads, aborts pending requests and removes the player id; the shared bridge propagates it across connected tabs. Already received objects are not deleted by switching off. A new on choice creates a new identity.

The client snapshots replay exports every 60 seconds and on hide; saves are captured when saved. Pending local uploads use IndexedDB with a 16 MiB / 256-piece cap. Automatic pieces expire after seven days and retry five times before dropping. Explicit notes take priority, require a stored HTTP 200 receipt, and remain for retry until stored or recording is switched off. The feedback dialog retains submitted text until the receipt and reports failures. Lifecycle termination, quotas, offline periods and bounds can leave gaps. Warn/error console text is bounded and scrubbed; game logs require the game's adapter. This is not unrestricted browser logging or capture of unrelated typing.

Run/save chunk payloads are `{encoding:'json',upload,index,total,text}`. The upload id is 32 hex characters, index is zero-based and total is at most 128. The client uses at most 64 Ki UTF-16 characters per text chunk and at most 16 MiB of serialized JSON. Each request is bounded at 256 KiB gzip and 512 KiB inflated. Complete uploads are assembled only when player, game, session, run, kind and upload all match. Conflicting duplicate chunks, missing chunks and invalid assembled JSON produce a visible incomplete status; they never produce a misleading replay export.

## Private retrieval

`npm run lab:inbox -- --days=30` retains the legacy run inbox and adds linked groups. It uses the owner's Wrangler login. Nothing is made public. The optional `--suggest` flow still applies only to voluntarily sent legacy feedback notes; linked records are not sent automatically to Workers AI.

| Private storage                                          | Contents                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `private/linked-index.json`                              | Receipt days available in daily manifests                               |
| `private/linked-index/YYYY-MM-DD.json`                   | Bounded daily record metadata with object keys and linkage              |
| `linked/<player>/<id>.json.gz`                           | Original compressed envelope, at an invariant deduplication key         |
| `.lab-inbox/linked/<player>-<id>.json`                   | Downloaded envelope on the owner's machine                              |
| `.lab-inbox/linked/<player>-<game>-<session>-<run>.json` | Chronological linked records                                            |
| `.lab-inbox/linked-replay/`                              | Complete replay exports, ready for the game's existing replay loader    |
| `.lab-inbox/linked-save/`                                | Complete save exports; the game's own save loader decides compatibility |

The receipt day and play timestamp can differ on delayed retries. Inbox filtering uses receipt manifests, so it may contain older play timestamps. Index/envelope linkage mismatches stop retrieval visibly. R2 lifecycle retention does not delete local inbox copies. Local copies require a separate owner deletion pass.

## Player character test

The existing approved flow is the [roadmap exception](../hf-roadmap-2026-10-20.md): after a player separately opts into the character test, their own saves and replays, including earlier ones, may be used; inferred traits remain visible and editable. The linked inbox makes those exports available. Automatic collection does not supply that consent, and this change adds no inference worker or questionnaire. A browser id is not proof that all its records came from the consenting person.

## Retention and bounded cost

Private linked records, legacy runs and private indexes expire after 180 days under R2 lifecycle rules. Legacy event raw data retains its separate two-calendar-day cleanup eligibility and aggregation-before-delete rule. Public aggregates remain free of player/session ids. Partial downloads and local copies require explicit local cleanup.

The server budget is at most **20,000 linked reservations and 256 MiB compressed per UTC receipt day**, shared across games and human/agent sources. Failed stores retain reservations; retries of the same key and size spend none. At 180-day retention, the linked payload ceiling is 45 GiB (48.32 GB), plus the separate legacy-run ceiling of 8 MiB/day: 46.40625 GiB (49.83 GB) combined. Private manifests/counters and event projections add storage; these payload figures exclude them. Live R2 lifecycle rules for `linked/`, `private/`, `runs/` and the raw safety rule remain 180 days.

Measured R2 counters and daily indexes on 2026-10-27:

| UTC day    | Reservations | Compressed reserved bytes | Indexed records | Indexed bytes |
| ---------- | -----------: | ------------------------: | --------------: | ------------: |
| 2026-10-24 |          616 |                 1,613,230 |             609 |     1,606,576 |
| 2026-10-25 |          569 |                 3,035,891 |             546 |     3,019,921 |
| 2026-10-26 |        2,000 |                14,668,549 |           1,989 |    14,630,400 |

The new ceilings give 10× object and 18.3× byte headroom over the largest admitted day. Oct 26 was censored by the old object ceiling; refused demand is unknown. This is a capacity estimate, not a guarantee that future traffic cannot fill it. Counter/index gaps include interrupted stores and indexing. Keep the existing per-request, per-location ingress and legacy event limits.

Linked reservation exhaustion returns **429**, JSON `code: "daily_capacity"`, and `Retry-After` seconds until the next UTC midnight. Reservation, index or directory CAS contention returns **503**, `code: "capacity_busy"`, and `Retry-After: 1`. Reservation state rejected by the existing shape/size checks fails closed with **503**, `code: "capacity_unavailable"`, and `Retry-After: 60`. CORS exposes `Retry-After` to host SDKs. Already stored records can still repair/acknowledge at a full budget. These responses do not fix older SDKs' five-failure deletion or missing idle retry timer; SDK publication and host adoption remain separate.

Cost estimate at the full ceilings and a steady 180-day retention window (30-day billing month): four successful R2 writes per new linked record (reservation, payload, daily index, directory) mean 80,000/day, 2.4 million/month or 14.4 million over 180 days. Linked event projections add up to two writes per projected batch within the separate shared 1,000/day event ceiling. Four base reads per record give about 2.4 million/month before event work, retries and inbox reads. Stored objects do not incur a new ingestion charge every month. CAS failures, repair, cron lists and retries add operations.

[Cloudflare R2 Standard pricing](https://developers.cloudflare.com/r2/pricing/) checked 2026-10-27: $0.015/GB-month, $4.50/million Class A operations, $0.36/million Class B operations, free egress. Account-wide monthly free allowances are 10 GB-month, 1 million A and 10 million B; billing rounds usage up to whole units. At full steady payload occupancy, storage alone rounds to 50 GB: $0.75/month gross, or $0.60 with the whole storage allowance available. Extrapolating Oct 26's 922,485 bytes of counter/index JSON to 20,000 records/day adds about 1.66 GB retained; payload plus that metadata rounds to 52 GB ($0.78 gross / $0.63 with allowance). Metadata is an estimate, not a hard ceiling. Base writes plus bounded event projections still round to 3 million A: $13.50 gross / $9 with the whole A allowance; base reads round to 3 million B ($1.08 gross / $0 within allowance). Thus an illustrative full-load steady month is about **$15.36 gross**, or **$9.63 with those account allowances available**, before additional retries, reader traffic, other R2 use and event storage. The six-month storage retention window is not a six-month billing estimate. No new AI calls are automatic; existing Workers AI budgets remain unchanged.

## Self-declared source candidate (2026-10-26)

Optional linked envelope metadata `runSource: 'agent'` identifies self-declared agent activity on all five linked kinds: events, run, save, logs and note. `parseLinked` rejects any other explicit value, including null. Missing legacy metadata remains absent and means UNATTRIBUTED, never verified human. Canonical stored envelopes, R2 custom metadata and private linked-index entries retain the marker. The event aggregate projection remains lossy and cannot classify human evidence; use canonical linked records or their private index for source separation.

The client accepts typed `LabOptions.runSource` or public URL query `labRunSource=agent` at creation. It never persists a source preference or infers one from browser automation, identity or fictional cast. Agents mark each destination URL explicitly. Each journal and compressed pending piece retains its original optional source across flush, retries, reload and chunking. Source participates in new tagged content IDs to avoid collisions with untagged pieces; legacy untagged IDs keep their existing formula. Native replay payloads and portable-person records are unchanged.

The label changes no consent or Recording decision and submits no note. Unlinked legacy exports and explicit unlinked note-only feedback remain outside this linked protocol. This is source-only work awaiting independent review, new SDK artifacts, backend deployment and host adoption. Historical released bytes and existing evidence claims remain unchanged.
