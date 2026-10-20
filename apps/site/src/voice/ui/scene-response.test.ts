import { expect, it } from 'vitest';
import type { Frame } from '../protocol.ts';
import { sampleFrame } from '../sim/fixtures.ts';
import { currentReply, sceneResponse } from './scene-response.ts';
import type { DayScene } from './scenes.ts';

function entry(frame: Frame, index: number) {
  const result = frame.log[index];
  if (!result) throw new Error('Missing test entry');
  return result;
}
function setup(name = 'Selin') {
  const frame = structuredClone(sampleFrame);
  frame.day = 1;
  frame.minute = 600;
  frame.halil.felt = [];
  frame.halil.onMind = [];
  frame.log = [
    {
      id: 'y',
      day: 1,
      minute: 590,
      clock: '09:50',
      kind: 'you',
      who: 'you',
      text: `You: mention · ${name === 'Selin' ? 'call Selin' : 'talk with Hacer at the door'}`,
    },
    {
      id: 'a',
      day: 1,
      minute: 600,
      clock: '10:00',
      kind: 'act',
      who: 'halil',
      text: 'I call Selin, because you asked.',
      decisionId: 'd',
    },
    {
      id: 'r',
      day: 1,
      minute: 600,
      clock: '10:00',
      kind: 'answer',
      who: 'halil',
      text: '“Alright, I’ll do it.”',
      tone: 'yes',
      decisionId: 'd',
    },
  ];
  const scene: DayScene = {
    id: 'scene:a',
    kind: name === 'Selin' ? 'call' : 'door',
    place: '',
    clock: '10:00',
    names: ['Halil', name],
    lines: [
      { speaker: 'Halil', words: 'I was remembering iftar with Nuran at our table, last Ramadan.' },
      {
        speaker: name,
        words: name === 'Selin' ? 'Tell me about that meal with Mum.' : 'Tell me about sitting with her.',
      },
    ],
    current: true,
    activity: '',
  };
  return { frame, scene };
}
it.each(['Selin', 'Hacer', 'Rıza'])(
  'answers %s with a bounded, grounded exchange and no frame writes',
  (name) => {
    const { frame, scene } = setup(name);
    if (name === 'Rıza') {
      scene.kind = 'tea';
      entry(frame, 0).text = 'You: mention · tea with Rıza';
    }
    const before = JSON.stringify(frame);
    const response = sceneResponse(frame, scene);
    expect(response?.accepted).toBe(true);
    expect(response?.lines.map((l) => l.speaker)).toEqual(['Halil', name]);
    expect(response?.lines[0]?.words).toMatch(/table|across/);
    expect(response?.lines[1]?.words).not.toMatch(/tell me|alright|fine/i);
    expect(response?.more).toHaveLength(2);
    expect(sceneResponse(structuredClone(frame), structuredClone(scene))).toEqual(response);
    expect(JSON.stringify(frame)).toBe(before);
  },
);
it('speaks a refusal verbatim in the scene without authoring agreement or continuation', () => {
  const { frame, scene } = setup();
  entry(frame, 2).tone = 'willNot';
  entry(frame, 2).text = '“No. Leave it.”';
  expect(sceneResponse(frame, scene)).toMatchObject({
    accepted: false,
    lines: [{ speaker: 'Halil', words: 'No. Leave it.' }],
    more: [],
  });
});
it('does not treat protest or postponement as a completed conversation', () => {
  const { frame, scene } = setup();
  for (const tone of ['protest', 'notNow', 'cannot'] as const) {
    entry(frame, 2).tone = tone;
    expect(sceneResponse(frame, scene)?.accepted).toBe(false);
  }
});
it('ends replies at a new occasion, including same-minute acts, new words and day changes', () => {
  const { frame, scene } = setup();
  expect(currentReply(frame, scene)?.id).toBe('r');
  const old = structuredClone(frame);
  frame.log.push({ ...entry(frame, 1), id: 'new', decisionId: 'different', text: 'I rest at home.' });
  expect(currentReply(frame, null)).toBeUndefined();
  frame.log = structuredClone(old.log);
  frame.log.push({ ...entry(frame, 0), id: 'new-you', minute: 600 });
  expect(currentReply(frame, scene)).toBeUndefined();
  frame.log = old.log;
  frame.day = 2;
  expect(currentReply(frame, null)).toBeUndefined();
});
it('does not attach an unrelated affirmative answer to the companion', () => {
  const { frame, scene } = setup();
  entry(frame, 0).text = 'You: mention · rest at home';
  expect(sceneResponse(frame, scene)?.accepted).toBe(false);
  expect(sceneResponse(frame, scene)?.answer).toBeUndefined();
});

it('preserves the recorded alternative in a delayed scene reply', () => {
  const { frame, scene } = setup();
  const answer = frame.log.at(-1);
  if (!answer) throw new Error('Missing answer');
  answer.tone = 'notNow';
  answer.text = 'Call Selin? “Not now.” — rest at home';
  expect(sceneResponse(frame, scene)?.lines).toEqual([
    { speaker: 'Halil', words: 'Not now. — rest at home' },
  ]);
});
