import * as h from '../../src/games/service-plan.js';
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const out=process.argv[2];if(!out)throw Error('Supply fresh output path');
const checks=[];
const ask=(s,t)=>h.requestTask(s,'keeper',t);
function prefix(at=37){let s=ask(h.createServicePlan(),'meal');s=h.advanceTo(s,4);s=ask(s,'gate');s=h.advanceTo(s,10);s=ask(s,'gate');s=h.advanceTo(s,16);s=ask(s,'salvage');s=h.advanceTo(s,24);s=ask(s,'rest');return h.advanceTo(s,at);}
const safe={pumpStartAt:39,readyBy:45,waitUntil:45,fallback:'cart'},risk={pumpStartAt:47,readyBy:53,waitUntil:53,fallback:'none'};
function test(name,run){try{checks.push({name,passed:true,details:run()});}catch(e){checks.push({name,passed:false,code:e.code??null,message:e.message});}}
test('cross-family no-effect refusals remain bounded and replayable',()=>{let s=h.createServicePlan();for(let i=0;i<200;i++){s=h.proposePlan(s,safe);s=h.requestTask(s,'partner','share');}assert.ok(s.commands.length<=2);assert.deepEqual(h.restoreServicePlan(JSON.parse(JSON.stringify(h.exportServicePlan(s)))),s);const ended=h.advanceTo(h.requestTask(s,'keeper','rest'),64);assert.ok(ended.outcome);return {commands:s.commands.length,minute:s.clock.now,newWorkContinues:true};});
test('an earlier contribution deadline is a visible event',()=>{const s=h.advanceTo(h.proposePlan(prefix(),{pumpStartAt:39,readyBy:45,waitUntil:53,fallback:'none'}),39);assert.equal(s.coordination.current.status,'active');assert.equal(h.nextVisibleEvent(s),45);return {now:39,next:45,waitUntil:53};});
test('planned work start pauses paid partial recovery before job end',()=>{let s=h.advanceTo(h.proposePlan(prefix(41),risk),43);s=ask(s,'rest');assert.equal(s.jobs.keeper.endsAt,49);assert.equal(h.nextVisibleEvent(s),47);s=h.advanceTo(s,47);assert.equal(s.jobs.keeper.task,'rest');return {plannedStart:47,actualRestEnd:49,workNotAutomaticallyChosen:true};});
test('a busy requested job crosses plan expiry without invalidating state or forced stop',()=>{let s=h.advanceTo(h.proposePlan(prefix(),safe),40);s=h.requestTask(s,'partner','rest');assert.equal(s.lastResponse.accepted,true);s=h.advanceTo(s,45);assert.equal(s.coordination.current.status,'expired');assert.equal(s.jobs.partner.task,'rest');assert.equal(s.jobs.partner.endsAt,46);assert.deepEqual(h.restoreServicePlan(JSON.parse(JSON.stringify(h.exportServicePlan(s)))),s);return {expiredAt:45,paidJobContinuesUntil:46};});
const record={sourceSha256:createHash('sha256').update(readFileSync(new URL('../../src/games/service-plan.js',import.meta.url))).digest('hex'),scope:'Four independently specified root regressions on actual imported host. No world edits, synthetic human feedback or reserved evaluation.',checks};writeFileSync(out,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(record,null,2));

process.exitCode=checks.some(c=>!c.passed)?1:0;
