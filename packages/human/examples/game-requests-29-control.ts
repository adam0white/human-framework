/**
 * Headless control for the 2.9.0 game requests: one act keeping several named commitments, cued turning-away
 * responses, a host-set practice half-life, and a resolve term that names its resolve.
 * Run: node packages/human/examples/game-requests-29-control.ts
 *
 * 1. Several named commitments. A person has two pending commitments, a word to `q` (`meet`) and a daily `call`.
 *    One completed `meet` names both in `fulfills`. Arms: one named (2.8.0 rule, earliest-ending kept) and both
 *    named. Expected: one kept, then both kept.
 * 2. Cued responses. A person is pulled by habit toward two acts, `a` against norm n1 and `b` against norm n2, and
 *    holds a well-practised response `r1` and a weak uncued `general`. Arms: `r1` uncued (2.8.0) and `r1` cued to
 *    n1. Expected: uncued, `r1` turns the person from both; cued, `r1` serves only `a` and `general` serves `b`.
 * 3. Practice half-life. A response at practice 0.8 goes unused for 7 days. Arms: default (60 days) and
 *    `practiceHalfLifeDays: 7`. Expected: about 0.74, then 0.4.
 * 4. A resolve's name. A person who broke a commitment `task` reviews in the evening, then chooses again while a
 *    new `task` commitment is pending. Expected: the chosen offer's `review:resolve` term has `ref`
 *    `promise:self:task`, the resolve's key; `source` is unchanged.
 *
 * Labels are neutral. Every number is an engineering premise, not an estimate of people.
 */
import {
  type Affordance,
  begin,
  createPerson,
  decide,
  enablePromptings,
  enableReview,
  FRAMEWORK_VERSION,
  finish,
  type Person,
  promise,
  promptingsReading,
  reviewIfDue,
  tick,
} from '../src/index.ts';

const DAY = 1440;
const adult = (id: string, now = 600, extra: Partial<Parameters<typeof createPerson>[0]> = {}): Person =>
  createPerson({ id, name: id, seed: 3, now, bornAt: -30 * 365 * DAY, sex: 'female', ...extra });

/** Arm 1: how many commitments one completed act keeps when it names one or both. */
export function runFulfillsArm(named: 1 | 2): { kept: string[] } {
  const p = adult('f');
  const word = promise(p, {
    kind: 'promise',
    label: 'my word to Q',
    actions: ['meet'],
    from: 600,
    until: 720,
    importance: 0.6,
    toId: 'q',
  });
  const call = promise(p, {
    kind: 'promise',
    label: 'my call',
    actions: ['call'],
    from: 600,
    until: 1200,
    importance: 0.4,
    toId: 'self',
  });
  const meet: Affordance = {
    id: 'meet',
    action: 'meet',
    label: 'meet',
    duration: 60,
    effort: 0.1,
    advertises: { belonging: 0.2 },
    fulfills: named === 2 ? [word.id, call.id] : [call.id],
  };
  const r = decide(p, [meet]);
  begin(p, meet, r);
  finish(p, { affordanceId: 'meet', action: 'meet', status: 'completed', at: p.now + 60 });
  return {
    kept: p.agenda.commitments.filter((c) => c.status === 'kept').map((c) => c.label ?? c.id),
  };
}

const tempting = (id: string, norm: string): Affordance => ({
  id,
  action: id,
  label: id,
  duration: 30,
  effort: 0.05,
  placeId: 'cue',
  norms: [{ normId: norm, relation: 'violates' }],
  advertises: {},
});

/** Arm 2: which response serves each prompt, with `r1` uncued or cued to n1. */
export function runCueArm(cued: boolean): Record<string, { response?: string; turn?: number }> {
  const p = adult('c', 600, {
    norms: [
      { normId: 'n1', standing: 'forbidden', conviction: 0.4 },
      { normId: 'n2', standing: 'forbidden', conviction: 0.4 },
    ],
  });
  for (const action of ['a', 'b'])
    p.habits.push({ cue: { placeId: 'cue' }, action, strength: 0.7, repetitions: 200, lastAt: 0 });
  enablePromptings(p, {
    responses: [
      { id: 'r1', kind: 'refuge', practice: 0.8, ...(cued ? { cue: 'n1' } : {}) },
      { id: 'general', kind: 'leave', practice: 0.2 },
    ],
  });
  const wait: Affordance = {
    id: 'wait',
    action: 'wait',
    label: 'wait',
    duration: 30,
    effort: 0,
    advertises: {},
  };
  const r = decide(p, [tempting('a', 'n1'), tempting('b', 'n2'), wait]);
  const out: Record<string, { response?: string; turn?: number }> = {};
  for (const id of ['a', 'b']) {
    const rec = p.promptings?.recent.find((x) => x.affordanceId === id);
    const turn = r.considered
      .find((c) => c.affordanceId === id)
      ?.terms.find((t) => t.source === 'promptings:turn');
    out[id] = {
      ...(rec?.responseId !== undefined ? { response: rec.responseId } : {}),
      ...(turn ? { turn: turn.value } : {}),
    };
  }
  return out;
}

/** Arm 3: practice after a week unused, at the default half-life or a host-set one. */
export function runHalfLifeArm(halfLifeDays?: number): number {
  const p = adult('h');
  enablePromptings(p, {
    responses: [{ id: 'r', kind: 'leave', practice: 0.8 }],
    ...(halfLifeDays !== undefined ? { practiceHalfLifeDays: halfLifeDays } : {}),
  });
  tick(p, p.now + 7 * DAY);
  return promptingsReading(p)?.responses[0]?.practice ?? 0;
}

/** Arm 4: the resolve term on the chosen offer after a reviewed lapse. */
export function runResolveRef(): {
  chosen: string | null;
  term?: { source: string; value: number; ref?: string };
} {
  const p = adult('r', 0);
  enableReview(p);
  const note = { id: 'n0', kind: 'promise', label: 'task', action: 'tend', toId: 'self' };
  reviewIfDue(p, 21 * 60, [], { day: 0, broken: [note], kept: [], released: [] } as never);
  tick(p, DAY + 600);
  promise(p, {
    kind: 'promise',
    label: 'task',
    actions: ['tend'],
    from: DAY + 600,
    until: DAY + 720,
    importance: 0.5,
    toId: 'self',
  });
  const offers: Affordance[] = [
    { id: 'tend', action: 'tend', label: 'tend', duration: 30, effort: 0.1, advertises: {} },
    { id: 'idle', action: 'idle', label: 'idle', duration: 30, effort: 0, advertises: { rest: 0.05 } },
  ];
  const r = decide(p, offers);
  const term = r.considered
    .find((c) => c.affordanceId === 'tend')
    ?.terms.find((t) => t.source === 'review:resolve');
  return { chosen: r.chosenAffordanceId, ...(term ? { term } : {}) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`HF ${FRAMEWORK_VERSION} game-requests 2.9 control`);
  console.log('fulfills, one named:', JSON.stringify(runFulfillsArm(1)));
  console.log('fulfills, both named:', JSON.stringify(runFulfillsArm(2)));
  console.log('responses, r1 uncued:', JSON.stringify(runCueArm(false)));
  console.log('responses, r1 cued n1:', JSON.stringify(runCueArm(true)));
  console.log('practice after 7 idle days, default:', runHalfLifeArm());
  console.log('practice after 7 idle days, half-life 7:', runHalfLifeArm(7));
  console.log('resolve term:', JSON.stringify(runResolveRef()));
}
