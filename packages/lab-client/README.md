# Lab client

Default-on, pseudonymous play recording for the HF game lab. The visible notice and menu toggle come from `@adam0white/lab-kit`. Games supply full replay exports and actual saves. Screens remain game-owned.

```ts
const lab = createLab({ game: 'pass' });
const stop = lab.trackRun(() => exportReplay(), { runKey: () => runGeneration });
lab.captureSave(savedValue); // after a successful save
lab.log('game', 'The crossing opened.');
await lab.sendFeedback('The crossing was unclear.'); // queues a note linked to the current run
```

Every automatic record has a random player id, session id and run id, plus game/build and timestamp. The central identity frame shares localStorage identity across lab subdomains using checked messages; blocked frames fall back to an origin-scoped id. No cookies or device fingerprinting. Warn/error console strings and uncaught errors are bounded; game logs come from the adapter. Common email strings and URL queries/fragments are removed from client logs. Arbitrary console objects and browser headers are never read.

`lab.telemetryOn` reports the effective choice. `lab.setTelemetryOff(true)` stops automatic and explicit uploads, clears the local queue, aborts the active request and deletes the player id. The `eventsOn`/`setEventsOff` aliases control the same whole-recording preference. DNT/GPC suppress automatic recording unless the player explicitly selects `setPrivacyOverride(true)` for that game; a normal on toggle does not override a browser signal. Older explicit Send under a browser signal remains separately consented and unlinked.

Runs/saves are JSON, capped at 16 MiB and 128 chunks of at most 64 Ki UTF-16 characters. Each piece is at most 256 KiB gzip / 512 KiB inflated. IndexedDB holds at most 256 pending pieces / 16 MiB for seven days. Delivery retries politely up to five attempts. Stable content ids make server storage idempotent. Queueing does not prove delivery; `sendRun`, `sendFeedback` and the linked `sendEnvelopeText` resolve with an upload reference after queueing. The shared dialog labels that state honestly. `trackRun` snapshots every minute and on hide; browsers closing, offline periods and limits can leave gaps.

`sendFeedback(note)` requests a current snapshot before queueing a linked note. It does not opt the player into character analysis. `sendRun` and `openSendDialog` remain for current screens; the linked path drops the old optional `who` field. The privacy page lists retained legacy labels separately.

The site games provide full seed/input/state exports through their worker adapters. External games must adopt `trackRun`, successful-save capture, game logs and the kit notice/toggle; installing the package alone cannot supply their exports. Their CSP must permit `frame-src https://human.adamwhite.work` for cross-game identity. Collection stays off on localhost unless `sendFromLocalhost: true` is explicit.

Private ingestion: `npm run lab:inbox`. Retention, bounds and protocol: [linked telemetry](../../docs/lab/linked-telemetry-2026-10-22.md). Public privacy note: https://human.adamwhite.work/lab/privacy/.
