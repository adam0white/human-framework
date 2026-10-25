import { expect, test } from 'vitest';
import { enableDoze } from '../src/body/index.ts';
import { begin, createPerson, decide, tick } from '../src/person.ts';
import {
  acceptJoint,
  createCommunity,
  interruptPerson,
  nextEventAt,
  proposeJoint,
  stepCommunity,
  type World,
} from '../src/sim/sim.ts';
import type { Affordance, Person } from '../src/types.ts';

const offer: Affordance = {
  id: 'watch',
  label: 'Watch',
  action: 'watch',
  duration: 180,
  effort: 0.1,
  advertises: {},
};
function person(id = 'p', enabled = true): Person {
  const p = createPerson({
    id,
    name: id,
    seed: 1,
    now: 120,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    body: { sleepPressure: 1, sleepDebt: 48 },
  });
  if (enabled) enableDoze(p, { posture: 'reclined', stimulation: 0 });
  return p;
}
function world() {
  const calls = {
    percepts: [] as number[],
    offers: [] as number[],
    resolved: [] as { at: number; reason: string; minutes: number }[],
  };
  const w: World = {
    now: () => 120,
    affordancesFor: (p) => {
      calls.offers.push(p.now);
      return [];
    },
    perceptsFor: (p) => {
      calls.percepts.push(p.now);
      return [];
    },
    resolve: (p, act, reason) => {
      calls.resolved.push({ at: p.now, reason, minutes: p.now - act.startedAt });
      return {
        at: p.now,
        affordanceId: act.affordanceId,
        action: act.action,
        status: reason === 'ended' ? 'completed' : 'interrupted',
        summary: reason,
      };
    },
  };
  return { w, calls };
}
test('passive checkpoints consume no choice/perception RNG and maxEvents remains a log cap', () => {
  const p = person();
  if (!p.body.doze) throw new Error('Missing doze fixture');
  p.body.doze.context.posture = 'upright';
  const c = createCommunity([p]);
  c.idleUntil.p = 200;
  const { w, calls } = world();
  const expected = structuredClone(p);
  const rng = structuredClone(p.rng);
  tick(expected, 180);
  expect(nextEventAt(c, p)).toBe(121);
  const events = stepCommunity(c, w, 180, { maxEvents: 5 });
  expect(events).toEqual([]);
  expect(calls.percepts).toEqual([]);
  expect(calls.offers).toEqual([]);
  expect(p).toEqual(expected);
  expect(p.now).toBe(180);
  expect(p.rng).toEqual(rng);
  expect(p.body.doze?.since).toBeUndefined();
});
test('a zero event-log cap preserves complete legacy advancement without doze', () => {
  const p = person('p', false);
  const c = createCommunity([p]);
  const { w, calls } = world();
  const events = stepCommunity(c, w, 180, { maxEvents: 0 });
  expect(events).toEqual([]);
  expect(p.now).toBe(180);
  expect(calls.offers.length).toBeGreaterThan(1);
});
test('onset resolves work interrupted even with no offered choice; sleeping idle still receives an alarm', () => {
  const p = person();
  begin(p, offer, decide(p, [offer]));
  if (!p.activity) throw new Error('Missing activity fixture');
  p.activity.reviewAt = 300;
  const c = createCommunity([p]);
  const { w, calls } = world();
  const events = stepCommunity(c, w, 200, { idleQuantum: 10 });
  const ended = calls.resolved[0];
  if (!ended) throw new Error('Work was never resolved');
  expect(ended.reason).toBe('interrupted');
  expect(ended.at).toBe(p.body.doze?.since);
  expect(ended.minutes).toBeLessThan(180);
  expect(p.activity).toBeNull();
  expect(p.body.asleep).toBe(true);
  expect(events.some((e) => e.kind === 'finish' && e.status === 'interrupted')).toBe(true);
  expect(calls.offers).toEqual([]);
  expect(events.filter((e) => e.kind === 'decide')).toEqual([]);
  const alarmAt = c.idleUntil.p;
  if (alarmAt === undefined) throw new Error('Missing idle look');
  w.perceptsFor = (q) =>
    q.now === alarmAt
      ? [{ at: q.now, channel: 'heard', kind: 'alarm', summary: 'Alarm', salience: 1, targetId: q.id }]
      : [];
  stepCommunity(c, w, alarmAt);
  expect(p.body.asleep).toBe(false);
});
test('joint waiting keeps bodily checkpoints and onset declines only affected participation', () => {
  const p = person('a');
  const q = person('b', false);
  const r = person('c', false);
  const c = createCommunity([p, q, r]);
  c.idleUntil.b = 500;
  c.idleUntil.c = 500;
  const record = decide(p, [offer]);
  c.joint.proposals.push({
    id: 'affected',
    proposerId: q.id,
    partnerIds: [p.id, r.id],
    offer,
    record,
    at: 120,
    accepted: [p.id],
    partnerRecords: { a: record },
    status: 'pending',
  });
  c.joint.proposals.push({
    id: 'other',
    proposerId: r.id,
    partnerIds: [q.id],
    offer,
    record,
    at: 120,
    accepted: [],
    partnerRecords: {},
    status: 'pending',
  });
  expect(nextEventAt(c, p)).toBe(121);
  const probe = structuredClone(p);
  while (probe.body.doze?.since === undefined) tick(probe, probe.now + 1);
  const { w } = world();
  stepCommunity(c, w, 160, { maxEvents: probe.now - 120 });
  expect(p.body.doze?.since).toBeDefined();
  expect(q.now).toBe(p.now);
  expect(r.now).toBe(160); // Existing driver advances every person to the requested end.
  expect(c.joint.proposals.find((x) => x.id === 'affected')?.status).toBe('declined');
  // Ordinary processing may accept it after another participant is released.
  expect(c.joint.proposals.find((x) => x.id === 'other')?.status).not.toBe('declined');
});

test('a dozing joint proposer settles its proposal and releases accepted partners at onset', () => {
  const p = person('a');
  const q = person('b', false);
  const r = person('c', false);
  const c = createCommunity([p, q, r]);
  c.idleUntil.b = 500;
  c.idleUntil.c = 500;
  const record = decide(p, [offer]);
  c.joint.proposals.push({
    id: 'joint',
    proposerId: p.id,
    partnerIds: [q.id, r.id],
    offer,
    record,
    at: 120,
    accepted: [q.id],
    partnerRecords: { b: record },
    status: 'pending',
  });
  const probe = structuredClone(p);
  while (probe.body.doze?.since === undefined) tick(probe, probe.now + 1);
  const { w } = world();
  const decisions: { id: string; at: number }[] = [];
  w.affordancesFor = (q) => {
    decisions.push({ id: q.id, at: q.now });
    return [];
  };
  stepCommunity(c, w, probe.now);
  expect(decisions).toContainEqual({ id: 'b', at: probe.now });
  expect(nextEventAt(c, q)).toBeLessThan(500);
  stepCommunity(c, w, 160, { maxEvents: 0 });
  expect(c.joint.proposals[0]?.status).toBe('declined');
  expect(q.now).toBe(p.now);
  expect(r.now).toBe(160); // Existing driver advances every person to the requested end.
});

test('a sleeping participant declines joint requests without choosing or proposing', () => {
  const p = person('a');
  while (p.body.doze?.since === undefined) tick(p, p.now + 1);
  const q = person('b', false);
  tick(q, p.now);
  const c = createCommunity([p, q]);
  const joint = { ...offer, tags: ['joint'], with: [p.id] };
  const proposal = proposeJoint(c, q, joint, decide(q, [joint]));
  const { w } = world();
  const sleepChoices: number[] = [];
  w.affordancesFor = (who) => {
    if (who.id === p.id) sleepChoices.push(who.now);
    return [{ ...joint, with: [q.id] }];
  };
  const events = stepCommunity(c, w, p.now + 20);
  expect(proposal.status).toBe('declined');
  expect(sleepChoices).toEqual([]);
  expect(
    events.filter((e) => e.personId === p.id && ['decide', 'accept', 'propose'].includes(e.kind)),
  ).toEqual([]);
});

test('active joint doze matches existing individual interrupt semantics and retains the pending cause', () => {
  const p = person('a');
  const q = person('b', false);
  for (const who of [p, q]) {
    const joint = { ...offer, with: [who === p ? q.id : p.id], tags: ['joint'] };
    begin(who, joint, decide(who, [joint]), { jointId: 'running' });
    if (!who.activity) throw new Error('Missing joint fixture');
    who.activity.reviewAt = 300;
  }
  const probe = structuredClone(p);
  while (probe.body.doze?.since === undefined) tick(probe, probe.now + 1);
  const c = createCommunity([p, q]);
  const normal = structuredClone(c);
  const normalP = normal.people.find((who) => who.id === p.id);
  if (!normalP) throw new Error('Missing normal fixture');
  interruptPerson(normal, normalP, probe.now, 'host:stop');
  expect(normal.people.find((who) => who.id === q.id)?.activity?.reviewAt).toBe(300);
  // A pending host cause must survive onset and forced world resolution.
  if (!p.activity) throw new Error('Missing activity');
  p.activity.interrupt = { at: 300, reason: 'host:stop' };
  const { w, calls } = world();
  stepCommunity(c, w, probe.now);
  expect(calls.resolved).toContainEqual({ at: probe.now, reason: 'interrupted', minutes: probe.now - 120 });
  expect(p.activity).toBeNull();
  expect(c.interrupts[p.id]?.reason).toBe('host:stop');
  expect(q.activity?.jointId).toBe('running');
  expect(q.activity?.reviewAt).toBe(300);
  expect(nextEventAt(c, q)).toBe(nextEventAt(normal, normal.people.find((who) => who.id === q.id) as Person));
});

test('a dozing partner releases other accepted workers from their stale review deadline', () => {
  const [p, q, r, last] = [person('a'), person('b', false), person('c', false), person('d', false)];
  if (!p || !q || !r || !last) throw new Error('Missing fixture');
  begin(r, offer, decide(r, [offer]));
  if (!r.activity) throw new Error('Missing work');
  r.activity.reviewAt = 300;
  const c = createCommunity([p, q, r, last]);
  c.idleUntil.b = 500;
  c.idleUntil.d = 500;
  const record = decide(p, [offer]);
  c.joint.proposals.push({
    id: 'waiting',
    proposerId: q.id,
    partnerIds: [p.id, r.id, last.id],
    offer,
    record,
    at: 120,
    accepted: [p.id, r.id],
    partnerRecords: { a: record, c: record },
    status: 'pending',
  });
  const probe = structuredClone(p);
  while (probe.body.doze?.since === undefined) tick(probe, probe.now + 1);
  const decisions: string[] = [];
  const { w } = world();
  w.affordancesFor = (who) => {
    decisions.push(`${who.id}:${who.now}`);
    return [];
  };
  stepCommunity(c, w, probe.now);
  expect(c.joint.proposals[0]?.status).toBe('declined');
  expect(decisions).toContain(`b:${probe.now}`);
  expect(decisions).toContain(`c:${probe.now}`);
  expect(r.activity?.reviewAt).toBeLessThan(300);
});

test('joint catch-up doze declines before anybody starts', () => {
  const p = person('a');
  const q = person('b', false);
  const probe = structuredClone(p);
  while (probe.body.doze?.since === undefined) tick(probe, probe.now + 1);
  const c = createCommunity([p, q]);
  const joint = { ...offer, tags: ['joint'], with: [q.id] };
  const proposal = proposeJoint(c, p, joint, decide(p, [joint]));
  tick(q, probe.now);
  const { w } = world();
  expect(acceptJoint(c, w, proposal, q, decide(q, [offer]))).toEqual([]);
  expect(proposal.status).toBe('declined');
  expect(p.body.doze?.since).toBe(probe.now);
  expect(p.activity).toBeNull();
  expect(q.activity).toBeNull();
  expect(nextEventAt(c, q)).toBe(q.now);
});
