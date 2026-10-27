/** SCOPE: HF4 always-present owner. Source equations use immutable run parameters; no legacy continuation. */
import { clamp, clamp01, decay, dpow, logit } from '../core/index.ts';

const MINUTES_PER_DAY = 1440;
export const BELIEF_DEFAULTS = {
  maxBeliefs: 300,
  maxSources: 6,
  maxLogOdds: 6,
  defaultTrust: 0.5,
  selfTrust: 0.95,
  /** Testimony weight w = clamp01((trust - trustFloor) / (1 - trustFloor)) ^ trustExponent. */
  trustFloor: 0.2,
  trustExponent: 1.5,
  /** Weight multiplier when the same source repeats a claim it already made (not independent evidence). */
  repeatDiscount: 0.5,
  /** Weight multiplier on testimony that contradicts the person's own observation of the proposition. */
  observedDiscount: 0.25,
  /** Log-odds magnitude set by direct observation. */
  confirmLogOdds: 4,
  /** Trust change on confirmation: gain toward 1, loss toward 0 (loss > gain). */
  trustGain: 0.1,
  trustLoss: 0.25,
  /** Loss of source trust after attending incompatible accounts from that same source. */
  contradictionLoss: 0.25,
  maxContradictions: 32,
  /** Half-life of log-odds drift toward 0. */
  driftHalfLife: 45 * MINUTES_PER_DAY,
  // Attention
  attentionBase: 2,
  attentionRange: 4,
  selfRelevance: 0.4,
  selfValenceRelevance: 0.2,
  affectionThreshold: 0.4,
  socialRelevance: 0.3,
  threatRelevance: 0.5,
  interestRelevance: 0.25,
  alwaysSalience: 0.9,
  alwaysSelfValence: 0.5,
  threatKinds: [
    'theft',
    'harm',
    'attack',
    'threat',
    'danger',
    'fire',
    'death',
    'insult',
    'conflict',
    'injury',
  ],
};

/** HF4 source trust is separate from relationship and advising-voice trust. */
export const beliefOwner: import('../run-schema.ts').BeliefOwner = {
  initialize(input) {
    return {
      beliefs: input.beliefs.map((b) => structuredClone(b)) as import('../run-schema.ts').Belief[],
      sourceTrust: Object.fromEntries(input.sourceTrust.map((s) => [s.sourceId, s.trust])),
      contradictions: [],
    };
  },
  receive: receiveBeliefEvidence,
  advance(_state, context) {
    const state = structuredClone(context.continuation.state) as import('../run-schema.ts').BeliefOwnedState;
    const duration = BigInt(context.to) - BigInt(context.continuation.anchor.at);
    if (duration < 0n || duration > BigInt(Number.MAX_SAFE_INTEGER))
      throw new RangeError('Invalid belief span');
    for (const b of state.beliefs)
      b.logOdds = decay(
        b.logOdds,
        Number(duration) / 60000,
        context.effective.builtins.BELIEF_DEFAULTS.driftHalfLife,
      );
    return {
      state,
      continuation: structuredClone(
        context.continuation,
      ) as import('../run-schema.ts').DeliberationContinuation['beliefs'],
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: context.to,
    };
  },
  validate(state) {
    const issues: import('../run-schema.ts').ValidationIssue[] = [];
    const fail = (path: string) =>
      issues.push({ path, code: 'invalid-schema', message: 'Invalid belief state' });
    if (
      state.beliefs.length > BELIEF_DEFAULTS.maxBeliefs ||
      new Set(state.beliefs.map((b) => b.prop)).size !== state.beliefs.length
    )
      fail('beliefs');
    for (const [i, b] of state.beliefs.entries()) {
      if (
        !b.prop ||
        !Number.isFinite(b.logOdds) ||
        Math.abs(b.logOdds) > BELIEF_DEFAULTS.maxLogOdds ||
        !Number.isSafeInteger(b.updatedAt) ||
        b.sources.some((s) => !s.id) ||
        b.sources.length > BELIEF_DEFAULTS.maxSources ||
        new Set(b.sources.map((s) => s.id)).size !== b.sources.length
      )
        fail(`beliefs.${i}`);
      if (
        b.provenance &&
        (!Number.isSafeInteger(b.provenance.at) || (b.provenance.lineage?.length ?? 0) > 64)
      )
        fail(`beliefs.${i}.provenance`);
    }
    for (const [id, t] of Object.entries(state.sourceTrust))
      if (!Number.isFinite(t) || t < 0 || t > 1) fail(`sourceTrust.${id}`);
    if (
      state.contradictions.length > BELIEF_DEFAULTS.maxContradictions ||
      new Set(state.contradictions.map((c) => JSON.stringify([c.sourceId, c.prop]))).size !==
        state.contradictions.length
    )
      fail('contradictions');
    for (const c of state.contradictions)
      if (
        !Number.isSafeInteger(c.at) ||
        (c.weight !== undefined && (!Number.isFinite(c.weight) || c.weight <= 0 || c.weight > 1))
      )
        fail('contradictions');
    return issues;
  },
};

export function receiveBeliefEvidence(
  previous: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').BeliefOwnedState>,
  input: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').BeliefInput>,
  context: {
    person: string;
    at: number;
    effective: {
      builtins: {
        BELIEF_DEFAULTS: import('../run-schema.ts').DeepReadonly<
          import('../run-schema.ts').Effective_BELIEF_DEFAULTS
        >;
      };
    };
  },
): import('../run-schema.ts').OwnerOutput<import('../run-schema.ts').BeliefOwnedState> {
  const state = structuredClone(previous) as import('../run-schema.ts').BeliefOwnedState;
  const d = context.effective.builtins.BELIEF_DEFAULTS;
  const trust = (id: string) =>
    id === context.person || id === 'self'
      ? d.selfTrust
      : Object.hasOwn(state.sourceTrust, id)
        ? (state.sourceTrust[id] ?? d.defaultTrust)
        : d.defaultTrust;
  const weight = (t: number) => dpow(clamp01((t - d.trustFloor) / (1 - d.trustFloor)), d.trustExponent);
  const ensure = (prop: string) => {
    let b = state.beliefs.find((b) => b.prop === prop);
    if (!b) {
      b = { prop, logOdds: 0, updatedAt: context.at, sources: [] };
      state.beliefs.push(b);
      if (state.beliefs.length > d.maxBeliefs) {
        const candidates = state.beliefs
          .filter((v) => v !== b)
          .sort(
            (a, b) =>
              Math.abs(a.logOdds) - Math.abs(b.logOdds) ||
              a.updatedAt - b.updatedAt ||
              (a.prop < b.prop ? -1 : 1),
          );
        const worst = candidates[0];
        if (worst) state.beliefs.splice(state.beliefs.indexOf(worst), 1);
      }
    }
    return b;
  };
  if (input.kind === 'claims' && input.attention > 0) {
    for (const claim of input.claims) {
      const b = ensure(claim.prop);
      let w = weight(trust(claim.sourceId)) * clamp01(input.attention);
      if (b.sources.some((s) => s.id === claim.sourceId && s.value === claim.value)) w *= d.repeatDiscount;
      if (
        claim.sourceId !== context.person &&
        claim.sourceId !== 'self' &&
        b.sources.some((s) => (s.id === context.person || s.id === 'self') && s.value !== claim.value)
      )
        w *= d.observedDiscount;
      b.logOdds = clamp(
        b.logOdds + (claim.value ? 1 : -1) * logit(0.5 + (clamp01(claim.confidence) - 0.5) * w),
        -d.maxLogOdds,
        d.maxLogOdds,
      );
      b.updatedAt = context.at;
      b.sources = [
        ...b.sources.filter((s) => s.id !== claim.sourceId),
        { id: claim.sourceId, value: claim.value },
      ].slice(-d.maxSources);
      if (!b.provenance && (claim.origin !== undefined || claim.lineage !== undefined)) {
        b.provenance = { origin: claim.origin ?? input.teller, firstFrom: input.teller, at: context.at };
        if (claim.lineage !== undefined && claim.lineage.length <= 64) b.provenance.lineage = claim.lineage;
      }
    }
  } else if (input.kind === 'confirm') {
    const b = ensure(input.prop);
    const sign = input.value ? 1 : -1;
    b.logOdds =
      sign *
      (Math.sign(b.logOdds) === sign ? Math.max(d.confirmLogOdds, Math.abs(b.logOdds)) : d.confirmLogOdds);
    for (const source of b.sources)
      if (source.id !== context.person && source.id !== 'self') {
        const t = trust(source.id);
        state.sourceTrust[source.id] = clamp01(
          source.value === input.value ? t + d.trustGain * (1 - t) : t - d.trustLoss * t,
        );
      }
    b.sources = [{ id: context.person, value: input.value }];
    b.updatedAt = context.at;
  } else if (
    input.kind === 'contradiction' &&
    input.sourceId !== context.person &&
    input.sourceId !== 'self'
  ) {
    const w = input.reporterId === undefined ? 1 : weight(trust(input.reporterId));
    const prior = state.contradictions.find((v) => v.sourceId === input.sourceId && v.prop === input.prop);
    const oldWeight = prior ? (prior.weight ?? 1) : 0;
    const account = state.beliefs
      .find((b) => b.prop === input.prop)
      ?.sources.find((s) => s.id === input.sourceId);
    if (w > oldWeight && account && account.value !== input.value) {
      state.sourceTrust[input.sourceId] = clamp01(
        (trust(input.sourceId) * (1 - d.contradictionLoss * w)) / (1 - d.contradictionLoss * oldWeight),
      );
      if (prior) prior.weight = w;
      else
        state.contradictions.push({ sourceId: input.sourceId, prop: input.prop, at: context.at, weight: w });
      state.contradictions.sort((a, b) => a.at - b.at);
      state.contradictions = state.contradictions.slice(-d.maxContradictions);
    }
  }
  return {
    state,
    effects: { terms: [], modifiers: [], appraisals: [] },
    events: [],
    nextBoundary: null,
    advancedThrough: context.at,
  };
}

/** Pure information-source reliability; it never reads relationship/voice trust. */
export function trustOf(
  p: Pick<import('../run-schema.ts').ActorState, 'id'> & {
    memory: Pick<import('../run-schema.ts').MemoryState, 'sourceTrust'>;
  },
  sourceId: string,
): number {
  if (sourceId === p.id || sourceId === 'self') return BELIEF_DEFAULTS.selfTrust;
  return Object.hasOwn(p.memory.sourceTrust, sourceId)
    ? (p.memory.sourceTrust[sourceId] ?? BELIEF_DEFAULTS.defaultTrust)
    : BELIEF_DEFAULTS.defaultTrust;
}
export function testimonyWeight(trust: number): number {
  return dpow(
    clamp01((trust - BELIEF_DEFAULTS.trustFloor) / (1 - BELIEF_DEFAULTS.trustFloor)),
    BELIEF_DEFAULTS.trustExponent,
  );
}

/** Pure source attention budget, before any belief/memory/social reception. */
export function attendEvidence(
  actor: import('../run-schema.ts').DeepReadonly<
    Pick<import('../run-schema.ts').ActorState, 'id' | 'social'>
  >,
  percepts: import('../run-schema.ts').DeepReadonly<readonly import('../run-schema.ts').PerceptData[]>,
  context: import('../run-schema.ts').DeepReadonly<{
    focus: number;
    fatigue: number;
    fear: number;
    interests: readonly string[];
    defaults: import('../run-schema.ts').Effective_BELIEF_DEFAULTS;
  }>,
): readonly import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').PerceptData>[] {
  const d = context.defaults,
    capacity = Math.round(
      d.attentionBase + d.attentionRange * (1 - clamp01(context.focus)) * (1 - clamp01(context.fatigue)),
    );
  const affection = (id: string | undefined) =>
    id === undefined ? 0 : Math.abs(actor.social.relationships.find((r) => r.otherId === id)?.affection ?? 0);
  const scored = percepts
    .map((percept, index) => {
      const valence = Math.abs(percept.valence ?? 0),
        self = percept.targetId === actor.id;
      let score = percept.salience;
      if (self) score += d.selfRelevance + d.selfValenceRelevance * valence;
      const care = Math.max(affection(percept.actorId), affection(percept.targetId));
      if (care >= d.affectionThreshold) score += d.socialRelevance * care;
      if (d.threatKinds.includes(percept.kind)) score += d.threatRelevance * clamp01(context.fear);
      if (
        [percept.kind, percept.actorId, percept.targetId, percept.placeId].some(
          (id) => id !== undefined && context.interests.includes(id),
        )
      )
        score += d.interestRelevance;
      return {
        percept,
        index,
        score,
        mustKeep: percept.salience >= d.alwaysSalience || (self && valence >= d.alwaysSelfValence),
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);
  let used = 0;
  const selected: (typeof scored)[number]['percept'][] = [];
  for (const item of scored)
    if (item.mustKeep) selected.push(item.percept);
    else if (used < capacity) {
      selected.push(item.percept);
      used++;
    }
  return selected;
}
