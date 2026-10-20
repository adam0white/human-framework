import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { ColonyGame, DEFAULT_SEED } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import { colonyHash, colonyState, parseColonyPlaytest, replayColony } from './playtest.ts';
import { at, STORM_START } from './world-types.ts';

it('default @6 keeps exact @5 state on the same seed and orders', () => {
  const file = JSON.parse(
    readFileSync(new URL('../../../test/fixtures/playtest-colony-v5.json', import.meta.url), 'utf8'),
  );
  const old = replayColony(file.seed, createFrameworkHumanSide, file.log, file.minute, 5);
  const current = replayColony(file.seed, createFrameworkHumanSide, file.log, file.minute, 6);
  expect(colonyState(current)).toEqual(colonyState(old));
});

it('records early warning at dawn and replays it before creating either village', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 6, 'early-warning');
  expect(game.classicWorld.preparationAt).toBe(at(2, 12, 0));
  expect(game.humanWorld.preparationAt).toBe(game.classicWorld.preparationAt);
  expect(game.timeline().markers.find((m) => m.kind === 'warning')?.minute).toBe(at(2, 12, 0));
  expect(game.timeline().markers.find((m) => m.kind === 'storm')?.minute).toBe(STORM_START);
  game.advance(1500);
  const replay = replayColony(game.seed, createFrameworkHumanSide, game.log, game.minute, 6);
  expect(colonyHash(replay)).toBe(colonyHash(game));
  expect(replay.frame().village).toBe('early-warning');
});

it('refuses an early warning in a legacy run and invalid configuration logs', () => {
  expect(() => new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 5, 'early-warning')).toThrow(/rules/);
  const base = JSON.parse(
    readFileSync(new URL('../../../test/fixtures/playtest-colony-v5.json', import.meta.url), 'utf8'),
  );
  const config = { minute: 0, kind: 'village', village: 'early-warning', preparationAt: at(2, 12, 0) };
  for (const log of [[{ ...config, minute: 1 }], [config, config], [{ ...config, preparationAt: 1 }]])
    expect(() =>
      parseColonyPlaytest(JSON.stringify({ ...base, scenario: 'colony-scenario@6', log })),
    ).toThrow();
  expect(() => parseColonyPlaytest(JSON.stringify({ ...base, log: [config] }))).toThrow();
});

it('pins an early-warning run and its midpoint save continuation', async () => {
  const { ENGINE_VERSION } = await import('@adam0white/human-framework');
  const { hashState, makePlaytestFile } = await import('../../shared/playtest.ts');
  const { withHistoricPersonEngine } = await import('../../../test/support/engine-stamp.ts');
  const { Playback } = await import('./playback.ts');
  const { colonySnapshot } = await import('./playtest.ts');
  const { file, rules } = parseColonyPlaytest(
    readFileSync(new URL('../../../test/fixtures/playtest-colony-v6-early.json', import.meta.url), 'utf8'),
  );
  const game = replayColony(file.seed, createFrameworkHumanSide, file.log, file.minute, rules);
  expect(hashState(withHistoricPersonEngine(colonyState(game), file.engine))).toBe('0600476948949f');
  const mid = replayColony(
    file.seed,
    createFrameworkHumanSide,
    file.log.filter((e) => e.minute < 1500),
    1500,
    rules,
  );
  expect(colonyHash(mid)).toBe('134caa6c3962af');
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
  expect(colonyHash(mid)).toBe('171cdb3b9f7fcd');
  expect(playback.game && colonyHash(playback.game)).toBe(colonyHash(mid));
});

it('raises both cooking caps at noon without opening shelter or shutters early', async () => {
  const { createCommunity, createPerson } = await import('@adam0white/human-framework');
  const { fw, villagerPersonSpec } = await import('./human-cast.ts');
  const { ColonyHostWorld, createHostState } = await import('./human-world.ts');
  const { MAP } = await import('./map.ts');
  const { VILLAGERS } = await import('./world-types.ts');
  for (const village of ['default', 'early-warning'] as const) {
    const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 6, village);
    const world = game.humanWorld;
    world.minute = game.classicWorld.minute = at(2, 14, 0);
    world.resources.meals = game.classicWorld.resources.meals = 8;
    world.resources.grain = game.classicWorld.resources.grain = 10;
    world.resources.water = game.classicWorld.resources.water = 10;
    const community = createCommunity(
      VILLAGERS.map((spec) => createPerson(villagerPersonSpec(DEFAULT_SEED, spec))),
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
