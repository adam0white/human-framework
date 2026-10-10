/**
 * SCOPE: bounded acquisition of conditional action methods from attended examples.
 * A learner must have received every categorical cue in an explained conjunction.
 * Successful and unsuccessful demonstrations become person-owned evidence; the
 * same reader supplies host queries and ordinary cognition terms. Unknown cues
 * do not mean false. Context identity prevents one task's observations being used
 * for another task. Contradictory examples weaken support without choosing a
 * privileged correct answer. Attention, source trust and recency grade evidence.
 * These are explicit engineering choices, not fitted human learning parameters.
 * This module does not infer cues, invent actions, plan sequences, certify skill,
 * access host truth, compute religious worth, or guarantee that a person obeys.
 */
import { trustOf } from '../beliefs/index.ts';
import { clamp01, cmpStr, decay, isNum, isObj } from '../core/index.ts';
import type { MethodCue, MethodRule, MethodsState, Person, Term } from '../types.ts';
import { MAX_MINUTE, MINUTES_PER_DAY } from '../types.ts';

export const METHOD_DEFAULTS = {
  maxRules: 24,
  maxConditions: 8,
  maxCues: 24,
  maxEvidence: 16,
  maxRecentDemonstrations: 256,
  maxIdentifierLength: 96,
  maxValueLength: 128,
  contextMinutes: 120,
  evidenceHalfLife: 180 * MINUTES_PER_DAY,
  /** Two fully attended ordinary examples raise support to 0.5 before source trust. */
  evidencePrior: 2,
  utilityScale: 1.2,
};

export interface MethodDemonstration {
  /** Name of the explained method; action/conditions distinguish its variants. */
  id: string;
  /** Stable event id: repeats within the retained 256-example horizon cannot strengthen it. */
  demonstrationId: string;
  contextId: string;
  conditions: readonly MethodCue[];
  action: string;
  sourceId: string;
  outcome: 'success' | 'failure';
  /** Attended fraction of this example, 0..1; zero acquires nothing. */
  attention?: number;
}

export interface MethodEvidence {
  /** Net matching evidence for this action, -1..1; conflicts reduce it. */
  support: number;
  terms: Term[];
  matched: { id: string; action: string; sourceId: string; support: number }[];
}

const validId = (x: unknown): x is string =>
  typeof x === 'string' &&
  x.length > 0 &&
  x.length <= METHOD_DEFAULTS.maxIdentifierLength &&
  x !== '__proto__' &&
  x !== 'constructor' &&
  x !== 'prototype';
const validValue = (x: unknown): x is string =>
  typeof x === 'string' && x.length > 0 && x.length <= METHOD_DEFAULTS.maxValueLength;
const validMinute = (x: unknown): x is number => isNum(x) && Math.abs(x) <= MAX_MINUTE;

function cleanCues(input: unknown, maximum: number): MethodCue[] | undefined {
  if (!Array.isArray(input) || input.length === 0 || input.length > maximum) return undefined;
  const out: MethodCue[] = [];
  for (const c of input) {
    if (!isObj(c) || !validId(c.cue) || !validValue(c.value)) return undefined;
    // Ambiguous duplicate observations do not silently choose the last value.
    if (out.some((v) => v.cue === c.cue)) return undefined;
    out.push({ cue: c.cue, value: c.value });
  }
  return out.sort((a, b) => cmpStr(a.cue, b.cue));
}

function available(p: Person): boolean {
  return p.body.alive && !p.body.asleep && !p.body.downed;
}

/** Replace current received observations. This is an explicit host reception event, not host truth. */
export function receiveMethodCues(
  p: Person,
  received: { contextId: string; cues: readonly MethodCue[] },
): boolean {
  const cues = cleanCues(received.cues, METHOD_DEFAULTS.maxCues);
  // Bad/new unreadable input must not leave stale cues available.
  clearMethodContext(p);
  if (!available(p) || !validId(received.contextId) || !cues) return false;
  p.methods ??= { rules: [], recentDemonstrations: [] };
  p.methods.context = { id: received.contextId, at: p.now, cues };
  return true;
}

/** Drop current observations while retaining learned methods. Call when leaving/switching a task. */
export function clearMethodContext(p: Person): void {
  if (p.methods) delete p.methods.context;
}

function matches(conditions: readonly MethodCue[], cues: readonly MethodCue[]): boolean {
  return conditions.every((c) => cues.some((v) => v.cue === c.cue && v.value === c.value));
}

function currentContext(p: Person, id: string) {
  const context = p.methods?.context;
  if (
    !available(p) ||
    !context ||
    context.id !== id ||
    p.now < context.at ||
    p.now - context.at > METHOD_DEFAULTS.contextMinutes
  )
    return undefined;
  return context;
}

/** Acquire one explained step only when its learner actually received the matching observations. */
export function demonstrateMethod(p: Person, example: MethodDemonstration): boolean {
  const conditions = cleanCues(example.conditions, METHOD_DEFAULTS.maxConditions);
  const context = currentContext(p, example.contextId);
  const attention = example.attention === undefined ? 1 : example.attention;
  if (
    !context ||
    !conditions ||
    !validId(example.id) ||
    !validId(example.action) ||
    !validId(example.sourceId) ||
    !validId(example.demonstrationId) ||
    (example.outcome !== 'success' && example.outcome !== 'failure') ||
    !isNum(attention) ||
    attention <= 0 ||
    attention > 1 ||
    !matches(conditions, context.cues)
  )
    return false;
  const state = p.methods;
  if (!state) return false;
  if (
    state.recentDemonstrations.includes(example.demonstrationId) ||
    state.rules.some((r) => r.evidence.some((e) => e.id === example.demonstrationId))
  )
    return false;
  state.recentDemonstrations.push(example.demonstrationId);
  if (state.recentDemonstrations.length > METHOD_DEFAULTS.maxRecentDemonstrations)
    state.recentDemonstrations.shift();
  let rule = state.rules.find(
    (r) => r.action === example.action && JSON.stringify(r.conditions) === JSON.stringify(conditions),
  );
  if (!rule) {
    rule = { id: example.id, action: example.action, conditions, evidence: [] };
    state.rules.push(rule);
    if (state.rules.length > METHOD_DEFAULTS.maxRules) state.rules.shift();
  }
  rule.evidence.push({
    id: example.demonstrationId,
    sourceId: example.sourceId,
    at: p.now,
    attention: clamp01(attention),
    outcome: example.outcome,
  });
  if (rule.evidence.length > METHOD_DEFAULTS.maxEvidence) rule.evidence.shift();
  return true;
}

/** Read acquired evidence only. No draw, state mutation, hidden fault access or fixed action policy. */
export function methodEvidence(p: Person, action: string, contextId: string): MethodEvidence {
  const result: MethodEvidence = { support: 0, terms: [], matched: [] };
  const context = currentContext(p, contextId);
  if (!context) return result;
  const rules = p.methods?.rules ?? [];
  for (const rule of rules) {
    if (!matches(rule.conditions, context.cues)) continue;
    const sources = [...new Set(rule.evidence.map((e) => e.sourceId))].sort(cmpStr);
    for (const sourceId of sources) {
      let positive = 0;
      let negative = 0;
      for (const e of rule.evidence) {
        if (e.sourceId !== sourceId || e.at > p.now) continue;
        const weight = decay(e.attention, p.now - e.at, METHOD_DEFAULTS.evidenceHalfLife);
        if (e.outcome === 'success') positive += weight;
        else negative += weight;
      }
      const voice = p.will.voices.find((v) => v.voiceId === sourceId);
      const receivedTrust = voice?.trust ?? trustOf(p, sourceId);
      const trust = isNum(receivedTrust) ? clamp01(receivedTrust) : 0.5;
      const support = (trust * (positive - negative)) / (positive + negative + METHOD_DEFAULTS.evidencePrior);
      result.matched.push({ id: rule.id, action: rule.action, sourceId, support });
    }
  }
  // Comparable alternative actions reduce confidence; they never become a hidden answer override.
  const strengths = new Map<string, number>();
  for (const match of result.matched)
    strengths.set(match.action, (strengths.get(match.action) ?? 0) + match.support);
  const own = strengths.get(action) ?? 0;
  const rival = Math.max(0, ...[...strengths].filter(([a]) => a !== action).map(([, v]) => v));
  const total = Math.max(1, ...[...strengths.values()].map((v) => Math.abs(v)));
  const net = own > 0 ? Math.max(0, own - rival) : own;
  result.support = Math.max(-1, Math.min(1, net / total));
  const scale = own === 0 ? 0 : result.support / own;
  for (const match of result.matched) {
    if (match.action !== action || match.support === 0) continue;
    result.terms.push({
      source: `method:${match.id}:${match.sourceId}`,
      value: METHOD_DEFAULTS.utilityScale * match.support * scale,
    });
  }
  return result;
}

/** @internal Strict bounded restore; no unrecognized fields survive. */
export function sanitizeMethods(input: unknown): MethodsState | undefined {
  if (!isObj(input) || !Array.isArray(input.rules)) return undefined;
  const rules: MethodRule[] = [];
  const seen = new Set<string>();
  for (const row of input.rules.slice(-METHOD_DEFAULTS.maxRules)) {
    if (!isObj(row) || !validId(row.id) || !validId(row.action) || !Array.isArray(row.evidence)) continue;
    const conditions = cleanCues(row.conditions, METHOD_DEFAULTS.maxConditions);
    if (!conditions) continue;
    const evidence: MethodRule['evidence'] = [];
    for (const e of row.evidence.slice(-METHOD_DEFAULTS.maxEvidence)) {
      if (
        !isObj(e) ||
        !validId(e.id) ||
        !validId(e.sourceId) ||
        !validMinute(e.at) ||
        !isNum(e.attention) ||
        e.attention <= 0 ||
        e.attention > 1 ||
        (e.outcome !== 'success' && e.outcome !== 'failure') ||
        seen.has(e.id)
      )
        continue;
      seen.add(e.id);
      evidence.push({ id: e.id, sourceId: e.sourceId, at: e.at, attention: e.attention, outcome: e.outcome });
    }
    if (evidence.length) {
      const same = rules.find(
        (r) => r.action === row.action && JSON.stringify(r.conditions) === JSON.stringify(conditions),
      );
      if (same) same.evidence = [...same.evidence, ...evidence].slice(-METHOD_DEFAULTS.maxEvidence);
      else rules.push({ id: row.id, action: row.action, conditions, evidence });
    }
  }
  const recentDemonstrations: string[] = [];
  if (Array.isArray(input.recentDemonstrations))
    for (const id of input.recentDemonstrations.slice(-METHOD_DEFAULTS.maxRecentDemonstrations))
      if (validId(id) && !recentDemonstrations.includes(id)) recentDemonstrations.push(id);
  // Only a missing history is reconstructed. Appending older evidence to a full
  // valid horizon would evict genuinely newer event ids and alter a live save.
  if (input.recentDemonstrations === undefined)
    for (const rule of rules)
      for (const e of rule.evidence)
        if (!recentDemonstrations.includes(e.id)) recentDemonstrations.push(e.id);
  const out: MethodsState = {
    rules,
    recentDemonstrations: recentDemonstrations.slice(-METHOD_DEFAULTS.maxRecentDemonstrations),
  };
  if (isObj(input.context) && validId(input.context.id) && validMinute(input.context.at)) {
    const cues = cleanCues(input.context.cues, METHOD_DEFAULTS.maxCues);
    if (cues) out.context = { id: input.context.id, at: input.context.at, cues };
  }
  return out;
}
