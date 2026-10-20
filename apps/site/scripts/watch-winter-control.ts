/** Scenario-12 winter control. node apps/site/scripts/watch-winter-control.ts [fixture=<path>] */
import { writeFileSync } from 'node:fs';
import './play-watch.ts';

const { WatchRun, replay, ruleHash } = await import('../src/watch/sim/run.ts');
const { WINTER_RULES } = await import('../src/watch/sim/config.ts');
const result = [];
let milderExport: import('../src/watch/sim/run.ts').PlaytestExport | undefined;
for (const winter of ['hard', 'milder'] as const) {
  const run = new WatchRun(7);
  run.input({ k: 'winter', winter });
  run.input({ k: 'start' });
  const spawns = structuredClone(run.state.spawns);
  run.input({ k: 'begin' });
  let firstWarning = -1;
  for (let i = 0; i < 300; i++) {
    run.step();
    if (firstWarning < 0 && run.state.alerts.some((a) => a.kind === 'motion' || a.kind === 'sighted'))
      firstWarning = run.state.minute;
  }
  const exp = run.export();
  if (ruleHash(replay(exp)) !== exp.end.ruleHash) throw new Error('winter replay diverged');
  if (winter === 'milder') milderExport = exp;
  result.push({
    winter,
    threats: spawns.reduce((n, s) => n + s.count, 0),
    spawns,
    firstWarning,
    ruleHash: exp.end.ruleHash,
  });
}
const [hard, milder] = result;
if (!hard || !milder) throw new Error('missing control arm');
if (
  JSON.stringify(hard.spawns.map(({ at: _at, ...s }) => s)) !==
  JSON.stringify(milder.spawns.map(({ at: _at, ...s }) => s))
)
  throw new Error('threats changed');
console.table(
  result.map(({ winter, threats, spawns, firstWarning, ruleHash }) => ({
    winter,
    threats,
    firstPack: spawns[0]?.at,
    firstWarning,
    motionReach: WINTER_RULES[winter].motionReach,
    ruleHash,
  })),
);
console.log('Same threats, sizes and sections; later packs, earlier warning along each approach.');
const fixture = process.argv.find((a) => a.startsWith('fixture='))?.slice(8);
if (fixture && milderExport) writeFileSync(fixture, `${JSON.stringify(milderExport, null, 2)}\n`);
