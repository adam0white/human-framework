import type { Village } from '../sim/village.ts';

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
