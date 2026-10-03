/** Private, source-pinned current-player evidence. No imported historical study. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,dirname,relative,posix} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {chooseKeeper,chooseJointReceiver} from './policies.mjs';

export const FORMAT='across-player-comparison';
export const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENTRY_PATHS=['artifacts/across-player/inputs.json','artifacts/across-player/policies.mjs','artifacts/across-player/compare.mjs','docs/across-player-comparison.md','tests/across-player-comparison.test.js','src/games/across-cut.js','src/games/across-cut-receiver.js','src/games/across-cut-player.js'];
const ACTORS=['keeper','receiver'];
const git=(root,args)=>execFileSync('git',['-C',root,...args],{encoding:null,maxBuffer:32*1024*1024});
const clone=structuredClone;
export function setupFor(definition){
  const setup=clone(definition.setup);
  if(Object.hasOwn(definition,'allRadioSlots'))setup.channelOverrides=Object.fromEntries(ACTORS.flatMap(actor=>Array.from({length:30},(_,n)=>[`${actor}:${n+1}`,definition.allRadioSlots])));
  return setup;
}
function readGit(root,commit,path){return git(root,['show',`${commit}:${path}`]);}
export function makeFreeze(root,sourceCommit){
  const commit=git(root,['rev-parse','--verify',`${sourceCommit}^{commit}`]).toString().trim(),files={};
  function collect(path){
    if(Object.hasOwn(files,path))return;
    assert.ok(!path.startsWith('../')&&!posix.isAbsolute(path),'Source path must stay in repository.');
    const bytes=readGit(root,commit,path),text=bytes.toString('utf8');
    files[path]={sha256:hash(bytes),bytes:bytes.length,nonblankLines:text.split('\n').filter(line=>line.trim()).length};
    if(/\.(?:js|mjs)$/.test(path))for(const match of text.matchAll(/\b(?:import|export)\s+(?:[^;]*?\s+from\s*)?['"]([^'"]+)['"]/g)){
      const specifier=match[1];
      if(specifier.startsWith('node:'))continue;
      assert.ok(specifier.startsWith('.'),`Nonlocal dependency is unpinned: ${specifier}`);
      collect(posix.normalize(posix.join(posix.dirname(path),specifier)));
    }
  }
  ENTRY_PATHS.forEach(collect);
  return {format:'across-player-source-freeze',version:1,sourceCommit:commit,files};
}
export function verifyFreeze(root,freeze){
  assert.deepEqual(freeze,makeFreeze(root,freeze.sourceCommit),'Freeze graph and all source bytes must match the claimed Git commit.');
  return freeze;
}
async function loadFrozen(root,freeze){
  verifyFreeze(root,freeze);
  const directory=mkdtempSync(resolve(tmpdir(),'across-player-frozen-'));
  try{
    writeFileSync(resolve(directory,'package.json'),'{"type":"module"}\n');
    for(const [path,identity] of Object.entries(freeze.files)){
      const bytes=readGit(root,freeze.sourceCommit,path);assert.equal(hash(bytes),identity.sha256);
      const destination=resolve(directory,path);mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,bytes);
    }
    const load=path=>import(pathToFileURL(resolve(directory,path)).href);
    const runner=await load('artifacts/across-player/compare.mjs');
    const host=await load('src/games/across-cut.js');
    const receiver=await load('src/games/across-cut-receiver.js');
    const player=await load('src/games/across-cut-player.js');
    const inputs=JSON.parse(readFileSync(resolve(directory,'artifacts/across-player/inputs.json'),'utf8'));
    return {runner,host,receiver,player,inputs,directory};
  }catch(error){rmSync(directory,{recursive:true,force:true});throw error;}
}
function apply(host,world,actor,command){
  try{return {world:command.type==='stop'?host.interrupt(world,actor):host.request(world,actor,command.action),error:null};}
  catch(error){return {world,error:{code:error.code??null,message:error.message}};}
}
export function metrics(summary){
  return {
    service:clone(summary.service),water:clone(summary.water),work:clone(summary.work),
    actors:Object.fromEntries(ACTORS.map(actor=>{
      const person=summary.actors[actor];
      return [actor,{inventory:clone(person.inventory),paid:clone(person.paid),body:clone(person.body),position:person.position,
        attendanceMinutes:person.paid.attend,radioCharges:person.inventory.radio.consumed,transmissionMinutes:person.paid.transmit,
        completedRadioMinutes:summary.transport.filter(envelope=>envelope.sender===actor&&envelope.via==='radio').length,
        completedContactMinutes:summary.transport.filter(envelope=>envelope.sender===actor&&envelope.via==='contact').length,
        paidWorkMinutes:['inspect','repair','release','cart','travel','transmit'].reduce((sum,key)=>sum+(person.paid[key]??0),0)}];
    })),
    transmissions:clone(summary.transport)
  };
}
function verifyAccounting(summary){
  assert.equal(summary.now,30);assert.equal(summary.water.conservedTotal,3);
  for(const actor of ACTORS)assert.equal(Object.values(summary.actors[actor].paid).reduce((sum,n)=>sum+n,0),30,`${actor} paid timeline must reconcile.`);
}
export function runPolicy(host,receiver,definition,arm){
  let world=host.create(setupFor(definition));
  const states={keeper:{},receiver:arm.receiver==='player-receiver'?receiver.createReceiverState():{}};
  const initialSave=host.exportState(world),events=[],errors=[];
  for(let minute=0;minute<30;minute++){
    const inputs=Object.fromEntries(ACTORS.map(actor=>[actor,{view:host.getActorView(world,actor),state:clone(states[actor])}]));
    // Both choices precede either command. Each actor gets one decision per paid minute.
    const decisions={keeper:chooseKeeper(clone(states.keeper),clone(inputs.keeper.view),arm),receiver:arm.receiver==='player-receiver'?receiver.decideReceiver(clone(states.receiver),clone(inputs.receiver.view)):chooseJointReceiver(clone(states.receiver),clone(inputs.receiver.view),arm.receiver)};
    const outcomes=[];
    for(const actor of ACTORS){
      states[actor]=clone(decisions[actor].state);
      for(const command of decisions[actor].commands){
        const applied=apply(host,world,actor,command);world=applied.world;
        const outcome={actor,command:clone(command),error:applied.error,saveSha256:hash(host.exportState(world))};
        outcomes.push(outcome);if(applied.error)errors.push({at:minute,...outcome});
      }
    }
    world=host.advance(world,minute+1);
    events.push({at:minute,inputs,decisions,outcomes,advancedTo:minute+1,saveSha256:hash(host.exportState(world))});
    if(minute===14)world=host.restoreState(JSON.parse(JSON.stringify(host.exportState(world))));
  }
  const finalSave=host.exportState(world),summary=host.getWorldSummary(world);verifyAccounting(summary);
  return {id:`${definition.id}/${arm.id}`,kind:'policy',caseId:definition.id,armId:arm.id,receiverPolicy:arm.receiver,
    initialSave,initialSaveSha256:hash(initialSave),events,errors,finalSave,finalSaveSha256:hash(finalSave),
    finalLocal:Object.fromEntries(ACTORS.map(actor=>[actor,host.getActorView(world,actor)])),finalPolicyStates:states,metrics:metrics(summary)};
}
export function runIntervention(host,player,inputs,intervention){
  const definition=inputs.worlds.find(world=>world.id===intervention.world);
  let game=player.createGame(setupFor(definition));
  const initialSave=player.exportGame(game),events=[],errors=[];
  function act(command){
    const input=player.getGameView(game);let error=null;
    try{game=command.type==='continue'?player.advanceToNextEvent(game):command.type==='advance'?player.advanceGame(game,command.minutes):player.applyCommand(game,command);}
    catch(caught){error={code:caught.code??null,message:caught.message};errors.push({command,error});}
    events.push({input,command,error,output:player.getGameView(game),saveSha256:hash(player.exportGame(game))});
    if(error)throw Error(`Required prescribed step refused: ${error.message}`);
  }
  function through(to){let attempts=0;while(player.getGameView(game).now<to){if(++attempts>32)throw Error('Player clock failed to reach prescribed boundary.');act({type:'advance',minutes:to-player.getGameView(game).now});}}
  act({type:'request',action:{task:'inspect'}});through(1);
  act({type:'request',action:{task:'repair'}});through(7);
  act({type:'request',action:{task:'release'}});act({type:'continue'});
  const receiptView=player.getGameView(game),receiptSave=player.exportGame(game);
  const receiptClaims={minuteEight:receiptView.now===8,actualReport:receiptView.pauseReason==='report'&&receiptView.inbox.some(envelope=>envelope.sender==='receiver'&&envelope.sentAt===2&&envelope.receivedAt===8),activeRelease:receiptView.job?.task==='release'&&receiptView.job.elapsed===1,onePaidReleaseMinute:receiptView.paid.release===1,reservedWater:receiptView.inventory.water.reserved===2};
  let restoredEqual=null;
  if(intervention.restoreAtReceipt){game=player.restoreGame(JSON.parse(JSON.stringify(receiptSave)));restoredEqual=hash(player.exportGame(game))===hash(receiptSave);}
  act(intervention.choice==='stop'?{type:'stop'}:{type:'continue'});
  const afterChoice=player.getGameView(game);through(30);
  const summary=player.getDebrief(game);verifyAccounting(summary);
  const finalSave=player.exportGame(game);
  return {id:intervention.id,kind:'intervention',caseId:definition.id,choice:intervention.choice,restoreAtReceipt:intervention.restoreAtReceipt,
    initialSave,initialSaveSha256:hash(initialSave),events,errors,receiptView,receiptSave,receiptSaveSha256:hash(receiptSave),receiptClaims,restoredEqual,afterChoice,
    finalSave,finalSaveSha256:hash(finalSave),metrics:metrics(summary)};
}
export function runSuite({host,receiver,player,inputs}){
  const records=[];
  for(const definition of inputs.worlds)for(const arm of inputs.arms)records.push(runPolicy(host,receiver,definition,arm));
  for(const intervention of inputs.interventions)records.push(runIntervention(host,player,inputs,intervention));
  return {format:FORMAT,version:1,inputsSha256:hash(inputs),hostVersion:host.ACROSS_CUT_VERSION,receiverVersion:receiver.RECEIVER_VERSION,playerVersion:player.PLAYER_VERSION,records};
}
export function verifyRecord(record,{host,receiver,player,inputs}){
  let expected;
  if(record.kind==='policy'){
    const definition=inputs.worlds.find(world=>world.id===record.caseId),arm=inputs.arms.find(item=>item.id===record.armId);
    assert.ok(definition&&arm,'Unregistered case/controller.');expected=runPolicy(host,receiver,definition,arm);
  }else{
    const intervention=inputs.interventions.find(item=>item.id===record.id);assert.ok(intervention,'Unregistered intervention.');expected=runIntervention(host,player,inputs,intervention);
  }
  assert.deepEqual(record,expected,'Complete evidence must reproduce from source-defined setup, controller and driver, including decision inputs.');
  return {id:record.id,finalSaveSha256:record.finalSaveSha256};
}
function writeFresh(path,value){const text=JSON.stringify(value)+'\n';mkdirSync(dirname(path),{recursive:true});writeFileSync(path,path.endsWith('.gz')?gzipSync(text,{level:9}):text,{flag:'wx'});}
function readArtifact(path){const bytes=readFileSync(path);return JSON.parse(path.endsWith('.gz')?gunzipSync(bytes).toString():bytes.toString());}
async function main(){
  const [command,...args]=process.argv.slice(2),options={};
  while(args.length){const name=args.shift();assert.ok(['--out','--freeze','--input','--commit'].includes(name)&&args.length&&!Object.hasOwn(options,name),'Invalid option.');options[name]=args.shift();}
  assert.ok(options['--out'],'An explicit fresh --out is required.');
  const output=resolve(ROOT,options['--out']);
  if(command==='freeze'){assert.equal(Object.keys(options).length,2);assert.ok(options['--commit']);writeFresh(output,makeFreeze(ROOT,options['--commit']));process.stdout.write('Frozen committed source graph; no outcomes executed.\n');return;}
  assert.ok(['run','replay'].includes(command)&&options['--freeze'],'Run/replay require --freeze.');
  const freeze=readArtifact(resolve(ROOT,options['--freeze']));
  const loaded=await loadFrozen(ROOT,freeze);
  try{
    if(command==='run'){
      assert.ok(!options['--input']&&!options['--commit']);
      const result=loaded.runner.runSuite(loaded);
      writeFresh(output,{...result,provenance:{freeze,freezeSha256:hash(freeze)},execution:{node:process.version,platform:process.platform,arch:process.arch}});
      for(const record of result.records)process.stdout.write(`${record.id}: service=${record.metrics.service.units}; lost=${record.metrics.water.lost}; excess=${record.metrics.water.excess}; radio=${ACTORS.reduce((sum,actor)=>sum+record.metrics.actors[actor].radioCharges,0)}; errors=${record.errors.length}\n`);
    }else{
      assert.ok(options['--input']&&!options['--commit']);const evidence=readArtifact(resolve(ROOT,options['--input']));
      assert.equal(evidence.format,FORMAT);assert.equal(evidence.version,1);assert.deepEqual(evidence.provenance,{freeze,freezeSha256:hash(freeze)});
      const expectedIds=[...loaded.inputs.worlds.flatMap(world=>loaded.inputs.arms.map(arm=>`${world.id}/${arm.id}`)),...loaded.inputs.interventions.map(item=>item.id)];
      assert.deepEqual(evidence.records.map(record=>record.id),expectedIds,'All source-prescribed records must occur exactly once in source order.');
      assert.equal(evidence.inputsSha256,hash(loaded.inputs));assert.equal(evidence.hostVersion,loaded.host.ACROSS_CUT_VERSION);assert.equal(evidence.receiverVersion,loaded.receiver.RECEIVER_VERSION);assert.equal(evidence.playerVersion,loaded.player.PLAYER_VERSION);
      const verified=evidence.records.map(record=>loaded.runner.verifyRecord(record,loaded));
      writeFresh(output,{format:'across-player-replay',version:1,inputSha256:hash(readFileSync(resolve(ROOT,options['--input']))),freezeSha256:hash(freeze),sourceCommit:freeze.sourceCommit,node:process.version,verified});
      process.stdout.write(`Reproduced ${verified.length} full source-bound records, including actor inputs and receipt resumes.\n`);
    }
  }finally{rmSync(loaded.directory,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{process.stderr.write(`${error.stack}\n`);process.exitCode=1;});
