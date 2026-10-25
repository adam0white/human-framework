import { expect, test } from 'vitest';
import { createPerson, enablePromptings, promptingLine, promptingsReading } from '../src/index.ts';
import { forecastLine } from '../src/prospection/forecast.ts';
import { reviewLine } from '../src/review/review.ts';
import type { Lexicon } from '../src/types.ts';

const plain = { plainEnglish: true } as Lexicon;
const person = () =>
  createPerson({ id: 'p', name: 'Ada', seed: 3, now: 600, bornAt: -9000000, sex: 'female', lexicon: plain });

test('plain prompting text reports choices without assigning an origin to a thought', () => {
  expect(promptingLine('whisper', 'turned', 'redirect', { plainEnglish: true })).toBe(
    'I felt a whisper urging me to act. I chose something else and let it pass.',
  );
  expect(promptingLine('whisper', 'turned', 'redirect')).toBe(
    'a whisper came; turned to something else and let it pass',
  );
  const p = person();
  enablePromptings(p, { reading: 'fault' });
  p.promptings?.recent.push({
    at: p.now,
    action: 'wait',
    affordanceId: 'wait',
    source: 'host',
    opposedBy: 'norm:n',
    outcome: 'passed',
  });
  expect(promptingsReading(p)?.lines).toEqual([
    'I had a thought that felt like wrongdoing. It passed without action.',
  ]);
});

test('plain forecast changes only its explanation and keeps host span wording', () => {
  const spans = [
    { label: 'climb', endsAt: 1, worst: 0.8, worstOf: 'fatigue' as const },
    { label: 'the return', endsAt: 2, worst: 0.99, worstOf: 'fatigue' as const },
  ];
  const before = structuredClone(spans);
  expect(forecastLine(spans, undefined, { plainEnglish: true })).toBe(
    'I can do this. I will be too tired for the return.',
  );
  expect(forecastLine(spans)).toBe("I can do it, but I'll be spent for the return.");
  expect(spans).toEqual(before);
});

test('plain review preserves authored labels and reports an interruption without inventing an excuse', () => {
  const p = person();
  p.review = {
    style: 'accounting',
    at: 1260,
    lastDay: 0,
    resolves: [],
    last: { day: 0, kept: [], missed: ['my call to Mum'], resolved: [] },
  };
  expect(reviewLine(p, { cause: 'interrupted' })).toContain('my call to Mum');
  expect(reviewLine(p, { cause: 'interrupted' })).toContain('interrupted');
});

test('display readers explain known tokens without changing identity labels or exposing unknown codes', async () => {
  const { commitmentLabel, normLabel, reasonLine } = await import('../src/presentation.ts');
  const c = { kind: 'worship' as const, label: 'Fajr' };
  expect(commitmentLabel(c, plain)).toBe('the dawn prayer');
  expect(c.label).toBe('Fajr');
  expect(commitmentLabel({ kind: 'promise', label: 'my call to Mum' }, plain)).toBe('my call to Mum');
  expect(reasonLine('skill:carpentry', plain)).toBe('I do not have enough skill for that.');
  expect(reasonLine('host:secret', plain)).toBe('');
  expect(reasonLine('constructor', plain)).toBe('');
  expect(commitmentLabel({ kind: 'promise', label: '__proto__' }, plain)).toBe('__proto__');
  expect(reasonLine('skill:carpentry')).toBe('skill:carpentry');
  expect(normLabel({ id: 'custom', label: 'Care for the orchard' }, plain)).toBe('Care for the orchard');
});

test('plain downing memories use literal words while legacy text continues exactly', async () => {
  const { knockDown, standUp } = await import('../src/index.ts');
  const p = person();
  knockDown(p, { reason: 'injury' });
  standUp(p);
  expect(p.memory.episodes.map((e) => e.summary)).toContain('I could not stand up.');
  const legacy = person();
  delete legacy.lexicon;
  knockDown(legacy, { reason: 'injury' });
  expect(legacy.memory.episodes.map((e) => e.summary)).toContain('I went down and could not get up');
});

test('plain surface control keeps person state and forecast data unchanged', async () => {
  const { runPlainSurfacesControl } = await import('../examples/plain-surfaces-control.ts');
  expect(runPlainSurfacesControl()).toMatchObject({ unchangedState: true, unchangedSpans: true });
});

test('plain refusal names a prayer in English without changing the stored commitment', async () => {
  const { promise, voiceLine } = await import('../src/index.ts');
  const p = person();
  const duty = promise(p, {
    kind: 'worship',
    label: 'Fajr',
    actions: ['pray'],
    from: 600,
    until: 700,
    importance: 1,
  });
  expect(
    voiceLine(p, {
      voiceId: 'chef',
      verdict: 'refused',
      kind: 'willNot',
      reason: 'norm:salah',
      commitmentId: duty.id,
      says: '',
    }),
  ).toContain('the dawn prayer');
  expect(duty.label).toBe('Fajr');
});

test('a broken abstention names the violating action without calling it required', async () => {
  const { begin, decide, finish, promise, tick } = await import('../src/index.ts');
  const p = person();
  promise(p, {
    kind: 'abstain',
    label: 'my fast',
    actions: [],
    violatedBy: ['drink'],
    from: 600,
    until: 700,
    importance: 1,
  });
  const drink = {
    id: 'drink',
    action: 'drink',
    label: 'drink water',
    effort: 0,
    duration: 1,
    advertises: { water: 1 },
  };
  const decision = decide(p, [drink]);
  begin(p, drink, decision);
  tick(p, 601);
  finish(p, { affordanceId: drink.id, action: drink.action, status: 'completed', at: 601 });
  const memory = p.memory.episodes.find((episode) => episode.kind === 'missed');
  expect(memory?.summary).toContain('broke this abstention');
  expect(memory?.summary).toContain('drink');
  expect(memory?.summary).not.toContain('required');
});
