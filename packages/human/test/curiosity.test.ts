import { expect, test } from 'vitest';
import * as hf from '../src/index.ts';
import type { Affordance, Person } from '../src/types.ts';
import { optInContinuation } from './opt-in-continuation-fixture.ts';

const offer: Affordance = {
  id: 'try',
  action: 'try',
  label: 'Try',
  duration: 1,
  effort: 0.05,
  advertises: {},
};
function person(on = true): Person {
  const p = hf.createPerson({
    id: 'p',
    name: 'P',
    seed: 7,
    now: 600,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    traits: { openness: 1 },
    enable: { curiosity: on },
  });
  maintain(p);
  return p;
}
function maintain(p: Person): void {
  p.body.satiety = 1;
  p.body.hydration = 1;
  p.body.sleepPressure = 0;
  p.body.exertion = 0;
  p.needs.safety = 1;
  p.affect.emotions = [];
}
function complete(p: Person, a = offer, status: 'completed' | 'failed' | 'interrupted' = 'completed'): void {
  hf.begin(p, a, hf.decide(p, [a]));
  hf.finish(p, { affordanceId: a.id, action: a.action, status, at: p.now + a.duration });
  maintain(p);
}
function curiosityTerms(p: Person, a = offer) {
  const r = hf.readPerson(p);
  return hf
    .consider(p, a, { ...r, now: p.now, mods: hf.lifeModifiers(p), tendencies: {}, habit: { now: p.now } })
    .terms.filter((t) => t.source.startsWith('curiosity:'));
}

test('hunger and fear close the relaxed gate; signals and terms are read only', () => {
  const p = person();
  const before = hf.snapshot(p);
  const open = curiosityTerms(p);
  expect(open[0]?.source).toBe('curiosity:unknown');
  expect(open[0]?.value).toBeGreaterThan(0.3);
  hf.curiosityOf(p, offer);
  expect(p).toEqual(before);
  p.body.satiety = 0;
  expect(hf.curiosityOf(p, offer).drive).toBe(0);
  expect(curiosityTerms(p)).toEqual([]);
  maintain(p);
  hf.feel(p, 'fear', 1, 'threat', p.now);
  expect(hf.curiosityOf(p, offer).drive).toBe(0);
  expect(curiosityTerms(p)).toEqual([]);
});

test('unknown fades with attempts; falling error pulls more than persistent noise', () => {
  const learnable = person();
  const noisy = person();
  const initial = hf.curiosityOf(learnable, offer).unknown;
  for (let i = 0; i < 40; i++) {
    complete(learnable, offer, i < 4 ? 'failed' : 'completed');
    complete(noisy, offer, i % 2 ? 'failed' : 'completed');
  }
  const learned = hf.curiosityOf(learnable, offer);
  const noise = hf.curiosityOf(noisy, offer);
  expect(learned.unknown).toBeLessThan(initial / 4);
  expect(learned.progress).toBeGreaterThan(0.005);
  expect(noise.progress).toBeLessThan(0.01);
  expect(learned.progress).toBeGreaterThan(noise.progress);
  const terms = curiosityTerms(learnable, { ...offer, placeId: 'elsewhere' });
  expect(terms.map((t) => t.source)).toEqual(['curiosity:unknown', 'curiosity:progress', 'curiosity:vary']);
  expect(terms.every((t) => t.value === hf.round(t.value))).toBe(true);
});

test('vary requires a recent same action with a different target or place and no identical repeat', () => {
  const p = person();
  const a = { ...offer, targetId: 'a', placeId: 'here' };
  const b = { ...offer, targetId: 'b', placeId: 'here' };
  expect(hf.curiosityOf(p, b).vary).toBe(0);
  complete(p, a);
  expect(hf.curiosityOf(p, a).vary).toBe(0);
  expect(hf.curiosityOf(p, b).vary).toBe(1);
  expect(hf.curiosityOf(p, { ...a, placeId: 'there' }).vary).toBe(1);
  expect(hf.curiosityOf(p, { ...b, action: 'other' }).vary).toBe(0);
  expect(hf.curiosityOf(p, b, p.now + 61).vary).toBe(0);
  complete(p, b);
  expect(hf.curiosityOf(p, b).vary).toBe(0);
});

test('a first outcome learns but earns no reward; interrupted acts do not learn', () => {
  for (const status of ['completed', 'failed', 'interrupted'] as const) {
    const p = person();
    p.needs.leisure = p.needs.competence = 0.4;
    const prediction = hf.expectedEffect(p, offer);
    const off = hf.restore(hf.snapshot(p));
    delete off.curiosity;
    complete(p, offer, status);
    complete(off, offer, status);
    const reward = p.needs.leisure - off.needs.leisure + p.needs.competence - off.needs.competence;
    expect(reward).toBeLessThanOrEqual(hf.CURIOSITY_DEFAULTS.rewardMax + 1e-10);
    if (status === 'interrupted') {
      expect(reward).toBe(0);
      expect(p.curiosity?.errors).toEqual([]);
      expect(p.curiosity?.recent).toEqual([]);
    } else {
      // Reward follows learning progress only; a first sample has none.
      expect(reward).toBe(0);
      expect(p.curiosity?.errors[0]?.n).toBe(1);
      expect(p.curiosity?.errors[0]?.fast).toBe(p.curiosity?.errors[0]?.slow);
      if (status === 'completed')
        expect(p.curiosity?.errors[0]?.fast).toBeCloseTo((1 - prediction.successRate) / 2);
    }
  }
});

test('falling error rewards leisure and competence, within the cap', () => {
  const p = person();
  for (let i = 0; i < 3; i++) complete(p, offer, 'failed');
  for (let i = 0; i < 3; i++) complete(p, offer, 'completed');
  p.needs.leisure = p.needs.competence = 0.4;
  const off = hf.restore(hf.snapshot(p));
  delete off.curiosity;
  expect(hf.curiosityOf(p, offer).progress).toBeGreaterThan(0);
  complete(p, offer, 'completed');
  complete(off, offer, 'completed');
  const reward = p.needs.leisure - off.needs.leisure + p.needs.competence - off.needs.competence;
  expect(reward).toBeGreaterThan(0);
  expect(reward).toBeLessThanOrEqual(hf.CURIOSITY_DEFAULTS.rewardMax + 1e-10);
});

test('identifiers longer than the restore bound are not tracked, so saves round-trip', () => {
  const p = person();
  complete(p, offer);
  complete(p, { ...offer, id: 'long', action: 'x'.repeat(513) });
  expect(p.curiosity?.recent).toHaveLength(1);
  expect(hf.restore(hf.snapshot(p)).curiosity).toEqual(p.curiosity);
});

test('save round trip preserves continuation; restore drops ambiguous state and bounds history', () => {
  const p = person();
  hf.enableCuriosity(p, { recentMinutes: 120, unknownScale: 0.5 });
  for (let i = 0; i < 35; i++) complete(p, { ...offer, action: `a${i}` });
  expect(p.curiosity?.errors).toHaveLength(32);
  expect(p.curiosity?.errors[0]?.key).toBe('a3');
  expect(p.curiosity?.recent).toHaveLength(8);
  const loaded = hf.restore(JSON.parse(JSON.stringify(hf.snapshot(p))));
  expect(loaded).toEqual(p);
  complete(p);
  complete(loaded);
  expect(hf.fingerprint(loaded)).toBe(hf.fingerprint(p));
  const bad = hf.snapshot(p);
  const state = bad.curiosity;
  const first = state?.errors[0];
  if (!state || !first) throw new Error('Missing curiosity history');
  // Duplicate keys within the retained bound are ambiguous.
  state.errors[1] = { ...first };
  expect(hf.restore(bad).curiosity).toBeUndefined();
  const nonfinite = hf.snapshot(p);
  const error = nonfinite.curiosity?.errors[0];
  if (!error) throw new Error('Missing prediction error');
  error.fast = Number.NaN;
  expect(hf.restore(nonfinite).curiosity?.errors.some((e) => !Number.isFinite(e.fast))).toBe(false);
});

test('without curiosity the main 2.10.0 opt-in continuation is byte-identical', () => {
  expect([1, 2, 3].map((seed) => optInContinuation(hf, seed))).toEqual([
    { digest: '7af56da16d1b3414', refs: 1 },
    { digest: 'bc43cc68ccab7d8a', refs: 1 },
    { digest: 'f39ac2679ae3d0f8', refs: 1 },
  ]);
  expect(person(false).curiosity).toBeUndefined();
});
