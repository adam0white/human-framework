/** Current HF4 files round-trip and continue; historical fixtures are refusal controls.
 * The full two-day input-log replay lives in hf4-control.test.ts. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { importedFileRecord } from '../../shared/file-record.ts';
import {
  FRAMEWORK_PACKAGE_VERSION as ENGINE_VERSION,
  makePlaytestFile,
  PlaytestError,
  type PlaytestFile,
  parsePlaytest,
} from '../../shared/playtest.ts';
import { requireValue } from '../../shared/require-value.ts';
import type { WorkerToMain } from '../protocol.ts';
import { ColonyGame, DEFAULT_SEED, type LogEntry, SCENARIO_VERSION } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import { Playback } from './playback.ts';
import { colonyHash, replayColony, validateColonyLog } from './playtest.ts';

/** colony-scenario@3, pinned; read only. */
const FIXTURE_V3 = resolve(import.meta.dirname, '../../../test/fixtures/playtest-colony.json');
/** Historical @4 fixture, read only. */
const FIXTURE_V4 = resolve(import.meta.dirname, '../../../test/fixtures/playtest-colony-v4.json');
/** Historical @5 fixture, read only. */
const FIXTURE_V5 = resolve(import.meta.dirname, '../../../test/fixtures/playtest-colony-v5.json');
/** Historical @6 default fixture. */
const FIXTURE_V6 = resolve(import.meta.dirname, '../../../test/fixtures/playtest-colony-v6.json');
/** Historical @7 fixture, read only. */
const FIXTURE_V7 = resolve(import.meta.dirname, '../../../test/fixtures/playtest-colony-v7.json');
/** Historical @8 fixture, read only. */
const FIXTURE = resolve(import.meta.dirname, '../../../test/fixtures/playtest-colony-v8.json');
const TICKS = [16, 17, 250, 33, 8, 120, 16, 1000, 0, 49];

/**
 * A full run through `Playback` as the page drives it: follows each suggestion, sends an order or a cancel now and
 * then, asks why and predict, plays on to "Another day". Stops at `until` (a sim minute) if given.
 */
function recordRun(until = Infinity): Playback {
  const pb = new Playback(createFrameworkHumanSide);
  pb.handle({ type: 'init', seed: DEFAULT_SEED, scenarioVersion: SCENARIO_VERSION, gen: 1, autoPause: true });
  pb.handle({ type: 'resume' });
  const g = pb.game;
  if (!g) throw new Error('no game');
  let i = 0;
  let continued = false;
  for (let guard = 0; guard < 500_000 && g.minute < until; guard++) {
    if (g.ended) {
      if (continued) break;
      pb.handle({ type: 'continue' });
      continued = true;
      pb.handle({ type: 'resume' });
      continue;
    }
    if (pb.paused) {
      for (const n of g.visibleNudges()) {
        pb.handle({ type: 'predict', requestId: 1, input: { ...n.order } });
        pb.handle({ type: 'order', input: { ...n.order, ...(n.prefill ?? {}) }, nudgeId: n.id });
      }
      pb.handle({ type: 'why', personId: 'yusuf' });
      if (pb.paused) pb.handle({ type: 'resume' });
      continue;
    }
    if (i % 97 === 0) {
      const card = g.book.cards.at(-1);
      if (card && i % 194 === 0) pb.handle({ type: 'cancel', orderId: card.order.id });
      else pb.handle({ type: 'order', input: { personId: 'samira', placeId: 'field' } });
    }
    pb.handle({ type: 'tick', dtMs: TICKS[i++ % TICKS.length] ?? 16 });
  }
  return pb;
}

const gameOf = (pb: Playback): ColonyGame => {
  if (!pb.game) throw new Error('no game');
  return pb.game;
};

const parse = (text: string, max?: number) =>
  parsePlaytest(text, 'colony', SCENARIO_VERSION, validateColonyLog, max);

describe('Game 1 playtest files', () => {
  test('old cast-edition files refuse plainly without replacing loaded play', () => {
    const pb = recordRun(10);
    const before = pb.game;
    for (const path of [FIXTURE_V3, FIXTURE_V4, FIXTURE_V5, FIXTURE_V6, FIXTURE_V7, FIXTURE]) {
      expect(() => pb.load(readFileSync(path, 'utf8'), ENGINE_VERSION)).toThrow(
        /older version|older cast edition/,
      );
      expect(pb.game).toBe(before);
    }
  });

  test('a file saved mid-run loads into Playback, replays to its hash and plays on', async () => {
    const pb = recordRun(35);
    const text = JSON.stringify(await pb.playtestFile(ENGINE_VERSION));
    const other = new Playback(createFrameworkHumanSide);
    const { result, replies } = other.load(text, ENGINE_VERSION);
    expect(result.matches).toBe(true);
    expect(other.game?.minute).toBe(pb.game?.minute);
    expect(other.game?.human.snapshot()).toEqual(pb.game?.human.snapshot());
    expect(other.paused).toBe(true);
    expect(replies[0]?.type).toBe('frame');
    other.handle({ type: 'resume' });
    // Clock preferences and inspection do not enter the exported state or alter continuation.
    pb.handle({ type: 'setAutoPause', on: false });
    other.handle({ type: 'setAutoPause', on: false });
    other.handle({ type: 'setSpeed', speed: 2 });
    other.handle({ type: 'pause', cause: 'inspector' });
    expect(other.paused).toBe(false);
    pb.step(20);
    other.step(20);
    expect(colonyHash(gameOf(other))).toBe(colonyHash(gameOf(pb)));
    expect(gameOf(other).log).toEqual(gameOf(pb).log);
    const nativeHash = (game: ColonyGame) =>
      (game.human.snapshot() as { community: { run: { hashes: { full: string } } } }).community.run.hashes
        .full;
    expect(nativeHash(gameOf(other))).toBe(nativeHash(gameOf(pb)));
  }, 60_000);

  test('a bad file leaves the current run as it was', () => {
    const pb = recordRun(5);
    const before = pb.game;
    expect(() => pb.load('{"kind":"human-playtest"}', ENGINE_VERSION)).toThrow(/older version/);
    expect(pb.game).toBe(before);
  }, 60_000);
});

describe('Game 1 playtest import rejects bad files', () => {
  const good = async (): Promise<PlaytestFile<unknown>> => {
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    g.issue({ personId: 'yusuf', placeId: 'site' });
    g.advance(5);
    return makePlaytestFile<unknown>({
      game: 'colony',
      seed: g.seed,
      scenario: SCENARIO_VERSION,
      minute: g.minute,
      log: g.log,
      hash: colonyHash(g),
      engine: ENGINE_VERSION,
      snapshot: null,
    });
  };
  const p = (f: unknown, max?: number) => parse(JSON.stringify(f), max);

  test('a valid small file parses and replays to its hash', async () => {
    const f = p(await good());
    expect(colonyHash(replayColony(f.seed, createFrameworkHumanSide, f.log, f.minute))).toBe(f.hash);
  });
  test('oversize, before parsing', async () => {
    const f = await good();
    expect(() => p(f, 100)).toThrow(/too large/);
  });
  test('bad envelopes', async () => {
    const f = await good();
    expect(() => parse('[]')).toThrow(PlaytestError);
    expect(() => p({ ...f, format: 2 })).toThrow(PlaytestError);
    expect(() => p({ ...f, game: 'voice' })).toThrow(/other game/);
    expect(() => p({ ...f, scenario: 'colony-scenario@1' })).toThrow(/scenario/);
    expect(() => p({ ...f, minute: -1 })).toThrow(/minute/);
    expect(() => p({ ...f, build: 5 })).toThrow(/build/);
  });
  test('unknown or malformed log entries', async () => {
    const f = await good();
    expect(() => p({ ...f, log: [{ minute: 0, kind: 'teleport' }] })).toThrow(/entry 0\.kind/);
    expect(() =>
      p({ ...f, log: [{ minute: 0, kind: 'order', input: { personId: 'zed', placeId: 'site' } }] }),
    ).toThrow(/personId/);
    expect(() =>
      p({ ...f, log: [{ minute: 0, kind: 'order', input: { personId: 'yusuf', placeId: 'moon' } }] }),
    ).toThrow(/placeId/);
    expect(() =>
      p({
        ...f,
        log: [
          { minute: 5, kind: 'continue' },
          { minute: 4, kind: 'continue' },
        ],
      }),
    ).toThrow(/minute/);
    expect(() => p({ ...f, log: [{ minute: 0, kind: 'cancel' }] })).toThrow(/orderId/);
  });
  test('ColonyGame.replay refuses an unknown kind instead of treating it as "Another day"', () => {
    const bad = [{ minute: 0, kind: 'teleport' }] as unknown as LogEntry[];
    expect(() => ColonyGame.replay(DEFAULT_SEED, createFrameworkHumanSide, bad, 10)).toThrow(/unknown/);
  });
});

test('file worker round-trips and continues a full Well import; cancellation retains its installed run', async () => {
  const replies: WorkerToMain[] = [];
  let handle: (e: { data: unknown }) => void;
  vi.stubGlobal('addEventListener', (_type: string, fn: typeof handle) => {
    handle = fn;
  });
  vi.stubGlobal('postMessage', (reply: WorkerToMain) => replies.push(reply));
  try {
    await import('../worker.ts');
    const send = (data: unknown) => handle({ data });
    send({ type: 'fileSession' });
    const pb = recordRun(1);
    const original = await pb.playtestFile(ENGINE_VERSION, true);
    const { canonicalPersona, createPersona } = await import('@adam0white/lab-client');
    const source = structuredClone(
      (original.snapshot as { human: { community: { run: Record<string, unknown> } } }).human.community.run,
    );
    const digest = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalPersona(source))),
      ),
      (byte) => byte.toString(16).padStart(2, '0'),
    ).join('');
    const id = 'hf.cast.yusuf.well';
    const head = await createPersona({
      format: 'hf-persona/1',
      castId: id,
      castRevision: '1',
      branchId: 'synthetic-source',
      parentRevision: null,
      source: { game: 'well', engine: ENGINE_VERSION, build: 'synthetic', rules: 'cast-1' },
      transfer: { checkpoint: { sha256: digest } },
      limitations: [],
    });
    const file = {
      ...original,
      build: 'synthetic-original-host',
      runId: 'synthetic-source-run',
      castOwnership: { [id]: head },
      castSources: { [id]: source },
    };
    const sourceText = JSON.stringify(file);
    const fileImport = await importedFileRecord(file, sourceText);
    send({ type: 'loadPlaytest', gen: 1, text: sourceText });
    await vi.waitFor(() => expect(replies.some((r) => r.type === 'replayed' && r.gen === 1)).toBe(true));
    send({ type: 'exportPlaytest', requestId: 1, full: true });
    await vi.waitFor(() => expect(replies.some((r) => r.type === 'playtest')).toBe(true));
    const exported = requireValue(replies.findLast((r) => r.type === 'playtest'));
    expect(exported.gen).toBe(1);
    expect(exported.file).toMatchObject({ runId: expect.any(String), fileImport });
    const runId = (exported.file as { runId?: string }).runId;
    expect(runId).not.toBe(file.runId);
    send({ type: 'telemetry', requestId: 901 });
    await vi.waitFor(() =>
      expect(replies.findLast((reply) => reply.type === 'telemetry')).toMatchObject({
        requestId: 901,
        run: { runId, fileImport },
      }),
    );
    expect(exported.file.snapshot).toEqual(file.snapshot);
    expect(exported.file.hash).toBe(file.hash);
    expect(exported.file.build).toBe(file.build);
    expect(exported.file.castOwnership).toEqual(file.castOwnership);
    expect((exported.file as typeof file).castSources).toEqual(file.castSources);
    const holdValidation = () => {
      const digest = crypto.subtle.digest.bind(crypto.subtle);
      let release!: () => void;
      let entered = false;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      const spy = vi.spyOn(crypto.subtle, 'digest').mockImplementationOnce(async (...args) => {
        entered = true;
        await pending;
        return digest(...args);
      });
      return { release, spy, entered: () => entered };
    };
    const success = holdValidation();
    // Cancellation during asynchronous source validation keeps the installed run.
    send({ type: 'loadPlaytest', gen: 4, text: JSON.stringify({ ...file, build: 'cancelled-source' }) });
    await vi.waitFor(() => expect(success.entered()).toBe(true));
    send({ type: 'cancelFileLoad' });
    success.release();
    await new Promise((resolve) => setTimeout(resolve, 0));
    success.spy.mockRestore();
    expect(replies.some((reply) => reply.type === 'replayed' && reply.gen === 4)).toBe(false);
    send({ type: 'exportPlaytest', requestId: 3, full: true });
    await vi.waitFor(() =>
      expect(replies.some((reply) => reply.type === 'playtest' && reply.requestId === 3)).toBe(true),
    );
    expect(requireValue(replies.findLast((reply) => reply.type === 'playtest')).gen).toBe(1);
    expect(requireValue(replies.findLast((reply) => reply.type === 'playtest')).file).toEqual(exported.file);
    send({ type: 'resume' });
    for (let i = 0; i < 8; i++) send({ type: 'tick', dtMs: 250 });
    send({ type: 'exportPlaytest', requestId: 4, full: true });
    await vi.waitFor(() =>
      expect(replies.some((reply) => reply.type === 'playtest' && reply.requestId === 4)).toBe(true),
    );
    const continued = requireValue(replies.findLast((reply) => reply.type === 'playtest')).file;
    expect(continued).toMatchObject({ runId, fileImport });
    expect(continued.minute).toBeGreaterThan(exported.file.minute);
    const replay = new Playback(createFrameworkHumanSide);
    replay.load(JSON.stringify(continued), ENGINE_VERSION);
    expect((await replay.playtestFile(ENGINE_VERSION, true)).snapshot).toEqual(continued.snapshot);
    expect(continued.build).toBe(file.build);
    expect(continued.castOwnership).toEqual(file.castOwnership);
    expect((continued as typeof file).castSources).toEqual(file.castSources);
  } finally {
    vi.unstubAllGlobals();
  }
});
