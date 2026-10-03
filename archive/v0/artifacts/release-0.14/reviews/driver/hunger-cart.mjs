import * as p from './frozen/src/games/across-cut-player.js';
import * as h from './frozen/src/games/across-cut.js';
import {decideReceiver} from './frozen/src/games/across-cut-receiver.js';
for(const hunger of [.970,.972,.976]) {
 let g=p.createGame({inletMinutes:14,launchAt:15,bodies:{receiver:{fatigue:.15,hunger}}});
 const trace=[];
 for(let t=0;t<16;t++){
  const v=h.getActorView(g.host,'receiver'),d=decideReceiver(g.receiver,v);
  trace.push({t,body:v.body.body,job:v.job,reason:d.reason,commands:d.commands,meal:v.inventory.meal,paid:v.paid,receiverState:g.receiver});
  g=p.advanceGame(g,1);
 }
 console.log(JSON.stringify({hunger,trace,world:h.getWorldSummary(g.host)}));
}
