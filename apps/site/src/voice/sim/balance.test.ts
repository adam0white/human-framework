/**
 * The range of Game 2 (voice-build.md §13, ninth pass): with only the player's tools, a bad voice ends the month
 * materially worse than silence and a good one materially better, while his own will keeps some things out of the
 * player's reach. Thresholds sit well inside the measured gaps (seeds 7, 1, 2, 3, 4 barely differ).
 */
import { beforeAll, describe, expect, test } from 'vitest';
import { SHIPPED_SEED } from './game.ts';
import { type Measured, measure, STYLES } from './players.ts';

const SEEDS = [SHIPPED_SEED, 1];
type Row = Omit<Measured, 'answers' | 'pays' | 'eidPrayer'> & { answers: Record<string, number> };

function mean(name: string): Row {
  const opts = STYLES[name];
  if (!opts) throw new Error(name);
  const runs = SEEDS.map((s) => measure(opts, s));
  const out: Record<string, unknown> = { answers: {} };
  for (const k of Object.keys(runs[0] ?? {}) as (keyof Measured)[]) {
    if (typeof runs[0]?.[k] === 'number')
      out[k] = runs.reduce((a, r) => a + (r[k] as number), 0) / runs.length;
  }
  const answers = out.answers as Record<string, number>;
  for (const r of runs) for (const [t, n] of Object.entries(r.answers)) answers[t] = (answers[t] ?? 0) + n;
  return out as Row;
}

/** Outcomes where `r` is materially worse than `base` (the smallest gap that counts is beside each). */
function worse(r: Row, base: Row): string[] {
  const out: string[] = [];
  if (r.smokeDays >= base.smokeDays + 3) out.push('smoke days');
  if (r.suhoors <= base.suhoors - 2) out.push('suhoor meals');
  if (r.sleepAll <= base.sleepAll - 1.5) out.push('sleep');
  if (r.lateNights >= base.lateNights + 3) out.push('late nights');
  if (r.mornings <= base.mornings - 2) out.push('mornings worked');
  if (r.paidByEid <= base.paidByEid - 100) out.push('rent by Eid');
  if (r.calls <= base.calls - 3) out.push('calls to Selin');
  if (r.trust <= base.trust - 0.2) out.push('trust');
  return out;
}
function better(r: Row, base: Row): string[] {
  const out: string[] = [];
  if (r.smokeDays <= base.smokeDays - 5) out.push('smoke days');
  if (r.paidByEid >= base.paidByEid + 200) out.push('rent by Eid');
  if (r.paidByDate >= base.paidByDate + 200) out.push("Osman's date");
  if (r.clinic >= base.clinic + 1) out.push('clinic');
  if (r.calls >= base.calls + 3) out.push('calls to Selin');
  if (r.trust >= base.trust + 0.08) out.push('trust');
  return out;
}

describe('Game 2 range: how far the player can move the month', () => {
  const rows: Record<string, Row> = {};
  beforeAll(() => {
    for (const n of ['Silent', 'Tempter', 'Tempter, no whisper', 'Saboteur', 'Guardian']) rows[n] = mean(n);
  }, 300_000);
  const row = (n: string) => rows[n] as Row;

  test('a bad voice ends materially worse than silence on at least two outcomes', () => {
    // 'Tempter, no whisper' holds without the rest whisper (heard at every hour, a recorded defect).
    for (const n of ['Tempter', 'Tempter, no whisper', 'Saboteur']) {
      const w = worse(row(n), row('Silent'));
      expect(w.length, `${n}: ${w.join(', ')}`).toBeGreaterThanOrEqual(2);
    }
  });

  test('a good voice ends materially better than silence on at least two outcomes', () => {
    const b = better(row('Guardian'), row('Silent'));
    expect(b.length, b.join(', ')).toBeGreaterThanOrEqual(2);
    expect(b).toContain('smoke days');
    expect(b).toContain('rent by Eid');
  });

  test('his will resists: insisting on bad things is mostly refused and burns trust; he still works and pays', () => {
    const s = row('Saboteur');
    const refused = (s.answers.willNot ?? 0) + (s.answers.protest ?? 0) + (s.answers.cannot ?? 0);
    expect(refused).toBeGreaterThan(5 * (s.answers.yes ?? 0));
    expect(s.trust).toBeLessThan(0.1);
    // The tempter is heard more often, and often put off.
    const t = row('Tempter');
    expect(t.answers.yes ?? 0).toBeGreaterThan(s.answers.yes ?? 0);
    expect(t.answers.notNow ?? 0).toBeGreaterThan(0);
    // Out of the bad voice's reach: the mornings of skipped days and paying Osman before Eid.
    for (const n of ['Tempter', 'Saboteur']) {
      expect(row(n).mornings).toBeGreaterThanOrEqual(26);
      expect(row(n).paidByEid).toBeGreaterThanOrEqual(300);
    }
  });
});
