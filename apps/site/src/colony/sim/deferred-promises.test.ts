/** Rules 5 holds stated deferrals without selecting an action on HF's behalf. */
import { describe, expect, it } from 'vitest';
import { ColonyGame, DEFAULT_SEED } from './game.ts';
import { createFrameworkHumanSide, type FrameworkHumanSide } from './human.ts';
import type { ColonyRules } from './human-side.ts';
import { colonyHash, replayColony } from './playtest.ts';
import { at } from './world-types.ts';

function waiting(rules: ColonyRules): ColonyGame {
  const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, rules);
  g.humanWorld.resources.timber = 0;
  g.issue({ personId: 'idris', placeId: 'site' });
  return g;
}
function noTimber(g: ColonyGame, minutes: number): void {
  for (let i = 0; i < minutes; i++) {
    g.humanWorld.resources.timber = 0;
    g.advance(1);
  }
}

describe('conditional orders (colony-scenario@5)', () => {
  it('a stated host condition survives 120 minutes under @5; @4 still lapses', () => {
    const old = waiting(4);
    const now = waiting(5);
    noTimber(old, 125);
    noTimber(now, 125);
    expect(old.book.cards[0]?.status).toBe('lapsed');
    expect(now.book.cards[0]?.status).toBe('active');
    expect(now.book.cards[0]?.human.label).toBe('when there’s timber');
    expect(now.classicWorld).toEqual(old.classicWorld);
    expect(now.classic.units).toEqual(old.classic.units);
  });

  it('the returning host offer interrupts and reweighs at once; it does not force assent', () => {
    const g = waiting(5);
    noTimber(g, 125);
    g.humanWorld.resources.timber = 20;
    g.advance(1);
    expect(g.why('idris')?.minute).toBe(125);
    expect(g.book.cards[0]?.human.state).toBe('willNot');
    expect(g.book.cards[0]?.human.says).toContain('that is my work');
    expect(g.human.working('o1')).toBe(false);
    expect(g.human.view().find((v) => v.id === 'idris')?.action).toBe('gather-timber');
  });

  it('a promise lapses only when the person reaches sleep for the night, with a visible loss', () => {
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 5);
    g.humanWorld.resources.meals = 1000;
    g.issue({ personId: 'idris', placeId: 'kitchen' });
    g.advance(1000);
    expect(g.book.cards[0]?.status).toBe('active');
    for (let i = 0; i < 200 && g.book.cards[0]?.status === 'active'; i++) g.advance(1);
    expect(g.human.view().find((v) => v.id === 'idris')?.state).toBe('asleep');
    expect(g.book.cards[0]?.status).toBe('lapsed');
    expect(g.book.cards[0]?.human.label).toBe('Idris didn’t get to the kitchen today.');
    expect(g.book.cards[0]?.human.says).toBe(g.book.cards[0]?.human.label);
    expect(g.human.view().find((v) => v.id === 'idris')?.bubble?.text).toBe(g.book.cards[0]?.human.label);
  });

  it('cancel and replacement withdraw a waiting promise', () => {
    for (const end of ['cancel', 'replace'] as const) {
      const g = waiting(5);
      noTimber(g, 125);
      const card = g.book.cards[0];
      if (!card) throw new Error('missing order');
      if (end === 'cancel') g.cancel(card.order.id);
      else g.issue({ personId: 'idris', placeId: 'forest' });
      g.advance(1);
      expect(card.status).toBe(end === 'cancel' ? 'cancelled' : 'replaced');
      expect(g.human.working(card.order.id)).toBe(false);
    }
  });

  it('a saved conditional promise restores its lifetime and wake state', () => {
    const g = waiting(5);
    noTimber(g, 125);
    const saved = g.human.snapshot();
    g.human.cancel('o1');
    expect(g.human.working('o1')).toBe(false);
    g.human.restore(saved);
    expect(g.human.working('o1')).toBe(true);
    g.humanWorld.resources.timber = 20;
    g.advance(1);
    expect(g.book.cards[0]?.human.state).toBe('willNot');
  });

  it('an unavailable job that becomes impossible ends the promise as cannot', () => {
    const g = waiting(5);
    noTimber(g, 125);
    g.humanWorld.house.stage = 10;
    noTimber(g, 100);
    expect(g.book.cards[0]?.human.state).toBe('cannot');
    expect(g.human.working('o1')).toBe(false);
  });

  it('prayer and meal finishes wake HF; choosing own work then refuses the promise', () => {
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 5);
    g.advance(35);
    g.issue({ personId: 'idris', placeId: 'site' });
    const labels = new Set<string>();
    for (let i = 0; i < 100; i++) {
      g.advance(1);
      labels.add(g.book.cards[0]?.human.label ?? '');
    }
    expect(labels.has('after I finish this task (pray Fajr)')).toBe(true);
    expect(labels.has('after I finish this task (eat raw grain)')).toBe(true);
    expect(g.book.cards[0]?.human.state).toBe('willNot');
    expect(g.book.cards[0]?.human.says).toBe('I will gather timber instead, because that is my work.');
    expect(g.human.working('o1')).toBe(false);
    expect(g.human.view().find((v) => v.id === 'idris')?.action).not.toBe('build');
    const p = (g.human as FrameworkHumanSide).person('idris');
    expect(
      p.trace.some((r) => r.suggestion?.verdict === 'modified' && r.suggestion.reason === 'goal:role'),
    ).toBe(true);
  });

  it('@4 and @5 differ on an unchanged log containing a conditional deferral, and @5 replays exactly', () => {
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, 5);
    g.advance(35);
    g.issue({ personId: 'idris', placeId: 'site' });
    g.advance(at(1, 9) - g.minute);
    const old = replayColony(g.seed, createFrameworkHumanSide, g.log, g.minute, 4);
    expect(colonyHash(old)).not.toBe(colonyHash(g));
    expect(old.book.cards[0]?.status).toBe('lapsed');
    expect(g.book.cards[0]?.status).toBe('done');
    expect(colonyHash(replayColony(g.seed, createFrameworkHumanSide, g.log, g.minute, 5))).toBe(
      colonyHash(g),
    );
  });
});
