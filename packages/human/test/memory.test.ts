import { expect, it } from 'vitest';
import { GIST_DEFAULTS, MEMORY_DEFAULTS, memoryOwner } from '../src/memory/memory.ts';
import type { EffectiveParameters, MemoryContext, MemoryOwnedState, SpanContext } from '../src/run-schema.ts';

const effective = { builtins: { MEMORY_DEFAULTS, GIST_DEFAULTS } } as EffectiveParameters;
const ctx: MemoryContext = {
  effective,
  effectiveParametersHash: '0'.repeat(64),
  person: 'a',
  at: 0,
  priorAt: 0,
  phase: 2,
  fidelity: { mode: 'fine' },
  worldRevision: 0,
  causes: ['input'],
  allocations: [],
};
const empty = (): MemoryOwnedState => ({
  episodes: [],
  expectations: [],
  gists: [],
  nextEpisode: 0,
  nextGist: 0,
});
it('rejects duplicate identities and rewound counters, including evicted allocated IDs', () => {
  const state = empty();
  state.nextEpisode = 2;
  expect(memoryOwner.validate(state, [{ kind: 'episode', id: 'e3' }])).toEqual(
    expect.arrayContaining([expect.objectContaining({ code: 'invalid-schema' })]),
  );
  state.episodes = [0, 1].map(() => ({
    id: 'e0',
    at: 0,
    kind: 'outcome',
    valence: 0,
    salience: 0.5,
    summary: 'meal',
    tags: [],
  }));
  expect(memoryOwner.validate(state, [])).toEqual(
    expect.arrayContaining([expect.objectContaining({ code: 'duplicate-id' })]),
  );
});
it('rejects a rewound receive before changing its input', () => {
  const state = empty();
  state.episodes.push({
    id: 'e0',
    at: 0,
    kind: 'outcome',
    valence: 0,
    salience: 0.5,
    summary: 'meal',
    tags: [],
  });
  const before = JSON.stringify(state);
  expect(() => memoryOwner.receive(state, { kind: 'recall', episodeIds: ['e0'] }, ctx)).toThrow();
  expect(JSON.stringify(state)).toBe(before);
});
it('advances decay from the same anchor across fine and daily endpoints', () => {
  const state = empty();
  state.nextEpisode = 1;
  state.episodes.push({
    id: 'e0',
    at: 0,
    kind: 'outcome',
    valence: 0,
    salience: 0.8,
    summary: 'meal',
    tags: [],
  });
  const continuation = { anchor: { at: 0, conditionId: 'initial' }, state };
  const span: SpanContext = {
    effective,
    effectiveParametersHash: '0'.repeat(64),
    person: 'a',
    from: 0,
    to: 86400000,
    phase: 1,
    fidelity: { mode: 'fine' },
    priorWorldRevision: 0,
    causes: [],
  };
  const once = memoryOwner.advance(state, { ...span, allocations: [], continuation });
  const half = memoryOwner.advance(state, { ...span, allocations: [], to: 43200000, continuation });
  const split = memoryOwner.advance(half.state, {
    ...span,
    allocations: [],
    from: 43200000,
    continuation: half.continuation,
  });
  const daily = memoryOwner.advance(state, {
    ...span,
    allocations: [],
    fidelity: { mode: 'daily', dayMs: 86400000, anchor: 0 },
    continuation,
  });
  expect(split.state).toEqual(once.state);
  expect(daily.state).toEqual(once.state);
  expect(once.state.episodes[0]?.salience).toBeCloseTo(0.8 * 2 ** (-1 / 3), 12);
});
it('maternal delivery creates a bounded attributed memory without inventing a father', () => {
  const result = memoryOwner.receiveMaternalBirth(
    empty(),
    {
      kind: 'maternal-birth',
      id: 'birth',
      cause: 'receipt',
      mother: 'a',
      child: { kind: 'entity', id: 'child' },
      at: 0,
      valence: 0.9,
      salience: 0.95,
    },
    ctx,
  );
  expect(result.state.episodes[0]).toMatchObject({
    id: 'e0',
    targetId: 'child',
    valence: 0.9,
    salience: 0.95,
  });
  expect(result.state.nextEpisode).toBe(1);
});
it('stops at the first integer-ms gist horizon and resumes without refolding', () => {
  const state = empty();
  state.nextEpisode = 1;
  state.episodes = [
    { id: 'e0', at: 0, kind: 'outcome', valence: -0.8, salience: 0.8, summary: 'A fall.', tags: [] },
  ];
  const boundary = GIST_DEFAULTS.horizon * 60000 + 1;
  const span: SpanContext = {
    effective,
    effectiveParametersHash: '0'.repeat(64),
    person: 'a',
    from: 0,
    to: boundary + 1000,
    phase: 1,
    fidelity: { mode: 'daily', dayMs: 86400000, anchor: 0 },
    priorWorldRevision: 0,
    causes: [],
  };
  const out = memoryOwner.advance(state, {
    ...span,
    allocations: [],
    continuation: { anchor: { at: 0, conditionId: 'initial' }, state },
  });
  expect(out.advancedThrough).toBe(boundary);
  expect(out.state.episodes).toEqual([]);
  expect(out.state.gists[0]?.count).toBe(1);
  const resumed = memoryOwner.advance(out.state, {
    ...span,
    from: boundary,
    allocations: [
      { kind: 'episode', id: 'e0' },
      { kind: 'gist', id: 'g0' },
    ],
    continuation: out.continuation,
  });
  expect(resumed.state.gists[0]?.count).toBe(1);
  expect(resumed.state.nextGist).toBe(1);
});

import { learnMemoryOutcome } from '../src/memory/memory.ts';
import type { ObservedOutcome, Offer } from '../src/run-schema.ts';

it('learns actual failure with a clamped prediction-error step and ignores interruption', () => {
  const offer = {
    id: 'offer',
    actionId: 'work',
    target: 'field',
    expected: { needs: { competence: 0.8 }, voidsBladder: false },
  } as unknown as Offer;
  const outcome = { status: 'failed', actual: {}, actionId: 'work' } as unknown as ObservedOutcome;
  const learned = learnMemoryOutcome(
    empty(),
    { offer, outcome, realized: { competence: 0 }, felt: -0.8 },
    ctx,
  );
  expect(learned.expectations).toHaveLength(2);
  expect(learned.expectations[0]).toMatchObject({
    samples: 1,
    successRate: 0.65,
    valence: -0.25,
    needs: { competence: 0.55 },
  });
  expect(
    learnMemoryOutcome(
      empty(),
      { offer, outcome: { ...outcome, status: 'interrupted' }, realized: {}, felt: 0 },
      ctx,
    ).expectations,
  ).toEqual([]);
});
it('keeps first-hand gists and uses only a stronger attributed telling', () => {
  const gist = {
    id: 'g0',
    at: 0,
    kind: 'outcome',
    valence: -0.8,
    salience: 0.8,
    summary: 'The bridge shook.',
    tags: [],
    count: 1,
    firstAt: 0,
    lastAt: 0,
    weight: 0.8,
    peak: 0.8,
  };
  const input = {
    requestId: 'r',
    speaker: 'teller',
    reception: { recipient: 'a', evidenceId: 'heard', attention: 1, itemIds: ['item'] },
    items: [{ kind: 'gist' as const, sourceGistId: 'g0', gist }],
  };
  const once = memoryOwner.receiveRetelling(empty(), input, { ...ctx, sourceTrust: 1 }).state;
  expect(once.gists[0]?.salience).toBe(0.48);
  expect(once.gists[0]?.tags).toContain('told');
  const twice = memoryOwner.receiveRetelling(once, input, { ...ctx, sourceTrust: 0.5 }).state;
  expect(twice.gists[0]?.salience).toBe(0.48);
  const firsthand = { ...empty(), gists: [gist], nextGist: 1 };
  expect(memoryOwner.receiveRetelling(firsthand, input, { ...ctx, sourceTrust: 1 }).state.gists).toEqual([
    gist,
  ]);
});
it('strict admission reports malformed and unknown fields without repairing input', () => {
  const invalid = { ...empty(), unexpected: true, episodes: [null] };
  const before = JSON.stringify(invalid);
  expect(() => memoryOwner.validate(invalid as unknown as MemoryOwnedState, [])).not.toThrow();
  expect(memoryOwner.validate(invalid as unknown as MemoryOwnedState, []).length).toBeGreaterThan(0);
  expect(JSON.stringify(invalid)).toBe(before);
});
