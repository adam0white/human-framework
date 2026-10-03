/**
 * The shared order queue (spec §3). The player is one voice; each order becomes one card that fans out to
 * both sides at the same sim minute: Classic receives a command, the Human side a Suggestion. Pure TS.
 */
import type { Suggestion } from '@human/framework';
import type { PlaceId } from './map.ts';
import {
  type ActionId,
  BEAM_STAGE,
  HOUSE_STAGES,
  type HouseState,
  isSleepTime,
  type Minute,
  ORDER_LIFETIME,
  SHUTTER_AVAILABLE,
  type VillagerId,
  weatherAt,
} from './world-types.ts';

export const PLAYER_VOICE = 'player';

export type AppealChip = 'children' | 'duty' | 'safety';

export const APPEALS: readonly { id: AppealChip; label: string; key: NonNullable<Suggestion['appeal']> }[] = [
  { id: 'children', label: 'for the children', key: 'benevolence' },
  { id: 'duty', label: 'it’s your duty', key: 'duty' },
  { id: 'safety', label: 'you’ll be safer', key: 'safety' },
];

/** What the player expresses: tap a villager, tap a place, optional rush / insist / appeal. */
export interface OrderInput {
  personId: VillagerId;
  placeId: PlaceId;
  rush?: boolean;
  insist?: boolean;
  appeal?: AppealChip;
}

export interface Order {
  id: string;
  /** Sim minute the order was given; applied to both sides at the next minute boundary. Lapse counts from here. */
  issuedAt: Minute;
  /**
   * Key for the shared scenario rolls (the cedar): the director card's minute for an order given from a card,
   * else `issuedAt`. Kept apart from `issuedAt` so a late tap does not change the seeded outcome nor shorten the
   * order's lifetime.
   */
  rollKey: Minute;
  personId: VillagerId;
  placeId: PlaceId;
  action: ActionId;
  rush: boolean;
  insist: boolean;
  appeal?: AppealChip;
}

export interface InferContext {
  minute: Minute;
  house: HouseState;
  cedarFelled: boolean;
}

/** Job inferred from the place (spec §3 table). Inference reads the issuing side's world view. */
export function inferAction(placeId: PlaceId, ctx: InferContext): ActionId {
  switch (placeId) {
    case 'forest':
      return 'gather-timber';
    case 'cedar':
      return ctx.cedarFelled ? 'gather-timber' : 'fell-cedar';
    case 'field':
      return 'gather-grain';
    case 'well':
    case 'wellhouse':
      return 'draw-water';
    case 'kitchen':
      return 'cook';
    case 'site':
      if (ctx.minute >= SHUTTER_AVAILABLE && !ctx.house.shuttered && ctx.house.stage < BEAM_STAGE) {
        return 'shutter-house';
      }
      if (ctx.house.stage === BEAM_STAGE - 1) return 'raise-beam';
      return ctx.house.stage >= HOUSE_STAGES ? 'shutter-house' : 'build';
    case 'masjid':
      return weatherAt(ctx.minute).risky ? 'shelter' : 'pray';
    case 'home-maryam':
    case 'home-yusuf':
    case 'home-idris':
      return isSleepTime(ctx.minute) ? 'sleep' : 'eat';
  }
}

/** Suggestion strength (spec §3): plain 0.6, rush 0.9. */
export function strengthOf(order: Pick<Order, 'rush'>): number {
  return order.rush ? 0.9 : 0.6;
}

/** What the Classic side receives. */
export interface ClassicCommand {
  orderId: string;
  personId: VillagerId;
  action: ActionId;
  placeId: PlaceId;
  rush: boolean;
  /** Keys the scenario roll for risky jobs so both sides share it (the order's `rollKey`). */
  rollKey: Minute;
}

/** What a HumanSide receives: the same order, already mapped to the framework's Suggestion fields. */
export interface HumanOrder {
  orderId: string;
  personId: VillagerId;
  action: ActionId;
  placeId: PlaceId;
  /** Keys the scenario roll for risky ordered work, shared with Classic (the order's `rollKey`). */
  rollKey: Minute;
  suggestion: Suggestion;
}

/** Fan one order out to both sides identically. */
export function fanOut(order: Order): { classic: ClassicCommand; human: HumanOrder } {
  const appealKey = APPEALS.find((a) => a.id === order.appeal)?.key;
  const suggestion: Suggestion = {
    voiceId: PLAYER_VOICE,
    action: order.action,
    strength: strengthOf(order),
    ...(order.insist ? { insist: true } : {}),
    ...(appealKey ? { appeal: appealKey } : {}),
  };
  return {
    classic: {
      orderId: order.id,
      personId: order.personId,
      action: order.action,
      placeId: order.placeId,
      rush: order.rush,
      rollKey: order.rollKey,
    },
    human: {
      orderId: order.id,
      personId: order.personId,
      action: order.action,
      placeId: order.placeId,
      rollKey: order.rollKey,
      suggestion,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------------------------

/** Per-side result chip. Classic: ok / done / noop. Human: the verdict colour. */
export type ChipState =
  | 'pending'
  | 'ok'
  | 'done'
  | 'noop'
  | 'assent'
  | 'notNow'
  | 'complied'
  | 'cannot'
  | 'willNot';

export interface SideChip {
  state: ChipState;
  label?: string;
  /** That side has finished with the card (completed the job). Refusals and no-ops settle implicitly. */
  settled?: boolean;
}

export type CardStatus = 'active' | 'done' | 'cancelled' | 'lapsed';

export interface OrderCard {
  order: Order;
  status: CardStatus;
  classic: SideChip;
  human: SideChip;
}

/** The order book shared by both sides. Deterministic ids: o1, o2, ... */
export class OrderBook {
  private next = 1;
  cards: OrderCard[] = [];
  /** Orders stamped but not yet applied (applied at the next minute boundary). */
  private pending: Order[] = [];

  issue(input: OrderInput, minute: Minute, action: ActionId, rollKey: Minute = minute): Order {
    const order: Order = {
      id: `o${this.next++}`,
      issuedAt: minute,
      rollKey,
      personId: input.personId,
      placeId: input.placeId,
      action,
      rush: input.rush ?? false,
      insist: input.insist ?? false,
      ...(input.appeal ? { appeal: input.appeal } : {}),
    };
    this.pending.push(order);
    this.cards.push({ order, status: 'active', classic: { state: 'pending' }, human: { state: 'pending' } });
    return order;
  }

  /** Remove and return the orders due at this boundary, in issue order. */
  takeDue(): Order[] {
    const due = this.pending;
    this.pending = [];
    return due;
  }

  card(orderId: string): OrderCard | undefined {
    return this.cards.find((c) => c.order.id === orderId);
  }

  cancel(orderId: string): boolean {
    const c = this.card(orderId);
    if (c?.status !== 'active') return false;
    c.status = 'cancelled';
    this.pending = this.pending.filter((o) => o.id !== orderId);
    return true;
  }

  setChip(orderId: string, side: 'classic' | 'human', chip: SideChip): void {
    const c = this.card(orderId);
    if (!c) return;
    c[side] = chip;
    if (c.status === 'active' && isSettled(c.classic) && isSettled(c.human)) c.status = 'done';
  }

  /**
   * Grey out cards older than the order lifetime. `exempt` keeps a card open past it (spec §3: a card persists until
   * assented-and-completed, so one whose job is under way does not lapse mid-job). Returns ids that lapsed.
   */
  lapse(minute: Minute, exempt?: (card: OrderCard) => boolean): string[] {
    const lapsed: string[] = [];
    for (const c of this.cards) {
      if (c.status === 'active' && minute - c.order.issuedAt >= ORDER_LIFETIME && !exempt?.(c)) {
        c.status = 'lapsed';
        lapsed.push(c.order.id);
      }
    }
    return lapsed;
  }

  activeFor(personId: VillagerId): OrderCard[] {
    return this.cards.filter((c) => c.status === 'active' && c.order.personId === personId);
  }
}

/** A chip is settled when that side has finished with the card (completed, refused or no-op). */
export function isSettled(chip: SideChip): boolean {
  return (
    chip.settled === true ||
    chip.state === 'done' ||
    chip.state === 'noop' ||
    chip.state === 'cannot' ||
    chip.state === 'willNot'
  );
}
