import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {HUMAN_VERSION,createPerson,beginAttempt,advanceAttempt,finishAttempt,estimateSuccess} from '../src/human/index.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceFiles=['scripts/learning-probe.js','src/human/index.js','src/core/model.js'];
const identity=()=>Object.fromEntries(sourceFiles.map(p=>[p,digest(readFileSync(resolve(root,p)))]));
const sourceSha256=identity();
const initial={id:'worker',body:{fatigue:.22,hunger:.15},skills:{repair:.55}};
const action={durationMinutes:35,effort:.19,exertive:true,activity:'active'};
const rest={durationMinutes:15,activity:'rest'};
const quantiles=Array.from({length:1000},(_,i)=>{
  const seed=i+1,bytes=createHash('sha256').update(`learning-probe-retest-v1:${seed}`).digest();
  return {seed,u:bytes.readUInt32BE(0)/4294967296};
});

function complete(person,input,status) {
  const begun=beginAttempt(person,input),advanced=advanceAttempt(begun,input.durationMinutes);
  return finishAttempt(advanced,{attemptId:advanced.pending.id,status});
}

const rows=[];
for(const learning of [true,false])for(const trainingOutcome of ['failed','completed']) {
  let person=createPerson(initial);
  for(let job=1;job<=3;job++) {
    person=complete(person,{...action,actionId:`practice-${job}`,targetId:`training-${job}`,skill:learning?'repair':null},trainingOutcome);
    person=complete(person,{...rest,actionId:`rest-${job}`},'completed');
  }
  const probability=estimateSuccess({skill:person.skills.repair,body:person.body,difficulty:.40});
  const successSeeds=quantiles.filter(q=>q.u<probability).map(q=>q.seed);
  rows.push({learning,trainingOutcome,minutes:person.minutes,body:person.body,skill:person.skills.repair,probability,successSeeds});
}
for(const row of rows) {
  assert.equal(row.minutes,150);
  assert.deepEqual(row.body,rows[0].body,'Training exposure and retest body must match');
}
for(const i of [0,2]) {
  assert.equal(rows[i].skill,rows[i+1].skill,'Failure label cannot award extra practice');
  assert.equal(rows[i].probability,rows[i+1].probability);
  assert.deepEqual(rows[i].successSeeds,rows[i+1].successSeeds);
}
assert.ok(rows[0].probability>rows[2].probability);
assert.ok(rows[2].successSeeds.every(seed=>rows[0].successSeeds.includes(seed)));
assert.deepEqual(sourceSha256,identity(),'Sources changed during experiment');
const artifact={format:'human-framework-matched-learning-probe',version:1,componentVersion:HUMAN_VERSION,
  generatedAt:new Date().toISOString(),environment:{node:process.version,platform:process.platform,arch:process.arch},sourceSha256,
  setup:{initial,trainingActions:3,action,rest,retest:{difficulty:.40,advancesTime:false,usesActualMatchedBody:true},quantileCount:quantiles.length},
  method:'Prescribed three full repair intervals, each followed by rest, crossed practice on/off with failure/completion labels. The frozen arm passes skill:null during training. World resolution is omitted by design. Retest has no further practice and uses independent common SHA-256 quantiles. This checks the authored component, not human learning or game enjoyment.',
  rows,quantiles,contrast:{probabilityDifference:rows[0].probability-rows[2].probability,
    improvedOutcomes:rows[0].successSeeds.filter(seed=>!rows[2].successSeeds.includes(seed)).length,worsenedOutcomes:0}};
const output=resolve(root,'artifacts/learning-probe.json');mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(artifact,null,2)+'\n');
console.log(JSON.stringify({output,probabilityDifference:artifact.contrast.probabilityDifference,
  rows:rows.map(({learning,trainingOutcome,probability,successSeeds})=>({learning,trainingOutcome,probability,successes:successSeeds.length}))},null,2));
