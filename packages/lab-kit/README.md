# @adam0white/lab-kit

Small plain-DOM components for lab games. No framework, simulation logic, automatic telemetry or font downloads. Version 0.1.0 is prepared for review; it is not published.

Import the CSS once. JavaScript exports are tree-shakeable; CSS is explicitly marked as a side effect.

```ts
import '@adam0white/lab-kit/tokens.css';
import { introCard, notebookMenu, nextLine, setNext } from '@adam0white/lab-kit';
```

## Paper and ink

`tokens.css` uses the exact palette in [Field Notebook](../../docs/design-language.md), with Literata and a Georgia fallback. Load Literata and Caveat yourself if desired. The default follows `prefers-color-scheme`; set `document.documentElement.dataset.theme` to `light` or `dark` to override it. Remove the attribute to follow the system again.

Use `.now` for the one current instruction, `.happened` for the journal, and `.flavour` for optional background. Buttons have visible borders, links have accent underlines, and controls have visible focus and at least 44px targets. Games own their scene layout and must check it at 360×690 visible CSS pixels.

## One-time hints

```ts
import { once } from '@adam0white/lab-kit';
if (once('pass:carry-hint:v1')) showCarryHint();
```

`once(key, storage?)` returns true the first time and false later. Keys must include the game's id when games share an origin. The default is localStorage under `hf-lab:once:`. Pass a `{ getItem, setItem }` store, or `null` for memory only. Storage getters, reads and writes may fail; memory still prevents repetition in this module instance. There is no cross-tab synchronization in the fallback. No clock or random value determines first use.

## First-minute card

```ts
const card = introCard({
  title: 'The crossing',
  goal: 'Get everyone across before dark.',
  steps: ['Choose who leads.', 'Pick a safe route.'],
  next: 'First, choose who leads.',
  key: 'pass:intro:v1',
  onClose: () => startGame(),
});
if (!card) startGame();
```

The card mounts and opens a native dialog. It returns that dialog, or `null` when already seen. The goal comes first. At most three steps render, followed by one Start button. Escape closes it too. `onClose` runs once after closure, not when skipped. The default once key uses pathname and title; use a stable explicit key for shared origins. Optional `storage` works like `once`. Keep the card below about 40 words and attach later hints to the controls they explain. The kit cannot judge your wording or pause your clock. Opening another kit sheet closes the previous one.

## Terms and glossary

```ts
import { defineTerms, term, glossaryPanel } from '@adam0white/lab-kit';
defineTerms({ kahya: 'steward', agha: 'landowner', kile: 'a measure of grain' });
journal.append('Ask the ', term('kahya'), ' about the store.');
help.append(glossaryPanel());
```

The first rendered occurrence shows `kahya (steward)`. Later occurrences start folded. Each word is a native button with `aria-expanded` and `aria-controls`; tap, Enter or Space toggles its explanation. The returned span fits within a sentence; do not nest it inside another button or link. `glossaryPanel()` returns a labelled definition list. `defineTerms` replaces the dictionary and resets occurrence tracking; call it once at game startup, not on each render. Unknown terms throw. Text is inserted as text, never HTML.

## English dates

```ts
import { englishDate, weekday, month, dayOf } from '@adam0white/lab-kit';
englishDate(new Date('2026-05-14T12:00:00Z')); // 'Thursday 14 May'
englishDate(Date.UTC(2026, 4, 14), true);     // 'Thursday 14 May 2026'
weekday(2);  // 'Tuesday'; Sunday = 0
month(5);    // 'May'; January = 1
dayOf(3, 12); // 'Day 3 of 12'
```

Dates use Gregorian UTC fields and fixed English names, independent of browser locale and timezone. Pass a Date or epoch milliseconds. The helpers reject invalid dates, non-integers and out-of-range days/months. Games with a separate fictional calendar should still show this planning date alongside it.

## What next

```ts
const line = document.createElement('p');
document.body.append(line);
nextLine(line);
setNext('Choose who carries the rope.');
```

`nextLine(el)` registers the one fixed-bottom instruction line and marks it `.now`, `aria-live="polite"`, `aria-atomic="true"`. `setNext(text)` updates it with text. Register a replacement after rebuilding the DOM; the old line loses its live attributes and kit classes. Calling `setNext` before registration throws. Reserve space beneath your scene and actions for the line's actual rendered height so it cannot cover controls. Instructions belong here as well as in the journal.

## Notebook and exports

```ts
import { createLab } from '@adam0white/lab-client';
import { notebookMenu } from '@adam0white/lab-kit';
const lab = createLab({ game: 'pass' });
footer.append(notebookMenu({
  lab,
  getRun: () => exportRun(),
  filename: 'pass-playtest.json',
  compact: (run) => compactRun(run),
  compactNote: 'Seed and inputs reproduce the full state.',
  onSave: () => saveGame(),
}));
```

One Notebook button opens a sheet containing Save (when `onSave` exists), Download the playtest export, Send this run to the notebook, regular-event controls (when the lab exposes them), and Lab privacy. The menu closes before the client dialog opens. Save success and failures are announced. `getRun` is read at action time; download always includes the complete export, never the compact form. The game must provide seed, input log and state, prove replay, and offer Continue with a location summary on its returning-player screen.

The client is an **optional peer**, `@adam0white/lab-client >=0.1.1`. Pass an existing lab; the kit does not create one. Omitting `lab` keeps download and Save available and explains why sending is unavailable. This also lets browser automation use the menu without initializing telemetry. Honor the client's privacy signals; never force telemetry on for a test.

Compaction options are forwarded only after a lazy import of the installed client's exported `package.json` confirms a stable version 0.1.2 or later. Missing or unrecognized metadata falls back to the legacy dialog options. No peer is loaded on kit import or download. A bundler using the send integration must be able to resolve that optional peer's JSON export. The client owns consent, compression, limits, transport and send error messages. Add the lab endpoint to the game's CSP as described in [lab-client](../lab-client/README.md).

For a standalone download:

```ts
import { downloadJson } from '@adam0white/lab-kit';
downloadJson('run.json', exportRun());
```

Values must be JSON-serializable. The helper creates a temporary anchor, downloads a JSON Blob, and releases the object URL after one second.

## Release stamp

After installing the kit, replace the copied script with:

```json
{ "scripts": { "build": "stamp-release && vite build" } }
```

`stamp-release` runs as Node ESM (Node 24+). Defaults relative to the caller's working directory: `package.json`, `node_modules/@adam0white/human-framework/package.json`, `public/release.json`. It writes `{ app, framework, commit, dirty }`. Paths can be overridden:

```sh
stamp-release --package package.json --framework vendor/human/package.json --output public/release.json
```

Missing package versions fail the build. Missing Git evidence produces `commit: "none"` and `dirty: true`; failure to read status also leaves `dirty: true`. This only stamps metadata; it does not commit, publish or deploy.

## Clarity coverage

| Piece | Checklist support | Game still owns |
| --- | --- | --- |
| Tokens and base | DL-2, DL-3, DL-8, DL-23, DL-25 | One accent focus, readable layout and content |
| `once`, `introCard` | DL-1, DL-6, DL-7, DL-11, DL-24 | Clear short goal, first meaningful choice, clock |
| Terms and glossary | DL-20 | Accurate definitions and consistent names (DL-10) |
| English dates | DL-20, DL-21 | Mapping game time to Gregorian dates |
| What-next line | DL-5, DL-8, DL-9, DL-22 | Updating instructions and reserving visible space |
| Notebook and JSON | DL-24, DL-26, DL-28 | Resume (DL-27), replayable exports (DL-29), send client |

The table follows the revised 2026-10-20 checklist ids. The requested Notebook and export labels are retained here; the revised checklist now recommends Game menu, Download this run and Send this run to the lab. Games can adopt those labels in a later reviewed API change.

The kit does not certify any game against the full checklist.

## Develop

From the repository root:

```sh
npm run build -w packages/lab-kit
npm run typecheck -w packages/lab-kit
npx vitest run --project lab-kit
npm run check
npm pack -w packages/lab-kit --pack-destination /tmp
```

Tests use Vitest and happy-dom, with Node-only subprocess tests for the stamp. No publication is part of this task.
