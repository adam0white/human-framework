/**
 * SCOPE: one conversation turn between two people: what the speaker tells the listener, drawn from the
 * speaker's own confident beliefs, and what advice they give, drawn from the speaker's beliefs about what the
 * listener should do. Output is plain data: `told` percepts (testimony with claims at the speaker's credence)
 * and advice percepts that the host delivers through the listener's `perceive`, a `Suggestion` per piece of
 * advice for the listener's next decision, and social events for both sides. Reputation is nothing more than
 * these claims spreading belief by belief (`social.applyReputationBelief` turns a changed character belief
 * into a changed relationship).
 *
 * Choice of what to say is deterministic and explainable: each candidate claim gets a relevance score
 * (confidence, recency, host topics, the speaker's feeling about its subject); an unfavourable claim about an
 * absent third party is tagged with the catalog norm 'backbiting' (Qur'an 49:12, as catalogued in
 * `conscience/catalog.ts`) and costs the speaker in proportion to their OWN held understanding of that norm and
 * their honesty-humility, so a speaker who holds it firmly withholds it and one who does not tells it. The
 * definition used here (an unfavourable character claim about someone not present) is an engineering
 * assumption for the tag, not a ruling on what counts as backbiting. Deceit happens only when the host offers a
 * temptation (the speaker gains if the listener believes something the speaker does not): temptation scales
 * with (1 − honesty-humility) and is opposed by the speaker's held 'lying' norm. The lie is a host-visible flag
 * (`ToldClaim.deceit`); the listener cannot see it. Named shapes: honesty-humility as the HEXACO factor most
 * predictive of lower dishonesty (Hilbig & Zettler 2009; Heck et al. 2018 meta-analysis), gossip as a large
 * share of conversation about absent third parties that spreads reputational information (Dunbar 2004), and
 * extraversion as talkativeness (how many claims are offered).
 *
 * It does NOT generate language, model turn-taking, persuasion beyond source trust, what the speaker believes
 * the listener already knows, lies of omission, white lies told to spare feelings, or the speaker's fear of
 * being found out. Coefficients are engineering defaults, not calibrated estimates. Nothing here judges the
 * worth of either person; norms are the people's own understandings with catalog provenance.
 * Repetition (integration, 2026-10-03): a claim the listener already holds at the told confidence produces no
 * percept (it is in `claims`, not `told`). The speaker keeps no memory of what was said to whom; the listener's
 * belief stands in for it.
 */
import { clamp01, expit, round } from '../core/index.ts';
import {
  isDeceased,
  isUnfavourableTrait,
  parseTraitProp,
  REPUTATION_TRAITS,
  relationshipWith,
  type TraitEffect,
} from '../social/index.ts';
import type {
  Belief,
  EntityId,
  Minute,
  NormTag,
  Percept,
  Person,
  PersonId,
  SocialEvent,
  Suggestion,
  Unit,
} from '../types.ts';
import { MINUTES_PER_DAY } from '../types.ts';

export const CONVERSATION_DEFAULTS = {
  /** A belief is told only when |credence − 0.5| ≥ this (credence ≥ 0.7 or ≤ 0.3). */
  confidentMin: 0.2,
  /** Claims offered per conversation = base + round(range × extraversion). */
  claimsBase: 1,
  claimsRange: 2,
  maxAdvice: 2,
  relevance: { confidence: 0.5, recency: 0.3, topic: 0.5, feeling: 0.2, temptation: 0.5 },
  recencyScale: 7 * MINUTES_PER_DAY,
  /** Backbiting cost = conviction × standing weight × scale × (0.5 + honesty). */
  backbitingScale: 0.8,
  /**
   * Lie temptation = gain × lieScale × (1 − honesty) − honestyCost × honesty
   *                  − conviction × standing weight × lyingScale × (0.5 + honesty).
   */
  lieScale: 1.2,
  honestyCost: 0.5,
  lyingScale: 0.8,
  /** Confidence a liar asserts with. */
  lieConfidence: 0.8,
  /** Standing weights for the speaker's held understanding of a forbidden act. */
  standingWeight: { forbidden: 1, disliked: 0.4, permitted: 0, recommended: 0, obligatory: 0 } as Record<
    string,
    number
  >,
  /** Advice is given when the speaker's credence in '<listener>:should:<action>' reaches this. */
  adviceMin: 0.7,
  /** Speaker benevolence at or above which advice carries a 'benevolence' appeal. */
  benevolentAppeal: 0.6,
  chatMagnitude: 0.5,
  chatPerClaim: 0.05,
};

/** A host-offered advantage: the speaker gains `gain` (0..1) if the listener comes to believe prop = value. */
export interface Temptation {
  prop: string;
  value: boolean;
  gain: Unit;
}

export interface ConverseContext {
  at: Minute;
  placeId?: EntityId;
  /** Subject ids or proposition prefixes the conversation is about (raise relevance). */
  topics?: string[];
  /** Override the extraversion-derived number of claims. */
  maxClaims?: number;
  temptations?: Temptation[];
  /** Base magnitude of the 'chat' social event (default 0.5). */
  magnitude?: Unit;
  /** Character-trait vocabulary (defaults to `REPUTATION_TRAITS`). */
  traits?: Record<string, TraitEffect>;
}

/** Host-visible record of one claim. */
export interface ToldClaim {
  prop: string;
  value: boolean;
  /** Confidence asserted to the listener. */
  confidence: Unit;
  /** The speaker's own credence that prop is true. */
  speakerCredence: Unit;
  /** True when the speaker asserted the side they believe less likely (a lie). Never shown to the listener. */
  deceit: boolean;
  /** True when the claim is unfavourable about an absent third party (tagged 'backbiting'). */
  backbiting: boolean;
  /** The person the claim is about, when it is a character claim. */
  about?: PersonId;
  score: number;
}

export interface AdviceGiven {
  action: string;
  percept: Percept;
  /** For the listener's next decision; the voice is the speaker. */
  suggestion: Suggestion;
}

export interface ConversationResult {
  /** Testimony percepts for `perceive(listener, told)`. */
  told: Percept[];
  /** Advice; deliver each `percept` with `told`, and pass each `suggestion` to the listener's next decide. */
  advice: AdviceGiven[];
  claims: ToldClaim[];
  /** Candidate claims the speaker held back, and why (e.g. 'norm:backbiting', 'norm:lying'). */
  withheld: { prop: string; reason: string }[];
  /** True when any told claim was a lie. */
  deceit: boolean;
  /** The speaker's own deed tags for conscience (e.g. backbiting/lying violated), deduplicated, sorted. */
  norms: NormTag[];
  socialEvents: { speaker: SocialEvent[]; listener: SocialEvent[] };
}

const empty = (): ConversationResult => ({
  told: [],
  advice: [],
  claims: [],
  withheld: [],
  deceit: false,
  norms: [],
  socialEvents: { speaker: [], listener: [] },
});

/** Cost to the speaker of a forbidden act by their own held understanding of it, before the scale. */
function heldCost(p: Person, normId: string): number {
  const h = p.conscience?.norms?.find((n) => n.normId === normId);
  if (!h) return 0;
  return clamp01(h.conviction) * (CONVERSATION_DEFAULTS.standingWeight[h.standing] ?? 0);
}

const shouldPrefix = (listenerId: PersonId) => `${listenerId}:should:`;

function topicMatch(prop: string, topics: readonly string[]): boolean {
  return topics.some((t) => prop === t || prop.startsWith(`${t}:`) || prop.startsWith(t));
}

function nameOf(p: Person): string {
  return p.name ?? p.id;
}

/**
 * The speaker talks to the listener. Pure with respect to both people (nothing is written); the host
 * delivers the returned percepts, suggestions and social events. Returns nothing to say when either is dead
 * or the speaker holds the listener as deceased.
 */
export function converse(speaker: Person, listener: Person, ctx: ConverseContext): ConversationResult {
  const out = empty();
  if (speaker.id === listener.id) return out;
  if (speaker.body?.alive === false || listener.body?.alive === false) return out;
  if (isDeceased(speaker, listener.id) || isDeceased(listener, speaker.id)) return out;
  const C = CONVERSATION_DEFAULTS;
  const R = C.relevance;
  const table = ctx.traits ?? REPUTATION_TRAITS;
  const topics = ctx.topics ?? [];
  const honesty = clamp01(speaker.traits.honesty);
  const backbitingCost = heldCost(speaker, 'backbiting') * C.backbitingScale * (0.5 + honesty);
  const lyingCost = heldCost(speaker, 'lying') * C.lyingScale * (0.5 + honesty);

  const candidates = new Map<string, ToldClaim>();
  const consider = (
    prop: string,
    value: boolean,
    confidence: Unit,
    cred: Unit,
    deceit: boolean,
    base: number,
  ) => {
    const parsed = parseTraitProp(prop, table);
    const about = parsed?.personId;
    const thirdParty = about !== undefined && about !== listener.id && about !== speaker.id;
    const backbiting = thirdParty && isUnfavourableTrait(parsed?.trait ?? '', value, table);
    let score = base;
    if (topicMatch(prop, topics)) score += R.topic;
    if (about !== undefined) score += R.feeling * Math.abs(relationshipWith(speaker, about).affection);
    const reasons: string[] = [];
    if (backbiting) {
      score -= backbitingCost;
      if (backbitingCost > 0) reasons.push('norm:backbiting');
    }
    if (score <= 0) {
      out.withheld.push({ prop, reason: reasons[0] ?? 'irrelevant' });
      return;
    }
    const claim: ToldClaim = {
      prop,
      value,
      confidence: round(confidence),
      speakerCredence: round(cred),
      deceit,
      backbiting,
      score: round(score),
    };
    if (about !== undefined) claim.about = about;
    candidates.set(prop, claim);
  };

  // Honest candidates: the speaker's own confident beliefs.
  const beliefs = [...speaker.memory.beliefs].sort((a: Belief, b: Belief) => (a.prop < b.prop ? -1 : 1));
  for (const b of beliefs) {
    if (b.prop.startsWith('advice:') || b.prop.includes(':should:')) continue;
    const subject = b.prop.split(':')[0];
    if (subject === listener.id || subject === speaker.id) continue;
    const cred = expit(b.logOdds);
    if (Math.abs(cred - 0.5) < C.confidentMin) continue;
    const value = cred > 0.5;
    const confidence = value ? cred : 1 - cred;
    const recency = 1 / (1 + Math.max(0, ctx.at - b.updatedAt) / C.recencyScale);
    consider(
      b.prop,
      value,
      confidence,
      cred,
      false,
      R.confidence * (confidence - 0.5) * 2 + R.recency * recency,
    );
  }

  // Temptations: claims the speaker would gain from the listener believing.
  for (const t of [...(ctx.temptations ?? [])].sort((a, b) => (a.prop < b.prop ? -1 : 1))) {
    const b = speaker.memory.beliefs.find((x) => x.prop === t.prop);
    const cred = b ? expit(b.logOdds) : 0.5;
    const forValue = t.value ? cred : 1 - cred;
    const gain = clamp01(t.gain);
    if (forValue >= 0.5) {
      // Saying what one believes is not a lie; the advantage only makes it more worth saying.
      const prior = candidates.get(t.prop);
      if (prior && prior.value === t.value) prior.score = round(prior.score + R.temptation * gain);
      else
        consider(
          t.prop,
          t.value,
          forValue,
          cred,
          false,
          R.temptation * gain + R.confidence * (forValue - 0.5) * 2,
        );
      continue;
    }
    const temptation = gain * C.lieScale * (1 - honesty) - C.honestyCost * honesty - lyingCost;
    if (temptation <= 0) {
      out.withheld.push({ prop: t.prop, reason: lyingCost > 0 ? 'norm:lying' : 'honesty' });
      continue;
    }
    candidates.delete(t.prop);
    consider(t.prop, t.value, C.lieConfidence, cred, true, R.temptation + temptation);
  }

  const maxClaims =
    ctx.maxClaims ?? C.claimsBase + Math.round(C.claimsRange * clamp01(speaker.traits.extraversion));
  // Not retold: a claim this listener already heard from this speaker, in the same direction, is dropped
  // before choosing, so it is neither a fresh deed nor a fresh percept (the listener's belief sources are the
  // only record of who said what; they are bounded, so very old tellings may recur).
  const alreadyTold = (prop: string, value: boolean): boolean =>
    listener.memory.beliefs
      .find((x) => x.prop === prop)
      ?.sources.some((src) => src.id === speaker.id && src.value === value) ?? false;
  const chosen = [...candidates.values()]
    .filter((c) => !alreadyTold(c.prop, c.value))
    .sort((a, b) => b.score - a.score || (a.prop < b.prop ? -1 : 1))
    .slice(0, Math.max(0, maxClaims));

  const norms = new Map<string, NormTag>();
  for (const c of chosen) {
    out.claims.push(c);
    const pcNorms: NormTag[] = [];
    if (c.backbiting) {
      pcNorms.push({ normId: 'backbiting', relation: 'violates' });
      norms.set('backbiting', { normId: 'backbiting', relation: 'violates' });
    }
    if (c.deceit) {
      out.deceit = true;
      norms.set('lying', { normId: 'lying', relation: 'violates' });
    }
    // Said, but not news: a claim the listener already holds at this confidence or better is still the speaker's
    // deed (counted above) but yields no percept, so the same gossip retold at every tea is not judged afresh.
    const heard = listener.memory.beliefs.find((x) => x.prop === c.prop);
    if (heard) {
      const cred = expit(heard.logOdds);
      if ((c.value ? cred : 1 - cred) >= c.confidence) continue;
    }
    const pc: Percept = {
      at: ctx.at,
      channel: 'told',
      kind: c.about !== undefined ? 'gossip' : 'fact',
      actorId: speaker.id,
      salience: round(0.3 + 0.4 * c.confidence),
      claims: [{ prop: c.prop, value: c.value, confidence: c.confidence }],
      summary:
        c.about !== undefined
          ? `${nameOf(speaker)} says ${c.about} is ${c.value ? '' : 'not '}${c.prop.split(':')[1] ?? ''}`
          : `${nameOf(speaker)} says ${c.prop} is ${c.value ? 'so' : 'not so'}`,
    };
    if (c.about !== undefined) {
      pc.targetId = c.about;
      const parsed = parseTraitProp(c.prop, table);
      pc.valence = parsed && isUnfavourableTrait(parsed.trait, c.value, table) ? -0.2 : 0.1;
    }
    // The listener sees only the outward act: backbiting is visible, a lie is not.
    if (pcNorms.length > 0) pc.norms = pcNorms;
    if (ctx.placeId !== undefined) pc.placeId = ctx.placeId;
    out.told.push(pc);
  }
  out.norms = [...norms.values()].sort((a, b) => (a.normId < b.normId ? -1 : 1));

  // Advice: what the speaker believes the listener should do.
  const prefix = shouldPrefix(listener.id);
  const care = Math.max(0, relationshipWith(speaker, listener.id).affection);
  const benevolence = clamp01(speaker.values.benevolence);
  const advice: { action: string; cred: number; strength: number }[] = [];
  for (const b of beliefs) {
    if (!b.prop.startsWith(prefix)) continue;
    const cred = expit(b.logOdds);
    if (cred < C.adviceMin) continue;
    const strength = clamp01((cred - 0.5) * 2 * (0.3 + 0.7 * care) * (0.5 + benevolence));
    advice.push({ action: b.prop.slice(prefix.length), cred, strength });
  }
  advice.sort((a, b) => b.strength - a.strength || (a.action < b.action ? -1 : 1));
  for (const a of advice.slice(0, C.maxAdvice)) {
    const percept: Percept = {
      at: ctx.at,
      channel: 'told',
      kind: 'advice',
      actorId: speaker.id,
      targetId: listener.id,
      valence: 0.1,
      salience: round(0.4 + 0.3 * a.strength),
      claims: [{ prop: `advice:${a.action}`, value: true, confidence: round(a.cred) }],
      summary: `${nameOf(speaker)} says I should ${a.action}`,
    };
    if (ctx.placeId !== undefined) percept.placeId = ctx.placeId;
    const suggestion: Suggestion = { voiceId: speaker.id, action: a.action, strength: round(a.strength) };
    if (benevolence >= C.benevolentAppeal) suggestion.appeal = 'benevolence';
    out.advice.push({ action: a.action, percept, suggestion });
  }

  const magnitude = clamp01((ctx.magnitude ?? C.chatMagnitude) + C.chatPerClaim * out.told.length);
  out.socialEvents.speaker.push({ at: ctx.at, kind: 'chat', otherId: listener.id, byMe: true, magnitude });
  out.socialEvents.listener.push({ at: ctx.at, kind: 'chat', otherId: speaker.id, byMe: false, magnitude });
  return out;
}
