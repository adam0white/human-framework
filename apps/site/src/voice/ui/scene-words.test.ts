import { expect, test } from 'vitest';
import type { Frame, LogEntry } from '../protocol.ts';
import { sampleFrame } from '../sim/fixtures.ts';
import { sceneBeat, sceneWord, sceneWordChoices } from './scene-words.ts';

function occasion(text: string): Frame {
  const frame = structuredClone(sampleFrame);
  Object.assign(frame, { phase: 'day', day: 1, minute: 600, clock: '10:00', muted: false, sceneWords: [] });
  frame.halil = { ...frame.halil, asleep: false, doing: null, felt: [], onMind: [] };
  frame.log = [{ id: 'a', day: 1, minute: 600, clock: '10:00', kind: 'act', who: 'halil', text }];
  return frame;
}
function entry(frame: Frame, index: number): LogEntry {
  const line = frame.log.at(index);
  if (!line) throw Error('Missing test log');
  return line;
}
test('a pre-clinic health conversation never invents a consultation', () => {
  const frame = occasion('I call Selin.');
  frame.log.unshift({
    id: 's',
    day: 1,
    minute: 599,
    clock: '09:59',
    kind: 'voice',
    who: 'selin',
    text: 'Selin said: see the doctor.',
  });
  const care = sceneWord(frame, 'care', sceneBeat(frame));
  const question = sceneWord(frame, 'question', sceneBeat(frame));
  expect(care?.answer).not.toMatch(/doctor said|he said|consultation/);
  expect(question?.answer).not.toMatch(/doctor said|he said/);
  expect(care?.words).toContain('worry');
});
test('a rent conversation keeps the rent ahead of generic company', () => {
  const frame = occasion('I talk with Hacer at the door.');
  frame.halil.onMind = [{ id: 'rent', label: 'Pay Osman the rent', state: 'open', due: 'Ramadan 15' }];
  const care = sceneWord(frame, 'care', sceneBeat(frame));
  expect(care?.words).toContain('rent');
  expect(care?.answer).toContain('adding it up');
});
test('a chosen line is never silently replaced when tiredness changes during the same beat', () => {
  const frame = occasion('I repair in the workshop.');
  frame.composer = { open: false, reason: 'busy' };
  frame.halil.doing = { label: 'repair in the workshop', intention: 'work', until: '12:00' };
  const beat = sceneBeat(frame);
  const words = sceneWordChoices(frame).find((line) => line.kind === 'care')?.words;
  expect(words).toContain('while you work');
  frame.halil.felt = [{ id: 'tired', level: 0.9, word: 'tired' }];
  expect(sceneBeat(frame)).toBe(beat);
  expect(sceneWord(frame, 'care', beat, words)).toBeNull();
});
test('faith never supplies a filler act, and old quick suggestions do not consume care', () => {
  const frame = occasion('I talk with Hacer at the door.');
  const line = sceneWord(frame, 'care', sceneBeat(frame));
  if (!line) throw Error('No care line');
  frame.sceneWords = [{ ...line, kind: 'suggestion' }];
  expect(sceneWordChoices(frame)).toHaveLength(2);
  frame.halil.doing = { label: 'pray at home', intention: 'pray', until: '10:15' };
  expect(sceneWordChoices(frame)).toHaveLength(0);
  frame.halil.doing = null;
  frame.halil.asleep = true;
  expect(sceneWordChoices(frame)).toHaveLength(0);
});

test('rent care does not reopen on each activity or a later day', () => {
  const frame = occasion('I talk with Hacer at the door.');
  frame.halil.onMind = [{ id: 'rent', label: 'Pay Osman the rent', state: 'open', due: 'Ramadan 15' }];
  const line = sceneWord(frame, 'question', sceneBeat(frame));
  if (!line) throw Error('No rent question');
  frame.sceneWords = [line];
  frame.day = 2;
  frame.log = [{ ...entry(frame, 0), id: 'next', day: 2 }];
  expect(sceneWordChoices(frame)).toEqual([]);
  // Previous exported inputs stay valid even though today's UI no longer offers them.
  expect(sceneWord(frame, 'care', sceneBeat(frame))?.words).toContain('rent');
});

test('the clinic offers one bounded reply, then keeps quiet across later occasions', () => {
  const frame = occasion('I wait.');
  frame.log.push({
    id: 'doctor',
    day: 1,
    minute: 600,
    clock: '10:00',
    kind: 'voice',
    who: 'doctor',
    text: 'The doctor said your blood pressure is high.',
  });
  const words = sceneWordChoices(frame).find((line) => line.kind === 'care')?.words;
  expect(words).toBe('You do not have to talk more about what the doctor said.');
  const line = sceneWord(frame, 'care', sceneBeat(frame), words);
  expect(line?.answer).toContain('do not want to go over them again');
  if (!line) throw Error('No clinic reply');
  frame.sceneWords = [line];
  frame.log.push({ ...entry(frame, -1), id: 'doctor-again' });
  expect(sceneWordChoices(frame)).toEqual([]);
  expect(sceneWord(frame, 'care', sceneBeat(frame), 'That was a lot to hear.')?.answer).toBe(
    'It was. I am still thinking about what the doctor said.',
  );
});

test('the empty place gets one particular response, not a repeated Nuran topic', () => {
  const frame = occasion('I eat at home.');
  frame.log.unshift({
    id: 'memory',
    day: 1,
    minute: 599,
    clock: '09:59',
    kind: 'recall',
    who: 'halil',
    text: 'He remembers: Nuran across the table at a meal.',
  });
  const words = sceneWordChoices(frame).find((line) => line.kind === 'care')?.words;
  expect(words).toBe('You do not have to say more about missing Nuran at the table.');
  const line = sceneWord(frame, 'care', sceneBeat(frame), words);
  expect(line?.answer).toContain('sitting with Nuran');
  if (!line) throw Error('No Nuran reply');
  frame.sceneWords = [line];
  frame.log.push({ ...entry(frame, 1), id: 'grave', text: 'I visit Nuran’s grave.' });
  expect(sceneWordChoices(frame)).toEqual([]);
});

test('unsaid lines do not exhaust a topic and generic reassurance is not an activity', () => {
  const frame = occasion('I wait.');
  expect(sceneWordChoices(frame)).toEqual([]);
  frame.log = [{ ...entry(frame, 0), text: 'I talk with Hacer at the door.' }];
  const line = sceneWord(frame, 'care', sceneBeat(frame));
  if (!line) throw Error('No company reply');
  frame.sceneWords = [{ ...line, said: false }];
  expect(sceneWordChoices(frame)).toHaveLength(2);
});
