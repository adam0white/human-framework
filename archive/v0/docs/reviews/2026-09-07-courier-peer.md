# Courier Round independent peer review

Reviewed on 2026-09-07 by the courtyard-game author. Scope was read-only: voluntary `endRound`, one-click versus interval UI, route/deadline capacity, active saves and save resumption. No courier or root file was edited by this reviewer.

## Reviewed source identity

Repository: `/Users/abdul/code/human-framework`.

Reviewed integration commit: **`11157bf1fa818bb21cfef407d2f3a7e4a0134521`** (`Streamline courier turns and preserve voluntary partial endings`). Source SHA-256 values below were recovered from that exact Git object after the review, rather than assuming the evolving main worktree remained unchanged.

| File | SHA-256 at reviewed commit |
|---|---|
| `src/games/courier.js` | `2dd67cfd2111b069fa546d07caa95e3f668c290369dad6cadc015aad0ed4d9cd` |
| `src/games/courier-policy.js` | `90757d495b17ca71b1ad2e540e35b617b3d2bc3a8b5e788aab21907bcadc845c` |
| `web/courier.html` | `65620bee90301664f5660f35ad54f223816ce6c00424f834756b46301dc34533` |
| `web/courier.js` | `c683e6b7a6fbb57fc0175b1ccb13960a6c7b6e940ac93355d8b10c066f5d93f8` |
| `web/courier.css` | `17fce75d3660fb9324a41f93633984403a80f2543cba7937774779089e243711` |
| `tests/courier-game.test.js` | `f97b97b935a6c3c8bd3d836436423f035a2bd90e5a8940ffad108f9a4da33250` |
| `tests/courier-policy.test.js` | `8a71f5dd9b1586371617e361b00d5ea506df0f7a385a4878c40b2a5180f2920d` |
| `tests/courier-benchmark.test.js` | `0b9a13f86036b6f946baebb00e5bfc8b9e5d4558c8d30fe6ba45f6ce928ab51d` |

## Finding: P2 — imported world effects can omit required travel

`importGame` accounts for loading, delivery handover, meals, crossing trials, inspection time and a pending interval, but does not enforce necessary reachability from the depot. Two exact exploit cases were executed and accepted:

```js
import {
  createGame, exportGame, importGame, startAction, finishAction,
  advanceTime, interruptAction
} from './src/games/courier.js';

// A: teleport without paying any time.
const teleport = exportGame(createGame());
teleport.location = 'mill';
console.log(importGame(teleport).location); // observed: "mill", clock remains 0

// B: an otherwise legal five-minute prefix gains a remote delivery.
let game = finishAction(startAction(createGame(), 'load-medicine'));
game = interruptAction(advanceTime(startAction(game, 'rest'), 3));
const delivery = exportGame(game);
delivery.parcels.medicine = {owner: 'clinic', deliveredAt: 5};
console.log(importGame(delivery).parcels.medicine);
// observed: {owner: 'clinic', deliveredAt: 5}
```

The second case is too early even for a successful shortest crossing: it must first pay for loading and travel from the depot, then hand over the parcel. Recommended fix: necessary current-location, destination-delivery and inspection-endpoint travel bounds, without double-counting crossing trial time already included in paid effects. These are consistency checks, not a request for authenticated historical saves.

The root and courier author received both exact reproducers. The courier author reported reproducing them and, with root authorization, is adding failing regression tests for both cases and premature inspection reports, then implementing route/time lower bounds.

## Executed test evidence before the fix

`node --test tests/courier*.test.js` completed with **25 tests passed, 0 failed, 0 skipped**. The suite covers owned parcel loading/unloading/delivery, both route strategies, paid inspections, hidden-condition boundaries, same-draw interruption behavior, practice, deadline interruption, voluntary ending, blocked effort, meals, save consistency, replay and finite policy runs.

An additional deterministic legal-action exercise completed **5,735 interval-and-early-end save/restore checks**, with no mismatch or rejection. It sampled 100 seeds and up to 80 steps per seed, stopping each finite run at a terminal state. At every step it checked both the active state and a voluntarily ended copy. Exact workload:

```js
import {
  createGame, getGameView, startAction, advanceTime, interruptAction,
  endRound, exportGame, importGame
} from './src/games/courier.js';

let checked = 0;
for (let seed = 0; seed < 100; seed++) {
  let game = createGame({seed});
  for (let i = 0; i < 80 && game.status === 'playing'; i++) {
    const actions = getGameView(game).actions;
    game = startAction(game, actions[(seed * 7 + i * 11) % actions.length].id);
    game = advanceTime(game, [.125, .5, 1, 2, 5, 25][(seed + i) % 6]);
    if (game.pending && i % 3 === 0) game = interruptAction(game);
    if (game.pending && i % 3 !== 0) game = advanceTime(game, 25);
    const restored = importGame(exportGame(game));
    if (JSON.stringify(restored) !== JSON.stringify(game)) throw Error('Resume mismatch');
    const ended = endRound(game);
    if (JSON.stringify(importGame(exportGame(ended))) !== JSON.stringify(ended))
      throw Error('End mismatch');
    checked++;
  }
}
console.log(checked); // observed: 5735
```

No additional major finding arose in the bounded review of `endRound`, elapsed-time handling, capacity, or the declared route heuristics. This is a scoped result, not a claim of exhaustive correctness.

## Independent browser evidence

Used a dedicated temporary local harness at `http://127.0.0.1:4295/courier/` and an isolated Chromium context, with a **390 × 844** viewport. This was desktop browser emulation, not a physical-phone test. The harness and isolated QA context were closed after the review.

1. Clicked **Load fabric** in default play mode. Observed `2 of 240 elapsed`, `1 / 3 bag slots`, and no visible pending panel: the ordinary choice completes in one click.
2. Travelled to the market and delivered the fabric.
3. Enabled interval mode, started the 24-minute ridge road, and advanced one minute. Observed pending progress **`1 / 24 min`**.
4. Clicked **End round & keep deliveries**. Observed **Round ended early**, one delivered parcel, one on time, none late, five undelivered, and **minute 16 with 224 minutes left**. The unfinished journey did not move the courier.
5. Reloaded. The same ended summary survived, with no pending action and the End round button hidden.
6. No page errors were captured. `innerWidth = 390`; body scroll width was `375`, so there was no horizontal overflow.

## Fix status and follow-up scope

At note creation, the fix commit was pending. The independent verification below supersedes that pending status. This follow-up was limited to the two exact exploit cases and focused save tests; no root or courier source edits were made by this reviewer.

## Independent verification of the fix

Verified on 2026-09-07 against clean worktree `/Users/abdul/code/human-framework/.worktrees/courier-route` at exact commit **`6195e99ec3ea2be578b1cc89eae876b628e798ea`**. The checked host file `src/games/courier.js` has SHA-256 **`ddfcec4978380364bfb3b36d1dd936bc8b85825ffb960596e7a32b36561800aa`**.

Both original exploit cases were rerun independently with `assert.throws`:

| Exact original case | Observed result after fix |
|---|---|
| Initial save moved to the mill at minute 0 | Rejected: `Insufficient travel time for current location` |
| Legal five-minute prefix changed to medicine delivered at clinic at minute 5 | Rejected: `Invalid delivery time` |

Focused command:

```sh
node --test --test-name-pattern='save|resume|malformed' tests/courier-game.test.js
```

Observed **5 tests passed, 0 failed, 0 skipped**:

1. Pending resume is byte-identical and effects cannot be applied twice.
2. Separate command replay reproduces an interrupted active save.
3. Malformed saves reject overfilled bag, hidden condition changes, clocks and forged pending effects.
4. Save chronology rejects unreachable current locations, premature deliveries and remote inspections.
5. Earliest legal shortcut delivery and partial crossing saves do not count travel twice.

**Current finding status: fixed and independently verified for the two reported exploits.** The focused suite also confirms legal earliest-delivery and pending-crossing saves survive the new bounds. Root integration retains responsibility for the final combined suite and release verification.
