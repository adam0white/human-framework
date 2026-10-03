import {writeFileSync} from 'node:fs';
import {candidate, candidatePump} from '../src/candidate-pump.js';
import {direct, directPump} from '../src/direct-pump.js';
import {importCases, importFixture} from '../tests/import-fixtures.js';
const [phase] = process.argv.slice(2);
if (!['red', 'green'].includes(phase)) throw new Error('Expected phase');
const records = [];
const outcome = callback => { try { callback(); return {accepted: true}; } catch (error) { return {accepted: false, error: error.message}; } };
for (const [arm, host, rules] of [['candidate', candidate, candidatePump], ['direct', direct, directPump]]) for (const spec of importCases) {
  const snapshot = importFixture(arm, spec);
  records.push({arm, name: spec.name, invariant: spec.invariant, snapshot,
    host: outcome(() => host.restoreState(snapshot)),
    component: outcome(() => rules.unpack(snapshot.state.pumps.south.work))});
}
writeFileSync(`evidence-import-corrections/${phase}-fixtures.json`, `${JSON.stringify({phase, node: process.version, records}, null, 2)}\n`);
console.log(JSON.stringify(records.map(({arm, name, host, component}) => ({arm, name, host, component})), null, 2));
