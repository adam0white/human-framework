import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createGame,playTurn,exportGame} from '../src/games/courtyard.js';
const session=await import('../src/games/courtyard-session.js');
const bench=await import('../scripts/courtyard-benchmark.js');
test('courtyard replay and benchmark expose separate bounded recording contracts',()=>{
  assert.equal(typeof session.replaySession,'function','Separate replay is missing');
  assert.equal(typeof bench.compareCourtyardControllers,'function','Paired benchmark is missing');
});
test('a separate replay reproduces conversation, delay and resource effects exactly',()=>{
  const setup={seed:4,profile:'standard',socialMemory:true},actions=['borrow','pour','rest','draw-careful','repay'];
  let g=createGame(setup);for(const action of actions)g=playTurn(g,action);
  const record=session.createSession(setup,actions);
  assert.deepEqual(exportGame(session.replaySession(record)),exportGame(g));
  assert.throws(()=>session.replaySession({...record,version:'999'}));
  assert.throws(()=>session.createSession(setup,Array(19).fill('rest')));
  assert.equal('actions' in exportGame(g),false);
});
test('paired policy rows keep exact seeds, source files, failed cases and null equality',()=>{
  const artifact=bench.compareCourtyardControllers({seeds:3,startSeed:11});
  assert.deepEqual(artifact.seedValues,[11,12,13]);
  assert.equal(artifact.rows.length,3*3*3*2);
  assert.ok(artifact.rows.every(r=>r.rounds===18&&r.playerStored<=14&&r.neighborStored<=14));
  for(const [file,hash] of Object.entries(artifact.sourceSha256)){
    assert.equal(createHash('sha256').update(readFileSync(new URL(`../${file}`,import.meta.url))).digest('hex'),hash);
  }
  assert.ok(artifact.comparisons.every(c=>c.pairs.length===3));
  assert.throws(()=>bench.compareCourtyardControllers({seeds:0}));
  assert.throws(()=>bench.compareCourtyardControllers({seeds:2,startSeed:4294967295}));
});
test('published comparison hashes match current sources and the prior comparison retains verifiable source text',()=>{
  const current=JSON.parse(readFileSync(new URL('../artifacts/courtyard-benchmark.json',import.meta.url)));
  const prior=JSON.parse(readFileSync(new URL('../artifacts/courtyard-benchmark-before-final-pour.json',import.meta.url)));
  for(const [file,sha] of Object.entries(current.sourceSha256))assert.equal(createHash('sha256').update(readFileSync(new URL(`../${file}`,import.meta.url))).digest('hex'),sha);
  for(const [file,sha] of Object.entries(prior.sourceSha256))assert.equal(createHash('sha256').update(prior.archive.sourceTexts[file]).digest('hex'),sha);
  assert.equal(current.rows.length,900);assert.equal(prior.rows.length,900);
  assert.deepEqual(current.seedValues,prior.seedValues);
  assert.ok(current.negativeCases.length>0);assert.ok(prior.negativeCases.length>0);
});
