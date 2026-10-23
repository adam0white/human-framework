/**
 * SCOPE: opt-in calendar transport between declared chapter clocks. Hosts map every retained reference and
 * supply identical source-backed norm meanings. Carries pending/continuing duties, owed records and their
 * receipts, held understanding and lapse timestamps. Does not choose dates, waive debt, simulate travel,
 * create rulings, migrate activities/projects or change the v1 persona path. Neither input is mutated.
 */
import { isContinuingCommitment } from './agenda/agenda.ts';
import { createPerson } from './person.ts';
import {
  admitPersona,
  type PersonaAdmission,
  type PersonaAdmissionResult,
  type PersonaProjection,
  type PersonaProjectionSnapshot,
  projectPersona,
  validatePersonaProjection,
} from './persona.ts';
import { restore, snapshot } from './restore.ts';
import {
  type Commitment,
  type HeldNorm,
  MAX_MINUTE,
  type NormDefinition,
  type OwedMakeUp,
  type Person,
} from './types.ts';

export interface PersonaCalendarMap {
  version: 'hf-persona-calendar-map/1';
  /** Exactly target opening minus source departure. All retained calendar timestamps use this offset. */
  offset: number;
  references: {
    commitments: Record<string, string>;
    chains: Record<string, string>;
    actions: Record<string, string>;
    entities: Record<string, string>;
    norms: Record<string, string>;
  };
  sourceNorms: NormDefinition[];
}
export interface CalendarPersonaProjection extends Omit<PersonaProjection, 'commitments'> {
  calendar: PersonaCalendarMap;
}
export interface CalendarPersonaSnapshot {
  format: 'hf-persona-calendar/1';
  person: PersonaProjectionSnapshot;
  calendar: {
    offset: number;
    commitments: Commitment[];
    owed: OwedMakeUp[];
    lapse: Person['agenda']['lapse'] | null;
    heldNorms: HeldNorm[];
    norms: NormDefinition[];
  };
}
export interface CalendarPersonaAdmission extends PersonaAdmission {
  targetNorms: NormDefinition[];
}
function fail(message: string): never {
  throw new Error(`persona calendar: ${message}`);
}
function object(x: unknown): asserts x is Record<string, unknown> {
  if (!x || typeof x !== 'object' || Array.isArray(x)) fail('expected object');
}
function keys(x: unknown, allowed: string[], required = allowed): asserts x is Record<string, unknown> {
  object(x);
  if (Object.keys(x).some((k) => !allowed.includes(k)) || required.some((k) => !Object.hasOwn(x, k)))
    fail('unsupported or missing field');
}
function text(x: unknown): asserts x is string {
  if (
    typeof x !== 'string' ||
    !x.length ||
    x.length > 1024 ||
    ['__proto__', 'constructor', 'prototype'].includes(x)
  )
    fail('invalid reference');
}
function num(x: unknown, min = -MAX_MINUTE, max = MAX_MINUTE): asserts x is number {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < min || x > max) fail('invalid timestamp/number');
}
function list(x: unknown): asserts x is unknown[] {
  if (!Array.isArray(x) || x.length > 128) fail('invalid bounded list');
}
function strings(x: unknown): asserts x is string[] {
  list(x);
  for (const v of x) text(v);
}
function same(a: unknown, b: unknown): boolean {
  const canonical = (x: unknown) =>
    JSON.stringify(x, (_k, v: unknown) =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
        : v,
    );
  return canonical(a) === canonical(b);
}
function choice(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === 'string' && allowed.includes(value);
}
const standings = ['obligatory', 'recommended', 'permitted', 'disliked', 'forbidden'];
const kinds = ['promise', 'duty', 'appointment', 'worship', 'job', 'abstain'];
const reasons = ['illness', 'travel', 'necessity', 'sleep', 'unconscious', 'missed', 'broken'];
function sources(x: unknown): void {
  list(x);
  if (!x.length) fail('norm provenance required');
  for (const v of x) {
    keys(v, ['kind', 'ref']);
    text(v.ref);
    if (!choice(v.kind, ['revelation', 'hadith', 'interpretation', 'empirical', 'assumption']))
      fail('invalid provenance');
  }
}
function catalog(x: unknown): asserts x is NormDefinition[] {
  list(x);
  const ids = new Set();
  for (const v of x) {
    keys(v, ['id', 'label', 'standing', 'sources', 'exemptions'], ['id', 'label', 'standing', 'sources']);
    text(v.id);
    text(v.label);
    sources(v.sources);
    if (ids.has(v.id) || !choice(v.standing, standings)) fail('invalid norm catalog');
    ids.add(v.id);
    if (v.exemptions !== undefined) {
      list(v.exemptions);
      const conditions = new Set();
      for (const e of v.exemptions) {
        keys(e, ['when', 'makeUp', 'sources']);
        if (!choice(e.when, ['illness', 'travel']) || typeof e.makeUp !== 'boolean' || conditions.has(e.when))
          fail('invalid exemption');
        conditions.add(e.when);
        sources(e.sources);
      }
    }
  }
}
function calendarCommitment(x: unknown): asserts x is Commitment {
  keys(
    x,
    [
      'id',
      'kind',
      'toId',
      'actions',
      'targetId',
      'from',
      'until',
      'normId',
      'importance',
      'status',
      'recurEvery',
      'label',
      'violatedBy',
      'firm',
      'exemptWhen',
      'exempt',
      'makeUpOf',
      'chain',
      'recurUntil',
    ],
    ['id', 'kind', 'actions', 'from', 'until', 'importance', 'status'],
  );
  for (const field of ['id', 'toId', 'targetId', 'normId', 'label', 'makeUpOf', 'chain'])
    if (x[field] !== undefined) text(x[field]);
  if (!choice(x.kind, kinds) || !choice(x.status, ['pending', 'kept', 'broken', 'released']))
    fail('invalid commitment');
  strings(x.actions);
  num(x.from);
  num(x.until);
  num(x.importance, 0, 1);
  if (x.until < x.from || (x.kind !== 'abstain' && !x.actions.length))
    fail('invalid commitment window/actions');
  if (x.violatedBy !== undefined) strings(x.violatedBy);
  if (x.recurEvery !== undefined) num(x.recurEvery, 1);
  if (x.recurUntil !== undefined) num(x.recurUntil);
  if (x.firm !== undefined && x.firm !== true) fail('invalid firm');
  if (x.exemptWhen !== undefined) {
    strings(x.exemptWhen);
    if (x.exemptWhen.some((v) => !['illness', 'travel'].includes(v))) fail('invalid exemption condition');
  }
  if (x.exempt !== undefined) {
    keys(x.exempt, ['reason', 'at']);
    num(x.exempt.at);
    if (!choice(x.exempt.reason, ['illness', 'travel', 'necessity', 'sleep', 'unconscious']))
      fail('invalid exemption reason');
  }
}
function owed(x: unknown): asserts x is OwedMakeUp {
  keys(
    x,
    ['ofId', 'normId', 'kind', 'violatedBy', 'actions', 'reason', 'lapseSince', 'at', 'label', 'scheduledAs'],
    ['ofId', 'kind', 'actions', 'reason', 'at'],
  );
  for (const field of ['ofId', 'normId', 'label', 'scheduledAs']) if (x[field] !== undefined) text(x[field]);
  if (!choice(x.kind, kinds) || !choice(x.reason, reasons)) fail('invalid owed record');
  strings(x.actions);
  num(x.at);
  if (x.violatedBy !== undefined) strings(x.violatedBy);
  if (x.lapseSince !== undefined) num(x.lapseSince);
}
function boundedJson(input: unknown): void {
  const pending = [{ value: input, depth: 0 }];
  const seen = new Set<object>();
  let nodes = 0;
  while (pending.length) {
    const item = pending.pop();
    if (!item) break;
    if (++nodes > 16384 || item.depth > 16) fail('JSON bounds exceeded');
    const { value, depth } = item;
    if (value === null || typeof value === 'boolean') continue;
    if (typeof value === 'string') {
      if (value.length > 1024) fail('text bounds exceeded');
      continue;
    }
    if (typeof value === 'number') {
      num(value);
      continue;
    }
    if (typeof value !== 'object' || seen.has(value)) fail('non-JSON or cyclic input');
    seen.add(value);
    if (
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    )
      fail('non-JSON object');
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) fail('unsafe reference');
      pending.push({ value: child, depth: depth + 1 });
    }
  }
}
/** Validate portable calendar data strictly; no restore defaults or debt settlement. */
export function validateCalendarPersona(input: unknown): CalendarPersonaSnapshot {
  boundedJson(input);
  keys(input, ['format', 'person', 'calendar']);
  if (input.format !== 'hf-persona-calendar/1') fail('unsupported format');
  const person = validatePersonaProjection(input.person);
  if (person.commitments.length) fail('calendar owns portable commitments');
  const c = input.calendar;
  keys(c, ['offset', 'commitments', 'owed', 'lapse', 'heldNorms', 'norms']);
  num(c.offset);
  list(c.commitments);
  for (const v of c.commitments) calendarCommitment(v);
  list(c.owed);
  for (const v of c.owed) owed(v);
  const commitments = c.commitments as Commitment[];
  const debts = c.owed as OwedMakeUp[];
  if (
    new Set(commitments.map((v) => v.id)).size !== c.commitments.length ||
    new Set(debts.map((v) => v.ofId)).size !== c.owed.length
  )
    fail('duplicate obligation id');
  if (c.lapse !== null) {
    keys(c.lapse, ['since', 'missed']);
    num(c.lapse.since);
    num(c.lapse.missed, 0);
    if (!Number.isInteger(c.lapse.missed)) fail('invalid lapse');
  }
  catalog(c.norms);
  list(c.heldNorms);
  for (const v of c.heldNorms) {
    keys(v, ['normId', 'standing', 'conviction']);
    text(v.normId);
    num(v.conviction, 0, 1);
    if (!choice(v.standing, standings)) fail('invalid held understanding');
  }
  const heldNorms = c.heldNorms as HeldNorm[];
  if (new Set(heldNorms.map((v) => v.normId)).size !== c.heldNorms.length) fail('duplicate held norm');
  const normIds = new Set(c.norms.map((n) => n.id));
  for (const record of [...commitments, ...debts, ...heldNorms])
    if (record.normId !== undefined && !normIds.has(record.normId)) fail('missing norm definition');
  const arrival = person.source.now + c.offset;
  num(arrival);
  for (const debt of debts) {
    const scheduled = commitments.find((v) => v.id === debt.scheduledAs);
    // Pruned source history stays absent and unresolved; never invent a paid receipt.
    if (scheduled && scheduled.makeUpOf !== debt.ofId) fail('conflicting scheduled make-up reference');
    if (debt.at > arrival || (debt.lapseSince !== undefined && debt.lapseSince > arrival))
      fail('future owed evidence');
  }
  if (c.lapse !== null && (c.lapse as NonNullable<Person['agenda']['lapse']>).since > arrival)
    fail('future lapse evidence');
  for (const duty of commitments)
    if (duty.exempt && duty.exempt.at > arrival) fail('future exemption evidence');
  // Match the engine's owning-slice bounds exactly. A rejected import cannot be silently truncated.
  const probe = createPerson({
    id: 'calendar-validation',
    name: 'validation',
    seed: 0,
    bornAt: 0,
    sex: 'female',
  });
  probe.agenda.commitments = structuredClone(c.commitments) as Commitment[];
  probe.agenda.owed = structuredClone(c.owed) as OwedMakeUp[];
  if (c.lapse !== null)
    probe.agenda.lapse = structuredClone(c.lapse) as NonNullable<Person['agenda']['lapse']>;
  probe.conscience.norms = structuredClone(c.heldNorms) as HeldNorm[];
  const checked = restore(probe);
  if (!same(probe.agenda, checked.agenda) || !same(probe.conscience.norms, checked.conscience.norms))
    fail('calendar exceeds supported engine bounds');
  return { format: 'hf-persona-calendar/1', person, calendar: structuredClone(c) } as CalendarPersonaSnapshot;
}
/** Source declares a complete semantic ID map, a clock offset and source-backed norm catalog. */
export function projectCalendarPersona(
  source: Person,
  mapping: CalendarPersonaProjection,
): CalendarPersonaSnapshot {
  const p = restore(snapshot(source));
  const m = mapping.calendar;
  keys(m, ['version', 'offset', 'references', 'sourceNorms']);
  if (m.version !== 'hf-persona-calendar-map/1') fail('unsupported calendar mapping');
  num(m.offset);
  keys(m.references, ['commitments', 'chains', 'actions', 'entities', 'norms']);
  for (const record of Object.values(m.references)) {
    object(record);
    if (Object.keys(record).length > 512) fail('too many references');
    for (const [key, value] of Object.entries(record)) {
      text(key);
      text(value);
    }
    if (new Set(Object.values(record)).size !== Object.values(record).length)
      fail('duplicate mapped reference');
  }
  catalog(m.sourceNorms);
  const ref = (kind: keyof PersonaCalendarMap['references'], id: string): string => {
    const value = Object.hasOwn(m.references[kind], id) ? m.references[kind][id] : undefined;
    if (value === undefined) fail(`unmapped ${kind} reference ${id}`);
    return value;
  };
  const shift = (at: number) => {
    const value = at + m.offset;
    num(value);
    return value;
  };
  const debts = p.agenda.owed ?? [];
  const selected = p.agenda.commitments.filter(
    (c) =>
      isContinuingCommitment(p.agenda, c) || debts.some((d) => d.ofId === c.id || d.scheduledAs === c.id),
  );
  const commitments = selected.map((old) => {
    const c = structuredClone(old);
    c.id = ref('commitments', old.id);
    c.actions = old.actions.map((a) => ref('actions', a));
    c.from = shift(old.from);
    c.until = shift(old.until);
    for (const [field, kind] of [
      ['toId', 'entities'],
      ['targetId', 'entities'],
      ['normId', 'norms'],
      ['chain', 'chains'],
      ['makeUpOf', 'commitments'],
    ] as const) {
      const value = old[field];
      if (value !== undefined) c[field] = ref(kind, value);
    }
    if (old.violatedBy !== undefined) c.violatedBy = old.violatedBy.map((a) => ref('actions', a));
    if (old.recurUntil !== undefined) c.recurUntil = shift(old.recurUntil);
    if (c.exempt !== undefined) c.exempt.at = shift(c.exempt.at);
    return c;
  });
  const mappedOwed = debts.map((old) => {
    const d = structuredClone(old);
    d.ofId = ref('commitments', old.ofId);
    d.at = shift(old.at);
    d.actions = old.actions.map((a) => ref('actions', a));
    if (old.normId !== undefined) d.normId = ref('norms', old.normId);
    if (old.scheduledAs !== undefined) d.scheduledAs = ref('commitments', old.scheduledAs);
    if (old.violatedBy !== undefined) d.violatedBy = old.violatedBy.map((a) => ref('actions', a));
    if (old.lapseSince !== undefined) d.lapseSince = shift(old.lapseSince);
    return d;
  });
  const heldNorms = p.conscience.norms.map((n) => ({ ...n, normId: ref('norms', n.normId) }));
  const norms = m.sourceNorms.map((n) => ({ ...structuredClone(n), id: ref('norms', n.id) }));
  const stripped = snapshot(p);
  stripped.agenda.commitments = [];
  delete stripped.agenda.owed;
  delete stripped.agenda.lapse;
  const person = projectPersona(stripped, {
    version: mapping.version,
    skills: mapping.skills,
    ...(mapping.episodes === undefined ? {} : { episodes: mapping.episodes }),
  });
  person.limitations = person.limitations.map((line) =>
    line === 'source habits/methods/beliefs/social/conscience omitted; target authored state'
      ? 'source habits/methods/beliefs/social and conscience breaches omitted; target authored state; held norms transported'
      : line,
  );
  for (const debt of mappedOwed) {
    if (debt.scheduledAs !== undefined && !commitments.some((c) => c.id === debt.scheduledAs))
      person.limitations.push(`owed:${debt.ofId}:scheduled history absent; payment unproven`);
  }
  return validateCalendarPersona({
    format: 'hf-persona-calendar/1',
    person,
    calendar: {
      offset: m.offset,
      commitments,
      owed: mappedOwed,
      lapse: p.agenda.lapse ? { ...p.agenda.lapse, since: shift(p.agenda.lapse.since) } : null,
      heldNorms,
      norms,
    },
  });
}
/** Receiver declares identical norm meanings and a clean calendar at the exact declared opening clock. */
export function admitCalendarPersona(
  input: unknown,
  target: Person,
  policy: CalendarPersonaAdmission,
): PersonaAdmissionResult {
  const projection = validateCalendarPersona(input);
  catalog(policy.targetNorms);
  const c = projection.calendar;
  if (target.now - projection.person.source.now !== c.offset) fail('calendar clock offset conflict');
  const ordered = (ns: NormDefinition[]) => [...ns].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (!same(ordered(c.norms), ordered(policy.targetNorms))) fail('norm semantic compatibility conflict');
  if (target.agenda.commitments.length || target.agenda.owed?.length || target.agenda.lapse)
    fail('target calendar must be empty');
  const result = admitPersona(projection.person, target, policy);
  const p = result.person;
  p.agenda.commitments = c.commitments;
  if (c.owed.length) p.agenda.owed = c.owed;
  if (c.lapse !== null) p.agenda.lapse = c.lapse;
  p.conscience.norms = c.heldNorms;
  p.agenda.nextId = Math.max(p.agenda.nextId, p.agenda.commitments.length + 1);
  // Agenda-generated ids are c<N>; reserve imported ids before normal host scheduling resumes.
  for (const record of [
    ...c.commitments.map((x) => x.id),
    ...c.owed.flatMap((x) => [x.ofId, ...(x.scheduledAs === undefined ? [] : [x.scheduledAs])]),
  ]) {
    if (/^c\d+$/.test(record)) p.agenda.nextId = Math.max(p.agenda.nextId, Number(record.slice(1)) + 1);
  }
  const checked = restore(p);
  if (!same(p, checked)) fail('admitted calendar exceeds supported engine bounds');
  return { ...result, person: checked };
}
