/**
 * SCOPE: the family faculty (HF 2.0 L2): conception, pregnancy and birth as host-driven events, inherited learning
 * aptitudes, and upbringing. It owns the optional `Person.family` slice; a person a host never touches has none, so
 * existing runs are unchanged.
 *
 * Conception. `conceptionChance(mother, father, days)` is the chance of conceiving over `days` of living together:
 * 1 − (1 − c)^(days / 29.5) with a per-cycle chance c = 0.2 × a female age factor × a male age factor. The peak is
 * an engineering prior for a fertile couple: cohorts that include subfertile couples give about 0.12–0.15 per
 * cycle at 25–27 (F14 in research/family-environment-sources.md), and women 19–26 conceive about twice as often per
 * cycle as women 35–39 (F14). The female factor is 1 to 30, 0.5 at 37, 0.4 at 42 and 0 at 50; the male factor is 1
 * to 40, falling to 0.7 at 60 (both engineering assumptions shaped on F14). `conceive` records a pregnancy whose due
 * date is 268 ± 9 days on (median ovulation-to-birth 268 days, range 37 days, F13; the sd is range/4, an
 * assumption), drawn from a stream derived from the given seed, so no person's RNG is consumed. `deliver` ends it
 * and returns the child's seed and birth minute for `createChild` (or `sim.birth`); the host decides when birth
 * happens (`pregnancyDue`) and whether it goes well. `pregnancyModifiers` raises metabolism in the second and third
 * trimesters by about 15% (engineering assumption, in line with the common dietary guidance of a few hundred extra
 * kilocalories a day; not in research/). Miscarriage, stillbirth, twins, infertility as a trait, contraception,
 * birth complications and maternal mortality are not modelled; a host adds them as events.
 *
 * Upbringing. `raise(child, household, minutes)` is called by the host for time a child spends in a household. Each
 * caregiver's influence is weighted by their warmth toward the child (their affection, floored at 0). Values relax
 * toward the warmth-weighted household values at 5% per year at full plasticity, scaled by the caregivers' mean
 * warmth (value transmission runs through
 * family climate and is more accurate with warmth, F7, F8; the rate is an engineering assumption chosen so that a
 * childhood moves values part of the way, never a copy). Plasticity of values is 1 to age 12 and falls to 0 at 25.
 * Understanding of a norm relaxes toward the household's exemplar, conviction × (1 − breach share), where the breach
 * share counts the caregiver's breaches of that norm in the last year (4 or more = 1): children learn what is lived,
 * not what is said (assumption; about 6 in 10 parent–child pairs share a religious affiliation, F9). Attachment
 * security starts at 0.6 (58% of nonclinical mothers are secure-autonomous, F12) and moves toward the caregivers'
 * responsiveness (warmth and mood) at 50% per year, most in the first three years, with a floor of 0.1 of that
 * plasticity by age 12 (responsiveness and intergenerational correspondence, F10, F11; rates assumed). Optionally a
 * child comes to trust the voices the household trusts (`adoptVoiceTrust`). This file writes `values` for minors: one of the
 * documented exceptions to values being fixed at creation (docs/framework.md); the opt-in `character/` drift is
 * the other. It does not model siblings'
 * influence, peers, schooling, abuse, divorce or temperament-by-parenting interactions, and it never assigns a
 * religious obligation by age: a child holds only the understanding the household lived.
 *
 * Aptitudes are read by the composite as a multiplier on learning (`aptitudeOf`); they are drawn at birth by
 * `createChild` (`ChildSpec.aptitudes`).
 */
import { understandNorm } from '../conscience/index.ts';
import { clamp, clamp01, createRng, dpow, isNum, isObj, normal } from '../core/index.ts';
import { ageYears } from '../lifecourse/index.ts';
import { remember } from '../memory/index.ts';
import { relationshipWith } from '../social/index.ts';
import type { FamilyState, LifeModifiers, Minute, Person, PersonId, Pregnancy, Unit } from '../types.ts';
import { MINUTES_PER_DAY, MINUTES_PER_YEAR, VALUE_KEYS } from '../types.ts';
import { adoptVoiceTrust } from '../will/index.ts';

export const FAMILY_DEFAULTS = {
  /** Per-cycle conception chance for a fertile couple at peak age (engineering prior; F14 gives 0.12–0.15 for all couples). */
  peakCycleChance: 0.2,
  cycleDays: 29.5,
  /** Ovulation-to-birth median and sd in days (F13; sd assumed as range/4). */
  gestationDays: 268,
  gestationSdDays: 9,
  /** Metabolism multiplier in the second and third trimesters (assumption). */
  pregnancyMetabolism: 1.15,
  /** Values relaxation per year at full plasticity and full warmth (assumption). */
  valueRatePerYear: 0.05,
  /** Norm-understanding relaxation per year at full plasticity (assumption). */
  normRatePerYear: 0.08,
  /** Breaches in the last year at which a caregiver's example counts for nothing. */
  breachSaturation: 4,
  /** Attachment security at birth (F12). */
  attachmentStart: 0.6,
  /** Attachment relaxation per year at full plasticity (assumption). */
  attachmentRatePerYear: 0.5,
  /** Voice-trust relaxation per year at full plasticity (assumption). */
  voiceRatePerYear: 0.3,
};

/** A fresh family slice from a creation spec (`createPerson`); undefined when the spec gives nothing. @internal */
export function createFamily(
  init: Pick<FamilyState, 'aptitudes' | 'attachment'> | undefined,
): FamilyState | undefined {
  if (!init) return undefined;
  const out: FamilyState = {};
  const apt = sanitizeAptitudes(init.aptitudes);
  if (apt) out.aptitudes = apt;
  if (isNum(init.attachment)) out.attachment = clamp01(init.attachment);
  return Object.keys(out).length > 0 ? out : undefined;
}

function sanitizeAptitudes(x: unknown): Record<string, number> | undefined {
  if (!isObj(x)) return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(x)) if (isNum(v) && v > 0) out[k] = clamp(v, 0.25, 4);
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Validate a saved family slice; undefined when nothing usable remains (used by `restore`). @internal */
export function sanitizeFamily(x: unknown): FamilyState | undefined {
  if (!isObj(x)) return undefined;
  const f = x as Record<string, unknown>;
  const out: FamilyState = {};
  const apt = sanitizeAptitudes(f.aptitudes);
  if (apt) out.aptitudes = apt;
  const pg = f.pregnancy as Record<string, unknown> | undefined;
  if (
    pg &&
    typeof pg === 'object' &&
    typeof pg.fatherId === 'string' &&
    typeof pg.conceivedAt === 'number' &&
    typeof pg.dueAt === 'number' &&
    typeof pg.seed === 'number'
  )
    out.pregnancy = { fatherId: pg.fatherId, conceivedAt: pg.conceivedAt, dueAt: pg.dueAt, seed: pg.seed };
  if (isNum(f.attachment)) out.attachment = clamp01(f.attachment);
  if (isNum(f.raisedMinutes) && f.raisedMinutes >= 0) out.raisedMinutes = f.raisedMinutes;
  return Object.keys(out).length > 0 ? out : undefined;
}

const familyOf = (p: Person): FamilyState => {
  p.family ??= {};
  return p.family;
};

/** Learning multiplier for a skill (1 = average, or no family slice). */
export function aptitudeOf(p: Person, skillId: string): number {
  const v = p.family?.aptitudes?.[skillId];
  return isNum(v) && v > 0 ? v : 1;
}

/** Attachment security 0..1 (the starting 0.6 when never raised). */
export function attachmentOf(p: Person): Unit {
  return p.family?.attachment ?? FAMILY_DEFAULTS.attachmentStart;
}

// ---------------------------------------------------------------------------------------------
// Conception, pregnancy and birth
// ---------------------------------------------------------------------------------------------

/** Female fecundity by age, 1 = peak (assumption shaped on F14). */
export function femaleFecundity(age: number): Unit {
  if (age < 15 || age >= 50) return 0;
  if (age <= 30) return 1;
  if (age <= 37) return 1 - (0.5 * (age - 30)) / 7;
  if (age <= 42) return 0.5 - (0.1 * (age - 37)) / 5;
  return 0.4 * (1 - (age - 42) / 8);
}

/** Male fertility by age, 1 = peak (assumption). */
export function maleFertility(age: number): Unit {
  if (age < 15) return 0;
  if (age <= 40) return 1;
  return Math.max(0.7, 1 - (0.3 * (age - 40)) / 20);
}

/**
 * Chance that `mother` conceives by `father` over `days` of living together (0 if either is dead, the sexes do not
 * fit, or she is already pregnant). Read only; the host rolls it on its own stream or calls `conceive`.
 */
export function conceptionChance(mother: Person, father: Person, days: number): Unit {
  if (!(days > 0) || !mother.body.alive || !father.body.alive) return 0;
  if (mother.life.sex !== 'female' || father.life.sex !== 'male' || mother.family?.pregnancy) return 0;
  const c =
    FAMILY_DEFAULTS.peakCycleChance * femaleFecundity(ageYears(mother)) * maleFertility(ageYears(father));
  if (c <= 0) return 0;
  return clamp01(1 - dpow(1 - c, days / FAMILY_DEFAULTS.cycleDays));
}

/**
 * Record that `mother` has conceived by `father` at `at`. The due date is drawn from a stream derived from `seed`;
 * `seed` also becomes the child's seed at delivery. The drawn length is clamped to 4 sd below and 3 sd above the
 * median (an engineering bound against extreme draws). Returns the pregnancy, or undefined if one is already open.
 */
export function conceive(
  mother: Person,
  father: Person | PersonId,
  seed: number,
  at: Minute,
): Pregnancy | undefined;
/** @deprecated since 2.1: pass `at` (and the optional knobs) positionally. Removed in 3.0. */
export function conceive(
  mother: Person,
  father: Person | PersonId,
  opts: { at: Minute; seed: number },
): Pregnancy | undefined;
export function conceive(
  mother: Person,
  father: Person | PersonId,
  seedOrOpts: number | { at: Minute; seed: number },
  when?: Minute,
): Pregnancy | undefined {
  const opts = typeof seedOrOpts === 'number' ? { seed: seedOrOpts, at: when as Minute } : seedOrOpts;
  const fam = familyOf(mother);
  if (fam.pregnancy) return undefined;
  const rng = createRng((opts.seed ^ 0x9e3779b9) >>> 0);
  const F = FAMILY_DEFAULTS;
  const days = clamp(
    normal(rng, F.gestationDays, F.gestationSdDays),
    F.gestationDays - 4 * F.gestationSdDays,
    F.gestationDays + 3 * F.gestationSdDays,
  );
  const pregnancy: Pregnancy = {
    fatherId: typeof father === 'string' ? father : father.id,
    conceivedAt: opts.at,
    dueAt: opts.at + Math.round(days * MINUTES_PER_DAY),
    seed: opts.seed,
  };
  fam.pregnancy = pregnancy;
  return { ...pregnancy };
}

/**
 * Weeks since conception (0 when not pregnant). Counted from conception, not from the last menstrual period, which
 * is where obstetric weeks and trimesters are conventionally counted from (about two weeks earlier). The second
 * trimester here therefore begins at 13 weeks after conception.
 */
export function pregnancyWeeks(p: Person, now: Minute = p.now): number {
  const pg = p.family?.pregnancy;
  return pg ? Math.max(0, (now - pg.conceivedAt) / (7 * MINUTES_PER_DAY)) : 0;
}

/** True once an open pregnancy has reached its due minute. */
export function pregnancyDue(p: Person, now: Minute = p.now): boolean {
  const pg = p.family?.pregnancy;
  return pg !== undefined && now >= pg.dueAt;
}

/** Life modifiers adjusted for pregnancy (metabolism in the second and third trimesters); unchanged otherwise. */
export function pregnancyModifiers(p: Person, mods: LifeModifiers): LifeModifiers {
  if (!p.family?.pregnancy || pregnancyWeeks(p) < 13) return mods;
  return { ...mods, metabolism: mods.metabolism * FAMILY_DEFAULTS.pregnancyMetabolism };
}

/**
 * End `mother`'s pregnancy with a birth at `at` (default her `now`): clears it, records the birth as a strongly
 * positive episode, and returns the seed and birth minute for `createChild(mother, father, { id, name, ...spec })`.
 * Undefined when she is not pregnant. Emotions follow from the host's birth percept to whoever sees it.
 */
export function deliver(
  mother: Person,
  child: { id: PersonId; name?: string },
  at: Minute = mother.now,
): { id: PersonId; name: string; seed: number; bornAt: Minute; fatherId: PersonId } | undefined {
  const pg = mother.family?.pregnancy;
  if (!pg) return undefined;
  delete familyOf(mother).pregnancy;
  remember(mother, {
    at,
    kind: 'family',
    action: 'birth',
    targetId: child.id,
    valence: 0.9,
    salience: 0.95,
    summary: 'gave birth',
    tags: ['birth', 'family'],
  });
  return { id: child.id, name: child.name ?? child.id, seed: pg.seed, bornAt: at, fatherId: pg.fatherId };
}

// ---------------------------------------------------------------------------------------------
// Upbringing
// ---------------------------------------------------------------------------------------------

/** Plasticity of values and norm understanding by age: 1 to 12, 0 at 25. */
export function valuePlasticity(age: number): Unit {
  if (age <= 12) return 1;
  return clamp01(1 - (age - 12) / 13);
}

/** Plasticity of attachment by age: 1 to 3, falling to 0.1 at 12 and after. */
export function attachmentPlasticity(age: number): Unit {
  if (age <= 3) return 1;
  return Math.max(0.1, 1 - (0.9 * (age - 3)) / 9);
}

export interface Household {
  /** The adults raising the child (parents, grandparents, guardians). */
  caregivers: readonly Person[];
}

export interface RaiseOptions {
  /** Also move the child's trust in voices the caregivers trust (default true). */
  voices?: boolean;
}

const relax = (rate: number, years: number) => clamp01(1 - dpow(1 - clamp01(rate), years));

/**
 * Apply `minutes` of upbringing in `household` to `child`, at `child.now`. Warmth-weighted: a caregiver with no
 * warmth toward the child teaches nothing. Values, norm understanding, attachment and (optionally) trust in the
 * household's voices move by the age plasticities in the SCOPE paragraph. Returns the warmth-weighted
 * responsiveness the child experienced (0..1).
 */
export function raise(child: Person, household: Household, minutes: number, opts: RaiseOptions = {}): Unit {
  if (!(minutes > 0) || !child.body.alive) return 0;
  const F = FAMILY_DEFAULTS;
  const carers = household.caregivers.filter((c) => c.id !== child.id && c.body.alive);
  const warmth = carers.map((c) => Math.max(0, relationshipWith(c, child.id).affection));
  const total = warmth.reduce((s, w) => s + w, 0);
  const fam = familyOf(child);
  fam.raisedMinutes = (fam.raisedMinutes ?? 0) + minutes;
  if (total <= 0) return 0;
  const years = minutes / MINUTES_PER_YEAR;
  const age = ageYears(child);
  const meanWarmth = total / carers.length;
  const vp = valuePlasticity(age);

  // Values.
  if (vp > 0) {
    const k = relax(F.valueRatePerYear * meanWarmth, years * vp);
    for (const key of VALUE_KEYS) {
      let target = 0;
      carers.forEach((c, i) => {
        target += (warmth[i] ?? 0) * c.values[key];
      });
      target /= total;
      child.values[key] = clamp01(child.values[key] + k * (target - child.values[key]));
    }
  }

  // Norm understanding: the lived example.
  if (vp > 0) {
    const since = child.now - MINUTES_PER_YEAR;
    const ids = [...new Set(carers.flatMap((c) => c.conscience.norms.map((n) => n.normId)))].sort();
    const k = relax(F.normRatePerYear, years * vp);
    for (const id of ids) {
      let target = 0;
      let standing: Person['conscience']['norms'][number]['standing'] | undefined;
      let top = -1;
      carers.forEach((c, i) => {
        const held = c.conscience.norms.find((n) => n.normId === id);
        if (!held) return;
        const breaches = c.conscience.breaches.filter((b) => b.normId === id && b.at >= since).length;
        const example = held.conviction * (1 - Math.min(1, breaches / F.breachSaturation));
        target += (warmth[i] ?? 0) * example;
        if ((warmth[i] ?? 0) * held.conviction > top) {
          top = (warmth[i] ?? 0) * held.conviction;
          standing = held.standing;
        }
      });
      target /= total;
      if (standing === undefined) continue;
      const mine = child.conscience.norms.find((n) => n.normId === id);
      const before = mine?.conviction ?? 0;
      const next = before + k * (target - before);
      if (!mine && next < 0.01) continue;
      understandNorm(child, id, mine?.standing ?? standing, next);
    }
  }

  // Attachment: toward the responsiveness the child meets.
  let responsiveness = 0;
  carers.forEach((c, i) => {
    const w = warmth[i] ?? 0;
    responsiveness += w * clamp01(0.7 * w + 0.3 * ((c.affect.mood.valence + 1) / 2));
  });
  responsiveness /= total;
  const ka = relax(F.attachmentRatePerYear, years * attachmentPlasticity(age));
  const att = fam.attachment ?? F.attachmentStart;
  fam.attachment = clamp01(att + ka * (responsiveness - att));

  // Trust in the household's voices (an elder, a teacher, a host's voice): not the caregivers themselves.
  if ((opts.voices ?? true) && vp > 0) {
    const kv = relax(F.voiceRatePerYear * meanWarmth, years * vp);
    const ids = [...new Set(carers.flatMap((c) => c.will.voices.map((v) => v.voiceId)))]
      .filter((id) => id !== child.id && !carers.some((c) => c.id === id))
      .sort();
    for (const id of ids) {
      let target = 0;
      let wsum = 0;
      carers.forEach((c, i) => {
        const v = c.will.voices.find((x) => x.voiceId === id);
        if (!v) return;
        target += (warmth[i] ?? 0) * v.trust;
        wsum += warmth[i] ?? 0;
      });
      if (wsum > 0 && kv > 0) adoptVoiceTrust(child, id, target / wsum, kv);
    }
  }
  return clamp01(responsiveness);
}
