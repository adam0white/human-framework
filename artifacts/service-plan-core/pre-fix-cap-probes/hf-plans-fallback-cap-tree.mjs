import assert from 'node:assert/strict';
import * as h from '/Users/abdul/code/human-framework/src/games/service-plan.js';
import {writeFileSync,readFileSync} from 'node:fs';
let start=h.restoreServicePlan(JSON.parse(readFileSync('/tmp/hf-plans-fallback-cap-save.json')));
const commands={physicalRefusal:s=>h.requestTask(s,'keeper','rest'),planRefusal:s=>h.withdrawContribution(s),interrupt:s=>h.interruptDiscussion(s),advance:s=>h.advanceTo(s,Math.min(64,s.clock.now+1)),close:s=>h.advanceTo(s,64)};
const report=[];
function inspect(s,seq,depth){
 const row={seq,now:s.clock.now,count:s.commands.length,pending:!!s.coordination.pending,events:{}};
 for(const [name,fn] of Object.entries(commands)){try{const n=fn(s);row.events[name]={count:n.commands.length,accepted:n.lastResponse?.accepted,ended:!!n.outcome};assert.deepEqual(h.restoreServicePlan(h.exportServicePlan(n)),n);}catch(e){row.events[name]={code:e.code};}}
 report.push(row);
 if(depth)for(const name of ['physicalRefusal','planRefusal','advance']){try{inspect(commands[name](s),[...seq,name],depth-1);}catch(e){assert.equal(e.code,'COMMAND_LIMIT');}}
}
inspect(start,[],2);writeFileSync('/tmp/hf-plans-fallback-cap-tree.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.slice(0,4),null,2));
