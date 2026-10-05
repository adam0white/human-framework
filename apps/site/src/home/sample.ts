// biome-ignore-all format: kept under 46 columns so it reads on a phone; the page strips this line.
import {
  type Affordance,
  createPerson,
  decide,
  MINUTES_PER_YEAR,
  predict,
} from '@human/framework';

// Hungry, and holds theft forbidden.
const aylin = createPerson({
  id: 'aylin',
  name: 'Aylin',
  seed: 11, // same seed, same life
  now: 12 * 60, // noon on day 0
  bornAt: -28 * MINUTES_PER_YEAR,
  sex: 'female',
  body: { satiety: 0.2 },
  norms: [{
    normId: 'theft',
    standing: 'forbidden',
    conviction: 0.9,
  }],
  voices: [
    { voiceId: 'player', trust: 0.6 },
  ],
});

// The host offers what its world allows.
const offers: Affordance[] = [
  {
    id: 'wait', action: 'wait',
    label: 'wait',
    duration: 15, effort: 0,
    advertises: {},
  },
  {
    id: 'steal', action: 'steal',
    label: 'take bread from the cart',
    duration: 10, effort: 0.1,
    advertises: { food: 0.5 },
    norms: [
      {
        normId: 'theft',
        relation: 'violates',
      },
    ],
  },
];

// The player's word: one urge of many.
const suggestion = {
  voiceId: 'player',
  action: 'steal',
  strength: 1,
  insist: true,
};

// Preview: pure, draws no randomness.
export const answer =
  predict(aylin, offers, suggestion);

// Decide: chosen, recorded, explained.
export const record =
  decide(aylin, offers, { suggestion });
