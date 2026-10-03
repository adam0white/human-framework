import { describe, expect, test } from 'vitest';
import {
  createConscience,
  DEFAULT_NORMS,
  guiltLoad,
  heldNorms,
  normTerms,
  normVeto,
  recordDeed,
  recordRepair,
  repent,
} from '../src/conscience/index.ts';
import { createRng } from '../src/core/index.ts';
import type { Affordance, HeldNorm, Person } from '../src/types.ts';

function person(norms: HeldNorm[], over: Partial<Person> = {}): Person {
  const half = 0.5;
  return {
    schema: 'human/person@1',
    engine: '1.0.0',
    id: 'p1',
    name: 'Test',
    now: 0,
    rng: createRng(1),
    life: { bornAt: -30 * 525_600, sex: 'female' },
    body: {} as Person['body'],
    needs: {} as Person['needs'],
    traits: {
      honesty: half,
      emotionality: half,
      extraversion: half,
      agreeableness: half,
      conscientiousness: half,
      openness: half,
    },
    values: {
      benevolence: half,
      universalism: half,
      tradition: half,
      conformity: half,
      security: half,
      achievement: half,
      power: half,
      hedonism: half,
      stimulation: half,
      selfDirection: half,
    },
    conscience: createConscience(norms),
    affect: {} as Person['affect'],
    skills: {},
    habits: [],
    memory: {} as Person['memory'],
    social: { relationships: [] },
    agenda: { commitments: [], goals: [], nextId: 1 },
    will: {} as Person['will'],
    activity: null,
    trace: [],
    nextDecision: 1,
    ...over,
  };
}

const stealBread: Affordance = {
  id: 'steal-bread',
  action: 'steal',
  label: 'Take bread from the stall',
  targetId: 'baker',
  duration: 5,
  effort: 0.1,
  advertises: { food: 0.5 },
  norms: [{ normId: 'theft', relation: 'violates' }],
};

const stealCoins: Affordance = { ...stealBread, id: 'steal-coins', advertises: {}, material: 10 };

const pray: Affordance = {
  id: 'pray',
  action: 'pray',
  label: 'Pray',
  duration: 10,
  effort: 0.05,
  advertises: { meaning: 0.2 },
  tags: ['worship'],
  norms: [{ normId: 'salah', relation: 'fulfills' }],
};

describe('catalog', () => {
  test('every default norm carries at least one source', () => {
    for (const n of DEFAULT_NORMS) expect(n.sources?.length ?? 0).toBeGreaterThan(0);
  });
  test('heldNorms: religious norms scale with practice, core ethics held by all', () => {
    const secular = heldNorms({ practice: 0 });
    const devout = heldNorms({ practice: 1 });
    expect(secular.find((n) => n.normId === 'salah')).toBeUndefined();
    expect(devout.find((n) => n.normId === 'salah')?.conviction).toBeGreaterThan(0.9);
    const theftS = secular.find((n) => n.normId === 'theft')?.conviction ?? 0;
    expect(theftS).toBeGreaterThanOrEqual(0.6);
    expect(devout.find((n) => n.normId === 'theft')?.conviction).toBeGreaterThan(theftS);
    const extra = heldNorms({
      practice: 0,
      extraNorms: [{ normId: 'theft', standing: 'forbidden', conviction: 0.1 }],
    });
    expect(extra.find((n) => n.normId === 'theft')?.conviction).toBe(0.1);
  });
});

describe('normVeto and necessity', () => {
  const p = person(heldNorms({ practice: 0.5 }));
  test('firmly held theft vetoes below the necessity threshold', () => {
    expect(normVeto(p, stealBread, 0)).toEqual({ kind: 'willNot', reason: 'norm:theft' });
    expect(normVeto(p, stealBread, 0.74)).toBeDefined();
  });
  test('necessity lifts the veto at desperation >= 0.75 only for survival needs', () => {
    expect(normVeto(p, stealBread, 0.75)).toBeUndefined();
    expect(normVeto(p, stealCoins, 0.95)).toBeDefined();
    expect(normVeto(p, stealBread, 0.95, { necessity: false })).toBeDefined();
  });
  test('necessity never lifts harm-others', () => {
    const hurt: Affordance = { ...stealBread, norms: [{ normId: 'harm-others', relation: 'violates' }] };
    expect(normVeto(p, hurt, 1)).toEqual({ kind: 'willNot', reason: 'norm:harm-others' });
  });
  test('weak conviction or low honesty-humility does not veto', () => {
    const weak = person([{ normId: 'theft', standing: 'forbidden', conviction: 0.4 }]);
    expect(normVeto(weak, stealCoins, 0)).toBeUndefined();
    const low = person([{ normId: 'theft', standing: 'forbidden', conviction: 0.7 }]);
    low.traits.honesty = 0.1;
    expect(normVeto(low, stealCoins, 0)).toBeUndefined();
  });
  test('headless control: discriminates from always-veto and never-veto baselines', () => {
    const levels = [0, 0.5, 0.74, 0.75, 1];
    const ours = levels.map((d) => normVeto(p, stealBread, d) !== undefined);
    expect(ours).toEqual([true, true, true, false, false]);
    expect(ours).not.toEqual(levels.map(() => true));
    expect(ours).not.toEqual(levels.map(() => false));
  });
  test('the negative term survives necessity, so a lawful option still wins', () => {
    const t = normTerms(p, stealBread, { desperation: 1 });
    expect(t.find((x) => x.source === 'norm:theft')?.value).toBeLessThan(0);
  });
});

describe('normTerms', () => {
  test('obligatory fulfilment pulls more than recommended; violation pushes away', () => {
    const p = person(heldNorms({ practice: 1 }));
    const salah = normTerms(p, pray, { desperation: 0 })[0]?.value ?? 0;
    const charity = normTerms(
      p,
      { ...pray, norms: [{ normId: 'charity', relation: 'fulfills' }] },
      { desperation: 0 },
    )[0]?.value;
    expect(salah).toBeGreaterThan(charity ?? 0);
    expect(charity).toBeGreaterThan(0);
    expect(normTerms(p, stealCoins, { desperation: 0 })[0]?.value).toBeLessThan(0);
  });
  test('unheld norms contribute nothing', () => {
    const p = person([]);
    expect(normTerms(p, pray, { desperation: 0 })).toEqual([]);
  });
  test('tradition and honesty-humility act as coefficients', () => {
    const lo = person(heldNorms({ practice: 1 }));
    const hi = person(heldNorms({ practice: 1 }));
    hi.values.tradition = 1;
    hi.traits.honesty = 1;
    const v = (q: Person, a: Affordance) => normTerms(q, a, { desperation: 0 })[0]?.value ?? 0;
    expect(v(hi, pray)).toBeGreaterThan(v(lo, pray));
    expect(v(hi, stealCoins)).toBeLessThan(v(lo, stealCoins));
  });
  test("observers' irrelevance: who is present does not change norm terms", () => {
    const p = person(heldNorms({ practice: 0.7 }));
    const alone = normTerms(p, stealCoins, { desperation: 0 });
    const watched = normTerms(p, { ...stealCoins, with: ['imam', 'neighbor', 'police'] }, { desperation: 0 });
    expect(watched).toEqual(alone);
    expect(normVeto(p, { ...stealCoins, with: ['x'] }, 0)).toEqual(normVeto(p, stealCoins, 0));
  });
  test('open breaches with a victim pull toward repair; only breaches without one pull toward worship', () => {
    const p = person(heldNorms({ practice: 0.5 }));
    const apologize: Affordance = {
      id: 'apol',
      action: 'apologize',
      label: 'Apologise',
      targetId: 'baker',
      duration: 5,
      effort: 0,
      advertises: {},
      tags: ['apologize'],
    };
    expect(normTerms(p, apologize, { desperation: 0 })).toEqual([]);
    recordDeed(p, stealCoins, 'to buy sweets', 100, true);
    const repair = normTerms(p, apologize, { desperation: 0 }).find((t) => t.source === 'conscience:repair');
    expect(repair?.value).toBeGreaterThan(0);
    const other = normTerms(p, { ...apologize, targetId: 'stranger' }, { desperation: 0 });
    expect(other.find((t) => t.source === 'conscience:repair')).toBeUndefined();
    // Worship cannot clear a wrong against the baker, so it does not pull on that account (review 2026-10-03).
    const worship = normTerms(p, { ...pray, norms: [] }, { desperation: 0 });
    expect(worship.find((t) => t.source === 'conscience:repent')).toBeUndefined();
    const skip: Affordance = { ...pray, id: 'skip', norms: [{ normId: 'salah', relation: 'violates' }] };
    recordDeed(p, skip, 'too busy', 200, true);
    const after = normTerms(p, { ...pray, norms: [] }, { desperation: 0 });
    expect(after.find((t) => t.source === 'conscience:repent')?.value).toBeGreaterThan(0);
  });
});

describe('deeds, breaches, repentance and repair', () => {
  test('recordDeed logs private intention, breaches with victim, and appraisal signs', () => {
    const p = person(heldNorms({ practice: 1 }));
    const r = recordDeed(p, stealCoins, 'for myself', 10, true);
    expect(r.breached).toEqual(['theft']);
    expect(p.conscience.breaches[0]?.victimId).toBe('baker');
    expect(r.appraisal[0]?.praiseworthiness).toBeLessThan(0);
    expect(r.appraisal[0]?.agentId).toBe('p1');
    expect(p.conscience.intentions.at(-1)).toEqual({ at: 10, action: 'steal', intention: 'for myself' });
    const f = recordDeed(p, pray, 'for Allah', 20, true);
    expect(f.fulfilled).toEqual(['salah']);
    expect(f.appraisal[0]?.kind).toBe('deed');
    expect(f.appraisal[0]?.praiseworthiness).toBeGreaterThan(0);
  });
  test('incomplete fulfilment does not count; incomplete breach weighs less', () => {
    const p = person(heldNorms({ practice: 1 }));
    expect(recordDeed(p, pray, 'x', 1, false).fulfilled).toEqual([]);
    recordDeed(p, stealCoins, 'x', 2, false);
    recordDeed(p, stealCoins, 'x', 3, true);
    const [a, b] = p.conscience.breaches;
    expect(a?.weight).toBeLessThan(b?.weight ?? 0);
    expect(a?.id).not.toBe(b?.id);
  });
  test('repent closes a victimless breach; a wronged person requires repair first', () => {
    const p = person(heldNorms({ practice: 1 }));
    const drink: Affordance = {
      ...pray,
      id: 'drink',
      action: 'drink',
      norms: [{ normId: 'intoxicants', relation: 'violates' }],
    };
    recordDeed(p, drink, 'x', 1, true);
    recordDeed(p, stealCoins, 'x', 2, true);
    const [own, wronged] = p.conscience.breaches;
    const before = guiltLoad(p);
    expect(repent(p, own?.id ?? '', 3)).toBe(true);
    expect(guiltLoad(p)).toBeLessThan(before);
    expect(repent(p, wronged?.id ?? '', 3)).toBe(false);
    expect(wronged?.repaired).toBe(false);
    expect(recordRepair(p, 'baker', 4)).toBe(1);
    expect(repent(p, wronged?.id ?? '', 5)).toBe(true);
    expect(guiltLoad(p)).toBe(0);
    expect(repent(p, 'missing', 5)).toBe(false);
  });
  test('guilt saturates and collections stay bounded', () => {
    const p = person(heldNorms({ practice: 1 }));
    for (let i = 0; i < 80; i++) recordDeed(p, stealCoins, `i${i}`, i, true);
    expect(p.conscience.breaches.length).toBe(50);
    expect(p.conscience.intentions.length).toBe(50);
    const g = guiltLoad(p);
    expect(g).toBeLessThanOrEqual(1);
    expect(g).toBeGreaterThan(0.99);
  });
  test('deterministic', () => {
    const run = () => {
      const p = person(heldNorms({ practice: 0.6 }));
      recordDeed(p, stealCoins, 'a', 5, true);
      recordDeed(p, stealCoins, 'b', 5, true);
      recordDeed(p, pray, 'c', 6, true);
      return JSON.stringify(p.conscience);
    };
    expect(run()).toBe(run());
  });
});
