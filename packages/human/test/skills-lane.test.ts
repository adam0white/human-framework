import { expect, test } from 'vitest';
import { skillLevel } from '../src/skills/skills.ts';
import { parameters } from './w2-fixture.ts';

test('retention always reflects accumulated practice while unknown skills use the explicit base', () => {
  const effective = parameters(),
    now = 90 * 86400000;
  const p = {
    now,
    effective,
    skillRetention: { consolidationHours: 300 },
    skills: {
      brief: { level: 0.8, practicedMs: 3600000, lastPracticed: 0 },
      long: { level: 0.8, practicedMs: 1000 * 3600000, lastPracticed: 0 },
    },
  };
  expect(skillLevel(p, 'long')).toBeGreaterThan(skillLevel(p, 'brief'));
  expect(skillLevel(p, 'brief')).toBeGreaterThan(0.05);
  expect(skillLevel(p, 'unknown')).toBe(0.05);
  expect(p.skills.brief.lastPracticed).toBe(0);
});
