import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { deathDispatchControl } from '../examples/death-dispatch-control.ts';
import { BELIEF_DEFAULTS } from '../src/beliefs/index.ts';
import { die, enableDoze, injure } from '../src/body/index.ts';
import { marry, spousesOf } from '../src/partnering/index.ts';
import { begin, createPerson, decide } from '../src/person.ts';
import {
  acceptJoint,
  createCommunity,
  proposeJoint,
  stepCommunity,
  tellDeath,
  type World,
} from '../src/sim/sim.ts';
import { seedTie } from '../src/social/index.ts';
import { type Affordance, ENGINE_VERSION } from '../src/types.ts';

const person = (id: string, sex: 'male' | 'female' = 'female') =>
  createPerson({ id, name: id, seed: id.charCodeAt(0), now: 0, bornAt: -15_000_000, sex });
const world: World = {
  now: () => 10,
  affordancesFor: () => [],
  perceptsFor: () => [],
  resolve: (p, a) => ({ status: 'completed', affordanceId: a.affordanceId, action: a.action, at: p.now }),
};
const policy = { deathHandling: 'community' } as const;
function bleed(p: ReturnType<typeof person>) {
  injure(p, { part: 'leg', severity: 0.5, bleeding: 1, healRatePerDay: 0 });
  p.body.health = 0.0001;
}
function family() {
  const dead = person('a', 'male');
  const spouse = person('b');
  const friend = person('c');
  if (!marry(dead, spouse, 0).ok) throw new Error('test marriage failed');
  seedTie(friend, { otherId: dead.id, roles: ['friend'], affection: 0.8 });
  const c = createCommunity([dead, spouse, friend]);
  c.idleUntil = { a: 20, b: 20, c: 20 };
  return { dead, spouse, friend, c };
}
const joint: Affordance = {
  id: 'carry',
  action: 'carry',
  label: 'carry together',
  duration: 20,
  effort: 0,
  advertises: { leisure: 1 },
  tags: ['joint'],
  with: ['b', 'c'],
};

describe('opt-in community death discovery', () => {
  test('headless catch-up control dispatches once across plain JSON restore', () => {
    expect(deathDispatchControl()).toEqual({
      deaths: [{ id: 'a', at: 10 }],
      deceasedAt: 10,
      repeatedDeaths: 0,
    });
  });

  test('catch-up marks friends and widows an attended spouse at discovery, exactly once', () => {
    const { dead, spouse, friend, c } = family();
    bleed(dead);
    const events = stepCommunity(c, world, 10, policy);
    expect(events.filter((e) => e.kind === 'died')).toMatchObject([{ personId: 'a', at: 10 }]);
    for (const q of [spouse, friend])
      expect(q.social.relationships.find((r) => r.otherId === dead.id)?.deceasedAt).toBe(10);
    expect(spouse.bonds?.marriages[0]).toMatchObject({ end: 'widowed', endedAt: 10 });
    const episodes = spouse.memory.episodes.filter((e) => e.summary === 'a died').length;
    expect(stepCommunity(c, world, 12, policy).filter((e) => e.kind === 'died')).toEqual([]);
    expect(spouse.memory.episodes.filter((e) => e.summary === 'a died')).toHaveLength(episodes);
  });

  test('normal event-time and day-hook deaths each dispatch once', () => {
    const { dead, c } = family();
    c.idleUntil.a = 10;
    bleed(dead);
    expect(stepCommunity(c, world, 10, policy).filter((e) => e.kind === 'died')).toHaveLength(1);
    const other = family();
    other.c.idleUntil.a = 0;
    expect(
      stepCommunity(other.c, { ...world, onDay: (p) => die(p) }, 0, policy).filter((e) => e.kind === 'died'),
    ).toMatchObject([{ personId: 'a', at: 0 }]);
  });

  test('a dead proposer releases accepted waiters even with notices disabled', () => {
    const { dead, spouse, friend, c } = family();
    const proposal = proposeJoint(c, dead, joint, decide(dead, [joint]));
    proposal.accepted.push(spouse.id);
    delete c.interrupts.b;
    delete c.interrupts.c;
    c.idleUntil.b = 20;
    c.idleUntil.c = 20;
    bleed(dead);
    const events = stepCommunity(c, world, 10, { ...policy, tellDeaths: false });
    expect(proposal.status).toBe('declined');
    expect(c.interrupts.b).toMatchObject({ at: 10, reason: `declined:${proposal.id}` });
    expect(c.interrupts.c).toMatchObject({ at: 10, reason: `declined:${proposal.id}` });
    expect(events.filter((e) => e.kind === 'died')).toHaveLength(1);
    expect(spousesOf(spouse)).toEqual(['a']);
    expect(friend.social.relationships[0]?.deceasedAt).toBeUndefined();
    expect(stepCommunity(c, world, 11, policy).filter((e) => e.kind === 'died')).toEqual([]);
  });

  test('joint synchronization cannot begin any participant after a partner dies during catch-up', () => {
    const a = person('a');
    const b = person('b');
    const c = createCommunity([a, b]);
    const offer = { ...joint, with: ['b'] };
    const proposal = proposeJoint(c, a, offer, decide(a, [offer]));
    a.now = 10;
    bleed(b);
    const events: { kind: string }[] = [];
    expect(acceptJoint(c, world, proposal, b, decide(b, [offer]), (e) => events.push(e), policy)).toEqual([]);
    expect(proposal.status).toBe('declined');
    expect(a.activity).toBeNull();
    expect(b.activity).toBeNull();
    expect(events.filter((e) => e.kind === 'died')).toHaveLength(1);
  });

  test('joint preflight finishes later participants before starting anyone, then uses their resulting clock', () => {
    for (const dying of [true, false]) {
      const a = person('a');
      const b = person('b');
      const old = { ...joint, id: 'old', action: 'old', duration: 200, with: undefined };
      expect(begin(b, old, decide(b, [old]))).toBeTruthy();
      if (dying) {
        bleed(b);
        b.body.health = 0.01;
      }
      const c = createCommunity([a, b]);
      const offer = { ...joint, with: ['b'] };
      const proposal = proposeJoint(c, a, offer, decide(a, [offer]));
      const events: { kind: string; at: number }[] = [];
      const begun = acceptJoint(
        c,
        {
          ...world,
          resolve: (_p, act) => ({
            at: 100,
            status: 'interrupted',
            affordanceId: act.affordanceId,
            action: act.action,
          }),
        },
        proposal,
        b,
        decide(b, [offer]),
        (e) => events.push(e),
        { ...policy, tellDeaths: false },
      );
      expect(a.now).toBe(100);
      expect(b.now).toBe(100);
      if (dying) {
        expect(b.body.alive).toBe(false);
        expect(begun).toEqual([]);
        expect(proposal.status).toBe('declined');
        expect(a.activity).toBeNull();
        expect(events.filter((e) => e.kind === 'begin')).toEqual([]);
        expect(c.interrupts.a).toMatchObject({ at: 100, reason: `declined:${proposal.id}` });
      } else {
        expect(begun).toHaveLength(2);
        expect(proposal.status).toBe('accepted');
        expect(events.filter((e) => e.kind === 'begin').map((e) => e.at)).toEqual([100, 100]);
        expect(a.activity?.endsAt).toBe(120);
        expect(b.activity?.endsAt).toBe(120);
      }
    }
  });

  test('later old work keeps completion credit after death cleanup advances its owner', () => {
    const a = person('a');
    const b = person('b');
    const d = person('d');
    const task = { ...joint, id: 'old', action: 'old', with: undefined, duration: 200 };
    begin(b, task, decide(b, [task]));
    begin(d, { ...task, duration: 50 }, decide(d, [task]));
    bleed(b);
    b.body.health = 0.01;
    const c = createCommunity([a, b, d]);
    const offer = { ...joint, with: ['b', 'd'] };
    const proposal = proposeJoint(c, a, offer, decide(a, [offer]));
    proposal.accepted.push(b.id);
    proposal.partnerRecords.b = decide(b, [joint]);
    const resolved: { id: string; reason: string; now: number }[] = [];
    const events: { kind: string; personId: string; at: number }[] = [];
    expect(
      acceptJoint(
        c,
        {
          ...world,
          resolve: (p, act, reason) => {
            resolved.push({ id: p.id, reason, now: p.now });
            return {
              at: 100,
              status: reason === 'ended' ? 'completed' : 'interrupted',
              affordanceId: act.affordanceId,
              action: act.action,
            };
          },
        },
        proposal,
        d,
        decide(d, [joint]),
        (e) => events.push(e),
        { ...policy, tellDeaths: false },
      ),
    ).toEqual([]);
    expect(resolved).toEqual([
      { id: 'b', reason: 'interrupted', now: 0 },
      { id: 'd', reason: 'ended', now: 100 },
    ]);
    expect(events.find((e) => e.kind === 'finish' && e.personId === 'd')?.at).toBe(100);
    expect(proposal.status).toBe('declined');
    expect(a.activity).toBeNull();
  });

  test('doze wait synchronization discovers a bleeding proposer and releases the remaining waiter', () => {
    const a = person('a');
    const b = person('b');
    const d = person('d');
    const c = createCommunity([a, b, d]);
    const offer = { ...joint, with: ['b', 'd'] };
    const proposal = proposeJoint(c, a, offer, decide(a, [offer]));
    proposal.accepted.push(b.id, d.id);
    delete c.interrupts.b;
    delete c.interrupts.d;
    c.idleUntil.b = 50;
    // A valid persisted doze span makes d's waiting checkpoint due at minute 10.
    enableDoze(d, { posture: 'reclined', stimulation: 0 });
    d.now = 10;
    d.body.asleep = true;
    d.body.since = 10;
    if (!d.body.doze) throw new Error('missing doze fixture');
    d.body.doze.since = 10;
    bleed(a);
    const events = stepCommunity(c, world, 10, { ...policy, tellDeaths: false });
    expect(proposal.status).toBe('declined');
    expect(events.filter((e) => e.kind === 'died')).toMatchObject([{ personId: 'a', at: 10 }]);
    expect(events.some((e) => e.personId === 'b' && e.kind === 'decide' && e.at === 10)).toBe(true);
  });

  test('conversation partner synchronization discovers death before conversation or contagion', () => {
    const a = person('a');
    const b = person('b');
    const c = createCommunity([a, b]);
    const talk: Affordance = {
      ...joint,
      id: 'talk',
      action: 'talk',
      tags: ['conversation'],
      with: ['b'],
      duration: 10,
    };
    expect(begin(a, talk, decide(a, [talk]))).toBeTruthy();
    c.idleUntil.b = 20;
    bleed(b);
    const events = stepCommunity(c, world, 10, policy);
    expect(events.filter((e) => e.kind === 'died')).toMatchObject([{ personId: 'b', at: 10 }]);
    expect(events.some((e) => e.kind === 'converse' || e.kind === 'contagion')).toBe(false);
    expect(events.findIndex((e) => e.kind === 'died')).toBeLessThan(
      events.findIndex((e) => e.personId === 'a' && e.kind === 'decide'),
    );
  });

  test('dropped notices keep both tie and marriage knowledge unchanged; legacy receipt still widows', () => {
    const saved = { ...BELIEF_DEFAULTS };
    try {
      Object.assign(BELIEF_DEFAULTS, { attentionBase: 0, attentionRange: 0, alwaysSalience: 1 });
      const attended = family();
      die(attended.dead);
      const before = JSON.stringify(attended.spouse.bonds);
      tellDeath(attended.c, attended.dead, 10, { receipt: 'attended' });
      expect(JSON.stringify(attended.spouse.bonds)).toBe(before);
      expect(attended.spouse.social.relationships.find((r) => r.otherId === 'a')?.deceasedAt).toBeUndefined();
      expect(attended.spouse.memory.episodes.some((e) => e.summary === 'a died')).toBe(false);
      const legacy = family();
      die(legacy.dead);
      tellDeath(legacy.c, legacy.dead, 10);
      expect(spousesOf(legacy.spouse)).toEqual([]);
      expect(legacy.spouse.social.relationships.find((r) => r.otherId === 'a')?.deceasedAt).toBeUndefined();
      const automatic = family();
      bleed(automatic.dead);
      stepCommunity(automatic.c, world, 10, policy);
      expect(spousesOf(automatic.spouse)).toEqual(['a']);
      expect(
        automatic.spouse.social.relationships.find((r) => r.otherId === 'a')?.deceasedAt,
      ).toBeUndefined();
    } finally {
      Object.assign(BELIEF_DEFAULTS, saved);
    }
  });

  test('omitted policy keeps original byte-identical continuation including RNG and community state', () => {
    const { dead, c } = family();
    bleed(dead);
    const events = [stepCommunity(c, world, 10), stepCommunity(c, world, 22)];
    // Restore only engine metadata to the published3.0/engine2.23 golden; preserve full community/events.
    const legacyCommunity = structuredClone(c);
    for (const p of legacyCommunity.people) {
      expect(p.engine).toBe(ENGINE_VERSION);
      p.engine = '2.23.0';
    }
    const digest = createHash('sha256')
      .update(JSON.stringify({ c: legacyCommunity, events }))
      .digest('hex');
    expect(digest).toBe('b0cf3fdf8c75cf1224c3b9e944426b23e825c3e4fe09c56bfe176969dcdccdf8');
  });
});
