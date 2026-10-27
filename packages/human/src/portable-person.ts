/** SCOPE: approximate person exchange across HF engine generations. This is a
 * chapter projection, not a save converter. Runtime clocks, RNG and exact history
 * remain in their source archive. No recovery, debt settlement or travel is implied.
 */
export interface PortablePerson {
  format: 'hf-portable-person';
  version: 1;
  castId: string;
  castRevision: string;
  source: { game: string; engine: string; personId: string };
  state: {
    traits: Record<string, number>;
    values: Record<string, number>;
    body: {
      satiety: number;
      hydration: number;
      sleepPressure: number;
      exertion: number;
      fitness: number;
      health: number;
      pain: number;
      sleepDebtHours: number;
    };
    mood: { valence: number; arousal: number };
  };
  history: { game: string; summary: string }[];
  omittedHistory: number;
}
type Data = Record<string, unknown>;
const TRAITS = ['honesty', 'emotionality', 'extraversion', 'agreeableness', 'conscientiousness', 'openness'];
const VALUES = [
  'benevolence',
  'universalism',
  'tradition',
  'conformity',
  'security',
  'achievement',
  'power',
  'hedonism',
  'stimulation',
  'selfDirection',
];
const BODY = [
  'satiety',
  'hydration',
  'sleepPressure',
  'exertion',
  'fitness',
  'health',
  'pain',
  'sleepDebtHours',
];
const refusal =
  'This person cannot continue here with this saved history. Keep the source chapter or export it. Your saved history has not been replaced.';
function fail(): never {
  throw new Error(refusal);
}
function object(v: unknown): Data {
  if (
    !v ||
    typeof v !== 'object' ||
    Array.isArray(v) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(v))
  )
    fail();
  return v as Data;
}
function keys(v: Data, expected: string[]): void {
  if (Object.keys(v).sort().join(',') !== [...expected].sort().join(',')) fail();
}
function number(v: unknown, min = 0, max = 1): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) fail();
  return v;
}
function units(v: unknown, names: string[]): Record<string, number> {
  const d = object(v);
  keys(d, names);
  return Object.fromEntries(names.map((k) => [k, number(d[k])]));
}
function token(v: unknown): string {
  if (
    typeof v !== 'string' ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(v) ||
    ['constructor', 'prototype', '__proto__'].includes(v)
  )
    fail();
  return v;
}
function engine(v: unknown): string {
  if (typeof v !== 'string' || !/^(?:2\.23\.0|[34]\.\d+\.\d+)$/.test(v)) fail();
  return v;
}
export function validatePortablePerson(input: unknown): PortablePerson {
  const p = object(input);
  keys(p, ['format', 'version', 'castId', 'castRevision', 'source', 'state', 'history', 'omittedHistory']);
  if (p.format !== 'hf-portable-person' || p.version !== 1) fail();
  token(p.castId);
  token(p.castRevision);
  const source = object(p.source);
  keys(source, ['game', 'engine', 'personId']);
  token(source.game);
  token(source.personId);
  engine(source.engine);
  const state = object(p.state);
  keys(state, ['traits', 'values', 'body', 'mood']);
  units(state.traits, TRAITS);
  units(state.values, VALUES);
  const body = object(state.body);
  keys(body, BODY);
  for (const k of BODY) number(body[k], 0, k === 'sleepDebtHours' ? 168 : 1);
  const mood = object(state.mood);
  keys(mood, ['valence', 'arousal']);
  number(mood.valence, -1);
  number(mood.arousal);
  if (!Array.isArray(p.history) || p.history.length > 16) fail();
  for (const h of p.history) {
    const entry = object(h);
    keys(entry, ['game', 'summary']);
    token(entry.game);
    if (typeof entry.summary !== 'string' || !entry.summary.trim() || entry.summary.length > 240) fail();
  }
  if (!Number.isSafeInteger(p.omittedHistory) || number(p.omittedHistory, 0, Number.MAX_SAFE_INTEGER) < 0)
    fail();
  return structuredClone(input) as PortablePerson;
}
function array(v: unknown): unknown[] {
  if (!Array.isArray(v)) fail();
  return v;
}
/** Refuse source state that this approximate contract cannot honour. Unknown
 * clinical or temporal state is never converted into a healthy, debt-free arrival.
 */
function quiet(person: Data): void {
  const body = object(person.body),
    agenda = object(person.agenda);
  if (
    body.alive !== true ||
    body.asleep !== false ||
    person.activity ||
    body.downed ||
    array(body.injuries).length ||
    array(body.illnesses).length ||
    array(agenda.commitments).some((c) => {
      const duty = object(c);
      return (
        !['kept', 'broken', 'released'].includes(String(duty.status)) ||
        duty.recurEvery !== undefined ||
        duty.recurEveryMs !== undefined
      );
    }) ||
    (agenda.owed !== undefined && array(agenda.owed).length) ||
    agenda.lapse ||
    array(agenda.goals).some((g) => object(g).status === 'active') ||
    (agenda.precommitments !== undefined && array(agenda.precommitments).length)
  )
    fail();
  if (person.will && array(object(person.will).precommitments).length) fail();
  const projects = person.projects === undefined ? undefined : object(person.projects);
  if (projects && (projects.currentGoalId || (Array.isArray(projects.goals) && projects.goals.length)))
    fail();
  const family = person.family === undefined ? undefined : object(person.family),
    bonds = person.bonds === undefined ? undefined : object(person.bonds);
  if (
    family?.pregnancy ||
    bonds?.mourning ||
    (bonds && array(bonds.courtships).length) ||
    (bonds && array(bonds.marriages).some((m) => object(m).endedAt === undefined))
  )
    fail();
  // Exposure cannot disappear on HF3 entry. Depletion becomes at least as much sleep pressure.
  if (
    body.exposures &&
    (Array.isArray(body.exposures) ? body.exposures : Object.values(object(body.exposures))).some((x) => {
      const e = object(x);
      return number(e.recent) !== 0 || number(e.cumulative, 0, Number.MAX_VALUE) !== 0;
    })
  )
    fail();
}
function bodyDepletion(b: Data): number {
  return b.depletion === undefined ? 0 : number(b.depletion);
}
export function projectPortablePerson(input: {
  castId: string;
  castRevision: string;
  game: string;
  engine: string;
  person: unknown;
  history: string[];
  previous?: PortablePerson;
}): PortablePerson {
  const p = object(input.person);
  quiet(p);
  const b = object(p.body),
    affect = object(p.affect);
  const prior = input.previous === undefined ? undefined : validatePortablePerson(input.previous);
  if (prior && (prior.castId !== input.castId || prior.castRevision !== input.castRevision)) fail();
  const entries = [
    ...(prior?.history ?? []),
    ...input.history.map((summary) => ({ game: input.game, summary })),
  ];
  if (input.history.length > 16) fail();
  return validatePortablePerson({
    format: 'hf-portable-person',
    version: 1,
    castId: input.castId,
    castRevision: input.castRevision,
    source: { game: input.game, engine: engine(input.engine), personId: token(p.id) },
    state: {
      traits: units(p.traits, TRAITS),
      values: units(p.values, VALUES),
      body: Object.fromEntries(
        BODY.map((k) => [
          k,
          k === 'sleepDebtHours'
            ? input.engine.startsWith('4.')
              ? b.sleepDebtHours
              : b.sleepDebt
            : k === 'sleepPressure'
              ? Math.max(number(b.sleepPressure), bodyDepletion(b))
              : b[k],
        ]),
      ),
      mood: structuredClone(affect.mood),
    },
    history: entries.slice(-16),
    omittedHistory: (prior?.omittedHistory ?? 0) + Math.max(0, entries.length - 16),
  });
}
/** One admission into an authored HF4 opening or a fresh HF3 person. The host
 * keeps the complete validated passport in its replay input, including history.
 * The receiving host owns local roles, biographies and clock/RNG construction.
 */
export function admitPortablePerson<T>(input: unknown, opening: T): T {
  const portable = validatePortablePerson(input),
    target = structuredClone(opening);
  const p = object(target),
    modern = Object.hasOwn(p, 'state');
  const state = modern ? object(p.state) : p;
  const b = object(state.body),
    incoming = portable.state.body;
  // The receiving chapter keeps its authored routines. Only the source must
  // have no unresolved duty: admission does not erase any receiving commitment.
  if (b.alive === false || b.asleep || b.downed || array(b.injuries).length || array(b.illnesses).length)
    fail();
  // Exact clinical compatibility is required; this contract carries no diagnosis conversion.
  if (b.health !== incoming.health || b.pain !== incoming.pain) fail();
  state.traits = structuredClone(portable.state.traits);
  state.values = structuredClone(portable.state.values);
  if (!modern && state.character) {
    const character = object(state.character);
    character.baseTraits = structuredClone(portable.state.traits);
    character.baseValues = structuredClone(portable.state.values);
  }
  for (const k of BODY) {
    if (k === 'sleepDebtHours') b[modern ? k : 'sleepDebt'] = incoming[k];
    else b[k] = incoming[k as keyof typeof incoming];
  }
  object(state.affect).mood = structuredClone(portable.state.mood);
  return target;
}
