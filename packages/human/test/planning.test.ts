import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import type { Affordance, Person, ReceivedConsequence } from '../src/index.ts';
import * as hf from '../src/index.ts';

const now = 600;
const offer = (action: string): Affordance => ({
  id: action,
  action,
  label: action,
  duration: 5,
  effort: 0.05,
  advertises: {},
});
function person(): Person {
  return hf.createPerson({
    id: 'p',
    name: 'P',
    seed: 981,
    now,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    goals: [
      {
        id: 'deliver',
        label: 'Deliver',
        serves: ['achievement'],
        advancedBy: [{ action: 'put', amount: 1 }],
        importance: 0.8,
        temporal: { halfLifeMinutes: 120 },
      },
    ],
  });
}
function claim(id: string, trigger: string, successor: string): ReceivedConsequence {
  return {
    id,
    revision: 0,
    trigger: { action: trigger },
    successor: { action: successor, duration: 5, effort: 0.05 },
    availableFrom: now,
    availableUntil: 1000,
    expiresAt: 1100,
    chance: 1,
    confidence: 1,
  };
}
const chain = (): [ReceivedConsequence, ReceivedConsequence, ReceivedConsequence] => [
  claim('link-0', 'go', 'take'),
  claim('link-1', 'take', 'carry'),
  claim('link-2', 'carry', 'put'),
];
function told(p: Person, claims: ReceivedConsequence[], source = 'keeper'): void {
  hf.perceive(p, [
    {
      at: p.now,
      channel: 'told',
      actorId: source,
      kind: 'route',
      salience: 1,
      summary: 'Route',
      consequences: claims,
    },
  ]);
}
function terms(p: Person, action = 'go') {
  return hf.decide(p, [offer(action)]).considered[0]?.terms ?? [];
}
const goalValue = (p: Person, action = 'go') =>
  terms(p, action).find((t) => t.source === 'goal:deliver')?.value ?? 0;

describe('bounded planning', () => {
  test('four steps need depth four; reactive and depth three cannot credit the first action', () => {
    const off = person();
    told(off, chain());
    const shallow = structuredClone(off);
    hf.enablePlanning(shallow, { depth: 3 });
    const on = structuredClone(off);
    hf.enablePlanning(on);
    expect(on.planning?.depth).toBe(4);
    expect(goalValue(off)).toBe(0);
    expect(goalValue(shallow)).toBe(0);
    expect(goalValue(on)).toBeGreaterThan(0);
    const route = hf.planRoute(on, offer('go'));
    expect(route?.steps.map((s) => s.successor.action)).toEqual(['take', 'carry', 'put']);
    expect(route?.goals.deliver).toBeGreaterThan(0);
    expect(terms(on).find((t) => t.source.startsWith('prospection:cost:'))?.ref).toBe('link-0>link-1>link-2');
    expect(route?.steps.map((s) => [s.start, s.end])).toEqual([
      [605, 610],
      [610, 615],
      [615, 620],
    ]);
  });

  test('a route never uses a link its own earlier step already consumed', () => {
    const p = person();
    const goal = p.agenda.goals[0];
    if (!goal) throw new Error('Missing planning goal');
    p.agenda.goals.push({
      ...structuredClone(goal),
      id: 'fetch',
      advancedBy: [{ action: 'take', amount: 1 }],
    });
    hf.enablePlanning(p);
    // go→take, take→go, go→put: completing the first go consumes both go-triggered links.
    hf.seedConsequences(p, 'host', [
      claim('a', 'go', 'take'),
      claim('b', 'take', 'go'),
      claim('c', 'go', 'put'),
    ]);
    const route = hf.planRoute(p, offer('go'));
    expect(route?.steps.map((s) => s.successor.action)).toEqual(['take']);
    expect(route?.goals.deliver ?? 0).toBe(0);
  });

  test('depth two keeps the legacy single-successor terms exactly', () => {
    const off = person();
    told(off, [claim('one', 'go', 'put')]);
    const on = structuredClone(off);
    hf.enablePlanning(on, { depth: 2 });
    expect(terms(on)).toEqual(terms(off));
  });

  test('present bias scales later values and costs, but leaves direct goal value alone', () => {
    const on = person();
    hf.enablePlanning(on);
    told(on, chain());
    const biased = structuredClone(on);
    hf.enablePlanning(biased, { presentBias: 0.5 });
    expect(goalValue(biased)).toBeCloseTo(goalValue(on) * 0.5, 3);
    const cost = (p: Person) =>
      terms(p)
        .filter((t) => t.source.startsWith('prospection:cost:'))
        .reduce((s, t) => s + t.value, 0);
    expect(cost(on)).toBeLessThan(0);
    expect(cost(biased)).toBeCloseTo(cost(on) * 0.5, 3);
    expect(terms(biased, 'put')).toEqual(terms(on, 'put'));
  });

  test('known consequences use confidence independently of live source trust', () => {
    const p = person();
    hf.enablePlanning(p);
    hf.seedConsequences(p, 'keeper', chain());
    const before = hf.planRoute(p, offer('go'));
    expect(before).toBeDefined();
    expect(p.prospection?.entries.every((e) => e.channel === 'known')).toBe(true);
    p.memory.sourceTrust.keeper = 0;
    expect(hf.planRoute(p, offer('go'))).toEqual(before);
    const received = person();
    hf.enablePlanning(received);
    received.memory.sourceTrust.keeper = 1;
    told(received, chain());
    expect(goalValue(received)).toBeGreaterThan(0);
    received.memory.sourceTrust.keeper = 0;
    expect(goalValue(received)).toBe(0);
  });

  test('chain access multiplies reliability at each link and waits for feasible windows', () => {
    const p = person();
    hf.enablePlanning(p);
    const claims = chain();
    claims[0].chance = 0.8;
    claims[1].confidence = 0.7;
    claims[1].availableFrom = 650;
    claims[2].availableUntil = 660;
    hf.seedConsequences(p, 'keeper', claims);
    const route = hf.planRoute(p, offer('go'));
    expect(route?.steps.map((s) => [s.start, s.end])).toEqual([
      [605, 610],
      [650, 655],
      [655, 660],
    ]);
    expect(route?.steps[2]?.access).toBeCloseTo(0.9 ** 3 * 0.8 * 0.7);
    hf.seedConsequences(p, 'keeper', [{ ...claims[2], revision: 1, availableUntil: 659 }]);
    expect(hf.planRoute(p, offer('go'))).toBeUndefined();
  });

  test('known setup shares revision and expiry rules and rejects invalid or self-source batches atomically', () => {
    const p = person();
    hf.enablePlanning(p);
    expect(hf.seedConsequences(p, p.id, chain())).toBe(false);
    expect(hf.seedConsequences(p, 'keeper', chain())).toBe(true);
    const before = structuredClone(p.prospection);
    expect(hf.seedConsequences(p, 'keeper', [{ ...chain()[0], confidence: Number.NaN }])).toBe(false);
    expect(
      hf.seedConsequences(
        p,
        'keeper',
        Array.from({ length: 17 }, (_, i) => claim(`new-${i}`, 'go', 'put')),
      ),
    ).toBe(false);
    expect(p.prospection).toEqual(before);
    hf.seedConsequences(p, 'keeper', [{ ...chain()[0], chance: 0 }]);
    expect(p.prospection).toEqual(before);
    hf.seedConsequences(p, 'keeper', [{ ...chain()[0], revision: 1, chance: 0 }]);
    expect(hf.planRoute(p, offer('go'))).toBeUndefined();
    hf.skip(p, 1101);
    expect(p.prospection?.entries).toEqual([]);
  });

  test('route reads and JSON restore preserve all state, including RNG', () => {
    const p = person();
    hf.enablePlanning(p);
    hf.seedConsequences(p, 'keeper', chain());
    const saved = JSON.stringify(hf.snapshot(p));
    const route = hf.planRoute(p, offer('go'));
    expect(JSON.stringify(hf.snapshot(p))).toBe(saved);
    const restored = hf.restore(JSON.parse(saved));
    expect(JSON.stringify(hf.snapshot(restored))).toBe(saved);
    expect(hf.planRoute(restored, offer('go'))).toEqual(route);
  });

  test('planning accepts sixteen claims and sixty-four retained entries; reactive bounds stay four and sixteen', () => {
    const batch = (start: number, count: number) =>
      Array.from({ length: count }, (_, i) => claim(`entry-${start + i}`, 'go', 'put'));
    const off = person();
    told(off, batch(0, 5));
    expect(off.prospection).toBeUndefined();
    for (let i = 0; i < 5; i++) told(off, batch(i * 4, 4));
    expect(off.prospection?.entries).toHaveLength(16);
    const on = person();
    hf.enablePlanning(on);
    for (let i = 0; i < 4; i++) told(on, batch(i * 16, 16));
    expect(on.prospection?.entries).toHaveLength(64);
    const before = structuredClone(on.prospection);
    told(on, batch(100, 17));
    expect(on.prospection).toEqual(before);
    const restored = hf.restore(JSON.parse(JSON.stringify(hf.snapshot(on))));
    expect(restored.prospection?.entries).toHaveLength(64);
    const invalid = JSON.parse(JSON.stringify(hf.snapshot(on)));
    invalid.planning.depth = 100;
    expect(hf.restore(invalid).planning).toBeUndefined();
    expect(hf.restore(invalid).prospection).toBeUndefined();
  });

  test('depth and beta are bounded; PersonSpec can enable the faculty', () => {
    const p = person();
    for (const spec of [
      { depth: 1 },
      { depth: 6 },
      { depth: 2.5 },
      { presentBias: 0 },
      { presentBias: 1.1 },
      { presentBias: Number.NaN },
    ]) {
      expect(() => hf.enablePlanning(p, spec)).toThrow(RangeError);
      expect(p.planning).toBeUndefined();
    }
    hf.enablePlanning(p, { depth: 5, presentBias: 1 });
    expect(p.planning).toEqual({ depth: 5, presentBias: 1 });
    const q = hf.createPerson({
      id: 'q',
      name: 'Q',
      seed: 1,
      now,
      bornAt: -30 * 365 * 1440,
      sex: 'female',
      enable: { planning: { depth: 2 } },
    });
    expect(q.planning?.depth).toBe(2);
  });

  test('the sixty-four expansion budget follows stable depth-first entry order', () => {
    const p = person();
    hf.enablePlanning(p);
    const branches = Array.from({ length: 8 }, (_, i) => claim(`a-${i}`, 'go', 'fork'));
    const leaves = Array.from({ length: 8 }, (_, i) => claim(`b-${i}`, 'fork', 'leaf'));
    hf.seedConsequences(p, 'keeper', [...branches, ...leaves]);
    hf.seedConsequences(p, 'keeper', [claim('z-goal', 'go', 'put')]);
    expect(goalValue(p)).toBe(0);
    const reversed = structuredClone(p);
    reversed.prospection?.entries.reverse();
    expect(hf.planRoute(reversed, offer('go'))).toEqual(hf.planRoute(p, offer('go')));
    const reachable = person();
    hf.enablePlanning(reachable);
    hf.seedConsequences(reachable, 'keeper', [
      claim('0-goal', 'go', 'put'),
      ...branches.slice(0, 7),
      ...leaves,
    ]);
    expect(goalValue(reachable)).toBeGreaterThan(0);
  });

  test('cycles cannot reuse an entry, and stable source/id ordering resolves equal routes', () => {
    const p = person();
    hf.enablePlanning(p, { depth: 5 });
    hf.seedConsequences(p, 'z-source', [claim('a', 'go', 'put')]);
    hf.seedConsequences(p, 'a-source', [claim('z', 'go', 'put'), claim('a', 'go', 'put')]);
    const canonical = hf.planRoute(p, offer('go'));
    const reversed = structuredClone(p);
    reversed.prospection?.entries.reverse();
    expect(hf.planRoute(reversed, offer('go'))).toEqual(canonical);
    const loop = person();
    hf.enablePlanning(loop, { depth: 5 });
    hf.seedConsequences(loop, 'keeper', [claim('loop', 'go', 'go'), claim('exit', 'go', 'put')]);
    const result = hf.planRoute(loop, offer('go'));
    expect(result?.steps).toHaveLength(1);
    expect(result?.steps[0]?.successor.action).toBe('put');
  });
});

test('legacy received chains continue with the pre-planning full-state digest', () => {
  const p = person();
  for (const c of chain()) told(p, [c]);
  const offers = ['go', 'take', 'carry', 'put', 'rest'].map(offer);
  const states = [];
  for (let i = 0; i < 8; i++) {
    const d = hf.decide(p, offers);
    const a = offers.find((a) => a.id === d.chosenAffordanceId);
    if (!a) throw new Error('Missing chosen offer');
    hf.begin(p, a, d);
    hf.finish(p, { at: p.now + 5, action: a.action, affordanceId: a.id, status: 'completed' });
    const s = hf.snapshot(p);
    delete (s as { engine?: string }).engine;
    states.push(s);
  }
  expect(createHash('sha256').update(JSON.stringify(states)).digest('hex')).toBe(
    'bc31cba151bea66ac3f1c655234972b4c4d434f20960daf3a1e318dbd902c38b',
  );
});
