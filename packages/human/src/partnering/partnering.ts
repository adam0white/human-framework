/**
 * SCOPE: courtship, marriage and widowhood (HF 2.0 L3). Owns the optional `Person.bonds` slice; a person a host never
 * courts or marries has none, so existing runs are unchanged.
 *
 * Attraction (`attraction(p, other)`) is how attractive `other` is to `p`: age fit × (0.35 affection + 0.2 familiarity +
 * 0.25 values similarity + 0.1 trait similarity + 0.1 the other's honesty and agreeableness). Familiarity and
 * interaction raise attraction (mere exposure r ≈ .26, F16; getting acquainted raises liking, F15, both in
 * research/family-environment-sources.md); spouses resemble each other in values and religiousness far more than in
 * personality (F6, F18), hence the weights; actual similarity matters most at first and perceived similarity
 * throughout (F17), which this does not separate. `compatibility(a, b)` = 0.7 values + 0.3 traits similarity.
 * The weights are engineering assumptions shaped by those findings.
 *
 * Courtship (`court(a, b, at)`) is meeting over time: each meeting is a chat for both people (`social/` moves
 * affection and familiarity), then raises each side’s warmth by 0.12 × appeal × quality × attachment factor × (1 −
 * warmth); warmth fades with a 60-day half-life between meetings. A courtship is ready for a proposal at warmth
 * 0.55 after 6 meetings over 30 days (assumptions). Proposal and acceptance are Assent decisions: the host offers
 * `proposalOffers` (accept, decline) and the person decides like any other choice, so a person can refuse. Their
 * `partner:<id>` terms come from warmth and appeal; decline carries a small status-quo term. Family involvement is
 * the host's to express: `familyVoices` turns relatives' approval into weighed suggestions (approval from one's
 * network goes with better relationships, F19), never a mandate. A firm understanding of the marriage norms
 * (`MARRIAGE_NORMS`) vetoes an unchaperoned courting offer, a forbidden-kin match, or marrying a bride whose
 * guardian refused justly (an unjust refusal does not block, 2:232); a person who does not hold them is not
 * vetoed.
 *
 * Marriage (`marry`) checks the host's `MarriageCustom` (`canMarry`: age, kin degrees by `kinship`, existing
 * marriages, a waiting period, a guardian's refusal) and records it on both people, with the spouse role and a
 * strongly positive memory. Two customs are provided: `GENERIC_CUSTOM` (blood kin forbidden, no guardian, no
 * waiting period) and `MUSLIM_CUSTOM`, the majority understanding recorded in research/decisions.md (the degrees of
 * 4:22–23, the bride's guardian, a widow's 130-day wait, none for a widower). Widowhood (`widow`, called by the
 * composite when a spouse's death is perceived) ends the marriage and starts the waiting period the person's custom
 * fixed at the wedding; grief comes from the ordinary loss appraisal. `widowhoodMortality` gives the host a hazard
 * multiplier: 1.41 in the first six months, then 1.27 for men and 1.15 for women (F20); most bereaved people are
 * resilient (F21), which the framework's grief decay already reflects.
 *
 * Not modelled: divorce (deferred; permitted with a procedure, research/marriage-sources.md §9), polygyny (custom
 * `maxSpouses` exists, default 1, but nothing else supports it), mahr, witnesses and the ceremony (host ceremony),
 * sexual behaviour, infidelity, marital quality over years beyond the relationship slice, remarriage norms beyond the
 * waiting period, fosterage, and same-sex pairing (custom `pairing` is the host's choice).
 */
import { feel } from '../affect/index.ts';
import { clamp01, dpow, latestPerId } from '../core/index.ts';
import { attachmentOf } from '../family/index.ts';
import { ageYears } from '../lifecourse/index.ts';
import { remember } from '../memory/index.ts';
import { relationshipWith, seedTie, socialEvent } from '../social/index.ts';
import type {
  Affordance,
  BondsState,
  Courtship,
  Marriage,
  Minute,
  NormTag,
  Person,
  PersonId,
  Signed,
  Suggestion,
  Term,
  Unit,
} from '../types.ts';
import { MINUTES_PER_DAY, TRAIT_KEYS, VALUE_KEYS } from '../types.ts';

export const PARTNERING_DEFAULTS = {
  /** Warmth gained per meeting at appeal 1, quality 1 (saturating). */
  warmthGain: 0.12,
  warmthHalfLifeDays: 60,
  /** A courtship is ready for a proposal at this warmth, meetings and days. */
  readyWarmth: 0.55,
  readyMeetings: 6,
  readyDays: 30,
  maxCourtships: 6,
  /** Courting pull: courtScale × (interest − courtFloor). */
  courtScale: 0.8,
  courtFloor: 0.3,
  /** Proposal pull: proposalScale × (readiness − proposalFloor), readiness = 0.6 warmth + 0.4 appeal. */
  proposalScale: 2.5,
  proposalFloor: 0.4,
  /** The pull of leaving things as they are when declining. */
  statusQuo: 0.15,
  /** Strength of a relative's suggestion per unit of approval (`familyVoices`). */
  familyWeight: 0.5,
  /** Pull against courting or marrying someone else while married or in a waiting period. */
  unavailable: 1,
  /** Widowhood mortality multipliers (F20). */
  widowhoodEarly: 1.41,
  widowhoodEarlyDays: 182,
  widowhoodMen: 1.27,
  widowhoodWomen: 1.15,
};

/** What `b` is to `a`, from social roles (and an optional lookup for grandparents and aunts or uncles). */
export type Kin =
  | 'spouse'
  | 'parent'
  | 'child'
  | 'sibling'
  | 'grandparent'
  | 'grandchild'
  | 'aunt-uncle'
  | 'niece-nephew'
  | 'step-parent'
  | 'step-child'
  | 'parent-in-law'
  | 'child-in-law';

export const BLOOD_KIN: readonly Kin[] = [
  'parent',
  'child',
  'sibling',
  'grandparent',
  'grandchild',
  'aunt-uncle',
  'niece-nephew',
];
/** Affinity degrees of Qur'an 4:22–23 (father's wife, wife's mother, stepchild, son's wife). */
export const AFFINITY_KIN: readonly Kin[] = ['step-parent', 'step-child', 'parent-in-law', 'child-in-law'];

/** How a host's society arranges marriage. Plain data; the framework mandates none of it. */
export interface MarriageCustom {
  id: string;
  minAge: number;
  forbiddenKin: readonly Kin[];
  /** The bride's guardian's just refusal blocks the marriage (`canMarry` with `guardian: 'refused'`). */
  guardianForBride: boolean;
  /** Waiting period in days after a spouse's death before remarrying. */
  mourningDays: { widow: number; widower: number };
  maxSpouses: number;
  pairing: 'opposite-sex' | 'any';
  /** Where the custom's rules come from. */
  provenance: string;
}

export const GENERIC_CUSTOM: MarriageCustom = {
  id: 'generic',
  minAge: 18,
  forbiddenKin: BLOOD_KIN,
  guardianForBride: false,
  mourningDays: { widow: 0, widower: 0 },
  maxSpouses: 1,
  pairing: 'opposite-sex',
  provenance: 'Engineering default: blood kin forbidden, adults only; no guardian or waiting period',
};

/** The majority Muslim understanding recorded in research/decisions.md (sources: research/marriage-sources.md). */
export const MUSLIM_CUSTOM: MarriageCustom = {
  id: 'muslim-majority',
  minAge: 18,
  forbiddenKin: [...BLOOD_KIN, ...AFFINITY_KIN],
  guardianForBride: true,
  mourningDays: { widow: 130, widower: 0 },
  maxSpouses: 1,
  pairing: 'opposite-sex',
  provenance:
    "Qur'an 4:22-24 (degrees), Abu Dawud 2085 and the majority of schools (guardian), 2:234 and Bukhari 1280 (a widow's four months and ten days, rounded to 130 days); minimum age 18 and one spouse are engineering defaults (research/decisions.md)",
};

/** The guardian's stance on a bride's marriage, as the host knows it. */
export type GuardianStance = 'consented' | 'refused' | 'refused-unjustly' | 'none';

// ---------------------------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------------------------

const bondsOf = (p: Person): BondsState => {
  p.bonds ??= { courtships: [], marriages: [] };
  return p.bonds;
};

const courtshipWith = (p: Person, id: PersonId): Courtship | undefined =>
  p.bonds?.courtships.find((c) => c.withId === id);

/**
 * Validate a saved bonds slice; undefined when it is not an object (used by `restore`). Malformed entries are
 * dropped; warmth and appeal are clamped to 0..1, meetings and a marriage's `mourningDays` to ≥ 0; one courtship
 * per person (the latest met) and one marriage per spouse (the latest begun) are kept; past `maxCourtships`, engaged
 * courtships are kept first, then the most recently met. A waiting period that ends before it starts is dropped.
 * A save the engine wrote is already within all of this. @internal
 */
export function sanitizeBonds(x: unknown): BondsState | undefined {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return undefined;
  const b = x as Record<string, unknown>;
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const valid = (Array.isArray(b.courtships) ? b.courtships : []).filter(
    (c): c is Courtship =>
      typeof c === 'object' &&
      c !== null &&
      typeof c.withId === 'string' &&
      num(c.since) &&
      num(c.warmth) &&
      num(c.appeal) &&
      num(c.meetings) &&
      num(c.lastAt) &&
      (c.engagedAt === undefined || num(c.engagedAt)),
  );
  for (const c of valid) {
    if (c.warmth !== clamp01(c.warmth)) c.warmth = clamp01(c.warmth);
    if (c.appeal !== clamp01(c.appeal)) c.appeal = clamp01(c.appeal);
    if (c.meetings < 0) c.meetings = 0;
  }
  let courtships = latestPerId(
    valid,
    (c) => c.withId,
    (c) => c.lastAt,
  );
  if (courtships.length > PARTNERING_DEFAULTS.maxCourtships) {
    const rank = courtships
      .map((c, i) => ({ c, i }))
      .sort(
        (p, q) =>
          Number(q.c.engagedAt !== undefined) - Number(p.c.engagedAt !== undefined) ||
          q.c.lastAt - p.c.lastAt ||
          q.i - p.i,
      );
    const keep = new Set(rank.slice(0, PARTNERING_DEFAULTS.maxCourtships).map((e) => e.c));
    courtships = courtships.filter((c) => keep.has(c));
  }
  const married = (Array.isArray(b.marriages) ? b.marriages : []).filter(
    (m): m is Marriage =>
      typeof m === 'object' &&
      m !== null &&
      typeof m.spouseId === 'string' &&
      num(m.since) &&
      (m.endedAt === undefined || num(m.endedAt)) &&
      (m.end === undefined || m.end === 'widowed') &&
      (m.mourningDays === undefined || num(m.mourningDays)),
  );
  for (const m of married) if (m.mourningDays !== undefined && m.mourningDays < 0) m.mourningDays = 0;
  const marriages = latestPerId(
    married,
    (m) => m.spouseId,
    (m) => m.since,
  );
  const out: BondsState = { courtships, marriages };
  const mo = b.mourning as Record<string, unknown> | undefined;
  if (
    mo &&
    typeof mo === 'object' &&
    typeof mo.forId === 'string' &&
    num(mo.since) &&
    num(mo.until) &&
    (mo.until as number) >= (mo.since as number)
  )
    out.mourning = { forId: mo.forId, since: mo.since as number, until: mo.until as number };
  return out;
}

/** Current marriages (not ended). */
export function spousesOf(p: Person): PersonId[] {
  return (p.bonds?.marriages ?? []).filter((m) => m.endedAt === undefined).map((m) => m.spouseId);
}

/** Whether `p` is in a waiting period at `now`. */
export function inMourning(p: Person, now: Minute = p.now): boolean {
  const m = p.bonds?.mourning;
  return m !== undefined && now < m.until;
}

// ---------------------------------------------------------------------------------------------
// Attraction and compatibility
// ---------------------------------------------------------------------------------------------

function similarity<T extends object>(a: T, b: T, keys: readonly (keyof T)[]): Unit {
  let d = 0;
  for (const k of keys) d += Math.abs((a[k] as number) - (b[k] as number));
  return clamp01(1 - (2 * d) / keys.length);
}

/** Values similarity 0..1 (1 = identical). */
export function valuesSimilarity(a: Person, b: Person): Unit {
  return similarity(a.values, b.values, VALUE_KEYS);
}

/** Age fit 0..1: 0 if either is under 16; full within 5 years, falling linearly to 0 at 20 years apart but floored at 0.1,
 * which is reached at about 18.5 years apart. */
export function ageFit(a: Person, b: Person): Unit {
  const x = ageYears(a);
  const y = ageYears(b);
  if (x < 16 || y < 16) return 0;
  return Math.max(0.1, 1 - Math.max(0, Math.abs(x - y) - 5) / 15);
}

/** How attractive `other` is to `p`, 0..1 (see SCOPE). Read only. */
export function attraction(p: Person, other: Person): Unit {
  const rel = relationshipWith(p, other.id);
  const appeal = (other.traits.honesty + other.traits.agreeableness) / 2;
  return clamp01(
    ageFit(p, other) *
      (0.35 * Math.max(0, rel.affection) +
        0.2 * rel.familiarity +
        0.25 * valuesSimilarity(p, other) +
        0.1 * similarity(p.traits, other.traits, TRAIT_KEYS) +
        0.1 * appeal),
  );
}

/** Compatibility of two people, 0..1: 0.7 values + 0.3 traits similarity (F18). Symmetric, read only. */
export function compatibility(a: Person, b: Person): Unit {
  return clamp01(0.7 * valuesSimilarity(a, b) + 0.3 * similarity(a.traits, b.traits, TRAIT_KEYS));
}

// ---------------------------------------------------------------------------------------------
// Courtship
// ---------------------------------------------------------------------------------------------

/** Warmth of a courtship at `now`, after fading since the last meeting. */
function warmthNow(c: Courtship, now: Minute): Unit {
  const days = Math.max(0, now - c.lastAt) / MINUTES_PER_DAY;
  return clamp01(c.warmth * dpow(0.5, days / PARTNERING_DEFAULTS.warmthHalfLifeDays));
}

function touchCourtship(p: Person, other: Person, at: Minute, quality: Unit): Courtship {
  const P = PARTNERING_DEFAULTS;
  const b = bondsOf(p);
  let c = courtshipWith(p, other.id);
  if (!c) {
    c = { withId: other.id, since: at, warmth: 0, appeal: 0, meetings: 0, lastAt: at };
    b.courtships.push(c);
    while (b.courtships.length > P.maxCourtships) {
      let worst = -1;
      let low = Number.POSITIVE_INFINITY;
      for (const [i, x] of b.courtships.entries()) {
        if (x === c || x.engagedAt !== undefined) continue;
        const w = warmthNow(x, at);
        if (w < low) {
          low = w;
          worst = i;
        }
      }
      if (worst < 0) break;
      b.courtships.splice(worst, 1);
    }
  }
  const w0 = warmthNow(c, at);
  c.appeal = attraction(p, other);
  const attach = 1 + 0.5 * (attachmentOf(p) - 0.6);
  c.warmth = clamp01(w0 + P.warmthGain * c.appeal * clamp01(quality) * attach * (1 - w0));
  c.meetings += 1;
  c.lastAt = at;
  return c;
}

/**
 * One courting meeting between `a` and `b` at `at` (quality 0..1, default 1): a chat for both, then warmth on each
 * side by that side's appeal. Returns both sides' courtships. Nothing happens if either is dead.
 */
export function court(
  a: Person,
  b: Person,
  at: Minute,
  opts: { quality?: Unit } = {},
): { a: Courtship; b: Courtship } | undefined {
  if (!a.body.alive || !b.body.alive || a.id === b.id) return undefined;
  const q = clamp01(opts.quality ?? 1);
  socialEvent(a, { at, kind: 'chat', otherId: b.id, byMe: false, magnitude: q });
  socialEvent(b, { at, kind: 'chat', otherId: a.id, byMe: false, magnitude: q });
  return { a: { ...touchCourtship(a, b, at, q) }, b: { ...touchCourtship(b, a, at, q) } };
}

export type CourtshipStage = 'none' | 'courting' | 'ready' | 'engaged' | 'married';

/** Where p stands with `otherId` at `now`. */
export function courtshipStage(p: Person, otherId: PersonId, now: Minute = p.now): CourtshipStage {
  if (spousesOf(p).includes(otherId)) return 'married';
  const c = courtshipWith(p, otherId);
  if (!c) return 'none';
  if (c.engagedAt !== undefined) return 'engaged';
  const P = PARTNERING_DEFAULTS;
  const ready =
    warmthNow(c, now) >= P.readyWarmth &&
    c.meetings >= P.readyMeetings &&
    now - c.since >= P.readyDays * MINUTES_PER_DAY;
  return ready ? 'ready' : 'courting';
}

/** Record an engagement on both sides (after an accepted proposal, when the host's custom has one). */
export function betroth(a: Person, b: Person, at: Minute): void {
  for (const [x, y] of [
    [a, b],
    [b, a],
  ] as const) {
    const c = courtshipWith(x, y.id) ?? touchCourtship(x, y, at, 0);
    c.engagedAt = at;
  }
}

// ---------------------------------------------------------------------------------------------
// Kinship and the custom
// ---------------------------------------------------------------------------------------------

const withRole = (p: Person, role: string): Set<PersonId> =>
  new Set(p.social.relationships.filter((r) => r.roles.includes(role)).map((r) => r.otherId));

function spouseSet(p: Person): Set<PersonId> {
  const s = withRole(p, 'spouse');
  for (const m of p.bonds?.marriages ?? []) s.add(m.spouseId);
  return s;
}

const meets = (a: Set<PersonId>, b: Set<PersonId>) => [...a].some((x) => b.has(x));

/**
 * What `b` is to `a`, derived from both people's social roles ('parent', 'child', 'sibling', 'grandparent',
 * 'grandchild', 'spouse') and marriages. `lookup` resolves other people for degrees two steps away (a parent's
 * parents and siblings). Undefined when no relation within these degrees is found. Ancestors beyond grandparents
 * and fosterage are not traced.
 */
export function kinship(
  a: Person,
  b: Person,
  lookup?: (id: PersonId) => Person | undefined,
): Kin | undefined {
  if (a.id === b.id) return undefined;
  const parentsA = withRole(a, 'parent');
  const parentsB = withRole(b, 'parent');
  const childrenA = withRole(a, 'child');
  const childrenB = withRole(b, 'child');
  const spousesA = spouseSet(a);
  const spousesB = spouseSet(b);
  if (spousesA.has(b.id) || spousesB.has(a.id)) return 'spouse';
  if (parentsA.has(b.id) || childrenB.has(a.id)) return 'parent';
  if (childrenA.has(b.id) || parentsB.has(a.id)) return 'child';
  if (withRole(a, 'sibling').has(b.id) || withRole(b, 'sibling').has(a.id) || meets(parentsA, parentsB))
    return 'sibling';
  const grandparents = (p: Person, parents: Set<PersonId>) => {
    const g = withRole(p, 'grandparent');
    for (const id of lookup ? parents : []) {
      const parent = lookup?.(id);
      if (parent) for (const x of withRole(parent, 'parent')) if (x !== p.id) g.add(x);
    }
    return g;
  };
  const gpA = grandparents(a, parentsA);
  const gpB = grandparents(b, parentsB);
  if (gpA.has(b.id) || withRole(b, 'grandchild').has(a.id) || meets(parentsA, childrenB))
    return 'grandparent';
  if (gpB.has(a.id) || withRole(a, 'grandchild').has(b.id) || meets(childrenA, parentsB)) return 'grandchild';
  const siblingsOf = (p: Person) => withRole(p, 'sibling');
  if (meets(parentsB, gpA) || meets(siblingsOf(b), parentsA)) return 'aunt-uncle';
  if (meets(parentsA, gpB) || meets(siblingsOf(a), parentsB)) return 'niece-nephew';
  if (meets(spousesB, parentsA)) return 'step-parent';
  if (meets(spousesA, parentsB)) return 'step-child';
  if (meets(spousesA, childrenB)) return 'parent-in-law';
  if (meets(spousesB, childrenA)) return 'child-in-law';
  return undefined;
}

/** Degrees of Qur'an 4:22–23 (blood and affinity), for tagging offers against the `kin-marriage` norm. */
const KIN_NORM_DEGREES: readonly Kin[] = [...BLOOD_KIN, ...AFFINITY_KIN];

export interface CanMarryOptions {
  at?: Minute;
  guardian?: GuardianStance;
  lookup?: (id: PersonId) => Person | undefined;
}

/** Whether the host's custom allows `a` and `b` to marry now, and why not. Read only. */
export function canMarry(
  a: Person,
  b: Person,
  custom: MarriageCustom = GENERIC_CUSTOM,
  opts: CanMarryOptions = {},
): { ok: boolean; reason?: string } {
  const at = opts.at ?? a.now;
  if (a.id === b.id) return { ok: false, reason: 'self' };
  if (!a.body.alive || !b.body.alive) return { ok: false, reason: 'dead' };
  if (custom.pairing === 'opposite-sex' && a.life.sex === b.life.sex) return { ok: false, reason: 'pairing' };
  if (ageYears(a) < custom.minAge || ageYears(b) < custom.minAge) return { ok: false, reason: 'age' };
  if (spousesOf(a).includes(b.id)) return { ok: false, reason: 'married' };
  if (spousesOf(a).length >= custom.maxSpouses || spousesOf(b).length >= custom.maxSpouses)
    return { ok: false, reason: 'already-married' };
  if (inMourning(a, at) || inMourning(b, at)) return { ok: false, reason: 'mourning' };
  const kin = kinship(a, b, opts.lookup);
  if (kin !== undefined && custom.forbiddenKin.includes(kin)) return { ok: false, reason: `kin:${kin}` };
  const hasBride = a.life.sex === 'female' || b.life.sex === 'female';
  if (custom.guardianForBride && hasBride && opts.guardian === 'refused')
    return { ok: false, reason: 'guardian' };
  return { ok: true };
}

/**
 * Marry `a` and `b` at `at` if `canMarry` allows: records the marriage on both (with the waiting period each would
 * observe if widowed, from the custom), adds the spouse role, clears all of their courtships (including with each other) when the custom
 * allows one spouse (`maxSpouses <= 1`; otherwise only the courtship between the two ends), and leaves a joyful memory and love. Returns the `canMarry` verdict.
 */
export function marry(
  a: Person,
  b: Person,
  at: Minute,
  custom: MarriageCustom = GENERIC_CUSTOM,
  opts: Omit<CanMarryOptions, 'at'> = {},
): { ok: boolean; reason?: string } {
  const verdict = canMarry(a, b, custom, { ...opts, at });
  if (!verdict.ok) return verdict;
  for (const [x, y] of [
    [a, b],
    [b, a],
  ] as const) {
    const bonds = bondsOf(x);
    const days = x.life.sex === 'female' ? custom.mourningDays.widow : custom.mourningDays.widower;
    const m: Marriage = { spouseId: y.id, since: at };
    if (days > 0) m.mourningDays = days;
    bonds.marriages.push(m);
    if (custom.maxSpouses <= 1) bonds.courtships = [];
    else bonds.courtships = bonds.courtships.filter((c) => c.withId !== y.id);
    delete bonds.mourning;
    seedTie(x, { otherId: y.id, roles: ['spouse'] });
    remember(x, {
      at,
      kind: 'family',
      action: 'marry',
      targetId: y.id,
      valence: 0.9,
      salience: 0.95,
      summary: 'married',
      tags: ['marriage', 'family'],
    });
    feel(x, 'joy', 0.7, `event:marriage:${y.id}`, at, y.id);
    feel(x, 'love', 0.6, `event:marriage:${y.id}`, at, y.id);
  }
  return verdict;
}

/**
 * End p's marriage to `spouseId` by the spouse's death at `at`, and begin the waiting period fixed at the wedding.
 * Idempotent. Returns true when a marriage was ended.
 */
export function widow(p: Person, spouseId: PersonId, at: Minute): boolean {
  const m = p.bonds?.marriages.find((x) => x.spouseId === spouseId && x.endedAt === undefined);
  if (!m || !p.bonds) return false;
  m.endedAt = at;
  m.end = 'widowed';
  if ((m.mourningDays ?? 0) > 0) {
    p.bonds.mourning = { forId: spouseId, since: at, until: at + (m.mourningDays ?? 0) * MINUTES_PER_DAY };
  }
  return true;
}

/** Hazard multiplier from widowhood for the host's mortality model (1 when not widowed or remarried; F20). */
export function widowhoodMortality(p: Person, now: Minute = p.now): number {
  if (!p.bonds || spousesOf(p).length > 0) return 1;
  let last: Marriage | undefined;
  for (const m of p.bonds.marriages)
    if (m.end === 'widowed' && (!last || (m.endedAt ?? 0) > (last.endedAt ?? 0))) last = m;
  if (!last || last.endedAt === undefined) return 1;
  const P = PARTNERING_DEFAULTS;
  if (now - last.endedAt < P.widowhoodEarlyDays * MINUTES_PER_DAY) return P.widowhoodEarly;
  return p.life.sex === 'male' ? P.widowhoodMen : P.widowhoodWomen;
}

// ---------------------------------------------------------------------------------------------
// Offers, voices and decision terms
// ---------------------------------------------------------------------------------------------

function marriageNorms(
  p: Person,
  other: Person,
  guardian: GuardianStance | undefined,
  lookup?: (id: PersonId) => Person | undefined,
): NormTag[] {
  const tags: NormTag[] = [];
  const kin = kinship(p, other, lookup);
  if (kin !== undefined && KIN_NORM_DEGREES.includes(kin))
    tags.push({ normId: 'kin-marriage', relation: 'violates' });
  const hasBride = p.life.sex === 'female' || other.life.sex === 'female';
  if (hasBride && guardian === 'refused')
    tags.push({ normId: 'marry-without-guardian', relation: 'violates' });
  return tags;
}

/**
 * An offer to spend time courting `other` (90 minutes by default). Unchaperoned courting is tagged as seclusion, so
 * a person who firmly holds that norm will not take it.
 */
export function courtingOffer(
  other: Person,
  opts: { id?: string; duration?: number; chaperoned?: boolean; placeId?: string } = {},
): Affordance {
  const aff: Affordance = {
    id: opts.id ?? `court:${other.id}`,
    action: 'court',
    label: `Spend time with ${other.name}`,
    targetId: other.id,
    with: [other.id],
    duration: opts.duration ?? 90,
    effort: 0.1,
    advertises: { belonging: 0.15, leisure: 0.1 },
    tags: ['partnering', 'social'],
  };
  if (opts.placeId !== undefined) aff.placeId = opts.placeId;
  if (opts.chaperoned === false) aff.norms = [{ normId: 'seclusion', relation: 'violates' }];
  return aff;
}

/** An offer to propose marriage to `other`. */
export function proposeOffer(
  p: Person,
  other: Person,
  opts: { id?: string; guardian?: GuardianStance; lookup?: (id: PersonId) => Person | undefined } = {},
): Affordance {
  const norms = marriageNorms(p, other, opts.guardian, opts.lookup);
  const aff: Affordance = {
    id: opts.id ?? `propose:${other.id}`,
    action: 'propose',
    label: `Propose to ${other.name}`,
    targetId: other.id,
    with: [other.id],
    duration: 30,
    effort: 0.05,
    advertises: { belonging: 0.2, meaning: 0.1 },
    tags: ['partnering'],
  };
  if (norms.length > 0) aff.norms = norms;
  return aff;
}

/** The two answers to `proposer`'s proposal: accept and decline (in that order). */
export function proposalOffers(
  p: Person,
  proposer: Person,
  opts: { guardian?: GuardianStance; lookup?: (id: PersonId) => Person | undefined } = {},
): [Affordance, Affordance] {
  const norms = marriageNorms(p, proposer, opts.guardian, opts.lookup);
  const accept: Affordance = {
    id: `accept:${proposer.id}`,
    action: 'accept-proposal',
    label: `Accept ${proposer.name}`,
    targetId: proposer.id,
    duration: 10,
    effort: 0,
    advertises: { belonging: 0.2, meaning: 0.1 },
    tags: ['partnering'],
  };
  if (norms.length > 0) accept.norms = norms;
  const decline: Affordance = {
    id: `decline:${proposer.id}`,
    action: 'decline-proposal',
    label: `Decline ${proposer.name}`,
    targetId: proposer.id,
    duration: 10,
    effort: 0,
    advertises: {},
    tags: ['partnering'],
  };
  return [accept, decline];
}

/**
 * Relatives' approval as weighed voices on a proposal: approval > 0 suggests `accept`, < 0 suggests `decline`, with
 * strength |approval| × `weight` (default `familyWeight`, 0.5). Each voice's weight is p's learned trust in it. Pass
 * as `DecideOptions.suggestions`. At the default, two trusted parents' strong objection outweighs a courtship that
 * has just become ready but not a long, warm one, and mild objection does not outweigh a ready one: the person's own
 * consent decides (research/decisions.md), family weighs in.
 */
export function familyVoices(
  offers: readonly [Affordance, Affordance],
  approvals: readonly { voiceId: string; approval: Signed }[],
  weight: number = PARTNERING_DEFAULTS.familyWeight,
): Suggestion[] {
  const out: Suggestion[] = [];
  for (const a of approvals) {
    if (!Number.isFinite(a.approval) || a.approval === 0) continue;
    const target = a.approval > 0 ? offers[0] : offers[1];
    out.push({
      voiceId: a.voiceId,
      affordanceId: target.id,
      strength: clamp01(Math.abs(a.approval) * weight),
    });
  }
  return out;
}

/** Decision terms for offers tagged 'partnering' (read by `cognition.consider`). Read only. */
export function partneringTerms(p: Person, aff: Affordance, now: Minute = p.now): Term[] {
  const P = PARTNERING_DEFAULTS;
  const other = aff.targetId;
  if (other === undefined) return [];
  if (aff.action === 'decline-proposal') return [{ source: 'partner:status-quo', value: P.statusQuo }];
  const terms: Term[] = [];
  const spouses = spousesOf(p);
  const unavailable = (spouses.length > 0 && !spouses.includes(other)) || inMourning(p, now);
  const c = courtshipWith(p, other);
  if (aff.action === 'court') {
    if (unavailable) return [{ source: 'partner:unavailable', value: -P.unavailable }];
    if (spouses.includes(other)) return [];
    let interest: number;
    if (c) interest = 0.5 * c.appeal + 0.5 * warmthNow(c, now);
    else {
      const rel = relationshipWith(p, other);
      interest = 0.35 * Math.max(0, rel.affection) + 0.2 * rel.familiarity;
    }
    terms.push({ source: `partner:${other}`, value: P.courtScale * (interest - P.courtFloor) });
  } else if (aff.action === 'propose' || aff.action === 'accept-proposal') {
    if (unavailable) return [{ source: 'partner:unavailable', value: -P.unavailable }];
    const readiness = c ? 0.6 * warmthNow(c, now) + 0.4 * c.appeal : 0;
    terms.push({ source: `partner:${other}`, value: P.proposalScale * (readiness - P.proposalFloor) });
  }
  return terms;
}
