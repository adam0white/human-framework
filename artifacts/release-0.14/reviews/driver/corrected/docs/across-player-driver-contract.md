# Across the Cut player and receiver contract

Selected implementation for the [actor-local execution boundary](actor-local-player-execution.md), 2026-09-08. Player `0.1.0`, receiver `0.1.1`, player save `1`, public host `0.2.0`. This is authored software behavior for one disposable scene. The frozen private study, Human/runtime `0.1.1`, and clock `0.1.0` remain unchanged. The public host's unassigned paid recovery is an explicit difference from the historical private study's active idle maintenance.

## Player facade and information ownership

`src/games/across-cut-player.js` exports `PLAYER_VERSION`, `RECEIVER_VERSION`, `createGame(options={})`, `getGameView(game)`, `applyCommand(game,command)`, `advanceGame(game,minutes)`, `advanceToNextEvent(game)`, `exportGame(game)`, `restoreGame(save)`, and `getDebrief(game)`.

Creation forwards the host's supported setup options and performs no receiver decision or paid time. Successful keeper requests start only the keeper's job. Rendering, saving, switching panels, and reading the outcome controls do not advance time. Functions return new, deeply frozen game handles registered by this module. Arbitrary objects and edited copies are rejected with `INVALID_GAME`; views and save recipes are detached mutable JSON.

The game handle is implementation state, including the host and receiver state. Ordinary presentation receives only `getGameView`, which spreads the keeper's detached host view and adds:

- `canAdvance`: true until public minute 30, irrespective of private service/departure.
- `canStop`: whether the keeper currently has a paid job.
- `pauseReason` and `stopReason`: matching local interface reason codes.
- `choices`: seven work choices, each `{id,label,detail,duration,action,unavailable}`. IDs are `inspect`, `repair-full`, `repair-one`, `release`, `travel-dock`, `travel-valve`, and `meal`. An available choice has `unavailable:null`; a refused estimate/local prerequisite has a plain explanation.
- `reportableObservations`: the keeper's own local notebook records with permitted absolute cues. Notebook controls select receipt numbers and submit their own radio/contact request. Relays and observer-relative presence are excluded.

Choice prerequisites use only the supplied own view. Human's body reading is rounded to 0.05; capacity checks conservatively use its upper bin edge, clamped to one. This can postpone an actually possible action until another paid recovery minute. It prevents a rounded estimate from promising a whole interval that the host's actual body cannot sustain. The host still performs authoritative admission. Radio/contact requests remain subject to host time, resource, local-presence, first-hop, and capacity rules.

`applyCommand` accepts exactly `{type:'request',action}` or `{type:'stop'}`. Action is the public host action shape. Refusals preserve the original game and use local host errors. Stop is always an explicit lifecycle interruption, preserving paid work/position and restoring eligible reservations under the host contract. Host decision budgeting reserves the current job's Stop even after ordinary admission closes.

`getDebrief` throws `NOT_ENDED` before minute 30. After that public endpoint it returns the detached, explicitly researcher-only host world summary. It does not add hidden truth to `getGameView`.

## Integer time and interface pauses

Both advance methods pay integer minutes internally. `advanceGame(game,n)` accepts elapsed whole minutes 1–30 and stops early for the same local events as Continue. `advanceToNextEvent` continues toward minute 30. An already-ended advance returns the same handle and appends no save command.

At each minute:

1. Capture both detached actor views before any same-minute commands. The first keeper control at that timestamp retains this decision frame; subsequent keeper controls at that same time preserve it.
2. Apply the player's explicit keeper controls in their submitted order. They change only its job/control/reservation state and pay no time.
3. On explicit advancement, choose the receiver's bounded command list using the previously captured receiver view and its independent policy state. Dispatch any receiver Stop, then its request. No actor sees the other's same-minute choices before deciding.
4. Advance the host exactly one paid minute using its declared physical settlement order; inspect the actual new keeper view. Discard the prior decision frame.

Pause priority is `horizon`, `report`, `own-completion`, `known-launch`, `local-change`, then `capacity-available`. Incoming report checks use actual inbox growth. Local change checks use actual location/new notebook observations, excluding the keeper's ongoing per-minute valve-repair progress receipts. Available recovery stops when a work choice previously blocked by its body estimate becomes available. A requested elapsed interval exhausted without another stop gives `time-limit`. Non-advancing states are `ready`, `started`, or `stopped`.

The driver never consults the inbound queue, researcher summary, hidden configuration, or remote actor work to forecast a pause. A locally known future launch boundary is legitimate; a private earlier departure cannot end the keeper's shift. Receipt pauses the interface only: pending release, travel, meal, repair, or other work remains held until completion or an explicit player Stop. Repeated reads of that receipt do not change time, payment, or position.

## Authored receiver policy

`src/games/across-cut-receiver.js` exports `RECEIVER_VERSION`, `createReceiverState()` and `decideReceiver(state,view)`. The latter takes only the detached receiver view and JSON policy state `{version,mode}`, returning `{state,commands,reason}`. It imports released Human capacity assessment but no host, setup, clock queue, private comparison controller, player interface state, or researcher truth. Its state and reasons stay outside ordinary keeper presentation.

The receiver inspects once for one paid minute, then sends its own local launch and repair facts for one paid radio minute. It chooses its most recent own local records, preserving original observation times. This initial report precedes the impossible-repair cart decision. With a fresh capable receiver it is observed at minute one, sent at minute two; a six-minute channel delay delivers it at eight.

After the report, the receiver repairs in consecutive paid one-minute decisions and attends in consecutive paid one-minute decisions while pipe service is viable. Those adjoining intervals provide continuous paid coverage and allow reaction between minutes. It never treats absent keeper reports as failure or refusal. It stops after locally observed full service or departure.

The receiver takes a useful cart immediately when `now + own remaining repair > own known launch`, or when legitimately received upstream facts establish an impossible earliest pipe arrival. For received valve requirement `r` and an incomplete progress fact `p < r` observed at source time `t`, the optimistic arrival lower bound is `t + (r - p) + 2 + 3`. Only a bound strictly later than launch proves impossibility; equality remains possible. This deliberately optimistic bound ignores possible inspection/radio displacement. A completed-progress snapshot alone and silence provide no such proof. The policy can explicitly stop held work before requesting the cart. It requests the cart only if its five-minute outbound segment can still deliver; once chosen it pays the return too, subject to public horizon interruption.

If the conservative body estimate cannot support the next interval, the receiver can consume its own two-minute meal when hungry above .45 and one remains. Otherwise it remains available for the host's paid recovery and reconsiders next minute. No recovery is credited while a task is held. Once no timely route remains, it stays available. These are authored decisions, not calibrated human behavior.

## Compact save recipe and reconstruction

The only player save shape is `{format:'human-across-cut-player',saveVersion:1,playerVersion:'0.1.0',receiverVersion:'0.1.1',setup,commands}`. It stores normalized host setup and player commands, including `{type:'advance',minutes}` and `{type:'continue'}`. There is no supplied receiver state, injected observation, computed interface frame, duplicated host snapshot, or trusted world result.

Restore validates bounded plain JSON and exact fields, creates the selected host/setup, and deterministically reruns the real player controls and minute driver. This reconstructs the receiver, its decisions, the current host state, the same-minute frame, and the interface's actual pause. At most 128 keeper controls and 30 positive time advances fit the 158-command bound. Zero-time advances, unsupported identities, extra fields, sparse arrays, accessors, nonfinite numbers, cycles, and excessive expansion reject. An accessor is rejected before it executes. A horizon no-op is not a valid saved command.

This verifies lawful policy/provenance reconstruction, not cryptographic authenticity: a user can author a different valid setup/player history and replay it. Exporting a trusted current handle always produces the recipe for that corresponding game; forged mutable policy or frame objects are never admitted. Historical private host saves and other games' saves are incompatible by design.

## Focused checks and interpretation

`tests/across-player-driver.test.js` exercises the specified valve-six/inlet-fourteen/launch-fifteen/six-delay receipt at minute eight. The pending release has one paid minute and two reserved water units. Stop returns both units without erasing the paid minute; Continue consumes both at nine and the host records their later loss. Both routes resume through the receipt save recipe.

Additional checks cover hidden-work/launch twins, missing reports and private departure, adaptive paid attendance, source-time upstream bounds, interrupted walking, horizon reservations, final Stop budget, conservative capacity recovery, immutable handles, strict save JSON, and detached receiver decisions. These are executable authored software checks. Browser controls, comparison outcomes, and independent review remain separately recorded delivery evidence; none establish human usefulness or a general cognition capability.

## Reviewed receiver patch 0.1.1

Independent review reproduced a legal hunger `.972` state where an impossible-pipe cart fallback started a meal, then canceled it after one paid minute on each retry. The owned portion was never consumed and the feasible cart missed service. Receiver 0.1.1 finishes an already-started meal before reconsidering capacity and route work; automatic available recovery and player-controlled interruption remain distinct. The corrected same-world route consumes the meal after two minutes and delivers the cart at minute nine, including a save restored during the meal. Initial 0.1.0 source/outcomes remain frozen; a new source-bound revalidation uses the same comparison inputs without retuning.
