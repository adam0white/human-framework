/**
 * The playtester from the command line. Run with Node 24 after `npm run build -w packages/human` (the package
 * resolves HF through the workspace build when run under node):
 *
 *   node packages/playtester/examples/cohort.ts run game=pass [seeds=3] [personas=all|base|edge|<id,id>]
 *        [build=<label>] [minutes=<cap>] [out=<file.json>]
 *   node packages/playtester/examples/cohort.ts compare <before.json> <after.json>
 *   node packages/playtester/examples/cohort.ts design <summary.json> [designer=keeper|tightener]
 *   node packages/playtester/examples/cohort.ts session game=glance [persona=commuter] [seed=1]
 *
 * `game` is an adapter in ../adapters (pass, glance, voices); each reads its checkout from an env var (PASS_DIR,
 * GLANCE_DIR, MURMUR_DIR). `run` prints a short report and writes the `CohortSummary` JSON to `out`; `compare`
 * reads two summaries of the same game; `design` runs the designer experiment on one.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  BASE_PERSONAS,
  type CohortSummary,
  compareCohorts,
  DESIGNERS,
  type Designer,
  designReview,
  EDGE_PERSONAS,
  formatClarityReport,
  type GameAdapter,
  PERSONAS,
  type Persona,
  playSession,
  readSession,
  runCohort,
} from '../src/index.ts';

const [cmd, ...rest] = process.argv.slice(2);
const arg = (k: string, d?: string) => rest.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const files = rest.filter((a) => !a.includes('='));

async function adapter(game: string): Promise<{ make: (seed: number) => GameAdapter }> {
  return (await import(`../adapters/${game}.ts`)) as { make: (seed: number) => GameAdapter };
}

function personasOf(spec: string): Persona[] {
  const all = PERSONAS as Record<string, Persona>;
  const ids =
    spec === 'all'
      ? Object.keys(all)
      : spec === 'base'
        ? [...BASE_PERSONAS]
        : spec === 'edge'
          ? [...EDGE_PERSONAS]
          : spec.split(',');
  return ids.map((id) => {
    const p = all[id];
    if (!p) throw new Error(`no persona ${id}`);
    return p;
  });
}

const load = (f: string) => JSON.parse(readFileSync(f, 'utf8')) as CohortSummary;

if (cmd === 'run') {
  const game = arg('game', 'pass') as string;
  const { make } = await adapter(game);
  const seeds = Array.from({ length: Number(arg('seeds', '3')) }, (_, i) => i + 1);
  const name = make(0).name;
  const minutes = arg('minutes');
  const { summary } = runCohort({
    game: name,
    build: arg('build', name) as string,
    make,
    personas: personasOf(arg('personas', 'all') as string),
    seeds,
    ...(minutes ? { maxMinutes: Number(minutes) } : {}),
  });
  console.log(`${summary.game} ${summary.build}, seeds ${seeds.join(',')}`);
  for (const p of summary.personas) {
    const ret = p.returned ? `, came back ${p.returned.evenings}/${p.returned.possible}` : '';
    console.log(
      `  ${p.persona.padEnd(13)} ${String(p.minutes.mean).padStart(5)} min, ended ${JSON.stringify(p.ended)}, ` +
        `outcomes ${JSON.stringify(p.outcomes)}, bored ${p.boredSessions}/${p.sessions}, frustrated ` +
        `${p.frustratedSessions}/${p.sessions}, rewards ${p.rewardsPerSession}${p.provokedPerSession !== undefined ? ` (rose to ${p.provokedPerSession})` : ''}, quit at ${JSON.stringify(p.quitAt)}${ret}`,
    );
  }
  console.log(`  bored at ${JSON.stringify(summary.boredAt)}`);
  console.log(`  frustrated by ${JSON.stringify(Object.keys(summary.frustratedBy).slice(0, 3))}`);
  for (const e of summary.edges)
    console.log(`  edge ${e.kind} ${e.subject} [${e.label}]: ${e.reason} (${e.detail})`);
  console.log(formatClarityReport(summary.clarity));
  const out = arg('out');
  if (out) writeFileSync(out, `${JSON.stringify(summary, null, 1)}\n`);
} else if (cmd === 'compare') {
  const [a, b] = files;
  if (!a || !b) throw new Error('compare needs two summary files');
  for (const l of compareCohorts(load(a), load(b)).lines) console.log(l);
} else if (cmd === 'design') {
  const [f] = files;
  if (!f) throw new Error('design needs a summary file');
  const ids = arg('designer') ? [arg('designer') as string] : Object.keys(DESIGNERS);
  for (const id of ids) {
    const d = (DESIGNERS as Record<string, Designer>)[id];
    if (!d) throw new Error(`no designer ${id}`);
    console.log(`${designReview(load(f), d).text}\n`);
  }
} else if (cmd === 'session') {
  const { make } = await adapter(arg('game', 'pass') as string);
  const persona = personasOf(arg('persona', 'commuter') as string)[0] as Persona;
  const trace = playSession(make(Number(arg('seed', '1'))), persona, Number(arg('seed', '1')));
  const r = readSession(trace);
  console.log(`${persona.id}: ${r.ended.reason} after ${r.minutes} min at ${r.ended.clock} (${r.ended.why})`);
  for (const m of trace.moments.filter((x) => x.kind !== 'rewarded').slice(0, 12))
    console.log(
      `  ${Math.floor(m.t / 60)}:${String(m.t % 60).padStart(2, '0')} ${m.clock} ${m.kind}: ${m.text}`,
    );
  console.log(`  rewarded ${r.rewarded.length}x; final ${JSON.stringify(trace.final)}`);
} else {
  console.log('usage: cohort.ts run|compare|design|session (see the file header)');
}
