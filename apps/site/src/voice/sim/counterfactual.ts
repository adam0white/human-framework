/**
 * Stretch S1, "the month you never spoke" (voice.md §7.5): the same seed played again with no input at all (no
 * suggestion, no standing whisper; the cards are only dismissed), through Ramadan 1–30, the muted Eid and the
 * six-day epilogue, exactly as a player who never spoke would see it. A few plain facts of that month are set
 * beside the month as played, in words, with the caption `SILENT_CAPTION`.
 *
 * Scope: it reads only fields both games keep (activity cells, payments, calls, the chronicle's fasts, the
 * report's open lines), so the two sides are read the same way. It leaves prayer out, as the report's diff does
 * (voice.md §3, §11: prayer is shown in his day, never tracked as a goal), and says nothing about worth, faith or
 * acceptance, nor which month is better. It does not say why a fact differs: some differences come from your
 * words, some from small changes compounding (hence the caption).
 *
 * The silent game is its own `VoiceGame`, held outside the played game (the worker keeps it; tests hold it), so the
 * played run's state, hash and report are untouched. It is a function of the seed alone, so it may be stepped in
 * slices (`advanceSilentMonth`) and still come out the same. Cost: a whole silent run, about 1.1 s on the bench (`npm run bench`).
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

/** Step the silent game for about `budgetMs` of wall time. Returns true once it has reached its report. */
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
  /** Ramadan days whose fast he kept (the others were excused). */
  fastsKept: number;
  /** Osman's date (300 by Ramadan 15, 20:00) kept. */
  dateKept: boolean;
  /** Ramadan day of the first payment, if any before Eid. */
  firstPayDay?: number;
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
  /** Ramadan days he smoked, and cigarettes on Eid. */
  smokeDays: number;
  eidCigarettes: number;
  /** The report's first "still open" line a week after Eid (Osman). */
  owedAfter: string;
}

const EID_START = TOWN_EID_DAY * MINUTES_PER_DAY;
const RAMADAN_DAYS = TOWN_EID_DAY - TOWN_DEFAULTS.ramadanFirstDay;
const ramadanDay = (at: number) => dayOf(at) - TOWN_DEFAULTS.ramadanFirstDay + 1;

export function monthFacts(g: VoiceGame): MonthFacts {
  const cells = g.cells.filter(happened);
  const before = cells.filter((c) => c.from < EID_START);
  const onEid = cells.filter((c) => dayOf(c.from) === TOWN_EID_DAY);
  const fastsKept = (g.halil.chronicle ?? []).filter(
    (d) =>
      d.day >= TOWN_DEFAULTS.ramadanFirstDay &&
      d.day < TOWN_EID_DAY &&
      d.kept.some((k) => k.kind === 'abstain' && k.label === 'fast'),
  ).length;
  const pays = g.payments.filter((p) => p.at < EID_START);
  const first = pays[0];
  const dateKept =
    first !== undefined && first.at <= TOWN_DEFAULTS.rentPromiseDay * MINUTES_PER_DAY + 20 * 60;
  const calls = g.calls.filter((c) => c.at < EID_START);
  const eid = g.calls.find((c) => dayOf(c.at) === TOWN_EID_DAY);
  const clinic = before.filter((c) => c.affordanceId === 'see-doctor');
  const smokeDays = new Set(before.filter((c) => c.action === 'smoke').map((c) => dayOf(c.from))).size;
  return {
    fastsKept,
    dateKept,
    ...(first ? { firstPayDay: ramadanDay(first.at) } : {}),
    paidByEid: Math.round(g.eidMorning?.run.town.state.rentPaid ?? 0),
    hisCalls: calls.filter((c) => c.by === 'halil').length,
    herCalls: calls.filter((c) => c.by !== 'halil').length,
    eidCall: eid ? (eid.by === 'halil' ? 'his' : 'hers') : 'none',
    clinic: clinic.length,
    ...(clinic[0] ? { firstClinicDay: ramadanDay(clinic[0].from) } : {}),
    shifts: before.filter((c) => c.affordanceId === 'work-extra').length,
    walks: before.filter((c) => c.action === 'walk').length,
    smokeDays,
    eidCigarettes: onEid.filter((c) => c.action === 'smoke').length,
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
  const missed = RAMADAN_DAYS - f.fastsKept;
  out.push({
    topic: 'The fast',
    words:
      missed === 0
        ? 'He kept every fast.'
        : missed === 1
          ? 'He kept every fast but one, which was excused.'
          : `He kept ${f.fastsKept} of the ${RAMADAN_DAYS} fasts; ${missed} were excused.`,
  });
  out.push({
    topic: 'Osman',
    words: `${
      f.dateKept
        ? `He kept his date: 300 paid on Ramadan ${f.firstPayDay}.`
        : f.firstPayDay !== undefined
          ? `He missed his date; the first 300 came on Ramadan ${f.firstPayDay}.`
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
    words: `${f.smokeDays === 0 ? 'He did not smoke in Ramadan' : `He smoked on ${daysOf(f.smokeDays)} of Ramadan`}; on Eid, ${
      f.eidCigarettes === 0
        ? 'none'
        : f.eidCigarettes === 1
          ? 'one cigarette'
          : f.eidCigarettes <= 3
            ? 'a few'
            : 'several'
    }.`,
  });
  if (f.walks > 0 || other.walks > 0)
    out.push({
      topic: 'Walks by the river',
      words: f.walks === 0 ? 'He did not walk.' : `He walked ${often(f.walks)}.`,
    });
  if (f.owedAfter) out.push({ topic: 'Osman, a week after Eid', words: f.owedAfter });
  return out;
}

/** "a", "a and b", "a, b and c". */
const listed = (xs: readonly string[]) =>
  xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;
const lower = (s: string) =>
  s.startsWith('Osman') || s.startsWith('Selin') ? s : s.charAt(0).toLowerCase() + s.slice(1);

/** The report section: the month as played beside the month you never spoke. */
export function silentMonthView(played: VoiceGame, silent: VoiceGame): SilentMonthView {
  const a = monthFacts(played);
  const b = monthFacts(silent);
  const mine = facts(a, b);
  const theirs = new Map(facts(b, a).map((x) => [x.topic, x.words]));
  const rows: SilentMonthView['rows'] = [];
  const same: string[] = [];
  for (const { topic, words } of mine) {
    const other = theirs.get(topic) ?? '';
    if (other === words) same.push(lower(topic));
    else rows.push({ topic, spoke: words, silent: other });
  }
  const spoke = played.report?.spoke !== false;
  return {
    intro: spoke
      ? 'The same town from the same start, run again with no word from you: no suggestion on the days you played and no whisper between them.'
      : 'You said nothing all month. The same town from the same start, run again with no word from you:',
    rows,
    same:
      same.length === 0
        ? ''
        : rows.length === 0
          ? `Both months came out the same: ${listed(same)}.`
          : `The same in both: ${listed(same)}.`,
    caption: SILENT_CAPTION,
  };
}
