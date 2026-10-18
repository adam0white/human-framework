import { describe, expect, test } from 'vitest';
import type { Affordance, Percept, Person, ReceivedConsequence } from '../src/index.ts';
import * as hf from '../src/index.ts';

function must<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Required control state is absent');
  return value;
}

const now = 600;
function person(temporal = true): Person {
  const p = hf.createPerson({
    id: 'person',
    name: 'Person',
    seed: 19,
    now,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    goals: [
      {
        id: 'deliver',
        label: 'Deliver',
        serves: ['achievement'],
        advancedBy: [{ action: 'deliver', amount: 1 }],
        importance: 0.8,
        deadline: 720,
        ...(temporal ? { temporal: { halfLifeMinutes: 30 } } : {}),
      },
    ],
  });
  p.memory.sourceTrust.keeper = 1;
  return p;
}
const ask: Affordance = {
  id: 'ask',
  action: 'ask-access',
  label: 'Ask',
  targetId: 'keeper',
  duration: 10,
  effort: 0.1,
  advertises: {},
};
const direct: Affordance = {
  id: 'direct',
  action: 'deliver',
  label: 'Direct',
  duration: 180,
  effort: 0.1,
  advertises: {},
};
const premise = (changes: Partial<ReceivedConsequence> = {}): ReceivedConsequence => ({
  id: 'window',
  revision: 0,
  trigger: { action: 'ask-access', targetId: 'keeper' },
  successor: { action: 'deliver', duration: 20, effort: 0.1 },
  availableFrom: 620,
  availableUntil: 680,
  expiresAt: 800,
  chance: 1,
  confidence: 1,
  ...changes,
});
function receive(p: Person, c = premise(), extra: Partial<Percept> = {}): void {
  hf.perceive(p, [
    {
      at: p.now,
      channel: 'told',
      kind: 'premise',
      actorId: 'keeper',
      targetId: p.id,
      salience: 1,
      summary: 'A possible route',
      consequences: [c],
      ...extra,
    },
  ]);
}
const score = (p: Person, a = ask) =>
  must(hf.decide(p, [a, direct]).considered.find((x) => x.affordanceId === a.id));
const prospective = (p: Person, a = ask) =>
  score(p, a).terms.filter((t) => t.source.startsWith('prospection:') || t.source.startsWith('goal:'));

describe('attended received consequences', () => {
  test('useful knowledge changes ordinary choice; late and removed knowledge do not', () => {
    const p = person();
    receive(p);
    expect(p.prospection?.entries).toHaveLength(1);
    expect(hf.decide(p, [ask, direct]).chosenAffordanceId).toBe('ask');
    const late = person();
    receive(late, premise({ availableFrom: 675 }));
    expect(prospective(late)).toEqual([]);
    expect(hf.decide(late, [ask, direct]).chosenAffordanceId).toBe('direct');
    delete p.prospection;
    expect(hf.decide(p, [ask, direct]).chosenAffordanceId).toBe('direct');
  });
  test('legacy goals and goal ablation cannot gain prospective credit', () => {
    const p = person(false);
    const before = score(p);
    receive(p);
    expect(score(p)).toEqual(before);
    const q = person();
    receive(q);
    q.agenda.goals = [];
    expect(prospective(q)).toEqual([]);
  });
  test('only attended testimony acquires; action target and place match exactly', () => {
    const p = person();
    receive(p, premise(), { channel: 'saw' });
    expect(p.prospection).toBeUndefined();
    const crowd: Percept[] = Array.from({ length: 20 }, (_, i) => ({
      at: now,
      channel: 'told',
      kind: 'distraction',
      salience: 0.8,
      summary: `${i}`,
    }));
    hf.perceive(p, [
      ...crowd,
      {
        at: now,
        channel: 'told',
        actorId: 'keeper',
        kind: 'premise',
        salience: 0,
        summary: '',
        consequences: [premise()],
      },
    ]);
    expect(p.prospection).toBeUndefined();
    receive(p);
    expect(prospective(p, { ...ask, targetId: 'other' })).toEqual([]);
    expect(prospective(p, { ...ask, placeId: 'other' })).toEqual([]);
    expect(prospective(p, { ...ask, duration: 100 })).toEqual([]);
  });
  test('revisions replace without reinforcement; withdrawal before add is remembered', () => {
    const p = person();
    receive(p);
    const state = structuredClone(p.prospection);
    receive(p);
    expect(p.prospection).toEqual(state);
    receive(p, premise({ revision: 1, chance: 0.1 }));
    expect(p.prospection?.entries[0]?.chance).toBe(0.1);
    hf.perceive(p, [
      {
        at: now,
        channel: 'told',
        actorId: 'keeper',
        kind: 'withdraw',
        salience: 1,
        summary: '',
        withdrawConsequences: [
          { id: 'future', revision: 4 },
          { id: 'window', revision: 2 },
        ],
      },
    ]);
    expect(p.prospection?.entries).toEqual([]);
    receive(p, premise({ id: 'future', revision: 3 }));
    expect(p.prospection?.entries).toEqual([]);
    receive(p, premise({ revision: 3 }));
    expect(p.prospection?.entries).toHaveLength(1);
  });
  test('combined malformed or conflicting batch changes no prospection state', () => {
    const p = person();
    receive(p);
    const before = structuredClone(p.prospection);
    receive(p, premise({ revision: 1 }), { withdrawConsequences: [{ id: 'window', revision: 2 }] });
    expect(p.prospection).toEqual(before);
    receive(p, premise({ id: '__proto__' }));
    expect(p.prospection).toEqual(before);
    receive(p, premise({ revision: 1, confidence: Number.NaN }));
    expect(p.prospection).toEqual(before);
  });
  test('query is pure and snapshot restore preserves provenance and old methods', () => {
    const p = person();
    receive(p);
    hf.receiveMethodCues(p, { contextId: 'x', cues: [{ cue: 'color', value: 'red' }] });
    const before = hf.snapshot(p);
    hf.consequenceEvidence(p, ask);
    expect(hf.snapshot(p)).toEqual(before);
    expect(hf.snapshot(hf.restore(before))).toEqual(before);
    const old = { ...before, engine: '2.2.0' };
    expect(hf.restore(old).methods).toEqual(before.methods);
    const legacy = person(false);
    delete legacy.prospection;
    expect(hf.restore({ ...legacy, engine: '2.2.0' }).prospection).toBeUndefined();
  });
  test('own completed request consumes without terminal progress or inferred consent', () => {
    const p = person();
    receive(p);
    hf.begin(p, ask, hf.decide(p, [ask]));
    hf.finish(p, {
      at: now + 10,
      action: ask.action,
      affordanceId: ask.id,
      targetId: ask.targetId,
      status: 'completed',
    });
    expect(p.prospection?.entries[0]?.triggeredAt).toBe(now + 10);
    expect(p.agenda.goals[0]?.progress).toBe(0);
    expect(prospective(p)).toEqual([]);
    hf.begin(p, direct, hf.decide(p, [direct]));
    hf.finish(p, { at: p.now + 180, action: direct.action, affordanceId: direct.id, status: 'completed' });
    expect(p.agenda.goals[0]?.progress).toBe(1);
  });
  test.each(['failed', 'interrupted'] as const)('%s request does not consume or advance', (status) => {
    const p = person();
    receive(p);
    hf.begin(p, ask, hf.decide(p, [ask]));
    hf.finish(p, { at: now + 1, action: ask.action, affordanceId: ask.id, status });
    expect(p.prospection?.entries[0]?.triggeredAt).toBeUndefined();
    expect(p.agenda.goals[0]?.progress).toBe(0);
  });
  test('expiry prunes optional state only when all revision memory expires', () => {
    const p = person();
    receive(p);
    hf.tick(p, 801);
    expect(prospective(p)).toEqual([]);
    expect(p.prospection?.entries).toEqual([]);
    expect(p.prospection?.revisions).toHaveLength(1);
    hf.tick(p, now + 7 * 1440 + 1);
    expect(p.prospection).toBeUndefined();
  });
  test('costly and low confidence routes lose and duplicate routes never sum', () => {
    const p = person();
    receive(p, premise({ successor: { action: 'deliver', duration: 20, effort: 1, materialCost: 1e6 } }));
    expect(prospective(p)).toEqual([]);
    const q = person();
    receive(q, premise({ confidence: 0.001 }));
    expect(hf.decide(q, [ask, direct]).chosenAffordanceId).toBe('direct');
    const r = person();
    receive(r);
    const one = score(r).utility;
    receive(r, premise({ id: 'same-route' }));
    expect(score(r).utility).toBe(one);
  });
});

describe('route accounting and state bounds', () => {
  test('latest completion boundary is inclusive; legacy deadline remains urgency', () => {
    const p = person();
    receive(
      p,
      premise({
        availableFrom: 750,
        availableUntil: 770,
        successor: { action: 'deliver', duration: 20, effort: 0 },
      }),
    );
    expect(hf.consequenceEvidence(p, ask).entries[0]?.feasible).toBe(true);
    expect(prospective(p).some((t) => t.source === 'goal:deliver')).toBe(true);
    const q = person();
    receive(q, premise({ availableFrom: 750, availableUntil: 769 }));
    expect(hf.consequenceEvidence(q, ask).entries[0]?.feasible).toBe(false);
    expect(prospective(q)).toEqual([]);
  });
  test('current success and live trust attenuate a retained route without mutation', () => {
    const p = person();
    receive(p);
    const initial = must(hf.consequenceEvidence(p, ask).entries[0]);
    expect(initial.accessProbability).toBeCloseTo(0.9);
    expect(initial.terminalProbability).toBeCloseTo(0.81);
    p.memory.sourceTrust.keeper = 0.2;
    const before = hf.snapshot(p);
    expect(hf.consequenceEvidence(p, ask).entries[0]?.accessProbability).toBeCloseTo(0.18);
    expect(hf.snapshot(p)).toEqual(before);
  });
  test('multiple goals share one successor cost and cannot combine incompatible routes', () => {
    const p = person();
    const first = must(p.agenda.goals[0]);
    p.agenda.goals.push({
      ...structuredClone(first),
      id: 'other',
      advancedBy: [{ action: 'other-delivery', amount: 1 }],
    });
    receive(p);
    receive(
      p,
      premise({ id: 'other-route', successor: { action: 'other-delivery', duration: 20, effort: 0.1 } }),
    );
    const terms = prospective(p);
    expect(terms.filter((t) => t.source.startsWith('goal:'))).toHaveLength(1);
    expect(terms.filter((t) => t.source.startsWith('prospection:cost:'))).toHaveLength(1);
    must(p.agenda.goals[1]).advancedBy = [{ action: 'deliver', amount: 1 }];
    expect(prospective(p).filter((t) => t.source.startsWith('goal:'))).toHaveLength(2);
    expect(prospective(p).filter((t) => t.source.startsWith('prospection:cost:'))).toHaveLength(1);
  });
  test.each([5, 30])(
    'age %i successor effort/material uses actual cost units without maturity discount',
    (age) => {
      const p = person();
      p.life.bornAt = now - age * 365 * 1440;
      receive(
        p,
        premise({ successor: { action: 'deliver', duration: 20, effort: 0.1, materialCost: 0.05 } }),
      );
      const actual = must(hf.decide(p, [{ ...direct, duration: 20, material: -0.05 }]).considered[0]);
      const costs = actual.terms
        .filter((t) => t.source === 'effort' || t.source === 'material')
        .reduce((sum, t) => sum + t.value, 0);
      const cost = prospective(p).find((t) => t.source.startsWith('prospection:cost:'));
      expect(cost).toBeDefined();
      expect(must(cost).value).toBeCloseTo(0.9 * costs, 3);
    },
  );
  test('bounded entry eviction keeps revision memory and rejects tombstone overflow atomically', () => {
    const p = person();
    for (let i = 0; i < 64; i++) receive(p, premise({ id: `opportunity-${i.toString().padStart(2, '0')}` }));
    expect(p.prospection?.entries).toHaveLength(16);
    expect(p.prospection?.revisions).toHaveLength(64);
    const before = structuredClone(p.prospection);
    receive(p, premise({ id: 'overflow' }));
    expect(p.prospection).toEqual(before);
    receive(p, premise({ id: 'opportunity-00' }));
    expect(p.prospection).toEqual(before);
  });
  test('hostile restore cannot invent knowledge or temporal parameters', () => {
    const p = person();
    receive(p);
    const saved = hf.snapshot(p);
    const duplicate = structuredClone(saved);
    must(duplicate.prospection).entries.push(structuredClone(must(must(duplicate.prospection).entries[0])));
    expect(hf.restore(duplicate).prospection).toBeUndefined();
    const malformed = structuredClone(saved);
    must(must(malformed.prospection).entries[0]).triggeredAt = now + 1;
    expect(hf.restore(malformed).prospection?.entries).toEqual([]);
    const invalid = structuredClone(saved);
    must(invalid.agenda.goals[0]).temporal = { halfLifeMinutes: Number.NaN };
    expect(hf.restore(invalid).agenda.goals[0]?.temporal).toBeUndefined();
    const future = structuredClone(saved);
    must(must(future.prospection).revisions[0]).receivedAt = now + 1;
    expect(hf.restore(future).prospection).toBeUndefined();
  });
  test('domain renaming preserves utilities and actual query probabilities', () => {
    const p = person();
    receive(p);
    const base = score(p).utility;
    const q = person();
    must(must(q.agenda.goals[0]).advancedBy[0]).action = 'cool-sample';
    const renamed = { ...ask, action: 'ask-chamber', targetId: 'custodian' };
    q.memory.sourceTrust.custodian = 1;
    receive(
      q,
      premise({
        trigger: { action: 'ask-chamber', targetId: 'custodian' },
        successor: { action: 'cool-sample', duration: 20, effort: 0.1 },
      }),
      { actorId: 'custodian' },
    );
    expect(
      hf
        .decide(q, [renamed, { ...direct, action: 'cool-sample' }])
        .considered.find((x) => x.affordanceId === ask.id)?.utility,
    ).toBe(base);
  });
});

describe('frozen domain-neutral matrix', () => {
  test('publishes favorable and unfavorable controls with shared temporal goals and matching renamed utilities', async () => {
    const { runReceivedConsequenceControl } = await import('../examples/received-consequences.ts');
    const parcel = runReceivedConsequenceControl('parcel');
    const sample = runReceivedConsequenceControl('sample');
    expect(parcel.results.map((r) => [r.arm, r.chosen])).toEqual([
      ['useful', 'ask'],
      ['late', 'direct'],
      ['costly', 'direct'],
      ['uncertain', 'direct'],
      ['withheld', 'direct'],
      ['removed', 'direct'],
      ['goal-removed', 'ask'],
      ['temporal-off', 'direct'],
      ['refused', 'ask'],
    ]);
    for (const arm of ['useful', 'withheld', 'removed'])
      expect(parcel.results.find((r) => r.arm === arm)?.temporal).toEqual({ halfLifeMinutes: 30 });
    expect(parcel.results.find((r) => r.arm === 'refused')?.refusal).toEqual({
      requested: true,
      goalProgress: 0,
      prospectConsumed: true,
      feasibleAfter: false,
    });
    expect(sample.results.map((r) => r.considered.map((c) => c.utility))).toEqual(
      parcel.results.map((r) => r.considered.map((c) => c.utility)),
    );
  });
});

describe('review regressions: adoption and long skips', () => {
  test.each([0, Number.NaN, Number.POSITIVE_INFINITY])(
    'adoptGoal sanitizes half-life %s consistently with restore',
    (halfLifeMinutes) => {
      const p = person();
      p.agenda.goals = [];
      const goal = hf.adoptGoal(
        p,
        {
          label: 'Deliver',
          serves: ['achievement'],
          advancedBy: [{ action: 'deliver', amount: 1 }],
          importance: 0.8,
          temporal: { halfLifeMinutes },
        },
        p.now,
      );
      expect(goal.temporal).toBeUndefined();
      expect(hf.agendaTerms(p, direct, p.now)).toEqual([{ source: `goal:${goal.id}`, value: 0.8 }]);
      const saved = hf.snapshot(p);
      expect(hf.snapshot(hf.restore(saved))).toEqual(saved);
    },
  );
  test('adoptGoal copies a valid temporal setting instead of retaining caller ownership', () => {
    const p = person();
    p.agenda.goals = [];
    const temporal = { halfLifeMinutes: 30 };
    const goal = hf.adoptGoal(
      p,
      {
        label: 'Deliver',
        serves: ['achievement'],
        advancedBy: [{ action: 'deliver', amount: 1 }],
        importance: 0.8,
        temporal,
      },
      p.now,
    );
    temporal.halfLifeMinutes = 900;
    expect(goal.temporal).toEqual({ halfLifeMinutes: 30 });
  });
  test('skip expires received entries and revision memory before exact snapshot restore', () => {
    const p = person();
    receive(p);
    hf.skip(p, now + 7 * 1440 + 1);
    expect(p.prospection).toBeUndefined();
    const saved = hf.snapshot(p);
    expect(hf.snapshot(hf.restore(saved))).toEqual(saved);
    const legacy = person(false);
    hf.skip(legacy, now + 7 * 1440 + 1);
    expect(legacy.prospection).toBeUndefined();
  });
});
