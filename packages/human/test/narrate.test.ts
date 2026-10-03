import { describe, expect, test } from 'vitest';
import {
  begin,
  createPerson,
  decide,
  describePerson,
  finish,
  hashString,
  intentionFor,
  narrateDecision,
  tick,
  villagerSpec,
  voiceLine,
} from '../src/index.ts';
import type { Affordance, Outcome, Person, SuggestionResolution } from '../src/types.ts';

const NOON = 12 * 60;

function villager(seed: number, opts: Parameters<typeof villagerSpec>[3] = {}): Person {
  return createPerson(villagerSpec('a', 'Amina', seed, { now: NOON, ...opts }));
}

const eat: Affordance = {
  id: 'eat',
  action: 'eat',
  label: 'eat',
  duration: 30,
  effort: 0.1,
  advertises: { food: 0.6 },
};
const forage: Affordance = {
  id: 'forage',
  action: 'forage',
  label: 'forage in the forest',
  placeId: 'forest',
  duration: 60,
  effort: 0.4,
  advertises: { food: 0.3 },
  risk: { chance: 0.5, severity: 0.5, kind: 'animal' },
};
const pray: Affordance = {
  id: 'pray',
  action: 'pray',
  label: 'pray',
  duration: 15,
  effort: 0.1,
  advertises: { meaning: 0.1 },
  norms: [{ normId: 'salah', relation: 'fulfills' }],
  tags: ['worship'],
};

describe('narration', () => {
  test('hashString is stable and spreads', () => {
    expect(hashString('d1')).toBe(hashString('d1'));
    expect(hashString('d1')).not.toBe(hashString('d2'));
  });

  test('the same record narrates identically and names the dominant motive', () => {
    const p = villager(1, { body: { satiety: 0.1 } });
    const r = decide(p, [eat, forage]);
    expect(narrateDecision(p, r)).toBe(r.narration);
    expect(narrateDecision(p, r)).toBe(narrateDecision(p, r));
    expect(r.narration).toMatch(/hungry|eat|food|empty/i);
    expect(intentionFor(p, r)).toBe('to feed myself');
  });

  test('a devout person prays for Allah', () => {
    const p = villager(2, { devout: true, body: { satiety: 0.9 } });
    const r = decide(p, [pray]);
    expect(r.chosenAction).toBe('pray');
    expect(r.intention).toBe('for Allah');
  });

  test('a remembered harm is cited when it shapes the choice', () => {
    const p = villager(3, { body: { satiety: 0.1 } });
    const r0 = decide(p, [forage]);
    begin(p, forage, r0);
    tick(p, p.now + 60);
    const outcome: Outcome = {
      affordanceId: 'forage',
      action: 'forage',
      status: 'failed',
      at: p.now,
      injury: { part: 'leg', severity: 0.5, healRatePerDay: 0.1 },
      summary: 'got hurt by an animal in the forest',
    };
    finish(p, outcome);
    const r = decide(p, [eat, forage], { now: p.now + 60 });
    expect(r.chosenAction).toBe('eat');
    expect(r.narration).toContain('Last time, got hurt by an animal in the forest.');
  });

  test('voice lines follow the verdict', () => {
    const p = villager(4);
    const base = { voiceId: 'player', says: '' };
    const line = (res: Omit<SuggestionResolution, 'voiceId' | 'says'>) => voiceLine(p, { ...base, ...res });
    expect(line({ verdict: 'refused', kind: 'willNot', reason: 'norm:theft' })).toMatch(/steal/);
    expect(line({ verdict: 'refused', kind: 'willNot', reason: 'distrust' })).toMatch(/listen|pushed/);
    expect(line({ verdict: 'refused', kind: 'cannot', reason: 'capacity' })).toMatch(/spent|strength/);
    expect(
      line({
        verdict: 'deferred',
        kind: 'notNow',
        reason: 'need:food',
        counterOffer: { label: 'after I eat' },
      }),
    ).toContain('After I eat');
    expect(line({ verdict: 'complied', kind: 'notNow', reason: 'need:food' })).toMatch(/insist/);
  });

  test('describePerson summarises state', () => {
    const p = villager(5, { body: { satiety: 0.1 } });
    expect(describePerson(p)).toBe('Amina: idle; hungry.');
    p.body.alive = false;
    expect(describePerson(p)).toBe('Amina has died.');
  });
});
