# @adam0white/lab-client

The browser client for the Human Framework game lab. A game uses it for two things:

1. **Anonymous play events.** Session start and end, duration, milestones the game declares, the last screen before the player left, the build (commit, HF version, game version) and a viewport class (phone, tablet, desktop). Batched and sent with a keepalive `fetch` (like `sendBeacon`, but with credentials omitted). No cookies, no fingerprinting, no personal data. The session id is random and lives in the tab's sessionStorage only. Nothing is sent under Do Not Track or Global Privacy Control, when the player turned events off, or from localhost.
2. **"Send this run to the notebook".** A dialog in the Field Notebook style, phone-first, that shows exactly what will be sent and then sends the game's own playtest export, gzip-compressed, with an optional note and an optional "who you are" label. Stored privately; never published.

Privacy note for players: https://human.adamwhite.work/lab/privacy/. Endpoint and storage: `apps/site/worker/lab.ts` in this repository. Public dashboard: https://human.adamwhite.work/lab/ and `/lab/data.json`.

## Install

Until the first npm publish (an owner step, see below), install the release tarball by URL:

```sh
npm install https://github.com/adam0white/human-framework/releases/download/lab-client-v0.1.2/adam0white-lab-client-0.1.2.tgz
```

After it is on npm: `npm install @adam0white/lab-client`.

## Add it to a game (about 15 lines)

1. **CSP.** In the game's `public/_headers`, add `https://human.adamwhite.work` to `connect-src`. Without it the browser silently blocks every send.
2. **Create the client once**, at startup. It reads `/release.json` (commit, framework, app) by itself if the game stamps one; otherwise pass `build`.

   ```ts
   import { createLab } from '@adam0white/lab-client';
   export const lab = createLab({ game: 'pass' }); // the game's subdomain
   ```
3. **Name screens and milestones** where the game changes screen or reaches something. Declare the game id and each exact screen and milestone name in `apps/site/src/lab/games.ts` first. The server rejects unknown games and drops undeclared names. Never put player text in names. New integrations can use screens `title`, `play`, `ending` and milestones `run started`, `ending reached`; game-specific names need a reviewed declaration.

   ```ts
   lab.screen(`night ${s.night}: service`); // the last one before leaving is the quit point
   lab.milestone(`service ${s.night} done`); // each name counts once per session
   ```
4. **Offer the dialog** beside the existing "download run" button:

   ```ts
   button.addEventListener('click', () => lab.openSendDialog({ getRun: () => exportRun(s, FRAMEWORK_VERSION) }));
   ```
5. Check: `npm run check`, build, deploy. Then open the live game, send a run with the note "integration test" and the label "agent", and confirm it on https://human.adamwhite.work/lab/ (the run count). The run index is repaired by the ten-minute cron if a concurrent update temporarily misses the upload.

To test against a local lab Worker (`npx wrangler dev --port 8799` in this repository), pass `endpoint: 'http://localhost:8799/lab/api'` and `sendFromLocalhost: true`.

## API

- `createLab({ game, build?, endpoint?, captureErrors?, sendFromLocalhost? })` returns a `Lab`.
- `lab.screen(name)`, `lab.milestone(name)`, `lab.flush()`.
- `lab.eventsOn`, `lab.setEventsOff(off)`: the player's per-game opt-out, kept in localStorage and synchronized across open tabs on the same origin. Turning events off clears queued events in those tabs.
- `lab.sendRun(run, { note?, who?, compact?, compactNote? })`: resolves to the run's reference id (`r-…`).
- `lab.openSendDialog({ getRun, title?, who?, compact?, compactNote?, onSent? })`.
- Helpers: `privacySignal`, `viewportClass`, `runEnvelope`, `gzip`, `RUN_LIMITS`, `checkRun`.

Uncaught errors are counted by default as their type and place only (for example `TypeError at app.js:12:5`), never the message text, at most 5 per session. Pass `captureErrors: false` to turn that off.

## Large runs

`RUN_LIMITS` exports the notebook caps as `inflatedBytes`, `compressedBytes`, `tokens`, `containers`, and `depth`. `checkRun(text)` returns whether serialized text fits the inflated UTF-8 and structural bounds. It scans quoted strings and escapes without parsing JSON; it does not validate syntax, game schemas, or replayability. Pass the whole envelope, including notes and build information.

`sendRun` and `sendEnvelopeText` refuse an oversized or overly complex envelope before gzip or upload. They also refuse a gzip body above the compressed limit before upload. An under-limit run keeps the exact 0.1.1 envelope format.

A game may supply `compact(run) => unknown`. It is called once, only when the full envelope exceeds the inflated or structural bounds. Its replacement is rechecked in an envelope with `compacted: true`; a replacement that still exceeds a bound is refused. Compression alone never triggers compaction. `compactNote` explains the replacement in the dialog; the default is “This run was shortened to fit the notebook.” The dialog shows the exact replacement and that explanation before enabling Send. Neither function compacts a run silently after consent.

Prefer a replayable seed-and-inputs export without redundant snapshots, while retaining the version/build metadata the game's replay loader needs. The game owns that export shape and must verify its compact form still replays. For example, if the game's export has these fields:

```ts
lab.openSendDialog({
  getRun: () => exportRun(state),
  compact: (run) => {
    const { seed, inputs, build, version } = run as GameExport;
    return { seed, inputs, build, version };
  },
  compactNote: 'The seed, inputs and replay version are included; state snapshots are omitted.',
});
```

## Which games use it

The integrations cover The Pass, The Glance, The Two Voices, The Rope, Small Works, Neighbours, The Valley, The Stairwell, The Warren, and the three in-site games (Twice at the Well, The Day You Say Nothing, The Night Watch). Each game's repository records its deployment; Neighbours stays local until its evidence gate passes. In-site games are on the same origin as the endpoint, so they need no CSP change and can pass `endpoint: '/lab/api'`.

## Publishing

`npm pack -w packages/lab-client` builds the tarball. A GitHub release tagged `lab-client-vX.Y.Z` with that tarball attached is the install-by-URL path. The workflow `.github/workflows/publish-lab-client.yml` publishes to npm with provenance once the package exists on npm: the owner publishes the first version by hand (`npm login`, then `npm publish -w packages/lab-client`) and adds that workflow as the trusted publisher on npmjs.com.


## Server limits and retention

The Worker accepts up to 2 MiB compressed and 3 MiB inflated per run. Before parsing JSON it rejects more than 45,000 containers, 360,000 structural tokens, or 64 levels of nesting. The limits bound allocation, not just transfer size. A conditional R2 counter reserves up to 200 uploads per UTC day; a failed store consumes its reservation, and bounded retries can refuse uploads under contention. The first counter includes runs already stored that day. Requests still running an older deployment are outside the new counter during cutover. Per-address (/64 for IPv6) and shared per-location ingress limits apply before decompression.

Anonymous events have a conditional R2 admission limit of 1,000 batches per UTC day. This is a deliberate small-lab capacity limit: excess or contended requests fail before storage acceptance; failed storage can consume a reservation. It bounds the retained aggregation state to at most 1,000 sessions. Rates and daily capacity are separate limits.

Recent event counts are provisional. A dashboard rebuild reads at most ten raw batches across its whole seven-day window and one run-list page per day; incomplete counts are marked sampled. Cleanup advances every ten minutes, at most 24 raw reads per invocation. A day becomes eligible when its UTC date is at least two calendar days behind today (not a promise of 48 hours after each upload). It saves a private session checkpoint with conditional writes, resumes without double counting, and stores an exact final aggregate before deleting any raw batch. Checkpoint session ids are cleared before raw deletion starts. ID-free completion markers remain so a delayed initial writer cannot recreate a checkpoint after cleanup. Backlogs and outages extend retention. Older days exceeding 1,000 raw batches are retained intact, marked deferred in `data.json`'s `window.deferredDays`, and need offline recovery; later days still progress. The private run index rebuild also advances one page per invocation. No paid-plan limit or higher billing tier is assumed.

Raw event objects and private runs also have an exact R2 upload timestamp. Final daily aggregates contain no session ids. Runs, notes, labels and their upload timestamps remain private until removed by request or when no longer needed. Stored totals from older deployments whose raw batches were already deleted cannot be reconstructed.


The Worker validates the generic run envelope and JSON complexity, not a game's complete export schema. The game adapters use incompatible seed/input/state layouts and own replay validation. Requiring one new shared export shape here would reject supported adapters and would not prove that a submitted run is genuine. Notes and run bodies stay private; arbitrary screen and milestone text never becomes a public label.
