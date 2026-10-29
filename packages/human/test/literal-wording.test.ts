import { describe, expect, it } from 'vitest';
import { rendererOwner } from '../src/narrate/literal.ts';
import type { Lexicon, RunEvent } from '../src/run-schema.ts';

const lexicon: Lexicon = { names: {}, roles: {}, actions: {}, prefer: 'name' };
const event: RunEvent = {
  id: 'e1',
  at: 0,
  phase: 5,
  person: 'a',
  causeIds: [],
  narration: [],
  data: { kind: 'review', record: { day: 0, missed: ['my call'], kept: [], resolved: ['my call'] } },
};
describe('one semantic renderer', () => {
  it('names the lived lapse and resolve without changing the event', () => {
    const before = JSON.stringify(event);
    const first = rendererOwner.render(event, { kind: 'person', observer: 'a' }, lexicon, 42);
    expect(first[0]?.text).toContain('my call');
    expect(first[0]?.text).toMatch(/[Nn]ext time/);
    expect(rendererOwner.render(event, { kind: 'person', observer: 'a' }, lexicon, 42)).toEqual(first);
    expect(JSON.stringify(event)).toBe(before);
  });
  it('filters another person’s private review before wording', () => {
    expect(rendererOwner.render(event, { kind: 'person', observer: 'b' }, lexicon, 42)).toEqual([]);
  });
  it('tells a listener only the spoken claim, never private deceit or credence', () => {
    const told: RunEvent = {
      ...event,
      data: {
        kind: 'claim-told',
        speaker: 'a',
        listener: 'b',
        deliveryRequestId: 'r',
        claim: {
          prop: 'bridge:open',
          value: true,
          confidence: 0.9,
          speakerCredence: 0.1,
          deceit: true,
          backbiting: false,
          score: 2,
        },
      },
    };
    const text = rendererOwner.render(told, { kind: 'person', observer: 'b' }, lexicon, 1)[0]?.text;
    expect(text).toContain('bridge:open');
    expect(text).not.toMatch(/deceit|0\.1|score/);
    expect(rendererOwner.render(told, { kind: 'person', observer: 'c' }, lexicon, 1)).toEqual([]);
  });
});
