import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {runProfileEvidence,writeProfileEvidence} from '../scripts/signals-profile-evidence.js';

test('new-profile evidence preserves route successes, refusals, wasted recovery and complete resume',()=>{
 const result=runProfileEvidence(),run=id=>result.runs.find(r=>r.id===id);assert.equal(result.runs.length,10);assert.ok(result.runs.every(r=>r.resumeEqual));assert.equal(run('clear-report').outcome.at,9);assert.equal(run('clear-blind').outcome.at,6);assert.equal(run('tired-rest-ridge').outcome.at,18);assert.equal(run('tired-immediate-ridge').outcome.delivered,false);assert.equal(run('hungry-rest-only').outcome.delivered,false);assert.equal(run('hungry-meal-canal').outcome.launchSailed,true);assert.equal(run('hungry-interrupted-meal').outcome.at,15);assert.equal(run('hungry-interrupted-meal').outcome.launchSailed,false);assert.equal(run('hungry-interrupted-meal').paid.meal,5);
});
test('new evidence verifies original comparison and committed amendment and refuses overwrite',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'signals-profiles-'));try{const out=join(dir,'new.json');await writeProfileEvidence(out);const r=JSON.parse(await readFile(out,'utf8'));assert.equal(r.originalComparisonUnchanged,true);assert.equal(r.amendment.verified,true);assert.match(r.originalArtifactSha256,/^[a-f0-9]{64}$/);await assert.rejects(writeProfileEvidence(out),e=>e.code==='EEXIST');await assert.rejects(writeProfileEvidence());}finally{await rm(dir,{recursive:true,force:true});}
});
