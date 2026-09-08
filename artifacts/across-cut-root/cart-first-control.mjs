import * as h from '../../src/experiments/across-cut/host.js';
import {writeFileSync,readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const out=process.argv[2];if(!out)throw Error('Supply fresh output');const runs=[];
for(const valveMinutes of [6,12]){let s=h.create({valveMinutes,inletMinutes:2,launchAt:15}),decisions=[];
 for(let at=0;at<30;at++){
  const views=Object.fromEntries(h.ACTORS.map(a=>[a,h.getActorView(s,a)])),commands=[];
  for(const a of h.ACTORS){const v=views[a];let action=null;
   if(!v.job&&v.local.repairMinutes===null)action={task:'inspect'};
   else if(!v.job&&v.local.repairProgress<v.local.repairMinutes)action={task:'repair'};
   else if(!v.job&&a==='keeper'&&v.inventory.water.available===2&&at>=9)action={task:'release'};
   else if(!v.job&&a==='receiver'&&v.inventory.cartWater.available===1)action={task:'cart'};
   else if(!v.job&&a==='receiver'&&at<v.local.launchAt)action={task:'attend',minutes:v.local.launchAt-at};
   if(action)commands.push({actor:a,action});
  }
  for(const c of commands){s=h.request(s,c.actor,c.action);decisions.push({at,...c});}
  s=h.advance(s,at+1);assert.deepEqual(h.restoreState(JSON.parse(JSON.stringify(h.exportState(s)))),s);
 }
 const result=h.getWorldSummary(s);assert.equal(result.service.units,valveMinutes===6?2:1);assert.equal(result.water.conservedTotal,3);for(const a of h.ACTORS)assert.equal(result.actors[a].paid.transmit,0);runs.push({valveMinutes,decisions,final:result,finalSave:h.exportState(s)});
}
const record={scope:'Root post-review exploratory zero-message control. Same receiver rules/local history, own keeper repair-dependent timing; not a new reserved result or optimality proof.',sourceSha256:createHash('sha256').update(readFileSync(new URL('../../src/experiments/across-cut/host.js',import.meta.url))).digest('hex'),runs};writeFileSync(out,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(runs.map(r=>({valveMinutes:r.valveMinutes,deliveries:r.final.service.deliveries,paid:r.final.actors.receiver.paid})),null,2));
