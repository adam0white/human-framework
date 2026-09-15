import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runSustainedComparisons} from '../examples/sustained-person/comparison.js';

const report=runSustainedComparisons();
if(process.argv[2]){
  const directory=resolve(process.argv[2]);
  await mkdir(directory,{recursive:true});
  await writeFile(resolve(directory,'comparison.json'),`${JSON.stringify(report,null,2)}\n`);
}
for(const entry of report.cases){
  const changed=entry.differences.map(item=>`${item.metric}: ${item.reference} -> ${item.variation}`).join(', ')||'selected projections match';
  const matched=entry.parity.filter(item=>item.matches).map(item=>item.metric).join(', ');
  console.log(`${entry.name}: ${changed}; parity: ${matched}`);
}
console.log(`14-day deterministic host; comparison ${report.execution.durationMilliseconds} ms; state ${report.execution.stateBytes} bytes.`);
console.log('Scope: authored condition, retained-access, resource, commitment, and communication interventions; no empirical calibration or model-superiority claim.');
