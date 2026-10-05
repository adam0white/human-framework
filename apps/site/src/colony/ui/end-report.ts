import { type EndSummary, GOAL_JUDGE, type GoalSide, type GoalView, STOCK_GOAL } from '../sim/game.ts';
import type { Hindsight } from '../sim/hindsight.ts';
import type { OrderCard } from '../sim/orders.ts';
import { HOUSE_STAGES, STOREROOM_STAGES, type VillagerId } from '../sim/world-types.ts';
import { dayClock, hhmm } from './contract.ts';

/** A goal's number as the chips show it. */
export function goalValue(g: Pick<GoalView, 'id' | 'target'>, s: GoalSide): string {
  if (g.id === 'roof') return `${Math.floor(s.value)}/10`;
  if (g.id === 'stock') return `${s.value} meals`;
  if (g.id === 'lives') return `${s.value}/6`;
  // The Day-3 project is the store-room on both sides (a side still finishing the house shows 0).
  return `${s.value}/${STOREROOM_STAGES}`;
}
/** Prayers kept as a share of those due, as the report table shows it. */
export const share = (kept: number, due: number) => (due > 0 ? `${Math.round((100 * kept) / due)}%` : '–');
export const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * Game design review (GD2): the report never said what the orders changed. One sentence from the Human-minus-Solo
 * difference (same people, same seed, with and without your orders).
 */
export function ordersChanged(summary: EndSummary): string {
  const { scoreboard: sb, solo, character: ch } = summary;
  if (summary.orders === 0) return 'You gave no orders, so Human and Solo are the same run.';
  // Exactly the rows of the report's tables, in the tables' units, so "everything else" is true of what is shown.
  const diffs: string[] = [];
  const word = { met: 'met', failed: 'missed', open: 'undecided' } as const;
  summary.goals.forEach((g, i) => {
    const s = summary.soloGoals[i];
    if (!s) return;
    const label = g.label.toLowerCase();
    const hv = goalValue(g, g.human);
    const sv = goalValue(g, s);
    if (s.status !== g.human.status)
      diffs.push(`${label} ${word[g.human.status]}, ${hv} (without you: ${word[s.status]}, ${sv})`);
    else if (hv !== sv) diffs.push(`${label} ${hv} (without you: ${sv})`);
  });
  const row = (label: string, h: string, s: string) => {
    if (h !== s) diffs.push(`${label} ${h} (without you: ${s})`);
  };
  row('meals stored', String(sb.human.meals), String(solo.meals));
  row('house', `${sb.human.housePct}%`, `${solo.housePct}%`);
  row('injuries', String(sb.human.injuries), String(solo.injuries));
  row('prayers kept', share(ch.prayersKept, ch.prayersDue), share(solo.prayersKept, solo.prayersDue));
  row('morale', ch.morale.toFixed(2), solo.morale.toFixed(2));
  row('trust in you', pct(ch.trust), pct(solo.trust));
  // Solo is the whole run without orders, so the count is every order of the run, not only this report's span.
  const n = summary.orders;
  const given = `${n} order${n === 1 ? '' : 's'}${summary.day === 3 ? ' over the run' : ''}`;
  if (diffs.length === 0)
    return `Your ${given} changed nothing in the Human village: it came out as it would have without you.`;
  return `Your ${given} changed: ${diffs.join('; ')}. Everything else in the tables below came out as it would have without you.`;
}

// ---------------------------------------------------------------------------------------------
// Near misses and hindsight (Day-2 report)
// ---------------------------------------------------------------------------------------------

const NAMES: Record<VillagerId, string> = {
  maryam: 'Maryam',
  yusuf: 'Yusuf',
  tariq: 'Tariq',
  idris: 'Idris',
  samira: 'Samira',
  danyal: 'Danyal',
};

/** "Yusuf, Tariq and Idris". */
export function nameList(ids: readonly VillagerId[]): string {
  const n = ids.map((id) => NAMES[id]);
  return n.length <= 1 ? (n[0] ?? '') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
}

const NUMBER = ['no', 'One', 'Two', 'Three', 'Four'];
/** A pot gives this many meals (both sides, colony.md §10). */
const POT_MEALS = 4;

/**
 * One line per narrowly missed Day-2 goal and side: a roof put on after 19:00 (exact minutes), a roof one or two
 * stages short (with the next stage's progress), a store at most one pot short. Wider misses get no line.
 */
export function nearMisses(summary: EndSummary): { side: 'Classic' | 'Human'; text: string }[] {
  if (summary.day !== 2) return [];
  const out: { side: 'Classic' | 'Human'; text: string }[] = [];
  const sides = [
    ['Classic', 'classic', summary.deadline.classic],
    ['Human', 'human', summary.deadline.human],
  ] as const;
  const roof = summary.goals.find((g) => g.id === 'roof');
  const stock = summary.goals.find((g) => g.id === 'stock');
  for (const [side, k, d] of sides) {
    if (roof?.[k].status === 'failed') {
      if (d.roofAt !== null && d.roofAt > GOAL_JUDGE) {
        out.push({
          side,
          text: `Roofed at ${hhmm(d.roofAt)}, ${d.roofAt - GOAL_JUDGE} min after the storm came.`,
        });
      } else if (d.houseAtStorm !== null && d.houseAtStorm >= HOUSE_STAGES - 2) {
        const short = HOUSE_STAGES - Math.floor(d.houseAtStorm);
        const done = Math.round((d.houseAtStorm % 1) * 100);
        out.push({
          side,
          text: `${NUMBER[short]} roof stage${short === 1 ? '' : 's'} short at 19:00${done > 0 ? `; the next was ${done}% done` : ''}.`,
        });
      }
    }
    const meals = d.stockAtStorm;
    if (stock?.[k].status === 'failed' && meals !== null && STOCK_GOAL - meals <= POT_MEALS) {
      const short = STOCK_GOAL - meals;
      out.push({
        side,
        text: `${NUMBER[short] ?? short} meal${short === 1 ? '' : 's'} short of ${STOCK_GOAL}; one more pot (${POT_MEALS} meals) would have done it.`,
      });
    }
  }
  return out;
}

/** The hindsight sentence: what the simple good-order plan does from the latest branch that wins. */
export function hindsightLine(h: Hindsight): string {
  const from = h.from === 0 ? 'From dawn on Day 1' : `From ${dayClock(h.from)}`;
  const cook = h.cook ? ', with Maryam cooking from D2 13:00,' : '';
  const roof = h.roofAt !== null ? `roofs the house at ${dayClock(h.roofAt)}` : 'meets the goals';
  const kept = h.from === 0 ? '' : ' Your orders before then are kept.';
  return `${from}, rushing ${nameList(h.builders)} to the house${cook} ${roof} with ${h.stock} meals in store: all three goals met.${kept}`;
}

// ---------------------------------------------------------------------------------------------
// Order outcomes (what each side did with an order)
// ---------------------------------------------------------------------------------------------

/** Classic's outcome for an order; a no-op names its reason ("could not (no timber)"). */
export function classicOutcome(card: OrderCard): string {
  const c = card.classic;
  if (c.state === 'noop') return `could not${c.label ? ` (${c.label})` : ''}`;
  if (c.state === 'pending') return 'not reached';
  if (c.settled || c.state === 'done') return 'done';
  return 'still at it';
}

/** The Human answers as quotes: the first and, when an update replaced it, the last. */
export function humanQuotes(card: OrderCard): string {
  const h = card.human;
  const last = h.label;
  const first = h.first?.label;
  if (!last) return '';
  if (first && first !== last) return `“${first}”, then “${last}”`;
  return `“${last}”`;
}

/**
 * Human's outcome. A refusal reads "refused" although the card then closes: a refusal settles the card, which
 * the old status word showed as "done". A "not now" that was carried out later is "done later".
 */
export function humanOutcome(card: OrderCard): string {
  const h = card.human;
  switch (h.state) {
    case 'willNot':
      return 'refused';
    case 'cannot':
      return 'could not';
    case 'complied':
      return h.settled ? 'done under protest' : 'under protest';
    case 'done':
      return h.first?.state === 'notNow' ? 'done later' : 'done';
    case 'assent':
      return h.settled ? 'done' : 'said yes';
    case 'notNow':
      return h.settled ? 'done later' : 'not now';
    case 'pending':
      return 'no answer yet';
    default:
      return h.state;
  }
}

/** The card's own end state, only where it adds something: "lapsed", "cancelled", "open at the end". */
export function cardEnd(card: OrderCard): string | null {
  if (card.status === 'lapsed') return 'lapsed';
  if (card.status === 'cancelled') return 'cancelled';
  if (card.status === 'active') return 'open at the end';
  return null;
}
