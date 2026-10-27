import { expect, it } from 'vitest';
import { bodyOwner } from '../src/body/body.ts';
import { createRng } from '../src/core/random.ts';
import { canMarry, kinship, partneringOwner, widowhoodMortality } from '../src/partnering/partnering.ts';
import type { KinSnapshot, PartneringContext } from '../src/run-schema.ts';
import { person } from './w2-fixture.ts';
import { effective, frame, initial } from './w1-fixture.ts';

const snapshot: KinSnapshot = {
  at: 0,
  kinRevision: 0,
  hash: '0'.repeat(64),
  roles: [],
  marriages: [],
  scope: {
    id: 's',
    people: [
      { kind: 'entity', id: 'a' },
      { kind: 'entity', id: 'b' },
    ],
    at: 0,
    kinRevision: 0,
    premiseIds: [],
    degrees: 'source-two-step',
    completeness: 'partial',
    basis: { kind: 'evidence', id: 'e' },
  },
  unresolved: [{ kind: 'entity', id: 'missing' }],
};
it('preserves direct kin precedence and does not certify an incomplete negative', () => {
  expect(kinship(snapshot, 'a', 'b').kind).toBe('unknown');
  const direct = {
    ...snapshot,
    roles: [
      {
        id: 'gp',
        from: { kind: 'entity' as const, id: 'a' },
        to: { kind: 'entity' as const, id: 'b' },
        role: 'grandparent' as const,
        basis: { kind: 'evidence' as const, id: 'e' },
      },
    ],
  };
  expect(kinship(direct, 'a', 'b')).toEqual({ kind: 'known', value: 'grandparent' });
});
it('applies factual widowhood once and does not infer death knowledge', () => {
  const state = { courtships: [], marriages: [{ spouseId: 'b', since: -1, mourningDays: 130 }] };
  const ctx: PartneringContext = {
    ...frame(),
    life: { bornAt: -30 * 365.25 * 86400000, sex: 'female' },
    body: bodyOwner.initialize(initial(), frame()).state,
    custom: {
      id: 'c',
      minAgeYears: 18,
      forbiddenKin: [],
      guardianForBride: false,
      mourningDays: { widow: 130, widower: 0 },
      maxSpouses: 1,
      pairing: 'any',
      provenance: { kind: 'authored-world', author: 'test', ruleId: 'c', edition: '1' },
      engineeringPremises: [],
    },
    rng: {
      words: createRng(1),
      identity: {
        id: 'a',
        seed: 1,
        uniformDraws: 12,
        initializationDraws: 12,
        origin: { runSeed: 1, person: 'a' },
      },
    },
    actors: [],
  };
  const input = {
    type: 'death' as const,
    person: { kind: 'actor' as const, id: 'b' },
    basis: { evidence: { kind: 'evidence' as const, id: 'death' }, worldRevision: 0 },
  };
  delete ctx.custom;
  const a = partneringOwner.receive(state, input, ctx),
    b = partneringOwner.receive(a.state, input, { ...ctx, at: 100 });
  expect(b.state).toEqual(a.state);
  expect(a.state.mourning?.until).toBe(130 * 86400000);
  expect(widowhoodMortality(a.state, 'female', 0, effective.builtins.PARTNERING_DEFAULTS)).toBe(1.41);
  expect(a.effects.appraisals).toEqual([]);
});

it('normalizes only received family approval with the original sign and bounded strength law', () => {
  const approval = {
    kind: 'family-approval' as const,
    voiceId: 'received-relative',
    approval: 0.8,
    acceptOfferId: 'accept',
    declineOfferId: 'decline',
    evidenceId: 'received-evidence',
    adviceId: 'received-advice',
  };
  const context = frame();
  const before = structuredClone({ approval, context });
  expect(partneringOwner.familyVoice(approval, context)).toEqual({
    voiceId: 'received-relative',
    affordanceId: 'accept',
    strength: 0.4,
    adviceId: 'received-advice',
  });
  expect(partneringOwner.familyVoice({ ...approval, approval: -0.6 }, context)).toEqual({
    voiceId: 'received-relative',
    affordanceId: 'decline',
    strength: 0.3,
    adviceId: 'received-advice',
  });
  expect(partneringOwner.familyVoice({ ...approval, approval: 3 }, context)?.strength).toBe(1);
  expect(partneringOwner.familyVoice({ ...approval, approval: 0 }, context)).toBeNull();
  expect(partneringOwner.familyVoice({ ...approval, approval: Number.NaN }, context)).toBeNull();
  expect({ approval, context }).toEqual(before);
});

it('requires custom only for marriage and preserves missing kin as unknown', () => {
  const a = person().actor,
    b = structuredClone(a);
  b.id = 'other';
  const context: PartneringContext = {
    ...frame(),
    life: a.life,
    body: a.body,
    actors: [a, b],
    rng: person().cursor,
  };
  const basis = { evidence: { kind: 'evidence' as const, id: 'received' }, worldRevision: 0 };
  const partners = [
    { kind: 'actor' as const, id: a.id },
    { kind: 'actor' as const, id: b.id },
  ] as const;
  context.person = a.id;
  expect(
    partneringOwner.receive(a.bonds, { type: 'courtship-meeting', partners, quality: 1, actionReceipt: 'meeting', basis }, context)
      .state.courtships,
  ).toHaveLength(1);
  expect(() =>
    partneringOwner.receive(
      a.bonds,
      { type: 'marriage', customId: 'custom', kinScopeId: 'scope', acceptedProposal: 'proposal', partners, guardian: { kind: 'known', stance: 'consented', basis: { kind: 'evidence', id: 'guardian' } }, basis },
      context,
    ),
  ).toThrow('missing admitted marriage custom');
  const custom = {
    id: 'custom',
    minAgeYears: 18,
    forbiddenKin: [],
    guardianForBride: false,
    mourningDays: { widow: 130, widower: 0 },
    maxSpouses: 1,
    pairing: 'any' as const,
    provenance: { kind: 'authored-world' as const, author: 'test', ruleId: 'custom', edition: '1' },
    engineeringPremises: [],
  };
  expect(canMarry(a, b, 0, custom, { kind: 'known', stance: 'consented', basis: { kind: 'evidence', id: 'guardian' } })).toEqual({
    kind: 'unknown',
    missing: [
      { kind: 'person', id: a.id },
      { kind: 'person', id: b.id },
    ],
  });
});
