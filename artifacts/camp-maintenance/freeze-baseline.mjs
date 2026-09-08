import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {OLD_SOURCE,DELIVERED_SOURCE,sha,readAt,closure,materializeOld,oldCommand,physical} from './support.mjs';
import {recipes} from './recipes.mjs';
const output=process.argv[2];if(!output)throw Error('An unused output directory is required');mkdirSync(output);
const sourceDir=materializeOld(),api=await import(pathToFileURL(join(sourceDir,'src/games/camp-story.js'))),policy=await import(pathToFileURL(join(sourceDir,'src/games/commons-policy.js')));
const sourceCosts={activeBrowser:closure('web/camp.js',p=>readAt(OLD_SOURCE,p)),host:closure('src/games/camp-story.js',p=>readAt(OLD_SOURCE,p))};
const deliveredPaths=['src/games/camp.js','src/games/camp-story.js','web/camp.js','web/camp-session.js','web/camp-slots.js','web/camp.html','web/camp.css'];
const deliveredIdentity=deliveredPaths.map(path=>{const sourceSha256=sha(readAt(OLD_SOURCE,path)),deliveredSha256=sha(readAt(DELIVERED_SOURCE,path));assert.equal(sourceSha256,deliveredSha256,path);return {path,sourceSha256,deliveredSha256};});
const traces=recipes(api,policy.chooseCommand,oldCommand,api.exportGame),results=[];
for(const trace of traces){
 for(const item of [trace.initial,...trace.steps.map(x=>x.snapshot),...trace.marks.map(x=>x.snapshot)])assert.deepEqual(api.exportGame(api.restoreGame(JSON.parse(JSON.stringify(item)))),item);
 const complete={...trace,steps:trace.steps.map(step=>({...step,physical:physical(step.snapshot.game,api.getGameView(step.snapshot.game))})),marks:trace.marks.map(mark=>({...mark,physical:physical(mark.snapshot.game,api.getGameView(mark.snapshot.game))}))};
 const bytes=gzipSync(JSON.stringify(complete)+'\n',{level:9});writeFileSync(join(output,trace.id+'.json.gz'),bytes,{flag:'wx'});
 const boundaries=[];
 for(const mark of trace.marks){
  const raw=JSON.stringify(mark.snapshot),file=join(sourceDir,'cold-snapshot.json');writeFileSync(file,raw);const cold=[];
  // Five independent processes; each fresh import/JSON parse/first restore. No warm trial.
  for(let n=0;n<5;n++)cold.push(JSON.parse(execFileSync(process.execPath,[resolve('artifacts/camp-maintenance/cold-restore.mjs'),join(sourceDir,'src/games/camp-story.js'),file],{encoding:'utf8'})));
  const median=key=>cold.map(t=>t[key]).sort((a,b)=>a-b)[2];
  boundaries.push({label:mark.label,step:mark.step,now:mark.snapshot.game.world.clock.now,phase:api.getGameView(mark.snapshot.game).phase,serializedBytes:Buffer.byteLength(raw),snapshotSha256:sha(raw),historyRootBytes:mark.snapshot.game.record?Buffer.byteLength(JSON.stringify(mark.snapshot.game.record.root)):0,journalBytes:mark.snapshot.game.record?Buffer.byteLength(JSON.stringify(mark.snapshot.game.record.commands)):0,journalCommands:mark.snapshot.game.record?.commands.length??0,cold,medianImportMs:median('importMs'),medianParseAndRestoreMs:median('parseAndRestoreMs')});
 }
 results.push({id:trace.id,purpose:trace.purpose,commands:trace.steps.map(s=>s.command),steps:trace.steps.length,compressedTraceBytes:bytes.length,traceSha256:sha(bytes),boundaries});console.log(trace.id,trace.steps.length,boundaries.at(-1).now);
}
const harnessFiles=['support.mjs','recipes.mjs','cold-restore.mjs','freeze-baseline.mjs'];
const validationProbes=[];
for(const [traceId,label] of [['gather-accepted-project','active-gather'],['earned-supply-success','ferry-dispatched'],['earned-supply-success','final']]){
 const trace=traces.find(t=>t.id===traceId),mark=trace.marks.find(m=>m.label===label);
 for(const mutation of ['bounded-body-change','extra-unearned-food']){const snapshot=structuredClone(mark.snapshot);if(mutation==='bounded-body-change')snapshot.game.world.people.player.body.fatigue=Math.min(.99,snapshot.game.world.people.player.body.fatigue+.01);else snapshot.game.world.stock.food++;let accepted,error;try{api.restoreGame(snapshot);accepted=true;}catch(e){accepted=false;error=e.message;}validationProbes.push({traceId,label,mutation,accepted,error});}
}
const report={validationProbes,protocol:'camp-maintenance-fresh-traces-1',sourceCommit:OLD_SOURCE,deliveredSourceCommit:execFileSync('git',['rev-parse',DELIVERED_SOURCE],{encoding:'utf8'}).trim(),createdAt:new Date().toISOString(),node:process.version,execPath:process.execPath,command:process.argv.map(x=>JSON.stringify(x)).join(' '),deliveredIdentity,sourceCosts,harness:harnessFiles.map(file=>({path:'artifacts/camp-maintenance/'+file,sha256:sha(readFileSync('artifacts/camp-maintenance/'+file))})),results};
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
