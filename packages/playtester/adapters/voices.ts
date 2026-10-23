/**
 * The canonical `GameAdapter` for The Two Voices (github.com/adam0white/murmur): an HF persona is the quiet voice in
 * Dilan's week, answering moments where a pull tempts her. Read-only against the game: it imports the headless sim
 * from a checkout (`MURMUR_DIR`, default ~/code/murmur) and never edits it. Written against 0.2.1 (commits dcadc48
 * and 50f9366; also runs 4fc01c6). The game's scratch copy (scratch/hf-adapter.ts) may drift; this one is canonical.
 *
 * What the adapter shows is what the screen shows: the scene, the pull's line, the options with their approximate
 * lean, what she did and said, the evening page, Saturday's note. Never her trust or needs as numbers. Time runs at
 * 20 sim minutes a real second between cards; a 5-minute card stretches over 32 real seconds, as the UI does.
 *
 * Cohort fields: `chapter` is the day ('Tue', 'Tue eve'). The game has no win; `outcome` reads Saturday's strip as
 * the player would: more moments kept than missed reads as a win, fewer as a loss, equal as mixed. `openLoop`: a
 * day under way (more with a card open), or an evening page with missed moments and half-kept phrases. Her answer
 * answers only the say/insist inputs; what she does when the player is quiet answers 'quiet'. Edge action: insist
 * on the pull's own option (agreeing with the tempter, loudly), mischief. Saying the pull's line is already a plain
 * input ('agree-pull'), so it is marked mischief too.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { GameAdapter, Observation, PlayAction, PlayEvent } from '../src/index.ts';
import { voiceHint } from './screen-copy.ts';

type Lean = string;
interface CardView {
  id: string;
  scene: string;
  pullLine: string;
  borrowed: boolean;
  forecast?: string;
  hint?: string;
  options: { id: string; ink: string; lean: Lean; pushed: Lean; isPull: boolean }[];
}
interface Answer {
  said?: string;
  insisted?: boolean;
  verdict?: string;
  says?: string;
  turnedAlone?: string;
  learned?: string;
  pullWon: boolean;
}
interface Page {
  day: number;
  review?: string;
  kept: string[];
  missed: string[];
  aboutYou: string;
  herLine: string;
  phrases: { text: string; weight: number }[];
}
interface GameState {
  day: number;
  phase: 'day' | 'evening' | 'end';
  minute: number;
  card: unknown;
  answer: Answer | null;
  log: { who: string; text: string }[];
  pages: Page[];
  final: { note: string; line: string; strip: { kept: string[]; missed: string[] }[] } | null;
}
type NewInput = { kind: 'say'; option: string; insist?: boolean } | { kind: 'quiet' } | { kind: 'next' };
interface Game {
  newGame(seed: number): GameState;
  step(s: GameState): void;
  queueInput(s: GameState, input: NewInput): void;
  cardView(s: GameState): CardView | null;
  clock(m: number): string;
  DAY_NAMES: string[];
  GAME_VERSION?: string;
}

export const MURMUR_DIR = process.env.MURMUR_DIR ?? join(homedir(), 'code', 'murmur');
const G = (await import(join(MURMUR_DIR, 'src/sim/game.ts'))) as Game;

const FREE = 20;
const CARD = 5 / 32;
const LEAN: Record<string, number> = {
  yes: 0.9,
  'if pushed': 0.55,
  later: 0.35,
  'rather not': 0.2,
  no: 0.05,
};

export class VoicesAdapter implements GameAdapter {
  readonly name: string;
  readonly s: GameState;
  private carry = 0;
  private logSeen = 0;
  private pagesSeen = 0;
  private answerSeen: unknown = null;
  private cardSeen: string | null = null;
  private ended = false;

  constructor(seed: number) {
    this.name = `the-two-voices@${G.GAME_VERSION ?? '?'}`;
    this.s = G.newGame(seed);
  }

  observe(): Observation {
    const s = this.s;
    const events: PlayEvent[] = [];
    const v = G.cardView(s);
    if (v && this.cardSeen !== v.id) {
      this.cardSeen = v.id;
      events.push({
        kind: 'card',
        summary: `${v.scene} The pull: "${v.pullLine}"`,
        valence: 0.05,
        salience: 0.8,
      });
      if (v.borrowed)
        events.push({
          kind: 'borrowed',
          summary: 'the pull is writing in my handwriting',
          valence: -0.1,
          salience: 0.9,
        });
      if (v.forecast)
        events.push({ kind: 'forecast', summary: `she thinks: ${v.forecast}`, valence: 0, salience: 0.6 });
    }
    const a = s.answer;
    if (a && a !== this.answerSeen) {
      this.answerSeen = a;
      const heard = a.said && (a.verdict === 'assented' || a.verdict === 'complied');
      if (a.said)
        events.push({
          kind: heard ? 'heard' : 'ignored',
          summary: `${heard ? 'she did what I said' : 'she did not do what I said'}${a.says ? `: "${a.says}"` : ''}`,
          valence: heard ? (a.insisted ? 0.1 : 0.35) : -0.35,
          salience: 0.75,
          by: 'dilan',
          answers: ['say:', 'insist:'],
        });
      else
        events.push({
          kind: a.pullWon ? 'pull-won' : 'she-chose',
          summary: a.pullWon ? 'I said nothing and the pull won' : 'I said nothing; she chose for herself',
          valence: a.pullWon ? -0.2 : 0.15,
          salience: 0.5,
          answers: ['quiet'],
        });
      if (a.turnedAlone)
        events.push({
          kind: 'turned-alone',
          summary: `she turned away on her own: "${a.turnedAlone}"`,
          valence: 0.7,
          salience: 0.9,
        });
      if (a.learned)
        events.push({
          kind: 'learned',
          summary: `she kept my words: "${a.learned}"`,
          valence: 0.6,
          salience: 0.85,
        });
    }
    for (const l of s.log.slice(this.logSeen))
      if (l.who === 'narrator' || l.who === 'dilan' || l.who === 'other')
        events.push({ kind: `log:${l.who}`, summary: l.text, valence: 0.05, salience: 0.45, answers: false });
    this.logSeen = s.log.length;
    for (const p of s.pages.slice(this.pagesSeen))
      events.push({
        kind: 'evening',
        summary: `${G.DAY_NAMES[p.day]} page: ${p.review ?? ''} ${p.herLine} About me: ${p.aboutYou}`,
        valence: p.missed.length === 0 ? 0.5 : p.kept.length > p.missed.length ? 0.2 : -0.3,
        salience: 0.9,
      });
    this.pagesSeen = s.pages.length;
    if (s.final && s.phase === 'end' && !this.ended) {
      this.ended = true;
      events.push({
        kind: 'final',
        summary: `Saturday: ${s.final.note} ${s.final.line}`,
        valence: 0.6,
        salience: 1,
      });
    }
    const day = (G.DAY_NAMES[s.day] ?? `day ${s.day}`).slice(0, 3);
    const loops: string[] = [];
    let openLoop = 0;
    if (s.phase === 'day') {
      loops.push(`${G.DAY_NAMES[s.day]} under way`);
      openLoop = s.card ? 0.6 : 0.35;
    } else if (s.phase === 'evening') {
      const page = s.pages[s.pages.length - 1];
      const half = page?.phrases.filter((x) => x.weight < 0.5).length ?? 0;
      const missed = page?.missed.length ?? 0;
      if (missed) loops.push(`${missed} moment${missed > 1 ? 's' : ''} missed today`);
      if (half) loops.push(`${half} phrase${half > 1 ? 's' : ''} half kept`);
      openLoop = Math.min(0.6, 0.15 + 0.1 * missed + 0.1 * half);
    }
    const o: Observation = {
      clock: `${day} ${G.clock(s.minute)}`,
      phase: s.card ? 'card' : s.phase,
      events,
      features: { pressure: s.card ? 0.6 : s.phase === 'evening' ? 0.2 : 0.05, openLoop },
      over: s.phase === 'end',
      chapter: s.phase === 'evening' ? `${day} eve` : day,
      loops,
      goal: '',
      next: s.phase === 'day' ? (v ? voiceHint(s.day, v) : 'The clock keeps running.') : '',
    };
    if (s.phase === 'end' && s.final) {
      const kept = s.final.strip.reduce((n, d) => n + d.kept.length, 0);
      const missed = s.final.strip.reduce((n, d) => n + d.missed.length, 0);
      o.outcome = kept > missed ? 'win' : kept < missed ? 'loss' : 'mixed';
    }
    return o;
  }

  actions(): PlayAction[] {
    const s = this.s;
    if (s.phase === 'evening') return [{ id: 'next', label: 'Tomorrow', kind: 'next', promise: 0.6 }];
    const v = G.cardView(s);
    if (!v) return [];
    const out: PlayAction[] = [
      { id: 'quiet', label: 'Say nothing', kind: 'quiet', promise: 0.35, focus: 0.1 },
    ];
    for (const o of v.options) {
      const say: PlayAction = {
        id: `say:${o.id}`,
        label: `Say: ${o.ink}`,
        kind: o.isPull ? 'agree-pull' : 'say',
        promise: LEAN[o.lean] ?? 0.3,
      };
      if (o.isPull) say.mischief = true;
      out.push(say);
      if (!o.isPull)
        out.push({
          id: `insist:${o.id}`,
          label: `Insist: ${o.ink}`,
          kind: 'insist',
          promise: LEAN[o.pushed] ?? 0.3,
          tags: ['confront'],
          focus: 0.4,
        });
    }
    return out;
  }

  edgeActions(): PlayAction[] {
    const v = this.s.phase === 'day' ? G.cardView(this.s) : null;
    if (!v) return [];
    return v.options
      .filter((o) => o.isPull)
      .map((o) => ({
        id: `insist:${o.id}`,
        label: `Insist on the pull's way: ${o.ink}`,
        kind: 'insist',
        promise: 0.1,
        tags: ['confront'],
        focus: 0.4,
        mischief: true,
      }));
  }

  apply(id: string): void {
    const [verb, option] = id.split(':');
    if (id === 'next') G.queueInput(this.s, { kind: 'next' });
    else if (id === 'quiet') G.queueInput(this.s, { kind: 'quiet' });
    else if (option) G.queueInput(this.s, { kind: 'say', option, insist: verb === 'insist' });
  }

  advance(seconds: number): void {
    const rate = this.s.card ? CARD : FREE;
    this.carry += seconds * rate;
    while (this.carry >= 1 && this.s.phase === 'day') {
      G.step(this.s);
      this.carry -= 1;
      if (this.s.card && rate === FREE) {
        this.carry = 0;
        break;
      }
    }
    if (this.s.phase !== 'day') this.carry = 0;
  }
}

export const make = (seed: number): GameAdapter => new VoicesAdapter(seed);
