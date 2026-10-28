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
const held = { ...parent, transfer: claimPortablePerson(parent, 'lefthand') };
let locked = false;
try {
  admitPortablePerson(held, 'lefthand', opening, { offsetMs: 0, references: [] });
} catch {
  locked = true;
}
if (!locked) throw new Error('Arrival was not locked');
const archive = exportRun(target);
const transfer = projectPortablePerson({
  castId,
  game: 'lefthand',
  engine: portable.source.engine,
  person: archive.current.people.yusuf,
  history: ['Completed the chapter.'],
  previous: held,
  calendar: { definition: spec.definitions.calendar, norms: spec.definitions.norms },
});
const departed = { ...held, transfer };
admitPortablePerson(departed, 'lefthand', opening, { offsetMs: 0, references: [] });
if (need(replay(archive)).fullHash !== archive.hashes.full) throw new Error('Replay differs');
console.log('Left Hand projection, admission, lock, departure and replay passed');
