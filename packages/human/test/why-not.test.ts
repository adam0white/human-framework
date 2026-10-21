import { expect, test } from 'vitest';
import {
  begin,
  CONSCIENCE_DEFAULTS,
  type Considered,
  createPerson,
  decide,
  enableSuggestionReasons,
  type Person,
  predictResponse,
  promise,
  readPerson,
  resolveChoice,
  restore,
  snapshot,
} from '../src/index.ts';
import { ADULT, aff } from './support.ts';

const pause = aff('pause', { effort: 0, label: 'take a break' });
const task = aff('task', { effort: 0, advertises: { food: 0.2 } });
const offers = [pause, task];
const ask = { voiceId: 'voice', action: 'task', strength: 0 };
const scores: Considered[] = [
  { affordanceId: 'pause', action: 'pause', utility: 0.1, terms: [{ source: 'habit', value: 0.1 }] },
  { affordanceId: 'task', action: 'task', utility: 0.2, terms: [{ source: 'need:food', value: 0.2 }] },
];
function person(explain = false): Person {
  return createPerson({
    id: 'p',
    name: 'P',
    seed: 1,
    now: 600,
    bornAt: ADULT,
    sex: 'female',
    enable: explain ? { suggestionReasons: true } : undefined,
  });
}
function context(p: Person, desperation = 0) {
  return { now: p.now, affordances: offers, body: readPerson(p).body, desperation };
}
function resting(explain = false) {
  const p = person(explain);
  begin(p, pause, decide(p, [pause]));
  return p;
}
function rule(p: Person, firm?: true) {
  return promise(p, {
    kind: 'abstain',
    toId: 'self',
    label: 'leave it alone',
    actions: [],
    violatedBy: ['task'],
    from: 590,
    until: 700,
    importance: 0.2,
    ...(firm ? { firm } : {}),
  });
}

test('inertia explains a break deferral without changing legacy resolution JSON, state or RNG', () => {
  const legacy = resting();
  const p = restore(snapshot(legacy));
  enableSuggestionReasons(p);
  const before = snapshot(p);
  const old = predictResponse(legacy, scores, context(legacy), ask);
  const result = predictResponse(p, scores, context(p), ask);
  expect(result.verdict).toBe('deferred');
  expect(result.decidedBy).toEqual({ kind: 'inertia', margin: 0.05 });
  const { decidedBy: _, ...unchanged } = result;
  expect(JSON.stringify(unchanged)).toBe(JSON.stringify(old));
  expect(old).not.toHaveProperty('decidedBy');
  expect(snapshot(p)).toEqual(before);
  expect(JSON.stringify(old)).toBe(
    '{"voiceId":"voice","verdict":"deferred","reason":"habit","says":"","kind":"notNow","insteadAffordanceId":"pause","counterOffer":{"affordanceId":"task","label":"after I take a break"}}',
  );
});

test('separating terms use differences, sum repeated sources and break ties by source', () => {
  const p = person(true);
  const considered: Considered[] = [
    {
      affordanceId: 'pause',
      action: 'pause',
      utility: 0.6,
      terms: [
        { source: 'shared', value: 0.5 },
        { source: 'z', value: 0.1 },
        { source: 'a', value: 0.05 },
        { source: 'a', value: 0.05 },
        { source: 'effort', value: -0.1 },
      ],
    },
    {
      affordanceId: 'task',
      action: 'task',
      utility: 0.3,
      terms: [
        { source: 'shared', value: 0.5 },
        { source: 'effort', value: -0.2 },
      ],
    },
  ];
  expect(predictResponse(p, considered, context(p), ask).decidedBy).toEqual({
    kind: 'term',
    source: 'a',
    margin: 0.3,
  });
  const winner = considered[0];
  const z = winner?.terms.find((term) => term.source === 'z');
  if (!winner || !z) throw new Error('Missing separating term');
  z.value = 0.10004;
  winner.utility = 0.60004;
  expect(predictResponse(p, considered, context(p), ask).decidedBy).toEqual({
    kind: 'term',
    source: 'z',
    margin: 0.3,
  });
});

test('firm self-rules veto suggestions and self choice; insistence cannot override them', () => {
  const p = person(true);
  rule(p, true);
  for (const insist of [false, true]) {
    const r = predictResponse(p, scores, context(p), { ...ask, insist });
    expect(r).toMatchObject({ verdict: 'refused', kind: 'willNot', reason: 'rule:leave it alone' });
    expect(r).not.toHaveProperty('decidedBy');
  }
  expect(resolveChoice(p, scores, context(p)).chosenAffordanceId).toBe('pause');
  expect(predictResponse(p, scores, context(p, CONSCIENCE_DEFAULTS.necessityThreshold), ask).verdict).toBe(
    'assented',
  );
  p.body.satiety = 0;
  expect(decide(p, offers, { suggestion: ask }).suggestion?.verdict).toBe('assented');
  expect(predictResponse(p, scores, { ...context(p, 1), necessity: false }, ask).kind).toBe('willNot');
});

test('without firm the old score verdict stays; rules apply only to self abstentions in their window', () => {
  const p = person();
  const c = rule(p);
  expect(predictResponse(p, scores, context(p), ask).verdict).toBe('assented');
  c.firm = true;
  c.toId = 'other';
  expect(predictResponse(p, scores, context(p), ask).verdict).toBe('assented');
  c.toId = 'self';
  c.status = 'released';
  expect(predictResponse(p, scores, context(p), ask).verdict).toBe('assented');
  c.status = 'pending';
  expect(predictResponse(p, scores, { ...context(p), now: 700 }, ask).verdict).toBe('assented');
});

test('restore retains valid opt-ins and drops invalid firm and explanation values', () => {
  const p = person(true);
  rule(p, true);
  expect(snapshot(restore(snapshot(p)))).toEqual(snapshot(p));
  const bad = snapshot(p);
  Object.assign(bad.will, { suggestionReasons: 'true' });
  const commitment = bad.agenda.commitments[0];
  if (!commitment) throw new Error('Missing rule');
  Object.assign(commitment, { firm: 'true' });
  const clean = restore(bad);
  expect(clean.will).not.toHaveProperty('suggestionReasons');
  expect(clean.agenda.commitments[0]).not.toHaveProperty('firm');
  Object.assign(commitment, { firm: true, kind: 'promise' });
  expect(restore(bad).agenda.commitments[0]).not.toHaveProperty('firm');
});

test('insistence leaves no score explanation pointing at a displaced winner', () => {
  const p = person(true);
  const other = aff('other', { effort: 0 });
  const c: Considered[] = [
    { affordanceId: 'pause', action: 'pause', utility: 0.3, terms: [{ source: 'habit', value: 0.3 }] },
    { affordanceId: 'task', action: 'task', utility: 0.2, terms: [] },
    { affordanceId: 'other', action: 'other', utility: 0.1, terms: [] },
  ];
  const result = resolveChoice(p, c, { ...context(p), affordances: [...offers, other] }, [
    ask,
    { voiceId: 'other-voice', action: 'other', strength: 1, insist: true },
  ]);
  expect(result.chosenAffordanceId).toBe('other');
  expect(result.suggestions?.find((r) => r.voiceId === 'voice')).toMatchObject({ verdict: 'deferred' });
  expect(result.suggestions?.find((r) => r.voiceId === 'voice')).not.toHaveProperty('decidedBy');
});
