import test from 'node:test';
import assert from 'node:assert/strict';
import {candidate, candidatePump} from '../src/candidate-pump.js';
import {direct, directPump} from '../src/direct-pump.js';
import {importCases, importFixture} from './import-fixtures.js';
for (const [arm, host, rules] of [['candidate', candidate, candidatePump], ['direct', direct, directPump]]) {
  for (const spec of importCases) test(`${arm}: reject ${spec.name}`, () => {
    const snapshot = importFixture(arm, spec), before = structuredClone(snapshot);
    assert.throws(() => host.restoreState(snapshot));
    assert.deepEqual(snapshot, before);
    if (spec.invariant === 'generic-terminal') assert.throws(() => rules.unpack(snapshot.state.pumps.south.work));
  });
  test(`${arm}: distinct actors can pay each item's minute zero before the tool`, () => {
    let state = host.start(host.create({twoPumps: true, tool: true}), 'mara', 'south').state;
    state = host.start(state, 'tomas', 'north').state;
    for (let minute = 1; minute <= 40; minute++) {
      state = host.advance(state, minute);
      assert.deepEqual(host.exportState(host.restoreState(host.exportState(state))), host.exportState(state));
    }
    assert.equal(state.pumps.south.finishedAt, 15); assert.equal(state.pumps.north.finishedAt, 13);
  });
  test(`${arm}: delayed tool setup retains legal exposure before and after arrival`, () => {
    let state = host.stop(host.create({tool: true}), 'nuri').state;
    state = host.start(state, 'mara').state;
    for (let minute = 1; minute <= 40; minute++) {
      if (minute === 8) state = host.startTool(state, 'nuri').state;
      state = host.advance(state, minute);
      assert.deepEqual(host.exportState(host.restoreState(host.exportState(state))), host.exportState(state));
    }
    assert.equal(state.tooling.readyAt, 8); assert.equal(state.pumps.south.finishedAt, 17);
  });
  test(`${arm}: a hauler can begin paid repair after the initial duty`, () => {
    let state = host.advance(host.create({busy: true, tool: true}), 4);
    state = host.start(state, 'tomas').state;
    for (let minute = 5; minute <= 40; minute++) {
      state = host.advance(state, minute);
      assert.deepEqual(host.exportState(host.restoreState(host.exportState(state))), host.exportState(state));
    }
    assert.equal(state.pumps.south.finishedAt, 16); assert.equal(state.paid.tomas.hauling.minutes, 4);
  });
}
