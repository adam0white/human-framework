import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
const script=new URL('../scripts/coordination-probe.js',import.meta.url);
test('comparison requires a fresh explicit path, preserves sentinels, and emits bounded two-host parity evidence',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'coordination-probe-'));
  try {
    const missing=spawnSync(process.execPath,[script.pathname],{encoding:'utf8'});assert.notEqual(missing.status,0);assert.match(missing.stderr,/explicit fresh output path/);
    const occupied=join(dir,'sentinel.json');await writeFile(occupied,'retained evidence');
    const rejected=spawnSync(process.execPath,[script.pathname,occupied],{encoding:'utf8'});assert.notEqual(rejected.status,0);assert.equal(await readFile(occupied,'utf8'),'retained evidence');
    const fresh=join(dir,'fresh.json');execFileSync(process.execPath,[script.pathname,fresh],{encoding:'utf8'});
    const result=JSON.parse(await readFile(fresh,'utf8'));
    assert.ok(result.events.total<=10000);assert.ok(result.events.total>=9900);assert.equal(result.events.limit,10000);
    assert.equal(result.hosts.length,2);assert.ok(result.cases.length>=10);assert.equal(result.parity.allCommands,true);
    assert.equal(result.protocol.commit,'07907e027acc5ce52666ac80024650c2fff1866c');
    for(const c of result.cases){assert.equal(c.final.direct,c.final.candidate);assert.ok(c.commands>0);}
    assert.equal(result.longRun.final.direct,result.longRun.final.candidate);
    assert.ok(result.sizes.aggregate.candidateInclusive.bytes>result.sizes.aggregate.candidateCallers.bytes);
  } finally {await rm(dir,{recursive:true,force:true});}
});
