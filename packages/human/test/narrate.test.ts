import { expect, it } from 'vitest';
import { narrate } from '../src/narrate/narrate.ts';
import type { Lexicon, RunEvent } from '../src/run-schema.ts';

const lex: Lexicon = { names: {}, roles: {}, actions: { drink: { base: 'drink water' } }, prefer: 'name' };
it('names the chosen act and its bodily motive with stable wording', () => {
  const event: RunEvent = {
    id: 'd',
    at: 0,
    phase: 4,
    person: 'a',
    causeIds: [],
    narration: [],
    data: {
      kind: 'decision',
      decision: {
        id: 'd',
        at: 0,
        chosenAffordanceId: 'water',
        chosenAction: 'drink',
        intention: '',
        considered: [
          { affordanceId: 'water', action: 'drink', utility: 1, terms: [{ source: 'need:water', value: 1 }] },
        ],
      },
    },
  };
  const before = JSON.stringify(event),
    one = narrate([event], { kind: 'person', observer: 'a' }, lex, 1);
  expect(one[0]?.text).toContain('drink water');
  expect(one[0]?.text).toContain('I need to drink first.');
  expect(narrate([event], { kind: 'person', observer: 'a' }, lex, 1)).toEqual(one);
  expect(JSON.stringify(event)).toBe(before);
});
