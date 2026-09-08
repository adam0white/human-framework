import {writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import * as next from '../src/games/commons-next.js';
import * as original from '../src/games/commons.js';
import {chooseCommand,applyCommand} from '../src/games/commons-policy.js';

/** Exploratory product comparison; no player archive, optimizer or model changes. */
export function runComparison(){
  const runs=[];
  for(const approach of ['build-first','stock-first','recover-and-stock-food'])for(const destination of ['households-first','camp-first']){
    let game=next.createGame(),control=structuredClone(game.world),matchedCommands=0;
    const apply=command=>{
      if(command.type==='start'){game=next.startJob(game,command.jobId);control=applyCommand(control,command);}
      else if(command.type==='request'){game=next.requestProject(game,command.projectId);control=applyCommand(control,command);}
      else{const before=game.world.clock.now;game=next.advanceToNextEvent(game);control=original.advanceGame(control,game.world.clock.now-before);}
      assert.deepEqual(original.exportGame(game.world),original.exportGame(control));matchedCommands++;
    };
    if(approach==='recover-and-stock-food')for(const jobId of ['rest','eat','forage']){apply({type:'start',jobId});while(game.world.jobs.player)apply({type:'advance'});}
    let atFerry;
    for(let count=0;count<500;count++){
      const view=next.getGameView(game);
      if(view.phase==='ferry'){
        atFerry={caches:view.caches,stock:view.stock,pending:Object.fromEntries(Object.entries(view.people).map(([id,person])=>[id,person.job&&{job:person.job.id,remaining:person.job.remaining}]))};
        while(next.getGameView(game).availableCaches>0&&next.getGameView(game)[destination==='households-first'?'householdsEquipped':'campNights']<(destination==='households-first'?2:4))game=next.allocateCache(game,destination==='households-first'?'households':'camp');
        game=next.dispatchFerry(game);continue;
      }
      if(view.phase==='dusk')break;
      apply(chooseCommand(original.getGameView(control),approach==='stock-first'?'stock-first':'build-first'));
    }
    assert.equal(next.getGameView(game).phase,'dusk','Comparison must reach its bounded ending');
    const dusk=next.getGameView(game);
    while(next.getGameView(game).availableCaches>0&&next.getGameView(game).campNights<4)game=next.allocateCache(game,'camp');
    game=next.finishDay(game);const result=next.getGameView(game);
    assert.deepEqual(original.exportGame(game.world),original.exportGame(control));
    runs.push({approach,destination,openingMinute:game.openedAt,matchedCommands,originalWorldMatched:true,atFerry,
      atDusk:{caches:dusk.caches,stock:dusk.stock,cacheCompletionOffsets:game.production.map(receipt=>receipt.at-game.openedAt),pending:Object.fromEntries(Object.entries(dusk.people).map(([id,person])=>[id,person.job&&{job:person.job.id,remaining:person.job.remaining}]))},
      outcome:{householdsEquipped:result.householdsEquipped,campNights:result.campNights,unusedCaches:result.availableCaches,householdsWithoutKit:result.unprovidedHouseholds,campNightsWithoutSupplies:result.unprovidedNights}});
  }
  return {study:'Before the rain: bounded surplus allocation',date:'2026-09-08',episodeVersion:next.COMMONS_NEXT_VERSION,
    design:'Exploratory, deterministic comparison of six scripted continuations of one authored opening. The same world commands and elapsed minutes run through unchanged Common Ground as control.',
    scope:'Physical output is expected to match the control. Allocation yield and ferry timing are host-authored outcomes; this does not measure enjoyment, human explanations, model realism or optimum play.',
    negativeFindings:['No physical output, body or resource advantage over the original world under matched commands.','Both existing controllers supply only one cache before the ferry; a different controller has not been optimized or validated.','Paid recovery and food gathering first can miss the ferry while matching build-first total caches and retaining more food.','Some needs remain unprovided in every scripted run. Keeping a first cache for camp can leave unused surplus by dusk.'],runs};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(!process.argv[2])throw new Error('Choose a new output path: node scripts/commons-next-comparison.js /tmp/commons-next-new.json');
  const path=resolve(process.argv[2]);await mkdir(dirname(path),{recursive:true});
  await writeFile(path,JSON.stringify(runComparison(),null,2)+'\n',{flag:'wx'});
  process.stdout.write(`Wrote bounded comparison to ${path}\n`);
}
