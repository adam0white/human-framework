/**
 * Headless game state for *The Day You Say Nothing* (build plan §5, §6, §8). One `VoiceGame` holds the whole
 * town and the player's side: phases (premise → day → between → … → eid → report → free), the day plan (played
 * Ramadan 1, 2, 15, 30 with skips, a muted Eid on day 31, then a 6-day muted epilogue on a clone of the whole run),
 * the standing suggestion, beats, the log, and the clock (pace, fast-forward, carry). The worker only forwards
 * messages to it; tests drive it directly. Deterministic: the same seed, inputs and tick schedule give the same
 * frames. No wall clock and no `Math.random` anywhere in sim/.
 *
 * Contract deviation (reported): two skip whispers are both voice `you`, and the framework hears one suggestion
 * per voice per decision (`voicesIn` dedupes by voice), so the skip alternates them hour by hour, preferring
 * the one whose option is on offer.
 */
import {
  type Affordance,
  type Community,
  chronicleBetween,
  consolidateDay,
  createCommunity,
  createTown,
  type DayRecord,
  type DecisionRecord,
  dayOf,
  decide,
  interruptPerson,
  isLossEpisode,
  MINUTES_PER_DAY,
  narrateChronicle,
  nextEventAt,
  type Person,
  pressureReachedAt,
  preview,
  readBody,
  resolutionsOf,
  runSilent,
  type SimEvent,
  type StepOptions,
  type Suggestion,
  selinEidCallMinute,
  standingHeard,
  stepCommunity,
  TOWN_DEFAULTS,
  TOWN_EID_DAY,
  TOWN_GAME_CREATE,
  TOWN_GAME_START,
  TOWN_IDS,
  type Town,
  type TownOptions,
  type TownPersonId,
  townCalendar,
  townDay,
  townPeople,
  voiceOf,
} from '@human/framework';
import {
  type BeatKind,
  type BetweenView,
  type Draft,
  type Frame,
  type LogEntry,
  PACE_MINUTES_PER_SECOND,
  type Pace,
  type Phase,
  type Prefill,
  type ReportView,
  SHIPPED_SEED,
  STRENGTH_VALUE,
  type StandingWhisper,
  type Telegraph,
  type VoiceId,
  type WhyView,
  type WorkerReply,
} from '../protocol.ts';
import { BEAT_COOLDOWN, type BeatState, createBeats, fire, flagOnce, takeCloseCall } from './beats.ts';
import { closeRival, moneyShort, prefillFor } from './prefill.ts';
import { buildReport, ledgerKey, type SaidCount } from './report.ts';
import { answer, createStanding, type Standing, standingView, toSuggestion, WHY_AWAY } from './standing.ts';
import { noteUnasked, type UnaskedState, unaskedView } from './unasked.ts';
import {
  ACTION_LABEL,
  type Cell,
  clock,
  commitmentLabel,
  dayLabel,
  doctorLine,
  endsView,
  halilView,
  happened,
  isVoiceId,
  labelFor,
  nameOfVoice,
  pressureWord,
  stripFor,
  TRUST_REASON,
  toldLine,
  toneOf,
  voicesView,
  weighsView,
  whyView,
} from './view.ts';

export { SHIPPED_SEED };
export const PLAYED_DAYS = [1, 2, 15, 30] as const;
/** A played day ends at this minute of the day (plan §5). */
export const DAY_END = 23 * 60 + 30;
export const FAST_FORWARD = 240;
/** Per-tick minute caps (the worker clamps dt to 250 ms): normal play, and fast-forward. */
export const MAX_MINUTES_PER_TICK = 15;
export const MAX_FF_MINUTES_PER_TICK = 60;
/** The composer opens when the running activity has at most this many minutes left. */
export const COMPOSER_LEAD = 30;
export const LOG_CAP = 300;
export const EPILOGUE_DAYS = 6;
/** A sleep longer than this many minutes is a night's sleep (the town caps naps at 90). */
const NAP_LONGEST = 120;
/** Length of one whisper's turn during a skip (see the deviation note above). */
const SKIP_CHUNK = 60;

export const WHISPERS: Record<StandingWhisper['choiceId'], { optionId: string; label: string }> = {
  extra: { optionId: 'work-extra', label: 'take the afternoon shift' },
  work: { optionId: 'work-repair', label: 'work in the morning' },
  doctor: { optionId: 'see-doctor', label: 'see the doctor' },
  selin: { optionId: 'call:selin', label: 'call Selin' },
  rent: { optionId: 'pay-rent', label: 'pay Osman when you can' },
  mosque: { optionId: 'pray', label: 'pray at the mosque' },
  rest: { optionId: 'rest', label: 'rest in the afternoon' },
  walk: { optionId: 'walk', label: 'walk after iftar, not the cigarette' },
};

const CRAVING_MIN = 0.3;
/** Acts that speak for themselves, and the need intentions (lexicon `intention:<need>`) dropped from their line. */
const BODILY_ACTS = new Set(['eat', 'drink', 'sleep', 'rest']);
const BODILY_INTENTIONS = /^to (drink|feed myself|sleep|rest)$/;
const THIRST_RISK = 0.7;
/** A promise's running-late beat comes at most this many minutes before its deadline. */
const PROMISE_RISK_LEAD = 180;
/** While he sleeps, a deadline beat waits until the deadline is this close (he may wake first). */
const ASLEEP_RISK_LEAD = 60;

export interface Run {
  c: Community;
  town: Town;
  ppl: Record<TownPersonId, Person>;
  /** The town options the run was built with; a clone passes them on (they are not all in `TownState`). */
  opts: TownOptions;
}

export function newRun(seed: number, opts: TownOptions = {}): Run {
  const ppl = townPeople({ ...opts, now: TOWN_GAME_CREATE });
  const people = TOWN_IDS.map((id) => ppl[id]);
  const town = createTown(people, { ...opts, seed, now: TOWN_GAME_CREATE });
  return { c: createCommunity(people), town, ppl, opts };
}

/** A deep copy of the whole run: every person, the community's host fields and the town state (plan §5). */
export function cloneRun(r: Run): Run {
  const { c, state } = structuredClone({ c: r.c, state: r.town.state });
  const ppl = Object.fromEntries(c.people.map((p) => [p.id, p])) as Record<TownPersonId, Person>;
  const town = createTown(
    TOWN_IDS.map((id) => ppl[id]),
    { ...r.opts, seed: 0, state },
  );
  return { c, town, ppl, opts: r.opts };
}

/** Decisions made while the player was muted, for the "no `you` suggestion" audit. */
export interface MutedAudit {
  at: number;
  voices: string[];
}

export class VoiceGame {
  seed: number;
  run: Run;
  phase: Phase = 'premise';
  paused = true;
  pace: Pace = 'slow';
  autoPause = true;
  /** Game clock (every person has been stepped to here). */
  t: number = TOWN_GAME_START;
  /** The played day and the minute it ends. */
  day = 1;
  dayEndAt: number = MINUTES_PER_DAY + DAY_END;
  /** Free play after Keep listening. */
  free = false;
  carry = 0;
  log: LogEntry[] = [];
  logSeq = 0;
  beats: BeatState = createBeats();
  standing: Standing | undefined;
  pauseBeat: { kind: BeatKind; text: string } | undefined;
  intro: { label: string; lines: string[] } | undefined;
  between: BetweenView | undefined;
  report: ReportView | undefined;
  /** Replies (between, report) for the worker to post. */
  outbox: WorkerReply[] = [];
  /** Halil's activity cells, for strips. */
  cells: Cell[] = [];
  /** Minutes in the current step at which he began a sleep (so a sleep ending then is no waking). */
  private resleptAt = new Set<number>();
  /** Times the player insisted, for the report. */
  insisted = 0;
  /** Days his fast was excused for illness (round 3: surfaced in the log, the skip digest, his pane and the report). */
  illDays: number[] = [];
  open: Cell | undefined;
  records = new Map<string, DecisionRecord>();
  audit: MutedAudit[] = [];
  trustStart: number;
  dayTrustStart: number;
  endRamadanTrust: Record<string, number> = {};
  eidNight: { run: Run; t: number } | undefined;
  /** The town at Eid morning, when the month you spoke in had ended (the report reads his ends here). */
  eidMorning:
    | { run: Run; t: number; halilCalledAt?: number; calledUnasked?: boolean; unasked?: UnaskedState }
    | undefined;
  /** Rent payments with their minute (the town keeps only the total). */
  payments: { at: number; amount: number }[] = [];
  private rentSeen = 0;
  private introduced = new Set<string>();
  firstSuggestion = false;
  suggestedAction: string | undefined;
  /** His weighing of the next choice, read once when the composer opens before it (see `lookAhead`). */
  ahead: { forDecision: string; record: DecisionRecord } | undefined;
  /** When the last close-call pause fired, so a look-ahead pause is not repeated when the real decision lands. */
  private closeCallAt: number | undefined;
  /** Minute Halil last placed a call to Selin himself (for the prefill and the Selin end). */
  halilCalledAt: number | undefined;
  /** When Selin first called him on Eid, if she did (the report says so rather than "he waited"). */
  selinEidCallAt: number | undefined;
  /** What the player said in Ramadan, by option, for the report's ledger (played days and whispers). */
  said: Record<string, SaidCount> = {};
  /** The night sleep whose waking was announced ahead of time (its decision id). */
  private wakeAnnounced: string | undefined;
  private shiftBeatAt: number | undefined;
  /** The last call between Halil and Selin already logged. */
  private callSeen: number | undefined;
  /** What he would now do unasked, from his last decisions without your voice (see unasked.ts). */
  unasked: UnaskedState = {};
  /** How the clinic, calling Selin and the mosque felt to him at the start (for `weighs` trends). */
  weighsStart: Record<string, number> = {};
  private traceIds = new Set<string>();
  private adviceSeen = new Set<string>();
  private episodesSeen = new Set<string>();
  private quiet = false;
  private muted = false;

  constructor(seed: number = SHIPPED_SEED) {
    this.seed = seed;
    this.run = newRun(seed);
    stepCommunity(this.run.c, this.run.town, TOWN_GAME_START, {});
    const h = this.halil;
    this.trustStart = voiceOf(h, 'you')?.trust ?? 0.5;
    this.dayTrustStart = this.trustStart;
    for (const r of h.trace) this.traceIds.add(r.id);
    for (const e of h.memory.episodes) this.episodesSeen.add(e.id);
    this.callSeen = this.run.town.state.lastCall?.at;
    for (const x of h.memory.expectations) this.weighsStart[x.key] = x.valence;
    // What reached him in the unseen evening becomes the first lines of the log.
    for (const a of [...(h.will.advice ?? [])].sort((x, y) => x.at - y.at)) {
      this.adviceSeen.add(adviceKey(a));
      if (a.sourceId === 'you') continue;
      this.push(
        {
          kind: 'voice',
          who: voiceWho(a.sourceId),
          text: `Last night — ${voiceLine(a.sourceId, a.affordanceId ?? a.action, this.introduce(a.sourceId))}`,
        },
        a.at,
      );
    }
  }

  get halil(): Person {
    return this.run.ppl.halil;
  }

  /** True the first time a voice is named in the log (it then carries who they are to him). */
  private introduce(id: string): boolean {
    if (this.introduced.has(id)) return false;
    this.introduced.add(id);
    return true;
  }

  // --- input ------------------------------------------------------------------------------------

  begin(): void {
    if (this.phase !== 'premise') return;
    this.phase = 'day';
    this.paused = false;
  }
  pause(): void {
    this.paused = true;
  }
  resume(): void {
    if (this.intro || this.phase === 'between' || this.phase === 'report' || this.phase === 'premise') return;
    this.paused = false;
    this.pauseBeat = undefined;
  }
  setPace(p: Pace): void {
    this.pace = p;
  }
  setAutoPause(on: boolean): void {
    this.autoPause = on;
  }
  dismissIntro(): void {
    this.intro = undefined;
  }

  /** Composer state (plan §6.3): open only when he is awake and idle or nearly done. */
  composer(): Frame['composer'] {
    if (this.muted || this.phase === 'eid' || this.phase === 'report')
      return { open: false, reason: 'muted' };
    const h = this.halil;
    const act = h.activity;
    if (h.body.asleep && this.waking()) return this.live() ? { open: true } : { open: false };
    if (h.body.asleep)
      return act
        ? { open: false, reason: 'asleep', until: clock(act.endsAt) }
        : { open: false, reason: 'asleep' };
    if (act && act.endsAt - this.t > COMPOSER_LEAD)
      return { open: false, reason: 'busy', until: clock(act.endsAt) };
    if (!this.live()) return { open: false };
    return { open: true };
  }

  offers(): Affordance[] {
    return this.run.town.affordancesFor(this.halil);
  }

  predict(draft: Draft): Telegraph {
    const h = this.waking() ? this.ghost() : this.halil;
    const r = preview(h, this.offers(), toSuggestion(draft), {
      scarcity: this.run.town.scarcityFor?.(h) ?? 0,
    });
    const tone = toneOf(r.verdict, r.kind);
    const counter = r.counterOffer?.label;
    const probably = r.likelihood !== undefined && r.likelihood < 0.8 ? 'Probably ' : '';
    const text =
      tone === 'yes'
        ? `${probably || 'Likely: '}“${r.says}”`
        : tone === 'protest'
          ? `He’d do it under protest: “${r.says}”`
          : tone === 'cannot'
            ? `Can’t: “${r.says}”`
            : tone === 'willNot'
              ? `Won’t: “${r.says}”`
              : r.verdict === 'modified'
                ? `He’d do something like it: ${counter ?? r.says}`
                : `Not now — ${counter ?? r.says}`;
    const out: Telegraph = {
      tone,
      text: draft.insist && tone === 'yes' ? `${text} You insisted, so it earns you no trust.` : text,
      says: r.says,
      reason: r.reason,
    };
    if (counter) out.counter = counter;
    if (r.likelihood !== undefined) out.likelihood = r.likelihood;
    return out;
  }

  /** Confirm: the draft becomes the standing suggestion and he weighs it now. */
  suggest(draft: Draft): void {
    if (!this.live() || this.muted) return;
    const offers = this.offers();
    if (!offers.some((o) => o.id === draft.optionId)) {
      // The option went away between draft and Confirm: say so and stay paused.
      this.push({
        kind: 'note',
        who: 'you',
        text: 'That is no longer one of his choices. Nothing was said.',
      });
      this.paused = true;
      return;
    }
    if (this.standing) this.endStanding('replaced');
    this.standing = createStanding(draft, labelFor(draft.optionId, offers), this.t);
    this.suggestedAction = offers.find((o) => o.id === draft.optionId)?.action;
    this.firstSuggestion = true;
    if (draft.insist) this.insisted++;
    if (!this.free) this.countSaid(draft.optionId, this.standing.label, 1);
    this.push({ kind: 'you', who: 'you', text: `You: ${this.standing.label}` });
    // At the wake his sleep ends within the minute and the next decision hears you; interrupting would ask a
    // sleeping man (a 'cannot').
    if (!this.waking()) interruptPerson(this.run.c, this.halil, this.t, 'voice');
    this.pauseBeat = undefined;
    this.paused = false;
    this.advanceTo(this.t + 1);
  }

  /** Count what the player said, by option: suggestions on played days, and days under a whisper. */
  private countSaid(optionId: string, label: string, played: number, days = 0): void {
    const key = ledgerKey(optionId);
    const plain =
      WHISPER_LABEL[key] ??
      label.split(' · ').find((x) => x !== 'mention' && x !== 'urge' && !x.endsWith('insist')) ??
      label;
    this.said[key] ??= { label: plain, played: 0, days: 0 };
    const row = this.said[key];
    row.played += played;
    row.days += days;
  }

  withdraw(): void {
    if (this.standing) this.endStanding('withdrawn');
  }

  why(decisionId: string): WhyView | null {
    const r =
      this.records.get(decisionId) ?? (this.ahead?.record.id === decisionId ? this.ahead.record : undefined);
    return r ? whyView(this.halil, r, this.offers()) : null;
  }

  /** End the day: fast-forward to 23:30 with only the current standing suggestion live. */
  endDay(): void {
    if (!this.live()) return;
    this.quiet = true;
    try {
      // In half-hour steps, so sleep, a refusal or expiry still end the standing suggestion on the way.
      while (this.t < this.dayEndAt) {
        let next = Math.min(this.dayEndAt, this.t + 30);
        const spentAt = this.spentAt();
        if (spentAt !== undefined && spentAt - 1 > this.t) next = Math.min(next, spentAt - 1);
        this.stepTo(next, this.liveSuggestion(next));
      }
    } finally {
      this.quiet = false;
    }
    this.closeDay();
  }

  /** The between-days card's button: the next day, skipping days under the chosen whispers. */
  advance(whispers: readonly StandingWhisper[] = []): void {
    if (this.phase !== 'between' || !this.between) return;
    const next = this.between.next;
    if (!next) {
      this.startEid();
      return;
    }
    const fromDay = this.day;
    const target = next.day * MINUTES_PER_DAY;
    const chosen = whispers.slice(0, 2);
    const list = chosen.map((w) => {
      const s: Suggestion = {
        voiceId: 'you',
        affordanceId: WHISPERS[w.choiceId].optionId,
        strength: STRENGTH_VALUE[w.strength],
        // Standing advice (framework, round 3): done once per occasion from now, then dormant until it is due again.
        since: this.t,
      };
      if (w.appeal) s.appeal = w.appeal;
      return s;
    });
    const st = this.run.town.state;
    const before = {
      trust: voiceOf(this.halil, 'you')?.trust ?? 0.5,
      money: st.money.halil ?? 0,
      paid: st.rentPaid,
      cells: this.cells.length,
    };
    const tally = {
      worn: [] as number[],
      pays: [] as { day: number; amount: number }[],
      collects: [] as number[],
    };
    const calls = { his: 0, hers: 0 };
    let lastCall = st.lastCall?.at;
    let lastCollect = st.lastCollect;
    let paid = st.rentPaid;
    let worn = voiceOf(this.halil, 'you')?.lastWornAt;
    // His answers to each whisper at fresh decisions (not reviews), so the digest shows a word he can refuse.
    const answers = new Map<string, { yes: number; off: number; no: number }>();
    let traceSeen = new Set(this.halil.trace.map((r) => r.id));
    this.quiet = true;
    try {
      let k = 0;
      while (this.t < target) {
        const until = Math.min(target, this.t + SKIP_CHUNK);
        let sug: Suggestion | undefined;
        if (list.length > 0) {
          const offers = this.offers();
          const order = list.map((_, i) => list[(k + i) % list.length] as Suggestion);
          sug = order.find((s) => standingHeard(this.run.c, this.halil, s, offers, this.t)) ?? order[0];
        }
        this.stepTo(until, sug ? { halil: sug } : undefined);
        k += 1;
        if (sug?.affordanceId) {
          const a = answers.get(sug.affordanceId) ?? { yes: 0, off: 0, no: 0 };
          answers.set(sug.affordanceId, a);
          for (const r of this.halil.trace) {
            if (traceSeen.has(r.id) || r.review) continue;
            const y = resolutionsOf(r).find((x) => x?.voiceId === 'you');
            if (!y) continue;
            if (y.verdict === 'assented' || y.verdict === 'complied' || y.verdict === 'modified') a.yes++;
            else if (y.verdict === 'deferred') a.off++;
            else if (y.verdict === 'refused') a.no++;
          }
        }
        traceSeen = new Set(this.halil.trace.map((r) => r.id));
        const call = st.lastCall;
        if (call && call.at !== lastCall) {
          lastCall = call.at;
          if (call.by === 'halil') calls.his++;
          else calls.hers++;
        }
        if (st.rentPaid !== paid) {
          tally.pays.push({ day: dayOf(this.t), amount: Math.round(st.rentPaid - paid) });
          paid = st.rentPaid;
        }
        if (st.lastCollect !== undefined && st.lastCollect !== lastCollect) {
          lastCollect = st.lastCollect;
          tally.collects.push(st.lastCollect);
        }
        const w = voiceOf(this.halil, 'you')?.lastWornAt;
        if (w !== undefined && w !== worn) {
          worn = w;
          tally.worn.push(w);
        }
      }
    } finally {
      this.quiet = false;
    }
    this.between = undefined;
    this.day = next.day;
    this.dayEndAt = next.day * MINUTES_PER_DAY + DAY_END;
    this.phase = this.free ? 'free' : 'day';
    this.paused = true;
    this.pauseBeat = undefined;
    this.dayTrustStart = voiceOf(this.halil, 'you')?.trust ?? 0.5;
    const lines: string[] = [];
    if (next.skipped > 0) {
      // Only the skipped days: the played day's tail (after 23:30) is not one of them ("13 of 12 days").
      const cells = this.cells
        .slice(before.cells)
        .filter((c) => happened(c) && c.from < target && dayOf(c.from) > fromDay);
      const days = next.skipped;
      // What your whispers did, first: how many of the days he did each.
      for (const [i, w] of chosen.entries()) {
        const id = WHISPERS[w.choiceId].optionId;
        const did = new Set(cells.filter((c) => c.affordanceId === id).map((c) => dayOf(c.from))).size;
        const all = cells.filter((c) => c.affordanceId === id).length;
        const onWord = cells.filter((c) => c.affordanceId === id && c.promptedBy === 'you').length;
        const own = all - onWord;
        if (!this.free) this.countSaid(id, WHISPERS[w.choiceId].label, 0, days);
        const a = answers.get(id) ?? { yes: 0, off: 0, no: 0 };
        const heard = a.yes + a.off + a.no;
        // Round 4 (game design review): his answers, so a whisper reads as a word he weighed, not a switch.
        const said =
          heard === 0
            ? ' He never had the chance to act on it when he heard it.'
            : ` When he heard it, he said yes ${times(a.yes)}${a.off > 0 ? `, put you off ${times(a.off)}` : ''}${a.no > 0 ? `, refused ${times(a.no)}` : ''}${a.off + a.no === 0 ? ' and never put you off' : ''}.`;
        lines.push(
          `“${WHISPERS[w.choiceId].label}” (${w.strength}${i === 0 && chosen.length > 1 ? ', in turn with the other' : ''}): he did it on ${did} of ${days} days${onWord > 0 ? `, ${times(onWord)} on your word` : ''}${own > 0 ? `${onWord > 0 ? ' and' : ','} ${times(own)} on his own` : ''}.${said}`,
        );
      }
      if (chosen.length === 0) lines.push('You left no word. What follows he did on his own.');
      lines.push(...this.skipFacts(fromDay + 1, next.day - 1, cells, before, tally, calls));
      const after = voiceOf(this.halil, 'you')?.trust ?? 0.5;
      const firstWorn = tally.worn[0];
      lines.push(
        `His trust in you went ${before.trust.toFixed(2)} → ${after.toFixed(2)}.` +
          (firstWorn !== undefined
            ? ` By ${dayLabel(dayOf(firstWorn))} he was tired of hearing it: being asked again for what he did not want wore it down ${times(tally.worn.length)}.`
            : ''),
      );
    }
    // What is open today (game design review: a played day needs a question, and "Ramadan 2 begins" said none).
    const today = this.dayQuestions(next.day);
    if (today.length > 0)
      lines.push(...(next.skipped > 0 ? [`Today, ${dayLabel(next.day)}:`] : []), ...today);
    else if (next.skipped === 0) lines.push(`${dayLabel(next.day)} begins.`);
    this.intro = { label: next.skipped > 0 ? `${next.skipped} days passed` : dayLabel(next.day), lines };
  }

  /** The open questions of a played day, from his ends: Osman's money, the clinic, Selin, and Eid ahead. */
  private dayQuestions(day: number): string[] {
    const st = this.run.town.state;
    const T = TOWN_DEFAULTS;
    const out: string[] = [];
    const owed = Math.round(st.rentOwed);
    const money = Math.round(st.money.halil ?? 0);
    const lastFast = TOWN_EID_DAY - 1;
    if (owed > 0 && st.rentPaid < T.rent && day <= T.rentPromiseDay)
      out.push(
        day === T.rentPromiseDay
          ? `Today is Osman’s date: 300 by 20:00. He has ${money}.`
          : `Osman wants 300 by Ramadan ${T.rentPromiseDay}. He has ${money}.`,
      );
    else if (owed > 0 && day <= lastFast)
      out.push(
        day === lastFast
          ? `Osman wants the rest, ${owed}, by tonight, the end of Ramadan. He has ${money}.`
          : `Osman wants the rest, ${owed}, by the end of Ramadan. He has ${money}.`,
      );
    if ((st.completed.halil?.['see-doctor'] ?? 0) === 0) out.push('He has not had his blood pressure seen.');
    const since = this.halilCalledAt === undefined ? undefined : day - dayOf(this.halilCalledAt);
    if (since === undefined) out.push('He has not called Selin himself since the funeral.');
    else if (since >= 2) out.push(`He has not called Selin himself in ${since} days.`);
    if (day === lastFast) out.push('Tomorrow is Eid. Then you say nothing, and see what he does.');
    return out;
  }

  /** The plain facts of skipped days: work and money, Osman, calls, the clinic, the fast, his prayers. */
  private skipFacts(
    from: number,
    to: number,
    cells: readonly Cell[],
    before: { money: number; paid: number },
    tally: { pays: { day: number; amount: number }[]; collects: number[] },
    calls: { his: number; hers: number },
  ): string[] {
    const out: string[] = [];
    const st = this.run.town.state;
    const daysOf = (id: string) =>
      new Set(cells.filter((c) => c.affordanceId === id).map((c) => dayOf(c.from))).size;
    const mornings = daysOf('work-repair');
    const afternoons = daysOf('work-extra');
    // What he earned, so the money adds up on the card: now − before + rent paid + clinic fees (the only costs).
    const clinicVisits = cells.filter((c) => c.affordanceId === 'see-doctor').length;
    const earned = Math.round(
      (st.money.halil ?? 0) -
        before.money +
        (st.rentPaid - before.paid) +
        clinicVisits * TOWN_DEFAULTS.clinicFee,
    );
    out.push(
      `He worked ${mornings} morning${mornings === 1 ? '' : 's'}${afternoons > 0 ? ` and ${afternoons} afternoon shift${afternoons === 1 ? '' : 's'}` : ' and no afternoon shift'} and earned ${earned} (a spoiled job pays less than half); he has ${Math.round(st.money.halil ?? 0)} (was ${Math.round(before.money)}).`,
    );
    if (tally.pays.length > 0)
      out.push(tally.pays.map((p) => `He paid Osman ${p.amount} on ${dayLabel(p.day)}.`).join(' '));
    else if (tally.collects.length > 0)
      out.push(
        `Osman came about the rent on ${tally.collects.map((d) => dayLabel(d)).join(' and ')}; he could not pay.`,
      );
    out.push(
      calls.his > 0
        ? `He called Selin ${times(calls.his)}${calls.hers > 0 ? `; she called ${times(calls.hers)}` : ''}.`
        : calls.hers > 0
          ? `He never called Selin; she called ${times(calls.hers)}.`
          : 'He and Selin did not speak.',
    );
    const clinic = [
      ...new Set(cells.filter((c) => c.affordanceId === 'see-doctor').map((c) => dayLabel(dayOf(c.from)))),
    ];
    if (clinic.length > 0) out.push(`He went to the clinic on ${listed(clinic)}.`);
    const recs = chronicleBetween(this.halil.chronicle ?? [], from, to);
    const kept = recs.filter((r) => r.kept.some((n) => n.kind === 'abstain')).length;
    const excused = recs.filter((r) => r.released.some((n) => n.kind === 'abstain')).length;
    const ill = this.illDays.filter((d) => d >= from && d <= to).sort((a, b) => a - b);
    if (recs.some((r) => townDay(r.day).kind === 'ramadan')) {
      out.push(
        excused > 0
          ? `He kept ${kept} ${kept === 1 ? 'fast' : 'fasts'}; ${excused} ${excused === 1 ? 'was' : 'were'} excused, to be made up after Eid.`
          : `He kept the fast every day.`,
      );
      if (ill.length > 0) {
        const doc = doctorLine(this.run.town);
        out.push(
          `His blood pressure made him unwell on ${listed(ill.map((d) => dayLabel(d)))}; he counted himself ill and did not fast ${ill.length === 1 ? 'that day' : 'those days'}.${doc ? ` ${doc}` : ' He had not seen the doctor about it.'}`,
        );
      }
    }
    const prayed = recs.reduce((n, r) => n + r.prayers.kept.length, 0);
    const missed = recs.reduce((n, r) => n + r.prayers.missed.length, 0);
    const mosque = cells.filter((c) => c.affordanceId === 'pray').length;
    if (prayed + missed > 0)
      out.push(
        `He prayed ${missed === 0 ? 'every prayer' : `${prayed} of ${prayed + missed} prayers`}${mosque === 0 ? ', all at home' : `; he went to the mosque ${times(mosque)}`}.`,
      );
    return out;
  }

  keepListening(): void {
    if (this.phase !== 'report' || !this.eidNight) return;
    this.run = cloneRun(this.eidNight.run);
    this.t = this.eidNight.t;
    this.rentSeen = this.run.town.state.rentPaid;
    this.muted = false;
    this.free = true;
    this.resetTracking();
    this.phase = 'between';
    this.day = TOWN_EID_DAY;
    this.between = {
      closed: 'Eid al-Fitr is over.',
      lines: [],
      strip: stripFor(TOWN_EID_DAY, this.cells),
      ends: this.ends(),
      trust: { from: this.dayTrustStart, to: this.dayTrustStart, events: [] },
      next: { label: dayLabel(TOWN_EID_DAY + 1), day: TOWN_EID_DAY + 1, skipped: 0 },
      choices: [],
    };
    this.push({ kind: 'note', who: 'halil', text: 'You can speak again.' });
    this.advance([]);
  }

  // --- the clock --------------------------------------------------------------------------------

  live(): boolean {
    return (this.phase === 'day' || this.phase === 'eid' || this.phase === 'free') && !this.intro;
  }

  /**
   * A night sleep (longer than a nap) that ends at its planned minute: the waking is announced one minute ahead,
   * so the player can speak before he chooses what to do (fix pass 2: the composer used to open after the first
   * choice of the day was made and logged). Naps end with a log line and no pause.
   */
  private nightSleep(): boolean {
    const act = this.halil.activity;
    return (
      !!act &&
      this.halil.body.asleep &&
      act.endsAt - act.startedAt > NAP_LONGEST &&
      !this.quiet &&
      !this.muted
    );
  }

  /** He is asleep and the announced waking is now: his sleep ends next minute. */
  waking(): boolean {
    const act = this.halil.activity;
    return !!act && this.nightSleep() && this.wakeAnnounced === act.decisionId && act.endsAt - this.t <= 1;
  }

  /** A throwaway copy of him as he will be at his next choice (awake, nothing under way); no state is written. */
  private ghost(): Person {
    const g = structuredClone(this.halil);
    g.activity = null;
    g.body.asleep = false;
    return g;
  }

  /** Fast-forward applies while he sleeps or has more than `COMPOSER_LEAD` minutes of an activity left. */
  fastForward(): boolean {
    const h = this.halil;
    if (this.waking()) return false;
    if (h.body.asleep) return true;
    return h.activity !== null && h.activity.endsAt - this.t > COMPOSER_LEAD;
  }

  /** Real time in: advances whole sim minutes at the pace (or fast-forward). Returns whether time moved. */
  tick(dtMs: number): boolean {
    if (this.paused || !this.live()) return false;
    const dt = Math.max(0, Math.min(dtMs, 250));
    const ff = this.fastForward();
    this.carry += (dt / 1000) * (ff ? FAST_FORWARD : PACE_MINUTES_PER_SECOND[this.pace]);
    const whole = Math.min(ff ? MAX_FF_MINUTES_PER_TICK : MAX_MINUTES_PER_TICK, Math.floor(this.carry));
    if (whole <= 0) return false;
    this.carry -= whole;
    this.advanceTo(this.t + whole);
    if (this.paused) this.carry = 0;
    return true;
  }

  /**
   * Step to `target`, stopping at the first pause. In fast-forward the clock jumps to Halil's next event (or to
   * where the composer would open), so every decision of his is still seen at its own minute.
   */
  advanceTo(target: number): void {
    while (this.t < target && !this.paused && this.live()) {
      let next = this.t + 1;
      if (this.fastForward()) {
        const h = this.halil;
        const ev = nextEventAt(this.run.c, h);
        let to = Number.isFinite(ev) ? Math.ceil(ev) + 1 : target;
        if (h.activity && !h.body.asleep) to = Math.min(to, h.activity.endsAt - COMPOSER_LEAD);
        if (h.activity && this.nightSleep() && this.wakeAnnounced !== h.activity.decisionId)
          to = Math.min(to, h.activity.endsAt - 1);
        next = Math.max(this.t + 1, Math.min(target, to));
      }
      next = Math.min(next, this.dayEndAt);
      const spentAt = this.spentAt();
      if (spentAt !== undefined && spentAt - 1 > this.t) next = Math.min(next, spentAt - 1);
      if (next <= this.t) break;
      this.stepTo(next, this.liveSuggestion(next));
      if (this.t >= this.dayEndAt) {
        this.closeDay();
        break;
      }
    }
  }

  /**
   * The suggested activity is under way: callers step up to the minute before its end with the suggestion live
   * (reviews on the way still hear it), then take the step in which it finishes, and the next choice is made,
   * without it, so that choice does not hear a spent suggestion (playtest: one "eat" became two meals, each
   * credited to you).
   */
  private spentAt(): number | undefined {
    const act = this.halil.activity;
    const going = this.standing?.going;
    return going && act && act.decisionId === going ? act.endsAt : undefined;
  }

  private liveSuggestion(next: number): StepOptions['suggestions'] {
    if (!this.standing || this.muted) return undefined;
    const spentAt = this.spentAt();
    if (spentAt !== undefined && next >= spentAt) return undefined;
    return { halil: toSuggestion(this.standing.draft, this.standing.since) };
  }

  private stepTo(until: number, suggestions?: StepOptions['suggestions']): void {
    if (until <= this.t) return;
    const opts: StepOptions = {};
    if (suggestions && !this.muted) opts.suggestions = suggestions;
    const events = stepCommunity(this.run.c, this.run.town, until, opts);
    this.t = until;
    this.process(events);
  }

  // --- reading what happened --------------------------------------------------------------------

  private process(events: readonly SimEvent[]): void {
    const h = this.halil;
    const fresh = h.trace.filter((r) => !this.traceIds.has(r.id));
    this.traceIds = new Set(h.trace.map((r) => r.id));
    let offeredNow: Set<string> | undefined;
    for (const r of fresh) {
      if (!r.review && r.at >= this.t - 5) offeredNow ??= new Set(this.offers().map((o) => o.id));
      noteUnasked(this.unasked, r, r.at >= this.t - 5 ? offeredNow : undefined);
      this.records.set(r.id, r);
      if (this.records.size > 400) {
        const first = this.records.keys().next().value;
        if (first !== undefined) this.records.delete(first);
      }
      if (this.muted)
        this.audit.push({
          at: r.at,
          voices: resolutionsOf(r)
            .filter((x): x is NonNullable<typeof x> => !!x)
            .map((x) => x.voiceId),
        });
    }
    // A sleep that ends and starts again in the same minute is not a waking.
    this.resleptAt = new Set(
      events
        .filter((e) => e.personId === 'halil' && e.kind === 'begin' && e.action === 'sleep')
        .map((e) => e.at),
    );
    for (const e of events) {
      if (e.personId !== 'halil') continue;
      if (e.kind === 'begin') this.onBegin(e);
      else if (e.kind === 'finish') this.onFinish(e);
    }
    this.onPayments(events);
    for (const r of fresh) this.onDecision(r);
    this.onAdvice();
    this.onCall();
    this.onSleepAndExpiry();
    this.onIllness();
    this.onDutyRisk();
    this.onShiftOffered();
    this.announceWaking();
    this.lookAhead();
  }

  /** A rise in the town's paid total is a payment, dated by its finish event when there is one. */
  private onPayments(events: readonly SimEvent[]): void {
    const paid = this.run.town.state.rentPaid;
    if (paid <= this.rentSeen) return;
    const fin = events.filter(
      (e) => e.personId === 'halil' && e.kind === 'finish' && e.action === 'pay-rent',
    );
    this.payments.push({ at: fin.at(-1)?.at ?? this.t, amount: paid - this.rentSeen });
    this.rentSeen = paid;
  }

  /** One minute before a night sleep ends: the wake line and beat, before he chooses (see `nightSleep`). */
  private announceWaking(): void {
    const act = this.halil.activity;
    if (!act || !this.nightSleep() || this.wakeAnnounced === act.decisionId || act.endsAt - this.t > 1)
      return;
    this.wakeAnnounced = act.decisionId;
    const day = dayOf(act.endsAt);
    const cal = townCalendar(day);
    const m = act.endsAt % MINUTES_PER_DAY;
    const text =
      townDay(day).kind === 'ramadan' && m >= cal.fajr - 90 && m < cal.fajr
        ? 'The drummer comes round for suhoor. He is waking.'
        : `He is waking (${clock(act.endsAt)}).`;
    this.push({ kind: 'note', who: 'halil', text, beat: 'wake' }, this.t);
    this.beat('wake', text, this.t);
  }

  /**
   * The afternoon shift opens while mornings alone will not make Osman's date (or the rest of the rent): pause once
   * a day so the player can say it (design critique: the money goal needs a moment to act on, not only a whisper).
   */
  private onShiftOffered(): void {
    if (this.quiet || this.muted || this.paused || !this.live()) return;
    if (!this.composer().open) return;
    if (!this.offers().some((o) => o.id === 'work-extra')) return;
    // Wait out the beat cooldown rather than spend the day's one chance on a logged-only beat.
    if (this.autoPause && this.t - this.beats.lastPauseAt < BEAT_COOLDOWN) return;
    const short = moneyShort(this.run.town, this.t);
    if (!short || !flagOnce(this.beats, `shift:${dayOf(this.t)}`)) return;
    const text = `The workshop has an afternoon shift. Mornings alone get him to about ${short.projected} by ${short.by}; ${short.wants}.`;
    this.shiftBeatAt = this.t;
    this.push({ kind: 'note', who: 'halil', text, beat: 'duty-risk' }, this.t);
    this.beat('duty-risk', text, this.t);
  }

  /**
   * Selin's calls reach the log even when she gives no advice (playtest: they showed only in the ends). On Eid the
   * call is the day's question, so the window opening and whichever call comes first are beats (round 3, defect 5).
   */
  private onCall(): void {
    const eid = this.phase === 'eid' && !this.quiet;
    // The window beat waits out the cooldown (it would otherwise be logged unpaused just after the cigarette).
    const cooling = this.autoPause && this.t - this.beats.lastPauseAt < BEAT_COOLDOWN;
    if (
      eid &&
      !cooling &&
      this.offers().some((o) => o.id === 'call:selin') &&
      flagOnce(this.beats, `eid-call:${this.day}`)
    ) {
      const text = `He can call Selin for Eid now. She is leaving the first call to him: she will not call before about ${clock(selinEidCallMinute(this.run.town.state))}.`;
      this.push({ kind: 'note', who: 'halil', text, beat: 'voice' });
      this.beat('voice', text, this.t);
    }
    const call = this.run.town.state.lastCall;
    if (!call || call.at === this.callSeen) return;
    this.callSeen = call.at;
    if (call.by === 'halil') this.halilCalledAt = call.at;
    else if (dayOf(call.at) === TOWN_EID_DAY) this.selinEidCallAt ??= call.at;
    const firstOnEid =
      eid && dayOf(call.at) === TOWN_EID_DAY && flagOnce(this.beats, `eid-called:${TOWN_EID_DAY}`);
    if (firstOnEid) {
      const text =
        call.by === 'halil'
          ? 'He called Selin for Eid, before she called him.'
          : 'Selin called him for Eid. He had not called.';
      this.push(
        call.by === 'halil'
          ? { kind: 'note', who: 'halil', text, beat: 'voice' }
          : { kind: 'voice', who: 'selin', text, beat: 'voice' },
        call.at,
      );
      this.keyBeat('voice', text, call.at);
      return;
    }
    if (this.quiet || call.by === 'halil') return;
    const text = 'Selin called.';
    if (this.log.some((x) => x.minute >= call.at - 25 && x.who === 'selin' && x.kind === 'voice')) return;
    this.push({ kind: 'voice', who: 'selin', text }, call.at);
  }

  private onFinish(e: SimEvent): void {
    // The wake line, from the sleep's own finish event, so it carries the minute he woke and is logged before
    // the first thing he does awake (playtest: "He wakes at 15:08" after a 14:53 prayer).
    // A nap's end is a log line, not a pause (playtest: three nap wakes a day were most of R15 and R30); a night
    // sleep's waking was announced a minute ahead (see `announceWaking`).
    if (
      e.action === 'sleep' &&
      !this.quiet &&
      !this.resleptAt.has(e.at) &&
      !(e.decisionId && e.decisionId === this.wakeAnnounced)
    ) {
      const day = dayOf(e.at);
      const cal = townCalendar(day);
      const m = e.at % MINUTES_PER_DAY;
      const text =
        townDay(day).kind === 'ramadan' && m >= cal.fajr - 90 && m < cal.fajr
          ? 'The drummer comes round for suhoor. He wakes.'
          : `He wakes at ${clock(e.at)}.`;
      this.push({ kind: 'note', who: 'halil', text }, e.at);
    }
    if (this.open && this.open.affordanceId === e.affordanceId) {
      this.open.to = e.at;
      this.open.done = e.status !== 'interrupted';
      this.open = undefined;
    }
    // An act he stopped part-way: its log line says so, so a later line does not read as a reversal.
    if (e.status === 'interrupted' && e.decisionId && !this.quiet) {
      const k = this.log.findLastIndex((x) => x.kind === 'act' && x.decisionId === e.decisionId);
      const entry = k >= 0 ? this.log[k] : undefined;
      if (entry && !entry.text.includes('(stopped') && !entry.text.includes('turned back')) {
        const ran = e.at - entry.minute;
        const asked = this.standing?.going === e.decisionId;
        if (ran <= 0 && e.affordanceId !== 'pray') {
          // Begun and given up in the same minute (your word came as he started): it never happened.
          this.log.splice(k, 1);
        } else if (e.affordanceId === 'pray') {
          // The mosque's duration is the walk there and back: left unfinished, he turned back (game design review:
          // "pray at the mosque (stopped)" then "pray at home" read as a bug at every Dhuhr). Usually what turns him
          // is the funeral: the mosque brings back the condolences (his expectation of the place, seeded in town.ts).
          const grief = this.log.some(
            (x) => x.kind === 'recall' && x.decisionId === e.decisionId && /mosque|funeral/.test(x.text),
          );
          entry.until = clock(e.at);
          entry.text = `I set out for the mosque${asked ? ', as you asked,' : ''} and turned back${grief ? '; the mosque brings back the funeral' : ''}.`;
        } else {
          entry.until = clock(e.at);
          entry.text = `${entry.text.replace(/\.$/, '')} (stopped after ${ran >= 60 && ran % 60 === 0 ? `${ran / 60} h` : `${ran} min`}).`;
        }
      }
    }
    // The suggested activity ended: the suggestion is spent (kept standing until then, so reviews on the way
    // still hear it and he does not turn back half-way).
    const s = this.standing;
    if (s?.going && s.going === e.decisionId)
      this.endStanding(e.status === 'interrupted' ? 'expired' : 'begun');
  }

  /**
   * Defect fix (playtest 2026-10-03): the close call used to be read from the decision after he had begun, so the
   * pause came with the act already logged. When the composer opens before his next choice, weigh that choice on a
   * throwaway copy of him (no state written) and pause on a close call before he makes it.
   */
  private lookAhead(): void {
    if (this.quiet || this.muted) return;
    const h = this.halil;
    const act = h.activity;
    if (!act || act.endsAt - this.t > COMPOSER_LEAD) return;
    if (h.body.asleep && !this.waking()) return;
    if (this.ahead?.forDecision === act.decisionId) return;
    const ghost = this.ghost();
    const offers = this.offers();
    const opts: Parameters<typeof decide>[2] = { scarcity: this.run.town.scarcityFor?.(h) ?? 0 };
    if (this.standing) {
      const sug = toSuggestion(this.standing.draft, this.standing.since);
      if (standingHeard(this.run.c, h, sug, offers, this.t)) opts.suggestion = sug;
    }
    const record = decide(ghost, offers, opts);
    record.id = `ahead-${act.decisionId}`;
    this.ahead = { forDecision: act.decisionId, record };
    // Seventh pass: with your word standing, weigh the same choice once more with no word, for "he'd now do unasked".
    const offered = new Set(offers.map((o) => o.id));
    noteUnasked(
      this.unasked,
      opts.suggestion ? decide(this.ghost(), offers, { scarcity: opts.scarcity ?? 0 }) : record,
      offered,
    );
    // Round 5: he is about to smoke and the doctor's walk is open. Pause once a day, before he lights it, with the
    // walk prefilled (prefill rule 0b), so the player can act on the doctor's "stop smoking".
    if (
      record.chosenAffordanceId === 'smoke' &&
      offers.some((o) => o.id === 'walk') &&
      flagOnce(this.beats, `smoke-walk:${dayOf(this.t)}`)
    ) {
      const text = 'He is about to light a cigarette. The doctor told him to walk, and to stop smoking.';
      this.push({ kind: 'feel', who: 'halil', text, decisionId: record.id, beat: 'craving' });
      this.beat('craving', text, this.t);
      return;
    }
    const rival = closeRival(record.considered);
    const top = record.considered.find((c) => !c.vetoed);
    // A choice between two ways of doing what he is doing now (praying at home or at the mosque while he prays) is
    // the ghost not yet counting the running act as done; it is not a choice he faces (game design review).
    const same = (c: { action: string }) => c.action === act.action;
    if (
      !rival ||
      !top ||
      top.affordanceId !== record.chosenAffordanceId ||
      same(top) ||
      same(rival) ||
      !takeCloseCall(this.beats, this.t)
    )
      return;
    const text = `He’s torn between ${top.label ?? top.action} and ${rival.label ?? rival.action}.`;
    this.push({ kind: 'note', who: 'halil', text, decisionId: record.id, beat: 'close-call' });
    // Seventh pass: torn pauses only when the composer has a word to offer; otherwise it is a log row (the reviewer
    // saw "He's torn" over a composer with nothing prefilled).
    // Torn between two ways to pray is logged, not paused: prayer stays a quiet part of his day (AGENTS.md).
    const prayer = (c: { action: string }) => c.action === 'pray';
    this.beat('close-call', text, this.t, {
      canPause: !(prayer(top) && prayer(rival)) && this.prefillNow() !== undefined,
    });
    this.closeCallAt = this.t;
  }

  /**
   * A close call the look-ahead could not see (the composer was not open before it, or the look-ahead weighed a
   * choice that was not the real one): the torn line goes into the log before the act it led to, never after.
   */
  private closeCallAfter(r: DecisionRecord): void {
    if (r.review || this.muted) return;
    if (this.closeCallAt !== undefined && r.at - this.closeCallAt <= COMPOSER_LEAD + 5) return;
    const rival = closeRival(r.considered);
    const top = r.considered.find((c) => !c.vetoed);
    if (!rival || !top || top.affordanceId !== r.chosenAffordanceId) return;
    // Two ways of going on with what he was already doing are not a choice he faces (see `lookAhead`).
    const k = this.cells.findIndex((c) => c.decisionId === r.id);
    const before = k > 0 ? this.cells[k - 1] : undefined;
    if (before && before.to >= r.at - 1 && before.action === top.action && before.action === rival.action)
      return;
    if (!takeCloseCall(this.beats, r.at)) return;
    const text = `He’s torn between ${top.label ?? top.action} and ${rival.label ?? rival.action}.`;
    this.push({ kind: 'note', who: 'halil', text, decisionId: r.id, beat: 'close-call' }, r.at);
    const note = this.log.pop();
    const i = this.log.findIndex((e) => e.kind === 'act' && e.decisionId === r.id);
    if (note) this.log.splice(i < 0 ? this.log.length : i, 0, note);
    this.closeCallAt = r.at;
    // After the act there is nothing left to say to it: logged, not paused.
    this.beat('close-call', text, r.at, { canPause: false });
  }

  private onBegin(e: SimEvent): void {
    const h = this.halil;
    const r = e.decisionId ? this.records.get(e.decisionId) : undefined;
    if (this.open) this.open.to = e.at;
    const chosen = r?.considered.find((c) => c.affordanceId === e.affordanceId);
    const label = chosen?.label ?? labelFor(e.affordanceId ?? '', this.offers(), e.action);
    const cell: Cell = {
      from: e.at,
      to: e.at + 1,
      action: e.action ?? '',
      affordanceId: e.affordanceId ?? '',
      label,
    };
    if (e.decisionId) cell.decisionId = e.decisionId;
    const credited = r?.suggestion;
    if (
      credited &&
      (credited.verdict === 'assented' || credited.verdict === 'complied') &&
      isVoiceId(credited.voiceId)
    )
      cell.promptedBy = credited.voiceId as VoiceId;
    const act = h.activity;
    if (act && act.decisionId === e.decisionId) cell.to = act.endsAt;
    this.cells.push(cell);
    if (this.cells.length > 3000) this.cells.splice(0, this.cells.length - 3000);
    this.open = cell;
    if (this.standing && e.at >= this.standing.since) {
      if (this.servesStanding(e.affordanceId, e.action)) this.standing.going = e.decisionId ?? 'begun';
      else if (this.standing.going) this.endStanding('expired');
    }
    if (this.quiet) return;
    // Eid (round 3, defect 5): the first cigarette is a beat of its own, after his first daylight meal in a month.
    if (
      e.action === 'smoke' &&
      this.phase === 'eid' &&
      townDay(dayOf(e.at)).kind !== 'ramadan' &&
      flagOnce(this.beats, `smoke-free:${dayOf(e.at)}`)
    ) {
      const ate = this.cells.some(
        (c) => c.action === 'eat' && dayOf(c.from) === dayOf(e.at) && c.from < e.at,
      );
      const text = ate
        ? 'His first meal in daylight in a month, and after it the cigarette. Nothing holds it back now; he lights one, as he has for forty years.'
        : 'Nothing holds the cigarette back now. He lights one, as he has for forty years.';
      this.push(
        e.decisionId
          ? { kind: 'feel', who: 'halil', text, decisionId: e.decisionId, beat: 'craving' }
          : { kind: 'feel', who: 'halil', text, beat: 'craving' },
        e.at,
      );
      this.keyBeat('craving', text, e.at);
    }
    const phrase =
      ACTION_LABEL[e.affordanceId ?? ''] && e.affordanceId?.includes(':')
        ? ACTION_LABEL[e.affordanceId ?? '']
        : label;
    // A bodily need on a bodily act says nothing the act does not ("I drink water, to drink"), and the need a meal
    // served most can be thirst ("I eat at home, to drink"; playtest round 3): drop it there.
    const said = act?.intention ?? r?.intention;
    const intention =
      said && BODILY_ACTS.has(e.action ?? '') && BODILY_INTENTIONS.test(said) ? undefined : said;
    const last = this.log.at(-1);
    const until = act && act.decisionId === e.decisionId ? clock(act.endsAt) : undefined;
    if (last && last.kind === 'act' && last.text.startsWith(`I ${phrase}`) && last.who === 'halil') {
      if (until) last.until = until;
      return;
    }
    const entry: Omit<LogEntry, 'id' | 'day' | 'minute' | 'clock'> = {
      kind: 'act',
      who: 'halil',
      text: `I ${phrase}${intention ? `, ${intention}` : ''}.`,
    };
    if (until) entry.until = until;
    if (e.decisionId) entry.decisionId = e.decisionId;
    this.push(entry, e.at);
  }

  private onDecision(r: DecisionRecord): void {
    const h = this.halil;
    const you = resolutionsOf(r).find((x) => x?.voiceId === 'you');
    if (you && this.standing && !this.muted) {
      const { fresh, changed, ends } = answer(this.standing, you);
      if ((fresh || changed) && !this.quiet) {
        const a = this.standing.lastAnswer;
        // A reply that does not follow your words directly names what it answers (playtest: "“Not while I'm keeping
        // my fast.”" under a prayer line, answering a "drink water" from an hour before).
        const last = this.log.at(-1);
        const direct = last?.kind === 'you' || (last?.kind === 'act' && this.log.at(-2)?.kind === 'you');
        const what =
          ACTION_LABEL[this.standing.draft.optionId] ?? this.standing.draft.optionId.replace(/[-:]/g, ' ');
        const asked = direct ? '' : `${capital(what)}? `;
        const text = `${asked}“${you.says}”${a?.counter && !you.says.includes(a.counter) ? ` — ${a.counter}` : ''}`;
        const entry: Omit<LogEntry, 'id' | 'day' | 'minute' | 'clock'> = {
          kind: 'answer',
          who: 'halil',
          text,
          tone: toneOf(you.verdict, you.kind),
          decisionId: r.id,
        };
        if (fresh) entry.beat = 'verdict';
        this.push(entry, r.at);
        // Seventh pass: a yes (or giving in under protest) is shown in the log without stopping the clock; a deferral
        // or a refusal pauses, because the player can answer it (urge, a reason, or let it go).
        const tone = toneOf(you.verdict, you.kind);
        if (fresh)
          this.beat('verdict', `He answered you: “${you.says}”`, r.at, {
            canPause: tone !== 'yes' && tone !== 'protest',
          });
      }
      if (ends) this.endStanding('refused');
      else if (
        (you.verdict === 'assented' || you.verdict === 'complied' || you.verdict === 'modified') &&
        h.activity &&
        this.servesStanding(h.activity.affordanceId, h.activity.action)
      )
        this.standing.going ??= h.activity.decisionId;
    }
    if (this.quiet) return;
    this.closeCallAfter(r);
    if (!r.review) {
      for (const c of r.considered) {
        const habit = c.terms.find((x) => x.source === 'habit')?.value ?? 0;
        if (!c.vetoed || habit < CRAVING_MIN) continue;
        if (
          !flagOnce(
            this.beats,
            `crave:${c.action}:${dayOf(r.at)}:${Math.floor((r.at % MINUTES_PER_DAY) / 180)}`,
          )
        )
          continue;
        const text = c.action === 'smoke' ? 'He wants a cigarette.' : `He wants to ${c.label ?? c.action}.`;
        this.push({ kind: 'feel', who: 'halil', text, decisionId: r.id, beat: 'craving' }, r.at);
        this.beat('craving', text, r.at);
      }
    }
    const chosen = r.considered.find((c) => c.affordanceId === r.chosenAffordanceId);
    for (const id of chosen?.recalled ?? []) {
      const ep = h.memory.episodes.find((e) => e.id === id);
      if (!ep || !isLossEpisode(h, ep)) continue;
      if (!flagOnce(this.beats, `recall:${id}:${Math.floor(r.at / 360)}`)) continue;
      const text = `He remembers: ${ep.summary}.`;
      this.push({ kind: 'recall', who: 'halil', text, decisionId: r.id, beat: 'recall' }, r.at);
      // A memory is a log row, never a pause: there is nothing to say to it (seventh pass).
      this.beat('recall', text, r.at, { canPause: false });
    }
  }

  private onAdvice(): void {
    const h = this.halil;
    const newEpisodes = h.memory.episodes.filter((e) => !this.episodesSeen.has(e.id));
    this.episodesSeen = new Set(h.memory.episodes.map((e) => e.id));
    const said = new Set<string>();
    for (const a of h.will.advice ?? []) {
      const key = adviceKey(a);
      if (this.adviceSeen.has(key)) continue;
      this.adviceSeen.add(key);
      if (a.sourceId === 'you' || this.quiet) continue;
      said.add(a.sourceId);
      const told = newEpisodes.find((e) => e.kind === 'told' && e.actorId === a.sourceId);
      const text =
        told && a.sourceId === 'doctor'
          ? `${capital(told.summary)}.`
          : a.sourceId === 'osman' && this.dateMissed(a.at)
            ? `${this.introduce('osman') ? 'Osman, his landlord,' : 'Osman'} at the door, his date gone by with nothing paid. He presses harder now: the rent.`
            : voiceLine(a.sourceId, a.affordanceId ?? a.action, this.introduce(a.sourceId));
      if (this.log.some((x) => x.minute === a.at && x.text === text)) continue;
      this.push({ kind: 'voice', who: voiceWho(a.sourceId), text, beat: 'voice' }, a.at);
      this.beat('voice', text, a.at);
    }
    if (this.adviceSeen.size > 500) this.adviceSeen = new Set([...this.adviceSeen].slice(-300));
    if (this.quiet) return;
    for (const e of newEpisodes) {
      if (e.kind !== 'told' || !e.actorId || e.actorId === 'halil' || said.has(e.actorId)) continue;
      const text = toldLine(e.summary, this.names());
      if (!text) continue;
      this.push({ kind: 'voice', who: voiceWho(e.actorId), text, beat: 'voice' }, e.at);
      // Talk with no advice in it (Hacer on Rıza) is a log row: nothing in it to answer (seventh pass).
      this.beat('voice', text, e.at, { canPause: false });
    }
  }

  /** Display names by person id, for told lines. */
  private names(): Record<string, string> {
    return Object.fromEntries(Object.values(this.run.ppl).map((p) => [p.id, p.name ?? nameOfVoice(p.id)]));
  }

  private onSleepAndExpiry(): void {
    const h = this.halil;
    if (h.body.asleep) {
      if (this.standing) this.endStanding('asleep');
    }
    if (this.standing && this.t >= this.standing.expires) this.endStanding('expired');
    this.onStandingAway();
  }

  /** A fast newly excused for illness: note the day, and on a played day say so (round 3, defect 3). */
  private onIllness(): void {
    const h = this.halil;
    for (const c of h.agenda.commitments) {
      if (c.kind !== 'abstain' || c.exempt?.reason !== 'illness') continue;
      const day = dayOf(c.until);
      if (this.illDays.includes(day)) continue;
      this.illDays.push(day);
      if (this.quiet || this.muted) continue;
      const sev = h.body.illnesses.find((x) => x.kind === 'hypertension')?.severity ?? 0;
      const doc = doctorLine(this.run.town);
      this.push(
        {
          kind: 'note',
          who: 'halil',
          text: `He feels unwell: his blood pressure is ${pressureWord(sev)}. He counts himself ill and does not fast today; he will owe the day after Eid.${doc ? ` ${doc}` : ' He has not seen the doctor about it.'}`,
        },
        this.t,
      );
    }
  }

  /**
   * Defect 4 (round 3): after a deferral the option could leave the offer set, and the next decision refused it as
   * "That isn't on offer here now". The framework now holds a standing suggestion back while its option is not
   * offered; say so once, plainly, and again when it is back.
   */
  private onStandingAway(): void {
    const s = this.standing;
    if (!s || this.quiet || this.muted || this.halil.body.asleep) return;
    const id = s.draft.optionId;
    // While he is doing it, the option's start window may close (the afternoon shift): that is not "can't".
    const act = this.halil.activity;
    const offered =
      this.offers().some((o) => o.id === id) || (!!act && this.servesStanding(act.affordanceId, act.action));
    const what = ACTION_LABEL[id] ?? id.replace(/[-:]/g, ' ');
    if (!offered && !s.away) {
      s.away = true;
      const why = WHY_AWAY[id];
      this.push({
        kind: 'note',
        who: 'you',
        text: `He can’t ${what} just now${why ? ` (${why})` : ''}. Your word waits; he will hear it if he can before ${clock(s.expires)}.`,
      });
    } else if (offered && s.away) {
      s.away = false;
      this.push({ kind: 'note', who: 'you', text: `He can ${what} now; he hears your word again.` });
    }
  }

  /** Osman's date (Ramadan 15, 20:00) has gone by with nothing paid (the town's own test for a late demand). */
  private dateMissed(at: number): boolean {
    return (
      at >= TOWN_DEFAULTS.rentPromiseDay * MINUTES_PER_DAY + 20 * 60 && this.run.town.state.rentPaid === 0
    );
  }

  private onDutyRisk(): void {
    if (this.quiet) return;
    const h = this.halil;
    const t = this.t;
    const act = h.activity;
    for (const c of h.agenda.commitments) {
      if (c.status !== 'pending' || (c.kind !== 'worship' && c.kind !== 'promise')) continue;
      // The framework's closing stretch: commitment pressure saturated (the last part of the window).
      const closing = pressureReachedAt(c, 1);
      if (closing === undefined || t < closing || t >= c.until) continue;
      if (act && (c.actions.includes(act.action) || act.affordance.fulfills?.includes(c.id))) continue;
      // Not for a sleeping man, and not hours early for a promise (its pressure saturates long before the day):
      // the flag is left unset so the beat can still fire once he is awake and the deadline is near.
      if (h.body.asleep && c.until - t > ASLEEP_RISK_LEAD) continue;
      if (c.kind === 'promise' && c.until - t > PROMISE_RISK_LEAD) continue;
      if (!flagOnce(this.beats, `duty:${c.id}:${c.until}`)) continue;
      const label = commitmentLabel(c.label, c.actions[0], c.kind);
      const money = Math.round(this.run.town.state.money.halil ?? 0);
      const want = TOWN_DEFAULTS.rent - Math.round(this.run.town.state.rentPaid);
      // His own deadline, not a ruling: the window's end is an engineering assumption (see the model notes).
      const text =
        c.id === 'rent'
          ? `Osman’s date is tonight: ${want} by ${clock(c.until)}. He has ${money}${money >= want ? ', enough to pay' : `, ${want - money} short`}${h.body.asleep ? '; he is asleep' : ''}.`
          : `The time he gives himself for ${label} is nearly up (${clock(c.until)}), and he hasn’t yet${h.body.asleep ? '; he is asleep' : ''}.`;
      this.push({ kind: 'note', who: 'halil', text, beat: 'duty-risk' }, t);
      this.beat('duty-risk', text, t);
    }
    // The date gone by with nothing paid: said once, at 20:00, in the log and on the day card (seventh pass: the
    // missed date has to cost something visible; Osman now presses harder, and Halil carries his broken word).
    const deadline = TOWN_DEFAULTS.rentPromiseDay * MINUTES_PER_DAY + 20 * 60;
    if (this.dateMissed(t) && t < deadline + 6 * 60 && flagOnce(this.beats, 'date-missed')) {
      const money = Math.round(this.run.town.state.money.halil ?? 0);
      const text = `Osman’s date has gone by with nothing paid; he had ${money} of the ${TOWN_DEFAULTS.rent}. From now Osman presses harder when he comes.`;
      this.push({ kind: 'note', who: 'halil', text, beat: 'duty-risk' }, deadline);
      this.beat('duty-risk', text, deadline, { canPause: false });
    }
    const fast = h.agenda.commitments.find(
      (c) => c.kind === 'abstain' && c.status === 'pending' && c.from <= t && c.until > t,
    );
    const fasting = fast !== undefined;
    if (
      fasting &&
      !h.body.asleep &&
      readBody(h).perceived.thirst >= THIRST_RISK &&
      flagOnce(this.beats, `thirst:${dayOf(t)}`)
    ) {
      const left = (fast?.until ?? t) - t;
      const text = `He is very thirsty, and the fast runs until ${clock(fast?.until ?? t)}${left >= 120 ? `, ${Math.floor(left / 60)} hours away` : ''}.`;
      this.push({ kind: 'feel', who: 'halil', text, beat: 'duty-risk' }, t);
      this.beat('duty-risk', text, t);
    }
  }

  /** Eid's own moments (the first cigarette, the first call) pause even inside another beat's cooldown. */
  private keyBeat(kind: BeatKind, text: string, at: number): void {
    if (this.autoPause) this.beats.lastPauseAt = Math.min(this.beats.lastPauseAt, at - BEAT_COOLDOWN);
    this.beat(kind, text, at);
  }

  private beat(
    kind: BeatKind,
    text: string,
    at: number,
    o: { canPause?: boolean; actionable?: boolean } = {},
  ): void {
    // A clock beat that comes with a word to say (a prefill) keeps its pause however often it has paused.
    const actionable = o.actionable ?? (o.canPause !== false && this.prefillNow() !== undefined);
    if (fire(this.beats, kind, at, text, this.autoPause, { ...o, actionable }) && !this.paused) {
      this.paused = true;
      this.pauseBeat = { kind, text };
    }
  }

  /** He is doing what the standing suggestion asked, or the same action (pray at home for the mosque). */
  private servesStanding(affordanceId: string | undefined, action: string | undefined): boolean {
    const s = this.standing;
    if (!s || !affordanceId) return false;
    if (affordanceId === s.draft.optionId) return true;
    return this.suggestedAction !== undefined && action === this.suggestedAction;
  }

  private endStanding(_why: 'begun' | 'refused' | 'expired' | 'asleep' | 'withdrawn' | 'replaced'): void {
    const s = this.standing;
    if (!s) return;
    this.standing = undefined;
    if (this.quiet || _why === 'begun' || _why === 'refused' || _why === 'replaced') return;
    const text =
      _why === 'withdrawn'
        ? 'You let it go.'
        : _why === 'asleep'
          ? 'He sleeps; your words fade.'
          : 'Your words fade.';
    this.push({ kind: 'note', who: 'you', text });
  }

  private push(e: Omit<LogEntry, 'id' | 'day' | 'minute' | 'clock'>, at: number = this.t): void {
    this.logSeq += 1;
    const entry = { id: `l${this.logSeq}`, day: dayOf(at), minute: at, clock: clock(at), ...e };
    // In time order: a line dated earlier than the last (Osman's knock heard on waking) goes in its place.
    let k = this.log.length;
    while (k > 0 && (this.log[k - 1]?.minute ?? 0) > at) k -= 1;
    this.log.splice(k, 0, entry);
    if (this.log.length > LOG_CAP * 4) this.log.splice(0, this.log.length - LOG_CAP * 2);
  }

  private resetTracking(): void {
    const h = this.halil;
    this.traceIds = new Set(h.trace.map((r) => r.id));
    this.episodesSeen = new Set(h.memory.episodes.map((e) => e.id));
    this.adviceSeen = new Set((h.will.advice ?? []).map(adviceKey));
    this.standing = undefined;
    this.open = undefined;
    this.ahead = undefined;
  }

  // --- days, Eid, the report --------------------------------------------------------------------

  private closeDay(): void {
    if (this.open) {
      this.open.to = Math.max(this.open.to, this.t);
      this.open = undefined;
    }
    if (this.standing) {
      this.standing = undefined;
    }
    if (this.phase === 'eid') {
      this.finishEid();
      return;
    }
    const h = this.halil;
    const d = this.day;
    if (d === PLAYED_DAYS[PLAYED_DAYS.length - 1] && !this.free) this.endRamadanTrust = trustOf(h);
    const acc = h.chronicleDay;
    const rec: DayRecord | undefined =
      acc && acc.day === d ? consolidateDay(h, d, acc) : h.chronicle?.find((r) => r.day === d);
    const lines = rec ? narrateChronicle([rec], { person: h, maxLines: 6 }) : [];
    const you = voiceOf(h, 'you');
    const dayStart = d * MINUTES_PER_DAY;
    // Only changes that happened today: a merged entry carries its span (`from`), so an entry that began on an
    // earlier day is not stamped on today's last act (playtest: "+0.14 went well" on a nap).
    const events = (you?.history ?? [])
      .filter((e) => (e.from ?? e.at) >= dayStart && e.at <= this.t && Math.abs(e.delta) >= 0.005)
      .map(
        (e) =>
          `${e.delta >= 0 ? '+' : '−'}${Math.abs(e.delta).toFixed(2)} ${ACTION_LABEL[e.action ?? ''] ?? e.action ?? 'what you said'}: ${TRUST_REASON[e.reason] ?? e.reason.replace(/-/g, ' ')}${(e.count ?? 1) > 1 ? ` (${e.count} times)` : ''}`,
      );
    let next: BetweenView['next'];
    if (this.free) next = { label: dayLabel(d + 1), day: d + 1, skipped: 0 };
    else {
      const i = PLAYED_DAYS.indexOf(d as (typeof PLAYED_DAYS)[number]);
      const nd = PLAYED_DAYS[i + 1];
      next = nd === undefined ? null : { label: dayLabel(nd), day: nd, skipped: nd - d - 1 };
    }
    const skipped = next?.skipped ?? 0;
    const short = moneyShort(this.run.town, this.t);
    const cost = `He’ll hear each word for ${skipped} days, taking turns with the other, whenever he could act on it. Once he has done it for its time (a prayer at the mosque for that prayer), the word rests until the next. A mention he turns down costs nothing. An urge he keeps turning down wears his trust in you down, about once a day, and the same word going well again earns less each time.`;
    if (d === TOWN_DEFAULTS.rentPromiseDay && this.dateMissed(this.t))
      lines.unshift(
        `He missed Osman’s date: ${TOWN_DEFAULTS.rent} by 20:00, and he paid nothing. Osman presses harder from now.`,
      );
    this.between = {
      closed: `${dayLabel(d)} is over.`,
      lines,
      yours: this.yourDay(d),
      strip: stripFor(d, this.cells),
      ends: this.ends(),
      unasked: this.unaskedNow(),
      trust: { from: round2(this.dayTrustStart), to: round2(you?.trust ?? 0.5), events },
      next,
      choices:
        skipped > 0
          ? (Object.keys(WHISPERS) as StandingWhisper['choiceId'][])
              // The doctor's walk is a choice once she has told him to walk (round 5).
              .filter((id) => id !== 'walk' || this.run.town.state.doctorSaid?.halil !== undefined)
              .map((id) => {
                const choice: BetweenView['choices'][number] = { id, label: WHISPERS[id].label, cost };
                if (id === 'extra' && short)
                  choice.hint = `Mornings alone get him to about ${short.projected} by ${short.by}; ${short.wants}. He doesn’t count on the shift’s pay, so a bare mention won’t move him. Remind him of his word (“it’s your duty”), or urge it.`;
                if (id === 'walk')
                  choice.hint = `The doctor told him to walk and stop smoking. A walk where the cigarette would come (after iftar) wears a forty-year habit down a little; he smoked ${smokesOn(this.cells, d)} on ${dayLabel(d)}.`;
                return choice;
              })
          : [],
    };
    this.phase = 'between';
    this.paused = true;
    this.pauseBeat = { kind: 'day-end', text: this.between.closed };
    fire(this.beats, 'day-end', this.t, this.between.closed, this.autoPause);
    this.outbox.push({ type: 'between', view: this.between });
  }

  /** What your words did on a played day, plainly: answers by kind and what came of them. */
  private yourDay(d: number): string[] {
    const said = this.log.filter((e) => e.day === d && e.kind === 'you').length;
    // His ends done today without your word (game design review: say "He called Selin without being asked").
    const unasked = this.cells.filter(
      (c) =>
        happened(c) &&
        dayOf(c.from) === d &&
        c.promptedBy !== 'you' &&
        UNASKED_LINE[c.affordanceId] !== undefined,
    );
    const own = [...new Set(unasked.map((c) => UNASKED_LINE[c.affordanceId] as string))];
    if (said === 0) return ['You said nothing today.', ...own];
    // One answer per word: the last thing he said to it (game design review: 8 answers to 4 words read wrong).
    const last: (string | undefined)[] = [];
    for (const e of this.log) {
      if (e.day !== d) continue;
      if (e.kind === 'you') last.push(undefined);
      else if (e.kind === 'answer' && last.length > 0) last[last.length - 1] = e.tone;
    }
    const n = (...t: string[]) => last.filter((x) => x !== undefined && t.includes(x)).length;
    const parts = [
      n('yes') ? `said yes to ${n('yes') === said ? (said === 1 ? 'it' : 'all of them') : n('yes')}` : '',
      n('protest') ? `gave in under protest to ${n('protest')}` : '',
      n('notNow') ? `put you off or did something like it on ${n('notNow')}` : '',
      n('willNot', 'cannot') ? `refused ${n('willNot', 'cannot')}` : '',
    ].filter(Boolean);
    const out = [
      `You spoke ${times(said)}.${parts.length ? ` In the end he ${listed(parts)}.` : ' He gave no answer.'}`,
    ];
    // Saying yes is not going: an act he set out on and stopped is named as that, not as done (game design review).
    const dayCells = this.cells.filter((c) => dayOf(c.from) === d && c.promptedBy === 'you');
    const did = [...new Set(dayCells.filter(happened).map((c) => c.label))];
    const stopped = [...new Set(dayCells.filter((c) => !happened(c)).map((c) => c.label))].filter(
      (l) => !did.includes(l),
    );
    if (did.length > 0) out.push(`Done on your word: ${did.join('; ')}.`);
    if (stopped.length > 0) out.push(`Begun on your word and stopped part-way: ${stopped.join('; ')}.`);
    out.push(...own);
    return out;
  }

  private startEid(): void {
    const target = TOWN_EID_DAY * MINUTES_PER_DAY;
    this.quiet = true;
    try {
      this.stepTo(target);
    } finally {
      this.quiet = false;
    }
    const lastCall = [...this.cells].reverse().find((c) => c.affordanceId === 'call:selin');
    this.eidMorning = {
      run: cloneRun(this.run),
      t: this.t,
      ...(this.halilCalledAt !== undefined ? { halilCalledAt: this.halilCalledAt } : {}),
      ...(lastCall ? { calledUnasked: lastCall.promptedBy !== 'you' } : {}),
      unasked: structuredClone(this.unasked),
    };
    this.muted = true;
    this.standing = undefined;
    this.between = undefined;
    this.day = TOWN_EID_DAY;
    this.dayEndAt = target + DAY_END;
    this.phase = 'eid';
    this.paused = true;
    this.dayTrustStart = voiceOf(this.halil, 'you')?.trust ?? 0.5;
    const text = 'Eid al-Fitr. The fast is over. Today you say nothing.';
    this.intro = { label: 'Eid al-Fitr', lines: ['The fast is over.', 'Today you say nothing. Watch.'] };
    this.pauseBeat = { kind: 'eid', text };
    fire(this.beats, 'eid', target, text, this.autoPause);
    this.push({ kind: 'note', who: 'halil', text, beat: 'eid' }, target);
  }

  private finishEid(): void {
    this.eidNight = { run: cloneRun(this.run), t: this.t };
    const done = this.run.town.state.completed;
    const callsAtEid = { his: done.halil?.call ?? 0, hers: done.selin?.call ?? 0 };
    const callTimes = this.run.town.state.halilCallTimes ?? [];
    const usualCallMinute =
      callTimes.length > 0
        ? Math.round(callTimes.reduce((a, b) => a + b, 0) / callTimes.length / 5) * 5
        : undefined;
    const epi = cloneRun(this.run);
    const h = epi.ppl.halil;
    // runSilent in half-day chunks so every muted decision can be audited (the trace keeps only 32).
    let seen = new Set(h.trace.map((r) => r.id));
    const harvest = () => {
      for (const r of h.trace)
        if (!seen.has(r.id))
          this.audit.push({
            at: r.at,
            voices: resolutionsOf(r)
              .filter((x): x is NonNullable<typeof x> => !!x)
              .map((x) => x.voiceId),
          });
      seen = new Set(h.trace.map((r) => r.id));
    };
    const end = (TOWN_EID_DAY + EPILOGUE_DAYS + 1) * MINUTES_PER_DAY;
    // Payments in the week after Eid, dated to the half-day chunk they fell in (the epilogue has no event log).
    const epiPays: { at: number; amount: number }[] = [];
    let epiPaid = epi.town.state.rentPaid;
    for (let i = 0; i < 2 * EPILOGUE_DAYS; i++) {
      runSilent(epi.c, epi.town, 0.5, { mutedVoiceId: 'you' });
      harvest();
      if (epi.town.state.rentPaid > epiPaid) {
        epiPays.push({ at: h.now, amount: epi.town.state.rentPaid - epiPaid });
        epiPaid = epi.town.state.rentPaid;
      }
    }
    // Close day 37 (runSilent counts whole days from 23:30 on Eid).
    if (Math.min(...epi.c.people.map((p) => p.now)) < end) {
      stepCommunity(epi.c, epi.town, end, {});
      harvest();
    }
    const chronicle = h.chronicle ?? [];
    this.report = buildReport({
      withYou: chronicleBetween(this.halil.chronicle ?? [], 1, TOWN_EID_DAY - 1),
      withoutYou: chronicleBetween(chronicle, TOWN_EID_DAY, TOWN_EID_DAY + EPILOGUE_DAYS),
      after: epi,
      endRamadanTrust: Object.keys(this.endRamadanTrust).length ? this.endRamadanTrust : trustOf(this.halil),
      eidStrip: stripFor(TOWN_EID_DAY, this.cells),
      eidLines: this.log
        .filter(
          (e) =>
            e.day === TOWN_EID_DAY &&
            (e.kind === 'act' || e.kind === 'voice' || e.kind === 'recall' || e.kind === 'feel'),
        )
        .map((e) => `${e.clock} ${e.text}`),
      rows: [...PLAYED_DAYS.map((d) => stripFor(d, this.cells)), stripFor(TOWN_EID_DAY, this.cells)],
      trustStart: this.trustStart,
      cells: this.cells.filter(happened),
      insisted: this.insisted,
      trustEid: voiceOf(this.halil, 'you')?.trust ?? 0.5,
      said: this.said,
      records: this.records,
      ...(this.halilCalledAt !== undefined ? { halilCalledAt: this.halilCalledAt } : {}),
      ...(this.selinEidCallAt !== undefined ? { selinEidCallAt: this.selinEidCallAt } : {}),
      ...(usualCallMinute !== undefined ? { usualCallMinute } : {}),
      callsAtEid,
      weighs: weighsView(this.halil, this.weighsStart),
      illDays: this.illDays.filter((d) => d < TOWN_EID_DAY),
      ...(doctorLine(this.run.town) ? { doctor: doctorLine(this.run.town) } : {}),
      ...(this.eidMorning ? { atEid: this.eidMorning } : {}),
      payments: [...this.payments, ...epiPays],
    });
    if (this.eidMorning?.unasked)
      this.report.unasked = this.unaskedNow(
        this.eidMorning.unasked,
        this.eidMorning.run.town,
        this.eidMorning.t - 1,
      );
    this.phase = 'report';
    this.paused = true;
    this.outbox.push({ type: 'report', view: this.report });
  }

  /** The "he'd now do unasked" strip as of now (or of `s`, read against `town`). */
  unaskedNow(s: UnaskedState = this.unasked, town: Town = this.run.town, t: number = this.t) {
    return unaskedView(s, dayOf(t), {
      walk: town.state.doctorSaid?.halil !== undefined,
      rent: Math.round(town.state.rentOwed) > 0,
    });
  }

  ends() {
    const lastCall = [...this.cells].reverse().find((c) => c.affordanceId === 'call:selin');
    return endsView({
      h: this.halil,
      town: this.run.town,
      t: this.t,
      trustStart: this.trustStart,
      ...(this.halilCalledAt !== undefined ? { halilCalledAt: this.halilCalledAt } : {}),
      ...(lastCall ? { calledUnasked: lastCall.promptedBy !== 'you' } : {}),
    });
  }

  // --- the frame --------------------------------------------------------------------------------

  /** The choice the composer shows: the offers, the decision it reads (the look-ahead when open), and his leaning. */
  private choice(composer: Frame['composer'] = this.composer()) {
    const h = this.halil;
    const liveish = this.phase === 'day' || this.phase === 'eid' || this.phase === 'free';
    const offers = liveish ? this.offers() : [];
    const act = h.activity;
    const last =
      composer.open && act && this.ahead?.forDecision === act.decisionId ? this.ahead.record : h.trace.at(-1);
    const considered = last ? last.considered.filter((c) => offers.some((o) => o.id === c.affordanceId)) : [];
    const lean =
      considered.find((c) => c.affordanceId === last?.chosenAffordanceId) ??
      considered.find((c) => !c.vetoed);
    return { offers, last, considered, lean };
  }

  /** The composer's prefill now, if it is open and has one (also tells a beat whether it has a word to offer). */
  prefillNow(composer: Frame['composer'] = this.composer()): Prefill | undefined {
    if (!composer.open || this.muted) return undefined;
    const h = this.halil;
    const t = this.t;
    const { offers, considered, lean } = this.choice(composer);
    const act = h.activity;
    // At the wake he is still asleep for a minute: the prefill is judged on the waking ghost, like `predict`.
    const waking = this.waking();
    return prefillFor({
      h: waking ? this.ghost() : h,
      town: this.run.town,
      t,
      offers,
      considered,
      ...(lean ? { leaningId: lean.affordanceId } : {}),
      ...(act && !waking ? { currentId: act.affordanceId } : {}),
      ...(this.halilCalledAt !== undefined ? { halilCalledAt: this.halilCalledAt } : {}),
      ...(this.shiftBeatAt !== undefined && t - this.shiftBeatAt <= 30 ? { prefer: 'work-extra' } : {}),
      tutorial:
        this.day === 1 &&
        !this.free &&
        !this.firstSuggestion &&
        t % MINUTES_PER_DAY < townCalendar(dayOf(t)).fajr,
    });
  }

  frame(): Frame {
    const h = this.halil;
    const t = this.t;
    const day = dayOf(t);
    const cal = townCalendar(day);
    const composer = this.composer();
    const { offers, last, considered, lean } = this.choice(composer);
    const act = h.activity;
    const options = considered.slice(0, 6).map((c, i) => ({
      id: c.affordanceId,
      label: c.label ?? labelFor(c.affordanceId, offers),
      rank: i + 1,
      leaning: false,
    }));
    for (const o of options) o.leaning = o.id === lean?.affordanceId;
    const f: Frame = {
      phase: this.phase,
      day: this.day,
      dayLabel: dayLabel(this.day),
      minute: t,
      clock: clock(t),
      sky: {
        hour: Math.round(((t % MINUTES_PER_DAY) / 60) * 100) / 100,
        prayers: [
          { name: 'Fajr', minute: cal.fajr },
          { name: 'Dhuhr', minute: cal.dhuhr },
          { name: 'Asr', minute: cal.asr },
          { name: 'Maghrib', minute: cal.maghrib },
          { name: 'Isha', minute: cal.isha },
        ],
      },
      paused: this.paused,
      pace: this.pace,
      autoPause: this.autoPause,
      halil: halilView(h, this.run.town, t, this.weighsStart),
      composer,
      options,
      log: this.log.slice(-LOG_CAP),
      ends: this.ends(),
      unasked: this.unaskedNow(),
      voices: voicesView(h, t),
      muted: this.muted || this.phase === 'eid',
    };
    if (townDay(day).kind === 'ramadan') f.sky.fast = { from: cal.fajr, until: cal.maghrib };
    if (!this.paused && this.live() && this.fastForward()) {
      f.fastForward = h.body.asleep
        ? `he sleeps until ${act ? clock(act.endsAt) : 'he wakes'}`
        : `${act?.affordance.label ?? 'he is busy'} until ${act ? clock(act.endsAt) : ''}`;
    }
    if (this.pauseBeat) f.pauseBeat = this.pauseBeat;
    if (this.intro) f.intro = this.intro;
    if (lean && last) f.leaning = { optionId: lean.affordanceId, why: last.intention };
    if (composer.open) {
      const p = this.prefillNow(composer);
      if (p) {
        f.prefill = p;
        // The prefill is judged over every offer; the options are his top six. A prefill he ranks lower (or did
        // not consider at the last decision) must still be on the list, or Say it stays disabled.
        if (!options.some((o) => o.id === p.optionId)) {
          const c = considered.find((x) => x.affordanceId === p.optionId);
          const label = c?.label ?? labelFor(p.optionId, offers);
          if (options.length >= 6) options.pop();
          options.push({ id: p.optionId, label, rank: options.length + 1, leaning: false });
        }
      }
    }
    if (this.standing) f.standing = standingView(this.standing);
    return f;
  }
}

// --- helpers -------------------------------------------------------------------------------------

/** His ends, as the day card says them when he did one without your word. */
const UNASKED_LINE: Record<string, string> = {
  'call:selin': 'He called Selin without being asked.',
  'see-doctor': 'He went to the clinic without being asked.',
  'pay-rent': 'He paid Osman without being asked.',
  'work-extra': 'He took the afternoon shift without being asked.',
};
const adviceKey = (a: { sourceId: string; action: string; at: number }) =>
  `${a.sourceId}:${a.action}:${a.at}`;
const voiceWho = (id: string): LogEntry['who'] => (isVoiceId(id) ? (id as VoiceId) : 'halil');
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Cigarettes he smoked on a day, from the activity cells (played and skipped days). */
export function smokesOn(cells: readonly Cell[], day: number): string {
  const n = cells.filter((c) => c.action === 'smoke' && dayOf(c.from) === day).length;
  return n === 0 ? 'none' : n === 1 ? 'one cigarette' : `${n} cigarettes`;
}
const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
/** "a", "a and b", "a, b and c". */
const listed = (xs: readonly string[]) =>
  xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;
const round2 = (x: number) => Math.round(x * 100) / 100;

/** Whisper labels by ledger key, so the report names a thing the same way however it was said. */
const WHISPER_LABEL: Record<string, string> = Object.fromEntries(
  Object.values(WHISPERS).map((w) => [ledgerKey(w.optionId), w.label]),
);

const VOICE_CHANNEL: Record<string, string> = {
  selin: 'Selin on the phone',
  riza: 'Rıza over tea',
  hacer: 'Hacer at the door',
  osman: 'Osman at the door',
  doctor: 'The doctor',
};
/** The first time each voice is heard, the log says who they are to him (playtest: "Selin isn't mentioned as Halil's daughter"). */
const VOICE_CHANNEL_FIRST: Record<string, string> = {
  selin: 'Selin, his daughter, on the phone',
  riza: 'Rıza, his friend, over tea',
  hacer: 'Hacer, his neighbour, at the door',
  osman: 'Osman, his landlord, at the door',
  doctor: 'The doctor at the clinic',
};
function voiceLine(source: string, target: string, first = false): string {
  const who =
    (first ? VOICE_CHANNEL_FIRST[source] : undefined) ?? VOICE_CHANNEL[source] ?? nameOfVoice(source);
  const what = ACTION_LABEL[target] ?? target.replace(/[-:]/g, ' ');
  return `${who}: ${what}.`;
}

function trustOf(h: Person): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of h.will.voices) out[v.voiceId] = v.trust;
  return out;
}
