import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runComparisons} from '../examples/connected-person/sequence.js';
const report=runComparisons();
if(process.argv[2]){
 const directory=resolve(process.argv[2]);await mkdir(directory,{recursive:true});
 await writeFile(resolve(directory,'comparison.json'),JSON.stringify(report,null,2)+'\n');
}
for(const entry of report.cases){
 console.log(`${entry.name}: ${entry.actions.join(' → ')}; produced=${entry.world.produced}, delivered=${entry.world.delivered}, confirmations=${entry.world.confirmations}; direct baseline matches=${entry.directBaselineMatches}`);
}
console.log('Scope: persistent knowledge, purposes and interaction evidence across dated episodes; authored decision rules, no claim of calibrated psychology or continuous physiology.');
if(report.cases.some(c=>!c.directBaselineMatches))process.exitCode=1;
