import { describe, expect, test } from 'vitest';
import type { ConsiderContext } from '../src/index.ts';
import {
  actionTendencies,
  COGNITION_DEFAULTS,
  clamp,
  clamp01,
  consider,
  createPerson,
  decide,
  desperationOf,
  lifeModifiers,
  readPerson,
  scoreAndResolve,
  villagerSpec,
} from '../src/index.ts';
import type { Affordance, Person } from '../src/types.ts';

const NOON = 12 * 60;

function villager(seed: number, opts: Parameters<typeof villagerSpec>[3] = {}): Person {
  return createPerson(villagerSpec('a', 'A', seed, { now: NOON, ...opts }));
}

function contextOf(p: Person): ConsiderContext {
  const { body, needs, desperation } = readPerson(p);
  return {
    now: p.now,
    body,
    needs,
    mods: lifeModifiers(p),
    tendencies: actionTendencies(p),
    desperation,
    habit: { now: p.now },
  };
}

const eat: Affordance = {
  id: 'eat',
  action: 'eat',
  label: 'eat',
  placeId: 'kitchen',
  duration: 30,
  effort: 0.1,
  advertises: { food: 0.6 },
};
const forage: Affordance = {
  id: 'forage',
  action: 'forage',
  label: 'forage',
  placeId: 'forest',
  duration: 90,
  effort: 0.5,
  advertises: { food: 0.3 },
  tags: ['risky'],
  risk: { chance: 0.5, severity: 0.5, kind: 'animal' },
};
const wait: Affordance = {
  id: 'wait',
  action: 'wait',
  label: 'wait',
  duration: 15,
  effort: 0,
  advertises: {},
};

describe('consider', () => {
  test('hunger produces a positive need term scaled by urgency', () => {
    const hungry = villager(1, { body: { satiety: 0.1 } });
    const fed = villager(1, { body: { satiety: 0.95 } });
    const h = consider(hungry, eat, contextOf(hungry));
    const f = consider(fed, eat, contextOf(fed));
    const need = (c: typeof h) => c.terms.find((t) => t.source === 'need:food')?.value ?? 0;
    expect(need(h)).toBeGreaterThan(0.5);
    expect(need(h)).toBeGreaterThan(need(f) * 3);
    expect(h.advertised?.food).toBe(0.6);
    expect(h.believed?.food).toBeGreaterThan(0);
  });

  test('risk and effort cost, and both are reported as negative terms', () => {
    const p = villager(2, { body: { satiety: 0.1 } });
    const c = consider(p, forage, contextOf(p));
    const term = (s: string) => c.terms.find((t) => t.source === s)?.value ?? 0;
    expect(term('risk')).toBeLessThan(0);
    expect(term('effort')).toBeLessThan(0);
    expect(term('risk')).toBeCloseTo(-COGNITION_DEFAULTS.riskScale * 0.5 * 0.5 * p.traits.emotionality, 5);
  });

  test('a precommitment inside its daily window adds its bias', () => {
    const p = villager(3);
    p.will.precommitments.push({
      id: 'no-forest',
      action: 'forage',
      bias: -0.8,
      fromMinuteOfDay: 0,
      toMinuteOfDay: 24 * 60,
    });
    const c = consider(p, forage, contextOf(p));
    expect(c.terms.find((t) => t.source === 'precommit:no-forest')?.value).toBeCloseTo(-0.8, 5);
  });

  test('a suggestion adds a term proportional to voice trust', () => {
    const p = villager(4, { voices: [{ voiceId: 'player', trust: 0.8 }] });
    const ctx = { ...contextOf(p), suggestion: { voiceId: 'player', action: 'wait', strength: 0.5 } };
    const c = consider(p, wait, ctx);
    expect(c.terms.find((t) => t.source === 'suggestion:player')?.value).toBeCloseTo(
      0.4 * COGNITION_DEFAULTS.suggestionScale,
      5,
    );
    const none = consider(p, eat, ctx);
    expect(none.terms.some((t) => t.source === 'suggestion:player')).toBe(false);
  });

  test('a norm-fulfilling option carries a norm term for a devout person and not for a secular one', () => {
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
    const devout = villager(5, { devout: true });
    const secular = villager(5, { devout: false });
    const d =
      consider(devout, pray, contextOf(devout)).terms.find((t) => t.source === 'norm:salah')?.value ?? 0;
    const s =
      consider(secular, pray, contextOf(secular)).terms.find((t) => t.source === 'norm:salah')?.value ?? 0;
    expect(d).toBeGreaterThan(0.2);
    expect(s).toBeLessThan(d / 4);
  });
});

describe('decide', () => {
  test('ranks live options first, bounds the record and returns an autonomy delta', () => {
    const p = villager(6, { body: { satiety: 0.1 } });
    const many: Affordance[] = Array.from({ length: 12 }, (_, i) => ({
      ...wait,
      id: `w${i}`,
      action: `w${i}`,
    }));
    const { record, needDeltas } = scoreAndResolve(p, [forage, ...many, eat], { ...contextOf(p), id: 'd1' });
    expect(record.chosenAffordanceId).toBe('eat');
    expect(record.considered.length).toBeLessThanOrEqual(COGNITION_DEFAULTS.maxConsidered);
    expect(record.considered[0]?.affordanceId).toBe('eat');
    expect(needDeltas.autonomy ?? 0).toBe(0);
  });

  test('is independent of the order the host lists options in', () => {
    const a = villager(7, { body: { satiety: 0.3 } });
    const b = villager(7, { body: { satiety: 0.3 } });
    const r1 = decide(a, [forage, wait, eat]);
    const r2 = decide(b, [eat, wait, forage]);
    expect(r1.chosenAffordanceId).toBe(r2.chosenAffordanceId);
    expect(r1.considered.map((c) => c.affordanceId)).toEqual(r2.considered.map((c) => c.affordanceId));
  });

  test('desperation is the highest physiological urgency', () => {
    const p = villager(8, { body: { hydration: 0.05 } });
    const { needs, desperation } = readPerson(p);
    expect(desperation).toBe(desperationOf(needs));
    expect(desperation).toBeGreaterThan(0.7);
    expect(desperation).toBe(needs.find((n) => n.id === 'water')?.urgency);
  });
});

describe('review fixes (2026-10-03)', () => {
  const learned = (p: Person, key: string, valence: number) =>
    p.memory.expectations.push({ key, needs: { food: 0.6 }, successRate: 1, samples: 20, valence });
  const term = (c: ReturnType<typeof consider>, s: string) => c.terms.find((t) => t.source === s)?.value ?? 0;

  test('a pleasant expectation pulls only as much as the need it serves is urgent; harm always bites', () => {
    const hungry = villager(11, { body: { satiety: 0.1 } });
    const fed = villager(11, { body: { satiety: 1 } });
    learned(hungry, 'eat', 0.8);
    learned(fed, 'eat', 0.8);
    const h = term(consider(hungry, eat, contextOf(hungry)), 'expectation');
    const f = term(consider(fed, eat, contextOf(fed)), 'expectation');
    expect(h).toBeGreaterThan(0.1);
    expect(f).toBeLessThan(h / 5);
    const scared = villager(11, { body: { satiety: 1 } });
    learned(scared, 'forage', -0.8);
    expect(term(consider(scared, forage, contextOf(scared)), 'expectation')).toBeLessThan(-0.3);
  });

  test('the general pull toward company satiates with belonging', () => {
    const chat: Affordance = { ...wait, id: 'chat', action: 'chat', tags: ['social'] };
    const lonely = villager(12, { needs: { belonging: 0.1 } });
    const full = villager(12, { needs: { belonging: 1 } });
    const ctxL = { ...contextOf(lonely), tendencies: { social: 0.5 } };
    const ctxF = { ...contextOf(full), tendencies: { social: 0.5 } };
    expect(term(consider(full, chat, ctxF), 'emotion:social')).toBeLessThan(
      term(consider(lonely, chat, ctxL), 'emotion:social') / 3,
    );
  });

  test('a norm pull no commitment tracks satiates right after the same act and recovers over hours', () => {
    const help: Affordance = {
      ...wait,
      id: 'help',
      action: 'help',
      norms: [{ normId: 'help-neighbor', relation: 'fulfills' }],
    };
    const p = villager(13, { devout: true });
    const fresh = term(consider(p, help, contextOf(p)), 'norm:help-neighbor');
    expect(fresh).toBeGreaterThan(0);
    // A missed duty logged under the same action satisfies nothing.
    p.conscience.intentions.push({ at: p.now - 5, action: 'help', intention: 'missed' });
    expect(term(consider(p, help, contextOf(p)), 'norm:help-neighbor')).toBeCloseTo(fresh, 5);
    p.conscience.intentions.pop();
    p.conscience.intentions.push({ at: p.now - 10, action: 'help', intention: 'for Allah' });
    const just = term(consider(p, help, contextOf(p)), 'norm:help-neighbor');
    expect(just).toBeLessThan(fresh * 0.4);
    const later = { ...contextOf(p), now: p.now + COGNITION_DEFAULTS.normRefractoryMinutes };
    expect(term(consider(p, help, later), 'norm:help-neighbor')).toBeCloseTo(fresh, 3);
  });

  test('clamp maps NaN to the lower bound', () => {
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp(Number.NaN, -1, 1)).toBe(-1);
  });
});
