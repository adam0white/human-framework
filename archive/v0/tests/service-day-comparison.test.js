import test from 'node:test';
import assert from 'node:assert/strict';
import * as policy from '../src/experiments/service-day/policies.js';

const deepFreeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(deepFreeze);}return value;};
function fixture(overrides={}){
 const tasks=['gate','divert','reopen','pump','deliver','cart','share','salvage','rest','meal'];
 const choice=task=>({task,duration:{gate:6,divert:6,reopen:3,pump:6,deliver:6,cart:18,share:2,salvage:8,rest:6,meal:4}[task],available:true,capacityEstimate:{allowed:true,causes:[]}});
 return {now:0,phase:'morning',deadline:64,milestones:[{id:'inlet',at:24},{id:'clinic',at:64}],people:{keeper:{body:{fatigue:.50,hunger:.85}}},jobs:{keeper:null,partner:null},choices:{keeper:tasks.map(choice),partner:tasks.map(choice)},resources:{parts:{keeper:2,partner:1},food:{keeper:1,partner:1},reservedParts:{keeper:0,partner:0},reservedMeals:{keeper:0,partner:0},installedParts:0,shedAvailable:true},work:{gate:0,divert:0,pump:0},supply:{available:false,reopenedAt:null},delivery:null,morning:null,outcome:null,lastResponse:null,...overrides};
}

test('view-only policies are exported and select explicit paid requests',()=>{
 assert.equal(typeof policy.chooseServiceCommand,'function');
 const v=deepFreeze(fixture());
 assert.deepEqual(policy.chooseServiceCommand(v,'deadline-first'),{type:'request',actor:'partner',task:'salvage'});
 assert.deepEqual(policy.chooseServiceCommand(v,'reserve-clinic'),{type:'request',actor:'keeper',task:'meal'});
 assert.throws(()=>policy.chooseServiceCommand(v,'unknown'),/policy/i);
});

test('both small priorities can be identified from identical public information',()=>{
 const v=fixture();v.people.keeper.body.hunger=.35;v.resources.shedAvailable=false;
 assert.equal(policy.chooseServiceCommand(deepFreeze(v),'deadline-first').task,'gate');
 assert.equal(policy.chooseServiceCommand(v,'reserve-clinic').task,'divert');
 const late=fixture({now:18});late.people.keeper.body.hunger=.35;late.resources.shedAvailable=false;
 assert.equal(policy.chooseServiceCommand(late,'deadline-first').task,'divert');
});

test('the policy uses no partner body and respects accepted commitment work',()=>{
 const v=fixture({now:24,phase:'clinic',morning:{protected:true,waterService:true},supply:{available:true,reopenedAt:null}});
 v.people.keeper.body.hunger=.35;v.resources.parts.keeper=1;v.jobs.partner={task:'pump',startedAt:24,endsAt:30,origin:'own'};
 Object.defineProperty(v.people,'partner',{get(){throw new Error('Private partner condition accessed');}});
 assert.equal(policy.chooseServiceCommand(v,'deadline-first').type,'advance');
});

test('three-minute recovery is paid and interrupted explicitly before work resumes',()=>{
 const v=fixture({now:10});v.people.keeper.body.hunger=.35;v.resources.shedAvailable=false;
 v.choices.keeper.find(x=>x.task==='gate').capacityEstimate={allowed:false,causes:['fatigue']};
 assert.deepEqual(policy.chooseServiceCommand(v,'deadline-first'),{type:'request',actor:'keeper',task:'rest'});
 v.jobs.keeper={task:'rest',startedAt:10,endsAt:16,origin:'request'};v.now=11;
 assert.deepEqual(policy.chooseServiceCommand(v,'deadline-first'),{type:'advance',until:13});
 v.now=13;
 assert.deepEqual(policy.chooseServiceCommand(v,'deadline-first'),{type:'interrupt',actor:'keeper'});
});

test('public refusal stops immediate repeated partner requests without free work',()=>{
 const v=fixture();v.lastResponse={at:0,actor:'partner',task:'salvage',accepted:false,code:'CAPACITY',reason:'Denied'};
 assert.deepEqual(policy.chooseServiceCommand(v,'deadline-first'),{type:'request',actor:'keeper',task:'meal'});
});

test('evidence writes require a fresh path and cannot replace an existing artifact',async()=>{
 const {mkdtemp,readFile,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path');
 const {assertFreshOutput,writeJSON}=await import('../src/experiments/service-day/provenance.js');
 const dir=await mkdtemp(join(tmpdir(),'service-output-')),path=join(dir,'result.json');
 try{await assertFreshOutput(path);await writeJSON(path,{fixture:true});await assert.rejects(assertFreshOutput(path),/overwrite/);await assert.rejects(writeJSON(path,{fixture:false}),/EEXIST/);assert.equal(JSON.parse(await readFile(path,'utf8')).fixture,true);}finally{await rm(dir,{recursive:true,force:true});}
});

test('reserved conditions remain sealed before a freeze and are absent from default selection',async()=>{
 const {CONDITIONS,createCondition,runComparison}=await import('../src/experiments/service-day/experiment.js');
 assert.equal(CONDITIONS.filter(c=>c.partition==='development').length,6);
 assert.throws(()=>createCondition('delay-14'),/sealed/i);
 assert.throws(()=>runComparison({partition:'reserved'}),/sealed/i);
});

test('a paid prefix preserves ownership, partial work and paid recovery',async()=>{
 const {createCondition}=await import('../src/experiments/service-day/experiment.js');
 const {getServiceView}=await import('../src/games/service.js');
 const gate=getServiceView(createCondition('interrupted-gate'));
 assert.equal(gate.now,3);assert.equal(gate.work.gate,3);assert.equal(gate.resources.parts.keeper,1);
 const rest=getServiceView(createCondition('partial-rest'));
 assert.equal(rest.now,3);assert.equal(rest.jobs.keeper,null);assert.equal(rest.paidByActor.keeper.rest,3);
 const meal=getServiceView(createCondition('meal-first'));
 assert.equal(meal.resources.eaten.keeper,1);assert.equal(meal.resources.food.keeper,0);
});

test('real public command traces replay with identical saves and no checkpoint decisions',async()=>{
 const {runTrial,replayTrial}=await import('../src/experiments/service-day/experiment.js');
 const a=runTrial({conditionId:'fresh',policy:'deadline-first'}),b=runTrial({conditionId:'fresh',policy:'deadline-first',checkpoints:[]});
 assert.deepEqual(a.commands,b.commands);assert.deepEqual(a.finalState,b.finalState);
 assert.deepEqual(replayTrial(a),a.finalState);assert.deepEqual(a.checkpoints.map(c=>c.now),[24]);
 const resumed=runTrial({conditionId:'fresh',policy:'deadline-first',resume:true});
 assert.deepEqual(resumed,a);
});

test('invalid policy commands and repeated zero-time refusals preserve partial outcomes',async()=>{
 const {runTrial}=await import('../src/experiments/service-day/experiment.js');
 const bad=runTrial({controller:()=>({type:'grant',parts:10})});
 assert.equal(bad.status,'policy-error');assert.equal(bad.final.now,0);assert.equal(bad.commands.length,1);
 const refused=runTrial({controller:()=>({type:'request',actor:'partner',task:'share'})});
 assert.equal(refused.status,'zero-time-limit');assert.equal(refused.commands.length,9);
 assert.equal(refused.final.now,0);assert.equal(refused.refusals.length,9);
 assert.equal(refused.final.paidByActor.keeper.rest,0);assert.equal(refused.final.resources.food.keeper,1);
});

test('both policies acquire the shed part when following an already-started gate route',()=>{
 const v=fixture();v.work.gate=3;v.resources.parts.keeper=1;
 assert.deepEqual(policy.chooseServiceCommand(v,'reserve-clinic'),{type:'request',actor:'partner',task:'salvage'});
 const late=fixture({now:18});late.people.keeper.body.hunger=.35;
 assert.deepEqual(policy.chooseServiceCommand(late,'deadline-first'),{type:'request',actor:'keeper',task:'divert'});
});

test('per-person paid time cross-foots to the day and evidence views omit peer condition',async()=>{
 const {runTrial}=await import('../src/experiments/service-day/experiment.js');
 const trial=runTrial({policy:'reserve-clinic'});
 assert.equal(trial.status,'ended');
 for(const actor of ['keeper','partner'])assert.equal(Object.values(trial.final.paidByActor[actor]).reduce((a,b)=>a+b,0),64);
 assert.ok(trial.commands.every(c=>!Object.hasOwn(c.view.people,'partner')));
 assert.ok(trial.bounds.withinBudget);assert.equal(trial.bounds.persistentControllerBytes,0);
});

test('the CLI rejects missing output, sealed evaluation and existing evidence before results',async()=>{
 const {spawnSync}=await import('node:child_process'),{mkdtemp,writeFile,readFile,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path');
 const dir=await mkdtemp(join(tmpdir(),'service-cli-')),output=join(dir,'existing.json');
 try{
  const run=args=>spawnSync(process.execPath,['scripts/service-day-comparison.js',...args],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.match(run(['run']).stderr,/explicit --out/);
  assert.match(run(['run','--partition','reserved','--out',join(dir,'sealed.json')]).stderr,/requires a committed --freeze/);
  await writeFile(output,'preserve me');assert.match(run(['run','--out',output]).stderr,/overwrite/);assert.equal(await readFile(output,'utf8'),'preserve me');
 }finally{await rm(dir,{recursive:true,force:true});}
});
