import { freezeData, required } from '../body/span.ts';
/** SCOPE: admitted relational lifecycle facts and source pure readers. Supplied
 * customs are model premises, never religious rulings. */

import { clip, copy, DAY, LN2, output, validateNumbers } from '../body/span.ts';
import { dexp } from '../core/libm.ts';
import type * as T from '../run-schema.ts';
export const PARTNERING_DEFAULTS = freezeData({
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
});

export const spousesOf = (b: T.DeepReadonly<T.BondsState>) =>
  b.marriages.filter((m) => m.endedAt === undefined).map((m) => m.spouseId);
export const inMourning = (b: T.DeepReadonly<T.BondsState>, at: number) =>
  b.mourning !== undefined && at < b.mourning.until;
export function widowhoodMortality(
  b: T.DeepReadonly<T.BondsState>,
  sex: T.LifeCourse['sex'],
  at: number,
  p: T.DeepReadonly<T.Effective_PARTNERING_DEFAULTS>,
): number {
  if (spousesOf(b).length) return 1;
  const m = b.marriages
    .filter((m) => m.end === 'widowed' && m.endedAt !== undefined)
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))[0];
  return !m
    ? 1
    : at - required(m.endedAt) < p.widowhoodEarlyDays * DAY
      ? p.widowhoodEarly
      : sex === 'male'
        ? p.widowhoodMen
        : p.widowhoodWomen;
}
export function courtshipStage(
  b: T.DeepReadonly<T.BondsState>,
  other: string,
  at: number,
  p: T.DeepReadonly<T.Effective_PARTNERING_DEFAULTS>,
): T.CourtshipStage {
  if (spousesOf(b).includes(other)) return 'married';
  const c = b.courtships.find((c) => c.withId === other);
  if (!c) return 'none';
  if (c.engagedAt !== undefined) return 'engaged';
  const w = c.warmth * dexp((-LN2 * (at - c.lastAt)) / DAY / p.warmthHalfLifeDays);
  return w >= p.readyWarmth && c.meetings >= p.readyMeetings && at - c.since >= p.readyDays * DAY
    ? 'ready'
    : 'courting';
}
const receive: T.PartneringOwner['receive'] = (state, input, ctx) => {
  const s = copy<T.BondsState>(state);
  const receipts: {
    social: T.PartneringReceipts['social'][number][];
    memory: T.PartneringReceipts['memory'][number][];
    affect: T.PartneringReceipts['affect'][number][];
  } = { social: [], memory: [], affect: [] };
  if (input.type === 'death') {
    const id = input.person.id;
    for (const m of s.marriages)
      if (m.spouseId === id && m.endedAt === undefined) {
        m.endedAt = ctx.at;
        m.end = 'widowed';
        const days = m.mourningDays ?? 0;
        if (days > 0) s.mourning = { forId: id, since: ctx.at, until: ctx.at + days * DAY };
      }
  } else if (input.type === 'marriage') {
    const other = input.partners.find((x) => x.id !== ctx.person);
    if (other && input.partners.some((x) => x.id === ctx.person)) {
      const self = ctx.actors.find((a) => a.id === ctx.person),
        partner = ctx.actors.find((a) => a.id === other.id);
      if (!self || !partner) throw new RangeError('missing admitted marriage actors');
      const custom = ctx.custom;
      if (!custom) throw new RangeError('missing admitted marriage custom');
      const verdict = canMarry(self, partner, ctx.at, custom, input.guardian);
      if (verdict.kind !== 'known' || !verdict.ok) throw new RangeError('marriage model admission failed');
      if (s.marriages.some((m) => m.spouseId === other.id && m.endedAt === undefined))
        throw new RangeError('already married');
      s.marriages.push({
        spouseId: other.id,
        since: ctx.at,
        mourningDays: ctx.life.sex === 'female' ? custom.mourningDays.widow : custom.mourningDays.widower,
      });
      s.courtships = custom.maxSpouses <= 1 ? [] : s.courtships.filter((c) => c.withId !== other.id);
      delete s.mourning;
      receipts.social.push({ kind: 'spouse-role', other: other.id, receiptId: input.basis.evidence.id });
      receipts.memory.push({
        kind: 'episode',
        receiptId: input.basis.evidence.id,
        episode: {
          at: ctx.at,
          kind: 'family',
          action: 'marry',
          targetId: other.id,
          valence: 0.9,
          salience: 0.95,
          // Semantic kind/action/target are rendered only by W3.
          summary: '',
          tags: ['marriage', 'family'],
        },
      });
      receipts.affect.push(
        { kind: 'felt', id: 'joy', intensity: 0.7, cause: `event:marriage:${other.id}`, targetId: other.id },
        { kind: 'felt', id: 'love', intensity: 0.6, cause: `event:marriage:${other.id}`, targetId: other.id },
      );
    }
  } else if (input.type === 'betrothal' || input.type === 'courtship-meeting') {
    const other = input.partners.find((x) => x.id !== ctx.person);
    if (other && input.partners.some((x) => x.id === ctx.person)) {
      let c = s.courtships.find((x) => x.withId === other.id);
      if (!c) {
        c = {
          withId: other.id,
          since: ctx.at,
          warmth: 0,
          appeal:
            input.type === 'betrothal'
              ? attraction(
                  fullActor(ctx.actors.find((a) => a.id === ctx.person)),
                  fullActor(ctx.actors.find((a) => a.id === other.id)),
                  ctx.at,
                )
              : 0,
          meetings: input.type === 'betrothal' ? 1 : 0,
          lastAt: ctx.at,
        };
        s.courtships.push(c);
      }
      if (input.type === 'betrothal') c.engagedAt = ctx.at;
      else {
        const self = fullActor(ctx.actors.find((a) => a.id === ctx.person)),
          partner = fullActor(ctx.actors.find((a) => a.id === other.id));
        if (!self.body.alive || !partner.body.alive) throw new RangeError('dead courtship partner');
        const p = ctx.effective.builtins.PARTNERING_DEFAULTS;
        const w = c.warmth * dexp((-LN2 * (ctx.at - c.lastAt)) / DAY / p.warmthHalfLifeDays);
        c.appeal = attraction(self, partner, ctx.at);
        const attach =
          1 +
          0.5 * ((self.family.attachment ?? ctx.effective.builtins.FAMILY_DEFAULTS.attachmentStart) - 0.6);
        c.warmth = clip(w + p.warmthGain * c.appeal * input.quality * attach * (1 - w));
        c.meetings++;
        c.lastAt = ctx.at;
        receipts.social.push({
          kind: 'event',
          data: {
            person: ctx.person,
            evidenceId: input.basis.evidence.id,
            other: other.id,
            event: { kind: 'chat', byMe: false, magnitude: input.quality },
          },
        });
        while (s.courtships.length > p.maxCourtships) {
          const candidates = s.courtships
            .filter((x) => x !== c && x.engagedAt === undefined)
            .sort(
              (a, b) =>
                a.warmth * dexp((-LN2 * (ctx.at - a.lastAt)) / DAY / p.warmthHalfLifeDays) -
                b.warmth * dexp((-LN2 * (ctx.at - b.lastAt)) / DAY / p.warmthHalfLifeDays),
            );
          if (!candidates.length) break;
          s.courtships = s.courtships.filter((x) => x !== candidates[0]);
        }
      }
    }
  }
  return { ...output(s, ctx.at), receipts };
};
export const partneringOwner: T.PartneringOwner = {
  // Original 3.x familyVoices law: received approval is advice, never a mandate.
  familyVoice: (approval, ctx) => {
    if (!Number.isFinite(approval.approval) || approval.approval === 0) return null;
    return {
      voiceId: approval.voiceId,
      affordanceId: approval.approval > 0 ? approval.acceptOfferId : approval.declineOfferId,
      strength: clip(Math.abs(approval.approval) * ctx.effective.builtins.PARTNERING_DEFAULTS.familyWeight),
      adviceId: approval.adviceId,
    };
  },
  terms: (state, offer, ctx) =>
    partneringTerms(
      { bonds: state, social: ctx.social },
      offer,
      ctx.at,
      ctx.effective.builtins.PARTNERING_DEFAULTS,
    ),
  initialize: (input) => copy<T.BondsState>(input),
  receive,
  validate: (s) => validateNumbers(s),
};
export function kinship(
  snapshot: T.DeepReadonly<T.KinSnapshot>,
  a: string,
  b: string,
): { kind: 'known'; value: T.Kin | null } | T.Unknown {
  const role = (id: string, r: T.KinRole) =>
    new Set(snapshot.roles.filter((p) => p.from.id === id && p.role === r).map((p) => p.to.id));
  const spouse = (id: string) =>
    new Set([
      ...role(id, 'spouse'),
      ...snapshot.marriages.filter((m) => m.person.id === id).map((m) => m.marriage.spouseId),
    ]);
  const pa = role(a, 'parent'),
    pb = role(b, 'parent'),
    ca = role(a, 'child'),
    cb = role(b, 'child'),
    sa = spouse(a),
    sb = spouse(b);
  const meets = (x: Set<string>, y: Set<string>) => [...x].some((v) => y.has(v));
  let value: T.Kin | null = null;
  if (sa.has(b) || sb.has(a)) value = 'spouse';
  else if (pa.has(b) || cb.has(a)) value = 'parent';
  else if (ca.has(b) || pb.has(a)) value = 'child';
  else if (role(a, 'sibling').has(b) || role(b, 'sibling').has(a) || meets(pa, pb)) value = 'sibling';
  else {
    const gp = (id: string, parents: Set<string>) =>
      new Set([
        ...role(id, 'grandparent'),
        ...[...parents].flatMap((p) => [...role(p, 'parent')].filter((x) => x !== id)),
      ]);
    const ga = gp(a, pa),
      gb = gp(b, pb);
    if (ga.has(b) || role(b, 'grandchild').has(a) || meets(pa, cb)) value = 'grandparent';
    else if (gb.has(a) || role(a, 'grandchild').has(b) || meets(ca, pb)) value = 'grandchild';
    else if (meets(pb, ga) || meets(role(b, 'sibling'), pa)) value = 'aunt-uncle';
    else if (meets(pa, gb) || meets(role(a, 'sibling'), pb)) value = 'niece-nephew';
    else if (meets(sb, pa)) value = 'step-parent';
    else if (meets(sa, pb)) value = 'step-child';
    else if (meets(sa, cb)) value = 'parent-in-law';
    else if (meets(sb, ca)) value = 'child-in-law';
  }
  if (value) return { kind: 'known', value };
  if (snapshot.scope.completeness === 'partial' || snapshot.unresolved.length)
    return {
      kind: 'unknown',
      missing: snapshot.unresolved.map((x) => ({ kind: 'entity' as const, id: x.id })),
    };
  return { kind: 'known', value: null };
}
export function canMarry(
  a: T.DeepReadonly<T.PartneringActor>,
  b: T.DeepReadonly<T.PartneringActor>,
  at: number,
  custom: T.DeepReadonly<T.MarriageCustomData>,
  guardian: T.DeepReadonly<T.Guardian>,
): T.Eligibility {
  const uncertainty: ('kin-incomplete' | 'guardian-unknown')[] = [];
  const no = (reason: Extract<T.Eligibility, { kind: 'known' }>['reason']): T.Eligibility => ({
    kind: 'known',
    ok: false,
    uncertainty,
    ...(reason === undefined ? {} : { reason }),
  });
  if (a.id === b.id) return no('self');
  if (!a.body.alive || !b.body.alive) return no('dead');
  if (custom.pairing === 'opposite-sex' && a.life.sex === b.life.sex) return no('pairing');
  if (
    (at - a.life.bornAt) / (365.25 * DAY) < custom.minAgeYears ||
    (at - b.life.bornAt) / (365.25 * DAY) < custom.minAgeYears
  )
    return no('age');
  if (spousesOf(a.bonds).includes(b.id)) return no('married');
  if (spousesOf(a.bonds).length >= custom.maxSpouses || spousesOf(b.bonds).length >= custom.maxSpouses)
    return no('already-married');
  if (inMourning(a.bonds, at) || inMourning(b.bonds, at)) return no('mourning');
  if (!a.knownKin)
    return {
      kind: 'unknown',
      missing: [
        { kind: 'person', id: a.id },
        { kind: 'person', id: b.id },
      ],
    };
  const k = kinship(a.knownKin, a.id, b.id);
  if (k.kind === 'unknown') uncertainty.push('kin-incomplete');
  else if (k.value && custom.forbiddenKin.includes(k.value)) return no(`kin:${k.value}`);
  if (guardian.kind === 'unknown') uncertainty.push('guardian-unknown');
  else if (
    custom.guardianForBride &&
    (a.life.sex === 'female' || b.life.sex === 'female') &&
    guardian.stance === 'refused'
  )
    return no('guardian');
  return { kind: 'known', ok: true, uncertainty };
}
export function valuesSimilarity(a: T.DeepReadonly<T.Values>, b: T.DeepReadonly<T.Values>): number {
  const keys = Object.keys(a) as (keyof T.Values)[];
  return clip(1 - (2 * keys.reduce((n, k) => n + Math.abs(a[k] - b[k]), 0)) / keys.length);
}
export function ageFit(a: T.DeepReadonly<T.LifeCourse>, b: T.DeepReadonly<T.LifeCourse>, at: number): number {
  const x = (at - a.bornAt) / (365.25 * DAY),
    y = (at - b.bornAt) / (365.25 * DAY);
  return x < 16 || y < 16 ? 0 : Math.max(0.1, 1 - Math.max(0, Math.abs(x - y) - 5) / 15);
}
export function compatibility(
  a: T.DeepReadonly<Pick<T.ActorState, 'values' | 'traits'>>,
  b: T.DeepReadonly<Pick<T.ActorState, 'values' | 'traits'>>,
): number {
  const keys = Object.keys(a.traits) as (keyof T.Traits)[];
  const traits = clip(
    1 - (2 * keys.reduce((n, k) => n + Math.abs(a.traits[k] - b.traits[k]), 0)) / keys.length,
  );
  return clip(0.7 * valuesSimilarity(a.values, b.values) + 0.3 * traits);
}
type PartnerSnapshot = T.PartneringActor & Pick<T.ActorState, 'family' | 'social'>;
export function attraction(
  a: T.DeepReadonly<PartnerSnapshot>,
  b: T.DeepReadonly<PartnerSnapshot>,
  at: number,
): number {
  const rel = a.social.relationships.find((r) => r.otherId === b.id);
  const traits = Object.keys(a.traits) as (keyof T.Traits)[];
  const similarity = clip(
    1 - (2 * traits.reduce((n, k) => n + Math.abs(a.traits[k] - b.traits[k]), 0)) / traits.length,
  );
  return clip(
    ageFit(a.life, b.life, at) *
      (0.35 * Math.max(0, rel?.affection ?? 0) +
        0.2 * (rel?.familiarity ?? 0) +
        0.25 * valuesSimilarity(a.values, b.values) +
        0.1 * similarity +
        (0.1 * (b.traits.honesty + b.traits.agreeableness)) / 2),
  );
}
export function partneringTerms(
  state: T.DeepReadonly<Pick<T.ActorState, 'bonds' | 'social'>>,
  offer: T.DeepReadonly<T.Offer>,
  at: number,
  p: T.DeepReadonly<T.Effective_PARTNERING_DEFAULTS>,
): T.TermData[] {
  const other = offer.target;
  if (!other) return [];
  const b = state.bonds,
    c = b.courtships.find((c) => c.withId === other),
    spouses = spousesOf(b);
  const unavailable = (spouses.length > 0 && !spouses.includes(other)) || inMourning(b, at);
  if (offer.actionId === 'court' || offer.actionId === 'propose' || offer.actionId === 'accept-proposal') {
    if (unavailable) return [{ source: 'social:partner:unavailable', value: -p.unavailable }];
    const warmth = c ? c.warmth * dexp((-LN2 * (at - c.lastAt)) / DAY / p.warmthHalfLifeDays) : 0;
    if (offer.actionId === 'court') {
      if (spouses.includes(other)) return [];
      const rel = state.social.relationships.find((x) => x.otherId === other);
      const interest = c
        ? 0.5 * c.appeal + 0.5 * warmth
        : 0.35 * Math.max(0, rel?.affection ?? 0) + 0.2 * (rel?.familiarity ?? 0);
      return [{ source: `social:partner:${other}`, value: p.courtScale * (interest - p.courtFloor) }];
    }
    return [
      {
        source: `social:partner:${other}`,
        value: p.proposalScale * ((c ? 0.6 * warmth + 0.4 * c.appeal : 0) - p.proposalFloor),
      },
    ];
  }
  return [];
}
function fullActor(a: T.DeepReadonly<T.PartneringActor> | undefined): T.DeepReadonly<PartnerSnapshot> {
  return required(a);
}
