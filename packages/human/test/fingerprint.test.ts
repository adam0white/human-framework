import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  createCommunity,
  createPerson,
  createVillage,
  fingerprint,
  MINUTES_PER_DAY,
  PERSON_SCHEMA,
  type Person,
  restore,
  snapshot,
  stepCommunity,
  villagerSpec,
} from '../src/index.ts';

// Find every saved person, including nested scenario/community saves in game fixtures.
function persons(value: unknown): Person[] {
  if (value === null || typeof value !== 'object') return [];
  if ('schema' in value && value.schema === PERSON_SCHEMA) return [value as Person];
  return Object.values(value).flatMap(persons);
}
const fixtures = [
  new URL('./fixtures/', import.meta.url),
  new URL('../../../apps/site/test/fixtures/', import.meta.url),
].flatMap((directory) =>
  readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .map((file) => ({
      file,
      people: persons(JSON.parse(readFileSync(new URL(file, directory), 'utf8'))),
    }))
    .filter(({ people }) => people.length > 0),
);

function roundTrip(p: Person) {
  const before = snapshot(p);
  const digest = fingerprint(p);
  expect(digest).toMatch(/^[0-9a-f]{16}$/);
  expect(fingerprint(restore(snapshot(p)))).toBe(digest);
  expect(fingerprint(restore(JSON.parse(JSON.stringify(p))))).toBe(digest);
  expect(p).toEqual(before);
}

describe('fingerprint: canonical saved form', () => {
  test.each(fixtures)('$file: every saved person survives a round trip', ({ people }) => {
    for (const p of people) roundTrip(p);
  });

  test('fixture discovery covers earlier-engine people', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(3);
    expect(fixtures.flatMap((f) => f.people).some((p) => p.engine === '1.9.0')).toBe(true);
  });

  test('key insertion order and an empty family do not change the digest; meaningful state does', () => {
    const p = createPerson(villagerSpec('özge', 'Özge', 7));
    const q = Object.fromEntries(Object.entries(snapshot(p)).reverse()) as unknown as Person;
    q.body = Object.fromEntries(Object.entries(q.body).reverse()) as unknown as Person['body'];
    q.family = {};
    expect(fingerprint(q)).toBe(fingerprint(p));
    q.rng.a ^= 1;
    expect(fingerprint(q)).not.toBe(fingerprint(p));
    q.rng.a ^= 1;
    q.body.hydration -= 0.01;
    expect(fingerprint(q)).not.toBe(fingerprint(p));
  });

  test('a 30-day village run with optional faculties enabled', () => {
    const people = ['a', 'b', 'c'].map((id, i) =>
      createPerson({
        ...villagerSpec(id, id, i + 1, { others: ['a', 'b', 'c'] }),
        enable: {
          gists: true,
          yearbook: true,
          character: true,
          skillRetention: true,
          fatigueStore: true,
          fullness: true,
          promptings: {},
          review: {},
        },
      }),
    );
    const c = createCommunity(people);
    stepCommunity(c, createVillage(people, { seed: 3 }), 30 * MINUTES_PER_DAY);
    for (const p of c.people) {
      expect(p.now).toBe(30 * MINUTES_PER_DAY);
      expect(p.chronicle?.length).toBeGreaterThan(0);
      expect(p.promptings).toBeDefined();
      expect(p.review).toBeDefined();
      roundTrip(p);
    }
  });
});
