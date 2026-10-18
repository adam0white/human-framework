import { describe, expect, test } from 'vitest';
import { runBodyForecastControl } from '../examples/body-forecast-control.ts';
import {
  type Affordance,
  bodyForecast,
  bodyForecastTerm,
  createPerson,
  decide,
  FORECAST_DEFAULTS,
  forecastLine,
  lifeModifiers,
  snapshot,
  tick,
} from '../src/index.ts';

const DAY = 1440;
const person = () => {
  const p = createPerson({ id: 'p', name: 'P', seed: 5, now: 6 * 60, bornAt: -30 * 365 * DAY, sex: 'male' });
  tick(p, 9 * 60);
  return p;
};
const up: Affordance = {
  id: 'up',
  action: 'up',
  label: 'up',
  duration: 120,
  effort: 0.8,
  advertises: {},
  followedBy: [{ label: 'the way down', duration: 120, effort: 0.7 }],
};

describe('bodily forecast over follow-on exertion (2.5.0)', () => {
  test('no followedBy: no forecast and no term, so existing offers are unchanged', () => {
    const p = person();
    const { followedBy: _f, ...plain } = up;
    expect(bodyForecast(p, plain).spans).toEqual([]);
    expect(bodyForecastTerm(p, plain, lifeModifiers(p))).toBeUndefined();
    const r = decide(p, [plain]);
    expect(r.considered[0]?.terms.some((t) => t.source === 'forecast:body')).toBe(false);
  });

  test('the forecast is pure: the person is unchanged and repeated forecasts agree', () => {
    const p = person();
    p.body.hydration = 0.3;
    const before = snapshot(p);
    const a = bodyForecast(p, up);
    const b = bodyForecast(p, up);
    expect(a).toEqual(b);
    expect(p).toEqual(before);
    expect(a.spans.map((s) => s.label)).toEqual(['up', 'the way down']);
    expect(a.spans[1]?.endsAt).toBe(p.now + 240);
  });

  test('a depleted body expects to be spent for the follow-on; the term is bounded', () => {
    const p = person();
    p.body.hydration = 0.3;
    p.body.satiety = 0.3;
    const f = bodyForecast(p, up);
    expect(f.line).toBe("I can do it, but I'll be too thirsty for the way down.");
    const t = bodyForecastTerm(p, up, lifeModifiers(p));
    expect(t?.value).toBeLessThan(0);
    expect(t?.value).toBeGreaterThanOrEqual(-FORECAST_DEFAULTS.forecastScale);
  });

  test('a rested, fed body expects enough for the follow-on', () => {
    const p = person();
    p.body.hydration = 0.95;
    p.body.satiety = 0.95;
    expect(
      bodyForecastTerm(
        p,
        { ...up, effort: 0.4, followedBy: [{ duration: 60, effort: 0.3 }] },
        lifeModifiers(p),
      ),
    ).toBeUndefined();
    expect(forecastLine([])).toBe('');
  });

  test('spans are bounded in count and total minutes', () => {
    const p = person();
    const many = { ...up, followedBy: Array.from({ length: 10 }, () => ({ duration: 600, effort: 0.1 })) };
    const spans = bodyForecast(p, many).spans;
    expect(spans.length - 1).toBeLessThanOrEqual(FORECAST_DEFAULTS.maxSpans);
    const total = (spans.at(-1)?.endsAt ?? p.now) - p.now;
    expect(total).toBeLessThanOrEqual(FORECAST_DEFAULTS.maxMinutes);
  });

  test('hostile input is bounded: NaN or huge durations, null entries, non-arrays, an empty list', () => {
    const p = person();
    const t0 = performance.now();
    const hostile = [
      { ...up, duration: Number.NaN },
      { ...up, duration: 1e12 },
      { ...up, followedBy: [{ duration: 1e12, effort: 1 }] },
      {
        ...up,
        followedBy: [
          null,
          { duration: Number.NaN, effort: Number.NaN },
        ] as unknown as Affordance['followedBy'],
      },
      { ...up, followedBy: 'down' as unknown as Affordance['followedBy'] },
    ];
    for (const aff of hostile) expect(() => bodyForecastTerm(p, aff, lifeModifiers(p))).not.toThrow();
    expect(performance.now() - t0).toBeLessThan(5000);
    const { followedBy: _f, ...plain } = up;
    const q = person();
    const a = decide(p, [plain]);
    const b = decide(q, [{ ...plain, followedBy: [] }]);
    expect(b.considered).toEqual(a.considered);
  });

  test('headless control: the forecast, not the body alone, changes the choice; renamed domain agrees', () => {
    for (const domain of ['climb', 'haul'] as const) {
      const arms = Object.fromEntries(runBodyForecastControl(domain).map((a) => [a.arm, a]));
      expect(arms['rested-morning']?.chosen).toBe('far');
      expect(arms['depleted-morning']?.chosen).toBe('near');
      // Ablation: the same depleted body without the declared return goes far.
      expect(arms['depleted-undeclared']?.chosen).toBe('far');
      expect(arms['fed-evening']?.forecastTerms.find((t) => t.id === 'far')?.forecast).toBeLessThan(0);
    }
    const strip = (r: ReturnType<typeof runBodyForecastControl>) =>
      r.map((a) => [a.arm, a.chosen, a.forecastTerms]);
    expect(strip(runBodyForecastControl('haul'))).toEqual(strip(runBodyForecastControl('climb')));
  });
});
