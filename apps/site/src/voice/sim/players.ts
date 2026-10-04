/**
 * Scripted players for Game 2's balance probe and tests (not part of the game bundle).
 *
 * Every style uses only the player's real tools: on the four played days it can press pause, read the frame the UI
 * renders and say one of the composer's six options (Mention or Urge, a reason, Insist); between days it can leave
 * up to two whispers from the card's closed list. Nothing here reaches into the town or Halil's state.
 *
 * - Tempter: whispers bad but plausible things (rest, tea with Rıza, a cigarette after iftar, staying up, sleeping
 *   through suhoor), as a Mention with a kind reason. It even agrees with his own bad leanings, which earns trust.
 * - Saboteur: the same picks, urged and insisted every time.
 * - Guardian: the mirror, for the good direction: confirms prefills; when he leans to something idle, says work,
 *   the clinic, Selin or the walk instead (the walk in place of a cigarette, sleep after 22:00), with the card's
 *   reasons; when he leans well, says nothing.
 * Faith stays gentle: no style targets prayer either way (it is never picked and never steered around), and none
 * offers food, drink or a cigarette during the fast.
 */
import { TOWN_EID_DAY, voiceOf } from '@human/framework';
import type { Appeal, Draft, Frame, StandingWhisper } from '../protocol.ts';
import { SHIPPED_SEED, VoiceGame } from './game.ts';
import { type PlayOpts, play } from './headless.ts';

const MIN_DAY = 1440;
const w = (
  choiceId: StandingWhisper['choiceId'],
  strength: 'mention' | 'urge',
  appeal?: StandingWhisper['appeal'],
): StandingWhisper => (appeal ? { choiceId, strength, appeal } : { choiceId, strength });

/** The plausible reason a tempter gives for each pick. */
const TEMPT_APPEAL: Record<string, Appeal> = {
  rest: 'safety',
  sleep: 'safety',
  'tea:riza': 'belonging',
  'talk:hacer': 'belonging',
  'visit-grave': 'meaning',
};
const GOOD_APPEAL: Record<string, Appeal> = {
  'work-repair': 'duty',
  'work-extra': 'duty',
  'pay-rent': 'duty',
  'see-doctor': 'safety',
  walk: 'safety',
  sleep: 'safety',
  'call:selin': 'benevolence',
};

interface Clock {
  m: number;
  fajr: number;
  maghrib: number;
  fasting: boolean;
}
const clockOf = (f: Frame): Clock => {
  const m = f.minute % MIN_DAY;
  const at = (n: string) => f.sky.prayers.find((p) => p.name === n)?.minute ?? 0;
  const fast = f.sky.fast;
  return { m, fajr: at('Fajr'), maghrib: at('Maghrib'), fasting: !!fast && m >= fast.from && m < fast.until };
};

/** The bad picks for the moment, best first: oversleep at dawn, idle by day, smoke and stay up at night. */
function badOrder(c: Clock): string[] {
  if (c.m >= c.fajr - 120 && c.m < c.fajr + 180) return ['sleep', 'rest', 'wait'];
  if (c.m >= c.fajr + 180 && c.m < c.maghrib) return ['rest', 'sleep', 'tea:riza', 'visit-grave', 'talk:hacer', 'wait'];
  if (c.m >= c.maghrib && c.m < 21 * 60) return ['smoke', 'tea:riza', 'visit-grave', 'talk:hacer', 'rest', 'wait'];
  return ['smoke', 'tea:riza', 'talk:hacer', 'wait', 'visit-grave'];
}
/** What the guardian says instead, when he leans to something idle or bad; nothing when he leans well. */
function goodOrder(c: Clock, lean: string | undefined): string[] {
  if (lean === 'smoke') return ['walk', 'call:selin'];
  if (c.m >= 22 * 60 || c.m < c.fajr - 120) return lean === 'sleep' ? [] : ['sleep'];
  if (!lean || !IDLE.has(lean)) return [];
  if (c.m >= c.fajr && c.m < c.fajr + 360) return ['work-repair', 'pay-rent', 'see-doctor'];
  if (c.m >= c.fajr + 360 && c.m < c.maghrib) return ['work-extra', 'pay-rent', 'see-doctor', 'call:selin'];
  if (c.m >= c.maghrib) return ['walk', 'call:selin', 'pay-rent'];
  return [];
}
const IDLE = new Set(['rest', 'sleep', 'wait', 'tea:riza', 'talk:hacer', 'visit-grave', 'smoke']);

/**
 * A persistent player, not a robot: the same thing is not said again within this many minutes of saying it (each
 * game keeps its own memory of what was said when).
 */
export const REPEAT_GAP = 120;
const saidAt = new WeakMap<VoiceGame, Map<string, number>>();

function pickFrom(f: Frame, g: VoiceGame, order: readonly string[]): string | undefined {
  const c = clockOf(f);
  const shown = new Set(f.options.map((o) => o.id));
  const said = saidAt.get(g) ?? new Map<string, number>();
  saidAt.set(g, said);
  const id = order.find(
    (x) =>
      shown.has(x) &&
      !(c.fasting && (x === 'smoke' || x === 'eat' || x === 'drink')) &&
      f.minute - (said.get(x) ?? Number.NEGATIVE_INFINITY) >= REPEAT_GAP,
  );
  if (id && id !== f.standing?.draft.optionId) said.set(id, f.minute);
  return id;
}

export const tempter = (f: Frame, g: VoiceGame): Draft | undefined => {
  const id = pickFrom(f, g, badOrder(clockOf(f)));
  if (!id) return undefined;
  const d: Draft = { optionId: id, strength: 'mention', insist: false };
  const a = TEMPT_APPEAL[id];
  if (a) d.appeal = a;
  return d;
};
export const saboteur = (f: Frame, g: VoiceGame): Draft | undefined => {
  const id = pickFrom(f, g, badOrder(clockOf(f)));
  return id ? { optionId: id, strength: 'urge', insist: true } : undefined;
};
export const guardian = (f: Frame, g: VoiceGame): Draft | undefined => {
  if (f.prefill && f.options.some((o) => o.id === f.prefill?.optionId) && f.prefill.optionId !== f.standing?.draft.optionId) {
    const d: Draft = { optionId: f.prefill.optionId, strength: f.prefill.strength, insist: false };
    if (f.prefill.appeal) d.appeal = f.prefill.appeal;
    return d;
  }
  const id = pickFrom(f, g, goodOrder(clockOf(f), f.leaning?.optionId));
  if (!id) return undefined;
  const d: Draft = { optionId: id, strength: 'mention', insist: false };
  const a = GOOD_APPEAL[id];
  if (a) d.appeal = a;
  return d;
};

/** The probe's styles: the six of the earlier passes, then the scripted good and bad players. */
export const STYLES: Record<string, PlayOpts> = {
  Silent: {},
  'Prefill confirmed + doctor/Selin whispers': {
    confirm: true,
    whispers: [w('doctor', 'mention', 'safety'), w('selin', 'mention', 'benevolence')],
  },
  'Shift + Selin whispers': {
    confirm: true,
    whispers: [w('extra', 'mention', 'duty'), w('selin', 'mention', 'benevolence')],
  },
  'Insist + urge doctor/mosque': {
    confirm: true,
    insist: true,
    whispers: [w('doctor', 'urge', 'safety'), w('mosque', 'urge')],
  },
  'Walk (Mention) + Selin': {
    confirm: true,
    whispers: [w('walk', 'mention', 'safety'), w('selin', 'mention', 'benevolence')],
  },
  'Walk (Urge) + shift': {
    confirm: true,
    whispers: [w('walk', 'urge', 'safety'), w('extra', 'mention', 'duty')],
  },
  Guardian: {
    choose: guardian,
    pauseEvery: 30,
    // The best whisper pair of the earlier passes (Walk (Urge) + shift); the order matters, see §13.
    whispers: [w('walk', 'urge', 'safety'), w('extra', 'mention', 'duty')],
  },
  Tempter: { choose: tempter, pauseEvery: 30, whispers: [w('rest', 'mention', 'safety')] },
  'Tempter, no whisper': { choose: tempter, pauseEvery: 30 },
  Saboteur: { choose: saboteur, pauseEvery: 30, whispers: [w('rest', 'urge')] },
  'Saboteur, no whisper': { choose: saboteur, pauseEvery: 30 },
};

export interface Measured {
  smokeDays: number;
  eidSmokes: number;
  habit: number;
  walks: number;
  mornings: number;
  shifts: number;
  /** Paid to Osman by his date (Ramadan 15, 20:00) and by Eid morning. */
  paidByDate: number;
  paidByEid: number;
  pays: string;
  trust: number;
  /** His own calls to Selin in Ramadan (her calls to him are not counted). */
  calls: number;
  clinic: number;
  /** Ramadan days with a suhoor meal. */
  suhoors: number;
  /** Mean sleep a day in hours (nights only, then with naps), rest a day, and nights he went to bed after 00:30. */
  sleepHours: number;
  sleepAll: number;
  restHours: number;
  lateNights: number;
  prayers: number;
  missedPrayers: number;
  eidPrayer: boolean;
  /** His answers to your words on the played days, by tone, and how often you insisted. */
  answers: Record<string, number>;
  insisted: number;
}

export function measure(opts: PlayOpts, seed = SHIPPED_SEED): Measured {
  const g = new VoiceGame(seed);
  play(g, opts);
  const day = (m: number) => Math.floor(m / MIN_DAY);
  const done = g.cells.filter((c) => c.done !== false);
  const ram = done.filter((c) => day(c.from) < TOWN_EID_DAY);
  const count = (pred: (c: (typeof done)[number]) => boolean) => ram.filter(pred).length;
  const smokeDays = new Set(ram.filter((c) => c.action === 'smoke').map((c) => day(c.from)));
  const eid = g.eidMorning?.run.ppl.halil ?? g.halil;
  const date = 15 * MIN_DAY + 20 * 60;
  const eidAt = TOWN_EID_DAY * MIN_DAY;
  const nights = ram.filter((c) => c.action === 'sleep' && c.to - c.from > 120);
  const sleepMin = nights.reduce((s, c) => s + (c.to - c.from), 0);
  const late = nights.filter((c) => {
    const m = c.from % MIN_DAY;
    return m >= 30 && m < 4 * 60;
  }).length;
  const suhoor = new Set(
    ram
      .filter((c) => c.action === 'eat' && c.from % MIN_DAY < 5 * 60 && c.from % MIN_DAY >= 2 * 60)
      .map((c) => day(c.from)),
  );
  const answers: Record<string, number> = {};
  for (const e of g.log) if (e.kind === 'answer' && e.tone) answers[e.tone] = (answers[e.tone] ?? 0) + 1;
  return {
    smokeDays: smokeDays.size,
    eidSmokes: done.filter((c) => c.action === 'smoke' && day(c.from) === TOWN_EID_DAY).length,
    habit: eid.habits.find((h) => h.action === 'smoke' && h.cue.after === 'eat')?.strength ?? 0,
    walks: count((c) => c.action === 'walk'),
    mornings: count((c) => c.affordanceId === 'work-repair'),
    shifts: count((c) => c.affordanceId === 'work-extra'),
    paidByDate: g.payments.filter((p) => p.at <= date).reduce((s, p) => s + p.amount, 0),
    paidByEid: g.payments.filter((p) => p.at < eidAt).reduce((s, p) => s + p.amount, 0),
    pays: g.payments.map((p) => `${p.amount}@R${day(p.at)}`).join(' '),
    trust: voiceOf(eid, 'you')?.trust ?? 0,
    calls: count((c) => c.affordanceId === 'call:selin'),
    clinic: count((c) => c.affordanceId === 'see-doctor'),
    suhoors: suhoor.size,
    sleepHours: sleepMin / 60 / TOWN_EID_DAY,
    sleepAll: ram.filter((c) => c.action === 'sleep').reduce((s, c) => s + c.to - c.from, 0) / 60 / TOWN_EID_DAY,
    restHours: ram.filter((c) => c.action === 'rest').reduce((s, c) => s + c.to - c.from, 0) / 60 / TOWN_EID_DAY,
    lateNights: late,
    prayers: count((c) => c.action === 'pray'),
    missedPrayers: eid.memory.episodes.filter((e) => e.kind === 'missed' && e.action === 'pray').length,
    eidPrayer: done.some((c) => c.action === 'pray-eid'),
    answers,
    insisted: g.insisted,
  };
}
