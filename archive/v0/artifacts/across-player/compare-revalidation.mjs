// Compare retained evaluations after an explicitly versioned receiver defect fix.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {hash} from './compare.mjs';
const read=path=>JSON.parse(gunzipSync(readFileSync(path)));
const [initialPath,reviewedPath,outputPath]=process.argv.slice(2);
assert.ok(initialPath&&reviewedPath&&outputPath,'Provide initial and reviewed evidence plus a fresh output path.');
const initial=read(initialPath),reviewed=read(reviewedPath);
assert.equal(initial.inputsSha256,reviewed.inputsSha256);
assert.equal(initial.receiverVersion,'0.1.0');assert.equal(reviewed.receiverVersion,'0.1.1');
assert.equal(initial.hostVersion,reviewed.hostVersion);assert.equal(initial.playerVersion,reviewed.playerVersion);
for(const path of ['artifacts/across-player/inputs.json','artifacts/across-player/policies.mjs','artifacts/across-player/compare.mjs','tests/across-player-comparison.test.js'])assert.deepEqual(initial.provenance.freeze.files[path],reviewed.provenance.freeze.files[path],`${path} must not be retuned.`);
assert.deepEqual(initial.records.map(record=>record.id),reviewed.records.map(record=>record.id));
function normalize(record){
 const copy=structuredClone(record);
 if(copy.kind==='policy'){
  for(const event of copy.events)for(const state of [event.inputs.receiver.state,event.decisions.receiver.state])if(Object.hasOwn(state,'version'))state.version='<receiver-version>';
  if(Object.hasOwn(copy.finalPolicyStates.receiver,'version'))copy.finalPolicyStates.receiver.version='<receiver-version>';
 }else{
  for(const key of ['initialSave','receiptSave','finalSave']){copy[key].receiverVersion='<receiver-version>';copy[`${key}Sha256`]=hash(copy[key]);}
  // These are hashes of the versioned player save recipe at each control.
  // Complete original/current recipes are separately reproduced by source replay.
  for(const event of copy.events)event.saveSha256='<versioned-player-save-hash>';
 }
 return copy;
}
const pairs=initial.records.map((before,index)=>{
 const after=reviewed.records[index];assert.deepEqual(after.metrics,before.metrics,`${before.id}: physical cost/outcome changed.`);
 assert.deepEqual(normalize(after),normalize(before),`${before.id}: non-version decision/view/control difference.`);
 return {id:before.id,physicalMetricsEqual:true,normalizedRecordEqual:true,rawRecordEqual:hash(before)===hash(after),finalSaveEqual:before.finalSaveSha256===after.finalSaveSha256,initialFinalSaveSha256:before.finalSaveSha256,reviewedFinalSaveSha256:after.finalSaveSha256};
});
const result={format:'across-player-source-revalidation',version:1,scope:'The same 52 authored cases after the receiver 0.1.1 meal-lifecycle defect fix; not new outcome samples or policy tuning.',initialSource:initial.provenance.freeze.sourceCommit,reviewedSource:reviewed.provenance.freeze.sourceCommit,initialInputSha256:hash(readFileSync(initialPath)),reviewedInputSha256:hash(readFileSync(reviewedPath)),scriptSha256:hash(readFileSync(fileURLToPath(import.meta.url))),node:process.version,
 normalizedDifferences:['Receiver policy-state version in actor decision inputs, decisions and final policy state.','Player recipe receiverVersion and resulting initial/receipt/final/transition save hashes.'],pairs,
 totals:{records:pairs.length,physicalMetricsEqual:pairs.filter(pair=>pair.physicalMetricsEqual).length,normalizedRecordEqual:pairs.filter(pair=>pair.normalizedRecordEqual).length,rawRecordEqual:pairs.filter(pair=>pair.rawRecordEqual).length,finalSaveEqual:pairs.filter(pair=>pair.finalSaveEqual).length}};
mkdirSync(dirname(outputPath),{recursive:true});writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify(result.totals)+'\n');
