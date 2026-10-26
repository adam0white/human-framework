import { describe, expect, it } from 'vitest';
import { ClassicSim } from './classic.ts';
import { ColonyGame, DEFAULT_SEED } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import { HOST } from './human-world.ts';
import { colonyState } from './playtest.ts';
import { BEAM_STAGE, createSideWorld, VILLAGERS } from './world-types.ts';

describe('known construction facts', () => {
  it('separates paid Human work, stale payment, beams and Classic claims without mutating reads', () => {
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    const original = g.human.snapshot() as {
      host: { buildPaid: boolean; buildStage?: number; storeroom?: boolean };
    };
    original.host.buildPaid = true;
    original.host.buildStage = g.humanWorld.house.stage;
    g.human.restore(original);
    g.humanWorld.resources.timber = 0;
    const raw = JSON.stringify(colonyState(g));
    const f = g.frame({ buildingDetails: true, personId: 'yusuf' });
    expect(f.humanWorld.construction).toMatchObject({
      payment: 'on-site',
      stockTimber: 0,
      nextWork: 'ordinary',
    });
    expect(JSON.stringify(colonyState(g))).toBe(raw);
    expect(g.frame().humanWorld).not.toHaveProperty('construction');
    g.humanWorld.house.stage = BEAM_STAGE - 1;
    expect(g.frame({ buildingDetails: true }).humanWorld.construction).toMatchObject({
      payment: 'unpaid',
      nextWork: 'beam',
      nextTimber: HOST.beamTimber,
    });
    g.humanWorld.storeroom = 0;
    expect(g.frame({ buildingDetails: true }).humanWorld.construction?.payment).toBe('unpaid');
    g.humanWorld.storeroom = null;
    g.humanWorld.house.stage = 0;
    const stale = g.human.snapshot() as typeof original;
    stale.host.buildStage = 3;
    g.human.restore(stale);
    expect(g.frame({ buildingDetails: true }).humanWorld.construction?.payment).toBe('unpaid');

    const world = createSideWorld();
    world.house.stage = 7;
    world.resources.timber = 7;
    const classic = new ClassicSim(1, VILLAGERS, world);
    classic.apply({
      orderId: 'build',
      personId: 'yusuf',
      action: 'build',
      placeId: 'site',
      rush: false,
      rollKey: 0,
    });
    for (let m = 0; m < 60 && !classic.unit('yusuf').task?.started; m++) classic.step(m);
    const before = JSON.stringify(classic.snapshot());
    const view = classic.constructionView();
    expect(view.active).toContainEqual({ personId: 'yusuf', stage: 8, action: 'build' });
    expect(view.stockTimber).toBe(2);
    expect(view.nextStage).toBe(9);
    expect(view.nextTimber).toBe(5);
    expect(JSON.stringify(classic.snapshot())).toBe(before);
  });
});
