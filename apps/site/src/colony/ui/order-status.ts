import type { PlaceId } from '../sim/map.ts';
import type { OrderCard, OrderInput } from '../sim/orders.ts';
import type { VillagerId } from '../sim/world-types.ts';

/** Visible place names. `site` is the House everywhere on screen (playtest item 12). */
export const PLACE_LABEL: Record<PlaceId, string> = {
  forest: 'Forest',
  cedar: 'Cedar',
  field: 'Field',
  well: 'Well',
  wellhouse: 'Well-house',
  kitchen: 'Kitchen',
  site: 'House',
  masjid: 'Mosque',
  'home-maryam': 'Home',
  'home-yusuf': 'Home',
  'home-idris': 'Home',
};

/** Keep the latest outcome visible too: completion or lapse must not silently erase the order. */
export function latestPersonOrder(cards: readonly OrderCard[], id: VillagerId | null): OrderCard | undefined {
  return id ? cards.findLast((card) => card.order.personId === id) : undefined;
}

/** Presentation only; the simulation owns whether an order stands and how the person answered. */
export function personOrderStatus(
  card: OrderCard,
  side: 'human' | 'classic' = 'human',
  compact = false,
): string {
  const chip = card[side];
  const label = chip.label?.replace(/[.!]$/, '');
  const reason = (chip.says ?? label)?.replace(/[.!]$/, '').split(';').at(-1)?.trim();
  let answer: string;
  if (card.status === 'cancelled') answer = 'cancelled';
  else if (card.status === 'replaced') answer = 'replaced';
  else if (chip.state === 'willNot') answer = `won't${reason && reason.length <= 32 ? ` — “${reason}”` : ''}`;
  else if (chip.state === 'cannot' || chip.state === 'noop')
    answer = `can't${reason && reason.length <= 28 ? ` — ${reason}` : ''}`;
  else if (chip.settled || chip.state === 'done') {
    answer = chip.outcome ?? 'done';
    if (compact && chip.outcome) {
      const result = chip.outcome.replace(/^Day \d+ · \d{2}:\d{2} · /, '').split('. Day ')[0] ?? chip.outcome;
      const now = chip.outcome.split('. Now: ')[1];
      answer = result + (now ? `; now ${now}` : '');
    }
  } else if (card.status === 'lapsed') answer = "didn't get to it";
  else if (chip.state === 'notNow') {
    // A counter-offer can name another job. Only a stated condition describes a promise here.
    const condition = label?.match(/(?:after|when)\b.*$/i)?.[0];
    answer = condition && condition.length <= 42 ? `later, ${condition}` : 'waiting';
  } else if (chip.state === 'pending') answer = 'waiting';
  else answer = chip.state === 'complied' ? 'on it, under protest' : 'on it';
  return `${PLACE_LABEL[card.order.placeId]}: ${answer}`;
}

/** A retry preserves the request, including rush, appeal and insist. It receives a new order id. */
export function repeatPersonOrder(card: OrderCard): OrderInput {
  const { personId, placeId, rush, insist, appeal } = card.order;
  return { personId, placeId, rush, insist, ...(appeal ? { appeal } : {}) };
}

/** Describe the edition recorded on the order, including legacy one-meal/sleep Home. */
export function homeOrderMeaning(card: OrderCard): string | null {
  if (!card.order.placeId.startsWith('home-')) return null;
  if (card.order.action === 'shelter')
    return 'Sending someone home asks them to stay indoors until dawn (05:00). Cancel the order or give a new one to end this request. Human villagers can still refuse or leave to meet a need or keep a duty.';
  return card.order.action === 'sleep'
    ? 'Home asks for one sleep, normally until dawn. When sleep ends, they choose their own work again.'
    : 'Home asks them to eat once. After eating, they choose their own work again; it does not keep them indoors.';
}
