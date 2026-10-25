/**
 * Measurement only. Native Node >=24: node scripts/bench-thousand-lives.ts [bench:100|bench:1000|coarse10000]
 * Defaults: bench:100, one day, one round, seed 7, 90 second admission budget. No warmup.
 * Larger populations or spans require --allow-large; e.g. coarse10000 --allow-large --days=30,365.
 * --rounds=, --seed=, --budget-seconds= are explicit bounded overrides. Maximum 365 days / 3 rounds / 180s.
 * Each checkpoint includes state JSON (including any inline yearbook), not external archives or world JSON.
 * Fine: real village driver, four ring neighbours per person (not a complete social graph), half devout.
 * One disruption: village food stock becomes zero at the start of day 1 (second day).
 * Coarse: real liveCommunity; host routine changes from work to repair on day 1 only.
 * This is a routine disruption, NOT a simulated food shortage. No equivalence to fine stepping is claimed.
 * Coarse holds body/needs, closes expired commitments without missed counts; no decisions, conversation,
 * joint work, contagion, world percepts or affordances. Decays, skill practice and summaries run as implemented.
 * Starvation means a meaningful decision opportunity with no non-idle choice. Unavailable: the APIs do not
 * expose a host-independent meaningful-opportunity predicate; coarse does not decide. Idle is NOT a proxy.
 * Check disk space before allocation/day: no admission below 8 GiB available, stop below 5 GiB.
 * Budget and disk checks occur between engine calls; a synchronous engine day cannot be preempted here.
 * JSON lines are small. Day reports/events are discarded after each day; no retained population snapshots.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statfsSync } from 'node:fs';
import { homedir, loadavg } from 'node:os';
import {
  createCommunity,
  createPerson,
  createVillage,
  liveCommunity,
  MINUTES_PER_DAY,
  type Routine,
  snapshot,
  stepCommunity,
  villagerSpec,
} from '../packages/human/src/index.ts';

const args = process.argv.slice(2);
const profile = args.find((a) => !a.startsWith('--')) ?? 'bench:100';
const profiles: Record<string, number> = { 'bench:100': 100, 'bench:1000': 1000, coarse10000: 10000 };
const people = profiles[profile];
const value = (key: string, fallback: string) =>
  args.find((a) => a.startsWith(`--${key}=`))?.split('=')[1] ?? fallback;
const days = value('days', '1').split(',').map(Number);
const rounds = Number(value('rounds', '1'));
const seed = Number(value('seed', '7'));
const budget = Number(value('budget-seconds', '90'));
const known = /^(--allow-large|--(days|rounds|seed|budget-seconds)=.+|bench:100|bench:1000|coarse10000)$/;
if (
  !people ||
  args.some((a) => !known.test(a)) ||
  !Number.isInteger(seed) ||
  seed < 0 ||
  seed > 0xffffffff ||
  !Number.isInteger(rounds) ||
  rounds < 1 ||
  rounds > 3 ||
  !Number.isFinite(budget) ||
  budget < 1 ||
  budget > 180 ||
  days.length > 4 ||
  days.some((d) => !Number.isInteger(d) || d < 1 || d > 365) ||
  ((people > 100 || Math.max(...days) > 1 || rounds > 1) && !args.includes('--allow-large'))
)
  throw new Error('Invalid or unapproved size. See script header; larger runs require --allow-large.');
const checkpoints = [...new Set(days)].sort((a, b) => a - b);
const coarse = profile === 'coarse10000';
const started = performance.now();
const git = (...a: string[]) => execFileSync('git', a, { encoding: 'utf8' }).trim();
function availableGiB(): number {
  const disk = statfsSync(homedir());
  return (disk.bavail * disk.bsize) / 2 ** 30;
}
function gate(admit: boolean): void {
  const available = availableGiB();
  if (available < (admit ? 8 : 5)) throw new Error(`Disk gate: ${available.toFixed(2)} GiB available`);
  if (performance.now() - started >= budget * 1000) throw new Error('Wall admission budget exhausted');
}
const emit = (data: unknown) => console.log(JSON.stringify(data));
emit({
  kind: 'context',
  at: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  hfRef: git('rev-parse', 'HEAD'),
  dirty: git('status', '--porcelain').length > 0,
  hfVersion: JSON.parse(readFileSync(new URL('../packages/human/package.json', import.meta.url), 'utf8'))
    .version,
  profile,
  people,
  checkpoints,
  rounds,
  seed,
  budgetSeconds: budget,
  load: loadavg(),
  timing: 'concurrent-machine observation; no quiet-machine claim; no warmup',
  starvation: null,
  starvationReason: coarse
    ? 'coarse stepping does not decide'
    : 'meaningful opportunity predicate unavailable',
  bytes:
    'UTF-8 snapshot JSON per person; includes inline yearbook if enabled; external archives and world excluded',
  fidelity: coarse
    ? 'liveCommunity host routine; body/needs held; no decisions or world; see header'
    : 'stepCommunity village; four ring neighbours; maxEvents=0 caps log only',
});
try {
  for (let round = 1; round <= rounds; round++) {
    gate(true);
    const setupStart = performance.now();
    const ids = Array.from({ length: people }, (_, i) => `p${i}`);
    const persons = ids.map((id, i) =>
      createPerson(
        villagerSpec(id, id, (seed + 100 + i) >>> 0, {
          devout: i % 2 === 0,
          now: 0,
          others: [1, 2, 3, 4].map((offset) => ids[(i + offset) % people] as string),
        }),
      ),
    );
    const community = createCommunity(persons);
    const village = coarse ? null : createVillage(persons, { seed, foodStock: 10 * people });
    const normal: Routine = { activities: [{ action: 'work', minutes: 240, tags: ['work'], valence: 0.1 }] };
    const disrupted: Routine = {
      activities: [{ action: 'repair', minutes: 240, tags: ['work'], valence: -0.2 }],
    };
    emit({ kind: 'setup', round, wallMs: performance.now() - setupStart, rss: process.memoryUsage().rss });
    let stepMs = 0;
    let cpuUserUs = 0;
    let cpuSystemUs = 0;
    for (let day = 0; day < Math.max(...checkpoints); day++) {
      gate(false);
      if (day === 1 && village) village.state.food = 0;
      const cpu = process.cpuUsage();
      const before = performance.now();
      if (coarse)
        liveCommunity(community, (day + 1) * MINUTES_PER_DAY, {
          routineFor: () => (day === 1 ? disrupted : normal),
        });
      else if (village) stepCommunity(community, village, (day + 1) * MINUTES_PER_DAY, { maxEvents: 0 });
      stepMs += performance.now() - before;
      const used = process.cpuUsage(cpu);
      cpuUserUs += used.user;
      cpuSystemUs += used.system;
      if (!checkpoints.includes(day + 1)) continue;
      const digest = createHash('sha256');
      let bytes = 0;
      let yearbooks = 0;
      for (const p of persons) {
        const json = JSON.stringify(snapshot(p));
        bytes += Buffer.byteLength(json);
        digest.update(json).update('\n');
        if (p.chronicleYears) yearbooks++;
      }
      emit({
        kind: 'checkpoint',
        round,
        days: day + 1,
        scheduledPersonDays: people * (day + 1),
        stepWallMs: stepMs,
        msPerScheduledPersonDay: stepMs / (people * (day + 1)),
        cpuUserUs,
        cpuSystemUs,
        bytesPerPerson: bytes / people,
        inlineYearbooks: yearbooks,
        alive: persons.filter((p) => p.body.alive).length,
        hash: digest.digest('hex'),
        starvedDecisions: null,
        disruptionReached: day >= 1,
        processWallMs: performance.now() - started,
        rss: process.memoryUsage().rss,
        load: loadavg(),
      });
    }
  }
} catch (error) {
  emit({ kind: 'stopped', reason: String(error), wallMs: performance.now() - started });
  process.exitCode = 2;
}
