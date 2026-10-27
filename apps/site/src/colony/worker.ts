/**
 * Dedicated worker running both sides in lockstep. Real time enters only as `tick{dtMs}` pacing; the engine
 * steps whole sim minutes, so the same seed and order log always give the same run. The state machine (speed,
 * pause, auto-pause, "Another day") lives in `sim/playback.ts` so it can be tested headless. Playtest files are
 * made and replayed here (a loaded file is replayed from its seed and log; its snapshot is never loaded).
 */
import { ENGINE_VERSION } from '@adam0white/human-framework';
import { canonicalPersona, validatePersona } from '@adam0white/lab-client';
import { chapterPeople } from '../shared/cast-chapter.ts';
import { decodeSnapshot, PlaytestError, stableStringify } from '../shared/playtest.ts';
import { requireValue } from '../shared/require-value.ts';
import { hostWorker } from '../shared/worker-host.ts';
import type { FileSessionRequest, MainToWorker, WorkerReply } from './protocol.ts';
import { ColonyGame } from './sim/game.ts';
import { createFrameworkHumanSide } from './sim/human.ts';
import { Playback } from './sim/playback.ts';
import { colonyState } from './sim/playtest.ts';

/** Imported receipt archives are provenance only; validate their binding without any Shelf access. */
async function validateFileSources(raw: Record<string, unknown>): Promise<void> {
  const ownership = raw.castOwnership;
  const sources = raw.castSources;
  if (ownership !== undefined && (!ownership || typeof ownership !== 'object' || Array.isArray(ownership)))
    throw new Error('Invalid imported ownership provenance.');
  if (sources !== undefined && (!sources || typeof sources !== 'object' || Array.isArray(sources)))
    throw new Error('Invalid imported source archive.');
  const heads = Object.entries((ownership ?? {}) as Record<string, unknown>);
  if (heads.length > 8) throw new Error('Too many imported ownership receipts.');
  for (const [id, value] of heads) {
    const head = await validatePersona(value);
    if (id !== head.castId) throw new Error('Imported receipt identity differs.');
  }
  for (const [id, source] of Object.entries((sources ?? {}) as Record<string, unknown>)) {
    const head = (
      ownership as Record<string, { transfer: { checkpoint?: { sha256?: string } } }> | undefined
    )?.[id];
    if (!head?.transfer.checkpoint?.sha256 || !source || typeof source !== 'object')
      throw new Error('Imported source has no bound full-source receipt.');
    const digest = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalPersona(source))),
      ),
      (byte) => byte.toString(16).padStart(2, '0'),
    ).join('');
    if (digest !== head.transfer.checkpoint.sha256) throw new Error('Imported source checksum differs.');
  }
}

let playback = new Playback(createFrameworkHumanSide);
let fileMode = false;
let imported: Record<string, unknown> = {};
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
    playback
      .playtestFile(ENGINE_VERSION, true)
      .then((run) => host.post({ type: 'telemetry', requestId: msg.requestId, run, logs }, gen))
      .catch(() => host.post({ type: 'telemetry', requestId: msg.requestId, error: 'No run yet' }, gen));
    return;
  }
  if (msg.type === 'exportPlaytest') {
    const gen = host.gen;
    const provenance = imported;
    playback
      .playtestFile(ENGINE_VERSION, fileMode || msg.full === true)
      .then((file) =>
        host.post(
          {
            type: 'playtest',
            file: fileMode
              ? {
                  ...provenance,
                  ...file,
                  build: typeof provenance.build === 'string' ? provenance.build : file.build,
                }
              : file,
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
      const raw = fileMode ? (JSON.parse(msg.text) as Record<string, unknown>) : undefined;
      if (raw) await validateFileSources(raw);
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
      if (operation !== loadOperation) return;
      if (raw) imported = structuredClone(raw);
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
