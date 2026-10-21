/**
 * SCOPE: self-set, bounded pursuits from host-shown, attended prospects. Fit to temperament and
 * relaxed needs chooses one project; perceived progress or completed acts advances it; neglect drops
 * it. Shapes, not fitted values: Little's personal projects (1983), Locke & Latham's goal setting
 * (2002), autonomy/competence in Deci & Ryan and Ryan & Deci (2000), constructive play (Smilansky
 * 1968; Burghardt 2005), and interrupted-task resumption (Ovsiankina 1928). The resumption bonus
 * models a pull to continue, not a Zeigarnik memory advantage. See research/projects-and-persistence.md.
 * All thresholds and coefficients are engineering defaults. This owns only p.projects; agenda owns
 * goals. All kinds serve competence and leisure: making is chosen as a free-time pursuit, not duty.
 * No invented prospects, host task interpretation, world search, persistence, shielding, faith lens,
 * LLM or RNG. Without the slice, perception and minute bookkeeping write nothing.
 */
import { emotionLevel } from '../affect/index.ts';
import { AGENDA_DEFAULTS, abandonGoal, adoptGoal, perceiveProjectProgress } from '../agenda/index.ts';
import { clamp01, cmpStr, isNum, isObj, round } from '../core/index.ts';
import { curiosityOf } from '../curiosity/index.ts';
import { readPerson } from '../person.ts';
import type { Minute, Person, ProjectsSpec, ProjectsState, Prospect } from '../types.ts';
import { MAX_MINUTE, PHYSIOLOGICAL_NEEDS } from '../types.ts';

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
const KEYS = [
  'forgetMinutes',
  'calmUrgency',
  'fearBelow',
  'adoptEveryMinutes',
  'cooldownMinutes',
  'adoptAppeal',
  'halfLifeMinutes',
  'staleMinutes',
] as const;
function cleanSpec(input: unknown): ProjectsSpec {
  const out: ProjectsSpec = {};
  if (!isObj(input)) return out;
  for (const key of KEYS) {
    const x = input[key];
    const unit = key === 'calmUrgency' || key === 'fearBelow' || key === 'adoptAppeal';
    if (isNum(x) && x >= (unit ? 0 : 1) && x <= (unit ? 1 : 525600)) out[key] = x;
  }
  return out;
}
const setting = (s: ProjectsState, key: (typeof KEYS)[number]): number =>
  s.spec?.[key] ?? PROJECTS_DEFAULTS[key];
const str = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 512;
const unit = (x: unknown): x is number => isNum(x) && x >= 0 && x <= 1;
const minute = (x: unknown, now: number): x is number => isNum(x) && Math.abs(x) <= MAX_MINUTE && x <= now;
function cleanProspect(x: unknown): Prospect | undefined {
  if (
    !isObj(x) ||
    !str(x.id) ||
    !str(x.label) ||
    !['make', 'arrange', 'gather', 'finish'].includes(x.kind as string) ||
    (x.placeId !== undefined && !str(x.placeId)) ||
    (x.progress !== undefined && !unit(x.progress)) ||
    (x.materialIds !== undefined &&
      (!Array.isArray(x.materialIds) || x.materialIds.length > 8 || !x.materialIds.every(str)))
  )
    return undefined;
  const p: Prospect = { id: x.id, label: x.label, kind: x.kind as Prospect['kind'] };
  if (x.placeId !== undefined) p.placeId = x.placeId as string;
  if (x.progress !== undefined) p.progress = x.progress as number;
  if (x.materialIds !== undefined) p.materialIds = [...(x.materialIds as string[])];
  return p;
}

/** Enable or reconfigure without discarding retained prospects and history. */
export function enableProjects(p: Person, spec: ProjectsSpec = {}): ProjectsState {
  const state = p.projects ?? { prospects: [], history: [] };
  const clean = cleanSpec(spec);
  delete state.spec;
  if (Object.keys(clean).length) state.spec = clean;
  p.projects = state;
  return state;
}

function relaxed(p: Person): { urgency: number; fear: number; interest: number } {
  const needs = readPerson(p).needs;
  return {
    urgency: Math.max(
      0,
      ...needs
        .filter((n) => n.id === 'safety' || (PHYSIOLOGICAL_NEEDS as readonly string[]).includes(n.id))
        .map((n) => n.urgency),
    ),
    fear: emotionLevel(p, 'fear'),
    interest: Math.max(
      0,
      ...needs.filter((n) => ['leisure', 'competence', 'autonomy'].includes(n.id)).map((n) => n.urgency),
    ),
  };
}

/** Read-only, deterministic appeal. Thresholds close the relaxed gate before the bounded bonus. */
export function projectAppeal(p: Person, prospect: Prospect, now: Minute = p.now): number {
  const s = p.projects;
  if (
    !s ||
    !cleanProspect(prospect) ||
    prospect.progress === 1 ||
    p.body.asleep ||
    p.activity?.mode === 'sleep' ||
    !p.body.alive
  )
    return 0;
  const { urgency, fear, interest } = relaxed(p);
  if (urgency >= setting(s, 'calmUrgency') || fear >= setting(s, 'fearBelow')) return 0;
  const gate = (1 - urgency) * (1 - fear);
  const fit = 0.25 + 0.75 * (prospect.kind === 'finish' ? p.traits.conscientiousness : p.traits.openness);
  const resume = prospect.progress !== undefined && prospect.progress > 0 && prospect.progress < 1 ? 0.1 : 0;
  const bonus = p.curiosity
    ? 0.05 *
      clamp01(
        curiosityOf(
          p,
          {
            id: prospect.id,
            action: prospect.kind,
            label: prospect.label,
            duration: 1,
            effort: 0,
            advertises: {},
          },
          now,
        ).drive,
      )
    : 0;
  return round(clamp01(gate * (fit * (0.5 + 0.5 * interest) + resume + bonus)));
}

/** Record the adopted project's terminal state once, even after history eviction. @internal */
export function noteProjectStatus(p: Person, now: Minute): void {
  const s = p.projects;
  if (!s?.currentGoalId) return;
  const g = p.agenda.goals.find((g) => g.id === s.currentGoalId);
  if (!g?.project) {
    delete s.currentGoalId;
    return;
  }
  if (g.status === 'active') return;
  s.history.push({
    prospectId: g.project.prospectId,
    goalId: g.id,
    adoptedAt: g.adoptedAt,
    outcome: g.status,
    at: now,
  });
  if (g.status === 'abandoned') s.lastAbandonedAt = now;
  else {
    // Completed event-progress projects have no host progress reading: retain the known completion.
    const prospect = s.prospects.find((x) => x.id === g.project?.prospectId);
    if (prospect) prospect.progress = 1;
  }
  if (s.history.length > PROJECTS_DEFAULTS.maxHistory) s.history.shift();
  delete s.currentGoalId;
}

/** Only the composite calls this, after attention. Newest event minute wins; equal-minute input order wins. */
export function perceiveProspect(p: Person, input: Prospect, at: Minute): void {
  const s = p.projects;
  if (!s || !minute(at, p.now)) return;
  const prospect = cleanProspect(input);
  if (!prospect) return;
  const old = s.prospects.find((x) => x.id === prospect.id);
  if (old && old.lastSeenAt > at) return;
  if (p.now - at > setting(s, 'forgetMinutes')) return;
  const held = { ...prospect, lastSeenAt: at };
  if (old) s.prospects[s.prospects.indexOf(old)] = held;
  else {
    if (s.prospects.length >= PROJECTS_DEFAULTS.maxProspects) {
      let oldest = 0;
      for (const [i, entry] of s.prospects.entries())
        if (entry.lastSeenAt < (s.prospects[oldest]?.lastSeenAt ?? Infinity)) oldest = i;
      s.prospects.splice(oldest, 1);
    }
    s.prospects.push(held);
  }
  if (prospect.progress !== undefined) perceiveProjectProgress(p, prospect.id, prospect.progress, p.now);
  noteProjectStatus(p, p.now);
}

/** Called on each tick segment, including one-minute begin/tick/finish host loops. No RNG. */
export function considerProjects(p: Person, now: Minute): void {
  const s = p.projects;
  if (!s || !minute(now, p.now)) return;
  s.prospects = s.prospects.filter((x) => now - x.lastSeenAt <= setting(s, 'forgetMinutes'));
  for (const g of p.agenda.goals)
    if (
      g.project &&
      g.status === 'active' &&
      now - (g.lastAdvancedAt ?? g.adoptedAt) >= setting(s, 'staleMinutes')
    )
      abandonGoal(p, g.id);
  noteProjectStatus(p, now);
  const active = p.agenda.goals.filter((g) => g.status === 'active');
  if (
    active.some((g) => g.project) ||
    active.length >= AGENDA_DEFAULTS.maxActiveGoals ||
    p.agenda.commitments.some((c) => c.status === 'pending' && c.from <= now && c.until >= now) ||
    (s.lastAdoptedAt !== undefined && now - s.lastAdoptedAt < setting(s, 'adoptEveryMinutes')) ||
    (s.lastAbandonedAt !== undefined && now - s.lastAbandonedAt < setting(s, 'cooldownMinutes'))
  )
    return;
  const best = s.prospects
    .map((prospect) => ({ prospect, appeal: projectAppeal(p, prospect, now) }))
    .filter((x) => x.appeal > setting(s, 'adoptAppeal'))
    .sort((a, b) => b.appeal - a.appeal || cmpStr(a.prospect.id, b.prospect.id))[0];
  if (!best) return;
  const { prospect, appeal } = best;
  const g = adoptGoal(
    p,
    {
      label: prospect.label,
      serves: ['competence', 'leisure'],
      advancedBy: [],
      importance: Math.max(0.3, Math.min(0.7, appeal)),
      temporal: { halfLifeMinutes: setting(s, 'halfLifeMinutes') },
      project: { prospectId: prospect.id, perceivedProgress: prospect.progress !== undefined },
    },
    now,
  );
  if (prospect.progress !== undefined) perceiveProjectProgress(p, prospect.id, prospect.progress, now);
  s.lastAdoptedAt = now;
  s.currentGoalId = g.id;
}

/** Conservative restore: bounded fields, finite past timestamps, and no ambiguous duplicate ids. */
export function sanitizeProjects(input: unknown, now: Minute): ProjectsState | undefined {
  if (!isObj(input) || !Array.isArray(input.prospects) || !Array.isArray(input.history)) return undefined;
  const out: ProjectsState = { prospects: [], history: [] };
  if (input.spec !== undefined) {
    if (!isObj(input.spec)) return undefined;
    const spec = cleanSpec(input.spec);
    if (Object.keys(spec).length !== Object.keys(input.spec).length) return undefined;
    if (Object.keys(spec).length) out.spec = spec;
  }
  for (const key of ['lastAdoptedAt', 'lastAbandonedAt'] as const) {
    if (input[key] === undefined) continue;
    if (!minute(input[key], now)) return undefined;
    out[key] = input[key];
  }
  if (input.currentGoalId !== undefined) {
    if (!str(input.currentGoalId)) return undefined;
    out.currentGoalId = input.currentGoalId;
  }
  const seen = new Set<string>();
  for (const entry of input.prospects.slice(0, PROJECTS_DEFAULTS.maxProspects)) {
    const prospect = cleanProspect(entry);
    if (!prospect || !isObj(entry) || !minute(entry.lastSeenAt, now)) continue;
    if (seen.has(prospect.id)) return undefined;
    seen.add(prospect.id);
    if (now - entry.lastSeenAt <= setting(out, 'forgetMinutes'))
      out.prospects.push({ ...prospect, lastSeenAt: entry.lastSeenAt });
  }
  seen.clear();
  for (const h of input.history.slice(-PROJECTS_DEFAULTS.maxHistory)) {
    if (
      !isObj(h) ||
      !str(h.prospectId) ||
      !str(h.goalId) ||
      !minute(h.at, now) ||
      !minute(h.adoptedAt, h.at) ||
      (h.outcome !== 'achieved' && h.outcome !== 'abandoned')
    )
      continue;
    if (seen.has(h.goalId)) return undefined;
    seen.add(h.goalId);
    out.history.push({
      prospectId: h.prospectId,
      goalId: h.goalId,
      adoptedAt: h.adoptedAt,
      outcome: h.outcome,
      at: h.at,
    });
  }
  return out;
}
