import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runAppraisalSequence} from '../examples/developing-person/appraisal.js';
import {runDevelopingSequence,compareDevelopingSequences} from '../examples/developing-person/sequence.js';
const output=resolve(process.argv[2]??'artifacts/developing-person');
await mkdir(output,{recursive:true});
const sequence=runDevelopingSequence();
const comparisons=compareDevelopingSequences().map(({id,candidate,direct})=>{
 const project=result=>({returned:result.repair.returned,stance:result.relationship.after,response:result.relationship.response,aid:result.care.aid,adultActions:result.adult.actions,actualActivityMinutes:result.actualActivityMinutes,world:result.world});
 return {id,candidate:project(candidate),direct:project(direct),equal:JSON.stringify(candidate)===JSON.stringify(direct)};
});
await writeFile(resolve(output,'sequence.json'),JSON.stringify(sequence,null,2)+'\n');
await writeFile(resolve(output,'comparison.json'),JSON.stringify({scope:'Nine authored interventions, two equally informed policies; no measured authoring or empirical claim',runs:comparisons.length*2,comparisons},null,2)+'\n');
const appraisalCases=[{}, {conflict:false}, {regulate:false}, {purposeActive:false}, {expire:true,regulate:false}, {regulate:false,override:'direct-route'}];
const appraisalComparisons=appraisalCases.map(options=>{const candidate=runAppraisalSequence(options),direct=runAppraisalSequence({...options,policy:'direct'});return {options,actions:candidate.actions,actualMinutes:candidate.actualMinutes,delivered:candidate.delivered,before:candidate.before,after:candidate.after,beliefStatus:candidate.beliefAfterReflection,equal:JSON.stringify(candidate)===JSON.stringify(direct)};});
await writeFile(resolve(output,'appraisal.json'),JSON.stringify({sequence:runAppraisalSequence(),runs:appraisalCases.length*2,comparisons:appraisalComparisons},null,2)+'\n');
process.stdout.write(JSON.stringify({output,runs:comparisons.length*2,appraisalRuns:appraisalCases.length*2,appraisalParity:appraisalComparisons.every(row=>row.equal),directParity:comparisons.every(row=>row.equal),actualActivityMinutes:sequence.actualActivityMinutes})+'\n');
