/** SCOPE: episodic/gist memory, bounded retention and anchored decay. All coefficients are
 * engineering priors (research/long-run-sources.md). No belief writes, save repair or RNG.
 * Allocation validation includes C0 retained references/tombstones after eviction.
 */
import { cloneData } from '../core/clone.ts';
import { dexp } from '../core/libm.ts';
import { renderProjection } from '../narrate/literal.ts';
import type {
  DeepReadonly,
  Episode,
  Gist,
  MemoryOwnedState,
  MemoryOwner,
  OwnerOutput,
  Reference,
  ValidationIssue,
} from '../run-schema.ts';

const MINUTES_PER_DAY = 1440;
const MINUTES_PER_YEAR = 365 * MINUTES_PER_DAY;
export const MEMORY_DEFAULTS = {
  maxEpisodes: 200,
  /** Loss episodes protected from eviction at most (the most salient ones); see `remember`. */
  maxProtectedLoss: 50,
  maxExpectations: 150,
  /** Salience half-life (minutes) for a neutral episode and for a maximally emotional one. */
  halfLifeNeutral: 3 * MINUTES_PER_DAY,
  halfLifeEmotional: 30 * MINUTES_PER_DAY,
  /** Recency weight = 1 / (1 + age / recencyScale). */
  recencyScale: 7 * MINUTES_PER_DAY,
  /** Base salience by episode kind; |valence| adds valenceSalience on top. */
  kindSalience: {
    outcome: 0.3,
    social: 0.4,
    witnessed: 0.3,
    told: 0.25,
    suggestion: 0.3,
  } as Record<string, number>,
  defaultKindSalience: 0.3,
  valenceSalience: 0.6,
  /** Fraction of the remaining headroom added to salience when an episode is recalled. */
  recallBoost: 0.05,
  defaultRecallLimit: 5,
  /** Confidence in learned expectation = samples / (samples + confidenceK). */
  confidenceK: 3,
  /** Maximum change of any learned estimate per outcome. */
  maxStep: 0.25,
  minLearningRate: 0.1,
  /** Assumed success rate before any experience. */
  priorSuccess: 0.9,
  /** |valence| needed for an episode to be cited by expectedEffect. */
  citeValence: 0.4,
  maxCited: 2,
};

export const GIST_DEFAULTS = {
  /** Gists kept; the weakest (salience) go first, loss gists last (at most `maxProtectedLoss` protected). */
  maxGists: 64,
  maxProtectedLoss: 16,
  /** `foldGists` folds episodes older than this (minutes). */
  horizon: 180 * MINUTES_PER_DAY,
  /** |valence| an episode needs to leave a gist (loss episodes always do). */
  minValence: 0.3,
  /** Gist salience half-life for a neutral and for a maximally emotional gist (minutes). */
  halfLifeNeutral: 2 * MINUTES_PER_YEAR,
  halfLifeEmotional: 20 * MINUTES_PER_YEAR,
  /** Fraction of an episode's encoding strength added to the gist's headroom when it is folded in. */
  foldGain: 0.5,
  /** Tags kept per gist (loss tags first). */
  maxTags: 6,
  /** Weight of a gist matched by place only, relative to one matched by action. */
  placeWeight: 0.5,
};

export const RETELL_DEFAULTS = {
  /** A told gist's salience is the teller's × trust × this: a story weighs less than having been there. */
  share: 0.6,
  /** Gists told per call, strongest first. */
  limit: 3,
  /** Gists weaker than this (teller's salience) are not worth telling. */
  minSalience: 0.1,
};

export const CUE_RECALL_DEFAULTS = {
  /** Feature weights; the cue strength is the sum of matched weights, capped at 1. */
  weights: { place: 0.45, person: 0.45, action: 0.3, tags: 0.25, hour: 0.1, anniversary: 0.6 },
  /** An episode involving someone the person holds as deceased gets this extra cue strength when any feature matches. */
  deceasedBoost: 0.25,
  /** Score = strength × salience must reach this for the memory to intrude. */
  threshold: 0.2,
  /**
   * Only episodes at least this emotional come back unbidden (review 2026-10-03: at 0.3 everyday meals at home,
   * valence 0.34-0.56, were re-recalled by every meal, kept alive for months and pushed mood up daily).
   */
  minValence: 0.5,
  /** Loss episodes (a death, a funeral, someone now deceased) come back from this lower floor. */
  minLossValence: 0.3,
  /** An episode cannot be cue-recalled again within this many minutes. */
  refractory: 6 * 60,
  /** Re-appraisal magnitude = |valence| × reappraisal × cue strength (well below the original event). */
  reappraisal: 0.4,
  limit: 2,
  /** Grief intensity = magnitude × (base + slope × emotionality), the same shape as appraisal gain in `affect/`. */
  griefGainBase: 0.6,
  griefGainSlope: 0.8,
  /** Hour match tolerance (±hours, wrapping midnight). */
  hourTolerance: 1,
  /** Tags that mark an episode as a loss (in addition to involving a deceased person). */
  lossTags: ['death', 'loss', 'funeral', 'grave'],
};

const unit = (x: number) => Math.max(0, Math.min(1, x));
const signed = (x: number) => Math.max(-1, Math.min(1, x));
const numericId = (id: string, prefix: string): number | null => {
  if (!new RegExp(`^${prefix}(0|[1-9][0-9]*)$`).test(id)) return null;
  const n = Number(id.slice(1));
  return Number.isSafeInteger(n) ? n : null;
};
const loss = (e: DeepReadonly<Episode>) =>
  e.action === 'death' || e.tags.some((t) => CUE_RECALL_DEFAULTS.lossTags.includes(t));
const sameStory = (a: DeepReadonly<Episode>, b: DeepReadonly<Episode>) =>
  a.kind === b.kind && a.action === b.action && a.targetId === b.targetId && a.placeId === b.placeId;
const output = <S>(state: S, at: number): OwnerOutput<S> => ({
  state,
  effects: { terms: [], modifiers: [], appraisals: [] },
  events: [],
  nextBoundary: null,
  advancedThrough: at,
});

export function validateMemory(
  state: DeepReadonly<MemoryOwnedState>,
  allocations: readonly Reference[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = validateNarrativeJson(state, 'memory');
  issues.push(
    ...validateNarrativeFields(
      state,
      ['episodes', 'gists', 'expectations', 'nextEpisode', 'nextGist'],
      ['episodes', 'gists', 'expectations', 'nextEpisode', 'nextGist'],
      'memory',
    ),
  );
  const bad = (path: string, message: string, code: ValidationIssue['code'] = 'invalid-schema') =>
    issues.push({ path, code, message });
  if (
    !state ||
    !Array.isArray(state.episodes) ||
    !Array.isArray(state.gists) ||
    !Array.isArray(state.expectations)
  )
    return [{ path: 'memory', code: 'invalid-schema', message: 'Required memory containers are missing' }];
  for (const [list, prefix, counter, limit] of [
    [state.episodes, 'e', state.nextEpisode, 200],
    [state.gists, 'g', state.nextGist, 64],
  ] as const) {
    const path = prefix === 'e' ? 'episodes' : 'gists';
    if (!Number.isSafeInteger(counter) || counter < 0) bad(path, 'Invalid allocation counter');
    if (list.length > limit) bad(path, 'Retention bound exceeded', 'limit-exceeded');
    const ids = new Set<string>();
    for (const e of list) {
      if (!e || typeof e !== 'object') {
        bad(path, 'Malformed memory');
        continue;
      }
      const fields = [
        'id',
        'at',
        'kind',
        'action',
        'actorId',
        'targetId',
        'placeId',
        'valence',
        'salience',
        'summary',
        'addressedSummary',
        'tags',
        'voiceId',
        'recalledAt',
      ];
      issues.push(
        ...validateNarrativeFields(
          e,
          prefix === 'g' ? [...fields, 'count', 'firstAt', 'lastAt', 'weight', 'peak'] : fields,
          ['id', 'at', 'kind', 'valence', 'salience', 'summary', 'tags'],
          path,
        ),
      );
      if (typeof e.id !== 'string' || typeof e.kind !== 'string' || !e.kind) {
        bad(path, 'Invalid memory identity/kind');
        continue;
      }
      for (const key of ['action', 'actorId', 'targetId', 'placeId', 'addressedSummary', 'voiceId'] as const)
        if (e[key] !== undefined && typeof e[key] !== 'string')
          bad(`${path}.${key}`, 'Invalid optional text');
      if (ids.has(e.id)) bad(`${path}.${e.id}`, 'Duplicate memory identity', 'duplicate-id');
      ids.add(e.id);
      const ordinal = numericId(e.id, prefix);
      if (ordinal === null || ordinal >= counter)
        bad(`${path}.${e.id}`, 'Counter must exceed every allocated ordinal');
      if (
        !Number.isSafeInteger(e.at) ||
        !Number.isFinite(e.valence) ||
        Math.abs(e.valence) > 1 ||
        !Number.isFinite(e.salience) ||
        e.salience < 0 ||
        e.salience > 1 ||
        typeof e.summary !== 'string' ||
        !Array.isArray(e.tags) ||
        !e.tags.every((t: unknown) => typeof t === 'string')
      )
        bad(`${path}.${e.id}`, 'Malformed episode');
      if (e.recalledAt !== undefined && !Number.isSafeInteger(e.recalledAt))
        bad(`${path}.${e.id}.recalledAt`, 'Invalid recall clock');
    }
    const kind = prefix === 'e' ? 'episode' : 'gist';
    for (const ref of allocations)
      if (ref.kind === kind) {
        const ordinal = numericId(ref.id, prefix);
        if (ordinal === null || ordinal >= counter) bad(path, 'Counter rewinds an allocated identity');
      }
  }
  for (const g of state.gists)
    if (
      !g ||
      typeof g !== 'object' ||
      !Number.isSafeInteger(g.count) ||
      g.count < 0 ||
      !Number.isSafeInteger(g.firstAt) ||
      !Number.isSafeInteger(g.lastAt) ||
      g.firstAt > g.lastAt ||
      !Number.isFinite(g.weight) ||
      g.weight < 0 ||
      !Number.isFinite(g.peak) ||
      g.peak < 0 ||
      g.peak > 1
    )
      bad('gists', 'Malformed gist');
  const keys = new Set<string>();
  if (state.expectations.length > 150) bad('expectations', 'Retention bound exceeded', 'limit-exceeded');
  for (const x of state.expectations) {
    if (!x || typeof x !== 'object' || !x.needs || typeof x.needs !== 'object') {
      bad('expectations', 'Malformed expectation');
      continue;
    }
    issues.push(
      ...validateNarrativeFields(
        x,
        ['key', 'needs', 'successRate', 'samples', 'valence'],
        ['key', 'needs', 'successRate', 'samples', 'valence'],
        'expectations',
      ),
    );
    if (keys.has(x.key)) bad('expectations', 'Duplicate expectation key', 'duplicate-id');
    keys.add(x.key);
    if (
      !x.key ||
      !Number.isSafeInteger(x.samples) ||
      x.samples < 0 ||
      !Number.isFinite(x.successRate) ||
      x.successRate < 0 ||
      x.successRate > 1 ||
      !Number.isFinite(x.valence) ||
      Math.abs(x.valence) > 1 ||
      !Object.values(x.needs).every(
        (v: unknown) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1,
      )
    )
      bad(`expectations.${x.key}`, 'Malformed expectation');
  }
  return issues;
}
function checked(
  state: DeepReadonly<MemoryOwnedState>,
  allocations: readonly Reference[] = [],
): MemoryOwnedState {
  const issues = validateMemory(state, allocations);
  const [issue] = issues;
  if (issue) throw new RangeError(issue.message);
  return cloneData(state) as MemoryOwnedState;
}
function trim<T extends Episode>(
  list: T[],
  max: number,
  protectedMax: number,
  at: number,
  recency: number,
): T[] {
  const protectedIds = new Set(
    list
      .filter(loss)
      .sort((a, b) => b.salience - a.salience || Number(b.id.slice(1)) - Number(a.id.slice(1)))
      .slice(0, protectedMax)
      .map((e) => e.id),
  );
  const gone: T[] = [];
  while (list.length > max) {
    let worst = 0,
      score = Infinity;
    list.forEach((e, i) => {
      const value = e.salience / (1 + Math.max(0, at - e.at) / recency) + (protectedIds.has(e.id) ? 1 : 0);
      if (value < score) {
        worst = i;
        score = value;
      }
    });
    gone.push(...list.splice(worst, 1));
  }
  return gone;
}
function fold(state: MemoryOwnedState, ep: Episode, at: number, K: DeepReadonly<typeof GIST_DEFAULTS>): void {
  if (!loss(ep) && Math.abs(ep.valence) < K.minValence) return;
  const fresh = unit(
    (MEMORY_DEFAULTS.kindSalience[ep.kind] ?? MEMORY_DEFAULTS.defaultKindSalience) +
      MEMORY_DEFAULTS.valenceSalience * Math.abs(ep.valence),
  );
  let g = state.gists.find((x) => sameStory(x, ep) && x.actorId === ep.actorId);
  if (!g) {
    if (!Number.isSafeInteger(state.nextGist + 1)) throw new RangeError('Gist counter exhausted');
    g = {
      ...ep,
      id: `g${state.nextGist++}`,
      salience: fresh,
      tags: [],
      count: 0,
      firstAt: ep.at,
      lastAt: ep.at,
      weight: 0,
      peak: fresh,
    };
    state.gists.push(g);
  } else g.salience = unit(g.salience + (1 - g.salience) * K.foldGain * fresh);
  g.valence = signed((g.valence * g.weight + ep.valence * fresh) / (g.weight + fresh));
  g.weight += fresh;
  g.count++;
  g.firstAt = Math.min(g.firstAt, ep.at);
  g.lastAt = Math.max(g.lastAt, ep.at);
  if (fresh > g.peak) {
    g.peak = fresh;
    g.at = ep.at;
    g.summary = ep.summary;
  }
  g.tags = [...new Set([...g.tags, ...ep.tags])]
    .sort(
      (a, b) =>
        Number(CUE_RECALL_DEFAULTS.lossTags.includes(b)) - Number(CUE_RECALL_DEFAULTS.lossTags.includes(a)),
    )
    .slice(0, K.maxTags);
  trim(state.gists, K.maxGists, K.maxProtectedLoss, at, Infinity);
}
function encode(
  state: MemoryOwnedState,
  episode: DeepReadonly<Omit<Episode, 'id'>>,
  at: number,
  K: DeepReadonly<typeof MEMORY_DEFAULTS>,
  G: DeepReadonly<typeof GIST_DEFAULTS>,
): Episode {
  if (!Number.isSafeInteger(state.nextEpisode + 1)) throw new RangeError('Episode counter exhausted');
  const ep = { ...cloneData(episode), id: `e${state.nextEpisode++}` } as Episode;
  const issues = validateMemory({ ...state, episodes: [ep], gists: [] }, []);
  if (issues.length) throw new RangeError(issues[0]?.message ?? 'Invalid episode');
  state.episodes.push(ep);
  for (const gone of trim(state.episodes, K.maxEpisodes, K.maxProtectedLoss, at, K.recencyScale * 60000))
    fold(state, gone, at, G);
  return ep;
}
export const memoryOwner: MemoryOwner = {
  initialize(input, context) {
    const state: MemoryOwnedState = {
      episodes: [],
      gists: [],
      expectations: cloneData(input.expectations) as MemoryOwnedState['expectations'],
      nextEpisode: 0,
      nextGist: 0,
    };
    for (const authored of input.episodes) {
      const { basis: _basis, provenance: _provenance, ...ep } = authored;
      const n = numericId(ep.id, 'e');
      if (n === null) throw new RangeError('Invalid authored episode identity');
      state.episodes.push(cloneData(ep) as Episode);
      state.nextEpisode = Math.max(state.nextEpisode, n + 1);
    }
    return checked(state, context.allocations);
  },
  validate: validateMemory,
  expectedEffect(state, offer, context) {
    return expectedEffect(state, offer, context.at, context.effective);
  },
  receiveCue(state, cue, context) {
    if (cue.at !== context.at) throw new RangeError('Recall cue clock mismatch');
    return receiveMemoryCue(
      state,
      { ...cue, deceased: context.deceased, emotionality: context.emotionality },
      context,
    );
  },
  receive(state, input, context) {
    const out = checked(state, context.allocations),
      K = context.effective.builtins.MEMORY_DEFAULTS,
      G = context.effective.builtins.GIST_DEFAULTS;
    if (input.kind === 'recall') {
      if (new Set(input.episodeIds).size !== input.episodeIds.length)
        throw new RangeError('Duplicate recall identity');
      for (const id of input.episodeIds) {
        const e = [...out.episodes, ...out.gists].find((e) => e.id === id);
        if (!e) throw new RangeError('Unknown recall identity');
        e.salience = unit(e.salience + K.recallBoost * (1 - e.salience));
        e.recalledAt = context.at;
      }
    } else if (input.kind === 'outcome') {
      encode(out, input.episode, context.at, K, G);
      return output(learnMemoryOutcome(out, input, context), context.at);
    } else if (input.kind === 'episode') {
      if (!input.receiptId) throw new RangeError('Missing episode receipt');
      encode(out, input.episode, context.at, K, G);
    } else if (input.attention > 0) {
      const p = input.percept;
      const ep: Omit<Episode, 'id'> = {
        at: p.occurredAt,
        kind: p.kind,
        valence: p.valence ?? 0,
        salience: unit(p.salience * input.attention),
        summary: p.summary,
        tags: [],
      };
      for (const key of ['actorId', 'targetId', 'placeId', 'addressedSummary'] as const)
        if (p[key] !== undefined) ep[key] = p[key];
      encode(out, ep, context.at, K, G);
    }
    return output(out, context.at);
  },
  advance(state, context) {
    checked(state, context.allocations);
    const base = context.continuation;
    if (context.from < base.anchor.at || context.to < context.from)
      throw new RangeError('Memory clock rewound');
    const out = checked(base.state, context.allocations),
      K = context.effective.builtins.MEMORY_DEFAULTS,
      G = context.effective.builtins.GIST_DEFAULTS;
    const decay = (minutes: number) => {
      for (const [list, k] of [
        [out.episodes, K],
        [out.gists, G],
      ] as const)
        for (const e of list) {
          const half = k.halfLifeNeutral + (k.halfLifeEmotional - k.halfLifeNeutral) * Math.abs(e.valence);
          e.salience *= dexp((-Math.LN2 * minutes) / half);
        }
    };
    const horizon = G.horizon * 60000;
    let anchor = { ...base.anchor },
      folded = false;
    // An episode already past the horizon when the span starts (authored history older than the horizon)
    // folds at the span start, so the span still advances and the fold clock does not depend on chunking.
    const overdue = out.episodes.filter((e) => context.from - e.at > horizon);
    if (overdue.length) {
      decay((context.from - anchor.at) / 60000);
      for (const e of overdue) fold(out, e, context.from, G);
      out.episodes = out.episodes.filter((e) => !overdue.includes(e));
      anchor = { at: context.from, conditionId: `memory-fold:${context.from}` };
      folded = true;
    }
    const firstFold = out.episodes.reduce<number>((next, e) => Math.min(next, e.at + horizon + 1), Infinity);
    const through = Math.min(context.to, Math.max(context.from, firstFold));
    const settled = folded ? checked(out) : checked(base.state);
    decay((through - anchor.at) / 60000);
    // Fold on the first integer millisecond beyond the horizon, not an arbitrary caller endpoint.
    const due = out.episodes.filter((e) => through - e.at > horizon);
    for (const e of due) fold(out, e, through, G);
    out.episodes = out.episodes.filter((e) => !due.includes(e));
    const next = out.episodes.reduce<number | null>((n, e) => {
      const at = e.at + horizon + 1;
      return n === null ? at : Math.min(n, at);
    }, null);
    return {
      ...output(out, through),
      nextBoundary: next,
      continuation: due.length
        ? { anchor: { at: through, conditionId: `memory-fold:${through}` }, state: checked(out) }
        : { anchor, state: settled },
    };
  },
  receiveMaternalBirth(state, input, context) {
    if (input.mother !== context.person || input.at !== context.at)
      throw new RangeError('Maternal receipt mismatch');
    const out = checked(state, context.allocations);
    encode(
      out,
      {
        at: input.at,
        kind: 'birth',
        targetId: input.child.id,
        valence: input.valence,
        salience: input.salience,
        summary: renderProjection({ kind: 'maternal-birth' }),
        tags: ['birth'],
      },
      context.at,
      context.effective.builtins.MEMORY_DEFAULTS,
      context.effective.builtins.GIST_DEFAULTS,
    );
    return output(out, context.at);
  },
  receiveRetelling(state, input, context) {
    const out = checked(state, context.allocations),
      G = context.effective.builtins.GIST_DEFAULTS;
    if (input.speaker === context.person || input.reception.recipient !== context.person)
      throw new RangeError('Retelling recipient mismatch');
    if (input.reception.attention <= 0) return output(out, context.at);
    for (const item of input.items) {
      const src = item.gist;
      const salience = unit(src.salience * context.sourceTrust * RETELL_DEFAULTS.share);
      if (salience <= 0) continue;
      const mine = out.gists.find((x) => sameStory(x, src));
      if (mine && !mine.tags.includes('told')) continue;
      if (mine) {
        if (salience > mine.salience) {
          mine.salience = salience;
          mine.weight = salience;
          mine.lastAt = context.at;
        }
        continue;
      }
      if (!Number.isSafeInteger(out.nextGist + 1)) throw new RangeError('Gist counter exhausted');
      out.gists.push({
        ...cloneData(src),
        id: `g${out.nextGist++}`,
        at: context.at,
        firstAt: context.at,
        lastAt: context.at,
        count: 0,
        weight: salience,
        peak: salience,
        salience,
        tags: ['told', ...src.tags.filter((t) => t !== 'told')].slice(0, G.maxTags),
      } as Gist);
    }
    trim(out.gists, G.maxGists, G.maxProtectedLoss, context.at, Infinity);
    return output(out, context.at);
  },
};

/** Closed cue evidence. This receipt changes only this owner's memories; appraisal is returned. */
export function receiveMemoryCue(
  state: DeepReadonly<MemoryOwnedState>,
  cue: {
    placeId?: string;
    personId?: string;
    action?: string;
    tags?: readonly string[];
    deceased: readonly string[];
    emotionality: number;
    hour?: number;
  },
  context: DeepReadonly<import('../run-schema.ts').MemoryContext>,
): ReturnType<MemoryOwner['receiveCue']> {
  const s = checked(state, context.allocations),
    K = context.effective.builtins.CUE_RECALL_DEFAULTS,
    M = context.effective.builtins.MEMORY_DEFAULTS;
  const scored: { e: Episode; strength: number; score: number; isLoss: boolean; who?: string }[] = [];
  const hour = (at: number) => (((at % 86400000) + 86400000) % 86400000) / 3600000;
  for (const e of [...s.episodes, ...s.gists]) {
    if (
      e.at >= context.at ||
      Math.abs(e.valence) < K.minLossValence ||
      (e.recalledAt !== undefined && context.at - e.recalledAt < K.refractory * 60000)
    )
      continue;
    let strength = 0,
      specific = false;
    if (cue.placeId !== undefined && e.placeId === cue.placeId) {
      strength += K.weights.place;
      specific = true;
    }
    if (cue.personId !== undefined && (e.actorId === cue.personId || e.targetId === cue.personId)) {
      strength += K.weights.person;
      specific = true;
    }
    if (cue.action !== undefined && e.action === cue.action) {
      strength += K.weights.action;
      specific = true;
    }
    if (cue.tags?.length) {
      const hits = cue.tags.filter((t) => e.tags.includes(t)).length;
      if (hits) {
        strength += (K.weights.tags * hits) / cue.tags.length;
        specific = true;
      }
    }
    const tagged = e.action === 'death' || e.tags.some((t) => K.lossTags.includes(t)),
      days = Math.floor(context.at / 86400000) - Math.floor(e.at / 86400000);
    if (tagged && days > 0 && days % 365 === 0) {
      strength += K.weights.anniversary;
      specific = true;
    }
    if (!specific) continue;
    const dh = Math.abs((cue.hour ?? hour(context.at)) - hour(e.at));
    if (Math.min(dh, 24 - dh) <= K.hourTolerance) strength += K.weights.hour;
    const who =
      e.actorId && cue.deceased.includes(e.actorId)
        ? e.actorId
        : e.targetId && cue.deceased.includes(e.targetId)
          ? e.targetId
          : undefined;
    if (who !== undefined) strength += K.deceasedBoost;
    const isLoss = tagged || who !== undefined;
    if (!isLoss && Math.abs(e.valence) < K.minValence) continue;
    strength = Math.min(1, strength);
    const score = strength * e.salience;
    if (score < K.threshold) continue;
    scored.push({ e, strength, score, isLoss, ...(who === undefined ? {} : { who }) });
  }
  const result = output(s, context.at);
  const appraisals: import('../run-schema.ts').AppraisalEffect[] = [];
  const affectReceipts: import('../run-schema.ts').AffectEndpoint[] = [];
  const recalled: string[] = [];
  for (const hit of scored
    .sort((a, b) => b.score - a.score || Number(a.e.id.slice(1)) - Number(b.e.id.slice(1)))
    .slice(0, K.limit)) {
    if (hit.isLoss) hit.e.salience = unit(hit.e.salience + M.recallBoost * (1 - hit.e.salience));
    hit.e.recalledAt = context.at;
    const magnitude = Math.abs(hit.e.valence) * K.reappraisal * hit.strength,
      target = hit.who ?? hit.e.targetId,
      id = `recall:${context.causes[0] ?? context.at}:${hit.e.id}`;
    recalled.push(hit.e.id);
    if (hit.isLoss) {
      affectReceipts.push({
        kind: 'felt',
        id: 'grief',
        intensity: unit(magnitude * (K.griefGainBase + K.griefGainSlope * cue.emotionality)),
        cause: `recall:${hit.e.id}`,
        ...(target !== undefined && target !== context.person ? { targetId: target } : {}),
      });
      continue;
    }
    appraisals.push({
      id,
      cause: context.causes[0] ?? hit.e.id,
      person: context.person,
      at: context.at,
      applyPhase: 5,
      from: 'memory',
      to: 'affect',
      appraisal: {
        at: context.at,
        kind: 'event',
        desirability: hit.isLoss ? -magnitude : Math.sign(hit.e.valence) * magnitude,
        cause: `recall:${hit.e.id}`,
        ...(hit.isLoss ? { loss: true } : {}),
        ...(target !== undefined && target !== context.person ? { targetId: target } : {}),
      },
    });
  }
  result.effects = { terms: [], modifiers: [], appraisals };
  return { ...result, recalled, affectReceipts };
}

/** Pure learned expectation/gist projection used by cognition, with no recall reinforcement. */
export function expectedEffect(
  state: DeepReadonly<MemoryOwnedState>,
  offer: DeepReadonly<import('../run-schema.ts').Offer>,
  now: number,
  effective: import('../run-schema.ts').EffectiveParameters,
) {
  const K = effective.builtins.MEMORY_DEFAULTS,
    G = effective.builtins.GIST_DEFAULTS;
  const specific =
      offer.target === undefined
        ? undefined
        : state.expectations.find((x) => x.key === `${offer.actionId}@${offer.target}`),
    learned =
      specific && specific.samples > 0 ? specific : state.expectations.find((x) => x.key === offer.actionId);
  const samples = learned?.samples ?? 0,
    confidence = samples / (samples + K.confidenceK),
    needs: Partial<Record<import('../run-schema.ts').NeedId, number>> = {};
  for (const key of [
    ...new Set([...Object.keys(offer.expected.needs), ...Object.keys(learned?.needs ?? {})]),
  ].sort() as import('../run-schema.ts').NeedId[]) {
    const advertised = offer.expected.needs[key] ?? 0,
      value = learned?.needs[key];
    needs[key] = value === undefined ? advertised : advertised + (value - advertised) * confidence;
  }
  const recalled = state.episodes
    .filter(
      (e) =>
        e.action === offer.actionId &&
        (offer.target === undefined || e.targetId === offer.target) &&
        Math.abs(e.valence) > K.citeValence,
    )
    .map((e) => ({ e, weight: e.salience / (1 + Math.max(0, now - e.at) / (K.recencyScale * 60000)) }))
    .sort((a, b) => b.weight - a.weight || Number(a.e.id.slice(1)) - Number(b.e.id.slice(1)))
    .slice(0, K.maxCited)
    .map((x) => x.e.id);
  const gists = state.gists
    .map((g) => ({
      g,
      weight:
        g.salience *
        (g.action === offer.actionId && (offer.target === undefined || g.targetId === offer.target)
          ? 1
          : offer.place !== undefined && g.placeId === offer.place
            ? G.placeWeight
            : 0),
    }))
    .filter((x) => x.weight > 0)
    .sort((a, b) => b.weight - a.weight || Number(a.g.id.slice(1)) - Number(b.g.id.slice(1)));
  const weight = gists.reduce((s, x) => s + x.weight, 0),
    value = gists.reduce((s, x) => s + x.weight * x.g.valence, 0);
  if (!recalled.length && weight > 0 && Math.abs(value / weight) > K.citeValence)
    recalled.push(...gists.slice(0, K.maxCited).map((x) => x.g.id));
  return {
    needs,
    successRate: unit(K.priorSuccess + ((learned?.successRate ?? 0) - K.priorSuccess) * confidence),
    valence: signed((learned?.valence ?? 0) * confidence),
    samples,
    confidence,
    recalled,
    ...(weight > 0
      ? { gist: { valence: signed(value / weight), weight: unit(weight), ids: gists.map((x) => x.g.id) } }
      : {}),
  };
}

/** Shared W3 admission primitive. Reject non-JSON values, unsafe keys and cycles; never repair. */
export function validateNarrativeJson(value: unknown, path = ''): ValidationIssue[] {
  const issues: ValidationIssue[] = [],
    seen = new Set<object>();
  const walk = (x: unknown, p: string): void => {
    const fail = (message: string) => issues.push({ path: p, code: 'invalid-schema', message });
    if (x === null || typeof x === 'boolean') return;
    if (typeof x === 'number') {
      if (!Number.isFinite(x)) fail('Nonfinite number');
      return;
    }
    if (typeof x === 'string') {
      if (x.normalize('NFC') !== x) fail('Noncanonical string');
      return;
    }
    if (typeof x !== 'object') {
      fail('Expected JSON data');
      return;
    }
    if (seen.has(x)) {
      fail('Cyclic or aliased data');
      return;
    }
    seen.add(x);
    if (
      !Array.isArray(x) &&
      Object.getPrototypeOf(x) !== Object.prototype &&
      Object.getPrototypeOf(x) !== null
    ) {
      fail('Unexpected object prototype');
      return;
    }
    for (const key of Object.keys(x)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) fail('Reserved property key');
      walk((x as Record<string, unknown>)[key], p ? `${p}.${key}` : key);
    }
    seen.delete(x);
  };
  walk(value, path);
  return issues;
}
Object.freeze(MEMORY_DEFAULTS.kindSalience);
Object.freeze(MEMORY_DEFAULTS);
Object.freeze(GIST_DEFAULTS);
Object.freeze(RETELL_DEFAULTS);
Object.freeze(CUE_RECALL_DEFAULTS.weights);
Object.freeze(CUE_RECALL_DEFAULTS.lossTags);
Object.freeze(CUE_RECALL_DEFAULTS);

/** Actual outcome learning. Missing physical need deltas remain absent evidence;
 * the dispatcher supplies the source reservoir delta, never an advertised outcome.
 */
export function learnMemoryOutcome(
  state: DeepReadonly<MemoryOwnedState>,
  input: {
    offer: DeepReadonly<import('../run-schema.ts').Offer>;
    outcome: DeepReadonly<import('../run-schema.ts').ObservedOutcome>;
    realized: Partial<Record<import('../run-schema.ts').NeedId, number>>;
    felt: number;
  },
  context: DeepReadonly<import('../run-schema.ts').MemoryContext>,
): MemoryOwnedState {
  const s = checked(state, context.allocations),
    K = context.effective.builtins.MEMORY_DEFAULTS;
  if (input.outcome.status === 'interrupted') return s;
  const step = (mean: number, sample: number, n: number) =>
    mean + Math.max(-K.maxStep, Math.min(K.maxStep, (sample - mean) * Math.max(K.minLearningRate, 1 / n)));
  const touched = new Set([input.offer.actionId]);
  if (input.offer.target !== undefined) touched.add(`${input.offer.actionId}@${input.offer.target}`);
  const success =
    input.outcome.status === 'completed' &&
    (!input.offer.expected.voidsBladder || input.outcome.actual.voidedBladder === true);
  for (const key of touched) {
    let x = s.expectations.find((x) => x.key === key);
    if (!x) {
      x = {
        key,
        needs: { ...input.offer.expected.needs },
        successRate: K.priorSuccess,
        samples: 0,
        valence: 0,
      };
      s.expectations.push(x);
    }
    x.samples++;
    const keys = new Set([
      ...Object.keys(x.needs),
      ...Object.keys(input.offer.expected.needs),
      ...Object.keys(input.realized),
    ] as import('../run-schema.ts').NeedId[]);
    for (const need of keys)
      x.needs[need] = step(
        x.needs[need] ?? input.offer.expected.needs[need] ?? 0,
        input.realized[need] ?? 0,
        x.samples,
      );
    x.successRate = unit(step(x.successRate, success ? 1 : 0, x.samples));
    x.valence = signed(step(x.valence, signed(input.felt), x.samples));
  }
  while (s.expectations.length > K.maxExpectations) {
    const candidate = s.expectations
      .filter((x) => !touched.has(x.key))
      .sort((a, b) => a.samples - b.samples || (a.key < b.key ? -1 : 1))[0];
    if (!candidate) throw new RangeError('Expectation bound cannot retain touched actions');
    s.expectations.splice(s.expectations.indexOf(candidate), 1);
  }
  return s;
}

/** Closed-key check shared by W3 slice validators; absence never becomes a repaired default. */
export function validateNarrativeFields(
  value: unknown,
  allowed: readonly string[],
  required: readonly string[],
  path: string,
): ValidationIssue[] {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return [{ path, code: 'invalid-schema', message: 'Expected record' }];
  const keys = Object.keys(value),
    issues: ValidationIssue[] = [];
  for (const key of keys)
    if (!allowed.includes(key))
      issues.push({ path: `${path}.${key}`, code: 'invalid-schema', message: 'Unknown field' });
  for (const key of required)
    if (!Object.hasOwn(value, key))
      issues.push({ path: `${path}.${key}`, code: 'invalid-schema', message: 'Missing field' });
  return issues;
}
