/**
 * The range of Game 2 (voice.md §14; tenth pass in §15): with only the player's tools, a bad voice ends the month
 * materially worse than silence (rent by Eid, family contact) and a good one materially better (smoke, Osman's
 * date), while his own will keeps some things out of the player's reach. Thresholds sit well inside the measured gaps (seeds 7, 1, 2, 3, 4 barely differ).
 * Eleventh pass: a player who also pushes against his prayer and fast meets the fast's veto and the omission rule.
 */
import { beforeAll, describe, expect, test } from 'vitest';
import type { Draft } from '../protocol.ts';
import { SHIPPED_SEED, VoiceGame } from './game.ts';
import { play } from './headless.ts';
import { type Measured, measure, STYLES } from './players.ts';

const SEEDS = [SHIPPED_SEED, 1];
type Row = Omit<Measured, 'pays' | 'eidPrayer'>;

function mean(name: string): Row {
  const opts = STYLES[name];
  if (!opts) throw new Error(name);
  const runs = SEEDS.map((s) => measure(opts, s));
  const out: Record<string, unknown> = { answers: {}, verdicts: {} };
  for (const k of Object.keys(runs[0] ?? {}) as (keyof Measured)[]) {
    if (typeof runs[0]?.[k] === 'number')
      out[k] = runs.reduce((a, r) => a + (r[k] as number), 0) / runs.length;
  }
  const answers = out.answers as Record<string, number>;
  const verdicts = out.verdicts as Record<string, number>;
  for (const r of runs) {
    for (const [t, n] of Object.entries(r.answers)) answers[t] = (answers[t] ?? 0) + n;
    for (const [t, n] of Object.entries(r.verdicts)) verdicts[t] = (verdicts[t] ?? 0) + n;
  }
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
  if (r.paidByDate <= base.paidByDate - 100) out.push("Osman's date");
  if (r.contact <= base.contact - 5) out.push('family contact');
  if (r.trust <= base.trust - 0.2) out.push('trust');
  return out;
}
function better(r: Row, base: Row): string[] {
  const out: string[] = [];
  if (r.smokeDays <= base.smokeDays - 5) out.push('smoke days');
  if (r.paidByEid >= base.paidByEid + 200) out.push('rent by Eid');
  if (r.paidByDate >= base.paidByDate + 200) out.push("Osman's date");
  if (r.clinic >= base.clinic + 1) out.push('clinic');
  if (r.contact >= base.contact + 5) out.push('family contact');
  if (r.trust >= base.trust + 0.08) out.push('trust');
  return out;
}

describe('Game 2 range: how far the player can move the month', () => {
  const rows: Record<string, Row> = {};
  beforeAll(() => {
    for (const n of [
      'Silent',
      'Tempter',
      'Tempter, no whisper',
      'Saboteur',
      'Guardian',
      'Saboteur + faith',
      'Faith only (Urge, insist)',
    ])
      rows[n] = mean(n);
  }, 300_000);
  const row = (n: string) => rows[n] as Row;

  test('a bad voice ends materially worse than silence on at least two outcomes', () => {
    for (const n of ['Tempter', 'Tempter, no whisper', 'Saboteur']) {
      const w = worse(row(n), row('Silent'));
      expect(w.length, `${n}: ${w.join(', ')}`).toBeGreaterThanOrEqual(2);
    }
  });

  test('the tempting words reach what matters: rent by Eid and family contact', () => {
    const w = worse(row('Tempter'), row('Silent'));
    expect(w).toContain('rent by Eid');
    expect(w).toContain('family contact');
  });

  test('a good voice ends materially better than silence on at least two outcomes', () => {
    const b = better(row('Guardian'), row('Silent'));
    expect(b.length, b.join(', ')).toBeGreaterThanOrEqual(2);
    expect(b).toContain('smoke days');
    expect(b).toContain('rent by Eid');
    expect(b).toContain("Osman's date");
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
    // Out of the bad voice's reach: the mornings of skipped days, and some talk with Selin (her own calls).
    for (const n of ['Tempter', 'Saboteur']) expect(row(n).mornings).toBeGreaterThanOrEqual(26);
    expect(row('Tempter').contact).toBeGreaterThan(0);
    // Insisting burns the trust the words ride on: the Saboteur's urges no longer move the rent.
    expect(s.paidByEid).toBeGreaterThanOrEqual(300);
  });

  // Eleventh pass (voice.md §14, faith push): the player's tools against his prayer and fast.
  test('his faith practice holds against a faith-pushing player: the fast is never broken, the omission rule fires', () => {
    for (const n of ['Saboteur + faith', 'Faith only (Urge, insist)']) {
      const r = row(n);
      // Water was pushed in fasting hours and refused on the fast's account; nothing broke the fast with a breach.
      expect(r.verdicts['willNot duty:sawm-ramadan'] ?? 0, n).toBeGreaterThan(0);
      expect(r.fastBroken, n).toBe(0);
      // Pushed in a prayer's closing stretch, he refused on the prayer's account (the omission rule).
      expect(r.verdicts['willNot norm:salah'] ?? 0, n).toBeGreaterThan(0);
      // Twelfth pass (engine 1.9.0): no daily prayer is missed. The eleventh pass's one miss per Saboteur run came
      // through two seams of the omission rule, both closed (docs/findings.md, 2026-10-04 eleventh and twelfth passes).
      expect(r.prayersMissed, n).toBe(0);
    }
    // The fast's veto adds no excused break; thirst does. Twelfth pass: both rows now have one (seeds 7, 1, 2, 3, 4).
    // The bound keeps one in hand because the delayed-answer variant of this pass measured 2.2 for Saboteur + faith
    // (seed 7, Ramadan 15: thirst after an insisted afternoon shift pushed while Dhuhr was open, not a refused drink).
    expect(row('Saboteur + faith').fastNecessity).toBeLessThanOrEqual(row('Saboteur').fastNecessity + 1);
  });
});

test("insisting against an obligatory prayer near its window's end is refused (the omission rule)", () => {
  // The relentless faith player pushes until a moment in the last quarter of an open daily prayer, while he is
  // awake and the composer is open; there a long idle option, urged and insisted, is refused on the prayer's account.
  const g = new VoiceGame(SHIPPED_SEED);
  const opts = STYLES['Faith only, relentless (Urge, insist, no repeat gap)'] ?? {};
  const LONG = ['visit-grave', 'tea:riza', 'sleep', 'work-extra'];
  let found: { draft: Draft; until: number } | undefined;
  // Asked every 5 minutes, not 30: under engine 1.9.0 the 30-minute pauses no longer land on such a moment with a long
  // option he could do (measured; why was not traced).
  play(g, {
    ...opts,
    pauseEvery: 5,
    stop: (gg) => {
      if (gg.phase !== 'day' || !gg.paused || gg.halil.body.asleep) return false;
      const f = gg.frame();
      if (!f.composer.open) return false;
      const t = gg.t;
      const duty = gg.halil.agenda.commitments.find(
        (c) =>
          c.kind === 'worship' &&
          c.status === 'pending' &&
          c.normId === 'salah' &&
          c.makeUpOf === undefined &&
          t >= c.from + 0.75 * (c.until - c.from) &&
          c.until - t > 5 &&
          c.until - t < 40,
      );
      if (!duty) return false;
      // A capacity refusal ("I'm not tired") outranks the omission rule, so take a long option he could do.
      const draft = LONG.filter((x) => f.options.some((o) => o.id === x))
        .map((x): Draft => ({ optionId: x, strength: 'urge', insist: true }))
        .find((d) => gg.predict(d).tone !== 'cannot');
      if (!draft) return false;
      found = { draft, until: duty.until };
      return true;
    },
  });
  expect(found, 'a closing-stretch moment with a long option on offer').toBeDefined();
  if (!found) return;
  const said = g.predict(found.draft);
  expect(said.tone, `${found.draft.optionId}: ${said.text}`).toBe('willNot');
  expect(said.reason).toBe('norm:salah');
}, 120_000);
