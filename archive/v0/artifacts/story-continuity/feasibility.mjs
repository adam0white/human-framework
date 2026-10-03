/** Read-only host probes. This is not a story host, save migrator, or player study. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as commons from '../../src/games/commons.js';
import * as rain from '../../src/games/commons-next.js';
import {chooseCommand,applyCommand} from '../../src/games/commons-policy.js';
import {runTwoCacheProbe} from '../commons-next/two-cache-ferry-probe.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const clone=value=>structuredClone(value),json=value=>JSON.parse(JSON.stringify(value)),sha=value=>createHash('sha256').update(value).digest('hex');
const summary=world=>({now:world.clock.now,milestoneAt:world.milestoneAt,caches:world.caches,stock:world.stock,
  structures:world.structures,commitment:world.commitment,
  people:Object.fromEntries(Object.entries(world.people).map(([id,p])=>[id,{version:p.version,minutes:p.minutes,body:p.body,skills:p.skills,
    pending:p.pending&&{id:p.pending.id,action:p.pending.action,elapsedMinutes:p.pending.elapsedMinutes,startedAt:p.pending.startedAt}}])),
  jobs:Object.fromEntries(Object.entries(world.jobs).map(([id,j])=>[id,j&&{id:j.id,startedAt:j.startedAt,endsAt:j.endsAt,
    remaining:j.endsAt-world.clock.now,benefits:j.benefits,reserved:j.cost,eventId:j.eventId,attemptId:j.attemptId}])),
  queue:world.clock.queue,stats:world.stats});

function earned(policy){
  let world=commons.createGame(),commands=[];
  while(world.milestoneAt===null&&commands.length<500){const command=chooseCommand(commons.getGameView(world),policy);commands.push(command);world=applyCommand(world,command);}
  assert.notEqual(world.milestoneAt,null,'Bounded script must actually reach the milestone.');
  assert.deepEqual(commands.reduce(applyCommand,commons.createGame()),world);
  return {policy,commands,world};
}
function compatibility(world){
  // A deliberately unsupported cross-host attempt: detect, do not bypass, the fixed-opening invariant.
  const input={...rain.createGame(),world:clone(world),openedAt:world.clock.now};
  try{rain.exportGame(input);return {accepted:true};}catch(error){return {accepted:false,error:error.message};}
}
function boundaryProbe(world){
  const before=clone(world),save=commons.exportGame(world),restored=commons.restoreGame(json(save));
  assert.deepEqual(restored,world);
  // Metadata only. No transition rule or candidate command API is implemented here.
  const candidateBoundary={enteredAt:world.clock.now,ferryAt:world.clock.now+90,duskAt:world.clock.now+180,
    carriedCaches:world.caches,earlierCacheCompletionTimesKnown:false};
  assert.deepEqual(world,before,'Observing a chapter boundary must not mutate the host.');
  assert.equal(candidateBoundary.ferryAt-candidateBoundary.enteredAt,90);
  assert.equal(candidateBoundary.duskAt-candidateBoundary.enteredAt,180);
  const delta=world.clock.queue[0]?world.clock.queue[0].at-world.clock.now:1;
  const future=commons.advanceGame(world,delta),resumedFuture=commons.advanceGame(restored,delta);
  assert.deepEqual(future,resumedFuture);
  assert.equal(future.clock.now,world.clock.now+delta);
  for(const id of Object.keys(world.people))assert.equal(future.people[id].minutes,world.people[id].minutes+delta);
  return {candidateBoundary,entry:summary(world),firstExistingHostContinuation:summary(future),paidContinuationMinutes:delta,
    exactExistingSaveRoundtrip:true,exactExistingContinuation:true,existingRainCompatibility:compatibility(world),save};
}
function lateRecovery(){
  let state=rain.advanceGame(rain.createGame(),90);
  assert.equal(rain.getGameView(state).phase,'ferry');assert.equal(state.world.caches,0);
  const ferrySave=rain.exportGame(state);
  state=rain.dispatchFerry(state);const commands=[];
  while(rain.getGameView(state).phase==='packing'&&commands.length<100){
    const command=chooseCommand(rain.getGameView(state));commands.push(command);
    if(command.type==='start')state=rain.startJob(state,command.jobId);
    else if(command.type==='request')state=rain.requestProject(state,command.projectId);
    else state=rain.advanceToNextEvent(state);
  }
  assert.equal(rain.getGameView(state).phase,'dusk');
  assert.throws(()=>rain.allocateCache(state,'households'),/departed/);
  while(rain.getGameView(state).availableCaches&&rain.getGameView(state).campNights<4)state=rain.allocateCache(state,'camp');
  state=rain.finishDay(state);const view=rain.getGameView(state);
  assert.equal(view.householdsEquipped,0);assert.equal(view.campNights,2);
  assert.deepEqual(rain.restoreGame(json(rain.exportGame(state))),state);
  return {ferrySave,commands,finalSave:rain.exportGame(state),summary:{householdsEquipped:view.householdsEquipped,campNights:view.campNights,
    cacheCompletionOffsets:state.production.map(p=>p.at-state.openedAt)},missedHouseholdsCannotBeRetroactivelyAllocated:true};
}
function branchProbe(){
  const inspected=runTwoCacheProbe(),state=rain.restoreGame(inspected.ferrySave),before=clone(state),branches=[];
  for(const destinations of [['households','households'],['households','camp'],['camp','camp']]){
    let branch=clone(state);for(const destination of destinations)branch=rain.allocateCache(branch,destination);
    const view=rain.getGameView(branch);
    assert.deepEqual(branch.world,before.world,'Allocation cannot manufacture body recovery or world inventory.');
    assert.equal(view.availableCaches,0);assert.equal(new Set(branch.allocations.map(a=>a.cache)).size,2);
    assert.throws(()=>rain.allocateCache(branch,destinations[0]==='households'?'camp':'households'));
    assert.deepEqual(rain.restoreGame(json(rain.exportGame(branch))),branch);
    branches.push({destinations,householdsEquipped:view.householdsEquipped,campNights:view.campNights,availableCaches:view.availableCaches,
      allocations:branch.allocations});
  }
  assert.deepEqual(state,before);
  return {basis:'Previously retained, informed two-cache schedule through the unchanged authored opening.',
    cacheCompletionOffsets:inspected.summary.cacheCompletionOffsets,branches,exactWorldPreserved:true,noDoubleAllocation:true};
}

const output=process.argv[2];if(!output)throw new Error('Pass a new JSON output path. Existing evidence is never overwritten.');
const sourcePaths=['artifacts/story-continuity/feasibility.mjs','src/games/commons.js','src/games/commons-next.js','src/games/commons-policy.js','src/human/index.js',
  'src/core/model.js','src/runtime/clock.js','scripts/runtime-release-lock.json','artifacts/commons-next/two-cache-ferry-probe.mjs',
  'artifacts/user-runs/2026-09-07/common-ground-minute-1312.json'];
const sources=await Promise.all(sourcePaths.map(async path=>({path,sha256:sha(await readFile(resolve(root,path)))})));
const runs=['build-first','stock-first'].map(earned);
assert.equal(runs[0].world.clock.now,220);assert.equal(runs[1].world.clock.now,226);
assert.equal(runs[1].world.people.player.pending.elapsedMinutes,4);
assert.equal(runs[1].world.jobs.neighbor.id,'rest');
assert.equal(runs[1].world.jobs.player.benefits.shelter,false,'An already-started trip must retain its original output rule.');
const userPath='artifacts/user-runs/2026-09-07/common-ground-minute-1312.json';
const userWorld=commons.restoreGame(JSON.parse(await readFile(resolve(root,userPath),'utf8')));
assert.equal(userWorld.clock.now,1312);assert.equal(userWorld.caches,12);
const cases=runs.map(({policy,commands,world})=>({kind:'synthetic-existing-policy',policy,commands,...boundaryProbe(world)}));
cases.push({kind:'actual-previously-supplied-save',source:userPath,...boundaryProbe(userWorld)});
assert.equal(cases[0].existingRainCompatibility.accepted,true);
assert.equal(cases[1].existingRainCompatibility.accepted,false);
assert.equal(cases[2].existingRainCompatibility.accepted,false);
const report={title:'Earned Common Ground to supply-window continuity: read-only feasibility',date:'2026-09-08',node:process.version,sources,
  status:'No story host, world transition, new save importer, rest/work correction, UI or deployment implemented.',
  limits:['Synthetic schedules are executable mechanics evidence, not player behavior or human calibration.',
    'The actual minute-1312 save validates under the old host; it does not reveal cache completion times or why the player chose actions.',
    'Candidate entry/deadline fields are arithmetic only. A new wrapper must implement and validate them.',
    'All exercised worlds use frozen Common Ground/Human 0.1.0. Results do not transfer automatically to a rest/work derivative.',
    'Branch and missed-ferry probes use the old authored Rain opening; neither is claimed to work from every earned world.'],
  cases,existingRainBranches:branchProbe(),existingRainFailureRecovery:lateRecovery()};
const destination=resolve(output);await mkdir(dirname(destination),{recursive:true});await writeFile(destination,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({output:destination,cases:cases.map(c=>({kind:c.kind,policy:c.policy,...c.candidateBoundary,existingRainCompatibility:c.existingRainCompatibility})),
  branches:report.existingRainBranches.branches.map(({destinations,householdsEquipped,campNights})=>({destinations,householdsEquipped,campNights})),
  missedFerryRecovery:report.existingRainFailureRecovery.summary})+'\n');
