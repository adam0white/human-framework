import { expect, it } from 'vitest';
import { bodyOwner } from '../src/body/body.ts';
import { createRng } from '../src/core/random.ts';
import { familyOwner } from '../src/family/family.ts';
import type { FamilyLifecycleContext, GestationCursor } from '../src/run-schema.ts';
import { frame, initial } from './w1-fixture.ts';

it('conception has a separate persisted stream and delivery needs neither father nor child actor', () => {
  const identity = { kind: 'gestation' as const, mother: 'a', pregnancyId: 'p' };
  const cursor: GestationCursor = {
    id: 'g',
    identity,
    origin: { runSeed: 1, identity },
    seed: 1,
    words: createRng(1),
    uniformDraws: 12,
    initializationDraws: 12,
    status: 'active',
  };
  const ctx: FamilyLifecycleContext = {
    ...frame(),
    life: { bornAt: -30 * 365.25 * 86400000, sex: 'female' },
    body: bodyOwner.initialize(initial(), frame()).state,
    custom: {
      id: 'c',
      minAgeYears: 18,
      forbiddenKin: [],
      guardianForBride: false,
      mourningDays: { widow: 0, widower: 0 },
      maxSpouses: 1,
      pairing: 'any',
      provenance: { kind: 'authored-world', author: 'test', ruleId: 'c', edition: '1' },
      engineeringPremises: [],
    },
    construction: { kind: 'gestation', cursor },
  };
  const input = {
    type: 'conception' as const,
    mother: { kind: 'actor' as const, id: 'a' },
    father: { kind: 'identified' as const, entity: { kind: 'entity' as const, id: 'offscreen' } },
    offspring: { kind: 'entity' as const, id: 'child' },
    pregnancyId: 'p',
    basis: { evidence: { kind: 'evidence' as const, id: 'actual' }, worldRevision: 0 },
  };
  const conceived = familyOwner.receive({ contactCovered: [], aptitudes: {} }, input, ctx);
  expect(conceived.state.pregnancy?.father).toEqual(input.father);
  expect(conceived.construction.kind).toBe('gestation');
  if (conceived.construction.kind === 'gestation')
    expect(conceived.construction.cursor.uniformDraws).toBe(14);
  expect(cursor.uniformDraws).toBe(12);
  const delivered = familyOwner.receive(
    conceived.state,
    {
      type: 'birth',
      child: { kind: 'reference', child: { kind: 'entity', id: 'child' } },
      delivery: { kind: 'open-pregnancy', mother: { kind: 'actor', id: 'a' }, pregnancyId: 'p' },
      basis: input.basis,
    },
    { ...ctx, at: 1 },
  );
  expect(delivered.state.pregnancy).toBeUndefined();
  expect(delivered.memoryReceipts).toHaveLength(1);
  expect(() =>
    familyOwner.receive(
      delivered.state,
      {
        type: 'birth',
        child: { kind: 'reference', child: { kind: 'entity', id: 'child' } },
        delivery: { kind: 'open-pregnancy', mother: { kind: 'actor', id: 'a' }, pregnancyId: 'p' },
        basis: input.basis,
      },
      { ...ctx, at: 1 },
    ),
  ).toThrow('mismatch');
});
