import { describe, expect, test } from 'vitest';
import {
  admitPersona,
  createPerson,
  fingerprint,
  projectPersona,
  restore,
  skillLevel,
  snapshot,
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
});
