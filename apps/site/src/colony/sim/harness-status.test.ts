import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { parseColonyPlaytest } from './playtest.ts';

it('runs native commands, explains closed state and replays the complete file before the same next order', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hf-central-commands-'));
  const script = fileURLToPath(new URL('../../../scripts/play-colony.ts', import.meta.url));
  const state = join(dir, 'state.json'),
    initial = join(dir, 'initial.json');
  const run = (statePath: string, ...args: string[]) =>
    execFileSync(process.execPath, [script, '--state', statePath, ...args], { encoding: 'utf8' });
  try {
    const text = run(
      state,
      'new',
      '20261003',
      'order',
      'yusuf',
      'house',
      'order',
      'yusuf',
      'forest',
      'resume',
      'wait',
      '.5',
      'cancel',
      'o1',
      'until',
      '1',
      '05:00',
      'export',
      initial,
    );
    expect(text).toContain('Cannot cancel o1: replaced by o2.');
    expect(text).toContain('That time has passed. It is D1');
    expect(text).not.toMatch(/Prayers kept|Trust \d|Morale [+-]?\d/);
    const file = parseColonyPlaytest(readFileSync(initial, 'utf8')).file;
    expect(file.seed).toBe(20261003);
    const readback = join(dir, 'readback.json');
    const readings = run(state, 'inspect', 'yusuf', 'export', readback);
    expect(readings).toContain('Why:');
    expect(readings).not.toContain('Reading the decision');
    expect(readings).toMatch(/draws them toward this|holds them back/);
    expect(readings).not.toMatch(/\b[01]\.\d{2}\b/);
    expect(parseColonyPlaytest(readFileSync(readback, 'utf8')).file.hash).toBe(file.hash);

    const next = join(dir, 'next.json'),
      coldNext = join(dir, 'cold-next.json');
    const coldText = run(
      join(dir, 'cold-state.json'),
      'load',
      initial,
      'order',
      'idris',
      'well',
      'export',
      coldNext,
    );
    expect(coldText).toContain('replays to its hash');
    run(state, 'order', 'idris', 'well', 'export', next);
    const continued = parseColonyPlaytest(readFileSync(next, 'utf8')).file;
    const cold = parseColonyPlaytest(readFileSync(coldNext, 'utf8')).file;
    expect(cold.hash).toBe(continued.hash);
    expect(cold.log).toEqual(continued.log);
    expect(cold.minute).toBe(continued.minute);
    // An incompatible edition is refused before any state write; the complete original remains intact.
    const oldPath = join(dir, 'old.json');
    const old = JSON.parse(readFileSync(state, 'utf8'));
    old.scenario = 'colony-3';
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
