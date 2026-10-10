import { describe, expect, test } from 'vitest';
import * as hf from '../src/index.ts';
import { ADULT, aff } from './support.ts';

const person = () =>
  hf.createPerson({ id: 'learner', name: 'Learner', seed: 7, now: 0, bornAt: ADULT, sex: 'female' });
const cues = [
  { cue: 'route', value: 'north' },
  { cue: 'signal', value: 'clear' },
];
const lesson = {
  id: 'route-north',
  demonstrationId: 'example-one',
  contextId: 'example',
  conditions: cues,
  action: 'send-north',
  sourceId: 'teacher',
  outcome: 'success' as const,
};

describe('demonstrated conditional methods', () => {
  test('received examples guide an ordinary decision on a new target with matching cues', () => {
    expect(typeof hf.receiveMethodCues).toBe('function');
    const p = person();
    hf.receiveMethodCues(p, { contextId: 'example', cues });
    expect(hf.demonstrateMethod(p, lesson)).toBe(true);
    hf.receiveMethodCues(p, { contextId: 'unfamiliar-parcel', cues });
    const offers = [
      aff('a-south', { action: 'send-south', methodContext: 'unfamiliar-parcel', effort: 0 }),
      aff('z-north', { action: 'send-north', methodContext: 'unfamiliar-parcel', effort: 0 }),
    ];
    const decision = hf.decide(p, offers);
    expect(decision.chosenAction).toBe('send-north');
    expect(decision.considered.find((x) => x.action === 'send-north')?.terms).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: 'method:route-north:teacher' })]),
    );
    expect(hf.methodEvidence(p, 'send-north', 'unfamiliar-parcel').support).toBeGreaterThan(0);
    expect(hf.methodEvidence(p, 'send-north', 'wrong-target').support).toBe(0);
  });
});

describe('bounded evidence and ordinary agency', () => {
  test('withheld cues, unknown observations and unattended examples cannot acquire a rule', () => {
    const p = person();
    expect(hf.demonstrateMethod(p, lesson)).toBe(false);
    hf.receiveMethodCues(p, { contextId: 'example', cues: [{ cue: 'route', value: 'north' }] });
    expect(hf.demonstrateMethod(p, lesson)).toBe(false);
    hf.receiveMethodCues(p, { contextId: 'example', cues });
    expect(hf.demonstrateMethod(p, { ...lesson, attention: 0 })).toBe(false);
    expect(p.methods?.rules).toEqual([]);
    p.body.asleep = true;
    expect(hf.demonstrateMethod(p, lesson)).toBe(false);
  });

  test('conflicting examples retain uncertainty instead of picking a hidden correct action', () => {
    const p = person();
    hf.receiveMethodCues(p, { contextId: 'example', cues });
    hf.demonstrateMethod(p, lesson);
    hf.demonstrateMethod(p, { ...lesson, demonstrationId: 'alternative', action: 'send-south' });
    const evidence = hf.methodEvidence(p, 'send-north', 'example');
    expect(evidence.support).toBe(0);
    expect(evidence.matched.map((x) => x.action)).toEqual(['send-north', 'send-south']);
    expect(hf.methodEvidence(p, 'send-south', 'example').support).toBe(0);
  });

  test('one example cannot be replayed to inflate confidence and failed practice weakens evidence', () => {
    const p = person();
    hf.receiveMethodCues(p, { contextId: 'example', cues });
    hf.demonstrateMethod(p, lesson);
    const before = hf.methodEvidence(p, 'send-north', 'example').support;
    expect(hf.demonstrateMethod(p, lesson)).toBe(false);
    expect(hf.methodEvidence(p, 'send-north', 'example').support).toBe(before);
    hf.demonstrateMethod(p, { ...lesson, demonstrationId: 'failed-attempt', outcome: 'failure' });
    expect(hf.methodEvidence(p, 'send-north', 'example').support).toBe(0);
  });

  test('received contexts expire and changing a task clears its earlier observations', () => {
    const p = person();
    hf.receiveMethodCues(p, { contextId: 'example', cues });
    hf.demonstrateMethod(p, lesson);
    p.now = hf.METHOD_DEFAULTS.contextMinutes + 1;
    expect(hf.methodEvidence(p, 'send-north', 'example').support).toBe(0);
    hf.receiveMethodCues(p, { contextId: 'next', cues: [{ cue: 'route', value: 'north' }] });
    expect(hf.methodEvidence(p, 'send-north', 'next').support).toBe(0);
    hf.clearMethodContext(p);
    expect(p.methods?.context).toBeUndefined();
    expect(p.methods?.rules).toHaveLength(1);
  });

  test('source trust and elapsed disuse grade evidence, while pressing needs can override a method', () => {
    const p = person();
    hf.receiveMethodCues(p, { contextId: 'example', cues });
    hf.demonstrateMethod(p, lesson);
    const initial = hf.methodEvidence(p, 'send-north', 'example').support;
    p.memory.sourceTrust.teacher = 0.1;
    expect(hf.methodEvidence(p, 'send-north', 'example').support).toBeLessThan(initial);
    p.memory.sourceTrust.teacher = 0.5;
    p.now += hf.METHOD_DEFAULTS.evidenceHalfLife;
    hf.receiveMethodCues(p, { contextId: 'later', cues });
    expect(hf.methodEvidence(p, 'send-north', 'later').support).toBeLessThan(initial);
    p.body.satiety = 0.05;
    const choice = hf.decide(p, [
      aff('route', { action: 'send-north', methodContext: 'later', effort: 0 }),
      aff('urgent', { action: 'eat', advertises: { food: 1 }, effort: 0 }),
    ]);
    expect(choice.chosenAction).toBe('eat');
  });

  test('snapshot and restore retain the same acquired decision evidence and reject unsafe state', () => {
    const p = person();
    hf.receiveMethodCues(p, { contextId: 'example', cues });
    hf.demonstrateMethod(p, lesson);
    const saved = hf.snapshot(p);
    const loaded = hf.restore(saved);
    expect(loaded).toEqual(saved);
    expect(hf.methodEvidence(loaded, 'send-north', 'example')).toEqual(
      hf.methodEvidence(p, 'send-north', 'example'),
    );
    const malicious = structuredClone(saved) as unknown as Record<string, unknown>;
    malicious.methods = {
      rules: [{ id: '__proto__', action: 'send-north', conditions: cues, evidence: [] }],
      context: { id: 'example', at: Infinity, cues },
      surprise: true,
    };
    expect(hf.restore(malicious).methods).toEqual({ rules: [], recentDemonstrations: [] });
    expect(hf.receiveMethodCues(p, { contextId: '__proto__', cues })).toBe(false);
    expect(p.methods?.context).toBeUndefined();
  });
});

import { runMethodControl } from '../examples/method-control.ts';

describe('domain-neutral routing transfer control', () => {
  test('two acquired methods transfer, an exception seeks help, and changing teaching changes the decision', () => {
    const result = runMethodControl(19);
    expect(result.trained.actions).toEqual(['send-north', 'send-south', 'ask-help']);
    expect(result.alternative.actions).toEqual(['send-via-relay', 'send-south', 'ask-help']);
    for (const arm of [result.withheld, result.skillOnly, result.ablation])
      expect(arm.actions).toEqual(['ask-help', 'ask-help', 'ask-help']);
    expect(result.trained.correct).toEqual([true, true, true]);
    expect(result.alternative.correct).toEqual([true, true, true]);
    expect(result.trained.rules).toHaveLength(2);
    expect(result.skillOnly.rules).toHaveLength(0);
    expect(
      result.trained.traces[0]?.considered
        .find((c) => c.action === 'send-north')
        ?.terms.some((t) => t.source.startsWith('method:')),
    ).toBe(true);
    expect(runMethodControl(19)).toEqual(result);
  });
});

describe('collection and identifier limits', () => {
  test('prototype member source names produce finite ordinary evidence', () => {
    const p = person();
    hf.receiveMethodCues(p, { contextId: 'example', cues });
    hf.demonstrateMethod(p, { ...lesson, sourceId: 'toString' });
    expect(Number.isFinite(hf.methodEvidence(p, 'send-north', 'example').support)).toBe(true);
    expect(hf.methodEvidence(p, 'send-north', 'example').support).toBeGreaterThan(0);
  });

  test('live and restored collections remain bounded and invalid conjunctions cannot match', () => {
    const p = person();
    hf.receiveMethodCues(p, { contextId: 'example', cues });
    for (let i = 0; i < hf.METHOD_DEFAULTS.maxRules + 2; i++)
      hf.demonstrateMethod(p, {
        ...lesson,
        id: `method-${i}`,
        action: `action-${i}`,
        demonstrationId: `event-${i}`,
      });
    expect(p.methods?.rules).toHaveLength(hf.METHOD_DEFAULTS.maxRules);
    expect(
      hf.demonstrateMethod(p, {
        ...lesson,
        demonstrationId: 'duplicate-cues',
        conditions: [
          { cue: 'route', value: 'north' },
          { cue: 'route', value: 'north' },
        ],
      }),
    ).toBe(false);
    const rule = p.methods?.rules[0];
    if (!rule) throw Error('missing acquired rule');
    for (let i = 0; i < hf.METHOD_DEFAULTS.maxEvidence + 2; i++)
      hf.demonstrateMethod(p, {
        ...lesson,
        id: rule.id,
        action: rule.action,
        demonstrationId: `repeat-${i}`,
      });
    expect(rule.evidence).toHaveLength(hf.METHOD_DEFAULTS.maxEvidence);
    const saved = hf.snapshot(p);
    if (!saved.methods) throw Error('missing method state');
    saved.methods.rules.push(...saved.methods.rules.map((r) => structuredClone(r)));
    saved.methods.context = {
      id: 'bad',
      at: 0,
      cues: Array.from({ length: hf.METHOD_DEFAULTS.maxCues + 1 }, (_, i) => ({
        cue: `c${i}`,
        value: 'yes',
      })),
    };
    const loaded = hf.restore(saved);
    expect(loaded.methods?.rules.length).toBeLessThanOrEqual(hf.METHOD_DEFAULTS.maxRules);
    expect(loaded.methods?.context).toBeUndefined();
    expect(hf.methodEvidence(loaded, 'send-north', 'bad').support).toBe(0);
  });
});

describe('retained demonstration identity and canonical learning', () => {
  test('changing method labels cannot multiply support for the same taught conditions and action', () => {
    const one = person();
    const split = person();
    for (const p of [one, split]) hf.receiveMethodCues(p, { contextId: 'example', cues });
    for (let i = 0; i < 6; i++) {
      hf.demonstrateMethod(one, { ...lesson, demonstrationId: `example-${i}` });
      hf.demonstrateMethod(split, { ...lesson, id: `renamed-${i}`, demonstrationId: `example-${i}` });
    }
    expect(hf.methodEvidence(split, 'send-north', 'example').support).toBe(
      hf.methodEvidence(one, 'send-north', 'example').support,
    );
    expect(split.methods?.rules).toHaveLength(1);
  });

  test('recent duplicate ids remain blocked after evidence and rule eviction, including restore', () => {
    const p = person();
    hf.receiveMethodCues(p, { contextId: 'example', cues });
    hf.demonstrateMethod(p, lesson);
    for (let i = 0; i < hf.METHOD_DEFAULTS.maxEvidence + 2; i++)
      hf.demonstrateMethod(p, { ...lesson, demonstrationId: `more-${i}` });
    expect(hf.demonstrateMethod(p, lesson)).toBe(false);
    for (let i = 0; i < hf.METHOD_DEFAULTS.maxRules + 2; i++)
      hf.demonstrateMethod(p, { ...lesson, action: `different-${i}`, demonstrationId: `new-rule-${i}` });
    const loaded = hf.restore(hf.snapshot(p));
    expect(hf.demonstrateMethod(loaded, lesson)).toBe(false);
  });
});

test('a full recent-example horizon round-trips exactly without replacing recent ids with older rule evidence', () => {
  const p = person();
  hf.receiveMethodCues(p, { contextId: 'example', cues });
  for (let i = 0; i < 300; i++)
    hf.demonstrateMethod(p, { ...lesson, action: `route-${i % 24}`, demonstrationId: `d${i}` });
  const saved = hf.snapshot(p);
  const loaded = hf.restore(saved);
  expect(loaded).toEqual(saved);
  expect(loaded.methods?.recentDemonstrations).toHaveLength(hf.METHOD_DEFAULTS.maxRecentDemonstrations);
  expect(hf.demonstrateMethod(loaded, { ...lesson, action: 'route-20', demonstrationId: 'd44' })).toBe(false);
});
