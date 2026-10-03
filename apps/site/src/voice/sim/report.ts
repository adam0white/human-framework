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
  TOWN_DEFAULTS,
  TOWN_EID_DAY,
  voiceOf,
} from '@human/framework';
import { MODEL_NOTES, type ReportView, type StripRow } from '../protocol.ts';
import type { Run } from './game.ts';
import { type Cell, clock, endsView, nameOfVoice, trustWord, VOICE_IDS } from './view.ts';

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
  /** How the clinic, calling Selin and the mosque feel to him on Eid night (`weighsView`). */
  weighs?: { label: string; word: string; trend: string }[];
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
    if (key === 'sleep' || key === 'rest' || key === 'wait') continue;
    const done = eid.filter((c) => ledgerKey(c.affordanceId) === key);
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
      const where =
        key === 'pray'
          ? ` (${done.filter((c) => c.affordanceId === 'pray').length} at the mosque, ${done.filter((c) => c.affordanceId === 'pray-home').length} at home)`
          : '';
      what = `${done.length === 1 ? 'Once' : `${times(done.length)}`}${where}, first at ${clock(first?.from ?? eidStart)}${why ? `, ${why}` : ''}.`;
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
  const out: string[] = [
    call
      ? `On Eid he called Selin himself, at ${clock(call.from)}.`
      : 'On Eid he did not call Selin. He waited for her to call.',
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
        : ` He took an afternoon shift ${times(extra.length)}${extraYours === extra.length ? ', each time on your word' : extraYours > 0 ? `, ${times(extraYours)} on your word` : ''}.`),
  );
  const clinic = i.cells.filter((c) => c.affordanceId === 'see-doctor' && c.from < eidStart);
  const yours = clinic.filter((c) => c.promptedBy === 'you').length;
  out.push(
    clinic.length === 0
      ? 'He never went to the clinic this month.'
      : `He went to the clinic ${times(clinic.length)} this month${yours === clinic.length ? `, each time after you spoke` : yours > 0 ? `, ${times(yours)} after you spoke` : ', never on your word'}.`,
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
/** Eid lines kept for the report: enough for the evening to show (playtest: 8 cut it off at noon). */
export const EID_LINES = 24;

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
  const stopped = pick(yours, ['stopped']);
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
    `Blood pressure: ${sev < 0.15 ? 'close to normal' : sev < 0.3 ? 'mildly high' : sev < 0.5 ? 'moderately high' : 'high'}.`,
    `Sleep: ${h.body.sleepDebt < 60 ? 'enough' : h.body.sleepDebt < 240 ? 'a little short' : 'short; he is running on a debt'}.`,
    `Fed: ${h.body.satiety > 0.6 ? 'well' : h.body.satiety > 0.3 ? 'enough' : 'underfed'}.`,
  ];
  const excusedIll = h.agenda.commitments.filter(
    (c) => c.kind === 'abstain' && c.exempt?.reason === 'illness' && dayOf(c.from) < TOWN_EID_DAY,
  ).length;
  if (excusedIll > 0)
    body.push(
      `His blood pressure made him unwell enough on ${excusedIll} day${excusedIll === 1 ? '' : 's'} of Ramadan that the fast was excused, to be made up.`,
    );
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
      lines: i.eidLines.length ? byClock(i.eidLines).slice(0, EID_LINES) : ['He kept to himself.'],
      summary: summary(i),
    },
    ledger: ledger(i),
    own: own.length ? own : ['Nothing you had prompted became something he did on his own.'],
    others: told,
    stopped,
    trust,
    ends: endsView({
      h,
      town,
      t,
      trustStart: i.trustStart,
      ...(town.state.lastCall?.by === 'halil'
        ? { halilCalledAt: town.state.lastCall.at }
        : i.halilCalledAt !== undefined
          ? { halilCalledAt: i.halilCalledAt }
          : {}),
    }),
    body,
    open,
    rows: i.rows,
    modelNotes: [...MODEL_NOTES],
  };
}

const sinceSelin = (n: number) =>
  n === 0
    ? 'He spoke to Selin today.'
    : n === 1
      ? 'He last spoke to Selin yesterday.'
      : `${n} days since he spoke to Selin.`;
