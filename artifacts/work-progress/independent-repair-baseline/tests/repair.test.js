import test from 'node:test';
import assert from 'node:assert/strict';
import {candidate, candidatePump} from '../src/candidate-pump.js';
import {direct, directPump} from '../src/direct-pump.js';
import {createYard, payMinute} from '../src/yard.js';
import {createPerson} from 'paid-work-probe/human';
import {histories, oracle, runHistory} from './histories.js';
import {readFileSync} from 'node:fs';

function approximately(actual, expected, path = '') {
  if (typeof actual === 'number' && typeof expected === 'number') assert.ok(Math.abs(actual - expected) <= 1e-10, `${path}: ${actual} != ${expected}`);
  else if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), path);
    for (const key of Object.keys(actual)) approximately(actual[key], expected[key], `${path}.${key}`);
  } else assert.equal(actual, expected, path);
}
const economic = state => { const copy = structuredClone(state); delete copy.decision; return copy; };
const origins = () => ({
  mara: {body: {fatigue: .2, hunger: .2}, skills: {repair: .1, hauling: .1}},
  tomas: {body: {fatigue: .2, hunger: .2}, skills: {repair: .6, hauling: .1}},
  nuri: {body: {fatigue: .2, hunger: .2}, skills: {crafting: .1}}
});

for (const [name, script] of Object.entries(histories)) {
  test(`${name}: independent completion, all minute payments, driver equivalence and active restore`, () => {
    const expectation = oracle(name);
    assert.equal(expectation.at, script.expected.at);
    const references = {};
    for (const [arm, host] of [['candidate', candidate], ['direct', direct]]) {
      const reference = runHistory(host, name, 'minute'); references[arm] = reference;
      const final = reference.projection;
      assert.equal(final.pump.finishedAt, expectation.at);
      assert.equal(final.seal.place, 'spent'); assert.equal(final.pump.work.coverage, 1);
      for (const id of ['mara', 'tomas']) {
        assert.equal(final.paid[id].repair.minutes, script.expected[id]);
        approximately(final.paid[id].repair, expectation.credit[id]);
      }
      for (const id of ['mara', 'tomas', 'nuri']) {
        assert.equal(final.people[id].minutes, 40);
        assert.equal(Object.values(final.paid[id]).reduce((sum, value) => sum + value.minutes, 0), 40);
      }
      const at1 = reference.checkpoints.find(record => record.kind === 'advance' && record.snapshot.state.minute === 1).snapshot.state;
      const first = name === 'H6' ? 'tomas' : 'mara';
      approximately(at1.paid[first].repair.effort, .20 / (first === 'mara' ? 20 : 18));
      if (script.setup.tool) { assert.equal(at1.tooling.readyAt, 1); assert.equal(at1.paid.nuri.crafting.minutes, 1); approximately(at1.paid.nuri.crafting.effort, .02); }
      if (name === 'H7') {
        const offer = reference.commands.find(command => command.action === 'offerHandover');
        assert.equal(offer.result.accepted, false); assert.equal(offer.result.reason, 'busy');
        assert.equal(final.paid.tomas.hauling.minutes, 4); assert.equal(final.hauling.finishedAt, 4);
      }
      for (const driver of ['minute', 'event', 'uneven']) for (const roundTrip of [false, true]) {
        const run = runHistory(host, name, driver, roundTrip);
        assert.deepEqual(run.final, reference.final);
        // Every observed state, including before and after commands, is preserved and restorable.
        for (const checkpoint of run.checkpoints) {
          assert.deepEqual(host.exportState(host.restoreState(JSON.parse(JSON.stringify(checkpoint.snapshot)))), checkpoint.snapshot);
          const matches = reference.checkpoints.filter(entry => entry.snapshot.state.minute === checkpoint.snapshot.state.minute);
          assert.ok(matches.some(entry => JSON.stringify(entry.snapshot) === JSON.stringify(checkpoint.snapshot)), 'Driver diverged at an intermediate boundary');
        }
      }
    }
    approximately(references.candidate.projection, references.direct.projection);
    for (let index = 0; index < references.candidate.checkpoints.length; index++) {
      const a = candidate.projection(candidate.restoreState(references.candidate.checkpoints[index].snapshot));
      const b = direct.projection(direct.restoreState(references.direct.checkpoints[index].snapshot));
      approximately(a, b);
    }
  });
}

for (const [arm, host, rules] of [['candidate', candidate, candidatePump], ['direct', direct, directPump]]) {
  test(`${arm}: consent refusal changes no economics or enrollment`, () => {
    let state = host.start(host.create({busy: true}), 'mara').state;
    state = host.advance(state, 1);
    const refused = host.offerHandover(state, 'mara', 'tomas');
    assert.equal(refused.result.reason, 'busy'); assert.deepEqual(economic(refused.state), economic(state));
    assert.equal(host.projection(refused.state).pump.work.hands.tomas, undefined);
    const foreign = host.offerHandover(state, 'mara', 'nuri');
    assert.equal(foreign.result.reason, 'not-a-repairer'); assert.deepEqual(economic(foreign.state), economic(state));
    assert.equal(host.offerHandover(state, 'tomas', 'mara').result.reason, 'not-current-worker');
  });
  test(`${arm}: whole remaining capacity refuses unfit starts and recipients atomically`, () => {
    const seed = origins(); seed.mara.body.fatigue = .8;
    const state = host.create({origins: seed});
    const denied = host.start(state, 'mara'); assert.equal(denied.result.reason, 'capacity');
    assert.deepEqual(economic(denied.state), economic(state));
    assert.equal(host.projection(denied.state).pump.work.hands.mara, undefined);
    const second = origins(); second.tomas.body.hunger = .99;
    let active = host.start(host.create({origins: second}), 'mara').state; active = host.advance(active, 1);
    const handover = host.offerHandover(active, 'mara', 'tomas'); assert.equal(handover.result.reason, 'capacity');
    assert.deepEqual(economic(handover.state), economic(active));
  });
  test(`${arm}: stop retains installed seal and all paid costs; interrupted haul never resumes`, () => {
    let state = host.start(host.create({busy: true}), 'mara').state; state = host.advance(state, 1);
    const before = host.exportState(state); state = host.stop(state, 'mara').state;
    assert.equal(state.seal.place, 'installed'); assert.deepEqual(state.paid, before.state.paid);
    assert.deepEqual(state.pump.work, rules.unpack(before.state.pump.work));
    state = host.stop(state, 'tomas').state; state = host.advance(state, 5);
    assert.equal(state.paid.tomas.hauling.minutes, 1); approximately(state.paid.tomas.hauling.effort, .01);
    assert.equal(state.hauling.finishedAt, null); assert.equal(state.occupied.tomas, 'free');
    assert.equal(state.paid.mara.repair.minutes, 1); assert.equal(state.paid.mara.rest.minutes, 4);
    assert.deepEqual(host.exportState(host.restoreState(host.exportState(state))), host.exportState(state));
  });
  test(`${arm}: actual changed proposed basis is ignored on same-worker resume`, () => {
    const seed = origins(); seed.mara.skills.repair = .249;
    let state = host.start(host.create({origins: seed}), 'mara').state;
    assert.equal(host.projection(state).pump.work.hands.mara.basis, 20);
    state = host.advance(state, 1); assert.ok(state.people.mara.skills.repair > .25);
    assert.equal(20 - Math.floor(state.people.mara.skills.repair * 4), 19);
    state = host.stop(state, 'mara').state; state = host.start(state, 'mara').state;
    assert.equal(host.projection(state).pump.work.hands.mara.basis, 20);
    state = host.advance(state, 2); approximately(host.projection(state).pump.work.coverage, .10);
    state = host.advance(state, 40); assert.equal(state.pump.finishedAt, 20);
  });
  test(`${arm}: supplier ownership and delayed tool settlement`, () => {
    let state = host.create({tool: true}); state = host.stop(state, 'nuri').state;
    assert.equal(state.tooling.blank, 'shelf'); assert.equal(state.paid.nuri.crafting.minutes, 0);
    const denied = host.startTool(state, 'mara'); assert.equal(denied.result.reason, 'not-owner');
    assert.deepEqual(economic(denied.state), economic(state));
    state = host.startTool(state, 'nuri').state; state = host.start(state, 'mara').state;
    state = host.advance(state, 1); approximately(host.projection(state).pump.work.coverage, .05);
    state = host.advance(state, 2); approximately(host.projection(state).pump.work.coverage, .05 + 1 / 14);
    assert.equal(state.tooling.readyAt, 1); assert.equal(state.paid.nuri.crafting.minutes, 1);
    assert.equal(host.startTool(state, 'nuri').result.reason, 'no-blank');
  });
  test(`${arm}: every provisional minute rolls back on a downstream error`, () => {
    const broken = createYard({...rules, pay() { throw new Error('controlled-after-human-payment'); }});
    const state = broken.start(broken.create({tool: true}), 'mara').state;
    const before = broken.exportState(state);
    assert.throws(() => broken.advance(state, 1), /controlled-after-human-payment/);
    assert.deepEqual(broken.exportState(state), before);
    assert.equal(state.minute, 0); assert.equal(state.paid.mara.repair.minutes, 0); assert.equal(state.tooling.blank, 'shelf');
    const overQuote = createYard({...rules, plan(...args) { return {...rules.plan(...args), effort: .81}; }});
    const scheduled = overQuote.start(overQuote.create({tool: true}), 'mara').state;
    const unspent = overQuote.exportState(scheduled);
    assert.throws(() => overQuote.advance(scheduled, 1), /Actual paid minute exceeds capacity/);
    assert.deepEqual(overQuote.exportState(scheduled), unspent);
  });
  test(`${arm}: repeated settlement and repeated completion-time advance grant nothing`, () => {
    let state = host.start(host.create(), 'mara').state; state = host.advance(state, 20);
    const before = host.exportState(state);
    for (let repeat = 0; repeat < 10; repeat++) state = host.settle(host.advance(state, 20));
    assert.deepEqual(host.exportState(state), before);
    assert.equal(host.start(state, 'tomas').result.reason, 'finished');
    state = host.advance(state, 40); assert.equal(state.pump.finishedAt, 20); assert.equal(state.paid.mara.repair.minutes, 20);
  });
  test(`${arm}: restore rejects structural and cross-domain lies`, () => {
    let state = host.start(host.create({tool: true}), 'mara').state; state = host.advance(state, 1);
    const snapshot = host.exportState(state);
    const mutations = [
      s => { s.state.minute = 1.5; },
      s => { s.state.extra = true; },
      s => { s.state.seal.owner = 'mara'; },
      s => { s.state.seal.place = 'shelf'; },
      s => { s.state.tooling.blankOwner = 'mara'; },
      s => { s.state.tooling.blank = 'shelf'; },
      s => { s.state.people.mara.person.skills.repair += .01; },
      s => { s.state.people.mara.person.minutes = 2; },
      s => { s.state.people.mara.person.body.hunger = .2; },
      s => { s.state.paid.mara.repair.effort = 0; },
      s => { s.state.paid.nuri.crafting.minutes = 0; },
      s => { s.state.occupied.tomas = 'repair'; },
      s => { s.state.pump.permission.worker = 'tomas'; },
      s => { s.state.pump.finishedAt = 1; },
      s => { s.state.decision.at = 2; },
      s => { s.state.decision.accepted = false; },
      s => { s.state.people.mara.componentVersion = '0.1.0'; s.state.people.mara.person.version = '0.1.0'; },
      s => { Object.defineProperty(s.state, 'hidden', {value: 1}); },
      s => { Object.defineProperty(s.state.seal, 'place', {get() { throw new Error('must-not-invoke-getter'); }, enumerable: true}); },
      s => { s.state.origins.mara.body = s.state.origins.tomas.body; }
    ];
    for (const mutate of mutations) { const changed = structuredClone(snapshot); mutate(changed); assert.throws(() => host.restoreState(changed)); }
    const malformed = structuredClone(snapshot);
    if (arm === 'candidate') malformed.state.pump.work.work.workers.mara.fraction = .5;
    else malformed.state.pump.work.crew.mara.covered = .5;
    assert.throws(() => host.restoreState(malformed));
    assert.deepEqual(host.exportState(host.restoreState(snapshot)), snapshot);
  });
  test(`${arm}: clock, immutable exports, and bounded state`, () => {
    const state = host.create();
    for (const target of [-1, .5, 1441, Infinity, NaN, 1_000_001]) assert.throws(() => host.advance(state, target));
    assert.equal(host.advance(state, 0), state);
    let idle = host.advance(state, 1440); idle = host.advance(idle, 2880);
    const wire = host.exportState(idle); assert.ok(JSON.stringify(wire).length < 8192);
    assert.equal(idle.minute, 2880); assert.equal(idle.paid.mara.rest.minutes, 2880);
    assert.deepEqual(host.exportState(host.restoreState(wire)), wire);
    wire.state.seal.place = 'spent'; assert.equal(idle.seal.place, 'shelf');
    assert.ok(Object.isFrozen(idle.people.mara.body));
    // An explicitly constructed current-state boundary fixture, not an observed history.
    const boundary = host.exportState(state); boundary.state.minute = 999999;
    for (const id of ['mara', 'tomas', 'nuri']) {
      boundary.state.people[id].person.minutes = 999999; boundary.state.people[id].person.nextAttempt = 1000000;
      boundary.state.people[id].person.body = {fatigue: 0, hunger: 1};
      boundary.state.paid[id].rest.minutes = 999999;
    }
    const limit = host.advance(host.restoreState(boundary), 1000000);
    assert.equal(limit.minute, 1000000); assert.throws(() => host.advance(limit, 1000001));
  });
}

test('actual per-minute Human capacity is checked and leaves the original person unpaid', () => {
  const person = createPerson({id: 'mara', body: {fatigue: .999, hunger: .2}, skills: {repair: .1}});
  const before = structuredClone(person);
  assert.throws(() => payMinute(person, 'repair', .01), /Actual paid minute exceeds capacity/);
  assert.deepEqual(person, before); assert.equal(person.minutes, 0);
});

test('direct dependency source does not import or call the candidate', () => {
  const source = readFileSync(new URL('../src/direct-pump.js', import.meta.url), 'utf8');
  assert.equal(source.includes("from 'paid-work-probe'"), false);
  assert.equal(source.includes('candidate'), false);
});

test('permission-model run confines reads to the independent directory', {skip: !process.permission}, () => {
  // Checking permission does not perform a read of an external path.
  assert.equal(process.permission.has('fs.read', '/outside-independent-directory/probe'), false);
  assert.equal(process.permission.has('fs.read', new URL('../REQUIREMENTS.md', import.meta.url).pathname), true);
});
