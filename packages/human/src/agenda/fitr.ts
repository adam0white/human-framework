/** SCOPE: pure zakat al-fitr plan from held understanding and supplied eligibility.
 * Amount/resources/deadline are host premises. No transfer, ruling or acceptance is inferred.
 * Source: research/eid-and-mourning-sources.md §2 and research/decisions.md GDI-162. */
import type { CommitmentData, DeepReadonly, HeldNorm, Knowledge, NormDefinition } from '../run-schema.ts';
export const ZAKAT_AL_FITR_NORM: NormDefinition = {
  id: 'zakat-al-fitr',
  label: 'Pay zakat al-fitr',
  standing: 'obligatory',
  sources: [
    {
      kind: 'hadith',
      ref: 'Bukhari1503,1509; verified via substitute sources in research/eid-and-mourning-sources.md §2',
    },
    { kind: 'interpretation', ref: 'TDV Fitre and Diyanet; research/eid-and-mourning-sources.md §2' },
    {
      kind: 'assumption',
      ref: 'Host eligibility/resource conversion/preferred deadline; research/decisions.md GDI-162',
    },
  ],
  provenance: {
    kind: 'religious',
    researchRef: 'research/eid-and-mourning-sources.md#2',
    interpretationRef: 'research/decisions.md#GDI-162',
  },
  exemptions: [],
};
export type ZakatAlFitrOptions = {
  id: string;
  eligible: Knowledge<boolean>;
  amount: number;
  from: number;
  deadline: number;
  action: string;
  normId: string;
};
export type ZakatAlFitrPlan = { amount: number; commitment: CommitmentData; payment: CommitmentData };
export function zakatAlFitr(
  norms: DeepReadonly<readonly HeldNorm[]>,
  options: DeepReadonly<ZakatAlFitrOptions>,
): ZakatAlFitrPlan | undefined {
  if (options.eligible.kind === 'unobserved' || !options.eligible.value) return undefined;
  const held = norms.find((n) => n.normId === options.normId);
  if (!held || held.conviction <= 0 || !['obligatory', 'recommended'].includes(held.standing))
    return undefined;
  if (
    !options.id ||
    !options.action.trim() ||
    !Number.isFinite(options.amount) ||
    options.amount <= 0 ||
    !Number.isSafeInteger(options.from) ||
    !Number.isSafeInteger(options.deadline) ||
    options.deadline <= options.from
  )
    throw new RangeError('Invalid supplied fitr amount, action or window');
  return {
    amount: options.amount,
    commitment: {
      id: `${options.id}:preferred`,
      kind: 'appointment',
      actions: [options.action],
      from: options.from,
      until: options.deadline,
      completion: 'end',
      importance: 0.5,
      label: 'preferred zakat al-fitr payment time',
    },
    payment: {
      id: `${options.id}:payment`,
      kind: 'duty',
      actions: [options.action],
      from: options.from,
      until: Number.MAX_SAFE_INTEGER,
      completion: 'end',
      normId: options.normId,
      importance: 0.5,
      label: 'outstanding zakat al-fitr payment',
    },
  };
}
export function readZakatAlFitr(
  plan: DeepReadonly<ZakatAlFitrPlan>,
  paid: number,
  now: number,
): { outstanding: number; deadlinePassed: boolean } {
  if (!Number.isFinite(paid) || paid < 0 || !Number.isSafeInteger(now))
    throw new RangeError('Invalid confirmed payment or clock');
  return { outstanding: Math.max(0, plan.amount - paid), deadlinePassed: now > plan.commitment.until };
}
