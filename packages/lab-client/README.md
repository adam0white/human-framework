# @adam0white/lab-client

The browser client for the Human Framework game lab. A game uses it for two things:

1. **Anonymous play events.** Session start and end, duration, milestones the game declares, the last screen before the player left, the build (commit, HF version, game version) and a viewport class (phone, tablet, desktop). Batched and sent with a keepalive `fetch` (like `sendBeacon`, but with credentials omitted). No cookies, no fingerprinting, no personal data. The session id is random and lives in the tab's sessionStorage only. Nothing is sent under Do Not Track or Global Privacy Control, when the player turned events off, or from localhost.
2. **"Send this run to the notebook".** A dialog in the Field Notebook style, phone-first, that shows exactly what will be sent and then sends the game's own playtest export, gzip-compressed, with an optional note and an optional "who you are" label. Stored privately; never published.

Privacy note for players: https://human.adamwhite.work/lab/privacy/. Endpoint and storage: `apps/site/worker/lab.ts` in this repository. Public dashboard: https://human.adamwhite.work/lab/ and `/lab/data.json`.

## Install

Until the first npm publish (an owner step, see below), install the release tarball by URL:

```sh
npm install https://github.com/adam0white/human-framework/releases/download/lab-client-v0.1.0/adam0white-lab-client-0.1.0.tgz
```

After it is on npm: `npm install @adam0white/lab-client`.

## Add it to a game (about 15 lines)

1. **CSP.** In the game's `public/_headers`, add `https://human.adamwhite.work` to `connect-src`. Without it the browser silently blocks every send.
2. **Create the client once**, at startup. It reads `/release.json` (commit, framework, app) by itself if the game stamps one; otherwise pass `build`.

   ```ts
   import { createLab } from '@adam0white/lab-client';
   export const lab = createLab({ game: 'pass' }); // the game's subdomain
   ```
3. **Name screens and milestones** where the game changes screen or reaches something. Use short, stable, non-personal names; never put player text in them.

   ```ts
   lab.screen(`night ${s.night}: service`); // the last one before leaving is the quit point
   lab.milestone(`service ${s.night} done`); // each name counts once per session
   ```
4. **Offer the dialog** beside the existing "download run" button:

   ```ts
   button.addEventListener('click', () => lab.openSendDialog({ getRun: () => exportRun(s, FRAMEWORK_VERSION) }));
   ```
5. Check: `npm run check`, build, deploy. Then open the live game, send a run with the note "integration test" and the label "agent", and confirm it on https://human.adamwhite.work/lab/ (the run count) within five minutes.

To test against a local lab Worker (`npx wrangler dev --port 8799` in this repository), pass `endpoint: 'http://localhost:8799/lab/api'` and `sendFromLocalhost: true`.

## API

- `createLab({ game, build?, endpoint?, captureErrors?, sendFromLocalhost? })` returns a `Lab`.
- `lab.screen(name)`, `lab.milestone(name)`, `lab.flush()`.
- `lab.eventsOn`, `lab.setEventsOff(off)`: the player's per-game opt-out, kept in localStorage.
- `lab.sendRun(run, { note?, who? })`: resolves to the run's reference id (`r-…`).
- `lab.openSendDialog({ getRun, title?, who?, onSent? })`.
- Helpers: `privacySignal`, `viewportClass`, `runEnvelope`, `gzip`.

Error messages are captured by default (message text only, query strings cut, at most 5 per session, 80 characters each). Pass `captureErrors: false` to turn that off.

## Which games use it

Integrated on 2026-10-19: The Pass (`pass`), The Glance (`glance`), The Two Voices (`murmur`). Left for their builders, with the steps above: The Rope, Small Works, Neighbours, The Valley, and the in-site games (Twice at the Well, The Day You Say Nothing, The Night Watch), which were being changed by other agents at the time. In-site games are on the same origin as the endpoint, so they need no CSP change and can pass `endpoint: '/lab/api'`.

## Publishing

`npm pack -w packages/lab-client` builds the tarball. A GitHub release tagged `lab-client-vX.Y.Z` with that tarball attached is the install-by-URL path. The workflow `.github/workflows/publish-lab-client.yml` publishes to npm with provenance once the package exists on npm: the owner publishes the first version by hand (`npm login`, then `npm publish -w packages/lab-client`) and adds that workflow as the trusted publisher on npmjs.com.
