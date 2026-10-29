// @vitest-environment happy-dom
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import type { SceneWords } from '../protocol.ts';
import { sampleReport } from '../sim/fixtures.ts';
import { VoiceGame } from '../sim/game.ts';
import { play } from '../sim/headless.ts';
import { RecordedGame, replayVoice, voiceHash } from '../sim/record.ts';
import { Between } from './Between.tsx';
import { Report } from './Report.tsx';
import { sceneBeat, sceneWordChoices } from './scene-words.ts';
import { companyWords, daySpeech } from './speech-summary.ts';

const care: SceneWords = {
  beat: '1:day:awake',
  kind: 'care',
  day: 1,
  minute: 220,
  clock: '03:40',
  words: 'I am here.',
  answer: 'There is not much I want to say just now.',
};

test('counts accepted care and questions, excluding unsaid words, suggestions and other days', () => {
  const words: SceneWords[] = [
    care,
    { ...care, kind: 'question' },
    { ...care, said: false },
    { ...care, kind: 'suggestion' },
    { ...care, day: 2 },
  ];
  expect(companyWords(words, 1)).toEqual(['You offered care once.', 'You asked a question.']);
  expect(daySpeech(['You spoke twice. In the end he said yes to all of them.'], words, 1)).toEqual([
    'You offered care once.',
    'You asked a question.',
    'You suggested an action twice. In the end he said yes to all of them.',
  ]);
  expect(daySpeech(['You said nothing today.'], words, 1).at(-1)).toBe(
    'You kept him company without suggesting anything.',
  );
  expect(daySpeech(['You said nothing today.'], [], 1)).toEqual(['You made no suggestions today.']);
});

test('care-only first day retains its received-support history and replays while its summary acknowledges speech', () => {
  const rec = new RecordedGame(new VoiceGame(7, 4));
  play(rec, { stop: (g) => !g.intro && sceneWordChoices(rec.frame()).length > 0 });
  const frame = rec.frame();
  const beforeCare = voiceHash(rec.game);
  rec.apply({ type: 'sceneWord', beat: sceneBeat(frame), kind: 'care' });
  expect(voiceHash(rec.game)).not.toBe(beforeCare);
  expect(rec.sceneWords).toHaveLength(1);
  play(rec, { stop: (g) => g.phase === 'between' });
  const between = rec.game.between;
  if (!between) throw new Error('Missing day summary');
  const day = renderToStaticMarkup(
    createElement(Between, {
      view: between,
      sceneWords: rec.sceneWords,
      day: frame.day,
      onAdvance: () => {},
    }),
  );
  expect(day).toContain('You offered care once.');
  expect(day).toContain('You kept him company without suggesting anything.');
  expect(day).not.toContain('You said nothing today.');
  const restored = replayVoice(7, rec.log, 4);
  expect(restored.driftAt).toBe(-1);
  expect(restored.rec.sceneWords).toEqual(rec.sceneWords);
  expect(voiceHash(restored.rec.game)).toBe(voiceHash(rec.game));
}, 120_000);

test('ending names suggestion counts separately from care and questions', () => {
  const html = renderToStaticMarkup(
    createElement(Report, {
      view: {
        ...sampleReport,
        spoke: true,
        ledger: [
          {
            said: 'Call Selin (said twice on the days you spoke, whispered through 3 days)',
            times: 5,
            eid: 'He called her himself.',
          },
        ],
      },
      sceneWords: [care, { ...care, kind: 'question' }, { ...care, said: false }],
      onKeepListening: () => {},
      onReplay: () => {},
      onNewTown: () => {},
    }),
  );
  expect(html).toContain('You offered care once.');
  expect(html).toContain('You asked a question.');
  expect(html).toContain('What you suggested, and what he did on Eid');
  expect(html).toContain('Call Selin (suggested twice on the days you played, whispered through 3 days)');
  expect(html).not.toContain('You kept him company without suggesting anything.');
});
