import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
import {CASES,runCase,runComparison,writeEvidence} from '../scripts/signals-comparison.js';

test('matched arms share all paid predecision exposures, action options and atomic resume',()=>{
 const result=runComparison();assert.equal(result.cases.length,12);for(const c of result.cases){assert.equal(c.arms.length,3);for(const a of c.arms){assert.deepEqual(a.exposure,c.arms[0].exposure);assert.equal(a.resumeEqual,true);assert.equal(a.finalHost.state.person.version,'0.1.1');assert.deepEqual(a.offered,c.arms[0].offered);}}
});
test('simple notebook keeps newer observation while candidate preserves its stale-overwrite failure',()=>{
 const rows=runComparison().cases;const late=rows.find(c=>c.id==='late-old-reply'),n=late.arms.find(a=>a.arm==='notebook'),m=late.arms.find(a=>a.arm==='candidate');assert.equal(n.decision.report.value,'open');assert.equal(m.decision.report.value,'closed');assert.equal(n.outcome.delivered,true);assert.equal(m.outcome.delivered,false);assert.ok(n.exposure.deliveries.some(r=>r.observedAt<20&&r.deliveredAt===22));
 const old=rows.find(c=>c.id==='old-reply-falling');assert.equal(old.arms.find(a=>a.arm==='candidate').outcome.failedCrossings,1);assert.equal(old.arms.find(a=>a.arm==='notebook').outcome.failedCrossings,0);
});
test('retention can help an early service, while hidden changes and closing ties still defeat it',()=>{
 const retained=CASES.find(c=>c.id==='retained-open');assert.equal(runCase(retained,'notebook').outcome.launchSailed,true);assert.equal(runCase(retained,'none').outcome.launchSailed,false);
 const hidden=runCase(CASES.find(c=>c.id==='undisclosed-close'),'candidate');assert.equal(hidden.oracleReportAgrees,false);assert.equal(hidden.outcome.failedCrossings,1);
 for(const arm of ['candidate','notebook','none']){const r=runCase(CASES.find(c=>c.id==='deadline-tie'),arm);assert.equal(r.outcome.delivered,false);assert.equal(r.outcome.at,32);assert.equal(r.paid.canal,6);}
});
test('immediate ridge is retained as a cheaper universally successful primary-delivery baseline',()=>{
 const r=runComparison();const safe=r.baselines.filter(b=>b.route==='ridge');assert.equal(safe.length,4);assert.ok(safe.every(b=>b.outcome.delivered&&!b.outcome.launchSailed&&b.spent.charges===0&&b.spent.fares===0));assert.ok(r.baselines.some(b=>b.route==='canal'&&b.firstAttemptFailed));
});
test('evidence refuses missing paths and existing output; verifies committed protocol and sources',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'signals-evidence-'));try{const out=join(dir,'new.json');await writeEvidence(out);const result=JSON.parse(await readFile(out,'utf8'));assert.equal(result.protocol.verified,true);assert.match(result.sourceSha256['src/games/signals.js'],/^[a-f0-9]{64}$/);await assert.rejects(writeEvidence(out),e=>e.code==='EEXIST');const sentinel=join(dir,'sentinel.json');await writeFile(sentinel,'KEEP');await assert.rejects(writeEvidence(sentinel));assert.equal(await readFile(sentinel,'utf8'),'KEEP');assert.throws(()=>execFileSync(process.execPath,['scripts/signals-comparison.js'],{encoding:'utf8',stdio:'pipe'}),e=>e.status!==0);}finally{await rm(dir,{recursive:true,force:true});}
});
