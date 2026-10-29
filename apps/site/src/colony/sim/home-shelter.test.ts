import { expect, it } from 'vitest';
import { ClassicSim } from './classic.ts';
import { ColonyGame, DEFAULT_SEED } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import { fw } from './human-cast.ts';
import { spotFor } from './map.ts';
import { applyWorldMinute, createSideWorld, VILLAGERS } from './world-types.ts';

it('Home offers shelter by day and night under current rules', () => {
  for (const minute of [0, 1100]) {
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    // Clock premise, not a claim that the people simulated to this minute.
    g.minute = minute;
    expect(g.issue({ personId: 'yusuf', placeId: 'home-yusuf' })?.action).toBe('shelter');
  }
});

it('Classic shelter survives eating and expires at dawn', () => {
  const world = createSideWorld();
  const classic = new ClassicSim(DEFAULT_SEED, VILLAGERS, world);
  classic.apply({
    orderId: 'o1',
    personId: 'yusuf',
    action: 'shelter',
    placeId: 'home-yusuf',
    rush: false,
    rollKey: 0,
  });
  const step = (from: number, to: number) => {
    for (let minute = from; minute < to; minute++) {
      applyWorldMinute(world, minute);
      classic.step(minute);
    }
  };
  step(0, 130);
  expect(classic.unit('yusuf').task?.action).toBe('shelter');
  expect(classic.unit('yusuf').indoors).toBe(true);
  classic.unit('yusuf').hunger = 81;
  step(130, 131);
  expect(classic.unit('yusuf').suspended?.action).toBe('shelter');
  step(131, 191);
  expect(classic.unit('yusuf').task?.action).toBe('shelter');
  step(191, 1441);
  expect(classic.unit('yusuf').task?.shelterUntil).toBeUndefined();
});

// HF prayer deferral, cancellation, replacement and cold next-hash are covered in deferred-promises.test.ts.
it('the Home command alias routes the wellhouse resident to his own cover', () => {
  const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
  expect(g.predict({ personId: 'danyal', placeId: 'home-idris' }).kind).not.toBe('cannot');
  g.issue({ personId: 'danyal', placeId: 'home-idris' });
  g.advance(1);
  const task = g.classic.unit('danyal').task;
  expect(task?.placeId).toBe('wellhouse');
  expect(task?.target).toEqual(spotFor('wellhouse', 5));
});

it('withdraws the actual standing HF request when its host shelter deadline expires', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
  game.issue({ personId: 'idris', placeId: 'home-idris' });
  game.advance(1);
  expect(game.human.working('o1')).toBe(true);
  const saved = game.human.snapshot() as { host: { shelterUntil: Record<string, number> } };
  expect(saved.host.shelterUntil.idris).toBe(fw(1440));
  // Expired host deadline premise. The complete native run and advice are unchanged.
  saved.host.shelterUntil.idris = fw(game.minute);
  game.human.restore(saved);
  game.advance(1);
  expect(game.human.working('o1')).toBe(false);
  expect(game.frame().cards[0]?.human.outcome).toContain('dawn');
  expect((game.human.snapshot() as typeof saved).host.shelterUntil.idris).toBeUndefined();
});
