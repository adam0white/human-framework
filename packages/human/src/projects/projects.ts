/** SCOPE: HF4 always-present owner. Source equations use immutable run parameters; no legacy continuation. */
import { clamp01, cmpStr, round } from '../core/index.ts';
export const PROJECTS_DEFAULTS = {
  maxProspects: 8,
  maxHistory: 8,
  forgetMinutes: 1440,
  calmUrgency: 0.35,
  fearBelow: 0.35,
  adoptEveryMinutes: 30,
  cooldownMinutes: 60,
  adoptAppeal: 0.3,
  halfLifeMinutes: 120,
  staleMinutes: 180,
} as const;

/** HF4: project changes cross to agenda only as closed receipts. */
export const projectsOwner: import('../run-schema.ts').ProjectsOwner = {
  initialize() {
    return { prospects: [], history: [], contributions: [], setbacks: [] };
  },
  receive(previous, input, context) {
    const state = structuredClone(previous) as import('../run-schema.ts').ProjectsState;
    const agendaReceipts: import('../run-schema.ts').ProjectAgendaReceipt[] = [];
    const d = context.effective.builtins.PROJECTS_DEFAULTS;
    const observe = (
      prospect: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').Prospect>,
      at: number,
      evidenceId: string,
      own: boolean,
    ) => {
      if (at > context.at || context.at - at > d.forgetMinutes * 60000) return;
      const old = state.prospects.find((p) => p.id === prospect.id);
      if (old && old.lastSeenAt > at) return;
      const pending = state.pendingAct;
      if (prospect.progress !== undefined && pending && at >= pending.at) {
        const before = pending.readings.find((r) => r.prospectId === prospect.id);
        if (before && own && at - pending.at <= 300000)
          for (const g of context.goals.filter(
            (g) => g.status === 'active' && g.project?.prospectId === prospect.id,
          )) {
            const amount = Math.max(
                0,
                prospect.progress - Math.max(g.project?.peak ?? g.progress, g.progress),
              ),
              id = `${pending.completedReceipt}:project:${g.id}`;
            if (amount > 0 && !state.contributions.some((c) => c.id === id))
              state.contributions.push({
                id,
                goalId: g.id,
                prospectId: prospect.id,
                actionReceipt: pending.completedReceipt,
                at: context.at,
                amount,
                basis: 'completed-action',
              });
          }

        if (before && own && at - pending.at <= 300000 && prospect.progress < before.progress) {
          const setback = {
            prospectId: prospect.id,
            action: pending.action,
            ...(pending.targetId !== undefined ? { targetId: pending.targetId } : {}),
            ...(pending.placeId !== undefined ? { placeId: pending.placeId } : {}),
          };
          if (
            !state.setbacks.some(
              (s) =>
                s.prospectId === setback.prospectId &&
                s.action === setback.action &&
                s.targetId === setback.targetId &&
                s.placeId === setback.placeId,
            )
          )
            state.setbacks.push(setback);
          state.setbacks = state.setbacks.slice(-16);
        }
        pending.readings = pending.readings.filter((r) => r.prospectId !== prospect.id);
        if (!pending.readings.length || at - pending.at > 300000) delete state.pendingAct;
      }
      const held = {
        ...structuredClone(prospect),
        lastSeenAt: at,
      } as import('../run-schema.ts').ProjectsState['prospects'][number];
      if (old) state.prospects[state.prospects.indexOf(old)] = held;
      else {
        if (state.prospects.length >= d.maxProspects) {
          let oldest = 0;
          for (let i = 1; i < state.prospects.length; i++)
            if ((state.prospects[i]?.lastSeenAt ?? 0) < (state.prospects[oldest]?.lastSeenAt ?? 0))
              oldest = i;
          state.prospects.splice(oldest, 1);
        }
        state.prospects.push(held);
      }
      if (prospect.progress !== undefined)
        agendaReceipts.push({
          kind: 'project-progress',
          evidenceId,
          prospectId: prospect.id,
          progress: prospect.progress,
          ownContribution: own,
        });
    };
    if (input.kind === 'attended') {
      if (input.percept.prospect)
        observe(
          input.percept.prospect,
          input.percept.occurredAt,
          input.percept.id,
          (input.percept.channel === 'saw' || input.percept.channel === 'outcome') &&
            (input.percept.actorId === undefined || input.percept.actorId === context.person),
        );
    } else {
      delete state.pendingAct;
      const { activity, outcome } = input,
        offer = activity.offer;
      if (outcome.status === 'completed') {
        const readings = state.prospects
          .filter(
            (p) =>
              p.progress !== undefined &&
              context.goals.some((g) => g.status === 'active' && g.project?.prospectId === p.id),
          )
          .map((p) => ({ prospectId: p.id, progress: p.progress as number, evidenceId: outcome.evidenceId }));
        if (readings.length)
          state.pendingAct = {
            action: offer.actionId,
            at: context.at,
            completedReceipt: outcome.evidenceId,
            readings,
            ...(offer.target !== undefined ? { targetId: offer.target } : {}),
            ...(offer.place !== undefined ? { placeId: offer.place } : {}),
          };
        for (const reading of outcome.actual.observedProgress) {
          const prospect = state.prospects.find((p) => p.id === reading.prospectId);
          if (prospect)
            observe({ ...prospect, progress: reading.progress }, outcome.end, reading.evidenceId, true);
          for (const goal of context.goals.filter(
            (g) => g.status === 'active' && g.project?.prospectId === reading.prospectId,
          )) {
            const amount = Math.max(
              0,
              reading.progress - Math.max(goal.project?.peak ?? goal.progress, goal.progress),
            );
            const id = `${outcome.evidenceId}:project:${goal.id}`;
            if (amount > 0 && !state.contributions.some((c) => c.id === id))
              state.contributions.push({
                id,
                goalId: goal.id,
                prospectId: reading.prospectId,
                actionReceipt: outcome.evidenceId,
                at: context.at,
                amount,
                basis: 'completed-action',
              });
          }
        }
      }
    }
    return {
      state,
      agendaReceipts,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: context.at,
    };
  },
  consider(previous, context) {
    const state = structuredClone(previous) as import('../run-schema.ts').ProjectsState;
    const agendaReceipts: import('../run-schema.ts').ProjectAgendaReceipt[] = [];
    const d = context.effective.builtins.PROJECTS_DEFAULTS;
    state.prospects = state.prospects.filter((p) => context.at - p.lastSeenAt <= d.forgetMinutes * 60000);
    const record = (
      g: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').Goal>,
      outcome: 'achieved' | 'abandoned',
    ) => {
      if (!g.project || state.history.some((h) => h.goalId === g.id)) return;
      state.history.push({
        prospectId: g.project.prospectId,
        goalId: g.id,
        adoptedAt: g.adoptedAt,
        outcome,
        at: context.at,
      });
      state.history = state.history.slice(-d.maxHistory);
      if (outcome === 'abandoned') state.lastAbandonedAt = context.at;
      else {
        const prospect = state.prospects.find((p) => p.id === g.project?.prospectId);
        if (prospect) prospect.progress = 1;
      }
      if (state.currentGoalId === g.id) delete state.currentGoalId;
    };
    const abandoned = new Set<string>();
    for (const g of context.goals)
      if (g.project) {
        if (g.status !== 'active') {
          if (
            state.currentGoalId === g.id ||
            (state.currentGoalId === undefined && g.adoptedAt === state.lastAdoptedAt)
          )
            record(g, g.status);
        } else if (context.at - g.lastAdvancedAt >= d.staleMinutes * 60000) {
          agendaReceipts.push({
            kind: 'project-abandon',
            evidenceId: `project-stale:${g.id}:${context.at}`,
            goalId: g.id,
          });
          abandoned.add(g.id);
          record(g, 'abandoned');
        }
      }
    const active = context.goals.filter((g) => g.status === 'active' && !abandoned.has(g.id));
    const existing = active.find((g) => g.project);
    if (existing) state.currentGoalId = existing.id;
    const allowed =
      !existing &&
      active.length < context.effective.builtins.AGENDA_DEFAULTS.maxActiveGoals &&
      !context.commitments.some(
        (c) => c.status === 'pending' && c.from <= context.at && c.until >= context.at,
      ) &&
      (state.lastAdoptedAt === undefined ||
        context.at - state.lastAdoptedAt >= d.adoptEveryMinutes * 60000) &&
      (state.lastAbandonedAt === undefined ||
        context.at - state.lastAbandonedAt >= d.cooldownMinutes * 60000);
    if (allowed) {
      let urgency = 0,
        interest = 0;
      for (const n of context.needs) {
        if (['safety', 'food', 'water', 'sleep', 'rest', 'relief'].includes(n.id))
          urgency = Math.max(urgency, n.urgency);
        if (['leisure', 'competence', 'autonomy'].includes(n.id)) interest = Math.max(interest, n.urgency);
      }
      const fear = clamp01(
        context.affect.emotions.filter((e) => e.id === 'fear').reduce((sum, e) => sum + e.intensity, 0),
      );
      const best = state.prospects
        .map((prospect) => {
          const fit =
            0.25 +
            0.75 * (prospect.kind === 'finish' ? context.traits.conscientiousness : context.traits.openness);
          const resume =
            prospect.progress !== undefined && prospect.progress > 0 && prospect.progress < 1 ? 0.1 : 0;
          // The same pre-outcome drive used by curiosity, including the life factor, is supplied below.
          const curiosityDrive =
            (1 - clamp01(urgency)) *
            (1 - fear) *
            (0.25 + 0.75 * context.traits.openness) *
            (1.25 - 0.5 * context.life.maturity);
          const appeal =
            prospect.progress === 1 ||
            !context.alive ||
            context.asleep ||
            context.activity?.offer.demands.mode === 'sleep' ||
            urgency >= d.calmUrgency ||
            fear >= d.fearBelow
              ? 0
              : round(
                  clamp01(
                    (1 - urgency) *
                      (1 - fear) *
                      (fit * (0.5 + 0.5 * interest) + resume + 0.05 * clamp01(curiosityDrive)),
                  ),
                );
          return { prospect, appeal };
        })
        .filter((c) => c.appeal > d.adoptAppeal)
        .sort((a, b) => b.appeal - a.appeal || cmpStr(a.prospect.id, b.prospect.id))[0];
      if (best) {
        const { prospect, appeal } = best,
          importance = Math.max(0.3, Math.min(0.7, appeal));
        agendaReceipts.push({
          kind: 'project-adopt',
          evidenceId: `project-proposal:${prospect.id}:${context.at}`,
          goal: {
            id: `project-proposal:${prospect.id}:${context.at}`,
            label: prospect.label,
            serves: ['competence', 'leisure'],
            advancedBy: [],
            importance,
            baseImportance: importance,
            progress: prospect.progress ?? 0,
            completionHalfLifeMs: d.halfLifeMinutes * 60000,
            project: {
              prospectId: prospect.id,
              ...(prospect.progress !== undefined ? { peak: prospect.progress } : {}),
            },
          },
        });
        state.lastAdoptedAt = context.at;
        state.currentGoalId = `project-proposal:${prospect.id}:${context.at}`;
      }
    }
    return {
      state,
      agendaReceipts,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: context.at,
    };
  },
  validate(state) {
    const issues: import('../run-schema.ts').ValidationIssue[] = [];
    const fail = (path: string) =>
      issues.push({ path, code: 'invalid-schema', message: 'Invalid project state' });
    if (
      state.prospects.length > PROJECTS_DEFAULTS.maxProspects ||
      state.history.length > PROJECTS_DEFAULTS.maxHistory ||
      state.setbacks.length > 16 ||
      new Set(state.prospects.map((p) => p.id)).size !== state.prospects.length ||
      new Set(state.contributions.map((c) => c.id)).size !== state.contributions.length
    )
      fail('projects');
    for (const p of state.prospects)
      if (
        !p.id ||
        !p.label ||
        !['make', 'arrange', 'gather', 'finish'].includes(p.kind) ||
        !Number.isSafeInteger(p.lastSeenAt) ||
        (p.progress !== undefined && (!Number.isFinite(p.progress) || p.progress < 0 || p.progress > 1))
      )
        fail('projects.prospects');
    for (const c of state.contributions)
      if (
        !c.id ||
        !c.goalId ||
        !c.prospectId ||
        !c.actionReceipt ||
        !Number.isSafeInteger(c.at) ||
        !Number.isFinite(c.amount) ||
        c.amount <= 0 ||
        c.basis !== 'completed-action'
      )
        fail('projects.contributions');
    return issues;
  },
  validatePortable(state, goals, allocated) {
    const issues = [...projectsOwner.validate(state)];
    for (const c of state.contributions)
      if (
        !goals.some((g) => g.id === c.goalId) ||
        !allocated.some((r) => r.kind === 'goal' && r.id === c.goalId) ||
        !allocated.some((r) => r.kind === 'receipt' && r.id === c.actionReceipt)
      )
        issues.push({
          path: 'projects.contributions',
          code: 'unknown-id',
          message: 'Unmapped project contribution',
        });
    if (state.currentGoalId !== undefined && !goals.some((g) => g.id === state.currentGoalId))
      issues.push({ path: 'projects.currentGoalId', code: 'unknown-id', message: 'Unknown project goal' });
    return issues;
  },
};

export function projectDiminishes(
  state: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').ProjectsState>,
  offer: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').Offer>,
  prospectId: string,
): boolean {
  return (
    offer.diminishes.includes(prospectId) ||
    state.setbacks.some(
      (s) =>
        s.prospectId === prospectId &&
        s.action === offer.actionId &&
        s.targetId === offer.target &&
        s.placeId === offer.place,
    )
  );
}
