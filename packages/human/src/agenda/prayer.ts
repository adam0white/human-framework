/**
 * SCOPE: worship and Ramadan schedules as commitments. Prayer and fasting times come from the host (location
 * and date dependent); this module only shapes them into windows. A `PrayerCalendar` gives each day's times so
 * that `retimeCommitments` (agenda.ts) can move recurring windows as the times drift. The fast's window is
 * fajr..maghrib, following Qur'an 2:187 ("eat and drink until you see the light of dawn ... then complete the fast
 * until nightfall"; Khattab translation, quran.com, checked 2026-10-03), with fajr standing for true dawn and
 * maghrib for nightfall as hosts usually tabulate them. The default violating actions are eating and drinking
 * (named in 2:187); anything else a host lists (e.g. smoking) is the host's understanding and should carry its
 * own provenance. Suhoor and iftar lengths are engineering defaults. The Eid prayer's standing differs between
 * schools and is not catalogued, so the helper links no norm unless the host passes one. Nothing here models
 * the end of the Fajr window at sunrise or local moon sighting.
 */
import type { Commitment, Minute } from '../types.ts';
import { MINUTES_PER_DAY } from '../types.ts';
import type { Retimer } from './agenda.ts';

/**
 * A fixed, fictional mid-latitude schedule (minutes of day) used when the host supplies none. Real prayer
 * times depend on location and date; hosts should supply them. Windows here run from each prayer time
 * until the next one (Isha until the next day's Fajr), which simplifies the actual endings (e.g. Fajr
 * ends at sunrise).
 */
export const DEFAULT_PRAYER_TIMES = {
  fajr: 300, // 05:00
  dhuhr: 750, // 12:30
  asr: 960, // 16:00
  maghrib: 1125, // 18:45
  isha: 1215, // 20:15
};

export type PrayerTimes = typeof DEFAULT_PRAYER_TIMES;
/** Host calendar: the prayer times (minutes of day) for day index `day`. */
export type PrayerCalendar = (day: number) => PrayerTimes;
export type PrayerSchedule = PrayerTimes | PrayerCalendar;

/** Engineering default importance of each prayer window commitment. */
export const PRAYER_IMPORTANCE = 0.8;

export const RAMADAN_DEFAULTS = {
  /** Fast importance (engineering default; conviction comes from the held norm). */
  fastImportance: 0.9,
  /** Suhoor window: this many minutes before fajr until fajr. */
  suhoorLead: 60,
  /** Iftar window: maghrib until this many minutes after. */
  iftarLength: 45,
  mealImportance: 0.5,
  violatedBy: ['eat', 'drink'],
};

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

export const timesFor = (schedule: PrayerSchedule, day: number): PrayerTimes =>
  typeof schedule === 'function' ? schedule(day) : schedule;

/** Window of prayer `index` (0 = Fajr .. 4 = Isha) on `day`; Isha runs to the next day's Fajr. */
function prayerWindow(schedule: PrayerSchedule, day: number, index: number): { from: Minute; until: Minute } {
  const t = timesFor(schedule, day);
  const order = [t.fajr, t.dhuhr, t.asr, t.maghrib, t.isha];
  const base = day * MINUTES_PER_DAY;
  const start = order[index] ?? t.fajr;
  const next = order[index + 1] ?? timesFor(schedule, day + 1).fajr + MINUTES_PER_DAY;
  return { from: base + start, until: base + next };
}

/**
 * Five daily worship commitments for `day`, each recurring every 24 h, chained as `salah:<name>`. Pass a
 * `PrayerCalendar` to take the day's own times; keep them current over a month with
 * `retimeCommitments(p, now, calendarRetimer(calendar))`. Output can go straight into `PersonSpec.commitments`.
 */
export function prayerWindows(
  day: number,
  schedule: PrayerSchedule = DEFAULT_PRAYER_TIMES,
): Omit<Commitment, 'id' | 'status'>[] {
  return PRAYER_NAMES.map((name, i) => ({
    kind: 'worship',
    actions: ['pray'],
    ...prayerWindow(schedule, day, i),
    normId: 'salah',
    importance: PRAYER_IMPORTANCE,
    recurEvery: MINUTES_PER_DAY,
    label: name,
    chain: `salah:${name.toLowerCase()}`,
  }));
}

/** The fast's window on `day`: fajr until maghrib (Qur'an 2:187). */
export function fastWindow(
  day: number,
  schedule: PrayerSchedule = DEFAULT_PRAYER_TIMES,
): { from: Minute; until: Minute } {
  const t = timesFor(schedule, day);
  const base = day * MINUTES_PER_DAY;
  return { from: base + t.fajr, until: base + t.maghrib };
}

/** Suhoor: the last `suhoorLead` minutes before fajr. */
export function suhoorWindow(
  day: number,
  schedule: PrayerSchedule = DEFAULT_PRAYER_TIMES,
  lead: number = RAMADAN_DEFAULTS.suhoorLead,
): { from: Minute; until: Minute } {
  const { from } = fastWindow(day, schedule);
  return { from: from - lead, until: from };
}

/** Iftar: from maghrib for `iftarLength` minutes. */
export function iftarWindow(
  day: number,
  schedule: PrayerSchedule = DEFAULT_PRAYER_TIMES,
  length: number = RAMADAN_DEFAULTS.iftarLength,
): { from: Minute; until: Minute } {
  const { until } = fastWindow(day, schedule);
  return { from: until, until: until + length };
}

/**
 * The Ramadan fast from `firstDay` for `days` days as one recurring `abstain` commitment (chain 'sawm:fast'),
 * linked to the catalogued 'sawm-ramadan' norm, exemptable for illness and travel (Qur'an 2:184-185, see the
 * catalog's `exemptions`). `recurUntil` stops the chain after the last day.
 */
export function ramadanFast(
  firstDay: number,
  days: number,
  schedule: PrayerSchedule = DEFAULT_PRAYER_TIMES,
  opts: { importance?: number; violatedBy?: string[] } = {},
): Omit<Commitment, 'id' | 'status'> {
  return {
    kind: 'abstain',
    actions: [],
    violatedBy: [...(opts.violatedBy ?? RAMADAN_DEFAULTS.violatedBy)],
    ...fastWindow(firstDay, schedule),
    normId: 'sawm-ramadan',
    importance: opts.importance ?? RAMADAN_DEFAULTS.fastImportance,
    recurEvery: MINUTES_PER_DAY,
    recurUntil: (firstDay + Math.max(1, days)) * MINUTES_PER_DAY - 1,
    exemptWhen: ['illness', 'travel'],
    label: 'fast',
    chain: 'sawm:fast',
    toId: 'self',
  };
}

/** Recurring suhoor and iftar meal appointments over the same days (no linked norm). */
export function ramadanMeals(
  firstDay: number,
  days: number,
  schedule: PrayerSchedule = DEFAULT_PRAYER_TIMES,
  opts: { importance?: number; action?: string } = {},
): Omit<Commitment, 'id' | 'status'>[] {
  const common = {
    kind: 'appointment' as const,
    actions: [opts.action ?? 'eat'],
    importance: opts.importance ?? RAMADAN_DEFAULTS.mealImportance,
    recurEvery: MINUTES_PER_DAY,
    recurUntil: (firstDay + Math.max(1, days)) * MINUTES_PER_DAY - 1,
    toId: 'self',
  };
  return [
    { ...common, ...suhoorWindow(firstDay, schedule), label: 'suhoor', chain: 'sawm:suhoor' },
    { ...common, ...iftarWindow(firstDay, schedule), label: 'iftar', chain: 'sawm:iftar' },
  ];
}

/**
 * A one-off Eid prayer commitment over a host-given window (no recurrence). Its action defaults to 'pray-eid' so
 * the daily prayer windows do not absorb it; no norm is linked unless the host supplies one with provenance.
 */
export function eidPrayer(
  window: { from: Minute; until: Minute },
  opts: { normId?: string; importance?: number; actions?: string[]; label?: string } = {},
): Omit<Commitment, 'id' | 'status'> {
  return {
    kind: 'worship',
    actions: [...(opts.actions ?? ['pray-eid'])],
    from: window.from,
    until: window.until,
    importance: opts.importance ?? PRAYER_IMPORTANCE,
    label: opts.label ?? 'Eid prayer',
    ...(opts.normId !== undefined ? { normId: opts.normId } : {}),
  };
}

/**
 * Retimer for `retimeCommitments`: maps chains made here ('salah:<name>', 'sawm:fast', 'sawm:suhoor',
 * 'sawm:iftar') to the calendar's window for the commitment's day; other chains are left alone.
 */
export function calendarRetimer(
  calendar: PrayerCalendar,
  opts: { suhoorLead?: number; iftarLength?: number } = {},
): Retimer {
  return (c) => {
    const day = Math.floor(c.from / MINUTES_PER_DAY);
    if (c.chain?.startsWith('salah:')) {
      const i = PRAYER_NAMES.findIndex((n) => `salah:${n.toLowerCase()}` === c.chain);
      return i >= 0 ? prayerWindow(calendar, day, i) : undefined;
    }
    // A suhoor window sits before fajr of the fast it precedes; when the lead crosses midnight it is that day.
    if (c.chain === 'sawm:suhoor') {
      const lead = opts.suhoorLead ?? RAMADAN_DEFAULTS.suhoorLead;
      return suhoorWindow(Math.floor((c.from + lead) / MINUTES_PER_DAY), calendar, lead);
    }
    if (c.chain === 'sawm:fast') return fastWindow(day, calendar);
    if (c.chain === 'sawm:iftar')
      return iftarWindow(day, calendar, opts.iftarLength ?? RAMADAN_DEFAULTS.iftarLength);
    return undefined;
  };
}
