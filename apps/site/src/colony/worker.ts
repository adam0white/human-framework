/**
 * Dedicated worker running both sides in lockstep. Real time enters only as `tick{dtMs}` pacing; the engine
 * steps whole sim minutes, so the same seed and order log always give the same run. The state machine (speed,
 * pause, auto-pause, "Another day") lives in `sim/playback.ts` so it can be tested headless. Playtest files are
 * made and replayed here (a loaded file is replayed from its seed and log; its snapshot is never loaded).
 */

import { localCastAuthority } from '../shared/cast-authority.ts';
import { type FileImport, importedFileRecord, recordFile } from '../shared/file-record.ts';
import { checkGameFile } from '../shared/file-sources.ts';
import {
  decodeSnapshot,
  FRAMEWORK_PACKAGE_VERSION as ENGINE_VERSION,
  PlaytestError,
  stableStringify,
} from '../shared/playtest.ts';
import { requireValue } from '../shared/require-value.ts';
import { hostWorker } from '../shared/worker-host.ts';
import type { FileSessionRequest, MainToWorker, WorkerReply } from './protocol.ts';
import { ColonyGame } from './sim/game.ts';
import { createFrameworkHumanSide } from './sim/human.ts';
import { Playback } from './sim/playback.ts';
import { colonyState } from './sim/playtest.ts';
import { wellChapterPeople as chapterPeople } from './sim/portable.ts';

let playback = new Playback(createFrameworkHumanSide);
let fileMode = false;
let imported: Record<string, unknown> = {};
let fileImport: FileImport | undefined;
let loadOperation = 0;

hostWorker<MainToWorker | FileSessionRequest, WorkerReply>((msg, host) => {
  if (msg.type === 'cancelFileLoad') {
    if (!fileMode) throw new Error('File cancellation requires a file session.');
    loadOperation++;
    return;
  }
  if (msg.type === 'fileSession') {
    if (playback.game) throw new Error('Session mode must be selected before a game.');
    fileMode = true;
    return;
  }
  if (fileMode && ['init', 'castOwnership', 'castPreflight', 'castCheckpoint'].includes(msg.type))
    throw new Error('Native continuity is unavailable in a file session.');
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
    const owner = playback.game ?? playback;
    const source = fileImport;
    playback
      .playtestFile(ENGINE_VERSION, true)
      .then((run) =>
        host.post(
          { type: 'telemetry', requestId: msg.requestId, run: recordFile(owner, run, source), logs },
          gen,
        ),
      )
      .catch(() => host.post({ type: 'telemetry', requestId: msg.requestId, error: 'No run yet' }, gen));
    return;
  }
  if (msg.type === 'exportPlaytest') {
    const gen = host.gen;
    const provenance = imported;
    const source = fileImport;
    const owner = playback.game ?? playback;
    playback
      .playtestFile(ENGINE_VERSION, fileMode || msg.full === true)
      .then((file) =>
        host.post(
          {
            type: 'playtest',
            file: recordFile(
              owner,
              fileMode
                ? {
                    ...provenance,
                    ...file,
                    // Current file authority is local; chapter/snapshot premises remain historical.
                    castAuthority: localCastAuthority(),
                    castOwnership: {},
                    castSources: {},
                    castLocalOnly: true,
                    castSkipped: [],
                    build: typeof provenance.build === 'string' ? provenance.build : file.build,
                  }
                : file,
              source,
            ),
            ...(msg.requestId !== undefined ? { requestId: msg.requestId } : {}),
          },
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
    if (!fileMode) {
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
    const operation = ++loadOperation;
    void (async () => {
      const target = fileMode ? new Playback(createFrameworkHumanSide) : playback;
      const raw = fileMode ? await checkGameFile(msg.text) : undefined;
      const { result, replies } = target.load(msg.text, ENGINE_VERSION);
      if (fileMode) {
        if (
          msg.local ||
          !result.matches ||
          !target.game ||
          stableStringify(await decodeSnapshot(raw as never)) !== stableStringify(colonyState(target.game))
        )
          throw new Error('The complete game state does not replay. Keep the original file.');
      }
      const source = raw ? await importedFileRecord(raw, msg.text) : undefined;
      if (operation !== loadOperation) return;
      if (raw) imported = structuredClone(raw);
      fileImport = source;
      playback = target;
      host.gen = msg.gen;
      host.post({ type: 'replayed', result });
      for (const reply of replies) host.post(reply);
    })().catch((err) => {
      if (operation !== loadOperation) return;
      const message =
        err instanceof PlaytestError
          ? err.message
          : `The playtest file could not be replayed: ${err instanceof Error ? err.message : String(err)}`;
      host.post({ type: 'playtestError', message }, msg.gen);
    });
    return;
  }
  if (msg.type === 'init') host.gen = msg.gen;
  for (const reply of playback.handle(msg)) host.post(reply);
});
