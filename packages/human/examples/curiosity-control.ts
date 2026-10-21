/**
 * Headless curiosity control: one day with familiar, learnable and noisy options.
 * Run: node packages/human/examples/curiosity-control.ts
 *
 * The host holds physiological and psychological needs fixed before each choice. The hungry arm alone
 * has satiety zero. This is an isolation control, not a daily-life simulation: ordinary meals, fatigue,
 * social absence and sleep would otherwise change the relaxed-field gate over the day. No emotion,
 * learned expectation or habit is reset. All three options remain available at every choice; the host
 * never forces an unfamiliar trial. Familiarity is declared prior experience in the expectation store.
 * The learnable option fails on its first two attempts, then succeeds reliably. Noise succeeds with
 * seeded probability 1/2, using a separate host RNG so choices cannot change the person's RNG stream.
 * These schedules and coefficients are engineering premises, not estimates of human behaviour.
 */
import {
  type Affordance,
  begin,
  createPerson,
  createRng,
  decide,
  enableCuriosity,
  FRAMEWORK_VERSION,
  finish,
  MINUTES_PER_DAY,
  type Person,
  PSYCHOLOGICAL_NEEDS,
  random,
} from '../src/index.ts';

export const ARMS = ['on-met', 'off-met', 'on-hungry'] as const;
export type Arm = (typeof ARMS)[number];
type Option = 'familiar' | 'learnable' | 'noisy';
const MINUTES = 15;
const OPTIONS: Option[] = ['familiar', 'learnable', 'noisy'];
const OFFERS: Affordance[] = OPTIONS.map((id) => ({
  id,
  action: id,
  label: id,
  duration: MINUTES,
  effort: 0,
  advertises: {},
}));

/** Explicit host maintenance makes the gate's needs premise exact at each decision. */
function maintain(p: Person, hungry: boolean): void {
  p.body.satiety = hungry ? 0 : 1;
  p.body.hydration = 1;
  p.body.sleepPressure = 0;
  p.body.sleepDebt = 0;
  p.body.exertion = 0;
  p.body.pain = 0;
  for (const id of PSYCHOLOGICAL_NEEDS) p.needs[id] = 1;
}

export function runArm(arm: Arm, seed = 17) {
  const p = createPerson({
    id: 'explorer',
    name: 'Explorer',
    seed,
    now: 0,
    bornAt: -20 * 365 * MINUTES_PER_DAY,
    sex: 'female',
    traits: { openness: 0.8 },
    norms: [],
  });
  if (arm !== 'off-met') enableCuriosity(p);
  // A small familiar preference supplies an observable ablation baseline without a forced choice.
  p.memory.expectations.push({
    key: 'familiar',
    needs: {},
    successRate: 1,
    samples: 100,
    valence: 0.1,
  });
  const rng = createRng(seed + 1000);
  const counts: Record<Option, number> = { familiar: 0, learnable: 0, noisy: 0 };
  const decisions: {
    at: number;
    choice: Option;
    success: boolean;
    curiosity: Record<Option, number>;
  }[] = [];
  while (p.now < MINUTES_PER_DAY) {
    maintain(p, arm === 'on-hungry');
    const record = decide(p, OFFERS);
    const aff = OFFERS.find((offer) => offer.id === record.chosenAffordanceId);
    if (!aff) throw new Error(`No option selected at ${p.now}`);
    const choice = aff.id as Option;
    counts[choice]++;
    const success =
      choice === 'familiar' || (choice === 'learnable' ? counts.learnable > 2 : random(rng) < 0.5);
    const curiosity = Object.fromEntries(
      OPTIONS.map((id) => [
        id,
        record.considered
          .find((c) => c.affordanceId === id)
          ?.terms.filter((t) => t.source.startsWith('curiosity:'))
          .reduce((sum, t) => sum + t.value, 0) ?? 0,
      ]),
    ) as Record<Option, number>;
    decisions.push({ at: p.now, choice, success, curiosity });
    if (!begin(p, aff, record)) throw new Error(`Could not begin ${choice}`);
    finish(p, {
      affordanceId: aff.id,
      action: aff.action,
      status: success ? 'completed' : 'failed',
      at: p.now + MINUTES,
    });
  }
  const late = decisions.slice(-Math.floor(decisions.length / 3));
  return {
    arm,
    seed,
    minutes: p.now,
    counts,
    lateCounts: Object.fromEntries(
      OPTIONS.map((id) => [id, late.filter((d) => d.choice === id).length]),
    ) as Record<Option, number>,
    decisions,
    alive: p.body.alive,
  };
}

export function main() {
  return ARMS.map((arm) => runArm(arm));
}

if (process.argv[1]?.endsWith('/curiosity-control.ts')) {
  console.log(`HF ${FRAMEWORK_VERSION} curiosity control (one day; host-maintained needs)`);
  console.table(
    main().map(({ arm, minutes, counts, lateCounts }) => ({
      arm,
      minutes,
      ...counts,
      lateLearnable: lateCounts.learnable,
      lateNoisy: lateCounts.noisy,
    })),
  );
}
