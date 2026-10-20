/** Start-of-run preparation only. Weather, shelter, shutters and personal priorities keep their own rules. */
import { at, WARNING_AT } from './world-types.ts';

export const VILLAGES = {
  default: { label: 'The storm comes when it comes', preparationAt: WARNING_AT },
  'early-warning': { label: 'Early warning: the elders read the sky early', preparationAt: at(2, 12, 0) },
} as const;
export type Village = keyof typeof VILLAGES;
