/** Standing advice (Game 2 spec N9): told advice keeps pulling, by trust in the source, and fades over days. */
import { describe, expect, test } from 'vitest';
import { rememberedTerms } from '../src/cognition/index.ts';
import type { DecideContext } from '../src/index.ts';
import {
  actionTendencies,
  advanceWill,
  adviceWeight,
  consider,
  createPerson,
  dischargeAdvice,
  lifeModifiers,
  readPerson,
  rememberAdvice,
  scoreAndResolve,
  standingAdvice,
  WILL_DEFAULTS,
} from '../src/index.ts';
import type { Affordance, Percept, Person, PersonSpec } from '../src/types.ts';
import { MINUTES_PER_DAY } from '../src/types.ts';

const ADULT = -30 * 365 * MINUTES_PER_DAY;

function person(over: Partial<PersonSpec> = {}): Person {
  return createPerson({ id: 'halil', name: 'Halil', seed: 5, bornAt: ADULT, sex: 'male', now: 600, ...over });
}

const DOCTOR: Affordance = {
  id: 'doctor',
  action: 'see-doctor',
  label: 'see the doctor',
  duration: 60,
  effort: 0.2,
  advertises: {},
};
const SIT: Affordance = { id: 'sit', action: 'sit', label: 'sit', duration: 30, effort: 0, advertises: {} };

const told = (at: number, over: Partial<Percept> = {}): Percept => ({
  at,
  channel: 'told',
  kind: 'request',
  actorId: 'selin',
  salience: 0.8,
  summary: 'Selin: see the doctor this week',
  advice: [{ action: 'see-doctor', strength: 0.8 }],
  ...over,
});

function ctxOf(p: Person, extra: Partial<DecideContext> = {}): DecideContext {
  const { body, needs, desperation } = readPerson(p);
  return {
    id: 'd',
    now: p.now,
    body,
    needs,
    mods: lifeModifiers(p),
    tendencies: actionTendencies(p),
    desperation,
    habit: { now: p.now },
    ...extra,
  };
}

const remembered = (p: Person, now = p.now) =>
  rememberedTerms(p, DOCTOR, now).find((t) => t.source === 'suggestion:remembered:selin')?.value ?? 0;

describe('standing advice', () => {
  test('a told percept naming an action is stored; other channels and self-talk are not', () => {
    const p = person();
    expect(rememberAdvice(p, told(p.now, { channel: 'heard' }))).toEqual([]);
    expect(rememberAdvice(p, told(p.now, { actorId: 'halil' }))).toEqual([]);
    expect(p.will.advice).toBeUndefined();
    const [a] = rememberAdvice(p, told(p.now));
    expect(a).toEqual({ sourceId: 'selin', action: 'see-doctor', strength: 0.8, salience: 0.8, at: 600 });
    expect(p.will.advice).toHaveLength(1);
  });

  test('the remembered term halves about every two days', () => {
    const p = person({ voices: [{ voiceId: 'selin', trust: 0.9 }] });
    rememberAdvice(p, told(p.now));
    const t0 = remembered(p);
    expect(t0).toBeCloseTo(0.9 * 0.8 * 0.8, 3);
    expect(remembered(p, p.now + 2 * MINUTES_PER_DAY) / t0).toBeCloseTo(0.5, 2);
    expect(remembered(p, p.now + 4 * MINUTES_PER_DAY) / t0).toBeCloseTo(0.25, 2);
    expect(WILL_DEFAULTS.adviceHalfLife).toBe(2 * MINUTES_PER_DAY);
  });

  test('weighted by trust: the voice relation when there is one, else belief source trust; none at zero', () => {
    const trusted = person({ voices: [{ voiceId: 'selin', trust: 0.9 }] });
    const wary = person({ voices: [{ voiceId: 'selin', trust: 0.3 }] });
    rememberAdvice(trusted, told(600));
    rememberAdvice(wary, told(600));
    expect(remembered(trusted)).toBeCloseTo(3 * remembered(wary), 3);
    const stranger = person();
    stranger.memory.sourceTrust.selin = 0;
    rememberAdvice(stranger, told(600));
    expect(remembered(stranger)).toBe(0);
    stranger.memory.sourceTrust.selin = 0.6;
    expect(remembered(stranger)).toBeCloseTo(0.6 * 0.64, 3);
  });

  test('advice keeps pulling after the call: it tips a later decision without a live voice or verdict', () => {
    const p = person({ voices: [{ voiceId: 'selin', trust: 0.9 }] });
    const before = scoreAndResolve(p, [DOCTOR, SIT], ctxOf(p)).record;
    expect(before.chosenAffordanceId).toBe('sit');
    rememberAdvice(p, told(p.now));
    p.now += 18 * 60; // the next morning
    const after = scoreAndResolve(p, [DOCTOR, SIT], ctxOf(p)).record;
    expect(after.chosenAffordanceId).toBe('doctor');
    expect(after.suggestion).toBeUndefined();
    expect(p.will.voices.find((v) => v.voiceId === 'selin')?.accepted).toBe(0);
  });

  test('a source speaking now about the same option is counted once, through its live term', () => {
    const p = person({ voices: [{ voiceId: 'selin', trust: 0.9 }] });
    rememberAdvice(p, told(p.now));
    const c = consider(p, DOCTOR, {
      ...ctxOf(p),
      suggestion: { voiceId: 'selin', action: 'see-doctor', strength: 0.5 },
    });
    expect(c.terms.some((t) => t.source === 'suggestion:selin')).toBe(true);
    expect(c.terms.some((t) => t.source.startsWith('suggestion:remembered:'))).toBe(false);
    const other = consider(p, DOCTOR, {
      ...ctxOf(p),
      suggestion: { voiceId: 'you', action: 'see-doctor', strength: 0.5 },
    });
    expect(other.terms.some((t) => t.source === 'suggestion:remembered:selin')).toBe(true);
  });

  test('repeating refreshes one entry; the list is bounded; doing it discharges; old advice is forgotten', () => {
    const p = person();
    rememberAdvice(p, told(p.now - 3 * MINUTES_PER_DAY));
    rememberAdvice(p, told(p.now));
    expect(p.will.advice).toHaveLength(1);
    expect(p.will.advice?.[0]?.at).toBe(p.now);
    for (let i = 0; i < WILL_DEFAULTS.maxAdvice + 4; i++)
      rememberAdvice(p, told(p.now, { actorId: `n${i}`, advice: [{ action: `a${i}`, strength: i / 40 }] }));
    expect(p.will.advice?.length).toBe(WILL_DEFAULTS.maxAdvice);
    expect(p.will.advice?.some((a) => a.sourceId === 'selin')).toBe(true);
    dischargeAdvice(p, 'see-doctor');
    expect(p.will.advice?.some((a) => a.action === 'see-doctor')).toBe(false);
    advanceWill(p, 30 * MINUTES_PER_DAY);
    expect(p.will.advice).toBeUndefined();
  });

  test('weight is closed-form and never negative or above one; unknown strength takes the default', () => {
    const p = person();
    const [a] = rememberAdvice(p, told(p.now, { salience: 2, advice: [{ action: 'x' }] }));
    expect(a?.strength).toBe(WILL_DEFAULTS.adviceStrength);
    expect(a?.salience).toBe(1);
    if (a) {
      expect(adviceWeight(a, a.at - 100)).toBe(adviceWeight(a, a.at));
      expect(adviceWeight(a, a.at + 1e9)).toBeGreaterThanOrEqual(0);
    }
    expect(standingAdvice(p, p.now + 365 * MINUTES_PER_DAY)).toEqual([]);
  });
});
