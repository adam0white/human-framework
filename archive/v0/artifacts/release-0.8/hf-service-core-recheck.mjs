import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as h from '/Users/abdul/code/human-framework/.worktrees/service-day-core/src/games/service.js';
const cwd='/Users/abdul/code/human-framework/.worktrees/service-day-core';
const source=execFileSync('git',['show','94cb980:src/games/service.js'],{cwd,encoding:'utf8'}).replace("'../runtime/index.js'","'file:///Users/abdul/code/human-framework/.worktrees/service-day-core/src/runtime/index.js'");
const old=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const json=x=>JSON.parse(JSON.stringify(x));
let legacy=old.advanceTo(old.createService(),24);
for(let i=0;i<125;i++){legacy=old.requestTask(legacy,'partner','gate');legacy=old.interruptTask(legacy,'partner');}
assert.equal(legacy.commands.length,251);
assert.throws(()=>old.requestTask(legacy,'keeper','rest'),e=>e.code==='COMMAND_LIMIT');
const saved=json(old.exportService(legacy)),restored=h.restoreService(saved);
assert.equal(restored.commands.length,2);
assert.deepEqual(h.exportService(restored).state,saved.state);
assert.deepEqual(h.restoreService(json(h.exportService(restored))),restored);
assert.deepEqual(h.exportService(h.advanceTo(restored,64)).state,old.exportService(old.advanceTo(legacy,64)).state);
let continued=h.requestTask(restored,'keeper','rest');assert.equal(continued.lastResponse.accepted,true);continued=h.advanceTo(continued,64);assert.equal(continued.outcome.at,64);
const mutations={
 ownedParts:x=>x.state.parts.keeper++,body:x=>x.state.people.keeper.body.fatigue=0,
 reservedParts:x=>x.state.jobs.partner.reservedParts=0,installedWork:x=>x.state.work.gate++,
 clock:x=>x.state.clock.now++,receipt:x=>x.state.lastReceipt={id:'made-up'},
 response:x=>x.state.lastResponse.reason='changed',recent:x=>x.state.recent[0].message='changed',
 hostVersion:x=>x.hostVersion='0.1.1',runtimeVersion:x=>x.runtimeVersion='changed',
 envelopeExtra:x=>x.extra=true,worldExtra:x=>x.state.extra=true,
 effectCommand:x=>x.commands[0].to=25,forgedOutcome:x=>x.state.outcome={allService:true},
};
for(const [name,mutate] of Object.entries(mutations)){const corrupt=json(saved);mutate(corrupt);assert.throws(()=>h.restoreService(corrupt),undefined,name);}
let s=h.advanceTo(h.createService(),24);for(let i=0;i<125;i++){s=h.requestTask(s,'partner','gate');s=h.interruptTask(s,'partner');s=h.requestTask(s,'keeper','pump');}
assert.equal(s.commands.length,2);assert.equal(s.lastResponse.actor,'keeper');assert.equal(s.lastResponse.code,'TARGET_BUSY');assert.deepEqual(h.restoreService(json(h.exportService(s))),s);
let response=h.requestTask(h.createService(),'partner','share');assert.equal(response.lastResponse.code,'CLINIC_RESERVE');response=h.requestTask(response,'keeper','rest');assert.equal(response.lastResponse.code,'ACCEPTED');assert.equal(response.recent.some(x=>x.actor==='partner'),false);
console.log(JSON.stringify({legacyCommands:saved.commands.length,normalizedCommands:restored.commands.length,legacyWorldExact:true,legacyClosingExact:true,newWorkAllowed:true,forgedSaveCasesRejected:Object.keys(mutations).length,crossActorCrossTypeCoalescing:true,latestResponseOnlyContract:true},null,2));
