import { describe, expect, test } from 'vitest';
import { runBodyForecastControl } from '../examples/body-forecast-control.ts';
import {
  type Affordance,
  advanceBody,
  BODY_DEFAULTS,
  bodyForecast,
  createPerson,
  decide,
  enableFatigueStore,
  forecastBody,
  lifeModifiers,
  promise,
  readBody,
  restore,
  snapshot,
} from '../src/index.ts';

const DAY = 1440;
const adult = (store = false) =>
  createPerson({
    id: 'p',
    name: 'P',
    seed: 2,
    now: 8 * 60,
    bornAt: -30 * 365 * DAY,
    sex: 'male',
    enable: { fatigueStore: store },
  });
const work = (
  p: ReturnType<typeof adult>,
  minutes: number,
  effort: number,
  mode: 'awake' | 'sleep' = 'awake',
) => {
  advanceBody(p, minutes, { effort, focus: 0, mode }, lifeModifiers(p));
  p.now += minutes;
};

describe('fatigue store: accumulated exertion (2.6.0)', () => {
  test('off by default; enabling is idempotent', () => {
    const p = adult();
    expect(p.body.depletion).toBeUndefined();
    work(p, 360, 0.9);
    expect(p.body.depletion).toBeUndefined();
    enableFatigueStore(p);
    expect(p.body.depletion).toBe(0);
    p.body.depletion = 0.4;
    enableFatigueStore(p);
    expect(p.body.depletion).toBe(0.4);
  });

  test('fills with sustained effort above the floor, not with light work, and raises felt fatigue', () => {
    const hard = adult(true);
    const light = adult(true);
    const plain = adult();
    work(hard, 360, 0.8);
    work(light, 360, BODY_DEFAULTS.depletionFloor - 0.05);
    work(plain, 360, 0.8);
    expect(hard.body.depletion ?? 0).toBeGreaterThan(0.4);
    expect(light.body.depletion).toBe(0);
    expect(readBody(hard).fatigue).toBeGreaterThan(readBody(plain).fatigue);
    expect(readBody(hard).capacity).toBeLessThan(readBody(plain).capacity);
  });

  test('recovers with rest, faster asleep; a long effort leaves less for the next', () => {
    const a = adult(true);
    const b = adult(true);
    work(a, 360, 0.8);
    work(b, 360, 0.8);
    const start = a.body.depletion ?? 0;
    work(a, 240, 0, 'awake');
    work(b, 240, 0, 'sleep');
    expect(a.body.depletion ?? 1).toBeLessThan(start);
    expect(b.body.depletion ?? 1).toBeLessThan(a.body.depletion ?? 0);
  });

  test('save and restore keep the store; a bad value is repaired', () => {
    const p = adult(true);
    work(p, 240, 0.8);
    const back = restore(JSON.parse(JSON.stringify(snapshot(p))));
    expect(back.body.depletion).toBe(p.body.depletion);
    const bad = JSON.parse(JSON.stringify(snapshot(p)));
    bad.body.depletion = 7;
    expect(restore(bad).body.depletion).toBe(1);
  });

  test('the forecast applies an open fast’s damping of hunger (thirst is not damped)', () => {
    const p = adult();
    p.body.satiety = 0.4;
    p.body.hydration = 1;
    const spans = [{ label: 'walk', duration: 240, load: { effort: 0.5, focus: 0, mode: 'awake' as const } }];
    const plain = forecastBody(p, spans, lifeModifiers(p));
    const fasting = forecastBody(p, spans, lifeModifiers(p), BODY_DEFAULTS, 30, {
      fasting: true,
      fastingDays: 10,
    });
    expect(fasting[0]?.worst ?? 1).toBeLessThan(plain[0]?.worst ?? 0);
  });

  test('control: with the store, a long climb makes the declared descent weigh; without, it does not', () => {
    for (const domain of ['climb', 'haul'] as const) {
      const arms = Object.fromEntries(runBodyForecastControl(domain).map((a) => [a.arm, a]));
      const far = (arm: string) => arms[arm]?.forecastTerms.find((t) => t.id === 'far')?.forecast ?? 0;
      expect(far('rested-morning')).toBe(0);
      expect(far('store-morning')).toBeLessThan(0);
      expect(arms['store-morning']?.chosen).toBe('near');
      expect(arms['store-undeclared']?.chosen).toBe('far');
    }
  });

  test('an open fast reaches the forecast through decide, and only for offers with followedBy', () => {
    const hungry = (fast: boolean) => {
      const p = adult();
      p.body.satiety = 0.5;
      if (fast)
        promise(p, {
          kind: 'abstain',
          actions: [],
          violatedBy: ['eat'],
          from: 0,
          until: 20 * 60,
          importance: 0.2,
          toId: 'self',
        });
      return p;
    };
    const plain: Affordance = {
      id: 'x',
      action: 'walk',
      label: 'x',
      duration: 60,
      effort: 0.4,
      advertises: {},
    };
    const ahead: Affordance = { ...plain, id: 'y', followedBy: [{ duration: 240, effort: 0.5 }] };
    const term = (p: ReturnType<typeof adult>, id: string) =>
      decide(p, [plain, ahead])
        .considered.find((c) => c.affordanceId === id)
        ?.terms.find((t) => t.source === 'forecast:body')?.value;
    expect(term(hungry(true), 'x')).toBeUndefined();
    expect(term(hungry(false), 'y') ?? 0).toBeLessThan(term(hungry(true), 'y') ?? 0);
    expect(bodyForecast(hungry(true), ahead).spans[0]?.worst ?? 1).toBeLessThan(
      bodyForecast(hungry(false), ahead).spans[0]?.worst ?? 0,
    );
  });

  test('a non-numeric store is repaired to empty', () => {
    const bad = JSON.parse(JSON.stringify(snapshot(adult(true))));
    bad.body.depletion = 'x';
    expect(restore(bad).body.depletion).toBe(0);
  });
});
