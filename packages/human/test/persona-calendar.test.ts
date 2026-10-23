import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { hasUnresolvedMakeUps } from '../src/agenda/agenda.ts';
import {
  admitCalendarPersona,
  advanceAgenda,
  type CalendarPersonaProjection,
  createPerson,
  ENGINE_VERSION,
  fingerprint,
  type NormDefinition,
  PERSON_SCHEMA,
  type Person,
  type PersonaProjectionSnapshot,
  projectCalendarPersona,
  projectPersona,
  restore,
  scheduleMakeUp,
  snapshot,
  validateCalendarPersona,
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
  const norm: NormDefinition = {
    id: 'fast',
    label: 'The fast',
    standing: 'obligatory',
    sources: [{ kind: 'revelation', ref: 'Quran 2:184-185' }],
    exemptions: [
      { when: 'illness', makeUp: true, sources: [{ kind: 'revelation', ref: 'Quran 2:184-185' }] },
    ],
  };
  source.conscience.norms = [{ normId: 'fast', standing: 'obligatory', conviction: 0.77 }];
  source.agenda.owed = [
    {
      ofId: 'original',
      kind: 'abstain',
      actions: [],
      normId: 'fast',
      violatedBy: ['eat'],
      reason: 'broken',
      at: 50,
      scheduledAs: 'makeup',
    },
    {
      ofId: 'unscheduled',
      kind: 'abstain',
      actions: [],
      normId: 'fast',
      violatedBy: ['eat'],
      reason: 'illness',
      at: 60,
    },
  ];
  source.agenda.commitments = [
    {
      id: 'original',
      kind: 'abstain',
      actions: [],
      violatedBy: ['eat'],
      from: 10,
      until: 50,
      importance: 0.8,
      status: 'broken',
      normId: 'fast',
      exempt: { reason: 'necessity', at: 45 },
    },
    {
      id: 'makeup',
      kind: 'abstain',
      actions: [],
      violatedBy: ['eat'],
      from: 200,
      until: 240,
      importance: 0.8,
      status: 'pending',
      normId: 'fast',
      makeUpOf: 'original',
      exemptWhen: ['illness'],
      firm: true,
    },
    {
      id: 'future',
      kind: 'worship',
      actions: ['pray'],
      toId: 'self',
      targetId: 'source',
      from: 250,
      until: 270,
      importance: 0.8,
      status: 'pending',
      normId: 'fast',
      chain: 'daily',
      recurEvery: 1440,
      recurUntil: 3000,
    },
  ];
  const mapping: CalendarPersonaProjection = {
    version: 'test-calendar/1',
    skills: {},
    calendar: {
      version: 'hf-persona-calendar-map/1',
      offset: 900,
      references: {
        commitments: {
          original: 'receiver-original',
          makeup: 'receiver-makeup',
          unscheduled: 'receiver-unscheduled',
          future: 'receiver-future',
        },
        chains: { daily: 'receiver-daily' },
        actions: { eat: 'receiver-eat', pray: 'receiver-pray' },
        entities: { self: 'self', source: 'target' },
        norms: { fast: 'receiver-fast' },
      },
      sourceNorms: [norm],
    },
  };
  const target = createPerson({
    id: 'target',
    name: 'Guest',
    seed: 99,
    now: 1000,
    bornAt: -9100,
    sex: 'female',
  });
  const policy = {
    mappingVersion: mapping.version,
    sourceId: source.id,
    targetId: target.id,
    targetNorms: [{ ...norm, id: 'receiver-fast' }],
  };
  return { source, target, mapping, policy };
}

describe('opt-in calendar persona', () => {
  test('carries unpaid, scheduled and future duties, exact understanding and timestamps across host IDs', () => {
    const { source, target, mapping, policy } = fixture();
    const before = snapshot(source),
      opening = snapshot(target);
    const portable = projectCalendarPersona(source, mapping);
    const result = admitCalendarPersona(portable, target, policy);
    const admitted = result.person;
    expect(source).toEqual(before);
    expect(target).toEqual(opening);
    expect(admitted.now).toBe(1000);
    expect(admitted.rng).toEqual(source.rng);
    expect(admitted.conscience.norms).toEqual([{ ...source.conscience.norms[0], normId: 'receiver-fast' }]);
    expect(admitted.agenda.owed).toEqual([
      {
        ofId: 'receiver-original',
        kind: 'abstain',
        actions: [],
        normId: 'receiver-fast',
        violatedBy: ['receiver-eat'],
        reason: 'broken',
        at: 950,
        scheduledAs: 'receiver-makeup',
      },
      {
        ofId: 'receiver-unscheduled',
        kind: 'abstain',
        actions: [],
        normId: 'receiver-fast',
        violatedBy: ['receiver-eat'],
        reason: 'illness',
        at: 960,
      },
    ]);
    expect(admitted.agenda.commitments[0]?.exempt).toEqual({ reason: 'necessity', at: 945 });
    expect(admitted.agenda.commitments[1]).toMatchObject({
      id: 'receiver-makeup',
      makeUpOf: 'receiver-original',
      status: 'pending',
      from: 1100,
      until: 1140,
      exemptWhen: ['illness'],
      firm: true,
    });
    expect(admitted.agenda.commitments[2]).toMatchObject({
      id: 'receiver-future',
      chain: 'receiver-daily',
      recurEvery: 1440,
      recurUntil: 3900,
      from: 1150,
      until: 1170,
      actions: ['receiver-pray'],
      toId: 'self',
      targetId: 'target',
    });
    expect(hasUnresolvedMakeUps(admitted)).toBe(true);
    expect(fingerprint(admitCalendarPersona(portable, target, policy).person)).toBe(
      fingerprint(result.person),
    );
    expect(scheduleMakeUp(admitted, 'receiver-unscheduled', { from: 1300, until: 1340 })).toMatchObject({
      makeUpOf: 'receiver-unscheduled',
      violatedBy: ['receiver-eat'],
      normId: 'receiver-fast',
      status: 'pending',
    });
    expect(restore(snapshot(admitted))).toEqual(admitted);
  });
  test('preserves lapse and paid receipts without inventing payment from missing history', () => {
    const { source, target, mapping, policy } = fixture();
    source.agenda.lapse = { since: 20, missed: 2 };
    const debt = source.agenda.owed?.[1];
    if (!debt) throw Error('fixture');
    debt.reason = 'unconscious';
    debt.lapseSince = 20;
    const made = source.agenda.commitments[1];
    if (!made) throw Error('fixture');
    made.status = 'kept';
    made.from = 60;
    made.until = 90;
    const admitted = admitCalendarPersona(projectCalendarPersona(source, mapping), target, policy).person;
    expect(admitted.agenda.lapse).toEqual({ since: 920, missed: 2 });
    expect(admitted.agenda.owed?.[1]?.lapseSince).toBe(920);
    expect(admitted.agenda.commitments[1]?.status).toBe('kept');
    source.agenda.commitments.splice(1, 1);
    const missing = admitCalendarPersona(projectCalendarPersona(source, mapping), target, policy).person;
    expect(missing.agenda.owed?.[0]?.scheduledAs).toBe('receiver-makeup');
    expect(missing.agenda.commitments.some((c) => c.id === 'receiver-makeup')).toBe(false);
    expect(hasUnresolvedMakeUps(missing)).toBe(true);
  });
  test('carries an exempt released recurrence that still owns its next window', () => {
    const { source, target, mapping, policy } = fixture();
    delete source.agenda.owed;
    source.agenda.commitments = [
      {
        id: 'future',
        kind: 'worship',
        actions: ['pray'],
        from: 10,
        until: 90,
        importance: 0.8,
        status: 'released',
        exempt: { reason: 'illness', at: 50 },
        normId: 'fast',
        chain: 'daily',
        recurEvery: 1440,
      },
    ];
    const portable = projectCalendarPersona(source, mapping);
    const admitted = admitCalendarPersona(portable, target, policy).person;
    expect(admitted.agenda.commitments[0]).toMatchObject({
      id: 'receiver-future',
      status: 'released',
      exempt: { reason: 'illness', at: 950 },
    });
    const originalNext = advanceAgenda(source, source.now).recurred[0];
    const next = advanceAgenda(admitted, admitted.now).recurred[0];
    expect(next).toMatchObject({
      from: (originalNext?.from ?? 0) + 900,
      until: (originalNext?.until ?? 0) + 900,
      status: 'pending',
      chain: 'receiver-daily',
      actions: ['receiver-pray'],
    });
  });
  test('rejects incomplete maps, changed meanings, wrong clocks and malformed calendar before mutation', () => {
    const { source, target, mapping, policy } = fixture();
    const portable = projectCalendarPersona(source, mapping),
      before = snapshot(target);
    const mismatch = structuredClone(policy);
    const exemption = mismatch.targetNorms[0]?.exemptions?.[0];
    if (!exemption) throw Error('fixture');
    exemption.makeUp = false;
    expect(() => admitCalendarPersona(portable, target, mismatch)).toThrow(/semantic/);
    expect(target).toEqual(before);
    expect(() => admitCalendarPersona(portable, { ...target, now: 1001 }, policy)).toThrow(/offset/);
    const incomplete = structuredClone(mapping);
    delete incomplete.calendar.references.commitments.original;
    expect(() => projectCalendarPersona(source, incomplete)).toThrow(/unmapped/);
    const malformed = structuredClone(portable);
    Object.assign(malformed.calendar.owed[0] ?? {}, { extra: true });
    expect(() => validateCalendarPersona(malformed)).toThrow(/field/);
    const dangling = structuredClone(portable);
    const makeUp = dangling.calendar.commitments[1];
    if (!makeUp) throw Error('fixture');
    makeUp.makeUpOf = 'other';
    expect(() => validateCalendarPersona(dangling)).toThrow(/reference/);
    const unknownNorm = structuredClone(portable);
    const held = unknownNorm.calendar.heldNorms[0];
    if (!held) throw Error('fixture');
    held.normId = 'unknown';
    expect(() => validateCalendarPersona(unknownNorm)).toThrow(/definition/);
    const coerced = structuredClone(portable);
    Object.assign(coerced.calendar.commitments[0] ?? {}, { kind: ['worship'], status: ['pending'] });
    expect(() => validateCalendarPersona(coerced)).toThrow(/commitment/);
    const coercedReason = structuredClone(portable);
    Object.assign(coercedReason.calendar.owed[0] ?? {}, { reason: ['broken'] });
    expect(() => validateCalendarPersona(coercedReason)).toThrow(/owed/);
    const cyclic = structuredClone(portable);
    Object.assign(cyclic.calendar, { owed: [cyclic] });
    expect(() => validateCalendarPersona(cyclic)).toThrow(/cyclic/);
  });
  test('keeps default v1 payload exact and schema type usable by Person consumers', () => {
    const { source } = fixture();
    source.agenda.commitments = [];
    delete source.agenda.owed;
    const mapping = { version: 'legacy/1', skills: {} };
    const portable: PersonaProjectionSnapshot = projectPersona(source, mapping);
    const schema: Person['schema'] = portable.source.schema;
    expect(schema).toBe(PERSON_SCHEMA);
    expect(Object.keys(portable)).toEqual([
      'format',
      'mappingVersion',
      'source',
      'name',
      'life',
      'rng',
      'traits',
      'values',
      'health',
      'family',
      'bonds',
      'skills',
      'skillRetention',
      'episodes',
      'commitments',
      'limitations',
    ]);
    expect(portable.format).toBe('hf-persona-state/1');
    // Captured from pre-calendar v1. Only the engine stamp changes on later releases.
    expect(portable.source.engine).toBe(ENGINE_VERSION);
    const priorStamp = { ...portable, source: { ...portable.source, engine: '2.14.1' } };
    expect(createHash('sha256').update(JSON.stringify(priorStamp)).digest('hex')).toBe(
      'a1cbdfc1e56ad0a84bf9e5cc56288bda5ad11d9f9adfa514013ecd28a165cec6',
    );
    expect('calendar' in portable).toBe(false);
  });
});
