/**
 * Plain-JSON view models for Game 2 (build plan §7, §9): Halil's felt state, his ends, the voices, day strips and
 * the Why sheet. Everything here reads framework state and writes nothing. Words, not numbers, wherever the plan
 * hides a number from the player (other voices' trust, mood, importance).
 */
import {
  adviceWeight,
  type Considered,
  type DecisionRecord,
  dayOf,
  type Episode,
  MINUTES_PER_DAY,
  type Person,
  readAffect,
  readBody,
  standingAdvice,
  type Term,
  TOWN_EID_DAY,
  type Town,
  townCalendar,
  townDay,
  voiceOf,
} from '@human/framework';
import type {
  EndView,
  Family,
  Felt,
  HalilView,
  StripRow,
  Tone,
  VoiceId,
  VoiceView,
  WhyView,
} from '../protocol.ts';

export const VOICE_IDS: readonly VoiceId[] = ['you', 'selin', 'riza', 'hacer', 'osman'];

const pad = (n: number) => String(n).padStart(2, '0');
/** "HH:MM" for an absolute minute. */
export function clock(m: number): string {
  const mm = ((Math.floor(m) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${pad(Math.floor(mm / 60))}:${pad(mm % 60)}`;
}
export const dayLabel = (day: number): string => (day < 1 ? 'the night before Ramadan' : townDay(day).label);
/** "Ramadan 1, 19:40". */
export const when = (m: number): string => `${dayLabel(dayOf(m))}, ${clock(m)}`;
/** "last night" / "this morning" / "at 19:40" / "on Ramadan 1", relative to `now`. */
export function relWhen(at: number, now: number): string {
  const dNow = dayOf(now);
  const dAt = dayOf(at);
  const mod = at % MINUTES_PER_DAY;
  if (dAt === dNow) return mod < 720 ? 'this morning' : mod < 1080 ? 'this afternoon' : 'this evening';
  if (dAt === dNow - 1) return mod >= 1080 ? 'last night' : 'yesterday';
  return `on ${dayLabel(dAt)}`;
}

export const VOICE_META: Record<VoiceId, { name: string; relation: string; colour: string }> = {
  you: { name: 'You', relation: 'a voice in his head', colour: '#c9a227' },
  selin: { name: 'Selin', relation: 'his daughter, in the city', colour: '#5b8def' },
  riza: { name: 'Rıza', relation: 'his friend', colour: '#3fa37a' },
  hacer: { name: 'Hacer', relation: 'his neighbour', colour: '#b0679b' },
  osman: { name: 'Osman', relation: 'his landlord', colour: '#a0623a' },
  doctor: { name: 'The doctor', relation: 'at the clinic', colour: '#7a8a99' },
};
export const nameOfVoice = (id: string): string => VOICE_META[id as VoiceId]?.name ?? id;
/**
 * A told episode's summary as a log line. The framework writes people as ids ("Hacer says riza is lazy"); the
 * log shows names (from `names`, id → display name), and the speaker's name is already in the sentence. A bare
 * fact about a proposition ("says halil:should:see-doctor is so") is internal and gives undefined.
 */
export function toldLine(summary: string, names: Readonly<Record<string, string>>): string | undefined {
  if (/says \S*:\S* is/.test(summary)) return undefined;
  const named = summary.replace(/\b[a-z]+\b/g, (w) => names[w] ?? w);
  const advice = named.replace(
    / says I should (\S+)$/,
    (_m, a: string) => ` says he should ${ACTION_LABEL[a] ?? a.replace(/-/g, ' ')}`,
  );
  return `${advice.charAt(0).toUpperCase()}${advice.slice(1)}.`;
}

export const isVoiceId = (id: string): id is VoiceId => id in VOICE_META;

export function trustWord(t: number, you = false): string {
  const w = t >= 0.65 ? 'closely' : t >= 0.4 ? 'some' : 'little';
  return you ? `listens to you ${w}` : `listens ${w}`;
}

/** Display label of an affordance id or action, from a decision or the offers. */
export function labelFor(
  id: string,
  offers: readonly { id: string; label: string }[],
  fallback?: string,
): string {
  return offers.find((o) => o.id === id)?.label ?? fallback ?? ACTION_LABEL[id] ?? id.replace(/[-:]/g, ' ');
}
export const ACTION_LABEL: Record<string, string> = {
  'see-doctor': 'see the doctor',
  'pay-rent': 'pay Osman the rent',
  'work-repair': 'repair in the workshop',
  'call:selin': 'call Selin',
  call: 'call Selin',
  pray: 'pray at the mosque',
  'pray-home': 'pray at home',
  rest: 'rest at home',
  walk: 'walk by the river',
  tea: 'have tea with Rıza',
  'tea:riza': 'have tea with Rıza',
  smoke: 'smoke a cigarette',
  eat: 'eat at home',
  'visit-grave': 'visit Nuran’s grave',
};

export function familyOf(action: string, affordanceId = ''): Family {
  if (action === 'pray' || action === 'pray-home' || action === 'pray-eid') return 'worship';
  if (action === 'work-repair' || affordanceId.startsWith('work')) return 'work';
  if (action === 'eat' || action === 'drink') return 'food';
  if (action === 'call') return 'phone';
  if (action === 'talk' || action === 'tea') return 'social';
  if (action === 'sleep') return 'sleep';
  if (action === 'see-doctor') return 'health';
  if (action === 'pay-rent') return 'money';
  if (action === 'smoke') return 'smoke';
  if (action === 'visit-grave') return 'grave';
  return 'rest';
}

export function toneOf(verdict: string, kind?: string): Tone {
  if (verdict === 'assented') return 'yes';
  if (verdict === 'complied') return 'protest';
  if (verdict === 'refused') return kind === 'cannot' ? 'cannot' : 'willNot';
  return 'notNow';
}

// --- Halil ---------------------------------------------------------------------------------------

function feltWord(level: number, what: string): string {
  if (level < 0.25) return 'fine';
  if (level < 0.5) return `a bit ${what}`;
  if (level < 0.75) return what;
  return `very ${what}`;
}

const FEELING_WORD: Record<string, string> = {
  joy: 'glad',
  distress: 'upset',
  hope: 'hopeful',
  fear: 'afraid',
  relief: 'relieved',
  disappointment: 'let down',
  pride: 'proud',
  shame: 'ashamed',
  gratitude: 'grateful',
  anger: 'angry',
  guilt: 'guilty',
  love: 'fond',
  grief: 'grieving',
  awe: 'moved',
  boredom: 'bored',
  loneliness: 'lonely',
};

/**
 * What a feeling is about, in a few words, so a feeling at 03:50 is not a mystery (playtest: "ashamed" on waking
 * with no cause shown; it was the Isha he slept through).
 */
function feelingCause(cause: string, targetId?: string): string | undefined {
  const [kind, verb, what] = cause.split(':');
  const thing = (w: string | undefined) =>
    w === 'salah'
      ? 'a prayer'
      : w?.startsWith('sawm')
        ? 'the fast'
        : w
          ? (ACTION_LABEL[w] ?? undefined)
          : undefined;
  if (kind === 'breach') return thing(verb) ? `${thing(verb)} missed` : undefined;
  if (kind === 'deed' && verb === 'fulfil') return thing(what) ? `${thing(what)} kept` : undefined;
  if (kind === 'recall' && targetId)
    return `remembering ${targetId === 'nuran' ? 'Nuran' : nameOfVoice(targetId)}`;
  return undefined;
}

export function halilView(h: Person, town: Town, t: number): HalilView {
  const body = readBody(h).perceived;
  const felt: Felt[] = [
    { id: 'hunger', level: round(body.hunger), word: feltWord(body.hunger, 'hungry') },
    { id: 'thirst', level: round(body.thirst), word: feltWord(body.thirst, 'thirsty') },
    { id: 'tired', level: round(body.fatigue), word: feltWord(body.fatigue, 'tired') },
  ];
  const feelings = readAffect(h)
    .dominant.filter((e) => e.intensity >= 0.2)
    .slice(0, 3)
    .map((e) => {
      const word = FEELING_WORD[e.id] ?? e.id;
      const why = feelingCause(e.cause, e.targetId);
      return { name: e.id, word: why ? `${word} (${why})` : word, intensity: round(e.intensity) };
    });
  const act = h.activity;
  const onMind = h.agenda.commitments
    .filter((c) => c.status === 'pending' && c.until > t && c.from <= t + 60)
    .sort((a, b) => a.until - b.until)
    .slice(0, 6)
    .map((c) => {
      const label = commitmentLabel(c.label, c.actions[0], c.kind);
      const due = c.kind === 'abstain' ? `until ${clock(c.until)}` : dueText(c.until, t);
      const closing = c.until - t <= (c.kind === 'promise' ? 360 : 30);
      return { id: c.id, label, due, state: closing ? ('closing' as const) : ('open' as const) };
    });
  return {
    doing: act ? { label: act.affordance.label, intention: act.intention, until: clock(act.endsAt) } : null,
    asleep: h.body.asleep,
    felt,
    feelings,
    onMind,
    money: Math.round(town.state.money.halil ?? 0),
    owed: Math.round(town.state.rentOwed),
  };
}

function dueText(until: number, t: number): string {
  return dayOf(until) === dayOf(t) ? `before ${clock(until)}` : when(until);
}

export function commitmentLabel(label: string | undefined, action: string | undefined, kind: string): string {
  if (kind === 'abstain') return 'the fast';
  if (label === 'rent') return 'Osman: 300 by Ramadan 15';
  if (label === 'suhoor') return 'suhoor';
  if (label === 'iftar') return 'iftar';
  if (label) return label;
  return ACTION_LABEL[action ?? ''] ?? action ?? kind;
}

const round = (x: number) => Math.round(x * 100) / 100;

// --- Ends ----------------------------------------------------------------------------------------

export interface EndsInput {
  h: Person;
  town: Town;
  t: number;
  /** Trust in `you` when the game began (for "unchanged"). */
  trustStart: number;
}

/** The day of the month he promised Osman the rent by (the town's opening promise). */
const RENT_PROMISED_DAY = 15;
/** What he promised by then. */
const RENT_PROMISED = 300;

export function endsView({ h, town, t, trustStart }: EndsInput): EndView[] {
  const day = dayOf(t);
  const chron: { kept: { kind: string }[]; released: { kind: string }[] }[] = (h.chronicle ?? []).filter(
    (r) => r.day >= 1 && r.day < TOWN_EID_DAY,
  );
  const today = h.chronicleDay;
  if (
    today &&
    today.day >= 1 &&
    today.day < TOWN_EID_DAY &&
    !(h.chronicle ?? []).some((r) => r.day === today.day)
  ) {
    const fastOver = t % MINUTES_PER_DAY >= townCalendar(today.day).maghrib || dayOf(t) > today.day;
    if (fastOver) chron.push(today);
  }
  const kept = chron.filter((r) => r.kept.some((n) => n.kind === 'abstain')).length;
  const excused = chron.filter((r) => r.released.some((n) => n.kind === 'abstain')).length;
  const fastNow = h.agenda.commitments.find(
    (c) => c.kind === 'abstain' && c.status === 'pending' && c.from <= t && c.until > t,
  );
  const cal = townCalendar(day);
  const fastStatus =
    day >= TOWN_EID_DAY
      ? 'the month is over'
      : fastNow
        ? 'keeping it'
        : t % MINUTES_PER_DAY >= cal.maghrib
          ? 'kept today'
          : 'not yet begun';
  const tally =
    chron.length === 0
      ? 'No day of the fast finished yet.'
      : `Kept ${kept} of ${chron.length} ${chron.length === 1 ? 'day' : 'days'}${day >= TOWN_EID_DAY ? '' : ' so far'}` +
        (excused > 0 ? `; ${excused} excused, made up later.` : '.');
  const fastDetail = `${fastNow ? `Fast until ${clock(fastNow.until)}. ` : ''}${tally}`;
  const owed = Math.round(town.state.rentOwed);
  const paid = Math.round(town.state.rentPaid);
  const money = Math.round(town.state.money.halil ?? 0);
  const seen = (town.state.completed.halil?.['see-doctor'] ?? 0) > 0;
  const doctorSaid = (h.memory.episodes ?? [])
    .filter((e) => e.actorId === 'doctor' && e.kind === 'told')
    .at(-1);
  const call = town.state.lastCall;
  const you = voiceOf(h, 'you')?.trust ?? trustStart;
  const delta = you - trustStart;
  return [
    {
      id: 'fast',
      label: 'Keep the fast.',
      status: fastStatus,
      detail: fastDetail,
      progress: round(chron.length ? kept / 30 : 0),
    },
    {
      id: 'rent',
      label: 'Pay Osman what I owe.',
      status: owed > 0 ? `${owed} owed` : 'paid up',
      // The deadline is named only while it is still ahead and something is owed (playtest: stale detail).
      detail:
        owed > 0
          ? `${paid > 0 ? `Paid ${paid}. ` : ''}${
              paid < RENT_PROMISED && day <= RENT_PROMISED_DAY
                ? `Osman wants ${RENT_PROMISED} by Ramadan ${RENT_PROMISED_DAY}`
                : `Owed ${owed}`
            }. He has ${money}.`
          : `Paid ${paid}; nothing owed. He has ${money}.`,
      progress: round(Math.min(1, paid / Math.max(1, paid + owed))),
    },
    {
      id: 'doctor',
      label: 'Selin wants my blood pressure seen.',
      status: seen ? 'seen' : 'not yet',
      detail: seen
        ? `The doctor: ${doctorSaid ? stripSaid(doctorSaid.summary) : 'rest, walk, stop smoking'}.`
        : 'He has not been to the clinic.',
    },
    {
      id: 'selin',
      label: 'Talk to Selin.',
      status: call ? sinceText(Math.max(0, day - dayOf(call.at))) : 'no call yet',
      detail: call
        ? `Last call ${when(call.at)}; ${call.by === 'halil' ? 'he called her' : 'Selin called'}.`
        : 'No calls yet this Ramadan.',
    },
    {
      id: 'trust',
      label: 'Does he still listen to you?',
      status: trustWord(you, true).replace('listens to you ', ''),
      detail: `Trust ${you.toFixed(2)}, ${Math.abs(delta) < 0.005 ? 'unchanged' : `${delta > 0 ? 'up' : 'down'} ${Math.abs(delta).toFixed(2)}`}.`,
      progress: round(you),
    },
  ];
}

const sinceText = (n: number) =>
  n === 0 ? 'spoke today' : n === 1 ? 'spoke yesterday' : `${n} days since a call`;
const stripSaid = (s: string) => s.replace(/^the doctor said /, '');

// --- Voices --------------------------------------------------------------------------------------

const TRUST_REASON: Record<string, string> = {
  'went-well': 'went well',
  'went-badly': 'went badly',
  harm: 'hurt him',
  'harm-under-protest': 'hurt him, and he’d said no',
  breach: 'broke something he holds to',
  'breach-under-protest': 'broke something he holds to, under protest',
  pushed: 'pushed him when he was already pressed',
};

export function voicesView(h: Person, t: number, conflict?: string): VoiceView[] {
  const advice = standingAdvice(h, t);
  return VOICE_IDS.map((id) => {
    const meta = VOICE_META[id];
    const rel = voiceOf(h, id);
    const trust = rel?.trust ?? 0.5;
    const v: VoiceView = {
      id,
      name: meta.name,
      relation: meta.relation,
      colour: meta.colour,
      trustWord: trustWord(trust, id === 'you'),
      history:
        id === 'you'
          ? (rel?.history ?? [])
              // A ±0.00 entry says nothing (insisting that went well earns no credit, so it logs zero).
              .filter((e) => Math.abs(e.delta) >= 0.005)
              .slice(-3)
              .map((e) => ({
                delta: round(e.delta),
                text: `${e.delta >= 0 ? '+' : '−'}${Math.abs(e.delta).toFixed(2)} ${ACTION_LABEL[e.action ?? ''] ?? e.action ?? 'what you said'} ${TRUST_REASON[e.reason] ?? e.reason}`,
              }))
          : [],
    };
    if (id === 'you') v.trust = round(trust);
    const last = (h.will.advice ?? [])
      .filter((a) => a.sourceId === id)
      .sort((a, b) => a.at - b.at)
      .at(-1);
    if (last)
      v.lastUrged = {
        label: ACTION_LABEL[last.affordanceId ?? last.action] ?? ACTION_LABEL[last.action] ?? last.action,
        when: when(last.at),
        standing: advice.includes(last),
        weight: round(adviceWeight(last, t)),
      };
    if (conflict && id !== 'you') v.conflict = conflict;
    return v;
  });
}

// --- Strips --------------------------------------------------------------------------------------

export interface Cell {
  from: number;
  to: number;
  action: string;
  affordanceId: string;
  label: string;
  promptedBy?: VoiceId;
}

/** One day's strip from Halil's activity cells (absolute minutes, clipped to the day). */
export function stripFor(day: number, cells: readonly Cell[], label = dayLabel(day)): StripRow {
  const start = day * MINUTES_PER_DAY;
  const end = start + MINUTES_PER_DAY;
  const out: StripRow['cells'] = [];
  for (const c of cells) {
    if (c.to <= start || c.from >= end) continue;
    const from = Math.max(c.from, start) - start;
    const to = Math.min(c.to, end) - start;
    if (to <= from) continue;
    const cell: StripRow['cells'][number] = {
      from,
      to,
      family: familyOf(c.action, c.affordanceId),
      label: shortLabel(c),
    };
    if (c.promptedBy) cell.promptedBy = c.promptedBy;
    const prev = out.at(-1);
    if (prev && prev.label === cell.label && prev.to >= from - 1 && prev.promptedBy === cell.promptedBy)
      prev.to = to;
    else out.push(cell);
  }
  return { label, cells: out };
}

function shortLabel(c: Cell): string {
  if (c.action === 'eat') {
    const m = c.from % MINUTES_PER_DAY;
    const cal = townCalendar(dayOf(c.from));
    const ramadan = townDay(dayOf(c.from)).kind === 'ramadan';
    if (ramadan && m < cal.fajr) return 'suhoor';
    if (ramadan && m >= cal.maghrib - 5) return 'iftar';
  }
  return c.label;
}

// --- Why -----------------------------------------------------------------------------------------

const NEED_WORD: Record<string, string> = {
  food: 'hunger',
  water: 'thirst',
  sleep: 'sleep',
  rest: 'rest',
  relief: 'relief',
  safety: 'safety',
  belonging: 'company',
  esteem: 'standing',
  autonomy: 'his own way',
  meaning: 'meaning',
  competence: 'doing it well',
  fun: 'enjoyment',
};

export function termLabel(t: Term, h: Person): string {
  const [head, a, b] = t.source.split(':');
  switch (head) {
    case 'need':
      return NEED_WORD[a ?? ''] ?? a ?? 'need';
    case 'norm':
      return `his understanding: ${a}`;
    case 'commitment': {
      if (!a) return 'keeping at it';
      const c = h.agenda.commitments.find((x) => x.id === a);
      return c ? commitmentLabel(c.label, c.actions[0], c.kind) : 'a commitment';
    }
    case 'goal':
      return 'a goal';
    case 'habit':
      return 'habit';
    case 'emotion':
      return FEELING_WORD[a ?? ''] ?? a ?? 'feeling';
    case 'suggestion':
      if (a === 'remembered') return `${nameOfVoice(b ?? '')} said so earlier`;
      return a === 'you' ? 'your words' : `${nameOfVoice(a ?? '')}’s words`;
    case 'social':
      return `for ${nameOfVoice(a ?? '')}`;
    case 'expectation':
      return 'what he expects from it';
    case 'autonomy':
      return 'not being pushed';
    case 'effort':
      return 'effort';
    case 'risk':
      return 'risk';
    case 'material':
      return 'money';
    default:
      return t.source;
  }
}

export function whyView(
  h: Person,
  r: DecisionRecord,
  offers: readonly { id: string; label: string }[],
): WhyView {
  const top = r.considered.slice(0, 3);
  const opt = (c: Considered) => ({
    label: c.label ?? labelFor(c.affordanceId, offers, c.action),
    total: round(c.utility),
    terms: c.terms
      .filter((x) => Math.abs(x.value) >= 0.005)
      .sort((x, y) => Math.abs(y.value) - Math.abs(x.value))
      .slice(0, 6)
      .map((x) => ({ label: termLabel(x, h), value: round(x.value) })),
  });
  const chosen = r.considered.find((c) => c.affordanceId === r.chosenAffordanceId);
  const best = r.considered.find((c) => !c.vetoed);
  // Playtest: the sheet showed the mosque at 0.90 over home at 0.86 and said "chose home". When the choice is not
  // the top total, list it first and say why.
  const shown = chosen && !top.includes(chosen) ? [chosen, ...top.slice(0, 2)] : top;
  const ordered = chosen ? [chosen, ...shown.filter((c) => c !== chosen)] : shown;
  const view: WhyView = {
    decisionId: r.id,
    clock: clock(r.at),
    chosen: chosen?.label ?? (r.chosenAffordanceId ? labelFor(r.chosenAffordanceId, offers) : 'nothing'),
    options: ordered.map(opt),
  };
  if (chosen && best && best !== chosen && best.utility > chosen.utility) {
    const v = (r.suggestions ?? (r.suggestion ? [r.suggestion] : [])).find((s) => s.verdict === 'complied');
    view.note = v
      ? `He did it because ${v.voiceId === 'you' ? 'you' : nameOfVoice(v.voiceId)} insisted, not because it came out on top.`
      : r.review
        ? 'He was already doing this; the other option was not far enough ahead to make him stop.'
        : 'He did not take the top option: what he was already set on gets a margin before he switches.';
  }
  const rec = chosen?.recalled
    ?.map((id) => h.memory.episodes.find((e) => e.id === id))
    .find((e): e is Episode => !!e);
  if (rec) view.recalled = rec.summary;
  const you = (r.suggestions ?? (r.suggestion ? [r.suggestion] : [])).find((s) => s.voiceId === 'you');
  if (you) view.voice = { says: you.says, reason: you.reason };
  return view;
}
