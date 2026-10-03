import * as host from '/src/games/workshop.js';

const act=(game,id)=>host.applyCommand(host.applyCommand(game,{type:'start',actionId:id}),{type:'finish'});
const atPump=seed=>act(act(host.createGame({seed}),'take-wrench'),'go-pump');
const start=(game,actionId)=>host.applyCommand(game,{type:'start',actionId});
const partial=(game,minutes)=>host.applyCommand(game,{type:'advance',minutes});
const expect=(value,message)=>{if(!value)throw new Error(`Fixture check failed: ${message}`);};

function fixtures() {
  const initial=host.createGame({seed:1}),pump=atPump(1),inspecting=partial(start(pump,'inspect-pump'),4);
  const patching=start(pump,'patch'),working=partial(patching,5),save=host.exportGame(working);
  let blocked=pump;
  for(let i=0;i<3;i++)blocked=host.applyCommand(partial(start(blocked,'patch'),34),{type:'interrupt',reason:'Fixture interruption'});
  expect(!host.getActions(blocked).find(action=>action.id==='patch').capacity.allowed,'legal partial work produces blocked capacity');
  let deadline=host.createGame({seed:1});
  for(let i=0;i<15;i++)deadline=act(deadline,'rest');
  deadline=start(act(deadline,'go-pump'),'inspect-pump');
  const rows=[];
  const command=(label,input,command,check)=>rows.push({label,kind:'command',seed:input.seed,
    command,clock:input.clock,pendingAction:input.pending?.actionId??null,run:()=>host.applyCommand(input,command),check});
  command('start-retrieval',initial,{type:'start',actionId:'take-wrench'},out=>expect(out.pending?.actionId==='take-wrench','start retrieval'));
  command('finish-retrieval',start(initial,'take-wrench'),{type:'finish'},out=>expect(out.objects.wrench.location==='inventory','retrieve tool'));
  command('finish-travel',start(act(initial,'take-wrench'),'go-pump'),{type:'finish'},out=>expect(out.location==='pump-room','travel'));
  command('start-inspection',pump,{type:'start',actionId:'inspect-pump'},out=>expect(out.pending?.actionId==='inspect-pump','start inspection'));
  command('advance-inspection',start(pump,'inspect-pump'),{type:'advance',minutes:4},out=>expect(out.objects.pump.inspection===null,'partial inspection hides result'));
  command('finish-inspection',inspecting,{type:'finish'},out=>expect(out.objects.pump.inspection!==null,'record inspection'));
  command('interrupt-inspection',inspecting,{type:'interrupt',reason:'Benchmark interruption'},out=>expect(out.lastEvent.status==='interrupted'&&out.objects.pump.inspection===null,'interrupt without observation'));
  command('start-repair',pump,{type:'start',actionId:'patch'},out=>expect(out.pending?.actionId==='patch','start repair'));
  command('advance-repair',patching,{type:'advance',minutes:5},out=>expect(out.pending!==null&&out.person.skills.repair>pump.person.skills.repair,'partial practice'));
  command('interrupt-repair',working,{type:'interrupt',reason:'Benchmark interruption'},out=>expect(out.lastEvent.status==='interrupted'&&out.objects.pump.status==='broken','partial repair'));
  command('finish-successful-repair',patching,{type:'finish'},out=>expect(out.lastEvent.status==='completed'&&out.objects.pump.status==='repaired','seed 1 successful patch'));
  command('finish-failed-repair',start(atPump(2),'patch'),{type:'finish'},out=>expect(out.lastEvent.status==='failed'&&out.objects.pump.status==='broken','seed 2 failed patch'));
  command('start-blocked-repair',blocked,{type:'start',actionId:'patch'},out=>expect(out.pending.durationMinutes===2,'blocked interval'));
  command('finish-blocked-repair',start(blocked,'patch'),{type:'finish'},out=>expect(out.lastEvent.status==='blocked'&&out.clock===blocked.clock+2,'blocked idle cost'));
  command('finish-meal',start(initial,'eat'),{type:'finish'},out=>expect(out.objects.rations.count===1,'one meal receipt'));
  command('finish-rest',start(pump,'rest'),{type:'finish'},out=>expect(out.person.body.fatigue<pump.person.body.fatigue,'recovery'));
  command('finish-victory',start(act(pump,'patch'),'test-pump'),{type:'finish'},out=>expect(out.status==='won','victory'));
  command('deadline-interruption',deadline,{type:'finish'},out=>expect(out.status==='lost'&&out.objects.pump.inspection===null,'deadline interruption'));
  command('near-complete-advance',start(initial,'take-wrench'),{type:'advance',minutes:6-5e-10},out=>expect(out.pending!==null&&out.objects.wrench.location==='storage','fraction remains pending'));
  rows.push({label:'export-pending-save',kind:'save',run:()=>host.exportGame(working),check:out=>expect(out.pending!==null,'export pending')});
  rows.push({label:'import-pending-save',kind:'save',run:()=>host.importGame(save),check:out=>expect(out.person.pending.elapsedMinutes===5,'restore partial elapsed')});
  rows.push({label:'json-pending-roundtrip',kind:'save',run:()=>host.importGame(JSON.parse(JSON.stringify(host.exportGame(working)))),check:out=>expect(out.person.pending.elapsedMinutes===5,'serialized partial elapsed')});
  rows.push({label:'view-and-policy',kind:'projection',run:()=>host.chooseAction(host.getGameView(pump),'task-aware'),check:out=>expect(typeof out==='string','view-only controller')});
  for(const fixture of rows)fixture.check(fixture.run());
  return rows;
}

function statistics(values) {
  const sorted=[...values].sort((a,b)=>a-b),at=p=>sorted[Math.ceil(sorted.length*p)-1];
  const histogram={};
  for(const value of values){const bin=value.toFixed(6);histogram[bin]=(histogram[bin]??0)+1;}
  return {count:values.length,minMs:sorted[0],medianMs:at(0.5),p95Ms:at(0.95),p99Ms:at(0.99),maxMs:sorted.at(-1),
    meanMs:values.reduce((sum,value)=>sum+value,0)/values.length,zeroSamples:values.filter(value=>value===0).length,histogramMs:histogram};
}

export async function measure({warmupPerFixture=200,samplesPerFixture=1000}={}) {
  const rows=fixtures();
  const highEntropy=navigator.userAgentData?await navigator.userAgentData.getHighEntropyValues(['architecture','bitness','platformVersion','fullVersionList']):null;
  let previous=performance.now(),timerQuantum=null;
  for(let i=0;i<100000;i++){const now=performance.now(),difference=now-previous;if(difference>0)timerQuantum=timerQuantum===null?difference:Math.min(timerQuantum,difference);previous=now;}
  for(let n=0;n<warmupPerFixture;n++)for(const row of rows)row.run();
  const timings=rows.map(()=>[]),commands=[];
  // Only the synchronous public operation is between these two clock reads.
  // Fixture selection, validation, data recording, rendering and I/O are outside.
  for(let n=0;n<samplesPerFixture;n++)for(let i=0;i<rows.length;i++) {
    const row=rows[i],begin=performance.now();
    const output=row.run();
    const elapsed=performance.now()-begin;
    timings[i].push(elapsed);if(row.kind==='command')commands.push(elapsed);
    if(n===samplesPerFixture-1)row.check(output);
  }
  const results=rows.map(({label,kind,seed,command,clock,pendingAction},i)=>({label,kind,seed,command,clock,pendingAction,...statistics(timings[i])}));
  const commandStatistics=statistics(commands);
  return {viewport:{width:innerWidth,height:innerHeight,devicePixelRatio},browser:{userAgent:navigator.userAgent,platform:navigator.platform,
    hardwareConcurrency:navigator.hardwareConcurrency,userAgentData:highEntropy,crossOriginIsolated},timerMinimumPositiveStepMs:timerQuantum,
    warmupPerFixture,samplesPerFixture,fixtureChecksPassed:true,fixtures:results,commands:commandStatistics,
    budget:{p95LimitMs:16,aggregatePass:commandStatistics.p95Ms<16,allCommandFixturesPass:results.filter(row=>row.kind==='command').every(row=>row.p95Ms<16)}};
}
