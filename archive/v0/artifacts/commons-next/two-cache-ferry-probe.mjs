import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import * as episode from '../../src/games/commons-next.js';

const observation=game=>{
  const view=episode.getGameView(game);
  return {elapsed:view.elapsed,phase:view.phase,stock:view.stock,caches:view.caches,availableCaches:view.availableCaches,
    people:Object.fromEntries(Object.entries(view.people).map(([id,person])=>[id,{body:person.body,job:person.job&&{id:person.job.id,remaining:person.job.remaining,duration:person.job.duration}}])),
    commitment:{status:view.commitment.status,project:view.commitment.project,reason:view.commitment.reason},
    availableJobs:view.choices.filter(choice=>!choice.unavailable).map(choice=>({id:choice.id,duration:choice.duration,cost:choice.cost,output:choice.output}))};
};
/** A fixed, informed player schedule; decision inputs are visible choices and event completions. */
export function runTwoCacheProbe({finishFirstRest=false}={}){
  let game=episode.createGame();const initial=structuredClone(game),trace=[];
  const checks={partialRestPaidMinutes:0,cancelPreservedExactCondition:true,everyRequestedProjectAccepted:true};
  const apply=(command,reason)=>{
    const before=observation(game),condition=structuredClone(game.world.people.player.body),stock=structuredClone(game.world.stock),now=game.world.clock.now;
    if(command.type==='start'){
      assert.ok(before.availableJobs.some(job=>job.id===command.jobId),`Command ${command.jobId} must be offered by the public view at ${before.elapsed}`);
      game=episode.startJob(game,command.jobId);
    }else if(command.type==='request'){
      game=episode.requestProject(game,'cache');assert.equal(game.world.lastResponse.accepted,true);checks.everyRequestedProjectAccepted&&=game.world.lastResponse.accepted;
    }else if(command.type==='cancel'){
      assert.equal(game.world.jobs.player.id,'rest');checks.partialRestPaidMinutes=now-game.world.jobs.player.startedAt;
      game=episode.cancelJob(game);
      assert.deepEqual(game.world.people.player.body,condition);assert.deepEqual(game.world.stock,stock);assert.equal(game.world.clock.now,now);
    }else game=episode.advanceToNextEvent(game);
    trace.push({step:trace.length+1,command,reason,before,after:observation(game)});
  };
  const start=(jobId,reason)=>apply({type:'start',jobId},reason),advance=reason=>apply({type:'advance-event'},reason),request=reason=>apply({type:'request',project:'cache'},reason);
  start('gather-salvage','You gather the missing salvage while Meryem can collect timber.');
  request('Request one complete cache. Her own policy chooses its materials and recovery.');
  advance('Meryem finishes timber at minute 15; your salvage trip still needs six minutes.');
  advance('Your salvage arrives at minute 21. Public stock now covers a cache.');
  start('build-cache','Use the available materials to pack the first cache while Meryem finishes her existing trip.');
  advance('Meryem finishes salvage at minute 36 and independently starts resting.');
  advance('Your cache finishes at minute 40. The shared project is fulfilled.');
  request('Request a second cache after the first commitment is fulfilled; her rest continues.');
  start('rest','Recover while Meryem finishes her current rest.');
  advance('At minute 54 Meryem finishes resting and starts a 15-minute timber trip; your rest has four minutes left.');
  if(finishFirstRest){
    advance('Complete all 18 minutes of your rest, finishing at minute 58.');
    start('gather-timber','Gather timber after the full rest.');
    advance('Meryem finishes timber at minute 69, before your trip arrives; she starts another timber trip.');
    advance('Your timber arrives at minute 73. Materials now cover the second cache.');
    start('build-cache','The public assembly estimate is 19 minutes, so this cache will finish two minutes after the ferry.');
    advance('Meryem finishes her second timber trip at minute 84 and chooses recovery.');
    advance('The ferry checkpoint stops the paid assembly with two minutes still remaining.');
  }else{
    apply({type:'cancel'},'Cancel your rest after 14 paid minutes, at the visible next-event boundary. No time or recovery is refunded.');
    start('gather-timber','Match Meryem’s visible 15-minute timber trip with your own 15-minute trip.');
    advance('Both timber trips finish at minute 69. Meryem sees enough supplies and starts the 19-minute cache assembly herself.');
    start('rest','Recover again while Meryem packs the second cache.');
    advance('Your full rest finishes at minute 87; her assembly has one minute remaining.');
    advance('Meryem completes the second cache at minute 88.');
    advance('Reach the unchanged minute-90 ferry checkpoint with two complete caches.');
  }
  assert.equal(episode.getGameView(game).phase,'ferry');
  const final=episode.getGameView(game);
  return {approach:finishFirstRest?'Complete the first rest':'Coordinate after paid partial rest',checks,trace,
    summary:{ferryMinute:final.elapsed,completedCaches:final.caches,cacheCompletionOffsets:game.production.map(receipt=>receipt.at-game.openedAt),canceledJobs:game.world.stats.canceled-initial.world.stats.canceled,
      afternoonPersonMinutes:Object.fromEntries(['workMinutes','restMinutes','mealMinutes','idleMinutes'].map(key=>[key,game.world.stats[key]-initial.world.stats[key]])),
      stock:final.stock,reportedCondition:Object.fromEntries(Object.entries(final.people).map(([id,person])=>[id,person.body])),unfinishedPlayerJob:final.people.player.job&&{id:final.people.player.job.id,remaining:final.people.player.job.remaining}},
    ferrySave:episode.exportGame(game)};
}
export function buildProbeReport(){return {study:'Two caches before the ferry through visible coordination',date:'2026-09-08',episodeVersion:episode.COMMONS_NEXT_VERSION,
  design:'Exploratory capability search prompted by a design critic, after the original six-run comparison. No game, opening, body, timing or controller rules changed. This fixed schedule consumes only public job availability, material stocks and event boundaries.',
  searchBounds:'Inspected the suggested salvage-first opening and four first-rest durations: 14, 15, 16 and 18 paid minutes. Found the 14-minute event-boundary schedule; stopped searching. This is not an exhaustive search or an optimality result.',
  limits:['This is a supported informed player schedule, not a new autonomous controller or matched player study.','Canceling paid partial rest is a timing affordance that deserves explanation testing. It grants no free recovery or resources.','The nearby full-rest schedule differs in resulting worker assignment as well as timing; it does not isolate a causal physiological coefficient.','Reaching two caches by the ferry does not remove the dominated camp-first result in the preserved original six-run study, or prove fun, fairness, optimal play or total-day provision.'],
  runs:[runTwoCacheProbe(),runTwoCacheProbe({finishFirstRest:true})]};}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(!process.argv[2])throw new Error('Supply a new output JSON path; retained evidence is never overwritten.');
  const destination=resolve(process.argv[2]);await mkdir(dirname(destination),{recursive:true});await writeFile(destination,JSON.stringify(buildProbeReport(),null,2)+'\n',{flag:'wx'});process.stdout.write(`Wrote inspected probe to ${destination}\n`);
}
