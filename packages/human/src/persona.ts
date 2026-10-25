/**
 * SCOPE: opt-in, deterministic projection between host-authored chapter openings. Copies exact temperament,
 * values and RNG, explicitly mapped skills, episodes and commitments, with declared clock offsets. Checks
 * identity, age, family and health compatibility before returning a new Person. Neither input is mutated.
 * This is not a world migration, identity registry, transport, hash, authentication or general calendar mapper.
 * v1 admits zero-duration travel and healthy compatible bodies only; family/bonds remain host-authored and must
 * match source provenance. Portable v1 accepts its published 2.14.1, 2.17.0, 2.21.0 and 2.23.0 stamps and the current engine;
 * the bodily opt-ins change no portable field semantics. Pregnancy and nonempty temporal bonds are unsupported in v1. All other world-dependent stores stay with the source and are disclosed as omitted.
 */
import { hasUnresolvedMakeUps, sameChain } from './agenda/agenda.ts';
import { createPerson } from './person.ts';
import { restore, snapshot } from './restore.ts';
import type { Commitment, Episode, Person, Skill } from './types.ts';
import { ENGINE_VERSION, MAX_MINUTE, PERSON_SCHEMA } from './types.ts';

export interface PersonaEpisodeMap {
  id: string;
  action?: string;
  actorId?: string;
  targetId?: string;
  placeId?: string;
  voiceId?: string;
  /** Tags are semantic keys too; omitted means no portable tags. */
  tags?: string[];
}
export interface PersonaCommitmentMap {
  id: string;
  actions: string[];
  toId?: string;
  targetId?: string;
  normId?: string;
  chain?: string;
  /** Explicit target-calendar window. Duration and recurrence must remain identical. */
  from: number;
  until: number;
}
export interface PersonaProjection {
  version: string;
  skills: Record<string, string>;
  episodes?: Record<string, PersonaEpisodeMap>;
  /** Every pending or continuing recurring obligation requires a named binding. */
  commitments?: Record<string, PersonaCommitmentMap>;
}
export interface PersonaProjectionSnapshot {
  format: 'hf-persona-state/1';
  mappingVersion: string;
  source: { schema: Person['schema']; engine: string; id: string; now: number };
  name: string;
  life: Person['life'];
  rng: Person['rng'];
  traits: Person['traits'];
  values: Person['values'];
  health: { health: number; fitness: number; circadianPeak: number };
  family: Person['family'] | null;
  bonds: Person['bonds'] | null;
  skills: Record<string, Skill>;
  skillRetention: Person['skillRetention'] | null;
  episodes: Episode[];
  /** Already bound to the target calendar by the explicitly versioned host mapping. */
  commitments: Commitment[];
  limitations: string[];
}
export interface PersonaAdmission {
  mappingVersion: string;
  sourceId: string;
  targetId: string;
}
export interface PersonaAdmissionResult {
  person: Person;
  report: { mappingVersion: string; offset: number; limitations: string[] };
}

function fail(reason: string): never {
  throw new Error(`persona: ${reason}`);
}
function obj(x: unknown): asserts x is Record<string, unknown> {
  if (!x || typeof x !== 'object' || Array.isArray(x)) fail('expected object');
}
function keys(x: unknown, allowed: string[], required = allowed): asserts x is Record<string, unknown> {
  obj(x);
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
    fail('invalid text/reference');
}
function num(x: unknown, min = -MAX_MINUTE, max = MAX_MINUTE): asserts x is number {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < min || x > max) fail('invalid number/timestamp');
}
function texts(x: unknown, max = 128): asserts x is string[] {
  if (!Array.isArray(x) || x.length > max) fail('invalid list');
  for (const value of x) text(value);
}
function canonical(x: unknown): string {
  return JSON.stringify(x, (_key, value: unknown) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : value,
  );
}
function same(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}
function compatibleBody(p: Person): void {
  if (!p.body.alive) fail('dead person cannot travel or be revived');
  if (
    p.body.health <= 0 ||
    p.body.injuries.length ||
    p.body.illnesses.length ||
    p.body.downed ||
    Object.keys(p.body.exposures ?? {}).length
  )
    fail('unsupported health condition');
}
function boundRecord(x: unknown): asserts x is Record<string, unknown> {
  obj(x);
  if (Object.keys(x).length > 128) fail('too many mappings');
  for (const key of Object.keys(x)) text(key);
}
function episode(x: unknown): asserts x is Episode {
  keys(
    x,
    [
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
      'tags',
      'voiceId',
      'recalledAt',
    ],
    ['id', 'at', 'kind', 'valence', 'salience', 'summary', 'tags'],
  );
  for (const key of ['id', 'kind', 'summary', 'action', 'actorId', 'targetId', 'placeId', 'voiceId'])
    if (x[key] !== undefined) text(x[key]);
  num(x.at);
  num(x.valence, -1, 1);
  num(x.salience, 0, 1);
  texts(x.tags);
  if (x.recalledAt !== undefined) num(x.recalledAt);
}
function commitment(x: unknown): asserts x is Commitment {
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
      'chain',
    ],
    ['id', 'kind', 'actions', 'from', 'until', 'importance', 'status'],
  );
  for (const key of ['id', 'toId', 'targetId', 'normId', 'label', 'chain'])
    if (x[key] !== undefined) text(x[key]);
  if (
    !['promise', 'duty', 'appointment', 'worship', 'job'].includes(String(x.kind)) ||
    x.status !== 'pending'
  )
    fail('unsupported obligation');
  texts(x.actions);
  if (!x.actions.length) fail('empty obligation actions');
  num(x.from);
  num(x.until);
  if (x.until < x.from) fail('invalid obligation window');
  num(x.importance, 0, 1);
  if (x.recurEvery !== undefined) num(x.recurEvery, 1);
}

function boundedJson(input: unknown): void {
  const pending: { value: unknown; depth: number }[] = [{ value: input, depth: 0 }];
  const seen = new Set<object>();
  let nodes = 0;
  while (pending.length) {
    const item = pending.pop();
    if (!item) break;
    if (++nodes > 8192 || item.depth > 16) fail('JSON bounds exceeded');
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
      if (['__proto__', 'prototype', 'constructor'].includes(key)) fail('unsafe reference');
      pending.push({ value: child, depth: depth + 1 });
    }
  }
}

/** Validates untrusted portable data without restoring defaults or accepting extra live fields. */
export function validatePersonaProjection(input: unknown): PersonaProjectionSnapshot {
  boundedJson(input);
  keys(input, [
    'format',
    'mappingVersion',
    'source',
    'name',
    'life',
    'rng',
    'traits',
    'values',
    'health',
    'family',
    'bonds',
    'skills',
    'skillRetention',
    'episodes',
    'commitments',
    'limitations',
  ]);
  if (input.format !== 'hf-persona-state/1') fail('unsupported format');
  text(input.mappingVersion);
  text(input.name);
  keys(input.source, ['schema', 'engine', 'id', 'now']);
  // The 2.14.1 and 2.17.0 portable fields retain their semantics across the bodily opt-ins.
  const compatibleEngine =
    input.source.engine === ENGINE_VERSION ||
    input.source.engine === '2.23.0' ||
    input.source.engine === '2.21.0' ||
    input.source.engine === '2.17.0' ||
    input.source.engine === '2.14.1';
  if (input.source.schema !== PERSON_SCHEMA || !compatibleEngine)
    fail('unsupported source schema/engine; migrate the source before projection');
  text(input.source.id);
  num(input.source.now);
  keys(input.life, ['bornAt', 'sex']);
  num(input.life.bornAt);
  if (!['female', 'male'].includes(String(input.life.sex))) fail('invalid sex');
  keys(input.rng, ['a', 'b', 'c', 'd']);
  for (const [key, value] of Object.entries(input.rng)) {
    num(value, key === 'a' ? -0x80000000 : 0, key === 'a' ? 0x7fffffff : 0xffffffff);
    if (!Number.isInteger(value)) fail('invalid RNG');
  }
  const base = createPerson({ id: 'validation', name: 'validation', seed: 0, bornAt: 0, sex: 'female' });
  for (const slice of ['traits', 'values'] as const) {
    keys(input[slice], Object.keys(base[slice]));
    for (const value of Object.values(input[slice])) num(value, 0, 1);
  }
  keys(input.health, ['health', 'fitness', 'circadianPeak']);
  num(input.health.health, Number.MIN_VALUE, 1);
  num(input.health.fitness, 0, 1);
  num(input.health.circadianPeak, 0, 1440);
  boundRecord(input.skills);
  for (const value of Object.values(input.skills)) {
    keys(value, ['level', 'practice', 'lastPracticed']);
    num(value.level, 0, 1);
    num(value.practice, 0);
    num(value.lastPracticed);
    if (value.lastPracticed > input.source.now) fail('future skill evidence');
  }
  if (input.skillRetention !== null) {
    keys(input.skillRetention, ['consolidationHours']);
    num(input.skillRetention.consolidationHours, Number.MIN_VALUE);
  }
  if (input.family !== null) {
    obj(input.family);
    if (input.family.pregnancy !== undefined) fail('unsupported temporal family state: pregnancy');
  }
  if (input.bonds !== null) {
    obj(input.bonds);
    if (
      input.bonds.mourning !== undefined ||
      (Array.isArray(input.bonds.courtships) && input.bonds.courtships.length > 0) ||
      (Array.isArray(input.bonds.marriages) && input.bonds.marriages.length > 0)
    ) {
      fail('unsupported temporal bonds state');
    }
  }
  for (const field of ['family', 'bonds'] as const) {
    if (input[field] !== null) {
      obj(input[field]);
      const check = snapshot(base);
      Object.assign(check, { [field]: input[field] });
      if (!same(restore(check)[field], input[field])) fail(`invalid ${field} provenance`);
    }
  }
  if (
    !Array.isArray(input.episodes) ||
    input.episodes.length > 128 ||
    !Array.isArray(input.commitments) ||
    input.commitments.length > 128
  )
    fail('invalid portable lists');
  for (const value of input.episodes) {
    episode(value);
    if (
      value.at > input.source.now ||
      (value.recalledAt !== undefined && value.recalledAt > input.source.now)
    )
      fail('future episode evidence');
  }
  for (const value of input.commitments) commitment(value);
  for (const list of [input.episodes, input.commitments])
    if (new Set(list.map((x) => x.id)).size !== list.length) fail('duplicate portable id');
  texts(input.limitations, 256);
  return structuredClone(input) as unknown as PersonaProjectionSnapshot;
}

/** Hosts must migrate supported old saves first. No random draws or mutation occur here. */
export function projectPersona(source: Person, mapping: PersonaProjection): PersonaProjectionSnapshot {
  const p = restore(snapshot(source));
  compatibleBody(p);
  if (p.activity) fail('running activity');
  if (p.agenda.goals.some((g) => g.status === 'active') || p.projects?.currentGoalId)
    fail('active goal/project');
  if (hasUnresolvedMakeUps(p) || p.agenda.lapse) fail('unmapped owed obligation');
  text(mapping.version);
  boundRecord(mapping.skills);
  const skills: Record<string, Skill> = Object.create(null);
  for (const [from, to] of Object.entries(mapping.skills).sort()) {
    text(to);
    const skill = p.skills[from];
    if (!Object.hasOwn(p.skills, from) || !skill || Object.hasOwn(skills, to))
      fail('missing/duplicate skill mapping');
    skills[to] = structuredClone(skill);
  }
  const episodes: Episode[] = [];
  for (const [id, map] of Object.entries(mapping.episodes ?? {}).sort()) {
    const old = p.memory.episodes.find((e) => e.id === id);
    if (!old) fail('missing approved episode');
    keys(map, ['id', 'action', 'actorId', 'targetId', 'placeId', 'voiceId', 'tags'], ['id']);
    // Every existing semantic reference needs a declared mapping; omission must never preserve host-local ids.
    for (const ref of ['action', 'actorId', 'targetId', 'placeId', 'voiceId'] as const)
      if (old[ref] !== undefined && map[ref] === undefined) fail(`unmapped episode ${ref}`);
    const copy: Episode = {
      id: map.id,
      at: old.at,
      kind: old.kind,
      valence: old.valence,
      salience: old.salience,
      summary: old.summary,
      tags: map.tags ?? [],
    };
    for (const ref of ['action', 'actorId', 'targetId', 'placeId', 'voiceId'] as const)
      if (map[ref] !== undefined) copy[ref] = map[ref];
    if (old.recalledAt !== undefined) copy.recalledAt = old.recalledAt;
    episodes.push(copy);
  }
  const commitments: Commitment[] = [];
  const bindings = mapping.commitments ?? {};
  for (const old of p.agenda.commitments) {
    // Closed history no longer owns the chain once an actual later instance exists, including a release.
    if (
      old.status !== 'pending' &&
      p.agenda.commitments.some((next) => next.from > old.from && sameChain(old, next))
    )
      continue;
    const ongoing =
      old.status === 'pending' ||
      (old.recurEvery !== undefined &&
        old.status !== 'released' &&
        (old.recurUntil === undefined || old.recurUntil > p.now));
    if (!ongoing) continue;
    const map = Object.hasOwn(bindings, old.id) ? bindings[old.id] : undefined;
    if (!map || old.status !== 'pending') fail(`unmapped obligation ${old.id}`);
    keys(
      map,
      ['id', 'actions', 'toId', 'targetId', 'normId', 'chain', 'from', 'until'],
      ['id', 'actions', 'from', 'until'],
    );
    if (old.until - old.from !== map.until - map.from) fail('obligation duration changed');
    for (const ref of ['toId', 'targetId', 'normId', 'chain'] as const)
      if (old[ref] !== undefined && map[ref] === undefined) fail(`unmapped obligation ${ref}`);
    const copy: Commitment = {
      id: map.id,
      kind: old.kind,
      actions: [...map.actions],
      from: map.from,
      until: map.until,
      importance: old.importance,
      status: 'pending',
    };
    for (const ref of ['toId', 'targetId', 'normId', 'chain'] as const)
      if (map[ref] !== undefined) copy[ref] = map[ref];
    if (old.recurEvery !== undefined) copy.recurEvery = old.recurEvery;
    if (old.label !== undefined) copy.label = old.label;
    if (
      old.exempt ||
      old.makeUpOf ||
      old.recurUntil !== undefined ||
      old.violatedBy ||
      old.firm ||
      old.exemptWhen
    )
      fail('unsupported obligation semantics');
    commitments.push(copy);
  }
  for (const id of Object.keys(bindings))
    if (!p.agenda.commitments.some((c) => c.id === id && c.status === 'pending'))
      fail('missing obligation binding');
  const limitations = [
    'source transient body/needs/affect/ambient omitted; target arrival policy',
    'source habits/methods/beliefs/social/conscience omitted; target authored state',
    'source optional behaviour stores and decision history omitted; target authored state',
    'family/bonds provenance checked; target authored state',
  ];
  for (const key of Object.keys(p.skills).sort())
    if (!Object.hasOwn(mapping.skills, key)) limitations.push(`skill:${key}`);
  for (const e of p.memory.episodes)
    if (!Object.hasOwn(mapping.episodes ?? {}, e.id)) limitations.push(`episode:${e.id}`);
  return validatePersonaProjection({
    format: 'hf-persona-state/1',
    mappingVersion: mapping.version,
    source: { schema: source.schema, engine: p.engine, id: p.id, now: p.now },
    name: p.name,
    life: p.life,
    rng: p.rng,
    traits: p.traits,
    values: p.values,
    health: { health: p.body.health, fitness: p.body.fitness, circadianPeak: p.body.circadianPeak },
    family: p.family ?? null,
    bonds: p.bonds ?? null,
    skills,
    skillRetention: p.skillRetention ?? null,
    episodes,
    commitments,
    limitations,
  });
}

/** Return a detached target opening; a later shelf change cannot affect it. Host owns cast/branch/death authority. */
export function admitPersona(
  input: unknown,
  target: Person,
  policy: PersonaAdmission,
): PersonaAdmissionResult {
  const projection = validatePersonaProjection(input);
  const p = restore(snapshot(target));
  if (projection.mappingVersion !== policy.mappingVersion) fail('unsupported mapping');
  if (projection.source.id !== policy.sourceId || p.id !== policy.targetId) fail('identity binding conflict');
  compatibleBody(p);
  const offset = p.now - projection.source.now;
  const shift = (at: number): number => {
    const mapped = at + offset;
    num(mapped);
    return mapped;
  };
  if (
    p.life.sex !== projection.life.sex ||
    p.life.bornAt !== shift(projection.life.bornAt) ||
    p.name !== projection.name
  )
    fail('identity/age conflict');
  if (!same(p.family ?? null, projection.family) || !same(p.bonds ?? null, projection.bonds))
    fail('family/bonds conflict');
  if (
    !same(
      { health: p.body.health, fitness: p.body.fitness, circadianPeak: p.body.circadianPeak },
      projection.health,
    )
  )
    fail('health compatibility conflict');
  if (p.activity) fail('target already active');
  p.traits = projection.traits;
  p.values = projection.values;
  p.rng = projection.rng;
  // A sparse projection replaces target priors for portable skill/history stores, never blends evidence.
  p.skills = projection.skills;
  if (projection.skillRetention) p.skillRetention = projection.skillRetention;
  else delete p.skillRetention;
  for (const skill of Object.values(p.skills)) skill.lastPracticed = shift(skill.lastPracticed);
  p.memory.episodes = projection.episodes;
  for (const e of p.memory.episodes) {
    e.at = shift(e.at);
    if (e.recalledAt !== undefined) e.recalledAt = shift(e.recalledAt);
  }
  p.memory.nextEpisode = Math.max(p.memory.nextEpisode, p.memory.episodes.length + 1);
  for (const e of p.memory.episodes) {
    if (/^e\d+$/.test(e.id)) {
      const next = Number(e.id.slice(1)) + 1;
      num(next, 0);
      p.memory.nextEpisode = Math.max(p.memory.nextEpisode, next);
    }
  }
  for (const c of projection.commitments) {
    if (
      c.until < p.now ||
      p.agenda.commitments.some((old) => old.id === c.id || (c.chain && old.chain === c.chain))
    )
      fail('target obligation conflict');
    p.agenda.commitments.push(c);
  }
  p.agenda.nextId = Math.max(p.agenda.nextId, p.agenda.commitments.length + 1);
  const restored = restore(p);
  if (!same(restored, p)) fail('admitted state exceeds supported bounds');
  return {
    person: restored,
    report: { mappingVersion: policy.mappingVersion, offset, limitations: [...projection.limitations] },
  };
}
