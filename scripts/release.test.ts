import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdtempSync: vi.fn(() => '/tmp/hf-release-mock'),
}));

const commit = 'abc123';
let argv: string[];
let dirty: string;
let mutateOnPack: boolean;
const calls = () => vi.mocked(execFileSync).mock.calls.map(([cmd, args]) => [cmd, args]);
const run = async () => {
  process.argv = ['node', 'scripts/release.ts'];
  await import('./release.ts');
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  argv = process.argv;
  dirty = '';
  mutateOnPack = false;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.mocked(readFileSync).mockImplementation((path) => {
    const name = String(path);
    if (name.endsWith('package.json')) return '{"version":"4.16.0"}';
    if (name.endsWith('run-engine.ts')) return "package: '@adam0white/human-framework@4.16.0'";
    if (name.endsWith('CHANGELOG.md')) return '## [4.16.0]\nEngine: 4.16.0.\nControl.\n';
    throw new Error(`Unexpected read: ${name}`);
  });
  // Every child call is intercepted, including auth and all publication effects.
  vi.mocked(execFileSync).mockImplementation((cmd, args) => {
    const words = args as string[];
    if (cmd === 'git') {
      if (words[0] === 'status') return dirty;
      if (words[0] === 'rev-parse') {
        if (words.includes('--abbrev-ref')) return 'main';
        if (words.includes('--symbolic-full-name')) return 'refs/heads/main';
        return commit;
      }
      if (['fetch', 'tag', 'ls-remote', 'push'].includes(words[0] ?? '')) return '';
    }
    if (cmd === 'gh' && (words[0] === 'auth' || words[0] === 'release')) return '';
    if (cmd === 'node') return '';
    if (cmd === 'npm' && words[0] === 'run' && words[1] === 'check') return '';
    if (cmd === 'npm' && words[0] === 'pack') {
      if (mutateOnPack) dirty = ' M packages/human/src/run-engine.ts';
      return '[{"filename":"human-framework-4.16.0.tgz"}]';
    }
    throw new Error(`Unexpected child: ${cmd} ${words.join(' ')}`);
  });
});

afterEach(() => {
  process.argv = argv;
  vi.restoreAllMocks();
});

it('refuses prepack source drift before any publication effect', async () => {
  mutateOnPack = true;
  await expect(run()).rejects.toThrow('working tree changed during check or pack; publication refused');
  expect(calls()).toContainEqual(['npm', ['run', 'check']]);
  expect(calls().some(([cmd, args]) => cmd === 'npm' && (args as string[])[0] === 'pack')).toBe(true);
  expect(
    calls().some(([cmd, args]) => {
      const words = args as string[];
      return (
        (cmd === 'git' && (words[0] === 'push' || (words[0] === 'tag' && words[1] === '-a'))) ||
        (cmd === 'gh' && words[0] === 'release')
      );
    }),
  ).toBe(false);
});

it('publishes the unchanged admitted source through the ordinary commands', async () => {
  await run();
  expect(calls()).toContainEqual(['git', ['tag', '-a', 'v4.16.0', '-m', 'HF 4.16.0 (engine 4.16.0)']]);
  expect(calls()).toContainEqual(['git', ['push', 'origin', 'v4.16.0']]);
  expect(calls().some(([cmd, args]) => cmd === 'gh' && (args as string[])[0] === 'release')).toBe(true);
});
