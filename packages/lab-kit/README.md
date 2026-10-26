# @adam0white/lab-kit

Small plain-DOM components for lab games. No framework, simulation logic, automatic telemetry or font downloads. This README describes kit 0.5.12. The CSS-first phone stage and browser layout audit were added in 0.2.0. Kit 0.5.12 is an immutable GitHub release artifact, not an npm publication; use the [SDK adoption guide](../../docs/lab/navigation-journal-adoption-2026-10-25.md) and [release digests](../../docs/releases.md#lab-package-artifacts--2026-10-25).

Workspace candidate version: **0.5.12**. The **0.5.12** [GitHub artifact](https://github.com/adam0white/human-framework/releases/tag/lab-kit-v0.5.12) is published from separate source `569bfeed`, with exact CI 40241110596. Its source is integrated into this 3.2 candidate; live host adoption still needs deployment. See [SDK adoption](../../docs/lab/navigation-journal-adoption-2026-10-25.md) before using its opt-in Feedback choices.

Import the CSS once. JavaScript exports are tree-shakeable; CSS is explicitly marked as a side effect.

```ts
import '@adam0white/lab-kit/tokens.css';
import { introCard, notebookMenu, nextLine, setNext } from '@adam0white/lab-kit';
```

## Paper and ink

`tokens.css` uses the exact palette in [Field Notebook](../../docs/design-language.md), with Literata and a Georgia fallback. Load Literata and Caveat yourself if desired. The default follows `prefers-color-scheme`; set `document.documentElement.dataset.theme` to `light` or `dark` to override it. Remove the attribute to follow the system again.

Use `.now` for the one current instruction, `.happened` for the journal, and `.flavour` for optional background. Buttons have visible borders, links have accent underlines, and controls have visible focus and at least 44px targets. Games own their scene content and camera. The optional phone stage arranges the state strip, visible scene and one sheet. Check the rendered result at 360×690 visible CSS pixels, 320 px width and 200% text size.

## Phone stage (0.2.0)

Import `tokens.css` as before, or `@adam0white/lab-kit/stage.css` alone to keep a game's existing palette and typography (supply `--paper`, `--ink`, and `--ink-soft`). The stage is CSS-first: React can own every node and state change. A strip occupies its own row above the scene and sheet. Chips wrap; full sentences appear when `data-expanded="true"`. At 900 px wide the sheet docks beside the scene. Below that width it occupies the bottom of the stage. It never overlays the strip.

```tsx
const [height, setHeight] = useState('half');
const [expanded, setExpanded] = useState(false);
return <main className="lk-stage" data-sheet={height}>
  <header className="lk-strip" data-expanded={expanded}>
    <button aria-expanded={expanded} aria-controls="village-state"
      onClick={() => setExpanded(!expanded)}>Village state</button>
    <div className="lk-chips"><span className="lk-chip">Roof 7 of 10</span>
      <span className="lk-chip">Meals 12</span><span className="lk-chip">Storm 19:00 tomorrow</span></div>
    <div className="lk-strip-detail" id="village-state">Three roof beams remain before tomorrow's storm.</div>
  </header>
  <div className="lk-scene">{/* Game scene */}</div>
  <section className="lk-sheet" hidden={height === 'closed'} aria-label="Order">
    <header className="lk-sheet-head"><h2>Order</h2>
      {['peek', 'half', 'full', 'fit'].map(h => <button key={h}
        aria-pressed={height === h} onClick={() => setHeight(h)}>{h}</button>)}
      <button onClick={() => setHeight('closed')}>Watch village</button>
    </header>
    <div className="lk-sheet-body">{/* Essential sentence and choices */}</div>
    <footer className="lk-commit"><button>Confirm</button></footer>
  </section>
</main>;
```

`peek` shows the header and commit row, `half` uses about 45% of visible height and preserves at least 40% for the scene, `full` reaches the strip, and `fit` grows with content up to the strip. Keep essential explanations near the title and actions in `.lk-commit`; only `.lk-sheet-body` scrolls. Keep headers short. At enlarged text sizes a large header or commit row can consume the available space; reduce choices or use a labelled secondary view. Do not give text a fixed height or hide overflow in game CSS. Use `hidden` on a closed sheet for CSS-only consumers so its controls leave the accessibility tree. The scene stays interactive: this is a nonmodal region, not a modal dialog. Supply an accessible name with `aria-label` or `aria-labelledby`.

Vanilla games can add the optional controller without giving it ownership of their DOM:

```ts
import { phoneStage } from '@adam0white/lab-kit';
const stage = phoneStage(document.querySelector('.lk-stage')!, {
  onChange(sheet, canBack) {
    // Replace the content of the existing sheet using sheet?.id.
    // Do not replace the stage root. Render one sheet, not stacked panels.
    renderSheet(sheet?.id, canBack);
  },
  onSceneRect(rect) {
    camera.keepSelectedInside(rect);
  },
});
orderButton.onclick = () => stage.open({ id: 'order', height: 'half', opener: orderButton });
placeButton.onclick = () => stage.open({ id: 'places', height: 'fit', opener: placeButton });
// Destroy event listeners and the ResizeObserver when leaving the game.
// stage.destroy();
```

Use `data-lk-snap="peek|half|full|fit"` on labelled buttons, `data-lk-back` for Back, `data-lk-close` for Close, and `data-lk-strip-toggle` with `aria-controls` and `aria-expanded` on the strip button. The controller updates `aria-pressed`, `aria-expanded`, sheet `hidden`/`aria-hidden`, `data-sheet`, `data-sheet-id` and `data-sheet-back`. A `.lk-sheet-handle` button supports pointer drag-to-snap; supply an accessible label and keep the height buttons alongside it. The controller starts closed; call `open` for the initial sheet. Each `open` remembers the previous id and height; `back` returns there and restores the nested opener's focus. Give recreated opener controls stable ids, or pass `openerSelector` when calling `open`, so focus can find the replacement after `onChange` renders. `close` returns to the scene and focuses the original opener. `Escape` calls `back`. The controller adds one same-document history entry while a sheet is open. Browser Back returns through nested origins, then closes the outer sheet. Closing or destroying removes that entry; the prior history state is preserved. Set `history: false` when a game router owns browser Back and calls `back()` itself.

`refresh()` publishes viewport-coordinate `{ x, y, width, height }` bounds from the actual `.lk-scene` through `onSceneRect` and `--lk-scene-x`, `--lk-scene-y`, `--lk-scene-width`, `--lk-scene-height`. Root, strip, sheet and scene resizes trigger it. `visualViewport` resize/scroll updates `--lk-viewport-height` and `--lk-viewport-top`, and `--lk-available-height` subtracts the stage's position below other page controls, so the commit row follows the keyboard's visible bottom. When the visual viewport falls below 80% of the layout viewport, `data-lk-keyboard="true"` lets a half sheet borrow scene space to preserve its header and actions. The normal 40% scene reservation resumes when the keyboard closes. A React game using attributes alone owns its Back/Escape/focus and drag handlers and can measure its scene with `ResizeObserver`; use `observeOnly: true` to keep React in control of transitions. In that mode the controller only observes sizes, updates viewport variables and emits snap requests through `onChange`; React handles Back, Escape, focus, strip expansion and closed-sheet accessibility. Give React's root `data-sheet` and `data-sheet-id` attributes. Do not call `open`, `back` or `close` in observe-only mode. Respect reduced motion; the base stage adds no animated movement. Test keyboard-open layout on the target browser.

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
englishDate(Date.UTC(2026, 4, 14), true); // 'Thursday 14 May 2026'
weekday(2); // 'Tuesday'; Sunday = 0
month(5); // 'May'; January = 1
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
footer.append(
  notebookMenu({
    lab,
    getRun: () => exportRun(),
    filename: 'pass-playtest.json',
    // name: 'Sam', // optional feedback name prefill; the client remembers submitted names locally
    compact: (run) => compactRun(run),
    compactNote: 'Seed and inputs reproduce the full state.',
    onSave: () => saveGame(),
  }),
);
```

One Game menu button opens Feedback (when `lab` exists), the single Recording switch (when supported), and Resume. With `?lab=1`, it also exposes Save (when `onSave` exists), Download this run and Lab privacy. The menu closes before the client dialog opens. Save success and failures are announced. `getRun` is read at action time; download always includes the complete export, never the compact form. The game must provide seed, input log and state, prove replay, and offer Continue with a location summary on its returning-player screen.

The client is an **optional peer**, pinned to `@adam0white/lab-client 0.4.10` in kit 0.5.11. Pass an existing lab; the kit does not create one. Omitting `lab` keeps diagnostic download and Save available with `?lab=1` and explains why sending is unavailable. This also lets browser automation use the menu without initializing telemetry. Honor the client's privacy signals; never force telemetry on for a test.

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

| Piece                      | Checklist support                        | Game still owns                                                                  |
| -------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| Tokens and base            | DL-2, DL-3, DL-8, DL-23, DL-25, DL-30    | One accent focus, readable layout and content                                    |
| Phone stage and controller | DL-22, DL-23, DL-24, DL-25, DL-30, DL-31 | Essential copy, scene camera, React transitions, router Back and rendered checks |
| `once`, `introCard`        | DL-1, DL-6, DL-7, DL-11, DL-24           | Clear short goal, first meaningful choice, clock                                 |
| Terms and glossary         | DL-20                                    | Accurate definitions and consistent names (DL-10)                                |
| English dates              | DL-20, DL-21                             | Mapping game time to Gregorian dates                                             |
| What-next line             | DL-5, DL-8, DL-9, DL-22                  | Updating instructions and reserving visible space                                |
| Notebook and JSON          | DL-24, DL-26, DL-28                      | Resume (DL-27), replayable exports (DL-29), send client                          |

The table follows the revised 2026-10-20 checklist ids. Current labels are Game menu, Feedback and Resume; Download this run is diagnostic-only (`?lab=1`).

The kit does not certify any game against the full checklist.

## Frozen Good Hands forecast (candidate instrument)

`freezeForecastCohort(metadata, binding)` and `scoreFrozenForecast(receipt, labels, reviewDate)`
are optional async root exports. They accept bounded plain JSON and return detached JSON.
They create no client and use no Person state, RNG, DOM, storage, network or wall clock.
The binding fixes one study and its three SHA256 digests; it is not a prediction configuration.
This candidate has no release version or host adoption claim.

Freeze metadata before inspecting outcomes. Supply receipt/run IDs, game/build, UTC receipt/start
timestamps, provenance, run kind, authorization and complete-data/label availability as defined
by `ForecastRunMetadata`. The first otherwise eligible server receipt pins the build, then the
first 20 distinct eligible runs on that build stay selected. Start time must be strictly after
`2026-10-25T17:19:27.729743+00:00`; comparison retains nanoseconds. Explicit recording or explicit
run-send authorization is required. Default capture alone is insufficient. Availability means
that a label record exists, including an explicit unknown; it does not mean a known outcome.
No caller option selects a preferred build or replaces a selected run.

`FrozenForecastReceipt` contains metadata, selected IDs, exclusions and full SHA256 hashes.
Keep receipts and label files outside Git and public output. Hashes detect corruption, not
forgery, consent or human identity. The scorer independently recomputes the receipt.
`FrozenForecastLabels` binds its hash and supplies exactly one quit/confusion pair per selected
run. Positive quit evidence is `voluntary-stop-before-60m-without-completion`; negative evidence
is `explicit-observation-through-60m-without-quit`. Positive confusion evidence is
`explicit-opening-interview-confusion`; negative evidence is `explicit-no-opening-interview-confusion`.
Positive labels carry an exact point string or `null` for missing point evidence. Negative labels
have no point. Unknown labels use `{ evidence: 'unknown', reason }`, where reason is
`absent-declaration`, `technical-failure`, `silent-ending` or `insufficient-observation`.
Supply explicit unknown entries when declarations are absent; do not infer labels from silence,
generic events, rubric warnings or completion. The instrument gathers no declarations.

`FrozenForecastReport` returns aggregate outcome counts, matched-subset Brier metrics, unknown
reasons, point modes, exclusions and registered gates. Each outcome needs at least 16 known
labels. The Brier gate uses the equal mean of the two outcome improvements over baseline 0.5;
it requires at least 0.02. Both absolute rate errors must be at most 0.15 and both exact predicted
points must be modal among positive labels. Decision gates use integer rational arithmetic.
Unknowns do not enter either matched denominator. Zero known labels yield null metrics; zero
positives mean a point miss. Any missing positive point leaves that point pending. Insufficient
evidence gives `PENDING` before `2026-11-03` and `NO_GO_MISSING_EVIDENCE` on or after that date.
Sufficient evidence gives `GO` or `NO_GO_OBSERVED_FAILURE`. `reviewDate` is explicit `YYYY-MM-DD`.
Reports always set `humanEvidenceVerified: false`. GO computes registered gates only.

The file-only study wrapper retains the [public study and frozen bytes](../../docs/lab/experiments/fixtures/hf-forecast/).
From this repository root, use explicit file paths and new output files:

```sh
pnpm exec node scripts/frozen-forecast.ts freeze --metadata <file> --out <new-private-file> [--expect-build <id>]
pnpm exec node scripts/frozen-forecast.ts score --receipt <file> --labels <file> --review-date YYYY-MM-DD --out <new-report-file>
pnpm exec node scripts/frozen-forecast.ts control
```

`--expect-build` can only reject a mismatch after freezing. Outputs are created exclusively with
mode 0600 and never overwritten. Stdout shows scope and aggregate counts/verdict; errors contain
codes only. Exit 0 means valid computation, including PENDING/NO-GO; exit 2 means invalid input,
invocation or a failed control. Inputs are limited to 8 MiB, 10,000 metadata records, 20 selected
label entries, JSON depth 12 and 32 keys per object. Strings are limited to 256 UTF-8 bytes;
timestamps to 40 ASCII characters; IDs/builds to 128 ASCII characters from `[A-Za-z0-9._:-]+`.
Point strings must be nonempty and contain no control characters. Extra fields and malformed
JSON values reject.

The one headless control uses only labelled fabricated metadata and three label views. It checks
GO, incorrect-point failure and missing evidence before/on the deadline. Human-shaped assertions
in this fixture are fabricated instrument evidence, never real human validation. The nine source
sessions, censored agenda stops, rubric proxy, old build and changed live copy remain limitations.
No human cohort was retrieved or scored by this candidate. Immutable artifact JS/TypeScript 7
consumer proof, independent reviews and the normal final gate belong to the release owner.

## Develop

From the repository root:

```sh
npm run build -w packages/lab-kit
npm run typecheck -w packages/lab-kit
npx vitest run --project lab-kit
npm run check
npm pack -w packages/lab-kit --pack-destination /tmp
```

Tests use Vitest and happy-dom, with Node-only subprocess tests for the stamp. Building or packing does not publish an artifact.

## Phone check (DL-30)

`auditPhone(root = document.body)` reads actual browser layout and returns findings with a kind, short selector and visible text fragment. It checks clipped text, ellipsis, line clamps, covered or overlapping targets, small targets, horizontal page scroll and actions outside a scroll container's visible box. These are heuristics: review findings in the rendered screen. It also flags text forced to scroll inside its own small box (the Warren safety-response case); ordinary scrolling sheet bodies are allowed. Canvas contents are unmeasured.

```sh
npm run lab:phone -- https://example.com --steps steps.json --out /path/to/evidence
```

Steps are a JSON array, for example `[ {"click":"Play","name":"map"}, {"selector":".order-button"}, {"wait":500}, {"selector":"input","type":"Ada"} ]`. The command captures JSON and screenshots after load and each step at 360×690 with touch and light mode. Findings produce a nonzero exit. Playwright loads lazily; ordinary checks do not download a browser. Install Chromium when needed with `npm exec --package=playwright -- playwright install chromium`. The runner searches local and npm execution caches; `PLAYWRIGHT_MODULE` can point to an external package entry.

## Changes

- **0.2.0:** additive CSS phone stage with wrapping state strip, four sheet heights, docked desktop layout, persistent commit row, optional snap/origin/focus/scene controller, and browser phone audit. Existing 0.1.0 imports and components remain available.
- **0.1.0:** Field Notebook tokens, hints, intro card, glossary, English dates, instruction line, notebook menu, JSON download and release stamp.

## Linked recording

Use `telemetryNotice()` once on the game screen and mount that same returned node in a stable footer when present. Kit 0.5.7 uses a compact grammatical disclosure without a Dismiss control. Do not clone or replace the node: its asynchronous central claim can remove it. Add `telemetryToggle(lab)` to each game menu. Both use the same policy as the site games. `notebookMenu` includes the toggle. Register full runs, successful saves and game logs on the lab client; see its README. Automatic recording does not consent to the player-character test.

`personaControls({ enabled, setEnabled, recordingAllowed, allowRecording })` is a compatibility helper that still renders a fictional continuity switch and shelf link. Do not mount that switch in current ordinary play: continuity runs automatically. The recording fields remain accepted for older hosts; no separate linkage prompt appears. Recording and linkage follow the single `telemetryToggle(lab)` switch, including explicit opt-in under DNT/GPC.

`feedbackPersonaControl(lab)` returns null when recording is on. Otherwise it returns one unticked checkbox labelled “Share this run and my play with the lab”. On Submit pass `sharePlay: feedbackSharePlay(control)` to `lab.sendFeedback(note, { run, name, sharePlay })`. The helper does not change recording when the checkbox is ticked. Submit applies the choice. Unticked feedback sends the note alone, without linkage.

## Stop and confusion choices (candidate artifact)

After adopting the matching reviewed client and kit release artifacts, pass
`feedbackChoices: true` to `notebookMenu({ lab, getRun, filename, feedbackChoices: true })`.
The kit forwards the opt-in when opening Feedback after its native sheet closes.
Hosts with custom menus can pass the same option directly to `lab.openSendDialog`.
The client renders the two quiet choices and owns preview, submission, privacy,
run linkage, byte limits and receipts. The default omits the option and preserves
the old dialog. Older clients may ignore the flag; upgrade both artifacts before
claiming adoption. No npm publication or host adoption is part of this candidate.
