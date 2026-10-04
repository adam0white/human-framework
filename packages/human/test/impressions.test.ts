import { describe, expect, test } from 'vitest';
import {
  type Affordance,
  acquaintWith,
  companionSteadiness,
  createCommunity,
  createPerson,
  estimate,
  feel,
  glimpseOf,
  hear,
  impressionConfidence,
  impressionOf,
  injure,
  MINUTES_PER_YEAR,
  observeAct,
  outwardSigns,
  type Person,
  type PersonSpec,
  predict,
  predictAs,
  previewCommandAs,
  reserveOf,
  restore,
  selfReport,
  setReserve,
  snapshot,
  stepCommunity,
  type World,
} from '../src/index.ts';

const NOON = 12 * 60;

function person(id: string, seed: number, extra: Partial<PersonSpec> = {}): Person {
  return createPerson({
    id,
    name: id,
    seed,
    now: NOON,
    bornAt: NOON - 35 * MINUTES_PER_YEAR,
    sex: seed % 2 === 0 ? 'female' : 'male',
    voices: [{ voiceId: 'keeper', trust: 0.6 }],
    ...extra,
  });
}

function hurt(p: Person, severity = 0.6): void {
  injure(p, { part: 'leg', severity, healRatePerDay: 0.05 });
}

describe('impressions (HF 2.0 L6)', () => {
  test('a seen skill (skill:<id>) is believed for seasons, while a state cue fades within the day', () => {
    const w = person('w', 6);
    for (let k = 0; k < 8; k++) {
      hear(w, 't', 'skill:sling', 0.8, { at: NOON + k, weight: 0.5 });
      hear(w, 't', 'fatigue', 0.8, { at: NOON + k, weight: 0.5 });
    }
    expect(estimate(w, 't', 'skill:archery', NOON).value).toBe(0.3);
    const later = NOON + 120 * 24 * 60;
    const skill = estimate(w, 't', 'skill:sling', later);
    expect(skill.value).toBeCloseTo(0.8, 5);
    expect(skill.confidence).toBeGreaterThan(0.5);
    expect(estimate(w, 't', 'fatigue', later).confidence).toBeLessThan(0.01);
  });

  test('an estimate narrows with shared time: confidence rises and the error shrinks', () => {
    const watcher = person('w', 1);
    const target = person('t', 2, { traits: { emotionality: 0.8 } });
    hurt(target, 0.5);
    feel(target, 'fear', 0.6, 'test', NOON);
    const truth = outwardSigns(target);
    glimpseOf(watcher, target, { at: NOON, clarity: 0.3 });
    const first = estimate(watcher, 't', 'pain', NOON);
    for (let k = 1; k <= 12; k++) glimpseOf(watcher, target, { at: NOON + k, clarity: 0.3 });
    const later = estimate(watcher, 't', 'pain', NOON + 12);
    expect(later.confidence).toBeGreaterThan(first.confidence + 0.3);
    expect(Math.abs(later.value - truth.pain)).toBeLessThan(Math.abs(first.value - truth.pain) + 1e-9);
    expect(Math.abs(later.value - truth.pain)).toBeLessThan(0.08);
  });

  test('it errs where the target hides pain: reserve defaults from emotionality and can be set', () => {
    const proud = person('p', 3, { traits: { emotionality: 0.15 } });
    const open = person('o', 4, { traits: { emotionality: 0.85 } });
    expect(reserveOf(proud, 'pain')).toBeGreaterThan(reserveOf(open, 'pain'));
    for (const t of [proud, open]) hurt(t, 0.5);
    const w = person('w', 5);
    for (let k = 0; k < 10; k++) {
      glimpseOf(w, proud, { at: NOON + k });
      glimpseOf(w, open, { at: NOON + k });
    }
    expect(estimate(w, 'p', 'pain', NOON + 10).value).toBeLessThan(estimate(w, 'o', 'pain', NOON + 10).value);
    // A host override: she hides it all, but her limp still shows.
    setReserve(proud, { pain: 1 });
    expect(selfReport(proud).pain).toBe(0);
    expect(outwardSigns(proud).pain).toBeGreaterThan(0);
    setReserve(proud, { pain: undefined });
    expect(proud.social.reserve).toBeUndefined();
  });

  test('her words say fine, her limp says otherwise: testimony and sight pull apart', () => {
    const tamar = person('t', 6, { traits: { emotionality: 0.2 } });
    setReserve(tamar, { pain: 0.7 });
    injure(tamar, { part: 'leg', severity: 0.7, healRatePerDay: 0.02 });
    const told = person('a', 7);
    const saw = person('b', 8);
    for (let k = 0; k < 6; k++) {
      hear(told, 't', 'pain', selfReport(tamar).pain, { at: NOON + k, weight: 0.6 });
      glimpseOf(saw, tamar, { at: NOON + k });
    }
    expect(estimate(saw, 't', 'pain', NOON + 6).value).toBeGreaterThan(
      estimate(told, 't', 'pain', NOON + 6).value,
    );
  });

  test('state goes stale within hours, traits do not', () => {
    const w = person('w', 9);
    const t = person('t', 10);
    observeAct(w, 't', { at: NOON, tags: ['flee'] });
    glimpseOf(w, t, { at: NOON });
    const s0 = estimate(w, 't', 'fatigue', NOON).confidence;
    const tr0 = estimate(w, 't', 'trait:emotionality', NOON).confidence;
    expect(estimate(w, 't', 'fatigue', NOON + 24 * 60).confidence).toBeLessThan(s0 / 4);
    expect(estimate(w, 't', 'trait:emotionality', NOON + 24 * 60).confidence).toBe(tr0);
    expect(estimate(w, 't', 'trait:emotionality', NOON).value).toBeGreaterThan(0.5);
  });

  test('acts teach place fear, ties and trust; acquaintance condenses history', () => {
    const w = person('w', 11);
    const mara = person('m', 12, { relationships: [{ otherId: 'j', roles: ['spouse'], affection: 0.9 }] });
    observeAct(w, 'm', {
      at: NOON,
      placeId: 'east',
      avoided: 1,
      withId: 'j',
      toward: 1,
      voiceId: 'keeper',
      heeded: -1,
    });
    expect(estimate(w, 'm', 'fear@east', NOON).value).toBeGreaterThan(0.9);
    expect(estimate(w, 'm', 'tie:j', NOON).value).toBeGreaterThan(0.9);
    expect(estimate(w, 'm', 'trust:keeper', NOON).value).toBeLessThan(0.1);
    const old = person('o', 13);
    acquaintWith(old, mara, 0.9, NOON);
    expect(
      Math.abs(estimate(old, 'm', 'trait:agreeableness', NOON).value - mara.traits.agreeableness),
    ).toBeLessThan(0.03);
    expect(estimate(old, 'm', 'tie:j', NOON).value).toBeCloseTo(0.9, 5);
    expect(impressionConfidence(old, 'm', NOON)).toBeGreaterThan(impressionConfidence(w, 'm', NOON));
  });

  test('pure and opt-in: observing draws no randomness; predictAs changes neither person', () => {
    const w = person('w', 14);
    const t = person('t', 15);
    hurt(t);
    const rngW = JSON.stringify(w.rng);
    const before = JSON.stringify(t);
    glimpseOf(w, t, { at: NOON, clarity: 0.5 });
    observeAct(w, 't', { at: NOON, tags: ['steady'] });
    expect(JSON.stringify(w.rng)).toBe(rngW);
    const offers: Affordance[] = [
      {
        id: 'climb',
        action: 'climb',
        label: 'climb the stair',
        duration: 30,
        effort: 0.6,
        advertises: { esteem: 0.2 },
      },
      {
        id: 'rest',
        action: 'rest',
        label: 'rest',
        duration: 30,
        effort: 0,
        advertises: { rest: 0.2 },
        tags: ['rest'],
      },
    ];
    const wBefore = JSON.stringify(w);
    predictAs(w, t, offers, { voiceId: 'keeper', affordanceId: 'climb', strength: 0.5 });
    previewCommandAs(w, t, offers, { voiceId: 'keeper', affordanceId: 'climb', since: NOON });
    expect(JSON.stringify(t)).toBe(before);
    expect(JSON.stringify(w)).toBe(wBefore);
    // A person nobody has observed has no impressions slice at all.
    expect(t.social.impressions).toBeUndefined();
  });

  test('a hidden injury makes the read wrong: the observer expects a yes the person cannot give', () => {
    const tamar = person('t', 16, { traits: { emotionality: 0.15 } });
    setReserve(tamar, { pain: 1 });
    const keeper = person('k', 17);
    acquaintWith(keeper, tamar, 0.8, NOON);
    // Her knee is real (so she cannot climb) but she says it is nothing: the true answer and the Keeper's read differ.
    injure(tamar, { part: 'knee', severity: 0.9, healRatePerDay: 0.02, affects: { moving: 0.9 } });
    for (let k = 0; k < 4; k++)
      hear(keeper, 't', 'pain', selfReport(tamar).pain, { at: NOON + k, weight: 0.8 });
    const stair: Affordance = {
      id: 'stair',
      action: 'hold-post',
      label: 'hold the gate stair',
      duration: 60,
      effort: 0.5,
      advertises: { esteem: 0.3, meaning: 0.2 },
      requires: { moving: 0.6 },
    };
    const offers: Affordance[] = [
      stair,
      {
        id: 'rest',
        action: 'rest',
        label: 'rest',
        duration: 30,
        effort: 0,
        advertises: { rest: 0.1 },
        tags: ['rest'],
      },
    ];
    const s = { voiceId: 'keeper', affordanceId: 'stair', strength: 0.6 };
    const truth = predict(tamar, offers, s);
    expect(truth.verdict).toBe('refused');
    expect(truth.kind).toBe('cannot');
    // A keeper who has only heard her words pictures a moving capacity from her injuries scaled to believed pain.
    const read = predictAs(keeper, tamar, offers, s, { now: NOON + 4 });
    expect(read.resolution.verdict).not.toBe('refused');
  });

  test('impressions survive save and restore; malformed ones are dropped', () => {
    const w = person('w', 18);
    const t = person('t', 19);
    glimpseOf(w, t, { at: NOON });
    setReserve(w, { pain: 0.4 });
    const r = restore(JSON.parse(JSON.stringify(snapshot(w))));
    expect(r.social).toEqual(w.social);
    const bad = JSON.parse(JSON.stringify(snapshot(w)));
    bad.social.impressions[0].cues[0].mean = 'x';
    bad.social.reserve = { pain: 'lots' };
    const r2 = restore(bad);
    expect(r2.social.impressions).toBeUndefined();
    expect(r2.social.reserve).toBeUndefined();
  });

  test('bounded: a watcher who looks at forty people keeps at most thirty-two impressions', () => {
    const w = person('w', 20);
    for (let i = 0; i < 40; i++) glimpseOf(w, person(`p${i}`, 100 + i), { at: NOON + i });
    expect(w.social.impressions?.length).toBe(32);
    expect(impressionOf(w, 'p0', NOON + 40).cues).toEqual([]);
    expect(impressionOf(w, 'p39', NOON + 40).cues.length).toBeGreaterThan(0);
  });
});

describe('control scenario (headless): choosing a companion for a dangerous job', () => {
  // A hunter can go into the hills with Aras or with Bilal (same risk, same reward) or fish alone. In one run she
  // has seen Aras bolt twice and Bilal hold steady; the control has seen nothing.
  const START = 6 * 60;
  function world(): World {
    let clock = START;
    const hunt = (id: string, partner: string): Affordance => ({
      id,
      action: 'hunt',
      label: `hunt with ${partner}`,
      with: [partner],
      duration: 120,
      effort: 0.4,
      advertises: { food: 0.6, esteem: 0.1 },
      risk: { chance: 0.3, severity: 0.5, kind: 'boar' },
      tags: ['outdoors', 'risky'],
    });
    const offers: Affordance[] = [
      hunt('hunt-aras', 'aras'),
      hunt('hunt-bilal', 'bilal'),
      {
        id: 'fish',
        action: 'fish',
        label: 'fish alone',
        duration: 120,
        effort: 0.3,
        advertises: { food: 0.25 },
      },
      {
        id: 'rest',
        action: 'rest',
        label: 'rest',
        duration: 30,
        effort: 0,
        advertises: { rest: 0.2 },
        tags: ['rest'],
      },
    ];
    return {
      now: () => clock,
      affordancesFor: (q) => {
        clock = Math.max(clock, q.now);
        return offers.map((o) => ({ ...o }));
      },
      perceptsFor: () => [],
      resolve: (_q, act, reason) => ({
        affordanceId: act.affordance.id,
        action: act.affordance.action,
        status: reason === 'ended' ? 'completed' : 'interrupted',
        at: Math.max(clock, act.startedAt + act.affordance.duration),
        needs: reason === 'ended' ? { ...act.affordance.advertises } : {},
      }),
    };
  }
  function run(seen: boolean) {
    const p = createPerson({
      id: 'h',
      name: 'h',
      seed: 3,
      now: START,
      bornAt: START - 30 * MINUTES_PER_YEAR,
      sex: 'female',
      body: { satiety: 0.1 },
      relationships: [
        { otherId: 'aras', roles: ['neighbor'] },
        { otherId: 'bilal', roles: ['neighbor'] },
      ],
    });
    if (seen) {
      for (const at of [START - 600, START - 300]) {
        observeAct(p, 'aras', { at, tags: ['flee'], placeId: 'hills', avoided: 1 });
        observeAct(p, 'bilal', { at, tags: ['steady'], placeId: 'hills', avoided: -1 });
        hear(p, 'aras', 'fear', 0.7, { at, weight: 0.8 });
        hear(p, 'bilal', 'fear', 0.05, { at, weight: 0.8 });
      }
    }
    const events = stepCommunity(createCommunity([p]), world(), START + 3 * 60);
    return { p, first: events.find((e) => e.kind === 'begin') };
  }

  test('she hunts with the one she believes steady; the control has no reason to prefer him', () => {
    const seen = run(true);
    const control = run(false);
    expect(seen.first?.affordanceId).toBe('hunt-bilal');
    expect(control.first?.affordanceId).not.toBe('hunt-bilal');
    expect(companionSteadiness(seen.p, 'bilal', START)).toBeGreaterThan(0);
    expect(companionSteadiness(seen.p, 'aras', START)).toBeLessThan(0);
    const record = seen.p.trace.find((r) => r.chosenAffordanceId === 'hunt-bilal');
    expect(
      record?.considered
        .find((c) => c.affordanceId === 'hunt-bilal')
        ?.terms.some((t) => t.source === 'companion:bilal'),
    ).toBe(true);
    // Deterministic.
    expect(JSON.stringify(snapshot(run(true).p))).toBe(JSON.stringify(snapshot(seen.p)));
  });
});
