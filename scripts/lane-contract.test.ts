import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { changedPaths, classify, laneCommands } from './lane.ts';

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));
afterEach(() => vi.clearAllMocks());

it('gates every current Worker source dependency, including transitive imports', () => {
  const root = resolve(import.meta.dirname, '..');
  const worker = resolve(root, 'apps/site/worker');
  const queue = readdirSync(worker, { recursive: true })
    .filter((file) => /\.[cm]?[jt]sx?$/.test(String(file)))
    .map((file) => resolve(worker, String(file)));
  const seen = new Set<string>();
  while (queue.length) {
    const file = queue.pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    const path = relative(root, file);
    if (path.startsWith('apps/site/src/')) expect(classify([path]).lane).toBe('gated');
    if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
    // Current Worker modules use relative static imports. Follow dynamic literals too.
    for (const match of readFileSync(file, 'utf8').matchAll(
      /(?:from\s*|import\s*(?:\(\s*)?)["']([^"']+)["']/g,
    )) {
      const specifier = match[1];
      if (!specifier?.startsWith('.')) continue;
      const target = resolve(dirname(file), specifier);
      expect(existsSync(target), `unresolved Worker dependency: ${target}`).toBe(true);
      queue.push(target);
    }
  }
  expect(seen.has(resolve(root, 'apps/site/src/lab/core.ts'))).toBe(true);
  expect(seen.has(resolve(root, 'apps/site/src/lab/games.ts'))).toBe(true);
});

it('includes committed, staged and unstaged old/new rename paths, deletions and untracked files', () => {
  vi.mocked(execFileSync)
    .mockReturnValueOnce('base\n')
    .mockReturnValueOnce('packages/human/deleted.ts\0docs/renamed.md\0')
    .mockReturnValueOnce('apps/site/src/old.ts\0docs/new.md\0')
    .mockReturnValueOnce('scripts/old.sh\0scripts/new.ts\0')
    .mockReturnValueOnce('new.bin\0');
  const paths = changedPaths('/fixture', 'origin/main');
  expect(paths).toEqual([
    'apps/site/src/old.ts',
    'docs/new.md',
    'docs/renamed.md',
    'new.bin',
    'packages/human/deleted.ts',
    'scripts/new.ts',
    'scripts/old.sh',
  ]);
  const diffs = vi.mocked(execFileSync).mock.calls.filter(([, args]) => args?.[0] === 'diff');
  expect(diffs).toHaveLength(3);
  for (const [, args] of diffs) expect(args).toContain('--no-renames');
  expect(classify(paths).lane).toBe('gated');
  expect(classify(['packages/human/old.ts', 'docs/new.md']).lane).toBe('gated');
  expect(classify(['docs/old.md', 'packages/human/new.ts']).lane).toBe('gated');
});

it.each(['docs/lab/feedback-ledger.md', 'docs/lab/lessons.md', 'docs/lab/testing-asks.md'])(
  'runs the runtime-read contract for %s',
  (path) => {
    expect(laneCommands([path], classify([path]).lane)).toContainEqual([
      'npm',
      'exec',
      '--',
      'vitest',
      'run',
      'apps/site/src/lab/lab.test.ts',
    ]);
  },
);

it('builds before the delivery smoke check', () => {
  const commands = laneCommands(['apps/site/index.html'], 'delivery');
  expect(commands.slice(-2)).toEqual([
    ['npm', 'run', 'build'],
    ['node', 'scripts/site-smoke.ts'],
  ]);
});
