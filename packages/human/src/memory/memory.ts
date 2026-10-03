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
  AppraisalEvent,
  EntityId,
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

// ---------------------------------------------------------------------------------------------
// Cue-triggered recall (N11)
// ---------------------------------------------------------------------------------------------

/** The situation that may bring a memory back unbidden. Every field is optional. */
export interface RecallCue {
  /** Minute of the cue; defaults to `p.now`. Used for the hour and for anniversaries. */
  at?: Minute;
  placeId?: EntityId;
  action?: string;
  /** A person present, addressed or mentioned. Matches an episode's actor or target. */
  personId?: EntityId;
  /** Hour of day 0..23; defaults to the hour of `at`. Only ever a supporting feature. */
  hour?: number;
  tags?: string[];
  /** At most this many episodes come back (default `CUE_RECALL_DEFAULTS.limit`). */
  limit?: number;
}

export interface CueRecall {
  /** Copies of the recalled episodes, strongest first. */
  episodes: Episode[];
  /** Their ids, for `Considered.recalled` / narration. */
  recalled: string[];
  /** Re-appraisal events at reduced intensity for non-loss memories; the composite passes each to `affect.appraise`. */
  appraisals: AppraisalEvent[];
  /**
   * Grief for loss memories, intensity already scaled (reduced, trait-scaled like appraisal gain). The composite
   * passes each to `affect.feel(p, 'grief', intensity, cause, at, targetId)`: `appraise` with `loss` would apply
   * its grief floor, which is meant for the death itself, not for a remembered one.
   */
  grief: { at: Minute; intensity: Unit; cause: string; targetId?: EntityId }[];
}

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

/** Deceased check inlined from `social.isDeceasedTie` (memory reads the social slice; it does not write it). */
function deceasedSet(p: Person): Set<string> {
  const out = new Set<string>();
  for (const r of p.social?.relationships ?? []) {
    if (r.deceasedAt !== undefined || r.roles.includes('deceased')) out.add(r.otherId);
  }
  return out;
}

const hourOfMinute = (m: Minute): number =>
  Math.floor((((m % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY) / 60);

/**
 * SCOPE (cue-triggered recall): involuntary autobiographical memory. A situation (place, person, action,
 * tags, time of day, the date) brings back an emotional episode when the overlap of its retrieval cues with
 * the episode × the episode's current salience crosses a threshold; the memory is then re-appraised at reduced
 * intensity. Ordinary memories must be strongly emotional (|valence| ≥ `minValence`) and do not gain salience by
 * intruding (no self-sustaining loop); loss memories come back from a lower floor and do gain salience. Episodes involving someone the person holds as
 * deceased, or tagged as a loss, re-appraise as loss (grief), including warm memories of them; the yearly
 * anniversary of a loss episode is itself a cue. Named shapes: encoding specificity (Tulving & Thomson 1973),
 * involuntary autobiographical memories triggered by situational cues (Berntsen 1996, 2009), and anniversary
 * reactions in bereavement. Each episode has a refractory period so one cue does not replay it every minute.
 * It does NOT model rumination, deliberate reminiscence, mood-congruent retrieval, memory distortion on
 * re-telling, or the softening of grief over years beyond salience decay; weights are engineering defaults.
 */
export function recallByCue(p: Person, cue: RecallCue): CueRecall {
  const D = CUE_RECALL_DEFAULTS;
  const W = D.weights;
  const at = cue.at ?? p.now;
  const hour = cue.hour ?? hourOfMinute(at);
  const dead = deceasedSet(p);
  const scored: { ep: Episode; strength: number; score: number; loss: boolean; who?: string }[] = [];
  for (const ep of p.memory.episodes) {
    if (ep.at >= at) continue;
    if (Math.abs(ep.valence) < D.minLossValence) continue;
    if (ep.recalledAt !== undefined && at - ep.recalledAt < D.refractory) continue;
    let strength = 0;
    let specific = false;
    if (cue.placeId !== undefined && ep.placeId === cue.placeId) {
      strength += W.place;
      specific = true;
    }
    if (cue.personId !== undefined && (ep.actorId === cue.personId || ep.targetId === cue.personId)) {
      strength += W.person;
      specific = true;
    }
    if (cue.action !== undefined && ep.action === cue.action) {
      strength += W.action;
      specific = true;
    }
    if (cue.tags && cue.tags.length > 0) {
      let hits = 0;
      for (const t of cue.tags) if (ep.tags.includes(t)) hits += 1;
      if (hits > 0) {
        strength += (W.tags * hits) / cue.tags.length;
        specific = true;
      }
    }
    const isLossTagged = ep.tags.some((t) => D.lossTags.includes(t)) || ep.action === 'death';
    const daysSince = Math.floor(at / MINUTES_PER_DAY) - Math.floor(ep.at / MINUTES_PER_DAY);
    if (isLossTagged && daysSince > 0 && daysSince % 365 === 0) {
      strength += W.anniversary;
      specific = true;
    }
    // Time of day only supports a cue that already matched something specific.
    if (!specific) continue;
    const epHour = hourOfMinute(ep.at);
    const dh = Math.min(Math.abs(epHour - hour), 24 - Math.abs(epHour - hour));
    if (dh <= D.hourTolerance) strength += W.hour;
    let who: string | undefined;
    if (ep.actorId !== undefined && dead.has(ep.actorId)) who = ep.actorId;
    else if (ep.targetId !== undefined && dead.has(ep.targetId)) who = ep.targetId;
    if (who !== undefined) strength += D.deceasedBoost;
    const loss = who !== undefined || isLossTagged;
    if (!loss && Math.abs(ep.valence) < D.minValence) continue;
    strength = Math.min(1, strength);
    const score = strength * ep.salience;
    if (score < D.threshold) continue;
    const entry: { ep: Episode; strength: number; score: number; loss: boolean; who?: string } = {
      ep,
      strength,
      score,
      loss,
    };
    if (who !== undefined) entry.who = who;
    scored.push(entry);
  }
  scored.sort((a, b) => b.score - a.score || byId(a.ep, b.ep));
  const picked = scored.slice(0, Math.max(0, cue.limit ?? D.limit));
  const appraisals: AppraisalEvent[] = [];
  const grief: CueRecall['grief'] = [];
  const gain = D.griefGainBase + D.griefGainSlope * clamp01(p.traits?.emotionality ?? 0.5);
  for (const s of picked) {
    // Only loss memories are strengthened by intruding; an ordinary memory coming back unbidden does not gain
    // salience, so a daily cue cannot keep a routine episode alive against decay.
    if (s.loss) s.ep.salience = clamp01(s.ep.salience + MEMORY_DEFAULTS.recallBoost * (1 - s.ep.salience));
    s.ep.recalledAt = at;
    const mag = Math.abs(s.ep.valence) * D.reappraisal * s.strength;
    const cause = `recall:${s.ep.id}`;
    const target = s.who ?? s.ep.targetId;
    if (s.loss) {
      // A warm memory of someone lost is felt as the loss, not as the old joy.
      const g: CueRecall['grief'][number] = { at, intensity: clamp01(mag * gain), cause };
      if (target !== undefined && target !== p.id) g.targetId = target;
      grief.push(g);
      continue;
    }
    const ev: AppraisalEvent = { at, kind: 'event', desirability: Math.sign(s.ep.valence) * mag, cause };
    if (target !== undefined && target !== p.id) ev.targetId = target;
    appraisals.push(ev);
  }
  return {
    episodes: picked.map((s) => ({ ...s.ep, tags: [...s.ep.tags] })),
    recalled: picked.map((s) => s.ep.id),
    appraisals,
    grief,
  };
}
