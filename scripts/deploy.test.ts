import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(() => '{"version":"2.10.0"}'),
  writeFileSync: vi.fn(),
}));

const commit = 'abc123';
const check = (overrides = {}) => ({
  id: 1,
  name: 'ci',
  head_sha: commit,
  status: 'completed',
  conclusion: 'success',
  html_url: 'https://example.test/ci/1',
  ...overrides,
});
let responses: unknown[];
let dirty: string;
let branch: string;
let pushed: string;
let argv: string[];
const calls = () => vi.mocked(execFileSync).mock.calls.map(([cmd, args]) => [cmd, args]);
const run = async (...flags: string[]) => {
  process.argv = ['node', 'scripts/deploy.ts', ...flags];
  await import('./deploy.ts');
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();
  argv = process.argv;
  responses = [[check()]];
  dirty = '';
  branch = 'main';
  pushed = commit;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ commit }) }));
  vi.mocked(execFileSync).mockImplementation((cmd, args) => {
    const words = args as string[];
    if (cmd === 'git') {
      if (words[0] === 'status') return dirty;
      if (words.includes('--abbrev-ref')) return branch;
      if (words[1] === 'origin/main') return pushed;
      return commit;
    }
    if (cmd === 'gh') {
      const response = responses.length > 1 ? responses.shift() : responses[0];
      if (response instanceof Error) throw response;
      return JSON.stringify([{ check_runs: response }]);
    }
    return '';
  });
});

afterEach(() => {
  process.argv = argv;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('deploy CI gate', () => {
  it('trusts exact-HEAD successful CI by default after installing, then deploys and verifies', async () => {
    await run();
    expect(calls()).toContainEqual(['npm', ['ci', '--no-audit', '--no-fund']]);
    expect(calls().findIndex(([cmd]) => cmd === 'gh')).toBeGreaterThan(
      calls().findIndex(([cmd]) => cmd === 'npm'),
    );
    expect(calls()).not.toContainEqual(['npm', ['run', 'check']]);
    expect(calls()).toContainEqual(['npm', ['run', 'build']]);
    expect(calls()).toContainEqual(['npx', ['wrangler', 'deploy']]);
    expect(writeFileSync).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith('https://human.adamwhite.work/release.json', {
      cache: 'no-store',
    });
  });

  it('keeps --trust-ci as an accepted alias', async () => {
    await run('--trust-ci', '--dry-run');
    expect(calls()).not.toContainEqual(['npm', ['run', 'check']]);
    expect(calls()).toContainEqual(['npx', ['wrangler', 'deploy', '--dry-run']]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('polls missing and pending checks every 15 seconds', async () => {
    responses = [[], [check({ status: 'in_progress', conclusion: null })], [check()]];
    const result = run('--dry-run');
    await vi.advanceTimersByTimeAsync(0);
    expect(console.log).toHaveBeenCalledWith(`Waiting for CI for ${commit}: missing`);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(console.log).toHaveBeenCalledWith(`Waiting for CI for ${commit}: in_progress`);
    await vi.advanceTimersByTimeAsync(15_000);
    await result;
    expect(calls().filter(([cmd]) => cmd === 'gh')).toHaveLength(3);
  });

  it('ignores successful checks for another SHA and times out after 15 minutes', async () => {
    responses = [[check({ head_sha: 'other' })]];
    const result = expect(run('--dry-run')).rejects.toThrow('Cannot deploy without successful CI');
    await vi.advanceTimersByTimeAsync(15 * 60_000);
    await result;
    expect(console.log).toHaveBeenCalledWith(`Waiting for CI for ${commit}: missing`);
    expect(calls()).not.toContainEqual(['npm', ['run', 'build']]);
    expect(calls()).not.toContainEqual(['npm', ['run', 'check']]);
  });

  it.each(['failure', 'cancelled', 'timed_out', 'skipped', 'neutral'])(
    'stops immediately on a completed %s check',
    async (conclusion) => {
      responses = [[check({ conclusion })]];
      await expect(run()).rejects.toThrow('Cannot deploy without successful CI');
      expect(calls().filter(([cmd]) => cmd === 'gh')).toHaveLength(1);
      expect(calls()).not.toContainEqual(['npm', ['run', 'check']]);
      expect(calls()).not.toContainEqual(['npm', ['run', 'build']]);
    },
  );

  it('uses the newest matching ci run, including a newer failure', async () => {
    responses = [[check(), check({ id: 2, conclusion: 'failure' }), check({ id: 3, name: 'other' })]];
    await expect(run()).rejects.toThrow('Cannot deploy without successful CI');
  });

  it('fails closed when the CI API is unavailable', async () => {
    responses = [new Error('offline')];
    await expect(run()).rejects.toThrow('--full-check');
    expect(calls()).not.toContainEqual(['npm', ['run', 'check']]);
  });

  it.each([new Error('offline'), [check({ conclusion: 'failure' })]])(
    'allows explicit local fallback for unavailable or failed CI: %s',
    async (response) => {
      responses = [response];
      await run('--full-check', '--dry-run');
      expect(calls()).toContainEqual(['npm', ['run', 'check']]);
      expect(calls()).toContainEqual(['npx', ['wrangler', 'deploy', '--dry-run']]);
    },
  );

  it('allows explicit local fallback after the CI wait expires', async () => {
    responses = [[]];
    const result = run('--full-check', '--dry-run');
    await vi.advanceTimersByTimeAsync(15 * 60_000);
    await result;
    expect(calls()).toContainEqual(['npm', ['run', 'check']]);
  });

  it('does not trust clean-commit CI for a dirty dry run', async () => {
    dirty = ' M scripts/deploy.ts';
    await expect(run('--dry-run')).rejects.toThrow('--full-check');
    expect(calls().some(([cmd]) => cmd === 'gh')).toBe(false);
    expect(calls()).not.toContainEqual(['npm', ['run', 'build']]);
  });

  it('permits local checks for a dirty dry run only with --full-check', async () => {
    dirty = ' M scripts/deploy.ts';
    await run('--dry-run', '--full-check');
    expect(calls().some(([cmd]) => cmd === 'gh')).toBe(false);
    expect(calls()).toContainEqual(['npm', ['run', 'check']]);
  });

  it.each(['branch', 'dirty', 'unpushed'])(
    'preserves the existing non-dry-run %s guard before installation',
    async (guard) => {
      if (guard === 'branch') branch = 'feature';
      if (guard === 'dirty') dirty = ' M file';
      if (guard === 'unpushed') pushed = 'other';
      await expect(run('--full-check')).rejects.toThrow();
      expect(calls().some(([cmd]) => cmd === 'npm')).toBe(false);
    },
  );
});
