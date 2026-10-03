import { describe, expect, it } from 'vitest';
import { ClassicSim } from './classic.ts';
import { ColonyGame, DEFAULT_SEED, GOAL_JUDGE } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import { HOST } from './human-world.ts';
import { inferAction } from './orders.ts';
import {
  applyWorldMinute,
  at,
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

  describe('a full run with no orders', () => {
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    const cooked = { classic: 0, human: 0 };
    let humanSupper = 0;
    let prev = { classic: 0, human: 0 };
    let roofAtJudge: ReturnType<ColonyGame['goals']> = [];
    while (!g.ended) {
      const eatenBefore = g.humanWorld.eaten;
      g.advance(1);
      const m = g.minute - 1;
      if (m === STORM_SUPPER) humanSupper = g.humanWorld.eaten - eatenBefore;
      const now = { classic: g.classicWorld.resources.meals, human: g.humanWorld.resources.meals };
      if (m >= STORM_START && m < STORM_END) {
        if (now.classic > prev.classic) cooked.classic += 1;
        if (now.human > prev.human) cooked.human += 1;
      }
      prev = now;
      if (g.minute === GOAL_JUDGE) {
        roofAtJudge = g.goals();
        // A roof finished after 19:00 does not change the goal.
        g.humanWorld.house.stage = 10;
      }
    }

    it('nobody cooks during the storm', () => {
      expect(cooked).toEqual({ classic: 0, human: 0 });
    });

    it('the Human storm supper feeds all six from the store', () => {
      expect(humanSupper).toBeGreaterThanOrEqual(6);
    });

    it('roof and stock lock at 19:00; lives is met at the end', () => {
      const at19 = Object.fromEntries(roofAtJudge.map((x) => [x.id, x.human]));
      expect(at19.roof).toEqual({ value: 9, status: 'failed' });
      expect(at19.stock?.status).toBe('met');
      expect(at19.lives?.status).toBe('open');
      const end = Object.fromEntries(g.goals().map((x) => [x.id, x.human]));
      expect(end.roof).toEqual({ value: 9, status: 'failed' });
      expect(end.stock).toEqual(at19.stock);
      expect(end.lives).toEqual({ value: 6, status: 'met' });
    });

    it('"Another day" opens a store-room where the house is done and logs the continue', () => {
      expect(g.minute).toBe(END_MINUTE);
      expect(g.continueDay()).toBe(true);
      expect(g.continueDay()).toBe(false);
      expect(g.classicWorld.storeroom).toBe(0);
      expect(g.frame().classicWorld.project).toEqual({ kind: 'storeroom', stage: 0, stages: 6 });
      expect(
        inferAction('site', {
          minute: g.minute,
          house: g.classicWorld.house,
          cedarFelled: true,
          storeroom: 0,
        }),
      ).toBe('build');
      expect(g.frame().day).toEqual({ current: 3, total: 3 });
      expect(g.frame().timeline.end).toBe(4320);
      expect(g.log.at(-1)).toEqual({ minute: END_MINUTE, kind: 'continue' });
      g.advance(at(3, 19, 30) - g.minute);
      expect(g.goals()[0]?.classic.status).not.toBe('open');
    });
  });
});
