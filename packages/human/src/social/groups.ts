/**
 * SCOPE (insiders and outsiders, 1.6.0): a person's own sense of which groups they belong to and how they meet
 * those outside them. The host names the groups ('household', 'village', 'workplace') and decides who is in
 * which; factions, diplomacy and group-level state stay with the host. Here: `joinGroups(p, groups, opts)` sets the
 * groups a person counts themself in and, optionally, their stance toward outsiders (-1 wary .. +1 welcoming;
 * default from openness and agreeableness). `meet(p, otherId, groups)` creates the tie to someone new with insider
 * or outsider defaults (`GROUP_DEFAULTS`) shifted by the stance, and records which groups the person
 * believes the other is in (`Relationship.groups`). Existing ties are not reset by meeting again; only the groups
 * are updated.
 *
 * Two places read it: harm to an insider is weighed at least as harm to someone moderately close (`careFor`, used
 * by `judge` and by the appraisal of what happens to others), and a threat percept (`Percept.threat`) becomes fear
 * in proportion to how much the threatened party matters to the perceiver (self 1, else `careFor`), amplified for a
 * wary person when the source is an outsider. That fear raises the existing risk aversion, and when the threat has
 * a source (a person or a place) it is aimed at it, so options with that person or at that place are avoided.
 * Shapes borrowed qualitatively: in-group favouritism in trust and care (Tajfel's minimal-group findings; Brewer
 * 1999, in-group love need not mean out-group hate, so outsiders default to wary, not hostile). Every number is an
 * engineering default. Without `joinGroups` no tie, judgement or appraisal changes, so existing runs replay byte for
 * byte. Does not model: group identity strength, multiple-group conflict, stereotypes, prejudice learning,
 * collective emotions, protection behaviour (the host offers it; existing care terms apply), or the other person's
 * view of the group.
 */
import { clamp01, clampSigned } from '../core/index.ts';
import type { Minute, Person, PersonId, Relationship, Signed, Unit } from '../types.ts';
import { closeness, ensureRelationship } from './social.ts';

export const GROUP_DEFAULTS = {
  /** Tie defaults for someone met inside one of my groups. */
  insider: { affection: 0.15, trust: 0.6, familiarity: 0.1, respect: 0.05 },
  /** Tie defaults for someone met outside them (wary, not hostile). */
  outsider: { affection: 0, trust: 0.4, familiarity: 0, respect: 0 },
  /** Trust and affection shift of an outsider tie at stance ±1. */
  stanceTrust: 0.15,
  stanceAffection: 0.15,
  /** Least weight of what happens to an insider (as closeness 0.3). */
  insiderCare: 0.3,
  /** Threat amplification from an outsider source at stance -1. */
  outsiderThreat: 0.5,
  /** Default likelihood of a threat percept that gives none. */
  threatChance: 0.7,
  maxGroups: 8,
};

/**
 * Set the groups a person counts themself in (replacing any earlier list) and optionally their stance toward
 * outsiders. An empty list removes group membership (and the stance).
 */
export function joinGroups(
  p: Person,
  groups: readonly string[],
  opts: { outsiderStance?: Signed } = {},
): void {
  const list = [...new Set(groups)].slice(0, GROUP_DEFAULTS.maxGroups);
  if (list.length === 0) {
    delete p.social.groups;
    return;
  }
  const out: NonNullable<Person['social']['groups']> = { memberOf: list };
  const stance = opts.outsiderStance ?? p.social.groups?.outsiderStance;
  if (stance !== undefined) out.outsiderStance = clampSigned(stance);
  p.social.groups = out;
}

/** Stance toward outsiders, -1..1: the stored one, else (openness - 0.5) + (agreeableness - 0.5). */
export function outsiderStance(p: Person): Signed {
  const s = p.social.groups?.outsiderStance;
  if (s !== undefined) return s;
  return clampSigned(p.traits.openness - 0.5 + (p.traits.agreeableness - 0.5));
}

function sharesGroup(p: Person, groups: readonly string[] | undefined): boolean {
  const mine = p.social.groups?.memberOf;
  if (!mine || !groups) return false;
  return groups.some((g) => mine.includes(g));
}

/** Whether I see `otherId` as in one of my groups (false without `joinGroups` or without known groups for them). */
export function isInsider(p: Person, otherId: PersonId): boolean {
  if (!p.social.groups) return false;
  const rel = p.social.relationships.find((r) => r.otherId === otherId);
  return sharesGroup(p, rel?.groups);
}

/** Whether I see `otherId` as outside all my groups (needs `joinGroups` and known groups for them). */
export function isOutsider(p: Person, otherId: PersonId): boolean {
  if (!p.social.groups) return false;
  const rel = p.social.relationships.find((r) => r.otherId === otherId);
  return rel?.groups !== undefined && !sharesGroup(p, rel.groups);
}

/**
 * How much what happens to `otherId` matters to me, 0..1: 1 for myself, else closeness, raised to `insiderCare` for
 * an insider. Without `joinGroups` it is exactly `closeness`.
 */
export function careFor(p: Person, otherId: PersonId): Unit {
  if (otherId === p.id) return 1;
  const c = closeness(p, otherId);
  return isInsider(p, otherId) ? Math.max(c, GROUP_DEFAULTS.insiderCare) : c;
}

/**
 * Meet someone (or learn their groups). A new tie gets insider defaults when they share one of my groups, outsider
 * defaults shifted by my stance when they do not, and the plain default when I have no groups. An existing tie keeps
 * its values; only its groups are replaced when given.
 */
export function meet(
  p: Person,
  otherId: PersonId,
  groups?: readonly string[],
  now: Minute = p.now,
): Relationship {
  const existing = p.social.relationships.find((r) => r.otherId === otherId);
  if (existing) {
    if (groups) existing.groups = [...new Set(groups)].slice(0, GROUP_DEFAULTS.maxGroups);
    return existing;
  }
  const rel = ensureRelationship(p, otherId, now);
  if (groups) rel.groups = [...new Set(groups)].slice(0, GROUP_DEFAULTS.maxGroups);
  if (!p.social.groups || !groups) return rel;
  const G = GROUP_DEFAULTS;
  if (sharesGroup(p, groups)) {
    rel.affection = G.insider.affection;
    rel.trust = G.insider.trust;
    rel.familiarity = G.insider.familiarity;
    rel.respect = G.insider.respect;
  } else {
    const s = outsiderStance(p);
    rel.affection = clampSigned(G.outsider.affection + G.stanceAffection * s);
    rel.trust = clamp01(G.outsider.trust + G.stanceTrust * s);
    rel.familiarity = G.outsider.familiarity;
    rel.respect = G.outsider.respect;
  }
  return rel;
}

/**
 * The fear a threat percept carries for this person (desirability ≤ 0, likelihood, cause, source), or undefined
 * when the threatened party does not matter to them. Pure; the composite appraises it.
 */
export function threatAppraisal(
  p: Person,
  threat: { severity: Unit; chance?: Unit; sourceId?: string; aboutId?: PersonId },
  fallbackSource: string | undefined,
): { desirability: Signed; likelihood: Unit; cause: string; sourceId?: string } | undefined {
  const about = threat.aboutId ?? p.id;
  const concern = careFor(p, about);
  if (!(concern > 0)) return undefined;
  const source = threat.sourceId ?? fallbackSource;
  const wary =
    source !== undefined && isOutsider(p, source)
      ? 1 + GROUP_DEFAULTS.outsiderThreat * Math.max(0, -outsiderStance(p))
      : 1;
  const out: { desirability: Signed; likelihood: Unit; cause: string; sourceId?: string } = {
    desirability: -clamp01(clamp01(threat.severity) * concern * wary),
    likelihood: clamp01(threat.chance ?? GROUP_DEFAULTS.threatChance),
    cause: about === p.id ? `threat:${source ?? 'unknown'}` : `threat-to:${about}`,
  };
  if (source !== undefined && source !== p.id) out.sourceId = source;
  return out;
}

const isStrList = (x: unknown): x is string[] => Array.isArray(x) && x.every((g) => typeof g === 'string');

/** Restore-time check of the 1.6.0 group fields: malformed ones are dropped, never filled. @internal */
export function sanitizeGroups(social: Person['social']): void {
  const g = social.groups as unknown;
  if (g !== undefined) {
    const ok =
      typeof g === 'object' &&
      g !== null &&
      isStrList((g as Record<string, unknown>).memberOf) &&
      ((g as Record<string, unknown>).outsiderStance === undefined ||
        Number.isFinite((g as Record<string, unknown>).outsiderStance));
    if (!ok) delete social.groups;
  }
  for (const r of social.relationships) if (r.groups !== undefined && !isStrList(r.groups)) delete r.groups;
}
