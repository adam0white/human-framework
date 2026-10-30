import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { ColonyGame, DEFAULT_SEED } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import { WELL_OLD_SAVE } from './human-side.ts';
import { colonyHash, parseColonyPlaytest, replayColony } from './playtest.ts';
import { at, STORM_START } from './world-types.ts';

it('refuses an old playtest with a plain start-fresh message', () => {
  const text = readFileSync(
    new URL('../../../test/fixtures/playtest-colony-v5.json', import.meta.url),
    'utf8',
  );
  expect(() => parseColonyPlaytest(text)).toThrow(WELL_OLD_SAVE);
});

it('records early warning at dawn and replays it before creating either village', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 9, 'early-warning');
  expect(game.classicWorld.preparationAt).toBe(at(2, 12, 0));
  expect(game.humanWorld.preparationAt).toBe(game.classicWorld.preparationAt);
  expect(game.timeline().markers.find((m) => m.kind === 'warning')?.minute).toBe(at(2, 12, 0));
  expect(game.timeline().markers.find((m) => m.kind === 'storm')?.minute).toBe(STORM_START);
  game.advance(5);
  const replay = replayColony(game.seed, createFrameworkHumanSide, game.log, game.minute, 9);
  expect(colonyHash(replay)).toBe(colonyHash(game));
  expect(replay.frame().village).toBe('early-warning');
});

it('refuses invalid configuration logs in a current envelope', async () => {
  const { FRAMEWORK_PACKAGE_VERSION, makePlaytestFile } = await import('../../shared/playtest.ts');
  const { SCENARIO_VERSION } = await import('./game.ts');
  const base = await makePlaytestFile({
    game: 'colony',
    seed: DEFAULT_SEED,
    scenario: SCENARIO_VERSION,
    minute: 0,
    log: [],
    hash: 'abc',
    engine: FRAMEWORK_PACKAGE_VERSION,
    snapshot: null,
  });
  const config = { minute: 0, kind: 'village', village: 'early-warning', preparationAt: at(2, 12, 0) };
  for (const log of [[{ ...config, minute: 1 }], [config, config], [{ ...config, preparationAt: 1 }]])
    expect(() => parseColonyPlaytest(JSON.stringify({ ...base, log }))).toThrow();
  expect(parseColonyPlaytest(JSON.stringify({ ...base, log: [config] })).file.log).toEqual([config]);
});

it('pins an early-warning run and its midpoint save continuation', async () => {
  const { FRAMEWORK_PACKAGE_VERSION: ENGINE_VERSION } = await import('../../shared/playtest.ts');
  const { makePlaytestFile } = await import('../../shared/playtest.ts');
  const { Playback } = await import('./playback.ts');
  const { colonySnapshot } = await import('./playtest.ts');
  const mid = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 9, 'early-warning');
  mid.advance(35);
  const save = await makePlaytestFile({
    game: 'colony',
    seed: mid.seed,
    scenario: mid.scenarioVersion,
    minute: mid.minute,
    log: mid.log,
    hash: colonyHash(mid),
    engine: ENGINE_VERSION,
    snapshot: colonySnapshot(mid),
  });
  const playback = new Playback(createFrameworkHumanSide);
  expect(playback.load(JSON.stringify(save), ENGINE_VERSION).result.matches).toBe(true);
  expect(playback.game?.village).toBe('early-warning');
  playback.game?.advance(40);
  mid.advance(40);
  expect(playback.game && colonyHash(playback.game)).toBe(colonyHash(mid));
});

it('raises both cooking caps at noon without opening shelter or shutters early', async () => {
  const { createColonyRun } = await import('./hf4.ts');
  const { fw, villagerPersonSpec } = await import('./human-cast.ts');
  const { ColonyHostWorld, createHostState } = await import('./human-world.ts');
  const { MAP } = await import('./map.ts');
  const { VILLAGERS } = await import('./world-types.ts');
  for (const village of ['default', 'early-warning'] as const) {
    const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 9, village);
    const world = game.humanWorld;
    world.minute = game.classicWorld.minute = at(2, 14, 0);
    world.resources.meals = game.classicWorld.resources.meals = 8;
    world.resources.grain = game.classicWorld.resources.grain = 10;
    world.resources.water = game.classicWorld.resources.water = 10;
    const community = createColonyRun(
      DEFAULT_SEED,
      VILLAGERS,
      VILLAGERS.map((spec) => villagerPersonSpec(DEFAULT_SEED, spec)),
    );
    const host = new ColonyHostWorld(DEFAULT_SEED, MAP, world, createHostState(VILLAGERS), community);
    const maryam = community.people.find((person) => person.id === 'maryam');
    if (!maryam) throw new Error('Missing cook');
    maryam.now = fw(world.minute);
    const offers = host.affordancesFor(maryam).map((a) => a.action);
    expect(offers.includes('cook')).toBe(village === 'early-warning');
    expect(game.classic.roleJob(game.classic.unit('maryam')) === 'cook').toBe(village === 'early-warning');
    expect(offers).not.toContain('shelter');
    expect(offers).not.toContain('shutter-house');
  }
});
