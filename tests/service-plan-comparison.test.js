import test from 'node:test';
import assert from 'node:assert/strict';

test('comparison selectors expose six development families and seal four reserved cases',async()=>{
 const m=await import('../src/experiments/service-plan/cases.js').catch(()=>null);
 assert.ok(m?.selectCases,'The preregistered case selector has not been implemented.');
 assert.equal(new Set(m.selectCases('development').map(x=>x.family)).size,6);
 assert.equal(m.CASES.filter(x=>x.partition==='reserved').length,4);
 assert.throws(()=>m.selectCases('reserved'),/sealed/i);
});

test('script selection consults only public time and preserves explicit paid controls',async()=>{
 const {selectCases,chooseCommand}=await import('../src/experiments/service-plan/cases.js');
 const c=selectCases('development').find(x=>x.id==='D1-original-timed');
 const v={now:41};Object.defineProperty(v,'people',{get(){throw Error('unneeded actor condition read');}});
 const index=c.steps.findIndex(x=>x.at===41);
 assert.deepEqual(chooseCommand(v,c.steps,index),{command:{type:'request',actor:'keeper',task:'rest'},nextIndex:index+1});
 assert.deepEqual(chooseCommand({now:40},c.steps,index),{command:{type:'advance',to:41},nextIndex:index});
 assert.throws(()=>chooseCommand({now:42},c.steps,index),/missed/i);
 assert.equal(c.steps.filter(x=>x.command.type==='request'&&x.command.actor==='partner'&&x.command.task==='rest').length,3);
});

test('the original timed schedule reproduces the retained outcome with compact replay evidence',async()=>{
 const m=await import('../src/experiments/service-plan/experiment.js').catch(()=>null);
 assert.ok(m?.runTrial,'The source-bound comparison runner is not implemented.');
 const {selectCases}=await import('../src/experiments/service-plan/cases.js');
 const trial=await m.runTrial(selectCases().find(x=>x.id==='D1-original-timed'));
 assert.deepEqual(trial.final.delivery,{at:59,route:'deliver',units:2});
 assert.equal(trial.final.paidByActor.partner.rest,12);
 assert.equal(trial.final.outcome.allService,true);
 assert.equal(trial.replayEqual,true);
 assert.ok(trial.commands.every(x=>!Object.hasOwn(x,'view')));
 assert.ok(trial.commands.every(x=>x.decisionFacts&&Object.hasOwn(x.decisionFacts,'now')));
 assert.deepEqual(await m.replayTrial(trial),trial.finalSaveSha256);
 const altered=structuredClone(trial);altered.final.delivery.units=7;
 await assert.rejects(m.replayTrial(altered),/equal|Expected|2/);
});

test('source evidence requires fresh outputs and binds the registered protocol',async()=>{
 const m=await import('../src/experiments/service-plan/provenance.js').catch(()=>null);
 assert.ok(m?.writeJSON,'The provenance boundary is not implemented.');
 const {mkdtemp,readFile,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path');
 const dir=await mkdtemp(join(tmpdir(),'service-plan-'));
 try{
  const path=join(dir,'evidence.json');await m.writeJSON(path,{preserved:true});
  await assert.rejects(m.assertFreshOutput(path),/overwrite/);
  await assert.rejects(m.writeJSON(path,{preserved:false}),/EEXIST/);
  assert.deepEqual(JSON.parse(await readFile(path,'utf8')),{preserved:true});
  assert.match(await m.checkProtocol(),/^[a-f0-9]{64}$/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('the visible-pump rival changes only one declared fallback insertion',async()=>{
 const m=await import('../src/experiments/service-plan/visible-pump.js').catch(()=>null);
 assert.ok(m?.transformVisiblePump,'The bounded visible-pump rival is not implemented.');
 const {readFile}=await import('node:fs/promises');
 const original=await readFile(new URL('../src/games/service-plan.js',import.meta.url),'utf8');
 const variant=m.transformVisiblePump(original);
 assert.equal(variant.replace(m.INSERTION,''),original);
 assert.throws(()=>m.transformVisiblePump(variant),/once|already/i);
 assert.throws(()=>m.transformVisiblePump('unexpected source'),/anchor/i);
});

test('the CLI rejects unsealed reserved output and existing output paths before execution',async()=>{
 const {spawnSync}=await import('node:child_process'),{mkdtemp,writeFile,readFile,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path');
 const dir=await mkdtemp(join(tmpdir(),'service-plan-cli-')),out=join(dir,'preserve.json');
 try{
  const run=args=>spawnSync(process.execPath,['scripts/service-plan-comparison.js',...args],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.match(run(['run','--partition','reserved','--out',join(dir,'sealed.json')]).stderr,/requires a committed --freeze/);
  await writeFile(out,'preserve');assert.match(run(['run','--out',out]).stderr,/overwrite/);
  assert.equal(await readFile(out,'utf8'),'preserve');
 }finally{await rm(dir,{recursive:true,force:true});}
});
