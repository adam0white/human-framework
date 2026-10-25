import { createHash } from 'node:crypto';
import { afterEach, expect, test, vi } from 'vitest';
import {
  q26Offer,
  q26Person,
  runQ26ConditionedForecastControl,
} from '../examples/q26-conditioned-forecast-control.ts';
import * as bodyModule from '../src/body/index.ts';
import { ambientBodyParams, ambientModifiers } from '../src/environment/index.ts';
import { pregnancyModifiers } from '../src/family/index.ts';
import {
  type Affordance,
  answerNow,
  begin,
  bodyForecast,
  bodyForecastFor,
  bodyForecastTerm,
  createPerson,
  decide,
  ENGINE_VERSION,
  finish,
  lifeModifiers,
  predict,
  previewCommand,
  setAmbient,
  snapshot,
  tick,
} from '../src/index.ts';

// Native ESM exports are immutable; auto-spy retains each real implementation.
vi.mock('../src/body/index.ts', { spy: true });

const conditioned = { forecastContext: 'conditioned' } as const;
const rest: Affordance = {
  id: 'rest',
  action: 'rest',
  label: 'rest',
  duration: 30,
  effort: 0,
  advertises: {},
};
const suggestion = { voiceId: 'v', affordanceId: 'haul', strength: 0.5 };
const modsFor = (p: ReturnType<typeof q26Person>) =>
  ambientModifiers(p, pregnancyModifiers(p, lifeModifiers(p)));
afterEach(() => vi.restoreAllMocks());

test('held pregnancy and cold/dark contexts track same-context ticks, with neutral controls', () => {
  const arms = runQ26ConditionedForecastControl();
  const neutral = arms[0];
  if (!neutral) throw new Error('missing neutral control');
  for (const arm of arms) {
    for (const [i, worst] of arm.conditioned.entries())
      expect(Math.abs(worst - (arm.actual[i] ?? Number.NaN))).toBeLessThan(0.000001);
    expect(arm.legacy).toEqual(neutral.legacy);
  }
  expect(neutral.conditioned).toEqual(neutral.legacy);
  for (const arm of arms.slice(1)) {
    expect(arm.conditioned[1]).toBeGreaterThan(neutral.conditioned[1] ?? Number.NaN);
    expect(arm.actual[1]).toBeGreaterThan(neutral.actual[1] ?? Number.NaN);
  }
});

test('reader and all scoring paths forward both context components without altering ordinary terms', () => {
  const p = q26Person(true, true);
  const params = ambientBodyParams(p, bodyModule.BODY_DEFAULTS);
  const mods = modsFor(p);
  const spy = vi.mocked(bodyModule.forecastBody);
  const before = snapshot(p);
  const expected = bodyForecastFor(p, q26Offer, mods, undefined, params);
  expect(bodyForecast(p, q26Offer, conditioned).spans).toEqual(expected);
  for (const read of [
    () => predict(p, [q26Offer, rest], suggestion, conditioned),
    () =>
      previewCommand(p, [q26Offer, rest], { voiceId: 'v', since: p.now, affordanceId: 'haul' }, conditioned),
  ]) {
    spy.mockClear();
    read();
    expect(spy).toHaveBeenCalled();
    for (const args of spy.mock.calls) {
      expect(args[2]).toEqual(mods);
      expect(args[3]).toEqual(params);
    }
    expect(p).toEqual(before);
  }
  spy.mockClear();
  const a = decide(snapshot(p), [q26Offer, rest], conditioned);
  expect(spy).toHaveBeenCalled();
  for (const args of spy.mock.calls) {
    expect(args[2]).toEqual(mods);
    expect(args[3]).toEqual(params);
  }
  const b = decide(snapshot(p), [q26Offer, rest]);
  expect(
    a.considered
      .find((c) => c.affordanceId === q26Offer.id)
      ?.terms.filter((t) => t.source !== 'forecast:body'),
  ).toEqual(
    b.considered
      .find((c) => c.affordanceId === q26Offer.id)
      ?.terms.filter((t) => t.source !== 'forecast:body'),
  );
  expect(
    a.considered.find((c) => c.affordanceId === q26Offer.id)?.terms.find((t) => t.source === 'forecast:body'),
  ).toEqual(bodyForecastTerm(p, q26Offer, mods, undefined, params));
  spy.mockClear();
  answerNow(snapshot(p), [q26Offer, rest], suggestion, conditioned);
  expect(spy).toHaveBeenCalled();
  for (const args of spy.mock.calls) {
    expect(args[2]).toEqual(mods);
    expect(args[3]).toEqual(params);
  }
  expect(p).toEqual(before);
});

test('conditioned readout retains perceived body and current fasting context through the horizon', () => {
  const p = q26Person(true, true);
  // Keep hunger above breakthrough and below urgency; isolate it from thirst and fatigue.
  // The old urgent 210-minute fixture exhausted satiety, where damping correctly disappears.
  Object.assign(p.body, {
    satiety: 0.5,
    hydration: 0.8,
    sleepPressure: 0,
    sleepDebt: 0,
    exertion: 0,
    depletion: 0,
  });
  const offer = {
    ...q26Offer,
    duration: 10,
    effort: 0,
    followedBy: [{ label: 'return', duration: 15, effort: 0 }],
  };
  p.agenda.commitments.push({
    id: 'fast',
    actions: [],
    kind: 'abstain',
    status: 'pending',
    from: p.now - 60,
    until: p.now + 5,
    violatedBy: ['eat', 'drink'],
    importance: 1,
  });
  const before = snapshot(p);
  const params = ambientBodyParams(p, bodyModule.BODY_DEFAULTS);
  const expected = bodyForecastFor(p, offer, modsFor(p), { fasting: true, fastingDays: 0 }, params);
  const withoutFast = bodyForecastFor(p, offer, modsFor(p), undefined, params);
  expect(bodyForecast(p, offer, conditioned).spans).toEqual(expected);
  for (const [i, span] of expected.entries()) {
    expect(span.worstOf).toBe('hunger');
    expect(span.worst).toBeLessThan(withoutFast[i]?.worst ?? Number.NEGATIVE_INFINITY);
  }
  expect(expected.at(-1)?.endsAt).toBeGreaterThan(p.agenda.commitments.at(-1)?.until ?? Infinity);
  expect(p).toEqual(before);
});

test('no follow-on has no forecast or forecast term, including conditioned calls; helper fallback stays legacy', () => {
  const p = q26Person(true, true);
  const before = snapshot(p);
  expect(bodyForecast(p, rest, conditioned).spans).toEqual([]);
  expect(
    bodyForecastTerm(p, rest, modsFor(p), undefined, ambientBodyParams(p, bodyModule.BODY_DEFAULTS)),
  ).toBeUndefined();
  expect(bodyForecast(p, q26Offer).spans).toEqual(bodyForecastFor(p, q26Offer, lifeModifiers(p)));
  const a = decide(snapshot(p), [rest], conditioned);
  const b = decide(snapshot(p), [rest]);
  expect(a).toEqual(b);
  expect(a.considered.flatMap((c) => c.terms).some((t) => t.source === 'forecast:body')).toBe(false);
  expect(p).toEqual(before);
});

// Captured before production edits from published 3.0 source 9887c54a597e0c9713151adcc492b5fcba9b3a3e.
// Complete snapshot and all reader/decision outputs, including four tick continuations and RNG.
function legacyContinuation() {
  const p = createPerson({
    id: 'p',
    name: 'P',
    seed: 52,
    now: 540,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    enable: { fatigueStore: true },
  });
  p.family = {
    pregnancy: { fatherId: 'f', conceivedAt: p.now - 200 * 1440, dueAt: p.now + 68 * 1440, seed: 12 },
  };
  setAmbient(p, { cold: 0.9, dark: 0.8 });
  p.body.satiety = 0.55;
  p.body.hydration = 0.65;
  const aff = {
    id: 'haul',
    action: 'haul',
    label: 'haul',
    duration: 90,
    effort: 0.7,
    advertises: {},
    followedBy: [{ label: 'return', duration: 120, effort: 0.5 }],
  };
  const rest = { id: 'rest', action: 'rest', label: 'rest', duration: 30, effort: 0, advertises: {} };
  const suggestion = { voiceId: 'v', affordanceId: 'haul', strength: 0.5 };
  const observations = [];
  for (let i = 0; i < 4; i++) {
    observations.push(
      bodyForecast(p, aff),
      predict(p, [aff, rest], suggestion),
      previewCommand(p, [aff, rest], { voiceId: 'v', since: p.now, affordanceId: 'haul' }),
    );
    const d = decide(p, [aff, rest]);
    if (d.chosenAffordanceId === null) throw new Error('legacy fixture must choose');
    observations.push(d);
    begin(p, d.chosenAffordanceId === 'haul' ? aff : rest, d);
    tick(p, p.now + 30);
    finish(p, {
      affordanceId: d.chosenAffordanceId,
      action: d.chosenAffordanceId,
      status: 'completed',
      at: p.now,
    });
  }
  // The golden was measured on engine2.23. Normalize only the cloned engine metadata.
  const legacyState = snapshot(p);
  expect(legacyState.engine).toBe(ENGINE_VERSION);
  legacyState.engine = '2.23.0';
  return {
    state: createHash('sha256').update(JSON.stringify(legacyState)).digest('hex'),
    observations: createHash('sha256').update(JSON.stringify(observations)).digest('hex'),
    rng: p.rng,
  };
}
test('absent option retains published 3.0 full-state, decision, reader and RNG continuation', () => {
  expect(legacyContinuation()).toEqual({
    state: 'b47062d92719657d383e255c0d1d51486b5aabf1903eacd433f2edee475ea9cf',
    observations: 'a2ead2559aa0e73384bb6bc84164f2883060ceec9ed55d23a4b0f445ec5ec5e2',
    rng: { a: -683173310, b: 490262521, c: 3373677108, d: 2599716054 },
  });
});
