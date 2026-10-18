/**
 * SCOPE: one received current-action → successor consequence, acquired only through
 * attended testimony. Knowledge is person-owned, source-labelled, bounded and saved.
 * Temporal goals value expected completion using time, success and source reliability.
 * One coherent route may contribute; it never executes actions, grants consent or
 * advances a goal. Own completed triggers consume their received opportunity.
 * This is not graph search, inferred procedure learning or a model of future bodies,
 * waiting opportunity cost or another person's agency. Parameters are engineering
 * bounds, not fitted psychological estimates. Revision memory is bounded, not an audit.
 */
import { temporalGoalValue } from '../agenda/agenda.ts';
import { trustOf } from '../beliefs/index.ts';
import { cmpStr, isNum, isObj, round } from '../core/index.ts';
import { expectedEffect } from '../memory/index.ts';
import type {
  Affordance,
  ConsequenceAction,
  ConsequenceRevision,
  Minute,
  Percept,
  Person,
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
  if (!isObj(x) || !id(x.sourceId) || x.channel !== 'told' || !minute(x.receivedAt) || x.receivedAt > now)
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
    channel: 'told',
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
  if (pc.channel !== 'told' || !id(pc.actorId)) return false;
  const adds: unknown = pc.consequences ?? [];
  const removes: unknown = pc.withdrawConsequences ?? [];
  if (
    !Array.isArray(adds) ||
    !Array.isArray(removes) ||
    adds.length + removes.length > PROSPECTION_DEFAULTS.maxBatch ||
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
  const sourceId = pc.actorId;
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
    if (addition) state.entries.push({ ...addition, sourceId, channel: 'told', receivedAt: p.now });
    state.revisions.push({ id: b.id as string, sourceId, revision: b.revision as number, receivedAt: p.now });
  }
  if (state.entries.length > PROSPECTION_DEFAULTS.maxEntries) {
    const oldest = [...state.entries]
      .sort(order)
      .slice(0, state.entries.length - PROSPECTION_DEFAULTS.maxEntries);
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
        expectedEffect(p, aff).successRate * entry.chance * entry.confidence * trustOf(p, entry.sourceId);
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
/** Select a whole route in the exact rounded units cognition emits. @internal */
export function receivedGoalRoute(
  p: Person,
  aff: Affordance,
  now: Minute,
  maturityScale: number,
  costs: (successor: Affordance) => number,
): { goals: Map<string, number>; cost: Term } | undefined {
  const goals = p.agenda.goals.filter((g) => g.status === 'active' && g.temporal !== undefined);
  if (!goals.length || !p.prospection?.entries.length) return undefined;
  const direct = goals.map((g) => temporalGoalValue(p, g, aff, now, now + Math.max(0, aff.duration)));
  const baseline = direct.reduce((sum, value) => sum + round(value * maturityScale), 0);
  let bestScore = baseline;
  let best: { goals: Map<string, number>; cost: Term } | undefined;
  const entries = consequenceEvidence(p, aff, now).entries.sort(
    (a, b) => cmpStr(a.entry.sourceId, b.entry.sourceId) || cmpStr(a.entry.id, b.entry.id),
  );
  for (const e of entries) {
    if (!e.feasible) continue;
    const successor = successorOffer(e.entry);
    const values = goals.map((g, i) =>
      Math.max(
        direct[i] ?? 0,
        e.accessProbability * temporalGoalValue(p, g, successor, now, e.successorEndsAt),
      ),
    );
    const cost = round(e.accessProbability * Math.min(0, costs(successor)));
    const total = values.reduce((sum, value) => sum + round(value * maturityScale), 0) + cost;
    if (!(round(total - bestScore) > 0)) continue;
    bestScore = total;
    best = {
      goals: new Map(goals.map((g, i) => [g.id, values[i] ?? 0])),
      cost: { source: `prospection:cost:${e.entry.sourceId}:${e.entry.id}`, value: cost },
    };
  }
  return best;
}
/** Conservative optional-slice restore; ambiguous identities drop the slice. @internal */
export function sanitizeProspection(input: unknown, now: Minute): ProspectionState | undefined {
  if (
    !isObj(input) ||
    !Array.isArray(input.entries) ||
    !Array.isArray(input.revisions) ||
    input.entries.length > PROSPECTION_DEFAULTS.maxEntries ||
    input.revisions.length > PROSPECTION_DEFAULTS.maxRevisions
  )
    return undefined;
  const entries = input.entries.map((x) => retained(x, now));
  const revisions: ConsequenceRevision[] = [];
  for (const r of input.revisions) {
    if (
      !isObj(r) ||
      !id(r.sourceId) ||
      !id(r.id) ||
      !revision(r.revision) ||
      !minute(r.receivedAt) ||
      r.receivedAt > now
    )
      continue;
    if (revisions.some((old) => identity(old, r as unknown as ConsequenceRevision))) return undefined;
    revisions.push({ sourceId: r.sourceId, id: r.id, revision: r.revision, receivedAt: r.receivedAt });
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
