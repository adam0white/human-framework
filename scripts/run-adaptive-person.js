import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {compareAdaptiveSequences,runAdaptationSequence,runOpportunitySequence} from '../examples/adaptive-person/sequence.js';
const output=resolve(process.argv[2]??'artifacts/adaptive-person');
await mkdir(output,{recursive:true});
const rows=compareAdaptiveSequences().map(({id,candidate,direct,restored})=>{
 const project=({state,...rest})=>rest;
 return {id,candidate:project(candidate),direct:project(direct),directParity:JSON.stringify(candidate)===JSON.stringify(direct),restoreParity:JSON.stringify(candidate)===JSON.stringify(restored)};
});
if(rows.some(row=>!row.directParity||!row.restoreParity))throw new Error('Comparison mismatch');
await writeFile(resolve(output,'comparison.json'),JSON.stringify({scope:'Thirteen authored cases with equally informed direct policies and JSON continuation. No empirical or authoring advantage claimed.',runs:rows.length*3,comparisons:rows},null,2)+'\n');
await writeFile(resolve(output,'sequence.json'),JSON.stringify({adaptation:runAdaptationSequence(),opportunity:runOpportunitySequence()},null,2)+'\n');
process.stdout.write(JSON.stringify({output,cases:rows.length,runs:rows.length*3,directParity:true,restoreParity:true})+'\n');
