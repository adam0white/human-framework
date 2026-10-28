import { expect, test } from 'vitest';
import { exportRun, inspect, replay, step } from '../src/index.ts';
import {
  PROMPTINGS_DEFAULTS,
  practiceAt,
  promptingsOwner,
  promptingTerms,
} from '../src/promptings/promptings.ts';
import { REVIEW_DEFAULTS, reviewEvidence, reviewOwner } from '../src/review/review.ts';
import { buildParameters } from '../src/run-parameters.ts';
import type { ChronicleDay, EffectiveParameters, FrameContext } from '../src/run-schema.ts';
import { actor, authoredPerson, need, START, setup } from './support.ts';

// The response is learned once, remains bounded, and has its own decay clock.
test('learning adds a response without overwriting an existing one', () => {
  const state = { reading: 'none' as const, responses: [], recent: [], echo: {} };
  const learned = promptingsOwner.learn(
    state,
    { id: 'pause', kind: 'redirect', practice: 0.6, cue: 'gossip' },
    START,
  );
  expect(learned.responses).toEqual([
    { id: 'pause', kind: 'redirect', practice: 0.6, cue: 'gossip', lastUsedAt: START },
  ]);
  expect(() => promptingsOwner.learn(learned, { id: 'pause', kind: 'leave', practice: 1 }, START)).toThrow();
  expect(state.responses).toEqual([]);
  const context = {
    at: START,
    effective: { builtins: { PROMPTINGS_DEFAULTS }, promptings: { practiceHalfLifeDays: 60 } },
  } as FrameContext;
  expect(
    promptingTerms(
      learned,
      {
        action: 'gossip',
        terms: [
          { source: 'habit', value: 0.4 },
          { source: 'norm:backbiting', value: -0.3 },
        ],
        tags: [],
        desperation: 0,
      },
      context,
    ),
  ).toContainEqual({ source: 'promptings:turn', value: -0.48 });
});

test('review style changes preserve prior review and record their source', () => {
  const state = { style: 'none' as const, atMsOfDay: 0, resolves: [], seen: [] };
  const changed = reviewOwner.changeStyle(state, 'accounting', 'player');
  expect(changed).toEqual({
    ...state,
    style: 'accounting',
    styleSource: 'player',
  });
  const open: ChronicleDay = {
    day: 0,
    baseline: { habits: {}, trust: {}, illnesses: {}, openBreaches: [] },
    kept: [],
    broken: [{ id: 'c', kind: 'duty', label: 'call' }],
    released: [],
    actions: [],
    verdicts: [],
    material: 0,
    moodSum: 0,
    moodSamples: 0,
    decisions: 0,
    socialMs: 0,
  };
  const context = {
    at: 1,
    effective: { builtins: { REVIEW_DEFAULTS } } as EffectiveParameters,
    days: [],
    open,
  } as FrameContext & { days: never[]; open: ChronicleDay };
  expect(reviewEvidence(changed, context).state.resolves[0]).toMatchObject({ strength: 0.5 });
});

test('a 3.106 day practice half-life is supported and halves unused practice', () => {
  expect(buildParameters({ promptings: { practiceHalfLifeDays: 3.106 } }).ok).toBe(true);
  expect(
    practiceAt({ id: 'pause', kind: 'leave', practice: 0.8, lastUsedAt: 0 }, 3.106 * 86400000, 3.106),
  ).toBeCloseTo(0.4);
  expect(buildParameters({ promptings: { practiceHalfLifeDays: 0 } }).ok).toBe(false);
});

test('public inputs change both faculties and replay the combined run', () => {
  const run = setup();
  need(
    step(run, {
      until: START,
      inputs: [
        {
          id: 'learn',
          at: START,
          source: { type: 'voice', id: 'player' },
          kind: 'prompting.response-learned',
          payload: { person: 'ada', response: { id: 'pause', kind: 'redirect', practice: 0.6 } },
        },
        {
          id: 'style',
          at: START,
          source: { type: 'voice', id: 'player' },
          kind: 'review.style-changed',
          payload: { person: 'ada', style: 'accounting' },
        },
      ],
    }),
  );
  expect(actor(run).promptings.responses).toContainEqual({
    id: 'pause',
    kind: 'redirect',
    practice: 0.6,
    lastUsedAt: START,
  });
  expect(actor(run).review).toMatchObject({ style: 'accounting', styleSource: 'player' });
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});

test('notebook readings expose current practice and review only to self and host without mutation', () => {
  const run = setup([authoredPerson('ada', 'Ada'), authoredPerson('bora', 'Bora')]);
  need(
    step(run, {
      until: START,
      inputs: [
        {
          id: 'learn',
          at: START,
          source: { type: 'voice', id: 'player' },
          kind: 'prompting.response-learned',
          payload: { person: 'ada', response: { id: 'pause', kind: 'redirect', practice: 0.8 } },
        },
        {
          id: 'style',
          at: START,
          source: { type: 'voice', id: 'player' },
          kind: 'review.style-changed',
          payload: { person: 'ada', style: 'ruminating' },
        },
      ],
    }),
  );
  const before = exportRun(run);
  const read = (perspective: { kind: 'host' } | { kind: 'person'; observer: string }) =>
    need(inspect(run, { perspective, people: ['ada'], select: ['promptings', 'review', 'advice'] }))
      .people[0];
  const own = read({ kind: 'person', observer: 'ada' });
  expect(own?.parts).toContainEqual({
    select: 'promptings',
    value: expect.objectContaining({
      responses: [expect.objectContaining({ id: 'pause', effectivePractice: 0.8 })],
    }),
  });
  expect(own?.parts).toContainEqual({
    select: 'review',
    value: expect.objectContaining({ style: 'ruminating', styleSource: 'player' }),
  });
  expect(own?.parts).toContainEqual({ select: 'advice', value: [] });
  expect(read({ kind: 'host' })?.parts).toEqual(own?.parts);
  expect(read({ kind: 'person', observer: 'bora' })?.parts).toEqual(
    ['promptings', 'review', 'advice'].map((select) => ({ select, value: { kind: 'unobserved' } })),
  );
  expect(exportRun(run)).toEqual(before);
});
