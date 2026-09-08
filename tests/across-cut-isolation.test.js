import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const hostPath=new URL('../src/experiments/across-cut/host.js',import.meta.url);
test('the independently tested private host exists',()=>assert.ok(existsSync(hostPath)));
const h=existsSync(hostPath)?await import(hostPath):null;
const json=x=>JSON.parse(JSON.stringify(x));
const ask=(s,actor,action)=>h.request(s,actor,action);
const view=(s,actor)=>h.getActorView(s,actor);
const boundary=(s,actor)=>h.getKnownLocalBoundary(s,actor);
const advance=(s,to)=>h.advance(s,to);
const saveEqual=s=>{assert.deepEqual(h.restoreState(json(h.exportState(s))),s);return s;};
function twins(a,b,actor){
 assert.deepEqual(view(a,actor),view(b,actor));
 assert.deepEqual(boundary(a,actor),boundary(b,actor));
}
function commandResult(s,actor,action){
 const before=json(s);
 try{return {state:ask(s,actor,action),error:null};}
 catch(e){assert.deepEqual(s,before);return {state:s,error:{name:e.name,code:e.code??null,message:e.message}};}
}
function sameCommand(a,b,actor,action){
 const x=commandResult(a,actor,action),y=commandResult(b,actor,action);
 assert.deepEqual(x.error,y.error);twins(x.state,y.state,actor);return [x.state,y.state];
}
const reportIds=(s,actor,cue)=>view(s,actor).notebook.filter(n=>!cue||n.cue===cue).map(n=>n.receipt);
const latest=(s,actor,cue)=>view(s,actor).latest.find(n=>n.cue===cue);
const terms={releaseAt:12,attendFrom:14,attendUntil:18};

if(h){
test('a private early launch never ends or changes the remote actor before the common horizon',()=>{
 let a=h.create({launchAt:15}),b=h.create({launchAt:27});
 assert.notDeepEqual(view(a,'receiver').local,view(b,'receiver').local);
 twins(a,b,'keeper');[a,b]=sameCommand(a,b,'keeper',{task:'repair'});
 [a,b]=sameCommand(a,b,'keeper',{task:'inspect'});
 [a,b]=sameCommand(a,b,'keeper',{task:'rest',minutes:1});
 for(let minute=1;minute<=30;minute++){
  a=advance(a,minute);b=advance(b,minute);twins(a,b,'keeper');
  const v=view(a,'keeper');assert.equal(v.horizon,30);assert.equal(v.ended,minute===30);
  if(minute===1)[a,b]=sameCommand(a,b,'keeper',{task:'repair',minutes:2});
 }
 saveEqual(a);saveEqual(b);
});
test('private receiver repair length, body and paid jobs cannot alter keeper views or command errors',()=>{
 let a=h.create({inletMinutes:2,bodies:{receiver:{fatigue:.15,hunger:.15}}});
 let b=h.create({inletMinutes:14,bodies:{receiver:{fatigue:.65,hunger:.5}}});
 a=ask(a,'receiver',{task:'inspect'});b=ask(b,'receiver',{task:'rest',minutes:4});
 [a,b]=sameCommand(a,b,'keeper',{task:'inspect'});a=advance(a,1);b=advance(b,1);
 a=ask(a,'receiver',{task:'repair'});
 [a,b]=sameCommand(a,b,'keeper',{task:'repair',minutes:2});
 for(let minute=2;minute<=29;minute++){
  a=advance(a,minute);b=advance(b,minute);twins(a,b,'keeper');
  if(minute===4){b=ask(b,'receiver',{task:'inspect'});twins(a,b,'keeper');}
  if(minute===5){b=ask(b,'receiver',{task:'repair'});twins(a,b,'keeper');}
  if(minute===20)[a,b]=sameCommand(a,b,'keeper',{task:'propose',terms:{releaseAt:24,attendFrom:26,attendUntil:30}});
 }
 saveEqual(a);saveEqual(b);
});
test('upstream hidden repair and body differences do not leak into receiver information',()=>{
 let a=h.create({valveMinutes:6,bodies:{keeper:{fatigue:.15,hunger:.15}}});
 let b=h.create({valveMinutes:12,bodies:{keeper:{fatigue:.65,hunger:.5}}});
 for(const actor of ['keeper','receiver']){a=ask(a,actor,{task:'inspect'});b=ask(b,actor,{task:'inspect'});}
 a=advance(a,1);b=advance(b,1);a=ask(a,'keeper',{task:'repair'});b=ask(b,'keeper',{task:'repair'});
 [a,b]=sameCommand(a,b,'receiver',{task:'repair'});
 for(let minute=2;minute<=29;minute++){a=advance(a,minute);b=advance(b,minute);twins(a,b,'receiver');}
});
test('future bounded delays are absent from local forecasts until an actual receipt',()=>{
 let a=h.create({channelMode:'bounded',channelOverrides:{'receiver:2':2}});
 let b=h.create({channelMode:'bounded',channelOverrides:{'receiver:2':6}});
 for(const actor of ['keeper','receiver']){a=ask(a,actor,{task:'inspect'});b=ask(b,actor,{task:'inspect'});}
 a=advance(a,1);b=advance(b,1);
 a=ask(a,'receiver',{task:'transmit',message:{kind:'report',observationIds:reportIds(a,'receiver')}});
 b=ask(b,'receiver',{task:'transmit',message:{kind:'report',observationIds:reportIds(b,'receiver')}});
 a=advance(a,3);b=advance(b,3);twins(a,b,'keeper');assert.equal(boundary(a,'keeper').at,30);
 [a,b]=sameCommand(a,b,'keeper',{task:'propose',terms});
 a=advance(a,4);b=advance(b,4);assert.equal(view(a,'keeper').inbox.length,1);assert.equal(view(b,'keeper').inbox.length,0);
 saveEqual(a);saveEqual(b);
});
test('hidden loss versus future delivery is not revealed in the sender or unreceived peer view',()=>{
 let a=h.create({channelMode:'lossy',channelOverrides:{'keeper:2':'loss'}});
 let b=h.create({channelMode:'lossy',channelOverrides:{'keeper:2':6}});
 [a,b]=sameCommand(a,b,'keeper',{task:'inspect'});a=advance(a,1);b=advance(b,1);
 [a,b]=sameCommand(a,b,'keeper',{task:'transmit',message:{kind:'report',observationIds:reportIds(a,'keeper')}});
 for(let minute=2;minute<=30;minute++){
  a=advance(a,minute);b=advance(b,minute);twins(a,b,'keeper');
  if(minute<8)twins(a,b,'receiver');
 }
 assert.equal(view(a,'receiver').inbox.length,0);assert.equal(view(b,'receiver').inbox.length,1);
 assert.equal(view(a,'keeper').sent.length,1);assert.deepEqual(view(a,'keeper').sent,view(b,'keeper').sent);
});
test('unrelated peer commands and lost traffic do not shift local observations, proposal IDs or channel fate',()=>{
 const setup={channelMode:'lossy',channelOverrides:{'receiver:1':'loss','receiver:2':'loss','keeper:4':6}};
 let a=h.create(setup),b=h.create(setup);
 b=ask(b,'receiver',{task:'propose',terms});a=advance(a,1);b=advance(b,1);
 b=ask(b,'receiver',{task:'transmit',message:{kind:'report',observationIds:reportIds(b,'receiver')}});
 [a,b]=sameCommand(a,b,'keeper',{task:'inspect'});a=advance(a,2);b=advance(b,2);twins(a,b,'keeper');
 a=advance(a,3);b=advance(b,3);[a,b]=sameCommand(a,b,'keeper',{task:'propose',terms});
 a=advance(a,4);b=advance(b,4);twins(a,b,'keeper');
 const sentA=view(a,'keeper').sent.at(-1),sentB=view(b,'keeper').sent.at(-1);assert.deepEqual(sentA,sentB);
 a=advance(a,9);b=advance(b,9);assert.equal(view(a,'receiver').inbox.length,0);assert.equal(view(b,'receiver').inbox.length,0);
 a=advance(a,10);b=advance(b,10);assert.deepEqual(view(a,'receiver').inbox.at(-1).message,view(b,'receiver').inbox.at(-1).message);
});
test('local advance discovers a receipt only after paying time and leaves ongoing recovery intact',()=>{
 let s=h.create({channelMode:'bounded',channelOverrides:{'receiver:2':6}});
 s=ask(s,'receiver',{task:'inspect'});s=ask(s,'keeper',{task:'rest',minutes:13});s=advance(s,1);
 s=ask(s,'receiver',{task:'transmit',message:{kind:'report',observationIds:reportIds(s,'receiver')}});s=advance(s,2);
 assert.equal(boundary(s,'keeper').at,13);
 const stopped=h.advance(s,13,{actorId:'keeper',stopOnReceipt:true});
 assert.equal(view(stopped,'keeper').now,8);assert.equal(view(stopped,'keeper').job.task,'rest');
 assert.equal(view(stopped,'keeper').paid.rest,8);assert.equal(view(stopped,'keeper').inbox.length,1);saveEqual(stopped);
 const localFinal=saveEqual(advance(stopped,30)),worldFinal=saveEqual(advance(s,30));
 for(const actor of ['keeper','receiver'])assert.deepEqual(view(localFinal,actor),view(worldFinal,actor));
 const {journalEntries:localEntries,...localWorld}=h.getWorldSummary(localFinal),{journalEntries:worldEntries,...globalWorld}=h.getWorldSummary(worldFinal);
 assert.deepEqual(localWorld,globalWorld);assert.notEqual(localEntries,worldEntries);
});
test('passive radio receipts do not interrupt paid repair or grant repair completion',()=>{
 let s=h.create({valveMinutes:12});
 s=ask(s,'keeper',{task:'inspect'});s=ask(s,'receiver',{task:'inspect'});s=advance(s,1);
 s=ask(s,'keeper',{task:'repair'});s=ask(s,'receiver',{task:'transmit',message:{kind:'report',observationIds:reportIds(s,'receiver')}});s=advance(s,4);
 const v=view(s,'keeper');assert.equal(v.inbox.length,1);assert.equal(v.job.task,'repair');assert.equal(v.job.endsAt,13);assert.equal(v.paid.repair,3);assert.equal(v.local.repairProgress,3);saveEqual(s);
});
test('an older late report stays inspectable without replacing a newer source-time observation',()=>{
 let s=h.create({channelMode:'bounded',channelOverrides:{'receiver:2':6,'receiver:5':2}});
 s=ask(s,'receiver',{task:'inspect'});s=advance(s,1);
 const oldIds=reportIds(s,'receiver','repairProgress:dock');assert.ok(oldIds.length);
 const oldObservation=json(view(s,'receiver').notebook.find(n=>n.receipt===oldIds.at(-1))); 
 s=ask(s,'receiver',{task:'transmit',message:{kind:'report',observationIds:[oldIds.at(-1)]}});s=advance(s,2);
 s=ask(s,'receiver',{task:'repair'});s=advance(s,4);
 const newIds=reportIds(s,'receiver','repairProgress:dock');s=ask(s,'receiver',{task:'transmit',message:{kind:'report',observationIds:[newIds.at(-1)]}});s=advance(s,7);
 const newest=json(latest(s,'keeper','repairProgress:dock'));assert.equal(newest.value,2);assert.equal(newest.observedAt,4);
 s=advance(s,8);assert.deepEqual(latest(s,'keeper','repairProgress:dock'),newest);
 const records=view(s,'keeper').notebook.filter(n=>n.cue==='repairProgress:dock');assert.equal(records.length,2);assert.equal(records.at(-1).value,0);assert.equal(records.at(-1).receivedAt,8);assert.equal(records.at(-1).observedAt,oldObservation.observedAt);saveEqual(s);
});
test('inaccessible observation and confirmation IDs cannot create owned messages',()=>{
 let s=h.create();const before=json(s);
 for(const message of [{kind:'report',observationIds:[999]},{kind:'confirm',messageId:'receiver:m999'}]){
  assert.throws(()=>ask(s,'keeper',{task:'transmit',message}));assert.deepEqual(s,before);
 }
 assert.equal(view(s,'keeper').inventory.radio.available,4);assert.equal(view(s,'keeper').sent.length,0);
});
test('an integer-minute transmission canceled at its start restores charge and sends nothing',()=>{
 let s=ask(h.create(),'keeper',{task:'propose',terms});
 assert.equal(view(s,'keeper').inventory.radio.reserved,1);s=h.interrupt(s,'keeper');
 assert.equal(view(s,'keeper').inventory.radio.available,4);assert.equal(view(s,'keeper').sent.length,0);assert.equal(view(s,'keeper').paid.transmit,0);
 s=advance(s,10);assert.equal(view(s,'receiver').inbox.length,0);saveEqual(s);
});
test('local budgets and command legality are independent of exhausted remote actor controls',()=>{
 let a=h.create(),b=h.create();
 for(let n=0;n<200;n++){
  const r=commandResult(b,'receiver',{task:'rest',minutes:1});
  if(r.error){assert.equal(r.error.code,'COMMAND_LIMIT');break;}
  b=h.interrupt(r.state,'receiver');
 }
 twins(a,b,'keeper');[a,b]=sameCommand(a,b,'keeper',{task:'inspect'});a=advance(a,1);b=advance(b,1);twins(a,b,'keeper');
 [a,b]=sameCommand(a,b,'keeper',{task:'repair'});a=advance(a,7);b=advance(b,7);twins(a,b,'keeper');saveEqual(a);saveEqual(b);
});
}
