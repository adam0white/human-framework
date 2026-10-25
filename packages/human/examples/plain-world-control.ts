/**
 * SCOPE: generated world narration changes only when opted in. Compare all model fields
 * after removing named prose fields and the lexicon choice. Keep decisions, ids, numbers,
 * world state and RNG. Authored routine prose stays exact. This is a bounded language control.
 */
import assert from 'node:assert/strict';
import {
  begin,
  createCommunity,
  createPerson,
  createVillage,
  decide,
  marry,
  routineDay,
  snapshot,
  stepCommunity,
} from '../src/index.ts';
import type { Lexicon } from '../src/types.ts';

const person = (id = 'p', plainEnglish = true) =>
  createPerson({
    id,
    name: id === 'p' ? 'Ada' : 'Ben',
    seed: 4,
    now: 600,
    bornAt: -15000000,
    sex: id === 'p' ? 'female' : 'male',
    ...(plainEnglish ? { lexicon: { plainEnglish: true } as Lexicon } : {}),
  });
const withoutProse = (state: unknown): unknown =>
  JSON.parse(
    JSON.stringify(state, (key, value) =>
      ['summary', 'lexicon', 'intention', 'narration', 'says'].includes(key) ? undefined : value,
    ),
  );

export function runPlainWorldControl() {
  const arms = [false, true].map((plain) => {
    const p = person('p', plain);
    const q = person('q', plain);
    marry(p, q, p.now);
    assert.equal(p.memory.episodes.at(-1)?.summary, plain ? 'I married Ben.' : 'married');
    const world = createVillage([p], { seed: 3 });
    const aff = world.affordancesFor(p).find((a) => a.action === 'rest');
    assert.ok(aff);
    const act = begin(p, aff, decide(p, [aff]));
    assert.ok(act);
    p.now = act.endsAt;
    const outcome = world.resolve(p, act, 'ended');
    assert.equal(outcome.summary, plain ? 'I rested.' : 'rested');
    const idle = person('p', plain);
    const events = stepCommunity(
      createCommunity([idle]),
      {
        now: () => idle.now,
        affordancesFor: () => [],
        perceptsFor: () => [],
        resolve: () => {
          throw new Error('no activity');
        },
      },
      idle.now + 1,
    );
    assert.equal(
      events.find((e) => e.kind === 'idle')?.detail,
      plain ? 'Ada did not choose a task.' : 'nothing chosen',
    );
    const routine = person('p', plain);
    routineDay(routine, { activities: [{ action: 'rest', minutes: 1, summary: 'Authored fragment' }] });
    assert.ok(routine.memory.episodes.some((e) => e.summary === 'Authored fragment'));
    return {
      world: world.state,
      rng: p.rng,
      person: withoutProse(snapshot(p)),
      routine: withoutProse(snapshot(routine)),
      outcome: withoutProse(outcome),
    };
  });
  assert.deepEqual(arms[0], arms[1]);
  return { unchangedModelState: true, unchangedRng: true, preservedHostProse: true };
}
if (import.meta.main) console.log(JSON.stringify(runPlainWorldControl(), null, 2));
