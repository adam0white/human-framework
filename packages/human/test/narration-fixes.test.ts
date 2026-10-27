import { expect, it } from 'vitest';
import { rendererOwner } from '../src/narrate/literal.ts';
import type { Lexicon, RunEvent } from '../src/run-schema.ts';

it('uses the admitted audience lexicon for names and hides private claim fields', () => {
  const lex: Lexicon = { names: { speaker: 'Mum' }, roles: {}, actions: {}, prefer: 'name' };
  const e: RunEvent = {
    id: 'tell',
    at: 0,
    phase: 5,
    person: 'speaker',
    causeIds: [],
    narration: [],
    data: {
      kind: 'claim-told',
      speaker: 'speaker',
      listener: 'child',
      deliveryRequestId: 'request',
      claim: {
        prop: 'bridge:open',
        value: true,
        confidence: 0.8,
        speakerCredence: 0.1,
        deceit: true,
        backbiting: false,
        score: 3,
      },
    },
  };
  expect(rendererOwner.render(e, { kind: 'person', observer: 'child' }, lex, 1)[0]?.text).toBe(
    'Mum said that bridge:open is true.',
  );
  expect(rendererOwner.render(e, { kind: 'person', observer: 'stranger' }, lex, 1)).toEqual([]);
});

import { imagine, outwardSigns, selfReport } from '../src/impression.ts';
import type { ActorState, BodyReadout, EffectiveParameters, PersonView } from '../src/run-schema.ts';
import { IMPRESSION_DEFAULTS } from '../src/social/impressions.ts';

it('shows a limp despite reserve while words keep the source stronger reserve and omit the limp', () => {
  const target = {
    traits: { emotionality: 0.5 },
    social: { reserve: {} },
    affect: { mood: { valence: 0.5 }, emotions: [] },
  } as unknown as ActorState;
  const body = { perceived: { fatigue: 1, pain: 0.2 } } as unknown as BodyReadout;
  const effective = { builtins: { IMPRESSION_DEFAULTS } } as EffectiveParameters;
  expect(outwardSigns(target, body, 0, effective).pain).toBe(0.6);
  expect(selfReport(target, body, 0, effective).pain).toBe(0.104);
  expect(outwardSigns(target, body, 0, effective).fatigue).toBe(0.9);
});
it('an imagined other remains the admitted detached view, with unknown fields still unknown', () => {
  const view: Extract<PersonView, { kind: 'other' }> = {
    kind: 'other',
    id: 'b',
    parts: [{ select: 'beliefs', value: { kind: 'unobserved' } }],
  };
  const copy = imagine(view);
  expect(copy).toEqual(view);
  expect(copy).not.toBe(view);
  expect(copy.parts).not.toBe(view.parts);
});
