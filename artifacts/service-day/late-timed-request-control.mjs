import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as h from '../../src/games/service.js';
import {runCarryover,applyCommand} from '../../src/experiments/service-day/experiment.js';
const root=new URL('../../',import.meta.url).pathname,out=process.argv[2];
if(!out)throw Error('Supply a fresh output path.');
const files=['src/games/service.js','src/experiments/service-day/experiment.js','src/experiments/service-day/policies.js','src/experiments/service-day/shared.js','src/human/v0.1.1.js','src/runtime/clock.js','src/core/model.js'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceSha256=Object.fromEntries(files.map(p=>[p,hash(readFileSync(`${root}/${p}`))]));
assert.equal(sourceSha256['src/games/service.js'],'50ce6e3e52a9e92c85532f3a73d8afa46e6bc0ca7993ef72ce9e4f58e51738d1');
const branch=runCarryover().branches.find(x=>x.route==='gate');let s=h.restoreService(branch.continuation.initialState);
const prefix=[];for(const e of branch.continuation.commands){if(s.clock.now===41)break;s=applyCommand(s,e.command);prefix.push(e.command);}
assert.equal(s.clock.now,41);const checkpoint=h.exportService(s),actions=[];
function apply(c){const before=s.clock.now;s=applyCommand(s,c);if(c.type!=='advance')assert.equal(s.lastResponse.accepted,true,s.lastResponse.reason);actions.push({at:before,command:c,response:c.type==='advance'?null:s.lastResponse});assert.deepEqual(h.restoreService(JSON.parse(JSON.stringify(h.exportService(s)))),s);}
const ask=(a,t)=>apply({type:'request',actor:a,task:t});
const stop=a=>apply({type:'interrupt',actor:a});
const advance=t=>apply({type:'advance',until:t});
assert.equal(s.jobs.keeper.task,'idle');ask('keeper','rest');ask('partner','rest');advance(46);stop('partner');ask('partner','rest');advance(47);ask('keeper','pump');advance(51);stop('partner');ask('partner','rest');advance(53);stop('partner');ask('partner','deliver');advance(64);
assert.equal(s.outcome.allService,true);assert.deepEqual(s.delivery,{at:59,route:'deliver',units:2});assert.equal(s.paidByActor.partner.rest,12);
const result={format:'service-day-late-timed-request-control',version:1,createdAt:new Date().toISOString(),scope:'Post-comparison exploratory prescribed schedule on unchanged final service host. Not a new reserved trial, policy optimum, human feedback or general-planning result.',executionCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceSha256,comparisonBranch:'gate',frozenContinuationOutcome:branch.continuation.final.outcome,frozenContinuationDelivery:branch.continuation.final.delivery,initialState:branch.continuation.initialState,prefixTo41:prefix,checkpointAt41:checkpoint,actions,finalState:h.exportService(s),outcome:s.outcome,delivery:s.delivery,paidByActor:s.paidByActor,resumeEqualAfterEveryAction:true};
writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:out,delivery:result.delivery,outcome:result.outcome,partnerRest:s.paidByActor.partner.rest,resumeEqualAfterEveryAction:true},null,2));
