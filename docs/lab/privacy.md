# Lab privacy

> Current-client clarification, 2026-10-25. Automatic records do not add a name; Feedback can include an optional name, and duplicate names do not merge identities. Feedback has verdict, note, optional name and Submit on one page. Participating games continue fictional people automatically on this device, with no separate continuing-person switch or consent gate. One Recording switch controls recording and linkage; character analysis still requires separate opt-in. Continuing-person state can connect earlier recordings after an identity reset. Central outgoing links may carry a short-lived recording-identity fragment that the destination validates and removes. Game adoption remains separate. The older “no name”, “Send word” and “separately enable” statements below require these corrections.

Updated 2026-10-23. This is the text source for [/lab/privacy/](https://human.adamwhite.work/lab/privacy/).

## Automatic linked play records

The first-visit notice says: “The lab records your play and links it across games on this device to your continuing people. Switch recording off in the menu.”

Games using the new lab client send play events (start/end, elapsed time, named screens and milestones, viewport class), client error and warning text, game log lines, replay exports and saves automatically while telemetry is on. Collection is on by default. Feedback text is sent only when you press Submit. Game exports can include seed, inputs, game time, simulated people and world state. The lab does not record unrelated typing or browser activity. Do not put personal details in feedback or game fields that enter a save.

Each record includes a random player id, session id and run id, a content-derived record id, game, record kind, timestamp, build commit, HF version, game version and payload. These ids connect events, logs, feedback, saves and replays. They do not establish who a person is. The new protocol stores no name, email, account, cookie, IP address, user agent or device fingerprint.

The player id is stored in localStorage on human.adamwhite.work. An embedded identity page shares it with approved game origins through origin-checked messages. This links visits across those games in the same browser when the embedded page can use its storage. Browser restrictions or a blocked identity page may prevent that link; a fallback id then covers only the game's own origin. Separate browsers, cleared storage and private sessions are not automatically linked. Session and run ids identify a visit and a particular playthrough, respectively.

Turn telemetry off in each game's menu. This stops uploads, aborts pending requests and removes the stored player id. Already received records remain subject to retention; turning telemetry back on creates a new id. The shared identity page carries this choice across connected game tabs. A blocked bridge can only apply the choice locally. Do Not Track and Global Privacy Control set recording off by default. Turning the single recording switch on explicitly opts in, including when either browser signal is on. Localhost is off unless a developer explicitly enables it.

Linked records and legacy run uploads are private. The people building the games use them to reproduce faults, replay choices, compare builds and connect feedback to what happened. Complete save and replay chunks are reassembled within the same player, game, session, run, kind and upload id. Missing or conflicting chunks are labelled incomplete, not treated as a replay. Upload limits can leave gaps; automatic collection is not a promise to receive every run.

Linked records, runs and their private indexes expire after 180 days under storage lifecycle rules. Storage deletion usually follows within 24 hours. Pending local uploads are capped at 16 MiB and expire after seven days. Copies already downloaded by the owner are private local files and require separate deletion; the storage lifecycle does not delete them. Give Adam a player or run reference to request removal, or open a [repository issue](https://github.com/adam0white/human-framework/issues) without posting the private export. Turning telemetry off does not delete earlier uploads.

Send word has verdict, note, optional name and Submit on one page. When recording is on, Submit includes the note and available run and links them. When recording is off, one unticked checkbox says “Share this run and my play with the lab”. Ticking it and pressing Submit explicitly enables recording and linking, even with DNT/GPC. Leaving it unticked sends only the note, without run or play-history linkage.

## Existing event counts and manually sent runs

Older clients still send anonymous event batches and offer an explicit run-send dialog. The legacy run envelope can include an optional note and optional “who you are” label. It receives an `r-…` reference. Those voluntary labels remain in the private legacy record; the new linked protocol adds no name or contact field. Keep personal details out of notes and labels. Public feedback quotes must concern the game and omit personal detail.

Legacy raw event batches become eligible for cleanup when their UTC date is at least two calendar days behind today. Counts must be saved before deletion finishes; outages or backlogs extend this period. Final daily counts contain no session ids. Public [/lab/data.json](https://human.adamwhite.work/lab/data.json) contains aggregate counts and curated feedback, not linked records, saves or replays. Existing aggregate processing bounds and privacy controls remain in place.

## Fictional people between games

You can separately enable fictional-person continuity in participating games. An approved part of that person's state is kept on a browser shelf at human.adamwhite.work. Games checkpoint it when you leave or reach a chapter boundary. A new admitting game can use it automatically. A loaded run keeps its original arrival. One active history belongs to each person. Competing histories require an explicit fork. Fresh play stays available.

The [shelf](https://human.adamwhite.work/lab/people/) lets you inspect, download, import and delete these local histories. Browser storage can be lost. A downloaded file is your backup. The shelf does not provide cross-device sync. That requires a separate owner decision. No new server stores or serves fictional-person state. Deleting continuity does not delete exported files or lab records already received.

Recorded play is linked automatically across games on this device, including continuing people and imported histories. Continuing-person state can also connect earlier recordings after a recording identity reset. There is no separate linkage prompt. Switch recording off in the menu to stop future recording and linking. Local continuity can remain on. This does not authorize character analysis.

## Character analysis remains a separate choice

Automatic collection does not opt you into the player character test. That test may use your own earlier saves and replays only after you separately opt in. Inferred traits must stay visible and editable. Linked inbox exports make the files available for that approved flow; this change does not add automatic personality inference or automatic AI processing.

## Hosting and other services

Cloudflare sees an IP address to serve a request. The lab uses it in memory for rate limits and does not store or log it. Worker request logs are off. Cloudflare Web Analytics is a separate cookieless page-view counter. Fonts may come from Google Fonts. These services are separate from linked play collection.

The [client](https://github.com/adam0white/human-framework/tree/main/packages/lab-client) and [endpoint](https://github.com/adam0white/human-framework/blob/main/apps/site/worker/lab.ts) are open source. Games adopt the new client separately, so a game still using the older dialog follows the legacy behavior described above.
