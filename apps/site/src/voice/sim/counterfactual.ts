/**
 * Stretch S1, "the month you never spoke" (voice.md §7.5): the same seed played again with no input at all (no
 * suggestion, no standing whisper; the cards are only dismissed), through Ramadan 1–30, the muted Eid and the
 * six-day epilogue, exactly as a player who never spoke would see it. A few plain facts of that month are set
 * beside the month as played, in words, with the caption `SILENT_CAPTION`.
 *
 * Scope: it reads only fields both games keep (activity cells, payments, calls, the report's open lines), so the
 * two sides are read the same way. It leaves prayer and the fast out (voice.md §11: no report line measures
 * worship), and says nothing about worth, faith or acceptance, nor which month is better. It does not say why a
 * fact differs: some differences come from your words, some from small changes compounding (hence the caption).
 * When you never spoke there is nothing to set beside the month, and the section is one line.
 *
 * The silent game is its own `VoiceGame`, held outside the played game (the worker keeps it until its facts are
 * read, then keeps only the facts; tests hold it), so the played run's state, hash and report are untouched. It is
 * a function of the seed alone, so it may be stepped in slices (`advanceSilentMonth`) and still come out the same.
 * Cost: a whole silent run, about 1.1 s on the bench (`npm run bench`).
 */
import { dayOf, MINUTES_PER_DAY } from '@adam0white/human-framework';
import { SILENT_CAPTION, type SilentMonthView } from '../protocol.ts';
import { VoiceGame } from './game.ts';
import { play } from './headless.ts';
import { TOWN_DEFAULTS, TOWN_EID_DAY } from './town.ts';
import { happened } from './view.ts';

/** The silent game for one seed, stepped until it reaches its report. */
export interface SilentMonth {
  readonly seed: number;
  readonly game: VoiceGame;
}

export function startSilentMonth(seed: number): SilentMonth {
  return { seed, game: new VoiceGame(seed) };
}

/**
 * Step the silent game for about `budgetMs` of wall time. Returns true once it has reached its report. The budget
 * is checked between the headless player's turns, so one turn that is a whole multi-day skip runs over it.
 */
export function advanceSilentMonth(s: SilentMonth, budgetMs: number): boolean {
  if (!reported(s.game)) {
    const until = performance.now() + budgetMs;
    play(s.game, { stop: () => performance.now() >= until });
  }
  return reported(s.game);
}

/** Run the silent game to its report (whatever the slices left). */
export function finishSilentMonth(s: SilentMonth): VoiceGame {
  if (!reported(s.game)) play(s.game);
  return s.game;
}

const reported = (g: VoiceGame): boolean => g.phase === 'report';

/** The facts compared, read the same way from either game once it has reached its report. */
export interface MonthFacts {
  /** Osman's date (300 by Ramadan 15, 20:00) kept. */
  dateKept: boolean;
  /** Ramadan day and amount of the first payment, if any before Eid. */
  firstPayDay?: number;
  firstPay?: number;
  /** Paid to Osman by Eid morning. */
  paidByEid: number;
  /** Connected calls in Ramadan, by who made them. */
  hisCalls: number;
  herCalls: number;
  /** Who made the first call on Eid. */
  eidCall: 'his' | 'hers' | 'none';
  /** Clinic visits in Ramadan, and the Ramadan day of the first. */
  clinic: number;
  firstClinicDay?: number;
  /** Afternoon shifts and river walks in Ramadan. */
  shifts: number;
  walks: number;
  /** Ramadan days he smoked (Eid's cigarettes are noise in every style, voice.md §14, so they are left out). */
  smokeDays: number;
  /** The report's first "still open" line a week after Eid (Osman). */
  owedAfter: string;
}

const EID_START = TOWN_EID_DAY * MINUTES_PER_DAY;
const RAMADAN_DAYS = TOWN_EID_DAY - TOWN_DEFAULTS.ramadanFirstDay;
const ramadanDay = (at: number) => dayOf(at) - TOWN_DEFAULTS.ramadanFirstDay + 1;

export function monthFacts(g: VoiceGame): MonthFacts {
  const before = g.cells.filter((c) => happened(c) && c.from < EID_START);
  const first = g.payments.find((p) => p.at < EID_START);
  const dateKept =
    first !== undefined && first.at <= TOWN_DEFAULTS.rentPromiseDay * MINUTES_PER_DAY + 20 * 60;
  const calls = g.calls.filter((c) => c.at < EID_START);
  const eid = g.calls.find((c) => dayOf(c.at) === TOWN_EID_DAY);
  const clinic = before.filter((c) => c.affordanceId === 'see-doctor');
  return {
    dateKept,
    ...(first ? { firstPayDay: ramadanDay(first.at), firstPay: Math.round(first.amount) } : {}),
    paidByEid: Math.round(g.eidMorning?.run.town.state.rentPaid ?? 0),
    hisCalls: calls.filter((c) => c.by === 'halil').length,
    herCalls: calls.filter((c) => c.by !== 'halil').length,
    eidCall: eid ? (eid.by === 'halil' ? 'his' : 'hers') : 'none',
    clinic: clinic.length,
    ...(clinic[0] ? { firstClinicDay: ramadanDay(clinic[0].from) } : {}),
    shifts: before.filter((c) => c.affordanceId === 'work-extra').length,
    walks: before.filter((c) => c.action === 'walk').length,
    smokeDays: new Set(before.filter((c) => c.action === 'smoke').map((c) => dayOf(c.from))).size,
    owedAfter: g.report?.open[0] ?? '',
  };
}

// --- words: rough where the count is large (show, not count), exact where it is rare -----------------

/** How often, for things done several times a month. */
function often(n: number): string {
  if (n === 0) return 'never';
  if (n === 1) return 'once';
  if (n === 2) return 'twice';
  if (n <= 5) return 'a few times';
  if (n <= 10) return 'several times';
  if (n <= 20) return 'often';
  return 'most days';
}

/** On how many of Ramadan's days, roughly. */
function daysOf(n: number): string {
  if (n === 1) return 'one day';
  if (n === 2) return 'two days';
  if (n <= 6) return 'a few days';
  if (n <= 12) return 'some days';
  if (n <= 19) return 'about half the days';
  if (n <= 26) return 'most days';
  if (n < RAMADAN_DAYS) return 'nearly every day';
  return 'every day';
}

/** Each fact as words, by topic, in report order. Topics whose words match on both sides are "the same". */
function facts(f: MonthFacts, other: MonthFacts): { topic: string; words: string }[] {
  const out: { topic: string; words: string }[] = [];
  out.push({
    topic: 'Osman',
    words: `${
      f.dateKept
        ? `He kept his date: ${f.firstPay} paid on Ramadan ${f.firstPayDay}.`
        : f.firstPayDay !== undefined
          ? `He missed his date; the first ${f.firstPay} came on Ramadan ${f.firstPayDay}.`
          : 'He missed his date and paid nothing in Ramadan.'
    }${f.paidByEid >= 600 ? ' All of it paid by Eid.' : ''}`,
  });
  out.push({
    topic: 'Selin in Ramadan',
    words: `${f.hisCalls === 0 ? 'He never called her' : `He called her ${often(f.hisCalls)}`}; ${
      f.herCalls === 0 ? 'she never called him' : `she called him ${often(f.herCalls)}`
    }.`,
  });
  out.push({
    topic: 'Selin on Eid',
    words:
      f.eidCall === 'his'
        ? 'He called her himself.'
        : f.eidCall === 'hers'
          ? 'He did not call; she called him.'
          : 'They did not speak.',
  });
  out.push({
    topic: 'The clinic',
    words:
      f.clinic === 0
        ? 'He never went.'
        : f.clinic === 1
          ? `He went once, on Ramadan ${f.firstClinicDay}.`
          : `He went ${often(f.clinic)}, first on Ramadan ${f.firstClinicDay}.`,
  });
  out.push({
    topic: 'The afternoon shift',
    words: f.shifts === 0 ? 'He never took it.' : `He took it ${often(f.shifts)}.`,
  });
  out.push({
    topic: 'Cigarettes',
    words:
      f.smokeDays === 0 ? 'He did not smoke in Ramadan.' : `He smoked on ${daysOf(f.smokeDays)} of Ramadan.`,
  });
  if (f.walks > 0 || other.walks > 0)
    out.push({
      topic: 'Walks by the river',
      words: f.walks === 0 ? 'He did not walk.' : `He walked ${often(f.walks)}.`,
    });
  if (f.owedAfter) out.push({ topic: 'Osman after Eid', words: f.owedAfter });
  return out;
}

/** Most differing rows shown in full; the rest are named in one line ("Smaller differences: …"). */
export const SILENT_ROWS = 6;
/** Which differing rows fold first when there are more than `SILENT_ROWS`: the smallest levers. */
const FOLD_FIRST = ['Walks by the river', 'The afternoon shift', 'Osman after Eid', 'Selin on Eid'];

/** "a", "a and b", "a, b and c". */
const listed = (xs: readonly string[]) =>
  xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;
const lower = (s: string) =>
  s.startsWith('Osman') || s.startsWith('Selin') ? s : s.charAt(0).toLowerCase() + s.slice(1);

/** The one line shown when you never spoke: there is no other month to set beside it. */
export const NEVER_SPOKE = 'You said nothing; this was the month you never spoke.';
export const SILENT_INTRO = 'The same town from the same start, run again without a word from you.';

/**
 * The report section: the month as played beside the month you never spoke (`silent`, the silent game's facts).
 * When you never spoke, `silent` is not needed and the section is one line.
 */
export function silentMonthView(played: VoiceGame, silent?: MonthFacts): SilentMonthView {
  if (played.report?.spoke === false || !silent)
    return { intro: NEVER_SPOKE, rows: [], same: '', smaller: '', caption: SILENT_CAPTION };
  return compareMonths(monthFacts(played), silent);
}

/** The comparison itself: differing facts as rows (at most `SILENT_ROWS`), the rest in one line each. */
export function compareMonths(mine: MonthFacts, silent: MonthFacts): SilentMonthView {
  const theirs = new Map(facts(silent, mine).map((x) => [x.topic, x.words]));
  const all: SilentMonthView['rows'] = [];
  const same: string[] = [];
  for (const { topic, words } of facts(mine, silent)) {
    const other = theirs.get(topic) ?? '';
    if (other === words) same.push(lower(topic));
    else all.push({ topic, spoke: words, silent: other });
  }
  const folded = new Set<string>();
  for (const t of FOLD_FIRST) {
    if (all.length - folded.size <= SILENT_ROWS) break;
    if (all.some((r) => r.topic === t)) folded.add(t);
  }
  const rows = all.filter((r) => !folded.has(r.topic));
  const smaller = all.filter((r) => folded.has(r.topic)).map((r) => lower(r.topic));
  return {
    intro: SILENT_INTRO,
    rows,
    same:
      same.length === 0
        ? ''
        : rows.length === 0
          ? `Both months came out the same: ${listed(same)}.`
          : `The same in both: ${listed(same)}.`,
    smaller: smaller.length > 0 ? `Smaller differences: ${listed(smaller)}.` : '',
    caption: SILENT_CAPTION,
  };
}
