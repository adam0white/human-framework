/** Game 2 wall-clock budget. Run with `npm run bench`; the outcome is asserted in game.test.ts. */
import { expect, test } from 'vitest';
import type { StandingWhisper } from '../protocol.ts';
import { finishSilentMonth, startSilentMonth } from './counterfactual.ts';
import { SHIPPED_SEED, VoiceGame } from './game.ts';
import { play } from './headless.ts';

/** Budget multiplier: 1 on the quiet dev machine the budgets were set on; CI sets `BENCH_SCALE` (see ci.yml). */
const SCALE = Number(
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.BENCH_SCALE ?? 1,
);

const WHISPERS: StandingWhisper[] = [
  { choiceId: 'doctor', strength: 'mention', appeal: 'safety' },
  { choiceId: 'selin', strength: 'mention', appeal: 'benevolence' },
];

test('a 12-day skip under two standing whispers runs in under 1.5 s', () => {
  const g = new VoiceGame(SHIPPED_SEED);
  play(g, { stop: (x) => x.phase === 'between' && x.day === 2 });
  expect(g.between?.next?.skipped).toBe(12);
  const t0 = performance.now();
  g.advance(WHISPERS);
  const ms = performance.now() - t0;
  console.log(`voice 12-day skip: ${ms.toFixed(0)} ms`);
  expect(g.day).toBe(15);
  expect(ms).toBeLessThan(1500 * SCALE);
});

test('the month you never spoke (a whole silent run, Stretch S1) runs in under 8 s', () => {
  const t0 = performance.now();
  const g = finishSilentMonth(startSilentMonth(SHIPPED_SEED));
  const ms = performance.now() - t0;
  console.log(`voice silent month: ${ms.toFixed(0)} ms`);
  expect(g.phase).toBe('report');
  expect(ms).toBeLessThan(8000 * SCALE);
}, 60_000);
