import { describe, expect, test } from 'vitest';
import {
  ambientMood,
  begin,
  clearAmbient,
  createPerson,
  decide,
  finish,
  restore,
  setAmbient,
  snapshot,
  tick,
} from '../src/index.ts';
import type { Affordance, Person, PersonSpec } from '../src/types.ts';
import { MINUTES_PER_YEAR } from '../src/types.ts';

const H = 60;
const NOW = 8 * H;

function person(extra: Partial<PersonSpec> = {}): Person {
  return createPerson({
    id: 'p',
    name: 'P',
    seed: 4,
    now: NOW,
    bornAt: NOW - 30 * MINUTES_PER_YEAR,
    sex: 'male',
    ...extra,
  });
}

const SLEEP: Affordance = {
  id: 'sleep',
  action: 'sleep',
  label: 'Sleep',
  duration: 8 * H,
  effort: 0,
  mode: 'sleep',
  advertises: { sleep: 1 },
};
const HAUL: Affordance = {
  id: 'haul',
  action: 'haul',
  label: 'Haul',
  duration: 2 * H,
  effort: 0.8,
  advertises: {},
};

describe('environment: the night watch (control scenario)', () => {
  test('a cold dark night lowers mood, uses more food, and leaves the body less rested than a warm lit hall', () => {
    const night = person();
    const hall = person();
    const none = person();
    setAmbient(night, { cold: 0.8, dark: 0.9, outdoors: true, weather: -0.5 });
    setAmbient(hall, { beauty: 0.3, crowding: 0.2 });
    for (const p of [night, hall, none]) tick(p, NOW + 6 * H);
    expect(night.affect.mood.valence).toBeLessThan(none.affect.mood.valence - 0.02);
    expect(hall.affect.mood.valence).toBeGreaterThan(none.affect.mood.valence);
    expect(night.body.satiety).toBeLessThan(none.body.satiety);
    expect(night.body.sleepPressure).toBeGreaterThan(none.body.sleepPressure);

    // Hard work then sleep: in the cold, exertion and sleep pressure clear more slowly.
    for (const p of [night, none]) {
      begin(p, HAUL, decide(p, [HAUL]));
      tick(p, p.now + 2 * H);
      finish(p, { affordanceId: 'haul', action: 'haul', status: 'completed', at: p.now });
      begin(p, SLEEP, decide(p, [SLEEP]));
      tick(p, p.now + 4 * H);
    }
    expect(night.body.exertion).toBeGreaterThan(none.body.exertion);
    expect(night.body.sleepPressure).toBeGreaterThan(none.body.sleepPressure);

    // Back in a warm hall the difference closes.
    const gap = none.affect.mood.valence - night.affect.mood.valence;
    setAmbient(night, { beauty: 0.3 });
    for (const p of [night, none]) {
      finish(p, { affordanceId: 'sleep', action: 'sleep', status: 'completed', at: p.now });
      tick(p, p.now + 12 * H);
    }
    expect(none.affect.mood.valence - night.affect.mood.valence).toBeLessThan(gap);
  });

  test('the offsets are small, and a person with no surroundings is untouched', () => {
    const p = person({ traits: { emotionality: 1, extraversion: 0 } });
    setAmbient(p, { cold: 1, dark: 1, dayLength: 6, weather: -1, outdoors: true, beauty: -1, crowding: 1 });
    expect(ambientMood(p)).toBeGreaterThan(-0.4);
    expect(ambientMood(p)).toBeLessThan(-0.25);
    clearAmbient(p);
    expect(ambientMood(p)).toBe(0);
    expect(p.ambient).toBeUndefined();
  });

  test('short winter days weigh more on an emotional person; good weather counts mostly outdoors', () => {
    const calm = person({ traits: { emotionality: 0.1 } });
    const anxious = person({ traits: { emotionality: 0.9 } });
    for (const p of [calm, anxious]) setAmbient(p, { dayLength: 8 });
    expect(ambientMood(anxious)).toBeLessThan(ambientMood(calm));
    const out = person();
    const inside = person();
    setAmbient(out, { weather: 1, outdoors: true });
    setAmbient(inside, { weather: 1, outdoors: false });
    expect(ambientMood(out)).toBeGreaterThan(ambientMood(inside));
  });

  test('crowding drains an introvert’s autonomy more; squalor drains safety; beauty brings awe on arrival', () => {
    const intro = person({ traits: { extraversion: 0.1 } });
    const extra = person({ traits: { extraversion: 0.9 } });
    for (const p of [intro, extra]) {
      setAmbient(p, { crowding: 0.8 });
      tick(p, NOW + 8 * H);
    }
    expect(intro.needs.autonomy).toBeLessThan(extra.needs.autonomy);
    const slum = person();
    const plain = person();
    setAmbient(slum, { beauty: -0.8 });
    for (const p of [slum, plain]) tick(p, NOW + 8 * H);
    expect(slum.needs.safety).toBeLessThan(plain.needs.safety);
    const view = person();
    setAmbient(view, { beauty: 0.9, outdoors: true });
    expect(view.affect.emotions.some((e) => e.id === 'awe')).toBe(true);
    const again = view.affect.emotions.find((e) => e.id === 'awe')?.intensity;
    setAmbient(view, { beauty: 0.9, outdoors: true });
    expect(view.affect.emotions.find((e) => e.id === 'awe')?.intensity).toBe(again);
  });

  test('the ambient slice survives a save; a malformed one is dropped', () => {
    const p = person();
    setAmbient(p, { cold: 0.5, dayLength: 9, outdoors: true });
    const back = restore(JSON.parse(JSON.stringify(snapshot(p))));
    expect(back.ambient).toEqual(p.ambient);
    const bad = JSON.parse(JSON.stringify(snapshot(p)));
    bad.ambient = { now: {} };
    expect(restore(bad).ambient).toBeUndefined();
  });
});
