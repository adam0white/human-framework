import {writeFileSync} from 'node:fs';
import * as player from '/Users/abdul/code/human-framework/src/games/across-cut-player.js';
import {assessEffort} from '/Users/abdul/code/human-framework/src/runtime/index.js';
const rates={inspect:.003,repair:.012,release:.015,travel:.010,meal:0};
const req=(g,a)=>player.applyCommand(g,{type:'request',action:a});
let repair=player.createGame({bodies:{keeper:{fatigue:.95,hunger:.15}}});
repair=player.advanceGame(req(repair,{task:'inspect'}),1);
const setup=player.createGame({bodies:{keeper:{fatigue:.9751,hunger:.15}}});
const rows=[];
for(const [caseName,game,ids] of [['known-six-minute-repair',repair,['repair-full','repair-one']],['starting-fatigue-one',setup,['inspect','travel-dock']]]){
 const view=player.getGameView(game);
 const lower=Object.fromEntries(Object.entries(view.body.body).map(([key,value])=>[key,Math.max(0,value-.025)]));
 const upper=Object.fromEntries(Object.entries(view.body.body).map(([key,value])=>[key,Math.min(1,value+.025)]));
 for(const id of ids){
  const choice=view.choices.find(c=>c.id===id),spec={durationMinutes:choice.duration,effort:rates[choice.action.task]*choice.duration,exertive:rates[choice.action.task]>0};
  let hostOutcome='admitted';try{req(game,choice.action);}catch(error){hostOutcome=error.code;}
  rows.push({caseName,id,visibleBody:view.body.body,duration:choice.duration,capacityUncertain:choice.capacityUncertain,unavailable:choice.unavailable,lowerBounds:lower,lowerAssessment:assessEffort(lower,spec),upperAssessment:assessEffort(upper,spec),hostOutcome});
 }
}
writeFileSync('/tmp/action-offer-code-review/bin-boundary-diagnostic.json',JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify(rows,null,2));
