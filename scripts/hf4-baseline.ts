/** Measurement only: unchanged HF 3.2. Node 26 strips types. JSONL stdout is retained outside Git.
 * Usage: node scripts/hf4-baseline.ts --mode=quick|year|antfarm|longrun|doze|selectors [--module=/absolute/dist/index.js]
 * [--seeds=1,2,...,10] [--days=365]. No time extrapolation. Each year checkpoint is one completed day.
 * Village workload comes from bench-thousand-lives.ts (four ring ties) and the real village world.
 * Longrun uses the real L5 routineFor fixture, not decision simulation; these fidelities are distinct.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statfsSync } from 'node:fs';
import { cpus, loadavg, totalmem } from 'node:os';
import { pathToFileURL } from 'node:url';
import type { Affordance, Person, PersonSpec } from '../packages/human/src/index.ts';
import { routineFor } from '../packages/human/test/longrun-fixture.ts';

const arg = (key: string, fallback: string) =>
  process.argv.find((a) => a.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const mode = arg('mode', 'quick');
const modulePath = arg('module', 'source');
const hf: typeof import('../packages/human/src/index.ts') = await import(
  modulePath === 'source' ? '../packages/human/src/index.ts' : pathToFileURL(modulePath).href
);
const seeds = arg('seeds', '1,2,3,4,5,6,7,8,9,10').split(',').map(Number);
const days = Number(arg('days', '365'));
if (
  !['quick', 'year', 'antfarm', 'longrun', 'doze', 'selectors'].includes(mode) ||
  seeds.some((s) => !Number.isInteger(s) || s < 1 || s > 10) ||
  !Number.isInteger(days) ||
  days < 1 ||
  days > 365
)
  throw new Error('Invalid mode, seeds or days');
const emit = (data: object) => console.log(JSON.stringify({ at: new Date().toISOString(), ...data }));
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const disk = () => {
  const d = statfsSync(process.cwd());
  return d.bavail * d.bsize;
};
if (disk() < 8 * 2 ** 30) throw new Error('Admission requires 8 GiB free disk');
const enable: NonNullable<PersonSpec['enable']> = {
  suggestionReasons: true,
  gists: true,
  yearbook: true,
  character: true,
  skillRetention: true,
  fatigueStore: true,
  fullness: true,
  bladder: true,
  projects: { protectProgress: true },
  persistence: true,
  curiosity: true,
  planning: { depth: 4, presentBias: 0.8 },
  promptings: {
    reading: 'fault',
    readingSource: 'host:benchmark-held-reading',
    echoRate: 0.1,
    practiceHalfLifeDays: 60,
    responses: [{ id: 'redirect', kind: 'redirect', practice: 0.4 }],
  },
  review: { style: 'accounting', styleSource: 'host:benchmark', at: 1260 },
  doze: { posture: 'upright', stimulation: 0.5 },
};
const selectors = {
  enable,
  breaks: [{ id: 'hide', label: 'rest at home', actions: ['rest', 'wait'], weight: 1, minutes: [120, 360] }],
  downed: { moving: 0.2, health: 0.3 },
  assentCost: {
    provenance: 'host:benchmark-pressure-assumption-not-calibrated',
    minStrength: 0.7,
    pressure: 0.1,
  },
  lexicon: {
    plainEnglish: true,
    wording: 'literal-v1',
    variety: true,
    nounActions: true,
    materialMeaning: 'food',
  },
  step: {
    forecastContext: 'conditioned',
    deathHandling: 'community',
    contagion: true,
    tellDeaths: true,
    necessity: true,
    lifecourse: { mortality: true, chronicOnsets: true },
    interruptSalience: hf.SIM_DEFAULTS.interruptSalience,
    maxEvents: 0,
  },
  longrun: {
    deathHandling: 'community',
    tellDeaths: true,
    upbringingMinutes: 240,
    upbringing: { model: 'warmth-through-25', voices: true },
    lifecourse: { mortality: true, chronicOnsets: true },
  },
  decide: { forecastContext: 'conditioned', necessity: true },
  conversation: { provenance: true, loyalWarning: true, confidentMin: 0.2 },
  observation: { inheritedAptitude: true },
  fitr: { enabled: true, eligible: true, amount: 1, from: 420, deadline: 600, action: 'pay-fitr' },
} as const;
const context = {
  kind: 'context',
  harnessSha256: createHash('sha256')
    .update(readFileSync(new URL(import.meta.url)))
    .digest('hex'),
  pid: process.pid,
  mode,
  seeds,
  days,
  modulePath,
  version: hf.FRAMEWORK_VERSION,
  engine: hf.ENGINE_VERSION,
  source: git('rev-parse', 'HEAD'),
  engineTree: git('rev-parse', 'HEAD:packages/human/src'),
  dirty: git('status', '--porcelain'),
  runtime: process.version,
  execPath: process.execPath,
  platform: process.platform,
  arch: process.arch,
  cpu: cpus()[0]?.model,
  logicalCpus: cpus().length,
  totalmem: totalmem(),
  load: loadavg(),
  freeDiskBytes: disk(),
  selectors,
  timing: 'concurrent machine; process CPU and load recorded; no quiet-machine or browser equivalence claim',
  alternatives:
    'catchUp events is separately sampled; eager main year. Longrun is declared coarse routine fidelity, not equivalent. Other mutually exclusive readings remain data, not simultaneously selectable.',
};
emit(context);
function person(seed: number, i: number, ids: string[], now = 420): Person {
  const id = ids[i];
  if (!id) throw new Error('Missing person id');
  const spec = hf.villagerSpec(id, id, seed * 1000 + i, {
    devout: i % 2 === 0,
    now,
    others: [1, 2, 3, 4].map((offset) => ids[(i + offset) % ids.length] as string),
  });
  spec.enable = structuredClone(enable);
  spec.lexicon = { ...selectors.lexicon };
  for (const c of spec.commitments ?? []) c.completion = 'end';
  spec.goals = [
    {
      id: 'harvest',
      label: 'Bring in food',
      serves: ['achievement'],
      importance: 0.6,
      advancedBy: [{ action: 'work-field', amount: 0.1 }],
      temporal: { halfLifeMinutes: 1440 },
    },
  ];
  const p = hf.createPerson(spec);
  hf.enableBreaks(
    p,
    selectors.breaks.map((b) => ({
      ...b,
      actions: [...b.actions],
      minutes: [b.minutes[0], b.minutes[1]] as [number, number],
    })),
  );
  hf.enableDowned(p, selectors.downed);
  hf.enableAssentCost(p, selectors.assentCost);
  // Real bounded successor claims, as in planning-control: opportunities advertise useful later work.
  hf.seedConsequences(p, 'familiar-field', [
    {
      id: 'field-cook',
      revision: 0,
      trigger: { action: 'work-field' },
      successor: { action: 'cook', duration: 30, effort: 0.3 },
      availableFrom: now,
      availableUntil: now + 1440,
      expiresAt: now + 1440,
      chance: 0.8,
      confidence: 0.8,
    },
  ]);
  if (
    p.projects?.behaviour !== 2 ||
    p.pursuit?.behaviour !== 2 ||
    !p.body.doze ||
    !p.affect.crisis ||
    !p.will.assentCost
  )
    throw new Error('All-on admission failed');
  return p;
}
function setup(seed: number, n: number, now = 420) {
  const ids = Array.from({ length: n }, (_, i) => `p${i}`);
  const people = ids.map((_, i) => person(seed, i, ids, now));
  return {
    people,
    community: hf.createCommunity(people),
    village: hf.createVillage(people, { seed, foodStock: n * 10 }),
  };
}
function state(people: Person[]) {
  const hash = createHash('sha256');
  let bytes = 0;
  for (const p of people) {
    const json = JSON.stringify(hf.snapshot(p));
    bytes += Buffer.byteLength(json, 'utf8');
    hash.update(json).update('\n');
  }
  return {
    bytesPerPerson: bytes / people.length,
    hash: hash.digest('hex'),
    alive: people.filter((p) => p.body.alive).length,
  };
}
function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)];
  return {
    samples: values.length,
    p50Ms: q(0.5),
    p95Ms: q(0.95),
    totalMs: values.reduce((a, b) => a + b, 0),
  };
}
function measured(f: () => void) {
  const cpu = process.cpuUsage();
  const t = performance.now();
  f();
  return { wallMs: performance.now() - t, cpu: process.cpuUsage(cpu) };
}
for (const seed of seeds) {
  if (disk() < 8 * 2 ** 30) throw new Error('Disk below 8 GiB');
  if (mode === 'quick') {
    for (const count of [14, 300]) {
      const s = setup(seed, 5, 720);
      const p = s.people[0];
      if (!p) throw new Error('Missing person');
      const real = s.village.affordancesFor(p);
      const offers: Affordance[] = Array.from({ length: count }, (_, i) => {
        const a = real[i % real.length];
        if (!a) throw new Error('No village offers');
        return { ...structuredClone(a), id: `${a.id}-${i}` };
      });
      // Variants preserve meaningful scenario effects/actions. The 300 arm is offer fanout, not 300 unique jobs.
      for (let i = 0; i < 20; i++) hf.decide(p, offers, selectors.decide);
      const times: number[] = [];
      const cpu = process.cpuUsage();
      for (let i = 0; i < 100; i++) {
        const t = performance.now();
        hf.decide(p, offers, selectors.decide);
        times.push(performance.now() - t);
      }
      emit({
        kind: 'decide',
        seed,
        offers: count,
        baseOffers: real.length,
        warmup: 20,
        ...stats(times),
        latenciesMs: times,
        cpu: process.cpuUsage(cpu),
        ...state([p]),
        load: loadavg(),
      });
    }
    for (const catchUp of [undefined, 'events'] as const) {
      const s = setup(seed, 20);
      const times: number[] = [];
      const result = measured(() => {
        for (let minute = 450; minute <= 1860; minute += 30) {
          const t = performance.now();
          hf.stepCommunity(s.community, s.village, minute, { ...selectors.step, catchUp });
          times.push(performance.now() - t);
        }
      });
      emit({
        kind: 'village-day',
        seed,
        people: 20,
        completedDays: 1,
        catchUp: catchUp ?? 'eager',
        stepMinutes: 30,
        ...result,
        ...stats(times),
        latenciesMs: times,
        ...state(s.people),
        load: loadavg(),
      });
    }
  } else if (mode === 'year' || mode === 'antfarm' || mode === 'longrun') {
    const n = mode === 'longrun' ? 25 : 200;
    const start = mode === 'antfarm' ? 360 : 0;
    const s = setup(seed, n, start);
    if (mode === 'antfarm') {
      const ageRng = hf.createRng(seed + 100000);
      for (const p of s.people) {
        p.life.bornAt = start - (20 + Math.floor(hf.random(ageRng) * 60)) * hf.MINUTES_PER_YEAR;
        p.social.relationships = [];
        hf.setRetention(p, { trace: 12, chronicleDays: 7 });
      }
      s.village.state.food = 20000;
    }
    // Exact daily partner construction from h3/ant-year-extension/probe.mjs; no actor-state pairing.
    const ids = s.people.map((p) => p.id);
    let order = [...ids];
    let pairingDay = -1;
    const world =
      mode !== 'antfarm'
        ? s.village
        : {
            ...s.village,
            affordancesFor(p: Person) {
              const d = Math.floor((p.now - start) / 1440);
              if (pairingDay !== d) {
                pairingDay = d;
                order = [...ids];
                const rng = hf.createRng(seed * 100000 + d);
                for (let i = n - 1; i > 0; i--) {
                  const j = Math.floor(hf.random(rng) * (i + 1));
                  const a = order[i];
                  const b = order[j];
                  if (!a || !b) throw new Error('Missing shuffle id');
                  order[i] = b;
                  order[j] = a;
                }
              }
              const base = s.village.affordancesFor(p);
              const social = base.filter((a) =>
                ['chat', 'help', 'apologize', 'steal-bread'].includes(a.action),
              );
              const out = base.filter((a) => !social.includes(a));
              const index = order.indexOf(p.id);
              for (const action of ['chat', 'help', 'apologize', 'steal-bread']) {
                const template = social.find((a) => a.action === action);
                if (!template) continue;
                for (const delta of [-2, -1, 1, 2]) {
                  const other = order[(index + delta + n) % n];
                  if (!other) throw new Error('Missing partner');
                  out.push({
                    ...template,
                    id: `${action}:${other}`,
                    label: `${action} ${other}`,
                    ...(action === 'chat' ? { with: [other] } : { targetId: other }),
                  });
                }
              }
              return out;
            },
          };
    const times: number[] = [];
    let totalMs = 0;
    const routine = routineFor(s.community);
    for (let day = 1; day <= days; day++) {
      if (disk() < 8 * 2 ** 30) throw new Error('Disk below 8 GiB');
      const result = measured(() => {
        if (mode !== 'longrun') hf.stepCommunity(s.community, world, start + day * 1440, selectors.step);
        else hf.liveCommunity(s.community, day * 1440, { ...selectors.longrun, routineFor: routine });
      });
      times.push(result.wallMs);
      totalMs += result.wallMs;
      emit({
        kind: 'checkpoint',
        seed,
        people: n,
        completedDays: day,
        targetDays: days,
        complete: day === days,
        fidelity:
          mode === 'longrun'
            ? 'L5 coarse routine'
            : mode === 'antfarm'
              ? 'fine antfarm matched topology/retention; all-on changes and half devout'
              : 'fine village',
        ...result,
        cumulativeMs: totalMs,
        ...stats(times),
        ...state(s.people),
        rss: process.memoryUsage().rss,
        load: loadavg(),
      });
    }
  } else if (mode === 'selectors') {
    const s = setup(seed, 2);
    const a = s.people[0];
    const b = s.people[1];
    if (!a || !b) throw new Error('Missing people');
    a.family ??= {};
    a.family.aptitudes = { farming: 1.1 };
    const observed = hf.observeSkill(a, 'farming', 30, 0.8, 'motor', selectors.observation);
    hf.setAmbient(a, {
      cold: 0.2,
      dark: 0.1,
      crowding: 0.3,
      beauty: 0.8,
      weather: 0.1,
      dayLength: 12,
      outdoors: true,
    });
    hf.receiveMethodCues(a, { contextId: 'field', cues: [{ cue: 'soil', value: 'dry' }] });
    const acquiredMethod = hf.demonstrateMethod(a, {
      id: 'water-field',
      demonstrationId: 'lesson1',
      contextId: 'field',
      conditions: [{ cue: 'soil', value: 'dry' }],
      action: 'work-field',
      sourceId: b.id,
      outcome: 'success',
      attention: 1,
    });
    hf.noteKnownBy(a, { otherId: b.id, act: { kind: 'help' }, via: 'seen' });
    hf.promise(a, {
      kind: 'abstain',
      actions: [],
      violatedBy: ['steal-bread'],
      from: a.now,
      until: a.now + 1440,
      completion: 'end',
      firm: true,
      importance: 0.7,
    });
    const practiceOffer: Affordance = {
      id: 'practice-field',
      action: 'work-field',
      label: 'practise farming',
      duration: 5,
      effort: 0.3,
      skill: { id: 'farming', difficulty: 0.4 },
      advertises: { competence: 0.1 },
    };
    const record = hf.decide(a, [practiceOffer], selectors.decide);
    if (!hf.begin(a, practiceOffer, record)) throw new Error('Practice did not begin');
    hf.tick(a, a.now + 5);
    hf.finish(a, {
      affordanceId: practiceOffer.id,
      action: practiceOffer.action,
      status: 'completed',
      at: a.now,
      practice: { quality: 0.8, instruction: { level: 0.9, engagement: 0.8, teacherId: b.id } },
      percepts: [
        {
          at: a.now,
          kind: 'help',
          summary: 'I helped with the field while my neighbour watched.',
          channel: 'outcome',
          actorId: a.id,
          witnesses: [b.id],
          salience: 1,
        },
      ],
    });

    hf.seedBelief(a, 'field:water-ready', { value: true, credence: 0.95, source: 'host:benchmark' });
    hf.seedBelief(a, `${b.id}:honesty`, { value: false, credence: 0.9, source: 'host:benchmark' });
    const conversation = hf.converse(a, b, { at: a.now, ...selectors.conversation });
    hf.perceive(b, conversation.told);
    hf.understandNorm(a, hf.ZAKAT_AL_FITR_NORM.id, 'obligatory', 0.8);
    const fitr = hf.zakatAlFitr(a, selectors.fitr);
    if (!fitr) throw new Error('Fitr selector not admitted');
    hf.promise(a, fitr.commitment);
    hf.promise(a, fitr.payment);
    hf.raise(b, { caregivers: [a] }, 240, { model: 'warmth-through-25', voices: true });
    emit({
      kind: 'context-selectors',
      seed,
      observed,
      acquiredMethod,
      conversationClaims: conversation.claims.length,
      fitr,
      ...state(s.people),
    });
  } else {
    for (const minutes of [60, 1440, 525600]) {
      const p = person(seed, 0, ['p0'], 0);
      const result = measured(() => hf.tick(p, minutes));
      emit({
        kind: 'doze-tick',
        seed,
        minutes,
        complete: true,
        ...result,
        ...state([p]),
        doze: p.body.doze,
        load: loadavg(),
      });
    }
    // Sustained living minute integration: host supplies ordinary food/water every hour, never revives.
    // Unlike the unfed whole-year tick above, this measures 525600 living minute boundaries.
    for (const posture of ['upright', 'seated'] as const) {
      const p = person(seed, 0, ['p0'], 0);
      hf.setDozeContext(p, { posture, stimulation: 0.1 });
      let livingHours = 0;
      const result = measured(() => {
        for (let hour = 1; hour <= 8760; hour++) {
          hf.consume(p, { food: 1, water: 1 });
          hf.tick(p, hour * 60);
          if (p.body.alive) livingHours++;
        }
      });
      emit({
        kind: 'doze-fed-year',
        seed,
        posture,
        minutes: 525600,
        livingHours,
        ...result,
        ...state([p]),
        doze: p.body.doze,
        load: loadavg(),
      });
    }
  }
}
emit({ kind: 'complete', mode, seeds, days, rss: process.memoryUsage().rss, load: loadavg() });
