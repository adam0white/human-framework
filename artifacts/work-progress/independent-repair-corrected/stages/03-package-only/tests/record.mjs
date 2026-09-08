import {readFileSync, writeFileSync, realpathSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {candidate} from '../src/candidate-pump.js';
import {direct} from '../src/direct-pump.js';
import {histories, oracle, runHistory} from './histories.js';

const root = realpathSync(new URL('..', import.meta.url));
const evidenceDirectory = process.argv[2] ?? 'evidence';
assert.match(evidenceDirectory, /^evidence(?:-[a-z-]+)?$/);
const write = (path, value) => writeFileSync(`${root}/${path.replace(/^evidence\//, `${evidenceDirectory}/`)}`, `${JSON.stringify(value, null, 2)}\n`);
const measure = path => {
  const source = readFileSync(`${root}/${path}`);
  return {path, bytes: source.length, lines: source.toString().split('\n').length - (source.at(-1) === 10 ? 1 : 0), sha256: createHash('sha256').update(source).digest('hex')};
};
const compare = (a, b, details, path = '') => {
  if (typeof a === 'number' && typeof b === 'number') {
    const gap = Math.abs(a - b); details.comparedNumericFields++;
    if (gap > details.maxAbsoluteDifference) { details.maxAbsoluteDifference = gap; details.maxDifferencePath = path; }
    if (!Object.is(a, b)) {
      assert.match(path, /\.pumps\.(south|north)\.work\.hands\.(mara|tomas)\.effort$/);
      details.rawDifferences.push({path, candidate: a, direct: b});
    }
    assert.ok(gap <= 1e-10, `${path} differs`);
  } else if (a && b && typeof a === 'object' && typeof b === 'object') {
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
    for (const key of Object.keys(a)) compare(a[key], b[key], details, `${path}.${key}`);
  } else assert.equal(a, b);
};
const summary = [];
for (const name of Object.keys(histories)) {
  const runs = {};
  for (const [arm, host] of [['candidate', candidate], ['direct', direct]]) {
    runs[arm] = [];
    for (const driver of ['minute', 'event', 'uneven']) for (const roundTrip of [false, true]) runs[arm].push(runHistory(host, name, driver, roundTrip));
  }
  const comparison = {comparedNumericFields: 0, maxAbsoluteDifference: 0, maxDifferencePath: null, rawDifferences: []};
  const candidateReference = runs.candidate[0], directReference = runs.direct[0];
  assert.equal(candidateReference.checkpoints.length, directReference.checkpoints.length);
  for (let i = 0; i < candidateReference.checkpoints.length; i++) {
    compare(candidate.projection(candidate.restoreState(candidateReference.checkpoints[i].snapshot)),
      direct.projection(direct.restoreState(directReference.checkpoints[i].snapshot)), comparison, `checkpoint[${i}]`);
  }
  comparison.strictFullProjectionEqual = comparison.rawDifferences.length === 0;
  comparison.peoplePaidProgressTimingResourcesExactlyEqual = true;
  const expected = oracle(name), result = candidateReference.projection;
  for (const [id, pump] of Object.entries(result.pumps)) assert.equal(pump.finishedAt, expected.pumps[id]);
  for (const arm of ['candidate', 'direct']) for (const run of runs[arm]) assert.deepEqual(run.final, runs[arm][0].final);
  const metadata = {history: name, specification: histories[name], arithmeticOracle: expected,
    completionMinute: Math.max(...Object.values(result.pumps).map(pump => pump.finishedAt)),
    completionByPump: Object.fromEntries(Object.entries(result.pumps).map(([id, pump]) => [id, pump.finishedAt])), paid: result.paid, comparison,
    maxSnapshotBytes: Object.fromEntries(['candidate', 'direct'].map(arm => [arm, Math.max(...runs[arm].flatMap(run => run.checkpoints.map(c => Buffer.byteLength(JSON.stringify(c.snapshot)))))])),
    interpretation: 'One prescribed history, with repeated advance/restore drivers; not independent empirical samples.'};
  write(`evidence/${name}.json`, {metadata, runs}); summary.push(metadata);
}
write('evidence/comparison.json', {endpoint: 40, tolerance: 1e-10, prescribedHistories: Object.keys(histories).length, driverConfigurations: Object.keys(histories).length * 12, summary});
const shared = ['src/yard.js', 'src/shape.js', 'kit/src/human/v0.1.1.js', 'kit/src/core/model.js'];
const candidateOnly = ['src/candidate-pump.js', 'kit/candidate.js'];
const directOnly = ['src/direct-pump.js'];
const support = ['tests/histories.js', 'tests/repair.test.js', 'tests/record.mjs', 'package.json', 'kit/package.json'];
const all = [...shared, ...candidateOnly, ...directOnly, ...support].map(measure);
const sum = paths => ({bytes: paths.reduce((total, path) => total + all.find(file => file.path === path).bytes, 0), lines: paths.reduce((total, path) => total + all.find(file => file.path === path).lines, 0)});
const span = (path, from, until) => {
  const source = readFileSync(`${root}/${path}`, 'utf8');
  const start = source.indexOf(from), finish = source.indexOf(until, start);
  assert.ok(start >= 0 && finish > start);
  return {path, startLine: source.slice(0, start).split('\n').length, endLine: source.slice(0, finish).split('\n').length - 1,
    bytes: Buffer.byteLength(source.slice(start, finish)), note: 'Literal contiguous source span; not a complexity or maintenance metric.'};
};
write('evidence/costs.json', {files: all,
  runtime: {shared: {...sum(shared), files: shared}, candidateOnly: {...sum(candidateOnly), files: candidateOnly}, directOnly: {...sum(directOnly), files: directOnly},
    candidateInclusive: sum([...shared, ...candidateOnly]), directInclusive: sum([...shared, ...directOnly])},
  support: {...sum(support), files: support, note: 'Tests, recording/oracle and package metadata reported separately; they are part of this experiment, not omitted labor.'},
  validationSpans: [span('src/yard.js', '  function validate(state)', '  return Object.freeze'), span('src/yard.js', '  function restoreState(snapshot)', '  function projection'),
    span('src/direct-pump.js', '  unpack(record)', '  inspect:'), span('kit/candidate.js', 'function validate(work)', 'export function createWork')],
  validationNotes: ['The whole src/shape.js file is shared validation/freezing support.', 'Human validation is retained inside the counted Human and core source files.', 'Candidate item validation costs count in full through kit/candidate.js.', 'Direct omits redundant contribution effort storage; shared host validation still reconciles .20 times contribution coverage against separately paid effort.', 'Both host arms use the same host restore function and tests. Extra general candidate behavior is not tested or credited as a one-pump benefit.']});
const frozenKit = ['kit/API.md', 'kit/HUMAN.md', 'kit/candidate.js', 'kit/package.json', 'kit/src/human/v0.1.1.js', 'kit/src/core/model.js', 'kit/src/runtime/index.js', 'kit/src/runtime/clock.js'].map(measure);
write('evidence/kit-after.json', {root, files: frozenKit});
console.log(JSON.stringify({histories: summary.map(s => ({history: s.history, at: s.completionMinute, maxDifference: s.comparison.maxAbsoluteDifference, bytes: s.maxSnapshotBytes})),
  candidateInclusive: sum([...shared, ...candidateOnly]), directInclusive: sum([...shared, ...directOnly]), evidenceBytes: ['comparison.json', ...Object.keys(histories).map(name => `${name}.json`)].reduce((n, name) => n + statSync(`${root}/${evidenceDirectory}/${name}`).size, 0)}, null, 2));
