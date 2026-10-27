/**
 * Bounded host-authored coarse life. No Person mutation, health recovery, duty settlement, secret
 * disclosure, qualification or full lived-day claim. Only new chapters consume this pinned input. Assignment changes stay inside the authored occupation and qualifications; minors remain supervised. No work completion or payment is asserted. Existing obligations still take precedence.
 */
import { advanceChapterClock, type ChapterClock, createChapterClock } from '@adam0white/hf-legacy';
import { CANONICAL_CAST, canonicalCast } from './cast.ts';
import { boundedPersonaJson, createPersona, type PersonaEnvelope, type PersonaRequest } from './persona.ts';

export interface PersonaLife {
  version: 'hf-coarse-life/1';
  clock: ChapterClock;
  assignment: number;
  work: 'own-routine' | 'local-help' | 'free-time';
  place: 'home' | 'local-workplace' | 'public-garden';
  notices: string[];
  events: { slot: number; kind: 'work' | 'place' | 'contact'; detail: string }[];
  skipped: number;
}
export interface LifePreparation {
  parent: PersonaEnvelope;
  life: PersonaLife;
  /** The exact quantized clock admitted to the new chapter. Never re-read it during replay. */
  clockMs: number;
}
const WORK = ['own-routine', 'local-help', 'free-time'] as const;
const PLACE = ['home', 'local-workplace', 'public-garden'] as const;
function seedOf(text: string): number {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}
export function initialPersonaLife(castId: string, branchId: string, nowMs: number): PersonaLife {
  canonicalCast(castId);
  return {
    version: 'hf-coarse-life/1',
    clock: createChapterClock(seedOf(`${castId}/${branchId}`), nowMs),
    assignment: 0,
    work: 'own-routine',
    place: 'home',
    notices: [],
    events: [],
    skipped: 0,
  };
}
export function validatePersonaLife(value: unknown, castId: string): PersonaLife {
  boundedPersonaJson(value);
  const p = canonicalCast(castId);
  const life = value as PersonaLife;
  if (
    life?.version !== 'hf-coarse-life/1' ||
    Object.keys(life).sort().join(',') !== 'assignment,clock,events,notices,place,skipped,version,work' ||
    !Number.isSafeInteger(life.assignment) ||
    life.assignment < 0 ||
    life.assignment >= p.assignments.length ||
    !WORK.includes(life.work) ||
    !PLACE.includes(life.place) ||
    !Number.isSafeInteger(life.skipped) ||
    life.skipped < 0 ||
    !Array.isArray(life.notices) ||
    life.notices.length > 8 ||
    new Set(life.notices).size !== life.notices.length ||
    !life.notices.every(
      (id) =>
        id !== castId &&
        CANONICAL_CAST.some(
          (q) => q.castId === id && q.cohort === p.cohort && q.games.some((g) => p.games.includes(g)),
        ),
    ) ||
    !Array.isArray(life.events) ||
    life.events.length > 24 ||
    !life.events.every(
      (e) =>
        Number.isSafeInteger(e.slot) &&
        e.slot >= 0 &&
        ['work', 'place', 'contact'].includes(e.kind) &&
        typeof e.detail === 'string' &&
        e.detail.length <= 240,
    )
  )
    throw new Error('Unsupported coarse life record.');
  advanceChapterClock(life.clock, life.clock.watermark * 3_600_000);
  return structuredClone(life);
}
/** New-return calculation. Stable roster order and absolute-slot draws make storage order irrelevant. */
export function preparePersonaLife(parent: PersonaEnvelope, nowMs: number): LifePreparation {
  if (parent.terminal)
    throw new Error('This branch is closed by an actual death. Choose an explicit alternate fresh branch.');
  const p = canonicalCast(parent.castId);
  if (parent.castRevision !== p.revision)
    throw new Error('This person uses an older cast edition. Export it or choose an explicit fresh branch.');
  const life =
    parent.transfer.life === undefined
      ? initialPersonaLife(parent.castId, parent.branchId, nowMs)
      : validatePersonaLife(parent.transfer.life, parent.castId);
  const advance = advanceChapterClock(life.clock, nowMs);
  const peers = CANONICAL_CAST.filter(
    (q) => q.castId !== p.castId && q.cohort === p.cohort && q.games.some((g) => p.games.includes(g)),
  ).sort((a, b) => a.castId.localeCompare(b.castId));
  for (const slot of advance.slots) {
    const index = Math.min(2, Math.floor(slot.draw * 3));
    if (slot.at % 3 === 0) {
      const changeChance = 0.15 + p.traits.openness * 0.25 + p.values.stimulation * 0.15;
      if (slot.draw < changeChance) life.assignment = (life.assignment + 1) % p.assignments.length;
      life.work =
        slot.draw < 0.25 + p.traits.conscientiousness * 0.4
          ? 'own-routine'
          : slot.draw < 0.85
            ? 'local-help'
            : 'free-time';
      life.events.push({ slot: slot.at, kind: 'work', detail: p.assignments[life.assignment] ?? p.work });
    } else if (slot.at % 3 === 1) {
      life.place = PLACE[index] ?? 'home';
      life.events.push({ slot: slot.at, kind: 'place', detail: life.place });
    } else {
      const peer = peers[seedOf(`${life.clock.seed}/${slot.at}/peer`) % peers.length];
      if (peer && slot.draw < 0.2 + p.traits.extraversion * 0.5) {
        life.notices = [...life.notices.filter((id) => id !== peer.castId), peer.castId].slice(-8);
        life.events.push({ slot: slot.at, kind: 'contact', detail: peer.castId });
      }
    }
  }
  life.clock = advance.clock;
  life.skipped += advance.skipped;
  if (!Number.isSafeInteger(life.skipped))
    throw new Error('Coarse life omitted count exceeds supported bounds.');
  life.events = life.events.slice(-24);
  return { parent: structuredClone(parent), life, clockMs: life.clock.watermark * 3_600_000 };
}
/** Checkpoints move only the monotone absence anchor. They cannot replay a prior coarse interval. */
export function anchorPersonaLife(life: PersonaLife, castId: string, nowMs: number): PersonaLife {
  const pinned = validatePersonaLife(life, castId);
  pinned.clock.watermark = Math.max(
    pinned.clock.watermark,
    createChapterClock(pinned.clock.seed, nowMs).watermark,
  );
  return pinned;
}
/** Admission facts affect host opening offers; occupation and qualifications remain separately authored. */
export function lifeAdmission(prepared: LifePreparation, game: string) {
  const cast = canonicalCast(prepared.parent.castId);
  if (!cast.games.includes(game)) throw new Error('This person has no authored chapter in this game.');
  return {
    cast,
    life: validatePersonaLife(prepared.life, cast.castId),
    assignment: cast.assignments[prepared.life.assignment] ?? cast.work,
    availableForExtraWork: prepared.life.work === 'free-time',
    startsAtHome: prepared.life.place === 'home',
    /** One-sided written encounter; no reciprocal knowledge, trust or bond is granted. */
    contacts: prepared.life.notices.map((id) => canonicalCast(id).name),
    line: `${cast.name} is assigned to ${cast.assignments[prepared.life.assignment]}. They have ${prepared.life.work === 'local-help' ? 'set aside time for local help' : prepared.life.work === 'free-time' ? 'left some time free' : 'kept time for their own routine'}. Their last local stop was ${prepared.life.place.replaceAll('-', ' ')}.${prepared.life.notices.length ? ` They read public work notes from ${prepared.life.notices.map((id) => canonicalCast(id).name).join(', ')}; the writers’ perspectives are unrecorded.` : ''}`,
  };
}

export interface CastShelf {
  request<T>(request: PersonaRequest): Promise<T>;
}
/**
 * Fresh-run only. The callback must validate/admit the actual passport and pin the complete initial
 * host state before a claim is made. A callback failure or losing CAS starts no game. Never retry a
 * conflict with a newer head. Recording linkage must be gated by the host before calling this helper.
 */
export async function claimCastChapter<T>(
  shelf: CastShelf,
  castId: string,
  source: PersonaEnvelope['source'],
  admit: (prepared: LifePreparation) => Promise<T>,
  options: { isCurrent?: () => boolean } = {},
): Promise<{ initial: T; claim: PersonaEnvelope; input: LifePreparation } | null> {
  const requireCurrent = () => {
    if (options.isCurrent && !options.isCurrent())
      throw new Error('The run or identity changed. Choose again.');
  };
  requireCurrent();
  const input = await shelf.request<LifePreparation | null>({ action: 'prepare', castId });
  if (!input) return null;
  requireCurrent();
  lifeAdmission(input, source.game);
  const initial = await admit(structuredClone(input));
  const { revision, ...body } = input.parent;
  const claim = await createPersona({
    ...body,
    parentRevision: revision,
    source,
    transfer: { ...body.transfer, life: input.life },
  });
  requireCurrent();
  await shelf.request({ action: 'put', envelope: claim });
  requireCurrent();
  return { initial, claim, input };
}

export interface LifeBatchPreparation {
  expectedHeads: Record<string, string | null>;
  inputs: LifePreparation[];
  blocked: { castId: string; reason: string }[];
}
/** Fresh whole-cast admission: semantic validation precedes one atomic acceptance. */
export async function claimCastChapterBatch<T>(
  shelf: CastShelf,
  castIds: string[],
  source: PersonaEnvelope['source'],
  admit: (inputs: LifePreparation[]) => Promise<T>,
  options: {
    isCurrent?: () => boolean;
    claimTransfer?: (initial: T, input: LifePreparation) => Record<string, unknown>;
  } = {},
) {
  const current = () => {
    if (options.isCurrent && !options.isCurrent())
      throw new Error('The run or identity changed. Choose again.');
  };
  current();
  const batch = await shelf.request<LifeBatchPreparation>({ action: 'prepareBatch', castIds });
  current();
  if (!batch.expectedHeads || castIds.some((id) => !Object.hasOwn(batch.expectedHeads, id)))
    throw new Error('The batch omitted expected cast parents.');
  if (batch.blocked.length) throw new Error(batch.blocked.map((p) => `${p.castId}: ${p.reason}`).join(' '));
  if (!batch.inputs.length) {
    await shelf.request({ action: 'putBatch', envelopes: [], expectedHeads: batch.expectedHeads });
    current();
    return null;
  }
  for (const input of batch.inputs) lifeAdmission(input, source.game);
  const initial = await admit(structuredClone(batch.inputs));
  const claims = await Promise.all(
    batch.inputs.map(async (input) => {
      const { revision, ...body } = input.parent;
      return createPersona({
        ...body,
        parentRevision: revision,
        source,
        transfer: {
          ...(options.claimTransfer ? options.claimTransfer(initial, input) : body.transfer),
          life: input.life,
        },
      });
    }),
  );
  current();
  await shelf.request({ action: 'putBatch', envelopes: claims, expectedHeads: batch.expectedHeads });
  current();
  return { initial, claims, inputs: batch.inputs };
}
