import { describe, expect, test } from 'vitest';
import {
  DEFAULT_NEEDS,
  materializeNeeds,
  NEEDS_DEFAULTS,
  needSatisfactionAt,
  needsOwner,
  projectNeedTrajectory,
  readNeedScalar,
  urgency,
} from '../src/needs/needs.ts';
import type { BodyTrajectory, ScalarTrajectory } from '../src/run-schema.ts';
import { characterPath, environmentPath, frame, person, span } from './w2-fixture.ts';

const constant = (value: number): ScalarTrajectory => ({
  from: 0,
  to: 86400000,
  segments: [{ kind: 'constant', from: 0, to: 86400000, value }],
});
const body = (hunger: ScalarTrajectory = constant(0.2)): BodyTrajectory => ({
  id: 'body:condition',
  conditionId: 'condition',
  from: 0,
  to: 86400000,
  fields: [],
  readout: [
    { field: 'perceived-hunger', path: hunger },
    ...(['perceived-thirst', 'perceived-sleepiness', 'perceived-fatigue', 'perceived-pain'] as const).map(
      (field) => ({ field, path: constant(0.2) }),
    ),
  ],
});
const context = () => ({
  character: characterPath(),
  environment: environmentPath(),
  person: 'person',
  traits: {
    honesty: 0.5,
    emotionality: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    conscientiousness: 0.5,
    openness: 0.5,
  },
  values: {
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
  },
  activity: null,
  continuation: { anchor: { at: 0, conditionId: 'condition' }, state: { ...DEFAULT_NEEDS } },
  body: body(),
  forcingPerMinute: { environment: {}, command: {} },
  asleep: false,
  effective: frame().effective,
});

describe('HF4 concurrent needs', () => {
  test('urgency rises with deprivation; every reservoir stays present', () => {
    expect(urgency(0)).toBe(1);
    expect(urgency(0.2)).toBeGreaterThan(urgency(0.6));
    const c = context();
    const state = materializeNeeds(c, 86400000);
    expect(needsOwner.validate(state)).toEqual([]);
    expect(Object.keys(state)).toEqual(Object.keys(DEFAULT_NEEDS));
    expect(state.belonging).toBeLessThan(DEFAULT_NEEDS.belonging);
  });
  test('ambient forcing joins the relaxation equation and materializations preserve the anchor', () => {
    const c = {
      ...context(),
      environment: environmentPath(characterPath(), { beauty: 1, crowding: 1 }),
    };
    const original = structuredClone(c);
    const plain = materializeNeeds(context(), 86400000);
    const final = materializeNeeds(c, 86400000);
    expect(final.leisure).toBeGreaterThan(plain.leisure);
    expect(final.autonomy).toBeLessThan(plain.autonomy);
    for (const t of [1000, 15001, 3600000]) materializeNeeds(c, t);
    expect(materializeNeeds(c, 86400000)).toEqual(final);
    expect(c).toEqual(original);
  });
  test('command and environment forcing share one anchored relaxation law', () => {
    const plain = context();
    const c = {
      ...plain,
      environment: environmentPath(characterPath(), { crowding: 1 }),
      forcingPerMinute: { environment: {}, command: { autonomy: -0.0002 } },
    };
    const rate = Math.LN2 / NEEDS_DEFAULTS.autonomyHalfLife,
      target =
        NEEDS_DEFAULTS.autonomyTarget -
        (frame().effective.builtins.ENVIRONMENT_DEFAULTS.crowdingAutonomyPerHour / 60 + 0.0002) / rate;
    const expected = Math.max(
      0,
      Math.min(1, target + (DEFAULT_NEEDS.autonomy - target) * Math.exp(-rate * 60)),
    );
    expect(materializeNeeds(c, 3600000).autonomy).toBeCloseTo(expected, 12);
    for (const at of [1, 1001, 15000, 1000000]) materializeNeeds(c, at);
    expect(materializeNeeds(c, 3600000).autonomy).toBeCloseTo(expected, 12);
  });
  test('satisfaction follows received perceived body paths and psychological state', () => {
    const c = context();
    const well = needSatisfactionAt(c, 0);
    const hungry = { ...c, body: body(constant(0.99)) };
    expect(needSatisfactionAt(hungry, 0)).toBeLessThan(well);
    const lonely = {
      ...c,
      continuation: { ...c.continuation, state: { ...DEFAULT_NEEDS, belonging: 0.01 } },
    };
    expect(needSatisfactionAt(lonely, 0)).toBeLessThan(well);
  });
  test('quartic path agrees with actual source forcing over changing body conditions', () => {
    const c = {
      ...context(),
      body: body({
        from: 0,
        to: 86400000,
        segments: [{ kind: 'linear', from: 0, to: 86400000, initial: 0.05, ratePerMinute: 0.8 / 1440 }],
      }),
    };
    const trajectory = projectNeedTrajectory(c);
    for (const t of [0, 1001, 1000000, 36000000, 80000000, 86400000])
      expect(Math.abs(readNeedScalar(trajectory.satisfaction, t) - needSatisfactionAt(c, t))).toBeLessThan(
        1e-9,
      );
    expect(projectNeedTrajectory(structuredClone(c))).toEqual(trajectory);
  });
  test('missing perceived body evidence rejects; unknown is not fabricated', () => {
    const c = context();
    expect(() => needSatisfactionAt({ ...c, body: { ...c.body, readout: [] } }, 0)).toThrow(/coverage|lacks/);
    expect(() => materializeNeeds(c, -1)).toThrow(RangeError);
  });
});

test('realized signed rewards change only named reservoirs and reanchor their continuation', () => {
  const previous = { ...DEFAULT_NEEDS };
  const before = structuredClone(previous);
  const receipt = {
    kind: 'realized-outcome' as const,
    evidenceId: 'settled-reward',
    needs: { belonging: 0.2, esteem: -0.1, safety: 1, leisure: -1 },
  };
  const result = needsOwner.receive(previous, receipt, {
    ...frame(3600000),
    continuation: context().continuation,
  });
  expect(result.state).toEqual({
    ...previous,
    belonging: 0.7 + 0.2,
    esteem: 0.5,
    safety: 1,
    leisure: 0,
  });
  expect(previous).toEqual(before);
  expect(result.continuation).toEqual({
    anchor: { at: 3600000, conditionId: 'settled-reward' },
    state: result.state,
  });
  expect(result.continuation.state).not.toBe(result.state);
  expect(result.effects).toEqual({ terms: [], modifiers: [], appraisals: [] });
  expect(result.events).toEqual([]);
  expect(result.nextBoundary).toBeNull();
  expect(result.advancedThrough).toBe(3600000);
  const c = { ...context(), continuation: result.continuation };
  expect(materializeNeeds(c, 3600000)).toEqual(result.state);
  expect(materializeNeeds(c, 7200000).belonging).toBeLessThan(result.state.belonging);
});

import { readCharacterTrajectory } from '../src/character/character.ts';

test('integrates live extraversion rather than substituting an endpoint coefficient', () => {
  const c = context(),
    at = 86400000;
  const start = readCharacterTrajectory(c.character, 0).traits.extraversion;
  const end = readCharacterTrajectory(c.character, at).traits.extraversion;
  const exposure =
    ((Math.LN2 * (at / 60000)) / NEEDS_DEFAULTS.belongingAloneHalfLife) * (0.5 + (start + end) / 2);
  const expected = DEFAULT_NEEDS.belonging * Math.exp(-exposure);
  const actual = materializeNeeds(c, at).belonging;
  expect(Math.abs(actual - expected)).toBeLessThan(1e-12);
  const endpoint =
    DEFAULT_NEEDS.belonging *
    Math.exp(((-Math.LN2 * (at / 60000)) / NEEDS_DEFAULTS.belongingAloneHalfLife) * (0.5 + end));
  expect(Math.abs(actual - endpoint)).toBeGreaterThan(1e-9);
  // Arbitrary materialized snapshots cannot change either the function or its ID.
  const sampled = {
    ...c,
    traits: { ...c.traits, extraversion: end },
    values: readCharacterTrajectory(c.character, 175).values,
  };
  expect(materializeNeeds(sampled, at)).toEqual(materializeNeeds(c, at));
  expect(projectNeedTrajectory(sampled)).toEqual(projectNeedTrajectory(c));
  const changed = { ...c, character: characterPath(frame(), { ...c.traits, extraversion: 0.8 }) };
  expect(projectNeedTrajectory(changed).id).not.toBe(projectNeedTrajectory(c).id);
});

test('keeps actual varying command-forced belonging and crowded autonomy deterministic', () => {
  const c = {
    ...context(),
    environment: environmentPath(characterPath(), { crowding: 0.9 }),
    forcingPerMinute: { environment: {}, command: { belonging: 0.0001 } },
  };
  const before = structuredClone(c),
    final = materializeNeeds(c, 86400000);
  for (const at of [175, 120001, 1145222]) materializeNeeds(c, at);
  expect(materializeNeeds(c, 86400000)).toEqual(final);
  expect(final.belonging).toBeGreaterThan(materializeNeeds(context(), 86400000).belonging);
  expect(final.autonomy).toBeLessThan(materializeNeeds(context(), 86400000).autonomy);
  expect(c).toEqual(before);
});

test('same path identity exposes byte-identical canonical need cells after extra caller targets', () => {
  const c = context(),
    original = projectNeedTrajectory(c);
  const later = projectNeedTrajectory({ ...c, body: { ...c.body, from: 1145222 } });
  expect(later.id).toBe(original.id);
  for (const at of [1145222, 3600000, 80000000])
    expect(readNeedScalar(later.satisfaction, at)).toBe(readNeedScalar(original.satisfaction, at));
});

// SCOPE: host evidence identifiers are opaque; they cannot select numerical policy.
test('keeps policy provenance separate from an authored evidence suffix', () => {
  const c = context();
  c.continuation.anchor.conditionId = 'outcome:daily-cells-v1';
  const reached = materializeNeeds(c, 3600000);
  const fine = needsOwner.advance(reached, {
    ...span(3600000, 7200000),
    socialContext: person().actor.social,
    ...c,
    from: 3600000,
    to: 7200000,
  });
  expect(fine.continuation.anchor).toEqual(c.continuation.anchor);
  expect(fine.state).toEqual(materializeNeeds(c, 7200000));
  const daily = needsOwner.advance(reached, {
    ...span(3600000, 7200000),
    socialContext: person().actor.social,
    ...c,
    from: 3600000,
    to: 7200000,
    fidelity: { mode: 'daily', dayMs: 86400000, anchor: 0 },
  });
  expect(daily.continuation.anchor.at).toBe(3600000);
});
