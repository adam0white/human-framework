import { expect, it } from 'vitest';
import { actorRuntime, observerCues } from './actor.ts';
import { spousesOf } from './actor-life.ts';
import { newGame } from './night.ts';
import { familyWords, personOf } from './people.ts';

it('admits founders, their named children and the Keeper into one public run', () => {
  const s = newGame(7);
  expect(
    actorRuntime(s).read({ perspective: { kind: 'host' }, people: ['keeper'], select: ['summary'] }).people[0]
      ?.id,
  ).toBe('keeper');
  expect(familyWords(s, 'samira')).toContain('Lena and Pell');
  expect(familyWords(s, 'kian')).toContain('Ada');
  const samira = personOf(s, 'samira');
  expect(samira).toBeDefined();
  if (!samira) throw new Error('Missing Samira');
  expect(spousesOf(samira)).toContain('idris');
  expect(observerCues(s, 'keeper', 'kian').every((c) => c.confidence <= 1)).toBe(true);
  actorRuntime(s).verify();
});
