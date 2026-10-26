import { expect, test } from 'vitest';
import {
  acceptJoint,
  answerNow,
  bodyForecast,
  createCommunity,
  createPerson,
  decide,
  liveCommunity,
  predict,
  predictAs,
  preview,
  previewCommand,
  previewCommandAs,
  proposeJoint,
  raise,
  stepCommunity,
  type World,
} from '../src/index.ts';
import { advanceCommunityPerson } from '../src/sim/sim.ts';

const person = () =>
  createPerson({ id: 'p', name: 'Person', seed: 1, now: 0, bornAt: -10000000, sex: 'female' });
const world: World = {
  now: () => 10,
  affordancesFor: () => [],
  perceptsFor: () => [],
  resolve: (p, a) => ({ at: p.now, affordanceId: a.affordanceId, action: a.action, status: 'completed' }),
};
const offer = { id: 'rest', action: 'rest', label: 'rest', duration: 10, effort: 0, advertises: {} };
const suggestion = { voiceId: 'v', affordanceId: 'rest', strength: 0.5 };
const command = { voiceId: 'v', since: 0, affordanceId: 'rest' };
// Runtime JSON can bypass the TypeScript literal union.
const bad = JSON.parse(
  '{"deathHandling":"commmunity","forecastContext":"conditionedd","upbringing":{"model":"warmth-through-26"}}',
);

test('unknown forecast selectors fail before decisions, clocks, or will mutate across public paths', () => {
  const p = person();
  const other = { ...person(), id: 'other' };
  for (const call of [
    () => decide(p, [offer], { ...bad, now: 10 }),
    () => predict(p, [offer], suggestion, bad),
    () => answerNow(p, [offer], suggestion, bad),
    () => preview(p, [offer], suggestion, bad),
    () => previewCommand(p, [offer], command, bad),
    () => bodyForecast(p, offer, bad),
    () => predictAs(other, p, [offer], suggestion, bad),
    () => previewCommandAs(other, p, [offer], command, 10, bad),
  ]) {
    const before = JSON.stringify([p, other]);
    expect(call).toThrow(/forecastContext/);
    expect(JSON.stringify([p, other])).toBe(before);
  }
});

test('unknown driver and upbringing selectors fail before callbacks, ticks or bookkeeping', () => {
  const p = person();
  const partner = { ...person(), id: 'partner' };
  const c = createCommunity([p, partner]);
  const jointOffer = { ...offer, tags: ['joint'], with: [partner.id] };
  const proposal = proposeJoint(c, p, jointOffer, decide(p, [jointOffer]));
  const record = decide(partner, [jointOffer]);
  const before = JSON.stringify(c);
  for (const call of [
    () => stepCommunity(c, world, 10, bad),
    () => stepCommunity(c, world, 10, { forecastContext: bad.forecastContext }),
    () => advanceCommunityPerson(c, p, 10, bad),
    () => acceptJoint(c, world, proposal, partner, record, () => {}, bad),
    () => liveCommunity(c, 1440, { ...bad, routineFor: () => ({ activities: [] }) }),
    () => liveCommunity(c, 1440, { upbringing: bad.upbringing, routineFor: () => ({ activities: [] }) }),
    () => raise(p, { caregivers: [] }, 0, bad.upbringing),
  ]) {
    expect(call).toThrow(/deathHandling|forecastContext|upbringing/);
    expect(JSON.stringify(c)).toBe(before);
  }
});
