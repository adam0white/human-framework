import { expect, test } from 'vitest';
import {
  createPerson,
  decide,
  describePerson,
  intentionFor,
  linesFor,
  snapshot,
  villagerSpec,
  voiceLine,
} from '../src/index.ts';

const person = () => createPerson(villagerSpec('ali', 'Ali', 7, { now: 720 }));

test('plain narration is explicit and host phrase packs keep precedence', () => {
  const p = person();
  const reply = { voiceId: 'chef', verdict: 'complied' as const, reason: 'insist', says: '' };
  const before = snapshot(p);
  expect(voiceLine(p, reply, 'b')).toBe("If you insist. I'd rather not.");
  expect(voiceLine(p, reply, 'b', { plainEnglish: true })).toBe(
    'I will do it if you insist, but I would rather not.',
  );
  expect(
    linesFor('voice.commanded', {
      plainEnglish: true,
      lines: { 'voice.commanded': ['I hear you.'] },
      extend: { 'voice.commanded': ['I will begin.'] },
    }),
  ).toEqual(['I hear you.', 'I will begin.']);
  expect(snapshot(p)).toEqual(before);
});

test('plain intentions and summaries form complete sentences without changing the person', () => {
  const p = person();
  const record = decide(p, [
    { id: 'work', action: 'work', label: 'work', effort: 0, duration: 10, advertises: {}, material: 1 },
  ]);
  const before = snapshot(p);
  expect(intentionFor(p, record, { plainEnglish: true })).toBe('I want to earn money.');
  expect(describePerson(p, { plainEnglish: true })).toMatch(/^Ali is /);
  expect(describePerson(p, { plainEnglish: true })).not.toContain(';');
  expect(snapshot(p)).toEqual(before);
});

test('the language control separates wording without advancing the actor', async () => {
  const { main } = await import('../examples/plain-narration-control.ts');
  const result = main();
  expect(result.unchanged).toBe(true);
  expect(result.arms[0]?.reply).not.toBe(result.arms[1]?.reply);
});

test('unopted actors continue exactly from the published 2.18.0 package', async () => {
  const hf = await import('../src/index.ts');
  const { optInContinuation } = await import('./opt-in-continuation-fixture.ts');
  const { buildLegacyProjectLoopSave, legacyProjectLoopContinuation } = await import(
    './legacy-projects-loop-fixture.ts'
  );
  // Generated from the npm 2.18.0 tarball, not candidate source. Includes full state and traces.
  expect(optInContinuation(hf, 7)).toEqual({ digest: 'cc0e2f2a835bcae8', refs: 1 });
  expect(legacyProjectLoopContinuation(hf, buildLegacyProjectLoopSave(hf))).toBe(
    '7fe8c91a4fa5d8b77bbdb4f9814fc8ce38272adef5bf11b46ba4209bc003caa1',
  );
});

test('an opted-in person records plain prose and replays from the saved choice', async () => {
  const { predict, restore } = await import('../src/index.ts');
  const spec = { ...villagerSpec('ali', 'Ali', 7, { now: 720 }), lexicon: { plainEnglish: true } };
  const first = createPerson(spec);
  const resumed = restore(snapshot(first));
  const legacy = person();
  const offers = [
    { id: 'work', action: 'work', label: 'work', effort: 0, duration: 10, advertises: {}, material: 1 },
  ];
  const ask = { voiceId: 'chef', action: 'work', strength: 1 };
  const before = snapshot(first);
  expect(predict(first, offers, ask).says).toMatch(/[.!?]$/);
  expect(snapshot(first)).toEqual(before);
  const result = decide(first, offers, { suggestion: ask });
  expect(decide(resumed, offers, { suggestion: ask })).toEqual(result);
  expect(snapshot(resumed)).toEqual(snapshot(first));
  const old = decide(legacy, offers, { suggestion: ask });
  expect(result.chosenAffordanceId).toBe(old.chosenAffordanceId);
  expect(first.rng).toEqual(legacy.rng);
  expect(result.intention).toMatch(/^[A-Z].*[.]$/);
});

test('plain narration preserves authored intention slots and summary contracts', () => {
  const p = person();
  const record = decide(p, [
    { id: 'work', action: 'work', label: 'work', effort: 0, duration: 10, advertises: {}, material: 1 },
  ]);
  expect(
    intentionFor(p, record, {
      plainEnglish: true,
      materialMeaning: 'food',
      lines: { 'intention.material.named': ['I intend to obtain {material}'] },
    }),
  ).toBe('I intend to obtain food');
  expect(
    describePerson(p, {
      plainEnglish: true,
      lines: { 'describe.line': ['{name} is {act} ({state}).'], 'describe.idle': ['waiting for the bus'] },
    }),
  ).toBe('Ali is waiting for the bus (well).');
});
