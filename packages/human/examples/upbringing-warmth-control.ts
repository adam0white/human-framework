/** Headless household influence control. No abuse, schooling or adult culture diffusion. */
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import {
  attachmentOf,
  communityState,
  createCommunity,
  createPerson,
  liveCommunity,
  raise,
  restore,
  seedTie,
  snapshot,
} from '../src/index.ts';
import { MINUTES_PER_DAY as DAY, MINUTES_PER_YEAR as YEAR } from '../src/types.ts';

export function upbringingFixture(age = 18, warmth = 0.8, roles = ['guardian']) {
  const child = createPerson({
    id: 'child',
    name: 'Child',
    seed: 31,
    now: 0,
    bornAt: -age * YEAR,
    sex: 'female',
    values: { tradition: 0.2 },
    norms: [{ normId: 'lying', conviction: 0.2, standing: 'forbidden' }],
  });
  const carer = createPerson({
    id: 'carer',
    name: 'Carer',
    seed: 32,
    now: 0,
    bornAt: -40 * YEAR,
    sex: 'male',
    values: { tradition: 0.9 },
    norms: [{ normId: 'lying', conviction: 0.9, standing: 'forbidden' }],
  });
  carer.affect.mood.valence = 1;
  seedTie(child, { otherId: carer.id, roles, affection: 0.9 });
  seedTie(carer, { otherId: child.id, affection: warmth });
  const community = createCommunity([child, carer]);
  return { child, carer, community };
}

export const upbringingRoutine = () => ({ activities: [] });

export function runUpbringingControl() {
  const model = { model: 'warmth-through-25' } as const;
  const direct = (age: number, warmth: number) => {
    const { child, carer } = upbringingFixture(age, warmth);
    const response = raise(child, { caregivers: [carer] }, YEAR, model);
    return { child, response };
  };
  const coldInfant = direct(0, 0.1);
  const legacyInfant = upbringingFixture(0, 0.1);
  raise(legacyInfant.child, { caregivers: [legacyInfant.carer] }, YEAR);
  assert.equal(attachmentOf(coldInfant.child), attachmentOf(legacyInfant.child));
  assert(attachmentOf(coldInfant.child) < 0.52);
  const absent = upbringingFixture(0, 0.1);
  raise(absent.child, { caregivers: [] }, YEAR, model);
  assert.equal(attachmentOf(absent.child), 0.6);
  const zeroInfant = direct(0, 0);
  const tinyInfant = direct(0, 1e-8);
  assert(Math.abs(attachmentOf(zeroInfant.child) - 0.45) < 1e-14);
  assert(attachmentOf(zeroInfant.child) < attachmentOf(tinyInfant.child));
  const legacyZero = upbringingFixture(0, 0);
  raise(legacyZero.child, { caregivers: [legacyZero.carer] }, YEAR);
  assert.equal(attachmentOf(legacyZero.child), 0.6);
  const warmInfant = direct(0, 0.8);
  assert(attachmentOf(warmInfant.child) > 0.6);
  const ordinary = direct(18, 0.8);
  const tiny = direct(18, 1e-8);
  const zero = direct(18, 0);
  assert(ordinary.child.values.tradition > tiny.child.values.tradition);
  assert(tiny.response > 0 && tiny.response < 1e-7);
  assert.equal(zero.response, 0);
  assert.equal(zero.child.values.tradition, 0.2);
  assert(direct(24, 0.8).response > 0);
  assert.equal(direct(25, 0.8).response, 0);
  const ineligible = upbringingFixture();
  ineligible.carer.body.alive = false;
  seedTie(ineligible.child, { otherId: ineligible.child.id, roles: ['guardian'], affection: 1 });
  assert.equal(raise(ineligible.child, { caregivers: [ineligible.carer, ineligible.child] }, YEAR, model), 0);
  liveCommunity(ineligible.community, DAY, { routineFor: upbringingRoutine, upbringing: model });
  assert.equal(ineligible.child.family?.raisedMinutes, YEAR);
  const at25 = upbringingFixture(25);
  liveCommunity(at25.community, DAY, { routineFor: upbringingRoutine, upbringing: model });
  assert.equal(at25.child.family?.raisedMinutes, undefined);
  const opted = upbringingFixture();
  liveCommunity(opted.community, DAY, { routineFor: upbringingRoutine, upbringing: model });
  assert.equal(opted.child.family?.raisedMinutes, 240);
  const unrelated = upbringingFixture(18, 0.8, []);
  liveCommunity(unrelated.community, DAY, { routineFor: upbringingRoutine, upbringing: model });
  assert.equal(unrelated.child.family?.raisedMinutes, undefined);
  const saved = JSON.parse(
    JSON.stringify({
      people: opted.community.people.map(snapshot),
      state: communityState(opted.community),
      options: model,
    }),
  );
  const resumed = createCommunity(saved.people.map(restore), saved.state);
  liveCommunity(opted.community, 2 * DAY, { routineFor: upbringingRoutine, upbringing: model });
  liveCommunity(resumed, 2 * DAY, { routineFor: upbringingRoutine, upbringing: saved.options });
  assert.deepEqual(resumed.people.map(snapshot), opted.community.people.map(snapshot));
  console.log(
    'Upbringing control: warm/cold infant attachment with absent-care ablation, guardian routine, age 25 cutoff and pinned restore pass.',
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runUpbringingControl();
