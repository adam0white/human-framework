import assert from 'node:assert/strict';
import * as host from '../host.js';
import {ARMS,chooseAction} from './policies.js';
import {selectCases,getCaseDefinition} from './cases.js';
import {hash,intern,resolveInput} from './evidence.js';
import {isVerifiedFreeze} from './provenance.js';
import {compareRepresentations} from './representations.js';
const actors=['keeper','receiver'];
const views=world=>Object.fromEntries(actors.map(actor=>[actor,host.getActorView(world,actor)]));
function apply(world,actor,action){
  if(!action)return {world,error:null};
  try{return {world:action.control==='interrupt'?host.interrupt(world,actor):host.request(world,actor,action),error:null};}
  catch(e){return {world,error:{code:e.code??null,message:e.message}};}
}
function resolveScript(action,view){
  const a=structuredClone(action);
  if(a.message?.observationIds==='all-local')a.message.observationIds=view.notebook.filter(x=>x.via==='local').map(x=>x.receipt).slice(-32);
  return a;
}
function snapshot(world){const save=host.exportState(world);return {save,saveSha256:hash(save),bytes:Buffer.byteLength(JSON.stringify(save))};}
export function runTrial(condition,arm=condition.kind==='script'?'prescribed':null,{freeze=null}={}){
  if(condition.partition==='reserved'&&!isVerifiedFreeze(freeze))throw Error('Reserved trial is sealed until committed source freeze verification.');
  assert.deepEqual(condition,getCaseDefinition(condition.id),'Comparison condition must match its source-defined case.');
  assert.ok(condition.kind==='policy'?ARMS.includes(arm):arm==='prescribed','Unsupported source-defined controller.');
  let world=host.create(condition.setup),states={keeper:{},receiver:{}},maxSaveBytes=0;
  const initialSave=host.exportState(world),dictionary={},events=[],errors=[];
  const measure=()=>{const s=snapshot(world);maxSaveBytes=Math.max(maxSaveBytes,s.bytes);return s.saveSha256;};
  function decisionRound(scriptEntry=null){
    const current=views(world),inputs=Object.fromEntries(actors.map(actor=>[actor,intern(dictionary,{view:current[actor],state:states[actor]})]));
    // Both decisions are computed before the first world command is dispatched.
    const controllers=Object.fromEntries(actors.map(actor=>[actor,scriptEntry?(scriptEntry.actor===actor&&scriptEntry.action.control==='choose-policy'?scriptEntry.action.arm:'prescribed'):arm]));
    const decisions=Object.fromEntries(actors.map(actor=>[actor,controllers[actor]==='prescribed'?{state:structuredClone(states[actor]),action:actor===scriptEntry.actor?resolveScript(scriptEntry.action,current[actor]):null,reason:'Source-prescribed legal paid intervention; not an autonomous policy.'}:chooseAction(structuredClone(current[actor]),structuredClone(states[actor]),controllers[actor])]));
    const results={};
    for(const actor of actors){
      states[actor]=structuredClone(decisions[actor].state);
      const applied=apply(world,actor,decisions[actor].action);world=applied.world;
      if(applied.error){states[actor].lastRefusal={at:current[actor].now,action:decisions[actor].action,error:applied.error};errors.push({at:current[actor].now,actor,...states[actor].lastRefusal});}
      results[actor]={error:applied.error,saveSha256:measure()};
    }
    events.push({kind:'decisions',at:current.keeper.now,inputs,controllers,decisions,results});
    return actors.some(a=>decisions[a].action!==null);
  }
  for(let minute=0;minute<30;minute++){
    if(condition.kind==='script')for(const step of condition.steps.filter(step=>step.at===minute))decisionRound(step);
    else for(let round=0;round<6;round++){if(!decisionRound())break;if(round===5)throw Error('Controller failed to yield after six same-minute decision rounds.');}
    world=host.advance(world,minute+1);events.push({kind:'advance',to:minute+1,saveSha256:measure()});
    if(minute===14)world=host.restoreState(JSON.parse(JSON.stringify(host.exportState(world))));
  }
  const finalSave=host.exportState(world),final=host.getWorldSummary(world),local=views(world);
  for(const actor of actors)assert.equal(Object.values(final.actors[actor].paid).reduce((a,b)=>a+b,0),30);
  assert.equal(final.water.conservedTotal,3);
  const trial={id:`${condition.id}/${arm}`,caseId:condition.id,family:condition.family,partition:condition.partition,kind:condition.kind,arm,initialSave,initialSaveSha256:hash(initialSave),dictionary,events,errors,commandCount:final.journalEntries,maxSaveBytes,final,finalLocal:local,finalSave,finalSaveSha256:hash(finalSave),representations:Object.fromEntries(actors.map(actor=>[actor,compareRepresentations(local[actor].notebook,local[actor].inbox)])),replayEqual:false};
  assert.equal(replayTrial(trial),trial.finalSaveSha256);trial.replayEqual=true;return trial;
}
export function replayTrial(trial){
  assert.deepEqual(Object.keys(trial).sort(),['id','caseId','family','partition','kind','arm','initialSave','initialSaveSha256','dictionary','events','errors','commandCount','maxSaveBytes','final','finalLocal','finalSave','finalSaveSha256','representations','replayEqual'].sort(),'Unknown or missing trial header.');
  const definition=getCaseDefinition(trial.caseId);
  assert.equal(trial.kind,definition.kind);assert.equal(trial.family,definition.family);assert.equal(trial.partition,definition.partition);
  assert.ok(definition.kind==='policy'?ARMS.includes(trial.arm):trial.arm==='prescribed','Unsupported source-defined controller.');
  assert.equal(trial.id,`${definition.id}/${trial.arm}`);
  assert.deepEqual(trial.initialSave,host.exportState(host.create(definition.setup)),'Initial setup must match the source-defined case.');
  assert.equal(hash(trial.initialSave),trial.initialSaveSha256);let world=host.restoreState(trial.initialSave),states={keeper:{},receiver:{}};
  let maxSaveBytes=0,scriptIndex=0,rounds=0,lastHadAction=false;const errors=[];
  const verifySnapshot=expected=>{const current=snapshot(world);maxSaveBytes=Math.max(maxSaveBytes,current.bytes);assert.equal(current.saveSha256,expected);};
  for(const event of trial.events){
    if(event.kind==='advance'){
      const now=host.getActorView(world,'keeper').now;assert.equal(event.to,now+1);
      if(definition.kind==='policy')assert.ok(rounds>0&&!lastHadAction,'The source policy must yield before the next paid minute.');
      else assert.ok(!definition.steps[scriptIndex]||definition.steps[scriptIndex].at>now,'Source-prescribed steps cannot be skipped.');
      world=host.advance(world,event.to);verifySnapshot(event.saveSha256);rounds=0;lastHadAction=false;continue;
    }
    assert.equal(event.kind,'decisions');const current=views(world);
    assert.equal(event.at,current.keeper.now);const step=definition.kind==='script'?definition.steps[scriptIndex++]:null;
    if(definition.kind==='script')assert.equal(step?.at,event.at,'Decision does not match the next source-defined script step.');
    const expectedControllers=Object.fromEntries(actors.map(actor=>[actor,step?(step.actor===actor&&step.action.control==='choose-policy'?step.action.arm:'prescribed'):trial.arm]));
    assert.deepEqual(event.controllers,expectedControllers,'Controller attribution must match the source-defined trial and step.');
    if(definition.kind==='policy'){assert.ok(rounds===0||lastHadAction,'The source driver stops choosing once both policies yield.');assert.ok(++rounds<=6,'Too many same-minute source-policy rounds.');}
    for(const actor of actors){
      const input=resolveInput(trial.dictionary,event.inputs[actor]);assert.deepEqual(input,{view:current[actor],state:states[actor]});
      const controller=expectedControllers[actor];
      const expected=controller==='prescribed'?{state:structuredClone(input.state),action:actor===step.actor?resolveScript(step.action,input.view):null,reason:'Source-prescribed legal paid intervention; not an autonomous policy.'}:chooseAction(structuredClone(input.view),structuredClone(input.state),controller);
      assert.deepEqual(expected,event.decisions[actor]);
    }
    lastHadAction=actors.some(actor=>event.decisions[actor].action!==null);
    for(const actor of actors){
      const decision=event.decisions[actor];states[actor]=structuredClone(decision.state);const applied=apply(world,actor,decision.action);world=applied.world;
      assert.deepEqual(applied.error,event.results[actor].error);
      if(applied.error){states[actor].lastRefusal={at:current[actor].now,action:decision.action,error:applied.error};errors.push({at:current[actor].now,actor,...states[actor].lastRefusal});}
      verifySnapshot(event.results[actor].saveSha256);
    }
    if(event.at===15)world=host.restoreState(JSON.parse(JSON.stringify(host.exportState(world))));
  }
  assert.deepEqual(host.exportState(world),trial.finalSave);assert.equal(hash(trial.finalSave),trial.finalSaveSha256);
  assert.deepEqual(host.getWorldSummary(world),trial.final);assert.deepEqual(views(world),trial.finalLocal);
  assert.equal(trial.final.now,30);assert.equal(trial.final.ended,true);
  if(definition.kind==='script')assert.equal(scriptIndex,definition.steps.length);
  assert.equal(trial.commandCount,trial.final.journalEntries);assert.equal(trial.maxSaveBytes,maxSaveBytes);assert.deepEqual(trial.errors,errors);
  assert.deepEqual(Object.fromEntries(actors.map(a=>[a,compareRepresentations(trial.finalLocal[a].notebook,trial.finalLocal[a].inbox)])),trial.representations);
  return trial.finalSaveSha256;
}
export function runComparison({partition='development',freeze=null}={}){
  const trials=[];for(const condition of selectCases(partition,freeze))for(const arm of condition.kind==='policy'?ARMS:['prescribed'])trials.push(runTrial(condition,arm,{freeze}));
  return {format:'across-cut-comparison',version:1,partition,trials};
}
