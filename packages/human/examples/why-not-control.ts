/**
 * One request loses for four different reasons. The fifth arm removes only the firm flag.
 * All names and actions are domain-neutral. Run with `node packages/human/examples/why-not-control.ts`.
 */
import {
  type Affordance,
  begin,
  createPerson,
  decide,
  MINUTES_PER_YEAR,
  predict,
  promise,
} from '../src/index.ts';

const pause: Affordance = {
  id: 'pause',
  action: 'pause',
  label: 'take a break',
  duration: 30,
  effort: 0,
  advertises: {},
};
const task: Affordance = {
  id: 'task',
  action: 'task',
  label: 'take up the task',
  duration: 10,
  effort: 0,
  advertises: {},
};

export function main() {
  return ['inertia', 'norm', 'habit', 'firm', 'firm-off'].map((arm) => {
    const p = createPerson({
      id: 'person',
      name: 'Person',
      seed: 1,
      now: 600,
      bornAt: -30 * MINUTES_PER_YEAR,
      sex: 'female',
      enable: { suggestionReasons: true },
      norms: arm === 'norm' ? [{ normId: 'boundary', standing: 'forbidden', conviction: 1 }] : [],
    });
    const request = {
      ...task,
      norms: arm === 'norm' ? [{ normId: 'boundary', relation: 'violates' as const }] : [],
    };
    if (arm === 'inertia') begin(p, pause, decide(p, [pause]));
    if (arm === 'habit')
      p.habits.push({ cue: { hour: 10 }, action: 'pause', strength: 1, repetitions: 100, lastAt: 0 });
    if (arm === 'firm' || arm === 'firm-off')
      promise(p, {
        kind: 'abstain',
        toId: 'self',
        label: 'leave it alone',
        actions: [],
        violatedBy: ['task'],
        from: 590,
        until: 700,
        importance: 1,
        ...(arm === 'firm' ? { firm: true as const } : {}),
      });
    const resolution = predict(p, [pause, request], { voiceId: 'voice', action: 'task', strength: 0.02 });
    return { arm, ...resolution };
  });
}

if (process.argv[1]?.endsWith('why-not-control.ts')) {
  for (const row of main())
    console.log(
      JSON.stringify({
        arm: row.arm,
        verdict: row.verdict,
        kind: row.kind,
        reason: row.reason,
        decidedBy: row.decidedBy ?? null,
      }),
    );
}
