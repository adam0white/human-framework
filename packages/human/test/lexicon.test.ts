import { expect, it } from 'vitest';
import { actionForms, displayName } from '../src/narrate/lexicon.ts';
import type { Lexicon } from '../src/run-schema.ts';

const lex: Lexicon = {
  names: { a: 'Ada' },
  roles: { a: 'my daughter' },
  actions: { forge: { base: 'make a tool', past: 'made a tool', gerund: 'making a tool' } },
  prefer: 'name',
};
it('uses authored names and role preference without changing identifiers', () => {
  expect(displayName('a', lex)).toBe('Ada');
  expect(displayName('a', { ...lex, prefer: 'role' })).toBe('my daughter');
  expect(displayName('unknown', lex)).toBe('unknown');
});
it('retains verb grammar and authored noun/action forms', () => {
  expect(actionForms('eat', lex)).toEqual({ base: 'eat', past: 'ate', gerund: 'eating' });
  expect(actionForms('work-field', lex)).toEqual({
    base: 'work field',
    past: 'worked field',
    gerund: 'working field',
  });
  expect(actionForms('forge', lex)).toEqual(lex.actions.forge);
});
