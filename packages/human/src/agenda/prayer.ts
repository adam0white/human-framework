/**
 * SCOPE: worship and Ramadan schedules as commitments. Prayer and fasting times come from the host (location
 * and date dependent); this module only shapes them into windows. A `PrayerCalendar` gives each day's times so
 * that `retimeCommitments` (agenda.ts) can move recurring windows as the times drift. The fast's window is
 * fajr..maghrib, following Qur'an 2:187 ("eat and drink until you see the light of dawn ... then complete the fast
 * until nightfall"; Khattab translation, quran.com, checked 2026-10-03), with fajr standing for true dawn and
 * maghrib for nightfall as hosts usually tabulate them. The default violating actions are eating and drinking
 * (named in 2:187); anything else a host lists (e.g. smoking) is the host's understanding and should carry its
 * own provenance. Suhoor and iftar lengths are engineering defaults.
 *
 * Window boundaries (engine 1.7.0) follow research/decisions.md, which records the framework's default
 * understanding where schools differ (the most common position overall; engineering choices, not rulings):
 * - Fajr runs from true dawn until sunrise (agreed across schools; research/prayer-times-sources.md §1). The host
 *   supplies `sunrise` with the other times.
 * - Asr begins when a shadow equals its object's length plus the noon shadow (the majority position, and Diyanet's
 *   calendar; prayer-times-sources.md §1), and Maghrib ends when the red twilight goes (the majority; §2). The
 *   framework computes no astronomy: a host's `asr` and `isha` times carry these positions, and a host that
 *   tabulates by another position (Abu Hanifa's two shadow lengths, the white twilight) has chosen differently.
 *   `DEFAULT_PRAYER_TIMES` and the town calendar are fictional numbers placed where the decided positions put them.
 * - Isha is valid until true dawn (prayer-times-sources.md §1), so its window runs to the next day's Fajr. Its
 *   preferred end (midnight, decisions.md) is not distinguished from its valid end: no window here carries a
 *   preferred part, so delaying Isha past midnight costs nothing extra.
 * - Disliked (makruh) times: `makruhWindows` gives sunrise until `MAKRUH_DEFAULTS.afterSunrise` minutes after,
 *   the minutes before Dhuhr (solar zenith) and the last minutes before sunset (prayer-times-sources.md §3;
 *   decisions.md). The 20 minutes after sunrise is a labelled simplification (Diyanet gives 40-50). Nothing vetoes
 *   prayer in them; hosts use them to place make-ups and the Eid prayer. The day's own Asr may still be prayed
 *   before sunset (its window is unchanged).
 * - The Eid al-Fitr prayer (`eidWindow`, `eidPrayer`): from `afterSunrise` minutes after sunrise until the zenith
 *   makruh before Dhuhr, congregational, strongly emphasised, no individual make-up
 *   (research/eid-and-mourning-sources.md §1; decisions.md). It links the catalog's `eid-prayer` norm (recorded
 *   as recommended: sunnah mu'akkada for most schools, wajib for Hanafis), so missing it is no breach and owes
 *   nothing.
 * Nothing here models local moon sighting.
 */
import type { Commitment, Minute } from '../types.ts';
import { MINUTES_PER_DAY } from '../types.ts';
import type { Retimer } from './agenda.ts';

/**
 * A fixed, fictional mid-latitude schedule (minutes of day) used when the host supplies none. Real prayer
 * times depend on location and date; hosts should supply them. Fajr runs until `sunrise`; every other window
 * runs until the next prayer time (Isha until the next day's Fajr). `asr` stands for the one-shadow-length time
 * and `isha` for the end of the red twilight (see SCOPE); the numbers are not computed from any place.
 */
export const DEFAULT_PRAYER_TIMES = {
  fajr: 300, // 05:00
  sunrise: 390, // 06:30
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

/**
 * Window of prayer `index` (0 = Fajr .. 4 = Isha) on `day`. Fajr ends at sunrise (research/decisions.md); Isha
 * runs to the next day's Fajr; the others run to the next prayer time.
 */
function prayerWindow(schedule: PrayerSchedule, day: number, index: number): { from: Minute; until: Minute } {
  const t = timesFor(schedule, day);
  const order = [t.fajr, t.dhuhr, t.asr, t.maghrib, t.isha];
  const base = day * MINUTES_PER_DAY;
  const start = order[index] ?? t.fajr;
  // A plain-JS host from before 1.7.0 may omit sunrise: Fajr then runs to Dhuhr as it used to.
  const fajrEnd = (t as Partial<PrayerTimes>).sunrise ?? t.dhuhr;
  const next =
    index === 0 ? fajrEnd : (order[index + 1] ?? timesFor(schedule, day + 1).fajr + MINUTES_PER_DAY);
  return { from: base + start, until: base + next };
}

/**
 * Disliked-time lengths in minutes (research/decisions.md; prayer-times-sources.md §3). `afterSunrise` is the
 * labelled simplification of decisions.md (about 20 minutes; Diyanet gives 40-50); `beforeDhuhr` follows
 * Diyanet's "about 10 minutes before Dhuhr enters"; `beforeSunset` stands for "the last minutes before sunset" and
 * is an engineering default (Diyanet gives 40-50). Sunset is taken as the host's `maghrib`.
 */
export const MAKRUH_DEFAULTS = { afterSunrise: 20, beforeDhuhr: 10, beforeSunset: 20 };

/** The three disliked windows of `day` (absolute minutes): after sunrise, before Dhuhr, before sunset. */
export function makruhWindows(
  day: number,
  schedule: PrayerSchedule = DEFAULT_PRAYER_TIMES,
  lengths: typeof MAKRUH_DEFAULTS = MAKRUH_DEFAULTS,
): { from: Minute; until: Minute; label: 'sunrise' | 'zenith' | 'sunset' }[] {
  const t = timesFor(schedule, day);
  const base = day * MINUTES_PER_DAY;
  return [
    { from: base + t.sunrise, until: base + t.sunrise + lengths.afterSunrise, label: 'sunrise' },
    { from: base + t.dhuhr - lengths.beforeDhuhr, until: base + t.dhuhr, label: 'zenith' },
    { from: base + t.maghrib - lengths.beforeSunset, until: base + t.maghrib, label: 'sunset' },
  ];
}

/** Whether minute `at` falls inside a disliked window of its day. */
export function inMakruhTime(at: Minute, schedule: PrayerSchedule = DEFAULT_PRAYER_TIMES): boolean {
  const day = Math.floor(at / MINUTES_PER_DAY);
  return makruhWindows(day, schedule).some((w) => at >= w.from && at < w.until);
}

/**
 * The Eid prayer's window on `day`: from the end of the sunrise makruh until the zenith makruh before Dhuhr
 * (research/eid-and-mourning-sources.md §1: after sunrise once the kerahat has passed, until zawal).
 */
export function eidWindow(
  day: number,
  schedule: PrayerSchedule = DEFAULT_PRAYER_TIMES,
): { from: Minute; until: Minute } {
  const t = timesFor(schedule, day);
  const base = day * MINUTES_PER_DAY;
  return {
    from: base + t.sunrise + MAKRUH_DEFAULTS.afterSunrise,
    until: base + t.dhuhr - MAKRUH_DEFAULTS.beforeDhuhr,
  };
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

/** Engineering default importance of the Eid prayer commitment: a quiet pull, below the daily prayers. */
export const EID_PRAYER_IMPORTANCE = 0.5;

/**
 * A one-off Eid prayer commitment over a window (no recurrence; `eidWindow` gives the default one). Its action
 * defaults to 'pray-eid' so the daily prayer windows do not absorb it. It links the catalog's `eid-prayer` norm
 * (recommended; research/eid-and-mourning-sources.md §1) unless the host passes another `normId`, or `null` for
 * none. There is no individual make-up: a recommended norm owes none.
 */
export function eidPrayer(
  window: { from: Minute; until: Minute },
  opts: { normId?: string | null; importance?: number; actions?: string[]; label?: string } = {},
): Omit<Commitment, 'id' | 'status'> {
  const normId = opts.normId === undefined ? 'eid-prayer' : opts.normId;
  return {
    kind: 'worship',
    actions: [...(opts.actions ?? ['pray-eid'])],
    from: window.from,
    until: window.until,
    importance: opts.importance ?? EID_PRAYER_IMPORTANCE,
    label: opts.label ?? 'Eid prayer',
    ...(normId !== null ? { normId } : {}),
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
