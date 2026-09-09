import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname,resolve,relative,join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';

// Exploration, not a candidate implementation or a preregistered effectiveness test.
// One nominated opportunity; no state editing, custom creation, or deadline changes.
const SOURCE='f5ced4473769ceedbe10cded297599231b052bb5';
const output=process.argv[2];if(!output)throw Error('Pass a new output directory');
mkdirSync(output);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const readAt=path=>execFileSync('git',['show',`${SOURCE}:${path}`],{maxBuffer:20e6});
const sources=new Map();
function visit(path){if(sources.has(path))return;const bytes=readAt(path);sources.set(path,bytes);for(const match of bytes.toString().matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))visit(relative(process.cwd(),resolve(dirname(path),match[1])));}
visit('src/games/camp-current.js');
const dir=mkdtempSync(join(tmpdir(),'hf-meal-opportunity-'));
for(const [path,bytes]of sources){assert.equal(sha(readFileSync(path)),sha(bytes),`Workspace physical graph differs at ${path}`);mkdirSync(dirname(join(dir,path)),{recursive:true});writeFileSync(join(dir,path),bytes);}
writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
const api=await import(pathToFileURL(join(dir,'src/games/camp-current.js')));
const archive=gzipSync(JSON.stringify(Object.fromEntries([...sources].map(([path,bytes])=>[path,bytes.toString()])))+'\n',{level:9});
writeFileSync(join(output,'sources.json.gz'),archive,{flag:'wx'});
const tracePath='artifacts/camp-maintenance/release-current/earned-supply-success.json.gz';
const traceBytes=readAt(tracePath);assert.equal(sha(readFileSync(tracePath)),sha(traceBytes));
const trace=JSON.parse(gunzipSync(traceBytes)),prefixCount=50;
const operate=(game,c)=>c.type==='advance'?api.advanceGame(game,c.minutes):c.type==='next'?api.advanceToNextEvent(game):api.applyCommand(game,c);
function summary(game){const v=api.getGameView(game);return {now:v.now,phase:v.phase,stock:game.stock,playerBody:game.people.player.body,neighborBody:game.people.neighbor.body,paid:game.paid,caches:game.caches,householdsEquipped:v.householdsEquipped,campNights:v.campNights,unprovidedHouseholds:v.unprovidedHouseholds,unprovidedNights:v.unprovidedNights,playerJob:v.people.player.job,neighborJob:v.people.neighbor.job,commitment:game.commitment,nextStop:v.nextStop,window:game.window};}
const records=[];
function branch(id){let game=api.createGame();const record={id,initial:api.exportGame(game),steps:[],marks:[],failures:[]};
 const view=()=>api.getGameView(game);
 function act(command,label=null,expectedFailure=false){const before=JSON.stringify(game),beforeView=view();try{const next=operate(game,command);assert.equal(JSON.stringify(game),before);game=next;const snapshot=api.exportGame(game);record.steps.push({command,label,beforeView,snapshot,afterView:view()});assert.deepEqual(api.exportGame(api.restoreGame(JSON.parse(JSON.stringify(snapshot)))),snapshot);if(expectedFailure)throw Error('Expected command to fail');return true;}catch(error){assert.equal(JSON.stringify(game),before);record.failures.push({command,label,at:view().now,error:error.message,snapshot:api.exportGame(game),view:beforeView});if(!expectedFailure)throw error;return false;}}
 for(let i=0;i<prefixCount;i++){act(trace.steps[i].command,`original-prefix-${i+1}`);assert.deepEqual(api.exportGame(game),trace.steps[i].snapshot,`Exact archived prefix ${i+1}`);}
 function mark(label){record.marks.push({label,step:record.steps.length,snapshot:api.exportGame(game),view:view(),summary:summary(game)});}
 function until(time){assert.ok(time>=view().now);while(view().now<time){if(view().phase==='ferry')act({type:'dispatch'});else act({type:'advance',minutes:time-view().now});}}
 function completePlayer(){for(let i=0;view().people.player.job&&i<40;i++){if(view().phase==='ferry')act({type:'dispatch'});else if(view().phase==='rain')return false;else act({type:'next'});}return !view().people.player.job;}
 function buildSecond(){act({type:'allocate',destination:'households'});act({type:'request',project:'cache'});act({type:'start',job:'build-cache'});assert.ok(completePlayer());act({type:'allocate',destination:'households'});act({type:'request',project:'cache'});mark('second-household-cache-allocated');}
 // Existing build-first policy shape, copied in this private harness to avoid
 // importing an unrelated legacy host. Only ordinary views choose the actions.
 function supplyTail(){for(let i=0;i<180;i++){const v=view(),can=id=>v.choices.find(c=>c.id===id&&!c.unavailable);if(v.availableCaches&&v.campNights<4){act({type:'allocate',destination:'camp'});continue;}if(v.phase==='ferry'){act({type:'dispatch'});continue;}if(v.canFinish||v.phase==='rain'){act({type:'finish'});mark('supply-window-finished');return;}if(v.commitment.status!=='accepted'){act({type:'request',project:'cache'});continue;}if(v.people.player.job){act({type:'next'});continue;}const body=v.people.player.body;if(body.hunger>=.60){act({type:'start',job:can('eat')?'eat':'forage'});continue;}if(body.fatigue>=.65){act({type:'next'});continue;}if(can('build-cache')){act({type:'start',job:'build-cache'});continue;}const gather=v.stock.timber<6?'gather-timber':v.stock.salvage<3?'gather-salvage':null;if(gather&&can(gather)){act({type:'start',job:gather});continue;}if(v.people.neighbor.job?.id==='build-cache'){act({type:'next'});continue;}if(body.hunger>.45){act({type:'start',job:can('eat')?'eat':'forage'});continue;}act({type:'next'});}throw Error('Bounded supply continuation exhausted');}
 mark('anchor-at-278');records.push(record);return {act,view,mark,until,completePlayer,buildSecond,supplyTail,record,get game(){return game;}};
}
for(const arm of ['finish-meal-first','wait-task-then-meal','cancel-task-restart']){
 const b=branch(arm);
 // Task-first attempt retained independently in each equal pre-meal state.
 b.act({type:'start',job:'build-cache'},'task-before-meal-unavailable',true);
 if(arm==='wait-task-then-meal')b.until(283);
 else{b.act({type:'start',job:'eat'});b.until(283);b.mark('meal-partly-paid-at-natural-completion');if(arm==='cancel-task-restart')b.act({type:'cancel'});else b.until(286);}
 b.buildSecond();
 if(arm!=='finish-meal-first'){b.act({type:'start',job:'eat'});assert.ok(b.completePlayer());}
 b.mark('both-second-cache-and-one-completed-meal');b.supplyTail();b.record.final=summary(b.game);
 const bytes=gzipSync(JSON.stringify(b.record)+'\n',{level:9});writeFileSync(join(output,`${arm}.json.gz`),bytes,{flag:'wx'});b.record.traceSha256=sha(bytes);
}
const report={kind:'bounded-ordinary-opportunity-exploration',sourceCommit:SOURCE,node:process.version,sourceArchiveSha256:sha(archive),sources:[...sources].map(([path,bytes])=>({path,sha256:sha(bytes),bytes:bytes.length})),harness:{path:'artifacts/meal-preflight/opportunity/probe.mjs',sha256:sha(readFileSync(import.meta.filename))},anchor:{tracePath,traceSha256:sha(traceBytes),prefixCommands:prefixCount,at:278,eventAt:283,ferryAt:314,rainAt:404},records:records.map(r=>({id:r.id,traceSha256:r.traceSha256,commands:r.steps.length,failures:r.failures.map(f=>({at:f.at,command:f.command,error:f.error})),marks:r.marks.map(m=>({label:m.label,...m.summary})),final:r.final}))};
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report.records.map(r=>({id:r.id,marks:r.marks.map(m=>({label:m.label,now:m.now,body:m.playerBody,paid:m.paid.player,households:m.householdsEquipped,nights:m.campNights})),final:r.final})),null,2));
