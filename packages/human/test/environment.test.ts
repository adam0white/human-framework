import { expect, it } from 'vitest';
import { ambientMood, ambientNeedRates, environmentOwner } from '../src/environment/environment.ts';
import { effective, frame } from './w1-fixture.ts';

it('retains missing surroundings as unobserved and uses source received effects', () => {
  const s = environmentOwner.initialize(frame());
  expect(s.percept).toEqual({});
  const r = environmentOwner.receive(
    s,
    {
      kind: 'received',
      evidenceId: 'e',
      evidence: {
        contextId: 'room',
        readings: { cold: 1, dark: 1, beauty: -1 },
        basis: { kind: 'received', evidenceId: 'e', at: 0 },
      },
    },
    { ...frame(), alive: true },
  );
  const traits = {
    honesty: 0.5,
    emotionality: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    conscientiousness: 0.5,
    openness: 0.5,
  };
  expect(ambientMood(r.state.percept, traits, false, effective.builtins.ENVIRONMENT_DEFAULTS)).toBeLessThan(
    0,
  );
  expect(
    ambientNeedRates(r.state.percept, traits, effective.builtins.ENVIRONMENT_DEFAULTS).safety,
  ).toBeLessThan(0);
  expect(s.percept).toEqual({});
});

it('owns exact awe intensity and expires only the matching received context', () => {
  const s = environmentOwner.initialize(frame());
  const r = environmentOwner.receive(
    s,
    {
      kind: 'received',
      evidenceId: 'e',
      evidence: {
        contextId: 'garden',
        readings: { beauty: 0.9 },
        basis: { kind: 'received', evidenceId: 'e', at: 0, validUntil: 1000 },
      },
    },
    { ...frame(), alive: true },
  );
  expect(r.affectReceipts).toEqual([
    { kind: 'felt', id: 'awe', intensity: 0.4 * 0.9, cause: 'event:beauty' },
  ]);
  expect(() =>
    environmentOwner.receive(
      r.state,
      { kind: 'expired', contextId: 'garden', basisAt: 1 },
      { ...frame(1000), alive: true },
    ),
  ).toThrow('stale');
  const expired = environmentOwner.receive(
    r.state,
    { kind: 'expired', contextId: 'garden', basisAt: 0 },
    { ...frame(1000), alive: true },
  );
  expect(expired.state.percept).toEqual({});
  expect(expired.affectReceipts).toEqual([]);
});

import { readCharacterTrajectory } from '../src/character/character.ts';
import { readEnvironmentTrajectory } from '../src/environment/environment.ts';
import { characterPath, environmentPath } from './w1-fixture.ts';

it('reads received crowding and season against the same live Character path', () => {
  const character = characterPath(),
    percept = { crowding: 0.9, dayLengthHours: 6 };
  const path = environmentPath(character, percept);
  const original = JSON.stringify(path),
    at = 100 * 365 * 86400000;
  const actual = readEnvironmentTrajectory(path, at, effective),
    traits = readCharacterTrajectory(character, at).traits;
  expect(actual).toEqual({
    moodOffset: ambientMood(percept, traits, false, effective.builtins.ENVIRONMENT_DEFAULTS),
    needsPerMinute: ambientNeedRates(percept, traits, effective.builtins.ENVIRONMENT_DEFAULTS),
  });
  expect(actual).not.toEqual(readEnvironmentTrajectory(path, 0, effective));
  expect(environmentPath(character, { crowding: 0.8 }).id).not.toBe(path.id);
  expect(JSON.stringify(path)).toBe(original);
});
