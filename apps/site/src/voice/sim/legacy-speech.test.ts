/** Frozen before the scene speech change. Full-state legacy controls; never regenerate on a rules change. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import type { VoiceRules } from '../protocol.ts';
import { VoiceGame } from './game.ts';
import { play } from './headless.ts';
import { RecordedGame, replayVoice, type VoiceLogEntry, voiceHash } from './record.ts';

const path = resolve(import.meta.dirname, '../../../test/fixtures/voice-before-scene-speech.json');
const ticks = [16, 250, 33, 120, 1000, 49];
interface Control {
  seed: number;
  rules: VoiceRules;
  policy: 'silent' | 'mention' | 'insist';
  checkpoint: { entries: number; hash: string; minute: number };
  hash: string;
  minute: number;
  log: VoiceLogEntry[];
}

function capture(seed: number, rules: VoiceRules, policy: Control['policy']): Control {
  const rec = new RecordedGame(new VoiceGame(seed, rules));
  const options = { confirm: policy !== 'silent', insist: policy === 'insist', tick: ticks };
  play(rec, { ...options, stop: (g) => g.phase === 'day' && g.day === 2 && g.t >= 2 * 1440 + 9 * 60 });
  // Freeze the checkpoint count before continuation can compact its final moving-tick entry.
  rec.apply({ type: 'pause' });
  const checkpoint = { entries: rec.log.length, hash: voiceHash(rec.game), minute: rec.game.t };
  rec.apply({ type: 'resume' });
  play(rec, options);
  return { seed, rules, policy, checkpoint, hash: voiceHash(rec.game), minute: rec.game.t, log: rec.log };
}

test.skipIf(!process.env.VOICE_CAPTURE_LEGACY)(
  'capture pre-change controls explicitly',
  () => {
    const controls = ([1, 2] as const).flatMap((rules) =>
      (
        [
          ['silent', 7],
          ['mention', 23],
          ['insist', 91],
        ] as const
      ).map(([policy, seed]) => capture(seed, rules, policy)),
    );
    writeFileSync(path, `${JSON.stringify({ captured: '2026-10-20 before scene speech', controls })}\n`);
  },
  240_000,
);

test.skipIf(Boolean(process.env.VOICE_CAPTURE_LEGACY))(
  'pre-scene-speech legacy runs and mid-run continuations retain full-state hashes',
  () => {
    const { controls } = JSON.parse(readFileSync(path, 'utf8')) as { controls: Control[] };
    expect(controls).toHaveLength(6);
    for (const c of controls) {
      const checkpoint = replayVoice(c.seed, c.log.slice(0, c.checkpoint.entries), c.rules);
      expect(checkpoint.driftAt, `${c.rules}/${c.policy} checkpoint drift`).toBe(-1);
      expect(checkpoint.rec.game.t).toBe(c.checkpoint.minute);
      expect(voiceHash(checkpoint.rec.game), `${c.rules}/${c.policy} checkpoint`).toBe(c.checkpoint.hash);
      // Continue the actual replayed checkpoint, preserving every person and game field.
      for (const entry of c.log.slice(c.checkpoint.entries)) {
        if (Array.isArray(entry)) {
          for (let n = 0; n < entry[1]; n++) checkpoint.rec.step(entry[0]);
        } else {
          const { at, ...input } = entry;
          expect(checkpoint.rec.game.t).toBe(at);
          checkpoint.rec.apply(input);
        }
      }
      expect(checkpoint.rec.game.phase).toBe('report');
      expect(checkpoint.rec.game.t).toBe(c.minute);
      expect(voiceHash(checkpoint.rec.game), `${c.rules}/${c.policy} continued final`).toBe(c.hash);
    }
  },
  240_000,
);
