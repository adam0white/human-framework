/**
 * Q26 headless control: pregnancy and cold/darkness versus neutral held conditions.
 * Existing coefficients only. Forecasts hold today's context; actual ticks may interpolate differently.
 * No future weather or medical prediction. Run with Node >=24.
 */

import { BODY_DEFAULTS } from '../src/body/index.ts';
import { ambientBodyParams } from '../src/environment/index.ts';
import {
  type Affordance,
  begin,
  bodyForecast,
  createPerson,
  decide,
  readBody,
  setAmbient,
  snapshot,
  tick,
} from '../src/index.ts';

export const q26Offer: Affordance = {
  id: 'haul',
  action: 'haul',
  label: 'haul',
  duration: 90,
  effort: 0.7,
  advertises: {},
  followedBy: [{ label: 'return', duration: 120, effort: 0.5 }],
};

export function q26Person(pregnant = false, cold = false) {
  const p = createPerson({
    id: 'p',
    name: 'P',
    seed: 52,
    now: 540,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    enable: { fatigueStore: true },
  });
  if (pregnant)
    p.family = {
      pregnancy: { fatherId: 'f', conceivedAt: p.now - 200 * 1440, dueAt: p.now + 68 * 1440, seed: 12 },
    };
  if (cold) setAmbient(p, { cold: 0.9, dark: 0.8 });
  p.body.satiety = 0.55;
  p.body.hydration = 0.65;
  return p;
}

export function runQ26ConditionedForecastControl() {
  return [
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ].map(([pregnant, cold]) => {
    const p = q26Person(pregnant, cold);
    const legacy = bodyForecast(p, q26Offer);
    const conditioned = bodyForecast(p, q26Offer, { forecastContext: 'conditioned' });
    const sim = snapshot(p);
    const params = sim.ambient ? ambientBodyParams(sim, BODY_DEFAULTS) : BODY_DEFAULTS;
    const actual = [];
    for (const aff of [
      q26Offer,
      {
        ...q26Offer,
        id: 'return',
        action: 'return',
        label: 'return',
        duration: 120,
        effort: 0.5,
      },
    ]) {
      begin(sim, aff, decide(sim, [aff]));
      const start = readBody(sim, params).perceived;
      let worst = Math.max(start.fatigue, start.sleepiness, start.hunger, start.thirst);
      for (let left = aff.duration; left > 0; ) {
        const dt = Math.min(30, left);
        tick(sim, sim.now + dt);
        const r = readBody(sim, params).perceived;
        worst = Math.max(worst, r.fatigue, r.sleepiness, r.hunger, r.thirst);
        left -= dt;
      }
      actual.push(worst);
    }
    return {
      pregnant,
      cold,
      legacy: legacy.spans.map((s) => s.worst),
      conditioned: conditioned.spans.map((s) => s.worst),
      actual,
    };
  });
}

if (process.argv[1]?.endsWith('/q26-conditioned-forecast-control.ts'))
  console.log(JSON.stringify(runQ26ConditionedForecastControl(), null, 2));
