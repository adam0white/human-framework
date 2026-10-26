import { expect, test } from 'vitest';
import { makePlaytestFile } from '../../shared/playtest.ts';
import { sampleFrame } from '../sim/fixtures.ts';
import { VoiceGame } from '../sim/game.ts';
import { RecordedGame, replayVoice, voiceHash } from '../sim/record.ts';
import { automaticTick, skipStop, skipTick } from './automatic-pace.ts';
import { savedVoice, saveVoice } from './autosave.ts';

test('automatic and menu pace affect wall time while reading slows the clock', () => {
  const frame = { ...sampleFrame, pace: 'slow' as const, fastForward: undefined };
  expect(automaticTick(1000, frame, 'automatic', false, false)).toBe(1000);
  expect(automaticTick(1000, frame, 'fast', false, false)).toBe(7500);
  expect(automaticTick(1000, frame, 'fast', true, false)).toBe(31.25);
  expect(skipTick({ ...frame, fastForward: 'busy' }) * 240).toBeCloseTo(1000);
});

test('skip stops at meals, prayer, waking, new scenes and day cards', () => {
  const frame = structuredClone(sampleFrame);
  Object.assign(frame, { phase: 'day', paused: false, minute: 1100, intro: undefined, pauseBeat: undefined });
  frame.sky.fast = { from: 300, until: 1101 };
  frame.sky.prayers = [{ name: 'Asr', minute: 1105 }];
  expect(skipStop(frame, { ...frame, minute: 1101 })).toBe(true);
  // Frame clocks are absolute; the sky's meal and prayer marks are local to the day.
  const midday = { ...frame, day: 1, minute: 1440 + 12 * 60 + 45 };
  midday.sky = { ...frame.sky, fast: { from: 299, until: 1126 } };
  expect(skipStop(midday, { ...midday, minute: 1440 + 1126 })).toBe(true);
  expect(skipStop(midday, { ...midday, minute: 1440 + 800 })).toBe(false);
  expect(skipStop(frame, { ...frame, minute: 1105 })).toBe(true);
  expect(skipStop(frame, { ...frame, halil: { ...frame.halil, asleep: !frame.halil.asleep } })).toBe(true);
  expect(skipStop(frame, { ...frame, phase: 'between' })).toBe(true);
  expect(skipStop(frame, { ...frame, minute: 1100.5 })).toBe(false);
  expect(
    skipStop(frame, {
      ...frame,
      log: [
        ...frame.log,
        {
          id: 'new-call',
          day: frame.day,
          minute: 1100,
          clock: '18:21',
          kind: 'act',
          who: 'halil',
          text: 'I call Selin.',
        },
      ],
    }),
  ).toBe(true);
});

test('a saved export restores by replay with the same hash, including historical pace inputs', async () => {
  const rec = new RecordedGame(new VoiceGame(7));
  rec.apply({ type: 'begin' });
  rec.apply({ type: 'dismissIntro' });
  rec.apply({ type: 'setPace', pace: 'fast' });
  for (let i = 0; i < 5; i++) rec.tick(1000);
  const file = await makePlaytestFile({
    game: 'voice',
    seed: 7,
    scenario: 'voice-2',
    minute: rec.game.t,
    log: rec.log,
    hash: voiceHash(rec.game),
    engine: 'test',
    snapshot: {},
  });
  let text = '';
  const storage = {
    setItem: (_key: string, value: string) => {
      text = value;
    },
    getItem: () => text,
  };
  expect(saveVoice(storage, file)).toBe(true);
  const saved = savedVoice(storage);
  expect(saved?.label).toMatch(/^Ramadan 1 · /);
  const restored = JSON.parse(saved?.text ?? '{}') as typeof file;
  expect(voiceHash(replayVoice(restored.seed, restored.log, 2).rec.game)).toBe(file.hash);
  expect(savedVoice({ getItem: () => '{broken' })).toBeNull();
  expect(
    saveVoice(
      {
        setItem: () => {
          throw new Error('quota');
        },
      },
      file,
    ),
  ).toBe(false);
});

test('save labels distinguish Eid from the days after Eid', () => {
  const file = { game: 'voice', log: [], minute: 31 * 1440 + 60 };
  expect(savedVoice({ getItem: () => JSON.stringify(file) })?.label).toBe('Eid · 01:00');
  expect(savedVoice({ getItem: () => JSON.stringify({ ...file, minute: 34 * 1440 + 60 }) })?.label).toBe(
    'After Eid · day 3 · 01:00',
  );
});
