/**
 * Test fixture (not used by the game, which runs human.ts). Placeholder HumanSide: runs the Classic AI on the Human pane's world and dresses it in the Human view
 * model, so the UI, worker and scoreboard can be built and tested before the framework adapter exists.
 * It invents nothing the Classic rules do not do: `assent` on accepted orders, `cannot` when the target is
 * down or dead (Classic's grey no-op), `notNow` "after I eat" when an auto-eat interrupt sets the order
 * aside. Trust never moves and nobody prays here; the scoreboard shows that honestly.
 */
import {
  CLASSIC,
  ClassicSim,
  type ClassicSnapshot,
  classicLabel,
  unitState,
} from '../../src/colony/sim/classic.ts';
import {
  type Bubble,
  emptyHumanEvents,
  type HumanMetrics,
  type HumanSide,
  type HumanSideEvents,
  type Prediction,
  type VillagerView,
  type WhyBreakdown,
  type WhyOption,
} from '../../src/colony/sim/human-side.ts';
import type { GameMap } from '../../src/colony/sim/map.ts';
import type { HumanOrder } from '../../src/colony/sim/orders.ts';
import {
  type ActionId,
  adhanAt,
  JOBS,
  type Minute,
  type SideWorld,
  type VillagerId,
  type VillagerSpec,
} from '../../src/colony/sim/world-types.ts';

/** How long a bubble stays in the view, in sim minutes (the UI adds real-time minimums). */
const BUBBLE_MINUTES = 40;
const THOUGHT_GAP = 90;

const ASSENT_LINES: Partial<Record<ActionId, string>> = {
  'gather-grain': 'Yes — to the field.',
  'gather-timber': 'Yes, I’ll bring timber.',
  'fell-cedar': 'The big cedar? Gladly.',
  'draw-water': 'I’ll draw water.',
  cook: 'I’ll get the pot on.',
  build: 'Yes — while it’s cool.',
  'raise-beam': 'Up it goes.',
  'shutter-house': 'I’ll shutter it.',
  eat: 'I could eat.',
  pray: 'Yes.',
  shelter: 'To the shelter.',
  sleep: 'Goodnight.',
};

const THOUGHTS: Partial<Record<ActionId, string>> = {
  eat: 'Something to eat first.',
  sleep: 'Time to sleep.',
  cook: 'The pot won’t fill itself.',
  'gather-timber': 'Back to the trees.',
  'gather-grain': 'The field, then.',
  'draw-water': 'Water’s low.',
  build: 'Another course of brick.',
  'raise-beam': 'The beam is next.',
  'carry-injured': 'Someone’s down — I’m coming.',
};

interface PlaceholderState {
  minute: Minute;
  bubbles: Record<string, Bubble>;
  lastThought: Record<string, Minute>;
  lastAction: Record<string, ActionId | null>;
  bubbleSeq: number;
  prayersDue: number;
  classic: ClassicSnapshot | null;
}

export class PlaceholderHumanSide implements HumanSide {
  readonly kind = 'placeholder';
  private sim: ClassicSim | null = null;
  private specs: readonly VillagerSpec[] = [];
  private s: PlaceholderState = {
    minute: 0,
    bubbles: {},
    lastThought: {},
    lastAction: {},
    bubbleSeq: 0,
    prayersDue: 0,
    classic: null,
  };

  init(seed: number, villagers: readonly VillagerSpec[], world: SideWorld, _map: GameMap): void {
    this.specs = villagers;
    this.sim = new ClassicSim(seed, villagers, world);
    for (const v of villagers) {
      this.s.lastThought[v.id] = -THOUGHT_GAP;
      this.s.lastAction[v.id] = null;
    }
  }

  private get classic(): ClassicSim {
    if (!this.sim) throw new Error('PlaceholderHumanSide used before init');
    return this.sim;
  }

  private bubble(b: Omit<Bubble, 'id' | 'minute'>, events: HumanSideEvents): Bubble {
    this.s.bubbleSeq += 1;
    const full: Bubble = { ...b, id: `h${this.s.bubbleSeq}`, minute: this.s.minute };
    this.s.bubbles[b.personId] = full;
    events.bubbles.push(full);
    return full;
  }

  step(untilMinute: Minute, orders: readonly HumanOrder[]): HumanSideEvents {
    const ev = emptyHumanEvents();
    const sim = this.classic;
    const m = untilMinute - 1;
    this.s.minute = m;
    for (const o of orders) {
      const u = sim.unit(o.personId);
      const noop = sim.noopReason(o.personId);
      if (noop) {
        const says = noop === 'dead' ? '…' : 'I can’t — I’m hurt.';
        const b = this.bubble({ personId: u.id, kind: 'cannot', text: says, orderId: o.orderId }, ev);
        ev.verdicts.push({ orderId: o.orderId, personId: u.id, kind: 'cannot', says, reason: 'capacity' });
        void b;
        continue;
      }
      sim.apply({
        orderId: o.orderId,
        personId: o.personId,
        action: o.action,
        placeId: o.placeId,
        rush: (o.suggestion.strength ?? 0) >= 0.9,
        rollKey: o.rollKey,
      });
      const says = ASSENT_LINES[o.action] ?? 'Yes.';
      this.bubble({ personId: u.id, kind: 'assent', text: says, orderId: o.orderId }, ev);
      ev.verdicts.push({ orderId: o.orderId, personId: u.id, kind: 'assent', says, reason: 'suggestion' });
    }

    if (adhanAt(m)) this.s.prayersDue += this.specs.filter((v) => v.prays).length;

    const ce = sim.step(m);
    for (const s of ce.suspended) {
      const says = 'Not yet —';
      this.bubble(
        { personId: s.personId, kind: 'notNow', text: says, counterOffer: 'after I eat', orderId: s.orderId },
        ev,
      );
      ev.updates.push({
        orderId: s.orderId,
        personId: s.personId,
        kind: 'notNow',
        says,
        reason: 'need:food',
        counterOffer: 'after I eat',
      });
    }
    for (const n of ce.noop) {
      ev.updates.push({
        orderId: n.orderId,
        personId: n.personId,
        kind: 'cannot',
        says: n.reason,
        reason: n.reason,
      });
    }
    for (const c of ce.completed) ev.completed.push({ orderId: c.orderId, personId: c.personId });
    ev.injuries.push(...ce.injuries);
    ev.deaths.push(...ce.deaths);

    // Thoughts: only when the chosen action changes and not ordered, at most once per THOUGHT_GAP.
    for (const u of sim.units) {
      const action = u.task?.action ?? null;
      const prev = this.s.lastAction[u.id] ?? null;
      this.s.lastAction[u.id] = action;
      if (!action || action === prev || u.task?.source === 'order') continue;
      const line = THOUGHTS[action];
      const last = this.s.lastThought[u.id] ?? -THOUGHT_GAP;
      if (!line || m - last < THOUGHT_GAP) continue;
      const cur = this.s.bubbles[u.id];
      if (cur && cur.kind !== 'thought' && m - cur.minute < BUBBLE_MINUTES) continue;
      this.s.lastThought[u.id] = m;
      this.bubble({ personId: u.id, kind: 'thought', text: line }, ev);
    }
    this.s.minute = untilMinute;
    return ev;
  }

  cancel(orderId: string): void {
    this.classic.cancel(orderId);
  }

  working(orderId: string): boolean {
    return this.classic.units.some((u) => u.task?.orderId === orderId);
  }

  view(): VillagerView[] {
    const sim = this.classic;
    return sim.units.map((u) => {
      const spec = this.specs[u.index];
      const b = this.s.bubbles[u.id];
      const live = b && this.s.minute - b.minute <= BUBBLE_MINUTES ? b : null;
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        x: u.x,
        y: u.y,
        state: unitState(u),
        action: u.task?.action ?? null,
        placeId: u.task?.placeId ?? null,
        label: classicLabel(sim, u),
        hp: Math.round(u.hp),
        needs: [
          { id: 'food', label: 'Food', value: 1 - u.hunger / 100, urgent: u.hunger >= CLASSIC.autoEatHunger },
          {
            id: 'sleep',
            label: 'Sleep',
            value: Math.max(0, 1 - u.awake / CLASSIC.sleepDeprivedAfter),
            urgent: u.awake > CLASSIC.sleepDeprivedAfter,
          },
          { id: 'health', label: 'Health', value: u.hp / 100, urgent: u.hp < 40 },
        ],
        emotion: null,
        trust: { value: spec?.trust ?? 0.5, history: [] },
        bubble: live,
        protest: false,
        carrying: u.carrying,
        carriedBy: u.carriedBy,
        lastDecisionId: `${u.id}@${this.s.minute}`,
      };
    });
  }

  why(personId: VillagerId, decisionId?: string): WhyBreakdown | null {
    const sim = this.classic;
    const u = sim.unit(personId);
    const spec = this.specs[u.index];
    const hunger = u.hunger / 100;
    const role = sim.roleJob(u);
    const current = u.task?.action ?? null;
    const ordered = u.task?.source === 'order';
    const candidates: ActionId[] = [];
    for (const a of [current, 'eat' as ActionId, role]) {
      if (a && !candidates.includes(a)) candidates.push(a);
    }
    const options: WhyOption[] = candidates.slice(0, 3).map((a) => {
      const terms = [];
      if (a === 'eat')
        terms.push({
          source: 'need:food',
          label: 'hunger',
          value: +(hunger * 1.2).toFixed(2),
          family: 'need' as const,
        });
      else
        terms.push({
          source: 'need:food',
          label: 'hunger pulls away',
          value: -(hunger * 0.5).toFixed(2),
          family: 'need' as const,
        });
      if (a === current && ordered)
        terms.push({
          source: 'suggestion:player',
          label: 'your order',
          value: 0.6,
          family: 'suggestion' as const,
        });
      if (a === role)
        terms.push({ source: 'habit', label: 'usual work', value: 0.3, family: 'habit' as const });
      terms.push({
        source: 'effort',
        label: 'effort',
        value: -JOBS[a].work / 300,
        family: 'effort' as const,
      });
      const utility = terms.reduce((s, t) => s + t.value, 0);
      return {
        affordanceId: a,
        action: a,
        label: JOBS[a].label,
        utility: +utility.toFixed(2),
        chosen: a === current,
        terms,
      };
    });
    // The placeholder does not weigh anything: the Classic rule picked the current action.
    // Show that rule as its own term so the chosen option is always the top-scoring one.
    const chosen = options.find((o) => o.chosen);
    if (chosen) {
      const best = Math.max(0, ...options.filter((o) => !o.chosen).map((o) => o.utility));
      const lift = +(best - chosen.utility + 0.1).toFixed(2);
      if (lift > 0) {
        chosen.terms.push({ source: 'rule:classic', label: 'Classic rule', value: lift, family: 'other' });
        chosen.utility = +(chosen.utility + lift).toFixed(2);
      }
    }
    options.sort((x, y) => Number(y.chosen) - Number(x.chosen) || y.utility - x.utility);
    return {
      personId,
      decisionId: decisionId ?? `${u.id}@${this.s.minute}`,
      minute: this.s.minute,
      narration: `${classicLabel(sim, u)}. (Placeholder: this side mirrors the Classic AI until the framework adapter lands.)`,
      intention: 'placeholder — no intention recorded',
      options,
      deltas: [],
      recalled: [],
      trust: { value: spec?.trust ?? 0.5, history: [] },
    };
  }

  predict(order: Omit<HumanOrder, 'orderId'>): Prediction {
    const sim = this.classic;
    const noop = sim.noopReason(order.personId);
    if (noop)
      return { personId: order.personId, action: order.action, kind: 'cannot', text: `Can’t: ${noop}` };
    const u = sim.unit(order.personId);
    if (u.hunger >= CLASSIC.autoEatHunger - 5) {
      return { personId: order.personId, action: order.action, kind: 'notNow', text: 'Later: hungry' };
    }
    return { personId: order.personId, action: order.action, kind: 'assent', text: 'Likely yes' };
  }

  metrics(): HumanMetrics {
    const units = this.classic.units;
    const alive = units.filter((u) => !u.dead);
    const morale =
      alive.length === 0
        ? 0
        : (alive.reduce((s, u) => s + (1 - u.hunger / 100) * (u.hp / 100), 0) / alive.length) * 2 - 1;
    const trust = this.specs.reduce((s, v) => s + v.trust, 0) / Math.max(1, this.specs.length);
    return { prayersKept: 0, prayersDue: this.s.prayersDue, morale, trust, alive: alive.length };
  }

  snapshot(): unknown {
    return structuredClone({ ...this.s, classic: this.classic.snapshot() });
  }

  restore(snapshot: unknown): void {
    const s = structuredClone(snapshot) as PlaceholderState;
    if (s.classic) this.classic.restore(s.classic);
    this.s = { ...s, classic: null };
  }
}

export const createPlaceholderHumanSide = (): HumanSide => new PlaceholderHumanSide();
