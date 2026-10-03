import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='/Users/abdul/code/human-framework/.worktrees/rest-work';
const load=p=>JSON.parse(readFileSync(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const dirs=[root+'/artifacts/continuous-work/b7c3dd0-node26',root+'/artifacts/continuous-work/b7c3dd0-node22','/tmp/hf-continuous-work-review-lifecycle/probe-artifacts-node26','/tmp/hf-continuous-work-review-lifecycle/probe-artifacts-node22'];
const detail=[];
for(const dir of dirs){const m=load(dir+'/manifest.json');let count=0;for(const [file,hash] of Object.entries(m.files)){assert.equal(sha(readFileSync(dir+'/'+file)),hash);count++;}const r=load(dir+'/report.json');assert.equal(r.sourceCommit,m.sourceCommit);for(const [file,hash] of Object.entries(r.sources)){assert.equal(sha(execFileSync('git',['show',`${r.sourceCommit}:${file}`],{cwd:root})),hash);assert.equal(sha(readFileSync(root+'/'+file)),hash);}detail.push({dir,sourceCommit:m.sourceCommit,verifiedPayloads:count,verifiedSources:Object.keys(r.sources).length});}
const normalized=dirs.map(dir=>{const r=load(dir+'/report.json');delete r.environment;delete r.sourceCommit;return r;});for(const report of normalized.slice(1))assert.deepEqual(report,normalized[0]);
const p26=load('/tmp/hf-continuous-work-review-lifecycle/results-26.8.1.json');const p22=load('/tmp/hf-continuous-work-review-lifecycle/results-22.0.0.json');assert.ok([...p26.results,...p22.results].every(r=>r.pass));for(let i=0;i<p26.results.length;i++){assert.equal(p26.results[i].name,p22.results[i].name);assert.deepEqual(p26.results[i].detail,p22.results[i].detail);}
const result={pass:true,detail,physicalReportsIdentical:true,independentProbesIdentical:true,ownProbeCount:p26.results.length};writeFileSync('/tmp/hf-continuous-work-review-lifecycle/audit-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
