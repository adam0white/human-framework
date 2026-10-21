import type { EndSummary } from '../sim/game.ts';

/** A small convention for the two villages, using only their existing end report. */
export function wellTally(summary: Pick<EndSummary, 'goals' | 'scoreboard'>): string[] {
  return (['classic', 'human'] as const).map((side) => {
    const goals = summary.goals.filter((goal) => goal[side].status === 'met').length;
    const meals = Math.max(0, Math.floor(summary.scoreboard[side].meals));
    return `${side === 'classic' ? 'Classic' : 'Human'}: ${goals + meals} marks — ${goals} goals met + ${meals} meals left; one mark each`;
  });
}
