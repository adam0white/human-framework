import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as current from '../src/core/index.js';
import * as old from '../src/legacy/v0.1/index.js';
import {fixture} from './fixtures.js';

test('0.1.0 historical replay preserves original behavior and cannot continue under current physics',()=>{
  const hashes={7:'178c4b7d6f342ce62b202fd1a3058e2bbfde84dfb3f4fc69e0b169bafa8230c7',27:'3aa86617d46caddf76c58ff23e6a451a46bd7d766b584d902b73d98354b5031f'};
  for(const [seed,hash] of Object.entries(hashes)) {
    const state=old.runSimulation(fixture,{seed:Number(seed)});
    assert.equal(createHash('sha256').update(JSON.stringify(state)).digest('hex'),hash);
    const exported=old.exportReplay(state),restored=current.replay(exported);
    assert.deepEqual(restored,state);
    assert.deepEqual(current.exportReplay(restored),exported);
    const view=current.getView(restored,'a');
    assert.equal(view.engineVersion,'0.1.0');
    assert.deepEqual(current.rankActions(view),old.rankActions(view));
  }
  const partial=current.replay(old.exportReplay(old.step(old.createSimulation(fixture))));
  assert.equal(partial.status,'running');
  assert.throws(()=>current.step(partial),/Incompatible engine version/);
});
