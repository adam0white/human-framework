import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
import * as host from '/Users/abdul/code/human-framework/src/experiments/continuous-work/host.js';
import * as oldHost from '/Users/abdul/code/human-framework/.worktrees/rest-work/src/experiments/continuous-work/host.js';
const root='/Users/abdul/code/human-framework';
const filename=root+'/src/experiments/continuous-work/host.js';
const source=readFileSync(filename,'utf8');
// Evaluate the exact committed validator body as a local white-box boundary probe.
const body=source.slice(source.indexOf('function json(value)'),source.indexOf('\nfunction fields('));
const validate=vm.runInThisContext(`(()=>{const fail=message=>{throw new Error(message)}; ${body}; return json;})()`);
let checks=0;
function accepted(value){validate(value);assert.ok(JSON.stringify(value).length<=262144);checks++;}
function oversized(value){assert.ok(JSON.stringify(value).length>262144);assert.throws(()=>validate(value),/size limit/);checks++;}
accepted('x'.repeat(262142));oversized('x'.repeat(262143));
accepted({text:'x'.repeat(262133)});oversized({text:'x'.repeat(262134)});
accepted({'q"\\\n':false,list:[null,true,-1.25e-20,Number.MAX_SAFE_INTEGER,'\u0000\uD800😀']});
for(const unit of ['\u0000','"','\\','\n','😀','\uD800']){const encoded=JSON.stringify(unit).length-2;const n=Math.floor((262144-2)/encoded);accepted(unit.repeat(n));oversized(unit.repeat(n+1));}
const nullObject=Object.create(null);nullObject.x=1;accepted(nullObject);
let deep=1;for(let i=0;i<32;i++)deep={x:deep};accepted(deep);deep={x:deep};assert.throws(()=>validate(deep),/nesting/);checks++;
const leaf={x:1};assert.throws(()=>validate({left:leaf,right:leaf}),/unshared/);checks++;const cycle={};cycle.x=cycle;assert.throws(()=>validate(cycle),/unshared/);checks++;
let getters=0;assert.throws(()=>validate({get value(){getters++;throw Error('called')}}),/data-only/);assert.equal(getters,0);checks++;
let replayed=0;
for(const dir of ['/tmp/hf-continuous-work-review-lifecycle/probe-artifacts-node26'])for(const name of readdirSync(dir).filter(p=>p.endsWith('.json'))){const save=JSON.parse(readFileSync(dir+'/'+name));if(save.format!=='human-continuous-work-experiment')continue;const restored=host.restoreContinuation(save);assert.deepEqual(host.exportContinuation(restored),save);const original=oldHost.restoreContinuation(save);assert.deepEqual(restored,original);const remaining=Math.min(5,save.state.origin.game.clock.now+240-restored.now);assert.deepEqual(host.advanceContinuation(restored,remaining),oldHost.advanceContinuation(original,remaining));replayed++;}
const childSource=`import assert from 'node:assert/strict';import{restoreContinuation}from ${JSON.stringify(filename)};let d={x:'a'};for(let i=0;i<30;i++)d={left:d,right:d};const a=performance.now();assert.throws(()=>restoreContinuation(d),/unshared/);const dagMs=performance.now()-a;const wide=Object.fromEntries(Array.from({length:50000},(_,i)=>['key'+i,'x'.repeat(10000)]));const b=performance.now();assert.throws(()=>restoreContinuation(wide),/size limit/);console.log(JSON.stringify({dagMs,wideMs:performance.now()-b}));`;
const child=spawnSync(process.execPath,['--input-type=module','-e',childSource],{encoding:'utf8',timeout:2500,maxBuffer:10000});assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);
const files=['src/experiments/continuous-work/host.js','tests/continuous-work-json-budget.test.js','src/games/commons.js','src/human/index.js','src/human/v0.1.1.js','src/runtime/index.js','src/runtime/clock.js','src/core/model.js','scripts/runtime-release-lock.json'];
const hashes=Object.fromEntries(files.map(file=>[file,createHash('sha256').update(readFileSync(root+'/'+file)).digest('hex')]));for(const file of files)assert.equal(hashes[file],createHash('sha256').update(execFileSync('git',['show','76b7ffe:'+file],{cwd:root})).digest('hex'));
const result={pass:true,node:process.version,sourceCommit:'76b7ffe89f9268d239ca8e361a0429939d38e6b6',boundaryChecks:checks,historicalSavesReplayed:replayed,subprocess:JSON.parse(child.stdout),hashes};console.log(JSON.stringify(result,null,2));writeFileSync(`/tmp/hf-continuous-work-review-lifecycle/correction-76b7ffe/boundary-${process.versions.node}.json`,JSON.stringify(result,null,2));
