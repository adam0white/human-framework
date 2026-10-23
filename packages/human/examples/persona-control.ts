/** Two unrelated hosts admit the same approved cooking evidence. Run with Node >=24. */
import {
  admitPersona,
  createPerson,
  fingerprint,
  projectPersona,
  restore,
  snapshot,
  successChance,
} from '../src/index.ts';

export function runPersonaControl() {
  const source = createPerson({
    id: 'worker',
    name: 'Guest',
    seed: 19,
    now: 1440,
    bornAt: -1000000,
    sex: 'female',
  });
  source.skills.preparation = { level: 0.85, practice: 600, lastPracticed: 1400 };
  source.skills.unrelated = { level: 0.9, practice: 500, lastPracticed: 1400 };
  const before = fingerprint(source);
  const portable = projectPersona(source, {
    version: 'control/1',
    skills: { preparation: 'shared-preparation' },
  });
  function host(id: string, seed: number) {
    const opening = createPerson({
      id,
      name: source.name,
      seed,
      now: 2880,
      bornAt: source.life.bornAt + 1440,
      sex: source.life.sex,
    });
    return admitPersona(portable, opening, { mappingVersion: 'control/1', sourceId: source.id, targetId: id })
      .person;
  }
  const a = host('household', 31),
    b = host('canteen', 73);
  const chance = (p: typeof a, skill: string) => successChance(p, skill, 0.6, 1);
  const result = {
    sourceUntouched: before === fingerprint(source),
    sameEvidence: JSON.stringify(a.skills) === JSON.stringify(b.skills),
    sameRng: JSON.stringify(a.rng) === JSON.stringify(b.rng),
    roundtrip: fingerprint(a) === fingerprint(restore(snapshot(a))),
    arrivalSkill: a.skills['shared-preparation'],
    sourceChance: chance(source, 'preparation'),
    householdChance: chance(a, 'shared-preparation'),
    canteenChance: chance(b, 'shared-preparation'),
    unmappedChance: chance(a, 'unrelated'),
    limitations: portable.limitations,
  };
  if (
    !result.sourceUntouched ||
    !result.sameEvidence ||
    !result.sameRng ||
    !result.roundtrip ||
    result.sourceChance !== result.householdChance ||
    result.sourceChance !== result.canteenChance ||
    result.unmappedChance >= result.householdChance
  )
    throw new Error('persona control failed');
  return result;
}
if (process.argv[1]?.endsWith('persona-control.ts'))
  console.log(JSON.stringify(runPersonaControl(), null, 2));
