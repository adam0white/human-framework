import { expect, it } from 'vitest';
import { familyOwner } from '../src/family/family.ts';
import { frame } from './w1-fixture.ts';

it('keeps authored overdue pregnancy and unknown father, rejects malformed current data without repairing', () => {
  const pregnancy = {
    id: 'p',
    mother: { kind: 'actor' as const, id: 'a' },
    father: { kind: 'unknown' as const },
    offspring: { kind: 'entity' as const, id: 'child' },
    conceivedAt: -30000000000,
    dueAt: -1,
    basis: { kind: 'authored' as const, evidence: { kind: 'evidence' as const, id: 'history' } },
  };
  const input = { contactCovered: [], aptitudes: { wood: 1.3 }, pregnancy, attachment: 0.7, raisedMs: 1234 };
  const r = familyOwner.initialize(input, frame());
  expect(r).toEqual(input);
  expect(r).not.toBe(input);
  expect(familyOwner.validate(r)).toEqual([]);
  expect(familyOwner.validate({ ...r, contactCovered: [], aptitudes: { wood: 0 } })).not.toEqual([]);
  expect(r.aptitudes.wood).toBe(1.3);
});
