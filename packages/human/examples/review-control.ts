/**
 * Headless control: evening self-review (muhasaba) vs none (2.7.0, `review/`).
 * Run: node packages/human/examples/review-control.ts
 *
 * Four people hold the same daily self-commitment, `tend` in an 18:00–18:30 window, against a cued habit toward
 * `linger` at the same place, on the same 30-day schedule (meals and a night's sleep supplied by the host). N
 * holds no review; A reviews by `accounting`; R by `ruminating`; X reviews by `accounting` but the habit is
 * weaker than the commitment from the start, so nothing lapses (no resolve forms: review is silent when
 * nothing is missed). `decisive` counts kept days the resolve decided (without its term, linger ranked
 * higher): the alternation is the resolve; the later steady keeping is the task's own habit taking over. Labels are neutral; no religious content is needed. Every number is an engineering
 * premise, not an estimate of people.
 */
import {
  type Affordance,
  begin,
  createPerson,
  decide,
  emotionLevel,
  enableReview,
  FRAMEWORK_VERSION,
  finish,
  type Person,
  promise,
  type ReviewStyle,
  reviewLine,
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
const TEND = offer('tend', { placeId: 'cue' });
const LINGER = offer('linger', { placeId: 'cue' });
const MEAL = offer('meal', { advertises: { food: 0.6, water: 0.6 }, duration: 30 });
const SLEEP = offer('sleep', { mode: 'sleep', duration: 8 * 60, effort: 0, advertises: { sleep: 1 } });

export type ReviewArm = 'N' | 'A' | 'R' | 'X';
const STYLE: Record<ReviewArm, ReviewStyle | undefined> = {
  N: undefined,
  A: 'accounting',
  R: 'ruminating',
  X: 'accounting',
};

function person(arm: ReviewArm): Person {
  const p = createPerson({ id: arm, name: arm, seed: 11, now: 0, bornAt: -30 * 365 * DAY, sex: 'male' });
  p.habits.push({
    cue: { placeId: 'cue' },
    action: 'linger',
    strength: arm === 'X' ? 0.1 : 0.45,
    repetitions: 120,
    lastAt: 0,
  });
  promise(p, {
    kind: 'promise',
    label: 'the evening task',
    actions: ['tend'],
    from: 18 * 60,
    until: 18 * 60 + 30,
    importance: 0.4,
    toId: 'self',
    recurEvery: DAY,
  });
  const style = STYLE[arm];
  if (style) enableReview(p, { style });
  return p;
}

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

export function runReviewArm(arm: ReviewArm, days = 30) {
  const p = person(arm);
  const daily: string[] = [];
  let maxDistress = 0;
  let decisive = 0;
  for (let d = 0; d < days; d++) {
    const base = d * DAY;
    act(p, MEAL, base + 8 * 60);
    act(p, MEAL, base + 13 * 60);
    const at = base + 18 * 60;
    const record = decide(p, [TEND, LINGER], { now: at });
    const chosen = record.chosenAffordanceId === 'tend' ? TEND : LINGER;
    const tend = record.considered.find((c) => c.affordanceId === 'tend');
    const linger = record.considered.find((c) => c.affordanceId === 'linger');
    const lean = tend?.terms.find((t) => t.source === 'review:resolve')?.value ?? 0;
    if (chosen === TEND && tend && linger && tend.utility - lean < linger.utility) decisive += 1;
    begin(p, chosen, record);
    finish(p, {
      affordanceId: chosen.id,
      action: chosen.action,
      status: 'completed',
      at: at + chosen.duration,
    });
    act(p, MEAL, base + 19 * 60);
    act(p, MEAL, base + 21 * 60 + 30);
    maxDistress = Math.max(maxDistress, emotionLevel(p, 'distress'));
    act(p, SLEEP, base + 22 * 60);
    daily.push(chosen.id === 'tend' ? 'T' : 'l');
  }
  return {
    person: p,
    arm,
    days: daily.join(''),
    kept: daily.filter((x) => x === 'T').length,
    /** Days kept that the resolve decided: without its term, linger would have ranked higher. */
    decisive,
    resolves: p.review?.resolves.length ?? 0,
    resolve: p.review?.resolves[0]?.strength ?? 0,
    line: reviewLine(p),
    maxDistress: Math.round(maxDistress * 100) / 100,
  };
}

export function runReviewControl(days = 30) {
  return (['N', 'A', 'R', 'X'] as const).map((arm) => {
    const { person: _p, ...row } = runReviewArm(arm, days);
    return row;
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`HF ${FRAMEWORK_VERSION} review control`);
  for (const row of runReviewControl()) console.log(JSON.stringify(row));
}
