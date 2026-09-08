import test from 'node:test';
import assert from 'node:assert/strict';
import * as direct from '../src/experiments/work-progress/camp-direct.js';
import * as fixed from '../src/experiments/work-progress/camp-fixed.js';
const json = value => JSON.parse(JSON.stringify(value));
const start = (host, world, actor = 'A', item = 'work-1') => host.command(world, { type: 'start', actor, item });

test('D and F pay an unchanged stage once and retain a bounded completed contribution', () => {
  for (const host of [direct, fixed]) {
    const origin = host.createWorld(), working = start(host, origin);
    assert.deepEqual(host.observe(origin).stock, { timber: 5, salvage: 1, toolBlank: 0 });
    assert.deepEqual(host.observe(working).stock, { timber: 0, salvage: 0, toolBlank: 0 });
    assert.equal(host.nextEvent(working), 20);
    const done = host.advanceTo(working, 20), v = host.observe(done);
    assert.equal(v.outputs, 1); assert.equal(v.items[0].completedAt, 20);
    assert.equal(v.items[0].settled, true); assert.deepEqual(v.items[0].reserved, { timber: 0, salvage: 0 });
    assert.deepEqual(v.spent, { timber: 5, salvage: 1, toolBlank: 0 });
    assert.equal(v.actors.A.paid.construction, 20); assert.ok(Math.abs(v.actors.A.paid.effort - .2) < 1e-12);
    assert.deepEqual(host.advanceTo(done, 20), done); assert.equal(host.observe(host.advanceTo(done, 40)).outputs, 1);
    assert.throws(() => start(host, done)); assert.equal(host.nextEvent(done), null);
    assert.ok(Object.isFrozen(done)); assert.deepEqual(host.restoreWorld(json(host.exportWorld(done))), done);
  }
});
test('paid supplier changes future D work; F preserves its initial snapshot through stop and resume', () => {
  const results = [];
  for (const host of [direct, fixed]) {
    let world = start(host, host.createWorld({ toolArrival: 1 }));
    assert.equal(host.observe(world).toolAvailable, false); assert.equal(host.nextEvent(world), 1);
    world = host.advanceTo(world, 1); const atTool = host.observe(world);
    assert.equal(atTool.items[0].progress, .05); assert.equal(atTool.toolAvailable, true);
    assert.equal(atTool.actors.C.paid.crafting, 1); assert.equal(atTool.actors.C.paid.effort, .02);
    assert.equal(atTool.stock.toolBlank, 0); assert.equal(atTool.spent.toolBlank, 1);
    const stopped = host.command(world, { type: 'stop', actor: 'A' });
    const resumed = start(host, stopped);
    assert.deepEqual(host.observe(resumed).items, atTool.items);
    const done = host.advanceTo(resumed, 40);
    assert.deepEqual(host.observe(done), host.observe(host.advanceTo(world, 40)));
    results.push(host.observe(done).items[0].completedAt);
  }
  assert.deepEqual(results, [15, 20]);
});
test('D accepts a capable recipient and keeps prior construction credit with its worker; F refuses optional handover', () => {
  let world = direct.advanceTo(start(direct, direct.createWorld()), 1), before = direct.observe(world);
  world = direct.command(world, { type: 'handover', from: 'A', to: 'B', item: 'work-1' });
  assert.equal(direct.observe(world).lastResponse.reason, 'accepted');
  assert.deepEqual(direct.observe(world).actors, before.actors);
  const done = direct.observe(direct.advanceTo(world, 40)), contributions = done.items[0].contributions;
  assert.equal(done.items[0].completedAt, 19); assert.equal(contributions.A.minutes, 1); assert.equal(contributions.B.minutes, 18);
  assert.ok(Math.abs(contributions.A.effort - .01) < 1e-12); assert.ok(Math.abs(contributions.B.effort - .19) < 1e-12);
  const f = fixed.advanceTo(start(fixed, fixed.createWorld()), 1);
  const refused = fixed.command(f, { type: 'handover', from: 'A', to: 'B', item: 'work-1' });
  assert.equal(fixed.observe(refused).lastResponse.reason, 'fixed-assignment');
  assert.equal(fixed.observe(refused).assignments.A, 'work-1');
});
test('busy recipient refusal preserves work and stopping hauling retains paid costs without resuming it', () => {
  for (const host of [direct, fixed]) {
    let world = host.advanceTo(start(host, host.createWorld({ busyB: true })), 1);
    const before = host.observe(world);
    world = host.command(world, { type: 'handover', from: 'A', to: 'B', item: 'work-1' });
    assert.equal(host.observe(world).lastResponse.accepted, false);
    assert.deepEqual(host.observe(world).items, before.items);
    const stopped = host.command(world, { type: 'stop', actor: 'B' });
    assert.equal(host.observe(stopped).assignments.B, null);
    assert.deepEqual(host.observe(stopped).actors.B, before.actors.B);
    const later = host.observe(host.advanceTo(stopped, 4));
    assert.equal(later.actors.B.paid.hauling, 1); assert.equal(later.actors.B.paid.recovery, 3);
    assert.equal(later.actors.B.paid.construction, 0); assert.equal(later.outputs, 0);
  }
});
test('synchronized completions, driver chunking and JSON mid-work continuation preserve exact accounting', () => {
  for (const host of [direct, fixed]) {
    let world = start(host, host.createWorld({ items: 2 })); world = host.advanceTo(world, 2); world = start(host, world, 'B', 'work-2');
    assert.equal(host.nextEvent(world), 20);
    const whole = host.advanceTo(world, 40); let split = host.restoreWorld(json(host.exportWorld(world)));
    for (const minute of [3, 7, 9, 20, 23, 40]) split = host.advanceTo(split, minute);
    assert.deepEqual(split, whole); const v = host.observe(whole);
    assert.equal(v.outputs, 2); assert.deepEqual(v.items.map(i => i.completedAt), [20, 20]);
    assert.deepEqual(v.spent, { timber: 10, salvage: 2, toolBlank: 0 });
    for (const actor of Object.values(v.actors)) assert.equal(actor.paid.work + actor.paid.recovery, 40);
  }
});
test('unknown actions, ownership forgery and unsafe JSON reject without mutating input', () => {
  for (const host of [direct, fixed]) {
    const world = host.advanceTo(start(host, host.createWorld()), 2), original = host.exportWorld(world);
    for (const action of [{ type: 'stop', actor: 'C' }, { type: 'start', actor: 'B', item: 'work-1' }, { type: 'wat' }, { type: 'handover', from: 'B', to: 'A', item: 'work-1' }]) assert.throws(() => host.command(world, action));
    const credit = json(original); credit.world.paid.A.construction--;
    assert.throws(() => host.restoreWorld(credit));
    const stock = json(original); stock.world.stock.timber++;
    assert.throws(() => host.restoreWorld(stock));
    const getter = json(original); let reads = 0; Object.defineProperty(getter, 'world', { get() { reads++; return {}; }, enumerable: true });
    assert.throws(() => host.restoreWorld(getter)); assert.equal(reads, 0);
    const alias = json(original); alias.world.people.B = alias.world.people.A; assert.throws(() => host.restoreWorld(alias));
    assert.deepEqual(host.exportWorld(world), original);
  }
});

test('unfit starts and recipients cannot bypass whole remaining-work capacity', () => {
  for (const host of [direct, fixed]) {
    const startSave = host.exportWorld(host.createWorld()); startSave.world.people.A.body.fatigue = .99;
    const unfit = host.restoreWorld(startSave);
    assert.throws(() => start(host, unfit), /capacity/i);
    const save = host.exportWorld(host.advanceTo(start(host, host.createWorld()), 1)); save.world.people.B.body.hunger = .99;
    const world = host.restoreWorld(save), before = host.observe(world);
    const refused = host.command(world, { type: 'handover', from: 'A', to: 'B', item: 'work-1' });
    assert.equal(host.observe(refused).lastResponse.reason, 'recipient-capacity');
    assert.deepEqual(host.observe(refused).items, before.items); assert.deepEqual(host.observe(refused).actors, before.actors);
  }
});
test('same-worker resume retains an item basis after paid practice crosses the next skill floor', () => {
  for (const host of [direct, fixed]) {
    let world = host.advanceTo(start(host, host.createWorld({ items: 2 })), 20);
    world = start(host, world, 'A', 'work-2'); world = host.advanceTo(world, 36);
    const v = host.observe(world), oldBasis = v.items[1].contributions.A.basis;
    assert.equal(oldBasis, 20); assert.equal(20 - Math.floor(v.actors.A.person.person.skills.construction * 4), 19);
    const restarted = start(host, host.command(world, { type: 'stop', actor: 'A' }), 'A', 'work-2');
    assert.equal(host.observe(restarted).items[1].contributions.A.basis, oldBasis);
    assert.equal(host.observe(host.advanceTo(restarted, 40)).items[1].completedAt, 40);
    const altered = host.exportWorld(world); altered.world.items['work-2'].contributions.A.basis = 19;
    assert.throws(() => host.restoreWorld(altered), /basis/i);
  }
});
test('setup values reject before constructing arbitrary item collections', () => {
  for (const host of [direct, fixed]) {
    for (const setup of [{ items: null }, { busyB: null }, { items: 3 }, { toolArrival: 2 }, { items: -1 }, { other: true }]) assert.throws(() => host.createWorld(setup));
  }
});

test('an active auxiliary assignment must retain capacity for its remaining paid interval', () => {
  for (const host of [direct, fixed]) {
    for (const [setup, actor] of [[{ busyB: true }, 'B'], [{ toolArrival: 1 }, 'C']]) {
      const changed = host.exportWorld(host.createWorld(setup)); changed.world.people[actor].body.fatigue = .999;
      assert.throws(() => host.restoreWorld(changed), /capacity/i);
    }
  }
});

test('the numeric endpoint preserves export and rejects work with no future execution interval', () => {
  for (const host of [direct, fixed]) {
    const snapshot = host.exportWorld(host.createWorld()), w = snapshot.world;
    w.now = 1000000;
    for (const actor of ['A', 'B', 'C']) { w.people[actor].minutes = w.now; w.people[actor].nextAttempt = w.now + 1; w.paid[actor].recovery = w.now; }
    const terminal = host.restoreWorld(snapshot);
    assert.equal(host.nextEvent(terminal), null);
    assert.throws(() => start(host, terminal), /time|interval/i);
    assert.deepEqual(host.exportWorld(terminal), snapshot);
  }
});
