/**
 * SCOPE: episodic memory and learned action expectations. Episodes carry a salience that decays
 * exponentially (Ebbinghaus-style forgetting curve, modelled as a single exponential per episode) with a
 * half-life that lengthens for emotionally strong episodes (emotional-enhancement of memory), and recall
 * slightly raises the salience of what is retrieved (testing effect). Expectations are cached action
 * values learned by a delta rule (prediction-error learning, Rescorla-Wagner shape) with a minimum
 * learning rate and a clamped step, blended with the host's advertisement by sample-based confidence.
 * It does NOT model reconsolidation, false memory, interference between similar episodes, sleep-dependent
 * consolidation, semantic abstraction, or model-based planning; parameters are engineering defaults for
 * game time scales, not calibrated estimates.
 */
import { clamp, clamp01, clampSigned, decay, lerp, runningMean } from '../core/index.ts';
import type {
  ActionExpectation,
  Affordance,
  Episode,
  MemoryState,
  Minute,
  NeedId,
  Outcome,
  Person,
  Signed,
  Unit,
} from '../types.ts';
import { MINUTES_PER_DAY } from '../types.ts';

export const MEMORY_DEFAULTS = {
  maxEpisodes: 200,
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

export interface MemoryQuery {
  action?: string;
  actorId?: string;
  targetId?: string;
  placeId?: string;
  tags?: string[];
  limit?: number;
}

export interface ExpectedEffect {
  needs: Partial<Record<NeedId, number>>;
  successRate: Unit;
  valence: Signed;
  samples: number;
  confidence: Unit;
  recalled: string[];
}

export function createMemory(): MemoryState {
  return { episodes: [], beliefs: [], expectations: [], sourceTrust: {}, nextEpisode: 0 };
}

const idNum = (id: string): number => Number(id.slice(1)) || 0;
const byId = (a: Episode, b: Episode): number => idNum(a.id) - idNum(b.id);

function recency(now: Minute, at: Minute): number {
  return 1 / (1 + Math.max(0, now - at) / MEMORY_DEFAULTS.recencyScale);
}

function defaultSalience(kind: string, valence: Signed): Unit {
  const base = MEMORY_DEFAULTS.kindSalience[kind] ?? MEMORY_DEFAULTS.defaultKindSalience;
  return clamp01(base + MEMORY_DEFAULTS.valenceSalience * Math.abs(valence));
}

/** Encode an episode. Evicts the weakest (salience × recency) episode beyond the bound. */
export function remember(p: Person, e: Omit<Episode, 'id' | 'salience'> & { salience?: Unit }): Episode {
  const mem = p.memory;
  const valence = clampSigned(e.valence);
  const episode: Episode = {
    ...e,
    id: `e${mem.nextEpisode}`,
    valence,
    salience: clamp01(e.salience ?? defaultSalience(e.kind, valence)),
    tags: [...e.tags],
  };
  mem.nextEpisode += 1;
  mem.episodes.push(episode);
  while (mem.episodes.length > MEMORY_DEFAULTS.maxEpisodes) {
    let worst = 0;
    let worstScore = Number.POSITIVE_INFINITY;
    for (let i = 0; i < mem.episodes.length; i++) {
      const ep = mem.episodes[i] as Episode;
      const score = ep.salience * recency(p.now, ep.at);
      // Ties evict the older episode (lower id number) — iteration order is insertion order.
      if (score < worstScore) {
        worstScore = score;
        worst = i;
      }
    }
    mem.episodes.splice(worst, 1);
  }
  return episode;
}

function matchScore(ep: Episode, q: MemoryQuery): number {
  let criteria = 0;
  let matched = 0;
  const exact: (keyof MemoryQuery & keyof Episode)[] = ['action', 'actorId', 'targetId', 'placeId'];
  for (const k of exact) {
    if (q[k] === undefined) continue;
    criteria += 1;
    if (ep[k] === q[k]) matched += 1;
  }
  if (q.tags && q.tags.length > 0) {
    criteria += 1;
    let hits = 0;
    for (const t of q.tags) if (ep.tags.includes(t)) hits += 1;
    matched += hits / q.tags.length;
  }
  return criteria === 0 ? 1 : matched / criteria;
}

/** Retrieve episodes by cue overlap × salience × recency. Retrieved episodes gain a little salience. */
export function recall(p: Person, q: MemoryQuery): Episode[] {
  const limit = q.limit ?? MEMORY_DEFAULTS.defaultRecallLimit;
  const scored: { ep: Episode; score: number }[] = [];
  for (const ep of p.memory.episodes) {
    const m = matchScore(ep, q);
    if (m <= 0) continue;
    scored.push({ ep, score: m * ep.salience * recency(p.now, ep.at) });
  }
  scored.sort((a, b) => b.score - a.score || byId(a.ep, b.ep));
  const out = scored.slice(0, Math.max(0, limit)).map((s) => s.ep);
  for (const ep of out) ep.salience = clamp01(ep.salience + MEMORY_DEFAULTS.recallBoost * (1 - ep.salience));
  return out;
}

/** Exponential salience decay over dt minutes; emotional episodes fade more slowly. Exact for any dt. */
export function advanceMemory(p: Person, dt: number): void {
  if (dt <= 0) return;
  for (const ep of p.memory.episodes) {
    const halfLife = lerp(
      MEMORY_DEFAULTS.halfLifeNeutral,
      MEMORY_DEFAULTS.halfLifeEmotional,
      Math.abs(ep.valence),
    );
    ep.salience = decay(ep.salience, dt, halfLife);
  }
}

export function expectationKey(aff: Pick<Affordance, 'action' | 'targetId'>): string {
  return aff.targetId === undefined ? aff.action : `${aff.action}@${aff.targetId}`;
}

function findExpectation(p: Person, key: string): ActionExpectation | undefined {
  return p.memory.expectations.find((x) => x.key === key);
}

/**
 * Citable episodes grouped by action, rebuilt whenever membership could have changed (length or newest id; episodes
 * are only ever appended or removed). A derived read-only index, never saved: it only spares the per-option
 * scan of the whole list. Scores are still computed live from each episode.
 */
const actionIndex = new WeakMap<Episode[], { key: string; byAction: Map<string, Episode[]> }>();
function episodesByAction(p: Person, action: string): Episode[] {
  const list = p.memory.episodes;
  const key = `${list.length}|${list.at(-1)?.id ?? ''}`;
  let entry = actionIndex.get(list);
  if (!entry || entry.key !== key) {
    const byAction = new Map<string, Episode[]>();
    for (const ep of list) {
      // Episode valence is fixed at creation, so the citation filter can be applied once here.
      if (Math.abs(ep.valence) <= MEMORY_DEFAULTS.citeValence) continue;
      const group = byAction.get(ep.action ?? '');
      if (group) group.push(ep);
      else byAction.set(ep.action ?? '', [ep]);
    }
    entry = { key, byAction };
    actionIndex.set(list, entry);
  }
  return entry.byAction.get(action) ?? [];
}

/** Read-only: salient emotional episodes about this action (and target if given). Does not boost salience. */
function citedEpisodes(p: Person, aff: Affordance): string[] {
  const hits: { ep: Episode; score: number }[] = [];
  for (const ep of episodesByAction(p, aff.action)) {
    if (aff.targetId !== undefined && ep.targetId !== aff.targetId) continue;
    hits.push({ ep, score: ep.salience * recency(p.now, ep.at) });
  }
  if (hits.length === 0) return [];
  hits.sort((a, b) => b.score - a.score || byId(a.ep, b.ep));
  return hits.slice(0, MEMORY_DEFAULTS.maxCited).map((h) => h.ep.id);
}

/**
 * Believed effect of an affordance: the advertisement blended with the learned expectation (target-specific
 * first, then action-wide) by confidence = samples / (samples + k). Pure; safe to call per decision pass.
 */
export function expectedEffect(p: Person, aff: Affordance): ExpectedEffect {
  const specific = aff.targetId === undefined ? undefined : findExpectation(p, expectationKey(aff));
  const learned =
    specific && specific.samples > 0 ? specific : findExpectation(p, expectationKey({ action: aff.action }));
  const samples = learned?.samples ?? 0;
  const confidence = samples / (samples + MEMORY_DEFAULTS.confidenceK);
  const needs: Partial<Record<NeedId, number>> = {};
  const keys = new Set<NeedId>([
    ...(Object.keys(aff.advertises) as NeedId[]),
    ...(learned ? (Object.keys(learned.needs) as NeedId[]) : []),
  ]);
  for (const k of [...keys].sort()) {
    const adv = aff.advertises[k] ?? 0;
    const lv = learned?.needs[k];
    needs[k] = lv === undefined ? adv : lerp(adv, lv, confidence);
  }
  return {
    needs,
    successRate: clamp01(lerp(MEMORY_DEFAULTS.priorSuccess, learned?.successRate ?? 0, confidence)),
    valence: clampSigned(lerp(0, learned?.valence ?? 0, confidence)),
    samples,
    confidence,
    recalled: citedEpisodes(p, aff),
  };
}

function step(mean: number, sample: number, n: number): number {
  const target = runningMean(mean, sample, n, MEMORY_DEFAULTS.minLearningRate);
  const max = MEMORY_DEFAULTS.maxStep;
  return mean + clamp(target - mean, -max, max);
}

function updateExpectation(
  p: Person,
  key: string,
  aff: Affordance,
  success: boolean,
  realized: Partial<Record<NeedId, number>>,
  felt: Signed,
): void {
  let x = findExpectation(p, key);
  if (!x) {
    // Start at the advertisement so the first outcome deviates from it by a clamped step.
    x = {
      key,
      needs: { ...aff.advertises },
      successRate: MEMORY_DEFAULTS.priorSuccess,
      samples: 0,
      valence: 0,
    };
    p.memory.expectations.push(x);
  }
  x.samples += 1;
  const n = x.samples;
  const keys = new Set<NeedId>([
    ...(Object.keys(x.needs) as NeedId[]),
    ...(Object.keys(aff.advertises) as NeedId[]),
    ...(Object.keys(realized) as NeedId[]),
  ]);
  for (const k of keys) {
    const prior = x.needs[k] ?? aff.advertises[k] ?? 0;
    x.needs[k] = step(prior, realized[k] ?? 0, n);
  }
  x.successRate = clamp01(step(x.successRate, success ? 1 : 0, n));
  x.valence = clampSigned(step(x.valence, clampSigned(felt), n));
}

/**
 * Prediction-error update of the expectations for both 'action' and 'action@target'. Interrupted outcomes
 * are ignored (partial deltas are not evidence about the full activity).
 */
export function learnOutcome(
  p: Person,
  aff: Affordance,
  outcome: Outcome,
  realized: Partial<Record<NeedId, number>>,
  felt: Signed,
): void {
  if (outcome.status === 'interrupted') return;
  const success = outcome.status === 'completed';
  const touched = new Set<string>([expectationKey({ action: aff.action })]);
  if (aff.targetId !== undefined) touched.add(expectationKey(aff));
  for (const key of touched) updateExpectation(p, key, aff, success, realized, felt);
  const list = p.memory.expectations;
  while (list.length > MEMORY_DEFAULTS.maxExpectations) {
    let worst = -1;
    for (let i = 0; i < list.length; i++) {
      const x = list[i] as ActionExpectation;
      if (touched.has(x.key)) continue;
      const w = worst < 0 ? undefined : (list[worst] as ActionExpectation);
      if (!w || x.samples < w.samples || (x.samples === w.samples && x.key < w.key)) worst = i;
    }
    if (worst < 0) break;
    list.splice(worst, 1);
  }
}
