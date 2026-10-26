import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));
vi.mock('node:fs', () => ({
  mkdtempSync: vi.fn(),
  readFileSync: vi.fn(() => '{"version":"2.10.0"}'),
  writeFileSync: vi.fn(),
  rmSync: vi.fn(),
}));
const commit = 'abc123';
const temporary = join(tmpdir(), 'hf-deploy-mock');
const checkout = join(temporary, 'source');
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
const check = (overrides = {}) => ({
  id: 1,
  name: 'ci',
  head_sha: commit,
  check_suite: { id: 100 },
  status: 'completed',
  conclusion: 'success',
  html_url: 'https://example.test/ci/1',
  ...overrides,
});
let runs: unknown[];
let checks: unknown[];
let branch: string;
let pushed: string;
let failure: string;
let argv: string[];
const calls = () => vi.mocked(execFileSync).mock.calls.map(([cmd, args]) => [cmd, args]);
const run = async (...flags: string[]) => {
  process.argv = ['node', 'scripts/deploy.ts', ...flags];
  await import('./deploy.ts');
};
const response = (queue: unknown[]) => {
  const item = queue.length > 1 ? queue.shift() : queue[0];
  if (item instanceof Error) throw item;
  return item;
};
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();
  argv = process.argv;
  runs = [[workflow()]];
  checks = [[check()]];
  branch = 'main';
  pushed = commit;
  failure = '';
  vi.mocked(mkdtempSync).mockReturnValue(temporary);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ commit }) }));
  vi.mocked(execFileSync).mockImplementation((cmd, args) => {
    const words = args as string[];
    if (cmd === process.execPath) return JSON.stringify({ framework: '2.18.0', frameworkLibrary: '2.20.0' });
    if (`${cmd} ${words.join(' ')}` === failure) throw new Error('injected failure');
    if (cmd === 'git') {
      if (words.includes('--abbrev-ref')) return branch;
      if (words[1] === 'origin/main') return pushed;
      return commit;
    }
    if (cmd === 'gh') {
      const endpoint = words.at(-1) ?? '';
      return JSON.stringify([
        endpoint.includes('actions/runs?')
          ? { workflow_runs: response(runs) }
          : { check_runs: response(checks) },
      ]);
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

describe('deploy workflow identity and isolation', () => {
  it('trusts only linked CI and installs, builds, stamps and deploys from the detached SHA', async () => {
    await run();
    expect(calls()).toContainEqual(['git', ['worktree', 'add', '--detach', checkout, commit]]);
    expect(calls()).not.toContainEqual(['npm', ['run', 'check']]);
    const commands = vi.mocked(execFileSync).mock.calls;
    expect(commands.findIndex(([cmd]) => cmd === 'gh')).toBeLessThan(
      commands.findIndex(([cmd]) => cmd === 'npm'),
    );
    for (const [cmd, , options] of commands) {
      if (cmd === 'pnpm' || cmd === 'npm' || cmd === 'npx') expect(options).toMatchObject({ cwd: checkout });
    }
    expect(calls()).toContainEqual(['pnpm', ['install', '--frozen-lockfile']]);
    expect(calls()).toContainEqual(['npm', ['run', 'build']]);
    expect(calls()).toContainEqual(['npx', ['wrangler', 'deploy']]);
    expect(readFileSync).toHaveBeenCalledWith(join(checkout, 'package.json'), 'utf8');
    expect(writeFileSync).toHaveBeenCalledWith(
      join(checkout, 'apps/site/dist/release.json'),
      expect.stringContaining('"dirty": false'),
    );
    const stamp = vi
      .mocked(writeFileSync)
      .mock.calls.find(([path]) => String(path).endsWith('/release.json'));
    expect(JSON.parse(String(stamp?.[1]))).toMatchObject({
      framework: '2.18.0',
      frameworkLibrary: '2.20.0',
      commit,
      dirty: false,
    });
    const resolver = commands.find(([cmd]) => cmd === process.execPath);
    expect(resolver?.[2]).toMatchObject({ cwd: checkout });
    expect(fetch).toHaveBeenCalledWith('https://human.adamwhite.work/release.json', { cache: 'no-store' });
    expect(calls().at(-1)).toEqual(['git', ['worktree', 'remove', '--force', checkout]]);
    expect(rmSync).toHaveBeenCalledWith(temporary, { recursive: true, force: true });
  });

  it('uses identical guards and isolated build for dry run, ignoring local dirtiness', async () => {
    await run('--dry-run', '--trust-ci');
    expect(calls()).not.toContainEqual(['git', ['status', '--porcelain']]);
    expect(calls()).toContainEqual(['git', ['fetch', 'origin', 'main']]);
    expect(calls()).toContainEqual(['npx', ['wrangler', 'deploy', '--dry-run']]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['feature', 'HEAD'])('isolates pushed HEAD from %s for dry run', async (name) => {
    branch = name;
    await run('--dry-run');
    expect(calls()).toContainEqual(['git', ['fetch', 'origin', 'main']]);
    expect(calls()).toContainEqual(['git', ['worktree', 'add', '--detach', checkout, commit]]);
    expect(calls()).toContainEqual(['npx', ['wrangler', 'deploy', '--dry-run']]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses unpushed HEAD even with dry run and --full-check', async () => {
    pushed = 'other';
    await expect(run('--dry-run', '--full-check')).rejects.toThrow(
      'HEAD abc123 is not origin/main other: push it first',
    );
    expect(calls()).toContainEqual(['git', ['fetch', 'origin', 'main']]);
    expect(mkdtempSync).not.toHaveBeenCalled();
    expect(calls().some(([cmd]) => cmd === 'npm')).toBe(false);
  });

  it.each([
    { name: 'Publish' },
    { head_sha: 'other' },
    { head_branch: 'feature' },
    { event: 'pull_request' },
  ])('rejects a workflow with mismatched identity %j', async (overrides) => {
    runs = [[workflow(overrides)]];
    await expect(run()).rejects.toThrow('Missing CI push workflow');
    expect(mkdtempSync).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'other' },
    { head_sha: 'other' },
    { check_suite: { id: 999 } },
    { check_suite: undefined },
  ])('rejects a check with mismatched identity %j', async (overrides) => {
    checks = [[check(overrides)]];
    await expect(run()).rejects.toThrow('Missing or invalid ci check');
    expect(mkdtempSync).not.toHaveBeenCalled();
  });

  it.each(['failure', 'cancelled', 'timed_out', 'skipped', 'neutral', null])(
    'fails closed on workflow conclusion %s',
    async (conclusion) => {
      runs = [[workflow({ conclusion })]];
      await expect(run()).rejects.toThrow('Cannot deploy without successful CI');
      expect(mkdtempSync).not.toHaveBeenCalled();
    },
  );

  it.each(['failure', 'cancelled', 'timed_out', 'skipped', 'neutral', null])(
    'fails closed on check conclusion %s',
    async (conclusion) => {
      checks = [[check({ conclusion })]];
      await expect(run()).rejects.toThrow('Cannot deploy without successful CI');
      expect(mkdtempSync).not.toHaveBeenCalled();
    },
  );

  it.each(['workflow', 'check'])('rejects missing %s immediately', async (missing) => {
    if (missing === 'workflow') runs = [[]];
    else checks = [[]];
    await expect(run()).rejects.toThrow('Cannot deploy without successful CI');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not let an older successful run hide the newest failed run', async () => {
    runs = [[workflow(), workflow({ id: 11, conclusion: 'failure' })]];
    await expect(run()).rejects.toThrow('finished with failure');
  });

  it('ignores successful checks from an older suite', async () => {
    runs = [[workflow({ id: 11, check_suite_id: 101 })]];
    checks = [[check()]];
    await expect(run()).rejects.toThrow('Missing or invalid ci check');
  });

  it('uses the newest matching check, including a newer failure', async () => {
    checks = [[check(), check({ id: 2, conclusion: 'failure' })]];
    await expect(run()).rejects.toThrow('finished with failure');
  });

  it('polls pending workflow and check states before accepting success', async () => {
    runs = [[workflow({ status: 'queued', conclusion: null })], [workflow()], [workflow()]];
    checks = [[], [check({ status: 'in_progress', conclusion: null })], [check()]];
    const result = run('--dry-run');
    await vi.advanceTimersByTimeAsync(0);
    expect(console.log).toHaveBeenCalledWith(`Waiting for CI for ${commit}: queued`);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(console.log).toHaveBeenCalledWith(`Waiting for CI for ${commit}: in_progress`);
    await vi.advanceTimersByTimeAsync(15_000);
    await result;
    expect(calls().filter(([cmd]) => cmd === 'gh')).toHaveLength(6);
  });

  it('stops after the pending wait expires', async () => {
    runs = [[workflow({ status: 'in_progress', conclusion: null })]];
    checks = [[check({ status: 'in_progress', conclusion: null })]];
    const result = expect(run()).rejects.toThrow('Timed out after 15 minutes');
    await vi.advanceTimersByTimeAsync(15 * 60_000);
    await result;
    expect(mkdtempSync).not.toHaveBeenCalled();
  });

  it.each(['unavailable', 'missing', 'failed', 'cancelled'])(
    'allows explicit isolated fallback for %s CI',
    async (state) => {
      if (state === 'unavailable') runs = [new Error('offline')];
      if (state === 'missing') runs = [[]];
      if (state === 'failed') runs = [[workflow({ conclusion: 'failure' })]];
      if (state === 'cancelled') runs = [[workflow({ conclusion: 'cancelled' })]];
      await run('--full-check', '--dry-run');
      expect(calls()).toContainEqual(['npm', ['run', 'check']]);
      const localCheck = vi
        .mocked(execFileSync)
        .mock.calls.find(([cmd, args]) => cmd === 'npm' && args?.[1] === 'check');
      expect(localCheck?.[2]).toMatchObject({ cwd: checkout });
    },
  );

  it('fails closed on API errors', async () => {
    runs = [new Error('offline')];
    await expect(run()).rejects.toThrow('--full-check');
    expect(mkdtempSync).not.toHaveBeenCalled();
  });

  it.each(['pnpm install --frozen-lockfile', 'npm run build', 'npx wrangler deploy'])(
    'cleans up after %s fails',
    async (command) => {
      failure = command;
      await expect(run()).rejects.toThrow('injected failure');
      expect(calls()).toContainEqual(['git', ['worktree', 'remove', '--force', checkout]]);
      expect(rmSync).toHaveBeenCalled();
    },
  );

  it('cleans up after a failing fallback check', async () => {
    runs = [[]];
    failure = 'npm run check';
    await expect(run('--full-check')).rejects.toThrow('injected failure');
    expect(calls()).toContainEqual(['git', ['worktree', 'remove', '--force', checkout]]);
  });

  it('cleans up after live verification fails', async () => {
    vi.mocked(fetch).mockResolvedValue({ json: async () => ({ commit: 'wrong' }) } as Response);
    const result = expect(run()).rejects.toThrow(`Live commit wrong != ${commit}`);
    await vi.advanceTimersByTimeAsync(30_000);
    await result;
    expect(calls()).toContainEqual(['git', ['worktree', 'remove', '--force', checkout]]);
  });
});
