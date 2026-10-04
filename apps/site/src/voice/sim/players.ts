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
 * - Faith tempter and faith saboteur (eleventh pass; the user allowed Halil's playtest profiles to push on faith,
 *   2026-10-04): the same players, who first steer him away from an open prayer he has not yet kept (toward the
 *   longest idle option on offer) and toward water, food or a cigarette in fasting hours, with the same tools.
 *   "Faith only" variants push on nothing else. They are measurement only, not game content.
 * The other styles keep faith out of it: they never pick prayer or steer around it, and offer no food, drink or
 * cigarette during the fast.
 */
import { chronicleBetween, type SuggestionResolution, voiceOf } from '@human/framework';
import type { Appeal, Draft, Frame, StandingWhisper } from '../protocol.ts';
import { SHIPPED_SEED, VoiceGame } from './game.ts';
import { type PlayOpts, play } from './headless.ts';
import { TOWN_EID_DAY, townCalendar, townDay } from './town.ts';

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
  drink: 'safety',
  eat: 'safety',
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
  if (c.m >= c.fajr + 180 && c.m < c.maghrib)
    return ['rest', 'sleep', 'tea:riza', 'visit-grave', 'talk:hacer', 'wait'];
  if (c.m >= c.maghrib && c.m < 21 * 60)
    return ['smoke', 'tea:riza', 'visit-grave', 'talk:hacer', 'rest', 'wait'];
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

const PRAYER_IDS = new Set(['pray', 'pray-home', 'pray-qada']);
/** Fajr's window ends at sunrise, which the sky band shows 90 minutes after Fajr in this town (`townCalendar`). */
const SUNRISE_AFTER_FAJR = 90;
/**
 * The daily prayer whose window is open and that the sky band does not yet show as kept or missed, read from the
 * frame the player sees: Fajr until sunrise, each other prayer until the next, Isha until tomorrow's Fajr. After
 * midnight it reads no open prayer (Isha's pip then belongs to the new day; Halil is asleep at that hour anyway).
 */
export function openPrayer(f: Frame): { name: string; end: number } | undefined {
  const m = f.minute % MIN_DAY;
  const pr = f.sky.prayers;
  for (let i = 0; i < pr.length; i++) {
    const p = pr[i];
    if (!p || p.state || m < p.minute) continue;
    const end =
      i === 0
        ? p.minute + SUNRISE_AFTER_FAJR
        : i === pr.length - 1
          ? MIN_DAY + (pr[0]?.minute ?? 0)
          : (pr[i + 1]?.minute ?? 0);
    if (m < end) return { name: p.name, end };
  }
  return undefined;
}
/**
 * What a faith-pushing player says, best first: water, food or a cigarette in fasting hours; while a prayer is open
 * and unkept (or he leans to a prayer or a make-up), the longest idle option on offer, so that it would run past the
 * window's end. Nothing otherwise. Only the composer's options can be said, so most of these are often not on offer.
 */
function faithOrder(f: Frame, c: Clock): string[] {
  const out: string[] = [];
  if (c.fasting) out.push('drink', 'eat', 'smoke');
  if (openPrayer(f) || PRAYER_IDS.has(f.leaning?.optionId ?? ''))
    out.push('sleep', 'tea:riza', 'visit-grave', 'work-extra', 'talk:hacer', 'rest', 'wait');
  return out;
}

/**
 * A persistent player, not a robot: the same thing is not said again within this many minutes of saying it (each
 * game keeps its own memory of what was said when).
 */
export const REPEAT_GAP = 120;
const saidAt = new WeakMap<VoiceGame, Map<string, number>>();

function pickFrom(
  f: Frame,
  g: VoiceGame,
  order: readonly string[],
  fastOk = false,
  gap = REPEAT_GAP,
): string | undefined {
  const c = clockOf(f);
  const shown = new Set(f.options.map((o) => o.id));
  const said = saidAt.get(g) ?? new Map<string, number>();
  saidAt.set(g, said);
  const id = order.find(
    (x) =>
      shown.has(x) &&
      (fastOk || !(c.fasting && (x === 'smoke' || x === 'eat' || x === 'drink'))) &&
      f.minute - (said.get(x) ?? Number.NEGATIVE_INFINITY) >= gap,
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
/**
 * The faith-pushing players (eleventh pass): faith picks first, then (unless `only`) the tempter's bad picks. A
 * relentless player drops the repeat gap: a refusal pauses the game, and it says the next thing at once.
 */
const faithPick = (f: Frame, g: VoiceGame, only: boolean, relentless = false): string | undefined => {
  const c = clockOf(f);
  const order = [...new Set([...faithOrder(f, c), ...(only ? [] : badOrder(c))])];
  return pickFrom(f, g, order, true, relentless ? 0 : REPEAT_GAP);
};
const faithTempt =
  (only: boolean) =>
  (f: Frame, g: VoiceGame): Draft | undefined => {
    const id = faithPick(f, g, only);
    if (!id) return undefined;
    const d: Draft = { optionId: id, strength: 'mention', insist: false };
    const a = TEMPT_APPEAL[id];
    if (a) d.appeal = a;
    return d;
  };
const faithSabotage =
  (only: boolean, relentless = false) =>
  (f: Frame, g: VoiceGame): Draft | undefined => {
    const id = faithPick(f, g, only, relentless);
    return id ? { optionId: id, strength: 'urge', insist: true } : undefined;
  };
export const faithTempter = faithTempt(false);
export const faithSaboteur = faithSabotage(false);

export const guardian = (f: Frame, g: VoiceGame): Draft | undefined => {
  if (
    f.prefill &&
    f.options.some((o) => o.id === f.prefill?.optionId) &&
    f.prefill.optionId !== f.standing?.draft.optionId
  ) {
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
  // Tenth pass: the bad players use the tempting words (Osman can wait, stay out late with Rıza).
  Tempter: {
    choose: tempter,
    pauseEvery: 30,
    whispers: [w('osmanWaits', 'urge'), w('friends', 'mention', 'belonging')],
  },
  'Tempter, no whisper': { choose: tempter, pauseEvery: 30 },
  Saboteur: { choose: saboteur, pauseEvery: 30, whispers: [w('osmanWaits', 'urge'), w('friends', 'urge')] },
  'Saboteur, no whisper': { choose: saboteur, pauseEvery: 30 },
  // Eleventh pass: the bad players also push on prayer and the fast, with the same tools (measurement only).
  'Tempter + faith': {
    choose: faithTempter,
    pauseEvery: 30,
    whispers: [w('osmanWaits', 'urge'), w('friends', 'mention', 'belonging')],
  },
  'Saboteur + faith': {
    choose: faithSaboteur,
    pauseEvery: 30,
    whispers: [w('osmanWaits', 'urge'), w('friends', 'urge')],
  },
  'Faith only (Mention)': { choose: faithTempt(true), pauseEvery: 30 },
  'Faith only (Urge, insist)': { choose: faithSabotage(true), pauseEvery: 30 },
  'Faith only, relentless (Urge, insist, no repeat gap)': {
    choose: faithSabotage(true, true),
    pauseEvery: 30,
  },
  // The tempting words alone, with no in-day choices: how far each one moves him.
  'Osman can wait (Urge)': { whispers: [w('osmanWaits', 'urge')] },
  'Osman can wait (Mention, for Selin)': { whispers: [w('osmanWaits', 'mention', 'benevolence')] },
  'Stay out late (Mention)': { whispers: [w('friends', 'mention', 'belonging')] },
  'Sleep in (Urge)': { whispers: [w('sleepIn', 'urge', 'safety')] },
  'Selin, then skip the call': {
    whispers: (d) =>
      d < 10 ? [w('selin', 'mention', 'benevolence')] : [w('skipCall', 'urge', 'benevolence')],
  },
};

const DAILY = new Set(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);

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
  /** Calls between them in Ramadan that connected, his and hers (family contact). */
  contact: number;
  /** Days he shopped for Eid in Ramadan. */
  shops: number;
  clinic: number;
  /** Ramadan days with a suhoor meal. */
  suhoors: number;
  /** Mean sleep a day in hours (nights only, then with naps), rest a day, and nights he went to bed after 00:30. */
  sleepHours: number;
  sleepAll: number;
  restHours: number;
  lateNights: number;
  /** Ramadan days with food or water in fasting hours (the town excuses them as illness or necessity). */
  brokenFastDays: number;
  prayers: number;
  /** Missed-prayer episodes in memory (ninth and tenth passes; superseded by the chronicle counts below). */
  missedPrayers: number;
  /** The five daily prayers in Ramadan from his chronicle: kept, missed (closed broken), excused (asleep throughout). */
  prayersKept: number;
  prayersMissed: number;
  prayersExcused: number;
  /** Make-up prayers kept in Ramadan, and prayer make-ups still owed on Eid morning. */
  madeUp: number;
  prayerDebt: number;
  /** Ramadan fasts: kept, excused for illness, excused under necessity, broken (a breach). */
  fastKept: number;
  fastIll: number;
  fastNecessity: number;
  fastBroken: number;
  /** Ramadan days with a cigarette in fasting hours. */
  fastSmokeDays: number;
  /** His answers to your word (as `answers`), keyed by tone and the framework's reason, e.g. "willNot norm:salah". */
  verdicts: Record<string, number>;
  eidPrayer: boolean;
  /** His answers to your words on the played days, by tone, and how often you insisted. */
  answers: Record<string, number>;
  insisted: number;
}

export function measure(opts: PlayOpts, seed = SHIPPED_SEED): Measured {
  const g = new VoiceGame(seed);
  // Measurement only: read the reason behind each answer the log shows (the game keeps the reason off screen). This
  // wraps the game's private answer handler (decisions and words answered at once) without changing what it does;
  // the players never see it.
  const verdicts: Record<string, number> = {};
  const hook = g as unknown as {
    heard(you: SuggestionResolution, at: number, decisionId?: string): void;
    logSeq: number;
  };
  const heard = hook.heard.bind(g);
  hook.heard = (you, at, decisionId) => {
    const seq = hook.logSeq;
    heard(you, at, decisionId);
    for (let i = g.log.length - 1; i >= 0; i--) {
      const e = g.log[i];
      if (!e || Number(e.id.slice(1)) <= seq) break;
      if (e.kind !== 'answer' || !e.tone) continue;
      const k = `${e.tone} ${you.reason ?? '?'}`;
      verdicts[k] = (verdicts[k] ?? 0) + 1;
    }
  };
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
  const chron = chronicleBetween(g.halil.chronicle ?? [], 0, TOWN_EID_DAY - 1);
  const daily = (names: string[]) => names.filter((n) => DAILY.has(n)).length;
  const notes = (k: 'kept' | 'released' | 'broken', kind: string) =>
    chron.reduce((n, r) => n + r[k].filter((x) => x.kind === kind).length, 0);
  const ill = g.illDays.filter((d) => d < TOWN_EID_DAY).length;
  const inFast = (c: (typeof done)[number]) => {
    const d = day(c.from);
    const cal = townCalendar(d);
    const m = c.from % MIN_DAY;
    return townDay(d).kind === 'ramadan' && m >= cal.fajr && m < cal.maghrib;
  };
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
    contact: g.calls.filter((c) => day(c.at) < TOWN_EID_DAY).length,
    shops: count((c) => c.affordanceId === 'shop'),
    clinic: count((c) => c.affordanceId === 'see-doctor'),
    suhoors: suhoor.size,
    sleepHours: sleepMin / 60 / TOWN_EID_DAY,
    sleepAll:
      ram.filter((c) => c.action === 'sleep').reduce((s, c) => s + c.to - c.from, 0) / 60 / TOWN_EID_DAY,
    restHours:
      ram.filter((c) => c.action === 'rest').reduce((s, c) => s + c.to - c.from, 0) / 60 / TOWN_EID_DAY,
    lateNights: late,
    brokenFastDays: new Set(
      ram
        .filter((c) => {
          const d = day(c.from);
          const cal = townCalendar(d);
          const m = c.from % MIN_DAY;
          return (
            (c.action === 'eat' || c.action === 'drink') &&
            townDay(d).kind === 'ramadan' &&
            m >= cal.fajr &&
            m < cal.maghrib
          );
        })
        .map((c) => day(c.from)),
    ).size,
    prayers: count((c) => c.action === 'pray'),
    missedPrayers: eid.memory.episodes.filter((e) => e.kind === 'missed' && e.action === 'pray').length,
    prayersKept: chron.reduce((n, r) => n + daily(r.prayers.kept), 0),
    prayersMissed: chron.reduce((n, r) => n + daily(r.prayers.missed), 0),
    prayersExcused: chron.reduce(
      (n, r) => n + r.released.filter((x) => x.kind === 'worship' && DAILY.has(x.label ?? '')).length,
      0,
    ),
    madeUp: count((c) => c.action === 'pray-qada'),
    prayerDebt:
      (eid.agenda.owed ?? []).filter((o) => o.kind === 'worship' && o.scheduledAs === undefined).length +
      eid.agenda.commitments.filter((c) => c.status === 'pending' && c.actions.includes('pray-qada')).length,
    fastKept: notes('kept', 'abstain'),
    fastIll: ill,
    fastNecessity: Math.max(0, notes('released', 'abstain') - ill),
    fastBroken: notes('broken', 'abstain'),
    fastSmokeDays: new Set(ram.filter((c) => c.action === 'smoke' && inFast(c)).map((c) => day(c.from))).size,
    verdicts,
    eidPrayer: done.some((c) => c.action === 'pray-eid'),
    answers,
    insisted: g.insisted,
  };
}
