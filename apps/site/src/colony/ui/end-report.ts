import type { EndSummary } from '../sim/game.ts';

/**
 * Game design review (GD2): the report never said what the orders changed. One sentence from the Human-minus-Solo
 * difference (same people, same seed, with and without your orders).
 */
export function ordersChanged(summary: EndSummary): string {
  const { scoreboard: sb, solo, character: ch } = summary;
  if (summary.orders === 0) return 'You gave no orders, so Human and Solo are the same run.';
  const diffs: string[] = [];
  summary.goals.forEach((g, i) => {
    const s = summary.soloGoals[i];
    const word = { met: 'met', failed: 'missed', open: 'undecided' } as const;
    if (s && s.status !== g.human.status)
      diffs.push(`${g.label.toLowerCase()} ${word[g.human.status]} (without you: ${word[s.status]})`);
  });
  const num = (label: string, h: number, s: number, unit = '') => {
    if (h !== s) diffs.push(`${label} ${h}${unit} (without you: ${s}${unit})`);
  };
  num('meals stored', sb.human.meals, solo.meals);
  num('house', sb.human.housePct, solo.housePct, '%');
  num('injuries', sb.human.injuries, solo.injuries);
  num('prayers kept', ch.prayersKept, solo.prayersKept);
  num('trust in you', Math.round(ch.trust * 100), Math.round(solo.trust * 100), '%');
  // Solo is the whole run without orders, so the count is every order of the run, not only this report's span.
  const n = summary.orders;
  const given = `${n} order${n === 1 ? '' : 's'}${summary.day === 3 ? ' over the run' : ''}`;
  if (diffs.length === 0)
    return `Your ${given} changed nothing in the Human village: it came out as it would have without you.`;
  return `Your ${given} changed: ${diffs.join('; ')}. Everything else came out as it would have without you.`;
}
