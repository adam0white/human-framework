import { type Affordance, createPerson, MINUTES_PER_YEAR, predict } from '@human/framework';

// A hungry person who holds theft forbidden.
const aylin = createPerson({
  id: 'aylin',
  name: 'Aylin',
  seed: 11, // same seed, same life
  now: 12 * 60, // noon on day 0
  bornAt: -28 * MINUTES_PER_YEAR,
  sex: 'female',
  body: { satiety: 0.2 },
  norms: [{ normId: 'theft', standing: 'forbidden', conviction: 0.9 }],
  voices: [{ voiceId: 'player', trust: 0.6 }],
});

// The host offers what the world allows.
const offers: Affordance[] = [
  { id: 'wait', action: 'wait', label: 'wait', duration: 15, effort: 0, advertises: {} },
  {
    id: 'steal',
    action: 'steal',
    label: 'take bread from the cart',
    duration: 10,
    effort: 0.1,
    advertises: { food: 0.5 },
    norms: [{ normId: 'theft', relation: 'violates' }],
  },
];

// The player's word is one urge among many.
export const answer = predict(aylin, offers, {
  voiceId: 'player',
  action: 'steal',
  strength: 1,
  insist: true,
});
// answer.verdict: 'refused', answer.kind: 'willNot'
// answer.says: a line in her own words
