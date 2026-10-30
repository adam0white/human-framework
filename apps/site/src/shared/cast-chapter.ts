/** Shared chapter transport and authored cast identities. Actor admission belongs to each public HF4 host. */
import type { LifePreparation, PersonaEnvelope } from '@adam0white/lab-client';
import { requireValue } from './require-value.ts';

export interface CastPersonChapter {
  version: 'site-cast/1';
  input: LifePreparation;
  claim?: PersonaEnvelope;
  /** Complete pre-assignment admitted actor at the versioned chapter opening. */
  initial?: string;
  mapping?: import('@adam0white/human-framework').PortableAdmission['mapping'];
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
  return { ...requireValue(Object.values(people)[0]), people };
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
export function castRole(game: string, castId: string): string {
  const id = Object.entries(SITE_CAST[game] ?? {}).find(([, cast]) => cast === castId)?.[0];
  if (!id) throw new Error('This person has no authored role here.');
  return id;
}
export type SourceCheckpoint = Record<string, unknown> & { readonly sourceSnapshot: unknown };
