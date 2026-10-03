import type { EndSummary, GoalSide, GoalView } from '../sim/game.ts';
import { STOREROOM_STAGES } from '../sim/world-types.ts';

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
