/** Per-person retention (2.0.0, perf review H2 P1/P2): smaller traces and a day chronicle bounded by age, no decision changed. */
import { describe, expect, test } from 'vitest';
import * as H from '../src/index.ts';

const DAY = H.MINUTES_PER_DAY;
const ids = ['ada', 'bram'];

function live(days: number, retention?: H.Retention): H.Person[] {
  const people = ids.map((id, i) =>
    H.createPerson({
      ...H.villagerSpec(id, id, 100 + i, { devout: id === 'bram', others: ids, now: 0 }),
      ...(retention ? { retention } : {}),
    }),
  );
  for (const p of people) {
    H.enableGists(p);
    H.enableYearbook(p);
  }
  const world = H.createVillage(people, { seed: 3 });
  const c = H.createCommunity(people);
  H.stepCommunity(c, world, days * DAY + 60, {});
  return people;
}

const without = (p: H.Person) => {
  const {
    trace: _t,
    chronicle: _c,
    chronicleYears: _y,
    retention: _r,
    ...rest
  } = JSON.parse(JSON.stringify(H.snapshot(p))) as Record<string, unknown>;
  return rest;
};

describe('retention (2.0.0)', () => {
  test('absent retention leaves the person as before: full trace, count-bounded chronicle, no retention key', () => {
    const [ada] = live(40) as [H.Person];
    expect(ada.retention).toBeUndefined();
    expect('retention' in H.snapshot(ada)).toBe(false);
    expect(ada.trace.length).toBe(H.PERSON_DEFAULTS.maxTrace);
    expect(ada.chronicle?.length).toBeGreaterThan(35);
  });

  test('a short trace and an age-bounded chronicle change no decision, and the yearbook takes the days at once', () => {
    const days = 75;
    const full = live(days);
    const lean = live(days, { trace: 0, chronicleDays: 31 });
    for (let i = 0; i < full.length; i++) {
      const a = full[i] as H.Person;
      const b = lean[i] as H.Person;
      expect(without(b)).toEqual(without(a));
      expect(b.trace).toHaveLength(0);
      const kept = b.chronicle ?? [];
      const newest = kept[kept.length - 1]?.day ?? 0;
      expect(newest - (kept[0]?.day ?? 0)).toBeLessThanOrEqual(31);
      expect(kept.length).toBeLessThan((a.chronicle ?? []).length);
      // The days that left the chronicle are already in the year record.
      const daysIn = (p: H.Person) => (p.chronicleYears ?? []).reduce((n, y) => n + y.days, 0);
      expect(daysIn(b)).toBe((a.chronicle ?? []).length - kept.length + daysIn(a));
    }
    expect(JSON.stringify(lean.map(H.snapshot)).length).toBeLessThan(
      0.6 * JSON.stringify(full.map(H.snapshot)).length,
    );
  });

  test('retention survives save and restore; invalid values are ignored; setRetention trims at once', () => {
    const [ada] = live(40) as [H.Person];
    H.setRetention(ada, { trace: 2, chronicleDays: 5 });
    expect(ada.retention).toEqual({ trace: 2 });
    expect(ada.trace).toHaveLength(2);
    const back = H.restore(JSON.parse(JSON.stringify(H.snapshot(ada))));
    expect(back.retention).toEqual({ trace: 2 });
    const odd = JSON.parse(JSON.stringify(H.snapshot(ada))) as Record<string, unknown>;
    odd.retention = { trace: -1, chronicleDays: Number.POSITIVE_INFINITY };
    expect(H.restore(odd).retention).toBeUndefined();
    H.setRetention(ada, {});
    expect(ada.retention).toBeUndefined();
  });
});
