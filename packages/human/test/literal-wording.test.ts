import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { main, wordingRun } from '../examples/literal-wording-control.ts';
import * as hf from '../src/index.ts';
import { EN_LINES } from '../src/narrate/lexicon.ts';
import { PLAIN_EN_LINES } from '../src/narrate/plain.ts';
import type { Lexicon } from '../src/types.ts';

const literal: Lexicon = { plainEnglish: true, wording: 'literal-v1' };

test('frozen overlays preserve counts, slots, custom precedence and unsupported selectors', () => {
  for (const plainEnglish of [false, true]) {
    const old = plainEnglish ? PLAIN_EN_LINES : EN_LINES;
    for (const key of Object.keys(EN_LINES)) {
      const lines = hf.linesFor(key, { plainEnglish, wording: 'literal-v1' });
      expect(lines).toHaveLength(old[key]?.length ?? EN_LINES[key]?.length ?? 0);
      expect(lines.map((s) => s.match(/\{\w+\}/g))).toEqual(
        (old[key] ?? EN_LINES[key])?.map((s) => s.match(/\{\w+\}/g)),
      );
      expect(hf.linesFor(key, { plainEnglish, wording: 'unknown' } as unknown as Lexicon)).toEqual(
        hf.linesFor(key, { plainEnglish }),
      );
    }
    expect(hf.linesFor('need:water', { plainEnglish, wording: 'literal-v1' }).slice(0, 2)).toEqual(
      old['need:water']?.slice(0, 2),
    );
    expect(hf.linesFor('need:water', { plainEnglish, wording: 'literal-v1' })[2]).not.toContain('well');
  }
  expect(
    hf.linesFor('cite.bad', {
      ...literal,
      lines: { 'cite.bad': ['Authored {summary}'] },
      extend: { 'cite.bad': ['Appended {summary}'] },
    }),
  ).toEqual(['Authored {summary}', 'Appended {summary}']);
  const p = hf.createPerson(hf.villagerSpec('p', 'Ada', 7));
  const modified = { voiceId: 'v', verdict: 'modified' as const, reason: 'x', says: '' };
  expect(hf.voiceLine(p, modified, 'x', literal)).toContain('this: something similar.');
  expect(hf.voiceLine(p, { ...modified, counterOffer: { label: 'Supper' } }, 'x', literal)).toContain(
    'this: Supper.',
  );
});

test('all deferral paths preserve arbitrary label bytes and exact raw semantics with an explicit text allowlist', () => {
  for (const label of [
    'repair the hall',
    'Repair the flood-damaged hall',
    'Supper',
    'Ada “A”',
    'work-ID_9',
  ]) {
    const old = wordingRun(hf, { plainEnglish: true }, label);
    const enabled = wordingRun(hf, literal, label);
    // Exact paths only: no recursive prose stripping or field-name normalization.
    const expected = structuredClone(old);
    expected.forEach((frame, index) => {
      assert(frame.initial.lexicon && frame.final.lexicon);
      frame.initial.lexicon.wording = 'literal-v1';
      frame.final.lexicon.wording = 'literal-v1';
      const kind = index === 2 ? 'duty' : 'task';
      const before = `after I finish this ${kind} (${label})`;
      const after = `after I finish the ${kind} called “${label}”`;
      const saved = frame.final.trace[0];
      assert(saved);
      const records = [frame.record, saved];
      for (const record of records) {
        const deferred = record.suggestions?.[0];
        assert(deferred);
        if (index === 2) assert(record.suggestion);
        const replies = new Set([deferred, ...(index === 2 && record.suggestion ? [record.suggestion] : [])]);
        for (const reply of replies) {
          assert(reply.counterOffer);
          expect(reply.counterOffer.label).toBe(before);
          expect(reply.says).toBe(`After I finish this ${kind} (${label}), I will do it.`);
          reply.counterOffer.label = after;
          reply.says = `After I finish the ${kind} called “${label}”, I will do it.`;
        }
      }
    });
    expect(enabled).toEqual(expected);
  }
  expect(main()).toMatchObject({ routes: 3, replay: 'full raw exact' });
});

test('citation keeps the explicitly recalled episode or told gist, raw summary and positive stitching', () => {
  const p = hf.createPerson(hf.villagerSpec('p', 'Ada', 7));
  const record = hf.decide(p, [
    { id: 'work', action: 'work', label: 'work', duration: 1, effort: 0, advertises: {}, material: 1 },
  ]);
  const chosen = record.considered[0];
  assert(chosen);
  chosen.terms.push({ source: 'expectation', value: 1 });
  const summary = 'Selin said: “The water was safe.”';
  for (const valence of [-0.8, 0.8]) {
    p.memory.episodes = [];
    hf.remember(p, { at: p.now - 60, kind: 'told', summary, valence, salience: 0.8, tags: [] });
    const episode = p.memory.episodes[0];
    assert(episode);
    chosen.recalled = [episode.id, 'unrelated'];
    for (const gist of [false, true]) {
      if (gist) {
        p.memory.gists = [
          { ...episode, count: 1, firstAt: episode.at, lastAt: episode.at, weight: 1, peak: 0.8 },
        ];
        p.memory.episodes = [];
      }
      const before = hf.snapshot(p);
      const text = hf.narrateDecision(p, record, literal);
      expect(text).toContain(
        valence < 0 ? `I remember something bad: ${summary}.` : `I remember: ${summary}.`,
      );
      expect(hf.snapshot(p)).toEqual(before);
      expect(chosen.recalled).toEqual([episode.id, 'unrelated']);
      if (valence > 0) expect(text).toBe(hf.narrateDecision(p, record, { plainEnglish: true }));
    }
  }
});

// Actual published3.1 inputs and outputs, including engine stamps, history, prose and RNG.
test('absent selector continues immutable npm3.1 input byte exactly', () => {
  const { fixtures } = JSON.parse(
    readFileSync(new URL('./fixtures/literal-engine-3.1.0.json', import.meta.url), 'utf8'),
  );
  for (const { inputs } of fixtures)
    for (const input of inputs) {
      const p = structuredClone(input.initial);
      const record = hf.decide(p, input.offers, input.options);
      expect(JSON.stringify(record)).toBe(JSON.stringify(input.record));
      expect(JSON.stringify(hf.snapshot(p))).toBe(JSON.stringify(input.final));
    }
});

test('selector does not enable plain English or rewrite retained records on adoption', () => {
  const legacy = wordingRun(hf, {});
  const selected = wordingRun(hf, { wording: 'literal-v1' });
  const expected = structuredClone(legacy);
  for (const frame of expected) {
    assert(frame.initial.lexicon && frame.final.lexicon);
    frame.initial.lexicon.wording = 'literal-v1';
    frame.final.lexicon.wording = 'literal-v1';
  }
  expect(selected).toEqual(expected);
  const unsupported = wordingRun(hf, { plainEnglish: true, wording: 'unknown' } as unknown as Lexicon);
  const unsupportedExpected = structuredClone(wordingRun(hf));
  for (const frame of unsupportedExpected) {
    assert(frame.initial.lexicon && frame.final.lexicon);
    Object.assign(frame.initial.lexicon, { wording: 'unknown' });
    Object.assign(frame.final.lexicon, { wording: 'unknown' });
  }
  expect(unsupported).toEqual(unsupportedExpected);
  const frame = wordingRun(hf)[2];
  assert(frame);
  const p = hf.restore(frame.final);
  const retained = structuredClone(p.trace);
  assert(p.lexicon);
  p.lexicon.wording = 'literal-v1';
  expect(hf.restore(hf.snapshot(p)).trace).toEqual(retained);
  const record = p.trace[0];
  assert(record);
  expect(hf.narrateDecision(p, record, literal)).toBeTruthy();
  expect(p.trace).toEqual(retained);
});

test('water and recalled harm persist only the exact allowed narration leaves and replay raw', () => {
  const drink = {
    id: 'drink',
    action: 'drink',
    label: 'Water',
    duration: 1,
    effort: 0,
    advertises: { water: 1 },
  };
  const eat = {
    id: 'eat',
    action: 'eat',
    label: 'Supper',
    duration: 30,
    effort: 0.1,
    advertises: { food: 0.6 },
  };
  const forage = {
    id: 'forage',
    action: 'forage',
    label: 'Forage',
    placeId: 'forest',
    duration: 60,
    effort: 0.4,
    advertises: { food: 0.3 },
    risk: { chance: 0.5, severity: 0.5, kind: 'animal' },
  };
  const thirsty = hf.createPerson({
    ...hf.villagerSpec('p', 'Ada', 7, { now: 720, body: { hydration: 0.01 } }),
    lexicon: { plainEnglish: true },
  });
  const hurt = hf.createPerson({
    ...hf.villagerSpec('p', 'Ada', 3, { now: 720, body: { satiety: 0.1 } }),
    lexicon: { plainEnglish: true },
  });
  hf.begin(hurt, forage, hf.decide(hurt, [forage]));
  hf.tick(hurt, hurt.now + 60);
  hf.finish(hurt, {
    affordanceId: forage.id,
    action: forage.action,
    status: 'failed',
    at: hurt.now,
    injury: { part: 'leg', severity: 0.5, healRatePerDay: 0.1 },
    summary: 'Selin was hurt in the forest',
  });
  for (const { person, offers, from, to } of [
    {
      person: thirsty,
      offers: [drink],
      from: 'I am thirsty, so I will go to the well.',
      to: 'I am thirsty, so I need water.',
    },
    {
      person: hurt,
      offers: [eat, forage],
      from: 'Last time, Selin was hurt in the forest.',
      to: 'I remember something bad: Selin was hurt in the forest.',
    },
  ]) {
    const initial = hf.snapshot(person);
    const enabled = hf.restore(initial);
    assert(enabled.lexicon);
    enabled.lexicon.wording = 'literal-v1';
    const replay = hf.restore(hf.snapshot(enabled));
    const oldRecord = hf.decide(person, offers, { now: person.now + 60 });
    const newRecord = hf.decide(enabled, offers, { now: enabled.now + 60 });
    expect(oldRecord.narration).toContain(from);
    expect(hf.decide(replay, offers, { now: replay.now + 60 })).toEqual(newRecord);
    expect(hf.snapshot(replay)).toEqual(hf.snapshot(enabled));
    const expectedRecord = structuredClone(oldRecord);
    expectedRecord.narration = expectedRecord.narration.replace(from, to);
    expect(newRecord).toEqual(expectedRecord);
    const expectedState = hf.snapshot(person);
    assert(expectedState.lexicon);
    expectedState.lexicon.wording = 'literal-v1';
    const last = expectedState.trace.at(-1);
    assert(last);
    last.narration = last.narration.replace(from, to);
    expect(hf.snapshot(enabled)).toEqual(expectedState);
  }
});
