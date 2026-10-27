/** Memory-owner source controls only. A large memory span is not a whole-person long-run or timing result. */
import { expect, test } from 'vitest';
import { memoryOwner } from '../src/memory/memory.ts';
import type { AuthoredEpisode, Gist, Offer, Reference } from '../src/run-schema.ts';
import { frame } from './lane-fixture.ts';

const DAY = 86_400_000,
  MINUTE = 60_000;
const offer: Offer = {
  id: 'fish',
  actionId: 'fish',
  person: 'ada',
  label: 'fish',
  durationMs: MINUTE,
  participants: [],
  alongside: [],
  demands: { effort: 0, focus: 0, mode: 'awake', requires: {} },
  tags: [],
  norms: [],
  expected: { needs: {}, followedBy: [], provenance: ['authored-control'] },
  fulfills: [],
  advances: [],
  diminishes: [],
};
const gist = (id: string, action: string, salience: number, extra: Partial<Gist> = {}): Gist => ({
  id,
  action,
  salience,
  at: 0,
  kind: 'outcome',
  valence: -0.8,
  summary: id,
  tags: [],
  count: 1,
  firstAt: 0,
  lastAt: 0,
  weight: 1,
  peak: salience,
  ...extra,
});

test('current gist retrieval distinguishes action, target and place without changing memory', () => {
  const context = { ...frame(), allocations: [] };
  const state = memoryOwner.initialize({ episodes: [], expectations: [] }, context);
  state.gists = [
    gist('g0', 'fish', 0.8, { placeId: 'river' }),
    gist('g1', 'fish', 0.5, { targetId: 'ali' }),
    gist('g2', 'swim', 0.6, { placeId: 'river', valence: 0.5 }),
  ];
  state.nextGist = 3;
  const allocations: Reference[] = state.gists.map((g) => ({ kind: 'gist', id: g.id }));
  expect(memoryOwner.validate(state, allocations)).toEqual([]);
  const before = structuredClone(state);
  const action = memoryOwner.expectedEffect(state, offer, context).gist;
  const target = memoryOwner.expectedEffect(state, { ...offer, target: 'ali' }, context).gist;
  const place = memoryOwner.expectedEffect(
    state,
    { ...offer, actionId: 'wade', place: 'river' },
    context,
  ).gist;
  expect(action?.ids).toEqual(['g0', 'g1']);
  expect(action?.valence).toBeCloseTo(-0.8, 12);
  expect(target?.ids).toEqual(['g1']);
  expect(target?.weight).toBeCloseTo(0.5, 12);
  expect(place?.ids).toEqual(['g0', 'g2']);
  expect(place?.weight).toBeCloseTo(0.7, 12);
  expect(state).toStrictEqual(before);
});

test('weak episodes leave no gist; retained gists stay bounded and meaningful after twenty source years', () => {
  const context = frame(),
    limit = context.effective.builtins.GIST_DEFAULTS.maxGists;
  const episodes: AuthoredEpisode[] = Array.from({ length: limit + 2 }, (_, index) => ({
    id: `e${index}`,
    at: 0,
    kind: 'outcome',
    action: `work:${index}`,
    valence: index === limit + 1 ? 0.1 : -0.8,
    salience: 0.9,
    summary: `history:${index}`,
    tags: [],
    basis: { kind: 'authored', author: 'world' },
    provenance: ['world'],
  }));
  let allocations: Reference[] = episodes.map((e) => ({ kind: 'episode', id: e.id }));
  const initial = memoryOwner.initialize({ episodes, expectations: [] }, { ...context, allocations });
  const continuation = { anchor: { at: 0, conditionId: 'authored-memory' }, state: initial };
  const span = (
    from: number,
    to: number,
    prior: typeof continuation,
  ): Parameters<typeof memoryOwner.advance>[1] => ({
    effective: context.effective,
    effectiveParametersHash: context.effectiveParametersHash,
    person: context.person,
    from,
    to,
    phase: 1,
    fidelity: { mode: 'daily', dayMs: 86_400_000, anchor: 0 },
    priorWorldRevision: 0,
    causes: ['memory-aging'],
    continuation: prior,
    allocations,
  });
  const end = 20 * 365.25 * DAY;
  const folded = memoryOwner.advance(initial, span(0, end, continuation));
  expect(folded.advancedThrough).toBe(context.effective.builtins.GIST_DEFAULTS.horizon * MINUTE + 1);
  expect(folded.state.episodes).toEqual([]);
  expect(folded.state.gists).toHaveLength(limit);
  expect(folded.state.nextGist).toBe(limit + 1);
  expect(folded.state.gists.some((g) => g.summary === `history:${limit + 1}`)).toBe(false);
  allocations = [
    ...allocations,
    ...Array.from({ length: folded.state.nextGist }, (_, index) => ({
      kind: 'gist' as const,
      id: `g${index}`,
    })),
  ];
  const aged = memoryOwner.advance(folded.state, span(folded.advancedThrough, end, folded.continuation));
  const halfway = memoryOwner.advance(
    folded.state,
    span(folded.advancedThrough, end / 2, folded.continuation),
  );
  const resumed = memoryOwner.advance(
    halfway.state,
    span(halfway.advancedThrough, end, halfway.continuation),
  );
  expect(resumed.state).toStrictEqual(aged.state);
  expect(memoryOwner.validate(aged.state, allocations)).toEqual([]);
  const remembered = aged.state.gists[0];
  if (!remembered?.action) throw new Error('Lost the retained emotional history');
  const expected = memoryOwner.expectedEffect(
    aged.state,
    { ...offer, actionId: remembered.action },
    { ...context, at: end },
  );
  expect(expected.gist?.valence ?? 0).toBeLessThan(0);
  expect(expected.gist?.weight ?? 0).toBeGreaterThan(0);
  expect(JSON.parse(JSON.stringify(aged.state))).toStrictEqual(aged.state);
});
