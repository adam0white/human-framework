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
  const keeper={...view,actorId:'keeper',location:'valve',position:0,local:{station:'valve',repairMinutes:6,repairProgress:6,launchAt:null,serviceUnits:null},inventory:{...view.inventory,water:{available:2}},proposals:[{proposalId:'keeper:p1',revision:1,author:'keeper',terms:{releaseAt:17,attendFrom:21,attendUntil:22}}],now:16,inbox:[{messageId:'receiver:m2',sentAt:5,message:{kind:'response',proposalId:'keeper:p1',revision:1,decision:'withdraw',decidedAt:3}},{messageId:'receiver:m1',sentAt:4,message:{kind:'response',proposalId:'keeper:p1',revision:1,decision:'accept',decidedAt:3}}]};
  const chosen=m.chooseAction(keeper,{'decided:keeper:p1|1':'accept',reportSent:true,proposed:true,releaseAt:17},'notebook');
  assert.equal(chosen.action,null,'Do not spend a receipt confirmation on an acceptance superseded by a received withdrawal.');
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
  const changed=m.compareRepresentations([], [
    {message:{kind:'response',proposalId:'keeper:p1',revision:1,decision:'withdraw',decidedAt:5}},
    {message:{kind:'response',proposalId:'keeper:p1',revision:1,decision:'accept',decidedAt:3}}
  ]);
  assert.equal(changed.notebook.responses['keeper:p1|1'].decision,'withdraw');
  assert.equal(changed.lastArrival.responses['keeper:p1'].decision,'accept');
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
  assert.equal(cases.filter(x=>x.kind==='script').length,9);
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
  const count=structuredClone(trial);count.commandCount--;assert.throws(()=>m.replayTrial(count),/equal|Expected/);
  const peak=structuredClone(trial);peak.maxSaveBytes--;assert.throws(()=>m.replayTrial(peak),/equal|Expected/);
  const errors=structuredClone(trial);errors.errors.push({invented:true});assert.throws(()=>m.replayTrial(errors),/equal|Expected/);
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

test('paid scripts distinguish stale facts, consent, omitted work and receipt-only overhead',async()=>{
  const {runTrial}=await import('../src/experiments/across-cut/comparison/experiment.js');const {selectCases}=await import('../src/experiments/across-cut/comparison/cases.js');
  const cases=selectCases(),run=id=>runTrial(cases.find(c=>c.id===id));
  const confirm=run('S1-confirm'),alternative=run('S2-equal-cost-response');
  assert.deepEqual(confirm.final.service,alternative.final.service);
  assert.deepEqual(confirm.final.actors,alternative.final.actors);
  const stale=run('S4-stale-readiness').representations.receiver;
  assert.equal(stale.notebook.latest['valve|repairProgress:valve'].value,1);
  assert.equal(stale.lastArrival.latest['valve|repairProgress:valve'].value,0);
  const omitted=run('S5-omitted'),withdrawn=run('S5-withdrawn');
  assert.equal(omitted.final.actors.receiver.contributions[0].status,'expired');
  assert.equal(withdrawn.final.actors.receiver.contributions[0].status,'withdrawn');
  assert.equal(omitted.final.service.units,1);assert.equal(omitted.final.water.lost,2);
  const canceled=run('S7-cancel');assert.equal(canceled.final.actors.keeper.paid.transmit,0);assert.equal(canceled.final.actors.keeper.inventory.radio.consumed,0);
  assert.equal(canceled.final.work.valve,6);assert.equal(canceled.final.actors.keeper.inventory.fitting.installed,1);
  const insurance=run('S8-fixed-cart-insurance');
  assert.equal(insurance.final.service.units,2);assert.equal(insurance.final.water.excess,1);
  assert.equal(insurance.final.actors.receiver.paid.cart,10);assert.equal(insurance.final.actors.receiver.inventory.cartWater.consumed,1);
});

test('historical replay verifies original Git source bytes before loading a recorded controller',async()=>{
  const {spawnSync}=await import('node:child_process');const {mkdtemp,readFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const dir=await mkdtemp(join(tmpdir(),'across-cut-history-test-'));
  try{
    const out=join(dir,'result.json');const run=spawnSync(process.execPath,['scripts/across-cut-replay-history.js','--input','artifacts/across-cut/development-initial.json.gz','--out',out],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);const result=JSON.parse(await readFile(out,'utf8'));assert.equal(result.verified.length,80);assert.match(result.sourceCommit,/^be1f104/);assert.equal(result.sourceVerified,true);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('same-minute withdrawal survives a later-arriving earlier transmitted acceptance',async()=>{
  const host=await import('../src/experiments/across-cut/host.js');
  const {compareRepresentations}=await import('../src/experiments/across-cut/comparison/representations.js');
  let world=host.create({channelMode:'bounded',channelOverrides:{'keeper:1':2,'receiver:4':6,'receiver:5':2}});
  world=host.request(world,'keeper',{task:'propose',terms:{releaseAt:15,attendFrom:19,attendUntil:20}});
  world=host.advance(world,3);
  world=host.request(world,'receiver',{task:'decide',proposalId:'keeper:p1',revision:1,decision:'accept'});
  world=host.request(world,'receiver',{task:'transmit',message:{kind:'response',proposalId:'keeper:p1',revision:1,decision:'accept'}});
  world=host.request(world,'receiver',{task:'decide',proposalId:'keeper:p1',revision:1,decision:'withdraw'});
  world=host.advance(world,4);
  world=host.request(world,'receiver',{task:'transmit',message:{kind:'response',proposalId:'keeper:p1',revision:1,decision:'withdraw'}});
  world=host.advance(world,10);
  const view=host.getActorView(world,'keeper'),responses=view.inbox.filter(e=>e.message.kind==='response');
  assert.deepEqual(responses.map(e=>[e.message.decision,e.message.decidedAt,e.sentAt,e.receivedAt]),[['withdraw',3,5,7],['accept',3,4,10]]);
  assert.deepEqual(host.restoreState(host.exportState(world)),world);
  assert.equal(compareRepresentations(view.notebook,view.inbox).notebook.responses['keeper:p1|1'].decision,'withdraw');
});

test('reliable radio bounds never infer delivery of a missed contact transmission',async()=>{
  const h=await import('../src/experiments/across-cut/host.js');const {chooseAction}=await import('../src/experiments/across-cut/comparison/policies.js');
  let world=h.create();world=h.request(world,'receiver',{task:'travel',to:'valve'});world=h.advance(world,6);
  const ids=h.getActorView(world,'keeper').notebook.filter(o=>o.via==='local').map(o=>o.receipt);
  world=h.request(world,'keeper',{task:'transmit',via:'contact',message:{kind:'report',observationIds:ids}});
  world=h.request(world,'receiver',{task:'travel',to:'dock'});world=h.advance(world,9);
  const view=h.getActorView(world,'keeper');assert.equal(view.sent[0].via,'contact');assert.equal(h.getActorView(world,'receiver').inbox.length,0);
  assert.deepEqual(chooseAction(view,{},'contact').state.inferredReceived,[],'A radio delivery bound cannot establish contact receipt.');
  let radio=h.create();radio=h.request(radio,'keeper',{task:'transmit',message:{kind:'report',observationIds:[h.getActorView(radio,'keeper').notebook[0].receipt]}});
  radio=h.advance(radio,2);assert.deepEqual(chooseAction(h.getActorView(radio,'keeper'),{},'fixed-early').state.inferredReceived,[]);
  radio=h.advance(radio,3);assert.deepEqual(chooseAction(h.getActorView(radio,'keeper'),{},'fixed-early').state.inferredReceived,['keeper:m1'],'A completed reliable radio transmission can be inferred delivered after its known bound.');
});
