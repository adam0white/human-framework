import { expect, it } from 'vitest';
import { actionForms } from '../src/narrate/lexicon.ts';
import { describeWording, renderProjection } from '../src/narrate/literal.ts';
import { fillTemplate, NARRATION_TEMPLATES, templateSlots } from '../src/narrate/templates.ts';
import type { Lexicon, SuggestionVerdict } from '../src/run-schema.ts';

const lex: Lexicon = { names: {}, roles: {}, actions: {}, prefer: 'name' };

it('renders suggestion verdicts as grammatical first-person outcomes and inflects common actions', () => {
  const verdicts: Record<SuggestionVerdict, string> = {
    assented: 'accepted the advice',
    complied: 'decided to follow the advice',
    deferred: 'put off acting on the advice',
    modified: 'adapted the advice',
    refused: 'refused the advice',
    commanded: 'decided to follow the order',
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
  const review = describeWording(
    { kind: 'review', record: { day: 1, kept: ['Fajr', 'call Mum'], missed: [], resolved: [] } },
    lex,
  );
  if (!review) throw new Error('Missing review narration');
  expect(fillTemplate(review.templates[0]!, review.slots)).toBe(
    'Today I kept the following: the dawn prayer and call Mum.',
  );
  const commitment = describeWording(
    {
      kind: 'commitment-changed',
      commitmentId: 'prayer',
      before: 'pending',
      after: {
        id: 'prayer',
        kind: 'worship',
        actions: ['pray'],
        from: 0,
        until: 1,
        importance: 1,
        status: 'kept',
        label: 'Fajr',
      },
    },
    lex,
  );
  expect(commitment?.slots.label).toBe('the dawn prayer');
  const goal = describeWording(
    {
      kind: 'goal-changed',
      goalId: 'friend',
      before: null,
      after: {
        id: 'friend',
        label: 'make-friend',
        serves: [],
        progress: 0,
        advancedBy: [],
        importance: 1,
        status: 'active',
        adoptedAt: 0,
        completionHalfLifeMs: 1,
        lastAdvancedAt: 0,
        baseImportance: 1,
      },
    },
    lex,
  );
  expect(goal?.slots.label).toBe('making a friend');
  const year = describeWording(
    {
      kind: 'year-closed',
      record: {
        year: 1,
        days: 1,
        routineDays: 1,
        mood: 0,
        moodLow: 0,
        moodHigh: 0,
        kept: 1,
        broken: 1,
        released: 0,
        breaches: 0,
        repairs: 0,
        material: 0,
        decisions: 0,
        actions: [],
        episodes: [],
        illness: [],
        alive: true,
      },
    },
    lex,
  );
  if (!year) throw new Error('Missing year narration');
  expect(fillTemplate(year.templates[0]!, year.slots)).toBe(
    'Across my 1-day record, I kept 1 commitment and did not keep 1 commitment.',
  );
  expect(actionForms('stop', lex)).toEqual({ base: 'stop', past: 'stopped', gerund: 'stopping' });
  expect(actionForms('plan', lex)).toEqual({ base: 'plan', past: 'planned', gerund: 'planning' });
  expect(actionForms('get-up', lex)).toEqual({ base: 'get up', past: 'got up', gerund: 'getting up' });
  expect(actionForms('run', lex)).toEqual({ base: 'run', past: 'ran', gerund: 'running' });
  expect(actionForms('pray', lex)).toEqual({ base: 'pray', past: 'prayed', gerund: 'praying' });
  expect(
    renderProjection({
      kind: 'chronicle-change',
      change: 'unprompted',
      subject: 'worked',
      before: 0,
      after: 1,
    }),
  ).toBe('By the end, I worked without being told.');
  expect(
    renderProjection({
      kind: 'chronicle-change',
      change: 'still-prompted',
      subject: 'prayed the dawn prayer',
      before: 0,
      after: 1,
    }),
  ).toBe('I still prayed the dawn prayer after being prompted.');
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
