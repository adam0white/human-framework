/** Routine death integration: sync deaths skip work; routine deaths keep end-of-day batch ordering. */
import { describe, expect, test } from 'vitest';
import { injure } from '../src/body/index.ts';
import { begin, createPerson, decide } from '../src/person.ts';
import { liveCommunity } from '../src/sim/longrun.ts';
import { addPerson, createCommunity, proposeJoint, stepCommunity, type World } from '../src/sim/sim.ts';
import { seedTie } from '../src/social/index.ts';
import { type Affordance, MINUTES_PER_DAY as DAY, MINUTES_PER_YEAR as YEAR } from '../src/types.ts';

const person = (id: string, now = 0, age = 30) =>
  createPerson({ id, name: id, seed: id.charCodeAt(0), now, bornAt: -age * YEAR, sex: 'female' });
const bleed = (p: ReturnType<typeof person>) => {
  injure(p, { part: 'leg', severity: 0.5, bleeding: 1, healRatePerDay: 0 });
  p.body.health = 0.0001;
};
const offer: Affordance = {
  id: 'carry',
  action: 'carry',
  label: 'carry together',
  duration: 20,
  effort: 0,
  advertises: { leisure: 1 },
  tags: ['joint'],
  with: ['b'],
};
const policy = { deathHandling: 'community' } as const;

describe('H2 routine death integration', () => {
  test('entry catch-up skips the newly dead routine and settles waiting proposals even without news', () => {
    for (const tellDeaths of [true, false]) {
      const dead = person('a');
      const friend = person('b', 10);
      seedTie(friend, { otherId: dead.id, roles: ['friend'], affection: 0.8 });
      const c = createCommunity([dead, friend]);
      const proposal = proposeJoint(c, dead, offer, decide(dead, [offer]));
      proposal.accepted.push(friend.id);
      delete c.interrupts.b;
      c.idleUntil.b = 5 * DAY;
      bleed(dead);
      const calls: string[] = [];
      const first = liveCommunity(c, 2 * DAY, {
        ...policy,
        tellDeaths,
        routineFor: (p) => {
          calls.push(p.id);
          return { activities: [] };
        },
      });
      expect(calls).toEqual(['b']);
      expect(first.days.a).toBeUndefined();
      expect(first.events.filter((e) => e.kind === 'died')).toMatchObject([{ personId: 'a', at: DAY }]);
      expect(proposal.status).toBe('declined');
      expect(c.interrupts.b).toMatchObject({ at: DAY, reason: `declined:${proposal.id}` });
      expect(friend.social.relationships[0]?.deceasedAt).toBe(tellDeaths ? DAY : undefined);
      const episodes = friend.memory.episodes.filter((e) => e.summary === 'a died').length;
      const restored = JSON.parse(JSON.stringify(c)) as typeof c;
      const next = liveCommunity(restored, 3 * DAY, { ...policy, routineFor: () => ({ activities: [] }) });
      expect(next.events.filter((e) => e.kind === 'died')).toEqual([]);
      expect(restored.people[1]?.memory.episodes.filter((e) => e.summary === 'a died')).toHaveLength(
        episodes,
      );
    }
  });

  test('dawn catch-up skips a lagging arrival death and normalizes older raw scheduler maps only on opt-in', () => {
    const c = createCommunity([person('b')]);
    // Model raw JSON from before the joint scheduler existed.
    Reflect.deleteProperty(c, 'joint');
    Reflect.deleteProperty(c, 'interrupts');
    const calls: string[] = [];
    const result = liveCommunity(c, 2 * DAY, {
      ...policy,
      onDay: (community, day) => {
        if (day !== 1) return;
        const arrival = person('a', DAY - 10);
        bleed(arrival);
        addPerson(community, arrival);
      },
      routineFor: (p) => {
        calls.push(p.id);
        return { activities: [] };
      },
    });
    expect(calls).toEqual(['b', 'b']);
    expect(result.events.filter((e) => e.kind === 'died')).toMatchObject([{ personId: 'a', at: DAY }]);
    expect(c.joint.proposals).toEqual([]);
    expect(c.interrupts).toEqual({});
    const legacy = createCommunity([person('b')]);
    Reflect.deleteProperty(legacy, 'joint');
    Reflect.deleteProperty(legacy, 'interrupts');
    liveCommunity(legacy, DAY, { routineFor: () => ({ activities: [] }) });
    expect(Object.hasOwn(legacy, 'joint')).toBe(false);
    expect(Object.hasOwn(legacy, 'interrupts')).toBe(false);
  });

  test('routine deaths deliver once after recipients run, with batch-safe proposal settlement', () => {
    for (const tellDeaths of [true, false]) {
      const dead = person('a');
      const friend = person('b');
      seedTie(friend, { otherId: dead.id, roles: ['friend'], affection: 0.8 });
      const c = createCommunity([dead, friend]);
      const proposal = proposeJoint(c, dead, offer, decide(dead, [offer]));
      delete c.interrupts.b;
      // Empty routines consume no draws before mortality. Author a zero first draw; do not search seeds.
      dead.rng = { a: 0, b: 0, c: 0, d: 0 };
      const calls: string[] = [];
      const result = liveCommunity(c, DAY, {
        ...policy,
        tellDeaths,
        lifecourse: { mortality: true },
        routineFor: (p) => {
          calls.push(p.id);
          expect(p.now).toBe(0);
          if (p.id === 'b') expect(p.social.relationships[0]?.deceasedAt).toBeUndefined();
          return { activities: [] };
        },
      });
      expect(calls).toEqual(['a', 'b']);
      expect(dead.body.alive).toBe(false);
      expect(friend.body.alive).toBe(true);
      expect(result.events.filter((e) => e.kind === 'died')).toMatchObject([{ personId: 'a', at: DAY }]);
      expect(friend.social.relationships[0]?.deceasedAt).toBe(tellDeaths ? DAY : undefined);
      expect(friend.memory.episodes.filter((e) => e.summary === 'a died')).toHaveLength(tellDeaths ? 1 : 0);
      expect(proposal.status).toBe('declined');
      expect(c.interrupts.b).toMatchObject({ at: DAY, reason: `declined:${proposal.id}` });
    }
  });
});

test('future-dated finish discovers death at the advanced clock before more offers; omitted policy stays legacy', () => {
  for (const enabled of [true, false]) {
    const dead = person('a');
    const friend = person('b');
    seedTie(friend, { otherId: dead.id, roles: ['friend'], affection: 0.8 });
    const task: Affordance = {
      id: 'work',
      action: 'work',
      label: 'work',
      duration: 1,
      effort: 0,
      advertises: { competence: 1 },
    };
    begin(dead, task, decide(dead, [task]));
    injure(dead, { part: 'leg', severity: 0.5, bleeding: 1, healRatePerDay: 0 });
    dead.body.health = 0.01;
    const c = createCommunity([dead, friend]);
    // An unanswered proposal involving the dying participant must be released by discovery.
    const pending = proposeJoint(c, friend, { ...offer, with: ['a'] }, decide(friend, [offer]));
    c.idleUntil[friend.id] = 200; // Keep the proposer waiting until the dying participant's event.
    let deadOffers = 0;
    const world: World = {
      now: () => 1,
      affordancesFor: (p) => {
        if (p.id === 'a' && !p.body.alive) {
          deadOffers++;
          // Legacy mirror validation declines before asking the host for this dead person's offers.
          expect(pending.status).toBe('declined');
        }
        return [];
      },
      perceptsFor: () => [],
      resolve: (_p, act) => ({
        at: 100,
        status: 'completed',
        affordanceId: act.affordanceId,
        action: act.action,
      }),
    };
    const events = stepCommunity(c, world, 1, enabled ? policy : {});
    expect(dead.body.alive).toBe(false);
    expect(dead.now).toBe(100);
    expect(events.filter((e) => e.kind === 'finish')).toMatchObject([{ personId: 'a', at: 1 }]);
    expect(events.filter((e) => e.kind === 'died')).toEqual(
      enabled ? [{ at: 100, personId: 'a', kind: 'died', detail: 'a died' }] : [],
    );
    expect(deadOffers).toBe(enabled ? 0 : 1);
    // Legacy declines through its later mirror refusal; opt-in cleans up before any more offers.
    expect(pending.status).toBe('declined');
    expect(friend.social.relationships[0]?.deceasedAt).toBe(enabled ? 100 : undefined);
    expect(stepCommunity(c, world, 101, enabled ? policy : {}).filter((e) => e.kind === 'died')).toEqual([]);
  }
});
