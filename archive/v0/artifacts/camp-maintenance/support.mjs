import {readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname,resolve,relative,join} from 'node:path';
import {tmpdir} from 'node:os';
export const OLD_SOURCE='91697f2697f4bc9d26a3df36552f71a865d973c6';
export const DELIVERED_SOURCE='7dbf9ae';
export const sha=value=>createHash('sha256').update(value).digest('hex');
export const readAt=(commit,path)=>execFileSync('git',['show',`${commit}:${path}`],{maxBuffer:20*1024*1024});
export function closure(entry,read=path=>readFileSync(path)){
 const seen=new Set();function visit(path){if(seen.has(path))return;seen.add(path);for(const m of read(path).toString().matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))visit(relative(process.cwd(),resolve(dirname(path),m[1])));}
 visit(entry);const paths=[...seen].sort();return {entry,files:paths.map(path=>{const bytes=read(path);return {path,bytes:bytes.length,sha256:sha(bytes),nonblankLines:bytes.toString().split('\n').filter(line=>line.trim()).length};}),totalBytes:paths.reduce((sum,path)=>sum+read(path).length,0)};
}
export function materializeOld(){const dir=mkdtempSync(join(tmpdir(),'hf-camp-maintenance-old-'));const paths=[...new Set([...closure('web/camp.js',p=>readAt(OLD_SOURCE,p)).files.map(f=>f.path),'src/games/commons-policy.js'])];for(const path of paths){mkdirSync(dirname(join(dir,path)),{recursive:true});writeFileSync(join(dir,path),readAt(OLD_SOURCE,path));}writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');return dir;}
export function oldCommand(api,game,command){switch(command.type){case 'start':return api.startJob(game,command.job);case 'request':return api.requestProject(game,command.project);case 'cancel':return api.cancelJob(game);case 'release':return api.releaseProject(game);case 'handover':return api.requestHandover(game,command.from,command.to);case 'advance':return api.advanceGame(game,command.minutes);case 'next':return api.advanceToNextEvent(game);case 'continue':return api.continueStory(game);case 'allocate':return api.allocateCache(game,command.destination);case 'dispatch':return api.dispatchFerry(game);case 'finish':return api.finishStory(game);case 'return':return api.returnToCamp(game);default:throw Error(`Unknown command ${command.type}`);}}
const pick=(value,fields)=>Object.fromEntries(fields.filter(field=>Object.hasOwn(value,field)).map(field=>[field,structuredClone(value[field])]));
// Physical comparison protocol, fixed before any current-host execution. Complete original
// snapshots remain alongside this projection. Text and explicit history/version metadata
// are not physical equality claims. Field removals require named comparison dispositions.
export function physical(game,view){const w=game.world??game;
 return {now:w.clock.now,phase:view.phase,stock:structuredClone(w.stock),structures:structuredClone(w.structures),caches:w.caches,milestoneAt:w.milestoneAt,
 people:Object.fromEntries(Object.entries(w.people).map(([id,p])=>[id,pick(p,['id','body','skills','minutes','nextAttempt','pending'])])),
 jobs:Object.fromEntries(Object.entries(w.jobs).map(([id,j])=>[id,j?pick(j,['kind','id','project','stage','workId','startedAt','endsAt','duration','cost','output','benefits','skillBefore','action','eventId','attemptId']):null])),
 clock:structuredClone(w.clock),work:Object.fromEntries(Object.entries(w.work).map(([id,x])=>[id,pick(x,['id','project','stage','cost','progress','workbenchAtStart','durationByActor','contributions','completedAt'])])),lastAssemblies:Object.fromEntries(Object.entries(w.lastAssemblies).map(([id,x])=>[id,pick(x,['id','project','stage','cost','progress','workbenchAtStart','durationByActor','contributions','completedAt'])])),paid:structuredClone(w.paid),stats:structuredClone(w.stats),recovering:structuredClone(w.recovering),
 commitment:pick(w.commitment,['status','project','acceptedAt','finishedAt','startCaches']),lastResponse:w.lastResponse?pick(w.lastResponse,['at','project','accepted','kind','from','to']):null,
 window:structuredClone(game.window),returned:game.returned,availableCaches:view.availableCaches,householdsEquipped:view.householdsEquipped,campNights:view.campNights,
 unprovidedHouseholds:view.unprovidedHouseholds,unprovidedNights:view.unprovidedNights,canFinish:view.canFinish,canAdvance:view.canAdvance,canAssign:view.canAssign,
 nextEventAt:view.nextEventAt,nextStop:view.nextStop?pick(view.nextStop,['at','reason']):null};}
