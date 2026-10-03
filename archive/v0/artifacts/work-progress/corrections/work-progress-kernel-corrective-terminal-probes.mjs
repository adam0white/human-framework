import assert from 'node:assert/strict';
import * as work from '/Users/abdul/code/human-framework/src/experiments/work-progress/candidate.js';
const output={node:process.version,workVersion:work.WORK_VERSION,probes:[]};
for(const [name,aFraction,bFraction]of [['two_positive_terminal_deficits',.45,.55],['zero_physical_terminal_exposure',.5,.5]]){
 let state=work.createWork({id:'terminal',effort:.2,minimumDuration:1});
 for(const [workerId,basisMinutes]of [['A',4],['B',10]])state=work.prepareWorker(state,{workerId,basisMinutes});
 const snapshot=work.exportWork(state);snapshot.work.progress=1;snapshot.work.status='complete';
 Object.assign(snapshot.work.workers.A,{minutes:2,fraction:aFraction,effort:.2*aFraction});
 Object.assign(snapshot.work.workers.B,{minutes:6,fraction:bFraction,effort:.2*bFraction});
 const before=JSON.stringify(snapshot);let rejection=null;
 try{work.restoreWork(snapshot);}catch(error){rejection=error.message;}
 assert.equal(rejection,'Work cannot have multiple or zero-work terminal exposures');assert.equal(JSON.stringify(snapshot),before);
 output.probes.push({name,rejected:true,error:rejection,totalPaidMinutes:8,maximumPaidBasis:10,unchangedInput:true});
}
console.log(JSON.stringify(output,null,2));
