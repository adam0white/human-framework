import { expect, it } from 'vitest';
import { familyOwner } from '../src/family/family.ts';
import type { UpbringingExposure } from '../src/run-schema.ts';
import { effective, frame } from './w1-fixture.ts';

it('unions actual overlapping contact and preserves zero-warmth attachment exposure', () => {
  const carer: UpbringingExposure['caregivers'][number] = {
    id: 'carer',
    warmth: 0,
    values: {
      benevolence: 0.5,
      universalism: 0.5,
      tradition: 0.5,
      conformity: 0.5,
      security: 0.5,
      achievement: 0.5,
      power: 0.5,
      hedonism: 0.5,
      stimulation: 0.5,
      selfDirection: 0.5,
    },
    norms: [],
    breaches: [],
    moodValence: -1,
    voices: [],
  };
  const ctx = {
    ...frame(86400000),
    effective,
    effectiveParametersHash: '0'.repeat(64),
    person: 'child',
    at: 86400000,
    phase: 1 as const,
    fidelity: { mode: 'daily' as const, dayMs: 86400000 as const, anchor: 0 },
    priorWorldRevision: 0,
    causes: [],
    life: { bornAt: -5 * 365.25 * 86400000, sex: 'female' as const },
    contact: [
      {
        person: 'child',
        caregiver: 'carer',
        evidenceId: 'e1',
        from: 0,
        to: 86400000,
        activities: [],
        observationIds: [],
      },
      {
        person: 'child',
        caregiver: 'carer',
        evidenceId: 'e2',
        from: 0,
        to: 86400000,
        activities: [],
        observationIds: [],
      },
    ],
    caregivers: [carer],
    knownVoices: [],
  };
  const s = { contactCovered: [], aptitudes: {}, attachment: 0.6 };
  const r = familyOwner.receiveContacts(s, ctx.contact, ctx);
  expect(r.state.raisedMs).toBe(86400000);
  expect(r.state.attachment).toBeLessThan(0.6);
  expect(r.upbringing).toHaveLength(1);
  expect(r.upbringing[0]?.caregivers).toHaveLength(1);
  const empty = familyOwner.receiveContacts(s, [], ctx);
  expect(empty.state).toEqual(s);
  expect(empty.upbringing).toEqual([]);
});
it('charges retrospective overlapping caregiver receipts once at delivery without body rewind', async () => {
  const { receiveContacts } = await import('../src/family/family.ts');
  const { frame } = await import('./w1-fixture.ts');
  const caregiver: UpbringingExposure['caregivers'][number] = {
    id: 'A',
    warmth: 0.8,
    values: {
      benevolence: 0.5,
      universalism: 0.5,
      tradition: 0.5,
      conformity: 0.5,
      security: 0.5,
      achievement: 0.5,
      power: 0.5,
      hedonism: 0.5,
      stimulation: 0.5,
      selfDirection: 0.5,
    },
    norms: [],
    breaches: [],
    moodValence: 0.5,
    voices: [],
  };
  const ctx = {
    ...frame(2000000),
    person: 'child',
    life: { bornAt: -5 * 365.25 * 86400000, sex: 'female' as const },
    caregivers: [caregiver, { ...caregiver, id: 'B' }],
    knownVoices: [],
  };
  const contact = (caregiver: string, from: number, to: number, evidenceId: string) => ({
    person: 'child',
    caregiver,
    from,
    to,
    evidenceId,
    activities: [],
    observationIds: [],
  });
  const original = { contactCovered: [], aptitudes: {}, attachment: 0.6 };
  const first = receiveContacts(original, [contact('A', 0, 600000, 'one')], ctx);
  expect(first.state.raisedMs).toBe(600000);
  const second = receiveContacts(
    first.state,
    [contact('A', 300000, 900000, 'two'), contact('B', 300000, 900000, 'three')],
    ctx,
  );
  expect(second.state.raisedMs).toBe(900000);
  expect(second.state.contactCovered).toEqual([{ from: 0, to: 900000 }]);
  expect(second.upbringing[0]?.from).toBe(600000);
  expect(second.upbringing[0]?.caregivers).toHaveLength(2);
  const repeated = receiveContacts(second.state, [contact('B', 120000, 720000, 'four')], ctx);
  expect(repeated.state).toEqual(second.state);
  expect(repeated.upbringing).toEqual([]);
  expect(repeated.advancedThrough).toBe(ctx.at);
  expect(original).toEqual({ contactCovered: [], aptitudes: {}, attachment: 0.6 });
  expect(() => receiveContacts(original, [contact('A', 0, ctx.at + 1, 'future')], ctx)).toThrow(
    'actual reached past',
  );
});
