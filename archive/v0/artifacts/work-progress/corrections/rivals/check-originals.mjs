import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as D from '/Users/abdul/code/human-framework/src/experiments/work-progress/camp-direct.js';
import * as F from '/Users/abdul/code/human-framework/src/experiments/work-progress/camp-fixed.js';
const directory='/tmp/work-progress-rival-correction-21dcgrov',root='/Users/abdul/code/human-framework';
const original=JSON.parse(readFileSync(`${directory}/original-audit/report-26.8.1.json`));
const sha=x=>createHash('sha256').update(x).digest('hex');
const sources=Object.fromEntries(['camp-direct','camp-fixed'].map(name=>[name,sha(readFileSync(`${root}/src/experiments/work-progress/${name}.js`))]));
const results=[];
for(const test of original.outcomes) {
 const host=test.host==='D'?D:F,record=JSON.parse(readFileSync(`${directory}/original-audit/${test.file}`));
 assert.deepEqual(host.exportWorld(host.restoreWorld(record.baseline)),record.baseline);
 let error=null;try {host.restoreWorld(record.changed);}catch(caught){error=caught.message;}
 assert.ok(error,`${test.host}/${test.name} still accepted`);
 results.push({host:test.host,name:test.name,baselineExact:true,originalAccepted:test.accepted,correctedAccepted:false,error,inputFile:test.file,inputSha256:sha(readFileSync(`${directory}/original-audit/${test.file}`))});
}
writeFileSync(`${directory}/corrected-${process.versions.node}.json`,JSON.stringify({node:process.version,originalSources:original.sources,correctedWorkspaceSources:sources,results},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({node:process.version,baselinesExact:results.length,rejectedOriginalForgeries:results.length,sources},null,2));
