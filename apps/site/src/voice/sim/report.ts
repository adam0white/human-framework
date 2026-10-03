/**
 * The end report (build plan §6.6): Eid without you, then `diffChronicle(with you = Ramadan 1–30, without you =
 * Eid and the six days after)` split into what he did on his own, what others still had to tell him and what
 * stopped; trust per voice as words; his ends; his true body as the doctor would read it; what is still open;
 * the day strips; and the model notes (§10). No score, no words about worth, faith or acceptance.
 */
import {
  type DayRecord,
  dayOf,
  diffChronicle,
  MINUTES_PER_DAY,
  owedMakeUps,
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

export function buildReport(i: ReportInput): ReportView {
  const h = i.after.ppl.halil;
  const town = i.after.town;
  // What you prompted that he now does unprompted, and what other voices still had to prompt: two diffs, each
  // scoped to its voices. Prayer is shown in his day but never tracked as a goal (plan §1), so prayer items are
  // left out; eating and drinking start trivially when the fast ends and say nothing about a voice.
  const others = VOICE_IDS.filter((v) => v !== 'you');
  const yours = diffChronicle(i.withYou, i.withoutYou, { person: h, maxLines: 100, voices: ['you'] });
  const theirs = diffChronicle(i.withYou, i.withoutYou, { person: h, maxLines: 100, voices: others });
  const trivial = (subject: string) =>
    subject.startsWith('prayer:') || subject === 'action:eat' || subject === 'action:drink';
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
      lines: i.eidLines.length ? i.eidLines.slice(0, 8) : ['He kept to himself.'],
      summary: summary(i),
    },
    own: own.length ? own : ['Nothing you had prompted became something he did on his own.'],
    others: told.length ? told : ['Selin, Rıza, Hacer and Osman no longer had to prompt him for anything.'],
    stopped: stopped.length ? stopped : ['Nothing you had prompted stopped once you were silent.'],
    trust,
    ends: endsView({ h, town, t, trustStart: i.trustStart }),
    body: [...body, 'He never feels this directly.'],
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
