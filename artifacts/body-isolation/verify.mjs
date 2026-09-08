// Post-freeze evidence audit. Does not modify the frozen experiment or retained reports.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runSchedule as oldSchedule,runRetest as oldRetest} from '../../src/experiments/mechanism-comparison/experiment.js';
import {writeNew} from '../../scripts/body-isolation.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const hash=x=>createHash('sha256').update(x).digest('hex');
const protocol=await read('artifacts/body-isolation/protocol.json'),freeze=await read('artifacts/body-isolation/freeze.json');
for(const [path,expected] of Object.entries(freeze.sourceSha256)) {
  assert.equal(hash(await readFile(resolve(root,path))),expected);
  assert.equal(hash(execFileSync('git',['show',`${freeze.sourceCommit}:${path}`],{cwd:root})),expected);
}
let pairs=0,offeredModelCommands=0,retestBranches=0,matchedExposureChecks=0,maxMatchedExposureSkillError=0,maxCumulativePracticeError=0,maxForecastLogitResidual=0,maxOutputDecompositionResidual=0;
const retainedHashes={},comparisons=[];
function auditRun(run) {
  let minutes=0,parts=0,food=0,output=0,practice={a:0,b:0};
  for(const step of run.trace) {
    offeredModelCommands++;minutes+=step.command.durationMinutes;
    assert.equal(step.end.minutes,minutes);
    if(step.status==='work'){parts++;output+=step.forecast*protocol.task.output;practice[step.command.kind]+=step.command.durationMinutes;}
    if(step.status==='meal')food++;
    assert.equal(step.end.stats.partsConsumed,parts);assert.equal(step.end.stats.foodConsumed,food);assert.equal(step.end.stats.output,output);
    assert.deepEqual(step.end.stats.practiceMinutes,practice);assert.equal(step.end.parts,run.initialInput.parts-parts);assert.equal(step.end.food,run.initialInput.food-food);
    assert.ok(Math.abs(Object.entries(step.end.stats).filter(([k])=>k.endsWith('Minutes')&&k!=='practiceMinutes').reduce((n,[,v])=>n+v,0)-minutes)<1e-8);
  }
}
function auditPair(id,pair,h,p) {
  pairs++;assert.deepEqual(h.initialInput,p.initialInput);assert.deepEqual(h.offered,p.offered);assert.equal(h.final.minutes,p.final.minutes);
  auditRun(h);auditRun(p);
  const d=pair.diagnostics;matchedExposureChecks+=d.matchedExposureChecks;
  maxMatchedExposureSkillError=Math.max(maxMatchedExposureSkillError,d.maxMatchedExposureSkillError);
  maxCumulativePracticeError=Math.max(maxCumulativePracticeError,d.maxCumulativePracticeError);
  maxForecastLogitResidual=Math.max(maxForecastLogitResidual,d.maxForecastLogitResidual);
  maxOutputDecompositionResidual=Math.max(maxOutputDecompositionResidual,Math.abs(d.jointOutputGap+d.pooledOnlyOutput-d.humanOnlyOutput-pair.outputDifference));
  comparisons.push({id,equivalent:pair.equivalent,outputDifference:pair.outputDifference,jointOutputGap:d.jointOutputGap,pooledOnlyOutput:d.pooledOnlyOutput,humanOnlyOutput:d.humanOnlyOutput,boundaryEndpointCounts:d.boundaryEndpointCounts});
}
function auditConditions(conditions,label) {
  for(const c of conditions) {
    const condition=[...protocol.development,...protocol.reserved].find(v=>v.id===c.id);
    const oldProtocol={...protocol,rival:{...protocol.rival,learningPerMinute:.0052}};
    if(c.kind==='schedule') {
      auditPair(`${label}/${c.id}`,c.comparison,c.human,c.pooled);
      const baseline=oldSchedule(condition,oldProtocol).human;assert.deepEqual(c.human.trace,baseline.trace);assert.deepEqual(c.human.final,baseline.final);
    } else {
      const baseline=oldRetest(condition,oldProtocol);
      for(const [arm,v] of Object.entries(c.arms)) {
        auditPair(`${label}/${c.id}/${arm}`,v.comparison,v.human.exposure,v.pooled.exposure);
        assert.deepEqual(v.human.endpoint,baseline.arms[arm].human.endpoint);assert.deepEqual(v.human.retests,baseline.arms[arm].human.retests);
        for(const model of ['human','pooled']) {
          const endpoint=v[model].endpoint;
          assert.equal(endpoint.minutes,protocol.retest.exposureIntervals*protocol.retest.exposureMinutes+protocol.retest.restMinutes+protocol.retest.mealMinutes);
          assert.equal(endpoint.stats.restMinutes,40);assert.equal(endpoint.stats.foodConsumed,1);
          for(const [skill,r] of Object.entries(v[model].retests)) {
            retestBranches++;assert.equal(r.final.minutes,endpoint.minutes+10);
            assert.equal(r.final.stats.partsConsumed,endpoint.stats.partsConsumed+(r.status==='work'?1:0));
            for(const k of ['a','b']) {
              assert.equal(r.final.stats.practiceMinutes[k],endpoint.stats.practiceMinutes[k]+(r.status==='work'&&k===skill?10:0));
              const expected=condition.skills[k]+(1-condition.skills[k])*(1-Math.exp(-.0052*r.final.stats.practiceMinutes[k]));
              maxCumulativePracticeError=Math.max(maxCumulativePracticeError,Math.abs(expected-r.final.view.skills[k]));
            }
          }
        }
      }
      for(const model of ['human','pooled'])assert.deepEqual(c.arms.a[model].endpoint.view.body,c.arms.b[model].endpoint.view.body);
    }
  }
}
for(const name of ['development','reserved','sensitivity','state']) {
  const report=await read(`artifacts/body-isolation/${name}.json`);assert.equal(hash(JSON.stringify(report.result)),report.provenance.resultSha256);
  retainedHashes[name]=report.provenance.resultSha256;
  if(name==='state'){for(const m of Object.values(report.result.models))assert.ok(m.withinBudget);}
  else if(name==='sensitivity')for(const v of report.result)auditConditions(v.conditions,v.tuning.id);
  else auditConditions(report.result,name);
  if(process.argv[3]) {
    const reproduced=JSON.parse(await readFile(resolve(process.argv[3],`${name}.json`),'utf8'));
    assert.deepEqual(reproduced.result,report.result);assert.equal(reproduced.provenance.resultSha256,retainedHashes[name]);
  }
}
for(const value of [maxMatchedExposureSkillError,maxCumulativePracticeError,maxForecastLogitResidual,maxOutputDecompositionResidual])assert.ok(value<1e-12);
const sizes={};
async function measure(path,range) {
  const text=(await readFile(resolve(root,path),'utf8')).split('\n').slice(range[0]-1,range[1]).join('\n')+'\n';
  return {path,lineRange:range,utf8Bytes:Buffer.byteLength(text),nonblankLines:text.split('\n').filter(x=>x.trim()).length,sha256:hash(text)};
}
// Inspectable measurement scopes selected after results; neither gameplay nor thresholds use them.
sizes.pooledValidation=await measure('src/experiments/body-isolation/pooled-model.js',[4,12]);
sizes.pooledStateValidation=await measure('src/experiments/body-isolation/pooled-model.js',[25,44]);
sizes.hostValidation=await measure('src/experiments/body-isolation/host.js',[4,40]);
sizes.practiceDependency=await measure('src/core/model.js',[108,111]);
sizes.humanValidation=[];for(const range of [[8,42],[56,103]])sizes.humanValidation.push(await measure('src/human/v0.1.1.js',range));
sizes.humanUsedModelDeclarations=[];for(const range of [[4,9],[11,11],[22,31],[45,47],[108,111],[116,120]])sizes.humanUsedModelDeclarations.push(await measure('src/core/model.js',range));
sizes.pooledUsedModelDeclarations=[];for(const range of [[4,8],[45,47],[108,111]])sizes.pooledUsedModelDeclarations.push(await measure('src/core/model.js',range));
sizes.sharedReusedFunctions=[];for(const range of [[64,65],[76,90]])sizes.sharedReusedFunctions.push(await measure('src/experiments/mechanism-comparison/experiment.js',range));
const result={registrationCommit:freeze.registrationFullCommit,implementationCommit:freeze.sourceCommit,sourceHashesVerified:Object.keys(freeze.sourceSha256).length,
  retainedHashes,reproduced:Boolean(process.argv[3]),pairs,offeredModelCommands,retestBranches,matchedExposureChecks,maxMatchedExposureSkillError,maxCumulativePracticeError,maxForecastLogitResidual,maxOutputDecompositionResidual,
  frozenHumanAllTrajectoriesEqual:true,commonInputTimeResourceAccounting:true,paidRetestAndTaskSpecificity:true,sizes,comparisons,
  limitations:'This post-freeze audit checks retained artifact arithmetic, reproducibility and frozen Human equivalence. It is not a blind study, authenticated import audit, human validation, authoring-effort measure or independent reviewer verdict.'};
if(!process.argv[2])throw new Error('Provide fresh output path and optional reproduced-result directory');
await writeNew(resolve(process.argv[2]),result);process.stdout.write(JSON.stringify({...result,comparisons:undefined,sizes:undefined},null,2)+'\n');
