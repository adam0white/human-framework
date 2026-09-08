import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {sha,closure,physical} from './support.mjs';
const [output,freezeCommit]=process.argv.slice(2);if(!output||!freezeCommit)throw Error('Usage: node artifacts/camp-maintenance/compare-current.mjs NEW_OUTPUT BASELINE_FREEZE_COMMIT');
const baselinePath='artifacts/camp-maintenance/baseline/report.json',baselineRaw=readFileSync(baselinePath),baseline=JSON.parse(baselineRaw);
assert.equal(sha(execFileSync('git',['show',`${freezeCommit}:${baselinePath}`])),sha(baselineRaw),'Baseline must match its prior committed freeze');
for(const file of baseline.harness)assert.equal(sha(readFileSync(file.path)),file.sha256,`Frozen harness changed: ${file.path}`);
for(const trace of baseline.results)assert.equal(sha(readFileSync(`artifacts/camp-maintenance/baseline/${trace.id}.json.gz`)),trace.traceSha256,`Frozen trace changed: ${trace.id}`);
mkdirSync(output);const captured=new Map(),read=path=>{if(!captured.has(path))captured.set(path,readFileSync(path));return captured.get(path);};
const sourceCosts={activeBrowser:closure('web/camp.js',read),host:closure('src/games/camp-current.js',read)};
const sourceDir=mkdtempSync(join(tmpdir(),'hf-camp-maintenance-current-'));
for(const [path,bytes] of captured){mkdirSync(dirname(join(sourceDir,path)),{recursive:true});writeFileSync(join(sourceDir,path),bytes);}writeFileSync(join(sourceDir,'package.json'),'{"type":"module"}\n');
const entry=join(sourceDir,'src/games/camp-current.js'),api=await import(pathToFileURL(entry));
const command=(game,c)=>c.type==='advance'?api.advanceGame(game,c.minutes):c.type==='next'?api.advanceToNextEvent(game):api.applyCommand(game,c);
function differences(old,current,path=''){
 if(Object.is(old,current))return [];if(old===null||current===null||typeof old!=='object'||typeof current!=='object'||Array.isArray(old)!==Array.isArray(current))return [{path,old,current}];
 const keys=[...new Set([...Object.keys(old),...Object.keys(current)])].sort();return keys.flatMap(key=>differences(old[key],current[key],path?`${path}.${key}`:key));
}
const results=[],validationProbes=[],boundaryDirectory=join(output,'boundaries');mkdirSync(boundaryDirectory);
for(const baselineResult of baseline.results){
 const original=JSON.parse(gunzipSync(readFileSync(`artifacts/camp-maintenance/baseline/${baselineResult.id}.json.gz`)));
 let game=api.createGame(),states=[],failedCommand=null;const marks=[];
 // Original initial view is not stored independently. Initial full snapshot is retained;
 // equality gates below cover every original paid/assignment command and named boundary.
 for(let index=0;index<original.steps.length;index++){
  const step=original.steps[index],before=JSON.stringify(game);let next;
  try{next=command(game,step.command);}catch(error){assert.equal(JSON.stringify(game),before);failedCommand={step:index+1,command:step.command,error:error.message};break;}
  assert.equal(JSON.stringify(game),before,'Input mutation');game=next;const snapshot=api.exportGame(game),raw=JSON.stringify(snapshot),restored=api.restoreGame(JSON.parse(raw));assert.deepEqual(api.exportGame(restored),snapshot,'Cold JSON round trip changes state');
  const projection=physical(game,api.getGameView(game)),diffs=differences(step.physical,projection);states.push({command:step.command,snapshot,physical:projection,differences:diffs});
  for(const mark of original.marks.filter(mark=>mark.step===index+1))marks.push({label:mark.label,step:index+1,snapshot,physical:projection});
 }
 const boundaries=[];
 for(const mark of marks){const raw=JSON.stringify(mark.snapshot),file=join(boundaryDirectory,`${original.id}-${mark.label}.json`);writeFileSync(file,raw+'\n',{flag:'wx'});const cold=[];
  for(let i=0;i<5;i++)cold.push(JSON.parse(execFileSync(process.execPath,[resolve('artifacts/camp-maintenance/cold-restore.mjs'),entry,resolve(file)],{encoding:'utf8'})));
  const median=key=>cold.map(t=>t[key]).sort((a,b)=>a-b)[2],prior=baselineResult.boundaries.find(b=>b.label===mark.label);
  boundaries.push({label:mark.label,step:mark.step,now:mark.physical.now,phase:mark.physical.phase,serializedBytes:Buffer.byteLength(raw),snapshotSha256:sha(raw),cold,medianImportMs:median('importMs'),medianParseAndRestoreMs:median('parseAndRestoreMs'),oldSerializedBytes:prior.serializedBytes,oldMedianParseAndRestoreMs:prior.medianParseAndRestoreMs});
 }
 for(const probe of baseline.validationProbes.filter(p=>p.traceId===original.id)){
  const mark=marks.find(m=>m.label===probe.label);if(!mark)continue;const snapshot=structuredClone(mark.snapshot),w=snapshot.game.world??snapshot.game;
  if(probe.mutation==='bounded-body-change')w.people.player.body.fatigue=Math.min(.99,w.people.player.body.fatigue+.01);else w.stock.food++;
  let accepted,error;try{api.restoreGame(snapshot);accepted=true;}catch(e){accepted=false;error=e.message;}validationProbes.push({...probe,oldAccepted:probe.accepted,oldError:probe.error,accepted,error});
 }
 const payload=gzipSync(JSON.stringify({id:original.id,initial:api.exportGame(api.createGame()),steps:states,marks,failedCommand})+'\n',{level:9});writeFileSync(join(output,`${original.id}.json.gz`),payload,{flag:'wx'});
 const changed=states.flatMap((s,i)=>s.differences.length?[{step:i+1,command:s.command,differences:s.differences}]:[]);
 results.push({id:original.id,expectedCommands:original.steps.length,executedCommands:states.length,failedCommand,changedSteps:changed.length,differenceCount:changed.reduce((sum,s)=>sum+s.differences.length,0),firstDifferences:changed.slice(0,5),traceSha256:sha(payload),boundaries});
 console.log(JSON.stringify({id:original.id,commands:states.length,changedSteps:changed.length,failedCommand}));
}
let rejectsOldFormat=false,oldFormatError;try{api.restoreGame(JSON.parse(gunzipSync(readFileSync('artifacts/camp-maintenance/baseline/gather-accepted-project.json.gz'))).initial);}catch(e){rejectsOldFormat=true;oldFormatError=e.message;}
const report={protocol:'camp-maintenance-fresh-traces-1',baselineFreezeCommit:freezeCommit,baselineReportSha256:sha(baselineRaw),sourceBaseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceStatus:execFileSync('git',['status','--short'],{encoding:'utf8'}).trim(),createdAt:new Date().toISOString(),node:process.version,execPath:process.execPath,command:process.argv.map(x=>JSON.stringify(x)).join(' '),sourceCosts,sourceCaptureNote:'All imported source bytes were captured and hashed before import, then materialized in a fresh directory; evolving workspace changes cannot affect this run.',harness:['compare-current.mjs','support.mjs','cold-restore.mjs'].map(file=>({path:'artifacts/camp-maintenance/'+file,sha256:sha(readFileSync('artifacts/camp-maintenance/'+file))})),validationProbes,rejectsOldFormat,oldFormatError,results};
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
