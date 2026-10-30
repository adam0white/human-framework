/** Watch-only portable authoring and exact complete source checkpoints. */
import {
  type DeepReadonly,
  exportRun,
  inspect,
  type PersonAuthoring,
  type PortableAdmission,
  type PortablePerson,
} from '@adam0white/human-framework';
import {
  admitPortablePerson,
  canonicalCast,
  canonicalPersona,
  lifeAdmission,
  portablePassport,
  portableWriteBlockers,
} from '@adam0white/lab-client';
import type { CastPersonChapter, SourceCheckpoint } from '../../shared/cast-chapter.ts';
import { type ActorHost, actorRuntime, readActor } from './actor.ts';
import { WATCH_CAST } from './config.ts';
import { refugeVisitPassport } from './refuge-visit.ts';
import type { WatchState } from './state.ts';
export type WatchPersonChapter = CastPersonChapter & {
  mapping?: PortableAdmission['mapping'];
  portable?: PortableAdmission;
};
export function admitWatchPerson(opening: PersonAuthoring, single: WatchPersonChapter): PersonAuthoring {
  const parent = single.input.parent;
  if (!portablePassport(parent))
    throw new Error(
      `${parent.castId}: this older chapter cannot be continued here. Keep a copy of that chapter.`,
    );
  // The old finite Ada passport cannot silently become HF4 care or travel evidence.
  if (parent.transfer.watchCare || parent.transfer.warrenCare)
    throw new Error(
      `${parent.castId}: Kian and Ada must stay together in their earlier chapter. Their care and return journey cannot continue here yet.`,
    );
  const person = admitPortablePerson(parent, 'watch', opening, single.portable?.mapping ?? single.mapping);
  const life = lifeAdmission(single.input, 'watch');
  const task =
    opening.id === 'tamar' || opening.id === 'idris' || opening.id === 'danyal'
      ? single.input.life.assignment === 1
        ? 'mend'
        : 'work'
      : 'work';
  person.state = {
    ...person.state,
    agenda: {
      ...person.state.agenda,
      goals: [
        ...person.state.agenda.goals,
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
  single.initial = canonicalPersona(person);
  return person;
}
/** Freeze one actual quiet HF boundary after the agreed care settles. The retained
 * projection carries its calendar and pending return duty; Ada rides beside it. */
export function captureRefugeDeparture(s: WatchState): boolean {
  if (s.refugeDeparture || s.actors.queued.length) return false;
  const watchCare = refugeVisitPassport(s);
  const person = readActor(s, 'kian');
  if (!watchCare || !person) return false;
  const runtime = actorRuntime(s);
  const castId = WATCH_CAST.kian!;
  const result = inspect(runtime.run, {
    perspective: { kind: 'host' },
    people: ['kian'],
    select: ['persona'],
    portable: { person: 'kian', castId, castRevision: canonicalCast(castId).revision },
  });
  if (!result.ok) {
    if (result.error.code === 'invalid-admission') return false;
    throw new Error(result.error.message);
  }
  const p = result.value.people[0];
  const part = p?.kind === 'host' ? p.parts.find((part) => part.select === 'persona') : undefined;
  if (part?.select !== 'persona' || part.value.version !== 2) return false;
  s.refugeDeparture = {
    person: structuredClone(person),
    watchCare,
    portable: part.value,
    archive: exportRun(runtime.run),
  };
  return true;
}
export async function captureWatchPerson(
  s: ActorHost & { refugeDeparture?: WatchState['refugeDeparture'] },
  castId: string,
  hostObligations: readonly string[],
): Promise<SourceCheckpoint> {
  const role = Object.entries(WATCH_CAST).find(([, cast]) => cast === castId)?.[0];
  if (!role || !s.actors.identities[role]) throw new Error('This person is not present.');
  const blocked = portableWriteBlockers(castId, 'watch');
  if (blocked.length)
    throw new Error(
      `This role is read-only until ${blocked.join(', ')} runs a supported reader with per-person skips. Your saved history has not been replaced.`,
    );
  if (hostObligations.length) {
    const obligations =
      hostObligations.length === 1
        ? hostObligations[0]
        : `${hostObligations.slice(0, -1).join(', ')} and ${hostObligations.at(-1)}`;
    throw new Error(`Finish ${obligations} in this chapter before continuing elsewhere.`);
  }
  const runtime = actorRuntime(s),
    cast = canonicalCast(castId);
  const departure = role === 'kian' ? s.refugeDeparture : undefined;
  let portable: DeepReadonly<PortablePerson> | undefined = departure?.portable;
  if (!portable) {
    const result = runtime.read({
      perspective: { kind: 'host' },
      people: [role],
      select: ['persona'],
      portable: { person: role, castId, castRevision: cast.revision },
    });
    const p = result.people[0],
      part = p?.kind === 'host' ? p.parts.find((part) => part.select === 'persona') : undefined;
    if (part?.select !== 'persona')
      throw new Error('The current person has no supported departure checkpoint.');
    portable = part.value;
  }
  const sourceSnapshot = departure?.archive ?? exportRun(runtime.run);
  const sha256 = Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalPersona(sourceSnapshot))),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  return Object.defineProperty(
    {
      castPassport: `hf-portable-person/${portable.version}`,
      portable,
      ...(departure ? { watchCare: departure.watchCare } : {}),
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
