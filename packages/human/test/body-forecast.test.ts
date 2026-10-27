import { expect, test } from 'vitest';
import { bodyForecastFor, bodyForecastTerm } from '../src/prospection/forecast.ts';
import { offer, person } from './w2-fixture.ts';

test('forecast is a pure conditional projection and requires an authored follow-on', () => {
  const p = person();
  const plain = offer('climb', {
    durationMs: 7200000,
    demands: { effort: 0.8, focus: 0, mode: 'awake', requires: {} },
  });
  const ctx = { ...p.frame, ...p.bodyProjection };
  expect(bodyForecastFor(p.actor.body, plain, ctx)).toEqual([]);
  expect(bodyForecastTerm(p.actor.body, plain, ctx)).toBeUndefined();
  const route = {
    ...plain,
    expected: { ...plain.expected, followedBy: [{ label: 'return', durationMs: 7200000, effort: 0.7 }] },
  };
  const before = structuredClone(p.actor.body);
  const first = bodyForecastFor(p.actor.body, route, ctx);
  expect(first).toEqual(bodyForecastFor(p.actor.body, route, ctx));
  expect(first).toHaveLength(2);
  expect(p.actor.body).toEqual(before);
});
