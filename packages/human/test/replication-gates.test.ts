/** Engineering rejection controls, not held-out human validation. Authored fixture assumptions and
 * rejection predicates are stated beside each control below.
 * Promise continuation/completion and joint consent/decline already live in gaps.test.ts.
 */
import { describe, expect, test } from 'vitest';
import {
  acceptJoint,
  begin,
  createCommunity,
  createPerson,
  createRng,
  decide,
  scoreAndResolve as decideInContext,
  finish,
  jointSuccessChance,
  lifeModifiers,
  mirrorAffordance,
  proposeJoint,
  random,
  readPerson,
  tick,
  type World,
} from '../src/index.ts';
import type { Affordance, Person } from '../src/types.ts';
import { ADULT, aff } from './support.ts';

function lead(): Person {
  return createPerson({
    id: 'lead',
    name: 'Ada',
    seed: 42,
    now: 600,
    bornAt: ADULT,
    sex: 'female',
    skills: { carpentry: 0.4 },
  });
}

describe('replication engineering gates', () => {
  test('the same snapshot chooses differently by host setting; removing cues removes the contrast', () => {
    const snapshot = lead();
    snapshot.habits = [
      {
        action: 'repair',
        cue: { hour: 10, placeId: 'workshop' },
        strength: 0.9,
        repetitions: 66,
        lastAt: snapshot.now - 1440,
      },
    ];
    const offers = [
      aff('repair', { effort: 0.2, advertises: { competence: 0.1 } }),
      aff('read', { effort: 0.05, advertises: { competence: 0.1 } }),
    ];
    // No offer place may override the host's declared setting.
    expect(offers.every((a) => a.placeId === undefined)).toBe(true);
    function choose(placeId: string, cues: boolean) {
      const p = structuredClone(snapshot);
      if (!cues) p.habits = [];
      const read = readPerson(p);
      const before = structuredClone(p);
      const result = decideInContext(p, offers, {
        id: 'setting-control',
        now: p.now,
        body: read.body,
        needs: read.needs,
        mods: lifeModifiers(p),
        tendencies: {},
        desperation: read.desperation,
        habit: { now: p.now, placeId },
      });
      // All person inputs are cloned exactly, including traits, body, knowledge, clock and RNG.
      expect(before).toEqual(cues ? snapshot : { ...snapshot, habits: [] });
      return result.record;
    }
    const workshop = choose('workshop', true);
    const library = choose('library', true);
    expect(workshop.chosenAffordanceId).toBe('repair');
    expect(library.chosenAffordanceId).toBe('read');
    const habitTerm = (r: typeof workshop) =>
      r.considered.find((a) => a.affordanceId === 'repair')?.terms.find((t) => t.source === 'habit')?.value ??
      0;
    expect(habitTerm(workshop)).toBeGreaterThan(habitTerm(library));
    const neutralWorkshop = choose('workshop', false);
    const neutralLibrary = choose('library', false);
    expect(neutralWorkshop.chosenAffordanceId).toBe('read');
    expect(neutralLibrary).toEqual(neutralWorkshop);
    expect(habitTerm(neutralWorkshop)).toBe(0);
  });

  test('a consenting helper completes a fixed task that the matched solo lead fails', () => {
    const snapshot = lead();
    const solo = structuredClone(snapshot);
    const supported = structuredClone(snapshot);
    const helper = createPerson({
      id: 'helper',
      name: 'Bo',
      seed: 43,
      now: 600,
      bornAt: ADULT,
      sex: 'male',
      skills: { carpentry: 0.6 },
    });
    const task = aff('beam', {
      action: 'raise-beam',
      skill: { id: 'carpentry', difficulty: 0.6 },
      duration: 60,
      effort: 0.2,
      advertises: { competence: 0.3 },
    });
    expect(solo).toEqual(supported);
    const soloChance = jointSuccessChance(solo, [], 'carpentry', 0.6);
    const supportedChance = jointSuccessChance(supported, [helper], 'carpentry', 0.6);
    // Engineered separating draw, frozen before either run. This is deliberately NOT an
    // unbiased success-rate sample: the host owns this rule, HF supplies capability/support.
    const draw = soloChance + (supportedChance - soloChance) * (0.25 + 0.5 * random(createRng(42)));
    expect(draw).toBeGreaterThan(soloChance);
    expect(draw).toBeLessThan(supportedChance);
    const world: World = {
      now: () => 600,
      affordancesFor: () => [task],
      perceptsFor: () => [],
      resolve: (p, a, reason) => ({
        affordanceId: a.affordanceId,
        action: a.action,
        at: p.now,
        status:
          reason !== 'ended'
            ? 'interrupted'
            : draw < (a.jointId === undefined ? soloChance : supportedChance)
              ? 'completed'
              : 'failed',
      }),
    };
    const soloRecord = decide(solo, [task]);
    expect(soloRecord.chosenAffordanceId).toBe(task.id);
    expect(begin(solo, task, soloRecord)).not.toBeNull();
    const community = createCommunity([supported, helper]);
    const sharedTask: Affordance = { ...task, with: ['helper'], tags: ['joint'] };
    const record = decide(supported, [sharedTask]);
    expect(record.chosenAffordanceId).toBe(task.id);
    const proposal = proposeJoint(community, supported, sharedTask, record);
    const mirror = mirrorAffordance(sharedTask, proposal, helper.id);
    const consent = decide(helper, [mirror]);
    expect(consent.chosenAffordanceId).toBe(mirror.id);
    expect(acceptJoint(community, world, proposal, helper, consent)).toHaveLength(2);
    expect(proposal.status).toBe('accepted');
    expect(supported.activity?.startedAt).toBe(solo.activity?.startedAt);
    expect(supported.activity?.endsAt).toBe(solo.activity?.endsAt);
    expect(helper.activity?.jointId).toBe(supported.activity?.jointId);
    const helperSkills = structuredClone(helper.skills);
    for (const p of [solo, supported, helper]) {
      const activity = p.activity;
      if (!activity) throw new Error('task did not begin');
      tick(p, activity.endsAt);
      // No practice has been credited before the host resolves the actual task.
      expect(p.skills).toEqual(p.id === helper.id ? helperSkills : snapshot.skills);
      const outcome = world.resolve(p, activity, 'ended');
      const expected = p === solo ? 'failed' : 'completed';
      expect(outcome.status).toBe(expected);
      expect(finish(p, outcome)?.status).toBe(expected);
      expect(p.activity).toBeNull();
      expect(p.memory.episodes).toContainEqual(
        expect.objectContaining({
          kind: 'outcome',
          action: task.action,
          at: 660,
          tags: expect.arrayContaining([expected]),
        }),
      );
    }
  });
});
