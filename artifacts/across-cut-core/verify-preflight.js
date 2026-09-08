/** Verify retained original evidence using its original Git bytes, without overwriting it. */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url));
const saved=JSON.parse(readFileSync(new URL('preflight.json',import.meta.url),'utf8'));
const evidenceCommit='26110c3ec05ef4fe2ebfdcd9e22a7107a402e7b7';
const correctedCommit='b3ec6942cbb6fb27b3c9a892934ff83b281fd8ba';
const bytes=(commit,path)=>execFileSync('git',['show',`${commit}:${path}`],{cwd:root});
const hash=x=>createHash('sha256').update(x).digest('hex');
assert.equal(hash(bytes(evidenceCommit,'artifacts/across-cut-core/run-preflight.js')),saved.runnerSha256);
const temp=mkdtempSync(join(tmpdir(),'across-cut-original-'));
try{
 const versions=[];
 for(const commit of [saved.sourceCommit,correctedCommit]){
  const folder=join(temp,commit);mkdirSync(folder,{recursive:true});writeFileSync(join(folder,'package.json'),'{"type":"module"}\n');
  const manifest=[];
  for(const entry of saved.manifest){const source=bytes(commit,entry.path);if(commit===saved.sourceCommit)assert.equal(hash(source),entry.sha256);const output=join(folder,entry.path);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,source);manifest.push({path:entry.path,sha256:hash(source),bytes:source.length});}
  const h=await import(pathToFileURL(join(folder,'src/experiments/across-cut/host.js')));let verified=0;
  for(const run of saved.results){const state=h.restoreState(run.save);assert.deepEqual(h.exportState(state),run.save);assert.deepEqual(h.getWorldSummary(state),run.world);verified++;}
  versions.push({commit,verified,manifest});
 }
 const report={node:process.version,evidenceCommit,originalArtifactSha256:hash(readFileSync(new URL('preflight.json',import.meta.url))),originalRunnerSha256:saved.runnerSha256,verificationRunnerSha256:hash(readFileSync(fileURLToPath(import.meta.url))),versions};
 if(process.argv.includes('--write'))writeFileSync(new URL('preflight-verification.json',import.meta.url),`${JSON.stringify(report,null,2)}\n`);
 console.log(JSON.stringify({node:report.node,originalSource:saved.sourceCommit,correctedSource:correctedCommit,versions:versions.map(({commit,verified})=>({commit,verified})),originalArtifactUnchanged:true},null,2));
}finally{rmSync(temp,{recursive:true,force:true});}
