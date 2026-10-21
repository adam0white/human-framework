/**
 * One free day, neutral offers and a host-shown construction prospect. Run with Node >=24.
 * Needs are held fixed to isolate adoption (the hungry arm stays hungry even after eating).
 * The host restocks material and renews known fetch -> place opportunities each minute. It exposes
 * only fetch with empty hands, only place with material, and re-perceives progress after placement.
 * The familiar pastime has a small prior pleasure, not a goal or intermediate route reward.
 * The second scenario runs a longer perceived-progress project under distraction for 180 minutes.
 * The host exposes go -> take -> place, seeds both known links, and offers a familiar pleasant
 * pastime plus a fresh unfamiliar option every minute. Both intermediate steps have no reward.
 * Four matched arms toggle projects and persistence; all have depth-3 planning and curiosity.
 * Sixty placements would complete the project, keeping work available throughout this short run.
 * A chain starts on go. If unfinished after 20 minutes it counts as abandoned, once, even if
 * eventually completed. The host keeps its route state; unfinished chains at the horizon are pending.
 * The fifth arm becomes hungry at minute 60, eats, then has its needs held met again.
 * Counts describe this deterministic host premise, not fitted estimates of human performance.
 */
import {
  type Affordance,
  begin,
  consider,
  considerProjects,
  createPerson,
  decide,
  enablePlanning,
  FRAMEWORK_VERSION,
  finish,
  lifeModifiers,
  type Person,
  PSYCHOLOGICAL_NEEDS,
  perceive,
  readPerson,
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
export const LONGER_ARMS = [
  'projects+persistence',
  'projects-only',
  'persistence-only',
  'neither',
  'hungry-interruption',
] as const;
export type LongerArm = (typeof LONGER_ARMS)[number];
const CHAIN_STEPS = ['go', 'take', 'place'] as const;
const LONGER_TARGET = 60;

export function runLongerArm(arm: LongerArm, seed = 19) {
  const p = createPerson({
    id: 'maker',
    name: 'Maker',
    seed,
    now: 600,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    traits: { openness: 1 },
    norms: [],
    enable: {
      projects: arm !== 'persistence-only' && arm !== 'neither',
      persistence: arm !== 'projects-only' && arm !== 'neither',
      curiosity: true,
    },
  });
  enablePlanning(p, { depth: 3 });
  p.memory.expectations.push({ key: 'pastime', needs: {}, successRate: 1, samples: 100, valence: 0.05 });
  let placements = 0;
  let completedChains = 0;
  let abandonedChains = 0;
  let stage = 0;
  let startedAt: number | undefined;
  let chainTimedOut = false;
  let firstMealAt: number | undefined;
  let placementsAfterMeal = 0;
  const choices: Record<string, number> = {};
  const see = () =>
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
          progress: Math.min(1, placements / LONGER_TARGET),
        },
      },
    ]);
  maintain(p, false);
  see();
  for (let minute = 0; minute < 180; minute++) {
    const hungry = arm === 'hungry-interruption' && minute >= 60 && firstMealAt === undefined;
    maintain(p, hungry);
    if (startedAt !== undefined && !chainTimedOut && p.now - startedAt >= 20) {
      abandonedChains++;
      chainTimedOut = true;
    }
    seedConsequences(p, 'known-work', [
      {
        id: 'go-take',
        revision: minute,
        trigger: { action: 'go' },
        successor: { action: 'take', duration: 1, effort: 0.01 },
        availableFrom: p.now,
        availableUntil: p.now + 3,
        expiresAt: p.now + 3,
        chance: 1,
        confidence: 1,
      },
      {
        id: 'take-place',
        revision: minute,
        trigger: { action: 'take' },
        successor: { action: 'place', duration: 1, effort: 0.01, advances: [PROSPECT] },
        availableFrom: p.now,
        availableUntil: p.now + 3,
        expiresAt: p.now + 3,
        chance: 1,
        confidence: 1,
      },
    ]);
    // A distinct unfamiliar action keeps curiosity live even after previous alternatives are learned.
    const offers = [offer('pastime'), offer(`explore-${minute}`)];
    const action = CHAIN_STEPS[stage];
    if (!action) throw new Error('Missing chain step');
    if (placements < LONGER_TARGET)
      offers.push({ ...offer(action), ...(action === 'place' ? { advances: [PROSPECT] } : {}) });
    if (arm === 'hungry-interruption' && minute >= 60)
      offers.push({ ...offer('food'), advertises: { food: 1 } });
    const record = decide(p, offers);
    const chosen = offers.find((a) => a.id === record.chosenAffordanceId);
    if (!chosen) throw new Error('Missing chosen offer');
    choices[chosen.action] = (choices[chosen.action] ?? 0) + 1;
    const begunAt = p.now;
    begin(p, chosen, record);
    tick(p, p.now + 1);
    finish(p, {
      affordanceId: chosen.id,
      action: chosen.action,
      status: 'completed',
      at: p.now,
      ...(chosen.action === 'food' ? { needs: { food: 1 } } : {}),
    });
    if (chosen.action === 'food' && firstMealAt === undefined) firstMealAt = p.now;
    if (chosen.action === action) {
      if (stage === 0) {
        startedAt = begunAt;
        chainTimedOut = false;
      }
      stage++;
      if (stage === 3) {
        placements++;
        completedChains++;
        if (firstMealAt !== undefined) placementsAfterMeal++;
        stage = 0;
        startedAt = undefined;
        see();
      }
    }
  }
  if (startedAt !== undefined && !chainTimedOut && p.now - startedAt >= 20) abandonedChains++;
  return {
    arm,
    seed,
    minutes: p.now - 600,
    adopted: p.agenda.goals.filter((g) => g.project).length,
    placements,
    completedChains,
    abandonedChains,
    pendingChains: startedAt === undefined ? 0 : 1,
    minutesToFirstMeal: firstMealAt === undefined ? null : firstMealAt - 660,
    placementsAfterMeal,
    choices,
  };
}

/** A perceived pile cannot grow: take removes one piece, replace puts the same piece back.
 * The first take is forced to start the pursuit. Later offers include an unrelated alternative with ten host units of material gain and prior pleasure 0.3.
 * Missing behaviour markers reproduce a restored 2.14.0 save; new enables opt into net credit.
 */
export function runStalledArm(behaviour: 'legacy' | 'net', seed = 19) {
  const p = createPerson({
    id: 'maker',
    name: 'Maker',
    seed,
    now: 600,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    traits: { openness: 1, conscientiousness: 1 },
    norms: [],
    enable: { projects: { staleMinutes: 360 }, persistence: true, planning: { depth: 3 } },
  });
  // A restored legacy slice has no marker. Do not call enable again after removing it.
  if (behaviour === 'legacy') {
    if (p.projects) delete (p.projects as { behaviour?: 2 }).behaviour;
    if (p.pursuit) delete (p.pursuit as { behaviour?: 2 }).behaviour;
  }
  let pieces = 3;
  let carrying = false;
  let rounds = 0;
  let releasedAt: number | null = null;
  const choices: Record<string, number> = {};
  const afterRelease: Record<string, number> = {};
  const samples: { minute: number; continuation: number; switching: number }[] = [];
  const see = () =>
    perceive(p, [
      {
        at: p.now,
        channel: 'saw',
        kind: 'fact',
        salience: 1,
        summary: 'An unfinished pile',
        prospect: { id: PROSPECT, label: 'Arrange a pile', kind: 'arrange', progress: pieces / 10 },
      },
    ]);
  maintain(p, false);
  see();
  considerProjects(p, p.now);
  p.memory.expectations.push({ key: 'quiet', needs: {}, successRate: 1, samples: 100, valence: 0.3 });
  for (let minute = 0; minute <= 120; minute++) {
    maintain(p, false);
    seedConsequences(p, 'known-work', [
      {
        id: 'take-replace',
        revision: minute,
        trigger: { action: 'take' },
        successor: { action: 'replace', duration: 1, effort: 0.01, advances: [PROSPECT] },
        availableFrom: p.now,
        availableUntil: p.now + 3,
        expiresAt: p.now + 3,
        chance: 1,
        confidence: 1,
      },
    ]);
    const work = carrying ? { ...offer('replace'), advances: [PROSPECT] } : offer('take');
    const quiet = { ...offer('quiet'), material: 10 };
    const offers = minute === 0 ? [work] : [work, quiet];
    const record = decide(p, offers);
    if (minute === 0) begin(p, work, record);
    if (minute % 30 === 0) {
      const context = {
        ...readPerson(p),
        now: p.now,
        mods: lifeModifiers(p),
        tendencies: {},
        habit: { now: p.now },
      };
      const workTerms = consider(p, work, context).terms;
      const quietTerms = consider(p, quiet, context).terms;
      samples.push({
        minute,
        continuation: workTerms.find((t) => t.source.startsWith('pursuit:'))?.value ?? 0,
        switching: quietTerms.find((t) => t.source === 'pursuit:switch')?.value ?? 0,
      });
    }
    if (minute === 120) break;
    const chosen = offers.find((a) => a.id === record.chosenAffordanceId);
    if (!chosen) throw new Error('Missing stalled-control offer');
    choices[chosen.action] = (choices[chosen.action] ?? 0) + 1;
    if (releasedAt !== null) afterRelease[chosen.action] = (afterRelease[chosen.action] ?? 0) + 1;
    if (minute > 0) begin(p, chosen, record);
    tick(p, p.now + 1);
    finish(p, { affordanceId: chosen.id, action: chosen.action, status: 'completed', at: p.now });
    if (chosen.action === 'take') {
      carrying = true;
      pieces--;
      see();
    }
    if (chosen.action === 'replace') {
      carrying = false;
      pieces++;
      rounds++;
      see();
    }
    if (minute > 0 && !p.pursuit?.current && releasedAt === null) releasedAt = p.now - 600;
  }
  return { behaviour, minutes: p.now - 600, pieces, rounds, releasedAt, choices, afterRelease, samples };
}

export function longerProject() {
  return LONGER_ARMS.map((arm) => runLongerArm(arm));
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
  console.log('A longer project under distraction (180 minutes; hunger begins at minute 60)');
  console.table(longerProject().map(({ choices: _choices, seed: _seed, ...row }) => row));
  console.log('A stalled take-and-replace project (120 minutes; the pile never exceeds three pieces)');
  for (const behaviour of ['legacy', 'net'] as const) console.log(runStalledArm(behaviour));
}
