import { expect, it } from 'vitest';
import { ColonyGame, DEFAULT_SEED } from './game.ts';
import { createFrameworkHumanSide, type FrameworkHumanSide } from './human.ts';
import { spotFor } from './map.ts';
import { colonyHash, replayColony } from './playtest.ts';

it('Home offers shelter by day and night under @8, retaining older eat/sleep orders', () => {
  for (const rules of [7, 8] as const) {
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, rules);
    expect(g.issue({ personId: 'yusuf', placeId: 'home-yusuf' })?.action).toBe(
      rules === 8 ? 'shelter' : 'eat',
    );
    if (rules === 8) expect(g.predict({ personId: 'yusuf', placeId: 'home-yusuf' }).kind).not.toBe('cannot');
    g.advance(1100);
    expect(g.issue({ personId: 'yusuf', placeId: 'home-yusuf' })?.action).toBe(
      rules === 8 ? 'shelter' : 'sleep',
    );
  }
});

it('a Home request survives a meal and the generic lapse, then ends at dawn', () => {
  const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 8);
  g.issue({ personId: 'yusuf', placeId: 'home-yusuf' });
  g.advance(130);
  expect(g.classic.unit('yusuf').task?.action).toBe('shelter');
  expect(g.classic.unit('yusuf').indoors).toBe(true);
  expect(g.book.cards[0]?.status).toBe('active');
  expect(g.human.working('o1')).toBe(true);
  g.classic.unit('yusuf').hunger = 81;
  g.advance(1);
  expect(g.classic.unit('yusuf').suspended?.action).toBe('shelter');
  g.advance(60);
  expect(g.classic.unit('yusuf').task?.action).toBe('shelter');
  g.advance(900);
  expect(g.classic.unit('yusuf').asleep).toBe(true);
  expect(g.human.working('o1')).toBe(true);
  g.advance(350);
  expect(g.human.working('o1')).toBe(false);
  expect(g.classic.unit('yusuf').task?.shelterUntil).toBeUndefined();
  expect(g.frame().cards[0]?.human.outcome).toContain('dawn');
});

it('the shelter request allows HF to defer for its own priorities and cancel/replacement release it', () => {
  const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 8);
  g.issue({ personId: 'maryam', placeId: 'home-maryam' });
  g.advance(1);
  expect(g.book.cards[0]?.human.state).toBe('notNow');
  expect((g.human as FrameworkHumanSide).person('maryam').activity?.action).not.toBe('shelter');
  for (const end of ['cancel', 'replace'] as const) {
    const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 8);
    game.issue({ personId: 'yusuf', placeId: 'home-yusuf' });
    game.advance(30);
    if (end === 'cancel') game.cancel('o1');
    else game.issue({ personId: 'yusuf', placeId: 'site' });
    game.advance(1);
    expect(game.human.working('o1')).toBe(false);
    expect(game.classic.unit('yusuf').task?.shelterUntil).toBeUndefined();
  }
});

it('a saved active Home hold resumes exactly, and the logged order replays', () => {
  const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 8);
  g.issue({ personId: 'yusuf', placeId: 'home-yusuf' });
  g.advance(130);
  const loaded = replayColony(g.seed, createFrameworkHumanSide, g.log, g.minute, 8);
  loaded.human.restore(g.human.snapshot());
  loaded.classic.restore(g.classic.snapshot());
  g.advance(60);
  loaded.advance(60);
  expect(colonyHash(loaded)).toBe(colonyHash(g));
});

it('the Home command alias routes the wellhouse resident to his own cover', () => {
  const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 8);
  expect(g.predict({ personId: 'danyal', placeId: 'home-idris' }).kind).not.toBe('cannot');
  g.issue({ personId: 'danyal', placeId: 'home-idris' });
  g.advance(1);
  const task = g.classic.unit('danyal').task;
  expect(task?.placeId).toBe('wellhouse');
  expect(task?.target).toEqual(spotFor('wellhouse', 5));
});
