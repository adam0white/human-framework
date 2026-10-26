/** Headless control for explicit death cleanup and factual widowhood. No mortality or grief calibration. */
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import * as hf from '../src/index.ts';
import { advanceCommunityPerson } from '../src/sim/sim.ts';

export function runningPartnerDeathArm(shared: boolean, community: boolean) {
  const person = (id: string) =>
    hf.createPerson({ id, name: id, seed: id.charCodeAt(0), now: 0, bornAt: -15000000, sex: 'female' });
  const a = person('a');
  const b = person('b');
  const c = hf.createCommunity([a, b]);
  const offer: hf.Affordance = {
    id: 'carry',
    action: shared ? 'carry' : 'talk',
    label: 'work together',
    duration: 20,
    effort: 0,
    advertises: { leisure: 1 },
    with: ['b'],
    tags: shared ? ['joint'] : ['conversation'],
  };
  const resolved: string[] = [];
  const world: hf.World = {
    now: () => 25,
    affordancesFor: (p) => (p.id === 'a' ? [offer] : []),
    perceptsFor: () => [],
    resolve: (p, act, reason) => {
      resolved.push(`${p.id}:${reason}`);
      return {
        at: p.now,
        status: reason === 'ended' ? 'completed' : 'interrupted',
        action: act.action,
        affordanceId: act.affordanceId,
      };
    },
  };
  if (shared) {
    const proposal = hf.proposeJoint(c, a, offer, hf.decide(a, [offer]));
    assert.equal(hf.acceptJoint(c, world, proposal, b, hf.decide(b, [offer])).length, 2);
  } else hf.begin(a, offer, hf.decide(a, [offer]));
  c.idleUntil.b = 10;
  if (b.activity) b.activity.reviewAt = 10;
  hf.injure(b, { part: 'leg', severity: 0.5, bleeding: 1, healRatePerDay: 0 });
  b.body.health = 0.0001;
  const opts: hf.StepOptions = { tellDeaths: false, ...(community ? { deathHandling: 'community' } : {}) };
  const events = [...hf.stepCommunity(c, world, 10, opts), ...hf.stepCommunity(c, world, 25, opts)];
  return {
    dead: !b.body.alive,
    resolved,
    reason: a.trace.find((d) => d.interrupt === 'death:b')?.interrupt,
    running: a.activity !== null,
    exchanges: events.filter((e) => e.kind === 'converse').length,
  };
}

/** Public joint protocol with an actually pruned accepted record and a separate pending proposal. */
export function prunedJointDeathArm(
  partnerDies: boolean,
  restored = false,
  community = true,
  naturalDiscovery = false,
) {
  const person = (id: string) =>
    hf.createPerson({ id, name: id, seed: id.charCodeAt(0), now: 0, bornAt: -15000000, sex: 'female' });
  const a = person('a'),
    b = person('b'),
    d = person('d'),
    e = person('e'),
    f = person('f');
  let c = hf.createCommunity([a, b, d, e, f]);
  const policy: hf.StepOptions = { tellDeaths: false, ...(community ? { deathHandling: 'community' } : {}) };
  const resolved: string[] = [];
  const host: hf.World = {
    now: () => 25,
    affordancesFor: () => [],
    perceptsFor: (p) => [
      {
        at: p.now,
        channel: 'saw',
        kind: 'alarm',
        targetId: p.id,
        salience: 1,
        valence: -0.8,
        summary: 'An alarm sounds.',
      },
    ],
    mirror: (_p, offer) => ({ ...offer, with: [] }),
    resolve: (p, act, reason) => {
      resolved.push(`${p.id}:${reason}`);
      return {
        at: p.now,
        action: act.action,
        affordanceId: act.affordanceId,
        status: reason === 'ended' ? 'completed' : 'interrupted',
      };
    },
  };
  const offer: hf.Affordance = {
    id: 'living-joint',
    action: 'carry',
    label: 'carry',
    duration: 20,
    effort: 0,
    advertises: { leisure: 1 },
    tags: ['joint'],
    with: ['b'],
  };
  const running = hf.proposeJoint(c, d, offer, hf.decide(d, [offer]));
  assert.equal(hf.acceptJoint(c, host, running, b, hf.decide(b, [offer]), () => {}, policy).length, 2);
  for (let i = 0; i < 16; i++) {
    const other = { ...offer, id: `prune-${i}`, with: ['f'] };
    hf.declineJoint(c, hf.proposeJoint(c, e, other, hf.decide(e, [other])));
  }
  assert(!c.joint.proposals.some((x) => x.id === running.id));
  if (!partnerDies || (community && !naturalDiscovery)) {
    const pendingOffer = { ...offer, id: 'unrelated', with: ['b', 'f'] };
    const pending = hf.proposeJoint(c, a, pendingOffer, hf.decide(a, [pendingOffer]));
    hf.acceptJoint(c, host, pending, b, hf.decide(b, [pendingOffer]), () => {}, policy);
  }
  c.idleUntil.a = naturalDiscovery && partnerDies ? 50 : 10;
  c.idleUntil.e = 50;
  c.idleUntil.f = 50;
  delete c.interrupts.e;
  delete c.interrupts.f;
  const dying = partnerDies ? d : a;
  hf.injure(dying, { part: 'leg', severity: 0.5, bleeding: 1, healRatePerDay: 0 });
  dying.body.health = 0.0001;
  // Natural discovery reaches the joint end through the driver, with the survivor ordered first.
  // Keep the separate cleanup checkpoint arm for activity-specific provenance across restore.
  const events = naturalDiscovery ? hf.stepCommunity(c, host, 20, policy) : [];
  if (!naturalDiscovery) advanceCommunityPerson(c, dying, 10, policy);
  if (restored)
    c = hf.createCommunity(
      c.people.map((p) => hf.restore(JSON.parse(JSON.stringify(hf.snapshot(p))))),
      JSON.parse(JSON.stringify(hf.communityState(c))),
    );
  if (!naturalDiscovery) events.push(...hf.stepCommunity(c, host, 10, policy));
  events.push(...hf.stepCommunity(c, host, 25, policy));
  return { resolved, events, people: c.people.map(hf.snapshot), state: hf.communityState(c) };
}

export function runCommunityDeathRepairControl() {
  for (const partnerDies of [false, true]) {
    const direct = prunedJointDeathArm(partnerDies);
    const resumed = prunedJointDeathArm(partnerDies, true);
    assert.deepEqual(resumed, direct);
    assert(direct.resolved.includes(partnerDies ? 'b:interrupted' : 'b:ended'));
    assert(!direct.resolved.includes(partnerDies ? 'b:ended' : 'b:interrupted'));
    if (partnerDies) assert(prunedJointDeathArm(true, false, false).resolved.includes('b:ended'));
  }
  for (const partnerDies of [false, true]) {
    const direct = prunedJointDeathArm(partnerDies, false, true, true);
    assert.deepEqual(prunedJointDeathArm(partnerDies, true, true, true), direct);
    assert(direct.resolved.includes(partnerDies ? 'b:interrupted' : 'b:ended'));
    assert(!direct.resolved.includes(partnerDies ? 'b:ended' : 'b:interrupted'));
    if (partnerDies)
      assert(direct.events.some((e) => e.kind === 'died' && e.personId === 'd' && e.at === 20));
  }
  for (const shared of [true, false]) {
    assert.deepEqual(runningPartnerDeathArm(shared, true), {
      dead: true,
      resolved: ['a:interrupted'],
      reason: 'death:b',
      running: false,
      exchanges: 0,
    });
    const ablated = runningPartnerDeathArm(shared, false);
    assert(ablated.resolved.includes('a:ended'));
    assert.equal(ablated.reason, undefined);
  }
  const dead = hf.createPerson({ id: 'dead', name: 'Dead', seed: 2, now: 0, bornAt: -15000000, sex: 'male' });
  const spouse = hf.createPerson({
    id: 'spouse',
    name: 'Spouse',
    seed: 3,
    now: 0,
    bornAt: -15000000,
    sex: 'female',
  });
  assert(hf.marry(dead, spouse, 0, hf.MUSLIM_CUSTOM).ok);
  hf.die(dead);
  spouse.now = 100;
  spouse.social.relationships = []; // Factual bonds do not require a social tie or knowledge.
  hf.tellDeath(hf.createCommunity([dead, spouse]), dead, 10, { receipt: 'attended' });
  assert.equal(spouse.bonds?.marriages[0]?.endedAt, 10);
  assert.equal(spouse.bonds?.mourning?.since, 10);
  assert.equal(spouse.bonds?.mourning?.until, 10 + 130 * 1440);
  const before = JSON.stringify(spouse.bonds);
  hf.tellDeath(hf.createCommunity([dead, spouse]), dead, 50, { receipt: 'attended' });
  assert.equal(JSON.stringify(spouse.bonds), before);
  console.log(
    'Community death repair: accepted joint/conversation cleanup, omitted ablation, factual widow anchor and idempotence pass.',
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  runCommunityDeathRepairControl();
