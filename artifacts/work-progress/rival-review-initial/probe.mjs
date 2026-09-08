import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as D from '/Users/abdul/code/human-framework/src/experiments/work-progress/camp-direct.js';
import * as F from '/Users/abdul/code/human-framework/src/experiments/work-progress/camp-fixed.js';
import {beginAttempt,advanceAttempt,finishAttempt} from '/Users/abdul/code/human-framework/src/human/v0.1.1.js';
const root='/Users/abdul/code/human-framework',directory='/tmp/work-progress-rival-audit-gft95dsh';
const sha=x=>createHash('sha256').update(x).digest('hex');
const paths=['src/experiments/work-progress/camp-direct.js','src/experiments/work-progress/camp-fixed.js','src/human/v0.1.1.js','src/core/model.js'];
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const sources=Object.fromEntries(paths.map(path=>{const bytes=readFileSync(`${root}/${path}`);assert.equal(sha(bytes),sha(execFileSync('git',['show',`${head}:${path}`],{cwd:root})));return[path,sha(bytes)];}));
const json=x=>JSON.parse(JSON.stringify(x));
function zeroConstructionMinute(person,item='work-1') {
 let p=beginAttempt(person,{actionId:'construct',targetId:item,durationMinutes:1,effort:0,exertive:true,activity:'active',skill:'construction'});
 assert.equal(p.pending.capacity.allowed,true);p=advanceAttempt(p,1);return finishAttempt(p,{attemptId:p.pending.id,status:'completed'});
}
const outcomes=[];
for(const [label,host] of [['D',D],['F',F]]) {
 const started=host.command(host.createWorld(),{type:'start',actor:'A',item:'work-1'});
 const one=host.advanceTo(started,1),twenty=host.advanceTo(started,20),twentyOne=host.advanceTo(twenty,21);
 const cases=[];
 // Same original complete stage, then a fake extra zero-fraction work exposure after its completion.
 const extra=host.exportWorld(twentyOne);
 extra.world.items['work-1'].contributions.A.minutes=21;
 extra.world.paid.A.work=21;extra.world.paid.A.recovery=0;extra.world.paid.A.construction=21;
 extra.world.people.A=zeroConstructionMinute(twenty.people.A);
 cases.push(['extra-terminal-exposure-21',host.exportWorld(twentyOne),extra]);
 // No tool exists anywhere in this fixture; one paid minute should be exactly 1/20.
 const inflated=host.exportWorld(one),credit=inflated.world.items['work-1'].contributions.A;
 const originalEffort=credit.effort;credit.fraction=1/6;credit.effort=.2/6;
 inflated.world.items['work-1'].progress=credit.fraction;
 inflated.world.paid.A.effort=credit.effort;
 inflated.world.people.A.body.fatigue+=credit.effort-originalEffort;
 cases.push(['inflated-no-tool-minute',host.exportWorld(one),inflated]);
 // All twenty paid construction minutes are retained, but output allegedly completed at minute one.
 const early=host.exportWorld(twenty);early.world.items['work-1'].completedAt=1;
 cases.push(['completion-at-one-with-20-paid-minutes',host.exportWorld(twenty),early]);
 // Additional same-family check: another actor earns a zero-fraction construction minute after settlement.
 const zero=host.exportWorld(twentyOne);
 zero.world.items['work-1'].contributions.B={basis:18,minutes:1,fraction:0,effort:0};
 zero.world.items['work-1'].basisPaid.B=0;
 zero.world.paid.B.work=1;zero.world.paid.B.recovery=20;zero.world.paid.B.construction=1;
 zero.world.people.B=zeroConstructionMinute(twenty.people.B);
 cases.push(['zero-terminal-recipient-exposure',host.exportWorld(twentyOne),zero]);
 for(const [name,baseline,changed] of cases) {
  assert.deepEqual(host.exportWorld(host.restoreWorld(json(baseline))),baseline);
  const before=JSON.stringify(changed);let outcome;
  try {
   const restored=host.restoreWorld(json(changed));
   outcome={accepted:true,roundtripPreservesChangedSnapshot:JSON.stringify(host.exportWorld(restored))===before,observation:host.observe(restored)};
  } catch(error) {outcome={accepted:false,error:error.message};}
  assert.equal(JSON.stringify(changed),before);
  const payload={host:label,name,baseline,changed,outcome};
  const filename=`${label}-${name}-${process.versions.node}.json`;
  writeFileSync(`${directory}/${filename}`,JSON.stringify(payload,null,2)+'\n',{flag:'wx'});
  outcomes.push({host:label,name,accepted:outcome.accepted,error:outcome.error??null,roundtripPreservesChangedSnapshot:outcome.roundtripPreservesChangedSnapshot??null,file:filename});
 }
}
for(const[path,hash]of Object.entries(sources))assert.equal(sha(readFileSync(`${root}/${path}`)),hash,'Source changed during audit');
writeFileSync(`${directory}/report-${process.versions.node}.json`,JSON.stringify({head,node:process.version,sources,scope:'Four bounded malicious current-snapshot probes per rival; no candidate/repair source read, no matrix execution, no repository edits',outcomes},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({directory,node:process.version,outcomes},null,2));
