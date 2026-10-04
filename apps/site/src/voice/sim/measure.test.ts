/**
 * The balance table of docs/games/voice-build.md §13, as a probe. Skipped in `npm test`; run with
 * `VOICE_MEASURE=1 npx vitest run apps/site/src/voice/sim/measure.test.ts --silent=false` to print it.
 * `VOICE_SEEDS=7,1,2` picks the seeds (default: the shipped seed and four more).
 */
import { test } from 'vitest';
import { SHIPPED_SEED } from './game.ts';
import { type Measured, measure, STYLES } from './players.ts';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const SEEDS = (env.VOICE_SEEDS ?? `${SHIPPED_SEED},1,2,3,4`).split(',').map(Number);

const NUMERIC: (keyof Measured)[] = [
  'smokeDays',
  'eidSmokes',
  'habit',
  'walks',
  'mornings',
  'shifts',
  'paidByDate',
  'paidByEid',
  'trust',
  'calls',
  'clinic',
  'suhoors',
  'sleepHours',
  'sleepAll',
  'restHours',
  'lateNights',
  'prayers',
  'missedPrayers',
  'insisted',
];

test.skipIf(!env.VOICE_MEASURE)(
  'Game 2 balance table (probe)',
  () => {
    const out: Record<string, unknown>[] = [];
    for (const [name, o] of Object.entries(STYLES)) {
      const runs = SEEDS.map((s) => measure(o, s));
      const row: Record<string, unknown> = { name };
      for (const k of NUMERIC) {
        const xs = runs.map((r) => r[k] as number);
        const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
        row[k] = `${+mean.toFixed(2)} [${+Math.min(...xs).toFixed(2)}–${+Math.max(...xs).toFixed(2)}]`;
      }
      row.keptDate = runs.filter((r) => r.paidByDate >= 300).length;
      row.eidPrayer = runs.filter((r) => r.eidPrayer).length;
      const answers: Record<string, number> = {};
      for (const r of runs) for (const [t, n] of Object.entries(r.answers)) answers[t] = (answers[t] ?? 0) + n;
      row.answers = answers;
      row.pays = runs.map((r) => r.pays).join(' | ');
      out.push(row);
    }
    console.log(`seeds ${SEEDS.join(',')}\n${JSON.stringify(out, null, 1)}`);
  },
  1_800_000,
);
