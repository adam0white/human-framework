import {performance} from 'node:perf_hooks';
import {cpus,arch,platform,release,totalmem} from 'node:os';
import {createWatch,requestTask,advanceTo,exportWatch} from './host.js';

// Declared before measurements: each workload gets 1,000 samples after 100
// warmups; desktop p95 budget is 8 ms. Pack/install/render are outside timing.
const SAMPLES=1000,WARMUPS=100,BUDGET_MS=8;
const idle=createWatch(),repair=requestTask(idle,'keeper','repair'),paired=requestTask(repair,'watcher','watch');
const afterWatch=advanceTo(paired,8),afterRepair=advanceTo(paired,12);
const events=[()=>advanceTo(paired,8),()=>advanceTo(afterWatch,12),()=>advanceTo(afterRepair,18)];
const requests=[()=>requestTask(idle,'keeper','repair'),()=>requestTask(repair,'watcher','watch'),
  ()=>requestTask(paired,'keeper','watch'),()=>requestTask(idle,'watcher','repair')];
let maxStateCharacters=0,maxStateBytes=0;
function measure(cases) {
  for(let i=0;i<WARMUPS;i++)cases[i%cases.length]();
  const samples=[];
  for(let i=0;i<SAMPLES;i++){
    const started=performance.now(),state=cases[i%cases.length](),elapsed=performance.now()-started;
    samples.push(elapsed);
    const serialized=JSON.stringify(exportWatch(state));
    maxStateCharacters=Math.max(maxStateCharacters,serialized.length);
    maxStateBytes=Math.max(maxStateBytes,Buffer.byteLength(serialized,'utf8'));
  }
  samples.sort((a,b)=>a-b);
  return {samples:SAMPLES,warmups:WARMUPS,p50Ms:samples[Math.ceil(SAMPLES*.5)-1],p95Ms:samples[Math.ceil(SAMPLES*.95)-1],
    maxMs:samples.at(-1),p95BudgetMs:BUDGET_MS,budgetPassed:samples[Math.ceil(SAMPLES*.95)-1]<=BUDGET_MS};
}
const eventBoundaries=measure(events),requestCommands=measure(requests);
const long=advanceTo(advanceTo(paired,18),100000),longSerialized=JSON.stringify(exportWatch(long));
const longStateCharacters=longSerialized.length,longStateBytes=Buffer.byteLength(longSerialized,'utf8');
maxStateCharacters=Math.max(maxStateCharacters,longStateCharacters);
maxStateBytes=Math.max(maxStateBytes,longStateBytes);
process.stdout.write(JSON.stringify({
  environment:{node:process.version,executable:process.execPath,platform:platform(),release:release(),architecture:arch(),cpu:cpus()[0]?.model??'unavailable',logicalCpus:cpus().length,memoryBytes:totalmem()},
  scope:'Local installed consumer only; excludes pack/install/render; no physical-mobile measurement.',
  workload:{people:2,eventCases:['lookout due at minute 8 during repair','repair due at minute 12','water arrival at minute 18'],
    commandCases:['accept repair','accept concurrent lookout','refuse busy recipient','refuse role-mismatched repair']},
  eventBoundaries,requestCommands,maxSerializedStateCharacters:maxStateCharacters,maxSerializedStateBytes:maxStateBytes,
  longSession:{worldMinute:100000,serializedStateCharacters:longStateCharacters,serializedStateBytes:longStateBytes,pendingEvents:long.clock.queue.length,recentMessages:long.recent.length},
  budgetPassed:eventBoundaries.budgetPassed&&requestCommands.budgetPassed
},null,2)+'\n');
