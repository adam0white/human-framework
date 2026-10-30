/** Voice's public new-opening portable route. The SDK retains identity and peer-reader write gates. */
import type { PersonAuthoring, PortableAdmission } from '@adam0white/human-framework';
import {
  admitPortablePerson,
  canonicalCast,
  canonicalPersona,
  lifeAdmission,
  portablePassport,
  portableWriteBlockers,
} from '@adam0white/lab-client';
import type { CastChapter, CastPersonChapter, SourceCheckpoint } from '../../shared/cast-chapter.ts';
import type { VoiceRun } from './hf4-run.ts';

export type VoicePersonChapter = CastPersonChapter & {
  mapping?: PortableAdmission['mapping'];
  portable?: PortableAdmission;
};
export function voiceChapterPeople(chapter: CastChapter): VoicePersonChapter[] {
  const entries = chapter.people
    ? Object.entries(chapter.people)
    : [[chapter.input.parent.castId, chapter] as const];
  if (
    !entries.length ||
    entries.length > 8 ||
    entries.some(([id, person]) => id !== person.input.parent.castId)
  )
    throw new Error('Invalid bounded cast collection.');
  return entries.map(([, person]) => person);
}
const ASSIGNMENTS: Record<string, readonly string[]> = {
  halil: ['work-repair', 'walk'],
  selin: ['work', 'call'],
  riza: ['local-help', 'talk'],
  hacer: ['housework', 'talk'],
  osman: ['work-market', 'collect-rent'],
};
export function admitVoicePerson(opening: PersonAuthoring, single: VoicePersonChapter): PersonAuthoring {
  const parent = single.input.parent;
  if (!portablePassport(parent) || parent.transfer.castPassport !== 'hf-portable-person/2')
    throw new Error(
      `${parent.castId}: this older source has no supported HF4 portable history. Keep or export its source chapter.`,
    );
  const admitted = admitPortablePerson(parent, 'voice', opening, single.portable?.mapping ?? single.mapping);
  const life = lifeAdmission(single.input, 'voice');
  const task = ASSIGNMENTS[opening.id]?.[single.input.life.assignment];
  if (task)
    admitted.state = {
      ...admitted.state,
      agenda: {
        ...admitted.state.agenda,
        goals: [
          ...admitted.state.agenda.goals,
          {
            id: 'between-games-assignment',
            label: life.assignment,
            serves: ['competence'],
            advancedBy: [{ action: task, amount: 0.25 }],
            importance: 0.35,
            baseImportance: 0.35,
            progress: 0,
            completionHalfLifeMs: 86_400_000,
          },
        ],
      },
    };
  const initial = canonicalPersona(admitted);
  if (single.initial !== undefined && single.initial !== initial)
    throw new Error(
      `${parent.castId}: the admitted opening differs from the saved chapter. Keep the source file.`,
    );
  single.initial = initial;
  return admitted;
}
export async function captureVoicePerson(
  runtime: VoiceRun,
  castId: string,
  hostObligations: readonly string[],
): Promise<SourceCheckpoint> {
  const cast = canonicalCast(castId);
  const role = castId.replace(/^hf\.cast\./, '').replace(/\.voice$/, '');
  if (!Object.hasOwn(ASSIGNMENTS, role)) throw new Error('This person is not present.');
  const blocked = portableWriteBlockers(castId, 'voice');
  if (blocked.length)
    throw new Error(
      `This role is read-only until ${blocked.join(', ')} runs a supported reader with per-person skips. Your saved history has not been replaced.`,
    );
  if (hostObligations.length)
    throw new Error(`Finish ${hostObligations.join(', ')} in this chapter before continuing elsewhere.`);
  if (
    runtime.active.has(role) ||
    runtime.pending.some((request) =>
      request.kind === 'action'
        ? request.person === role || request.participants.includes(role)
        : request.speaker === role || request.recipients.includes(role),
    )
  )
    throw new Error('This person is still occupied. Continue to a quiet chapter boundary first.');
  const result = runtime.inspect({
    perspective: { kind: 'host' },
    people: [role],
    select: ['persona'],
    portable: { person: role, castId, castRevision: cast.revision },
  });
  const person = result.people[0];
  const portable =
    person?.kind === 'host' ? person.parts.find((part) => part.select === 'persona') : undefined;
  if (portable?.select !== 'persona')
    throw new Error('The current person has no supported departure checkpoint.');
  const sourceSnapshot = runtime.save().archive;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalPersona(sourceSnapshot)),
  );
  const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return Object.defineProperty(
    {
      castPassport: `hf-portable-person/${portable.value.version}`,
      portable: portable.value,
      sourceRole: role,
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

export function voiceTerminal(runtime: VoiceRun, role: string): boolean {
  const result = runtime.inspect({ perspective: { kind: 'host' }, people: [role], select: ['summary'] });
  const person = result.people[0];
  if (person?.kind !== 'host') throw new Error('Voice could not read its current person.');
  const summary = person.parts.find((p) => p.select === 'summary');
  if (summary?.select !== 'summary') throw new Error('Voice did not receive its person summary.');
  return !summary.value.alive;
}
