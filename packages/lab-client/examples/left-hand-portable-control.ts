import { readFileSync } from 'node:fs';
import {
  createPerson,
  createRun,
  exportRun,
  inspect,
  type PersonAuthoring,
  type Result,
  type RunSpec,
  replay,
} from '@adam0white/human-framework';
import { createPersona } from '../src/persona.ts';
import { admitPortablePerson, claimPortablePerson, projectPortablePerson } from '../src/persona-portable.ts';

const fixture = JSON.parse(
  readFileSync(new URL('../test/fixtures/retained-authoring.json', import.meta.url), 'utf8'),
) as { spec: RunSpec; person: PersonAuthoring };
const need = <T>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};
const castId = 'hf.cast.yusuf.well';
const spec = structuredClone(fixture.spec);
spec.host.id = 'lefthand';
spec.definitions.sources = spec.definitions.sources.map((s) =>
  s.type === 'host' ? { ...s, id: 'lefthand' } : s,
);
const opening = structuredClone(fixture.person);
opening.id = 'yusuf';
opening.identity.castId = castId;
const source = need(createRun(spec));
need(createPerson(source, opening));
const view = need(
  inspect(source, {
    perspective: { kind: 'host' },
    people: ['yusuf'],
    select: ['persona'],
    portable: { person: 'yusuf', castId, castRevision: '1' },
  }),
);
const part = view.people[0]?.parts[0];
if (part?.select !== 'persona' || !('format' in part.value)) throw new Error('Missing portable person');
const portable = part.value;
const parent = await createPersona({
  format: 'hf-persona/1',
  castId,
  castRevision: '1',
  branchId: 'lefthand-control',
  parentRevision: null,
  source: { game: 'lefthand', engine: portable.source.engine, build: 'control', rules: 'portable-2' },
  transfer: { castPassport: `hf-portable-person/${portable.version}`, portable },
  limitations: [],
});
const admitted = admitPortablePerson(parent, 'lefthand', opening, { offsetMs: 0, references: [] });
const target = need(createRun(spec));
need(createPerson(target, admitted));
const archive = exportRun(target);
for (const write of [
  () => claimPortablePerson(parent, 'lefthand'),
  () =>
    projectPortablePerson({
      castId,
      game: 'lefthand',
      engine: portable.source.engine,
      person: archive.current.people.yusuf,
      history: ['Completed the chapter.'],
      calendar: { definition: spec.definitions.calendar, norms: spec.definitions.norms },
    }),
]) {
  let refused = false;
  try {
    write();
  } catch (error) {
    refused = String(error).includes('read-only');
  }
  if (!refused) throw new Error('Closed write gate did not refuse');
}
if (need(replay(archive)).fullHash !== archive.hashes.full) throw new Error('Replay differs');
console.log('Left Hand read-only admission, claim/departure refusal and replay passed');
