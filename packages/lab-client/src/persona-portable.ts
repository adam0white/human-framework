/** The existing shelf owns transport, registry and CAS. HF owns projection and
 * admission. Games pass actors and keep the complete input in their replay file.
 */
import {
  admitPortablePerson as admit,
  type PortableAdmission,
  type PortableCalendar,
  projectPortablePerson as project,
  validatePortablePerson,
} from '@adam0white/human-framework/portable';
import { canonicalCast } from './cast.ts';
import { boundedPersonaJson, type PersonaEnvelope } from './persona.ts';

// SCOPE: roles bind identity only; clinical, departure and ownership checks still apply.
const SOURCE_ROLES: Record<string, Record<string, string>> = {
  lefthand: {
    'hf.cast.yusuf.well': 'yusuf',
    'hf.cast.tariq.well': 'tariq',
    'hf.cast.idris.well': 'idris',
    'hf.cast.samira.well': 'samira',
    'hf.cast.danyal.well': 'danyal',
  },
  goodhands: {
    'hf.cast.nermin.goodhands': 'nermin',
    'hf.cast.hatice.hearsay': 'hatice',
    'hf.cast.hulya.pass': 'hulya',
    'hf.cast.aylin.murmur': 'aylin',
    'hf.cast.derya.stairwell': 'derya',
    'hf.cast.zeynep.pass': 'zeynep-pass',
    'hf.cast.selin.voice': 'selin-voice',
  },
  pass: {
    'hf.cast.selim.pass': 'selim',
    'hf.cast.dilek.pass': 'dilek',
    'hf.cast.rafi.pass': 'rafi',
    'hf.cast.zeynep.pass': 'zeynep',
    'hf.cast.hulya.pass': 'hulya',
    'hf.cast.murat.murmur': 'murat',
    'hf.cast.sam.smallworks': 'sam',
  },
  murmur: {
    'hf.cast.dilan.murmur': 'dilan',
    'hf.cast.aylin.murmur': 'aylin',
    'hf.cast.ece.murmur': 'ece',
    'hf.cast.murat.murmur': 'murat',
  },
  stairwell: {
    'hf.cast.hacer.voice': 'hacer',
    'hf.cast.sevim.stairwell': 'sevim',
    'hf.cast.burak.stairwell': 'burak',
    'hf.cast.derya.stairwell': 'derya',
    'hf.cast.tarik.stairwell': 'tarik',
  },
  commonstead: { 'hf.cast.burak.stairwell': 'hf.cast.burak.stairwell' },
  days: {
    'hf.cast.hacer.voice': 'hf.cast.hacer.voice',
    'hf.cast.selin.voice': 'hf.cast.selin.voice',
    'hf.cast.burak.stairwell': 'hf.cast.burak.stairwell',
  },
};
function role(game: string, castId: string, actorId: unknown): boolean {
  return SOURCE_ROLES[game]?.[castId] === actorId;
}
export const PORTABLE_PASSPORT = 'hf-portable-person/1';
const limitation =
  'Approximate chapter state: traits, values, body resources and mood continue. History is a bounded source summary, not new memories or proof of events. Local roles, skills, ties, beliefs, age, clocks and RNG are authored by the receiving game. Depletion is represented conservatively as sleep pressure; clinical conflicts and unresolved duties refuse entry.';
/** A marker is not admission. Unknown portable versions are refused, never sent
 * through a legacy adapter by accident. */
export function portablePassport(parent: PersonaEnvelope): boolean {
  return String(parent.transfer.castPassport).startsWith('hf-portable-person/');
}
function read(parent: PersonaEnvelope) {
  boundedPersonaJson(parent);
  const p = validatePortablePerson(parent.transfer.portable);
  const cast = canonicalCast(parent.castId);
  const claim = parent.transfer.portableClaim;
  if (
    claim !== undefined &&
    (!claim ||
      typeof claim !== 'object' ||
      Array.isArray(claim) ||
      Object.keys(claim).join(',') !== 'game' ||
      !cast.games.includes(String((claim as { game: unknown }).game)))
  )
    throw new Error('This saved arrival has an incompatible receiving chapter. Keep or export it there.');
  if (
    parent.transfer.castPassport !== `hf-portable-person/${p.version}` ||
    parent.terminal ||
    p.castId !== parent.castId ||
    p.castRevision !== parent.castRevision ||
    parent.castRevision !== cast.revision ||
    p.source.game !== parent.source.game ||
    p.source.engine !== parent.source.engine ||
    !cast.games.includes(parent.source.game) ||
    !role(parent.source.game, p.castId, p.source.personId)
  )
    throw new Error(
      'This saved person has an incompatible identity or source chapter. Keep the source chapter or export it.',
    );
  return p;
}
/** One shelf identity/source validator. Ownership is separate from provenance. */
export function portablePersonOwner(parent: PersonaEnvelope): string | undefined {
  read(parent);
  return (parent.transfer.portableClaim as { game: string } | undefined)?.game;
}
export function portablePersonRole(parent: PersonaEnvelope, game: string): string {
  read(parent);
  const target = SOURCE_ROLES[game]?.[parent.castId];
  if (!target)
    throw new Error('This person has no matching authored role here. Keep the source chapter or export it.');
  if (parent.transfer.portableClaim)
    throw new Error('This person still belongs to the receiving chapter. Continue or export it there.');
  return target;
}
export function projectPortablePerson(input: {
  castId: string;
  game: string;
  engine: string;
  person: unknown;
  history: string[];
  previous?: PersonaEnvelope;
  hostObligations?: string[];
  calendar?: PortableCalendar;
  legacyNormProvenance?: Parameters<typeof project>[0]['legacyNormProvenance'];
  legacyNormCatalogue?: readonly unknown[];
}): Record<string, unknown> {
  const cast = canonicalCast(input.castId);
  if (
    input.hostObligations !== undefined &&
    (!Array.isArray(input.hostObligations) || input.hostObligations.length)
  )
    throw new Error(
      'This person still has unfinished responsibilities in this chapter. Finish them here before continuing elsewhere. Your saved history has not been replaced.',
    );
  if (
    !cast.games.includes(input.game) ||
    !role(input.game, input.castId, (input.person as { id?: unknown })?.id)
  )
    throw new Error('This person has no authored chapter in this game.');
  if (
    input.previous &&
    (input.previous.castId !== input.castId ||
      (input.previous.transfer.portableClaim &&
        (input.previous.transfer.portableClaim as { game?: unknown }).game !== input.game))
  )
    throw new Error('This person still belongs to another chapter. Continue or export it there.');
  const previous = input.previous && portablePassport(input.previous) ? read(input.previous) : undefined;
  const portable = project({ ...input, castRevision: cast.revision, previous });
  return {
    castPassport: `hf-portable-person/${portable.version}`,
    portable,
    portableLimitations:
      portable.version === 1
        ? limitation
        : 'Supported history and responsibilities continue with explicit calendar and reference mapping. The source runtime and RNG stay archived.',
  };
}
export function admitPortablePerson<T>(
  parent: PersonaEnvelope,
  game: string,
  opening: T,
  mapping?: PortableAdmission['mapping'],
): T {
  const expected = portablePersonRole(parent, game);
  const p = read(parent);
  const o = opening as { id?: string; identity?: { castId?: string } };
  if (o.id !== expected || (o.identity?.castId !== undefined && o.identity.castId !== parent.castId))
    throw new Error(
      'This person has no matching authored role here. Your saved history has not been replaced.',
    );
  if (p.version === 2) {
    if (!mapping || !opening || typeof opening !== 'object' || !('state' in opening))
      throw new Error('This retained history needs a mapped authored opening.');
    return { ...structuredClone(opening), portable: { person: p, mapping: structuredClone(mapping) } };
  }
  return admit(p, opening);
}
/** Ownership at arrival is not a source checkpoint. A host with new local
 * routines keeps the original projection and locks it to this receiving game
 * until a genuine current-actor departure can pass the projector again. */
export function claimPortablePerson(parent: PersonaEnvelope, game: string): Record<string, unknown> {
  read(parent);
  const cast = canonicalCast(parent.castId);
  const prior = parent.transfer.portableClaim as { game?: unknown } | undefined;
  if (!cast.games.includes(game) || (prior && prior.game !== game))
    throw new Error('This person still belongs to the receiving chapter. Continue or export it there.');
  return { ...parent.transfer, portableClaim: { game } };
}
export { validatePortablePerson };
