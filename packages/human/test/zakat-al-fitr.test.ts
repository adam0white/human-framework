import { expect, test } from 'vitest';
import { spanMeetsWindow } from '../src/agenda/agenda.ts';
import { readZakatAlFitr, zakatAlFitr } from '../src/agenda/fitr.ts';
import { prayerWindows } from '../src/agenda/prayer.ts';
import type { HeldNorm } from '../src/run-schema.ts';

const held: HeldNorm = {
  normId: 'zakat-al-fitr',
  standing: 'obligatory',
  conviction: 0.9,
  provenance: {
    kind: 'religious',
    researchRef: 'research/eid-and-mourning-sources.md#2',
    interpretationRef: 'research/decisions.md#GDI-162',
  },
};
const options = {
  id: 'eid',
  eligible: { kind: 'known' as const, value: true, evidenceIds: ['assessment'] },
  amount: 10,
  from: 0,
  deadline: 3600000,
  action: 'pay',
  normId: 'zakat-al-fitr',
};
test('unknown eligibility and missing held understanding manufacture no payment duty', () => {
  expect(zakatAlFitr([], options)).toBeUndefined();
  expect(zakatAlFitr([held], { ...options, eligible: { kind: 'unobserved' } })).toBeUndefined();
  expect(prayerWindows({ dayIndex: 0, start: 0, windows: [] })).toEqual([]);
});
test('preferred completion and outstanding payment remain distinct after the supplied deadline', () => {
  const plan = zakatAlFitr([held], options);
  if (!plan) throw new Error('Missing held plan');
  expect(readZakatAlFitr(plan, 4, 3600001)).toEqual({ outstanding: 6, deadlinePassed: true });
  expect(spanMeetsWindow({ ...plan.commitment, status: 'pending' }, 0, 3600001)).toBe(false);
  expect(spanMeetsWindow({ ...plan.payment, status: 'pending' }, 0, 3600001)).toBe(true);
});
