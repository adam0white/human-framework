import { describe, expect, it } from 'vitest';
import { CLASSIC, ClassicSim } from './classic.ts';
import { ColonyGame, DEFAULT_SEED } from './game.ts';
import { createPlaceholderHumanSide } from './placeholder-human.fixture.ts';
import { applyWorldMinute, createSideWorld, END_MINUTE, VILLAGERS } from './world-types.ts';

function run(seed: number, orders: [number, Parameters<ColonyGame['issue']>[0]][], until: number) {
  const g = new ColonyGame(seed, createPlaceholderHumanSide);
  const sorted = [...orders].sort((a, b) => a[0] - b[0]);
  for (const [m, input] of sorted) {
    g.advance(m - g.minute);
    g.issue(input);
  }
  g.advance(until - g.minute);
  return g;
}

const ORDERS: [number, Parameters<ColonyGame['issue']>[0]][] = [
  [30, { personId: 'yusuf', placeId: 'site' }],
  [180, { personId: 'idris', placeId: 'cedar' }],
  [345, { personId: 'maryam', placeId: 'forest', rush: true }],
  [995, { personId: 'tariq', placeId: 'forest', insist: true }],
];

describe('Classic determinism', () => {
  it('same seed and order log give byte-identical state', () => {
    const a = run(DEFAULT_SEED, ORDERS, 1500);
    const b = run(DEFAULT_SEED, ORDERS, 1500);
    expect(JSON.stringify(a.classic.snapshot())).toBe(JSON.stringify(b.classic.snapshot()));
    expect(JSON.stringify(a.frame())).toBe(JSON.stringify(b.frame()));
  });

  it('the placeholder Human side mirrors Classic exactly', () => {
    const g = run(DEFAULT_SEED, ORDERS, 1200);
    expect(JSON.stringify(g.humanWorld)).toBe(JSON.stringify(g.classicWorld));
    const f = g.frame();
    expect(f.human.map((v) => [v.x, v.y])).toEqual(f.classic.map((u) => [u.x, u.y]));
  });

  it('a full run reaches the end and stays sane', () => {
    const g = run(DEFAULT_SEED, ORDERS, END_MINUTE);
    expect(g.ended).toBe(true);
    const r = g.classicWorld.resources;
    for (const v of Object.values(r)) expect(v).toBeGreaterThanOrEqual(0);
    expect(g.classicWorld.house.stage).toBeGreaterThanOrEqual(0);
    expect(g.classicWorld.house.stage).toBeLessThanOrEqual(10);
    // The colony works without orders: meals get cooked and the house progresses.
    const solo = run(DEFAULT_SEED, [], 600);
    expect(solo.classicWorld.house.stage).toBeGreaterThan(2);
  });

  it('different seeds can diverge only through scenario rolls', () => {
    // Before the first roll (the beam, around midday) two seeds produce identical mornings.
    const a = run(1, [], 240);
    const b = run(2, [], 240);
    expect(JSON.stringify(a.classicWorld)).toBe(JSON.stringify(b.classicWorld));
  });
});

describe('Classic hunger collapse and rescue', () => {
  function sim() {
    const world = createSideWorld();
    world.resources = { grain: 0, water: 0, timber: 0, meals: 0 };
    return { world, sim: new ClassicSim(7, VILLAGERS, world) };
  }

  it('collapses at hunger 100, then loses hp 2 per 10 minutes until death', () => {
    const { world, sim: s } = sim();
    const idris = s.unit('idris');
    // Far from everyone, so the rescuer needs time to arrive.
    idris.x = 3;
    idris.y = 0;
    idris.hunger = 99.95;
    applyWorldMinute(world, 0);
    s.step(0);
    expect(idris.down).toBe('collapsed');
    expect(world.injuries).toBe(1);
    const hp = idris.hp;
    for (let m = 1; m <= 10; m++) {
      applyWorldMinute(world, m);
      s.step(m);
    }
    expect(hp - idris.hp).toBeCloseTo(10 * CLASSIC.collapseHpPerMinute, 5);
    idris.hp = 0.1;
    applyWorldMinute(world, 11);
    s.step(11);
    expect(idris.dead).toBe(true);
    expect(world.deaths).toBe(1);
  });

  it('the nearest free unit hauls a collapsed unit home', () => {
    const { world, sim: s } = sim();
    world.resources.meals = 4;
    const idris = s.unit('idris');
    idris.x = 3;
    idris.y = 0;
    idris.hunger = 100;
    let m = 0;
    applyWorldMinute(world, m);
    s.step(m++);
    expect(idris.down).toBe('collapsed');
    const rescuer = s.units.find((u) => u.task?.action === 'carry-injured');
    expect(rescuer).toBeDefined();
    for (; m < 120 && idris.down; m++) {
      applyWorldMinute(world, m);
      s.step(m);
    }
    expect(idris.down).toBeNull();
    expect(idris.rest).toBeGreaterThan(0);
    expect([idris.x, idris.y]).toEqual([9, 12]);
    expect(idris.hunger).toBeLessThan(100);
  });

  it('auto-eats at hunger 80 even mid-order, then resumes the order', () => {
    const world = createSideWorld();
    world.resources.meals = 3;
    const s = new ClassicSim(7, VILLAGERS, world);
    s.apply({ orderId: 'o1', personId: 'yusuf', action: 'build', placeId: 'site', rush: false, rollKey: 0 });
    const yusuf = s.unit('yusuf');
    yusuf.hunger = 79.95;
    applyWorldMinute(world, 0);
    const ev = s.step(0);
    expect(ev.suspended).toEqual([{ orderId: 'o1', personId: 'yusuf' }]);
    expect(yusuf.task?.action).toBe('eat');
    expect(yusuf.suspended?.orderId).toBe('o1');
    for (let m = 1; m < 60 && yusuf.task?.action !== 'build'; m++) {
      applyWorldMinute(world, m);
      s.step(m);
    }
    expect(yusuf.task?.orderId).toBe('o1');
    // One meal takes CLASSIC.mealRelief (40) off hunger 80; a few minutes of walking and work add a little back.
    expect(yusuf.hunger).toBeLessThan(80 - CLASSIC.mealRelief + 5);
  });
});
