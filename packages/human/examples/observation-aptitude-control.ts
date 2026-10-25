/**
 * Bounded headless control for inherited aptitude in observation. One fixed demonstration is repeated once per
 * arm. The aptitude source is the existing family factor; no new inheritance or empirical rate is introduced.
 * The opt-in affects watching only when requested. The absent arm must match the neutral arm and restore exactly.
 * Run: node packages/human/examples/observation-aptitude-control.ts
 */
import { createPerson, observeSkill, restore, snapshot } from '../src/index.ts';

const make = (aptitude?: number) =>
  createPerson({
    id: 'watcher',
    name: 'Watcher',
    seed: 35,
    now: 480,
    bornAt: -20_000_000,
    sex: 'female',
    ...(aptitude === undefined ? {} : { family: { aptitudes: { smith: aptitude } } }),
  });
const run = (aptitude?: number, inheritedAptitude?: boolean) => {
  const p = make(aptitude);
  const beforeRng = structuredClone(p.rng);
  const level = observeSkill(p, 'smith', 120, 0.9, undefined, { inheritedAptitude }).after;
  if (JSON.stringify(p.rng) !== JSON.stringify(beforeRng)) throw new Error('watching consumed RNG');
  return level;
};

const neutral = run();
const low = run(0.5, true);
const high = run(2, true);
if (!(low < neutral && neutral < high)) throw new Error('aptitude direction failed');
if (run(2) !== neutral) throw new Error('absent option changed authored family learning');
const original = make(2);
const resumed = restore(JSON.parse(JSON.stringify(snapshot(original))));
observeSkill(original, 'smith', 120, 0.9);
observeSkill(resumed, 'smith', 120, 0.9);
if (JSON.stringify(snapshot(original)) !== JSON.stringify(snapshot(resumed)))
  throw new Error('restore continuation failed');
console.log(
  JSON.stringify({ low, neutral, high, absentMatchesNeutral: true, restoreExact: true, rngUnchanged: true }),
);
