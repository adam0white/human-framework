// Read-only post-result accounting: never imports or executes a simulation model.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(import.meta.url),root=dirname(script);
const hash=x=>createHash('sha256').update(x).digest('hex');
const blank=()=>({zeroExposure:0,positiveAfterBothPracticed:0,positiveWithoutPracticeThisStep:0});
const total=blank(),partitions={},inputs={};let pairs=0,maximumSkillDifference=0;
async function read(name) {
  const bytes=await readFile(resolve(root,name));inputs[name]={fileSha256:hash(bytes)};return JSON.parse(bytes);
}
function pair(h,p,comparison,counts) {
  assert.equal(h.trace.length,p.trace.length);pairs++;let pairChecks=0;
  for(let i=0;i<h.trace.length;i++)for(const skill of ['a','b']) {
    const he=h.trace[i],pe=p.trace[i],ht=he.end.stats.practiceMinutes[skill],pt=pe.end.stats.practiceMinutes[skill];
    if(ht!==pt)continue;
    pairChecks++;
    const hd=ht-(i?h.trace[i-1].end.stats.practiceMinutes[skill]:0),pd=pt-(i?p.trace[i-1].end.stats.practiceMinutes[skill]:0);
    let category;
    if(ht===0)category='zeroExposure';
    else if(hd>0&&pd>0) {
      assert.equal(he.status,'work');assert.equal(pe.status,'work');assert.equal(he.command.kind,skill);assert.equal(pe.command.kind,skill);
      assert.equal(hd,he.command.durationMinutes);assert.equal(pd,pe.command.durationMinutes);
      category='positiveAfterBothPracticed';
    } else {
      // In these retained results neither arm trained the checked skill this step.
      assert.equal(hd,0);assert.equal(pd,0);category='positiveWithoutPracticeThisStep';
    }
    counts[category]++;total[category]++;
    maximumSkillDifference=Math.max(maximumSkillDifference,Math.abs(he.end.view.skills[skill]-pe.end.view.skills[skill]));
  }
  assert.equal(pairChecks,comparison.diagnostics.matchedExposureChecks);
}
function conditions(label,rows) {
  const counts=partitions[label]=blank();
  for(const c of rows)if(c.kind==='schedule')pair(c.human,c.pooled,c.comparison,counts);
  else for(const arm of Object.values(c.arms))pair(arm.human.exposure,arm.pooled.exposure,arm.comparison,counts);
}
for(const name of ['development','reserved','sensitivity']) {
  const report=await read(`${name}.json`);
  assert.equal(hash(JSON.stringify(report.result)),report.provenance.resultSha256);
  inputs[`${name}.json`].resultSha256=report.provenance.resultSha256;
  if(name==='sensitivity')for(const variant of report.result)conditions(variant.tuning.id,variant.conditions);
  else conditions(name,report.result);
}
const prior=await read('verification.json'),checks=Object.values(total).reduce((sum,n)=>sum+n,0);
assert.equal(checks,prior.matchedExposureChecks);assert.equal(pairs,prior.pairs);assert.equal(maximumSkillDifference,prior.maxMatchedExposureSkillError);
const result={date:'2026-09-08',scope:'The original 1389 matched cumulative task-exposure endpoint checks; paid retest branches were outside this particular count.',
  pairs,checks,total,partitions,maximumSkillDifference,
  definitions:{zeroExposure:'Both models have zero cumulative admitted minutes for the checked skill at this endpoint.',
    positiveAfterBothPracticed:'Equal positive cumulative exposure, and both models actually practiced the checked skill during this just-completed step.',
    positiveWithoutPracticeThisStep:'Equal positive cumulative exposure retained across a step in which neither model practiced the checked skill (other work, idle, recovery or refusal).'},
  interpretation:'These disjoint counts include repeated checkpoints, untrained skills and repeated conditions across sensitivity variants. The equality is an expected implementation identity of the same deterministic practice update at matched admitted exposure, not independent scientific discoveries or evidence from people.'};
const artifact={format:'body-isolation-exposure-check-breakdown',version:1,result,resultSha256:hash(JSON.stringify(result)),
  scriptSha256:hash(await readFile(script)),inputs};
if(!process.argv[2])throw new Error('Provide a fresh output file path');
await writeFile(resolve(process.argv[2]),JSON.stringify(artifact,null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify(artifact,null,2)+'\n');
