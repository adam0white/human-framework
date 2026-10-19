/**
 * A `GameAdapter` (packages/playtester) for Twice at the Well (/colony/): an HF persona plays the player who gives
 * orders to both villages. It drives the game's own `Playback` (the worker's state machine) at page-sized ticks and
 * shows the persona only what the page shows: the suggestion cards and their reasons, the pause ribbon, the bubbles
 * over the Human map (answers and thoughts), moment captions, the hurt line, goal chips, the composer's telegraph
 * for an order (`predict`, the page's "likely yes" / "later: …") and the end screen. It never reads a person's
 * needs, trust or plans (the page's inspector shows some of those; this adapter does not open it).
 *
 * Actions: use or skip a visible card, resume after an auto-pause, change speed, an order to a villager at a
 * place (plain, rushed, insisted, or with "you'll be safer"), and "Another day" at the Day-2 end. An order's
 * `promise` is the player's read: how much the goals on screen want that place, times how the telegraph reads.
 * Run through hf-colony-session.ts.
 */

import type {
  GameAdapter,
  Observation,
  PlayAction,
  PlayEvent,
} from '../../../packages/playtester/src/index.ts';
import { ColonyGame, SCENARIO_VERSION } from '../src/colony/sim/game.ts';
import { createFrameworkHumanSide } from '../src/colony/sim/human.ts';
import { type ColonyRules, CURRENT_RULES } from '../src/colony/sim/human-side.ts';
import type { PlaceId } from '../src/colony/sim/map.ts';
import type { OrderInput } from '../src/colony/sim/orders.ts';
import { Playback } from '../src/colony/sim/playback.ts';
import { clockOf, STORM_START, VILLAGERS, type VillagerId } from '../src/colony/sim/world-types.ts';

const TICK_MS = 125;
/** How a telegraph reads to a player: a likely yes is worth sending, a likely no barely. */
const READ: Record<string, number> = { assent: 0.9, complied: 0.55, notNow: 0.4, cannot: 0.08, willNot: 0.1 };
/** Bubble kinds as the player feels them. */
const BUBBLE: Record<string, { valence: number; salience: number }> = {
  assent: { valence: 0.3, salience: 0.6 },
  complied: { valence: -0.05, salience: 0.6 },
  notNow: { valence: -0.15, salience: 0.65 },
  cannot: { valence: -0.2, salience: 0.55 },
  willNot: { valence: -0.4, salience: 0.8 },
  thought: { valence: 0, salience: 0.25 },
};
const PLACES: readonly PlaceId[] = ['site', 'forest', 'field', 'kitchen', 'cedar', 'well'];
const PLACE_WORD: Partial<Record<PlaceId, string>> = {
  site: 'the house',
  forest: 'the forest',
  field: 'the field',
  kitchen: 'the kitchen',
  cedar: 'the big cedar',
  well: 'the well',
};
const name = (id: string) => (VILLAGERS.find((v) => v.id === id)?.name ?? id).replace(/^Hajja /, '');
const clock = (m: number) => {
  const c = clockOf(m);
  return `D${c.day} ${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
};

export class ColonyAdapter implements GameAdapter {
  name = 'twice-at-the-well';
  readonly pb = new Playback(createFrameworkHumanSide);
  orders = 0;
  private shown = new Set<string>();
  private moments = 0;
  private goalSeen = new Map<string, string>();
  private pauseSeen: string | null = null;
  private endedSeen = false;

  /** `rules` 3 plays the @3 rules (a before/after baseline); the page plays the current rules. */
  constructor(seed: number, rules: ColonyRules = CURRENT_RULES) {
    this.pb.handle({ type: 'init', seed, scenarioVersion: SCENARIO_VERSION, gen: 1, autoPause: true });
    if (rules !== CURRENT_RULES) this.pb.game = new ColonyGame(seed, createFrameworkHumanSide, rules);
  }

  private get g() {
    const g = this.pb.game;
    if (!g) throw new Error('no game');
    return g;
  }

  observe(): Observation {
    const g = this.g;
    const f = g.frame();
    const events: PlayEvent[] = [];
    for (const v of f.human) {
      const b = v.bubble;
      if (!b || this.shown.has(b.id)) continue;
      this.shown.add(b.id);
      const k = BUBBLE[b.kind] ?? { valence: 0, salience: 0.3 };
      events.push({ kind: `said:${b.kind}`, summary: `${name(v.id)}: ${b.text}`, ...k, by: v.id });
    }
    for (const n of f.news) {
      const key = `hurt:${n.side}:${n.personId}:${n.minute}`;
      if (this.shown.has(key)) continue;
      this.shown.add(key);
      events.push({
        kind: `hurt:${n.side}`,
        summary: `${name(n.personId)} (${n.side}) ${n.how}`,
        valence: n.side === 'human' ? -0.5 : -0.3,
        salience: 0.8,
      });
    }
    for (const m of f.moments.slice(this.moments))
      events.push({ kind: `moment:${m.id}`, summary: m.line, valence: 0.5, salience: 0.9, by: m.personId });
    this.moments = f.moments.length;
    for (const goal of f.goals) {
      const st = `${goal.human.status}/${goal.classic.status}`;
      const was = this.goalSeen.get(goal.id);
      this.goalSeen.set(goal.id, st);
      if (was === undefined || was === st) continue;
      if (goal.human.status !== 'open' && was.split('/')[0] === 'open')
        events.push({
          kind: `goal:${goal.human.status}`,
          summary: `Human: ${goal.label} ${goal.human.status}`,
          valence: goal.human.status === 'met' ? 0.7 : -0.7,
          salience: 0.95,
        });
    }
    const p = this.pb.pause;
    const pauseKey = p ? `${p.kind}:${p.reason ?? ''}:${p.minute}` : null;
    if (p && p.kind === 'auto' && pauseKey !== this.pauseSeen)
      events.push({
        kind: `pause:${p.reason ?? 'auto'}`,
        summary: p.text,
        valence: p.reason === 'storm' ? -0.2 : 0,
        salience: p.reason === 'storm' ? 0.9 : 0.6,
      });
    this.pauseSeen = pauseKey;
    if (g.ended && !this.endedSeen) {
      this.endedSeen = true;
      const met = f.goals.filter((x) => x.human.status === 'met').length;
      events.push({
        kind: 'ending',
        summary: `the day ends: Human met ${met} of ${f.goals.length} goals`,
        valence: met === f.goals.length ? 0.9 : met === 0 ? -0.7 : 0.1,
        salience: 1,
      });
    }
    if (!g.ended) this.endedSeen = false;
    const card = f.nudges.length > 0;
    const stormNear = g.minute < STORM_START && STORM_START - g.minute < 180;
    return {
      clock: clock(g.minute),
      phase: g.ended ? 'end' : g.minute >= STORM_START && g.minute < STORM_START + 480 ? 'storm' : 'day',
      events,
      features: { pressure: Math.min(1, (card ? 0.5 : 0) + (stormNear ? 0.4 : 0) + (p ? 0.1 : 0)) },
      over: g.ended && !g.canContinue,
    };
  }

  /** How much the goals on screen want someone at `place` now (the player's read of the goal chips). */
  private want(place: PlaceId): number {
    const f = this.g.frame();
    const goal = (id: string) => f.goals.find((x) => x.id === id);
    const roof = goal('roof') ?? goal('project');
    const stock = goal('stock');
    const roofShort = roof && roof.human.status === 'open' ? 1 - roof.human.value / roof.targetValue : 0;
    const stockShort = stock && stock.human.status === 'open' ? 1 - stock.human.value / stock.targetValue : 0;
    const w: Partial<Record<PlaceId, number>> = {
      site: roofShort,
      forest: roofShort * 0.8,
      cedar: f.humanWorld.cedarFelled ? 0 : roofShort * 0.7,
      field: stockShort * 0.7,
      kitchen: stockShort,
      well: stockShort * 0.3,
    };
    return Math.max(0, Math.min(1, w[place] ?? 0));
  }

  actions(): PlayAction[] {
    const g = this.g;
    if (g.ended)
      return g.canContinue
        ? [{ id: 'continue', label: 'play another day', kind: 'continue', promise: 0.5 }]
        : [];
    const out: PlayAction[] = [];
    const f = g.frame();
    for (const n of f.nudges) {
      const pred = g.predict({ ...n.order, ...(n.prefill ?? {}) });
      out.push({
        id: `use:${n.id}`,
        label: `use the card: ${n.text}`,
        kind: 'card',
        promise: 0.35 + 0.6 * (READ[pred.kind] ?? 0.3),
        focus: 0.05,
      });
      out.push({ id: `skip:${n.id}`, label: `skip the card: ${n.text}`, kind: 'card', promise: 0.2 });
    }
    if (this.pb.paused && f.nudges.length === 0)
      out.push({ id: 'resume', label: 'resume', kind: 'time', promise: 0.65, focus: 0.01 });
    if (!this.pb.paused && f.nudges.length === 0 && this.pb.speed < 2)
      out.push({ id: 'faster', label: 'speed up', kind: 'time', promise: 0.3, focus: 0.01 });
    if (this.pb.speed > 1)
      out.push({ id: 'slower', label: 'slow down', kind: 'time', promise: 0.15, focus: 0.01 });
    for (const v of VILLAGERS) {
      const ranked = PLACES.map((pl) => ({ pl, w: this.want(pl) }))
        .filter((x) => x.w > 0.05)
        .sort((a, b) => b.w - a.w)
        .slice(0, 2);
      for (const { pl, w } of ranked) {
        // The order log shows an open card for this person and place: a player does not give it again.
        if (f.cards.some((x) => x.status === 'active' && x.order.personId === v.id && x.order.placeId === pl))
          continue;
        const base: OrderInput = { personId: v.id as VillagerId, placeId: pl };
        const read = READ[g.predict(base).kind] ?? 0.3;
        const label = `send ${name(v.id)} to ${PLACE_WORD[pl] ?? pl}`;
        out.push({ id: `order:${v.id}:${pl}`, label, kind: 'order', promise: w * read, focus: 0.12 });
        if (read < 0.5)
          out.push({
            id: `order:${v.id}:${pl}:insist`,
            label: `${label}, insisting`,
            kind: 'order',
            promise: w * 0.5,
            focus: 0.15,
            tags: ['confront'],
          });
        const risky = pl === 'cedar' || (g.minute >= STORM_START - 120 && pl !== 'kitchen');
        if (risky)
          out.push({
            id: `order:${v.id}:${pl}:safety`,
            label: `${label}: "you'll be safer"`,
            kind: 'order',
            promise: w * Math.max(read, 0.5),
            focus: 0.14,
          });
      }
    }
    return out;
  }

  apply(id: string): void {
    const g = this.g;
    const [verb, a, b, c] = id.split(':');
    if (verb === 'continue') {
      this.pb.handle({ type: 'continue' });
      this.pb.handle({ type: 'resume' });
    } else if (verb === 'resume') this.pb.handle({ type: 'resume' });
    else if (verb === 'faster') this.pb.handle({ type: 'setSpeed', speed: 2 });
    else if (verb === 'slower') this.pb.handle({ type: 'setSpeed', speed: 1 });
    else if (verb === 'use') {
      const n = g.visibleNudges().find((x) => x.id === a);
      if (!n) return;
      this.pb.handle({ type: 'order', input: { ...n.order, ...(n.prefill ?? {}) }, nudgeId: n.id });
      this.orders += 1;
    } else if (verb === 'skip' && a) this.pb.handle({ type: 'dismissNudge', id: a });
    else if (verb === 'order' && a && b) {
      const input: OrderInput = { personId: a as VillagerId, placeId: b as PlaceId };
      if (c === 'insist') input.insist = true;
      if (c === 'safety') input.appeal = 'safety';
      this.pb.handle({ type: 'order', input });
      this.orders += 1;
    }
  }

  advance(seconds: number): void {
    for (let ms = 0; ms < seconds * 1000; ms += TICK_MS) this.pb.handle({ type: 'tick', dtMs: TICK_MS });
  }
}
