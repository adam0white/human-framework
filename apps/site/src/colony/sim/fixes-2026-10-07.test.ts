/**
 * The four bugs from the owner's 2026-10-07 export (docs/games/colony-playtest-2026-10-07.md), each pinned on its
 * own: Classic resting in the roofed house, honest unavailable-cooking answers, cards lapsing after the
 * Human side finished, and tariq-again's line. Current HF4 refusal replaces the former host-only promise.
 */
import { describe, expect, it } from 'vitest';
import { createPlaceholderHumanSide } from '../../../test/colony/placeholder-human.fixture.ts';
import { parsePlaytest } from '../../shared/playtest.ts';
import { ClassicSim } from './classic.ts';
import { ColonyGame, DEFAULT_SEED, NUDGES, SCENARIO_VERSION, TARIQ_AGAIN_FRESH } from './game.ts';
import { createColonyRun } from './hf4.ts';
import { createFrameworkHumanSide, type FrameworkHumanSide } from './human.ts';
import { fw, villagerPersonSpec } from './human-cast.ts';
import { ColonyHostWorld, createHostState, HOST } from './human-world.ts';
import { MAP } from './map.ts';
import { OrderBook } from './orders.ts';
import { validateColonyLog } from './playtest.ts';
import { applyWorldMinute, at, createSideWorld, STORM_START, VILLAGERS } from './world-types.ts';

describe('2026-10-07 export fixes', () => {
  it('Classic: resting in the roofed house keeps the storm out', () => {
    const world = createSideWorld();
    world.house.stage = 10;
    const s = new ClassicSim(1, VILLAGERS, world);
    applyWorldMinute(world, STORM_START - 1);
    world.minute = STORM_START;
    // "Resting at home": from the storm their home is the roofed house (`homeOf` gives 'site').
    for (const id of ['idris', 'samira'] as const)
      s.apply({ orderId: id, personId: id, action: 'rest', placeId: 'site', rush: false, rollKey: 0 });
    const hurt: string[] = [];
    let restedIndoors = 0;
    for (let m = STORM_START; m < STORM_START + 150; m++) {
      applyWorldMinute(world, m);
      const ev = s.step(m);
      for (const u of s.units) {
        if (u.task?.action !== 'rest' || u.task.phase !== 'work' || u.task.placeId !== 'site') continue;
        expect(u.indoors, u.id).toBe(true);
        restedIndoors += 1;
      }
      for (const i of ev.injuries) {
        const u = s.unit(i.personId);
        if (u.task?.placeId === 'site' && u.task.phase === 'work') hurt.push(`${i.personId}@${m}`);
      }
    }
    expect(restedIndoors).toBeGreaterThan(0);
    expect(hurt).toEqual([]);
  });

  it('predicts and reports the actual unavailable-cooking refusal without inventing a promise', () => {
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    g.humanWorld.resources.meals = HOST.cookBelow + 100;
    const prediction = g.predict({ personId: 'maryam', placeId: 'kitchen' });
    expect(prediction).toMatchObject({ kind: 'cannot', text: 'Can’t: enough food stored' });
    const o = g.issue({ personId: 'maryam', placeId: 'kitchen' });
    g.advance(1);
    const card = g.book.card(o?.id ?? '');
    expect(card?.human.state).toBe('cannot');
    expect(card?.human.settled).toBe(true);
    expect(g.human.working(o?.id ?? '')).toBe(false);
  });

  it('the physical host names why cooking is unavailable in the storm', () => {
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    const community = createColonyRun(
      DEFAULT_SEED,
      VILLAGERS,
      VILLAGERS.map((v) => villagerPersonSpec(DEFAULT_SEED, v)),
    );
    const host = new ColonyHostWorld(DEFAULT_SEED, MAP, g.humanWorld, createHostState(VILLAGERS), community);
    const person = { ...(g.human as FrameworkHumanSide).person('maryam'), now: fw(STORM_START + 30) };
    expect(host.notOffered(person, 'cook').short).toBe('no fire in the storm');
    expect(host.affordancesFor(person).some((a) => a.action === 'cook')).toBe(false);
  });

  it('a card whose Human side finished is done, not lapsed, while Classic is still on it', () => {
    const book = new OrderBook();
    const a = book.issue({ personId: 'tariq', placeId: 'site' }, 0, 'build');
    book.setChip(a.id, 'classic', { state: 'ok', label: 'on it' });
    book.setChip(a.id, 'human', { state: 'done', label: 'Fine.', settled: true });
    expect(book.lapse(120)).toEqual([]);
    expect(book.card(a.id)?.status).toBe('done');
    book.setChip(a.id, 'classic', { state: 'ok', label: 'done', settled: true });
    expect(book.card(a.id)?.classic.label).toBe('done');
  });

  it('tariq-again says "He remembers last night" only when Tariq was ordered into the squall', () => {
    const reason = (take: boolean): string | undefined => {
      const g = new ColonyGame(DEFAULT_SEED, createPlaceholderHumanSide);
      const squall = NUDGES.find((n) => n.id === 'squall-tariq');
      if (!squall) throw new Error('no squall card');
      g.advance(squall.minute);
      if (take) g.issue({ ...squall.order, ...squall.prefill }, squall.id);
      else g.dismissNudge(squall.id);
      g.advance(at(2, 7, 0) - g.minute);
      return g.visibleNudges().find((n) => n.id === 'tariq-again')?.reason;
    };
    expect(reason(true)).toMatch(/^He remembers last night/);
    expect(reason(false)).toBe(TARIQ_AGAIN_FRESH);
  });

  it('a colony-scenario@2 export is refused with both versions named', () => {
    const text = JSON.stringify({
      kind: 'human-playtest',
      format: 1,
      game: 'colony',
      build: '29c7b09',
      framework: '2.1.0',
      engine: '2.0.0',
      seed: DEFAULT_SEED,
      scenario: 'colony-scenario@2',
      minute: 10,
      log: [],
      hash: '0',
      snapshotEncoding: 'json',
      snapshot: null,
    });
    expect(() => parsePlaytest(text, 'colony', SCENARIO_VERSION, validateColonyLog)).toThrow(
      new RegExp(`colony-scenario@2; this build plays ${SCENARIO_VERSION}`),
    );
  });
});
