/** Repeat the first prescribed host counterexamples against committed source. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as h from '../../src/experiments/across-cut/host.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const sourceCommit='f7c4ea220f2f3f39584eefb841100dedbec0c1bc';
const sources=['src/experiments/across-cut/host.js','src/runtime/index.js','src/runtime/clock.js','src/human/v0.1.1.js','src/core/model.js','docs/across-cut-contract.md'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=sources.map(path=>{const committed=execFileSync('git',['show',`${sourceCommit}:${path}`],{cwd:root}),working=readFileSync(new URL(`../../${path}`,import.meta.url));assert.equal(hash(working),hash(committed),`Source drift: ${path}`);return {path,sha256:hash(committed),bytes:committed.length};});
const results=[];
function run(id,config,script){let state=h.create(config);const steps=[];const q=(actorId,action)=>{const before=h.getActorView(state,actorId);state=h.request(state,actorId,action);steps.push({type:'request',actorId,action,before});};const t=at=>{state=h.advance(state,at);};script(q,t,()=>state);state=h.advance(state,30);const save=h.exportState(state);assert.deepEqual(h.restoreState(save),state);const world=h.getWorldSummary(state);assert.equal(world.water.conservedTotal,3);for(const a of h.ACTORS){const v=h.getActorView(state,a);assert.equal(Object.values(v.paid).reduce((x,y)=>x+y,0),30);assert.equal(v.body.minutes,30);}results.push({id,config,world,steps,save});}
const inspectBoth=(q,t)=>{for(const a of h.ACTORS)q(a,{task:'inspect'});t(1);for(const a of h.ACTORS)q(a,{task:'repair'});};
run('retained-easy-no-radio',{valveMinutes:6,inletMinutes:2,launchAt:27},(q,t)=>{inspectBoth(q,t);t(7);q('keeper',{task:'release'});t(8);q('receiver',{task:'attend',minutes:4});t(12);});
run('retained-early-slow-inlet-infeasible',{valveMinutes:6,inletMinutes:14,launchAt:15},(q,t)=>{inspectBoth(q,t);t(7);q('keeper',{task:'release'});t(15);});
run('late-universal-fixed-bound',{valveMinutes:12,inletMinutes:14,launchAt:27},(q,t)=>{inspectBoth(q,t);t(13);q('keeper',{task:'release'});t(15);q('receiver',{task:'attend',minutes:3});t(18);});
run('early-immediate-cart',{valveMinutes:12,inletMinutes:14,launchAt:15},(q,t)=>{q('receiver',{task:'cart'});t(10);});
run('paid-contact-late-easy',{valveMinutes:6,inletMinutes:2,launchAt:27},(q,t)=>{q('keeper',{task:'inspect'});q('receiver',{task:'inspect'});t(1);q('keeper',{task:'travel',to:'dock'});q('receiver',{task:'repair'});t(7);q('receiver',{task:'transmit',via:'contact',message:{kind:'report',observationIds:[1]}});t(8);q('keeper',{task:'travel',to:'valve'});t(14);q('keeper',{task:'repair'});t(20);q('keeper',{task:'release'});t(22);q('receiver',{task:'attend',minutes:3});t(25);});
const output={description:'Repeated prescribed core checks, not reserved policy or empirical outcomes. Easy and early-slow counterexamples occurred first in host tests and are retained here without timing changes.',sourceCommit,node:process.version,runnerSha256:hash(readFileSync(fileURLToPath(import.meta.url))),manifest,results};
writeFileSync(new URL('preflight.json',import.meta.url),`${JSON.stringify(output,null,2)}\n`);
console.log(JSON.stringify({sourceCommit,cases:results.map(r=>({id:r.id,units:r.world.service.units,lost:r.world.water.lost,radioCharges:r.world.actors.keeper.inventory.radio.consumed+r.world.actors.receiver.inventory.radio.consumed,paidTravel:r.world.actors.keeper.paid.travel+r.world.actors.receiver.paid.travel,replay:true}))},null,2));
