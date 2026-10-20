import { describe, expect, it, test } from 'vitest';
import {
  BELIEF_DEFAULTS,
  believe,
  confirm,
  contradicted,
  createPerson,
  MAX_MINUTE,
  MINUTES_PER_DAY,
  perceive,
  restore,
  seedBelief,
  seedSourceTrust,
  snapshot,
  testimonyWeight,
  trustOf,
} from '../src/index.ts';
import type { NotedContradiction, Percept, Person } from '../src/types.ts';

function person(): Person {
  return createPerson({
    id: 'listener',
    name: 'Listener',
    seed: 17,
    now: 10,
    bornAt: -30 * 365 * MINUTES_PER_DAY,
    sex: 'female',
    norms: [],
    voices: [{ voiceId: 'source', trust: 0.9 }],
    relationships: [{ otherId: 'source', trust: 0.9 }],
  });
}

const event = { sourceId: 'source', prop: 'well:dry', value: false };
const report = (extra: Partial<Percept> = {}): Percept => ({
  at: 10,
  channel: 'told',
  actorId: 'reporter',
  kind: 'fact',
  salience: 1,
  summary: 'What the source told me',
  reports: [{ ...event }],
  ...extra,
});

function account(p: Person, prop = event.prop, value = true, source = event.sourceId): void {
  believe(p, prop, value, 0.95, source, 10);
}

describe('contradiction of one source', () => {
  test('attending both accounts directly loses exactly a quarter of source trust, touching no other slice', () => {
    const p = person();
    seedSourceTrust(p, 'source', 0.8);
    perceive(p, [
      {
        ...report({ actorId: 'source', reports: undefined }),
        claims: [{ prop: event.prop, value: true, confidence: 0.95 }],
      },
    ]);
    const before = snapshot(p);
    expect(contradicted(p, event)).toEqual({ applied: true, before: 0.8, after: 0.8 - 0.25 * 0.8 });
    expect(trustOf(p, 'source')).toBe(0.8 - BELIEF_DEFAULTS.contradictionLoss * 0.8);
    expect(p.memory.contradictions).toEqual([{ sourceId: 'source', prop: event.prop, at: 10 }]);
    const expected = snapshot(before);
    expected.memory.sourceTrust.source = trustOf(p, 'source');
    expected.memory.contradictions = structuredClone(p.memory.contradictions);
    expect(p).toEqual(expected);
  });

  test('an attended report loses exactly the reporter-weighted amount; the account does not change', () => {
    const p = person();
    account(p);
    seedSourceTrust(p, 'source', 0.8);
    seedSourceTrust(p, 'reporter', 0.9);
    const beliefs = structuredClone(p.memory.beliefs);
    expect(perceive(p, [report()])).toHaveLength(1);
    expect(trustOf(p, 'source')).toBe(0.8 - 0.25 * testimonyWeight(0.9) * 0.8);
    expect(p.memory.beliefs).toEqual(beliefs);
    expect(trustOf(p, 'reporter')).toBe(0.9);
  });

  test('a distrusted reporter frames less, and a reporter at the trust floor cannot lower trust', () => {
    const trusts = [1, 0.5, BELIEF_DEFAULTS.trustFloor, 0];
    const after = trusts.map((trust) => {
      const p = person();
      account(p);
      seedSourceTrust(p, 'reporter', trust);
      perceive(p, [report()]);
      expect(trustOf(p, 'source')).toBe(0.5 - 0.25 * testimonyWeight(trust) * 0.5);
      return trustOf(p, 'source');
    });
    expect(after[0]).toBeLessThan(after[1] ?? 0);
    expect(after[1]).toBeLessThan(after[2] ?? 0);
    expect(after.slice(2)).toEqual([0.5, 0.5]);
  });

  test('independent sources disagreeing costs nobody trust; an account from neither source is refused', () => {
    const p = person();
    account(p, event.prop, true, 'a');
    account(p, event.prop, false, 'b');
    const before = snapshot(p);
    expect(trustOf(p, 'a')).toBe(0.5);
    expect(trustOf(p, 'b')).toBe(0.5);
    expect(contradicted(p, event)).toEqual({ applied: false, reason: 'no-account', before: 0.5, after: 0.5 });
    expect(p).toEqual(before);
    expect(p.memory).not.toHaveProperty('contradictions');
  });

  test('missing accounts, same accounts and self are refused without writes', () => {
    const p = person();
    account(p);
    const before = snapshot(p);
    expect(contradicted(p, { ...event, prop: 'unknown' }).reason).toBe('no-account');
    expect(contradicted(p, { ...event, value: true }).reason).toBe('same-account');
    for (const sourceId of [p.id, 'self']) {
      expect(contradicted(p, { ...event, sourceId })).toEqual({
        applied: false,
        reason: 'self',
        before: BELIEF_DEFAULTS.selfTrust,
        after: BELIEF_DEFAULTS.selfTrust,
      });
    }
    expect(p).toEqual(before);
  });

  test('a repeated contradiction is already-noted, including after confirm, snapshot and restore', () => {
    const p = person();
    account(p);
    expect(contradicted(p, event).applied).toBe(true);
    const once = snapshot(p);
    expect(contradicted(p, event)).toEqual({
      applied: false,
      reason: 'already-noted',
      before: 0.375,
      after: 0.375,
    });
    expect(p).toEqual(once);
    confirm(p, event.prop, true, 10);
    const restored = restore(snapshot(p));
    expect(restored).toEqual(p);
    const before = snapshot(restored);
    expect(contradicted(restored, event).reason).toBe('already-noted');
    expect(restored).toEqual(before);
  });

  test('contradictions never raise trust, and mixed reporter weights commute', () => {
    const events = [
      { ...event, prop: 'a' },
      { ...event, prop: 'b', reporterId: 'trusted' },
      { ...event, prop: 'c', reporterId: 'uncertain' },
      { ...event, prop: 'd', reporterId: 'distrusted' },
    ];
    const permutations = <T>(xs: T[]): T[][] =>
      xs.length === 0
        ? [[]]
        : xs.flatMap((x, i) => permutations(xs.filter((_, j) => i !== j)).map((rest) => [x, ...rest]));
    for (const initialTrust of [0, 0.1, 0.5, 1]) {
      const values = permutations(events).map((ordered) => {
        const p = person();
        seedSourceTrust(p, 'source', initialTrust);
        seedSourceTrust(p, 'trusted', 1);
        seedSourceTrust(p, 'uncertain', 0.6);
        seedSourceTrust(p, 'distrusted', 0.1);
        for (const e of events) account(p, e.prop);
        for (const e of ordered) {
          const result = contradicted(p, e);
          expect(result.applied).toBe(true);
          expect(result.after).toBeLessThanOrEqual(result.before);
          expect(result.after).toBeGreaterThanOrEqual(0);
        }
        return trustOf(p, 'source');
      });
      for (const value of values) expect(value).toBeCloseTo(values[0] ?? 0, 14);
    }
  });

  test('only attended told reports with a reporter count, with at most four accounts per percept', () => {
    const p = person();
    account(p);
    const noActor = report();
    delete noActor.actorId;
    perceive(p, [report({ channel: 'saw' }), noActor]);
    expect(p.memory).not.toHaveProperty('contradictions');
    const distractors = Array.from(
      { length: 10 },
      (_, i): Percept => ({
        at: 10,
        channel: 'saw',
        kind: `distractor:${i}`,
        salience: 0.89,
        summary: 'attention',
      }),
    );
    expect(
      perceive(p, [...distractors, report({ salience: 0 })]).some((pc) => pc.reports !== undefined),
    ).toBe(false);
    expect(p.memory).not.toHaveProperty('contradictions');
    const reports = Array.from({ length: 5 }, (_, i) => ({ ...event, prop: `prop:${i}` }));
    for (const r of reports) account(p, r.prop);
    perceive(p, [report({ reports })]);
    expect(p.memory.contradictions?.map((x) => x.prop)).toEqual(reports.slice(0, 4).map((x) => x.prop));
  });

  test('bounded memory keeps the newest contradictions, including backdated calls', () => {
    const p = person();
    for (let i = 0; i < BELIEF_DEFAULTS.maxContradictions + 2; i++) {
      const prop = `prop:${i}`;
      account(p, prop);
      contradicted(p, { ...event, prop, at: i });
    }
    account(p, 'old');
    contradicted(p, { ...event, prop: 'old', at: -1 });
    expect(p.memory.contradictions).toHaveLength(32);
    expect(p.memory.contradictions?.[0]?.at).toBe(2);
    expect(restore(snapshot(p))).toEqual(p);
  });

  test('empty string source and proposition keys written by the API keep their idempotency after restore', () => {
    const p = person();
    account(p, '', true, '');
    const empty = { sourceId: '', prop: '', value: false };
    expect(contradicted(p, empty).applied).toBe(true);
    const restored = restore(snapshot(p));
    expect(restored).toEqual(p);
    expect(contradicted(restored, empty).reason).toBe('already-noted');
    expect(trustOf(restored, '')).toBe(0.375);
  });

  test.each([null, {}, 4, 'bad', []].map((bad) => [bad]))(
    'restore drops a malformed or empty contradiction store: %j',
    (bad) => {
      const p = person();
      p.memory.contradictions = bad as unknown as NotedContradiction[];
      expect(restore(snapshot(p)).memory).not.toHaveProperty('contradictions');
    },
  );

  test('restore validates records, deduplicates source/prop pairs and retains the newest 32', () => {
    const p = person();
    const valid = Array.from({ length: 40 }, (_, i) => ({ sourceId: 'source', prop: `prop:${i}`, at: i }));
    p.memory.contradictions = [
      null,
      [],
      {},
      { sourceId: 1, prop: 'bad', at: 0 },
      { sourceId: 's', prop: false, at: 0 },
      { sourceId: 's', prop: 'bad', at: Infinity },
      { sourceId: 's', prop: 'bad', at: MAX_MINUTE + 1 },
      ...valid.toReversed(),
      ...valid,
    ] as NotedContradiction[];
    const restored = restore(snapshot(p));
    expect(restored.memory.contradictions).toEqual(valid.slice(-32));
    expect(restore(snapshot(restored))).toEqual(restored);
  });
});

describe('contradiction review fixes (2.10.0)', () => {
  const fresh = () =>
    createPerson({
      id: 'p',
      name: 'P',
      seed: 17,
      now: 10,
      bornAt: -30 * 365 * 1440,
      sex: 'female',
      norms: [],
    });

  it('reports in one percept share one reporter-trust basis, whatever their order', () => {
    const run = (reverse: boolean) => {
      const p = fresh();
      for (const [source, prop] of [
        ['a', 'qa'],
        ['b', 'qb'],
      ] as const) {
        seedSourceTrust(p, source, 0.8);
        seedBelief(p, prop, { value: true, credence: 0.9, source });
      }
      const reports = [
        { sourceId: 'a', prop: 'qa', value: false },
        { sourceId: 'b', prop: 'qb', value: false },
      ];
      if (reverse) reports.reverse();
      perceive(p, [
        {
          at: 10,
          channel: 'told',
          actorId: 'a',
          kind: 'fact',
          salience: 1,
          summary: 'Both accounts',
          reports,
        },
      ]);
      return { ...p.memory.sourceTrust };
    };
    expect(run(true)).toEqual(run(false));
  });

  it.each(['constructor', 'toString', '__proto__'])('treats %s as an ordinary unseeded id', (id) => {
    const p = fresh();
    seedBelief(p, 'q', { value: true, credence: 0.9, source: id });
    const r = contradicted(p, { sourceId: id, prop: 'q', value: false });
    expect(r).toMatchObject({ applied: true, before: 0.5, after: 0.375 });
    const q = fresh();
    seedBelief(q, 'q', { value: true, credence: 0.9, source: 's' });
    const ordinary = fresh();
    seedBelief(ordinary, 'q', { value: true, credence: 0.9, source: 's' });
    expect(contradicted(q, { sourceId: 's', prop: 'q', value: false, reporterId: id }).after).toBe(
      contradicted(ordinary, { sourceId: 's', prop: 'q', value: false, reporterId: 'ordinary' }).after,
    );
  });
});
