/** Site host adapter. HF owns portable-state checks; this module owns exact role/action meanings.
 * Coarse life adds an optional assignment goal. It never removes a source project, duty or injury.
 * New chapters only; complete input is stored in exports. Unsupported passports refuse before CAS.
 */
import {
  admitCalendarPersona,
  DEFAULT_NORMS,
  isContinuingCommitment,
  type NormDefinition,
  type Person,
  projectCalendarPersona,
  restore,
  snapshot,
  validateCalendarPersona,
} from '@adam0white/human-framework';
import {
  canonicalCast,
  canonicalPersona,
  type LifePreparation,
  lifeAdmission,
  type PersonaEnvelope,
  type PersonaLife,
  preparePersonaLife,
} from '@adam0white/lab-client';
import { SITE_CAST_NORMS } from './cast-norms.ts';
export interface CastPersonChapter {
  version: 'site-cast/1';
  input: LifePreparation;
  claim?: PersonaEnvelope;
  /** Complete pre-assignment admitted actor at the versioned chapter opening. */
  initial?: string;
}
export interface CastChapter extends CastPersonChapter {
  /** Whole applicable cast, keyed by canonical identity. The top-level input is only a legacy first-entry mirror. */
  people?: Record<string, CastPersonChapter>;
}
export function chapterPeople(chapter: CastChapter): CastPersonChapter[] {
  if (!chapter.people) return [chapter];
  const entries = Object.entries(chapter.people);
  if (!entries.length || entries.length > 8 || entries.some(([id, p]) => p.input.parent.castId !== id))
    throw new Error('Invalid bounded cast collection.');
  return entries.map(([, p]) => p);
}
export function personChapter(
  chapter: CastChapter | undefined,
  castId: string | undefined,
): CastPersonChapter | undefined {
  return chapter && castId ? chapterPeople(chapter).find((p) => p.input.parent.castId === castId) : undefined;
}
export function makeCastChapter(inputs: LifePreparation[], claims: PersonaEnvelope[] = []): CastChapter {
  if (
    !inputs.length ||
    inputs.length > 8 ||
    new Set(inputs.map((p) => p.parent.castId)).size !== inputs.length
  )
    throw new Error('Invalid bounded cast collection.');
  const people = Object.fromEntries(
    inputs.map((input) => [
      input.parent.castId,
      {
        version: 'site-cast/1' as const,
        input,
        ...(claims.find((p) => p.castId === input.parent.castId)
          ? { claim: claims.find((p) => p.castId === input.parent.castId) }
          : {}),
      },
    ]),
  );
  return { ...Object.values(people)[0]!, people };
}
export const SITE_CAST: Record<string, Record<string, string>> = {
  voice: Object.fromEntries(
    ['halil', 'selin', 'riza', 'hacer', 'osman'].map((id) => [id, `hf.cast.${id}.voice`]),
  ),
  well: Object.fromEntries(
    ['maryam', 'yusuf', 'tariq', 'idris', 'samira', 'danyal'].map((id) => [id, `hf.cast.${id}.well`]),
  ),
  watch: {
    tamar: 'hf.cast.tamar.watch',
    kian: 'hf.cast.kian.watch',
    samira: 'hf.cast.samira.well',
    idris: 'hf.cast.idris.well',
    danyal: 'hf.cast.danyal.well',
    meryem: 'hf.cast.meryem.warren',
  },
};
const TASKS: Record<string, Record<string, string[]>> = {
  voice: {
    halil: ['work-repair', 'work-repair'],
    selin: ['work', 'work'],
    riza: ['local-help', 'local-help'],
    hacer: ['housework', 'housework'],
    osman: ['work-market', 'work-market'],
  },
  well: {
    maryam: ['cook', 'gather-grain'],
    yusuf: ['build', 'gather-grain'],
    tariq: ['build', 'build'],
    idris: ['gather-timber', 'gather-timber'],
    samira: ['gather-grain', 'gather-grain'],
    danyal: ['draw-water', 'gather-grain'],
  },
  watch: {
    tamar: ['work', 'mend'],
    kian: ['work', 'work'],
    samira: ['work', 'work'],
    idris: ['work', 'mend'],
    danyal: ['work', 'mend'],
    meryem: ['work', 'work'],
  },
};
const ACTIONS: Record<string, Set<string>> = {
  voice: new Set([
    'work',
    'work-repair',
    'work-extra',
    'work-market',
    'local-help',
    'housework',
    'eat',
    'drink',
    'tea',
    'pray',
    'pray-home',
    'pray-qada',
    'pray-eid',
    'smoke',
    'pay-rent',
    'sleep',
    'talk',
    'call',
  ]),
  well: new Set([
    'eat',
    'drink',
    'sleep',
    'rest',
    'pray',
    'pray-qada',
    'cook',
    'gather-grain',
    'gather-timber',
    'draw-water',
    'build',
    'raise-beam',
    'shutter-house',
    'christian-prayer',
  ]),
  watch: new Set([
    'eat',
    'drink',
    'sleep',
    'rest',
    'pray',
    'pray-qada',
    'work',
    'mend',
    'hold-post',
    'sit-post',
    'pray-post',
  ]),
};
export function castRole(game: string, castId: string): string {
  const id = Object.entries(SITE_CAST[game] ?? {}).find(([, cast]) => cast === castId)?.[0];
  if (!id) throw new Error('This person has no authored role here.');
  return id;
}
/** Author a strict calendar passport at a quiet actual source boundary. Projects and bodies are checked by HF. */
export function siteCastTransfer(game: string, person: Person, extraNorms: NormDefinition[] = []) {
  if (game === 'watch' && (person.now % 1440 < 360 || person.now % 1440 >= 1020))
    throw new Error('The watch is still on duty. Continue to a daylight chapter boundary.');
  if (game === 'watch' && person.id === 'kian')
    throw new Error(
      'Ada’s agreed care arrangement is not supported by this passport. Keep Kian in this chapter.',
    );
  const castId = SITE_CAST[game]?.[person.id];
  if (!castId) throw new Error('Background people do not have cast passports.');
  const personState = calendarProjection(person, extraNorms, 0);
  personState.person.limitations.push(
    'Zero-duration host chapter projection; coarse local life does not simulate travel, resolve duties or recover health.',
  );
  return { person: personState, castPassport: 'site-cast/1', sourceRole: person.id };
}
function calendarProjection(person: Person, extraNorms: NormDefinition[], offset: number) {
  const normCatalog = [...DEFAULT_NORMS, ...extraNorms];
  const identity = (values: string[]) => Object.fromEntries(values.map((id) => [id, id]));
  const retained = person.agenda.commitments.filter((c) => isContinuingCommitment(person.agenda, c));
  const owed = person.agenda.owed ?? [];
  const references = {
    commitments: identity([
      ...retained.flatMap((c) => [c.id, ...(c.makeUpOf ? [c.makeUpOf] : [])]),
      ...owed.flatMap((d) => [d.ofId, ...(d.scheduledAs ? [d.scheduledAs] : [])]),
    ]),
    chains: identity(retained.flatMap((c) => (c.chain ? [c.chain] : []))),
    actions: identity([
      ...retained.flatMap((c) => [...c.actions, ...(c.violatedBy ?? [])]),
      ...owed.flatMap((d) => [...d.actions, ...(d.violatedBy ?? [])]),
    ]),
    entities: identity(
      retained.flatMap((c) => [c.toId, c.targetId].filter((id): id is string => id !== undefined)),
    ),
    norms: identity(normCatalog.map((n) => n.id)),
  };
  return projectCalendarPersona(person, {
    version: 'site-cast-calendar/1',
    skills: identity(Object.keys(person.skills)),
    calendar: { version: 'hf-persona-calendar-map/1', offset, references, sourceNorms: normCatalog },
  });
}
export type SourceCheckpoint = Record<string, unknown> & { readonly sourceSnapshot: unknown };
/** Full actual source checksum is calculated outside HF; raw snapshot stays in source exports, never on the shelf. */
export async function siteCastCheckpoint(
  game: string,
  person: Person,
  norms: NormDefinition[] = [],
): Promise<SourceCheckpoint> {
  const raw = snapshot(person);
  const transfer = siteCastTransfer(game, person, norms);
  const sha256 = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalPersona(raw)))),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  return Object.defineProperty(
    {
      ...transfer,
      checkpoint: { schema: person.schema, sourceMinute: raw.now, rng: structuredClone(raw.rng), sha256 },
    },
    'sourceSnapshot',
    { value: raw, enumerable: false },
  ) as unknown as SourceCheckpoint;
}
/** Validate the complete detached actor before any shelf claim. Never consult fresh defaults at delayed arrival. */
export function prepareSiteInitial(game: string, opening: Person, single: CastPersonChapter): void {
  const actor = admitRawSiteCast(game, opening, single);
  const initial = JSON.stringify(snapshot(actor));
  if (single.initial !== undefined && single.initial !== initial)
    throw new Error('Pinned initial actor differs from semantic preflight.');
  single.initial = initial;
}
/** Versioned zero-duration chapter clock map. Body, acquired state and duties are not lived or healed while away. */
export function admitSiteCast(game: string, opening: Person, chapter: CastChapter): Person {
  const single = personChapter(chapter, SITE_CAST[game]?.[opening.id]);
  if (!single) return opening;
  if (!single.initial) prepareSiteInitial(game, opening, single);
  const pinned = restore(JSON.parse(single.initial!));
  const offset = opening.now - pinned.now;
  if (!Number.isSafeInteger(offset) || offset < 0 || pinned.id !== opening.id)
    throw new Error('Unsupported pinned arrival clock.');
  let actor = pinned;
  if (offset !== 0) {
    const norms = SITE_CAST_NORMS.filter((n) => !DEFAULT_NORMS.some((d) => d.id === n.id));
    const projection = calendarProjection(pinned, norms, offset);
    const target = restore(snapshot(pinned));
    target.now += offset;
    target.life.bornAt += offset;
    target.agenda.commitments = [];
    delete target.agenda.owed;
    delete target.agenda.lapse;
    actor = admitCalendarPersona(projection, target, {
      mappingVersion: 'site-cast-calendar/1',
      sourceId: pinned.id,
      targetId: pinned.id,
      targetNorms: [...DEFAULT_NORMS, ...norms],
    }).person;
  }
  return assignSiteTask(game, actor, single);
}
/** Validate and bind the source passport before claiming. Complete input and resulting people stay pinned. */
function admitRawSiteCast(game: string, opening: Person, chapter: CastPersonChapter): Person {
  if (chapter.version !== 'site-cast/1') throw new Error('Older cast chapter; start fresh.');
  const selected = personChapter(chapter, SITE_CAST[game]?.[opening.id]);
  if (!selected) return opening;
  chapter = selected;
  const { input } = chapter;
  const admission = lifeAdmission(input, game);
  if (canonicalPersona(preparePersonaLife(input.parent, input.clockMs).life) !== canonicalPersona(input.life))
    throw new Error('Life outcomes differ from their pinned clock and parent.');
  const role = castRole(game, input.parent.castId);
  if (
    role !== opening.id ||
    !['site-cast/1', 'authored-cast/1'].includes(String(input.parent.transfer.castPassport))
  )
    throw new Error('This passport needs a host-specific admission. Export it or start a fresh branch.');
  if (input.parent.transfer.castPassport === 'authored-cast/1') return restore(snapshot(opening));
  if (input.parent.transfer.sourceRole !== castRole(input.parent.source.game, input.parent.castId))
    throw new Error('Unsupported source role.');
  const portable = validateCalendarPersona(input.parent.transfer.person);
  const checkpoint = input.parent.transfer.checkpoint as
    | { schema?: unknown; sourceMinute?: unknown; rng?: unknown; sha256?: unknown }
    | undefined;
  if (
    !checkpoint ||
    Object.keys(checkpoint).sort().join(',') !== 'rng,schema,sha256,sourceMinute' ||
    checkpoint.schema !== portable.person.source.schema ||
    checkpoint.sourceMinute !== portable.person.source.now ||
    canonicalPersona(checkpoint.rng) !== canonicalPersona(portable.person.rng) ||
    typeof checkpoint.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(checkpoint.sha256)
  )
    throw new Error('Missing or incompatible full-source checkpoint receipt.');
  if (portable.person.source.id !== input.parent.transfer.sourceRole)
    throw new Error('Source identity differs from passport.');
  const knownNorms = portable.calendar.norms.map((norm) => {
    const known = SITE_CAST_NORMS.find((n) => n.id === norm.id);
    if (!known || JSON.stringify(known) !== JSON.stringify(norm))
      throw new Error('Unsupported source norm meaning.');
    return known;
  });
  const allowed = ACTIONS[game];
  if (
    !allowed ||
    portable.calendar.commitments.some((c) =>
      [...c.actions, ...(c.violatedBy ?? [])].some((a) => !allowed.has(a)),
    ) ||
    portable.calendar.owed.some((d) => [...d.actions, ...(d.violatedBy ?? [])].some((a) => !allowed.has(a)))
  )
    throw new Error('A source duty has no supported action here. Keep that chapter or export it.');
  // Rebase every retained calendar timestamp by the declared zero-duration chapter boundary.
  const shifted = structuredClone(portable);
  const offset = opening.now - portable.person.source.now;
  shifted.calendar.offset = offset;
  for (const c of shifted.calendar.commitments) {
    c.from += offset;
    c.until += offset;
    if (c.recurUntil !== undefined) c.recurUntil += offset;
    if (c.exempt) c.exempt.at += offset;
  }
  for (const d of shifted.calendar.owed) {
    d.at += offset;
    if (d.lapseSince !== undefined) d.lapseSince += offset;
  }
  if (shifted.calendar.lapse) shifted.calendar.lapse.since += offset;
  const target = restore(snapshot(opening));
  // Fitness is an approved portable field, as in the dedicated Selin return. Clinical health and
  // circadian compatibility remain exact; injury/death and other body conflicts are not repaired.
  target.body.fitness = portable.person.health.fitness;
  const sourceAge = portable.person.source.now - portable.person.life.bornAt;
  const minimumAge = canonicalCast(input.parent.castId).age * 525600;
  if (sourceAge < minimumAge || sourceAge > minimumAge + 200 * 525600)
    throw new Error('Unsupported canonical age provenance.');
  target.life.bornAt = portable.person.life.bornAt + offset;
  const allowedSkills = new Set(Object.keys(target.skills));
  const archivedSkills = Object.keys(shifted.person.skills).filter((id) => !allowedSkills.has(id));
  for (const id of archivedSkills) delete shifted.person.skills[id];
  if (archivedSkills.length)
    shifted.person.limitations.push(
      `Source retains skills without a target meaning: ${archivedSkills.join(', ')}`,
    );
  // This is a new authored opening. Source calendars replace its unplayed default calendar only.
  target.agenda.commitments = [];
  delete target.agenda.owed;
  delete target.agenda.lapse;
  const { person } = admitCalendarPersona(shifted, target, {
    mappingVersion: 'site-cast-calendar/1',
    sourceId: portable.person.source.id,
    targetId: role,
    targetNorms: knownNorms,
  });
  return person;
}
function assignSiteTask(game: string, person: Person, chapter: CastChapter): Person {
  const input = chapter.input;
  const role = castRole(game, input.parent.castId);
  const admission = lifeAdmission(input, game);
  const task = TASKS[game]?.[role]?.[input.life.assignment];
  if (task)
    person.agenda.goals.push({
      id: 'between-games-assignment',
      label: admission.assignment,
      serves: ['competence'],
      advancedBy: [{ action: task, amount: 0.25 }],
      importance: 0.35,
      progress: 0,
      status: 'active',
      adoptedAt: person.now,
    });
  for (const event of input.life.events.filter((e) => e.kind === 'contact')) {
    const peer = canonicalCast(event.detail);
    person.memory.episodes.push({
      id: `cast-note:${input.parent.branchId}:${event.slot}:${peer.castId}`,
      at: person.now,
      kind: 'cast-notice',
      actorId: peer.castId,
      valence: 0,
      salience: 0.4,
      summary: `${person.name} read a public work note from ${peer.name}: ${peer.work}. Only the reader’s encounter is recorded.`,
      tags: ['social', 'work'],
    });
  }
  return person;
}
export function castLife(chapter: CastChapter | undefined, castId: string): PersonaLife | undefined {
  const selected = personChapter(chapter, castId);
  return selected ? structuredClone(selected.input.life) : undefined;
}
export function castOpeningLine(chapter: CastChapter | undefined, game: string): string | undefined {
  return chapter
    ? chapterPeople(chapter)
        .map((p) => lifeAdmission(p.input, game).line)
        .join(' ')
    : undefined;
}
export function castEdition(castId: string): string {
  return canonicalCast(castId).revision;
}
/** Public notice observations remain one-sided and carry no bond or truth about another person's private life. */
export function lifeNotice(person: Person): string | undefined {
  return person.memory.episodes.find((e) => e.kind === 'cast-notice')?.summary;
}
export function applyLifeOffers(
  game: string,
  person: Person,
  offers: import('@adam0white/human-framework').Affordance[],
  chapter?: CastChapter,
): void {
  const selected = personChapter(chapter, SITE_CAST[game]?.[person.id]);
  if (!selected) return;
  chapter = selected;
  const admission = lifeAdmission(chapter.input, game);
  const task = TASKS[game]?.[person.id]?.[chapter.input.life.assignment];
  for (const offer of offers) {
    if (offer.action === task) {
      offer.label = admission.assignment;
      if (admission.availableForExtraWork)
        offer.advertises = { ...offer.advertises, competence: (offer.advertises?.competence ?? 0) + 0.04 };
    }
    if (game === 'voice' && offer.action === 'rest')
      offer.placeId = admission.startsAtHome
        ? `${person.id}-home`
        : chapter.input.life.place === 'local-workplace'
          ? 'workshop'
          : 'public-garden';
  }
}
type CaptureWorld = import('@adam0white/human-framework').World;
type BoundaryRequest = { person: Person; capture(): void };
const boundaryCaptures = new WeakMap<
  CaptureWorld,
  {
    requests: Set<BoundaryRequest>;
    original: CaptureWorld['affordancesFor'];
    wrapper: CaptureWorld['affordancesFor'];
  }
>();
/** Read-only capture before the next actual decision. Preview clones cannot satisfy identity.
 * One dispatcher per world supports the bounded cast without retaining completed wrapper chains.
 * The current activity finishes normally; offers and actor/RNG state are unchanged.
 */
export function captureSiteCastBoundary(
  game: string,
  person: Person,
  world: CaptureWorld,
  norms: NormDefinition[] = [],
): Promise<SourceCheckpoint> {
  if (person.agenda.goals.some((g) => g.status === 'active') || person.projects?.currentGoalId)
    return Promise.reject(
      new Error(
        'This person still has an active project. Finish it in this chapter before continuing elsewhere.',
      ),
    );
  if (!person.activity) return siteCastCheckpoint(game, person, norms);
  let dispatcher = boundaryCaptures.get(world);
  if (!dispatcher) {
    const original = world.affordancesFor;
    const requests = new Set<BoundaryRequest>();
    const wrapper: CaptureWorld['affordancesFor'] = function (this: CaptureWorld, p) {
      if (!p.activity) for (const request of [...requests]) if (request.person === p) request.capture();
      return original.call(this, p);
    };
    dispatcher = { requests, original, wrapper };
    boundaryCaptures.set(world, dispatcher);
    world.affordancesFor = wrapper;
  }
  const current = dispatcher;
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      current.requests.delete(request);
      if (!current.requests.size) {
        if (world.affordancesFor === current.wrapper) world.affordancesFor = current.original;
        boundaryCaptures.delete(world);
      }
    };
    const request: BoundaryRequest = {
      person,
      capture: () => {
        try {
          const transfer = siteCastCheckpoint(game, person, norms);
          cleanup();
          void transfer.then(resolve, reject);
        } catch (e) {
          cleanup();
          reject(e);
        }
      },
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          'No quiet boundary was reached. Close the menu and continue play, then request another checkpoint.',
        ),
      );
    }, 55000);
    current.requests.add(request);
  });
}

/** Apply pinned coarse facts only after a host-specific passport has passed its full semantic admission. */
export function applyAdmittedLife(game: string, person: Person, input: LifePreparation): Person {
  if (canonicalPersona(preparePersonaLife(input.parent, input.clockMs).life) !== canonicalPersona(input.life))
    throw new Error('Life input differs from its pinned parent/clock.');
  return assignSiteTask(game, person, { version: 'site-cast/1', input });
}
