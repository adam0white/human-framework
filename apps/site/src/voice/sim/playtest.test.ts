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
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ENGINE_VERSION } from '@human/framework';
import { describe, expect, test } from 'vitest';
import {
  decodeSnapshot,
  encodeSnapshot,
  makePlaytestFile,
  PlaytestError,
  type PlaytestFile,
  parsePlaytest,
} from '../../shared/playtest.ts';
import { defaultWhisper, VOICE_SCENARIO_VERSION } from '../protocol.ts';
import { SHIPPED_SEED, VoiceGame } from './game.ts';
import { type Driver, play } from './headless.ts';
import {
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
function recordRun(views = true): RecordedGame {
  const rec = new RecordedGame(new VoiceGame(SHIPPED_SEED));
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
    scenario: VOICE_SCENARIO_VERSION,
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
      const rec = recordRun();
      expect(rec.game.phase).toBe('report');
      writeFileSync(FIXTURE, `${JSON.stringify(await fixtureFile(rec))}\n`);
    },
    120_000,
  );

  test.skipIf(REGEN)(
    'the committed fixture replays to its hash',
    () => {
      const f = parsePlaytest(
        readFileSync(FIXTURE, 'utf8'),
        'voice',
        VOICE_SCENARIO_VERSION,
        validateVoiceLog,
      );
      const { rec, driftAt } = replayVoice(f.seed, f.log);
      expect(driftAt).toBe(-1);
      expect(rec.game.phase).toBe('report');
      expect(rec.game.t).toBe(f.minute);
      expect(voiceHash(rec.game)).toBe(f.hash);
    },
    60_000,
  );

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

  test('sizes of a full run file (reported, not pinned)', async () => {
    const rec = run(false);
    const snapshot = voiceSnapshot(rec.game);
    const raw = JSON.stringify({ ...(await fixtureFile(rec)), snapshotEncoding: 'json', snapshot });
    const file = JSON.stringify({ ...(await fixtureFile(rec)), ...(await encodeSnapshot(snapshot)) });
    console.log(
      `Game 2 full run: log ${rec.log.length} entries, ${JSON.stringify(rec.log).length} chars; file with plain snapshot ${raw.length}; file as saved (gzipped snapshot) ${file.length}`,
    );
    expect(file.length).toBeLessThan(raw.length);
  }, 120_000);
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
