import type { ActorState, PersonId, Relationship, Signed, Time, Unit } from '../run-schema.ts';

type SocialActor = Pick<ActorState, 'id' | 'now' | 'traits' | 'values' | 'social'> & {
  conscience: Pick<ActorState['conscience'], 'norms'>;
  memory: Pick<ActorState['memory'], 'sourceTrust'>;
};

/** SCOPE: received group membership and known group ties shape trust, care and threat.
 * Membership is always present. Unknown membership of another person remains unknown.
 * No faction state, diplomacy, inferred membership or hidden target view is modeled. */
import { clamp01, clampSigned } from '../core/index.ts';
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

/** Stance toward outsiders, -1..1: the stored one, else (openness - 0.5) + (agreeableness - 0.5). */
export function outsiderStance(p: SocialActor): Signed {
  return (
    p.social.groups.outsiderStance ?? clampSigned(p.traits.openness - 0.5 + p.traits.agreeableness - 0.5)
  );
}

function sharesGroup(p: SocialActor, groups: readonly string[] | undefined): boolean {
  const mine = p.social.groups.memberOf;
  if (!groups) return false;
  return groups.some((g) => mine.includes(g));
}

/** Whether I see `otherId` as in one of my groups (false without known groups for them). */
export function isInsider(p: SocialActor, otherId: PersonId): boolean {
  const rel = p.social.relationships.find((r) => r.otherId === otherId);
  return sharesGroup(p, rel?.groups);
}

/** Whether I see `otherId` as outside all my groups (requires known groups for them). */
export function isOutsider(p: SocialActor, otherId: PersonId): boolean {
  const rel = p.social.relationships.find((r) => r.otherId === otherId);
  return rel?.groups !== undefined && !sharesGroup(p, rel.groups);
}

/**
 * How much what happens to `otherId` matters to me, 0..1: 1 for myself, else closeness, raised to `insiderCare` for
 * an insider. Unknown group membership leaves the closeness estimate unchanged.
 */
export function careFor(p: SocialActor, otherId: PersonId): Unit {
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
  p: SocialActor,
  otherId: PersonId,
  groups?: readonly string[],
  now: Time = p.now,
): Relationship {
  const existing = p.social.relationships.find((r) => r.otherId === otherId);
  if (existing) {
    if (groups) existing.groups = [...new Set(groups)].slice(0, GROUP_DEFAULTS.maxGroups);
    return existing;
  }
  const rel = ensureRelationship(p, otherId, now);
  if (groups) rel.groups = [...new Set(groups)].slice(0, GROUP_DEFAULTS.maxGroups);
  if (!groups) return rel;
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
  p: SocialActor,
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
