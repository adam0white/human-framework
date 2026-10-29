import { expect, it } from 'vitest';
import { CHARACTER_DEFAULTS, characterOwner } from '../src/character/character.ts';
import type { EffectiveParameters, FrameContext, Traits, Values } from '../src/run-schema.ts';

const traits: Traits = {
  honesty: 0.5,
  emotionality: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  conscientiousness: 0.5,
  openness: 0.5,
};
const values: Values = {
  benevolence: 0.5,
  universalism: 0.5,
  tradition: 0.5,
  conformity: 0.5,
  security: 0.5,
  achievement: 0.5,
  power: 0.5,
  hedonism: 0.5,
  stimulation: 0.5,
  selfDirection: 0.5,
};
const effective = { builtins: { CHARACTER_DEFAULTS } } as EffectiveParameters;
const frame: FrameContext = {
  effective,
  effectiveParametersHash: '0'.repeat(64),
  person: 'a',
  at: 0,
  priorAt: 0,
  phase: 0,
  fidelity: { mode: 'fine' },
  worldRevision: 0,
  causes: [],
};
it('matures the always-present character within its drift band', () => {
  const s = characterOwner.initialize({ traits, values }, frame),
    year = 365 * 86400000;
  const result = characterOwner.advance(s, {
    effective,
    effectiveParametersHash: '0'.repeat(64),
    person: 'a',
    from: 0,
    to: year,
    phase: 1,
    fidelity: { mode: 'fine' },
    priorWorldRevision: 0,
    causes: [],
    life: { bornAt: -20 * year, sex: 'female' },
    days: [],
    continuation: { anchor: { at: 0, conditionId: 'initial' }, state: s },
  });
  expect(result.state.traits.honesty).toBeCloseTo(0.503, 12);
  expect(result.state.traits.emotionality).toBeCloseTo(0.4985, 12);
  expect(s.traits.honesty).toBe(0.5);
});
it('rejects malformed character instead of clamping it', () => {
  const s = characterOwner.initialize({ traits, values }, frame);
  s.character.baseTraits.honesty = 2;
  expect(characterOwner.validate(s).length).toBeGreaterThan(0);
});

import {
  CHRONICLE_DEFAULTS,
  chronicleOwner,
  closeChronicleDay,
  noteChronicleOutcome,
} from '../src/chronicle/chronicle.ts';
import type { ChronicleSnapshot, ObservedOutcome } from '../src/run-schema.ts';

const snapshot = () =>
  ({
    habits: [],
    will: { voices: [] },
    body: { alive: true, illnesses: [] },
    conscience: { breaches: [] },
    memory: { episodes: [] },
    affect: { mood: { valence: 0.2 } },
    agenda: { commitments: [] },
    retention: { chronicleDays: 7, trace: 10 },
  }) as unknown as ChronicleSnapshot;
it('closes a lived day from actual snapshot evidence and rejects a duplicate closure', () => {
  const c = {
    ...frame,
    effective: { builtins: { CHRONICLE_DEFAULTS } } as EffectiveParameters,
    snapshot: snapshot(),
  };
  const initial = chronicleOwner.initialize(c);
  initial.open.kept = [{ id: 'call', kind: 'duty', label: 'my call' }];
  const closed = closeChronicleDay(initial, c.snapshot, { ...c, at: 86400000, phase: 6 });
  expect(closed.state.days[0]).toMatchObject({ day: 0, mood: 0.2, kept: [{ id: 'call' }], alive: true });
  expect(closed.state.open.day).toBe(1);
  expect(initial.days).toEqual([]);
  expect(() => closeChronicleDay(closed.state, c.snapshot, { ...c, at: 86400000, phase: 6 })).toThrow();
});
it('counts actual completed actions and material, never requested work', () => {
  const c = {
    ...frame,
    effective: { builtins: { CHRONICLE_DEFAULTS } } as EffectiveParameters,
    snapshot: snapshot(),
  };
  const initial = chronicleOwner.initialize(c);
  const outcome: ObservedOutcome = {
    activityId: 'activity',
    offerId: 'offer',
    actionId: 'work',
    start: 0,
    end: 60000,
    status: 'completed',
    evidenceId: 'receipt',
    actual: { material: 3, exposures: [], observedProgress: [] },
    fulfills: [],
    advances: [],
  };
  const result = noteChronicleOutcome(initial, outcome, [
    { voiceId: 'v', verdict: 'assented', reason: 'advice' },
  ]);
  expect(result.open.actions).toEqual([{ action: 'work', done: 1, prompted: 1, by: { v: 1 } }]);
  expect(result.open.material).toBe(3);
  expect(initial.open.actions).toEqual([]);
});
it('retains only the newest snapshot and folds expired days into the yearbook', () => {
  const c = {
    ...frame,
    effective: { builtins: { CHRONICLE_DEFAULTS } } as EffectiveParameters,
    snapshot: snapshot(),
  };
  let state: ReturnType<typeof chronicleOwner.receive>['state'] = chronicleOwner.initialize(c);
  for (let day = 0; day < 10; day++)
    state = closeChronicleDay(state, c.snapshot, { ...c, at: (day + 1) * 86400000, phase: 6 }).state;
  expect(state.days).toHaveLength(8);
  expect(state.days.slice(0, -1).every((d) => d.state === undefined)).toBe(true);
  expect(state.days.at(-1)?.state).toBeDefined();
  expect(state.years[0]?.days).toBe(2);
});

it('keeps all 365 lived days and actual social duration in annual character experience', () => {
  const year = 365 * 86400000,
    params = { builtins: { CHARACTER_DEFAULTS, CHRONICLE_DEFAULTS } } as EffectiveParameters;
  const c = { ...frame, effective: params, snapshot: snapshot() };
  let state = characterOwner.initialize({ traits, values }, c),
    continuation = { anchor: { at: 0, conditionId: 'initial' }, state };
  const record = closeChronicleDay(chronicleOwner.initialize(c), c.snapshot, {
    ...c,
    at: 86400000,
    phase: 6,
  }).day;
  for (let day = 0; day < 365; day++) {
    const at = (day + 1) * 86400000;
    const advanced = characterOwner.advance(state, {
      effective: params,
      effectiveParametersHash: frame.effectiveParametersHash,
      person: 'a',
      from: day * 86400000,
      to: at,
      phase: 1,
      fidelity: { mode: 'fine' },
      priorWorldRevision: 0,
      causes: [],
      life: { bornAt: -20 * year, sex: 'female' },
      days: [],
      continuation,
    });
    const received = characterOwner.receiveDay(
      advanced.state,
      { ...record, day, mood: -1 },
      { ...c, at, phase: 6, socialMs: 3 * 3600000, continuation: advanced.continuation },
    );
    state = received.state;
    continuation = received.continuation;
  }
  expect(state.character.acc.days).toBe(0);
  expect(state.character.year).toBe(1);
  expect(state.traits.emotionality).toBeCloseTo(0.5085, 9);
  expect(state.traits.extraversion).toBeCloseTo(0.5025, 9);
});

import { createRng } from '../src/core/random.ts';
import type { InheritanceCursor } from '../src/run-schema.ts';

it('derives bounded traits from a detached inheritance cursor with exact draw accounting', () => {
  const identity = { kind: 'inheritance' as const, child: 'child' };
  const cursor: InheritanceCursor = {
    id: 'stream',
    identity,
    origin: { runSeed: 1, identity },
    seed: 1,
    words: createRng(1),
    uniformDraws: 0,
    initializationDraws: 12,
    status: 'active',
  };
  const before = JSON.stringify(cursor),
    one = characterOwner.deriveTraits([traits, traits], cursor);
  expect(one.rng.uniformDraws).toBe(12);
  expect(JSON.stringify(cursor)).toBe(before);
  expect(characterOwner.deriveTraits([traits, traits], cursor)).toEqual(one);
  expect(Object.values(one.traits).every((v) => v >= 0.02 && v <= 0.98)).toBe(true);
});
it('carries actual completed participation duration through close to character', () => {
  const c = {
    ...frame,
    effective: { builtins: { CHRONICLE_DEFAULTS } } as EffectiveParameters,
    snapshot: snapshot(),
  };
  const initial = chronicleOwner.initialize(c),
    outcome = {
      activityId: 'activity',
      offerId: 'o',
      actionId: 'work',
      start: 0,
      end: 60000,
      status: 'completed',
      evidenceId: 'receipt',
      actual: { exposures: [], observedProgress: [] },
      fulfills: [],
      advances: [],
    } as ObservedOutcome;
  const activity = {
    id: 'activity',
    offer: { participants: ['a', 'b'] },
    suggestions: [],
  } as unknown as import('../src/run-schema.ts').ActorActivity;
  const received = chronicleOwner.receive(
    initial,
    {
      kind: 'action-settled',
      requestId: 'r',
      activityId: 'activity',
      disposition: 'completed',
      worldRevision: 0,
    },
    { ...c, at: 60000, settlement: { outcome, activity, kept: [] } },
  );
  expect(chronicleOwner.close(received.state, { ...c, at: 86400000, phase: 6 }).socialMs).toBe(60000);
});

it('uses the same anchored maturation kernel for ten fine/daily trajectories', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const rng = createRng(seed),
      t = { ...traits, honesty: 0.3 + (rng.a / 4294967296) * 0.4 },
      initial = characterOwner.initialize({ traits: t, values }, frame),
      continuation = { anchor: { at: 0, conditionId: `initial:${seed}` }, state: initial };
    const span = {
      effective,
      effectiveParametersHash: frame.effectiveParametersHash,
      person: 'a',
      from: 0,
      to: 100 * 86400000,
      phase: 1 as const,
      priorWorldRevision: 0,
      causes: [],
      life: { bornAt: -20 * 365 * 86400000, sex: 'female' as const },
      days: [],
      continuation,
    };
    const fine = characterOwner.advance(initial, { ...span, fidelity: { mode: 'fine' } }),
      daily = characterOwner.advance(initial, {
        ...span,
        fidelity: { mode: 'daily', dayMs: 86400000, anchor: 0 },
      });
    const middle = characterOwner.advance(initial, { ...span, to: 1234567, fidelity: { mode: 'fine' } }),
      split = characterOwner.advance(middle.state, {
        ...span,
        from: 1234567,
        fidelity: { mode: 'fine' },
        continuation: middle.continuation,
      });
    expect(daily.state).toEqual(fine.state);
    expect(split.state).toEqual(fine.state);
  }
});

import { diffChronicle } from '../src/chronicle/story.ts';

it('compares trust from an older slice using its latest logged change', () => {
  const c = {
    ...frame,
    effective: { builtins: { CHRONICLE_DEFAULTS } } as EffectiveParameters,
    snapshot: snapshot(),
  };
  const day = chronicleOwner.close(chronicleOwner.initialize(c), { ...c, at: 86400000, phase: 6 }).day;
  const before = { ...day, state: undefined, trust: [{ voiceId: 'v', from: 0.5, to: 0.7, delta: 0.2 }] },
    after = { ...day, state: undefined, trust: [{ voiceId: 'v', from: 0.7, to: 0.9, delta: 0.2 }] };
  const lex = { names: { v: 'Mum' }, roles: {}, actions: {}, prefer: 'name' as const };
  expect(diffChronicle([before], [after], lex).changes).toContainEqual({
    kind: 'trust',
    subject: 'v',
    before: 0.7,
    after: 0.9,
  });
});

import { scalarAt } from '../src/body/span.ts';
import {
  characterTraitSegments,
  projectCharacterTrajectory,
  readCharacterTrajectory,
} from '../src/character/character.ts';

it('reads the extracted Character law across an age boundary and both clipping stages', () => {
  const year = 365 * 86400000;
  const initial = characterOwner.initialize({ traits, values }, frame);
  initial.traits.honesty = 0.649;
  initial.character.experience.honesty = 0.01;
  const context = {
    ...frame,
    life: { bornAt: -17 * year, sex: 'female' as const },
    continuation: { anchor: { at: 0, conditionId: 'authored' }, state: initial },
  };
  const path = projectCharacterTrajectory(context),
    original = JSON.stringify(path);
  const samples = [0, year - 1, year, year + 1, 3 * year, 7 * year, 50 * year];
  for (const at of samples) {
    const actual = characterOwner.advance(initial, {
      ...context,
      from: 0,
      to: at,
      phase: 1,
      priorWorldRevision: 0,
      days: [],
    });
    expect(readCharacterTrajectory(path, at)).toEqual({
      traits: actual.state.traits,
      values: actual.state.values,
    });
  }
  const affine = characterTraitSegments(path, 'honesty', 0, 50 * year);
  for (const at of [...samples, ...affine.segments.flatMap((s) => [s.from, s.to, (s.from + s.to) / 2])])
    expect(Math.abs(scalarAt(affine, at) - readCharacterTrajectory(path, at).traits.honesty)).toBeLessThan(
      1e-12,
    );
  const caller = { ...context, at: 1234567 };
  expect(projectCharacterTrajectory(caller).id).toBe(path.id);
  expect(JSON.stringify(path)).toBe(original);
});

it('keeps Character sampler inputs detached through maturation and a value baseline crossing', () => {
  const year = 365.25 * 86400000;
  const initial = characterOwner.initialize({ traits, values }, frame);
  const original = JSON.stringify(initial);
  const context = {
    ...frame,
    life: { bornAt: -17 * year, sex: 'female' as const },
    continuation: { anchor: { at: 0, conditionId: 'authored' }, state: initial },
  };
  const path = projectCharacterTrajectory(context);
  for (const at of [year - 1, year, year + 1, 20 * year]) {
    const actual = characterOwner.advance(initial, {
      ...context,
      from: 0,
      to: at,
      phase: 1,
      priorWorldRevision: 0,
      days: [],
    });
    const reading = readCharacterTrajectory(path, at);
    expect(reading).toEqual({ traits: actual.state.traits, values: actual.state.values });
    expect(Object.isFrozen(reading.traits)).toBe(true);
    expect(Object.isFrozen(reading.values)).toBe(true);
  }
  expect(JSON.stringify(initial)).toBe(original);
});
