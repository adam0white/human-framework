/** SCOPE: deterministic prepared communication, not delivery. Claims preserve origin;
 * deceit stays private. Norm costs model the speaker's held understanding (research/).
 * C0 settles actual recipients/items/attention once. No automatic hearing or RNG.
 */
import { cloneData } from '../core/clone.ts';
import { dexp } from '../core/libm.ts';
import type {
  Belief,
  ConversationData,
  ConversationOwner,
  DeepReadonly,
  Gist,
  PerceptData,
  ToldClaimData,
} from '../run-schema.ts';
import { isUnfavourableTrait, parseTraitProp } from '../social/social.ts';
export const CONVERSATION_DEFAULTS = {
  /** A belief is told only when |credence − 0.5| ≥ this (credence ≥ 0.7 or ≤ 0.3). */
  confidentMin: 0.2,
  /** Claims offered per conversation = base + round(range × extraversion). */
  claimsBase: 1,
  claimsRange: 2,
  maxAdvice: 2,
  relevance: { confidence: 0.5, recency: 0.3, topic: 0.5, feeling: 0.2, temptation: 0.5 },
  recencyScale: 7 * 1440,
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

const round = (x: number) => Math.round(x * 1e9) / 1e9;
const unit = (x: number) => Math.max(0, Math.min(1, x));
const sigmoid = (x: number) => 1 / (1 + dexp(-x));
export type ConversationEvidence = {
  listenerBeliefs: readonly Belief[];
  temptations: readonly { prop: string; value: boolean; gain: number }[];
  loyalWarning: boolean;
};
/** Extra evidence is explicit; the frozen basic port cannot infer listener knowledge. */
export function prepareConversation(
  input: Parameters<ConversationOwner['prepare']>[0],
  context: Parameters<ConversationOwner['prepare']>[1],
  evidence: DeepReadonly<ConversationEvidence>,
): ConversationData {
  const s = context.speaker,
    C = context.effective.builtins.CONVERSATION_DEFAULTS,
    R = C.relevance;
  const out: ConversationData = {
    speaker: input.speaker,
    listener: input.listener,
    claims: [],
    withheld: [],
    norms: [],
    advice: [],
    socialEvents: { speaker: [], listener: [] },
  };
  if (s.id !== input.speaker || context.person !== input.speaker)
    throw new RangeError('Conversation speaker mismatch');
  if (
    (context.listenerKnown.alive.kind === 'known' && !context.listenerKnown.alive.value) ||
    context.listenerKnown.deceased.includes(input.listener) ||
    input.speaker === input.listener ||
    !s.body.alive ||
    s.social.relationships.some(
      (r) => r.otherId === input.listener && (r.deceasedAt !== undefined || r.roles.includes('deceased')),
    )
  )
    return out;
  if (!Number.isSafeInteger(input.maxClaims) || input.maxClaims < 0)
    throw new RangeError('Invalid claim bound');
  const affection = (id: string) => s.social.relationships.find((r) => r.otherId === id)?.affection ?? 0;
  const heldCost = (id: string) => {
    const n = s.conscience.norms.find((n) => n.normId === id);
    return n ? n.conviction * (C.standingWeight[n.standing] ?? 0) : 0;
  };
  const backbitingCost = heldCost('backbiting') * C.backbitingScale * (0.5 + s.traits.honesty),
    lyingCost = heldCost('lying') * C.lyingScale * (0.5 + s.traits.honesty);
  const candidates = new Map<string, ToldClaimData>();
  const consider = (
    prop: string,
    value: boolean,
    confidence: number,
    credence: number,
    deceit: boolean,
    base: number,
  ) => {
    const parsed = parseTraitProp(prop),
      about = parsed?.personId,
      backbiting =
        about !== undefined &&
        about !== s.id &&
        about !== input.listener &&
        isUnfavourableTrait(parsed!.trait, value);
    let score = base;
    if (input.topicIds.some((t) => prop === t || prop.startsWith(`${t}:`))) score += R.topic;
    if (about) score += R.feeling * Math.abs(affection(about));
    if (backbiting) score -= backbitingCost;
    if (score <= 0) {
      (out.withheld as { prop: string; reason: string }[]).push({
        prop,
        reason: backbitingCost > 0 && backbiting ? 'norm:backbiting' : 'irrelevant',
      });
      return;
    }
    const claim: ToldClaimData = {
      prop,
      value,
      confidence: round(confidence),
      speakerCredence: round(credence),
      deceit,
      backbiting,
      score: round(score),
    };
    if (about) claim.about = about;
    const provenance = s.memory.beliefs.find((b) => b.prop === prop)?.provenance;
    claim.origin = provenance?.origin ?? s.id;
    if (provenance?.lineage !== undefined) claim.lineage = provenance.lineage;
    candidates.set(prop, claim);
  };
  const beliefs = [...s.memory.beliefs].sort((a, b) => (a.prop < b.prop ? -1 : 1));
  for (const b of beliefs) {
    if (b.prop.startsWith('advice:') || b.prop.includes(':should:')) continue;
    const subject = b.prop.split(':')[0];
    if (subject === s.id) continue;
    const cred = sigmoid(b.logOdds);
    if (Math.abs(cred - 0.5) < C.confidentMin) continue;
    const value = cred > 0.5;
    if (subject === input.listener) {
      const trait = parseTraitProp(b.prop)?.trait;
      if (
        !evidence.loyalWarning ||
        affection(input.listener) < 0.5 ||
        trait === undefined ||
        !isUnfavourableTrait(trait, value)
      )
        continue;
    }
    const confidence = value ? cred : 1 - cred,
      recency = 1 / (1 + Math.max(0, context.at - b.updatedAt) / (C.recencyScale * 60000));
    consider(
      b.prop,
      value,
      confidence,
      cred,
      false,
      R.confidence * (confidence - 0.5) * 2 + R.recency * recency,
    );
  }
  for (const t of [...evidence.temptations].sort((a, b) => (a.prop < b.prop ? -1 : 1))) {
    const b = beliefs.find((b) => b.prop === t.prop),
      cred = b ? sigmoid(b.logOdds) : 0.5,
      forValue = t.value ? cred : 1 - cred,
      gain = unit(t.gain);
    if (forValue >= 0.5) {
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
    const temptation =
      gain * C.lieScale * (1 - s.traits.honesty) - C.honestyCost * s.traits.honesty - lyingCost;
    if (temptation <= 0) {
      (out.withheld as { prop: string; reason: string }[]).push({
        prop: t.prop,
        reason: lyingCost > 0 ? 'norm:lying' : 'honesty',
      });
      continue;
    }
    candidates.delete(t.prop);
    consider(t.prop, t.value, C.lieConfidence, cred, true, R.temptation + temptation);
  }
  out.claims = [...candidates.values()]
    .filter(
      (c) =>
        !evidence.listenerBeliefs
          .find((b) => b.prop === c.prop)
          ?.sources.some((src) => src.id === s.id && src.value === c.value),
    )
    .sort((a, b) => b.score - a.score || (a.prop < b.prop ? -1 : 1))
    .slice(0, input.maxClaims);
  const normIds = new Set<string>();
  for (const c of out.claims) {
    if (c.backbiting) normIds.add('backbiting');
    if (c.deceit) normIds.add('lying');
  }
  out.norms = [...normIds].sort().map((normId) => ({ normId, relation: 'violates' }));
  const prefix = `${input.listener}:should:`,
    care = Math.max(0, affection(input.listener)),
    benevolence = s.values.benevolence;
  const advice = beliefs
    .filter((b) => b.prop.startsWith(prefix) && sigmoid(b.logOdds) >= C.adviceMin)
    .map((b) => ({
      b,
      action: b.prop.slice(prefix.length),
      cred: sigmoid(b.logOdds),
      strength: unit((sigmoid(b.logOdds) - 0.5) * 2 * (0.3 + 0.7 * care) * (0.5 + benevolence)),
    }))
    .sort((a, b) => b.strength - a.strength || (a.action < b.action ? -1 : 1))
    .slice(0, C.maxAdvice);
  out.advice = advice.map((a) => {
    const id = `conversation:${context.causes[0] ?? context.at}:advice:${a.action}`;
    const percept: PerceptData = {
      id,
      occurredAt: context.at,
      channel: 'told',
      kind: 'advice',
      actorId: s.id,
      targetId: input.listener,
      valence: 0.1,
      salience: round(0.4 + 0.3 * a.strength),
      summary: '',
      claims: [
        {
          prop: `advice:${a.action}`,
          value: true,
          confidence: round(a.cred),
          origin: a.b.provenance?.origin ?? s.id,
          ...(a.b.provenance?.lineage === undefined ? {} : { lineage: a.b.provenance.lineage }),
        },
      ],
      norms: [],
      advice: [],
      consequences: [],
      withdrawConsequences: [],
      witnesses: [],
      reports: [],
      provenance: [],
    };
    return {
      action: a.action,
      percept,
      suggestion: {
        adviceId: id,
        voiceId: s.id,
        action: a.action,
        strength: round(a.strength),
        ...(benevolence >= C.benevolentAppeal ? { appeal: 'benevolence' as const } : {}),
      },
    };
  });
  const fresh = out.claims.filter((c) => {
    const heard = evidence.listenerBeliefs.find((b) => b.prop === c.prop);
    return !heard || (c.value ? sigmoid(heard.logOdds) : 1 - sigmoid(heard.logOdds)) < c.confidence;
  });
  const magnitude = unit(C.chatMagnitude + C.chatPerClaim * fresh.length);
  out.socialEvents = {
    speaker: [{ kind: 'chat', byMe: true, magnitude }],
    listener: [{ kind: 'chat', byMe: false, magnitude }],
  };
  return out;
}
export const conversationOwner: ConversationOwner = {
  prepare(input, context) {
    return prepareConversation(input, context, {
      listenerBeliefs:
        context.listenerKnown.beliefs.kind === 'known' ? context.listenerKnown.beliefs.value : [],
      temptations: input.temptations,
      loyalWarning: input.loyalWarning,
    });
  },
  prepareRetelling(input, context) {
    if (input.teller !== context.speaker.id || context.person !== input.teller)
      throw new RangeError('Retelling speaker mismatch');
    if (input.teller === input.listener) return [];
    if (new Set(input.gistIds).size !== input.gistIds.length)
      throw new RangeError('Duplicate requested gist');
    const requested = new Set(input.gistIds);
    for (const id of requested)
      if (!context.speaker.memory.gists.some((g) => g.id === id)) throw new RangeError('Unknown gist');
    return context.speaker.memory.gists
      .filter(
        (g) =>
          requested.has(g.id) &&
          g.salience >= 0.1 &&
          (!input.placeIds || (g.placeId !== undefined && input.placeIds.includes(g.placeId))),
      )
      .sort((a, b) => b.salience - a.salience || Number(a.id.slice(1)) - Number(b.id.slice(1)))
      .slice(0, 3)
      .map((g) => ({
        id: `${context.causes[0] ?? input.teller}:gist:${g.id}`,
        data: { kind: 'gist', sourceGistId: g.id, gist: cloneData(g) as Gist },
      }));
  },
};
Object.freeze(CONVERSATION_DEFAULTS.relevance);
Object.freeze(CONVERSATION_DEFAULTS.standingWeight);
Object.freeze(CONVERSATION_DEFAULTS);
