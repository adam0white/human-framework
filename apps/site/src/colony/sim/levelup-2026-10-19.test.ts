/**
 * The 2026-10-19 level-up (colony-scenario@4), each change pinned on its own and against the @3 rules it leaves
 * unchanged: refusal lines that say why, the "you'll be safer" promise, replaced cards, injuries said as they
 * happen, and the why panel's "already at it" line.
 */
import { type SuggestionResolution, voiceOf } from '@adam0white/human-framework';
import { describe, expect, it } from 'vitest';
import { hindsightLine } from '../ui/end-report.ts';
import { ColonyGame, DEFAULT_SEED, NUDGES } from './game.ts';
import { createFrameworkHumanSide, type FrameworkHumanSide } from './human.ts';
import type { ColonyRules } from './human-side.ts';
import { sayLine } from './human-view.ts';
import { passesByItself } from './playback.ts';
import { at } from './world-types.ts';

const modified = {
  voiceId: 'player',
  verdict: 'modified',
  reason: 'goal:role',
  says: "Not that — I'll draw water.",
  counterOffer: { affordanceId: 'a1', label: 'draw water' },
} as unknown as SuggestionResolution;

/** The cedar card used at its minute with "you'll be safer": on the shipped seed the cedar comes down on Idris. */
function cedarRun(rules: ColonyRules): ColonyGame {
  const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, rules);
  const card = NUDGES.find((n) => n.id === 'cedar');
  if (!card) throw new Error('no cedar card');
  g.advance(card.minute);
  g.issue({ ...card.order, appeal: 'safety' }, card.id);
  g.advance(at(1, 12, 0) - g.minute);
  return g;
}

describe('2026-10-19 level-up (colony-scenario@4)', () => {
  it('a "something else instead" answer names its reason under @4 and keeps the @3 line under @3', () => {
    expect(sayLine(modified, 4)).toBe("Not that — I'll draw water; that is my work.");
    expect(sayLine(modified, 3)).toBe("Not that — I'll draw water.");
    expect(sayLine({ ...modified, reason: 'habit' } as SuggestionResolution, 4)).toBe(modified.says);
  });

  it('"you\'ll be safer" is a promise: hurt on the job, trust falls and the person says so at once', () => {
    const g = cedarRun(4);
    const idris = (g.human as FrameworkHumanSide).person('idris');
    const reasons = (voiceOf(idris, 'player')?.history ?? []).map((h) => h.reason);
    expect(reasons).toContain('promise-broken');
    expect(g.humanWorld.injuries).toBeGreaterThan(0);
    // Under @3 the same run grades nothing.
    const old = cedarRun(3);
    const before = (old.human as FrameworkHumanSide).person('idris');
    const oldReasons = (voiceOf(before, 'player')?.history ?? []).map((h) => h.reason);
    expect(oldReasons).not.toContain('promise-broken');
  }, 30_000);

  it('a new order to the same person settles the old card as replaced (@4 only)', () => {
    for (const rules of [3, 4] as const) {
      const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide, rules);
      g.issue({ personId: 'yusuf', placeId: 'site' });
      g.issue({ personId: 'yusuf', placeId: 'forest' });
      g.issue({ personId: 'tariq', placeId: 'forest' });
      g.advance(2);
      const [a, b, c] = g.book.cards;
      expect(b?.status).toBe('active');
      expect(c?.status).toBe('active');
      if (rules === 4) {
        expect(a?.status).toBe('replaced');
        expect(a?.replacedBy).toBe(b?.order.id);
      } else expect(a?.status).toBe('active');
    }
  });

  it('injuries are said as they happen on both sides (the news line), and are not hashed', () => {
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    const seen: string[] = [];
    // The storm night: everyone is out under an unfinished roof on the shipped seed with no orders.
    g.advance(at(2, 19, 0));
    for (let i = 0; i < 8 * 60; i++) {
      g.advance(1);
      for (const n of g.frame().news) seen.push(`${n.side}:${n.personId}:${n.minute}:${n.how}`);
    }
    const unique = new Set(seen);
    expect(
      [...unique].some((s) => s.startsWith('classic:') && s.endsWith('in the storm, out in the open')),
    ).toBe(true);
    expect(g.frame().news.length).toBeLessThanOrEqual(4);
  }, 30_000);

  it('a bodily or prayer "not now" passes by itself; a "not now" for other work and a "will not" still pause', () => {
    expect(passesByItself({ kind: 'notNow', reason: 'need:water' })).toBe(true);
    expect(passesByItself({ kind: 'notNow', reason: 'commitment:salah-fajr' })).toBe(true);
    expect(passesByItself({ kind: 'notNow', reason: 'norm:salah' })).toBe(true);
    expect(passesByItself({ kind: 'notNow', reason: 'goal:role' })).toBe(false);
    expect(passesByItself({ kind: 'willNot', reason: 'need:safety' })).toBe(false);
  });

  it('the hindsight line says the plan re-orders, as the policy does (a single dawn order does not reproduce it)', () => {
    const line = hindsightLine({
      from: 0,
      builders: ['yusuf', 'tariq'],
      cook: true,
      roofAt: at(2, 12, 3),
      stock: 13,
      wins: true,
    });
    expect(line).toMatch(/re-ordering Yusuf and Tariq to the house with Rush each time an order ended/);
    expect(line).toMatch(/One order at dawn is not enough/);
  });

  it('the why panel says "already at it" when the running job was kept over a higher-scored rival', () => {
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    let found = 0;
    for (let m = 0; m < 600 && found === 0; m++) {
      g.advance(1);
      for (const v of g.human.view()) {
        const p = (g.human as FrameworkHumanSide).person(v.id);
        for (const r of p.trace) {
          const chosen = r.considered.find((c) => c.affordanceId === r.chosenAffordanceId);
          if (!r.review || !chosen) continue;
          if (!r.considered.some((c) => !c.vetoed && c.utility > chosen.utility)) continue;
          const why = g.why(v.id, r.id);
          expect(why?.narration).toMatch(/already at it/);
          found += 1;
        }
      }
    }
    expect(found).toBeGreaterThan(0);
  }, 30_000);
});
