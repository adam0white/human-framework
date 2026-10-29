import { expect, it } from 'vitest';
import { actionForms } from '../src/narrate/lexicon.ts';
import { describeWording } from '../src/narrate/literal.ts';
import { fillTemplate, NARRATION_TEMPLATES, templateSlots } from '../src/narrate/templates.ts';
import type { Lexicon, SuggestionVerdict } from '../src/run-schema.ts';

const lex: Lexicon = { names: {}, roles: {}, actions: {}, prefer: 'name' };

it('renders suggestion verdicts as grammatical first-person outcomes and inflects common actions', () => {
  const verdicts: Record<SuggestionVerdict, string> = {
    assented: 'accepted the advice',
    complied: 'complied with the advice',
    deferred: 'put off acting on the advice',
    modified: 'adapted the advice',
    refused: 'refused the advice',
    commanded: 'followed the order',
  };
  for (const [verdict, phrase] of Object.entries(verdicts)) {
    const wording = describeWording(
      {
        kind: 'suggestion-resolved',
        adviceId: 'advice',
        decisionId: 'decision',
        resolution: { voiceId: 'v', verdict: verdict as SuggestionVerdict, reason: '' },
      },
      lex,
    );
    expect(wording).toBeDefined();
    expect(fillTemplate(wording!.templates[0]!, wording!.slots)).toBe(`I ${phrase}.`);
  }
  expect(actionForms('stop', lex)).toEqual({ base: 'stop', past: 'stopped', gerund: 'stopping' });
  expect(actionForms('plan', lex)).toEqual({ base: 'plan', past: 'planned', gerund: 'planning' });
  expect(actionForms('pray', lex)).toEqual({ base: 'pray', past: 'prayed', gerund: 'praying' });
  for (const key of [
    'review.kept',
    'review.unresolved',
    'review.resolved',
    'prompting.assented',
    'prompting.turned',
    'prompting.other',
    'decision.wait',
    'decision.act',
    'suggestion.resolved',
  ] as const) {
    const variants = NARRATION_TEMPLATES[key];
    expect(new Set(variants).size).toBeGreaterThanOrEqual(4);
    for (const variant of variants) expect(templateSlots(variant)).toEqual(templateSlots(variants[0]!));
    expect(variants.join(' ')).not.toMatch(/God (?:accepted|rejected)|divine ruling/i);
  }
});
