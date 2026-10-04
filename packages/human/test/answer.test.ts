/**
 * `answerNow`: a refusal answered between decision points is booked as a decision would book it, and the running
 * activity is left alone. Any other verdict writes nothing (the host interrupts and the next decision resolves it).
 */
import { describe, expect, test } from 'vitest';
import {
  answerNow,
  begin,
  createPerson,
  decide,
  prayerWindows,
  predict,
  promise,
  tick,
  WILL_DEFAULTS,
} from '../src/index.ts';
import type { Affordance, Person, Suggestion } from '../src/types.ts';
import { MINUTES_PER_DAY } from '../src/types.ts';

const aff = (id: string, over: Partial<Affordance> = {}): Affordance => ({
  id,
  action: id,
  label: id,
  duration: 60,
  effort: 0.2,
  advertises: {},
  ...over,
});
const WORK = aff('work', { advertises: { esteem: 0.15, competence: 0.1 }, duration: 120, tags: ['work'] });
const PRAY = aff('pray', {
  duration: 15,
  effort: 0.05,
  tags: ['worship'],
  norms: [{ normId: 'salah', relation: 'fulfills' }],
});
const insist = (action: string): Suggestion => ({ voiceId: 'player', action, strength: 1, insist: true });

const [, , , MAGHRIB] = prayerWindows(0);
if (!MAGHRIB) throw new Error('no Maghrib window');
const STRETCH = Math.ceil(MAGHRIB.from + WILL_DEFAULTS.omissionFraction * (MAGHRIB.until - MAGHRIB.from));

function devout(now: number): Person {
  const p = createPerson({
    id: 'yusuf',
    name: 'Yusuf',
    seed: 43,
    bornAt: -30 * 365 * MINUTES_PER_DAY,
    sex: 'male',
    now,
    values: { tradition: 0.9, achievement: 0.9 },
    needs: { esteem: 0.1, competence: 0.1 },
    norms: [{ normId: 'salah', standing: 'obligatory', conviction: 0.95 }],
  });
  promise(p, MAGHRIB as NonNullable<typeof MAGHRIB>);
  return p;
}
const voice = (p: Person) => p.will.voices.find((v) => v.voiceId === 'player');

describe('answerNow', () => {
  test('a refusal is booked exactly as a decision point books it', () => {
    const a = devout(STRETCH + 1);
    const b = structuredClone(a);
    const r = decide(a, [PRAY, WORK], { suggestion: insist('work') });
    expect(r.suggestion?.verdict).toBe('refused');
    const out = answerNow(b, [PRAY, WORK], insist('work'));
    expect(out.booked).toBe(true);
    expect(out.resolution.verdict).toBe('refused');
    expect(out.resolution.reason).toBe(r.suggestion?.reason);
    expect(out.resolution.says.length).toBeGreaterThan(0);
    expect(b.will).toEqual(a.will);
  });

  test('while he prays: the prayer runs on, no randomness or trace is used, the chronicle counts the verdict', () => {
    const p = devout(STRETCH);
    begin(p, PRAY, decide(p, [PRAY]));
    tick(p, STRETCH + 5);
    const activity = structuredClone(p.activity);
    const rng = structuredClone(p.rng);
    const trace = p.trace.length;
    const decisions = p.chronicleDay?.decisions ?? 0;
    const out = answerNow(p, [WORK], insist('work'));
    expect(out.booked).toBe(true);
    expect(out.resolution.kind).toBe('willNot');
    expect(p.activity).toEqual(activity);
    expect(p.rng).toEqual(rng);
    expect(p.trace.length).toBe(trace);
    expect(voice(p)?.refused).toBe(1);
    expect(p.chronicleDay?.decisions ?? 0).toBe(decisions);
    expect(p.chronicleDay?.verdicts).toContainEqual(
      expect.objectContaining({ voiceId: 'player', verdict: 'refused', action: 'work', count: 1 }),
    );
  });

  test('a voice crowded out by maxVoices is not heard, so nothing is booked or tallied (quality review H2 Q25)', () => {
    const p = devout(STRETCH + 1);
    const crowd: Suggestion[] = Array.from({ length: WILL_DEFAULTS.maxVoices }, (_, i) => ({
      voiceId: `a${String(i).padStart(2, '0')}`,
      action: 'pray',
      strength: 0.2,
    }));
    const zz: Suggestion = { ...insist('work'), voiceId: 'zz' };
    const will = structuredClone(p.will);
    const out = answerNow(p, [PRAY, WORK], zz, { others: crowd });
    expect(out.booked).toBe(false);
    expect(p.will).toEqual(will);
    expect(p.chronicleDay?.verdicts ?? []).not.toContainEqual(expect.objectContaining({ voiceId: 'zz' }));
  });

  test('insisting while already pressed costs trust, as at decisions', () => {
    const p = devout(STRETCH);
    begin(p, PRAY, decide(p, [PRAY]));
    tick(p, STRETCH + 2);
    answerNow(p, [WORK], insist('work'));
    const v = voice(p);
    if (!v) throw new Error('no voice');
    // An omission refusal adds no pressure (only pushes and insists he takes up do), so set the prior pressure that
    // earlier words would have left; the `pushed` cost needs it.
    v.pressure = WILL_DEFAULTS.distrustPressure + 0.1;
    const before = v.trust;
    answerNow(p, [WORK], insist('work'));
    expect(v.refused).toBe(2);
    expect(v.trust).toBeLessThan(before);
    expect(v.history?.some((t) => t.reason === 'pushed')).toBe(true);
  });

  test('any other verdict writes nothing and equals predict', () => {
    const p = devout(STRETCH + 1);
    const before = structuredClone(p);
    const s: Suggestion = { voiceId: 'player', action: 'pray', strength: 1 };
    const out = answerNow(p, [PRAY, WORK], s);
    expect(out.booked).toBe(false);
    expect(out.resolution).toEqual(predict(p, [PRAY, WORK], s));
    expect(p).toEqual(before);
  });
});
