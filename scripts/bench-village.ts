/**
 * Headless village run for process-level benchmarks (hyperfine): `node scripts/bench-village.ts [people] [days]`,
 * default 20 people for 30 days, half of them devout, seed 7, no event cap. It imports the framework source
 * directly (Node strips the types), so the measured time includes Node start-up and module loading as well as
 * the simulation. It prints the event count and a hash of the final snapshots, so two runs of the same commit
 * can be checked for identical output. Run under hyperfine with `npm run bench:hyperfine`.
 */
import { createHash } from 'node:crypto';
import {
  createCommunity,
  createPerson,
  createVillage,
  MINUTES_PER_DAY,
  snapshot,
  stepCommunity,
  villagerSpec,
} from '../packages/human/src/index.ts';

const people = Number(process.argv[2] ?? 20);
const days = Number(process.argv[3] ?? 30);
if (!Number.isInteger(people) || people < 1 || !Number.isInteger(days) || days < 1) {
  throw new Error('usage: node scripts/bench-village.ts [people] [days]');
}

const START = 7 * 60;
const ids = Array.from({ length: people }, (_, i) => `p${String(i).padStart(2, '0')}`);
const persons = ids.map((id, i) =>
  createPerson(villagerSpec(id, id, 100 + i, { devout: i % 2 === 0, others: ids, now: START })),
);
const village = createVillage(persons, { seed: 7, foodStock: 10 * people });
const community = createCommunity(persons);

const t0 = performance.now();
const events = stepCommunity(community, village, START + days * MINUTES_PER_DAY);
const ms = performance.now() - t0;

const hash = createHash('sha256')
  .update(JSON.stringify(community.people.map(snapshot)))
  .digest('hex')
  .slice(0, 12);
console.log(
  `village ${people} x ${days} days: ${events.length} events, ${ms.toFixed(0)} ms in step, state ${hash}`,
);
