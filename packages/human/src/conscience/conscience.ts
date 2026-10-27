/** SCOPE: held understanding, private deeds, necessity and repair; never a ruling or acceptance. */
import { cloneData } from '../core/clone.ts';
import { clamp01, dpow } from '../core/index.ts';
import type {
  ActorState,
  HeldNorm,
  NormStanding,
  Offer,
  TermData as Term,
  Time,
  Unit,
} from '../run-schema.ts';
import { NORM_SCOPE } from './catalog.ts';

type NormActor = Pick<ActorState, 'id' | 'now' | 'traits' | 'values' | 'agenda' | 'conscience'>;
type OwnedBreach = ActorState['conscience']['breaches'][number];
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
const heldNorm = (p: NormActor, normId: string): HeldNorm | undefined =>
  p.conscience.norms.find((n) => n.normId === normId);
/** Value/trait coefficient on a held norm's pull. Traits and values scale; they never branch. */
function normCoefficient(p: NormActor, normId: string): number {
  const scope = NORM_SCOPE[normId] ?? 'shared';
  let k =
    scope === 'religious'
      ? 0.5 + 0.5 * p.values.tradition + 0.2 * p.values.conformity
      : 0.6 + 0.2 * p.values.conformity + 0.2 * p.values.universalism + 0.1 * p.values.tradition;
  if (CONSCIENCE_DEFAULTS.honestyNorms.includes(normId)) k *= 0.5 + p.traits.honesty;
  return k;
}
const unrepaired = (p: NormActor): OwnedBreach[] => p.conscience.breaches.filter((b) => !b.repaired);
/**
 * Utility terms from held norms. `aff.with` (who would see it) is deliberately ignored: conscience pulls
 * the same whether or not anyone is watching.
 */
export function normTerms(
  p: NormActor,
  aff: Offer,
  ctx: {
    desperation: Unit;
  },
): Term[] {
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
      const toTarget = aff.target === undefined ? owed : owed.filter((b) => b.victimId === aff.target);
      const share = aff.target === undefined ? 0.5 : 1;
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
function obligationAnswered(p: NormActor, normId: string): boolean {
  const list = p.agenda?.commitments;
  if (!list) return false;
  let linked = false;
  for (const c of list) {
    if (c.normId !== normId || c.kind === 'abstain' || c.makeUpOf !== undefined) continue;
    linked = true;
    if (c.status === 'pending' && p.now >= c.from - 3600000 && p.now <= c.until) return false;
  }
  return linked;
}
/**
 * Will-not veto for a firmly held prohibition. Necessity (Qur'an 2:173): for eligible norms only, at
 * desperation >= threshold, and only when the act itself meets a bodily need (food or water) — the
 * exception covers survival, not desire or excess. The negative norm term is unaffected.
 */
export function normVeto(
  p: NormActor,
  aff: Offer,
  desperation: Unit,
  opts: {
    now?: Time;
  } = {},
):
  | {
      kind: 'willNot';
      reason: string;
    }
  | undefined {
  const d = CONSCIENCE_DEFAULTS;
  const meetsBodilyNeed = (aff.expected.needs.food ?? 0) > 0 || (aff.expected.needs.water ?? 0) > 0;
  for (const tag of aff.norms ?? []) {
    if (tag.relation !== 'violates') continue;
    const held = heldNorm(p, tag.normId);
    if (held?.standing !== 'forbidden') continue;
    const effective = held.conviction * (0.7 + 0.6 * p.traits.honesty);
    if (effective < d.vetoConviction) continue;
    const necessity =
      desperation >= d.necessityThreshold && meetsBodilyNeed && d.necessityEligible.includes(tag.normId);
    if (necessity) continue;
    return { kind: 'willNot', reason: `norm:${tag.normId}` };
  }
  return abstentionVeto(p, aff, opts.now ?? p.now, desperation >= d.necessityThreshold && meetsBodilyNeed);
}
/**
 * The open abstention a firmly convinced person will not break with `aff` (see the abstention SCOPE paragraph).
 * Applies when the act's span `[now, now + duration)` overlaps the window `[from, until)`, the same overlap rule
 * the agenda uses to break it. `capacityLifted` = the capacity bound applies.
 */
export function abstentionVeto(
  p: NormActor,
  aff: Offer,
  now: Time,
  capacityLifted = false,
):
  | {
      kind: 'willNot';
      reason: string;
    }
  | undefined {
  if (capacityLifted) return undefined;
  const end = now + Math.max(0, aff.durationMs);
  for (const c of p.agenda?.commitments ?? []) {
    if (c.kind !== 'abstain' || c.status !== 'pending' || c.exempt !== undefined) continue;
    if (!(c.violatedBy?.includes(aff.actionId) ?? false) || now >= c.until || end <= c.from) continue;
    const held = c.normId === undefined ? undefined : heldNorm(p, c.normId);
    if (
      c.firm === true &&
      (c.toId === undefined || c.toId === 'self' || c.toId === p.id) &&
      held?.standing !== 'obligatory'
    )
      return { kind: 'willNot', reason: `rule:${c.label ?? c.id}` };
    if (held?.standing !== 'obligatory' || held.conviction < CONSCIENCE_DEFAULTS.abstainVetoConviction)
      continue;
    return { kind: 'willNot', reason: `duty:${c.normId}` };
  }
  return undefined;
}
/** HF4 conscience records held understanding and acts, never acceptance. */
export const conscienceOwner: import('../run-schema.ts').ConscienceOwner = {
  initialize(input) {
    return {
      norms: input.map((n) => cloneData(n)) as import('../run-schema.ts').HeldNorm[],
      breaches: [],
      intentions: [],
      nextBreach: 0,
    };
  },
  receive: receiveConscienceEvidence,
  receiveUpbringing(previous, input, context) {
    const state = cloneData(previous) as import('../run-schema.ts').ConscienceState;
    const d = context.effective.builtins.FAMILY_DEFAULTS;
    const carers = input.caregivers.filter((c) => c.id !== context.person);
    const total = carers.reduce((sum, c) => sum + Math.max(0, c.warmth), 0);
    const age = (context.at - context.life.bornAt) / (365 * 86400000);
    // Source valuePlasticity: full through 12, taper to zero at 25.
    const plasticity = age <= 12 ? 1 : clamp01((25 - age) / 13);
    const elapsed = BigInt(input.to) - BigInt(input.from);
    if (elapsed < 0n || elapsed > BigInt(Number.MAX_SAFE_INTEGER))
      throw new RangeError('Invalid upbringing duration');
    if (total > 0 && plasticity > 0) {
      const k = clamp01(
        1 -
          dpow(
            1 - clamp01((d.normRatePerYear * total) / carers.length),
            (Number(elapsed) / (365 * 86400000)) * plasticity,
          ),
      );
      const ids = [...new Set(carers.flatMap((c) => c.norms.map((n) => n.normId)))].sort();
      for (const id of ids) {
        let target = 0,
          top = -1;
        let exemplar:
          | import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').HeldNorm>
          | undefined;
        for (const carer of carers) {
          const held = carer.norms.find((n) => n.normId === id);
          if (!held) continue;
          const breaches = carer.breaches.filter(
            (b) => b.normId === id && b.at >= context.at - 365 * 86400000,
          ).length;
          target +=
            Math.max(0, carer.warmth) * held.conviction * (1 - Math.min(1, breaches / d.breachSaturation));
          if (carer.warmth * held.conviction > top) {
            top = carer.warmth * held.conviction;
            exemplar = held;
          }
        }
        const mine = state.norms.find((n) => n.normId === id);
        const next = (mine?.conviction ?? 0) + k * (target / total - (mine?.conviction ?? 0));
        if (mine) mine.conviction = clamp01(next);
        else if (exemplar && next >= 0.01)
          state.norms.push({
            ...cloneData(exemplar),
            conviction: clamp01(next),
          } as import('../run-schema.ts').HeldNorm);
      }
    }
    return {
      state,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: context.at,
    };
  },
  validate(state) {
    const issues: import('../run-schema.ts').ValidationIssue[] = [];
    const fail = (path: string) =>
      issues.push({ path, code: 'invalid-schema', message: 'Invalid conscience state' });
    if (
      !Number.isSafeInteger(state.nextBreach) ||
      state.nextBreach < 0 ||
      state.breaches.length > CONSCIENCE_DEFAULTS.maxBreaches ||
      state.intentions.length > CONSCIENCE_DEFAULTS.maxIntentions ||
      new Set(state.norms.map((n) => n.normId)).size !== state.norms.length ||
      new Set(state.breaches.map((b) => b.id)).size !== state.breaches.length
    )
      fail('conscience');
    for (const breach of state.breaches) {
      const counter = /-([0-9]+)$/.exec(breach.id)?.[1];
      if (counter !== undefined && Number(counter) >= state.nextBreach) fail('conscience.nextBreach');
    }
    for (const n of state.norms)
      if (
        !n.normId ||
        !VALID_STANDINGS.includes(n.standing) ||
        !Number.isFinite(n.conviction) ||
        n.conviction < 0 ||
        n.conviction > 1 ||
        (n.provenance.kind === 'religious'
          ? !n.provenance.researchRef || !n.provenance.interpretationRef
          : !n.provenance.author || !n.provenance.ruleId || !n.provenance.edition)
      )
        fail('conscience.norms');
    for (const b of state.breaches)
      if (
        !Number.isSafeInteger(b.at) ||
        !Number.isFinite(b.weight) ||
        b.weight < 0 ||
        b.weight > 1 ||
        !b.id ||
        !b.normId
      )
        fail('conscience.breaches');
    return issues;
  },
};
export function receiveConscienceEvidence(
  previous: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').ConscienceState>,
  input: Parameters<import('../run-schema.ts').ConscienceOwner['receive']>[1],
  context: Pick<import('../run-schema.ts').FrameContext, 'at' | 'person' | 'phase'> & {
    effective: {
      builtins: {
        CONSCIENCE_DEFAULTS: import('../run-schema.ts').DeepReadonly<
          import('../run-schema.ts').Effective_CONSCIENCE_DEFAULTS
        >;
      };
    };
  },
): import('../run-schema.ts').OwnerOutput<import('../run-schema.ts').ConscienceState> {
  const state = cloneData(previous) as import('../run-schema.ts').ConscienceState;
  const d = context.effective.builtins.CONSCIENCE_DEFAULTS;
  const appraisals: import('../run-schema.ts').AppraisalEffect[] = [];
  if (input.kind === 'interpretation') {
    const data = input.data;
    const held = state.norms.find((n) => n.normId === data.normId);
    const value = {
      normId: data.normId,
      standing: data.standing,
      conviction: data.conviction,
      provenance: cloneData(data.provenance),
    } as import('../run-schema.ts').HeldNorm;
    if (held) Object.assign(held, value);
    else state.norms.push(value);
  } else if (input.kind === 'repair') {
    for (const b of state.breaches) if (b.victimId === input.data.victim) b.repaired = true;
  } else if (input.kind === 'repent') {
    const breach = state.breaches.find((b) => b.id === input.data.deedId);
    if (breach && breach.victimId === undefined) breach.repaired = true;
  } else {
    // Emitted speech uses the same held-norm deed law without a physical activity.
    const speech = input.kind === 'communication-deed';
    const offer = speech ? { actionId: 'communicate', target: input.target, norms: input.norms } : input.activity.offer;
    const completed = speech || input.outcome.status === 'completed';
    const intention = speech ? input.intention : input.activity.intention;
    const necessity = !speech && input.activity.necessity;
    const evidenceId = speech ? input.evidenceId : input.outcome.evidenceId;
    state.intentions.push({ at: context.at, action: offer.actionId, intention });
    state.intentions = state.intentions.slice(-d.maxIntentions);
    for (const tag of offer.norms) {
      const held = state.norms.find((n) => n.normId === tag.normId);
      if (!held) continue;
      let appraisal: import('../run-schema.ts').AppraisalEvent | undefined;
      if (tag.relation === 'fulfills') {
        if (completed && (held.standing === 'obligatory' || held.standing === 'recommended')) {
          const praise = (held.standing === 'obligatory' ? 0.6 : 0.3) * held.conviction;
          appraisal = {
            at: context.at,
            kind: 'deed',
            desirability: 0.5 * praise,
            praiseworthiness: praise,
            agentId: context.person,
            normId: held.normId,
            cause: `deed:fulfil:${held.normId}`,
          };
          if (offer.target !== undefined) appraisal.targetId = offer.target;
        }
      } else if (
        d.breachStandings.includes(held.standing) &&
        !(necessity && d.necessityEligible.includes(held.normId))
      ) {
        const weight = clamp01(
          (d.violateWeight[held.standing] ?? 0) *
            held.conviction *
            (completed ? 1 : d.incompleteBreachFactor),
        );
        if (weight > 0) {
          const breach: import('../run-schema.ts').ConscienceState['breaches'][number] = {
            id: `b${context.at}-${held.normId}-${state.nextBreach++}`,
            normId: held.normId,
            at: context.at,
            weight,
            repaired: false,
          };
          if (d.victimNorms.includes(held.normId) && offer.target !== undefined)
            breach.victimId = offer.target;
          state.breaches.push(breach);
          appraisal = {
            at: context.at,
            kind: 'deed',
            desirability: -0.3 * weight,
            praiseworthiness: -weight,
            agentId: context.person,
            normId: held.normId,
            cause: `breach:${held.normId}`,
          };
          if (breach.victimId !== undefined) appraisal.targetId = breach.victimId;
        }
      }
      if (appraisal)
        appraisals.push({
          id: `${evidenceId}:conscience:${appraisals.length}`,
          cause: evidenceId,
          person: context.person,
          at: context.at,
          applyPhase: context.phase,
          from: 'conscience',
          to: 'affect',
          appraisal,
        });
    }
    while (state.breaches.length > d.maxBreaches)
      state.breaches.splice(
        Math.max(
          0,
          state.breaches.findIndex((b) => b.repaired),
        ),
        1,
      );
  }
  return {
    state,
    effects: { terms: [], modifiers: [], appraisals },
    events: [],
    nextBoundary: null,
    advancedThrough: context.at,
  };
}
