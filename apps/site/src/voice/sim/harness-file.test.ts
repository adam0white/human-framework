import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { makePlaytestFile } from '../../shared/playtest.ts';
import { scenarioOf } from '../protocol.ts';
import { play } from './headless.ts';
import { parseVoicePlaytest, replayVoice, voiceHash } from './record.ts';

it('keeps an unquoted native seed command and replays its current file before the same next step', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hf-central-voice-command-'));
  const script = fileURLToPath(new URL('../../../scripts/play-voice.ts', import.meta.url));
  const state = join(dir, 'state.json'),
    initial = join(dir, 'initial.json');
  const run = (statePath: string, ...args: string[]) =>
    execFileSync(process.execPath, [script, '--state', statePath, ...args], { encoding: 'utf8' });
  try {
    const text = run(state, 'new', '11', 'begin', 'wait', '20', 'export', initial);
    expect(text).toContain('$ new 11');
    expect(text).toContain('$ wait 20');
    const file = parseVoicePlaytest(readFileSync(initial, 'utf8')).file;
    expect(file.seed).toBe(11);
    expect(file.engine.endsWith(`@${file.framework}`)).toBe(true);
    const source = replayVoice(file.seed, file.log, 4).rec;
    play(source, { stop: (g) => g.frame().log.some((row) => row.decisionId) });
    source.apply({ type: 'pause' });
    const decision = source.frame().log.findLast((row) => row.decisionId);
    if (!decision) throw new Error('No actual native decision for CLI Why control');
    const decisionFile = join(dir, 'decision.json'),
      readback = join(dir, 'readback.json');
    const exportFile = await makePlaytestFile({
      game: 'voice',
      seed: file.seed,
      scenario: scenarioOf(4),
      minute: source.game.t,
      log: source.log,
      hash: voiceHash(source.game),
      engine: source.game.run.c.runtime!.save().archive.engine.package,
      snapshot: null,
    });
    writeFileSync(decisionFile, JSON.stringify({ ...exportFile, voiceEdition: 'voice-hf4/1' }));
    const readings = run(
      join(dir, 'read-state.json'),
      'load',
      decisionFile,
      'halil',
      'voices',
      'why',
      decision.id,
      'export',
      readback,
    );
    expect(readings).toContain('He chose');
    expect(readings).toMatch(/(?:slight|moderate|strong) pull/);
    expect(readings).not.toMatch(/\b[01]\.\d{2}\b|\[[#.]+\]/);
    expect(parseVoicePlaytest(readFileSync(readback, 'utf8')).file.hash).toBe(voiceHash(source.game));
    const next = join(dir, 'next.json'),
      coldNext = join(dir, 'cold-next.json');
    const coldText = run(
      join(dir, 'cold-state.json'),
      'load',
      initial,
      'nothing',
      'wait',
      '1',
      'export',
      coldNext,
    );
    expect(coldText).toContain('same state as recorded');
    run(state, 'nothing', 'wait', '1', 'export', next);
    const continued = parseVoicePlaytest(readFileSync(next, 'utf8')).file;
    const cold = parseVoicePlaytest(readFileSync(coldNext, 'utf8')).file;
    expect(cold.hash).toBe(continued.hash);
    expect(cold.log).toEqual(continued.log);
    expect(cold.minute).toBe(continued.minute);
    expect(cold.minute).toBeGreaterThan(file.minute);
    // An incompatible edition is refused before any state write; the complete original remains intact.
    const oldPath = join(dir, 'old.json');
    const old = JSON.parse(readFileSync(state, 'utf8'));
    old.rules = 2;
    const oldText = JSON.stringify(old);
    writeFileSync(oldPath, oldText);
    const refusal = spawnSync(process.execPath, [script, '--state', oldPath, 'look'], { encoding: 'utf8' });
    expect(refusal.status).toBe(1);
    expect(refusal.stderr).toContain('This save is from an older version. Start a fresh game.');
    expect(refusal.stderr).not.toContain(' at ');
    expect(readFileSync(oldPath, 'utf8')).toBe(oldText);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 15_000);
