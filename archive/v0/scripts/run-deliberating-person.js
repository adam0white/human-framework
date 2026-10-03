import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runDeliberatingComparisons} from '../examples/deliberating-person/comparison.js';

const report=runDeliberatingComparisons();
if(process.argv[2]) {
  const directory=resolve(process.argv[2]);await mkdir(directory,{recursive:true});
  await writeFile(resolve(directory,'comparison.json'),`${JSON.stringify(report,null,2)}\n`);
}
for(const entry of report.cases)console.log(`${entry.name}: ${Object.entries(entry.results).map(([policy,value])=>`${policy}=${value.firstAction} (${value.deliveryStatus})`).join('; ')}`);
console.log(`Bounded headless comparison ${report.execution.durationMilliseconds} ms; state ${report.execution.stateBytes} bytes.`);
console.log('Scope: authored deterministic interventions; no empirical calibration or model-superiority claim.');
