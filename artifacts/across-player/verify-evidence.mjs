// Post-outcome integrity probes. This does not alter the frozen study inputs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import * as host from '../../src/games/across-cut.js';
import * as receiver from '../../src/games/across-cut-receiver.js';
import * as player from '../../src/games/across-cut-player.js';
import {verifyRecord,verifyFreeze,hash} from './compare.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const freeze=JSON.parse(readFileSync(resolve(root,'artifacts/across-player/freeze.json')));
verifyFreeze(root,freeze);
for(const [path,identity]of Object.entries(freeze.files))if(/\.(?:js|mjs)$/.test(path))assert.equal(hash(readFileSync(resolve(root,path))),identity.sha256,`Working source must still equal the evaluated source: ${path}`);
const inputPath=resolve(root,'artifacts/across-player/initial/results.json.gz');
const evidence=JSON.parse(gunzipSync(readFileSync(inputPath)));
const inputs=JSON.parse(readFileSync(resolve(root,'artifacts/across-player/inputs.json')));
assert.equal(hash(inputs),evidence.inputsSha256);
const modules={host,receiver,player,inputs};
const policy=evidence.records.find(record=>record.id==='P2/radio-adaptive');
const receipt=evidence.records.find(record=>record.id==='I-stop-restored');
const checks=[];
for(const original of [policy,receipt]){verifyRecord(original,modules);checks.push({name:`original ${original.id}`,passed:true});}
for(const [name,original,change]of [
 ['initial setup changed',policy,record=>record.initialSave.state.config.inletMinutes=2],
 ['controller relabeled',policy,record=>record.armId='joint-cart-first-conservative'],
 ['actor input changed',policy,record=>record.events[3].inputs.keeper.view.now=2],
 ['decision reason changed',policy,record=>record.events[3].decisions.keeper.reason='Different private policy'],
 ['world metric changed',policy,record=>record.metrics.water.lost=1],
 ['unregistered identity',policy,record=>record.caseId='unknown'],
 ['receipt choice relabeled',receipt,record=>record.choice='continue'],
 ['receipt source time changed',receipt,record=>record.receiptView.inbox[0].sentAt=1],
 ['receipt restoration claim changed',receipt,record=>record.restoredEqual=false]
]){
 const changed=structuredClone(original);change(changed);assert.throws(()=>verifyRecord(changed,modules));checks.push({name,passed:true});
}
const outputs={format:'across-player-integrity-probes',version:1,scope:'Post-outcome source-specific verification, not additional comparison cases or independent outcome samples.',sourceCommit:freeze.sourceCommit,freezeSha256:hash(freeze),inputSha256:hash(readFileSync(inputPath)),probeSha256:hash(readFileSync(fileURLToPath(import.meta.url))),node:process.version,checks};
const out=process.argv[2];assert.ok(out,'Provide a fresh output path.');mkdirSync(dirname(resolve(out)),{recursive:true});writeFileSync(out,JSON.stringify(outputs,null,2)+'\n',{flag:'wx'});
process.stdout.write(`Passed ${checks.length} original/rejection integrity checks.\n`);
