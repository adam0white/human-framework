import { describe, expect, it } from 'vitest';
import { requireValue } from '../../shared/require-value.ts';
import { ClassicSim } from './classic.ts';
import { ColonyGame, DEFAULT_SEED, GOAL_JUDGE } from './game.ts';
import { createColonyRun } from './hf4.ts';
import { createFrameworkHumanSide } from './human.ts';
import { fw, villagerPersonSpec } from './human-cast.ts';
import { ColonyHostWorld, createHostState, HOST } from './human-world.ts';
import { MAP } from './map.ts';
import { inferAction } from './orders.ts';
import {
  applyWorldMinute,
  createSideWorld,
  DAWN_MEAL,
  END_MINUTE,
  homeOf,
  nextStageCost,
  STAGE_COST,
  STORM_END,
  STORM_START,
  STORM_SUPPER,
  stageKind,
  VILLAGERS,
} from './world-types.ts';

describe('v2 rules', () => {
  it('prices stages: walls 3–6 cheap, the beam at 7, the roof 8–10 dear', () => {
    expect([3, 4, 5, 6, 7, 8, 9, 10].map(stageKind)).toEqual([
      'wall',
      'wall',
      'wall',
      'wall',
      'beam',
      'roof',
      'roof',
      'roof',
    ]);
    const w = createSideWorld();
    expect(nextStageCost(w)).toEqual(STAGE_COST.wall);
    w.house.stage = 7;
    expect(nextStageCost(w)).toEqual({ timber: 5, work: 600 });
    w.storeroom = 0;
    expect(nextStageCost(w)).toEqual(STAGE_COST.wall);
    // The Human session rate is the same price: 36 / W and 48 / W progress per hour-long session.
    expect(HOST.buildRate.wall).toEqual({ base: 36 / 120, gain: 48 / 120 });
    expect(HOST.buildRate.roof.base).toBeCloseTo(36 / 600);
    expect(HOST.buildRate.roof.gain).toBeCloseTo(48 / 600);
  });

  it('a Classic roof stage takes 5 timber and 600 work', () => {
    const world = createSideWorld();
    world.house.stage = 7;
    world.resources.timber = 7;
    const s = new ClassicSim(1, VILLAGERS, world);
    s.apply({ orderId: 'o1', personId: 'yusuf', action: 'build', placeId: 'site', rush: false, rollKey: 0 });
    const yusuf = s.unit('yusuf');
    for (let m = 0; m < 60 && !yusuf.task?.started; m++) {
      applyWorldMinute(world, m);
      s.step(m);
    }
    expect(world.resources.timber).toBe(2);
    expect(yusuf.task?.remaining).toBe(600 - 2); // a builder works at 2×
  });

  it('homeOf: from the storm, Idris and Samira live in the new house if roofed, else the masjid', () => {
    const w = createSideWorld();
    expect(homeOf('idris', w, STORM_START - 1)).toBe('home-idris');
    expect(homeOf('samira', w, STORM_START)).toBe('masjid');
    expect(homeOf('yusuf', w, STORM_START)).toBe('home-yusuf');
    expect(homeOf('samira', w, END_MINUTE)).toBe(VILLAGERS.find((v) => v.id === 'samira')?.home);
    w.house.stage = 10;
    expect(homeOf('idris', w, STORM_START)).toBe('site');
    expect(homeOf('idris', w, END_MINUTE + 60)).toBe('site');
  });

  it('Classic builders claim distinct stages: no wall stands in for the beam, the roof is paid once per stage', () => {
    const run = (stage: number, timber: number, target: number) => {
      const world = createSideWorld();
      world.house.stage = stage;
      world.resources.timber = timber;
      const s = new ClassicSim(1, VILLAGERS, world);
      for (const [i, id] of (['yusuf', 'tariq', 'idris'] as const).entries())
        s.apply({
          orderId: `o${i}`,
          personId: id,
          action: 'build',
          placeId: 'site',
          rush: false,
          rollKey: 0,
        });
      for (let m = 0; m < 800 && world.house.stage < target; m++) {
        applyWorldMinute(world, m);
        s.step(m);
        const claims = s.units.flatMap((u) =>
          u.task?.started && u.task.stage !== undefined ? [u.task.stage] : [],
        );
        expect(new Set(claims).size).toBe(claims.length);
      }
      return world;
    };
    // Stage 5: one builder takes stage 6 and pays once; the others help, since the beam waits for stage 6.
    const walls = run(5, 6, 6);
    expect(walls.house.stage).toBe(6);
    expect(walls.resources.timber).toBe(2); // one wall, then the beam claimed the minute stage 6 stood
    // Stage 9: only stage 10 is left, so it is paid once (5 timber), not once per builder.
    const roof = run(9, 15, 10);
    expect(roof.house.stage).toBe(10);
    expect(roof.resources.timber).toBe(10);
  });

  it('the Classic store-room never overshoots its six stages', () => {
    const world = createSideWorld();
    world.house.stage = 10;
    world.storeroom = 5;
    world.resources.timber = 20;
    const s = new ClassicSim(1, VILLAGERS, world);
    for (const [i, id] of (['yusuf', 'tariq', 'idris'] as const).entries())
      s.apply({ orderId: `o${i}`, personId: id, action: 'build', placeId: 'site', rush: false, rollKey: 0 });
    for (let m = 0; m < 300; m++) {
      applyWorldMinute(world, m);
      s.step(m);
    }
    expect(world.storeroom).toBe(6);
    expect(world.resources.timber).toBe(18);
  });

  it('storm meals: at 19:30 and 04:45 each living Classic unit takes a meal from the store', () => {
    for (const minute of [STORM_SUPPER, DAWN_MEAL]) {
      const world = createSideWorld();
      world.resources.meals = 10;
      const s = new ClassicSim(1, VILLAGERS, world);
      applyWorldMinute(world, minute);
      s.step(minute);
      expect(world.resources.meals).toBe(4);
      expect(world.eaten).toBe(6);
    }
    const world = createSideWorld();
    world.resources.meals = 4;
    const s = new ClassicSim(1, VILLAGERS, world);
    applyWorldMinute(world, STORM_SUPPER);
    s.step(STORM_SUPPER);
    expect(world.resources.meals).toBe(0);
  });

  it('the storm removes the real Human cooking offer and provides stored meals', () => {
    const world = createSideWorld();
    world.resources.grain = 10;
    world.resources.water = 10;
    world.resources.meals = 0;
    const community = createColonyRun(
      1,
      VILLAGERS,
      VILLAGERS.map((v) => villagerPersonSpec(1, v)),
    );
    const host = new ColonyHostWorld(1, MAP, world, createHostState(VILLAGERS), community);
    const maryam = requireValue(community.people.find((p) => p.id === 'maryam'));
    // Explicit clock premise: these are independent host availability queries, not a simulated trajectory.
    expect(
      host.affordancesFor({ ...maryam, now: fw(STORM_START - 1) }).some((a) => a.action === 'cook'),
    ).toBe(true);
    expect(host.affordancesFor({ ...maryam, now: fw(STORM_START) }).some((a) => a.action === 'cook')).toBe(
      false,
    );
    expect(host.affordancesFor({ ...maryam, now: fw(STORM_END) }).some((a) => a.action === 'cook')).toBe(
      true,
    );
    for (const minute of [STORM_SUPPER, DAWN_MEAL]) {
      world.resources.meals = 10;
      const before = world.eaten;
      host.minute(minute, null);
      expect(world.eaten - before).toBe(6);
      expect(world.resources.meals).toBe(4);
    }
  });

  it('captures roof and stock at the deadline, locks them, and continues the host into day three', () => {
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    // Explicit world and clock premise: step the actual boundary without claiming a two-day trajectory.
    g.minute = GOAL_JUDGE - 1;
    for (const world of [g.classicWorld, g.humanWorld]) {
      world.house.stage = 8;
      world.resources.meals = 8;
    }
    g.advance(1);
    const captured = g.goals();
    for (const world of [g.classicWorld, g.humanWorld]) {
      world.house.stage = 10;
      world.resources.meals = 0;
    }
    g.advance(1);
    for (const side of ['classic', 'human'] as const) {
      expect(g.goals()[0]?.[side]).toEqual(captured[0]?.[side]);
      expect(g.goals()[0]?.[side]).toEqual({ value: 8, status: 'failed' });
      expect(g.goals()[1]?.[side]).toEqual(captured[1]?.[side]);
    }
    g.minute = END_MINUTE;
    expect(g.continueDay()).toBe(true);
    expect(g.continueDay()).toBe(false);
    expect(g.classicWorld.storeroom).toBe(0);
    expect(g.humanWorld.storeroom).toBe(0);
    expect(
      inferAction('site', { minute: g.minute, house: g.classicWorld.house, cedarFelled: true, storeroom: 0 }),
    ).toBe('build');
    expect(g.frame().day).toEqual({ current: 3, total: 3 });
    expect(g.frame().timeline.end).toBe(4320);
    expect(g.log.at(-1)).toEqual({ minute: END_MINUTE, kind: 'continue' });
    g.advance(1);
    expect(g.minute).toBe(END_MINUTE + 1);
    expect(g.goals(2)[0]?.human).toEqual(captured[0]?.human);
  });
});
