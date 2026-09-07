import {writeFileSync} from 'node:fs';
import {getScenario} from '../src/scenarios/index.js';
import {runSimulation,exportReplay} from '../src/core/index.js';
import {summarizeRun} from '../src/experiments.js';

const usage='Usage: npm run simulate -- <courier|workshop|commons|solo> [--seed N] [--policy full|baseline] [--json [FILE|-]]';
try {
  const args=process.argv.slice(2);
  if(args.includes('--help')) {console.log(usage);process.exit(0);}
  let id='courier',seed=1,policy='full',json=null;
  if(args[0]&&!args[0].startsWith('--'))id=args.shift();
  const seen=new Set();
  while(args.length) {
    const flag=args.shift();
    if(seen.has(flag))throw new Error(`Duplicate option: ${flag}`);
    seen.add(flag);
    if(flag==='--seed') {
      const value=args.shift();
      if(!/^\d+$/.test(value??''))throw new Error('seed must be an integer');
      seed=Number(value);
    } else if(flag==='--policy')policy=args.shift();
    else if(flag==='--json')json=args[0]&&!args[0].startsWith('--')?args.shift():'-';
    else throw new Error(`Unknown option: ${flag}`);
  }
  if(!['full','baseline'].includes(policy))throw new Error('Unknown policy: use full or baseline');
  const state=runSimulation(getScenario(id),{seed,policy});
  if(json!==null) {
    const output=JSON.stringify(exportReplay(state),null,2)+'\n';
    if(json==='-')process.stdout.write(output);
    else writeFileSync(json,output);
  }
  if(json!=='-') {
    const m=summarizeRun(state);
    console.log(`${state.scenario.title}: ${state.status} — ${m.objectiveProgress.toFixed(1)}/${state.scenario.target} ${state.scenario.resourceLabel}, ${m.rounds} rounds (${m.simulatedMinutes} simulated minutes).`);
    console.log(`Seed ${seed}; ${policy}; mean final fatigue ${(m.fatigue*100).toFixed(0)}%; promises attempted on time ${m.promisesKept}; inspections ${m.observations}; decisions ${m.decisions}.`);
    if(json)console.log(`Replay written to ${json}`);
    console.log('Toy model output; numerical settings are uncalibrated.');
  }
} catch(error) {
  console.error(`${error.message}\n${usage}`);
  process.exitCode=1;
}
