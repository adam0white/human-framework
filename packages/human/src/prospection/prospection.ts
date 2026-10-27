/** SCOPE: one always-present bounded route from attended, source-labelled consequence claims.
 * No action execution, world facts, old planning selector or legacy restoration. */

import { temporalGoalValue } from '../agenda/agenda.ts';
import { trustOf } from '../beliefs/beliefs.ts';
import { cmpStr, round } from '../core/index.ts';
import * as memoryModule from '../memory/memory.ts';
import { projectDiminishes } from '../projects/projects.ts';
import type {
  ActorState,
  EffectiveParameters,
  FrameContext,
  Offer,
  ReceivedConsequence,
  RetainedConsequence,
  TermData,
} from '../run-schema.ts';

const MINUTES_PER_DAY = 1440;
export const PROSPECTION_DEFAULTS = {
  maxEntries: 16,
  maxRevisions: 64,
  maxBatch: 4,
  maxIdentifierLength: 96,
  horizon: 7 * MINUTES_PER_DAY,
  maxMaterialCost: 1_000_000,
};
/** HF4: always-present retained consequences; reception never consults world facts. */
export const prospectionOwner: import('../run-schema.ts').ProspectionOwner = {
  initialize() {
    return { entries: [], revisions: [] };
  },
  initializePlanning(context) {
    return { depth: context.effective.planning.depth, presentBias: context.effective.planning.presentBias };
  },
  receive(previous, input, context) {
    const d = context.effective.builtins.PROSPECTION_DEFAULTS;
    const state = structuredClone(previous) as import('../run-schema.ts').ProspectionState;
    state.revisions = state.revisions.filter((r) => context.at - r.receivedAt <= d.horizon * 60000);
    state.entries = state.entries.filter(
      (e) =>
        e.expiresAt >= context.at &&
        state.revisions.some((r) => r.sourceId === e.sourceId && r.id === e.id && r.revision === e.revision),
    );
    if (input.kind === 'completed-trigger') {
      if (input.outcome.status === 'completed')
        for (const entry of state.entries)
          if (
            entry.triggeredAt === undefined &&
            entry.trigger.action === input.activity.offer.actionId &&
            entry.trigger.targetId === input.activity.offer.target &&
            entry.trigger.placeId === input.activity.offer.place
          )
            entry.triggeredAt = context.at;
    } else {
      const sourceId = input.data.sourceId;
      const batch = [...input.data.claims, ...input.data.withdrawals];
      const updates = batch.filter(
        (c) =>
          !state.revisions.some((r) => r.sourceId === sourceId && r.id === c.id && r.revision >= c.revision),
      );
      const newIds = updates.filter(
        (c) => !state.revisions.some((r) => r.sourceId === sourceId && r.id === c.id),
      );
      if (new Set(updates.map((c) => c.id)).size !== updates.length)
        throw new RangeError('Duplicate consequence in received batch');
      if (state.revisions.length + newIds.length > d.maxRevisions)
        throw new RangeError('Consequence revision capacity exceeded');
      for (const c of updates) {
        state.entries = state.entries.filter((e) => !(e.sourceId === sourceId && e.id === c.id));
        state.revisions = state.revisions.filter((r) => !(r.sourceId === sourceId && r.id === c.id));
        const addition = input.data.claims.find((claim) => claim.id === c.id);
        if (addition)
          state.entries.push({
            ...structuredClone(addition),
            sourceId,
            channel: input.kind === 'authored' ? 'known' : 'told',
            receivedAt: context.at,
          } as import('../run-schema.ts').RetainedConsequence);
        state.revisions.push({ sourceId, id: c.id, revision: c.revision, receivedAt: context.at });
      }
      // The all-on planning capacity is the source planning branch's 64 entries.
      if (state.entries.length > 64) {
        state.entries.sort(
          (a, b) =>
            Number(a.triggeredAt !== undefined) - Number(b.triggeredAt !== undefined) ||
            b.receivedAt - a.receivedAt ||
            cmpStr(a.sourceId, b.sourceId) ||
            cmpStr(a.id, b.id),
        );
        state.entries = state.entries.slice(0, 64);
      }
    }
    return {
      state,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: context.at,
    };
  },
  validate(state) {
    const issues: import('../run-schema.ts').ValidationIssue[] = [];
    const fail = (path: string) =>
      issues.push({ path, code: 'invalid-schema', message: 'Invalid retained consequence' });
    if (
      state.entries.length > 64 ||
      state.revisions.length > PROSPECTION_DEFAULTS.maxRevisions ||
      new Set(state.entries.map((e) => JSON.stringify([e.sourceId, e.id]))).size !== state.entries.length ||
      new Set(state.revisions.map((e) => JSON.stringify([e.sourceId, e.id]))).size !== state.revisions.length
    )
      fail('prospection');
    for (const [i, e] of state.entries.entries()) {
      if (
        !Number.isSafeInteger(e.receivedAt) ||
        !Number.isSafeInteger(e.availableFrom) ||
        !Number.isSafeInteger(e.availableUntil) ||
        !Number.isSafeInteger(e.expiresAt) ||
        e.availableUntil < e.availableFrom ||
        e.expiresAt < e.receivedAt ||
        !Number.isSafeInteger(e.successor.durationMs) ||
        e.successor.durationMs <= 0 ||
        !Number.isFinite(e.chance) ||
        e.chance < 0 ||
        e.chance > 1 ||
        !Number.isFinite(e.confidence) ||
        e.confidence < 0 ||
        e.confidence > 1 ||
        !state.revisions.some((r) => r.id === e.id && r.sourceId === e.sourceId && r.revision === e.revision)
      )
        fail(`prospection.entries.${i}`);
    }
    for (const r of state.revisions)
      if (
        !r.id ||
        !r.sourceId ||
        !Number.isSafeInteger(r.revision) ||
        r.revision < 0 ||
        !Number.isSafeInteger(r.receivedAt)
      )
        fail('prospection.revisions');
    return issues;
  },
};

export type PlanStep = {
  successor: ReceivedConsequence['successor'];
  start: number;
  end: number;
  access: number;
};
export type PlanRoute = { steps: PlanStep[]; goals: Record<string, number> };
export function successorOffer(entry: RetainedConsequence, person: string): Offer {
  const next = entry.successor;
  return {
    id: 'prospective-successor',
    actionId: next.action,
    label: 'received-successor',
    person,
    durationMs: next.durationMs,
    ...(next.targetId !== undefined ? { target: next.targetId } : {}),
    ...(next.placeId !== undefined ? { place: next.placeId } : {}),
    participants: [],
    alongside: [],
    demands: { effort: next.effort, focus: next.focus ?? 0, mode: 'awake', requires: {} },
    tags: [],
    norms: [],
    expected: {
      needs: {},
      followedBy: [],
      provenance: [entry.sourceId],
      ...(next.materialCost !== undefined ? { material: -next.materialCost } : {}),
    },
    fulfills: [],
    advances: [...(next.advances ?? [])],
    diminishes: [...(next.diminishes ?? [])],
  };
}
/** Whole-route selection uses the same rounded goal values as actual cognition. */
export function receivedGoalRoute(
  p: ActorState & { effective: EffectiveParameters },
  offer: Offer,
  now: number,
  maturityScale: number,
  costs: (successor: Offer) => number,
  frame: FrameContext,
): { goals: Map<string, number>; cost: TermData; route: PlanRoute } | undefined {
  const goals = p.agenda.goals.filter(
    (g) =>
      g.status === 'active' && !(g.project && projectDiminishes(p.projects, offer, g.project.prospectId)),
  );
  if (!goals.length || !p.prospection.entries.length) return undefined;
  const expected = (offer: Offer) => memoryModule.memoryOwner.expectedEffect(p.memory, offer, frame);
  const direct = goals.map((g) =>
    temporalGoalValue(p, g, offer, now, now + offer.durationMs, expected(offer).successRate),
  );
  let bestScore = direct.reduce((sum, value) => sum + round(value * maturityScale), 0),
    best: ReturnType<typeof receivedGoalRoute>;
  const entries = [...p.prospection.entries].sort(
    (a, b) => cmpStr(a.sourceId, b.sourceId) || cmpStr(a.id, b.id),
  );
  let remaining = 64;
  const beta = p.planning.presentBias;
  const matches = (entry: RetainedConsequence, offer: Offer) =>
    entry.trigger.action === offer.actionId &&
    entry.trigger.targetId === offer.target &&
    entry.trigger.placeId === offer.place;
  const visit = (
    previous: Offer,
    previousEnd: number,
    access: number,
    path: RetainedConsequence[],
    steps: PlanStep[],
    values: number[],
    accumulatedCost: number,
    done: readonly Offer[],
  ): void => {
    if (path.length >= p.planning.depth - 1 || remaining <= 0) return;
    for (const entry of entries) {
      if (remaining <= 0) return;
      if (
        path.includes(entry) ||
        !matches(entry, previous) ||
        done.some((offer) => matches(entry, offer)) ||
        entry.triggeredAt !== undefined ||
        now > entry.expiresAt
      )
        continue;
      const start = Math.max(previousEnd, entry.availableFrom),
        end = start + entry.successor.durationMs;
      if (!Number.isSafeInteger(end) || end > entry.availableUntil) continue;
      remaining--;
      const reliability = entry.channel === 'known' ? 1 : trustOf(p, entry.sourceId);
      const nextAccess =
        access * expected(previous).successRate * entry.chance * entry.confidence * reliability;
      const successor = successorOffer(entry, p.id);
      const nextValues = goals.map((g, i) => {
        const prospectId = g.project?.prospectId;
        return prospectId &&
          [...done, previous, successor].some((offer) => projectDiminishes(p.projects, offer, prospectId))
          ? 0
          : Math.max(
              values[i] ?? 0,
              nextAccess *
                beta *
                temporalGoalValue(p, g, successor, now, end, expected(successor).successRate),
            );
      });
      const nextCost = accumulatedCost + beta * nextAccess * Math.min(0, costs(successor)),
        cost = round(nextCost);
      const total = nextValues.reduce((sum, value) => sum + round(value * maturityScale), 0) + cost,
        nextPath = [...path, entry],
        nextSteps = [
          ...steps,
          { successor: structuredClone(entry.successor), start, end, access: nextAccess },
        ];
      if (round(total - bestScore) > 0) {
        bestScore = total;
        const root = nextPath[0];
        if (!root) throw new RangeError('Missing route root');
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
  };
  visit(offer, now + offer.durationMs, 1, [], [], direct, 0, []);
  return best;
}
