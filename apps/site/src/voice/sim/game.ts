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
  stepCommunity,
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
  type ReportView,
  SHIPPED_SEED,
  STRENGTH_VALUE,
  type StandingWhisper,
  type Telegraph,
  type VoiceId,
  type WhyView,
  type WorkerReply,
} from '../protocol.ts';
import { type BeatState, createBeats, fire, flagOnce, takeCloseCall } from './beats.ts';
import { closeRival, prefillFor } from './prefill.ts';
import { buildReport } from './report.ts';
import { answer, createStanding, type Standing, standingView, toSuggestion } from './standing.ts';
import {
  ACTION_LABEL,
  type Cell,
  clock,
  commitmentLabel,
  dayLabel,
  endsView,
  halilView,
  isVoiceId,
  labelFor,
  nameOfVoice,
  stripFor,
  toldLine,
  toneOf,
  voicesView,
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
/** Length of one whisper's turn during a skip (see the deviation note above). */
const SKIP_CHUNK = 60;

export const WHISPERS: Record<StandingWhisper['choiceId'], { optionId: string; label: string }> = {
  work: { optionId: 'work-repair', label: 'work in the morning' },
  doctor: { optionId: 'see-doctor', label: 'see the doctor' },
  selin: { optionId: 'call:selin', label: 'call Selin' },
  rent: { optionId: 'pay-rent', label: 'pay Osman when you can' },
  mosque: { optionId: 'pray', label: 'pray at the mosque' },
  rest: { optionId: 'rest', label: 'rest in the afternoon' },
};

const CRAVING_MIN = 0.3;
const THIRST_RISK = 0.7;

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
  open: Cell | undefined;
  records = new Map<string, DecisionRecord>();
  audit: MutedAudit[] = [];
  trustStart: number;
  dayTrustStart: number;
  endRamadanTrust: Record<string, number> = {};
  eidNight: { run: Run; t: number } | undefined;
  firstSuggestion = false;
  suggestedAction: string | undefined;
  /** His weighing of the next choice, read once when the composer opens before it (see `lookAhead`). */
  ahead: { forDecision: string; record: DecisionRecord } | undefined;
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
    // What reached him in the unseen evening becomes the first lines of the log.
    for (const a of [...(h.will.advice ?? [])].sort((x, y) => x.at - y.at)) {
      this.adviceSeen.add(adviceKey(a));
      if (a.sourceId === 'you') continue;
      this.push(
        {
          kind: 'voice',
          who: voiceWho(a.sourceId),
          text: `Last night — ${voiceLine(a.sourceId, a.affordanceId ?? a.action)}`,
        },
        a.at,
      );
    }
  }

  get halil(): Person {
    return this.run.ppl.halil;
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
    const h = this.halil;
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
    this.push({ kind: 'you', who: 'you', text: `You: ${this.standing.label}` });
    interruptPerson(this.run.c, this.halil, this.t, 'voice');
    this.pauseBeat = undefined;
    this.paused = false;
    this.advanceTo(this.t + 1);
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
        const s = this.standing && !this.muted ? { halil: toSuggestion(this.standing.draft) } : undefined;
        this.stepTo(Math.min(this.dayEndAt, this.t + 30), s);
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
    const trustBefore = voiceOf(this.halil, 'you')?.trust ?? 0.5;
    const target = next.day * MINUTES_PER_DAY;
    const list = whispers.slice(0, 2).map((w) => {
      const s: Suggestion = {
        voiceId: 'you',
        affordanceId: WHISPERS[w.choiceId].optionId,
        strength: STRENGTH_VALUE[w.strength],
      };
      if (w.appeal) s.appeal = w.appeal;
      return s;
    });
    this.quiet = true;
    try {
      let k = 0;
      while (this.t < target) {
        const until = Math.min(target, this.t + SKIP_CHUNK);
        let sug: Suggestion | undefined;
        if (list.length > 0) {
          const offers = this.offers();
          const order = list.map((_, i) => list[(k + i) % list.length] as Suggestion);
          sug = order.find((s) => offers.some((o) => o.id === s.affordanceId)) ?? order[0];
        }
        this.stepTo(until, sug ? { halil: sug } : undefined);
        k += 1;
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
      const h = this.halil;
      lines.push(
        ...narrateChronicle(chronicleBetween(h.chronicle ?? [], fromDay + 1, next.day - 1), {
          person: h,
          maxLines: 6,
        }),
      );
      const after = voiceOf(h, 'you')?.trust ?? 0.5;
      lines.push(`His trust in you went ${trustBefore.toFixed(2)} → ${after.toFixed(2)}.`);
    } else lines.push(`${dayLabel(next.day)} begins.`);
    this.intro = { label: next.skipped > 0 ? `${next.skipped} days passed` : dayLabel(next.day), lines };
  }

  keepListening(): void {
    if (this.phase !== 'report' || !this.eidNight) return;
    this.run = cloneRun(this.eidNight.run);
    this.t = this.eidNight.t;
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

  /** Fast-forward applies while he sleeps or has more than `COMPOSER_LEAD` minutes of an activity left. */
  fastForward(): boolean {
    const h = this.halil;
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
        next = Math.max(this.t + 1, Math.min(target, to));
      }
      next = Math.min(next, this.dayEndAt);
      if (next <= this.t) break;
      this.stepTo(
        next,
        this.standing && !this.muted ? { halil: toSuggestion(this.standing.draft) } : undefined,
      );
      if (this.t >= this.dayEndAt) {
        this.closeDay();
        break;
      }
    }
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
    for (const r of fresh) {
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
    for (const r of fresh) this.onDecision(r);
    this.onAdvice();
    this.onSleepAndExpiry();
    this.onDutyRisk();
    this.lookAhead();
  }

  private onFinish(e: SimEvent): void {
    // The wake line, from the sleep's own finish event, so it carries the minute he woke and is logged before
    // the first thing he does awake (playtest: "He wakes at 15:08" after a 14:53 prayer).
    if (e.action === 'sleep' && !this.quiet && !this.resleptAt.has(e.at)) {
      const day = dayOf(e.at);
      const cal = townCalendar(day);
      const m = e.at % MINUTES_PER_DAY;
      const text =
        townDay(day).kind === 'ramadan' && m >= cal.fajr - 90 && m < cal.fajr
          ? 'The drummer comes round for suhoor. He wakes.'
          : `He wakes at ${clock(e.at)}.`;
      this.push({ kind: 'note', who: 'halil', text, beat: 'wake' }, e.at);
      this.beat('wake', text, e.at);
    }
    if (this.open && this.open.affordanceId === e.affordanceId) {
      this.open.to = e.at;
      this.open = undefined;
    }
    // An act he stopped part-way: its log line says so, so a later line does not read as a reversal.
    if (e.status === 'interrupted' && e.decisionId && !this.quiet) {
      const entry = [...this.log].reverse().find((x) => x.kind === 'act' && x.decisionId === e.decisionId);
      if (entry && !entry.text.endsWith('(stopped)')) {
        entry.until = clock(e.at);
        entry.text = `${entry.text.replace(/\.$/, '')} (stopped).`;
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
    if (!act || h.body.asleep || act.endsAt - this.t > COMPOSER_LEAD) return;
    if (this.ahead?.forDecision === act.decisionId) return;
    const ghost = structuredClone(h);
    ghost.activity = null;
    const offers = this.offers();
    const opts: Parameters<typeof decide>[2] = { scarcity: this.run.town.scarcityFor?.(h) ?? 0 };
    if (this.standing) opts.suggestion = toSuggestion(this.standing.draft);
    const record = decide(ghost, offers, opts);
    record.id = `ahead-${act.decisionId}`;
    this.ahead = { forDecision: act.decisionId, record };
    const rival = closeRival(record.considered);
    const top = record.considered.find((c) => !c.vetoed);
    if (
      !rival ||
      !top ||
      top.affordanceId !== record.chosenAffordanceId ||
      !takeCloseCall(this.beats, this.t)
    )
      return;
    const text = `He’s torn between ${top.label ?? top.action} and ${rival.label ?? rival.action}.`;
    this.push({ kind: 'note', who: 'halil', text, decisionId: record.id, beat: 'close-call' });
    this.beat('close-call', text, this.t);
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
    const phrase =
      ACTION_LABEL[e.affordanceId ?? ''] && e.affordanceId?.includes(':')
        ? ACTION_LABEL[e.affordanceId ?? '']
        : label;
    const intention = act?.intention ?? r?.intention;
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
      const { fresh, ends } = answer(this.standing, you);
      if (fresh && !this.quiet) {
        const a = this.standing.lastAnswer;
        const text = `“${you.says}”${a?.counter && !you.says.includes(a.counter) ? ` — ${a.counter}` : ''}`;
        this.push(
          {
            kind: 'answer',
            who: 'halil',
            text,
            tone: toneOf(you.verdict, you.kind),
            decisionId: r.id,
            beat: 'verdict',
          },
          r.at,
        );
        this.beat('verdict', `He answered you: “${you.says}”`, r.at);
      }
      if (ends) this.endStanding('refused');
      else if (
        you.verdict === 'assented' &&
        h.activity &&
        this.servesStanding(h.activity.affordanceId, h.activity.action)
      )
        this.standing.going ??= h.activity.decisionId;
    }
    if (this.quiet) return;
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
      this.beat('recall', text, r.at);
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
          : voiceLine(a.sourceId, a.affordanceId ?? a.action);
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
      this.beat('voice', text, e.at);
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
      if (!flagOnce(this.beats, `duty:${c.id}:${c.until}`)) continue;
      const label = commitmentLabel(c.label, c.actions[0], c.kind);
      // His own deadline, not a ruling: the window's end is an engineering assumption (see the model notes).
      const text = `The time he gives himself for ${label} is nearly up (${clock(c.until)}), and he hasn’t yet${h.body.asleep ? '; he is asleep' : ''}.`;
      this.push({ kind: 'note', who: 'halil', text, beat: 'duty-risk' }, t);
      this.beat('duty-risk', text, t);
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

  private beat(kind: BeatKind, text: string, at: number): void {
    if (fire(this.beats, kind, at, text, this.autoPause) && !this.paused) {
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
    this.log.push({ id: `l${this.logSeq}`, day: dayOf(at), minute: at, clock: clock(at), ...e });
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
    const events = (you?.history ?? [])
      .filter((e) => e.at >= dayStart && e.at <= this.t && Math.abs(e.delta) >= 0.005)
      .map(
        (e) =>
          `${e.delta >= 0 ? '+' : '−'}${Math.abs(e.delta).toFixed(2)} ${ACTION_LABEL[e.action ?? ''] ?? e.action ?? 'what you said'}: ${e.reason.replace(/-/g, ' ')}`,
      );
    let next: BetweenView['next'];
    if (this.free) next = { label: dayLabel(d + 1), day: d + 1, skipped: 0 };
    else {
      const i = PLAYED_DAYS.indexOf(d as (typeof PLAYED_DAYS)[number]);
      const nd = PLAYED_DAYS[i + 1];
      next = nd === undefined ? null : { label: dayLabel(nd), day: nd, skipped: nd - d - 1 };
    }
    const skipped = next?.skipped ?? 0;
    const cost = `He’ll hear this at every decision for ${skipped} days. If he doesn’t want it, it wears on him.`;
    this.between = {
      closed: `${dayLabel(d)} is over.`,
      lines,
      strip: stripFor(d, this.cells),
      ends: this.ends(),
      trust: { from: round2(this.dayTrustStart), to: round2(you?.trust ?? 0.5), events },
      next,
      choices:
        skipped > 0
          ? (Object.keys(WHISPERS) as StandingWhisper['choiceId'][]).map((id) => ({
              id,
              label: WHISPERS[id].label,
              cost,
            }))
          : [],
    };
    this.phase = 'between';
    this.paused = true;
    this.pauseBeat = { kind: 'day-end', text: this.between.closed };
    fire(this.beats, 'day-end', this.t, this.between.closed, this.autoPause);
    this.outbox.push({ type: 'between', view: this.between });
  }

  private startEid(): void {
    const target = TOWN_EID_DAY * MINUTES_PER_DAY;
    this.quiet = true;
    try {
      this.stepTo(target);
    } finally {
      this.quiet = false;
    }
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
    for (let i = 0; i < 2 * EPILOGUE_DAYS; i++) {
      runSilent(epi.c, epi.town, 0.5, { mutedVoiceId: 'you' });
      harvest();
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
          (e) => e.day === TOWN_EID_DAY && (e.kind === 'act' || e.kind === 'voice' || e.kind === 'recall'),
        )
        .map((e) => `${e.clock} ${e.text}`),
      rows: [...PLAYED_DAYS.map((d) => stripFor(d, this.cells)), stripFor(TOWN_EID_DAY, this.cells)],
      trustStart: this.trustStart,
      cells: this.cells,
      insisted: this.insisted,
      trustEid: voiceOf(this.halil, 'you')?.trust ?? 0.5,
    });
    this.phase = 'report';
    this.paused = true;
    this.outbox.push({ type: 'report', view: this.report });
  }

  ends() {
    return endsView({ h: this.halil, town: this.run.town, t: this.t, trustStart: this.trustStart });
  }

  // --- the frame --------------------------------------------------------------------------------

  frame(): Frame {
    const h = this.halil;
    const t = this.t;
    const day = dayOf(t);
    const cal = townCalendar(day);
    const composer = this.composer();
    const liveish = this.phase === 'day' || this.phase === 'eid' || this.phase === 'free';
    const offers = liveish ? this.offers() : [];
    const act = h.activity;
    const last =
      composer.open && act && this.ahead?.forDecision === act.decisionId ? this.ahead.record : h.trace.at(-1);
    const considered = last ? last.considered.filter((c) => offers.some((o) => o.id === c.affordanceId)) : [];
    const options = considered.slice(0, 6).map((c, i) => ({
      id: c.affordanceId,
      label: c.label ?? labelFor(c.affordanceId, offers),
      rank: i + 1,
      leaning: false,
    }));
    const lean =
      considered.find((c) => c.affordanceId === last?.chosenAffordanceId) ??
      considered.find((c) => !c.vetoed);
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
      halil: halilView(h, this.run.town, t),
      composer,
      options,
      log: this.log.slice(-LOG_CAP),
      ends: this.ends(),
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
      const p = prefillFor({
        h,
        town: this.run.town,
        t,
        offers,
        considered,
        ...(lean ? { leaningId: lean.affordanceId } : {}),
        tutorial: this.day === 1 && !this.free && !this.firstSuggestion && t % MINUTES_PER_DAY < cal.fajr,
      });
      if (p) f.prefill = p;
    }
    if (this.standing) f.standing = standingView(this.standing);
    return f;
  }
}

// --- helpers -------------------------------------------------------------------------------------

const adviceKey = (a: { sourceId: string; action: string; at: number }) =>
  `${a.sourceId}:${a.action}:${a.at}`;
const voiceWho = (id: string): LogEntry['who'] => (isVoiceId(id) ? (id as VoiceId) : 'halil');
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const round2 = (x: number) => Math.round(x * 100) / 100;

const VOICE_CHANNEL: Record<string, string> = {
  selin: 'Selin on the phone',
  riza: 'Rıza over tea',
  hacer: 'Hacer at the door',
  osman: 'Osman at the door',
  doctor: 'The doctor',
};
function voiceLine(source: string, target: string): string {
  const who = VOICE_CHANNEL[source] ?? nameOfVoice(source);
  const what = ACTION_LABEL[target] ?? target.replace(/[-:]/g, ' ');
  return `${who}: ${what}.`;
}

function trustOf(h: Person): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of h.will.voices) out[v.voiceId] = v.trust;
  return out;
}
