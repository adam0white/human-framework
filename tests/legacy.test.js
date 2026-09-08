import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as current from '../src/core/index.js';
import * as old from '../src/legacy/v0.1/index.js';
import * as previous from '../src/legacy/v0.2/index.js';
import {fixture} from './fixtures-v0.2.js';

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

test('0.2.0 archive implementation hashes preserve the previous release byte for byte',()=>{
  const hashes={
    model:'3b129e5ec7c7bbb826dbaf4aae5b9813e7e50d5051ad3cc3c5617e87eb89ca2f',
    simulation:'5534e54473afa75183e6a321e2feedba2bc3eda088493e18de2c9df2642828f6',
    observation:'1d88d63ef05d9dffcd0ce9651f4e3f0e442359edabe0ae4b17625ca081e34da9',
    policy:'8079cd76e77d7639bff57ec2828e592639981a4cc65742c738379e834fb33835',
    random:'d2c76c3105a86b052a6694a4709e67f58f9a88dad9eccc62d397c2e87f4eaeec'
  };
  for(const [file,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(readFileSync(new URL(`../src/legacy/v0.2/${file}.js`,import.meta.url))).digest('hex'),hash,file);
});

test('0.2.0 full and baseline golden states retain inspection, ranking, replay and export semantics',()=>{
  const cases=[
    [7,'full','2a26e55563b4102921e19d2312fb292367644a569447c055217108b2551238af'],
    [7,'baseline','3b66131af191cb8aa0bfbcfd774340378b7d78a87a461b81891be0ce19957eb9'],
    [27,'full','a7b3f626a3326509d7c1924a087a83fe61c2649080edaea2c4eb7433ce9625f9'],
    [27,'baseline','3890e80680c61f0e7aab6bb2b6f2b29741f8417fa7246c398161caa765768a29']
  ];
  for(const [seed,policy,hash] of cases) {
    const state=previous.runSimulation(fixture,{seed,policy});
    assert.equal(createHash('sha256').update(JSON.stringify(state)).digest('hex'),hash);
    const exported=previous.exportReplay(state),restored=current.replay(exported);
    assert.deepEqual(restored,state);
    assert.deepEqual(current.exportReplay(restored),exported);
    const view=current.getView(restored,'a');
    assert.equal(view.engineVersion,'0.2.0');
    assert.deepEqual(current.rankActions(view),previous.rankActions(view));
  }
  const partial=current.replay(previous.exportReplay(previous.step(previous.createSimulation(fixture))));
  assert.equal(partial.status,'running');
  assert.throws(()=>current.step(partial),/Incompatible engine version/);
  assert.throws(()=>current.rankActions(current.getView(partial,'a'),{policy:'planned-simple'}),/Unknown policy/);
});

test('unknown versions cannot be relabeled through facade exports, projections or ranking',()=>{
  const record=previous.exportReplay(previous.createSimulation(fixture));
  assert.throws(()=>current.replay({...record,engineVersion:'0.4.0'}),/version/);
  const state=previous.createSimulation(fixture);state.version='0.4.0';
  assert.throws(()=>current.exportReplay(state),/version/);
  assert.throws(()=>current.getView(state,'a'),/version/);
  assert.throws(()=>current.rankActions({engineVersion:'0.4.0'}),/version/);
});
