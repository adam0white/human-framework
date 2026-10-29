/** Well-only new-opening admission and source capture. A refusal never substitutes a retained person.
 * The SDK owns identity checks and the generalized peer-reader write gate.
 */
import {
  exportRun,
  inspect,
  type PersonAuthoring,
  type PortableAdmission,
} from '@adam0white/human-framework';
import {
  admitPortablePerson,
  canonicalCast,
  canonicalPersona,
  lifeAdmission,
  portablePassport,
  portableWriteBlockers,
} from '@adam0white/lab-client';
import type { CastChapter, CastPersonChapter, SourceCheckpoint } from '../../shared/cast-chapter.ts';
import type { Community } from './hf4.ts';
import { need } from './hf4.ts';
import { ROLE_GOALS } from './human-cast.ts';
import type { VillagerId } from './world-types.ts';
export const WELL_LIFE_TASKS: Record<VillagerId, readonly string[]> = {
  maryam: ['cook', 'gather-grain'],
  yusuf: ['build', 'gather-grain'],
  tariq: ['build', 'build'],
  idris: ['gather-timber', 'gather-timber'],
  samira: ['gather-grain', 'gather-grain'],
  danyal: ['draw-water', 'gather-grain'],
};
export type WellPersonChapter = CastPersonChapter & {
  mapping?: PortableAdmission['mapping'];
  portable?: PortableAdmission;
};
export function wellChapterPeople(chapter: CastChapter): WellPersonChapter[] {
  const entries = chapter.people
    ? Object.entries(chapter.people)
    : [[chapter.input.parent.castId, chapter] as const];
  if (!entries.length || entries.length > 8 || entries.some(([id, p]) => id !== p.input.parent.castId))
    throw new Error('Invalid bounded cast collection.');
  return entries.map(([, p]) => p);
}
export function admitWellPerson(opening: PersonAuthoring, single: WellPersonChapter): PersonAuthoring {
  const parent = single.input.parent;
  if (!portablePassport(parent))
    throw new Error(
      `${parent.castId}: this older source has no supported HF4 portable history. Keep or export its source chapter.`,
    );
  const authoring = admitPortablePerson(parent, 'well', opening, single.portable?.mapping ?? single.mapping);
  const life = lifeAdmission(single.input, 'well');
  const task = WELL_LIFE_TASKS[opening.id as VillagerId]?.[single.input.life.assignment];
  if (task)
    authoring.state = {
      ...authoring.state,
      agenda: {
        ...authoring.state.agenda,
        goals: [
          ...authoring.state.agenda.goals,
          {
            id: 'between-games-assignment',
            label: life.assignment,
            serves: ['competence'],
            advancedBy: [{ action: task, amount: 0.25 }],
            importance: 0.35,
            baseImportance: 0.35,
            progress: 0,
            completionHalfLifeMs: 86400000,
          },
        ],
      },
    };
  // Pin the actual admitted authoring, including the source projection and mapping, for preflight/replay.
  single.initial = canonicalPersona(authoring);
  return authoring;
}
export async function captureWellPerson(
  c: Community,
  castId: string,
  hostObligations: readonly string[],
): Promise<SourceCheckpoint> {
  const cast = canonicalCast(castId);
  const role = castId.replace(/^hf\.cast\./, '').replace(/\.well$/, '');
  if (!Object.hasOwn(ROLE_GOALS, role)) throw new Error('This person is not present.');
  const blocked = portableWriteBlockers(castId, 'well');
  if (blocked.length)
    throw new Error(
      `This role is read-only until ${blocked.join(', ')} runs a supported reader with per-person skips. Your saved history has not been replaced.`,
    );
  if (hostObligations.length)
    throw new Error(`Finish ${hostObligations.join(', ')} in this chapter before continuing elsewhere.`);
  const result = need(
    inspect(c.run, {
      perspective: { kind: 'host' },
      people: [role],
      select: ['persona'],
      portable: { person: role, castId, castRevision: cast.revision },
    }),
  );
  const part =
    result.people[0]?.kind === 'host'
      ? result.people[0].parts.find((p) => p.select === 'persona')
      : undefined;
  if (!part || part.select !== 'persona')
    throw new Error('The current person has no supported departure checkpoint.');
  const sourceSnapshot = exportRun(c.run);
  const sha256 = Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalPersona(sourceSnapshot))),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  return Object.defineProperty(
    {
      castPassport: `hf-portable-person/${part.value.version}`,
      portable: part.value,
      sourceRole: castId.split('.')[2],
      checkpoint: {
        kind: 'hf-run/1',
        engine: sourceSnapshot.engine,
        sourceAt: sourceSnapshot.current.at,
        person: role,
        sha256,
      },
    },
    'sourceSnapshot',
    { value: sourceSnapshot, enumerable: false },
  ) as unknown as SourceCheckpoint;
}
