import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { stableStringify } from '../../shared/playtest.ts';
import { saveActors } from './actor.ts';
import { stepMinute } from './night.ts';
import { endState, replay, WatchRun } from './run.ts';

it('explains rejected native commands without changing the run, and replays the complete export', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hf-central-watch-command-'));
  const script = fileURLToPath(new URL('../../../scripts/play-watch.ts', import.meta.url));
  const state = join(dir, 'state.json'),
    file = join(dir, 'export.json');
  const run = (...args: string[]) =>
    execFileSync(process.execPath, [script, '--state', state, ...args], { encoding: 'utf8' });
  try {
    run('new', '11', 'start', 'begin');
    const before = JSON.parse(readFileSync(state, 'utf8'));
    expect(before.snap.scenario).toBe(25);
    expect(before.snap.state.duskRest?.edition).toBe('dusk-rest@1');
    expect(before.snap.state.localWarning?.edition).toBe('local-warning@1');
    const reference = new WatchRun(11);
    expect(before.snap.state.actors.archive.archive.engine).toEqual(
      JSON.parse(reference.snapshotText()).state.actors.archive.archive.engine,
    );
    const text = run('begin', 'talk', 'tamar', '1', 'export', file);
    expect(text).toContain('The watch has already begun.');
    expect(text).toContain('Talks are available at dawn. It is night now.');
    const after = JSON.parse(readFileSync(state, 'utf8'));
    expect(stableStringify(after.snap) === stableStringify(before.snap)).toBe(true);
    const exported = JSON.parse(readFileSync(file, 'utf8'));
    const replayed = replay(exported);
    expect(endState(replayed).fullHash).toBe(exported.end.fullHash);
    const cold = WatchRun.resume(after.snap);
    stepMinute(replayed);
    cold.step();
    saveActors(replayed);
    expect(stableStringify(JSON.parse(cold.snapshotText()).state) === stableStringify(replayed)).toBe(true);
    // An incompatible edition is refused before any state write; the complete original remains intact.
    const oldPath = join(dir, 'old.json');
    const old = JSON.parse(readFileSync(state, 'utf8'));
    old.snap.scenario = 12;
    old.snap.state.version = 12;
    const oldText = JSON.stringify(old);
    writeFileSync(oldPath, oldText);
    const refusal = spawnSync(process.execPath, [script, '--state', oldPath, 'show'], { encoding: 'utf8' });
    expect(refusal.status).toBe(1);
    expect(refusal.stderr).toContain('This save is from an older version. Start a fresh game.');
    expect(refusal.stderr).not.toContain(' at ');
    expect(readFileSync(oldPath, 'utf8')).toBe(oldText);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 15_000);
