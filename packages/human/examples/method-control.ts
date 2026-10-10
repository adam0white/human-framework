/**
 * Domain-neutral headless control: two parcel-routing examples and one unreadable
 * exception. Offers, external observations and accepted routes are identical in
 * every arm. Only acquired method/skill state changes. No world draw uses actor RNG.
 * The unreadable exception has no supported method; ordinary lower-effort help
 * is a safe fallback, not a learned exception detector.
 * Run: node packages/human/examples/method-control.ts
 */
import {
  type Affordance,
  createPerson,
  type DecisionRecord,
  decide,
  demonstrateMethod,
  type MethodCue,
  type MethodRule,
  MINUTES_PER_YEAR,
  type Person,
  receiveMethodCues,
  snapshot,
} from '../src/index.ts';

interface ControlArm {
  actions: (string | null)[];
  correct: boolean[];
  rules: MethodRule[];
  traces: DecisionRecord[];
}

function observations(route: string): MethodCue[] {
  return [
    { cue: 'route', value: route },
    { cue: 'signal', value: 'clear' },
  ];
}

function examples(p: Person, alternative: boolean): void {
  for (const route of ['north', 'south']) {
    receiveMethodCues(p, { contextId: `demonstration-${route}`, cues: observations(route) });
    for (let sample = 0; sample < 2; sample++) {
      demonstrateMethod(p, {
        id: `routing-${route}`,
        demonstrationId: `example-${route}-${sample}`,
        contextId: `demonstration-${route}`,
        conditions: observations(route),
        action: alternative && route === 'north' ? 'send-via-relay' : `send-${route}`,
        sourceId: 'instructor',
        outcome: 'success',
      });
    }
  }
}

function offers(contextId: string, targetId: string): Affordance[] {
  return [
    ['a-help', 'ask-help'],
    ['x-south', 'send-south'],
    ['y-relay', 'send-via-relay'],
    ['z-north', 'send-north'],
  ].map(([id, action]) => ({
    id: id as string,
    action: action as string,
    label: action as string,
    targetId,
    methodContext: contextId,
    duration: 5,
    effort: action === 'ask-help' ? 0 : 0.1,
    skill: { id: 'routing', difficulty: action === 'ask-help' ? 0 : 0.6 },
    advertises: {},
  }));
}

function runArm(seed: number, kind: string): ControlArm {
  const p = createPerson({
    id: 'learner',
    name: 'Learner',
    seed,
    now: 720,
    bornAt: -30 * MINUTES_PER_YEAR,
    sex: 'female',
  });
  // Scalar execution competence is held equal; it cannot encode routing conditions.
  p.skills.routing = { level: 0.9, practice: 300, lastPracticed: p.now };
  if (kind === 'trained' || kind === 'alternative' || kind === 'ablation')
    examples(p, kind === 'alternative');
  if (kind === 'ablation' && p.methods) p.methods.rules = [];
  const actions: ControlArm['actions'] = [];
  const correct: boolean[] = [];
  const traces: DecisionRecord[] = [];
  // New identities and appearances remain outside the fixed learned cue structure.
  for (const [index, route] of ['north', 'south', 'unreadable'].entries()) {
    const contextId = `held-out-${index}`;
    receiveMethodCues(p, { contextId, cues: observations(route) });
    const decision = decide(
      p,
      offers(contextId, ['blue-crate', 'cloth-bag', 'plain-envelope'][index] as string),
    );
    const action = decision.chosenAction;
    actions.push(action);
    correct.push(
      route === 'unreadable'
        ? action === 'ask-help'
        : action === `send-${route}` || action === 'send-via-relay',
    );
    traces.push(decision);
  }
  return { actions, correct, rules: snapshot(p).methods?.rules ?? [], traces };
}

export function runMethodControl(seed = 19) {
  return {
    trained: runArm(seed, 'trained'),
    alternative: runArm(seed, 'alternative'),
    withheld: runArm(seed, 'withheld'),
    skillOnly: runArm(seed, 'skill-only'),
    ablation: runArm(seed, 'ablation'),
  };
}

if (process.argv[1]?.endsWith('/method-control.ts')) {
  for (const [name, arm] of Object.entries(runMethodControl()))
    console.log(`${name}: ${arm.actions.join(', ')}; accepted ${arm.correct.filter(Boolean).length}/3`);
}
