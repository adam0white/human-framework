/**
 * Headless bounded-planning control. Run: node packages/human/examples/planning-control.ts
 * A host exposes actual offers one minute at a time: go, take, carry, then put.
 * Retained known claims describe the three links; the host alone opens each next offer.
 * A smaller two-step project offers a useful preparation now and a smaller finished result later.
 * Both domains rename the same structure. All numbers are engineering premises, not human estimates.
 */
import {
  type Affordance,
  begin,
  createPerson,
  decide,
  enablePlanning,
  FRAMEWORK_VERSION,
  finish,
  type ReceivedConsequence,
  seedConsequences,
  tick,
} from '../src/index.ts';

export const ARMS = ['planner', 'reactive', 'depth-three', 'present-biased'] as const;
export type Arm = (typeof ARMS)[number];
const DOMAINS = {
  parcel: {
    far: ['go-depot', 'take-parcel', 'carry-parcel', 'put-parcel'],
    near: ['sort-note', 'file-note'],
  },
  garden: { far: ['go-shed', 'take-pot', 'carry-pot', 'put-pot'], near: ['sort-seed', 'store-seed'] },
} as const;
export type Domain = keyof typeof DOMAINS;
const offer = (action: string): Affordance => ({
  id: action,
  action,
  label: action,
  duration: 1,
  effort: 0.01,
  advertises: {},
});

export function runArm(domain: Domain, arm: Arm) {
  const names = DOMAINS[domain];
  const p = createPerson({
    id: 'worker',
    name: 'Worker',
    seed: 19,
    now: 600,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    goals: [
      {
        id: 'far',
        label: 'Finish the larger project',
        serves: ['achievement'],
        importance: 1,
        advancedBy: [{ action: names.far[3], amount: 1 }],
        temporal: { halfLifeMinutes: 10000 },
      },
      {
        id: 'prepare',
        label: 'Prepare the smaller project',
        serves: ['achievement'],
        importance: 0.3,
        advancedBy: [{ action: names.near[0], amount: 1 }],
        temporal: { halfLifeMinutes: 10000 },
      },
      {
        id: 'near',
        label: 'Finish the smaller project',
        serves: ['achievement'],
        importance: 0.4,
        advancedBy: [{ action: names.near[1], amount: 1 }],
        temporal: { halfLifeMinutes: 10000 },
      },
    ],
  });
  if (arm !== 'reactive')
    enablePlanning(p, {
      depth: arm === 'depth-three' ? 3 : 4,
      ...(arm === 'present-biased' ? { presentBias: 0.5 } : {}),
    });
  const claims: ReceivedConsequence[] = [];
  for (const [route, steps] of [
    ['far', names.far],
    ['near', names.near],
  ] as const) {
    for (let i = 0; i < steps.length - 1; i++) {
      const action = steps[i];
      const successor = steps[i + 1];
      if (action === undefined || successor === undefined) throw new Error('Missing route step');
      claims.push({
        id: `${route}-${i}`,
        revision: 0,
        trigger: { action },
        successor: { action: successor, duration: 1, effort: 0.01 },
        availableFrom: 600,
        availableUntil: 620,
        expiresAt: 620,
        chance: 1,
        confidence: 1,
      });
    }
  }
  seedConsequences(p, 'familiar-work', claims);
  const progress = { far: 0, near: 0 };
  const decisions: { minute: number; action: string; offers: string[] }[] = [];
  const idle = { ...offer('wait'), effort: 0 };
  for (let minute = 600; minute < 604; minute++) {
    tick(p, minute);
    const offers = [idle];
    for (const route of ['far', 'near'] as const) {
      const action = names[route][progress[route]];
      if (action !== undefined) offers.push(offer(action));
    }
    const record = decide(p, offers);
    const chosen = offers.find((a) => a.id === record.chosenAffordanceId);
    if (chosen === undefined) throw new Error('No actual offer chosen');
    decisions.push({ minute, action: chosen.action, offers: offers.map((a) => a.action) });
    begin(p, chosen, record);
    tick(p, minute + 1);
    finish(p, { affordanceId: chosen.id, action: chosen.action, status: 'completed', at: minute + 1 });
    for (const route of ['far', 'near'] as const) {
      if (chosen.action === names[route][progress[route]]) progress[route]++;
    }
  }
  return {
    domain,
    arm,
    decisions,
    progress,
    goals: p.agenda.goals.map(({ id, status, progress }) => ({ id, status, progress })),
    now: p.now,
  };
}

export function main() {
  return (Object.keys(DOMAINS) as Domain[]).flatMap((domain) => ARMS.map((arm) => runArm(domain, arm)));
}

if (process.argv[1]?.endsWith('/planning-control.ts')) {
  console.log(`HF ${FRAMEWORK_VERSION} bounded planning control`);
  console.table(
    main().map((r) => ({
      domain: r.domain,
      arm: r.arm,
      actions: r.decisions.map((d) => d.action).join(', '),
      farSteps: r.progress.far,
      nearSteps: r.progress.near,
    })),
  );
}
