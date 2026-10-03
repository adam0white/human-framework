import {readFileSync, writeFileSync, readdirSync, cpSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [stage, previous, evidence] = process.argv.slice(2);
assert.match(stage, /^stages\/0[12]-[a-z-]+$/); assert.match(previous, /^stages\/0[01]-[a-z-]+$/); assert.match(evidence, /^evidence-[a-z-]+$/);
for (const directory of ['src', 'tests']) cpSync(directory, `${stage}/${directory}`, {recursive: true});
const measure = path => { const bytes = readFileSync(path); return {bytes: bytes.length, lines: bytes.toString().split('\n').length - (bytes.at(-1) === 10 ? 1 : 0), sha256: createHash('sha256').update(bytes).digest('hex')}; };
const changes = [];
for (const directory of ['src', 'tests']) {
  const names = new Set([...readdirSync(`${stage}/${directory}`), ...readdirSync(`${previous}/${directory}`)]);
  for (const name of [...names].sort()) {
    const path = `${directory}/${name}`;
    const before = readdirSync(`${previous}/${directory}`).includes(name) ? measure(`${previous}/${path}`) : null;
    const after = readdirSync(`${stage}/${directory}`).includes(name) ? measure(`${stage}/${path}`) : null;
    if (before?.sha256 !== after?.sha256) changes.push({path, before, after, byteDelta: (after?.bytes ?? 0) - (before?.bytes ?? 0), lineDelta: (after?.lines ?? 0) - (before?.lines ?? 0)});
  }
}
const beforeCosts = JSON.parse(readFileSync(`${previous}/costs.json`, 'utf8'));
const afterCosts = JSON.parse(readFileSync(`${evidence}/costs.json`, 'utf8'));
cpSync(`${evidence}/costs.json`, `${stage}/costs.json`);
const kit = JSON.parse(readFileSync('kit-manifest.json', 'utf8'));
for (const [path, expected] of Object.entries(kit.files)) assert.equal(measure(`kit/${path}`).sha256, expected);
const diffCount = path => { const source = readFileSync(path, 'utf8').split('\n'); return {added: source.filter(line => line.startsWith('+') && !line.startsWith('+++')).length, removed: source.filter(line => line.startsWith('-') && !line.startsWith('---')).length}; };
const result = {stage, previous, evidence, capturedAt: new Date().toISOString(), kitMatchesFrozenManifest: true, changes,
  sourceDiff: diffCount(`${evidence}/source.diff`), testsDiff: diffCount(`${evidence}/tests.diff`),
  runtimeBefore: beforeCosts.runtime, runtimeAfter: afterCosts.runtime,
  runtimeDelta: Object.fromEntries(['candidateInclusive', 'directInclusive'].map(arm => [arm, {bytes: afterCosts.runtime[arm].bytes - beforeCosts.runtime[arm].bytes, lines: afterCosts.runtime[arm].lines - beforeCosts.runtime[arm].lines}])),
  supportBefore: beforeCosts.support, supportAfter: afterCosts.support,
  stageMeasurementTools: readdirSync('stage-tools').filter(path => path.endsWith('.mjs')).map(path => ({path: `stage-tools/${path}`, ...measure(`stage-tools/${path}`)})),
  sourceDiffFile: `${evidence}/source.diff`, testsDiffFile: `${evidence}/tests.diff`};
writeFileSync(`${stage}/changes.json`, `${JSON.stringify(result, null, 2)}\n`);
const inventory = [];
function walk(directory) {
  for (const name of readdirSync(directory)) {
    const path = `${directory}/${name}`;
    if (path === `${stage}/freeze.json` || path === `${evidence}/capture-run.json`) continue;
    if (statSync(path).isDirectory()) walk(path); else inventory.push({path, ...measure(path)});
  }
}
walk(stage); walk(evidence);
writeFileSync(`${stage}/freeze.json`, `${JSON.stringify({stage, files: inventory}, null, 2)}\n`);
console.log(JSON.stringify({runtimeDelta: result.runtimeDelta, sourceDiff: result.sourceDiff, testsDiff: result.testsDiff, filesChanged: changes.map(file => file.path), freezeSHA256: measure(`${stage}/freeze.json`).sha256}, null, 2));
