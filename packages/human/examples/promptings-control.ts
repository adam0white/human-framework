/**
 * Headless control: practised turning-away vs suppression-only (2.4.0, `promptings/`).
 * Run: node packages/human/examples/promptings-control.ts
 *
 * Four people with the same cued habit (strength .7) toward an option that one held norm (n1, forbidden,
 * conviction .4: below the veto, so assent stays possible) opposes, on the same 60-day schedule: one cue
 * decision a day at 18:00 between `option` and `other`, with meals and a night's sleep supplied by the host.
 * A has no response; B has a practised `redirect` (starting practice .1); C holds the `fault` reading;
 * K has no slice and a fixed precommitment penalty -k in the cue window (the plain alternative), at k = .08 (B's
 * starting turn) and k = .3. Measured 2026-10-18: A assents every day; B assents the first 12 days, then
 * never, with prompts flat at one a day; C matches A's choices and prompts, adding guilt at each prompt; each K
 * is a step (always or never), with no learning curve and no record of a prompt. Labels are
 * neutral; no religious content is needed. Every number is an engineering premise, not an estimate of people.
 */
import {
  type Affordance,
  begin,
  createPerson,
  decide,
  emotionLevel,
  enablePromptings,
  FRAMEWORK_VERSION,
  finish,
  type Person,
  type PromptingsSpec,
} from '../src/index.ts';

const DAY = 1440;
const offer = (id: string, over: Partial<Affordance> = {}): Affordance => ({
  id,
  action: id,
  label: id,
  duration: 30,
  effort: 0.05,
  advertises: {},
  ...over,
});
const OPTION = offer('option', { placeId: 'cue', norms: [{ normId: 'n1', relation: 'violates' }] });
const OTHER = offer('other', { placeId: 'cue' });
const MEAL = offer('meal', { advertises: { food: 0.6, water: 0.6 }, duration: 30 });
const SLEEP = offer('sleep', { mode: 'sleep', duration: 8 * 60, effort: 0, advertises: { sleep: 1 } });

type Arm = 'A' | 'B' | 'C' | 'K-small' | 'K-large';

function person(arm: Arm, override?: PromptingsSpec): Person {
  const p = createPerson({
    id: arm,
    name: arm,
    seed: 7,
    now: 0,
    bornAt: -30 * 365 * DAY,
    sex: 'female',
    traits: { honesty: 0.5 },
    norms: [{ normId: 'n1', standing: 'forbidden', conviction: 0.4 }],
  });
  p.habits.push({ cue: { placeId: 'cue' }, action: 'option', strength: 0.7, repetitions: 200, lastAt: 0 });
  const spec: PromptingsSpec | undefined =
    arm === 'A'
      ? {}
      : arm === 'B'
        ? { reading: 'intrusion', responses: [{ id: 'r1', kind: 'redirect', practice: 0.1 }] }
        : arm === 'C'
          ? { reading: 'fault' }
          : undefined;
  if (override ?? spec) enablePromptings(p, override ?? (spec as PromptingsSpec));
  // The plain alternative: a fixed penalty, small (B's starting turn) or large, with no practice and no echo.
  if (arm === 'K-small' || arm === 'K-large')
    p.will.precommitments.push({
      id: 'k',
      action: 'option',
      fromMinuteOfDay: 17 * 60,
      toMinuteOfDay: 19 * 60,
      bias: arm === 'K-small' ? -0.08 : -0.3,
    });
  return p;
}

/** The host does `aff` now (no choice). */
function act(p: Person, aff: Affordance, at: number): void {
  const record = decide(p, [aff], { now: at });
  if (record.chosenAffordanceId !== aff.id) return;
  begin(p, aff, record);
  finish(p, {
    affordanceId: aff.id,
    action: aff.action,
    status: 'completed',
    at: at + aff.duration,
    needs: aff.advertises,
  });
}

/** Live one arm for `days` (an optional spec replaces the arm's own); returns the person and the weekly rows. */
export function runArm(arm: Arm, days = 60, override?: PromptingsSpec) {
  const p = person(arm, override);
  const weekly: { assents: number; prompts: number; guiltAtPrompt: number }[] = [];
  let practice = 0;
  for (let d = 0; d < days; d++) {
    const base = d * DAY;
    act(p, MEAL, base + 8 * 60);
    act(p, MEAL, base + 13 * 60);
    const at = base + 18 * 60;
    const before = p.promptings?.recent.length ?? 0;
    const record = decide(p, [OPTION, OTHER], { now: at });
    const prompted = (p.promptings?.recent.length ?? 0) > before;
    const guilt = emotionLevel(p, 'guilt');
    const chosen = record.chosenAffordanceId === 'option' ? OPTION : OTHER;
    begin(p, chosen, record);
    finish(p, {
      affordanceId: chosen.id,
      action: chosen.action,
      status: 'completed',
      at: at + chosen.duration,
    });
    act(p, MEAL, base + 19 * 60);
    act(p, SLEEP, base + 22 * 60);
    const w = Math.floor(d / 7);
    weekly[w] ??= { assents: 0, prompts: 0, guiltAtPrompt: 0 };
    const row = weekly[w];
    if (chosen === OPTION) row.assents += 1;
    if (prompted) row.prompts += 1;
    if (prompted) row.guiltAtPrompt = Math.max(row.guiltAtPrompt, Math.round(guilt * 100) / 100);
    practice = p.promptings?.responses[0]?.practice ?? 0;
  }
  return {
    person: p,
    arm,
    weekly,
    breaches: p.conscience.breaches.length,
    habit: Math.round((p.habits.find((h) => h.action === 'option')?.strength ?? 0) * 100) / 100,
    practice,
    alive: p.body.alive,
  };
}

export function runPromptingsControl(days = 60) {
  return (['A', 'B', 'C', 'K-small', 'K-large'] as const).map((arm) => {
    const { person: _p, ...row } = runArm(arm, days);
    return row;
  });
}

if (process.argv[1]?.endsWith('/promptings-control.ts'))
  console.log(JSON.stringify({ framework: FRAMEWORK_VERSION, arms: runPromptingsControl() }, null, 1));
