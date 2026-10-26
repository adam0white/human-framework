/**
 * SCOPE: frozen literal-v1 built-in wording overlays. Counts, indices and slots match the
 * original packs. Hosts retain replacement/extension precedence. This changes newly rendered
 * text only: no stored-text rewrite, label inference, selection, decision rules or RNG draws.
 * The legacy-style pack only removes the assumed water location; plain English stays separate.
 */
export const LITERAL_EN_LINES: Readonly<Record<string, readonly string[]>> = {
  'need:water': ["I'm parched. Water first.", 'I need a drink of water.', 'Thirsty — I need water.'],
};

export const LITERAL_PLAIN_EN_LINES: Readonly<Record<string, readonly string[]>> = {
  'need:water': [
    'I am very thirsty. I will get water first.',
    'I need a drink of water.',
    'I am thirsty, so I need water.',
  ],
  'cite.bad': ['I remember something bad: {summary}'],
  'voice.modified.default': ['something similar'],
};
