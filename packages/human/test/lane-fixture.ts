/** Minimal person fixture for the memory/social/conversation lane tests: only the slices those modules read. */
import { createRng } from '../src/core/index.ts';
import { createMemory } from '../src/memory/index.ts';
import type { HeldNorm, Person, Relationship, Traits, Values } from '../src/types.ts';

export function lanePerson(
  id: string,
  opts: {
    traits?: Partial<Traits>;
    values?: Partial<Values>;
    norms?: HeldNorm[];
    relationships?: Relationship[];
    now?: number;
  } = {},
): Person {
  return {
    id,
    name: id,
    now: opts.now ?? 0,
    rng: createRng(1),
    traits: {
      honesty: 0.5,
      emotionality: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      conscientiousness: 0.5,
      openness: 0.5,
      ...opts.traits,
    },
    values: { benevolence: 0.5, ...opts.values },
    conscience: { norms: opts.norms ?? [], breaches: [], nextBreach: 0, intentions: [] },
    body: { alive: true },
    memory: createMemory(),
    social: { relationships: opts.relationships ?? [] },
  } as unknown as Person;
}
