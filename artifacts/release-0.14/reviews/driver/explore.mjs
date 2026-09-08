import * as p from './frozen/src/games/across-cut-player.js';
import * as h from './frozen/src/games/across-cut.js';
import {decideReceiver} from './frozen/src/games/across-cut-receiver.js';
for(const fatigue of [0.8,0.9,0.95,1]) {
 let g=p.createGame({inletMinutes:14,launchAt:27,bodies:{receiver:{fatigue,hunger:.15}}});
 const events=[];
 for(let t=0;t<30;t++){
  const v=h.getActorView(g.host,'receiver'),d=decideReceiver(g.receiver,v);
  events.push({t,body:v.body.body,remaining:v.local.repairMinutes===null?null:v.local.repairMinutes-v.local.repairProgress,reason:d.reason,cmd:d.commands,mode:g.receiver.mode});
  g=p.advanceGame(g,1);
 }
 console.log(JSON.stringify({fatigue,events,service:h.getWorldSummary(g.host).service}));
}
