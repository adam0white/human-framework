/**
 * SCOPE: explicit opt-in zakat al-fitr planning under a person's sourced held understanding.
 * Hosts supply eligibility, units, dates and confirmed cumulative receipts. A norm-free preferred-time
 * reminder is separate from the norm-linked payment duty, which stays actionable through MAX_MINUTE
 * (the finite simulation horizon, not a religious deadline). Both require completion-time admission.
 * Adopt both with promise; full-payment offers must fulfill both adopted ids. Partial transfers use
 * another action. The host verifies and transfers resources before emitting full-payment completion.
 * No transfer, receipt storage, ruling or Person mutation occurs here. No new lateness severity or
 * first-opportunity detection is inferred. Ordinary missed-plan costs remain. See decisions.md GDI-162.
 */
import type { Commitment, Minute, NormDefinition, Person } from '../types.ts';
import { MAX_MINUTE } from '../types.ts';

/** Add to a host's catalog explicitly; never added to DEFAULT_NORMS. */
export const ZAKAT_AL_FITR_NORM: NormDefinition = {
  id: 'zakat-al-fitr',
  label: 'Pay zakat al-fitr',
  standing: 'obligatory',
  sources: [
    {
      kind: 'hadith',
      ref: 'Bukhari 1503, 1509; via substitute sites in research/eid-and-mourning-sources.md §2',
    },
    {
      kind: 'interpretation',
      ref: 'TDV Fitre and Diyanet: amount, eligibility and late debt; research/eid-and-mourning-sources.md §2',
    },
    {
      kind: 'assumption',
      ref: 'Host-assessed eligibility, resource conversion and preferred deadline: research/decisions.md GDI-162',
    },
  ],
};

export interface ZakatAlFitrOptions {
  enabled: boolean;
  /** Host assessment under this person's understanding, not a framework ruling. */
  eligible: boolean;
  /** Total for this occasion in the host's existing resource units; no currency default. */
  amount: number;
  from: Minute;
  /** Last admitted before-prayer minute (inclusive, as in Commitment windows), supplied by the host. */
  deadline: Minute;
  /** Unique to this occasion; only full, verified payment completes this action. */
  action: string;
  normId?: string;
}
export interface ZakatAlFitrPlan {
  amount: number;
  /** Preferred-time reminder; no norm link. */
  commitment: Omit<Commitment, 'id' | 'status'>;
  /** Outstanding payment duty; host-confirmed full payment keeps it even after preferred time. */
  payment: Omit<Commitment, 'id' | 'status'>;
}

/** Pure opt-in calendar recipe. Absent/disabled options and absent held understanding produce no duty. */
export function zakatAlFitr(person: Person, options?: ZakatAlFitrOptions): ZakatAlFitrPlan | undefined {
  if (!options?.enabled || !options.eligible) return undefined;
  const normId = options.normId ?? ZAKAT_AL_FITR_NORM.id;
  const held = person.conscience.norms.find((n) => n.normId === normId);
  if (!held || held.conviction <= 0 || !['obligatory', 'recommended'].includes(held.standing))
    return undefined;
  if (
    !Number.isFinite(options.amount) ||
    options.amount <= 0 ||
    !Number.isFinite(options.from) ||
    Math.abs(options.from) > MAX_MINUTE ||
    !Number.isFinite(options.deadline) ||
    Math.abs(options.deadline) > MAX_MINUTE ||
    options.deadline <= options.from ||
    !options.action.trim()
  )
    throw new Error('zakat al-fitr: invalid amount, window or payment action');
  return {
    amount: options.amount,
    commitment: {
      kind: 'appointment',
      actions: [options.action],
      from: options.from,
      until: options.deadline,
      completion: 'end',
      importance: 0.5, // Quiet scheduling weight; engineering assumption, not religious importance.
      label: 'preferred zakat al-fitr payment time',
    },
    payment: {
      kind: 'duty',
      actions: [options.action],
      from: options.from,
      until: MAX_MINUTE,
      completion: 'end',
      normId,
      importance: 0.5,
      label: 'outstanding zakat al-fitr payment',
    },
  };
}

/** Read host-confirmed cumulative payment; no receipt creation, agenda mutation or spiritual outcome. */
export function readZakatAlFitr(plan: ZakatAlFitrPlan, paid: number, now: Minute) {
  if (!Number.isFinite(paid) || paid < 0 || !Number.isFinite(now) || Math.abs(now) > MAX_MINUTE)
    throw new Error('zakat al-fitr: invalid confirmed payment or minute');
  return {
    outstanding: Math.max(0, plan.amount - paid),
    deadlinePassed: now > plan.commitment.until,
  };
}
