/**
 * Game 2 playtest files: record, replay, compare hashes; and the import's rejection paths.
 *
 * The fixture (apps/site/test/fixtures/playtest-voice.json) is a full run (premise to report) recorded with
 * irregular real-time ticks, the path the worker takes. Any change to the framework or the game's behaviour
 * changes its hash; re-record both games' fixtures with one command from the repo root:
 *
 *   PLAYTEST_REGEN=1 npx vitest run apps/site/src/voice/sim/playtest.test.ts apps/site/src/colony/sim/playtest.test.ts
 *
 * (fish: `env PLAYTEST_REGEN=1 npx vitest run ...`). Then run the same command without the variable.
 *
 * Level-up 2026-10-19: the fixture is a voice-1 file and stays one. It replays under rules 1 (its own scenario);
 * regenerating it records rules 1 too, so the pinned file never silently becomes a voice-2 run.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ENGINE_VERSION } from '@adam0white/human-framework';
import { describe, expect, test, vi } from 'vitest';
import { importedFileRecord } from '../../shared/file-record.ts';
import {
  decodeSnapshot,
  makePlaytestFile,
  PlaytestError,
  type PlaytestFile,
  parsePlaytest,
} from '../../shared/playtest.ts';
import { requireValue } from '../../shared/require-value.ts';
import type { WorkerToMain } from '../protocol.ts';
import { defaultWhisper, scenarioOf, VOICE_SCENARIO_VERSION, type VoiceRules } from '../protocol.ts';
import { SHIPPED_SEED, VoiceGame } from './game.ts';
import { type Driver, play } from './headless.ts';
import {
  parseVoicePlaytest,
  RecordedGame,
  replayVoice,
  type VoiceLogEntry,
  validateVoiceLog,
  voiceHash,
  voiceSnapshot,
} from './record.ts';

const FIXTURE = resolve(import.meta.dirname, '../../../test/fixtures/playtest-voice.json');
const REGEN = Boolean(process.env.PLAYTEST_REGEN);
const WHISPERS = [defaultWhisper('doctor'), defaultWhisper('selin')];
/** Real-time tick sizes (ms), cycled: frame-like, slow frames, a backgrounded tab, zero. */
const TICKS = [16, 17, 250, 33, 8, 120, 16, 1000, 0, 49];

/**
 * A full run driven like the worker: real-time ticks, with `frame`, `predict` and `why` called as the page would
 * (they are not logged, so they must not change the state).
 */
function recordRun(views = true, rules: VoiceRules = 2): RecordedGame {
  const rec = new RecordedGame(new VoiceGame(SHIPPED_SEED, rules));
  let n = 0;
  const driver: Driver = {
    game: rec.game,
    apply: (m) => {
      if (views) {
        rec.game.frame();
        if (m.type === 'suggest') {
          rec.game.predict(m.draft);
          rec.game.why(rec.game.halil.trace.at(-1)?.id ?? '');
        }
      }
      rec.apply(m);
      // The page changes pace now and then; it changes how real time becomes minutes, which the log records.
      if (m.type === 'resume' && n % 5 === 0) rec.apply({ type: 'setPace', pace: n % 2 ? 'fast' : 'normal' });
    },
    step: (x) => rec.step(x),
    tick: (dt) => {
      if (views && n % 3 === 0) rec.game.frame();
      n++;
      return rec.tick(dt);
    },
  };
  play(driver, { confirm: true, whispers: WHISPERS, tick: TICKS });
  return rec;
}

/** Each full run once per file (they take about a second each). */
const runs: Partial<Record<'views' | 'quiet', RecordedGame>> = {};
const run = (views: boolean): RecordedGame => {
  const k = views ? 'views' : 'quiet';
  runs[k] ??= recordRun(views);
  return runs[k];
};

const fixtureFile = (rec: RecordedGame) =>
  makePlaytestFile<VoiceLogEntry>({
    game: 'voice',
    seed: rec.game.seed,
    scenario: scenarioOf(rec.game.rules),
    minute: rec.game.t,
    log: rec.log,
    hash: voiceHash(rec.game),
    engine: ENGINE_VERSION,
    snapshot: null,
  });

describe('Game 2 playtest files', () => {
  test.skipIf(!REGEN)(
    'regenerate the fixture (PLAYTEST_REGEN=1)',
    async () => {
      const rec = recordRun(true, 1);
      expect(rec.game.phase).toBe('report');
      writeFileSync(FIXTURE, `${JSON.stringify(await fixtureFile(rec))}\n`);
    },
    120_000,
  );

  test('the old cast fixture refuses with a plain start-fresh message', () => {
    expect(() => parseVoicePlaytest(readFileSync(FIXTURE, 'utf8'))).toThrow(/older cast edition/);
  });

  test('a run recorded with irregular ticks, frames, predicts and whys replays to the same hash', () => {
    const rec = run(true);
    const { rec: again, driftAt } = replayVoice(SHIPPED_SEED, rec.log);
    expect(driftAt).toBe(-1);
    expect(voiceHash(again.game)).toBe(voiceHash(rec.game));
    // The replay keeps a log of its own that equals the recorded one.
    expect(again.log).toEqual(rec.log);
    // Views do not change the state: the same inputs without them reach the same hash.
    const quiet = run(false);
    expect(quiet.log).toEqual(rec.log);
    expect(voiceHash(quiet.game)).toBe(voiceHash(rec.game));
  }, 120_000);

  test('a run cut mid-day replays to the same state, and a file of it round-trips', async () => {
    const rec = new RecordedGame(new VoiceGame(SHIPPED_SEED));
    play(rec, { confirm: true, tick: TICKS, stop: (g) => g.t >= 2 * 1440 + 9 * 60 });
    const file = await makePlaytestFile({
      game: 'voice',
      seed: SHIPPED_SEED,
      scenario: VOICE_SCENARIO_VERSION,
      minute: rec.game.t,
      log: rec.log,
      hash: voiceHash(rec.game),
      engine: ENGINE_VERSION,
      snapshot: voiceSnapshot(rec.game),
    });
    const f = parsePlaytest(JSON.stringify(file), 'voice', VOICE_SCENARIO_VERSION, validateVoiceLog);
    const { rec: again } = replayVoice(f.seed, f.log);
    expect(voiceHash(again.game)).toBe(f.hash);
    expect(f.snapshotEncoding).toBe('gzip-base64');
    const snap = (await decodeSnapshot(f)) as { t: number };
    expect(snap.t).toBe(rec.game.t);
  }, 60_000);
});

describe('Game 2 playtest import rejects bad files', () => {
  const good = async (): Promise<PlaytestFile<unknown>> => {
    const rec = new RecordedGame(new VoiceGame(SHIPPED_SEED));
    rec.apply({ type: 'begin' });
    rec.tick(250);
    return makePlaytestFile<unknown>({
      game: 'voice',
      seed: SHIPPED_SEED,
      scenario: VOICE_SCENARIO_VERSION,
      minute: rec.game.t,
      log: rec.log,
      hash: voiceHash(rec.game),
      engine: ENGINE_VERSION,
      snapshot: null,
    });
  };
  const parse = (f: unknown, max?: number) =>
    parsePlaytest(JSON.stringify(f), 'voice', VOICE_SCENARIO_VERSION, validateVoiceLog, max);

  test('a valid small file parses', async () => {
    expect(parse(await good()).log.length).toBeGreaterThan(0);
  });
  test('oversize, before parsing', async () => {
    const f = await good();
    expect(() => parse(f, 100)).toThrow(PlaytestError);
    expect(() =>
      parsePlaytest('x'.repeat(200), 'voice', VOICE_SCENARIO_VERSION, validateVoiceLog, 100),
    ).toThrow(/too large/);
  });
  test('bad envelopes', async () => {
    const f = await good();
    expect(() => parsePlaytest('{', 'voice', VOICE_SCENARIO_VERSION, validateVoiceLog)).toThrow(/not JSON/);
    expect(() => parse({ ...f, kind: 'other' })).toThrow(PlaytestError);
    expect(() => parse({ ...f, game: 'colony' })).toThrow(/other game/);
    expect(() => parse({ ...f, scenario: 'voice-0' })).toThrow(/scenario/);
    expect(() => parse({ ...f, seed: 1.5 })).toThrow(/seed/);
    expect(() => parse({ ...f, hash: '<b>' })).toThrow(/hash/);
    expect(() => parse({ ...f, log: 'nope' })).toThrow(/log/);
  });
  test('unknown or malformed log entries', async () => {
    const f = await good();
    expect(() => parse({ ...f, log: [{ at: 0, type: 'teleport' }] })).toThrow(/entry 0\.type/);
    expect(() => parse({ ...f, log: [{ at: 0, type: 'begin', extra: 1 }] })).toThrow(/unknown field/);
    expect(() => parse({ ...f, log: [[60, 1e9]] })).toThrow(PlaytestError);
    expect(() => parse({ ...f, log: [[61, 1]] })).toThrow(/minutes/);
    expect(() => parse({ ...f, log: [{ at: 0, type: 'setPace', pace: 'warp' }] })).toThrow(/pace/);
    expect(() =>
      parse({
        ...f,
        log: [{ at: 0, type: 'suggest', draft: { optionId: 'eat', strength: 'shout', insist: false } }],
      }),
    ).toThrow(/strength/);
    expect(() =>
      parse({ ...f, log: [{ at: 0, type: 'advance', standing: [{ choiceId: 'x', strength: 'urge' }] }] }),
    ).toThrow(/choiceId/);
  });
});

test('file worker round-trips and continues full Voice people with their source receipts', async () => {
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
    const rec = new RecordedGame(new VoiceGame(7, 4));
    rec.apply({ type: 'begin' });
    rec.apply({ type: 'dismissIntro' });
    rec.apply({ type: 'resume' });
    rec.step(1);
    const { voiceState, voiceHash } = await import('./record.ts');
    const { stableStringify } = await import('../../shared/playtest.ts');
    const { snapshot } = await import('@adam0white/human-framework');
    const { canonicalPersona, createPersona } = await import('@adam0white/lab-client');
    const source = snapshot(rec.game.run.ppl.riza);
    const digest = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalPersona(source))),
      ),
      (byte) => byte.toString(16).padStart(2, '0'),
    ).join('');
    const id = 'hf.cast.riza.voice';
    const head = await createPersona({
      format: 'hf-persona/1',
      castId: id,
      castRevision: '1',
      branchId: 'synthetic-voice-source',
      parentRevision: null,
      source: { game: 'voice', engine: ENGINE_VERSION, build: 'synthetic', rules: 'cast-1' },
      transfer: { checkpoint: { sha256: digest } },
      limitations: [],
    });
    const original = await makePlaytestFile({
      game: 'voice',
      seed: 7,
      scenario: 'voice-4',
      minute: rec.game.t,
      log: structuredClone(rec.log),
      hash: voiceHash(rec.game),
      engine: ENGINE_VERSION,
      snapshot: voiceState(rec.game),
      plainSnapshot: true,
    });
    const file = {
      ...original,
      build: 'synthetic-original-host',
      runId: 'synthetic-source-run',
      castOwnership: { [id]: head },
      castSources: { [id]: source },
    };
    // Public importer compares before this documented import-added pause. Preserve it in the replay log.
    if (rec.game.live() && !rec.game.paused) rec.apply({ type: 'pause' });
    const sourceText = JSON.stringify(file);
    const fileImport = await importedFileRecord(file, sourceText);
    send({ type: 'loadPlaytest', gen: 1, text: sourceText });
    await vi.waitFor(() => expect(replies.some((r) => r.type === 'replayed' && r.gen === 1)).toBe(true));
    send({ type: 'exportPlaytest', full: true });
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
    expect(exported.file.snapshot).toEqual(JSON.parse(stableStringify(voiceState(rec.game))));
    expect(exported.file.hash).toBe(voiceHash(rec.game));
    expect(exported.file.build).toBe(file.build);
    expect(exported.file.castOwnership).toEqual(file.castOwnership);
    expect((exported.file as typeof file).castSources).toEqual(file.castSources);
    const corrupt = structuredClone(file);
    requireValue(corrupt.castSources[id]).now = -1;
    send({ type: 'loadPlaytest', gen: 2, text: JSON.stringify(corrupt) });
    await vi.waitFor(() => expect(replies.some((r) => r.type === 'playtestError' && r.gen === 2)).toBe(true));
    send({ type: 'exportPlaytest', full: true });
    await vi.waitFor(() => expect(replies.filter((r) => r.type === 'playtest')).toHaveLength(2));
    expect(requireValue(replies.findLast((r) => r.type === 'playtest')).file).toEqual(exported.file);
    const roundtrip = parseVoicePlaytest(JSON.stringify(exported.file));
    const replayed = replayVoice(roundtrip.file.seed, roundtrip.file.log, roundtrip.rules).rec;
    expect(JSON.parse(stableStringify(voiceState(replayed.game)))).toEqual(exported.file.snapshot);

    send({ type: 'resume' });
    send({ type: 'tick', dtMs: 1000 });
    send({ type: 'exportPlaytest', full: true });
    await vi.waitFor(() => expect(replies.filter((reply) => reply.type === 'playtest')).toHaveLength(3));
    const continued = requireValue(replies.findLast((reply) => reply.type === 'playtest')).file;
    expect(continued).toMatchObject({ runId, fileImport });
    expect(continued.minute).toBeGreaterThan(exported.file.minute);
    const parsed = parseVoicePlaytest(JSON.stringify(continued));
    const playing = replayVoice(parsed.file.seed, parsed.file.log, parsed.rules).rec;
    expect(JSON.parse(stableStringify(voiceState(playing.game)))).toEqual(continued.snapshot);
    expect(continued.build).toBe(file.build);
    expect(continued.castOwnership).toEqual(file.castOwnership);
    expect((continued as typeof file).castSources).toEqual(file.castSources);
  } finally {
    vi.unstubAllGlobals();
  }
});
