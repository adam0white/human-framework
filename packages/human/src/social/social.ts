/**
 * SCOPE: Dyadic relationships held by one person (affection, trust, respect, familiarity, roles, a favour
 * ledger), updated by experienced social events, by observing others' acts against the observer's own held
 * norms, and by slow drift over time; plus the `social:*` utility terms an option with other people receives.
 * Borrowed shapes: negativity bias (Baumeister et al. 2001, "bad is stronger than good": harms weigh ~2x
 * helps), reciprocity as a favour ledger (Gouldner 1960), the mere-exposure / familiarity growth with
 * diminishing returns, HEXACO agreeableness as tolerance of provocation and honesty-humility as sensitivity
 * to deceit (Ashton & Lee), Schwartz benevolence as care for close others. Observers judge only the outward
 * act and never see intentions. It does NOT model the other person's view of me (each person holds their
 * own one-sided record), attachment styles, or group identity (gossip, reputation and bereavement are in the
 * SCOPE paragraphs further down); the
 * coefficients are engineering defaults, not calibrated estimates.
 */
import { clamp, clamp01, clampSigned, decay, expit, round } from '../core/index.ts';
import type {
  Affordance,
  HeldNorm,
  Minute,
  NormStanding,
  NormTag,
  Person,
  PersonId,
  Relationship,
  Signed,
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
    if (spec.deceasedAt !== undefined) rel.deceasedAt = spec.deceasedAt;
    const dup = relationships.findIndex((r) => r.otherId === rel.otherId);
    if (dup >= 0) relationships.splice(dup, 1);
    insertBounded(relationships, rel);
  }
  return { relationships };
}

/**
 * Add or merge one tie after creation (a birth, an arrival): the tie is built like `seedRelationships` (roles
 * imply baselines, values clamped); when a relationship with that id already exists, roles are unioned and the
 * given fields replace the stored ones (clamped), the rest are kept. Bounded insertion as `ensureRelationship`.
 */
export function seedTie(p: Person, spec: Partial<Relationship> & { otherId: PersonId }): Relationship {
  const existing = p.social.relationships.find((r) => r.otherId === spec.otherId);
  if (!existing) {
    const seeded = seedRelationships([spec], p.now).relationships[0];
    if (!seeded) return ensureRelationship(p, spec.otherId, p.now);
    insertBounded(p.social.relationships, seeded);
    return seeded;
  }
  for (const r of spec.roles ?? []) if (!existing.roles.includes(r)) existing.roles.push(r);
  if (spec.affection !== undefined) existing.affection = clampSigned(spec.affection);
  if (spec.trust !== undefined) existing.trust = clamp01(spec.trust);
  if (spec.respect !== undefined) existing.respect = clampSigned(spec.respect);
  if (spec.familiarity !== undefined) existing.familiarity = clamp01(spec.familiarity);
  if (spec.ledger !== undefined)
    existing.ledger = clamp(spec.ledger, -SOCIAL_DEFAULTS.ledgerLimit, SOCIAL_DEFAULTS.ledgerLimit);
  return existing;
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
  const existing = p.social.relationships.find((r) => r.otherId === ev.otherId);
  // Interaction with someone who has died is impossible: the tie is kept exactly as it was.
  if (existing && isDeceasedTie(existing)) return existing;
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
    if (!isFamily(rel) && !isDeceasedTie(rel))
      rel.familiarity = decay(rel.familiarity, dt, SOCIAL_DEFAULTS.familiarityHalfLife);
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
    // No company term for someone who has died (hosts should not offer it; a grave visit is not company).
    if (isDeceasedTie(rel)) continue;
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
  if (isDeceasedTie(rel)) return { praiseworthiness };
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

// ---------------------------------------------------------------------------------------------
// Bereavement: ties to people who have died
// ---------------------------------------------------------------------------------------------

/**
 * SCOPE (bereavement ties): a relationship with someone who has died is kept, not deleted: it gains the role
 * 'deceased' and `deceasedAt`, affection, trust, respect and familiarity are frozen (no drift, no events, no
 * company term), and memory's `recallByCue` treats episodes involving them as grief cues. Named shape: the
 * continuing-bonds account of bereavement (Klass, Silverman & Nickman 1996), in which the bond to the dead
 * is transformed rather than severed. It does NOT model grief stages (rejected as a fixed sequence by later
 * work), prolonged grief disorder, the bond's slow transformation, or any religious claim about the dead;
 * frozen values are an engineering default.
 */
export const DECEASED_ROLE = 'deceased';

export function isDeceasedTie(rel: Relationship): boolean {
  return rel.deceasedAt !== undefined || rel.roles.includes(DECEASED_ROLE);
}

/** Read-only: does `p` hold `otherId` as someone who has died? */
export function isDeceased(p: Person, otherId: PersonId): boolean {
  const rel = p.social.relationships.find((r) => r.otherId === otherId);
  return rel !== undefined && isDeceasedTie(rel);
}

/** Ids `p` holds as deceased, sorted. */
export function deceasedIds(p: Person): PersonId[] {
  return p.social.relationships
    .filter(isDeceasedTie)
    .map((r) => r.otherId)
    .sort();
}

/**
 * Record that `otherId` has died. Keeps every existing role (a spouse stays a spouse) and all values; adds
 * the 'deceased' role and `deceasedAt`. Idempotent: an earlier `deceasedAt` is kept.
 */
export function markDeceased(p: Person, otherId: PersonId, at: Minute): Relationship {
  const rel = ensureRelationship(p, otherId, at);
  if (!rel.roles.includes(DECEASED_ROLE)) rel.roles.push(DECEASED_ROLE);
  if (rel.deceasedAt === undefined || at < rel.deceasedAt) rel.deceasedAt = at;
  return rel;
}

// ---------------------------------------------------------------------------------------------
// Reputation: what others believe about a person, and how hearsay moves my view of them
// ---------------------------------------------------------------------------------------------

/** Relationship deltas per unit of credence change in `<personId>:<trait>`. Hosts may pass their own table. */
export interface TraitEffect {
  affection: number;
  trust: number;
  respect: number;
}

/**
 * SCOPE (hearsay → relationship): a belief about a person's character, stored as the proposition
 * `<personId>:<trait>` (e.g. 'p3:dishonest'), moves my relationship with that person in proportion to how
 * far my credence moved, damped by how well I know them (first-hand familiarity weighs against hearsay),
 * with negative moves weighted by the negativity bias. Named shapes: indirect reciprocity by reputation
 * (Nowak & Sigmund 1998) and the finding that gossip shifts cooperation toward its target even when direct
 * observation is available (Sommerfeld et al. 2007). Reputation is then nothing but these beliefs spread
 * by `conversation/`. It does NOT model inference between traits, a shared public record, the listener's
 * suspicion of the gossiper's motive (beyond source trust in `beliefs/`), or group stereotypes; the trait
 * table is an engineering vocabulary. Nothing here scores worth: 'pious' and the like are deliberately absent.
 */
export const REPUTATION_TRAITS: Record<string, TraitEffect> = {
  honest: { affection: 0.02, trust: 0.12, respect: 0.06 },
  dishonest: { affection: -0.04, trust: -0.15, respect: -0.08 },
  reliable: { affection: 0.01, trust: 0.1, respect: 0.05 },
  unreliable: { affection: -0.02, trust: -0.1, respect: -0.05 },
  generous: { affection: 0.06, trust: 0.03, respect: 0.05 },
  stingy: { affection: -0.05, trust: -0.02, respect: -0.04 },
  kind: { affection: 0.07, trust: 0.03, respect: 0.03 },
  cruel: { affection: -0.1, trust: -0.06, respect: -0.06 },
  hardworking: { affection: 0.01, trust: 0.02, respect: 0.08 },
  lazy: { affection: -0.02, trust: -0.02, respect: -0.07 },
  /** 'p:owes:<creditor>' maps to this entry: owing money lowers expected reliability a little. */
  owes: { affection: 0, trust: -0.04, respect: -0.03 },
};

export const REPUTATION_DEFAULTS = {
  /** First-hand familiarity damps hearsay: scale = 1 - familiarityDamping × familiarity. */
  familiarityDamping: 0.5,
};

/** Splits a character proposition '<personId>:<trait>[:...]' into its subject and trait, if it is one. */
export function parseTraitProp(
  prop: string,
  table: Record<string, TraitEffect> = REPUTATION_TRAITS,
): { personId: PersonId; trait: string } | undefined {
  const parts = prop.split(':');
  if (parts.length < 2) return undefined;
  const personId = parts[0] as string;
  const trait = parts[1] as string;
  if (personId === '' || table[trait] === undefined) return undefined;
  return { personId, trait };
}

/**
 * Apply a change of credence in a character proposition to my relationship with its subject. Call after
 * every `believe`/`confirm` with the credence before and after. Returns the relationship, or null when the
 * proposition is not a character claim, is about myself or someone who has died, or did not move.
 */
export function applyReputationBelief(
  p: Person,
  prop: string,
  before: Unit,
  after: Unit,
  now: Minute,
  table: Record<string, TraitEffect> = REPUTATION_TRAITS,
): Relationship | null {
  const parsed = parseTraitProp(prop, table);
  if (!parsed || parsed.personId === p.id) return null;
  const moved = after - before;
  if (Math.abs(moved) < 1e-9) return null;
  const existing = p.social.relationships.find((r) => r.otherId === parsed.personId);
  if (existing && isDeceasedTie(existing)) return null;
  const effect = table[parsed.trait] as TraitEffect;
  const rel = existing ?? ensureRelationship(p, parsed.personId, now);
  const scale = moved * (1 - REPUTATION_DEFAULTS.familiarityDamping * rel.familiarity);
  const bias = SOCIAL_DEFAULTS.negativityBias;
  const neg = (d: number) => (d < 0 ? d * bias : d);
  rel.affection = nudgeSigned(rel.affection, neg(effect.affection * scale));
  rel.trust = nudgeUnit(rel.trust, neg(effect.trust * scale));
  rel.respect = nudgeSigned(rel.respect, neg(effect.respect * scale));
  return rel;
}

/** Whether a character claim about a person is unfavourable to them (for backbiting tags). */
export function isUnfavourableTrait(
  trait: string,
  value: boolean,
  table: Record<string, TraitEffect> = REPUTATION_TRAITS,
): boolean {
  const e = table[trait];
  if (!e) return false;
  const sum = e.affection + e.trust + e.respect;
  return value ? sum < 0 : sum > 0;
}

export interface Reputation {
  targetId: PersonId;
  /** People (other than the target) who hold a relationship with or a character belief about the target. */
  knownBy: number;
  /** Familiarity-weighted mean of (respect + 2 × (trust − 0.5)) / 2 over holders of a relationship, −1..1. */
  standing: Signed;
  /** Familiarity-weighted mean trust over holders of a relationship (0.5 when nobody knows them). */
  trust: Unit;
  /** Familiarity-weighted mean respect (0 when nobody knows them). */
  respect: Signed;
  /** Mean credence per character trait over the people who hold a belief about it. */
  traits: Record<string, Unit>;
}

/**
 * Read-only reputation of `targetId` in a community: aggregated from each other person's relationship with
 * them and their beliefs '<targetId>:<trait>'. No one's state changes. People who hold the target as
 * deceased still count (a reputation outlives a person).
 */
export function reputation(
  people: readonly Person[],
  targetId: PersonId,
  table: Record<string, TraitEffect> = REPUTATION_TRAITS,
): Reputation {
  let weight = 0;
  let trust = 0;
  let respect = 0;
  let knownBy = 0;
  const traitSum: Record<string, { sum: number; n: number }> = {};
  for (const q of [...people].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    if (q.id === targetId) continue;
    let knows = false;
    const rel = q.social.relationships.find((r) => r.otherId === targetId);
    if (rel) {
      knows = true;
      const w = 0.25 + 0.75 * rel.familiarity;
      weight += w;
      trust += w * rel.trust;
      respect += w * rel.respect;
    }
    for (const b of q.memory.beliefs) {
      const parsed = parseTraitProp(b.prop, table);
      if (!parsed || parsed.personId !== targetId) continue;
      knows = true;
      const slot = traitSum[parsed.trait] ?? { sum: 0, n: 0 };
      slot.sum += expit(b.logOdds);
      slot.n += 1;
      traitSum[parsed.trait] = slot;
    }
    if (knows) knownBy += 1;
  }
  const meanTrust = weight > 0 ? trust / weight : SOCIAL_DEFAULTS.defaultTrust;
  const meanRespect = weight > 0 ? respect / weight : 0;
  const traits: Record<string, Unit> = {};
  for (const k of Object.keys(traitSum).sort()) {
    const slot = traitSum[k] as { sum: number; n: number };
    traits[k] = round(slot.sum / slot.n);
  }
  return {
    targetId,
    knownBy,
    standing: round(clampSigned((meanRespect + 2 * (meanTrust - 0.5)) / 2)),
    trust: round(meanTrust),
    respect: round(meanRespect),
    traits,
  };
}
