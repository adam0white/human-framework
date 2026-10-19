# HF playtester

HF people as playtesters. A persona plays a game through HF's own decision loop and reports where it got bored,
frustrated or rewarded, and where it quit. Private package: it is not published. It stays here until it proves
generic enough for HF.

## What is in it

| Module | What it does |
|---|---|
| `adapter.ts` | The contract a game implements (`GameAdapter`). |
| `persona.ts` | Player presets: four base players, three edge-pushers (`mischief`, `exploiter`, `rulesLawyer`) and a `returner`. |
| `session.ts` | One sitting. Once a real minute, HF decides whether to play on, look away or stop. Each 3-second beat, one input is picked. |
| `style.ts` | How the edge-pushers reshape what each input promises. A style never reads game state. |
| `returner.ts` | Evenings in a row. An open loop on screen becomes a small HF goal overnight, and HF decides each evening whether to come back. |
| `edges.ts` | The edge report: dominant strategies, degenerate loops, unexpected wins, mischief the game ignored or answered, silent inputs. Each edge is labelled "fun to keep" or "close", with a reason. |
| `cohort.ts` | N personas × M seeds against one build, giving one plain-JSON `CohortSummary`. |
| `compare.ts` | Two summaries of the same game, an earlier build against a later one. |
| `designer.ts` | An experiment, not a tool (see `docs/findings.md`, 2026-10-19). An HF designer ranks templated proposals. |
| `adapters/` | The canonical adapters: The Pass (`pass.ts`), The Glance (`glance.ts`), The Two Voices (`voices.ts`). |
| `examples/cohort.ts` | The command line. |

## Commands

Build HF first. Under node, the package resolves HF through the workspace build.

```fish
npm run build -w packages/human
node packages/playtester/examples/cohort.ts run game=pass seeds=3 out=/tmp/pass.json
node packages/playtester/examples/cohort.ts compare before.json after.json
node packages/playtester/examples/cohort.ts design /tmp/pass.json
node packages/playtester/examples/cohort.ts session game=glance persona=mischief seed=2
```

`personas=` takes `all` (the default), `base`, `edge`, or a list of ids. Each adapter reads its game checkout from an
environment variable: `PASS_DIR`, `GLANCE_DIR` or `MURMUR_DIR`. By default these point to `~/code/pass`,
`~/code/glance` and `~/code/murmur`.

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
