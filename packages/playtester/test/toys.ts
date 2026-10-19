/**
 * Three toy games for the playtester's own control, all domain-neutral and seeded by nothing (fully scripted):
 * - Lull: nothing ever happens; one button that does nothing much.
 * - Garden: something new appears every few seconds, and tending it pays off.
 * - Wall: a keeper turns down every request; insisting gets a grudging yes now and then.
 * Each runs a fixed number of real seconds, then ends.
 */
import type { GameAdapter, Observation, PlayAction, PlayEvent } from '../src/index.ts';

export abstract class Toy implements GameAdapter {
  abstract name: string;
  protected t = 0;
  protected pending: PlayEvent[] = [];
  protected length: number;
  constructor(length = 40 * 60) {
    this.length = length;
  }
  observe(): Observation {
    const events = this.pending;
    this.pending = [];
    return {
      clock: `${Math.floor(this.t / 60)}m`,
      phase: 'play',
      events,
      features: { pressure: this.pressure() },
      over: this.t >= this.length,
    };
  }
  protected pressure(): number {
    return 0;
  }
  abstract actions(): PlayAction[];
  abstract apply(id: string): void;
  advance(seconds: number): void {
    const from = this.t;
    this.t += seconds;
    this.tick(from, this.t);
  }
  protected tick(_from: number, _to: number): void {}
}

export class Lull extends Toy {
  name = 'lull';
  actions(): PlayAction[] {
    return [{ id: 'press', label: 'press the button', kind: 'press', promise: 0.05 }];
  }
  apply(): void {}
}

const FLOWERS = ['a crocus', 'a bee', 'a tulip', 'a robin', 'rain', 'a snail', 'a rose', 'a moth', 'a frog'];

export class Garden extends Toy {
  name = 'garden';
  private sprouts = 0;
  private n = 0;
  /** Seconds between visitors. */
  protected every = 7;
  actions(): PlayAction[] {
    return [{ id: 'tend', label: 'tend the bed', kind: 'tend', promise: this.sprouts > 0 ? 0.8 : 0.3 }];
  }
  apply(_id?: string): void {
    if (this.sprouts > 0) {
      this.sprouts -= 1;
      this.pending.push({
        kind: 'bloom',
        summary: `a bloom opened (${this.n})`,
        valence: 0.5,
        salience: 0.7,
        answers: ['tend'],
      });
    }
  }
  protected override pressure(): number {
    return Math.min(1, this.sprouts / 3);
  }
  protected override tick(from: number, to: number): void {
    for (let s = Math.ceil(from / this.every) * this.every; s < to; s += this.every) {
      this.n += 1;
      this.sprouts += 1;
      const what = FLOWERS[this.n % FLOWERS.length] ?? 'something';
      this.pending.push({
        kind: `visit:${what}`,
        summary: `${what} came by (${this.n})`,
        valence: 0.3,
        salience: 0.6,
      });
    }
  }
}

export class Wall extends Toy {
  name = 'wall';
  private asks = 0;
  actions(): PlayAction[] {
    return [
      { id: 'ask', label: 'ask the keeper', kind: 'ask', promise: 0.6 },
      { id: 'insist', label: 'insist', kind: 'insist', promise: 0.5, tags: ['confront'] },
    ];
  }
  apply(id: string): void {
    this.asks += 1;
    if (id === 'insist' && this.asks % 4 === 0)
      this.pending.push({
        kind: 'grudging-yes',
        summary: 'the keeper let me through, scowling',
        valence: 0.3,
        salience: 0.7,
        by: 'keeper',
      });
    else
      this.pending.push({
        kind: 'refusal',
        summary: `the keeper said no (${this.asks})`,
        valence: -0.5,
        salience: 0.8,
        by: 'keeper',
      });
  }
  protected override pressure(): number {
    return 0.5;
  }
}

/** Garden with a stomp the game never answers (an ignored provocation) and a slower variant for build comparisons. */
export class EdgyGarden extends Garden {
  override name = 'garden';
  edgeActions(): PlayAction[] {
    return [{ id: 'stomp', label: 'stomp on the bed', kind: 'stomp', promise: 0.05, mischief: true }];
  }
  override apply(id?: string): void {
    if (id === 'stomp') return;
    super.apply(id);
  }
}

/** A machine with one lever that always pays and one that rarely does; thirty payouts win. */
export class Slot extends Toy {
  name = 'slot';
  private paid = 0;
  private looks = 0;
  actions(): PlayAction[] {
    return [
      { id: 'pull', label: 'pull the lever', kind: 'pull', promise: 0.3 },
      { id: 'look', label: 'look around', kind: 'look', promise: 0.5 },
    ];
  }
  apply(id: string): void {
    if (id === 'pull') {
      this.paid += 1;
      this.pending.push({
        kind: 'payout',
        summary: `paid out (${this.paid})`,
        valence: 0.5,
        salience: 0.7,
        answers: true,
      });
    } else if (++this.looks % 5 === 0)
      this.pending.push({
        kind: 'find',
        summary: `found something (${this.looks})`,
        valence: 0.5,
        salience: 0.6,
        answers: true,
      });
    else
      this.pending.push({
        kind: 'nothing',
        summary: 'nothing there',
        valence: 0,
        salience: 0.3,
        answers: true,
      });
  }
  override observe(): Observation {
    const o = super.observe();
    if (this.paid >= 30) return { ...o, over: true, outcome: 'win' };
    return o;
  }
}

/** Garden that always leaves a seed about to open when you stop, and runs for hours. */
export class Cliffhanger extends Garden {
  override name = 'cliffhanger';
  constructor() {
    super(6 * 60 * 60);
  }
  override observe(): Observation {
    return { ...super.observe(), loops: ['the seed about to open'], features: { pressure: 0, openLoop: 1 } };
  }
}

/** Plays itself: wins after five minutes whatever the player does. */
export class Idle extends Toy {
  name = 'idle';
  constructor() {
    super(5 * 60);
  }
  actions(): PlayAction[] {
    return [{ id: 'poke', label: 'poke it', kind: 'poke', promise: 0.02 }];
  }
  apply(): void {}
  protected override tick(from: number, to: number): void {
    for (let s = Math.ceil(from / 5) * 5; s < to; s += 5)
      this.pending.push({ kind: `tick:${s % 4}`, summary: `it hums (${s})`, valence: 0.3, salience: 0.6 });
  }
  override observe(): Observation {
    const o = super.observe();
    return o.over ? { ...o, outcome: 'win' } : o;
  }
}

/** The same garden, a later "build" in which visitors come four times less often. */
export class SlowGarden extends EdgyGarden {
  protected override every = 28;
}
