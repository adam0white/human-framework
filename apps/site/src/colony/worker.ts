/**
 * Dedicated worker running both sides in lockstep. Real time enters only as `tick{dtMs}` pacing; the engine
 * steps whole sim minutes, so the same seed and order log always give the same run. The state machine (speed,
 * pause, auto-pause, "Another day") lives in `sim/playback.ts` so it can be tested headless. Playtest files are
 * made and replayed here (a loaded file is replayed from its seed and log; its snapshot is never loaded).
 */
import { ENGINE_VERSION } from '@adam0white/human-framework';
import { chapterPeople } from '../shared/cast-chapter.ts';
import { PlaytestError } from '../shared/playtest.ts';
import { requireValue } from '../shared/require-value.ts';
import { hostWorker } from '../shared/worker-host.ts';
import type { MainToWorker, WorkerReply } from './protocol.ts';
import { ColonyGame } from './sim/game.ts';
import { createFrameworkHumanSide } from './sim/human.ts';
import { Playback } from './sim/playback.ts';

const playback = new Playback(createFrameworkHumanSide);

hostWorker<MainToWorker, WorkerReply>((msg, host) => {
  if (msg.type === 'castOwnership') return;
  if (msg.type === 'castPreflight' || msg.type === 'castCheckpoint') {
    try {
      if (msg.type === 'castPreflight') {
        new ColonyGame(msg.seed, createFrameworkHumanSide, undefined, 'default', msg.chapter);
        host.post({
          type: 'castReady',
          requestId: msg.requestId,
          initials: Object.fromEntries(
            chapterPeople(msg.chapter).map((p) => [p.input.parent.castId, requireValue(p.initial)]),
          ),
        });
      } else {
        if (!playback.game || playback.game.minute === 0)
          throw new Error('Begin and play this chapter before saving a person.');
        const gen = host.gen;
        const transfer = playback.game?.human.castCheckpoint?.(msg.castId);
        if (!transfer) throw new Error('No current person checkpoint.');
        void Promise.resolve(transfer)
          .then((t) =>
            host.post(
              {
                type: 'castReady',
                requestId: msg.requestId,
                transfer: { ...t, engine: ENGINE_VERSION },
                sourceSnapshot: t.sourceSnapshot,
              },
              gen,
            ),
          )
          .catch((e) => host.post({ type: 'castReady', requestId: msg.requestId, error: String(e) }, gen));
      }
    } catch (e) {
      host.post({ type: 'castReady', requestId: msg.requestId, error: String(e) });
    }
    return;
  }
  if (msg.type === 'telemetry') {
    const gen = host.gen;
    const logs = structuredClone(playback.game?.frame().news ?? []);
    playback
      .playtestFile(ENGINE_VERSION, true)
      .then((run) => host.post({ type: 'telemetry', requestId: msg.requestId, run, logs }, gen))
      .catch(() => host.post({ type: 'telemetry', requestId: msg.requestId, error: 'No run yet' }, gen));
    return;
  }
  if (msg.type === 'exportPlaytest') {
    const gen = host.gen;
    playback
      .playtestFile(ENGINE_VERSION)
      .then((file) =>
        host.post(
          { type: 'playtest', file, ...(msg.requestId !== undefined ? { requestId: msg.requestId } : {}) },
          gen,
        ),
      )
      .catch((err: unknown) =>
        host.post(
          {
            type: 'playtestError',
            message: `The playtest file could not be made: ${String(err)}`,
            ...(msg.requestId !== undefined ? { requestId: msg.requestId } : {}),
          },
          gen,
        ),
      );
    return;
  }
  if (msg.type === 'loadPlaytest') {
    try {
      const { result, replies } = playback.load(msg.text, ENGINE_VERSION);
      host.gen = msg.gen;
      host.post({ type: 'replayed', result });
      for (const reply of replies) host.post(reply);
    } catch (err) {
      const message =
        err instanceof PlaytestError
          ? err.message
          : `The playtest file could not be replayed: ${err instanceof Error ? err.message : String(err)}`;
      host.post({ type: 'playtestError', message }, msg.gen);
    }
    return;
  }
  if (msg.type === 'init') host.gen = msg.gen;
  for (const reply of playback.handle(msg)) host.post(reply);
});
