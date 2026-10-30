import { expect, it } from 'vitest';
import { ColonyGame } from './game.ts';
import { createFrameworkHumanSide, type FrameworkHumanSide } from './human.ts';
import { needsOf } from './human-view.ts';

it('separates injuries from general health reserve in the inspector', () => {
  const p = structuredClone(
    (new ColonyGame(1, createFrameworkHumanSide).human as FrameworkHumanSide).person('yusuf'),
  );
  p.body.injuries.push({ id: 'i', part: 'leg', severity: 0.6, healRatePerDay: 0.1, since: 0 });
  const needs = needsOf(p);
  expect(needs.find((x) => x.id === 'health')?.label).toBe('General health');
  expect(needs.find((x) => x.id === 'injury')).toMatchObject({
    label: 'Injury',
    value: 0.4,
    urgent: true,
  });
});
