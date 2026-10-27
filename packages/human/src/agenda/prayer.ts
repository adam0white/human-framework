/** SCOPE: pure calendar projections of sourced held worship schedules, never astronomy or rulings.
 * Prayer boundaries follow research/prayer-times-sources.md and research/decisions.md.
 * Fasting windows are explicit authored data carrying their own provenance. */
import type {
  CalendarDay,
  CalendarDefinition,
  CommitmentData,
  DeepReadonly,
  Effective_RAMADAN_DEFAULTS,
} from '../run-schema.ts';
export const MAKRUH_DEFAULTS = { afterSunrise: 20, beforeDhuhr: 10, beforeSunset: 20 };
export const RAMADAN_DEFAULTS = {
  fastImportance: 0.9,
  suhoorLead: 60,
  iftarLength: 45,
  mealImportance: 0.5,
  violatedBy: ['eat', 'drink'],
};
export const PRAYER_IMPORTANCE = 0.8;
export const EID_PRAYER_IMPORTANCE = 0.5;
const names = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export function prayerWindows(day: DeepReadonly<CalendarDay>): CommitmentData[] {
  const t = day.prayers;
  if (!t) return [];
  if (day.nextFajrMs === undefined) throw new RangeError('Isha requires the next supplied dawn');
  const starts = [t.fajrMs, t.dhuhrMs, t.asrMs, t.maghribMs, t.ishaMs],
    ends = [t.sunriseMs, t.asrMs, t.maghribMs, t.ishaMs, 86400000 + day.nextFajrMs];
  return names.map((name, i) => {
    const start = starts[i],
      end = ends[i];
    if (
      start === undefined ||
      end === undefined ||
      !Number.isSafeInteger(day.start + start) ||
      !Number.isSafeInteger(day.start + end) ||
      end <= start
    )
      throw new RangeError('Invalid supplied prayer window');
    return {
      id: `salah:${day.dayIndex}:${name.toLowerCase()}`,
      kind: 'worship',
      actions: ['pray'],
      from: day.start + start,
      until: day.start + end,
      normId: 'salah',
      importance: PRAYER_IMPORTANCE,
      label: name,
      chain: `salah:${name.toLowerCase()}`,
    };
  });
}
export function makruhWindows(
  day: DeepReadonly<CalendarDay>,
): { from: number; until: number; label: string }[] {
  const p = day.prayers;
  if (!p) return [];
  return [
    {
      from: day.start + p.sunriseMs,
      until: day.start + p.sunriseMs + MAKRUH_DEFAULTS.afterSunrise * 60000,
      label: 'sunrise',
    },
    {
      from: day.start + p.dhuhrMs - MAKRUH_DEFAULTS.beforeDhuhr * 60000,
      until: day.start + p.dhuhrMs,
      label: 'zenith',
    },
    {
      from: day.start + p.maghribMs - MAKRUH_DEFAULTS.beforeSunset * 60000,
      until: day.start + p.maghribMs,
      label: 'sunset',
    },
  ];
}
export function inMakruhTime(at: number, day: DeepReadonly<CalendarDay>): boolean {
  return makruhWindows(day).some((w) => at >= w.from && at < w.until);
}
export function fastWindow(day: DeepReadonly<CalendarDay>): { from: number; until: number } | undefined {
  return day.fasting ? { from: day.fasting.from, until: day.fasting.until } : undefined;
}
export function suhoorWindow(
  day: DeepReadonly<CalendarDay>,
  defaults: DeepReadonly<Effective_RAMADAN_DEFAULTS>,
): { from: number; until: number } | undefined {
  const fast = fastWindow(day);
  return fast ? { from: fast.from - defaults.suhoorLead * 60000, until: fast.from } : undefined;
}
export function iftarWindow(
  day: DeepReadonly<CalendarDay>,
  defaults: DeepReadonly<Effective_RAMADAN_DEFAULTS>,
): { from: number; until: number } | undefined {
  const fast = fastWindow(day);
  return fast ? { from: fast.until, until: fast.until + defaults.iftarLength * 60000 } : undefined;
}
export function ramadanFast(
  days: DeepReadonly<readonly CalendarDay[]>,
  defaults: DeepReadonly<Effective_RAMADAN_DEFAULTS>,
): CommitmentData[] {
  return days.flatMap((day) =>
    day.fasting
      ? [
          {
            id: `sawm:${day.dayIndex}:fast`,
            kind: 'abstain' as const,
            actions: [],
            violatedBy: [...day.fasting.violatingActions],
            from: day.fasting.from,
            until: day.fasting.until,
            normId: day.fasting.normId,
            importance: defaults.fastImportance,
            exemptWhen: ['illness' as const, 'travel' as const],
            label: 'fast',
            chain: 'sawm:fast',
            toId: 'self',
          },
        ]
      : [],
  );
}
export function ramadanMeals(
  days: DeepReadonly<readonly CalendarDay[]>,
  defaults: DeepReadonly<Effective_RAMADAN_DEFAULTS>,
): CommitmentData[] {
  return days.flatMap((day) => {
    const before = suhoorWindow(day, defaults),
      after = iftarWindow(day, defaults);
    if (!before || !after) return [];
    return [
      {
        id: `sawm:${day.dayIndex}:suhoor`,
        kind: 'appointment' as const,
        actions: ['eat'],
        ...before,
        importance: defaults.mealImportance,
        toId: 'self',
        label: 'suhoor',
        chain: 'sawm:suhoor',
      },
      {
        id: `sawm:${day.dayIndex}:iftar`,
        kind: 'appointment' as const,
        actions: ['eat'],
        ...after,
        importance: defaults.mealImportance,
        toId: 'self',
        label: 'iftar',
        chain: 'sawm:iftar',
      },
    ];
  });
}
export function eidWindow(day: DeepReadonly<CalendarDay>): { from: number; until: number } | undefined {
  return day.eid ? { from: day.eid.from, until: day.eid.until } : undefined;
}
export function eidPrayer(day: DeepReadonly<CalendarDay>): CommitmentData | undefined {
  return day.eid
    ? {
        id: `eid:${day.dayIndex}`,
        kind: 'worship',
        actions: ['pray-eid'],
        from: day.eid.from,
        until: day.eid.until,
        normId: day.eid.normId,
        importance: EID_PRAYER_IMPORTANCE,
        label: 'Eid prayer',
      }
    : undefined;
}
/** Closed retiming data; no callback or clock mutation. */
export function calendarRetimer(
  calendar: DeepReadonly<CalendarDefinition>,
): { commitmentId: string; start: number; end: number }[] {
  return calendar.days.flatMap((day) =>
    day.windows.map((w) => ({ commitmentId: w.commitmentId, start: w.from, end: w.until })),
  );
}
