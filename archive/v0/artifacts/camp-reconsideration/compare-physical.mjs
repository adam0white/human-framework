// Compare existing records only; this is not another policy execution.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [input,output]=process.argv.slice(2);
assert.ok(input&&output,'Usage: compare-physical.mjs INPUT.json.gz NEW_OUTPUT.json');
const bytes=readFileSync(input),data=JSON.parse(gunzipSync(bytes));
const omitted=['version','recent','lastResponse','commitment.acceptedAt','commitment.reason'];
function projection(snapshot){const g=structuredClone(snapshot.game);delete g.version;delete g.recent;delete g.lastResponse;delete g.commitment.acceptedAt;delete g.commitment.reason;return g;}
const cases=[];let pairs=0;
for(const id of [...new Set(data.records.map(r=>r.caseId))]){
 const auto=data.records.find(r=>r.caseId===id&&r.arm==='automatic-reconsideration'),manual=data.records.find(r=>r.caseId===id&&r.arm==='release-and-rerequest');
 assert.equal(manual.operations.length,auto.operations.length+2);assert.equal(auto.states.length-1,manual.states.length-3);
 for(let i=1;i<auto.states.length;i++){assert.deepEqual(projection(auto.states[i]),projection(manual.states[i+2]));pairs++;}
 cases.push({caseId:id,automaticOperations:auto.operations.length,manualOperations:manual.operations.length,alignedStates:auto.states.length-1});
}
const report={status:'passed',scope:'Aligned existing states after the respective reconsideration actions through minute240. All game fields match except the listed version/communication/acceptance metadata. Not full save equality or measured human-effort benefit.',omittedFields:omitted,pairedStateChecks:pairs,cases,sourceRecordsSha256:createHash('sha256').update(bytes).digest('hex')};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,pairedStateChecks:pairs,cases:cases.length}));
