import { describe, expect, test } from 'vitest';
import {
  admitPersona,
  createPerson,
  fingerprint,
  projectPersona,
  restore,
  retirePaidMakeUps,
  skillLevel,
  snapshot,
  validatePersonaProjection,
} from '../src/index.ts';

function fixture() {
  const source = createPerson({
    id: 'source',
    name: 'Guest',
    seed: 17,
    now: 100,
    bornAt: -10000,
    sex: 'female',
  });
  source.skills.cold = { level: 0.8, practice: 120, lastPracticed: 80 };
  source.skills.unmapped = { level: 0.9, practice: 90, lastPracticed: 40 };
  source.memory.episodes.push({
    id: 'e1',
    at: 90,
    recalledAt: 95,
    kind: 'outcome',
    action: 'cold',
    valence: 0.5,
    salience: 0.8,
    summary: 'Prepared supper',
    tags: [],
  });
  const mapping = {
    version: 'test/1',
    skills: { cold: 'supper' },
    episodes: { e1: { id: 'history:1', action: 'supper' } },
  };
  const target = createPerson({
    id: 'target',
    name: 'Guest',
    seed: 99,
    now: 1000,
    bornAt: -9100,
    sex: 'female',
  });
  return { source, target, mapping };
}

describe('explicit persona projection', () => {
  test.each(['2.14.1', '2.17.0', '2.23.0', '3.1.0'])(
    'published engine %s passports retain portable semantics',
    (engine) => {
      const { source, target, mapping } = fixture();
      const current = projectPersona(source, mapping);
      const prior = { ...current, source: { ...current.source, engine } };
      const before = JSON.stringify(prior);
      const policy = { mappingVersion: 'test/1', sourceId: 'source', targetId: 'target' };
      expect(validatePersonaProjection(prior)).toEqual(prior);
      expect(admitPersona(prior, target, policy).person).toEqual(
        admitPersona(current, target, policy).person,
      );
      expect(JSON.stringify(prior)).toBe(before);
      expect(() =>
        validatePersonaProjection({ ...prior, source: { ...prior.source, engine: '2.13.0' } }),
      ).toThrow(/engine/);
    },
  );

  test('admits exact approved state, maps timestamps, retains RNG and leaves both hosts untouched', () => {
    const { source, target, mapping } = fixture();
    const before = snapshot(source),
      opening = snapshot(target);
    const projection = projectPersona(source, mapping);
    const admitted = admitPersona(projection, target, {
      mappingVersion: 'test/1',
      sourceId: 'source',
      targetId: 'target',
    });
    expect(source).toEqual(before);
    expect(target).toEqual(opening);
    expect(admitted.person.rng).toEqual(source.rng);
    expect(admitted.person.traits).toEqual(source.traits);
    expect(admitted.person.values).toEqual(source.values);
    expect(admitted.person.skills).toEqual({ supper: { level: 0.8, practice: 120, lastPracticed: 980 } });
    expect(admitted.person.memory.episodes[0]).toMatchObject({
      id: 'history:1',
      at: 990,
      recalledAt: 995,
      action: 'supper',
    });
    expect(skillLevel(admitted.person, 'supper')).toBe(skillLevel(source, 'cold'));
    expect(restore(snapshot(admitted.person))).toEqual(admitted.person);
    expect(
      fingerprint(
        admitPersona(projection, target, { mappingVersion: 'test/1', sourceId: 'source', targetId: 'target' })
          .person,
      ),
    ).toBe(fingerprint(admitted.person));
    expect(projection.limitations).toContain('skill:unmapped');
  });
  test('rejects unsupported obligations, active goals and unresolved recurring chains', () => {
    const { source, mapping } = fixture();
    source.agenda.commitments.push({
      id: 'duty',
      kind: 'job',
      actions: ['work'],
      from: 0,
      until: 200,
      importance: 1,
      status: 'pending',
    });
    expect(() => projectPersona(source, mapping)).toThrow(/obligation/);
    const duty = source.agenda.commitments[0];
    if (!duty) throw new Error('missing fixture duty');
    duty.status = 'kept';
    duty.recurEvery = 1440;
    expect(() => projectPersona(source, mapping)).toThrow(/obligation/);
    source.agenda.commitments = [];
    source.agenda.goals.push({
      id: 'project',
      label: 'Build',
      serves: [],
      progress: 0,
      advancedBy: [],
      importance: 1,
      status: 'active',
      adoptedAt: 0,
    });
    expect(() => projectPersona(source, mapping)).toThrow(/goal/);
  });
  test('admits an explicitly mapped recurring promise without marking it kept', () => {
    const { source, target, mapping } = fixture();
    source.agenda.commitments.push({
      id: 'family',
      kind: 'promise',
      toId: 'children',
      actions: ['home'],
      from: 200,
      until: 240,
      importance: 0.7,
      status: 'pending',
      recurEvery: 1440,
    });
    const projection = projectPersona(source, {
      ...mapping,
      commitments: {
        family: { id: 'family:target', actions: ['leave'], toId: 'kin', from: 1100, until: 1140 },
      },
    });
    const admitted = admitPersona(projection, target, {
      mappingVersion: 'test/1',
      sourceId: 'source',
      targetId: 'target',
    }).person;
    expect(admitted.agenda.commitments).toEqual([
      {
        ...source.agenda.commitments[0],
        id: 'family:target',
        actions: ['leave'],
        toId: 'kin',
        from: 1100,
        until: 1140,
      },
    ]);
  });
  test('rejects death, health, family, identity and mapping conflicts before mutation', () => {
    const { source, target, mapping } = fixture();
    const projection = projectPersona(source, mapping);
    const policy = { mappingVersion: 'test/1', sourceId: 'source', targetId: 'target' };
    target.body.alive = false;
    expect(() => admitPersona(projection, target, policy)).toThrow(/dead/);
    target.body.alive = true;
    target.body.illnesses.push({
      id: 'chronic',
      kind: 'condition',
      chronic: true,
      severity: 0.1,
      trendPerDay: 0,
      contagious: false,
      since: 0,
    });
    expect(() => admitPersona(projection, target, policy)).toThrow(/health/);
    target.body.illnesses = [];
    target.family = { attachment: 0.2 };
    expect(() => admitPersona(projection, target, policy)).toThrow(/family/);
    delete target.family;
    expect(() => admitPersona(projection, target, { ...policy, mappingVersion: 'other' })).toThrow(/mapping/);
    expect(() => admitPersona(projection, target, { ...policy, targetId: 'unrelated' })).toThrow(/identity/);
    source.body.alive = false;
    expect(() => projectPersona(source, mapping)).toThrow(/dead/);
  });
  test('refuses unknown fields and invalid portable state instead of filling defaults', () => {
    const { source, target, mapping } = fixture();
    const projection = projectPersona(source, mapping);
    const policy = { mappingVersion: 'test/1', sourceId: 'source', targetId: 'target' };
    expect(() => admitPersona({ ...projection, extra: true }, target, policy)).toThrow();
    expect(() =>
      admitPersona({ ...projection, rng: { ...projection.rng, b: -1 } }, target, policy),
    ).toThrow();
    expect(() =>
      admitPersona(
        { ...projection, skills: { supper: { level: 2, practice: 1, lastPracticed: 90 } } },
        target,
        policy,
      ),
    ).toThrow();
  });
  test('rejects oversized/deep input and source-future evidence', () => {
    const { source, target, mapping } = fixture();
    const projection = projectPersona(source, mapping);
    let deep: unknown = {};
    for (let i = 0; i < 20; i++) deep = { next: deep };
    expect(() =>
      admitPersona({ ...projection, family: deep }, target, {
        mappingVersion: 'test/1',
        sourceId: 'source',
        targetId: 'target',
      }),
    ).toThrow(/bound/);
    expect(() =>
      admitPersona(
        { ...projection, skills: { supper: { level: 0.8, practice: 1, lastPracticed: 101 } } },
        target,
        { mappingVersion: 'test/1', sourceId: 'source', targetId: 'target' },
      ),
    ).toThrow(/future/);
  });
  test('reserves the generated episode counter beyond admitted ids', () => {
    const { source, target, mapping } = fixture();
    const projection = projectPersona(source, {
      ...mapping,
      episodes: { e1: { id: 'e999', action: 'supper' } },
    });
    const admitted = admitPersona(projection, target, {
      mappingVersion: 'test/1',
      sourceId: 'source',
      targetId: 'target',
    }).person;
    expect(admitted.memory.nextEpisode).toBeGreaterThan(999);
  });
  test('allows completed recurrence history when its mapped successor continues the chain', () => {
    const { source, target, mapping } = fixture();
    const current = {
      id: 'family:next',
      kind: 'promise' as const,
      actions: ['home'],
      from: 200,
      until: 240,
      importance: 0.7,
      status: 'pending' as const,
      recurEvery: 1440,
      chain: 'family',
    };
    source.agenda.commitments.push(
      { ...current, id: 'family:past', from: -1240, until: -1200, status: 'kept' },
      current,
    );
    const projection = projectPersona(source, {
      ...mapping,
      commitments: {
        'family:next': {
          id: 'arrival:family',
          actions: ['leave'],
          chain: 'arrival:family',
          from: 1100,
          until: 1140,
        },
      },
    });
    expect(
      admitPersona(projection, target, { mappingVersion: 'test/1', sourceId: 'source', targetId: 'target' })
        .person.agenda.commitments,
    ).toHaveLength(1);
  });
  test('keeps target-authored role goals in the fresh opening', () => {
    const { source, target, mapping } = fixture();
    target.agenda.goals.push({
      id: 'guest-role',
      label: 'Prepare supper',
      serves: ['achievement'],
      progress: 0,
      advancedBy: [{ action: 'supper', amount: 1 }],
      importance: 0.7,
      status: 'active',
      adoptedAt: target.now,
    });
    expect(
      admitPersona(projectPersona(source, mapping), target, {
        mappingVersion: 'test/1',
        sourceId: 'source',
        targetId: 'target',
      }).person.agenda.goals,
    ).toEqual(target.agenda.goals);
  });
  test('archives recorded kept make-up history but blocks unpaid or unproven debt', () => {
    const { source, mapping } = fixture();
    source.agenda.owed = [
      {
        ofId: 'original',
        kind: 'abstain',
        actions: [],
        reason: 'broken',
        at: 0,
        normId: 'shared-abstention',
        violatedBy: ['eat'],
        scheduledAs: 'make-up',
      },
    ];
    const made = {
      id: 'make-up',
      kind: 'abstain' as const,
      actions: [],
      from: 10,
      until: 50,
      importance: 0.8,
      status: 'kept' as 'kept' | 'pending' | 'released' | 'broken',
      normId: 'shared-abstention',
      violatedBy: ['eat'],
      makeUpOf: 'original',
    };
    source.agenda.commitments.push(made);
    const before = snapshot(source);
    expect(projectPersona(source, mapping).commitments).toEqual([]);
    expect(source).toEqual(before);
    made.status = 'pending';
    expect(() => projectPersona(source, mapping)).toThrow(/owed obligation/);
    made.status = 'released';
    expect(() => projectPersona(source, mapping)).toThrow(/owed obligation/);
    made.status = 'broken';
    expect(() => projectPersona(source, mapping)).toThrow(/owed obligation/);
    made.status = 'kept';
    made.makeUpOf = 'other';
    expect(() => projectPersona(source, mapping)).toThrow(/owed obligation/);
    source.agenda.commitments = [];
    expect(() => projectPersona(source, mapping)).toThrow(/owed obligation/);
    delete source.agenda.owed[0]?.scheduledAs;
    expect(() => projectPersona(source, mapping)).toThrow(/owed obligation/);
  });
  test('explicit retirement preserves detached kept receipts and leaves unresolved records in place', () => {
    const { source, mapping } = fixture();
    const original = {
      ofId: 'paid',
      kind: 'abstain' as const,
      actions: [],
      reason: 'broken' as const,
      at: 0,
      normId: 'shared-abstention',
      scheduledAs: 'make-up',
    };
    source.agenda.owed = [original, { ...original, ofId: 'missing', scheduledAs: 'missing' }];
    const kept = {
      id: 'make-up',
      kind: 'abstain' as const,
      actions: [],
      from: 10,
      until: 50,
      importance: 0.8,
      status: 'kept' as const,
      normId: 'shared-abstention',
      makeUpOf: 'paid',
    };
    source.agenda.commitments.push(kept);
    const receipts = retirePaidMakeUps(source);
    expect(receipts).toEqual([{ owed: original, commitment: kept, recordedAt: source.now }]);
    expect(Object.isFrozen(receipts)).toBe(true);
    expect(Object.isFrozen(receipts[0]?.owed.actions)).toBe(true);
    expect(source.agenda.owed.map((o) => o.ofId)).toEqual(['missing']);
    expect(source.agenda.commitments).toContainEqual(kept);
    original.normId = 'edited';
    expect(receipts[0]?.owed.normId).toBe('shared-abstention');
    source.agenda.commitments = [];
    expect(receipts[0]?.commitment.status).toBe('kept');
    expect(retirePaidMakeUps(source)).toEqual([]);
    expect(() => projectPersona(source, mapping)).toThrow(/owed obligation/);
  });
  test('v1 refuses temporal family stores rather than changing their meaning across clocks', () => {
    const { source, target, mapping } = fixture();
    const projection = projectPersona(source, mapping);
    target.now = 400000;
    target.life.bornAt = source.life.bornAt + target.now - source.now;
    const pregnancy = { fatherId: 'father', conceivedAt: -100000, dueAt: 300000, seed: 1 };
    const bonds = { courtships: [], marriages: [], mourning: { forId: 'spouse', since: 0, until: 10000 } };
    const policy = { mappingVersion: 'test/1', sourceId: 'source', targetId: 'target' };
    source.family = { pregnancy };
    expect(() => projectPersona(source, mapping)).toThrow(/temporal family/);
    target.family = { pregnancy };
    expect(() => admitPersona({ ...projection, family: { pregnancy } }, target, policy)).toThrow(
      /temporal family/,
    );
    delete source.family;
    delete target.family;
    source.bonds = bonds;
    expect(() => projectPersona(source, mapping)).toThrow(/temporal bonds/);
    target.bonds = bonds;
    expect(() => admitPersona({ ...projection, bonds }, target, policy)).toThrow(/temporal bonds/);
  });
});
