import assert from 'node:assert/strict';
import {readFile,open} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpus,platform,arch} from 'node:os';
import {fileURLToPath} from 'node:url';
import * as watch from '../src/games/watch.js';
import * as watchCandidate from '../src/experiments/coordination/watch.js';
import * as maintenance from '../src/experiments/coordination/maintenance-direct.js';
import * as maintenanceCandidate from '../src/experiments/coordination/maintenance.js';

const root=fileURLToPath(new URL('..',import.meta.url));
const protocolPath='docs/coordination-probe-protocol.md',protocolCommit='07907e027acc5ce52666ac80024650c2fff1866c';
const digest=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const read=path=>readFile(new URL('../'+path,import.meta.url));
const EVENT_LIMIT=10000,FIXED_LIMIT=2000;
const sourcePaths={
  watch:['src/games/watch.js','src/experiments/coordination/watch.js'],
  maintenance:['examples/maintenance-watch/host.js','src/experiments/coordination/maintenance.js'],
  helper:'src/coordination/attempt-clock.js',
  dependencies:['src/runtime/index.js','src/human/v0.1.1.js','src/runtime/clock.js','src/core/model.js']
};
function size(bytes) {
  const lines=bytes.toString('utf8').replace(/\n$/,'').split('\n');
  return {bytes:bytes.length,lines:lines.length,nonblank:lines.filter(line=>line.trim()).length};
}
const sum=items=>Object.fromEntries(['bytes','lines','nonblank'].map(key=>[key,items.reduce((n,item)=>n+item[key],0)]));

async function compare() {
  const started=performance.now();
  const protocol=await read(protocolPath),frozen=execFileSync('git',['show',protocolCommit+':'+protocolPath],{cwd:root});
  assert.deepEqual(protocol,frozen,'protocol changed after preregistration');
  const paths=[...sourcePaths.watch,...sourcePaths.maintenance,sourcePaths.helper,...sourcePaths.dependencies,'src/experiments/coordination/maintenance-direct.js','scripts/coordination-probe.js','scripts/runtime-release-lock.json'];
  const sources=Object.fromEntries(await Promise.all(paths.map(async path=>{const bytes=await read(path);return [path,{sha256:digest(bytes),...size(bytes)}];})));
  for(const path of [sourcePaths.watch[0],sourcePaths.maintenance[0],...sourcePaths.dependencies,'scripts/runtime-release-lock.json'])
    assert.equal(sources[path].sha256,digest(execFileSync('git',['show',protocolCommit+':'+path],{cwd:root})),path+' must remain frozen');
  assert.equal((await read('src/experiments/coordination/maintenance-direct.js')).toString(),(await read(sourcePaths.maintenance[0])).toString().replace("'human-framework-runtime'","'../../runtime/index.js'"),'control normalization must change only its import');
  const metrics={events:0,boundaries:0,commands:0,peakStateBytes:0};
  const cases=[];
  function pair(name,host,setup={},retainTrace=true) {
    const apis=host==='watch'?[watch,watchCandidate]:[maintenance,maintenanceCandidate];
    let states=apis.map(api=>api.createWatch(setup)),commands=0,boundaries=0,events=0,peak=0;
    const trace=[],history=createHash('sha256');
    function check(command) {
      assert.deepEqual(states[1],states[0],name+' state parity');
      const saves=states.map((s,i)=>apis[i].exportWatch(s));assert.deepEqual(saves[1],saves[0],name+' export parity');
      assert.equal(JSON.stringify(saves[1]),JSON.stringify(saves[0]),name+' serialized byte parity');
      peak=Math.max(peak,...states.map(s=>Buffer.byteLength(JSON.stringify(s))));metrics.peakStateBytes=Math.max(metrics.peakStateBytes,peak);
      if(command){commands++;metrics.commands++;const entry={command,stateHash:digest(states[0])};history.update(JSON.stringify(entry)+'\n');if(retainTrace)trace.push(entry);}
    }
    check();
    const p={
      get state(){return states[0];},
      ask(actor,task,code='ACCEPTED') {
        states=states.map((s,i)=>apis[i].requestTask(s,actor,task));assert.equal(states[0].lastResponse.code,code,name);check(['requestTask',actor,task]);return p;
      },
      stop(actor){states=states.map((s,i)=>apis[i].interruptTask(s,actor));check(['interruptTask',actor]);return p;},
      advance(target,driver='events') {
        while(states[0].clock.now<target&&(host!=='watch'||!states[0].outcome)) {
          const now=states[0].clock.now,nextEvent=states[0].clock.queue[0]?.at??target;
          const step=driver==='minutes'?1:driver==='irregular'?[3,1,7,2][now%4]:target-now;
          // Never cross an event boundary. The pre-call queue then exactly lists
          // the events the unchanged clock returns, including canceled tie receipts.
          const next=Math.min(target,nextEvent,now+step),due=states[0].clock.queue.filter(e=>e.at<=next).length;
          assert.ok(metrics.events+due*2<=EVENT_LIMIT,'declared delivered-event budget exceeded');
          states=states.map((s,i)=>apis[i].advanceTo(s,next));
          metrics.events+=due*2;events+=due*2;metrics.boundaries+=2;boundaries+=2;
          check(['advanceTo',next]);
        }
        return p;
      },
      resume(){states=states.map((s,i)=>apis[i].restoreWatch(JSON.parse(JSON.stringify(apis[i].exportWatch(s)))));check(['JSON-resume']);return p;},
      receipt(receipt,code) {
        const before=structuredClone(states);
        states.forEach((s,i)=>assert.throws(()=>apis[i].receiveReceipt(s,receipt),{code},name));assert.deepEqual(states,before);check(['receiveReceipt',receipt,code]);return p;
      },
      badSave(label,mutate) {
        const before=structuredClone(states);
        states.forEach((s,i)=>{const save=apis[i].exportWatch(s);mutate(save.state);assert.throws(()=>apis[i].restoreWatch(save),name+' invalid '+label);});
        assert.deepEqual(states,before);check(['reject-save',label]);return p;
      },
      finish(){check();return {name,host,commands,elapsedBoundaries:boundaries,deliveredEvents:events,peakStateBytes:peak,historyHash:history.digest('hex'),final:{direct:digest(states[0]),candidate:digest(states[1])},outcome:states[0].outcome,trace};}
    };
    return p;
  }
  function record(p){cases.push(p.finish());}
  function gate(name,scenario='steady',tie=false) {
    const p=pair(name,'watch',{scenario});
    p.ask('watcher','repair','ROLE_DECLINED').ask('watcher','share','KEEPING_SPARE').ask('keeper','repair').ask('watcher','watch');
    p.ask('keeper','rest','BUSY').receipt(p.state.clock.queue.find(e=>e.actorId==='keeper'),'EARLY_RECEIPT');
    p.advance(6).ask('keeper','repair').ask('watcher','share').advance(12).ask('keeper','repair','CAPACITY').ask('keeper','rest');
    if(tie)p.advance(26);else p.advance(15).stop('keeper');
    p.ask('keeper','repair').advance(tie?29:18).resume().advance(scenario==='short'?22:32);
    assert.equal(p.state.repair,18);assert.equal(p.state.outcome.protected,true);assert.equal(p.state.paid.rest,tie?6:3);record(p);
  }
  gate('watch-short-three-minute-rest','short');gate('watch-paid-final-repair-arrival-tie','steady',true);
  {
    const p=pair('watch-three-minute-rest-then-delay-refuses','watch');
    p.ask('keeper','repair').ask('watcher','watch').advance(6).ask('keeper','repair').ask('watcher','share').advance(12).ask('keeper','rest').advance(15).stop('keeper').advance(26).ask('keeper','repair','CAPACITY').advance(32);
    assert.equal(p.state.outcome.protected,false);assert.equal(p.state.repair,12);record(p);
  }
  {
    const p=pair('watch-owned-parts-meals-salvage','watch');
    p.ask('keeper','bypass').ask('watcher','bypass','TARGET_BUSY').advance(2).stop('keeper');assert.equal(p.state.parts.keeper,1);assert.equal(p.state.bypass,2);
    p.ask('keeper','meal').advance(4).stop('keeper');assert.equal(p.state.food.keeper,1);assert.equal(p.state.eaten.keeper,0);
    p.ask('keeper','meal').resume().advance(8);assert.equal(p.state.food.keeper,0);assert.equal(p.state.eaten.keeper,1);
    p.receipt(p.state.lastReceipt,'STALE_RECEIPT').ask('keeper','meal','NO_MEAL').ask('watcher','watch').advance(14).ask('watcher','share').advance(16);
    assert.equal(p.state.parts.keeper,2);assert.equal(p.state.parts.watcher,0);
    p.ask('keeper','salvage').ask('watcher','salvage','TARGET_BUSY');
    const due=p.state.clock.queue.find(e=>e.actorId==='keeper');p.receipt({...due,data:{...due.data,task:'meal'}},'STALE_RECEIPT');
    p.badSave('owned parts',s=>s.parts.keeper++).badSave('pending timing',s=>s.jobs.keeper.endsAt++).advance(24).receipt(due,'STALE_RECEIPT');
    assert.equal(p.state.parts.keeper,3);p.advance(32).resume();record(p);
  }
  for(const tie of [false,true]) {
    const p=pair(tie?'watch-open-arrival-tie':'watch-diversion-after-partial-work','watch');
    p.ask('keeper','bypass').ask('watcher','watch').advance(2).stop('keeper').ask('keeper','bypass').advance(10).resume();
    assert.equal(p.state.bypass,10);assert.equal(p.state.parts.keeper,0);
    if(tie)p.advance(28);
    p.ask('watcher','open').advance(32);assert.equal(p.state.outcome.protected,!tie);assert.equal(p.state.divertedAt,tie?null:14);record(p);
  }
  for(const host of ['watch','maintenance']) {
    const p=pair(host+'-lookout-arrival-tie',host),arrival=host==='watch'?32:18,duration=host==='watch'?6:8;
    p.advance(arrival-duration).ask('watcher','watch').resume().advance(arrival);assert.equal(p.state.warningAt,null);record(p);
  }
  {
    const p=pair('watch-terminal-meal-refund','watch');p.advance(31).ask('keeper','meal').advance(40).resume();
    assert.equal(p.state.food.keeper,1);assert.equal(p.state.eaten.keeper,0);assert.equal(p.state.jobs.keeper,null);p.ask('keeper','rest','ARRIVAL_PASSED');record(p);
  }
  for(const driver of ['events','minutes','irregular']) {
    const p=pair('maintenance-paid-repair-'+driver,'maintenance');
    p.ask('watcher','repair','ROLE_DECLINED').ask('keeper','repair').ask('keeper','rest','BUSY').ask('watcher','watch');
    const receipt=p.state.clock.queue.find(e=>e.actorId==='keeper');p.receipt(receipt,'EARLY_RECEIPT');
    p.advance(5,driver).resume().stop('keeper');assert.equal(p.state.repairMinutes,5);assert.deepEqual(p.state.parts,{available:1,reserved:0,spent:1});
    p.ask('keeper','repair').badSave('part reservation',s=>s.parts.reserved++).badSave('person time',s=>s.people.keeper.minutes++).advance(12,driver);
    p.receipt(p.state.lastReceipt,'STALE_RECEIPT').advance(18,driver).ask('keeper','rest').advance(24,driver).resume().advance(80,driver);
    assert.equal(p.state.outcome.unrepairedMinutes,0);assert.equal(p.state.outcome.warningAvailable,true);record(p);
  }
  {
    const p=pair('maintenance-partial-arrival','maintenance');p.advance(10).ask('keeper','repair').advance(15).ask('watcher','watch').resume().advance(18);
    assert.equal(p.state.repairMinutes,8);assert.equal(p.state.warningAt,null);assert.equal(p.state.stats.interrupted,2);p.advance(80);record(p);
  }
  {
    const p=pair('maintenance-solo','maintenance',{solo:true});p.ask('watcher','watch','NOT_PRESENT').advance(13).ask('keeper','repair').advance(18).resume();
    assert.equal(p.state.outcome.unrepairedMinutes,7);assert.deepEqual(Object.keys(p.state.people),['keeper']);record(p);
  }
  assert.ok(metrics.events<=FIXED_LIMIT,'fixed histories exceeded reserved budget');
  const fixedEvents=metrics.events;
  const long=pair('maintenance-post-arrival-bounded-session','maintenance',{},false);long.advance(18).resume();
  while(true) {
    const at=long.state.clock.queue[0].at,due=long.state.clock.queue.filter(e=>e.at===at).length*2;
    if(metrics.events+due>EVENT_LIMIT)break;
    long.advance(at);
  }
  long.resume();const longRun=long.finish();
  const helper=sources[sourcePaths.helper],hosts=Object.entries(sourcePaths).filter(([key])=>['watch','maintenance'].includes(key)).map(([host,paths])=>({host,direct:paths[0],candidate:paths[1]}));
  const sizes={helper,perHost:hosts.map(host=>({host:host.host,direct:sources[host.direct],candidateCaller:sources[host.candidate],candidateInclusive:sum([sources[host.candidate],helper])}))};
  sizes.aggregate={direct:sum(hosts.map(h=>sources[h.direct])),candidateCallers:sum(hosts.map(h=>sources[h.candidate])),candidateInclusive:sum([...hosts.map(h=>sources[h.candidate]),helper]),unchangedDependencies:sum(sourcePaths.dependencies.map(p=>sources[p]))};
  return {format:'human-framework-coordination-probe',version:1,recordedAt:new Date().toISOString(),sourceCommit:git('rev-parse','HEAD'),
    protocol:{path:protocolPath,commit:protocolCommit,sha256:digest(protocol)},runtime:{node:process.version,platform:platform(),arch:arch(),cpu:cpus()[0]?.model},
    hosts,sources,sizes,cases,longRun,events:{limit:EVENT_LIMIT,total:metrics.events,fixed:fixedEvents,longRun:metrics.events-fixedEvents},
    parity:{allCommands:true,fullStateAndSerializedSave:true,commandCount:metrics.commands,elapsedBoundaries:metrics.boundaries,peakStateBytes:metrics.peakStateBytes},
    elapsedMs:performance.now()-started,
    limits:['Same-driver pairs only; irregular requests are clamped at each actual event boundary for auditable counting.','Two actual consumers share lifecycle ancestry.','Mechanical source and integration evidence; no measured human authoring effort or public package promotion.','No UI, rendering, network, physical-device or human timing is included.']};
}

async function main() {
  if(process.argv.length!==3||!process.argv[2]||process.argv[2].startsWith('-'))throw new Error('Provide one explicit fresh output path: node scripts/coordination-probe.js /tmp/new-result.json');
  // Reserve exclusively BEFORE executing work. A failed run leaves only its own
  // empty reservation; it can never replace previously retained evidence.
  const output=await open(process.argv[2],'wx');
  try {const evidence=await compare();await output.writeFile(JSON.stringify(evidence,null,2)+'\n');process.stdout.write(JSON.stringify({output:process.argv[2],events:evidence.events,parity:evidence.parity})+'\n');}
  finally {await output.close();}
}
main().catch(error=>{process.stderr.write(error.stack+'\n');process.exitCode=1;});
