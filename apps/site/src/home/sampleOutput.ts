/** What `sample.ts` returns, printed under the code on the page. `sample.test.ts` checks every value. */
export const SAMPLE_OUTPUT = {
  verdict: 'refused',
  kind: 'willNot',
  reason: 'norm:theft',
  says: "I won't steal, whatever you say.",
  chosen: 'wait',
  stealScore: '0.78',
  stealTerms: [
    ['need:food', '0.69'],
    ['suggestion:player', '0.60'],
    ['norm:theft', '-0.49'],
    ['effort', '-0.02'],
  ],
} as const;
