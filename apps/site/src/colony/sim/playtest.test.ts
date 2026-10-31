/** Current HF4 files round-trip and continue; historical fixtures are refusal controls.
 * The full two-day input-log replay lives in hf4-control.test.ts. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { canCheckpoint, localCastAuthority, validateCastRecord } from '../../shared/cast-authority.ts';
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
    // Shared-origin denial fixture, not a positive ownership/admission claim.
    const { castForGame } = await import('@adam0white/lab-client');
    const id = 'hf.cast.yusuf.well';
    const file = {
      ...original,
      build: 'synthetic-original-host',
      runId: 'synthetic-source-run',
      castAuthority: {
        format: 'site-cast-authority/1',
        mode: 'shared',
        expectedHeads: Object.fromEntries(
          castForGame('well').map((p) => [p.castId, p.castId === id ? 'a'.repeat(64) : null]),
        ),
        denied: [id],
      },
      castOwnership: {},
      castSources: {},
      castLocalOnly: false,
      castSkipped: [id],
    };
    const nativeRecords = new Map([
      ['hf-colony-save', JSON.stringify(original)],
      ['hf-cast-source:well', JSON.stringify({ retained: 'native source journal' })],
      ['hf-cast-heads:well', JSON.stringify({ retained: 'native heads' })],
    ]);
    const beforeNative = [...nativeRecords];
    const storage = {
      getItem: vi.fn((key: string) => nativeRecords.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => nativeRecords.set(key, value)),
      removeItem: vi.fn((key: string) => nativeRecords.delete(key)),
    };
    vi.stubGlobal('localStorage', storage);
    const selected = structuredClone(file);
    const canonical = {
      castAuthority: localCastAuthority(),
      castOwnership: {},
      castSources: {},
      castLocalOnly: true,
      castSkipped: [],
    };
    const sourceText = JSON.stringify(file, null, 2) + '\n';
    const fileImport = await importedFileRecord(file, sourceText);
    expect(fileImport.sourceHash).toBe(createHash('sha256').update(sourceText).digest('hex'));
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
    expect(exported.file).toMatchObject(canonical);
    expect(exported.file.castChapter).toEqual(original.castChapter);
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
    const input = { personId: 'maryam', placeId: 'kitchen' };
    send({ type: 'order', input });
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
    expect(continued).toMatchObject(canonical);
    expect(continued.log.slice(0, file.log.length)).toEqual(file.log);
    expect(continued.log.slice(file.log.length)).toEqual([{ minute: file.minute, kind: 'order', input }]);
    expect(continued.castChapter).toEqual(original.castChapter);
    // Reimport through the actual file worker, then export again.
    const nextText = JSON.stringify(continued);
    send({ type: 'loadPlaytest', gen: 5, text: nextText });
    await vi.waitFor(() => expect(replies.some((r) => r.type === 'replayed' && r.gen === 5)).toBe(true));
    send({ type: 'exportPlaytest', requestId: 5 });
    await vi.waitFor(() =>
      expect(replies.some((r) => r.type === 'playtest' && r.requestId === 5)).toBe(true),
    );
    const reimported = requireValue(replies.findLast((r) => r.type === 'playtest')).file;
    expect(reimported).toMatchObject(canonical);
    expect(reimported.log).toEqual(continued.log);
    expect(reimported.snapshot).toEqual(continued.snapshot);
    expect(reimported.hash).toBe(continued.hash);
    expect(reimported).toMatchObject({
      fileImport: await importedFileRecord(continued as unknown as Record<string, unknown>, nextText),
    });
    // Current complete archive, native Playback and file worker receive the same next public input/ticks.
    const nextInput = { personId: 'idris' as const, placeId: 'well' as const };
    replay.handle({ type: 'order', input: nextInput });
    send({ type: 'order', input: nextInput });
    replay.handle({ type: 'resume' });
    send({ type: 'resume' });
    for (let i = 0; i < 8; i++) {
      replay.handle({ type: 'tick', dtMs: 250 });
      send({ type: 'tick', dtMs: 250 });
    }
    send({ type: 'exportPlaytest', requestId: 6 });
    await vi.waitFor(() =>
      expect(replies.some((r) => r.type === 'playtest' && r.requestId === 6)).toBe(true),
    );
    const nextFile = requireValue(replies.findLast((r) => r.type === 'playtest')).file;
    const nextNative = await replay.playtestFile(ENGINE_VERSION, true);
    expect(nextFile).toMatchObject(canonical);
    expect(nextFile.log).toEqual(nextNative.log);
    expect(nextFile.snapshot).toEqual(nextNative.snapshot);
    expect(nextFile.hash).toBe(nextNative.hash);
    const checked = await validateCastRecord('well', reimported as unknown as Record<string, unknown>);
    expect(canCheckpoint(checked.authority, id, checked.heads)).toBe(false);
    const errorsBefore = replies.filter((r) => r.type === 'error').length;
    for (const type of ['init', 'castOwnership', 'castPreflight', 'castCheckpoint']) send({ type });
    expect(replies.filter((r) => r.type === 'error')).toHaveLength(errorsBefore + 4);
    expect([...nativeRecords]).toEqual(beforeNative);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(file).toEqual(selected);
    expect(JSON.stringify(file, null, 2) + '\n').toBe(sourceText);
    expect(replies.some((r) => r.type === 'castReady')).toBe(false);
  } finally {
    vi.unstubAllGlobals();
  }
});
