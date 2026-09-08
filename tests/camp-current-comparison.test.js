import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as current from '../src/games/camp-current.js';
import {sha,physical,closure} from '../artifacts/camp-maintenance/support.mjs';
const root=new URL('../artifacts/camp-maintenance/',import.meta.url);
const report=JSON.parse(readFileSync(new URL('baseline/report.json',root)));
const readTrace=id=>JSON.parse(gunzipSync(readFileSync(new URL(`baseline/${id}.json.gz`,root))));
const apply=(game,c)=>c.type==='advance'?current.advanceGame(game,c.minutes):c.type==='next'?current.advanceToNextEvent(game):current.applyCommand(game,c);

test('source-frozen baseline bytes and all original commands remain intact',()=>{
 for(const file of report.harness)assert.equal(sha(readFileSync(new URL('../'+file.path,import.meta.url))),file.sha256,file.path);
 for(const result of report.results){const bytes=readFileSync(new URL(`baseline/${result.id}.json.gz`,root));assert.equal(sha(bytes),result.traceSha256,result.id);assert.deepEqual(JSON.parse(gunzipSync(bytes)).steps.map(step=>step.command),result.commands);}
 assert.equal(report.results.reduce((sum,r)=>sum+r.steps,0),201);
});

for(const result of report.results)test(`current Camp retains frozen physical trace: ${result.id}`,()=>{
 const trace=readTrace(result.id);let game=current.createGame();
 for(let index=0;index<trace.steps.length;index++){
  const step=trace.steps[index],previous=game,before=JSON.stringify(game);game=apply(game,step.command);assert.equal(JSON.stringify(previous),before,'Command mutated its input');const actual=physical(game,current.getGameView(game)),expected=structuredClone(step.physical);
  // Explicit disposition of the only first-comparison view difference: a paused
  // host has no actionable Next stop. Old Story exposed its underlying world forecast.
  if(!expected.canAdvance){assert.equal(actual.nextStop,null);expected.nextStop=null;}
  assert.deepEqual(actual,expected,`${result.id} command ${index+1}: ${JSON.stringify(step.command)}`);
  const saved=current.exportGame(game);assert.deepEqual(current.exportGame(current.restoreGame(JSON.parse(JSON.stringify(saved)))),saved,'JSON restoration changes current state');
 }
});

test('current-snapshot assurance retains pending and ownership checks while dropping window body replay',()=>{
 const selected=new Map();for(const id of new Set(report.validationProbes.map(p=>p.traceId))){const trace=readTrace(id);let game=current.createGame();for(let index=0;index<trace.steps.length;index++){game=apply(game,trace.steps[index].command);for(const mark of trace.marks.filter(m=>m.step===index+1))selected.set(`${id}/${mark.label}`,current.exportGame(game));}}
 for(const probe of report.validationProbes){const snapshot=structuredClone(selected.get(`${probe.traceId}/${probe.label}`));if(probe.mutation==='bounded-body-change')snapshot.game.people.player.body.fatigue=Math.min(.99,snapshot.game.people.player.body.fatigue+.01);else snapshot.game.stock.food++;
  const accepts=probe.mutation==='bounded-body-change'&&probe.label!=='active-gather';if(accepts)assert.doesNotThrow(()=>current.restoreGame(snapshot),`${probe.traceId}/${probe.label}`);else assert.throws(()=>current.restoreGame(snapshot),undefined,`${probe.traceId}/${probe.label}`);
 }
 assert.throws(()=>current.restoreGame(readTrace('gather-accepted-project').initial),/unsupported|incompatible|older/i);
});


test('the active Camp page has no historical host, persistence, old Human or private experiment dependency',()=>{
 const page=readFileSync(new URL('../web/camp.html',import.meta.url),'utf8'),entry=page.match(/<script\s+type="module"\s+src="([^"]+)"/)[1].replace(/^\//,'');
 const files=closure(entry).files.map(file=>file.path);
 assert.ok(files.includes('src/games/camp-current.js'));
 for(const file of files)assert.doesNotMatch(file,/src\/games\/(?:camp\.js|camp-story\.js|commons(?:-next|-policy)?\.js)|src\/human\/index\.js|src\/experiments\/|web\/camp-(?:session|slots)\.js/,file);
});

test('reviewed current validation rejects both preserved payment-ownership counterexamples',()=>{
 const evidence=JSON.parse(readFileSync(new URL('reviewed-current/corrections/report.json',root)));
 for(const item of evidence.results){
  const bytes=readFileSync(new URL(`reviewed-current/corrections/${item.id}.json.gz`,root));assert.equal(sha(bytes),item.mutatedSnapshotSha256);
  assert.equal(item.outcomes['final-current'].accepted,true,'The archived previous validator admitted this counterexample');
  assert.equal(item.outcomes['reviewed-current'].accepted,false);
  assert.throws(()=>current.restoreGame(JSON.parse(gunzipSync(bytes))),/paid|effort/i,item.id);
  const original=readFileSync(new URL(`reviewed-current/boundaries/${item.boundary}.json`,root));assert.equal(sha(original),item.originalSnapshotSha256);assert.doesNotThrow(()=>current.restoreGame(JSON.parse(original)));
 }
});
