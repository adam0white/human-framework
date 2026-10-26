import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(() => '{"version":"2.10.0"}'),
  writeFileSync: vi.fn(),
  mkdtempSync: vi.fn(() => '/tmp/hf-deploy-mock'),
  rmSync: vi.fn(),
}));

const commit = 'abc123';
const check = (overrides = {}) => ({
  id: 1,
  name: 'ci',
  check_suite: { id: 100 },
  head_sha: commit,
  status: 'completed',
  conclusion: 'success',
  html_url: 'https://example.test/ci/1',
  ...overrides,
});
const workflow = (overrides = {}) => ({
  id: 10,
  name: 'CI',
  head_sha: commit,
  head_branch: 'main',
  event: 'push',
  status: 'completed',
  conclusion: 'success',
  check_suite_id: 100,
  ...overrides,
});
let responses: unknown[];
let workflows: unknown[];
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
  workflows = [[workflow()]];
  dirty = '';
  branch = 'main';
  pushed = commit;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ commit }) }));
  vi.mocked(execFileSync).mockImplementation((cmd, args) => {
    const words = args as string[];
    if (cmd === process.execPath) return JSON.stringify({ framework: '2.18.0', frameworkLibrary: '2.20.0' });
    if (cmd === 'git') {
      if (words[0] === 'status') return dirty;
      if (words.includes('--abbrev-ref')) return branch;
      if (words[1] === 'origin/main') return pushed;
      return commit;
    }
    if (cmd === 'gh') {
      const isWorkflow = words.at(-1)?.includes('actions/runs?');
      const queue = isWorkflow ? workflows : responses;
      const response = queue.length > 1 ? queue.shift() : queue[0];
      if (response instanceof Error) throw response;
      return JSON.stringify([isWorkflow ? { workflow_runs: response } : { check_runs: response }]);
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
  it('trusts exact-HEAD successful CI before isolated installation, then deploys and verifies', async () => {
    await run();
    expect(calls()).toContainEqual(['pnpm', ['install', '--frozen-lockfile']]);
    expect(calls().findIndex(([cmd]) => cmd === 'gh')).toBeLessThan(
      calls().findIndex(([cmd]) => cmd === 'pnpm'),
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

  it('polls pending workflow and checks every 15 seconds', async () => {
    workflows = [[workflow({ status: 'queued', conclusion: null })], [workflow()], [workflow()]];
    responses = [[], [check({ status: 'in_progress', conclusion: null })], [check()]];
    const result = run('--dry-run');
    await vi.advanceTimersByTimeAsync(0);
    expect(console.log).toHaveBeenCalledWith(`Waiting for CI for ${commit}: queued`);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(console.log).toHaveBeenCalledWith(`Waiting for CI for ${commit}: in_progress`);
    await vi.advanceTimersByTimeAsync(15_000);
    await result;
    expect(calls().filter(([cmd]) => cmd === 'gh')).toHaveLength(6);
  });

  it('rejects successful checks for another SHA immediately', async () => {
    responses = [[check({ head_sha: 'other' })]];
    await expect(run('--dry-run')).rejects.toThrow('Missing or invalid ci check');
    expect(vi.getTimerCount()).toBe(0);
    expect(calls()).not.toContainEqual(['npm', ['run', 'build']]);
    expect(calls()).not.toContainEqual(['npm', ['run', 'check']]);
  });

  it.each(['failure', 'cancelled', 'timed_out', 'skipped', 'neutral'])(
    'stops immediately on a completed %s check',
    async (conclusion) => {
      responses = [[check({ conclusion })]];
      await expect(run()).rejects.toThrow('Cannot deploy without successful CI');
      expect(calls().filter(([cmd]) => cmd === 'gh')).toHaveLength(2);
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
    workflows = [[workflow({ status: 'in_progress', conclusion: null })]];
    responses = [[check({ status: 'in_progress', conclusion: null })]];
    const result = run('--full-check', '--dry-run');
    await vi.advanceTimersByTimeAsync(15 * 60_000);
    await result;
    expect(calls()).toContainEqual(['npm', ['run', 'check']]);
  });

  it('trusts exact-commit CI for an isolated dirty dry run', async () => {
    dirty = ' M scripts/deploy.ts';
    await run('--dry-run');
    expect(calls().some(([cmd]) => cmd === 'gh')).toBe(true);
    expect(calls()).toContainEqual(['npm', ['run', 'build']]);
    expect(calls()).not.toContainEqual(['git', ['status', '--porcelain']]);
  });

  it('uses isolated local checks for a dirty dry run when CI is missing and --full-check is set', async () => {
    dirty = ' M scripts/deploy.ts';
    workflows = [[]];
    await run('--dry-run', '--full-check');
    expect(calls().some(([cmd]) => cmd === 'gh')).toBe(true);
    expect(calls()).toContainEqual(['npm', ['run', 'check']]);
  });

  it.each(['feature', 'HEAD'])('accepts pushed HEAD from %s before installation', async (name) => {
    branch = name;
    await run();
    expect(calls()).toContainEqual(['git', ['fetch', 'origin', 'main']]);
    expect(calls()).toContainEqual(['pnpm', ['install', '--frozen-lockfile']]);
    expect(calls()).toContainEqual(['npx', ['wrangler', 'deploy']]);
  });

  it('refuses unpushed HEAD before installation even with --full-check', async () => {
    pushed = 'other';
    await expect(run('--full-check')).rejects.toThrow('HEAD abc123 is not origin/main other: push it first');
    expect(calls()).toContainEqual(['git', ['fetch', 'origin', 'main']]);
    expect(calls().some(([cmd]) => cmd === 'pnpm' || cmd === 'npm')).toBe(false);
    expect(mkdtempSync).not.toHaveBeenCalled();
  });
});
