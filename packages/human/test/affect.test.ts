import { expect, it } from 'vitest';
import { affectOwner, appraiseWithTraits } from '../src/affect/affect.ts';
import { required } from '../src/body/span.ts';
import type { Traits } from '../src/run-schema.ts';
import { characterPath, effective, environmentPath, frame } from './w1-fixture.ts';

const traits: Traits = {
  honesty: 0.8,
  emotionality: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  conscientiousness: 0.5,
  openness: 0.5,
};
it('preserves OCC prospect resolution and victim-specific guilt', () => {
  const x = affectOwner.initialize(
    { mood: { valence: 0, arousal: 0.3 }, regulation: 0.1, emotions: [] },
    frame(),
  );
  const hope = appraiseWithTraits(
    x.state,
    { at: 0, kind: 'prospect', desirability: 1, likelihood: 0.8, cause: 'prospect:visit' },
    traits,
    'a',
    effective.builtins.AFFECT_DEFAULTS,
  );
  expect(hope.emotions[0]?.id).toBe('hope');
  const miss = appraiseWithTraits(
    hope,
    { at: 0, kind: 'outcome', desirability: -1, cause: 'outcome:visit' },
    traits,
    'a',
    effective.builtins.AFFECT_DEFAULTS,
  );
  expect(miss.emotions.some((e) => e.id === 'hope')).toBe(false);
  expect(miss.emotions.some((e) => e.id === 'disappointment')).toBe(true);
  const guilt = appraiseWithTraits(
    x.state,
    {
      at: 0,
      kind: 'deed',
      desirability: -1,
      praiseworthiness: -1,
      agentId: 'a',
      targetId: 'victim',
      cause: 'deed:failure',
    },
    traits,
    'a',
    effective.builtins.AFFECT_DEFAULTS,
  );
  expect(guilt.emotions.find((e) => e.id === 'guilt')?.targetId).toBe('victim');
});
it('uses continuous need forcing and exact emotion decay across materialization targets', () => {
  const run = (times: number[]) => {
    let x = affectOwner.initialize(
      {
        mood: { valence: 0, arousal: 0.3 },
        regulation: 0.1,
        emotions: [{ id: 'joy', intensity: 0.8, cause: 'joy', since: 0, halfLifeMs: 5400000 }],
      },
      frame(),
    );
    let from = 0;
    for (const to of times) {
      const r = affectOwner.advance(x.state, {
        effective,
        effectiveParametersHash: '0'.repeat(64),
        person: 'a',
        from,
        to,
        phase: 1,
        fidelity: { mode: 'fine' },
        priorWorldRevision: 0,
        causes: [],
        continuation: x.continuation,
        traits,
        body: { id: 'b', conditionId: 'b', from: 0, to: 1e8, fields: [], readout: [] },
        needs: {
          id: 'n',
          from: 0,
          to: 1e8,
          satisfaction: { from: 0, to: 1e8, segments: [{ kind: 'constant', from: 0, to: 1e8, value: 0.8 }] },
        },
        moodOffset: 0,
        environment: environmentPath(),
      });
      x = r;
      from = r.advancedThrough;
    }
    return x;
  };
  const a = run([3600000]),
    b = run([500, 700000, 3600000]);
  expect(a.state).toEqual(b.state);
  expect(a.continuation).toEqual(b.continuation);
  expect(required(a.state.emotions[0]).intensity).toBeCloseTo(0.8 * 2 ** (-60 / 90), 12);
  expect(a.state.mood.valence).toBeGreaterThan(0);
});
it('keeps direct feelings, action tendencies, regulation and repair separate from appraisal', () => {
  const x = affectOwner.initialize(
    { mood: { valence: 0, arousal: 0.3 }, regulation: 0.1, emotions: [] },
    frame(),
  );
  const guilt = affectOwner.receive(
    x.state,
    { kind: 'felt', id: 'guilt', intensity: 0.8, cause: 'norm:debt', targetId: 'victim' },
    { ...frame(), traits, continuation: x.continuation },
  );
  expect(affectOwner.tendencies(guilt.state, traits, frame()).values['repair:victim']).toBe(0.8);
  const regulated = affectOwner.receive(
    guilt.state,
    { kind: 'regulated', practice: 'reflection', durationMs: 3600000 },
    { ...frame(), traits, continuation: guilt.continuation },
  );
  expect(regulated.state.emotions.find((e) => e.id === 'guilt')?.intensity).toBe(0.8);
  expect(regulated.state.regulation).toBeGreaterThan(0.1);
  const repaired = affectOwner.receive(
    regulated.state,
    { kind: 'released', filter: { id: 'guilt', targetId: 'victim' }, fraction: 1 },
    { ...frame(), traits, continuation: regulated.continuation },
  );
  expect(repaired.state.emotions).toEqual([]);
});

it('integrates live ambient mood with exact retained cells across extra read targets', () => {
  const environment = environmentPath(characterPath(traits), { crowding: 0.9, dayLengthHours: 6 });
  const run = (times: number[]) => {
    let x = affectOwner.initialize(
        { mood: { valence: 0, arousal: 0.3 }, regulation: 0.1, emotions: [] },
        frame(),
      ),
      from = 0;
    for (const to of times) {
      const r = affectOwner.advance(x.state, {
        ...frame(),
        from,
        to,
        phase: 1,
        priorWorldRevision: 0,
        continuation: x.continuation,
        traits,
        environment,
        moodOffset: from / 1e8,
        body: { id: 'b', conditionId: 'b', from: 0, to: 1e8, fields: [], readout: [] },
        needs: {
          id: 'n',
          from: 0,
          to: 1e8,
          satisfaction: { from: 0, to: 1e8, segments: [{ kind: 'constant', from: 0, to: 1e8, value: 0.8 }] },
        },
      });
      x = r;
      from = r.advancedThrough;
    }
    return x;
  };
  const one = run([86400000]),
    split = run([175, 120001, 1145222, 86400000]);
  expect(split.state).toEqual(one.state);
  expect(split.continuation).toEqual(one.continuation);
  expect(one.continuation.moodOffsetConditionId).toBe(environment.id);
});
