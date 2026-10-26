import { strict as assert } from 'node:assert';
import { enableDoze, injure } from '../src/body/index.ts';
import { begin, createPerson, decide } from '../src/person.ts';
import { requireCommunityCurrent, synchronizeCommunity } from '../src/sim/catch-up.ts';
import { createCommunity, interruptPerson, proposeJoint, stepCommunity, type World } from '../src/sim/sim.ts';
import type { Affordance } from '../src/types.ts';

export const eventPolicy = { catchUp: 'events', deathHandling: 'community' } as const;
export const controlWorld: World = {
  now: () => 10,
  affordancesFor: () => [],
  perceptsFor: () => [],
  resolve: (p, a, reason) => ({
    status: reason === 'ended' ? 'completed' : 'interrupted',
    affordanceId: a.affordanceId,
    action: a.action,
    at: p.now,
  }),
};
export function controlPerson(id = 'a') {
  return createPerson({ id, name: id, seed: 3, now: 0, bornAt: -15_000_000, sex: 'female' });
}
const offer: Affordance = {
  id: 'work',
  action: 'work',
  label: 'Work',
  duration: 60,
  effort: 0.1,
  advertises: {},
};

/** Executable arms: stale read, explicit death discovery/proposal release, interruption and doze checkpoint. */
export function eventCatchUpControl() {
  const p = controlPerson();
  const c = createCommunity([p]);
  c.idleUntil.a = 20;
  const before = JSON.stringify(c);
  assert.deepEqual(stepCommunity(c, controlWorld, 10, eventPolicy), []);
  assert.equal(JSON.stringify(c), before);
  assert.throws(() => requireCommunityCurrent(c, 10), /stale/);
  synchronizeCommunity(c, controlWorld, 10, eventPolicy);
  requireCommunityCurrent(c, 10);

  const dead = controlPerson();
  const waiter = controlPerson('b');
  const deathCommunity = createCommunity([dead, waiter]);
  const joint = { ...offer, tags: ['joint'], with: ['b'] };
  const proposal = proposeJoint(deathCommunity, dead, joint, decide(dead, [joint]));
  proposal.accepted.push('b');
  delete deathCommunity.interrupts.b;
  injure(dead, { part: 'leg', severity: 0.5, bleeding: 1, healRatePerDay: 0 });
  dead.body.health = 0.0001;
  stepCommunity(deathCommunity, controlWorld, 10, eventPolicy);
  assert.equal(dead.body.alive, true);
  const deaths = synchronizeCommunity(deathCommunity, controlWorld, 10, eventPolicy);
  assert.equal(dead.body.alive, false);
  assert.equal(proposal.status, 'declined');
  assert.equal(structuredClone(deathCommunity.interrupts).b?.reason, `death:${dead.id}`);
  assert.equal(deaths.filter((e) => e.kind === 'died').length, 1);
  assert.equal(
    synchronizeCommunity(deathCommunity, controlWorld, 10, eventPolicy).filter((e) => e.kind === 'died')
      .length,
    0,
  );

  const worker = controlPerson();
  begin(worker, offer, decide(worker, [offer]));
  assert.ok(worker.activity);
  worker.activity.reviewAt = 50;
  const interrupted = createCommunity([worker]);
  stepCommunity(interrupted, controlWorld, 3, eventPolicy);
  assert.equal(worker.now, 0);
  interruptPerson(interrupted, worker, 4, 'alarm');
  const alarm = stepCommunity(interrupted, controlWorld, 4, eventPolicy);
  assert.equal(worker.now, 4);
  assert.ok(alarm.some((e) => e.kind === 'decide'));

  const sleepy = controlPerson();
  sleepy.body.sleepPressure = 1;
  sleepy.body.sleepDebt = 48;
  enableDoze(sleepy, { posture: 'reclined', stimulation: 0 });
  begin(sleepy, offer, decide(sleepy, [offer]));
  assert.ok(sleepy.activity);
  sleepy.activity.reviewAt = 60;
  const dozeCommunity = createCommunity([sleepy]);
  const doze = stepCommunity(dozeCommunity, controlWorld, 40, eventPolicy);
  assert.ok(doze.some((e) => e.kind === 'finish' && e.status === 'interrupted'));
  assert.equal(sleepy.body.asleep, true);
  return {
    staleReadRejected: true,
    deathDiscovery: 10,
    proposalReleased: true,
    interruptedAt: 4,
    dozeCheckpoint: true,
  };
}

if (process.argv[1]?.endsWith('event-catch-up-control.ts'))
  console.log(JSON.stringify(eventCatchUpControl()));
