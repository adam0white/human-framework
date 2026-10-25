import { expect, test } from 'vitest';
import type { Affordance, Lexicon, World } from '../src/index.ts';
import {
  begin,
  believe,
  converse,
  createCommunity,
  createPerson,
  decide,
  describePerson,
  enableDoze,
  enablePromptings,
  nafsPatterns,
  qalbReading,
  reasonLine,
  seedTie,
  stepCommunity,
} from '../src/index.ts';

const plain: Lexicon = {
  plainEnglish: true,
  names: { s: 'Sam', other: 'Olive', advisor: 'Ari', source: 'Sue' },
};
const person = (id = 'p', lexicon?: Lexicon) =>
  createPerson({
    id,
    name: id === 's' ? 'Speaker' : 'Ada',
    seed: 1,
    now: 120,
    bornAt: -15768000,
    sex: 'female',
    ...(lexicon ? { lexicon } : {}),
  });

test('listener chooses claim and advice prose and names in both lexicon directions', () => {
  const speaker = person('s');
  speaker.lexicon = { names: { other: 'Wrong name' } };
  const listener = person('p', plain);
  believe(speaker, 'other:generous', true, 0.99, 's', 120);
  believe(speaker, 'p:should:get-water', true, 0.99, 's', 120);
  const result = converse(speaker, listener, { at: 120 });
  expect(result.told.find((p) => p.kind === 'gossip')?.summary).toBe('Sam says Olive is generous.');
  expect(result.advice[0]?.percept.summary).toBe('Sam suggests this action: get water.');
  speaker.lexicon = plain;
  delete listener.lexicon;
  const legacy = converse(speaker, listener, { at: 120 });
  expect(legacy.told.find((p) => p.kind === 'gossip')?.summary).toBe('Speaker says other is generous');
  expect(legacy.advice[0]?.percept.summary).toBe('Speaker says I should get-water');
  speaker.lexicon = { names: { other: 'Wrong name' } };
  listener.lexicon = { names: { other: 'Different legacy name' } };
  expect(converse(speaker, listener, { at: 120 })).toEqual(legacy);
});

test('lens rows identify each held rule and each trust subject', () => {
  const p = person('p', plain);
  p.conscience.norms = [{ normId: 'zakat', conviction: 1, standing: 'obligatory' }];
  p.will.voices = [{ voiceId: 'advisor', trust: 0.1, pressure: 0, accepted: 0, refused: 0, history: [] }];
  p.memory.sourceTrust.source = 0.8;
  seedTie(p, { otherId: 'other', trust: 0.5 });
  const rows = qalbReading(p);
  expect(rows.find((r) => r.facet === 'held-norm')?.text).toContain('Give the required share');
  expect(rows.find((r) => r.evidence.includes('social.relationships:other'))?.text).toContain('Olive');
  expect(rows.find((r) => r.evidence.includes('will.voices:advisor'))?.text).toContain('Ari');
  expect(rows.find((r) => r.evidence.includes('memory.sourceTrust:source'))?.text).toContain('Sue');
  expect(rows.map((r) => r.text).join(' ')).not.toContain('arousal');
});

test('plain state lists, bladder refusal, and single urge evidence use complete wording', () => {
  const p = person('p', plain);
  p.body.satiety = 0.1;
  p.body.hydration = 0.1;
  p.body.sleepPressure = 0;
  p.body.pain = 0;
  p.affect.emotions = [];
  expect(describePerson(p)).toContain('hungry and thirsty');
  expect(reasonLine('need:bladder', plain)).toBe('I need to use the toilet first.');
  enablePromptings(p);
  p.promptings?.recent.push({
    at: 120,
    action: 'wait',
    affordanceId: 'wait',
    source: 'host',
    opposedBy: 'norm:n',
    outcome: 'assented',
  });
  p.promptings?.recent.push({
    at: 120,
    action: 'wait',
    affordanceId: 'wait',
    source: 'host',
    opposedBy: 'norm:n',
    outcome: 'passed',
  });
  const lines = nafsPatterns(p, { guiltLoad: 0, guilt: 0 })
    .map((r) => r.evidence)
    .join(' ');
  expect(lines).toContain('1 recent urge despite');
  expect(lines).toContain('1 recent urge passed');
  expect(lines).toContain('1 was acted on');
});

const offer: Affordance = {
  id: 'watch',
  label: 'Watch the gate',
  action: 'watch',
  duration: 180,
  effort: 0.1,
  advertises: {},
};
test('doze finish retains outcome prose and event links, with a plain fallback', () => {
  for (const summary of [undefined, 'The watch ended early.']) {
    const p = person('p', plain);
    p.body.sleepPressure = 1;
    p.body.sleepDebt = 48;
    enableDoze(p, { posture: 'reclined', stimulation: 0 });
    const act = begin(p, offer, decide(p, [offer]));
    if (!act) throw new Error('No activity');
    act.reviewAt = 300;
    const world: World = {
      now: () => 120,
      affordancesFor: () => [],
      perceptsFor: () => [],
      resolve: (p, a) => ({
        at: p.now,
        affordanceId: a.affordanceId,
        action: a.action,
        status: 'interrupted',
        ...(summary ? { summary } : {}),
      }),
    };
    const event = stepCommunity(createCommunity([p]), world, 200).find((e) => e.kind === 'finish');
    expect(event).toMatchObject({
      decisionId: act.decisionId,
      affordanceId: offer.id,
      detail: summary ?? 'Ada stopped the task “Watch the gate” because they dozed off.',
    });
  }
});

test('proposal names partners outside the quoted task', () => {
  const p = person('p', plain);
  const q = person('q');
  q.name = 'Ben';
  const shared: Affordance = {
    ...offer,
    id: 'walk',
    action: 'walk',
    label: 'Walk together',
    with: ['q'],
    tags: ['joint'],
  };
  const world: World = {
    now: () => 120,
    affordancesFor: (p) => (p.id === 'p' ? [shared] : []),
    perceptsFor: () => [],
    resolve: () => {
      throw new Error('No resolve');
    },
  };
  const events = stepCommunity(createCommunity([p, q]), world, 120);
  expect(events.find((e) => e.kind === 'propose')?.detail).toBe(
    'Ada proposed the shared task “Walk together” with Ben.',
  );
});
