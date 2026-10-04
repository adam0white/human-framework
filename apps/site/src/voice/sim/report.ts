/**
 * The end report (build plan §6.6): Eid without you, then `diffChronicle(with you = Ramadan 1–30, without you =
 * Eid and the six days after)` split into what he did on his own, what others still had to tell him and what
 * stopped; trust per voice as words; his ends; his true body as the doctor would read it; what is still open;
 * the day strips; and the model notes (§10). No score, no words about worth, faith or acceptance.
 */
import {
  type DayRecord,
  type DecisionRecord,
  dayOf,
  diffChronicle,
  dominantTerm,
  MINUTES_PER_DAY,
  owedMakeUps,
  voiceOf,
} from '@human/framework';
import { type EndView, MODEL_NOTES, type ReportView, type StripRow } from '../protocol.ts';
import type { Run } from './game.ts';
import { TOWN_DEFAULTS, TOWN_EID_DAY } from './town.ts';
import {
  type Cell,
  clock,
  dayLabel,
  endsView,
  nameOfVoice,
  pressureWord,
  trustWord,
  VOICE_IDS,
} from './view.ts';

export interface ReportInput {
  withYou: readonly DayRecord[];
  withoutYou: readonly DayRecord[];
  /** The epilogue clone at the end of day 37. */
  after: Run;
  endRamadanTrust: Record<string, number>;
  eidStrip: StripRow;
  eidLines: string[];
  rows: StripRow[];
  trustStart: number;
  /** Every activity cell of the run (played days, skips and Eid), for the plain facts in `eid.summary`. */
  cells: readonly Cell[];
  /** Times the player insisted. */
  insisted: number;
  /** His trust in you at Eid night. */
  trustEid: number;
  /** What the player said in Ramadan, by ledger key (see `ledgerKey`). */
  said?: Record<string, SaidCount>;
  /** Decision records still held (Eid's choices are among them), for the ledger's reasons. */
  records?: ReadonlyMap<string, DecisionRecord>;
  /** Minute he last called Selin himself before the epilogue, if ever. */
  halilCalledAt?: number;
  /** When Selin first called him on Eid, if she did. */
  selinEidCallAt?: number;
  /** The minute of day he usually called her by Eid (mean of his last calls), if he ever called. */
  usualCallMinute?: number;
  /** Completed calls by each of them at Eid night, to count the six days after from `after`. */
  callsAtEid?: { his: number; hers: number };
  /** How the clinic, calling Selin and the mosque feel to him on Eid night (`weighsView`). */
  weighs?: { label: string; word: string; trend: string }[];
  /** Ramadan days his fast was excused for illness, and the doctor's last words ("The doctor said … (Ramadan 3)."). */
  illDays?: readonly number[];
  doctor?: string;
  /**
   * The town at Eid morning, when the month you spoke in had ended: the ends are read here, and the week after
   * (`after`) is told apart (playtest: the rent end showed the week after Eid as the month's result).
   */
  atEid?: { run: Run; t: number; halilCalledAt?: number; calledUnasked?: boolean };
  /** Every rent payment with its minute (Ramadan and the week after). */
  payments?: readonly { at: number; amount: number }[];
}

/** What the player said about one thing in Ramadan: suggestions on played days, and days under a whisper. */
export interface SaidCount {
  label: string;
  played: number;
  days: number;
}

/** One ledger row per thing, however it was said: the mosque and prayer at home are one row ("pray"). */
export const ledgerKey = (optionId: string): string =>
  optionId === 'pray' || optionId === 'pray-home' ? 'pray' : optionId;

/** The main reason behind an Eid choice, in words (from the decision's dominant term). */
function reasonWords(source: string): string {
  if (source === 'habit') return 'out of habit';
  if (source.startsWith('precommit')) return 'because he had resolved to';
  if (source.startsWith('advice:') || source.startsWith('voice:')) {
    const who = source.split(':')[1] ?? '';
    return `because ${nameOfVoice(who)} asked`;
  }
  if (source.startsWith('commitment:') || source.startsWith('norm:'))
    return 'at its time, as he understands his duty';
  if (source.startsWith('need:')) return `for ${source.slice(5)}`;
  if (source === 'material') return 'for the money';
  if (source.startsWith('social')) return 'for the company';
  return 'because he wanted to';
}

/** "What you used to say": for each thing you said in Ramadan, what he did about it on Eid, and why. */
function ledger(i: ReportInput): NonNullable<ReportView['ledger']> {
  const eidStart = TOWN_EID_DAY * MINUTES_PER_DAY;
  const eid = i.cells.filter((c) => c.from >= eidStart && c.from < eidStart + MINUTES_PER_DAY);
  const rows: NonNullable<ReportView['ledger']> = [];
  const entries = Object.entries(i.said ?? {}).sort(
    (a, b) => b[1].played + b[1].days - (a[1].played + a[1].days) || (a[0] < b[0] ? -1 : 1),
  );
  for (const [key, said] of entries) {
    // Words against an act (tenth pass) have no Eid act of their own to show.
    if (['sleep', 'rest', 'wait', 'osman-waits', 'skip-call'].includes(key)) continue;
    const act = key === 'friends' ? 'tea:riza' : key;
    const done = eid.filter((c) => ledgerKey(c.affordanceId) === act);
    let what: string;
    if (done.length === 0) {
      const heavy = i.weighs?.find(
        (w) =>
          (key === 'see-doctor' && w.label === 'the clinic') ||
          (key === 'call:selin' && w.label === 'calling Selin'),
      );
      what =
        key === 'work-repair' || key === 'work-extra'
          ? 'Not on Eid: the workshop was shut.'
          : key === 'see-doctor'
            ? `Not on Eid${heavy ? `; the clinic still ${heavy.word === 'dreads it' ? 'is something he dreads' : `feels ${heavy.word}`}` : ''}.`
            : heavy && heavy.word !== 'all right' && heavy.word !== 'good'
              ? `Not at all; it still feels ${heavy.word}.`
              : 'Not at all.';
    } else {
      const first = done[0];
      const rec = first?.decisionId ? i.records?.get(first.decisionId) : undefined;
      const chosen = rec?.considered.find((c) => c.affordanceId === rec.chosenAffordanceId);
      const why = rec ? reasonWords(dominantTerm(chosen)) : '';
      // Prayer: the row counts every prayer of his, so the mosque is a part of it, not the whole (playtest:
      // "Pray at the mosque → 5 times (3 at the mosque, 2 at home)" read as five mosque visits).
      if (key === 'pray') {
        const mosque = done.filter((c) => c.affordanceId === 'pray').length;
        what = `Prayed ${done.length === 1 ? 'once' : times(done.length)}, ${mosque === done.length ? (mosque === 1 ? 'at the mosque' : 'all at the mosque') : mosque === 0 ? 'none at the mosque' : `${mosque} at the mosque`}; first at ${clock(first?.from ?? eidStart)}${why ? `, ${why}` : ''}.`;
      } else
        what = `${done.length === 1 ? 'Once' : `${times(done.length)}`}, first at ${clock(first?.from ?? eidStart)}${why ? `, ${why}` : ''}.`;
    }
    const how = [
      said.played > 0 ? `said ${times(said.played)} on the days you spoke` : '',
      said.days > 0 ? `whispered through ${said.days} days` : '',
    ]
      .filter(Boolean)
      .join(', ');
    rows.push({ said: `${capital(said.label)} (${how})`, times: said.played + said.days, eid: what });
  }
  return rows;
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clockOf = (l: string) => {
  const m = /^(\d\d):(\d\d)/.exec(l);
  return m ? Number(m[1]) * 60 + Number(m[2]) : Number.POSITIVE_INFINITY;
};
/** Stable sort by a leading HH:MM; lines without one keep their place after the last timed line before them. */
function byClock(lines: readonly string[]): string[] {
  let last = 0;
  return lines
    .map((l, k) => {
      const c = clockOf(l);
      if (Number.isFinite(c)) last = c;
      return { l, k, c: Number.isFinite(c) ? c : last };
    })
    .sort((a, b) => a.c - b.c || a.k - b.k)
    .map((x) => x.l);
}

/** The plain facts the month comes down to: Selin on Eid, the clinic, and what he made of you. */
function summary(i: ReportInput): string[] {
  const eidStart = TOWN_EID_DAY * MINUTES_PER_DAY;
  const eid = i.cells.filter((c) => c.from >= eidStart && c.from < eidStart + MINUTES_PER_DAY);
  const call = eid.find((c) => c.affordanceId === 'call:selin');
  const usual = i.usualCallMinute !== undefined ? clock(i.usualCallMinute) : undefined;
  const after = epilogueCalls(i);
  const out: string[] = [
    (call
      ? `On Eid he called Selin himself, at ${clock(call.from)}.`
      : i.selinEidCallAt !== undefined
        ? usual && (i.callsAtEid?.his ?? 0) >= 3
          ? `On Eid he did not call Selin. He usually called her around ${usual}; she waited past it and called him at ${clock(i.selinEidCallAt)}.`
          : (i.callsAtEid?.his ?? 0) > 0
            ? `On Eid he did not call Selin; he had called her himself only ${times(i.callsAtEid?.his ?? 0)} this month. She called him at ${clock(i.selinEidCallAt)}.`
            : `On Eid he did not call Selin; he had not called her himself all month. She called him at ${clock(i.selinEidCallAt)}.`
        : 'On Eid he did not call Selin, and she did not call him.') + (after ? ` ${after}` : ''),
  ];
  const pays = i.cells.filter((c) => c.affordanceId === 'pay-rent' && c.from < eidStart);
  const date = i.after.ppl.halil.agenda.commitments.find((c) => c.id === 'rent' && c.kind === 'promise');
  const firstPay = pays[0] ? dayOf(pays[0].from) - TOWN_DEFAULTS.ramadanFirstDay + 1 : undefined;
  const extra = i.cells.filter((c) => c.affordanceId === 'work-extra' && c.from < eidStart);
  const extraYours = extra.filter((c) => c.promptedBy === 'you').length;
  out.push(
    // The promise may have been pruned from the agenda by Eid, so the pay cells decide when it is gone.
    (date?.status === 'kept' ||
    (!date &&
      pays[0] !== undefined &&
      pays[0].from <= TOWN_DEFAULTS.rentPromiseDay * MINUTES_PER_DAY + 20 * 60)
      ? `He kept his date with Osman: 300 paid on Ramadan ${firstPay ?? TOWN_DEFAULTS.rentPromiseDay}.`
      : firstPay !== undefined && firstPay < TOWN_EID_DAY
        ? `He missed Osman’s date (300 by Ramadan ${TOWN_DEFAULTS.rentPromiseDay}); the first 300 came on Ramadan ${firstPay}.`
        : `He missed Osman’s date (300 by Ramadan ${TOWN_DEFAULTS.rentPromiseDay}) and paid nothing in Ramadan.`) +
      (extra.length === 0
        ? ' He never took an afternoon shift.'
        : ` He took an afternoon shift ${times(extra.length)}${extraYours === extra.length ? (extra.length === 1 ? ', on your word' : ', each time on your word') : extraYours > 0 ? `, ${times(extraYours)} on your word` : ''}.`),
  );
  const clinic = i.cells.filter((c) => c.affordanceId === 'see-doctor' && c.from < eidStart);
  const yours = clinic.filter((c) => c.promptedBy === 'you').length;
  out.push(
    clinic.length === 0
      ? 'He never went to the clinic this month.'
      : `He went to the clinic ${times(clinic.length)} this month${yours === clinic.length ? (clinic.length === 1 ? ', after you spoke' : ', each time after you spoke') : yours > 0 ? `, ${times(yours)} after you spoke` : ', never on your word'}.`,
  );
  const d = i.trustEid - i.trustStart;
  const word = trustWord(i.trustEid, true);
  out.push(
    Math.abs(d) < 0.05
      ? `He ${word.replace(/^listens/, 'listened')}, as at the start.`
      : `He ${word.replace(/^listens/, 'listened')} by Eid (trust ${i.trustStart.toFixed(2)} → ${i.trustEid.toFixed(2)}).`,
  );
  if (i.insisted > 0)
    out.push(
      `You insisted ${times(i.insisted)}. Insisting never earned trust, and when he was already pressed it cost some.`,
    );
  return out;
}

const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

/** His own calls to Selin in the six days after Eid (0 without the counts). */
function epilogueHis(i: ReportInput): number {
  if (!i.callsAtEid) return 0;
  return (i.after.town.state.completed.halil?.call ?? 0) - i.callsAtEid.his;
}

/** His own calls to Selin in the six days after Eid (from the completed counts), in words; '' without the counts. */
function epilogueCalls(i: ReportInput): string {
  if (!i.callsAtEid) return '';
  const done = i.after.town.state.completed;
  const his = (done.halil?.call ?? 0) - i.callsAtEid.his;
  const hers = (done.selin?.call ?? 0) - i.callsAtEid.hers;
  if (his > 0)
    return `In the six days after Eid he called her himself ${times(his)}${hers > 0 ? `, and she called ${times(hers)}` : ''}.`;
  return hers > 0
    ? `In the six days after Eid he did not call her; she called ${times(hers)}.`
    : 'In the six days after Eid they did not speak.';
}

/** Eid lines kept for the report: enough for the evening to show (playtest: 8 cut it off at noon). */
export const EID_LINES = 24;
/** Eid lines that carry the day (Selin, Osman, the first cigarette, the clinic, the mosque, a memory). */
const EID_KEY = /Selin|call|Osman|cigarette|doctor|mosque|remembers/i;

/**
 * At most `EID_LINES` Eid lines in clock order. When there are more, the key lines all stay (the evening call must
 * not be cut off), the rest fill in clock order, and a last line says how many quieter ones were left out.
 */
export function eidLines(all: readonly string[]): string[] {
  const sorted = byClock([...all]);
  if (sorted.length <= EID_LINES) return sorted;
  const room = EID_LINES - 1;
  const keep = new Set<number>();
  sorted.forEach((l, k) => {
    if (keep.size < room && EID_KEY.test(l)) keep.add(k);
  });
  for (let k = 0; k < sorted.length && keep.size < room; k++) keep.add(k);
  const out = sorted.filter((_, k) => keep.has(k));
  const left = sorted.length - out.length;
  return [...out, `(${left} quieter line${left === 1 ? '' : 's'} left out.)`];
}

export function buildReport(i: ReportInput): ReportView {
  const h = i.after.ppl.halil;
  const town = i.after.town;
  // What you prompted that he now does unprompted, and what other voices still had to prompt: two diffs, each
  // scoped to its voices. Prayer is shown in his day but never tracked as a goal (plan §1), so prayer items are
  // left out; eating and drinking start trivially when the fast ends and say nothing about a voice.
  const others = VOICE_IDS.filter((v) => v !== 'you');
  const yours = diffChronicle(i.withYou, i.withoutYou, { person: h, maxLines: 100, voices: ['you'] });
  const theirs = diffChronicle(i.withYou, i.withoutYou, { person: h, maxLines: 100, voices: others });
  // Rest, sleep and waiting are not things he took up: they are what he does between (playtest: "he slept
  // without being told" read as a joke). Prayer is shown in the ledger with the mosque and home apart.
  const trivial = (subject: string) =>
    subject.startsWith('prayer:') ||
    ['action:eat', 'action:drink', 'action:rest', 'action:sleep', 'action:wait'].includes(subject);
  const pick = (d: typeof yours, kinds: string[]) =>
    d.changes
      .map((c, k) => (kinds.includes(c.kind) && !trivial(c.subject) ? d.lines[k] : undefined))
      .filter((x): x is string => !!x);
  const own = pick(yours, ['unprompted']);
  const told = pick(theirs, ['still-prompted']);
  // "Had mostly stopped: calling" beside "he called yesterday, unasked" reads as a contradiction: six days against
  // thirty, one call rates as rare. When he called her himself after Eid, the calls line says it instead.
  const calledAfter = epilogueHis(i) > 0;
  const stopped = pick(yours, ['stopped']).filter((_, k, all) => {
    const line = all[k] ?? '';
    return !(calledAfter && /\bcall/i.test(line));
  });
  const t = h.now;
  const trust = VOICE_IDS.map((id) => {
    const before = i.endRamadanTrust[id] ?? 0.5;
    const after = voiceOf(h, id)?.trust ?? before;
    const arrow = after - before >= 0.05 ? ' ↑' : before - after >= 0.05 ? ' ↓' : '';
    return {
      id,
      name: nameOfVoice(id),
      endRamadan: trustWord(before, id === 'you'),
      endWeek: trustWord(after, id === 'you') + arrow,
    };
  });
  const hyper = h.body.illnesses.find((x) => x.kind === 'hypertension');
  const sev = hyper?.severity ?? 0;
  const body = [
    `Blood pressure: ${pressureWord(sev)}.`,
    `Sleep: ${h.body.sleepDebt < 60 ? 'enough' : h.body.sleepDebt < 240 ? 'a little short' : 'short; he is running on a debt'}.`,
    `Fed: ${h.body.satiety > 0.6 ? 'well' : h.body.satiety > 0.3 ? 'enough' : 'underfed'}.`,
  ];
  // Round 3: the game records the excused days as they happen (the agenda keeps only the last few closed fasts).
  const ill = [...(i.illDays ?? [])].sort((a, b) => a - b);
  if (ill.length > 0)
    body.push(
      `His blood pressure made him unwell on ${ill.length === 1 ? '1 day' : `${ill.length} days`} of Ramadan (${ill.map((d) => dayLabel(d)).join(', ')}); he counted himself ill and did not fast, to make ${ill.length === 1 ? 'it' : 'them'} up after Eid.`,
    );
  if (i.doctor) body.push(i.doctor);
  const owed = Math.round(town.state.rentOwed);
  const makeUps = owedMakeUps(h).length;
  const call = town.state.lastCall;
  const open = [
    owed > 0 ? `${owed} still owed to Osman.` : 'Nothing owed to Osman.',
    makeUps > 0 ? `${makeUps} make-up fast${makeUps === 1 ? '' : 's'} still owed.` : 'No make-up fasts owed.',
    call ? sinceSelin(Math.max(0, dayOf(t) - dayOf(call.at))) : 'He has not spoken to Selin.',
  ];
  return {
    eid: {
      strip: i.eidStrip,
      // In clock order (a visitor's line is logged when he answers the door, after what he was doing).
      lines: i.eidLines.length ? eidLines(i.eidLines) : ['He kept to himself.'],
      summary: summary(i),
    },
    ledger: ledger(i),
    own: ownWithCalls(own, i),
    others: told,
    stopped,
    trust,
    ends: reportEnds(i),
    body,
    open,
    rows: i.rows,
    spoke: Object.keys(i.said ?? {}).length > 0,
    modelNotes: [...MODEL_NOTES],
  };
}

/**
 * His ends as Ramadan ended (Eid morning), each with what came of it without you on Eid and the six days after.
 * Without an Eid snapshot (older callers), the ends are read at the end of the week and say so.
 */
export function reportEnds(i: ReportInput): EndView[] {
  const h = i.after.ppl.halil;
  const town = i.after.town;
  const eidStart = TOWN_EID_DAY * MINUTES_PER_DAY;
  const at = i.atEid;
  if (!at) {
    return endsView({
      h,
      town,
      t: h.now,
      trustStart: i.trustStart,
      ...(i.halilCalledAt !== undefined ? { halilCalledAt: i.halilCalledAt } : {}),
    });
  }
  const before = at.run.town.state;
  const now = town.state;
  const pays = i.payments ?? [];
  const ends = endsView({
    h: at.run.ppl.halil,
    town: at.run.town,
    t: at.t,
    trustStart: i.trustStart,
    asOfEid: true,
    payments: pays.filter((p) => p.at < eidStart),
    ...(at.halilCalledAt !== undefined ? { halilCalledAt: at.halilCalledAt } : {}),
    ...(at.calledUnasked !== undefined ? { calledUnasked: at.calledUnasked } : {}),
  });
  const week = pays.filter((p) => p.at >= eidStart);
  const owed = Math.round(now.rentOwed);
  const money = Math.round(now.money.halil ?? 0);
  const paidWeek = week.reduce((a, p) => a + p.amount, 0);
  const rentAfter =
    paidWeek > 0
      ? `In the week after Eid he paid ${owed === 0 && Math.round(before.rentOwed) > 0 ? `the rest (${Math.round(paidWeek)})` : Math.round(paidWeek)} on ${week.map((p) => dayLabel(dayOf(p.at))).join(' and ')}; ${owed > 0 ? `${owed} still owed` : 'nothing owed now'}. He has ${money}.`
      : Math.round(before.rentOwed) > 0
        ? `In the week after Eid he paid nothing; ${owed} still owed. He has ${money}.`
        : `Nothing owed. A week after Eid he has ${money}.`;
  const visits = (now.completed.halil?.['see-doctor'] ?? 0) - (before.completed.halil?.['see-doctor'] ?? 0);
  const makeUps = owedMakeUps(h).length;
  const trustNow = voiceOf(h, 'you')?.trust ?? i.trustEid;
  const trustEidMorning = voiceOf(at.run.ppl.halil, 'you')?.trust ?? i.trustEid;
  const after: Record<EndView['id'], string> = {
    fast: `The fast ended with Ramadan.${makeUps > 0 ? ` A week after Eid ${makeUps} make-up ${makeUps === 1 ? 'fast is' : 'fasts are'} still owed.` : ''}`,
    rent: rentAfter,
    doctor:
      visits > 0
        ? `Without you, on Eid and the six days after, he went to the clinic ${times(visits)}.`
        : 'Without you, on Eid and the six days after, he did not go to the clinic.',
    selin: summary(i)[0] ?? '',
    trust:
      Math.abs(trustNow - trustEidMorning) < 0.005
        ? 'You were silent from Eid; his trust in you stayed where it was.'
        : `A week after Eid, trust ${trustNow.toFixed(2)}.`,
  };
  const smoke = smokingLines(i);
  return ends.map((e) =>
    e.id === 'doctor'
      ? { ...e, detail: `${e.detail} ${smoke.month}`, after: `${after.doctor} ${smoke.eid}` }
      : { ...e, after: after[e.id] },
  );
}

/** Cigarettes at the start and end of Ramadan, and on Eid; and the doctor's walks (round 5). */
export function smokingLines(i: Pick<ReportInput, 'cells'>): { month: string; eid: string } {
  const per = (d: number) => i.cells.filter((c) => c.action === 'smoke' && dayOf(c.from) === d).length;
  const last = TOWN_EID_DAY - 1;
  const first = TOWN_DEFAULTS.ramadanFirstDay;
  const pair = (a: number) => per(a) + per(a + 1);
  const rate = (n: number) => (n === 0 ? 'none' : n % 2 === 0 ? `${n / 2} a day` : `${n} in two days`);
  const eidStart = TOWN_EID_DAY * MINUTES_PER_DAY;
  const walks = i.cells.filter((c) => c.action === 'walk' && c.from < eidStart);
  const yours = walks.filter((c) => c.promptedBy === 'you').length;
  const eid = per(TOWN_EID_DAY);
  const eidWalk = i.cells.some((c) => c.action === 'walk' && dayOf(c.from) === TOWN_EID_DAY);
  return {
    month: `Cigarettes: ${rate(pair(first))} on Ramadan ${first}–${first + 1}, ${rate(pair(last - 1))} on Ramadan ${last - 1}–${last}.${
      walks.length > 0
        ? ` He walked by the river ${times(walks.length)} in Ramadan${yours === walks.length ? (walks.length === 1 ? ', on your word' : ', each time on your word') : yours > 0 ? `, ${times(yours)} on your word` : ''}.`
        : ''
    }`,
    eid: `On Eid he smoked ${eid === 0 ? 'no cigarettes' : eid === 1 ? 'one cigarette' : `${eid} cigarettes`}${eidWalk ? ' and walked by the river' : ''}.`,
  };
}

/** The week's own calls to Selin belong in "what he did on his own" even when the chronicle diff misses them. */
function ownWithCalls(own: string[], i: ReportInput): string[] {
  const out = [...own];
  const line = epilogueCalls(i);
  if (line.includes('he called her himself') && !out.some((l) => /Selin/.test(l)))
    out.push(line.replace('In the six days after Eid he called her himself', 'He called Selin himself'));
  return out.length ? out : ['Nothing you had prompted became something he did on his own.'];
}

const sinceSelin = (n: number) =>
  n === 0
    ? 'He spoke to Selin today.'
    : n === 1
      ? 'He last spoke to Selin yesterday.'
      : `${n} days since he spoke to Selin.`;
