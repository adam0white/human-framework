/**
 * Headless 4.0 run for process-level benchmarks (hyperfine): `node scripts/bench-run.ts [people] [hours]`,
 * default 6 fixture people for 6 hours in one-minute steps, with no inputs. It imports the framework source
 * directly (Node strips the types), so the time includes Node start-up and module loading. It prints the event
 * count and the archive's full hash, so two runs of the same commit can be checked for identical output.
 * Run under hyperfine with `npm run bench:hyperfine`.
 */
import { exportRun, step } from '../packages/human/src/index.ts';
import { benchRun } from '../packages/human/test/run-bench-fixture.ts';
import { accepted } from '../packages/human/test/run-numerical-fixture.ts';

const people = Number(process.argv[2] ?? 6),
  hours = Number(process.argv[3] ?? 6);
if (!Number.isInteger(people) || people < 1 || !Number.isInteger(hours) || hours < 1)
  throw new Error('usage: node scripts/bench-run.ts [people >= 1] [hours >= 1]');
const run = benchRun(people);
let events = 0;
for (let minute = 1; minute <= hours * 60; minute++)
  events += accepted(step(run, { until: minute * 60_000, inputs: [] })).events.length;
console.log(JSON.stringify({ people, hours, events, hash: exportRun(run).hashes.full }));
