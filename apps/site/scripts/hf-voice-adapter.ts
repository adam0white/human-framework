/**
 * A `GameAdapter` (packages/playtester) for Game 2, The Day You Say Nothing: an HF persona plays the voice in
 * Halil's head. It drives the sim directly (`VoiceGame` inside `RecordedGame`, as the worker does) and shows only
 * what the page shows: new log lines (his acts, his answers to you with their tone, other voices, recalls), the
 * pause banner, the composer's options with the game's own telegraph for each (`predict`, what the page prints
 * under the draft), the between-days card (what your words did, the trust line, the whispers) and the report.
 * It never reads his needs, trust numbers the page does not print, or his plans.
 *
 * Time runs at the page's pace (slow by default, 8 sim minutes a real second; fast-forward while he sleeps or is
 * busy), in 250 ms ticks. A pause holds until the player says something or presses play, as on the page.
 */
import type {
  GameAdapter,
  Observation,
  PlayAction,
  PlayEvent,
} from '../../../packages/playtester/src/index.ts';
import type { Draft, Frame, StandingWhisper, Tone } from '../src/voice/protocol.ts';
import { VoiceGame } from '../src/voice/sim/game.ts';
import { RecordedGame } from '../src/voice/sim/record.ts';

const TICK_MS = 250;
/** How an answer to the player's word reads to the player. */
/** A yes is "he did what I said", the reward the player watches for. */
const ANSWER: Record<Tone, number> = { yes: 0.5, notNow: -0.15, cannot: -0.1, willNot: -0.35, protest: -0.2 };
/** How a telegraph reads before saying it: a likely yes is worth saying, a no barely. */
const PROMISE: Record<Tone, number> = { yes: 0.8, protest: 0.45, notNow: 0.25, cannot: 0.05, willNot: 0.15 };

export class VoiceAdapter implements GameAdapter {
  name = 'voice';
  readonly rec: RecordedGame;
  private seen = new Set<string>();
  private beat = '';
  private betweenSeen = '';
  private reported = false;
  private picked: StandingWhisper[] = [];
  /** Sim minute each option was last said: a word already said reads as spent for an hour. */
  private said = new Map<string, number>();
  /** What was new on screen when the words were last priced (a beat, a prefill, the composer opening). */
  private fresh = '';
  private freshAt = -1;

  constructor(seed: number) {
    this.rec = new RecordedGame(new VoiceGame(seed));
  }
  get game(): VoiceGame {
    return this.rec.game;
  }

  observe(): Observation {
    const g = this.game;
    const events: PlayEvent[] = [];
    const f = g.frame();
    for (const e of f.log) {
      if (this.seen.has(e.id)) continue;
      this.seen.add(e.id);
      if (e.kind === 'answer' && e.tone)
        events.push({
          kind: `answer:${e.tone}`,
          summary: `Halil: ${e.text}`,
          valence: ANSWER[e.tone],
          salience: 0.8,
          by: 'halil',
        });
      else if (e.kind === 'act')
        events.push({ kind: 'act', summary: e.text, valence: e.who === 'halil' ? 0.02 : 0, salience: 0.3 });
      else if (e.kind === 'voice')
        events.push({ kind: `voice:${e.who}`, summary: e.text, valence: 0.05, salience: 0.55 });
      else if (e.kind === 'recall')
        events.push({ kind: 'recall', summary: e.text, valence: 0.15, salience: 0.6 });
      else if (e.kind !== 'you') events.push({ kind: e.kind, summary: e.text, valence: 0, salience: 0.4 });
    }
    const beat = f.pauseBeat ? `${f.day}|${f.minute}|${f.pauseBeat.kind}` : '';
    if (beat && beat !== this.beat && f.pauseBeat)
      events.push({
        kind: `beat:${f.pauseBeat.kind}`,
        summary: f.pauseBeat.text,
        valence: 0,
        salience: 0.85,
      });
    this.beat = beat;
    if (g.phase === 'between' && g.between && g.between.closed !== this.betweenSeen) {
      const v = g.between;
      this.betweenSeen = v.closed;
      this.picked = [];
      const d = v.trust.to - v.trust.from;
      events.push({
        kind: 'day-closed',
        summary: `${v.closed}: ${(v.yours ?? []).join('; ') || v.lines[0] || ''}`,
        valence: Math.max(-1, Math.min(1, d * 8)),
        salience: 0.9,
      });
    }
    if (g.phase === 'report' && g.report && !this.reported) {
      this.reported = true;
      events.push({ kind: 'report', summary: g.report.eid.summary.join(' '), valence: 0.3, salience: 1 });
    }
    const waiting = f.paused && f.composer.open && !f.muted && !!f.pauseBeat;
    return {
      clock: `${f.dayLabel} ${f.clock}`,
      phase: g.phase,
      events,
      features: {
        pressure:
          g.phase === 'day' || g.phase === 'eid' ? (waiting ? 0.5 : f.composer.open ? 0.2 : 0.05) : 0.1,
      },
      over: g.phase === 'report',
    };
  }

  actions(): PlayAction[] {
    const g = this.game;
    if (g.phase === 'premise') return [{ id: 'begin', label: 'begin', kind: 'begin', promise: 0.7 }];
    if (g.phase === 'report') return [];
    if (g.phase === 'between' && g.between) {
      const v = g.between;
      const out: PlayAction[] = [
        { id: 'next', label: v.next ? 'let the days pass' : 'go to Eid', kind: 'next', promise: 0.55 },
      ];
      const skip = v.next !== null && v.next.skipped > 0;
      if (skip && this.picked.length < 2)
        for (const c of v.choices) {
          if (this.picked.some((w) => w.choiceId === c.id)) continue;
          out.push({
            id: `whisper:${c.id}`,
            label: `leave a word: ${c.label}`,
            kind: 'whisper',
            promise: c.hint ? 0.55 : 0.4,
          });
        }
      return out;
    }
    const f = g.frame();
    if (f.intro) return [{ id: 'continue', label: 'continue', kind: 'continue', promise: 0.6 }];
    const out: PlayAction[] = [];
    if (f.paused) out.push({ id: 'play', label: 'let him go on', kind: 'play', promise: 0.35 });
    else out.push({ id: 'pause', label: 'pause', kind: 'pause', promise: 0.05 });
    if (f.composer.open && !f.muted) out.push(...this.words(f));
    return out;
  }

  /** The composer's options, each said as Mention or Urge, priced by the page's own telegraph. */
  private words(f: Frame): PlayAction[] {
    const g = this.game;
    const out: PlayAction[] = [];
    const prefill = f.prefill?.optionId;
    // Words carry real promise only while something new is on screen: a pause beat, a new prefill, or the
    // composer just opened. Otherwise the player has already weighed them.
    const key = `${f.pauseBeat?.kind ?? ''}|${f.prefill?.optionId ?? ''}|${f.prefill?.why ?? ''}|${f.options.map((o) => o.id).join(',')}`;
    if (key !== this.fresh) {
      this.fresh = key;
      this.freshAt = g.t;
    }
    const novel = (f.paused && f.pauseBeat) || g.t - this.freshAt <= 20 ? 1 : 0.1;
    for (const o of f.options) {
      // A word for what he is leaning to anyway reads as low value; the prefilled advice reads as the point.
      // Words already standing make another word read as less needed.
      const last = this.said.get(o.id);
      const spent = last !== undefined && g.t - last < 60 ? 0.05 : 1;
      const worth = (o.leaning ? 0.35 : o.id === prefill ? 1 : 0.6) * (f.standing ? 0.4 : 1) * spent * novel;
      const appeal = o.id === prefill ? f.prefill?.appeal : undefined;
      for (const strength of ['mention', 'urge'] as const) {
        const d: Draft = { optionId: o.id, strength, insist: false, ...(appeal ? { appeal } : {}) };
        const t = g.predict(d);
        out.push({
          id: `say:${strength}:${o.id}`,
          label: `${strength} ${o.label} (${t.tone})`,
          kind: 'say',
          promise: worth * PROMISE[t.tone] * (strength === 'urge' ? 1 : 0.9),
        });
        if (strength === 'urge' && t.tone !== 'yes' && worth >= 0.6)
          out.push({
            id: `insist:${o.id}`,
            label: `insist on ${o.label}`,
            kind: 'insist',
            promise: 0.5 * worth,
            focus: 0.05,
            tags: ['confront'],
          });
      }
    }
    return out;
  }

  apply(id: string): void {
    const g = this.game;
    const [head, a, b] = id.split(':');
    if (head === 'begin') this.rec.apply({ type: 'begin' });
    else if (head === 'continue') this.rec.apply({ type: 'dismissIntro' });
    else if (head === 'play') this.rec.apply({ type: 'resume' });
    else if (head === 'pause') this.rec.apply({ type: 'pause' });
    else if (head === 'next') this.rec.apply({ type: 'advance', standing: this.picked });
    else if (head === 'whisper' && a) {
      const c = g.between?.choices.find((x) => x.id === a);
      if (c) this.picked.push({ choiceId: c.id, strength: 'mention' });
    } else if (head === 'say' && a && b) {
      this.said.set(b, g.t);
      const f = g.frame();
      const appeal = f.prefill?.optionId === b ? f.prefill.appeal : undefined;
      this.rec.apply({
        type: 'suggest',
        draft: {
          optionId: b,
          strength: a as Draft['strength'],
          insist: false,
          ...(appeal ? { appeal } : {}),
        },
      });
    } else if (head === 'insist' && a) {
      this.said.set(a, g.t);
      this.rec.apply({ type: 'suggest', draft: { optionId: a, strength: 'urge', insist: true } });
    }
  }

  advance(seconds: number): void {
    const g = this.game;
    const ticks = Math.round((seconds * 1000) / TICK_MS);
    for (let i = 0; i < ticks && g.live() && !g.paused; i++) this.rec.tick(TICK_MS);
  }
}
