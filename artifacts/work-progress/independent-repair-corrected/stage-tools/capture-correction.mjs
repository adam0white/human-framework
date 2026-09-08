import {readFileSync, writeFileSync, readdirSync, cpSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const measure = path => { const value = readFileSync(path); return {path, bytes: value.length, lines: value.toString().split('\n').length - (value.at(-1) === 10 ? 1 : 0), sha256: createHash('sha256').update(value).digest('hex')}; };
const sum = paths => paths.reduce((result, path) => { const value = measure(path); result.bytes += value.bytes; result.lines += value.lines; return result; }, {bytes: 0, lines: 0});
const beforeStage = 'stages/03-package-only', finalStage = 'stages/04-import-corrections';
for (const directory of ['src', 'tests']) cpSync(directory, `${finalStage}/${directory}`, {recursive: true});
for (const path of ['package.json', 'package-lock.json']) cpSync(path, `${finalStage}/${path}`);
const human = ['kit-corrected/src/human/v0.1.1.js', 'kit-corrected/src/core/model.js'];
const beforeCommon = [`${beforeStage}/src/yard.js`, `${beforeStage}/src/shape.js`, ...human];
const afterCommon = ['src/yard.js', 'src/shape.js', 'src/import-exposure.js', ...human];
const packageOnly = {shared: sum(beforeCommon), candidateInclusive: sum([...beforeCommon, `${beforeStage}/src/candidate-pump.js`, 'kit-corrected/candidate.js']), directInclusive: sum([...beforeCommon, `${beforeStage}/src/direct-pump.js`])};
const final = {shared: sum(afterCommon), candidateInclusive: sum([...afterCommon, 'src/candidate-pump.js', 'kit-corrected/candidate.js']), directInclusive: sum([...afterCommon, 'src/direct-pump.js'])};
const beforeInstalled = JSON.parse(readFileSync('stages/02-two-pumps/costs.json', 'utf8')).runtime;
const delta = (a, b) => ({bytes: a.bytes - b.bytes, lines: a.lines - b.lines});
const changed = [];
for (const name of readdirSync('src')) {
  const old = readdirSync(`${beforeStage}/src`).includes(name) ? measure(`${beforeStage}/src/${name}`) : {bytes: 0, lines: 0, sha256: null};
  const current = measure(`src/${name}`);
  if (old.sha256 !== current.sha256) changed.push({path: `src/${name}`, before: old, after: current, delta: delta(current, old)});
}
const kitChecks = [];
for (const [directory, manifestFile] of [['kit', 'kit-manifest.json'], ['kit-corrected', 'kit-corrected-manifest.json']]) {
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  for (const [path, hash] of Object.entries(manifest.files)) assert.equal(measure(`${directory}/${path}`).sha256, hash);
  kitChecks.push({directory, files: Object.keys(manifest.files).length, unchanged: true});
}
const legacy = [];
for (const path of ['stages/01-gasket/freeze.json', 'stages/02-two-pumps/freeze.json']) {
  const saved = JSON.parse(readFileSync(path, 'utf8'));
  for (const file of saved.files) assert.equal(measure(file.path).sha256, file.sha256);
  legacy.push({path, unchanged: true, sha256: measure(path).sha256});
}
const red = JSON.parse(readFileSync('evidence-import-corrections/red-fixtures.json', 'utf8'));
const green = JSON.parse(readFileSync('evidence-import-corrections/green-fixtures.json', 'utf8'));
assert.equal(red.records.length, green.records.length);
for (let i = 0; i < red.records.length; i++) { assert.deepEqual(red.records[i].snapshot, green.records[i].snapshot); assert.equal(green.records[i].host.accepted, false); }
const tools = ['stage-tools/check-legal-histories.mjs', 'stage-tools/record-import-cases.mjs', 'stage-tools/capture-correction.mjs'].map(measure);
const result = {beforeInstalled: {candidateInclusive: beforeInstalled.candidateInclusive, directInclusive: beforeInstalled.directInclusive},
  packageOnly, packageDelta: {candidateInclusive: delta(packageOnly.candidateInclusive, beforeInstalled.candidateInclusive), directInclusive: delta(packageOnly.directInclusive, beforeInstalled.directInclusive)},
  final, hostCorrectionDelta: {candidateInclusive: delta(final.candidateInclusive, packageOnly.candidateInclusive), directInclusive: delta(final.directInclusive, packageOnly.directInclusive)},
  changedHostSource: changed, packageCandidateSource: {before: measure('kit/candidate.js'), after: measure('kit-corrected/candidate.js')},
  metadata: [measure('package.json'), measure('package-lock.json'), measure('kit-corrected/package.json')],
  finalSupport: JSON.parse(readFileSync('evidence-import-corrections/costs.json', 'utf8')).support,
  additionalCorrectionMeasurementTools: tools, kitChecks, acceptedStages: legacy,
  identicalRedGreenFixtures: true, redAcceptedInvalid: red.records.filter(record => record.host.accepted).length,
  finalRejectedInvalid: green.records.filter(record => !record.host.accepted).length,
  scope: 'Package-only compatibility separately recorded from common host and direct rule import corrections; no new saved fields.'};
writeFileSync(`${beforeStage}/costs.json`, `${JSON.stringify({packageOnly, packageDelta: result.packageDelta, metadata: result.metadata, kitChecks}, null, 2)}\n`);
writeFileSync(`${finalStage}/changes.json`, `${JSON.stringify(result, null, 2)}\n`);
cpSync('evidence-import-corrections/costs.json', `${finalStage}/costs.json`);
for (const [stage, evidence] of [[beforeStage, 'evidence-package-only'], [finalStage, 'evidence-import-corrections']]) {
  const files = [];
  function walk(directory) { for (const name of readdirSync(directory)) {
    const path = `${directory}/${name}`;
    if (path === `${stage}/freeze.json` || path.endsWith('/capture-run.json')) continue;
    if (statSync(path).isDirectory()) walk(path); else files.push(measure(path));
  } }
  walk(stage); walk(evidence);
  writeFileSync(`${stage}/freeze.json`, `${JSON.stringify({stage, files}, null, 2)}\n`);
}
console.log(JSON.stringify({packageOnly, final, packageDelta: result.packageDelta, hostCorrectionDelta: result.hostCorrectionDelta,
  changedHostSource: changed.map(file => ({path: file.path, ...file.delta})),
  preservedStagesAndKits: true, identicalRedGreenFixtures: true,
  manifests: [measure(`${beforeStage}/freeze.json`), measure(`${finalStage}/freeze.json`)]}, null, 2));
