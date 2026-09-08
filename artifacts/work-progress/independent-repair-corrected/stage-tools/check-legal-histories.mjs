import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {histories, runHistory} from '../tests/histories.js';
const [phase, mode = 'record'] = process.argv.slice(2);
assert.ok(['package-only', 'import-corrections'].includes(phase));
const sourceDirectory = phase === 'package-only' ? 'stages/03-package-only/src' : 'src';
const {candidate} = await import(`../${sourceDirectory}/candidate-pump.js`);
const {direct} = await import(`../${sourceDirectory}/direct-pump.js`);
const directory = `evidence-${phase}`, comparisons = [];
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const source = ['candidate-pump.js', 'direct-pump.js', 'yard.js', 'shape.js'].map(name => ({path: `${sourceDirectory}/${name}`, unchangedFromTwoPumpStage: hash(`${sourceDirectory}/${name}`) === hash(`stages/02-two-pumps/src/${name}`)}));
if (phase === 'package-only') assert.ok(source.every(file => file.unchangedFromTwoPumpStage));
for (const name of Object.keys(histories)) {
  const previous = JSON.parse(readFileSync(`evidence-two-pumps/${name}.json`, 'utf8'));
  const runs = {};
  for (const [arm, host] of [['candidate', candidate], ['direct', direct]]) {
    runs[arm] = [];
    for (const driver of ['minute', 'event', 'uneven']) for (const roundTrip of [false, true]) {
      const run = runHistory(host, name, driver, roundTrip);
      const old = previous.runs[arm][runs[arm].length];
      const expected = structuredClone(old);
      if (arm === 'candidate') {
        const snapshots = [expected.final, ...expected.checkpoints.map(checkpoint => checkpoint.snapshot)];
        for (const snapshot of snapshots) for (const pump of Object.values(snapshot.state.pumps)) {
          assert.equal(pump.work.work.version, '0.1.0'); pump.work.work.version = '0.1.1';
        }
      }
      assert.deepEqual(run, expected); // Only candidate wire component-version metadata was adjusted above.
      runs[arm].push(run);
    }
  }
  if (mode === 'verify') assert.deepEqual(runs, JSON.parse(readFileSync(`${directory}/legal-${name}.json`, 'utf8')));
  else writeFileSync(`${directory}/legal-${name}.json`, `${JSON.stringify(runs, null, 2)}\n`);
  comparisons.push({history: name, bothArmsAllDriversAndRoundTripsExactToStage2: true});
}
console.log(JSON.stringify({node: process.version, phase, source, comparisons, adjustedComparisonMetadataOnly: 'candidate raw work version 0.1.0 -> 0.1.1', originalRecordsModified: false, physicalFieldsExactlyEqual: true}, null, 2));
