import { expect, it } from 'vitest';
import { rendererOwner } from '../src/narrate/literal.ts';
import type { Lexicon, RunEvent } from '../src/run-schema.ts';

it('renders a prompting as a thought and response without assigning an external origin', () => {
  const lex: Lexicon = {
    names: {},
    roles: {},
    actions: { gossip: { base: 'repeat the story' } },
    prefer: 'name',
  };
  const event: RunEvent = {
    id: 'prompt',
    at: 0,
    phase: 5,
    person: 'a',
    causeIds: [],
    narration: [],
    data: {
      kind: 'prompting',
      record: {
        at: 0,
        action: 'gossip',
        affordanceId: 'o',
        source: 'habit',
        opposedBy: 'norm:backbiting',
        outcome: 'turned',
        responseId: 'r',
      },
    },
  };
  const text = rendererOwner.render(event, { kind: 'person', observer: 'a' }, lex, 1)[0]?.text;
  expect(text).toContain('repeat the story');
  expect(text).toContain('practised response');
  expect(text).not.toMatch(/Satan|divine|sinful|accepted/i);
});
