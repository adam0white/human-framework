import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {compareExperiencedSequences,runRememberedRoute,runAttendedRoute} from '../examples/experienced-person/sequence.js';
const output=resolve(process.argv[2]??'artifacts/experienced-person');
await mkdir(output,{recursive:true});
const comparisons=compareExperiencedSequences().map(({id,candidate,direct,restored})=>{
 const project=({state,...rest})=>rest;
 return {id,candidate:project(candidate),direct:project(direct),directParity:JSON.stringify(candidate)===JSON.stringify(direct),restoreParity:JSON.stringify(candidate)===JSON.stringify(restored)};
});
if(comparisons.some(c=>!c.directParity||!c.restoreParity))throw Error('Comparison mismatch');
await writeFile(resolve(output,'comparison.json'),JSON.stringify({scope:'Eleven authored interventions with equally informed direct controllers sharing candidate execution state; no empirical or authoring advantage claim.',runs:comparisons.length*3,comparisons},null,2)+'\n');
await writeFile(resolve(output,'sequence.json'),JSON.stringify({remembered:runRememberedRoute(),attended:runAttendedRoute(),corrected:runAttendedRoute({closure:true})},null,2)+'\n');
console.log(JSON.stringify({cases:comparisons.length,runs:comparisons.length*3,directParity:true,restoreParity:true}));
