import test from 'node:test';
import assert from 'node:assert/strict';

test('comparison evidence hashes complete detached local inputs and rejects mutation', async()=>{
  const m=await import('../src/experiments/across-cut/comparison/evidence.js').catch(()=>null);
  assert.ok(m?.intern,'The complete-input evidence dictionary must exist.');
  const dictionary={},input={actor:'keeper',now:1,received:[{source:'receiver',observedAt:0,value:27}]};
  const id=m.intern(dictionary,input);input.received[0].value=15;
  assert.equal(m.resolveInput(dictionary,id).received[0].value,27);
  assert.equal(m.intern(dictionary,m.resolveInput(dictionary,id)),id);
  dictionary[id].now=2;assert.throws(()=>m.resolveInput(dictionary,id),/hash/);
});

test('nine legal rival families share detached actor-local decisions',async()=>{
  const m=await import('../src/experiments/across-cut/comparison/policies.js').catch(()=>null);
  assert.ok(m?.chooseAction,'Actor-local rival policies must exist.');
  assert.equal(m.ARMS.length,9);
  const view={actorId:'receiver',now:0,horizon:30,ended:false,channel:{mode:'reliable',minDelay:2,maxDelay:2,lossPossible:false},body:{body:{fatigue:.15,hunger:.15}},position:6,location:'dock',inventory:{cartWater:{available:1},meal:{available:1},radio:{available:4}},local:{station:'dock',repairMinutes:null,repairProgress:null,launchAt:27},job:null,notebook:[],inbox:[],sent:[],proposals:[],contributions:[],paid:{}};
  const before=structuredClone(view);
  assert.equal(m.chooseAction(view,{},'cart-only').action.task,'cart');
  assert.equal(m.chooseAction(view,{},'fixed-early').action.task,'inspect');
  assert.deepEqual(view,before);
  assert.deepEqual(m.chooseAction(view,{},'notebook'),m.chooseAction(structuredClone(view),{},'notebook'));
  assert.throws(()=>m.chooseAction(view,{},'clairvoyant'),/Unknown/);
});

test('source-time notebook retains newer facts after stale arrivals and exact revision identities',async()=>{
  const m=await import('../src/experiments/across-cut/comparison/representations.js').catch(()=>null);
  assert.ok(m?.compareRepresentations,'Matched-input bookkeeping comparison must exist.');
  const observations=[{receipt:1,source:'valve',cue:'repairProgress:valve',value:6,observedAt:8,receivedAt:10},{receipt:2,source:'valve',cue:'repairProgress:valve',value:0,observedAt:1,receivedAt:11}];
  const envelopes=[{messageId:'keeper:m2',message:{kind:'response',proposalId:'keeper:p1',revision:2,decision:'accept'}},{messageId:'keeper:m1',message:{kind:'response',proposalId:'keeper:p1',revision:1,decision:'refuse'}}];
  const r=m.compareRepresentations(observations,envelopes);
  assert.equal(r.notebook.latest['valve|repairProgress:valve'].value,6);
  assert.equal(r.lastArrival.latest['valve|repairProgress:valve'].value,0);
  assert.equal(r.notebook.responses['keeper:p1|2'].decision,'accept');
  assert.equal(r.notebook.responses['keeper:p1|1'].decision,'refuse');
  assert.equal(r.identicalInput,true);
});

test('registered comparison protocol and fresh output guards preserve evidence', async()=>{
  const m=await import('../src/experiments/across-cut/comparison/provenance.js').catch(()=>null);
  assert.ok(m?.checkProtocol,'The source provenance boundary must exist.');
  const {mkdtemp,readFile,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const dir=await mkdtemp(join(tmpdir(),'across-cut-evidence-'));
  try{
    const file=join(dir,'kept.json');await m.writeJSON(file,{kept:true});
    await assert.rejects(m.assertFreshOutput(file),/overwrite/);
    await assert.rejects(m.writeJSON(file,{}),/EEXIST/);
    assert.deepEqual(JSON.parse(await readFile(file,'utf8')),{kept:true});
    assert.match(await m.checkProtocol(),/^[a-f0-9]{64}$/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('development cases retain all repair combinations and seal reserved execution',async()=>{
  const m=await import('../src/experiments/across-cut/comparison/cases.js').catch(()=>null);
  assert.ok(m?.selectCases,'The source-declared case matrix must exist.');
  const cases=m.selectCases();assert.equal(cases.filter(x=>x.kind==='policy').length,8);
  assert.equal(cases.filter(x=>x.kind==='script').length,8);
  assert.equal(new Set(cases.filter(x=>x.kind==='policy').map(x=>`${x.setup.valveMinutes}/${x.setup.inletMinutes}`)).size,4);
  assert.throws(()=>m.selectCases('reserved'),/sealed/);
  assert.throws(()=>m.selectCases('reserved',{sourceCommit:'forged'}),/sealed/);
});

test('actual paid no-radio control and both local decision inputs replay exactly',async()=>{
  const m=await import('../src/experiments/across-cut/comparison/experiment.js').catch(()=>null);
  assert.ok(m?.runTrial,'The paid-world comparison runner must exist.');
  const {selectCases}=await import('../src/experiments/across-cut/comparison/cases.js');
  const trial=m.runTrial(selectCases().find(x=>x.id==='D1'),'fixed-early');
  assert.equal(trial.final.service.units,2);
  assert.ok(trial.events.some(e=>e.kind==='decisions'&&e.inputs.keeper&&e.inputs.receiver));
  for(const actor of ['keeper','receiver'])assert.equal(Object.values(trial.final.actors[actor].paid).reduce((a,b)=>a+b,0),30);
  assert.equal(trial.final.water.conservedTotal,3);
  assert.equal(m.replayTrial(trial),trial.finalSaveSha256);
  const altered=structuredClone(trial);altered.final.service.units=9;
  assert.throws(()=>m.replayTrial(altered),/equal|Expected/);
  assert.throws(()=>m.runTrial({partition:'reserved'},'fixed-early'),/sealed/);
});

test('CLI rejects reserved output without a committed freeze before world execution',async()=>{
  const {spawnSync}=await import('node:child_process');const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const dir=await mkdtemp(join(tmpdir(),'across-cut-cli-'));
  try{
    const run=spawnSync(process.execPath,['scripts/across-cut-comparison.js','run','--partition','reserved','--out',join(dir,'sealed.json')],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
    assert.equal(run.status,1);assert.match(run.stderr,/requires a committed --freeze/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('competent cheap report, contact fallback and unknown-launch notebook preserve useful service',async()=>{
  const {runTrial}=await import('../src/experiments/across-cut/comparison/experiment.js');
  const {selectCases}=await import('../src/experiments/across-cut/comparison/cases.js');const cases=selectCases();
  for(const [id,arm]of [['D7','one-way-report'],['D8','contact'],['D3','notebook']]){
    const t=runTrial(cases.find(x=>x.id===id),arm);assert.equal(t.final.service.units,2,`${id}/${arm} should retain its feasible local strategy`);
  }
});
