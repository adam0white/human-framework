/**
 * SCOPE: Dyadic relationships held by one person (affection, trust, respect, familiarity, roles, a favour
 * ledger), updated by experienced social events, by observing others' acts against the observer's own held
 * norms, and by slow drift over time; plus the `social:*` utility terms an option with other people receives.
 * Borrowed shapes: negativity bias (Baumeister et al. 2001, "bad is stronger than good": harms weigh ~2x
 * helps), reciprocity as a favour ledger (Gouldner 1960), the mere-exposure / familiarity growth with
 * diminishing returns, HEXACO agreeableness as tolerance of provocation and honesty-humility as sensitivity
 * to deceit (Ashton & Lee), Schwartz benevolence as care for close others. Observers judge only the outward
 * act and never see intentions. It does NOT model the other person's view of me (each person holds their
 * own one-sided record), gossip/reputation propagation, attachment styles, or group identity; the
 * coefficients are engineering defaults, not calibrated estimates.
 */
import { clamp, clamp01, clampSigned, decay, round } from '../core/index.ts';
import type {
  Affordance,
  HeldNorm,
  Minute,
  NormStanding,
  NormTag,
  Person,
  PersonId,
  Relationship,
  SocialEvent,
  SocialEventKind,
  SocialState,
  Term,
  Unit,
} from '../types.ts';
import { MINUTES_PER_DAY } from '../types.ts';

const WEEK = 7 * MINUTES_PER_DAY;

/** Baseline values implied by a role when a seed spec leaves them unspecified. */
interface RoleBaseline {
  affection: number;
  trust: number;
  familiarity: number;
  respect: number;
}

export const SOCIAL_DEFAULTS = {
  maxRelationships: 80,
  defaultTrust: 0.5,
  /** Roles whose ties do not lose familiarity and count as family for benevolence. */
  familyRoles: ['spouse', 'parent', 'child', 'sibling', 'grandparent', 'grandchild'] as readonly string[],
  roleBaselines: {
    spouse: { affection: 0.7, trust: 0.8, familiarity: 0.95, respect: 0.4 },
    parent: { affection: 0.6, trust: 0.75, familiarity: 0.9, respect: 0.5 },
    child: { affection: 0.7, trust: 0.7, familiarity: 0.9, respect: 0.2 },
    sibling: { affection: 0.45, trust: 0.65, familiarity: 0.85, respect: 0.2 },
    grandparent: { affection: 0.5, trust: 0.7, familiarity: 0.7, respect: 0.5 },
    grandchild: { affection: 0.6, trust: 0.6, familiarity: 0.7, respect: 0.1 },
    friend: { affection: 0.4, trust: 0.65, familiarity: 0.6, respect: 0.2 },
    colleague: { affection: 0.1, trust: 0.55, familiarity: 0.4, respect: 0.15 },
    neighbor: { affection: 0.1, trust: 0.5, familiarity: 0.3, respect: 0.05 },
    leader: { affection: 0.05, trust: 0.55, familiarity: 0.3, respect: 0.35 },
  } as Record<string, RoleBaseline>,
  /** Negative deltas on affection/trust/respect are multiplied by this ("bad is stronger than good"). */
  negativityBias: 2,
  /** Familiarity gain per interaction at magnitude 1: f += gain * (1 - f). */
  familiarityGain: 0.06,
  /** Non-family familiarity half-life without contact (minutes). */
  familiarityHalfLife: 2 * 365 * MINUTES_PER_DAY,
  /** Non-role affection drifts toward 0 by 1% per week. */
  affectionHalfLife: (Math.LN2 / -Math.log(0.99)) * WEEK,
  /** Fraction of the gap to the role baseline restored by a full-magnitude act of forgiveness. */
  forgiveRestore: 0.5,
  ledgerLimit: 10,
  terms: {
    affection: 0.5,
    belonging: 0.8,
    benevolence: 0.6,
    group: 0.3,
    /** Group size (others) from which the extraversion term applies. */
    groupFrom: 3,
  },
  judge: {
    respect: 0.12,
    trustLoss: 0.08,
    trustGain: 0.02,
    /** Affection loss toward an actor who harms someone I am close to, per unit of negative valence. */
    harmToClose: 0.1,
    witnessFamiliarity: 0.01,
  },
};

/**
 * Per-event deltas for the person whose state is updated, at magnitude 1, before trait coefficients,
 * negativity bias and saturation. `fam` multiplies the familiarity gain; `anger` marks provocations that
 * agreeableness softens. `ledger` is in favour units: positive means the other now owes me more.
 */
interface EventEffect {
  affection: number;
  trust: number;
  respect: number;
  ledger: number;
  fam: number;
  anger?: boolean;
}
type EffectRow = { other: EventEffect; me: EventEffect };
const e = (affection: number, trust: number, respect: number, ledger = 0, fam = 1, anger = false) => ({
  affection,
  trust,
  respect,
  ledger,
  fam,
  anger,
});

export const SOCIAL_EVENT_EFFECTS: Record<SocialEventKind, EffectRow> = {
  help: { other: e(0.08, 0.04, 0.02, -1), me: e(0.03, 0, 0, 1) },
  harm: { other: e(-0.08, -0.06, -0.02, 0, 1, true), me: e(-0.02, 0, 0) },
  gift: { other: e(0.06, 0.02, 0, -0.5), me: e(0.02, 0, 0, 0.5) },
  insult: { other: e(-0.06, -0.01, -0.03, 0, 1, true), me: e(-0.01, 0, 0) },
  thanks: { other: e(0.03, 0.01, 0.01), me: e(0.01, 0, 0) },
  apology: { other: e(0.03, 0.03, 0.01), me: e(0, 0, 0) },
  forgive: { other: e(0.04, 0.02, 0.01), me: e(0, 0, 0) }, // byMe handled by restoration
  'promise-kept': { other: e(0.02, 0.05, 0.02), me: e(0, 0, 0) },
  'promise-broken': { other: e(-0.02, -0.07, -0.03, 0, 1, true), me: e(0, 0, 0) },
  chat: { other: e(0.02, 0, 0, 0, 1.5), me: e(0.02, 0, 0, 0, 1.5) },
  conflict: { other: e(-0.04, -0.02, 0, 0, 1, true), me: e(-0.04, -0.02, 0, 0, 1, true) },
  praise: { other: e(0.04, 0.01, 0.01), me: e(0.01, 0, 0.03) },
  'deceit-discovered': { other: e(-0.04, -0.12, -0.05), me: e(0, 0, 0, 0, 0.5) },
  'shared-work': { other: e(0.02, 0.01, 0.01, 0, 2), me: e(0.02, 0.01, 0.01, 0, 2) },
};

const isFamily = (rel: Relationship): boolean =>
  rel.roles.some((r) => SOCIAL_DEFAULTS.familyRoles.includes(r));

/** Strongest baseline implied by a set of roles (field-wise max); undefined when no role has one. */
function roleBaseline(roles: readonly string[]): RoleBaseline | undefined {
  let out: RoleBaseline | undefined;
  for (const role of roles) {
    const b = SOCIAL_DEFAULTS.roleBaselines[role];
    if (!b) continue;
    out = out
      ? {
          affection: Math.max(out.affection, b.affection),
          trust: Math.max(out.trust, b.trust),
          familiarity: Math.max(out.familiarity, b.familiarity),
          respect: Math.max(out.respect, b.respect),
        }
      : { ...b };
  }
  return out;
}

export function defaultRelationship(otherId: PersonId, now: Minute): Relationship {
  return {
    otherId,
    affection: 0,
    trust: SOCIAL_DEFAULTS.defaultTrust,
    respect: 0,
    familiarity: 0,
    roles: [],
    ledger: 0,
    lastInteraction: now,
  };
}

/** Read-only lookup: the stored relationship, or a fresh default that is NOT inserted. */
export function relationshipWith(p: Person, otherId: PersonId): Relationship {
  return p.social.relationships.find((r) => r.otherId === otherId) ?? defaultRelationship(otherId, p.now);
}

/** Index of the relationship to drop: least familiar non-role tie, else least familiar overall. */
function evictionIndex(rels: readonly Relationship[]): number {
  let best = -1;
  let bestKey: [number, number, number, string] | undefined;
  rels.forEach((r, i) => {
    const key: [number, number, number, string] = [
      r.roles.length > 0 ? 1 : 0,
      r.familiarity,
      r.lastInteraction,
      r.otherId,
    ];
    if (
      !bestKey ||
      key[0] < bestKey[0] ||
      (key[0] === bestKey[0] &&
        (key[1] < bestKey[1] ||
          (key[1] === bestKey[1] && (key[2] < bestKey[2] || (key[2] === bestKey[2] && key[3] < bestKey[3])))))
    ) {
      best = i;
      bestKey = key;
    }
  });
  return best;
}

function insertBounded(rels: Relationship[], rel: Relationship): void {
  while (rels.length >= SOCIAL_DEFAULTS.maxRelationships) rels.splice(evictionIndex(rels), 1);
  rels.push(rel);
}

/** Returns the stored relationship, inserting a default one (bounded, evicting) if absent. */
export function ensureRelationship(p: Person, otherId: PersonId, now: Minute): Relationship {
  const existing = p.social.relationships.find((r) => r.otherId === otherId);
  if (existing) return existing;
  const rel = defaultRelationship(otherId, now);
  insertBounded(p.social.relationships, rel);
  return rel;
}

/** Builds initial social state. Roles imply baseline affection/trust/familiarity/respect unless given. */
export function seedRelationships(
  specs: readonly (Partial<Relationship> & { otherId: PersonId })[],
  now: Minute,
): SocialState {
  const relationships: Relationship[] = [];
  for (const spec of specs) {
    const roles = [...(spec.roles ?? [])];
    const base = roleBaseline(roles);
    const d = defaultRelationship(spec.otherId, now);
    const rel: Relationship = {
      otherId: spec.otherId,
      affection: clampSigned(spec.affection ?? base?.affection ?? d.affection),
      trust: clamp01(spec.trust ?? base?.trust ?? d.trust),
      respect: clampSigned(spec.respect ?? base?.respect ?? d.respect),
      familiarity: clamp01(spec.familiarity ?? base?.familiarity ?? d.familiarity),
      roles,
      ledger: clamp(spec.ledger ?? 0, -SOCIAL_DEFAULTS.ledgerLimit, SOCIAL_DEFAULTS.ledgerLimit),
      lastInteraction: spec.lastInteraction ?? now,
    };
    const dup = relationships.findIndex((r) => r.otherId === rel.otherId);
    if (dup >= 0) relationships.splice(dup, 1);
    insertBounded(relationships, rel);
  }
  return { relationships };
}

/** Saturating signed update: moves shrink near the bound they head toward. */
function nudgeSigned(x: number, delta: number): number {
  const room = delta >= 0 ? 1 - x : 1 + x;
  return clampSigned(x + delta * room);
}
function nudgeUnit(x: number, delta: number): number {
  const room = delta >= 0 ? 2 * (1 - x) : 2 * x;
  return clamp01(x + delta * room);
}

function growFamiliarity(rel: Relationship, amount: number): void {
  rel.familiarity = clamp01(rel.familiarity + amount * (1 - rel.familiarity));
}

/**
 * Applies a social interaction as experienced by `p`. Trait coefficients: agreeableness scales the
 * affection loss from provocations by (1.5 - A); honesty-humility scales the trust loss from discovered
 * deceit by (0.5 + H). Negative deltas are multiplied by the negativity bias.
 */
export function socialEvent(p: Person, ev: SocialEvent): Relationship {
  const rel = ensureRelationship(p, ev.otherId, ev.at);
  const m = clamp01(ev.magnitude);
  const row = SOCIAL_EVENT_EFFECTS[ev.kind];
  const eff = ev.byMe ? row.me : row.other;
  const bias = SOCIAL_DEFAULTS.negativityBias;
  const neg = (d: number) => (d < 0 ? d * bias : d);

  let dAff = eff.affection;
  let dTrust = eff.trust;
  if (eff.anger && dAff < 0) dAff *= 1.5 - p.traits.agreeableness;
  if (ev.kind === 'deceit-discovered' && !ev.byMe) dTrust *= 0.5 + p.traits.honesty;

  rel.affection = nudgeSigned(rel.affection, neg(dAff) * m);
  rel.trust = nudgeUnit(rel.trust, neg(dTrust) * m);
  rel.respect = nudgeSigned(rel.respect, neg(eff.respect) * m);

  if (ev.kind === 'forgive' && ev.byMe) {
    // Forgiving restores part of the gap to where this tie would normally sit.
    const base = roleBaseline(rel.roles);
    const f = SOCIAL_DEFAULTS.forgiveRestore * m;
    const affTarget = base?.affection ?? 0;
    const trustTarget = base?.trust ?? SOCIAL_DEFAULTS.defaultTrust;
    if (rel.affection < affTarget) rel.affection += f * (affTarget - rel.affection);
    if (rel.trust < trustTarget) rel.trust += f * (trustTarget - rel.trust);
  }

  rel.ledger = round(
    clamp(rel.ledger + eff.ledger * m, -SOCIAL_DEFAULTS.ledgerLimit, SOCIAL_DEFAULTS.ledgerLimit),
  );
  growFamiliarity(rel, SOCIAL_DEFAULTS.familiarityGain * eff.fam * (0.5 + 0.5 * m));
  rel.lastInteraction = Math.max(rel.lastInteraction, ev.at);
  return rel;
}

/**
 * Closed-form drift over `dt` minutes: non-family familiarity decays with a two-year half-life; affection
 * of ties with no role drifts toward 0 by 1% per week. Exact for any split of dt.
 */
export function advanceSocial(p: Person, dt: number): void {
  if (dt <= 0) return;
  for (const rel of p.social.relationships) {
    if (!isFamily(rel)) rel.familiarity = decay(rel.familiarity, dt, SOCIAL_DEFAULTS.familiarityHalfLife);
    if (rel.roles.length === 0) rel.affection = decay(rel.affection, dt, SOCIAL_DEFAULTS.affectionHalfLife);
  }
}

/** Composite closeness 0..1 from warmth, familiarity, trust above neutral, and family role. */
export function closeness(p: Person, otherId: PersonId): Unit {
  const rel = relationshipWith(p, otherId);
  return clamp01(
    0.45 * Math.max(0, rel.affection) +
      0.3 * rel.familiarity +
      0.15 * Math.max(0, (rel.trust - 0.5) * 2) +
      (isFamily(rel) ? 0.1 : 0),
  );
}

const CARE_TAGS = ['help', 'gift'];

/**
 * Social utility terms for one option. One `social:<id>` term per participant (aff.with, plus aff.targetId
 * when it is a known person and the option is tagged social/help/gift), plus `social:group` for groups of
 * `groupFrom` or more others, positive for extraverts and negative for introverts.
 */
export function socialTerms(
  p: Person,
  aff: Affordance,
  ctx: { belongingUrgency: Unit; tendencies: Record<string, number> },
): Term[] {
  const W = SOCIAL_DEFAULTS.terms;
  const tags = aff.tags ?? [];
  const ids = new Set<PersonId>(aff.with ?? []);
  const known = (id: string) => p.social.relationships.some((r) => r.otherId === id);
  if (
    aff.targetId !== undefined &&
    known(aff.targetId) &&
    (tags.includes('social') || tags.some((t) => CARE_TAGS.includes(t)))
  ) {
    ids.add(aff.targetId);
  }
  ids.delete(p.id);
  const caring = tags.some((t) => CARE_TAGS.includes(t)) || CARE_TAGS.includes(aff.action);
  const terms: Term[] = [];
  for (const id of [...ids].sort()) {
    const rel = relationshipWith(p, id);
    let v = W.affection * rel.affection;
    // Belonging pulls toward company, more so toward familiar people, and not toward people one dislikes.
    v +=
      clamp01(ctx.belongingUrgency) *
      W.belonging *
      (0.3 + 0.7 * rel.familiarity) *
      clamp01(0.5 + rel.affection);
    v += (ctx.tendencies[`approach:${id}`] ?? 0) - (ctx.tendencies[`avoid:${id}`] ?? 0);
    if (caring && aff.targetId === id) {
      const care = Math.max(Math.max(0, rel.affection), isFamily(rel) ? 1 : 0);
      v += p.values.benevolence * W.benevolence * care;
    }
    terms.push({ source: `social:${id}`, value: round(v) });
  }
  const others = (aff.with ?? []).filter((id) => id !== p.id).length;
  if (others >= W.groupFrom) {
    const size = clamp01((others - W.groupFrom + 1) / 6);
    terms.push({ source: 'social:group', value: round(W.group * (p.traits.extraversion - 0.5) * 2 * size) });
  }
  return terms;
}

/** Moral weight of an observed act against one held standing, -1..1 before conviction. */
const VIOLATION_WEIGHT: Record<NormStanding, number> = {
  forbidden: -1,
  obligatory: -1,
  disliked: -0.4,
  recommended: -0.3,
  permitted: 0,
};
const FULFILMENT_WEIGHT: Record<NormStanding, number> = {
  obligatory: 0.6,
  recommended: 0.5,
  forbidden: 0.4,
  disliked: 0.2,
  permitted: 0,
};

/**
 * The observer judges another's outward act by the observer's OWN held norms (not the actor's, and without
 * access to intentions). Breaches lower respect and trust in the actor, fulfilments raise respect, both
 * scaled by conviction; harm (negative valence) to someone the observer is close to also costs affection.
 * Returns praiseworthiness -1..1 for affect appraisal. Self-judgement returns a score but changes nothing.
 */
export function judge(
  p: Person,
  observed: { actorId: string; norms: NormTag[]; targetId?: string; valence?: number },
  held: readonly HeldNorm[],
  now: Minute,
): { praiseworthiness: number } {
  let score = 0;
  for (const tag of observed.norms) {
    const h = held.find((n) => n.normId === tag.normId);
    if (!h) continue;
    const w = tag.relation === 'violates' ? VIOLATION_WEIGHT[h.standing] : FULFILMENT_WEIGHT[h.standing];
    score += w * clamp01(h.conviction);
  }
  const praiseworthiness = round(clampSigned(score));
  if (observed.actorId === p.id) return { praiseworthiness };

  const J = SOCIAL_DEFAULTS.judge;
  const bias = SOCIAL_DEFAULTS.negativityBias;
  const harmToClose =
    observed.targetId !== undefined && observed.targetId !== observed.actorId && (observed.valence ?? 0) < 0
      ? clampSigned(observed.valence ?? 0) * closeness(p, observed.targetId)
      : 0;
  if (praiseworthiness === 0 && harmToClose === 0) return { praiseworthiness };

  const rel = ensureRelationship(p, observed.actorId, now);
  if (praiseworthiness < 0) {
    rel.respect = nudgeSigned(rel.respect, praiseworthiness * J.respect * bias);
    rel.trust = nudgeUnit(rel.trust, praiseworthiness * J.trustLoss * bias);
  } else if (praiseworthiness > 0) {
    rel.respect = nudgeSigned(rel.respect, praiseworthiness * J.respect);
    rel.trust = nudgeUnit(rel.trust, praiseworthiness * J.trustGain);
  }
  if (harmToClose < 0) rel.affection = nudgeSigned(rel.affection, harmToClose * J.harmToClose * bias);
  growFamiliarity(rel, J.witnessFamiliarity);
  return { praiseworthiness };
}
