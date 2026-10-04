# Twice at the Well, v2: the locked plan

Status: locked 2026-10-03. Source: [playtest items 1–17](colony-playtest-2026-10-03.md). This plan amends
[colony.md](colony.md). Where they disagree, this plan wins. Every number below was measured headless on seed
20261003 with the throwaway harness `apps/site/src/colony/sim/balance.scratch.test.ts`, unless a row is marked
*assumed*. `packages/human` is not touched: every change below is host-side, and nothing in the framework
blocked any item.

## 0. As shipped (fix pass after the integration playtest and review, 2026-10-03)

Where this section and the plan below disagree, this section is what the code does.

- **Classic building.** A builder claims one stage when work begins and pays for that stage only. A second
  builder takes the next free stage; the beam and the roof never start before the stage below them stands. An
  ordered builder with no free stage helps the builder nearest done; a role builder does other work. This fixes
  walls skipping the beam roll, a roof stage paid twice and the store-room overshooting (7/6).
- **Classic storm stock.** The role cook stocks up to 6 meals, and up to **12 from the warning** (D2 16:00)
  (`STOCK_CAP.stormMeals`). Classic no longer fails `stock` by construction.
- **Human cook thresholds** lowered from 12 / 18 to **6 / 12** (`HOST.cookBelow`, `cookBelowStorm`). Storm stock is
  13–17 instead of 21–25.
- **Shutter window.** An order to the house infers `shutter-house` below the beam from the warning, and for an
  unfinished roof from **18:00** (`SHUTTER_ROOF_FROM`), when a roof stage can no longer be finished. Never after
  the storm ends (so Day-3 orders build). The `storm-shutter` card moved to 18:00 → 19:00 to match, and it hides
  once each side is roofed or shuttered. `storm-pot` moved to 16:30 → 17:30 so it does not stack on the warning.
- **Auto-pause.** A refusal pauses once per card (its first `notNow`, `willNot` or `complied`). `cannot` ("I'm
  asleep") does not pause. Any order that settles the pausing suggestion resumes, including one typed in the
  composer without `nudgeId` (`game.lastSettled`).
- **Day 3.** The project is the **store-room on both sides**. A side whose house is below 10 finishes the house
  first, and its store-room opens when the roof goes on. Goals: store-room 6/6 by **D3 18:00**, at least **12**
  meals at 18:00, all alive at D4 05:00. After the storm, Idris and Samira go back to their old home until their
  house is roofed (`homeOf`).
- **Suggestions are not a plan.** Following every card does not roof the Human house (8.9, below Solo's 9.78).
  Retuning the D2 cards moved it by at most +0.1 (see `docs/findings.md`), so the cards were kept. The goal card
  now says that winning takes your own orders.

## 1. Goals (items 4, 14, 16)

Both sides get the same three goals. They are shown on the goal card (item 1) and the goal strip (item 4).

| id | Label on screen | Target | Judged at | Status rule |
|---|---|---|---|---|
| `roof` | Roof before the storm | house 10/10 | D2 19:00 (minute 2280) | `met` as soon as it reaches 10. `failed` at 19:00 if it is below 10. It does not change after 19:00. |
| `stock` | Storm stock | ≥ 12 meals in store | D2 19:00 | `open` until 19:00, then `met` or `failed`. |
| `lives` | Everyone lives | 6 alive | D3 05:00 (end) | `failed` at the first death. `met` at the end. |

- Human-only outcomes (prayers kept, morale, trust) are **character outcomes**, not goals. They appear under the
  Human pane and on the end screen.
- A Classic cell for a concept Classic lacks reads **"Classic has no such concept"**, not `—`. This covers the
  scoreboard, the inspector and the end screen (item 16).
- 12 meals is supper plus breakfast for six people.

### Balance targets and how they are met (v2 plan; §0 and §3 have the shipped numbers)

| Target (from the task) | Measured on N600 |
|---|---|
| Solo (Human, no orders) narrowly fails at least one goal | Fails `roof` only. House is at 9.78 when the storm starts. Stock 21. Fails the same way on 6/6 seeds. |
| Good orders can win all three | `good2rush` wins all three on both sides on 6/6 seeds. |
| Hostile orders lose visibly | `allForest`: Classic has 6 dead (stock 0, house 3→0); Human house is at 8.21. `good2insist`: Human house 9.18 with 16 injuries. |
| Classic with no orders is competent but does not win everything | House done D2 14:01, but stock is 6 (capped), so it fails `stock`. House ✓ on 4/6 seeds; stock ✗ on 6/6. |
| Meals are really eaten | Over the run, Classic eats 41–42 and Human eats 40–43. In v1, Classic ate 29. |

## 2. Locked numbers (candidate "N600")

Shared numbers live in `world-types.ts` and both sides read them. The Human yields that are literals in
`human-world.ts` today move into `JOBS`, with the values unchanged.

| Item | v1 | v2 (locked) | Side |
|---|---|---|---|
| House start / beam stage | 2 / 7 | 2 / 7 | both |
| Wall stages 3–6 | 2 timber, work 240 | **2 timber, work 120** | both |
| Beam (stage 7) | 2 timber, roll 0.35 | unchanged | both |
| Roof stages 8–10 | 2 timber, work 240 | **5 timber, work 600** | both |
| Human build per 60-min session | 0.25 + 0.5×skill | walls **0.30 + 0.40×skill**; roof **0.06 + 0.08×skill**; × 0.7 under protest | Human |
| Classic build | work 240, builder 2×, rush 1.25 | work = stage W; builder 2×, rush 1.25 | Classic |
| Cooking pot | C: 1 grain + 1 water → 3 meals; H: 2 grain + 1 water → 6 | **2 grain + 1 water → 4 meals, 40 min**, both sides | both |
| Classic meal / raw relief | 60 / 25 | **40 / 25** | Classic |
| Classic hunger per minute, STOCK_CAP.meals | 0.1, 6 | unchanged | Classic |
| Human meal / raw food | 0.8 / 0.3 | unchanged | Human |
| Human cook offered while | meals < 6 or a meal duty is due | meals < **12**; from D2 16:00, meals < **18** ("she cooks for the storm"); or a meal duty is due | Human |
| Storm cooking | allowed | **none from D2 19:00 to D3 03:00**, both sides | both |
| Storm meals | none | scripted **storm supper D2 19:30** and **dawn meal D3 04:45**: each living villager takes 1 meal from the store if one is left | both |
| Eat in shelter | no | Human: an `eat` affordance in shelter draws from the store | Human |
| Storm decay | unshuttered house < stage 7 loses 1 stage/h | unfinished, unshuttered house at stage 1–9 loses **1 stage per 2 storm hours, at most −4** (*assumed*, not measured; it does not affect the 19:00 goals) | both |
| SCENARIO_VERSION | `colony-scenario@1` | **`colony-scenario@2`** | — |

The table in code:

```ts
export const STAGE_COST = { wall: { timber: 2, work: 120 }, beam: { timber: 2 }, roof: { timber: 5, work: 600 } } as const;
export function stageKind(nextStage: number): 'wall' | 'beam' | 'roof' // 3–6 wall, 7 beam, 8–10 roof
```

## 3. Measured outcomes (as shipped, `balance.test.ts`)

Goals are R S L (roof, stock, lives). Storm stock and house are at D2 19:00.

| Pattern | Classic | Human |
|---|---|---|
| none (Classic alone / Solo) | ✗✓✓ · 13 meals · house 9 | ✗✓✓ · 17 meals · 9.78 |
| good2rush (rush all but Maryam to the house; Maryam to the kitchen D2 13–18) | ✓✓✓ · 14 · roofed D2 05:26 | ✓✓✓ · 17 · roofed D2 12:01 |
| allForest (everyone to the forest, re-issued) | ✗✗✗ · 0 · 4 · 6 dead | ✗✓✓ · 13 · 8.21 |
| good2insist | ✓✓✓ · 18 | ✗✓✓ · 15 · 9.85 · 21 injuries |
| suggestions only (every card, squall insisted) | ✓✓✓ · 15 | ✗✓✓ · 16 · 8.92 |
| Day 3, none | store-room ✓ · stock ✓ · lives ✓ | Solo: store-room ✗ (done 18:18) · ✓ · ✓ |
| Day 3, good2rush | ✓✓✓ | ✓✓✓ (store-room done 14:04) |

Seeds 1–5 (probe, not pinned): Solo fails the roof only on 6/6; good2rush wins all three on both sides on 6/6;
allForest loses on both sides on 6/6; Classic with no orders roofs on 3/6 (it misses on the shipped seed);
good2insist costs the Human roof on 6/6.

## 4. Per-item decisions

| # | Item | Decision | Owner |
|---|---|---|---|
| 1 | Start paused behind the goal card | The worker inits paused with `pause.kind = 'start'`. The goal card shows the three goals, the storm time and one line on the two sides; **Play** sends `resume`. Remove the onboarding hand and intro timers. Keep the one-time "Tap any bubble" toast after the first frame. | SIM + UI |
| 2 | Speed | `SIM_MINUTES_PER_SECOND = 8`. Table in §5. | SIM |
| 3 | Auto-pause | Decided in the worker. Rules in §6. One toggle, on by default. | SIM + UI |
| 4 | Goals | §1. The goal strip sits under the topbar and shows each goal with a Classic and a Human status chip. | SIM (values) + UI |
| 5 | Day and storm markers | The frame carries `timeline`. Header text: `Day 1 of 2 · storm in 13 h`. During the storm: `Storm · ends 03:00`. After the end: `Day 3 · dawn`. | SIM + UI |
| 6 | Suggestion reasons | `Nudge.reason` (one sentence, states the risk). §7 lists the texts. | SIM |
| 7 | One composer | §8. | UI (+ `nudgeId` on `order`) |
| 8 | Dismiss becomes a countdown | The card drains a bar in sim time: "lapses 06:30 · in 47 min". Expiry counts as dismissal (not logged; it follows from the clock). The × "skip" button dismisses early (logged as `dismiss`). | UI |
| 9 | Space always toggles pause | §8. | UI |
| 10 | One page, no page scroll | §9. | UI |
| 11 | Inspector | §10. | UI |
| 12 | Site vs House | Visible name **House** everywhere: map label, job labels ("build the house"), nudge texts, goal labels. `PlaceId` stays `'site'` internally. | SIM (map.ts, labels, nudges) + UI (copy) |
| 13 | Mobile | §9. | UI |
| 14 | Rebalance | §2 and §3. | SIM |
| 15 | A finished house matters | §11. | SIM |
| 16 | Classic columns | "Classic has no such concept". | UI |
| 17 | Another day | §12. | SIM + UI |

## 5. Speed table (item 2)

| Control | sim-min per real second | One day (1440 min) | Full run (2880 min) |
|---|---|---|---|
| ½× | 4 | 6 min | 12 min |
| **1× (default)** | **8** | **3 min** | **6 min** |
| 2× | 16 (the v1 1×) | 1.5 min | 3 min |

- `MAX_MINUTES_PER_TICK` stays 8.
- Slow-mo (0.25× for 3 s on a new moment) runs **only when auto-pause is off**. With auto-pause on, the moment
  pauses instead.

## 6. Auto-pause rules (item 3)

The worker decides auto-pause, so the decision is the same for every UI and is testable headless. An auto-pause
happens **after** the minute that caused it has been stepped.

| Reason | Fires when | Once per |
|---|---|---|
| `suggestion` | a nudge becomes visible | nudge |
| `refusal` | the first Human verdict on a **player** card that is `notNow`, `willNot` or `complied` (not `cannot`, not `assent`, not bodily-need thoughts) | card |
| `moment` | a moment fires | moment |
| `storm` | the warning (D2 16:00) and the storm start (D2 19:00) | event |

- **Stop inside the tick.** A tick can step up to `MAX_MINUTES_PER_TICK` (8) minutes. When an auto-pause fires,
  the worker stops stepping at that minute and drops the rest of the tick's dt. It never runs past the pausing
  minute.
- At most one auto-pause per sim minute. If several reasons fire in the same minute, they coalesce into one
  `PauseInfo`: the first reason in table order decides `reason`, and `text` lists the rest.
- `setAutoPause{on:false}` stops new auto-pauses. A current pause stays until the player resumes.
- **Resume on act.** If the pause was caused by a suggestion and the player confirms or skips that suggestion
  (by `nudgeId`, or a plain order with the same person and place, which settles it), the worker resumes. Any
  other order leaves it paused.
- **Inspector.** Opening the inspector sends `pause` with `cause:'inspector'`. Closing it sends `resume` only if
  that pause is still the current one (the UI tracks it). A manual pause or an auto-pause during inspection
  wins.
- The UI keeps the toggle in `localStorage` (`colony.autoPause`, wrapped in try/catch) and sends it in `init`.
- Determinism: auto-pause changes only *when* the player acts. It is not logged, and replay ignores it.

## 7. Suggestion script v2 (items 6, 8, 12)

`Nudge` gains `reason: string` and `prefill?: { rush?: boolean; insist?: boolean }` (replacing `insistHint`).
Times and orders stay the same except where marked **new**. Moment test deadlines are unchanged apart from M4
(§14).

| id | Shows → lapses | Text | Reason (as shown) | Order / prefill |
|---|---|---|---|---|
| dawn-site | D1 05:30 → 06:30 | First light. Send Yusuf to the house? | He is your best builder and walls are cheap now. | yusuf → site |
| cedar | D1 08:00 → 09:00 | Idris could take the big cedar: three timber at once. | Fast timber, but the cedar can hurt whoever fells it. | idris → cedar |
| cook-forest | D1 10:45 → 11:45 | Timber is short. Maryam is free until noon. | Timber now, but the pot sits cold while she is gone. | maryam → forest |
| dusk-site | D1 18:25 → 19:25 | Light's going. Send Yusuf back to the house? | One more wall before dark, if he is not spent. | yusuf → site |
| squall-tariq | D1 21:35 → 22:35 | Timber is short; Tariq is awake. | It is night and a squall is blowing. Forcing him may cost his trust. | tariq → forest, prefill `insist` |
| tariq-again | D2 07:00 → 08:00 | Morning. Timber is still short. Send Tariq to the forest? | He remembers last night. | tariq → forest |
| **roof-hands-1** | D2 09:00 → 10:00 | The roof needs hands. Rush Samira to the house? | Roof stages are slow; a rushed helper speeds them up. | samira → site, prefill `rush` |
| **roof-hands-2** | D2 09:30 → 10:30 | And Danyal? | The well can wait an hour. | danyal → site, prefill `rush` |
| **storm-pot** | D2 16:30 → 17:30 | The storm will put the fire out. Maryam, cook a pot to keep? | Nobody can cook from 19:00 until 03:00. | maryam → kitchen |
| storm-shutter | D2 18:00 → 19:00 | The roof will not be on before the storm. Shutter the house? | An unshuttered, unfinished house loses stages in the storm. Shuttering stops the roof work. | yusuf → site |

`storm-shutter` is not shown once each side's house is at 10 or shuttered.

## 8. Composer, suggestions and keys (items 7, 8, 9)

**One composer** in the center column. Its states:

| Step | The player does | The composer shows |
|---|---|---|
| 1 Who | taps a villager (roster chip, or a unit on either map) | the chosen name; place chips enabled |
| 2 Where | taps a place (map or chip: House, Forest, Cedar, Field, Well, Kitchen, Masjid, Home) | the inferred job ("build the house") and the Human prediction (`predict`) as one line: "Yusuf: likely yes" |
| 3 How (optional) | toggles **Rush**, **Insist**, or the appeal | the toggles; Insist shows "may cost trust" |
| 4 Confirm | presses **Confirm** or Enter | the order goes to both sides; the composer resets to step 1 |

- Esc clears the composer. Tapping a villager again restarts it.
- **A suggestion prefills it.** "Use" on a suggestion card fills who, where, the reason and the prefill toggles,
  so only Confirm is left. The toggles stay editable. Confirm sends `order{input, nudgeId}`.
- **Suggestion card:** text, reason, a countdown bar ("lapses 06:30 · in 47 min"), **Use**, and × **skip**.
  There are no separate Give and Insist buttons.
- **Space** (item 9): a `keydown` listener on window in the capture phase toggles pause and calls
  `preventDefault`. A `keyup` listener also calls `preventDefault`, so a focused button is not clicked. The only
  exception is when focus is in an `input`, `textarea`, `select` or `[contenteditable]` element. Enter
  confirms; Esc clears or closes the inspector.

## 9. Layout (items 10, 13)

**Desktop, ≥ 1024 × 700.** The body has `height: 100dvh; overflow: hidden`, and nothing scrolls the page.

| Row | Height | Contents |
|---|---|---|
| Topbar | 56 px | title · clock · timeline (day line, squall, warning, storm band, now-cursor) · ½× 1× 2× · pause · auto-pause toggle |
| Goal strip | 44 px | three goals, each `label · Classic chip · Human chip`, plus the deadline |
| Stage | 1fr | `[Classic pane | 320 px center column | Human pane]` |

- **Each pane** has a header row with its name and stats (meals · house n/10 with a progress bar · injuries ·
  alive; Human adds prayers · morale · trust), then the canvas filling the remaining space.
- **Center column**, top to bottom: the composer, the suggestion slot (at most one card; others queue with a
  "+1" chip), and the order log (`flex: 1; overflow: auto`, the only scroll box).
- **Removed:** the hints list, the bottombar, and the separate Scoreboard block. Its numbers move to the pane
  headers and the goal strip.

**Mobile, 375 × 812.** One column, no page scroll.

| Row | Height |
|---|---|
| Topbar (clock, speed, pause; auto-pause sits in a ⋯ menu) | 48 px |
| Goal strip (three icons with two status dots each; tap for labels) | 40 px |
| Classic pane | ~30 vh |
| Composer tray (sticky; suggestion card overlays it) | auto |
| Human pane | ~30 vh |
| "Orders (n)" button opens the order log as a bottom drawer | 44 px |

- Hit targets are at least 44 px.
- Canvases scale to their box. Tapping a unit selects it in the composer; a long press opens the inspector.

## 10. Inspector (item 11)

- **Form:** a centered modal `<dialog>`, about 720 px wide, with a backdrop. Focus is trapped and Esc closes it.
  On mobile it is a full-screen sheet.
- **Opening it** pauses play (§6).
- **Two columns:**

| Classic unit (left) | Human person (right) |
|---|---|
| current task, hunger bar, hp bar, rush flag | needs (food, rest, …), emotion, trust meter |
| caption: "That is all a Classic unit has." | **Why** bars for the current decision (`why`) |
| for each row the Human has and Classic lacks: "Classic has no such concept" | recent memories, and what the person thinks of the player |

## 11. A finished house matters (item 15)

| Situation at D2 19:00 | Idris and Samira | Human effect | Classic effect |
|---|---|---|---|
| House at 10 | sleep and shelter at **House** (`'site'`) | sleep advertises 0.8 (normal) | relocated, no other effect |
| House below 10 | shelter in the **masjid** (crowded) | sleep there advertises **0.5**; at 19:00 each gets a felt percept, kind `crowded`, valence −0.4, salience 0.7: "No roof of our own tonight." | relocated, no other effect |

- `homeOf(id, world, minute)` lives in `world-types.ts`, and both sides use it. On Day 3 an unroofed family goes
  back to its old home; a roofed one lives in the house.
- Storm decay is kept (§2). The squall is unchanged.

## 12. "Another day" (item 17)

The smallest version that is still meaningful:

- **Offer.** After D3 05:00 the end screen shows **Another day** once, when `frame.canContinue` is true (only
  after Day 2).
- **Mechanics.** The UI sends `continue`. The worker calls `game.continueDay()`, which logs
  `{minute, kind:'continue'}` and raises the instance field `endMinute` from 2880 to 4320. `replay` honours the
  entry. `END_MINUTE` stays as the Day-2 default.
- **Day 3 rules.** Clear weather (the weather constants are absolute minutes, so nothing fires again). No
  moments, no nudges.
- **The project** (as shipped, §0). A **store-room** at the same place on both sides: 6 stages, each 2 timber and
  work 120, no beam. A house below 10 is finished first; the store-room opens when it is roofed. `inferAction` at
  `'site'` builds whichever is open.
- **Day-3 goals**, which replace the strip:
  1. store-room 6/6 by D3 18:00
  2. at least 12 meals at 18:00
  3. all alive at D4 05:00
- **Continuity.** People, memories, trust and debts carry over because it is the same game instance. The Solo
  control continues from its own Day-2 end.
- **End screen.** The Day-2 report stays available as a tab next to the Day-3 report.

## 13. Ownership split and contract

Two engineers build in parallel. Neither edits the other's files. **SIM lands the types in `protocol.ts` and
`game.ts` first** (stubs that compile, with dummy values), and UI builds against them.

| Set | Files | Work |
|---|---|---|
| **SIM** | `apps/site/src/colony/sim/*`, `worker.ts`, `protocol.ts` | §2 numbers and STAGE_COST; JOBS shared yields; storm cooking, storm meals, shelter eat, decay; `homeOf` and the crowded percept; goals; timeline; nudge reasons, prefills and the new nudges; the House label; auto-pause engine and start-paused; speed constant; `continueDay` and Day-3 project; `balance.test.ts`; test updates |
| **UI** | `apps/site/src/colony/ui/*`, `main.tsx`, `ui/colony.css`, `apps/site/colony/index.html` | goal card; goal strip; topbar timeline; composer; suggestion card with countdown; Space handling; layout desktop and mobile; inspector modal; "Classic has no such concept"; end screen goals and Another day; auto-pause toggle and localStorage |

### Protocol (`protocol.ts`)

```ts
export type Speed = 0.5 | 1 | 2;

export type MainToWorker =
  | { type: 'init'; seed: number; scenarioVersion: string; gen: number; autoPause: boolean } // starts paused, pause.kind 'start'
  | { type: 'tick'; dtMs: number }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'pause'; cause?: 'manual' | 'inspector' }
  | { type: 'resume' }
  | { type: 'setAutoPause'; on: boolean }
  | { type: 'order'; input: OrderInput; nudgeId?: string } // nudgeId: the order came from that suggestion
  | { type: 'cancel'; orderId: string }
  | { type: 'dismissNudge'; id: string }
  | { type: 'why'; personId: VillagerId; decisionId?: string }
  | { type: 'predict'; requestId: number; input: OrderInput }
  | { type: 'continue' };

export interface PauseInfo {
  kind: 'start' | 'manual' | 'inspector' | 'auto';
  reason?: 'suggestion' | 'refusal' | 'moment' | 'storm';
  text: string;              // e.g. "Tariq won't go: it is night and he is spent."
  nudgeId?: string;
  orderId?: string;
  personId?: VillagerId;
  minute: Minute;
}

export interface PlaybackState { paused: boolean; pause: PauseInfo | null; speed: Speed; autoPause: boolean; slowMo: boolean }

export type WorkerReply =
  | { type: 'frame'; frame: Frame; playback: PlaybackState } // `Frame.clock` stays the "06:30" string
  | { type: 'why'; personId: VillagerId; decisionId?: string; why: WhyBreakdown | null }
  | { type: 'predicted'; requestId: number; prediction: Prediction }
  | { type: 'ended'; summary: EndSummary }
  | { type: 'error'; message: string };
```

### Frame additions (`sim/game.ts`)

```ts
export type GoalId = 'roof' | 'stock' | 'lives' | 'project';
export type GoalStatus = 'open' | 'met' | 'failed';
export interface GoalSide { value: number; status: GoalStatus }
export interface GoalView { id: GoalId; label: string; target: string; deadlineMinute: Minute; classic: GoalSide; human: GoalSide }

export interface TimelineMarker { minute: Minute; kind: 'day' | 'squall' | 'warning' | 'storm' | 'end'; label: string; until?: Minute }

export interface Nudge { id: string; minute: Minute; until: Minute; text: string; reason: string;
  order: OrderInput; prefill?: { rush?: boolean; insist?: boolean } }

export interface WorldView { /* v1 fields */ houseProgress: number /* 0..1 within the current stage */;
  project: { kind: 'house' | 'storeroom'; stage: number; stages: number } }

export interface Frame { /* v1 fields */
  endMinute: Minute;                         // 2880, or 4320 after continue
  day: { current: number; total: number };   // "Day 1 of 2"
  timeline: { end: Minute; markers: TimelineMarker[] }; // day 1440, squall 990–1080, warning 2100, storm 2280–2760
  goals: GoalView[];
  canContinue: boolean;
}

export type LogEntry = /* v1 kinds */ | { minute: Minute; kind: 'continue' };

export interface EndSummary { /* v1 fields */
  day: 2 | 3;
  goals: GoalView[];           // final, both sides
  soloGoals: GoalSide[];       // Solo control, same order as goals
  character: { prayersKept: number; prayersDue: number; morale: number; trust: number }; // Human only
}
```

The `Scoreboard` type stays, for the pane headers.

## 14. Tests and checks (SIM)

- **`sim/balance.test.ts`** replaces the scratch harness. It runs on the shipped seed with the locked numbers in
  code (no runtime mutation) and asserts (as shipped):
  - Solo fails `roof` only, and its storm stock is within 6 of the goal.
  - Classic with no orders fails `roof` only.
  - `good2rush` wins all three goals on both sides, and every Day-3 goal on the Human side.
  - `allForest` loses at least one goal on each side and leaves the Human roof more than a stage below Solo's.
  - `good2insist` costs the Human roof.
  - Following only the suggestions fails the Human roof (stock and lives met) and wins all three on Classic.
  - On Day 3 Solo misses the store-room deadline.
  - Each side eats at least 35 meals. The file runs in under 5 s.
- **`human.test.ts`:** the M4 deadline moves from 16:30 to **17:00** (it now fires around 16:26). M1, M2, M3 and
  M5 are unchanged. The determinism test also covers a log with `continue`.
- **New unit tests:**
  - auto-pause coalescing and once-per rules
  - resume-on-act
  - start paused
  - storm meals taken at 19:30 and 04:45
  - `homeOf`
  - goal status locking at 19:00
  - stage pricing
  - Classic stage claims (no beam skip, one payment per stage, store-room clamped at 6)
  - the shutter window (builds at 17:00 at stage 9, shutters from 18:00, never on Day 3)
  - a plain composer order that settles the pausing suggestion resumes
- The sim keeps its rules: no `Math.random` and no `Date.now`. All randomness comes from `scenarioRoll`.
- `npm run check` passes before the branch is merged.
- Delete `balance.scratch.test.ts` once `balance.test.ts` lands.

## 15. Open and assumed

| Item | Status |
|---|---|
| Storm decay "1 stage per 2 h, at most −4" | Assumed. Not measured, because it acts after the 19:00 goals. It sets the end-screen house stage and the starting stage of the Day-3 "Finish the house" project, which was not measured either. |
| Crowded-masjid sleep value 0.5 and the percept's numbers | Assumed. No balance effect was measured (it acts after 19:00). |
| Mobile heights | Assumed, to be checked on a real 375 px screen. |
| Day-3 balance | Measured on the shipped seed only (§3): Solo misses the 18:00 store-room by 18 minutes; good2rush meets it at 14:04. |
| Map fill on tall desktop panes | Partly done (§16): when a pane has 180 px to spare under the map, it shows one status row per person there. A pane with less spare height keeps a smaller band. |
| Seeds other than 20261003 | Measured for none, good2rush, directorCedar and allForest on 5 more seeds (§1). The other patterns were measured on the shipped seed only. |

## 16. Playtest round, 2026-10-04 (phone fit, report, icons)

These changes answer six items from the 2026-10-03 playtest.

- **Phones (360–390 px).** The roster is a 6-column grid with the portrait above the name. Place chips are an 8-column grid with an icon above a short label. Appeals use short labels in a 3-column grid. Nothing scrolls sideways at 360×740, 384×832 or 390×844. When collapsed, the goal strip shows one pair of bars per goal (C over H) with a tick at the target: roof 10, meals 12, alive 6, store-room on Day 3. The meals bar scale is the larger of the target and the highest value, times 1.25.
- **Desktop bands.** `PaneBody` measures the pane. When the pane has at least 180 px spare under the width-bound map, it adds one row per person below the map: what the person is doing, plus two bars. The bars are Fed and HP for Classic, Food and Sleep for Human. Clicking a row selects that person. At 1366×850 this fills the lower band. The map is not enlarged.
- **Icons.** `ui/Icon.tsx` holds path data copied from Lucide (ISC, notice in the file; `moon` is Feather, MIT). Icons are drawn in `currentColor`. They are decorative when they sit beside text; otherwise they carry `role="img"` and a label. The file also has a ring timer for suggestion lapse and the grey ∅ mark for "Classic has no such concept". The ∅ mark uses the phrase as a tooltip and as hidden text.
- **Order words.** A refusal now reads "refused" instead of "done", because a refusal settles the card. A Classic no-op reads "could not (reason)", for example "could not (no free stage)"; this replaces "Classic —". The Human answer is shown as its first reply and its last reply, because later replies overwrite the chip label. The first reply is now stored as `SideChip.first`.
- **Which roof number.** Each goal row in the report says when it is judged (D2 19:00, or D3 05:00 for lives). The village rows say "Day 3 dawn, after the storm". So 9/10 in the goal row and 90% in the house row are two different moments.
- **What would have won.** `sim/hindsight.ts` replays the player's log up to a branch minute. It then runs the balance tests' good-order policy (`GOOD2` with Rush, now in `sim/policies.ts`) to the end of Day 2. Branches run latest first: D2 09:00, D2 05:00, D1 12:00, dawn. The report names the first branch that wins all three Human goals. The replay runs in its own worker (`hindsight-worker.ts`), starts only for a Day-2 report with a missed Human goal, and is deterministic (tested). It covers Day 2 only, with one policy; it does not search for the smallest change that would have won.
- **Near misses.** Day 2, both sides. A roof finished after 19:00 gets its exact minutes late. A roof one or two stages short gets the next stage's percentage. A store short by at most one pot (4 meals) gets a meals line. There is no minutes estimate for an unfinished roof, because no pace model was built.
