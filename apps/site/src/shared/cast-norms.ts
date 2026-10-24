/** Authored host meanings. Imported portable norms must match these exact definitions. */
import { DEFAULT_NORMS, type NormDefinition } from '@adam0white/human-framework';
export const WELL_CAST_NORMS: NormDefinition[] = [
  {
    id: 'aid-injured',
    label: 'Help the injured',
    standing: 'obligatory',
    sources: [{ kind: 'assumption', ref: 'Twice at the Well host norm; standing chosen by the game design' }],
  },
  {
    id: 'feed-village',
    label: 'Feed the village',
    standing: 'obligatory',
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
    sources: [
      {
        kind: 'assumption',
        ref: 'Twice at the Well host norm for Danyal; standing chosen by the game design',
      },
    ],
  },
];

export const WATCH_CAST_NORMS: NormDefinition[] = [
  {
    id: 'keep-watch',
    label: 'Keep the watch you stand',
    standing: 'obligatory',
    sources: [{ kind: 'assumption', ref: 'The Night Watch host norm; standing chosen by the game design' }],
  },
];

export const SITE_CAST_NORMS = [...DEFAULT_NORMS, ...WELL_CAST_NORMS, ...WATCH_CAST_NORMS];
