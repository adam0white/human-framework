// Only final array-validation and replay-failure deltas; no matrix or real arms.
import {assertJson,canonical} from '/Users/abdul/code/human-framework/scripts/work-progress-comparison.js';import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const source=fs.readFileSync('/Users/abdul/code/human-framework/scripts/work-progress-comparison.js','utf8');
const sparse=Array(1);sparse.extra=7;assert.throws(()=>assertJson(sparse),/Missing JSON array index/);assert.doesNotThrow(()=>assertJson([7]));assert.equal(canonical([7]),JSON.stringify([7]));
const begin=source.indexOf('export async function replayMatrix(record){');const end=source.indexOf('\nfunction option(',begin);assert.ok(begin>=0&&end>begin);const body=source.slice(begin,end).replace(/^export /,'');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const replay=new AsyncFunction('record','verifyFreeze','runMatrix','canonical','assert','process',body+'; return await replayMatrix(record);');
const record={format:'paid-work-camp-comparison',freeze:{testOnly:true},runs:[{testOnly:'expected'}]};const current={runs:[{testOnly:'different-current'}]};let caught;
try{await replay(record,async()=>{},async()=>current,canonical,assert,{version:'isolated-delta-test'});}catch(error){caught=error;}
assert.equal(caught.evidence.phase,'replay-comparison');assert.equal(caught.evidence.expected,record.runs);assert.equal(caught.evidence.current,current.runs);assert.equal(caught.evidence.freeze,record.freeze);assert.doesNotThrow(()=>JSON.stringify(caught.evidence));
const result={sourceCommit:'4d13e88',sourceHash:createHash('sha256').update(source).digest('hex'),scope:'Two final deltas only; actual replay function source tested with verification/run doubles, not a real matrix',sparseExtraArrayRejected:true,denseArrayFaithful:true,replayMismatchPreservesExpectedAndCurrent:true,replayEvidenceSerializable:true};fs.writeFileSync('/tmp/work-progress-runner-final-delta.json',JSON.stringify(result,null,2));console.log(result);
