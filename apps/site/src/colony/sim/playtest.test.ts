/**
 * Game 1 playtest files: record through the worker's state machine, replay, compare hashes; and the import's
 * rejection paths.
 *
 * The default fixtures are full runs (Day 1 dawn through "Another day") recorded through `Playback` with
 * irregular real-time ticks: apps/site/test/fixtures/playtest-colony.json under colony-scenario@3 (recorded
 * 2026-10-07, never re-recorded: it proves @3 saves still replay under the @3 rules) and
 * playtest-colony-v4.json under @4, playtest-colony-v5.json under @5, playtest-colony-v6.json under @6, and playtest-colony-v7.json under @7.
 * Historical fixtures are never regenerated. Re-record only the current default fixture from the repo root:
 *
 *   PLAYTEST_REGEN=1 npx vitest run apps/site/src/voice/sim/playtest.test.ts apps/site/src/colony/sim/playtest.test.ts
 *
 * (fish: `env PLAYTEST_REGEN=1 npx vitest run ...`). Then run the same command without the variable.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ENGINE_VERSION } from '@adam0white/human-framework';
import { describe, expect, test } from 'vitest';
import { makePlaytestFile, PlaytestError, type PlaytestFile, parsePlaytest } from '../../shared/playtest.ts';
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
/** Current @8 default fixture; the only fixture REGEN writes. */
const FIXTURE = resolve(import.meta.dirname, '../../../test/fixtures/playtest-colony-v8.json');
const REGEN = Boolean(process.env.PLAYTEST_REGEN);
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

/** The full run once per file. */
let full: ColonyGame | undefined;
const fullRun = (): ColonyGame => {
  full ??= gameOf(recordRun());
  return full;
};

const fixtureFile = (g: ColonyGame) =>
  makePlaytestFile<LogEntry>({
    game: 'colony',
    seed: g.seed,
    scenario: SCENARIO_VERSION,
    minute: g.minute,
    log: g.log,
    hash: colonyHash(g),
    engine: ENGINE_VERSION,
    snapshot: null,
  });

const parse = (text: string, max?: number) =>
  parsePlaytest(text, 'colony', SCENARIO_VERSION, validateColonyLog, max);

describe('Game 1 playtest files', () => {
  test.skipIf(!REGEN)(
    'regenerate the fixture (PLAYTEST_REGEN=1)',
    async () => {
      const g = fullRun();
      expect(g.ended && g.endMinute > 0).toBe(true);
      writeFileSync(FIXTURE, `${JSON.stringify(await fixtureFile(g))}\n`);
    },
    120_000,
  );

  test('old cast-edition files refuse plainly without replacing loaded play', () => {
    const pb = recordRun(10);
    const before = pb.game;
    for (const path of [FIXTURE_V3, FIXTURE_V4, FIXTURE_V5, FIXTURE_V6, FIXTURE_V7, FIXTURE]) {
      expect(() => pb.load(readFileSync(path, 'utf8'), ENGINE_VERSION)).toThrow(/older cast edition/);
      expect(pb.game).toBe(before);
    }
  });

  test('a run through Playback with irregular ticks, whys and predicts replays to the same hash', () => {
    const g = fullRun();
    expect(g.log.some((e) => e.kind === 'continue')).toBe(true);
    expect(g.log.some((e) => e.kind === 'cancel')).toBe(true);
    const again = replayColony(g.seed, createFrameworkHumanSide, g.log, g.minute);
    expect(colonyHash(again)).toBe(colonyHash(g));
  }, 120_000);

  test('a file saved mid-run loads into Playback, replays to its hash and plays on', async () => {
    const pb = recordRun(1500);
    const text = JSON.stringify(await pb.playtestFile(ENGINE_VERSION));
    const other = new Playback(createFrameworkHumanSide);
    const { result, replies } = other.load(text, ENGINE_VERSION);
    expect(result.matches).toBe(true);
    expect(other.game?.minute).toBe(pb.game?.minute);
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
  }, 60_000);

  test('a bad file leaves the current run as it was', () => {
    const pb = recordRun(300);
    const before = pb.game;
    expect(() => pb.load('{"kind":"human-playtest"}', ENGINE_VERSION)).toThrow(PlaytestError);
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
