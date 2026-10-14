/**
 * Two independently successful procedures share the same received conditions.
 * Every arm receives the same held-out observations, legal offers and outcomes.
 * Teaching never states that the procedures exclude each other. Scalar skill is
 * held equal. Help remains a legal, lower-effort fallback and eating an ordinary
 * response to pressing hunger. No host truth or actor draws select an answer.
 */
import {
  type Affordance,
  createPerson,
  decide,
  demonstrateMethod,
  MINUTES_PER_YEAR,
  methodEvidence,
  receiveMethodCues,
  restore,
  snapshot,
} from '../src/index.ts';

const cues = [{ cue: 'label', value: 'readable' }];
const procedures = ['sort-by-label', 'sort-with-template'];
const offers: Affordance[] = [
  ['a-help', 'ask-help'],
  ['y-label', procedures[0]],
  ['z-template', procedures[1]],
].map(([id, action]) => ({
  id: id as string,
  action: action as string,
  label: action as string,
  duration: 5,
  effort: action === 'ask-help' ? 0 : 0.1,
  methodContext: 'held-out',
  skill: { id: 'sorting', difficulty: action === 'ask-help' ? 0 : 0.6 },
  advertises: {},
}));

type Arm = 'both' | 'one' | 'withheld' | 'skill-only' | 'failed' | 'hungry' | 'restored';

function runArm(seed: number, arm: Arm) {
  let p = createPerson({
    id: 'learner',
    name: 'Learner',
    seed,
    now: 720,
    bornAt: -30 * MINUTES_PER_YEAR,
    sex: 'female',
  });
  p.skills.sorting = { level: 0.9, practice: 300, lastPracticed: p.now };
  if (arm !== 'withheld' && arm !== 'skill-only') {
    receiveMethodCues(p, { contextId: 'lesson', cues });
    for (const action of arm === 'one' ? [procedures[0]] : procedures) {
      for (let sample = 0; sample < 2; sample++) {
        demonstrateMethod(p, {
          id: `procedure-${action}`,
          demonstrationId: `${action}-${sample}`,
          contextId: 'lesson',
          conditions: cues,
          action: action as string,
          sourceId: 'instructor',
          outcome: 'success',
        });
      }
    }
    if (arm === 'failed') {
      for (let sample = 0; sample < 3; sample++) {
        demonstrateMethod(p, {
          id: 'procedure-sort-by-label',
          demonstrationId: `failure-${sample}`,
          contextId: 'lesson',
          conditions: cues,
          action: 'sort-by-label',
          sourceId: 'instructor',
          outcome: 'failure',
        });
      }
    }
  }
  receiveMethodCues(p, { contextId: 'held-out', cues });
  if (arm === 'restored') p = restore(snapshot(p));
  if (arm === 'hungry') p.body.satiety = 0.05;
  const legalOffers = [...offers];
  if (arm === 'hungry')
    legalOffers.push({
      id: 'food',
      action: 'eat',
      label: 'eat',
      duration: 5,
      effort: 0,
      advertises: { food: 1 },
    });
  const trace = decide(p, legalOffers);
  return {
    action: trace.chosenAction,
    accepted: procedures.includes(trace.chosenAction ?? ''),
    evidence: procedures.map((action) => methodEvidence(p, action as string, 'held-out')),
    trace,
    state: snapshot(p),
  };
}

export function runMethodAlternativesControl(seed = 19) {
  return Object.fromEntries(
    (['both', 'one', 'withheld', 'skill-only', 'failed', 'hungry', 'restored'] as const).map((arm) => [
      arm,
      runArm(seed, arm),
    ]),
  ) as Record<Arm, ReturnType<typeof runArm>>;
}

if (process.argv[1]?.endsWith('/method-alternatives-control.ts')) {
  for (const [arm, result] of Object.entries(runMethodAlternativesControl()))
    console.log(`${arm}: ${result.action}; support ${result.evidence.map((e) => e.support).join(', ')}`);
}
