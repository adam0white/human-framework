import { expect, it } from 'vitest';
import { qalbControl } from '../examples/qalb-control.ts';
import { createPerson } from '../src/person.ts';
import { qalbReading } from '../src/qalb.ts';
import { seedTie } from '../src/social/social.ts';

it('leaves state, RNG and next decision exactly unchanged', () => {
  expect(qalbControl().continuationIdentical).toBe(true);
});
it('attributes categorical evidence without numbers or aliases, even for distress and low trust', () => {
  const p = createPerson({
    id: 'reader',
    name: 'Reader',
    seed: 13,
    now: 0,
    bornAt: -15768000,
    sex: 'male',
    norms: [{ normId: 'honesty', standing: 'forbidden', conviction: 0.9 }],
    voices: [{ voiceId: 'advisor', trust: 0.1 }],
  });
  p.affect.mood.valence = -0.7;
  p.memory.sourceTrust.teller = 0.8;
  p.memory.episodes.push({
    id: 'e1',
    at: 0,
    kind: 'told',
    valence: 0,
    salience: 1,
    summary: 'News arrived.',
    tags: [],
  });
  seedTie(p, { otherId: 'neighbor', trust: 0.5 });
  const before = structuredClone(p);
  const freeze = (value: object) => {
    for (const child of Object.values(value)) if (child !== null && typeof child === 'object') freeze(child);
    Object.freeze(value);
  };
  freeze(p);
  const rows = qalbReading(p);
  expect(rows.find((r) => r.facet === 'attention')?.evidence).toContain('memory:e1:told');
  expect(rows.find((r) => r.facet === 'held-norm')?.evidence).toContain('norm:honesty');
  expect(rows.filter((r) => r.facet === 'trust').map((r) => r.evidence[0])).toEqual([
    'social.relationships:neighbor',
    'will.voices:advisor',
    'memory.sourceTrust:teller',
  ]);
  expect(rows.every((r) => r.personId === p.id && r.sources.length === 3)).toBe(true);
  const noNumbers = (value: unknown): boolean =>
    typeof value !== 'number' &&
    (typeof value !== 'object' || value === null || Object.values(value).every(noNumbers));
  expect(noNumbers(rows)).toBe(true);
  for (const row of rows) {
    row.evidence.push('external');
    row.sources.length = 0;
    row.text = 'Changed';
  }
  expect(p).toEqual(before);
  expect(qalbReading(p)).not.toEqual(rows);
});
