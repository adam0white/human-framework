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

The server budget is at most 2,000 linked records and 32 MiB compressed per UTC day. At both daily caps, 180 days holds at most 5.625 GiB of linked payload before overhead; this is a ceiling, not measured use. Assuming one object plus one daily-manifest update per accepted record, ingestion is about 4,000 writes/day (720,000 over 180 days), plus root updates, retries, repair and lifecycle work. Legacy explicit run uploads have a separate 8 MiB/day ceiling, bringing retained payloads to at most 7.032 GiB over 180 days. Request, storage and operation charges depend on Cloudflare's current pricing and account allowances; no new AI calls are automatic. Existing Workers AI experiment budgets and the optional inbox suggestion spend stop remain unchanged.
