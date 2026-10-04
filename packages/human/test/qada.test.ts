/**
 * Missed duties and make-up debt (engine 1.7.0, research/decisions.md, research/capacity-and-excuse-sources.md):
 * blame and debt are kept apart; sleep and unconsciousness lift the blame, not the debt; a long downing waives its
 * stretch; make-ups carry no blame. Plus the prayer-time defaults: Fajr ends at sunrise, disliked times, Eid window.
 */
import { describe, expect, test } from 'vitest';
import {
  AGENDA_DEFAULTS,
  advanceAgenda,
  createAgenda,
  DEFAULT_PRAYER_TIMES,
  eidWindow,
  inMakruhTime,
  makruhWindows,
  missedExcuse,
  owedMakeUps,
  type PrayerCalendar,
  prayerWindows,
  promise,
  scheduleMakeUp,
} from '../src/agenda/index.ts';
import { DEFAULT_NORMS } from '../src/conscience/index.ts';
import {
  begin,
  createPerson,
  createVillage,
  decide,
  knockDown,
  MINUTES_PER_DAY,
  tick,
  villagerSpec,
} from '../src/index.ts';
import type { Affordance, BodyState, HeldNorm, Person } from '../src/types.ts';

const DAY = MINUTES_PER_DAY;
const T = DEFAULT_PRAYER_TIMES;
const salah: HeldNorm = { normId: 'salah', standing: 'obligatory', conviction: 0.9 };

function person(body: Partial<BodyState> = {}, norms: HeldNorm[] = [salah]): Person {
  return {
    id: 'p1',
    now: 0,
    agenda: createAgenda({}, 0),
    conscience: { norms, breaches: [], intentions: [], nextBreach: 0 },
    body: { asleep: false, since: 0, ...body },
  } as unknown as Person;
}
const fajr = (p: Person) => promise(p, prayerWindows(0)[0] as Parameters<typeof promise>[1]);

describe('prayer-time defaults (research/decisions.md)', () => {
  test('Fajr ends at sunrise; a calendar without sunrise falls back to Dhuhr', () => {
    expect(T.sunrise).toBeLessThan(T.dhuhr);
    expect(prayerWindows(2)[0]).toMatchObject({ from: 2 * DAY + T.fajr, until: 2 * DAY + T.sunrise });
    // A pre-1.7.0 calendar (no sunrise) read from old JSON.
    const old = (() => ({
      fajr: 300,
      dhuhr: 750,
      asr: 960,
      maghrib: 1125,
      isha: 1215,
    })) as unknown as PrayerCalendar;
    expect(prayerWindows(0, old)[0]?.until).toBe(750);
  });

  test('disliked times: just after sunrise, the zenith before Dhuhr, before sunset; never inside Asr-to-Dhuhr gap', () => {
    const w = makruhWindows(1);
    expect(w.map((x) => x.label)).toEqual(['sunrise', 'zenith', 'sunset']);
    const sunrise = DAY + T.sunrise;
    expect(inMakruhTime(sunrise + 5)).toBe(true);
    expect(inMakruhTime(DAY + T.dhuhr - 5)).toBe(true);
    expect(inMakruhTime(DAY + T.maghrib - 5)).toBe(true);
    expect(inMakruhTime(DAY + T.dhuhr + 30)).toBe(false);
  });

  test('the Eid window runs from 20 minutes after sunrise until the zenith before Dhuhr', () => {
    const w = eidWindow(3);
    expect(w.from).toBe(3 * DAY + T.sunrise + 20);
    expect(w.until).toBe(3 * DAY + T.dhuhr - 10);
    const norm = DEFAULT_NORMS.find((n) => n.id === 'eid-prayer');
    expect(norm?.standing).toBe('recommended');
    expect(norm?.sources?.some((s) => s.ref.includes('eid-and-mourning-sources.md'))).toBe(true);
  });
});

describe('missed worship: blame versus debt', () => {
  test('asleep from before the window opened until after it closed: released, no blame, a make-up owed', () => {
    const p = person({ asleep: true, since: T.fajr - 60 });
    fajr(p);
    const r = advanceAgenda(p, T.sunrise + 1);
    expect(r.broken).toEqual([]);
    expect(r.excused.map((c) => c.exempt?.reason)).toEqual(['sleep']);
    expect(owedMakeUps(p).map((o) => o.reason)).toEqual(['sleep']);
    expect(r.recurred).toHaveLength(1); // the chain goes on
  });

  test('a finished sleep counts if he woke no earlier than the grace before the window closed', () => {
    const until = T.sunrise ?? 0;
    const near = person({ lastSleep: { from: T.fajr - 300, to: until - AGENDA_DEFAULTS.wakeGrace } });
    const far = person({ lastSleep: { from: T.fajr - 300, to: until - 30 } });
    for (const p of [near, far]) fajr(p);
    expect(advanceAgenda(near, until + 1).broken).toEqual([]);
    expect(advanceAgenda(far, until + 1).broken).toHaveLength(1);
    expect(owedMakeUps(far).map((o) => o.reason)).toEqual(['missed']);
  });

  test('sleep begun inside the open window is not excused (the stricter reading)', () => {
    const p = person({ asleep: true, since: T.fajr + 10 });
    fajr(p);
    const r = advanceAgenda(p, T.sunrise + 1);
    expect(r.broken).toHaveLength(1);
    expect(owedMakeUps(p).map((o) => o.reason)).toEqual(['missed']);
  });

  test('downed when it closed: excused as unconscious, even if he went down after it opened', () => {
    const p = person({ downed: { since: T.fajr + 30, reason: 'hit' } } as Partial<BodyState>);
    fajr(p);
    expect(missedExcuse(p, p.agenda.commitments[0] as never)).toBe('unconscious');
    const r = advanceAgenda(p, T.sunrise + 1);
    expect(r.excused.map((c) => c.exempt?.reason)).toEqual(['unconscious']);
    expect(owedMakeUps(p).map((o) => [o.reason, o.lapseSince])).toEqual([['unconscious', T.fajr + 30]]);
  });

  test('more than five windows within one downing drops that stretch of debt', () => {
    const p = person({ downed: { since: 0, reason: 'fever' } } as Partial<BodyState>);
    for (const c of prayerWindows(0)) promise(p, c);
    advanceAgenda(p, DAY + T.fajr + 1); // five windows: Fajr through Isha
    expect(owedMakeUps(p)).toHaveLength(5);
    advanceAgenda(p, DAY + T.sunrise + 1); // the sixth
    expect(owedMakeUps(p)).toEqual([]);
    expect(p.agenda.lapse).toEqual({ since: 0, missed: 6 });
    advanceAgenda(p, DAY + T.asr + 1); // and no more is added in the same stretch
    expect(owedMakeUps(p)).toEqual([]);
  });

  test('only an obligation the person holds as obligatory leaves a debt', () => {
    const rec = person({}, [{ ...salah, standing: 'recommended' }]);
    const none = person({}, []);
    for (const p of [rec, none]) {
      fajr(p);
      advanceAgenda(p, T.sunrise + 1);
      expect(owedMakeUps(p)).toEqual([]);
    }
  });

  test('a make-up left unkept carries no blame and its debt is open again', () => {
    const p = person();
    fajr(p);
    advanceAgenda(p, T.sunrise + 1);
    const made = scheduleMakeUp(
      p,
      owedMakeUps(p)[0]?.ofId ?? '',
      { from: T.dhuhr + 15, until: T.asr - 15 },
      { actions: ['pray-qada'] },
    );
    expect(made?.actions).toEqual(['pray-qada']);
    expect(p.agenda.owed?.[0]?.scheduledAs).toBe(made?.id);
    expect(owedMakeUps(p)).toEqual([]);
    const r = advanceAgenda(p, T.asr);
    expect(r.broken).toEqual([]);
    expect(p.agenda.commitments.find((c) => c.id === made?.id)?.status).toBe('released');
    expect(owedMakeUps(p).map((o) => o.scheduledAs)).toEqual([undefined]);
  });
});

describe('through the composite: control scenario', () => {
  function devout(now: number): { p: Person; affs: Affordance[] } {
    const p = createPerson(villagerSpec('a', 'A', 3, { devout: true, now }));
    const other = createPerson(villagerSpec('b', 'B', 9, { now }));
    return { p, affs: createVillage([p, other], { seed: 1 }).affordancesFor(p) };
  }
  const salahBreaches = (p: Person) => p.conscience.breaches.filter((b) => b.normId === 'salah');

  test('sleeping through Fajr: no breach, a make-up owed; awake and able: a breach and a make-up owed', () => {
    const asleep = devout(T.fajr - 60);
    const sleep = asleep.affs.find((a) => a.action === 'sleep') as Affordance;
    begin(asleep.p, sleep, decide(asleep.p, [sleep]));
    tick(asleep.p, T.sunrise + 60);
    expect(salahBreaches(asleep.p)).toEqual([]);
    expect(owedMakeUps(asleep.p).map((o) => o.reason)).toEqual(['sleep']);

    const awake = devout(T.fajr - 60);
    const work: Affordance = {
      id: 'chores',
      action: 'chores',
      label: 'chores',
      duration: 240,
      effort: 0.1,
      advertises: {},
    };
    begin(awake.p, work, decide(awake.p, [work]));
    tick(awake.p, T.sunrise + 60);
    expect(salahBreaches(awake.p)).toHaveLength(1);
    expect(owedMakeUps(awake.p).map((o) => o.reason)).toEqual(['missed']);
  });

  test('downed through a whole day: no breach, and the stretch of debt is waived', () => {
    const { p } = devout(T.fajr - 60);
    knockDown(p, { reason: 'fever', until: 2 * DAY });
    tick(p, DAY + T.asr);
    expect(salahBreaches(p)).toEqual([]);
    expect(owedMakeUps(p)).toEqual([]);
  });
});
