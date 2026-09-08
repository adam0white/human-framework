import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {SHIFT_VERSION,POLICIES,createShift,getShiftView,getActions,startAction,advanceTime,finishAction,interruptAction,finishShift,chooseAction,applyCommand,exportShift,importShift,replaySession} from '../src/games/shift.js';
import {createPerson,beginAttempt,advanceAttempt,estimateSuccess} from '../src/human/index.js';
const act=(s,id)=>finishAction(startAction(s,id));
const at=(id='garden',seed=1)=>act(act(createShift({seed}),'take-tools'),`travel-${id}`);
const recover=s=>s.person.body.fatigue>.45?act(s,'rest'):s;
function repaired(s,id,route='patch'){for(let i=0;i<10&&s.pumps[id].status==='broken';i++){s=recover(s);s=act(s,`${route}-${id}`);}assert.equal(s.pumps[id].status,'repaired');return s;}
function run(seed,policy){let s=createShift({seed,policy});for(let i=0;i<150&&s.status==='playing';i++){const id=chooseAction(getShiftView(s),policy);s=id?act(s,id):finishShift(s);}assert.equal(s.status,'finished');return s;}

test('shift prerequisites bind tools, travel and independent target state',()=>{
 let s=createShift();assert.equal(s.location,'depot');assert.equal(getShiftView(s).jobs.length,3);
 assert.throws(()=>startAction(s,'patch-garden'),/available/);s=act(s,'take-tools');s=act(s,'travel-garden');
 assert.throws(()=>startAction(s,'patch-intake'),/available/);assert.throws(()=>startAction(s,'replace-garden'),/available/);
 s=repaired(s,'garden');assert.equal(s.pumps.intake.status,'broken');assert.equal(s.pumps.workshop.status,'broken');
 assert.equal(getShiftView(s).score.total,0);assert.throws(()=>startAction(s,'patch-garden'),/available/);
});
test('verification awards one-time service and bonus, partial departure retains it',()=>{
 let s=repaired(at(),'garden');s=act(s,'verify-garden');const v=getShiftView(s);
 assert.equal(v.score.base,40);assert.equal(v.score.earlyBonus,40*(480-s.clock)/480);
 assert.equal(v.score.total,v.score.base+v.score.earlyBonus);assert.throws(()=>startAction(s,'verify-garden'),/available/);
 const done=finishShift(s);assert.equal(done.finishReason,'left-early');assert.deepEqual(getShiftView(done).score,v.score);
 assert.deepEqual(getActions(done),[]);assert.throws(()=>finishAction(done),/pending/);assert.deepEqual(importShift(exportShift(done)),done);
});
test('one seal is conserved across failed, interrupted and completed targeted fitting',()=>{
 let s=act(act(act(createShift(),'take-tools'),'take-seal'),'travel-intake');
 const partial=interruptAction(advanceTime(startAction(s,'replace-intake'),10));assert.equal(partial.inventory.seal,1);assert.equal(partial.pumps.intake.completedRepairs.replace,0);
 s=repaired(s,'intake','replace');assert.equal(s.inventory.seal,0);assert.equal(s.stock.seal,0);
 s=act(s,'travel-workshop');assert.throws(()=>startAction(s,'replace-workshop'),/available/);assert.ok(getActions(s).some(a=>a.id==='patch-workshop'));
 assert.deepEqual(importShift(exportShift(s)),s);
});
test('paid practice carries to later jobs and forecasts include interval strain and practice',()=>{
 let s=at();const before=s.person.skills.repair;s=interruptAction(advanceTime(startAction(s,'patch-garden'),20));
 assert.ok(s.person.skills.repair>before);s=act(s,'travel-workshop');const view=getShiftView(s),a=view.actions.find(a=>a.id==='patch-workshop');
 let p=createPerson({id:'worker',body:view.worker.body,skills:view.worker.skills});p=advanceAttempt(beginAttempt(p,{actionId:a.id,targetId:'workshop',durationMinutes:a.durationMinutes,effort:a.effort,exertive:true,skill:'repair'}),a.durationMinutes);
 assert.equal(a.estimatedSuccess,estimateSuccess({skill:p.skills.repair,body:p.body,difficulty:a.difficulty+.05}));
});
test('hidden condition and repair counters never enter views; inspection costs time without practice',()=>{
 assert.deepEqual(getShiftView(createShift({seed:1})),getShiftView(createShift({seed:2})));
 let s=at(),skill=s.person.skills.repair,t=s.clock;s=act(s,'inspect-garden');
 assert.equal(s.clock-t,10);assert.equal(s.person.skills.repair,skill);assert.equal(getShiftView(s).jobs[0].inspection.condition,s.pumps.garden.condition);
 const serialized=JSON.stringify(getShiftView(s));assert.ok(!serialized.includes('completedRepairs'));assert.ok(!serialized.includes('"seed"'));
});
test('blocked work spends only two idle minutes with no practice, relief or repair draw',()=>{
 let s=at();s.person.body={fatigue:.95,hunger:.99};const skill=s.person.skills.repair;s=startAction(s,'patch-garden');
 assert.equal(s.pending.durationMinutes,2);s=interruptAction(s);assert.equal(s.lastEvent.status,'blocked');assert.equal(s.lastEvent.minutes,2);
 assert.equal(s.person.skills.repair,skill);assert.equal(s.pumps.garden.completedRepairs.patch,0);assert.equal(s.stock.meals,2);
});
test('meals require depot and complete once; partial rest has the same recovery as one interval',()=>{
 assert.throws(()=>startAction(at(),'eat'),/available/);let s=createShift();s.person.body.hunger=.8;
 const partial=interruptAction(advanceTime(startAction(s,'eat'),5));assert.equal(partial.stock.meals,2);assert.ok(partial.person.body.hunger>.8);
 const full=act(s,'eat');assert.equal(full.stock.meals,1);assert.ok(full.person.body.hunger<.8);assert.throws(()=>finishAction(full),/pending/);
 const started=startAction(at(),'rest'),split=finishAction(advanceTime(started,5)),whole=finishAction(started);
 assert.ok(Math.abs(split.person.body.fatigue-whole.person.body.fatigue)<1e-12);assert.equal(split.clock,whole.clock);
});
test('zero-time interruptions cannot reroll a repair or manufacture experience',()=>{
 const s=at(),plain=act(s,'patch-garden');let noisy=s;
 for(let i=0;i<100;i++){getShiftView(noisy);exportShift(noisy);noisy=interruptAction(startAction(noisy,'patch-garden'));}
 assert.equal(noisy.clock,s.clock);assert.deepEqual(noisy.person.skills,s.person.skills);assert.deepEqual(noisy.pumps,s.pumps);
 noisy=act(noisy,'patch-garden');assert.deepEqual(noisy.pumps,plain.pumps);assert.deepEqual(noisy.person.body,plain.person.body);
});
test('each target and route owns its paid repair counter; unrelated attempts leave others at zero',()=>{
 let s=act(at(),'patch-garden');assert.equal(s.pumps.garden.completedRepairs.patch,1);assert.equal(s.pumps.garden.completedRepairs.replace,0);
 assert.equal(s.pumps.intake.completedRepairs.patch,0);assert.equal(s.pumps.workshop.completedRepairs.patch,0);
 s=act(s,'travel-workshop');s=act(recover(s),'patch-workshop');assert.equal(s.pumps.garden.completedRepairs.patch,1);assert.equal(s.pumps.workshop.completedRepairs.patch,1);
});
test('pending snapshots and strict command replay reproduce interruptions and outcomes',()=>{
 let s=createShift({seed:7});const commands=[{type:'start',actionId:'take-tools'},{type:'finish'},{type:'start',actionId:'travel-garden'},{type:'advance',minutes:5},{type:'interrupt',reason:'Changed route'},{type:'start',actionId:'travel-garden'},{type:'finish'},{type:'start',actionId:'patch-garden'},{type:'advance',minutes:12}];
 for(const command of commands)s=applyCommand(s,command);
 assert.deepEqual(finishAction(importShift(exportShift(s))),finishAction(s));assert.deepEqual(replaySession({version:SHIFT_VERSION,seed:7,policy:'value-first',commands}),s);
 assert.throws(()=>applyCommand(s,{type:'finish',outcome:'completed'}),/Malformed/);assert.throws(()=>applyCommand(s,{type:'unknown'}),/Unknown/);
});
test('near-complete fractions stay pending and exact departure verification earns its score',()=>{
 let s=repaired(at(),'garden');s.person.minutes=s.clock=472;s.person.body={fatigue:0,hunger:0};
 const started=startAction(s,'verify-garden'),near=advanceTime(started,8-1e-8);assert.ok(near.pending);assert.equal(getShiftView(near).score.total,0);
 const exact=finishAction(started);assert.equal(exact.clock,480);assert.equal(exact.finishReason,'departure');assert.equal(getShiftView(exact).score.total,40);
 s.person.minutes=s.clock=472+1e-8;const late=act(s,'verify-garden');assert.equal(late.lastEvent.status,'interrupted');assert.equal(getShiftView(late).score.total,0);
 assert.deepEqual(importShift(exportShift(exact)),exact);assert.deepEqual(importShift(exportShift(late)),late);
});
test('leaving during work retains only elapsed costs; finishing all pumps ends early',()=>{
 let s=advanceTime(startAction(at(),'patch-garden'),10),p=s.person.skills.repair;s=finishShift(s);assert.equal(s.pending,null);assert.equal(s.person.skills.repair,p);assert.equal(s.pumps.garden.status,'broken');
 assert.deepEqual(importShift(exportShift(s)),s);
 const done=run(1,'easy-first');assert.equal(done.finishReason,'all-restored');assert.equal(getShiftView(done).score.verifiedCount,3);assert.ok(done.clock<480);
});
test('malformed saves reject forged world, resource, pending, timestamp and identity state',()=>{
 const saved=exportShift(startAction(at(),'patch-garden'));
 for(const mutate of [x=>x.version='workshop-0.1.0',x=>x.clock++,x=>x.person.person.id='other',x=>x.person.person.skills.other=.5,x=>x.inventory.seal=2,x=>x.stock.meals=3,x=>x.pumps.garden.completedRepairs.patch=-1,x=>x.pending.actionId='patch-intake',x=>x.pumps.garden.status='running',x=>x.pumps.garden.verifiedAt=1,x=>x.finishReason='departure',x=>x.history=[]]){
  const malformed=structuredClone(saved);mutate(malformed);assert.throws(()=>importShift(malformed));
 }
 const forged=exportShift(createShift());forged.inventory.tools=true;assert.throws(()=>importShift(forged),/elapsed/);
});
test('all visible-state controllers terminate across seeds with finite scored partial results',()=>{
 for(const policy of POLICIES)for(let seed=1;seed<=30;seed++){const s=run(seed,policy),v=getShiftView(s);assert.ok(v.score.total>=0&&v.score.total<=420);assert.deepEqual(importShift(exportShift(s)),s);}
});
test('ten thousand canceled events keep active state bounded and old runtimes byte unchanged',()=>{
 let s=at(),initial=JSON.stringify(exportShift(s)).length;for(let i=0;i<10000;i++)s=interruptAction(startAction(s,'patch-garden'));
 assert.ok(JSON.stringify(exportShift(s)).length<initial+600);assert.equal(s.person.skills.repair,.55);
 for(const [path,hash] of Object.entries({'src/human/index.js':'0f6d30cf2b5e07f5e18dc791fecd691b9004f290e138abeab7336b1c2e2ee308','src/games/workshop.js':'b2ee4cb10fddf57455c0321e42da1d256b87a7a96225d92ff1940f45ed8f6f06','src/core/model.js':'1bf30267083e8e2617fe9964d4654d8da158cba309909ace7bb50c1e6de29c59'}))assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),hash);
});
test('success and failure of equally long work receive identical practice, with no failure bonus',()=>{
 const outcomes=[];for(let seed=1;seed<=80;seed++)outcomes.push(act(at('garden',seed),'patch-garden'));
 const success=outcomes.find(s=>s.lastEvent.status==='completed'),failure=outcomes.find(s=>s.lastEvent.status==='failed');assert.ok(success&&failure);
 assert.equal(success.person.skills.repair,failure.person.skills.repair);assert.deepEqual(success.person.body,failure.person.body);assert.equal(failure.inventory.seal,0);assert.equal(getShiftView(failure).score.total,0);
});
test('other paid repair resolutions cannot shift the garden random stream under matched retest body and skill',()=>{
 for(let seed=1;seed<=40;seed++){
  const original=at('garden',seed),plain=act(original,'patch-garden');
  let other=at('workshop',seed);other=act(other,'patch-workshop');other=act(other,'travel-garden');
  // Offline matched retest: remove legitimate shared body/skill differences to isolate random domains.
  other.person.body=structuredClone(original.person.body);other.person.skills=structuredClone(original.person.skills);
  const retest=act(other,'patch-garden');assert.equal(retest.pumps.garden.status,plain.pumps.garden.status);
 }
});
test('pending save resume covers retrieval, travel, recovery, meal, inspection and verification',()=>{
 const repairedGarden=repaired(at(),'garden');const cases=[[createShift(),'take-tools'],[createShift(),'take-seal'],[createShift(),'travel-intake'],[createShift(),'eat'],[at(),'rest'],[at(),'inspect-garden'],[repairedGarden,'verify-garden']];
 for(const [s,id] of cases){const pending=advanceTime(startAction(s,id),1.25);assert.deepEqual(finishAction(importShift(exportShift(pending))),finishAction(pending));}
});
test('impossible inspection receipts cannot be reused on two pumps',()=>{
 let s=act(at(),'inspect-garden');s=act(s,'travel-workshop');s=act(s,'inspect-workshop');
 const save=exportShift(s);save.pumps.workshop.inspection.attemptId=save.pumps.garden.inspection.attemptId;assert.throws(()=>importShift(save),/inspection/);
});
test('a blocked result names actual fatigue and hunger causes after an optimistic rounded forecast',()=>{
 let s=at('intake');s.person.body={fatigue:.56,hunger:.86};
 assert.equal(getActions(s).find(a=>a.id==='patch-intake').capacity.allowed,true);
 const started=startAction(s,'patch-intake');assert.equal(started.pending.durationMinutes,2);
 const done=finishAction(started);assert.match(done.lastEvent.message,/fatigue and hunger/i);assert.equal(done.lastEvent.status,'blocked');assert.equal(done.lastEvent.practiceMinutes,0);
});
