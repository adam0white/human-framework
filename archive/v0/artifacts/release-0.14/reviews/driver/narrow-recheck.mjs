import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as p from './corrected/src/games/across-cut-player.js';
import * as h from './corrected/src/games/across-cut.js';
const setup={inletMinutes:14,launchAt:15,bodies:{receiver:{fatigue:.15,hunger:.972}}};
let g=p.createGame(setup);const trace=[];
for(let t=0;t<15;t++){
 if(t===3){const v=h.getActorView(g.host,'receiver');assert.equal(v.job.task,'meal');assert.equal(v.job.elapsed,1);g=p.restoreGame(p.exportGame(g));}
 if(t===4){const v=h.getActorView(g.host,'receiver');assert.equal(v.inventory.meal.consumed,1);assert.equal(v.paid.meal,2);}
 const v=h.getActorView(g.host,'receiver');trace.push({now:v.now,job:v.job,meal:v.inventory.meal,cart:v.inventory.cartWater,paid:v.paid});g=p.advanceGame(g,1);
}
const world=h.getWorldSummary(g.host),v=h.getActorView(g.host,'receiver');assert.equal(p.RECEIVER_VERSION,'0.1.1');assert.equal(world.service.units,1);assert.equal(world.service.deliveries[0].at,9);assert.equal(v.inventory.meal.consumed,1);assert.equal(v.paid.meal,2);assert.equal(v.paid.cart,10);assert.equal(v.position,6);assert.deepEqual(p.restoreGame(p.exportGame(g)),g);
const result={node:process.version,receiverVersion:p.RECEIVER_VERSION,setup,trace,world,assertions:'Exact original counterexample now consumes meal at4, delivers cart at9, returns14, and restores mid-meal/final state exactly.'};fs.writeFileSync('/tmp/across-driver-review/corrective-results.json',JSON.stringify(result,null,2)+'\n');console.log(result.assertions);
