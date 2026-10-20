/**
 * A `GameAdapter` for The Night Watch: an HF persona (packages/playtester) plays the Keeper through the text
 * harness (`play-watch.ts`), so it sees what the page shows and nothing more: the ticker and cards, the dawn
 * voices, the chronicle's lines, season matters, the fair, the Keeper's reads of a posting by press, the grain as
 * sacks against the mark. It never reads a watcher's needs, trust or fear.
 *
 * Actions are the page's own inputs, scored from what the screen says: at dusk, post the unposted watchers (where
 * the scout warned first) at the press whose read looks best, carry the lantern to the warned stretch and begin;
 * at night, answer a card (an option's read sets its promise), ring the bell when something is sighted, walk the
 * lantern to a stretch that just stirred, or change speed; at dawn, talk and go on; in the seasons, answer a
 * matter; at the fair, take an affordable offer or leave. Turning pages (`continue`) is always offered.
 *
 * `advance(seconds)` lets real seconds pass at the page's pace, which the pacer sets from the phase and speed.
 */
import type {
  GameAdapter,
  Observation,
  PlayAction,
  PlayEvent,
} from '../../../packages/playtester/src/index.ts';
import { Harness } from './play-watch.ts';

type Frame = ReturnType<Harness['frame']>;

/** How a read in words looks to a player: a yes is worth asking for, a no barely. */
export function promiseOf(read: string | undefined): number {
  if (!read) return 0.45;
  const r = read.toLowerCase();
  if (r.includes("won't") || r.includes('will not')) return 0.12;
  if (r.includes('grudging')) return 0.5;
  if (r.includes('unsure') || r.includes("can't tell") || r.includes('maybe')) return 0.38;
  if (r.includes('likely') || r.includes('holds') || r.includes('will')) return 0.75;
  return 0.45;
}

const STRETCH = ['west', 'gate', 'mill', 'east'] as const;

export class WatchAdapter implements GameAdapter {
  name = 'the-night-watch';
  readonly h: Harness;
  private alertsSeen = new Set<string>();
  private chronicleSeen = 0;
  private momentSeen = -1;
  private cardSeen = -1;
  private dawnSeen = -1;
  private talksSeen = 0;
  private phase: string;
  private lastStir: string | null = null;

  constructor(seed: number) {
    this.h = Harness.fresh(seed);
    const f = this.h.frame();
    this.phase = f.phase;
    this.chronicleSeen = f.chronicle.length;
  }

  private frame(): Frame {
    return this.h.frame();
  }

  observe(): Observation {
    const f = this.frame();
    const events: PlayEvent[] = [];
    for (const a of f.alerts) {
      const key = `${a.minute}|${a.kind}|${a.text}`;
      if (this.alertsSeen.has(key)) continue;
      this.alertsSeen.add(key);
      const bad = a.kind === 'in' || a.kind === 'rope';
      const good = a.kind === 'driven';
      if (a.kind === 'sighted' || a.kind === 'motion' || a.kind === 'foot') this.lastStir = a.section;
      events.push({
        kind: `alert:${a.kind}`,
        summary: a.text,
        valence: bad ? -0.55 : good ? 0.45 : a.kind === 'person' ? -0.1 : 0,
        salience: a.slowed ? 0.85 : 0.5,
        ...(a.who ? { by: a.who } : {}),
      });
    }
    if (f.moment && f.moment.id !== this.momentSeen) {
      this.momentSeen = f.moment.id;
      events.push({ kind: `card:${f.moment.kind}`, summary: f.moment.text, valence: -0.15, salience: 0.9 });
    }
    if (f.dawn && f.dawn.night !== this.dawnSeen) {
      this.dawnSeen = f.dawn.night;
      const lost = f.dawn.grainBefore - f.dawn.grainAfter;
      events.push({
        kind: 'dawn',
        summary: `dawn of night ${f.dawn.night}: ${lost > 0 ? `${lost} sacks gone` : 'the grain held'}`,
        valence: lost > 0 ? -Math.min(0.8, 0.2 + lost * 0.1) : 0.4,
        salience: 0.9,
      });
      for (const v of f.dawn.voices)
        events.push({ kind: 'voice', summary: v.text, valence: 0.05, salience: 0.6, by: v.who });
      this.talksSeen = 0;
    }
    if (f.talks) {
      for (const t of f.talks.said.slice(this.talksSeen))
        events.push({
          kind: 'talk',
          summary: `${t.name}: ${t.text}`,
          valence: 0.1,
          salience: 0.65,
          by: t.who,
        });
      this.talksSeen = f.talks.said.length;
    }
    if (f.card && f.card.id !== this.cardSeen) {
      this.cardSeen = f.card.id;
      events.push({ kind: `matter:${f.card.kind}`, summary: f.card.text, valence: 0.2, salience: 0.85 });
    }
    for (const c of f.chronicle.slice(Math.min(this.chronicleSeen, f.chronicle.length))) {
      const grave = c.kind === 'death' || c.kind === 'leave' || c.kind === 'loss';
      const glad = c.kind === 'birth' || c.kind === 'marriage' || c.kind === 'arrive' || c.kind === 'harvest';
      events.push({
        kind: `chronicle:${c.kind}`,
        summary: c.text,
        valence: grave ? -0.4 : glad ? 0.35 : 0.05,
        salience: grave || glad ? 0.75 : 0.45,
      });
    }
    this.chronicleSeen = f.chronicle.length;
    if (f.phase !== this.phase) {
      events.push({
        kind: `phase:${f.phase}`,
        summary: f.date,
        valence: f.phase === 'fallen' ? -1 : 0,
        salience: f.phase === 'fallen' ? 1 : 0.4,
      });
      this.phase = f.phase;
    }
    const sighted = f.alerts.filter((a) => a.kind === 'sighted' || a.kind === 'foot').length;
    const night = f.phase === 'night';
    return {
      clock: `${f.date} ${String(Math.floor(f.clock / 60)).padStart(2, '0')}:${String(f.clock % 60).padStart(2, '0')}`,
      phase: f.phase,
      events,
      features: {
        pressure: f.moment || f.card ? 0.7 : night ? Math.min(1, 0.2 + sighted * 0.15) : 0.1,
      },
      over: f.phase === 'fallen' || (f.year > 3 && f.phase === 'dusk'),
    };
  }

  actions(): PlayAction[] {
    const f = this.frame();
    const out: PlayAction[] = [];
    const turn = (label: string, promise: number) =>
      out.push({ id: 'continue', label, kind: 'page', promise });
    switch (f.phase) {
      case 'goal':
        out.push({ id: 'start', label: 'go up to the wall', kind: 'page', promise: 0.8 });
        break;
      case 'dusk': {
        // The scout's warned stretch first: move someone onto it while it has a free post, unposted watchers
        // anywhere. The read shown is the Keeper's read of the posting, by press.
        const reads = f.postingReads ?? {};
        const free = (sec: string) => {
          const at = f.sections.find((x) => x.id === sec);
          return !!at && !at.fallen && at.posts.some((p) => p.posted === null);
        };
        const onWarned = f.watchers.filter((w) => w.posted?.startsWith(f.warned)).length;
        for (const w of f.watchers) {
          const r = reads[w.id];
          let best: { press: 'ask' | 'urge' | 'insist'; p: number } = { press: 'ask', p: 0.4 };
          for (const press of ['ask', 'urge', 'insist'] as const) {
            const p = promiseOf(r?.[press]) - (press === 'insist' ? 0.08 : press === 'urge' ? 0.03 : 0);
            if (p > best.p) best = { press, p };
          }
          const targets = w.posted
            ? w.posted.startsWith(f.warned) || onWarned >= 2
              ? []
              : [f.warned]
            : [f.warned, ...STRETCH.filter((x) => x !== f.warned)].filter(free).slice(0, 2);
          for (const sec of targets.filter(free))
            out.push({
              id: `post ${w.name} ${sec} ${best.press}`,
              label: `post ${w.name} on ${sec} (${best.press}: ${r?.[best.press] ?? '?'})`,
              kind: best.press === 'insist' ? 'insist' : 'post',
              promise: best.p * (sec === f.warned ? 1 : 0.7),
              ...(best.press === 'insist' ? { tags: ['confront'] } : {}),
            });
        }
        if (f.lit !== f.warned)
          out.push({
            id: `lantern ${f.warned}`,
            label: `lantern to ${f.warned}`,
            kind: 'lantern',
            promise: 0.5,
          });
        const ready = f.watchers.filter((w) => w.posted).length / Math.max(1, f.watchers.length);
        out.push({
          id: 'begin',
          label: 'begin the watch',
          kind: 'begin',
          promise: Math.min(0.8, 0.1 + ready * 0.4 + (onWarned > 0 ? 0.25 : 0)),
        });
        break;
      }
      case 'night': {
        for (const w of f.watchers) {
          for (const act of w.acts) {
            if (!act.available) continue;
            const input = act.input;
            const by =
              input.k === 'down'
                ? ''
                : ` ${f.watchers.find((candidate) => candidate.id === input.by)?.name ?? ''}`;
            out.push({
              id: `${act.input.k} ${w.name}${by}`,
              label: `${act.label} (${act.read})`,
              kind: act.input.k,
              promise: promiseOf(act.read) * (act.input.k === 'help' ? 1 : 0.85),
              focus: 0.04,
            });
          }
        }
        const m = f.moment;
        if (m)
          m.options.forEach((o, i) => {
            out.push({
              id: `answer ${i + 1}`,
              label: `${o.label}${o.read ? ` (${o.read})` : ''}`,
              kind: 'answer',
              promise: promiseOf(o.read),
              focus: 0.06,
            });
          });
        // Something sighted or at the foot of the wall in the last quarter hour, not yet turned back.
        const recent = f.alerts.filter((a) => f.minute - a.minute <= 15);
        const stirring =
          recent.some((a) => a.kind === 'sighted' || a.kind === 'foot') &&
          !recent.some((a) => a.kind === 'driven' || a.kind === 'bell');
        // A player rings for something seen, not into a quiet night.
        if (f.bellRead && !f.bellSwinging && stirring)
          out.push({ id: 'bell', label: `ring the bell (${f.bellRead})`, kind: 'bell', promise: 0.6 });
        if (this.lastStir && this.lastStir !== f.lit)
          out.push({
            id: `lantern ${this.lastStir}`,
            label: `walk the lantern to ${this.lastStir}`,
            kind: 'lantern',
            promise: 0.55,
          });
        // Speed: up when the wall is quiet, back to the watch when something stirs.
        if (this.h.pacer.speed !== 'fast' && !stirring && !m)
          out.push({ id: 'speed fast', label: 'speed up', kind: 'speed', promise: 0.25, tags: ['novel'] });
        if (this.h.pacer.speed === 'fast' && stirring)
          out.push({ id: 'speed watch', label: 'slow to the watch', kind: 'speed', promise: 0.45 });
        break;
      }
      case 'dawn': {
        const t = f.talks;
        if (t && t.left > 0)
          for (const id of t.can.slice(0, 3)) {
            const w = f.watchers.find((x) => x.id === id);
            if (w)
              out.push({ id: `talk ${w.name} 1`, label: `talk to ${w.name}`, kind: 'talk', promise: 0.5 });
          }
        out.push({ id: 'dusk', label: 'on to dusk', kind: 'page', promise: 0.55 });
        break;
      }
      case 'spring':
      case 'summer':
      case 'autumn':
        if (f.card)
          f.card.options.forEach((o, i) => {
            out.push({ id: `card ${i + 1}`, label: o.label, kind: 'matter', promise: 0.55, focus: 0.05 });
          });
        if (this.h.pacer.speed !== 'seasons')
          out.push({ id: 'speed seasons', label: 'speed the seasons', kind: 'speed', promise: 0.3 });
        break;
      case 'fair': {
        const fair = f.fair;
        if (fair && fair.picksLeft > 0)
          fair.offers.forEach((o, i) => {
            if (o.affordable && !o.taken)
              out.push({ id: `take ${i + 1}`, label: `take ${o.label}`, kind: 'fair', promise: 0.55 });
          });
        out.push({ id: 'leave', label: 'leave the fair', kind: 'page', promise: 0.4 });
        break;
      }
      case 'thaw':
      case 'closed':
        turn('turn the page', 0.6);
        break;
      default:
        break;
    }
    return out;
  }

  apply(id: string): void {
    this.h.exec(id);
    this.h.out.length = 0;
    if (id.startsWith('lantern')) this.lastStir = null;
  }

  advance(seconds: number): void {
    this.h.wait(seconds, false);
    this.h.out.length = 0;
  }
}
