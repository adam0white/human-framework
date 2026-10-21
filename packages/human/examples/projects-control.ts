/**
 * One free day, neutral offers and a host-shown construction prospect. Run with Node >=24.
 * Needs are held fixed to isolate adoption (the hungry arm stays hungry even after eating).
 * The host restocks material and renews known fetch -> place opportunities each minute. It exposes
 * only fetch with empty hands, only place with material, and re-perceives progress after placement.
 * The familiar pastime has a small prior pleasure, not a goal or intermediate route reward.
 * This isolates projects; persistence arms can be appended to ARMS after the separate slice merges.
 */
import {
  type Affordance,
  begin,
  createPerson,
  decide,
  enablePlanning,
  FRAMEWORK_VERSION,
  finish,
  type Person,
  PSYCHOLOGICAL_NEEDS,
  perceive,
  seedConsequences,
  tick,
} from '../src/index.ts';

export const ARMS = ['on-met', 'off-met', 'on-hungry'] as const;
export type Arm = (typeof ARMS)[number];
const PROSPECT = 'construction';
const offer = (id: string): Affordance => ({
  id,
  action: id,
  label: id,
  duration: 1,
  effort: 0.01,
  advertises: {},
});
function maintain(p: Person, hungry: boolean): void {
  p.body.satiety = hungry ? 0 : 1;
  p.body.hydration = 1;
  p.body.sleepPressure = p.body.sleepDebt = p.body.exertion = p.body.pain = 0;
  for (const id of PSYCHOLOGICAL_NEEDS) p.needs[id] = 1;
}
export function runArm(arm: Arm, seed = 19) {
  const p = createPerson({
    id: 'maker',
    name: 'Maker',
    seed,
    now: 600,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    traits: { openness: 1 },
    norms: [],
    enable: { projects: arm !== 'off-met' },
  });
  enablePlanning(p, { depth: 3 });
  p.memory.expectations.push({ key: 'pastime', needs: {}, successRate: 1, samples: 100, valence: 0.05 });
  let placements = 0;
  let carrying = false;
  const choices: Record<string, number> = {};
  function see() {
    perceive(p, [
      {
        at: p.now,
        channel: 'saw',
        kind: 'fact',
        salience: 1,
        summary: 'Materials and an unfinished construction',
        prospect: {
          id: PROSPECT,
          label: 'Make a construction',
          kind: 'make',
          placeId: 'site',
          materialIds: ['material'],
          progress: Math.min(1, placements * 0.2),
        },
      },
    ]);
  }
  maintain(p, arm === 'on-hungry');
  see();
  for (let i = 0; i < 1440; i++) {
    maintain(p, arm === 'on-hungry');
    seedConsequences(p, 'known-work', [
      {
        id: 'fetch-place',
        revision: i,
        trigger: { action: 'fetch' },
        successor: { action: 'place', duration: 1, effort: 0.01, advances: [PROSPECT] },
        availableFrom: p.now,
        availableUntil: p.now + 3,
        expiresAt: p.now + 3,
        chance: 1,
        confidence: 1,
      },
    ]);
    const offers = [{ ...offer('rest'), effort: 0 }, offer('wander'), offer('pastime')];
    if (placements < 5) offers.push(carrying ? { ...offer('place'), advances: [PROSPECT] } : offer('fetch'));
    if (arm === 'on-hungry') offers.push({ ...offer('food'), advertises: { food: 1 } });
    const record = decide(p, offers);
    const chosen = offers.find((a) => a.id === record.chosenAffordanceId);
    if (!chosen) throw new Error('Missing chosen offer');
    choices[chosen.id] = (choices[chosen.id] ?? 0) + 1;
    begin(p, chosen, record);
    tick(p, p.now + 1);
    finish(p, { affordanceId: chosen.id, action: chosen.action, status: 'completed', at: p.now });
    if (chosen.action === 'fetch') carrying = true;
    if (chosen.action === 'place') {
      placements++;
      carrying = false;
      see();
    }
  }
  return {
    arm,
    seed,
    minutes: p.now - 600,
    placements,
    finalProgress: Math.min(1, placements * 0.2),
    adopted: p.agenda.goals.filter((g) => g.project).length,
    history: p.projects?.history ?? [],
    choices,
  };
}
export function main() {
  return ARMS.map((arm) => runArm(arm));
}
if (process.argv[1]?.endsWith('/projects-control.ts')) {
  console.log(`HF ${FRAMEWORK_VERSION} projects control (host-maintained needs)`);
  console.table(
    main().map(({ arm, minutes, adopted, placements, finalProgress }) => ({
      arm,
      minutes,
      adopted,
      placements,
      finalProgress,
    })),
  );
}
