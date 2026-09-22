import test from 'node:test';
import assert from 'node:assert/strict';
import {compareSocialHosts} from '../scripts/social-contract-probe.js';
import {buildSite} from '../scripts/build.js';
import {RUNTIME_SOURCES} from '../scripts/package-runtime.js';

test('shared contracts must match the direct rivals across generated choices and malformed commands',()=>{
  const report=compareSocialHosts({runs:100,steps:80,seed:1701});
  assert.equal(report.mismatches.length,0,JSON.stringify(report.mismatches[0]));
  assert.equal(report.attemptedCommands,16000);
  assert.ok(report.acceptedCommands>3000);assert.ok(report.rejectedCommands>3000);
  assert.ok(report.completed.water>0);assert.ok(report.completed.work>0);
  assert.equal(report.saveResumeMismatches,0);assert.equal(report.mutationFailures,0);
});

test('the experimental social module and probe hosts stay outside public and runtime package assets',async()=>{
  const build=await buildSite();
  assert.equal(build.files.some(path=>path==='src/social/contracts.js'||path.startsWith('scripts/social-')),false);
  assert.equal(RUNTIME_SOURCES.some(path=>path.startsWith('src/social/')),false);
});
