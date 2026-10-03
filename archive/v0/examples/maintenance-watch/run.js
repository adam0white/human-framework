import assert from 'node:assert/strict';
import {RUNTIME_VERSION,HUMAN_VERSION,CLOCK_VERSION} from 'human-framework-runtime';
import {createWatch,requestTask,interruptTask,advanceTo,getWatchView,exportWatch,restoreWatch} from './host.js';

let paired=createWatch();
paired=requestTask(paired,'watcher','repair');
const refusal=paired.lastResponse;
paired=requestTask(paired,'keeper','repair');
paired=requestTask(paired,'watcher','watch');
paired=advanceTo(paired,5);
paired=interruptTask(paired,'keeper');
const interrupted=getWatchView(paired);
paired=requestTask(paired,'keeper','repair');
paired=advanceTo(paired,6);
const saved=JSON.parse(JSON.stringify(exportWatch(paired)));
const direct=advanceTo(paired,18),resumed=advanceTo(restoreWatch(saved),18);
assert.deepEqual(exportWatch(resumed),exportWatch(direct));

let solo=requestTask(createWatch({solo:true}),'keeper','repair');
solo=interruptTask(advanceTo(solo,5),'keeper');
solo=advanceTo(solo,18);
const result={
  scenario:'maintenance-watch',versions:{runtime:RUNTIME_VERSION,human:HUMAN_VERSION,clock:CLOCK_VERSION},
  assumptions:{arrivalMinute:18,repairMinutesRequired:12,lookoutMinutesRequired:8,initialParts:2,driverFloatTolerance:1e-10},
  refusal,interrupted,paired:getWatchView(direct),solo:getWatchView(solo),midActionSave:saved,resumeIdentical:true,
  finalSnapshotCharacters:JSON.stringify(exportWatch(direct)).length
};
process.stdout.write(JSON.stringify(result,null,2)+'\n');
