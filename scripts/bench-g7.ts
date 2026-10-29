/** Opt-in workload benchmark. Node 26: node scripts/bench-g7.ts child|valley --mode quick|profile|full [--valley-repo /absolute/path] */
import { deepStrictEqual } from 'node:assert';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { cpus, loadavg } from 'node:os';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createPerson,
  createRun,
  exportRun,
  readRunHistory,
  replay,
  restoreRun,
  step,
} from '../packages/human/src/index.ts';
import { authoredPerson, DAY, exampleSpec, need, START } from './bench-g7-child-host.ts';

const args = process.argv.slice(2);
const workload = args[0];
function option(name: string) {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args[i + 1];
}
const mode = option('--mode') ?? 'quick';
function archiveControl(raw: string, history: unknown) {
  const path = option('--archive');
  if (path) writeFileSync(path, raw);
  const baseline = option('--baseline-archive');
  if (!baseline) return;
  const before = JSON.parse(readFileSync(baseline, 'utf8'));
  const after = JSON.parse(raw);
  deepStrictEqual(after.initial, before.initial, 'Initial authoring or parameters changed');
  deepStrictEqual(after.current, before.current, 'Reached simulation state changed');
  deepStrictEqual(
    history,
    Array.isArray(before.history) ? before.history : readRunHistory(before),
    'Accepted transaction semantics changed',
  );
  console.log(JSON.stringify({ stage: 'baseline-equality', initial: true, current: true, history: true }));
}

if (!workload || !['child', 'valley'].includes(workload) || !['quick', 'profile', 'full'].includes(mode))
  throw new Error(
    'Usage: node scripts/bench-g7.ts child|valley --mode quick|profile|full [--valley-repo /absolute/path]',
  );
console.log(
  JSON.stringify({
    workload,
    mode,
    acceptanceRun: mode === 'full',
    node: process.version,
    cpu: cpus()[0]?.model,
    load: loadavg(),
  }),
);
if (workload === 'child') {
  const year = 365.25 * DAY;
  const spec = exampleSpec(21);
  spec.host = { id: 'world', edition: 'child-g7-budget-1', schema: 'child-g7-budget-1' };
  const run = need(createRun(spec));
  const cast = [
    ['elif', 'Elif', 3, 'female'],
    ['Zehra', 'Zehra', 31, 'female'],
    ['Yusuf', 'Yusuf', 34, 'male'],
    ['Maryam', 'Maryam', 68, 'female'],
    ['Danyal', 'Danyal', 52, 'male'],
    ['Tariq', 'Tariq', 16, 'male'],
  ] as const;
  const traits: Record<string, readonly [number, number, number, number, number, number]> = {
    Yusuf: [0.75, 0.4, 0.5, 0.6, 0.85, 0.5],
    Maryam: [0.8, 0.6, 0.6, 0.8, 0.8, 0.4],
    Danyal: [0.9, 0.4, 0.4, 0.7, 0.8, 0.5],
    Tariq: [0.6, 0.3, 0.7, 0.6, 0.5, 0.7],
  };
  for (const [id, name, age, sex] of cast) {
    const p = authoredPerson(id, name, sex);
    p.identity.birthAt = START - age * year;
    const values = traits[id];
    if (values)
      p.state.traits = {
        honesty: values[0],
        emotionality: values[1],
        extraversion: values[2],
        agreeableness: values[3],
        conscientiousness: values[4],
        openness: values[5],
      };
    need(createPerson(run, p));
  }
  const fidelity = { mode: 'daily', dayMs: DAY, anchor: START } as const;
  const months = mode === 'full' ? 36 : mode === 'profile' ? 1 : 0;
  const ends = months
    ? Array.from({ length: months }, (_, i) => Math.ceil((3 * 365.25 * (i + 1)) / 36))
    : [1];
  let elapsed = 0,
    from = 0,
    count = 0;
  for (const end of ends) {
    const inputs = [];
    for (let day = from; day < end; day++)
      for (const hour of [1, 7, 13, 19])
        for (const [id] of cast)
          inputs.push({
            id: `meal-${day}-${hour}-${id}`,
            at: START + day * DAY + hour * 3600000,
            source: { type: 'host' as const, id: 'world' },
            kind: 'body.received' as const,
            payload: {
              person: id,
              evidenceId: `food-${day}-${hour}-${id}`,
              receipt: {
                type: 'consumed' as const,
                actionReceipt: `meal-${day}-${hour}-${id}`,
                received: { food: 0.5, water: 0.5 },
              },
            },
          });
    const t = performance.now();
    const result = need(step(run, { until: START + end * DAY, fidelity, inputs }));
    elapsed += performance.now() - t;
    count += inputs.length;
    from = end;
    if (!result.reachedUntil || result.boundary.type !== 'until')
      throw new Error(JSON.stringify(result.boundary));
    console.log(JSON.stringify({ stage: 'checkpoint', days: end, stepMs: elapsed }));
  }
  const exportStart = performance.now();
  const raw = JSON.stringify(exportRun(run));
  const exportMs = performance.now() - exportStart;
  const archive = JSON.parse(raw);
  archiveControl(raw, readRunHistory(archive));
  const t = performance.now();
  const restored = need(restoreRun(archive));
  const restoreMs = performance.now() - t;
  const restoreExact = JSON.stringify(exportRun(restored)) === raw;
  const r = performance.now();
  const verified = need(replay(archive));
  const replayMs = performance.now() - r;
  const replayExact = verified.verified && verified.fullHash === archive.hashes.full;
  console.log(
    JSON.stringify({
      stage: 'result',
      days: from,
      people: 6,
      inputs: count,
      stepMs: elapsed,
      msPerYearPerson: elapsed / ((from / 365.25) * 6),
      archiveBytes: Buffer.byteLength(raw),
      exportMs,
      restoreMs,
      restoreExact,
      replayMs,
      replayExact,
      hash: archive.hashes.full,
      stepBudgetMs: 2000,
      stepWithinBudget: mode === 'full' ? elapsed <= 2000 : null,
      restoreBudgetMs: 2000,
      restoreWithinBudget: mode === 'full' ? restoreMs <= 2000 : null,
      scope:
        'Reduced Child workload; no lessons, relationships or sleep activities. Full uses 36 calls and 1096 days.',
    }),
  );
  if (!restoreExact || !replayExact) throw new Error('Child exactness failed');
} else {
  const repo = option('--valley-repo');
  if (!repo || !isAbsolute(repo))
    throw new Error(
      '--valley-repo must be an absolute path to the preserved Valley HF4 candidate with its dependencies installed',
    );
  const term = args.includes('--term');
  if (term && mode !== 'full') throw new Error('--term requires --mode full');
  if (mode === 'full' && !term && !args.includes('--worker')) {
    const child = spawn(
      process.execPath,
      [resolve(import.meta.dirname, 'bench-g7.ts'), ...args, '--worker'],
      { stdio: 'inherit' },
    );
    const timer = setTimeout(() => {
      console.error('Day-12 120-second deadline exceeded');
      child.kill('SIGTERM');
    }, 120000);
    const code = await new Promise<number>((resolveExit) =>
      child.on('exit', (status) => resolveExit(status ?? 1)),
    );
    clearTimeout(timer);
    process.exit(code);
  }
  const base = resolve(repo);
  const game = await import(pathToFileURL(resolve(base, 'src/sim/game.ts')).href);
  // Resolve the same physical HF package used by the game; this is not necessarily this checkout.
  const require = createRequire(resolve(base, 'package.json'));
  const hf = (await import(
    pathToFileURL(require.resolve('@adam0white/human-framework')).href
  )) as typeof import('../packages/human/src/index.ts');
  const ownerInputs = [
    {
      verb: 'call',
      job: 'reap-agha',
      houses: ['kavak', 'ak', 'coban', 'dere', 'kara', 'demirci', 'kuyucu', 'tepe'],
      at: 2580,
    },
    { verb: 'visit', house: 'coban', why: 'birth', at: 3510 },
    { verb: 'give', house: 'coban', kile: 6, at: 3930 },
    { verb: 'give', house: 'tepe', kile: 6, at: 5130 },
    { verb: 'give', house: 'kuyucu', kile: 6, at: 5370 },
    { verb: 'give', house: 'demirci', kile: 6, at: 5520 },
    { verb: 'give', house: 'ak', kile: 6, at: 5670 },
    { verb: 'visit', house: 'dere', at: 7590 },
    { verb: 'visit', house: 'tepe', at: 7980 },
    { verb: 'visit', house: 'kara', at: 8280 },
    { verb: 'visit', house: 'coban', at: 8730 },
    { verb: 'visit', house: 'demirci', at: 9630 },
    { verb: 'visit', house: 'ak', at: 10080 },
    { verb: 'visit', house: 'kuyucu', at: 10530 },
    { verb: 'visit', house: 'kavak', at: 11190 },
  ];
  const target = term ? (game.END_DAY + 1) * 1440 : mode === 'full' ? 17550 : mode === 'profile' ? 1440 : 450;
  const t = performance.now();
  const g = game.newGame(406153184, undefined, false, true, 'valley-public-2026-10');
  let last = 419;
  for (let next = 1440; next < target; next += 1440) {
    game.step(
      g,
      next,
      ownerInputs.filter((i) => i.at > last),
    );
    last = next;
    const a = game.stateJson(g.valley).community.archive;
    if (!a) throw new Error('missing native archive');
    console.log(
      JSON.stringify({
        stage: 'checkpoint',
        minute: g.valley.minute,
        wholeHostMs: performance.now() - t,
        archiveBytes: Buffer.byteLength(JSON.stringify(a)),
        historyBytes: Buffer.byteLength(JSON.stringify(a.history)),
        currentBytes: Buffer.byteLength(JSON.stringify(a.current)),
        acceptedInputs: g.inputs.length,
      }),
    );
  }
  game.step(
    g,
    target,
    ownerInputs.filter((i) => i.at > last),
  );
  const wholeHostMs = performance.now() - t;
  const exportStart = performance.now();
  const state = game.stateJson(g.valley);
  const archive = state.community.archive;
  if (!archive) throw new Error('missing native archive');
  const raw = JSON.stringify(archive);
  const exportMs = performance.now() - exportStart;
  const parsed = JSON.parse(raw);
  archiveControl(raw, hf.readRunHistory ? hf.readRunHistory(parsed) : parsed.history);
  const rt = performance.now();
  const restored = need(hf.restoreRun(parsed));
  const restoreMs = performance.now() - rt;
  const restoreExact = JSON.stringify(hf.exportRun(restored)) === raw;
  const rp = performance.now();
  const verified = need(hf.replay(parsed));
  const replayMs = performance.now() - rp;
  const replayExact = verified.verified && verified.fullHash === archive.hashes.full;
  console.log(
    JSON.stringify({
      stage: 'result',
      minute: g.valley.minute,
      people: Object.keys(archive.current.people).length,
      initialPeople: archive.initial.people.length,
      wholeHostMs,
      msPerYearPerson:
        wholeHostMs / (((g.valley.minute - 420) / (1440 * 365.25)) * archive.initial.people.length),
      normalization: 'Elapsed game years times initially authored people; not integrated actor-years',
      archiveBytes: Buffer.byteLength(raw),
      exportMs,
      restoreMs,
      restoreExact,
      replayMs,
      replayExact,
      hash: archive.hashes.full,
      acceptedInputs: g.inputs.length,
      budgetMs: term ? null : mode === 'full' ? 120000 : null,
      termEnded: g.valley.flags.ended,
      hfPackage: require.resolve('@adam0white/human-framework'),
      scope:
        'Whole host includes game stepping and daily archive checkpoints. Native restore/replay timed separately; no isolated HF step time is claimed. Full is the day-12 gate unless --term is supplied; term uses the same owner inputs through the end day and must report the ending.',
    }),
  );
  if (!restoreExact || !replayExact) throw new Error('Valley native exactness failed');
}
