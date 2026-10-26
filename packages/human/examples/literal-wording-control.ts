/**
 * SCOPE: three real deferral routes, persisted text and raw save replay under literal-v1.
 * The same scenario accepts a published HF module for full legacy comparison. No prose,
 * state or RNG normalization is applied. This is a wording control, not a player test.
 */
import assert from 'node:assert/strict';
import * as source from '../src/index.ts';
import type { Lexicon } from '../src/types.ts';

export function wordingRun(hf: typeof source, lexicon: Lexicon = { plainEnglish: true }, label = 'Supper') {
  const offer = (id: string, extra = {}) => ({
    id,
    action: id,
    label: id,
    duration: 30,
    effort: 0,
    advertises: {},
    ...extra,
  });
  const create = (extra = {}) =>
    hf.createPerson({
      id: 'p',
      name: 'Ada',
      seed: 11,
      now: 600,
      bornAt: -15768000,
      sex: 'female',
      lexicon,
      needs: { esteem: 0.1, competence: 0.1 },
      ...extra,
    });
  const work = offer('work', { label, advertises: { esteem: 0.15, competence: 0.1 } });
  const rest = offer('rest', { label, advertises: { rest: 0.2 }, tags: ['rest'] });
  const chat = offer('chat', { advertises: { belonging: 0.1 }, tags: ['social'] });
  const ask = (voiceId: string, action: string, insist = false) => ({
    voiceId,
    action,
    strength: 0.6,
    insist,
  });
  const scenarios = [
    { p: create(), offers: [work, rest, chat], suggestions: [ask('selin', 'work'), ask('riza', 'chat')] },
    {
      p: create({
        voices: [
          { voiceId: 'selin', trust: 0.8 },
          { voiceId: 'riza', trust: 0.6 },
        ],
      }),
      offers: [work, rest, chat],
      suggestions: [ask('riza', 'chat', true), ask('selin', 'rest', true)],
    },
  ];
  const [, , , prayer] = hf.prayerWindows(0);
  assert(prayer);
  const p = create({
    now: prayer.from + Math.ceil(0.8 * (prayer.until - prayer.from)),
    values: { tradition: 0.9, achievement: 0.9 },
    norms: [{ normId: 'salah', standing: 'obligatory', conviction: 0.95 }],
  });
  hf.promise(p, { ...prayer, label });
  scenarios.push({
    p,
    offers: [
      work,
      offer('pray', { duration: 15, tags: ['worship'], norms: [{ normId: 'salah', relation: 'fulfills' }] }),
    ],
    suggestions: [ask('osman', 'work')],
  });
  return scenarios.map(({ p, offers, suggestions }) => {
    const initial = hf.snapshot(p);
    const resumed = hf.restore(initial);
    const record = hf.decide(p, offers, { suggestions });
    assert.deepEqual(hf.decide(resumed, offers, { suggestions }), record);
    assert.deepEqual(hf.snapshot(resumed), hf.snapshot(p));
    assert(record.suggestions?.some((r) => r.verdict === 'deferred'));
    return { initial, record, final: hf.snapshot(p) };
  });
}

export function main() {
  const plain = wordingRun(source);
  const literal = wordingRun(source, { plainEnglish: true, wording: 'literal-v1' });
  for (let i = 0; i < literal.length; i++) {
    const reply = literal[i]?.record.suggestions?.find((r) => r.verdict === 'deferred');
    assert.equal(
      reply?.counterOffer?.label,
      `after I finish the ${i === 2 ? 'duty' : 'task'} called “Supper”`,
    );
    assert.deepEqual(literal[i]?.final.rng, plain[i]?.final.rng);
    assert.equal(literal[i]?.record.chosenAffordanceId, plain[i]?.record.chosenAffordanceId);
  }
  return { routes: literal.length, replay: 'full raw exact', plain, literal };
}
if (import.meta.main) console.log(JSON.stringify(main(), null, 2));
