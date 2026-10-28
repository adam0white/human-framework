import { expect, it } from 'vitest';
import { crisisOwner } from '../src/affect/crisis.ts';
import { required } from '../src/body/span.ts';
import { createRng } from '../src/core/random.ts';
import type { ActorRandomCursor, AffectTrajectory } from '../src/run-schema.ts';
import { characterPath, effective, frame } from './w1-fixture.ts';

const mood: AffectTrajectory = {
  id: 'low',
  from: 0,
  to: 1e9,
  valence: { from: 0, to: 1e9, segments: [{ kind: 'constant', from: 0, to: 1e9, value: -1 }] },
  arousal: { from: 0, to: 1e9, segments: [{ kind: 'constant', from: 0, to: 1e9, value: 0.5 }] },
  emotions: [],
};
it('owns reached onset draws, comfort, sleep recovery and refractory state', () => {
  let x = crisisOwner.initialize(frame());
  x = crisisOwner.receive(
    x.state,
    { kind: 'strain', amount: 0.9, receiptId: 'strain' },
    { ...frame(), continuation: x.continuation },
  );
  expect(x.state.stress).toBe(0.9);
  const boundary = {
    key: { kind: 'crisis' as const, channelId: 'onset' },
    operation: 'allocate' as const,
    at: 0,
  };
  const rng: ActorRandomCursor = {
    words: createRng(1),
    identity: {
      id: 'a',
      seed: 1,
      uniformDraws: 12,
      initializationDraws: 12,
      origin: { runSeed: 1, person: 'a' },
    },
  };
  const c = {
    ...frame(),
    continuation: x.continuation,
    rng,
    alive: true,
    asleep: false,
    commandStrainRatePerMinute: 0,
    traits: {
      honesty: 0.5,
      emotionality: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      conscientiousness: 0.5,
      openness: 0.5,
    },
    mood,
  };
  const armed = crisisOwner.commitHazard(x.state, boundary, c);
  expect(armed.rng.identity.uniformDraws).toBe(13);
  const at = crisisOwner.advance(armed.state, {
    effective,
    effectiveParametersHash: '0'.repeat(64),
    person: 'a',
    from: 0,
    to: 86400000,
    phase: 1,
    fidelity: { mode: 'fine' },
    priorWorldRevision: 0,
    causes: [],
    continuation: armed.continuation,
    body: { id: 'b', conditionId: 'b', from: 0, to: 1e9, fields: [], readout: [] },
    mood,
    traits: c.traits,
    character: characterPath(c.traits),
    alive: true,
    asleep: false,
    commandStrainRatePerMinute: 0,
  });
  expect(at.randomBoundary?.operation).toBe('fire');
  const active = crisisOwner.commitHazard(
    at.state,
    { ...boundary, operation: 'fire', at: at.advancedThrough },
    { ...c, at: at.advancedThrough, continuation: at.continuation, rng: armed.rng },
  );
  expect(active.rng.identity.uniformDraws).toBe(15);
  expect(active.state.active?.repertoireId).toBe('unable-to-continue');
  const eased = crisisOwner.receive(
    active.state,
    { kind: 'comfort', receiptId: 'comfort' },
    { ...frame(at.advancedThrough), continuation: active.continuation },
  );
  expect(required(eased.state.active).until).toBeLessThan(required(active.state.active).until);
});

it('integrates ten actual command forcings over 24h with pinned changes and a closed-form oracle', () => {
  const neutral: AffectTrajectory = {
    ...mood,
    id: 'neutral',
    valence: { from: 0, to: 1e9, segments: [{ kind: 'constant', from: 0, to: 1e9, value: 0 }] },
    emotions: [],
  };
  const hour = 3600000;
  const run = (seed: number, step: number, daily: boolean) => {
    let x = crisisOwner.initialize(frame()),
      from = 0,
      oracle = 0;
    const checks = [];
    for (let h = 1; h <= 24; h++) {
      const rate = (seed + 1) * 0.000001 * (h <= 8 ? 1 : h <= 16 ? 2 : 0.5);
      const k = Math.LN2 / effective.builtins.CRISIS_DEFAULTS.stressHalfLife;
      oracle = oracle * Math.exp(-k * 60) + (rate / k) * (1 - Math.exp(-k * 60));
      const end = h * hour;
      while (from < end) {
        const to = Math.min(end, from + step);
        const r = crisisOwner.advance(x.state, {
          effective,
          effectiveParametersHash: frame().effectiveParametersHash,
          person: 'a',
          from,
          to,
          phase: 1,
          fidelity: daily ? { mode: 'daily', dayMs: 86400000, anchor: 0 } : { mode: 'fine' },
          priorWorldRevision: 0,
          causes: [],
          continuation: x.continuation,
          body: { id: 'b', conditionId: 'b', from: 0, to: 1e9, fields: [], readout: [] },
          mood: neutral,
          alive: true,
          asleep: false,
          commandStrainRatePerMinute: rate,
          character: characterPath(),
          traits: {
            honesty: 0.5,
            emotionality: 0.5,
            extraversion: 0.5,
            agreeableness: 0.5,
            conscientiousness: 0.5,
            openness: 0.5,
          },
        });
        expect(r.randomBoundary).toBeNull();
        expect(r.advancedThrough).toBe(to);
        x = r;
        from = to;
      }
      expect(Math.abs(x.state.stress - oracle)).toBeLessThan(daily ? 1e-5 : 1e-9);
      checks.push(x.state);
    }
    return checks;
  };
  for (let seed = 1; seed <= 10; seed++) {
    const canonical = run(seed, hour, false);
    // Daily cells use their published continuous-state comparison limit;
    // fine irregular materializations retain the existing 1e-9 control.
    run(seed, hour, true).forEach((s, i) => {
      const expected = required(canonical[i]);
      expect(Math.abs(s.stress - expected.stress)).toBeLessThan(1e-5);
      expect({ ...s, stress: expected.stress }).toEqual(expected);
    });
    const irregular = run(seed, 777777, false);
    irregular.forEach((s, i) => {
      expect(Math.abs(s.stress - required(canonical[i]).stress)).toBeLessThan(1e-9);
    });
  }
});

import { evaluateCell } from '../src/body/span.ts';
import { readCharacterTrajectory } from '../src/character/character.ts';

it('integrates eligible live emotionality and reaches the same first-ms onset after extra reads', () => {
  const character = characterPath(),
    initial = crisisOwner.initialize(frame());
  const rng: ActorRandomCursor = {
    words: createRng(1),
    identity: {
      id: 'a',
      seed: 1,
      uniformDraws: 0,
      initializationDraws: 12,
      origin: { runSeed: 1, person: 'a' },
    },
  };
  const armed = crisisOwner.commitHazard(
    initial.state,
    { key: { kind: 'crisis', channelId: 'onset' }, operation: 'allocate', at: 0 },
    {
      ...frame(),
      continuation: initial.continuation,
      rng,
      alive: true,
      asleep: false,
      traits: readCharacterTrajectory(character, 0).traits,
      mood,
    },
  );
  const run = (times: number[]) => {
    let x = armed,
      from = 0;
    for (const to of times) {
      const r = crisisOwner.advance(x.state, {
        ...frame(),
        from,
        to,
        phase: 1,
        priorWorldRevision: 0,
        continuation: x.continuation,
        body: { id: 'b', conditionId: 'b', from: 0, to: 1e9, fields: [], readout: [] },
        mood,
        character,
        traits: readCharacterTrajectory(character, from).traits,
        alive: true,
        asleep: false,
        commandStrainRatePerMinute: 0,
      });
      x = { ...x, ...r };
      from = r.advancedThrough;
      if (r.randomBoundary) return r;
    }
    throw new Error('Expected positive-hazard onset');
  };
  const one = run([86400000]),
    split = run([175, 120001, 1145222, 86400000]);
  expect(split.randomBoundary).toEqual(one.randomBoundary);
  expect(split.continuation.clock).toEqual(one.continuation.clock);
  expect(one.randomBoundary?.operation).toBe('fire');
  expect(one.advancedThrough).toBeGreaterThan(0);
  const h = one.continuation.hazard,
    cell = required(h.activeIntegralCell),
    at = one.advancedThrough;
  expect(evaluateCell(cell, at)).toBeGreaterThanOrEqual(required(h.threshold).exponentialBudget);
  expect(evaluateCell(cell, at - 1)).toBeLessThan(required(h.threshold).exponentialBudget);
  // Saturated negative mood makes pressure exactly one: independent trapezoidal intensity oracle.
  const a = readCharacterTrajectory(character, 0).traits.emotionality;
  const b = readCharacterTrajectory(character, at).traits.emotionality;
  const expected = effective.builtins.CRISIS_DEFAULTS.baseHazard * (at / 3600000) * (0.5 + (a + b) / 2);
  expect(Math.abs(evaluateCell(cell, at) - expected)).toBeLessThan(1e-9);
  expect(armed.rng.identity.uniformDraws).toBe(1);
  expect(rng.identity.uniformDraws).toBe(0);
});
