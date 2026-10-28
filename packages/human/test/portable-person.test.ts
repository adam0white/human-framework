import { describe, expect, it } from 'vitest';
import { admitPortablePerson, projectPortablePerson, validatePortablePerson } from '../src/index.ts';
import type { ActorState } from '../src/run-schema.ts';
import { actor, setup } from './support.ts';

const project = (person: unknown, engine: string) =>
  projectPortablePerson({ castId: 'ada', castRevision: '1', game: 'test', engine, person, history: [] });

describe('portable person', () => {
  it('carries a public HF4 actor through HF3 and back, refusing lost duties and clinical drift', () => {
    const original = actor(setup());
    const passport = project(original, '4.0.0');
    expect(validatePortablePerson(passport)).toEqual(passport);
    expect(() => validatePortablePerson({ ...passport, version: 2 })).toThrow();
    expect(() => project(original, '5.0.0')).toThrow();

    const missing = structuredClone(original) as unknown as Record<string, unknown>;
    delete missing.will;
    expect(() => project(missing, '4.0.0')).toThrow();
    const missingReservoir = structuredClone(original) as unknown as { body: Record<string, unknown> };
    delete missingReservoir.body.depletion;
    expect(() => project(missingReservoir, '4.0.0')).toThrow();
    const active = structuredClone(original) as ActorState;
    active.agenda.owed.push({} as never);
    expect(() => project(active, '4.0.0')).toThrow();

    // Test fixture only: represent the legacy raw body shape using the real actor's values.
    const legacy = structuredClone(original) as unknown as Record<string, unknown> & {
      body: Record<string, unknown>;
    };
    legacy.body.sleepDebt = legacy.body.sleepDebtHours;
    delete legacy.body.sleepDebtHours;
    delete legacy.body.exposures;
    delete legacy.will;
    delete legacy.projects;
    delete legacy.family;
    delete legacy.bonds;
    delete legacy.activity;
    const legacyArrival = admitPortablePerson(passport, legacy);
    const back = project(legacyArrival, '2.23.0');
    const modernArrival = admitPortablePerson(back, { state: original });
    expect(project(modernArrival.state, '4.0.0').state).toEqual(passport.state);
    const drift = structuredClone(original) as ActorState;
    drift.body.health -= Number.EPSILON;
    expect(() => admitPortablePerson(back, { state: drift })).toThrow();
    const painDrift = structuredClone(original) as ActorState;
    painDrift.body.pain += Number.EPSILON;
    expect(() => admitPortablePerson(back, { state: painDrift })).toThrow();
  });
});
