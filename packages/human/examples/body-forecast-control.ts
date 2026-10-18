/**
 * Headless control: bodily forecast over known follow-on exertion (2.5.0, `prospection/forecast.ts`).
 * Run: node packages/human/examples/body-forecast-control.ts
 *
 * One adult chooses between a far point (180 min at effort .8, material 8, then a 180-min return at effort .7)
 * and a near point (60 min at effort .5, material 1, then a 60-min return at effort .5). Arms vary only the
 * body at the start and whether the offers declare the return (`followedBy`): rested in the morning, low on food
 * and water in the morning, the same without the declared return (ablation), and fed at 20:00. The second domain
 * is a structural rename. Every number is an engineering premise, not an estimate of people.
 */
import {
  type Affordance,
  bodyForecast,
  createPerson,
  decide,
  FRAMEWORK_VERSION,
  tick,
} from '../src/index.ts';

const DAY = 1440;
type Domain = 'climb' | 'haul';
const ARMS = ['rested-morning', 'depleted-morning', 'depleted-undeclared', 'fed-evening'] as const;

function offers(domain: Domain, declared: boolean): [Affordance, Affordance] {
  const n =
    domain === 'climb'
      ? { far: 'reach-summit', near: 'reach-ledge', back: 'the descent' }
      : { far: 'haul-far', near: 'haul-near', back: 'the walk back' };
  const far: Affordance = {
    id: 'far',
    action: n.far,
    label: n.far,
    duration: 180,
    effort: 0.8,
    material: 8,
    advertises: {},
  };
  const near: Affordance = {
    id: 'near',
    action: n.near,
    label: n.near,
    duration: 60,
    effort: 0.5,
    material: 1,
    advertises: {},
  };
  if (declared) {
    far.followedBy = [{ label: n.back, duration: 180, effort: 0.7 }];
    near.followedBy = [{ label: n.back, duration: 60, effort: 0.5 }];
  }
  return [far, near];
}

export function runBodyForecastControl(domain: Domain = 'climb') {
  return ARMS.map((arm) => {
    const p = createPerson({
      id: 'p',
      name: 'P',
      seed: 5,
      now: 6 * 60,
      bornAt: -30 * 365 * DAY,
      sex: 'female',
    });
    tick(p, arm === 'fed-evening' ? 20 * 60 : 9 * 60);
    const depleted = arm.startsWith('depleted');
    p.body.satiety = depleted ? 0.35 : 0.9;
    p.body.hydration = depleted ? 0.35 : 0.9;
    const [far, near] = offers(domain, arm !== 'depleted-undeclared');
    const forecast = bodyForecast(p, far);
    const record = decide(p, [far, near]);
    return {
      arm,
      chosen: record.chosenAffordanceId,
      farLine: forecast.line,
      farWorst: forecast.spans.map((s) => ({
        label: s.label,
        worstOf: s.worstOf,
        worst: Math.round(s.worst * 100) / 100,
      })),
      forecastTerms: record.considered.map((c) => ({
        id: c.affordanceId,
        utility: c.utility,
        forecast: c.terms.find((t) => t.source === 'forecast:body')?.value ?? 0,
      })),
    };
  });
}

if (process.argv[1]?.endsWith('/body-forecast-control.ts'))
  console.log(
    JSON.stringify(
      {
        framework: FRAMEWORK_VERSION,
        climb: runBodyForecastControl('climb'),
        haul: runBodyForecastControl('haul'),
      },
      null,
      1,
    ),
  );
