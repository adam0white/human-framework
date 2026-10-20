/** Scene words replay presentation, without adding a simulated faculty. */
import { ENGINE_VERSION } from '@adam0white/human-framework';
import { describe, expect, test } from 'vitest';
import { makePlaytestFile } from '../../shared/playtest.ts';
import { scenarioOf } from '../protocol.ts';
import { sceneBeat, sceneWordChoices } from '../ui/scene-words.ts';
import { VoiceGame } from './game.ts';
import { play } from './headless.ts';
import { parseVoicePlaytest, RecordedGame, replayVoice, validateVoiceLog, voiceHash } from './record.ts';

function atBusyOccasion(): RecordedGame {
  const rec = new RecordedGame(new VoiceGame(7, 2));
  play(rec, { stop: (g) => g.composer().reason === 'busy' && sceneWordChoices(g.frame()).length > 0 });
  return rec;
}

describe('recorded scene words', () => {
  test('busy care reaches presentation once per occasion without changing any simulation state', () => {
    const rec = atBusyOccasion();
    const before = voiceHash(rec.game);
    const beat = sceneBeat(rec.frame());
    rec.apply({ type: 'sceneWord', beat, kind: 'care' });
    expect(rec.sceneWords).toHaveLength(1);
    expect(rec.frame().sceneWords?.[0]?.words).toBeTruthy();
    expect(rec.sceneWords[0]?.answer).toBeTruthy();
    expect(voiceHash(rec.game)).toBe(before);
    rec.apply({ type: 'sceneWord', beat, kind: 'question' });
    rec.apply({ type: 'sceneWord', beat: 'stale occasion', kind: 'care' });
    expect(rec.sceneWords).toHaveLength(1);
    expect(voiceHash(rec.game)).toBe(before);
  });

  test('an exported and imported busy question restores the exact presented exchange and can continue', async () => {
    const rec = atBusyOccasion();
    rec.apply({ type: 'sceneWord', beat: sceneBeat(rec.frame()), kind: 'question' });
    const file = await makePlaytestFile({
      game: 'voice',
      seed: 7,
      scenario: scenarioOf(rec.game.rules),
      minute: rec.game.t,
      log: rec.log,
      hash: voiceHash(rec.game),
      engine: ENGINE_VERSION,
      snapshot: null,
    });
    const parsed = parseVoicePlaytest(JSON.stringify(file));
    const { rec: restored, driftAt } = replayVoice(parsed.file.seed, parsed.file.log, parsed.rules);
    expect(driftAt).toBe(-1);
    expect(restored.sceneWords).toEqual(rec.sceneWords);
    expect(restored.frame().sceneWords).toEqual(rec.frame().sceneWords);
    expect(voiceHash(restored.game)).toBe(file.hash);
    expect(restored.log).toEqual(rec.log);
    for (let n = 0; n < 10; n++) {
      rec.tick(100);
      restored.tick(100);
    }
    expect(voiceHash(restored.game)).toBe(voiceHash(rec.game));
  });

  test('quick suggestion wording survives replay while its decision remains the existing suggest path', () => {
    const rec = new RecordedGame(new VoiceGame(7, 2));
    play(rec, { stop: (g) => !g.intro && g.composer().open && g.frame().options.length > 0 });
    const frame = rec.frame();
    const option = frame.options[0];
    expect(option).toBeDefined();
    if (!option) throw new Error('No suggestion at opening');
    const baseline = replayVoice(7, rec.log, 2).rec;
    const draft = { optionId: option.id, strength: 'mention' as const, insist: false };
    rec.apply({ type: 'suggest', draft, sceneLine: 'Take a moment at home.' });
    baseline.apply({ type: 'suggest', draft });
    expect(voiceHash(rec.game)).toBe(voiceHash(baseline.game));
    const restored = replayVoice(7, validateVoiceLog(rec.log), 2).rec;
    expect(restored.sceneWords).toEqual(rec.sceneWords);
    expect(restored.sceneWords[0]?.words).toBe('Take a moment at home.');
    expect(voiceHash(restored.game)).toBe(voiceHash(rec.game));
    expect(() => validateVoiceLog([{ at: 0, type: 'suggest', draft, sceneLine: 'x'.repeat(241) }])).toThrow();
  });

  test('a stale busy quick suggestion stays unsaid, leaves simulation untouched, and replays', () => {
    const rec = atBusyOccasion();
    const before = voiceHash(rec.game);
    const minute = rec.game.t;
    rec.apply({
      type: 'suggest',
      draft: { optionId: 'rest-home', strength: 'mention', insist: false },
      sceneLine: 'Rest at home.',
    });
    expect(voiceHash(rec.game)).toBe(before);
    expect(rec.game.t).toBe(minute);
    expect(rec.sceneWords).toHaveLength(1);
    expect(rec.sceneWords[0]).toMatchObject({
      said: false,
      kind: 'suggestion',
      words: 'Rest at home.',
      answer: 'He is occupied. Wait until he is choosing.',
    });
    const restored = replayVoice(7, validateVoiceLog(rec.log), 2);
    expect(restored.driftAt).toBe(-1);
    expect(restored.rec.sceneWords).toEqual(rec.sceneWords);
    expect(voiceHash(restored.rec.game)).toBe(before);
  });

  test('validation accepts only a bounded occasion and a known line kind, with no arbitrary answer', () => {
    expect(
      validateVoiceLog([{ at: 1, type: 'sceneWord', beat: '1:workshop:act-7', kind: 'care' }]),
    ).toHaveLength(1);
    for (const invalid of [
      { beat: 'x'.repeat(161), kind: 'care' },
      { beat: 'x', kind: 'command' },
      { beat: 'x', kind: 'care', answer: 'Invent an answer' },
      { beat: 'x', kind: 'care', words: 'x'.repeat(241) },
    ])
      expect(() => validateVoiceLog([{ at: 1, type: 'sceneWord', ...invalid }])).toThrow();
  });
});

test('stale displayed wording is retained as Unsaid rather than replaced with another spoken line', () => {
  const rec = atBusyOccasion();
  const before = voiceHash(rec.game);
  rec.apply({
    type: 'sceneWord',
    beat: sceneBeat(rec.frame()),
    kind: 'care',
    words: 'A line from an earlier reading.',
  });
  expect(rec.sceneWords.at(-1)).toMatchObject({ said: false, words: 'A line from an earlier reading.' });
  expect(voiceHash(rec.game)).toBe(before);
  const restored = replayVoice(7, validateVoiceLog(rec.log), 2).rec;
  expect(restored.sceneWords).toEqual(rec.sceneWords);
});
