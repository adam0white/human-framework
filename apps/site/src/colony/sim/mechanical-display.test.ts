import { createPerson } from '@adam0white/human-framework';
import { expect, it } from 'vitest';
import { needsOf } from './human-view.ts';

it('separates injuries from general health reserve in the inspector', () => {
  const p = createPerson({ id: 'p', name: 'P', seed: 1, bornAt: -20 * 365 * 1440, sex: 'male' });
  p.body.injuries.push({ id: 'i', part: 'leg', severity: 0.6, healRatePerDay: 0.1, since: 0 });
  const needs = needsOf(p);
  expect(needs.find((x) => x.id === 'health')?.label).toBe('General health');
  expect(needs.find((x) => x.id === 'injury')).toMatchObject({
    label: 'Injury',
    value: 0.4,
    urgent: true,
  });
});
