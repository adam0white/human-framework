/** Authored host meanings. Imported portable norms must match these exact definitions. */
import { DEFAULT_NORMS, type SourcedNorm } from '@adam0white/human-framework';
export const WELL_CAST_NORMS: SourcedNorm[] = [
  {
    id: 'aid-injured',
    label: 'Help the injured',
    standing: 'obligatory',
    provenance: { kind: 'authored-world', author: 'well', ruleId: 'well-responsibilities', edition: 'hf4' },
    exemptions: [],
    sources: [{ kind: 'assumption', ref: 'Twice at the Well host norm; standing chosen by the game design' }],
  },
  {
    id: 'feed-village',
    label: 'Feed the village',
    standing: 'obligatory',
    provenance: { kind: 'authored-world', author: 'well', ruleId: 'well-responsibilities', edition: 'hf4' },
    exemptions: [],
    sources: [
      {
        kind: 'assumption',
        ref: 'Twice at the Well host norm: the cook’s duty to the people who eat from her pot',
      },
    ],
  },
  {
    id: 'abandon-dependents',
    label: 'Leaving the people who depend on you unfed',
    standing: 'forbidden',
    provenance: { kind: 'authored-world', author: 'well', ruleId: 'well-responsibilities', edition: 'hf4' },
    exemptions: [],
    sources: [
      {
        kind: 'assumption',
        ref: 'The sole cook leaving a pending meal unprepared is treated as forbidden by this host (docs/games/colony.md §7 M3)',
      },
    ],
  },
  {
    id: 'daily-prayer',
    label: 'Pray at one’s own hours (Christian morning and evening prayer)',
    standing: 'recommended',
    provenance: { kind: 'authored-world', author: 'well', ruleId: 'well-understandings', edition: 'hf4' },
    exemptions: [],
    sources: [
      {
        kind: 'assumption',
        ref: 'Twice at the Well host norm for Danyal; standing chosen by the game design',
      },
    ],
  },
];

export const WATCH_CAST_NORMS: SourcedNorm[] = [
  {
    id: 'keep-watch',
    label: 'Keep the watch you stand',
    standing: 'obligatory',
    provenance: { kind: 'authored-world', author: 'watch', ruleId: 'keep-watch', edition: 'hf4' },
    exemptions: [],
    sources: [{ kind: 'assumption', ref: 'The Night Watch host norm; standing chosen by the game design' }],
  },
];

export const SITE_CAST_NORMS: SourcedNorm[] = [...DEFAULT_NORMS, ...WELL_CAST_NORMS, ...WATCH_CAST_NORMS];

/** Exact authored Valley catalog entry. Recognition does not implement its household share duty here. */
export const VALLEY_CAST_DUES: SourcedNorm = {
  id: 'dues',
  label: 'The valley household’s agreed share',
  standing: 'obligatory',
  provenance: { kind: 'authored-world', author: 'valley', ruleId: 'dues', edition: 'valley-cast-3' },
  exemptions: [],
  sources: [
    { kind: 'assumption', ref: 'Valley household share; each person understands the agreement locally' },
  ],
};
