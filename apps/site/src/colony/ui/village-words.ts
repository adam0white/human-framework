import { HOST } from '../sim/human-world.ts';
import { VILLAGES, type Village } from '../sim/village.ts';
import { STORM_START } from '../sim/world-types.ts';
import { dayClock } from './contract.ts';

/** Offer availability, never a second food pool, capacity or promised choice. */
export function mealContext(village?: Village, compact = false): string {
  const at = village ? dayClock(VILLAGES[village].preparationAt) : 'the selected preparation time';
  const short = `Each completed pot adds to the same meal store; the Human cooking offer threshold rises from ${HOST.cookBelow} to ${HOST.cookBelowStorm} at ${at}.`;
  return compact
    ? short
    : short +
        ' This is an offer threshold, not a capacity or a guarantee. People eat from this store. A due meal duty can make cooking available earlier; ingredients and weather still matter, and people decide.';
}
export function preparationWords(village: Village): string {
  return `Preparation begins at ${dayClock(VILLAGES[village].preparationAt)}. The storm still arrives at ${dayClock(STORM_START)}. This changes preparation timing, not whether a person agrees or finishes work.`;
}

export const VILLAGE_WORDS: Record<Village, { choice: string; reply: string; season: string }> = {
  default: {
    choice: 'Maryam: “We have flour, and we can work. Let us be grateful and get to work.”',
    reply: 'Yusuf: “The roof comes first. We will deal with the weather when it comes.”',
    season: 'The elders watch for the usual signs.',
  },
  'early-warning': {
    choice: 'Samira: “Let us pray for time to store what we need.”',
    reply: 'Tariq: “And keep an eye on the sky. I would rather know early.”',
    season: 'The elders watch for an early sign of a storm.',
  },
};
