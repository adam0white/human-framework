/**
 * An in-page stand-in for the worker, for building and checking the UI (`?mock=1`, or before `../worker.ts`
 * exists). It replays `sim/fixtures.ts`, advances the clock, answers suggestions with canned verdicts and walks
 * the phases premise → day → between → day → between (skip) → Eid → report. It is for reachability, not realism.
 */
import type {
  Draft,
  Frame,
  LogEntry,
  MainToWorker,
  Pace,
  Telegraph,
  Tone,
  WorkerReply,
  WorkerToMain,
} from '../protocol.ts';
import { PACE_MINUTES_PER_SECOND } from '../protocol.ts';
import { sampleBetween, sampleBetweenSkip, sampleFrame, sampleReport } from '../sim/fixtures.ts';

const pad = (n: number) => String(n).padStart(2, '0');
const clockOf = (minute: number) => {
  const m = ((Math.floor(minute) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

const CANNED: Record<string, { tone: Tone; says: string; counter?: string; reason: string }> = {
  smoke: { tone: 'willNot', says: 'Not while I’m keeping my fast.', reason: 'duty: the fast' },
  'see-doctor': {
    tone: 'notNow',
    says: 'Not now. After I pray at the mosque.',
    counter: 'after I pray',
    reason: 'a prayer is closing',
  },
  'pray-mosque': {
    tone: 'notNow',
    says: 'I’ll pray at home.',
    counter: 'pray at home',
    reason: 'the mosque feels heavy',
  },
};

function telegraphFor(draft: Draft): Telegraph {
  const c = CANNED[draft.optionId];
  if (draft.insist && c && c.tone === 'notNow')
    return {
      tone: 'protest',
      text: 'He’d do it, under protest',
      says: 'Fine. If you insist.',
      reason: 'insisted',
    };
  if (!c)
    return {
      tone: 'yes',
      text: 'Likely',
      says: 'Fine.',
      reason: 'he was close to it anyway',
      likelihood: 0.72,
    };
  const text =
    c.tone === 'willNot' ? 'Won’t' : c.counter?.startsWith('pray') ? 'He’d do something like it' : 'Not now';
  return { tone: c.tone, text, says: c.says, reason: c.reason, ...(c.counter ? { counter: c.counter } : {}) };
}

export class MockEngine {
  private listeners: ((msg: WorkerToMain) => void)[] = [];
  private gen = 0;
  private frame: Frame = structuredClone({ ...sampleFrame, phase: 'premise', paused: true });
  private stage = 0;
  private seq = 100;
  private timer = 0;
  private lastPauseAt = -1;

  listen(fn: (msg: WorkerToMain) => void) {
    this.listeners.push(fn);
  }

  close() {
    this.listeners = [];
    window.clearTimeout(this.timer);
  }

  private emit(reply: WorkerReply) {
    const msg = { ...reply, gen: this.gen } as WorkerToMain;
    // Asynchronous, like a real worker.
    queueMicrotask(() => {
      for (const fn of this.listeners) fn(msg);
    });
  }

  private sendFrame() {
    this.emit({ type: 'frame', frame: structuredClone(this.frame) });
  }

  private log(entry: Omit<LogEntry, 'id' | 'day' | 'minute' | 'clock'>) {
    this.seq += 1;
    const f = this.frame;
    f.log = [...f.log, { id: `m${this.seq}`, day: f.day, minute: f.minute, clock: f.clock, ...entry }].slice(
      -300,
    );
  }

  private reset(seedLabel?: number) {
    this.frame = structuredClone({ ...sampleFrame, phase: 'premise', paused: true });
    this.frame.minute = 1440 + 220;
    this.frame.clock = clockOf(this.frame.minute);
    this.frame.log = [];
    this.frame.standing = undefined;
    this.frame.pauseBeat = undefined;
    this.stage = 0;
    if (seedLabel !== undefined) this.frame.dayLabel = 'Ramadan 1';
  }

  receive(msg: MainToWorker) {
    const f = this.frame;
    switch (msg.type) {
      case 'init':
        this.gen = msg.gen;
        this.reset();
        this.sendFrame();
        return;
      case 'tick': {
        const live = f.phase === 'day' || f.phase === 'eid' || f.phase === 'free';
        if (!live || f.paused || f.intro) return;
        const rate = f.fastForward ? 240 : PACE_MINUTES_PER_SECOND[f.pace as Pace];
        const before = Math.floor(f.minute);
        f.minute += (rate * msg.dtMs) / 1000;
        f.clock = clockOf(f.minute);
        f.sky = { ...f.sky, hour: (f.minute % 1440) / 60 };
        if (Math.floor(f.minute) === before) return;
        const m = Math.floor(f.minute) % 1440;
        // A beat every two sim hours, to exercise the banner and auto-pause.
        if (m % 120 === 0 && m !== this.lastPauseAt) {
          this.lastPauseAt = m;
          const beat = { kind: 'close-call' as const, text: 'He’s torn between resting and the workshop.' };
          this.log({ kind: 'note', who: 'halil', text: beat.text, beat: beat.kind });
          if (f.autoPause) {
            f.paused = true;
            f.pauseBeat = beat;
          }
        } else if (m % 37 === 0) {
          this.log({
            kind: 'act',
            who: 'halil',
            text: 'I repair in the workshop, to earn.',
            until: clockOf(m + 60),
            decisionId: 'd3',
          });
        }
        if (m >= 1410 && f.phase !== 'free') {
          this.receive({ type: 'endDay' });
          return;
        }
        this.sendFrame();
        return;
      }
      case 'pause':
        f.paused = true;
        this.sendFrame();
        return;
      case 'resume':
        f.paused = false;
        f.pauseBeat = undefined;
        this.sendFrame();
        return;
      case 'setPace':
        f.pace = msg.pace;
        this.sendFrame();
        return;
      case 'setAutoPause':
        f.autoPause = msg.on;
        this.sendFrame();
        return;
      case 'begin':
        f.phase = 'day';
        f.paused = false;
        f.prefill = {
          optionId: 'eat-home',
          strength: 'mention',
          why: 'The fast begins at 04:59. He hasn’t cooked since Nuran died; there’s bread and cheese.',
          source: 'tutorial',
        };
        f.options = [
          { id: 'eat-home', label: 'eat at home', rank: 1, leaning: true },
          ...sampleFrame.options,
        ];
        f.leaning = { optionId: 'eat-home', why: 'he’s hungry, and the fast starts soon' };
        this.log({ kind: 'note', who: 'halil', text: 'The drummer comes round for suhoor.', beat: 'wake' });
        f.paused = f.autoPause;
        f.pauseBeat = f.autoPause ? { kind: 'wake', text: 'He’s awake for suhoor.' } : undefined;
        this.sendFrame();
        return;
      case 'predict':
        this.emit({ type: 'predicted', requestId: msg.requestId, telegraph: telegraphFor(msg.draft) });
        return;
      case 'suggest': {
        const t = telegraphFor(msg.draft);
        const opt = f.options.find((o) => o.id === msg.draft.optionId);
        const label = opt?.label ?? msg.draft.optionId;
        const how = `${msg.draft.insist ? 'insist' : msg.draft.strength}${msg.draft.appeal ? ` · ${msg.draft.appeal}` : ''}`;
        this.log({ kind: 'you', who: 'you', text: `You: ${how} · ${label}` });
        this.log({ kind: 'answer', who: 'halil', text: `“${t.says}”`, tone: t.tone, beat: 'verdict' });
        if (t.tone === 'yes' || t.tone === 'protest')
          this.log({
            kind: 'act',
            who: 'halil',
            text: `I ${label}.`,
            until: clockOf(f.minute + 30),
            decisionId: 'd3',
          });
        f.standing =
          t.tone === 'yes' || t.tone === 'willNot' || t.tone === 'cannot'
            ? undefined
            : {
                draft: msg.draft,
                label: `${how} · ${label}`,
                since: f.clock,
                lastAnswer: { tone: t.tone, says: t.says, ...(t.counter ? { counter: t.counter } : {}) },
                expires: clockOf(f.minute + 180),
              };
        f.prefill = undefined;
        if (f.autoPause) {
          f.paused = true;
          f.pauseBeat = { kind: 'verdict', text: `He answered you: “${t.says}”` };
        }
        this.sendFrame();
        return;
      }
      case 'withdraw':
        f.standing = undefined;
        this.sendFrame();
        return;
      case 'why':
        this.emit({
          type: 'why',
          decisionId: msg.decisionId,
          why: {
            decisionId: msg.decisionId,
            clock: f.clock,
            chosen: 'repair in the workshop',
            options: [
              {
                label: 'repair in the workshop',
                total: 1.42,
                terms: [
                  { label: 'money: Osman is owed', value: 0.71 },
                  { label: 'his job', value: 0.48 },
                  { label: 'habit', value: 0.31 },
                  { label: 'effort', value: -0.08 },
                ],
              },
              {
                label: 'rest at home',
                total: 1.18,
                terms: [
                  { label: 'tired', value: 0.9 },
                  { label: 'the chair', value: 0.4 },
                  { label: 'grief', value: -0.12 },
                ],
              },
              {
                label: 'see the doctor',
                total: 0.6,
                terms: [
                  { label: 'Selin said', value: 0.5 },
                  { label: 'cost', value: -0.2 },
                  { label: 'your suggestion', value: 0.3 },
                ],
              },
            ],
            recalled: 'Nuran, at this table, last Ramadan.',
            voice: { says: 'Not now. After I pray.', reason: 'a prayer is closing' },
          },
        });
        return;
      case 'endDay':
        if (f.phase === 'eid') {
          f.phase = 'report';
          f.paused = true;
          this.sendFrame();
          this.emit({ type: 'report', view: structuredClone(sampleReport) });
          return;
        }
        f.phase = 'between';
        f.paused = true;
        f.pauseBeat = undefined;
        this.sendFrame();
        this.emit({
          type: 'between',
          view: structuredClone(
            this.stage === 0
              ? sampleBetween
              : this.stage === 1
                ? sampleBetweenSkip
                : this.stage === 2
                  ? {
                      ...sampleBetweenSkip,
                      closed: 'Ramadan 15 is over.',
                      next: { label: 'Ramadan 30', day: 30, skipped: 14 },
                    }
                  : { ...sampleBetween, closed: 'Ramadan 30 is over.', next: null },
          ),
        });
        return;
      case 'advance': {
        this.stage += 1;
        const nextDay = [2, 15, 30, 31][this.stage - 1] ?? 31;
        f.day = nextDay;
        f.minute = nextDay * 1440 + 220;
        f.clock = clockOf(f.minute);
        f.log = [];
        f.standing = undefined;
        if (nextDay === 31) {
          f.phase = 'eid';
          f.dayLabel = 'Eid al-Fitr';
          f.muted = true;
          f.composer = { open: false, reason: 'muted' };
          f.prefill = undefined;
          f.intro = { label: 'Eid al-Fitr', lines: ['The fast is over. Today you say nothing.'] };
          f.sky = { ...f.sky, fast: undefined };
        } else {
          f.phase = 'day';
          f.dayLabel = `Ramadan ${nextDay}`;
          f.intro = {
            label: f.dayLabel,
            lines:
              msg.standing.length > 0
                ? [
                    'He kept the fast 12 of 12 days.',
                    'He paid Osman 300 on Ramadan 11.',
                    'He called Selin twice.',
                    `Your standing words: ${msg.standing.map((s) => s.choiceId).join(', ')}.`,
                  ]
                : ['A new day of the fast.'],
          };
        }
        f.paused = true;
        this.sendFrame();
        return;
      }
      case 'dismissIntro':
        f.intro = undefined;
        f.paused = true;
        this.sendFrame();
        return;
      case 'keepListening':
        f.phase = 'free';
        f.day = 32;
        f.dayLabel = 'Shawwal 1';
        f.muted = false;
        f.composer = { open: true };
        f.options = sampleFrame.options;
        f.paused = true;
        this.sendFrame();
        return;
    }
  }
}
