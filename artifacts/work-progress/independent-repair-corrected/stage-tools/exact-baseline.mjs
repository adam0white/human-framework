import {readFileSync, writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {candidate} from '../stages/00-baseline/src/candidate-pump.js';
import {direct} from '../stages/00-baseline/src/direct-pump.js';
const records = [];
function differences(a, b, path = '', result = []) {
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
    for (const key of Object.keys(a)) differences(a[key], b[key], `${path}.${key}`, result);
  } else if (!Object.is(a, b)) result.push({path, candidate: a, direct: b});
  return result;
}
for (let history = 1; history <= 7; history++) {
  const data = JSON.parse(readFileSync(`evidence/H${history}.json`, 'utf8'));
  const runsA = data.runs.candidate, runsB = data.runs.direct;
  const differencesFound = [];
  for (let driver = 0; driver < runsA.length; driver++) {
    assert.equal(runsA[driver].checkpoints.length, runsB[driver].checkpoints.length);
    for (let index = 0; index < runsA[driver].checkpoints.length; index++) {
      const a = candidate.projection(candidate.restoreState(runsA[driver].checkpoints[index].snapshot));
      const b = direct.projection(direct.restoreState(runsB[driver].checkpoints[index].snapshot));
      for (const field of ['minute', 'origins', 'people', 'paid', 'occupied', 'seal', 'tooling', 'hauling', 'decision']) assert.deepEqual(a[field], b[field]);
      assert.deepEqual(a.pump.permission, b.pump.permission); assert.equal(a.pump.finishedAt, b.pump.finishedAt);
      assert.equal(a.pump.work.coverage, b.pump.work.coverage);
      const found = differences(a, b);
      assert.ok(found.every(entry => /^\.pump\.work\.hands\.(mara|tomas)\.effort$/.test(entry.path)));
      if (found.length) differencesFound.push({driver: runsA[driver].driver, roundTrip: runsA[driver].roundTrip, checkpoint: index, minute: a.minute, differences: found});
    }
  }
  records.push({history: `H${history}`, strictFullProjectionEqual: differencesFound.length === 0,
    actualPeoplePaidLedgersProgressTimingResourcesConsentExactlyEqual: true, differencesFound});
}
writeFileSync('stages/00-baseline/exact-comparison.json', `${JSON.stringify({criterion: 'Object.is on scalar values and exact field sets; no rounding or added state', strictFullProjectionCriterionMet: false, records}, null, 2)}\n`);
console.log(JSON.stringify(records.map(record => ({history: record.history, unequalCheckpointsAcrossRepeatedDrivers: record.differencesFound.length, firstDifference: record.differencesFound[0]})), null, 2));
