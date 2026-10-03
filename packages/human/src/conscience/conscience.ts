/**
 * SCOPE: Conscience models a person's *understanding* of norms (held standing and conviction), the pull
 * those understandings exert on options, a veto for firmly held prohibitions, the private record of
 * stated intentions, known breaches, repentance and repair. Shapes borrowed: Schwartz values
 * (tradition, conformity, universalism) and HEXACO honesty-humility act only as coefficients; guilt
 * as an action tendency toward repair follows OCC-style appraisal (praiseworthiness of own deeds).
 * The necessity exception follows Qur'an 2:173 as commonly understood: compulsion, not desire, and
 * not beyond need. Repentance is modelled as the person's acts (regret, stopping, resolve, and
 * restitution when another person was wronged); the framework records those acts and never computes
 * divine acceptance, reward, forgiveness or worth. The composite treats completing a worship or repent act while
 * holding an open breach without a victim as the person's turning back (the `conscience:repent` term in that
 * choice stands for the regret); the chronicle narrates it as "turned back from", never as amends or forgiveness
 * (review 2026-10-03). Standings are the common Sunni understanding and a
 * person's own understanding may differ. Observers have no effect here: reputation belongs to `social/`,
 * and intentions are private.
 *
 * SCOPE (abstention veto, lane agenda+conscience): a person who holds an obligatory norm with conviction at or
 * above `abstainVetoConviction` will not complete an action that breaks a linked, open, non-exempt `abstain`
 * commitment (e.g. eating during the fast): verdict willNot, reason `duty:<normId>`, which insisting cannot
 * override. The act's whole span counts, as in `agenda.violatesAbstention`: a meal that would run past dawn is
 * refused before dawn (integration, 2026-10-03). It lifts only under the capacity bound (Qur'an 2:286: obligation follows capacity) at the same
 * desperation threshold, and only for acts meeting a bodily need; this is not the fast's own exemption for
 * illness and travel (2:184-185, applied in the agenda) and not the 2:173 necessity exception for forbidden
 * food. Below the threshold the abstention acts only as a negative term (agenda), so a weakly convinced person
 * can be tempted. It does not model the person's later judgment of a broken fast beyond the recorded breach.
 */
import { clamp01 } from '../core/index.ts';
import type {
  Affordance,
  AppraisalEvent,
  ConscienceState,
  HeldNorm,
  Minute,
  NormDefinition,
  NormStanding,
  Person,
  Term,
  Unit,
} from '../types.ts';
import { DEFAULT_NORMS, NORM_SCOPE } from './catalog.ts';

type Breach = ConscienceState['breaches'][number];

export const CONSCIENCE_DEFAULTS = {
  /** Overall scale of norm terms relative to need terms (need terms are ~0..1). */
  termScale: 0.8,
  /** Magnitude when an action fulfils a norm of this standing. Abstaining from a forbidden act is mild. */
  fulfilWeight: { obligatory: 1, recommended: 0.5, permitted: 0, disliked: 0.15, forbidden: 0.3 } as Record<
    NormStanding,
    number
  >,
  /** Magnitude when an action violates a norm of this standing. Missing a recommendation is minor. */
  violateWeight: { obligatory: 1, recommended: 0.1, permitted: 0, disliked: 0.4, forbidden: 1 } as Record<
    NormStanding,
    number
  >,
  /** Standings whose violation is recorded as a breach. */
  breachStandings: ['forbidden', 'obligatory'] as NormStanding[],
  /** Norms scaled by honesty-humility. */
  honestyNorms: ['lying', 'theft', 'fairness'],
  /** Norms whose breach wrongs the action's target person (the target becomes the victim). */
  victimNorms: [
    'theft',
    'lying',
    'harm-others',
    'backbiting',
    'keep-promise',
    'kindness-to-parents',
    'fairness',
    'care-dependents',
  ],
  /**
   * Forbidden norms whose veto lifts under necessity (Qur'an 2:173). Never harm or lying. 2:173 names forbidden
   * food; 'theft' (taking food in extremity) is a juristic extension by analogy, an engineering assumption
   * pending a source in research/ (see its catalog entry). Lifting the fast's abstention for water as well as food
   * (capacity bound, `abstentionVeto`) is likewise by analogy.
   */
  necessityEligible: ['theft', 'forbidden-food'],
  /**
   * Desperation at which necessity applies. With the needs module's urgency curve, 0.75 is food or water at
   * about 8% of full; the earlier 0.9 was only reached at ~2%, after health had begun to fail (integration
   * calibration, 2026-10-03).
   */
  necessityThreshold: 0.75,
  /** Conviction (held, obligatory norm) at which an open abstention vetoes violating acts. Matches will's omission rule. */
  abstainVetoConviction: 0.7,
  /** Effective conviction at which a forbidden norm vetoes. */
  vetoConviction: 0.6,
  /** Up to this fraction of an eligible norm's penalty is softened by desperation (never removed). */
  desperationSoftening: 0.5,
  /** Breach weight multiplier when the violating act was begun but not completed. */
  incompleteBreachFactor: 0.5,
  repairScale: 0.9,
  repentScale: 0.5,
  maxBreaches: 50,
  maxIntentions: 50,
};

const VALID_STANDINGS: NormStanding[] = ['obligatory', 'recommended', 'permitted', 'disliked', 'forbidden'];

/**
 * Convenience builder: religious-only norms are held with conviction proportional to practice; shared
 * ethical norms are held by everyone with moderate conviction that rises with practice. `extraNorms`
 * override or add entries by id.
 */
export function heldNorms(
  profile: { practice: Unit; extraNorms?: HeldNorm[] },
  catalog: NormDefinition[] = DEFAULT_NORMS,
): HeldNorm[] {
  const practice = clamp01(profile.practice);
  const out: HeldNorm[] = [];
  for (const def of catalog) {
    const scope = NORM_SCOPE[def.id] ?? 'shared';
    let conviction: number;
    if (scope === 'religious') conviction = 0.95 * practice;
    else if (scope === 'core') conviction = 0.6 + 0.3 * practice;
    else conviction = 0.4 + 0.4 * practice;
    if (conviction < 0.05) continue;
    out.push({ normId: def.id, standing: def.standing, conviction: clamp01(conviction) });
  }
  for (const extra of profile.extraNorms ?? []) {
    const norm = { ...extra, conviction: clamp01(extra.conviction) };
    const i = out.findIndex((n) => n.normId === extra.normId);
    if (i >= 0) out[i] = norm;
    else out.push(norm);
  }
  return out;
}

export function createConscience(norms: HeldNorm[]): ConscienceState {
  const seen = new Set<string>();
  const held: HeldNorm[] = [];
  for (const n of norms) {
    if (seen.has(n.normId) || !VALID_STANDINGS.includes(n.standing)) continue;
    seen.add(n.normId);
    held.push({ normId: n.normId, standing: n.standing, conviction: clamp01(n.conviction) });
  }
  return { norms: held, breaches: [], intentions: [], nextBreach: 0 };
}

const heldNorm = (p: Person, normId: string): HeldNorm | undefined =>
  p.conscience.norms.find((n) => n.normId === normId);

/** Value/trait coefficient on a held norm's pull. Traits and values scale; they never branch. */
function normCoefficient(p: Person, normId: string): number {
  const scope = NORM_SCOPE[normId] ?? 'shared';
  let k =
    scope === 'religious'
      ? 0.5 + 0.5 * p.values.tradition + 0.2 * p.values.conformity
      : 0.6 + 0.2 * p.values.conformity + 0.2 * p.values.universalism + 0.1 * p.values.tradition;
  if (CONSCIENCE_DEFAULTS.honestyNorms.includes(normId)) k *= 0.5 + p.traits.honesty;
  return k;
}

const unrepaired = (p: Person): Breach[] => p.conscience.breaches.filter((b) => !b.repaired);

/**
 * Utility terms from held norms. `aff.with` (who would see it) is deliberately ignored: conscience pulls
 * the same whether or not anyone is watching.
 */
export function normTerms(p: Person, aff: Affordance, ctx: { desperation: Unit }): Term[] {
  const d = CONSCIENCE_DEFAULTS;
  const terms: Term[] = [];
  for (const tag of aff.norms ?? []) {
    const held = heldNorm(p, tag.normId);
    if (!held) continue;
    const standing =
      tag.relation === 'fulfills' && held.standing === 'obligatory' && obligationAnswered(p, tag.normId)
        ? 'recommended'
        : held.standing;
    const weight = tag.relation === 'fulfills' ? d.fulfilWeight[standing] : -d.violateWeight[held.standing];
    if (weight === 0) continue;
    let value = d.termScale * weight * held.conviction * normCoefficient(p, tag.normId);
    if (value < 0 && d.necessityEligible.includes(tag.normId)) {
      value *= 1 - d.desperationSoftening * clamp01(ctx.desperation);
    }
    terms.push({ source: `norm:${tag.normId}`, value });
  }

  const open = unrepaired(p);
  if (open.length > 0) {
    const tags = aff.tags ?? [];
    if (tags.includes('repair') || tags.includes('apologize')) {
      const owed = open.filter((b) => b.victimId !== undefined);
      const toTarget = aff.targetId === undefined ? owed : owed.filter((b) => b.victimId === aff.targetId);
      const share = aff.targetId === undefined ? 0.5 : 1;
      const load = 1 - toTarget.reduce((acc, b) => acc * (1 - b.weight), 1);
      if (load > 0) terms.push({ source: 'conscience:repair', value: d.repairScale * share * load });
    }
    if (tags.includes('repent') || tags.includes('worship')) {
      // Only breaches without a victim can be repented this way; a wronged person needs repair instead.
      const godward = open.filter((b) => b.victimId === undefined);
      const load = 1 - godward.reduce((acc, b) => acc * (1 - b.weight), 1);
      const value = d.repentScale * load * (0.5 + 0.5 * p.values.tradition + 0.25 * p.traits.honesty);
      if (value > 0) terms.push({ source: 'conscience:repent', value });
    }
  }
  return terms;
}

/**
 * Whether an obligation the person keeps through timed commitments (e.g. salah through prayer windows) has no
 * instance due now: the person holds commitments linked to `normId`, and none is pending with `p.now` inside its
 * window (or the hour before it). Repeating the act then pulls only as a voluntary (recommended) act would
 * (review 2026-10-03: Dhuhr prayed twice back to back on the full obligatory weight). Norms with no linked
 * commitments are unaffected.
 */
function obligationAnswered(p: Person, normId: string): boolean {
  const list = p.agenda?.commitments;
  if (!list) return false;
  let linked = false;
  for (const c of list) {
    if (c.normId !== normId || c.kind === 'abstain') continue;
    linked = true;
    if (c.status === 'pending' && p.now >= c.from - 60 && p.now <= c.until) return false;
  }
  return linked;
}

/**
 * Will-not veto for a firmly held prohibition. Necessity (Qur'an 2:173): for eligible norms only, at
 * desperation >= threshold, and only when the act itself meets a bodily need (food or water) — the
 * exception covers survival, not desire or excess. The negative norm term is unaffected.
 */
export function normVeto(
  p: Person,
  aff: Affordance,
  desperation: Unit,
  opts: { necessity: boolean; now?: Minute } = { necessity: true },
): { kind: 'willNot'; reason: string } | undefined {
  const d = CONSCIENCE_DEFAULTS;
  const meetsBodilyNeed = (aff.advertises.food ?? 0) > 0 || (aff.advertises.water ?? 0) > 0;
  for (const tag of aff.norms ?? []) {
    if (tag.relation !== 'violates') continue;
    const held = heldNorm(p, tag.normId);
    if (held?.standing !== 'forbidden') continue;
    const effective = held.conviction * (0.7 + 0.6 * p.traits.honesty);
    if (effective < d.vetoConviction) continue;
    const necessity =
      opts.necessity &&
      desperation >= d.necessityThreshold &&
      meetsBodilyNeed &&
      d.necessityEligible.includes(tag.normId);
    if (necessity) continue;
    return { kind: 'willNot', reason: `norm:${tag.normId}` };
  }
  return abstentionVeto(
    p,
    aff,
    opts.now ?? p.now,
    opts.necessity && desperation >= d.necessityThreshold && meetsBodilyNeed,
  );
}

/**
 * The open abstention a firmly convinced person will not break with `aff` (see the abstention SCOPE paragraph).
 * Applies when the act's span `[now, now + duration)` overlaps the window `[from, until)`, the same overlap rule
 * the agenda uses to break it. `capacityLifted` = the capacity bound applies.
 */
export function abstentionVeto(
  p: Person,
  aff: Affordance,
  now: Minute,
  capacityLifted = false,
): { kind: 'willNot'; reason: string } | undefined {
  if (capacityLifted) return undefined;
  const end = now + Math.max(0, aff.duration);
  for (const c of p.agenda?.commitments ?? []) {
    if (c.kind !== 'abstain' || c.status !== 'pending' || c.exempt !== undefined || c.normId === undefined)
      continue;
    if (!(c.violatedBy?.includes(aff.action) ?? false) || now >= c.until || end <= c.from) continue;
    const held = heldNorm(p, c.normId);
    if (held?.standing !== 'obligatory' || held.conviction < CONSCIENCE_DEFAULTS.abstainVetoConviction)
      continue;
    return { kind: 'willNot', reason: `duty:${c.normId}` };
  }
  return undefined;
}

/** `b<minute>-<normId>-<counter>`; the counter lives in `ConscienceState.nextBreach`. */
function breachId(p: Person, at: Minute, normId: string): string {
  const n = p.conscience.nextBreach;
  p.conscience.nextBreach += 1;
  return `b${at}-${normId}-${n}`;
}

function boundBreaches(c: ConscienceState): void {
  while (c.breaches.length > CONSCIENCE_DEFAULTS.maxBreaches) {
    const i = c.breaches.findIndex((b) => b.repaired);
    c.breaches.splice(i >= 0 ? i : 0, 1);
  }
}

/**
 * Record a deed the person undertook. The stated intention is stored privately. Fulfilment requires
 * completion; a breach is recorded once the act is undertaken (responsibility attaches to assent and
 * action), at reduced weight if it did not complete. With `necessity` (the act was possible only because the
 * 2:173 exception lifted the veto) no breach is recorded for `necessityEligible` norms. Returns appraisal events
 * about the person's own deed.
 */
export function recordDeed(
  p: Person,
  aff: Affordance,
  intention: string,
  now: Minute,
  completed: boolean,
  opts: { necessity?: boolean } = {},
): { fulfilled: string[]; breached: string[]; appraisal: AppraisalEvent[] } {
  const d = CONSCIENCE_DEFAULTS;
  const c = p.conscience;
  c.intentions.push({ at: now, action: aff.action, intention });
  if (c.intentions.length > d.maxIntentions) c.intentions.splice(0, c.intentions.length - d.maxIntentions);

  const fulfilled: string[] = [];
  const breached: string[] = [];
  const appraisal: AppraisalEvent[] = [];
  for (const tag of aff.norms ?? []) {
    const held = heldNorm(p, tag.normId);
    if (!held) continue;
    if (tag.relation === 'fulfills') {
      if (!completed) continue;
      fulfilled.push(held.normId);
      if (held.standing === 'obligatory' || held.standing === 'recommended') {
        const praise = (held.standing === 'obligatory' ? 0.6 : 0.3) * held.conviction;
        appraisal.push({
          at: now,
          kind: 'deed',
          desirability: 0.5 * praise,
          praiseworthiness: praise,
          agentId: p.id,
          ...(aff.targetId !== undefined ? { targetId: aff.targetId } : {}),
          normId: held.normId,
          cause: `deed:fulfil:${held.normId}`,
        });
      }
      continue;
    }
    if (!d.breachStandings.includes(held.standing)) continue;
    // Qur'an 2:173: under necessity "they will not be sinful" (quran.com, checked 2026-10-03): no breach for an
    // eligible norm when the act was possible only because necessity lifted its veto.
    if (opts.necessity && d.necessityEligible.includes(held.normId)) continue;
    const weight = clamp01(
      d.violateWeight[held.standing] * held.conviction * (completed ? 1 : d.incompleteBreachFactor),
    );
    if (weight <= 0) continue;
    const victimId =
      d.victimNorms.includes(held.normId) && aff.targetId !== undefined ? aff.targetId : undefined;
    const breach: Breach = {
      id: breachId(p, now, held.normId),
      normId: held.normId,
      at: now,
      weight,
      repaired: false,
      ...(victimId !== undefined ? { victimId } : {}),
    };
    c.breaches.push(breach);
    breached.push(held.normId);
    appraisal.push({
      at: now,
      kind: 'deed',
      desirability: -0.3 * weight,
      praiseworthiness: -weight,
      agentId: p.id,
      ...(victimId !== undefined ? { targetId: victimId } : {}),
      normId: held.normId,
      cause: `breach:${held.normId}`,
    });
  }
  boundBreaches(c);
  return { fulfilled, breached, appraisal };
}

/**
 * The person repents a breach: regret, stopping and resolve. When another person was wronged,
 * restitution is also required, so the breach closes only after `recordRepair` for that victim.
 * Returns whether the breach is now closed. This records the person's acts, not acceptance.
 */
export function repent(p: Person, id: string, _now: Minute): boolean {
  const breach = p.conscience.breaches.find((b) => b.id === id);
  if (!breach) return false;
  if (breach.victimId !== undefined) return breach.repaired;
  breach.repaired = true;
  return true;
}

/** Restitution/apology delivered to a wronged person (host-attested): closes their open breaches. */
export function recordRepair(p: Person, victimId: string, _now: Minute): number {
  let count = 0;
  for (const b of p.conscience.breaches) {
    if (!b.repaired && b.victimId === victimId) {
      b.repaired = true;
      count++;
    }
  }
  return count;
}

/** Felt weight of open breaches, saturating: 1 - Π(1 - weight). Input for guilt in affect. */
export function guiltLoad(p: Person): Unit {
  return clamp01(1 - unrepaired(p).reduce((acc, b) => acc * (1 - b.weight), 1));
}
