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
if(h){
test('local consent, snapshotted response, received acceptance and actual work remain distinct',()=>{
 let s=ask(h.create(),'keeper',{task:'propose',terms});s=advance(s,3);
 const proposalId=view(s,'receiver').proposals[0].proposalId;
 const keeperBefore=json(view(s,'keeper'));
 s=ask(s,'receiver',{task:'decide',proposalId,revision:1,decision:'accept'});
 assert.deepEqual(view(s,'keeper'),keeperBefore);assert.equal(view(s,'receiver').job,null);
 assert.equal(view(s,'receiver').paid.attend,0);assert.equal(view(s,'receiver').inventory.radio.consumed,0);
 s=ask(s,'receiver',{task:'transmit',message:{kind:'response',proposalId,revision:1,decision:'accept'}});saveEqual(s);
 s=ask(s,'receiver',{task:'decide',proposalId,revision:1,decision:'withdraw'});saveEqual(s);
 assert.deepEqual(view(s,'keeper'),keeperBefore);assert.equal(view(s,'receiver').job.task,'transmit');
 s=advance(s,4);assert.equal(view(s,'receiver').sent[0].message.decision,'accept');
 assert.equal(view(s,'keeper').inbox.length,0);s=advance(s,6);saveEqual(s);
 const acceptance=view(s,'keeper').inbox[0];assert.equal(acceptance.message.decision,'accept');
 assert.equal(view(s,'receiver').contributions[0].status,'withdrawn');assert.equal(view(s,'receiver').paid.attend,0);
 s=ask(s,'keeper',{task:'transmit',message:{kind:'confirm',messageId:acceptance.messageId}});s=advance(s,9);
 assert.equal(view(s,'receiver').inbox.at(-1).message.kind,'confirm');assert.equal(view(s,'receiver').contributions[0].status,'withdrawn');saveEqual(s);
});
test('an old acceptance arriving after a newer revision response cannot rewrite own accepted terms',()=>{
 let s=h.create({channelMode:'bounded',channelOverrides:{'keeper:1':2,'keeper:4':2,'receiver:4':6,'receiver:7':2}});
 s=ask(s,'keeper',{task:'propose',terms});s=advance(s,3);
 const proposalId=view(s,'receiver').proposals[0].proposalId;
 s=ask(s,'receiver',{task:'decide',proposalId,revision:1,decision:'accept'});
 s=ask(s,'receiver',{task:'transmit',message:{kind:'response',proposalId,revision:1,decision:'accept'}});
 s=ask(s,'keeper',{task:'propose',proposalId,revision:2,terms:{releaseAt:13,attendFrom:15,attendUntil:19}});s=advance(s,4);
 s=ask(s,'keeper',{task:'decide',proposalId,revision:2,decision:'accept'});s=advance(s,6);
 s=ask(s,'receiver',{task:'decide',proposalId,revision:1,decision:'withdraw'});
 s=ask(s,'receiver',{task:'decide',proposalId,revision:2,decision:'accept'});
 s=ask(s,'receiver',{task:'transmit',message:{kind:'response',proposalId,revision:2,decision:'accept'}});s=advance(s,9);saveEqual(s);
 assert.equal(view(s,'keeper').inbox.at(-1).message.revision,2);const own=json(view(s,'keeper').contributions);
 s=advance(s,10);assert.equal(view(s,'keeper').inbox.at(-1).message.revision,1);
 assert.deepEqual(view(s,'keeper').contributions,own);assert.equal(own[0].revision,2);assert.equal(own[0].status,'accepted');saveEqual(s);
});
test('actual contributions and full service can succeed without an acceptance response or confirmation',()=>{
 let s=h.create();s=ask(s,'keeper',{task:'propose',terms});s=ask(s,'receiver',{task:'inspect'});s=advance(s,1);
 const proposalId=view(s,'keeper').proposals[0].proposalId;
 s=ask(s,'keeper',{task:'inspect'});s=ask(s,'receiver',{task:'repair'});s=advance(s,2);
 s=ask(s,'keeper',{task:'repair'});s=advance(s,3);
 s=ask(s,'receiver',{task:'decide',proposalId,revision:1,decision:'accept'});s=advance(s,8);
 s=ask(s,'keeper',{task:'decide',proposalId,revision:1,decision:'accept'});s=advance(s,12);
 s=ask(s,'keeper',{task:'release'});s=advance(s,14);s=ask(s,'receiver',{task:'attend',minutes:4});s=advance(s,18);
 assert.equal(h.getWorldSummary(s).service.units,2);assert.equal(view(s,'keeper').inbox.length,0);
 assert.equal(view(s,'receiver').sent.length,0);assert.equal(view(s,'receiver').inventory.radio.consumed,0);
 for(const a of ['keeper','receiver'])assert.equal(view(s,a).contributions[0].status,'fulfilled');saveEqual(s);
});
test('paid station arrival is the legitimate point where remote launch facts become locally different',()=>{
 let a=ask(h.create({launchAt:15}),'keeper',{task:'travel',to:'dock'});
 let b=ask(h.create({launchAt:27}),'keeper',{task:'travel',to:'dock'});
 for(let minute=0;minute<6;minute++){if(minute){a=advance(a,minute);b=advance(b,minute);}twins(a,b,'keeper');assert.equal(boundary(a,'keeper').at,6);}
 a=advance(a,6);b=advance(b,6);assert.equal(view(a,'keeper').paid.travel,6);assert.equal(view(b,'keeper').paid.travel,6);
 assert.equal(view(a,'keeper').local.launchAt,15);assert.equal(view(b,'keeper').local.launchAt,27);
 assert.equal(view(a,'keeper').local.peerPresent,true);assert.equal(view(a,'keeper').inventory.radio.consumed,0);
 assert.equal(boundary(a,'keeper').at,15);assert.equal(boundary(b,'keeper').at,27);saveEqual(a);saveEqual(b);
});
test('a peer arrival is observed locally before a contact action depends on that presence',()=>{
 let a=h.create(),b=ask(h.create(),'receiver',{task:'travel',to:'valve'});
 for(let minute=1;minute<6;minute++){a=advance(a,minute);b=advance(b,minute);twins(a,b,'keeper');}
 a=advance(a,6);b=advance(b,6);assert.equal(view(a,'keeper').local.peerPresent,false);assert.equal(view(b,'keeper').local.peerPresent,true);
 assert.throws(()=>ask(a,'keeper',{task:'propose',terms,via:'contact'}),e=>e.code==='NO_CONTACT');
 b=ask(b,'keeper',{task:'propose',terms,via:'contact'});b=advance(b,7);
 assert.equal(view(b,'receiver').inbox.length,1);assert.equal(view(b,'keeper').paid.transmit,1);assert.equal(view(b,'keeper').inventory.radio.consumed,0);saveEqual(b);
});
test('all allowed hidden channel seeds preserve the same initial local inputs within each declared mode',()=>{
 for(const channelMode of ['bounded','lossy']){
  const base=h.create({channelMode,channelSeed:0});
  for(let channelSeed=1;channelSeed<=31;channelSeed++)for(const actor of ['keeper','receiver'])twins(base,h.create({channelMode,channelSeed}),actor);
 }
});
test('two exhausted actor budgets retain independent paid stops and all30 local clock advances',()=>{
 let s=h.create();
 for(const actor of ['keeper','receiver']){
  for(let n=0;n<63;n++){s=ask(s,actor,{task:'rest',minutes:1});s=h.interrupt(s,actor);}
  s=ask(s,actor,{task:'rest',minutes:30});assert.equal(view(s,actor).budget.used,127);
 }
 for(let minute=1;minute<=30;minute++){
  s=h.advance(s,minute,{actorId:'keeper',stopOnReceipt:true});
  if(minute===1)s=h.interrupt(s,'keeper');if(minute===2)s=h.interrupt(s,'receiver');
 }
 assert.equal(view(s,'keeper').paid.rest,1);assert.equal(view(s,'receiver').paid.rest,2);
 for(const actor of ['keeper','receiver'])assert.equal(view(s,actor).budget.used,128);
 assert.equal(h.getWorldSummary(s).journalEntries,286);saveEqual(s);
});
test('own budget reserves a stop and later withdrawal at separate paid minutes',()=>{
 let s=ask(h.create(),'keeper',{task:'propose',terms:{releaseAt:25,attendFrom:27,attendUntil:30}});s=advance(s,1);
 const proposalId=view(s,'keeper').proposals[0].proposalId;
 s=ask(s,'keeper',{task:'decide',proposalId,revision:1,decision:'refuse'});
 s=ask(s,'keeper',{task:'decide',proposalId,revision:1,decision:'accept'});
 for(let n=0;n<61;n++){s=ask(s,'keeper',{task:'rest',minutes:1});s=h.interrupt(s,'keeper');}
 s=ask(s,'keeper',{task:'rest',minutes:20});assert.equal(view(s,'keeper').budget.used,126);assert.equal(view(s,'keeper').budget.reserved,2);
 s=advance(s,2);s=h.interrupt(s,'keeper');s=advance(s,3);
 s=ask(s,'keeper',{task:'decide',proposalId,revision:1,decision:'withdraw'});
 assert.equal(view(s,'keeper').budget.used,128);assert.equal(view(s,'keeper').contributions[0].status,'withdrawn');
 s=advance(s,30);saveEqual(s);
});
test('saved actor observations and message receipts cannot be forged into gameplay history',()=>{
 let s=ask(h.create(),'keeper',{task:'propose',terms});s=advance(s,3);const original=h.exportState(s);
 for(const change of [x=>x.state.actors.receiver.inbox[0].message.proposal.terms.releaseAt++,x=>x.state.actors.keeper.inventory.radio.available++,x=>x.state.actors.keeper.notebook[0].observedAt++,x=>x.state.transport[0].delay=6]){
  const hostile=json(original);change(hostile);assert.throws(()=>h.restoreState(hostile),e=>e.code==='INVALID_SAVE');
 }
 assert.deepEqual(h.restoreState(json(original)),s);
});
}
if(h){
test('equal pre-receipt forecasts permit different local stop times only after real paid reception',()=>{
 let a=h.create({channelMode:'bounded',channelOverrides:{'receiver:2':2}}),b=h.create({channelMode:'bounded',channelOverrides:{'receiver:2':6}});
 for(const actor of ['keeper','receiver']){const action=actor==='keeper'?{task:'rest',minutes:13}:{task:'inspect'};a=ask(a,actor,action);b=ask(b,actor,action);}
 a=advance(a,1);b=advance(b,1);a=ask(a,'receiver',{task:'transmit',message:{kind:'report',observationIds:reportIds(a,'receiver')}});b=ask(b,'receiver',{task:'transmit',message:{kind:'report',observationIds:reportIds(b,'receiver')}});a=advance(a,2);b=advance(b,2);
 twins(a,b,'keeper');assert.equal(boundary(a,'keeper').at,13);
 a=h.advance(a,13,{actorId:'keeper',stopOnReceipt:true});b=h.advance(b,13,{actorId:'keeper',stopOnReceipt:true});
 assert.equal(view(a,'keeper').now,4);assert.equal(view(b,'keeper').now,8);assert.equal(view(a,'keeper').paid.rest,4);assert.equal(view(b,'keeper').paid.rest,8);
 assert.equal(view(a,'keeper').body.minutes,4);assert.equal(view(b,'keeper').body.minutes,8);
 assert.equal(view(a,'keeper').inbox[0].receivedAt,4);assert.equal(view(b,'keeper').inbox[0].receivedAt,8);saveEqual(a);saveEqual(b);
});
test('late work and messages beyond the common horizon do not reveal a private departure or channel outcome',()=>{
 let a=h.create({launchAt:15,channelMode:'bounded',channelOverrides:{'receiver:30':2}}),b=h.create({launchAt:27,channelMode:'bounded',channelOverrides:{'receiver:30':6}});
 a=advance(a,29);b=advance(b,29);twins(a,b,'keeper');[a,b]=sameCommand(a,b,'keeper',{task:'rest',minutes:4});
 a=ask(a,'receiver',{task:'transmit',message:{kind:'report',observationIds:reportIds(a,'receiver')}});b=ask(b,'receiver',{task:'transmit',message:{kind:'report',observationIds:reportIds(b,'receiver')}});
 twins(a,b,'keeper');assert.equal(boundary(a,'keeper').at,30);a=advance(a,30);b=advance(b,30);twins(a,b,'keeper');
 assert.equal(view(a,'keeper').job,null);assert.equal(view(a,'keeper').paid.rest,1);assert.equal(view(a,'keeper').inbox.length,0);saveEqual(a);saveEqual(b);
});
}
