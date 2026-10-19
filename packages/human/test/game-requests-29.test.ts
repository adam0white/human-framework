import { describe, expect, test } from 'vitest';
import {
  runCueArm,
  runFulfillsArm,
  runHalfLifeArm,
  runResolveRef,
} from '../examples/game-requests-29-control.ts';
import * as hf from '../src/index.ts';
import {
  type Affordance,
  begin,
  createPerson,
  decide,
  enablePromptings,
  enableReview,
  finish,
  onFinished,
  type Person,
  PROMPTINGS_DEFAULTS,
  practiceAt,
  promise,
  promptingsReading,
  responseCueMatches,
  restore,
  reviewTerms,
  sanitizePromptings,
  snapshot,
} from '../src/index.ts';
import { optInContinuation } from './opt-in-continuation-fixture.ts';

const DAY = 1440;
const adult = (now = 600, extra: Partial<Parameters<typeof createPerson>[0]> = {}): Person =>
  createPerson({ id: 'p', name: 'P', seed: 3, now, bornAt: -30 * 365 * DAY, sex: 'female', ...extra });

describe('several named commitments (2.9.0, Voices 1)', () => {
  test('control: one named keeps the earliest-ending match; two named keep both', () => {
    expect(runFulfillsArm(1).kept).toEqual(['my word to Q']);
    expect(runFulfillsArm(2).kept).toEqual(['my word to Q', 'my call']);
  });

  const two = () => {
    const p = adult();
    const base = { kind: 'promise' as const, from: 600, importance: 0.5, toId: 'self' };
    const a = promise(p, { ...base, label: 'a', actions: ['x'], until: 700 });
    const b = promise(p, { ...base, label: 'b', actions: ['y'], until: 900 });
    const late = promise(p, { ...base, label: 'late', actions: ['y'], from: 2000, until: 2100 });
    const other = promise(p, { ...base, label: 'other', actions: ['z'], until: 650 });
    return { p, a, b, late, other };
  };

  test('only named commitments that are pending and in window are kept, and no implicit match', () => {
    const { p, a, b, late, other } = two();
    const r = onFinished(p, {
      affordanceId: 'z',
      action: 'z',
      status: 'completed',
      at: 640,
      fulfills: [a.id, b.id, late.id],
    });
    expect(r.kept.map((c) => c.label)).toEqual(['a', 'b']);
    expect(late.status).toBe('pending');
    // `other` matches the action but the host named what this act keeps.
    expect(other.status).toBe('pending');
  });

  test('two listed, one eligible: the listed one is kept, not an earlier implicit match', () => {
    const { p, a, late, other } = two();
    const r = onFinished(p, {
      affordanceId: 'z',
      action: 'z',
      status: 'completed',
      at: 640,
      fulfills: [a.id, late.id],
    });
    expect(r.kept.map((c) => c.label)).toEqual(['a']);
    expect([a.status, late.status, other.status]).toEqual(['kept', 'pending', 'pending']);
  });

  test('one listed keeps the earliest-ending match, as before 2.9.0; several listed but none eligible too', () => {
    const one = two();
    expect(
      onFinished(one.p, {
        affordanceId: 'z',
        action: 'z',
        status: 'completed',
        at: 640,
        fulfills: [one.b.id],
      }).kept.map((c) => c.label),
    ).toEqual(['other']);
    const none = two();
    expect(
      onFinished(none.p, {
        affordanceId: 'z',
        action: 'z',
        status: 'completed',
        at: 640,
        fulfills: [none.late.id, 'missing'],
      }).kept.map((c) => c.label),
    ).toEqual(['other']);
  });

  test('an interrupted act keeps none; a named abstention is never kept by an act', () => {
    const { p, a, b } = two();
    expect(
      onFinished(p, {
        affordanceId: 'z',
        action: 'z',
        status: 'interrupted',
        at: 640,
        fulfills: [a.id, b.id],
      }).kept,
    ).toEqual([]);
    const ab = promise(p, {
      kind: 'abstain',
      label: 'quiet',
      actions: [],
      violatedBy: ['shout'],
      from: 600,
      until: 700,
      importance: 0.5,
      toId: 'self',
    });
    const r = onFinished(p, {
      affordanceId: 'z',
      action: 'z',
      status: 'completed',
      at: 640,
      fulfills: [a.id, b.id, ab.id],
    });
    expect(r.kept.map((c) => c.label)).toEqual(['a', 'b']);
    expect(ab.status).toBe('pending');
  });

  test('finish routes Affordance.fulfills: every kept commitment reaches the outcome record', () => {
    const { p, a, b } = two();
    const aff: Affordance = {
      id: 'both',
      action: 'w',
      label: 'both',
      duration: 20,
      effort: 0.1,
      advertises: {},
      fulfills: [a.id, b.id],
    };
    begin(p, aff, decide(p, [aff]));
    finish(p, { affordanceId: 'both', action: 'w', status: 'completed', at: p.now + 20 });
    expect([a.status, b.status]).toEqual(['kept', 'kept']);
  });
});

describe('cued responses (2.9.0, Voices 2)', () => {
  test('control: an uncued response serves every prompt; a cued one only its own, the uncued serves the rest', () => {
    expect(runCueArm(false)).toEqual({
      a: { response: 'r1', turn: -0.64 },
      b: { response: 'r1', turn: -0.64 },
    });
    expect(runCueArm(true)).toEqual({
      a: { response: 'r1', turn: -0.64 },
      b: { response: 'general', turn: -0.16 },
    });
  });

  test('a cue matches the action, a tag, or the opposing norm or goal with or without its prefix', () => {
    const at = { action: 'scroll', tags: ['gossip'], opposedBy: 'norm:n1' };
    for (const cue of ['scroll', 'gossip', 'n1', 'norm:n1']) expect(responseCueMatches(cue, at)).toBe(true);
    for (const cue of ['n2', 'norm', 'alarm', 'goal:n1']) expect(responseCueMatches(cue, at)).toBe(false);
    expect(responseCueMatches('g1', { action: 'x', opposedBy: 'goal:g1' })).toBe(true);
  });

  test('a cued response that matches nothing leaves the prompt passed, with no turning term', () => {
    const p = adult(600, { norms: [{ normId: 'n1', standing: 'forbidden', conviction: 0.4 }] });
    p.habits.push({ cue: { placeId: 'cue' }, action: 'a', strength: 0.7, repetitions: 200, lastAt: 0 });
    enablePromptings(p, { responses: [{ id: 'r', kind: 'refuge', practice: 0.8, cue: 'alarm' }] });
    const a: Affordance = {
      id: 'a',
      action: 'a',
      label: 'a',
      duration: 30,
      effort: 0.05,
      placeId: 'cue',
      norms: [{ normId: 'n1', relation: 'violates' }],
      advertises: {},
    };
    const wait: Affordance = { id: 'w', action: 'w', label: 'w', duration: 30, effort: 0, advertises: {} };
    const r = decide(p, [a, wait]);
    const terms = r.considered.find((c) => c.affordanceId === 'a')?.terms ?? [];
    expect(terms.some((t) => t.source === 'promptings:turn')).toBe(false);
    const rec = p.promptings?.recent.at(-1);
    expect(rec?.outcome).toBe(r.chosenAffordanceId === 'a' ? 'assented' : 'passed');
    expect(rec?.responseId).toBeUndefined();
    expect(p.promptings?.responses[0]?.practice).toBe(0.8);
  });

  test('each response used at a decision point gains practice once', () => {
    const p = adult(600, {
      norms: [
        { normId: 'n1', standing: 'forbidden', conviction: 0.4 },
        { normId: 'n2', standing: 'forbidden', conviction: 0.4 },
      ],
    });
    for (const action of ['a', 'b'])
      p.habits.push({ cue: { placeId: 'cue' }, action, strength: 0.7, repetitions: 200, lastAt: 0 });
    enablePromptings(p, {
      responses: [
        { id: 'r1', kind: 'refuge', practice: 0.8, cue: 'n1' },
        { id: 'general', kind: 'leave', practice: 0.2 },
      ],
    });
    const mk = (id: string, norm: string): Affordance => ({
      id,
      action: id,
      label: id,
      duration: 30,
      effort: 0.05,
      placeId: 'cue',
      norms: [{ normId: norm, relation: 'violates' }],
      advertises: {},
    });
    const wait: Affordance = { id: 'w', action: 'w', label: 'w', duration: 30, effort: 0, advertises: {} };
    const r = decide(p, [mk('a', 'n1'), mk('b', 'n2'), wait]);
    expect(r.chosenAffordanceId).toBe('w');
    const [r1, general] = p.promptings?.responses ?? [];
    expect(r1?.practice).toBeCloseTo(0.8 + PROMPTINGS_DEFAULTS.gainTurned * 0.2, 4);
    expect(general?.practice).toBeCloseTo(0.2 + PROMPTINGS_DEFAULTS.gainTurned * 0.8, 4);
  });

  test('re-enabling sets or clears a cue and keeps practice; the reading shows cues', () => {
    const p = adult();
    enablePromptings(p, { responses: [{ id: 'r', kind: 'refuge', practice: 0.5 }] });
    expect(p.promptings?.responses[0]).not.toHaveProperty('cue');
    enablePromptings(p, { responses: [{ id: 'r', kind: 'refuge', practice: 0.9, cue: 'n1' }] });
    expect(p.promptings?.responses[0]).toMatchObject({ practice: 0.5, cue: 'n1' });
    expect(promptingsReading(p)?.responses[0]).toMatchObject({ cue: 'n1' });
    enablePromptings(p, { responses: [{ id: 'r', kind: 'refuge', cue: '' }] });
    expect(p.promptings?.responses[0]).not.toHaveProperty('cue');
    expect(promptingsReading(p)?.responses[0]).not.toHaveProperty('cue');
  });
});

describe('practice half-life (2.9.0, Voices 5)', () => {
  test('control: a week of disuse at the default and at a 7-day half-life', () => {
    expect(runHalfLifeArm()).toBeCloseTo(0.8 * 0.5 ** (7 / 60), 4);
    expect(runHalfLifeArm(7)).toBeCloseTo(0.4, 4);
  });

  test('practiceAt defaults to 60 days; invalid half-lives are ignored', () => {
    const r = { id: 'r', kind: 'leave' as const, practice: 0.8, lastUsedAt: 0 };
    expect(practiceAt(r, 60 * DAY)).toBeCloseTo(0.4, 6);
    expect(practiceAt(r, 7 * DAY, 7)).toBeCloseTo(0.4, 6);
    for (const bad of [0, -3, Number.NaN, Number.POSITIVE_INFINITY, 1e9]) {
      const p = adult();
      enablePromptings(p, { practiceHalfLifeDays: bad });
      expect(p.promptings).not.toHaveProperty('practiceHalfLifeDays');
    }
  });

  test('cue and half-life survive save and restore; malformed ones are dropped', () => {
    const p = adult();
    enablePromptings(p, { responses: [{ id: 'r', kind: 'leave', cue: 'n1' }], practiceHalfLifeDays: 7 });
    const back = restore(snapshot(p));
    expect(back.promptings?.responses[0]?.cue).toBe('n1');
    expect(back.promptings?.practiceHalfLifeDays).toBe(7);
    const s = sanitizePromptings(
      {
        ...snapshot(p).promptings,
        practiceHalfLifeDays: 'x',
        responses: [{ id: 'r', kind: 'leave', practice: 0.5, lastUsedAt: 0, cue: 7 }],
      },
      p.now,
    );
    expect(s).not.toHaveProperty('practiceHalfLifeDays');
    expect(s?.responses[0]).not.toHaveProperty('cue');
  });
});

describe('a resolve term names its resolve (2.9.0, Pass 8)', () => {
  test('control: the chosen offer carries review:resolve with ref = the resolve key', () => {
    const r = runResolveRef();
    expect(r.chosen).toBe('tend');
    expect(r.term).toEqual({ source: 'review:resolve', value: 0.15, ref: 'promise:self:task' });
  });

  test('two resolves on one option give one term with no ref', () => {
    const p = adult(0);
    enableReview(p);
    if (!p.review) throw new Error('review');
    p.review.resolves = [
      { key: 'promise:self:a', kind: 'promise', strength: 0.5, day: 0, label: 'a' },
      { key: 'promise:self:b', kind: 'promise', strength: 0.5, day: 0, label: 'b' },
    ];
    const base = { kind: 'promise' as const, from: 0, until: 60, importance: 0.5, toId: 'self' };
    const a = promise(p, { ...base, label: 'a', actions: ['x'] });
    const b = promise(p, { ...base, label: 'b', actions: ['x'] });
    const one = reviewTerms(p, [{ source: `commitment:${a.id}`, value: 0.2 }]);
    expect(one).toEqual([{ source: 'review:resolve', value: 0.15, ref: 'promise:self:a' }]);
    const both = reviewTerms(p, [
      { source: `commitment:${a.id}`, value: 0.2 },
      { source: `commitment:${b.id}`, value: 0.2 },
    ]);
    expect(both).toEqual([{ source: 'review:resolve', value: 0.3 }]);
  });

  test('the ref survives save and restore in the trace', () => {
    const p = adult(0);
    enableReview(p);
    if (!p.review) throw new Error('review');
    p.review.resolves = [{ key: 'promise:self:task', kind: 'promise', strength: 0.5, day: 0, label: 'task' }];
    promise(p, {
      kind: 'promise',
      label: 'task',
      actions: ['tend'],
      from: 0,
      until: 120,
      importance: 0.5,
      toId: 'self',
    });
    decide(p, [{ id: 'tend', action: 'tend', label: 'tend', duration: 30, effort: 0.1, advertises: {} }]);
    const back = restore(snapshot(p));
    const term = back.trace.at(-1)?.considered[0]?.terms.find((t) => t.source === 'review:resolve');
    expect(term?.ref).toBe('promise:self:task');
  });
});

describe('legacy continuation (2.9.0)', () => {
  test('a person on the earlier opt-in slices without 2.9.0 options continues exactly as HF 2.8.0', () => {
    // Digests measured 2026-10-19 by the same fixture against the 2.8.0 release source (e32850e), with the engine
    // stamp removed and the new review-term `ref` normalized (it appears, and is counted, only under 2.9.0).
    // Persons using none of the opt-in slices are covered by the npm 2.3.0 digests in game-requests.test.ts.
    const runs = [1, 2, 3].map((seed) => optInContinuation(hf, seed));
    expect(runs.map((r) => r.digest)).toEqual(['7af56da16d1b3414', 'bc43cc68ccab7d8a', 'f39ac2679ae3d0f8']);
    expect(runs.every((r) => r.refs > 0)).toBe(true);
  });
});
