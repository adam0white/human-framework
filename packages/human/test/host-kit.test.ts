import { describe, expect, test } from 'vitest';
import type { Affordance, ConsiderContext, Person, World } from '../src/index.ts';
import {
  actionTendencies,
  adoptGoal,
  communityState,
  consider,
  consume,
  createCommunity,
  createPerson,
  decide,
  lifeModifiers,
  MINUTES_PER_DAY,
  readPerson,
  restore,
  snapshot,
  stepCommunity,
} from '../src/index.ts';

function resident(id = 'resident'): Person {
  return createPerson({
    id,
    name: id,
    seed: 17,
    bornAt: -30 * 365 * MINUTES_PER_DAY,
    sex: 'female',
    norms: [],
    body: { satiety: 1, hydration: 1, sleepPressure: 0, exertion: 0, fitness: 0.5 },
  });
}

function score(p: Person, offer: Affordance) {
  const { body, needs, desperation } = readPerson(p);
  const context: ConsiderContext = {
    now: p.now,
    body,
    needs,
    desperation,
    mods: lifeModifiers(p),
    tendencies: actionTendencies(p),
    habit: { now: p.now },
  };
  return consider(p, offer, context);
}

const offer = (id: string, extra: Partial<Affordance> = {}): Affordance => ({
  id,
  action: id,
  label: id,
  duration: 30,
  effort: 0,
  advertises: {},
  ...extra,
});
const term = (p: Person, a: Affordance, source: string): number =>
  score(p, a).terms.find((t) => t.source === source)?.value ?? 0;

const idleWorld: World = {
  now: () => 0,
  affordancesFor: () => [],
  perceptsFor: () => [],
  resolve: (p, activity, reason) => ({
    at: p.now,
    affordanceId: activity.affordanceId,
    action: activity.action,
    status: reason === 'ended' ? 'completed' : 'interrupted',
    needs: {},
  }),
};

describe('host-kit recipes (docs/host-kit.md)', () => {
  test('water sources tie without travel declarations; declared far effort loses', () => {
    const p = resident();
    consume(p, { water: -0.8 });
    const near = offer('near', { action: 'drink', placeId: 'near-well', advertises: { water: 0.6 } });
    const far = { ...near, id: 'far', placeId: 'far-well' };
    expect(score(p, near).utility).toBe(score(p, far).utility);
    // Duration changes the time spent; effort supplies the immediate choice cost.
    const nearTrip = { ...near, duration: 30, effort: 0.1 };
    const farTrip = { ...far, duration: 150, effort: 0.5 };
    expect(term(p, nearTrip, 'need:water')).toBe(term(p, farTrip, 'need:water'));
    expect(score(p, farTrip).utility).toBeLessThan(score(p, nearTrip).utility);
    expect(decide(p, [farTrip, nearTrip]).chosenAffordanceId).toBe('near');
  });

  test('a host can encode total duration in effort, within the unit bound', () => {
    const p = resident();
    const short = offer('short', { duration: 30, effort: 0.1 });
    const long = offer('long', { duration: 150, effort: 0.1 });
    expect(term(p, long, 'effort')).toBe(term(p, short, 'effort'));
    const scaled = { ...long, effort: Math.min(1, 0.1 * (long.duration / 30)) };
    expect(term(p, short, 'effort')).toBe(-0.0156);
    expect(term(p, scaled, 'effort')).toBe(-0.0781);
    expect(term(p, scaled, 'effort')).toBeCloseTo(5 * term(p, short, 'effort'), 3);
  });

  test('measure need, effort, material and goal terms before tuning a work offer', () => {
    const p = resident();
    consume(p, { food: -0.9 });
    const meal = offer('meal', { advertises: { food: 0.6 }, effort: 0.1 });
    const work = offer('work', { effort: 0.5 });
    const paid = { ...work, material: 10 };
    expect(term(p, meal, 'need:food')).toBe(1.4118);
    expect(term(p, work, 'effort')).toBe(-0.0781);
    expect(term(p, paid, 'material')).toBe(0.6321);
    expect(score(p, paid).utility).toBeGreaterThan(score(p, work).utility);
    expect(score(p, meal).utility).toBeGreaterThan(score(p, paid).utility);
    const purpose = adoptGoal(
      p,
      {
        label: 'finish the work',
        serves: ['competence'],
        advancedBy: [{ action: 'work', amount: 0.5 }],
        importance: 1,
      },
      p.now,
    );
    expect(term(p, work, `goal:${purpose.id}`)).toBe(1);
    expect(score(p, meal).utility).toBeGreaterThan(score(p, work).utility);
    expect(score(p, paid).utility).toBeGreaterThan(score(p, meal).utility);
  });

  test('a stale community prior repeats day hooks; communityState writes new bookkeeping back', () => {
    const p = resident();
    const prior = communityState(createCommunity([p]));
    let dayHooks = 0;
    const world: World = {
      ...idleWorld,
      onDay: () => {
        dayHooks++;
      },
    };
    const c = createCommunity([p], prior);
    stepCommunity(c, world, 60);
    const savedPerson = snapshot(p);
    const writtenBack = communityState(c);
    expect(prior.dayDone).toEqual({});
    expect(writtenBack.dayDone).toEqual({ resident: 0 });
    expect(writtenBack.idleUntil.resident).toBe(75);
    const stale = createCommunity([restore(savedPerson)], prior);
    stepCommunity(stale, world, 90);
    expect(dayHooks).toBe(2);
    const resumed = createCommunity([restore(savedPerson)], writtenBack);
    stepCommunity(resumed, world, 90);
    expect(dayHooks).toBe(2);
    expect(resumed.idleUntil).toEqual(stale.idleUntil);
  });

  test('a seven-day host supplies food and water; offers and elapsed time do not feed residents', () => {
    const caredFor = resident('cared-for');
    const deprived = resident('deprived');
    const c = createCommunity([caredFor, deprived]);
    const world: World = {
      ...idleWorld,
      affordancesFor: () => [
        offer('sleep', { duration: 8 * 60, advertises: { sleep: 0.9 }, tags: ['sleep'] }),
      ],
    };
    for (let until = 6 * 60; until <= 7 * MINUTES_PER_DAY; until += 6 * 60) {
      // Provisioning is an explicit world fact; no food/water outcome is inferred from an offer.
      consume(caredFor, { food: 1, water: 1 });
      stepCommunity(c, world, until, { maxEvents: 0 });
    }
    expect(caredFor.body.alive).toBe(true);
    expect(caredFor.body.health).toBeGreaterThan(0.9);
    expect(caredFor.body.satiety).toBeGreaterThan(0.3);
    expect(caredFor.body.hydration).toBeGreaterThan(0.3);
    expect(deprived.body.satiety).toBe(0);
    expect(deprived.body.hydration).toBe(0);
    expect(deprived.body.alive).toBe(false);
    expect(deprived.body.health).toBe(0);
  });
});
