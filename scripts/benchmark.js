import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {compareModels} from '../src/experiments.js';

const usage='Usage: npm run benchmark -- [--seeds N] [--start-seed N] [--json FILE]';
try {
  const args=process.argv.slice(2);
  if(args.includes('--help')) {console.log(usage);process.exit(0);}
  let seeds=100,startSeed=101,file='artifacts/benchmark.json';
  const seen=new Set();
  while(args.length) {
    const flag=args.shift();
    if(seen.has(flag))throw new Error(`Duplicate option: ${flag}`);
    seen.add(flag);
    if(['--seeds','--start-seed'].includes(flag)) {
      const raw=args.shift();
      if(!/^\d+$/.test(raw??''))throw new Error(`${flag} must be an integer`);
      if(flag==='--seeds')seeds=Number(raw);else startSeed=Number(raw);
    } else if(flag==='--json') {
      file=args.shift();
      if(!file||file.startsWith('--'))throw new Error('--json requires a file path');
    } else throw new Error(`Unknown option: ${flag}`);
  }
  const result=compareModels({seeds,startSeed});
  result.generatedAt=new Date().toISOString();
  result.environment={node:process.version,platform:process.platform,arch:process.arch};
  result.sourceSha256=Object.fromEntries(['src/core/model.js','src/core/observation.js','src/core/policy.js','src/core/random.js','src/core/simulation.js','src/scenarios/index.js','src/experiments.js','scripts/benchmark.js'].map(path=>[path,createHash('sha256').update(readFileSync(new URL(`../${path}`,import.meta.url))).digest('hex')]));
  const path=resolve(file);mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,JSON.stringify(result,null,2)+'\n');
  for(const scenario of result.results) {
    const full=scenario.variants.find(v=>v.id==='full'),baseline=scenario.variants.find(v=>v.id==='baseline');
    const delta=scenario.comparisons.find(c=>c.against==='baseline').metrics.objectiveProgress;
    console.log(`${scenario.title}: full ${full.means.objectiveProgress.toFixed(2)}, baseline ${baseline.means.objectiveProgress.toFixed(2)}, paired progress difference ${delta.mean.toFixed(2)}; null equality ${scenario.nullControl.equalPairs}/${seeds}.`);
  }
  console.log(`Saved ${path}; ${seeds} paired seeds, ${(result.elapsedMs/1000).toFixed(2)} seconds. Intervals describe Monte Carlo variability in a toy model, not human validity.`);
} catch(error) {
  console.error(`${error.message}\n${usage}`);
  process.exitCode=1;
}
