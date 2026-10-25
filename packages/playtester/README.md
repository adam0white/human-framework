# HF playtester

HF people as playtesters. A persona plays a game through HF's own decision loop and reports where it got bored,
frustrated or rewarded, and where it quit. Private package: it is not published. It stays here until it proves
generic enough for HF.

## What is in it

| Module               | What it does                                                                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adapter.ts`         | The contract a game implements (`GameAdapter`).                                                                                                                                               |
| `persona.ts`         | Player presets: four base players, three edge-pushers (`mischief`, `exploiter`, `rulesLawyer`) and a `returner`.                                                                              |
| `session.ts`         | One sitting. Once a real minute, HF decides whether to play on, look away or stop. Each 3-second beat, one input is picked.                                                                   |
| `style.ts`           | How the edge-pushers reshape what each input promises. A style never reads game state.                                                                                                        |
| `returner.ts`        | Evenings in a row. An open loop on screen becomes a small HF goal overnight, and HF decides each evening whether to come back.                                                                |
| `edges.ts`           | The edge report: dominant strategies, degenerate loops, unexpected wins, mischief the game ignored or answered, silent inputs. Each edge is labelled "fun to keep" or "close", with a reason. |
| `cohort.ts`          | N personas × M seeds against one build, giving one plain-JSON `CohortSummary`.                                                                                                                |
| `compare.ts`         | Two summaries of the same game, an earlier build against a later one.                                                                                                                         |
| `designer.ts`        | An experiment, not a tool (see `docs/findings.md`, 2026-10-19). An HF designer ranks templated proposals.                                                                                     |
| `adapters/`          | The canonical adapters: The Pass (`pass.ts`), The Glance (`glance.ts`), The Two Voices (`voices.ts`), The Warren (`warren.ts`).                                                               |
| `examples/cohort.ts` | The command line.                                                                                                                                                                             |

## Commands

The owner authorized HF 3 lab-panel rounds under the playtest director: twelve standing testers and two cold slots. Each game gets a round, fixes and a retest by the same testers. The cycle ends when a retest raises no new blocking ask, or after two iterations; remaining asks retain dated Deferred entries. Completion requires actual round and retest receipts. Friends’ playtests and Show HN stay paused until owner readiness acceptance. This document does not dispatch a round. Synthetic HF sessions are not evidence of human enjoyment or predictive validity.

Build HF first. Under node, the package resolves HF through the workspace build.

```fish
npm run build -w packages/human
node packages/playtester/examples/cohort.ts run game=pass seeds=3 out=/tmp/pass.json
node packages/playtester/examples/cohort.ts compare before.json after.json
node packages/playtester/examples/cohort.ts design /tmp/pass.json
node packages/playtester/examples/cohort.ts session game=glance persona=mischief seed=2
```

`personas=` takes `all` (the default), `base`, `edge`, or a list of ids. Each adapter reads its game checkout from an
environment variable: `PASS_DIR`, `GLANCE_DIR`, `MURMUR_DIR` or `WARREN_DIR`. By default these point to `~/code/pass`,
`~/code/glance`, `~/code/murmur` and `~/code/warren`.

To compare two builds without touching the game repository, extract the old build and point the variable at it:

```fish
mkdir -p /tmp/pass-old; git -C ~/code/pass archive 85e32e9 | tar -x -C /tmp/pass-old
ln -s ~/code/pass/node_modules /tmp/pass-old/node_modules
PASS_DIR=/tmp/pass-old node packages/playtester/examples/cohort.ts run game=pass build=85e32e9 out=/tmp/old.json
```

The old build then runs on the HF in the live checkout's `node_modules`. When the two builds pin different HF
versions, say so next to the comparison.

## Adding a game

Write `adapters/<game>.ts`. It must export `make(seed): GameAdapter`. Copy the pattern of an existing adapter:

1. **Import the game read-only.** Use a dynamic import from a checkout path in an environment variable:
   `await import(join(DIR, 'src/sim/x.ts'))`. Declare locally only the state and functions you use. Do not import the
   game's types, and do not edit the game's repository. This keeps the playtester typecheck independent of any game.
2. **Show only what the screen shows.** `observe()` returns events judged from the player's side (valence −1..1,
   salience 0..1) and `features.pressure`. Never pass hidden numbers such as needs, trust or the true water level.
3. **Offer what the player could do.** `actions()` returns inputs with a `promise`: how useful each looks from what is
   shown. Tag provocations `confront`.
4. **Advance at the UI's speed.** `advance(seconds)` steps the sim the way the UI does, including any slowdown.
5. **Fill in the cohort fields.** These are optional, but the cohort tools read them:
   - `chapter`: a coarse place in the game, used for quit points.
   - `outcome`: `win`, `loss` or `mixed` once the game is over.
   - `features.openLoop` and `loops`: what is visibly unfinished. The returner reads these.
   - `answers` on events: the id prefixes of the inputs an event answers. Without it, any event with `by` answers
     any recent input, and ignored mischief goes undetected.
6. **Add edge actions.** `edgeActions()` lists what the screen allows but a sensible player would not try. Mark the
   ones whose point is to provoke `mischief: true`. Give an edge action an id of its own (the adapters add
   `:sport`), so that it never shares a record with the same plain input.
7. Add the file to nothing else. `tsconfig.json` already includes `adapters/`, so `npm run check` lints and typechecks
   it.

Each game keeps its own scratch copy if it wants one. The copies here are canonical.

## Caveats

- **Two HF copies run in one process.** The game's characters use the HF version the game pins, from its own
  `node_modules`. The persona uses this repository's HF. They never share a Person.
- **Every number is a playtesting premise.** This covers persona traits, style weights, edge thresholds and adapter
  valences. None of them is an estimate of real players. Edge labels are rules written down in `edges.ts`, not
  judgements.
- **A few seeds move a rate a lot.** With three seeds per persona, one session moves a rate by a third. The
  comparison prints session counts beside every line.
- **The persona is hard to please on purpose.** Boredom, frustration and quitting come from HF's own appraisal and
  needs. A finished stretch of play gives HF leisure and some competence, and the mischief-maker relishes an answered
  provocation; nothing else is credited.
- **Boredom, loss and frustration are kept apart (2026-10-19).** An event with no stakes holds little attention, so
  a busy screen with nothing at stake bores. One hard blow is a `setback` moment, not a reason to stop. Stopping
  favours rest only after a clearly losing stream: 3 hard minutes in the last 5, with setbacks at least 1.5× the
  rewards (events under |valence| 0.2 count half). So "quit from distress" means the adapter's events lost several minutes running. Check the adapter's
  valences before blaming the game (`CALIBRATION-NOTES.md`, C2 and C6).
- **Read quit chapters together with minutes.** A persona's appetite for play sets how long it plays, so a chapter
  where many sessions stop may be where that much play lands rather than a problem in the chapter.

## Phone check (DL-30)

The LLM retest prompt now asks DL-30..DL-33. Builders run `npm run lab:phone -- <url>`
on each main screen and opened sheet (use `--steps steps.json --out dir` to keep evidence).
HF-character adapters cannot see layout; they report these ids unmeasured.

## Clarity rubric

Ids follow the current checklist (revised at `c8c8134`): feedback is DL-13 and dates DL-21. DL-22 now covers
phone layout, which the adapter cannot measure. Low/equal promises and missing explicit goal/next copy remain
review signals: several useful choices and a readable scene without a next prompt can be valid.

Every cohort adds `summary.clarity` and prints **First minute (DL-1..DL-7)**, followed by other DL findings.
`clarityReport(trace)` or `clarityReport(traces)` returns plain-JSON findings with `dl`, `signal`, `status`,
`game`, `persona`, `seed`, `seconds`, optional `beats`, and `detail`. `formatClarityReport(findings)` formats them.
The [lab checklist](../../docs/lab/design-language.md) defines the DL ids. Use the
[source-unread prompt](../../docs/lab/playtester-prompt.md) for human-language and visual checks.

| Recorded signal                                                                                      | DL id                   | Default                                                                                            |
| ---------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| Time to first available action and, separately, first input; idle beats while actions were available | DL-6                    | Warn after 30s, or 5 idle beats                                                                    |
| First-minute menu has no enabled action above a promise threshold                                    | DL-3                    | Highest promise at most 0.4                                                                        |
| Many enabled actions look equally promising in the first minute                                      | DL-3                    | At least 3 within 0.05 of the highest                                                              |
| Offered action disappears or becomes disabled without a reason or an event                           | DL-4                    | Compare consecutive recorded menus                                                                 |
| Disabled action has no shown reason                                                                  | DL-4                    | Any such control                                                                                   |
| Repeated inputs have no matching `answers` event                                                     | DL-13                   | 3 attempts with complete 9s response windows                                                       |
| No events, next line or visible open loop during a stretch                                           | DL-5                    | At least 30s; next, loops and openLoop must be exposed                                             |
| Empty goal copy throughout sampled first-minute screens                                              | DL-1                    | No non-empty goal in the first 60s                                                                 |
| Empty what-next line on a playable screen                                                            | DL-5                    | Any sampled screen                                                                                 |
| Voluntary quit / boredom during the first recorded chapter                                           | DL-1 / DL-7             | Agenda stops excluded; proxy, not a diagnosis                                                      |
| Non-English calendar word in load-bearing copy                                                       | DL-20, DL-21            | Whole words: Turkish plus common French, German, Spanish names                                     |
| Non-ASCII-heavy load-bearing copy                                                                    | DL-20; DL-21 for clocks | More than half of at least 6 letters; language heuristic                                           |
| Must-read copy is too long                                                                           | DL-11                   | More than 60 words across exposed now, goal, next and control copy (exact duplicates counted once) |

`CLARITY_DEFAULTS` exports every threshold. They are playtesting premises, not measurements of real readers.
The session records the raw menu before persona style changes promises. Disabled controls are recorded but never
scored or applied. The snapshots copy only adapter fields; the report reads no game source, hidden state or RNG.
First input means an adapter input was applied; only a player can establish whether it was meaningful.

Adapters may add these optional fields, copied from the screen:

```ts
// Observation
{ goal: 'Get everyone down before dark.', next: 'Choose who carries the rope.',
  text: [{ level: 'now', text: 'Choose a carrier.' },
         { level: 'happened', text: 'The rope slipped.' },
         { level: 'flavour', text: 'Wind in the pines.' }] }
// PlayAction: visible but unavailable
{ id: 'climb', label: 'Climb', kind: 'climb', promise: 0,
  disabled: { reason: 'Your hands need a rest.' } }
```

An omitted `goal`, `next` or `text` means the adapter does not expose that evidence. Use `goal: ''` or `next: ''`
when the screen genuinely shows no such line, and `text: []` when it shows no classified copy. `disabled: {}`
means the screen gives no reason. Do not invent copy or explanations to make a report pass. The four canonical adapters now expose inspected screen copy. Pass and Glance use their checkout's pure UI
status readers when present; older checkouts keep that copy unmeasured. Pass phases added after the adapter's service/evening/Sunday
contract also keep copy unmeasured. Warren uses its current margin reader,
or the goal text shown by older builds. Current raid-warning copy stays unmeasured because its browser-local
acknowledgement is outside the adapter. Voices mirrors the card's hint priority and the visible between-card
clock line. A title-page purpose is not copied onto an active screen.

Pass records the disabled night-three continuation without inventing a reason; Glance records the inn sheet's
disabled ring/warning and displayed reasons. Refusal forecasts and busy people do not become disabled controls.
The action menus still combine controls from reachable sheets and omit navigation, so they cannot prove that
every control was simultaneously visible or discovered. Neighbours and Small Works example adapters remain
outside this copy coverage. Their historical freeze does not block the later authorized cast and v3 work.
The language check includes clock, now, goal, next, control labels and disabled reasons.
`loops` and `features.openLoop` retain their existing meaning: visibly unfinished business.

A finding is a **warning**, a **measurement** (choice/input timing), or **unmeasured** (missing evidence).
No warnings is not a full rubric pass. DL-2 requires visual control checks; DL-7's teaching check requires a
source-unread tester. Other layout, comprehension, translation and calendar-format checks remain with that tester.
Local names in `flavour` and `happened` copy are not checked for language. Calendar and script detection can have
false positives: inspect the quoted copy. Ambient events cannot answer an input unless the adapter marks them as
answers. A three-second beat cannot time prompt acknowledgement precisely; 9s is only a coarse DL-13 silence warning. Final
observation answers are retained, and incomplete response windows are not judged. Old traces without screen
snapshots mark the optional checks unmeasured. First-chapter findings after 60s appear under other findings.

Run the synthetic clear/unclear screen controls with:

```fish
npx vitest run --project playtester packages/playtester/test/clarity.test.ts
```
