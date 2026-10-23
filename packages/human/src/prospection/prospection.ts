/**
 * SCOPE: retained current-action → successor claims, acquired through attended external
 * testimony or host-seeded prior knowledge. Knowledge is person-owned, source-labelled,
 * bounded and saved. Opt-in planning searches chains of retained claims, depth first in
 * stable source/id order, with total depth 2..5 and 64 feasible node expansions.
 * Shapes: depth limits and pruning (Huys et al. 2012; Keramati et al. 2016), resource-rational
 * planning (Callaway et al. 2022), quasi-hyperbolic present bias (Laibson 1997;
 * O'Donoghue and Rabin 1999); see research/curiosity-and-play.md §Planning.
 * Parameters are engineering bounds, not fitted psychological estimates.
 * Without planning, only one successor is considered. One coherent route contributes;
 * it never executes actions, grants consent or advances goals. Actual completed triggers
 * consume opportunities. This is not a general planner: it does not search the host's
 * world, infer procedures, execute plans or model another person's agency, future bodies
 * or waiting opportunity cost. Revision memory is bounded, not an audit.
 */
import { temporalGoalValue } from '../agenda/agenda.ts';
import { trustOf } from '../beliefs/index.ts';
import { cmpStr, isNum, isObj, round } from '../core/index.ts';
import { expectedEffect } from '../memory/index.ts';
import { diminishesProject } from '../projects/index.ts';
import type {
  Affordance,
  ConsequenceAction,
  ConsequenceRevision,
  Minute,
  Percept,
  Person,
  PlanningSpec,
  PlanningState,
  ProspectionState,
  ReceivedConsequence,
  RetainedConsequence,
  Term,
} from '../types.ts';
import { MAX_MINUTE, MINUTES_PER_DAY } from '../types.ts';

export const PROSPECTION_DEFAULTS = {
  maxEntries: 16,
  maxRevisions: 64,
  maxBatch: 4,
  maxIdentifierLength: 96,
  horizon: 7 * MINUTES_PER_DAY,
  maxMaterialCost: 1_000_000,
};
/** Validate the optional planning configuration. Malformed saved state is dropped. @internal */
export function sanitizePlanning(input: unknown): PlanningState | undefined {
  if (
    !isObj(input) ||
    !Number.isInteger(input.depth) ||
    !isNum(input.depth) ||
    input.depth < 2 ||
    input.depth > 5
  )
    return undefined;
  if (
    input.presentBias !== undefined &&
    (!isNum(input.presentBias) || input.presentBias <= 0 || input.presentBias > 1)
  )
    return undefined;
  return {
    depth: input.depth,
    ...(input.presentBias !== undefined ? { presentBias: input.presentBias } : {}),
  };
}

/** Enable bounded planning. Invalid configuration throws without changing the person. */
export function enablePlanning(p: Person, spec: PlanningSpec = {}): void {
  const state = sanitizePlanning({ ...spec, depth: spec.depth ?? 4 });
  if (!state) throw new RangeError('Planning requires depth 2..5 and presentBias in (0, 1]');
  p.planning = state;
}
const maxEntries = (planning: boolean) => (planning ? 64 : PROSPECTION_DEFAULTS.maxEntries);
const maxBatch = (p: Person) => (p.planning ? 16 : PROSPECTION_DEFAULTS.maxBatch);
const reliability = (p: Person, e: RetainedConsequence) =>
  e.channel === 'known' ? 1 : trustOf(p, e.sourceId);

const id = (x: unknown): x is string =>
  typeof x === 'string' &&
  x.length > 0 &&
  x.length <= PROSPECTION_DEFAULTS.maxIdentifierLength &&
  x !== '__proto__' &&
  x !== 'constructor' &&
  x !== 'prototype';
const minute = (x: unknown): x is number => isNum(x) && Math.abs(x) <= MAX_MINUTE;
const unit = (x: unknown): x is number => isNum(x) && x >= 0 && x <= 1;
const revision = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;
const identity = (a: { sourceId: string; id: string }, b: { sourceId: string; id: string }) =>
  a.sourceId === b.sourceId && a.id === b.id;
const order = (a: ConsequenceRevision, b: ConsequenceRevision) =>
  a.receivedAt - b.receivedAt || cmpStr(a.sourceId, b.sourceId) || cmpStr(a.id, b.id);
function action(x: unknown): ConsequenceAction | undefined {
  if (
    !isObj(x) ||
    !id(x.action) ||
    (x.targetId !== undefined && !id(x.targetId)) ||
    (x.placeId !== undefined && !id(x.placeId))
  )
    return undefined;
  return {
    action: x.action,
    ...(x.targetId !== undefined ? { targetId: x.targetId } : {}),
    ...(x.placeId !== undefined ? { placeId: x.placeId } : {}),
  };
}
function consequence(x: unknown, receivedAt: number): ReceivedConsequence | undefined {
  if (!isObj(x) || !id(x.id) || !revision(x.revision)) return undefined;
  const trigger = action(x.trigger);
  const successorAction = action(x.successor);
  const s = x.successor;
  if (
    !trigger ||
    !successorAction ||
    !isObj(s) ||
    !isNum(s.duration) ||
    s.duration < 0 ||
    s.duration > PROSPECTION_DEFAULTS.horizon ||
    !unit(s.effort) ||
    (s.advances !== undefined &&
      (!Array.isArray(s.advances) ||
        s.advances.length > 8 ||
        !s.advances.every((x) => typeof x === 'string' && x.length > 0 && x.length <= 512))) ||
    (s.diminishes !== undefined &&
      (!Array.isArray(s.diminishes) ||
        s.diminishes.length > 8 ||
        !s.diminishes.every((x) => typeof x === 'string' && x.length > 0 && x.length <= 512))) ||
    (s.focus !== undefined && !unit(s.focus)) ||
    (s.materialCost !== undefined &&
      (!isNum(s.materialCost) || s.materialCost < 0 || s.materialCost > PROSPECTION_DEFAULTS.maxMaterialCost))
  )
    return undefined;
  if (
    !minute(x.availableFrom) ||
    !minute(x.availableUntil) ||
    !minute(x.expiresAt) ||
    x.availableFrom > x.availableUntil ||
    x.availableUntil > x.expiresAt ||
    x.expiresAt < receivedAt ||
    x.expiresAt > receivedAt + PROSPECTION_DEFAULTS.horizon ||
    !unit(x.chance) ||
    !unit(x.confidence)
  )
    return undefined;
  return {
    id: x.id,
    revision: x.revision,
    trigger,
    successor: {
      ...successorAction,
      duration: s.duration,
      effort: s.effort,
      ...(s.advances !== undefined ? { advances: [...(s.advances as string[])] } : {}),
      ...(s.diminishes !== undefined ? { diminishes: [...(s.diminishes as string[])] } : {}),
      ...(s.focus !== undefined ? { focus: s.focus } : {}),
      ...(s.materialCost !== undefined ? { materialCost: s.materialCost } : {}),
    },
    availableFrom: x.availableFrom,
    availableUntil: x.availableUntil,
    expiresAt: x.expiresAt,
    chance: x.chance,
    confidence: x.confidence,
  };
}
function retained(x: unknown, now: number): RetainedConsequence | undefined {
  if (
    !isObj(x) ||
    !id(x.sourceId) ||
    (x.channel !== 'told' && x.channel !== 'known') ||
    !minute(x.receivedAt) ||
    x.receivedAt > now
  )
    return undefined;
  const c = consequence(x, x.receivedAt);
  if (
    !c ||
    (x.triggeredAt !== undefined &&
      (!minute(x.triggeredAt) || x.triggeredAt < x.receivedAt || x.triggeredAt > now))
  )
    return undefined;
  return {
    ...c,
    sourceId: x.sourceId,
    channel: x.channel,
    receivedAt: x.receivedAt,
    ...(x.triggeredAt !== undefined ? { triggeredAt: x.triggeredAt } : {}),
  };
}
function cleaned(state: ProspectionState, now: number): ProspectionState {
  const revisions = state.revisions.filter((r) => now - r.receivedAt <= PROSPECTION_DEFAULTS.horizon);
  return {
    entries: state.entries.filter(
      (e) => e.expiresAt >= now && revisions.some((r) => identity(r, e) && r.revision === e.revision),
    ),
    revisions,
  };
}
function store(p: Person, s: ProspectionState): void {
  if (s.entries.length || s.revisions.length) p.prospection = s;
  else delete p.prospection;
}
/** Expiry changes only existing optional state. @internal */
export function pruneConsequences(p: Person, now: Minute = p.now): void {
  if (p.prospection) store(p, cleaned(p.prospection, now));
}
/** Called only for an attended percept. Invalid combined batches mutate no prospection state. @internal */
export function receiveConsequences(p: Person, pc: Percept): boolean {
  if (pc.consequences === undefined && pc.withdrawConsequences === undefined) return false;
  if (
    pc.channel !== 'told' ||
    !id(pc.actorId) ||
    pc.actorId === p.id ||
    (pc.targetId !== undefined && pc.targetId !== p.id)
  )
    return false;
  return acceptConsequences(p, pc.actorId, pc.consequences ?? [], pc.withdrawConsequences ?? [], 'told');
}

/** Seed what the person already knows. Uses claim confidence/chance, without source trust or attention. */
export function seedConsequences(
  p: Person,
  sourceId: string,
  claims: readonly ReceivedConsequence[],
): boolean {
  if (!id(sourceId) || sourceId === p.id) return false;
  return acceptConsequences(p, sourceId, claims, [], 'known');
}

function acceptConsequences(
  p: Person,
  sourceId: string,
  adds: unknown,
  removes: unknown,
  channel: RetainedConsequence['channel'],
): boolean {
  if (
    !Array.isArray(adds) ||
    !Array.isArray(removes) ||
    adds.length + removes.length > maxBatch(p) ||
    adds.length + removes.length === 0
  )
    return false;
  const additions = adds.map((x) => consequence(x, p.now));
  if (
    additions.some((x) => x === undefined) ||
    removes.some((x) => !isObj(x) || !id(x.id) || !revision(x.revision))
  )
    return false;
  const withdrawals = removes as { id: string; revision: number }[];
  const batch = [...additions.map((x) => ({ id: x?.id, revision: x?.revision })), ...withdrawals];
  if (new Set(batch.map((x) => x.id)).size !== batch.length) return false;
  const state = cleaned(structuredClone(p.prospection ?? { entries: [], revisions: [] }), p.now);
  const updates = batch.filter(
    (b) =>
      !state.revisions.some(
        (r) => r.sourceId === sourceId && r.id === b.id && r.revision >= (b.revision ?? 0),
      ),
  );
  const newIds = updates.filter(
    (b) => !state.revisions.some((r) => r.sourceId === sourceId && r.id === b.id),
  );
  // Never evict a still-valid tombstone to admit a batch; dedup holds within the stated horizon.
  if (state.revisions.length + newIds.length > PROSPECTION_DEFAULTS.maxRevisions) return false;
  for (const b of updates) {
    state.entries = state.entries.filter((e) => !(e.sourceId === sourceId && e.id === b.id));
    state.revisions = state.revisions.filter((r) => !(r.sourceId === sourceId && r.id === b.id));
    const addition = additions.find((a) => a?.id === b.id);
    if (addition) state.entries.push({ ...addition, sourceId, channel, receivedAt: p.now });
    state.revisions.push({ sourceId, id: b.id as string, revision: b.revision as number, receivedAt: p.now });
  }
  if (state.entries.length > maxEntries(p.planning !== undefined)) {
    const oldest = [...state.entries]
      .sort(
        (a, b) => Number(b.triggeredAt !== undefined) - Number(a.triggeredAt !== undefined) || order(a, b),
      )
      .slice(0, state.entries.length - maxEntries(p.planning !== undefined));
    state.entries = state.entries.filter((e) => !oldest.includes(e));
  }
  store(p, state);
  return true;
}
const matches = (a: ConsequenceAction, b: ConsequenceAction): boolean =>
  a.action === b.action && a.targetId === b.targetId && a.placeId === b.placeId;
/** Own actual completed trigger consumes an opportunity, without predicting consent. @internal */
export function consumeConsequences(p: Person, completed: ConsequenceAction): void {
  for (const e of p.prospection?.entries ?? [])
    if (e.triggeredAt === undefined && matches(e.trigger, completed)) e.triggeredAt = p.now;
}
export interface ConsequenceEvidence {
  entry: RetainedConsequence;
  matches: boolean;
  feasible: boolean;
  successorStartsAt: Minute;
  successorEndsAt: Minute;
  accessProbability: number;
  terminalProbability: number;
}
/** Read current retained knowledge and feasibility. Does not mutate, prune or consume RNG. */
export function consequenceEvidence(
  p: Person,
  aff: Affordance,
  now: Minute = p.now,
): { entries: ConsequenceEvidence[]; revisions: ConsequenceRevision[] } {
  return {
    entries: (p.prospection?.entries ?? []).map((entry) => {
      const start = Math.max(now + Math.max(0, aff.duration), entry.availableFrom);
      const end = start + entry.successor.duration;
      const match = matches(entry.trigger, aff);
      const feasible =
        match &&
        entry.triggeredAt === undefined &&
        now <= entry.expiresAt &&
        end <= entry.availableUntil &&
        Number.isFinite(end);
      const accessProbability =
        expectedEffect(p, aff).successRate * entry.chance * entry.confidence * reliability(p, entry);
      return {
        entry: structuredClone(entry),
        matches: match,
        feasible,
        successorStartsAt: start,
        successorEndsAt: end,
        accessProbability,
        terminalProbability: accessProbability * expectedEffect(p, successorOffer(entry)).successRate,
      };
    }),
    revisions: structuredClone(
      (p.prospection?.revisions ?? []).filter((r) => now - r.receivedAt <= PROSPECTION_DEFAULTS.horizon),
    ),
  };
}
function successorOffer(e: RetainedConsequence): Affordance {
  const { materialCost, ...rest } = e.successor;
  return {
    ...rest,
    id: 'prospective-successor',
    label: 'Received successor',
    advertises: {},
    ...(materialCost !== undefined ? { material: -materialCost } : {}),
  };
}
/** One successor in a selected route. Times and access are unrounded estimates. */
export interface PlanStep {
  successor: ReceivedConsequence['successor'];
  start: Minute;
  end: Minute;
  access: number;
}
/** Plain JSON readout of the best whole route; goals are unscaled per-goal values. */
export interface PlanRoute {
  steps: PlanStep[];
  goals: Record<string, number>;
}

/** Select a whole route in the exact rounded units cognition emits. @internal */
export function receivedGoalRoute(
  p: Person,
  aff: Affordance,
  now: Minute,
  maturityScale: number,
  costs: (successor: Affordance) => number,
): { goals: Map<string, number>; cost: Term; route: PlanRoute } | undefined {
  const goals = p.agenda.goals.filter(
    (g) =>
      g.status === 'active' &&
      g.temporal !== undefined &&
      !(g.project && diminishesProject(p, aff, g.project.prospectId)),
  );
  if (!goals.length || !p.prospection?.entries.length) return undefined;
  const direct = goals.map((g) => temporalGoalValue(p, g, aff, now, now + Math.max(0, aff.duration)));
  const baseline = direct.reduce((sum, value) => sum + round(value * maturityScale), 0);
  let bestScore = baseline;
  let best: ReturnType<typeof receivedGoalRoute>;
  const entries = [...p.prospection.entries].sort(
    (a, b) => cmpStr(a.sourceId, b.sourceId) || cmpStr(a.id, b.id),
  );
  const beta = p.planning?.presentBias ?? 1;
  let remaining = p.planning ? 64 : Infinity;
  function visit(
    previous: Affordance,
    previousEnd: number,
    access: number,
    path: RetainedConsequence[],
    steps: PlanStep[],
    values: number[],
    accumulatedCost: number,
    done: readonly Affordance[],
  ): void {
    if (path.length >= (p.planning?.depth ?? 2) - 1 || remaining <= 0) return;
    for (const entry of entries) {
      if (remaining <= 0) return;
      // Completing an action consumes every open opportunity it triggers, so a
      // link whose trigger an earlier simulated step already performed is gone.
      if (
        path.includes(entry) ||
        !matches(entry.trigger, previous) ||
        done.some((a) => matches(entry.trigger, a)) ||
        entry.triggeredAt !== undefined ||
        now > entry.expiresAt
      )
        continue;
      const start = Math.max(previousEnd, entry.availableFrom);
      const end = start + entry.successor.duration;
      if (!Number.isFinite(end) || end > entry.availableUntil) continue;
      remaining -= 1;
      const nextAccess =
        access *
        expectedEffect(p, previous).successRate *
        entry.chance *
        entry.confidence *
        reliability(p, entry);
      const successor = successorOffer(entry);
      const nextValues = goals.map((g, i) => {
        const prospectId = g.project?.prospectId;
        return prospectId && [...done, previous, successor].some((a) => diminishesProject(p, a, prospectId))
          ? 0
          : Math.max(values[i] ?? 0, nextAccess * beta * temporalGoalValue(p, g, successor, now, end));
      });
      const nextCost = accumulatedCost + beta * nextAccess * Math.min(0, costs(successor));
      const cost = round(nextCost);
      const total = nextValues.reduce((sum, value) => sum + round(value * maturityScale), 0) + cost;
      const nextPath = [...path, entry];
      const nextSteps = [
        ...steps,
        { successor: structuredClone(entry.successor), start, end, access: nextAccess },
      ];
      if (round(total - bestScore) > 0) {
        bestScore = total;
        // Keep the original root's source string; the ref explains longer routes.
        const root = nextPath[0] as RetainedConsequence;
        best = {
          goals: new Map(goals.map((g, i) => [g.id, nextValues[i] ?? 0])),
          cost: {
            source: `prospection:cost:${root.sourceId}:${root.id}`,
            value: cost,
            ...(nextPath.length > 1 ? { ref: nextPath.map((e) => e.id).join('>') } : {}),
          },
          route: {
            steps: nextSteps,
            goals: Object.fromEntries(goals.map((g, i) => [g.id, nextValues[i] ?? 0])),
          },
        };
      }
      visit(successor, end, nextAccess, nextPath, nextSteps, nextValues, nextCost, [...done, previous]);
    }
  }
  visit(aff, now + Math.max(0, aff.duration), 1, [], [], direct, 0, []);
  return best;
}
/** Conservative optional-slice restore; ambiguous identities drop the slice. @internal */
export function sanitizeProspection(
  input: unknown,
  now: Minute,
  personId: string,
  planning = false,
): ProspectionState | undefined {
  if (
    !isObj(input) ||
    !Array.isArray(input.entries) ||
    !Array.isArray(input.revisions) ||
    input.entries.length > maxEntries(planning) ||
    input.revisions.length > PROSPECTION_DEFAULTS.maxRevisions
  )
    return undefined;
  const entries = input.entries.map((x) => retained(x, now)).filter((e) => e?.sourceId !== personId);
  const revisions: ConsequenceRevision[] = [];
  for (const r of input.revisions) {
    if (
      !isObj(r) ||
      !id(r.sourceId) ||
      r.sourceId === personId ||
      !id(r.id) ||
      !revision(r.revision) ||
      !minute(r.receivedAt) ||
      r.receivedAt > now
    )
      continue;
    const validated: ConsequenceRevision = {
      sourceId: r.sourceId,
      id: r.id,
      revision: r.revision,
      receivedAt: r.receivedAt,
    };
    if (revisions.some((old) => identity(old, validated))) return undefined;
    revisions.push(validated);
  }
  const valid: RetainedConsequence[] = [];
  for (const e of entries) {
    if (!e) continue;
    if (valid.some((old) => identity(old, e))) return undefined;
    if (revisions.some((r) => identity(r, e) && r.revision === e.revision && r.receivedAt === e.receivedAt))
      valid.push(e);
  }
  const state = cleaned({ entries: valid, revisions }, now);
  return state.entries.length || state.revisions.length ? state : undefined;
}
