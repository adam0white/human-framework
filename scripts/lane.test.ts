import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classify, type Lane, laneCommands } from './lane.ts';

const cases: [string, Lane][] = [
  ['packages/human/src/person.ts', 'gated'],
  ['packages/human/README.md', 'gated'],
  ['packages/lab-client/src/index.ts', 'gated'],
  ['packages/lab-kit/README.md', 'gated'],
  ['apps/site/worker/index.ts', 'gated'],
  ['apps/site/src/lab/core.ts', 'gated'],
  ['apps/site/src/lab/games.ts', 'gated'],
  ['apps/site/src/games.ts', 'gated'],
  ['apps/site/src/lab/curated.json', 'gated'],
  ['apps/site/src/lab/ledger.ts', 'gated'],
  ['.nvmrc', 'gated'],
  ['packages/new/package.json', 'gated'],
  ['packages/playtester/package.json', 'gated'],
  ['apps/site/src/deep/tsconfig.worker.json', 'gated'],
  ['apps/site/src/deep/vitest.bench.config.ts', 'gated'],
  ['apps/site/src/deep/vitest.config.ts', 'gated'],
  ['.github/dependabot.yml', 'gated'],
  ['scripts/agent-worktree.sh', 'gated'],
  ['AGENTS.md', 'gated'],
  ['CLAUDE.md', 'gated'],
  ['apps/site/AGENTS.md', 'gated'],
  ['package-lock.json', 'gated'],
  ['package.json', 'gated'],
  ['apps/site/package.json', 'gated'],
  ['.github/workflows/ci.yml', 'gated'],
  ['scripts/deploy.ts', 'gated'],
  ['scripts/release.ts', 'gated'],
  ['scripts/suite-lock.ts', 'gated'],
  ['scripts/lane.ts', 'gated'],
  ['scripts/lockfile-sync.ts', 'gated'],
  ['wrangler.jsonc', 'gated'],
  ['apps/site/public/_headers', 'gated'],
  ['tsconfig.json', 'gated'],
  ['tsconfig.scripts.json', 'gated'],
  ['biome.json', 'gated'],
  ['vitest.config.ts', 'gated'],
  ['vitest.bench.config.ts', 'gated'],
  ['apps/site/vitest.config.ts', 'gated'],
  ['apps/site/public/icon.svg', 'delivery'],
  ['apps/site/public/README.md', 'delivery'],
  ['apps/site/about.html', 'delivery'],
  ['apps/site/src/game/index.html', 'delivery'],
  ['apps/site/vite.config.ts', 'delivery'],
  ['packages/new/vite.config.ts', 'delivery'],
  ['apps/site/src/sw.ts', 'delivery'],
  ['sw.ts', 'delivery'],
  ['apps/site/src/service-worker.ts', 'delivery'],
  ['service-worker.js', 'delivery'],
  ['apps/site/src/game.ts', 'fast'],
  ['apps/site/src/README.md', 'fast'],
  ['packages/playtester/src/index.ts', 'fast'],
  ['packages/playtester/README.md', 'fast'],
  ['scripts/lane.test.ts', 'fast'],
  ['scripts/helper.ts', 'fast'],
  ['scripts/nested/helper.ts', 'gated'],
  ['scripts/helper.js', 'gated'],
  ['docs/lab/feedback-ledger.md', 'fast'],
  ['docs/lab/lessons.md', 'fast'],
  ['docs/lab/testing-asks.md', 'fast'],
  ['docs/framework.md', 'prose'],
  ['docs/data.json', 'prose'],
  ['research/notes.txt', 'prose'],
  ['archive/v0/src/game.ts', 'prose'],
  ['README.md', 'prose'],
  ['nested/notes.md', 'prose'],
  ['LICENSE', 'prose'],
  ['other/LICENSE', 'gated'],
  ['unexpected/file.bin', 'gated'],
  ['packages/new/src/index.ts', 'gated'],
];

describe('classify', () => {
  it.each(cases)('%s selects %s', (path, lane) => {
    expect(classify([path])).toEqual({ lane, byFile: { [path]: lane } });
  });

  it.each([
    [['README.md', 'unknown.json'], 'gated'],
    [['scripts/helper.ts', 'apps/site/index.html'], 'delivery'],
    [['apps/site/public/icon.svg', 'packages/human/index.ts'], 'gated'],
    [['packages/human/index.ts', 'README.md'], 'gated'],
  ] as [string[], Lane][])('uses the strongest lane for %j', (paths, lane) => {
    expect(classify(paths).lane).toBe(lane);
    expect(classify([...paths].reverse()).lane).toBe(lane);
  });

  it('preserves each file classification', () => {
    expect(classify(['README.md', 'scripts/helper.ts'])).toEqual({
      lane: 'fast',
      byFile: { 'README.md': 'prose', 'scripts/helper.ts': 'fast' },
    });
  });

  it('selects prose for no changes', () => {
    expect(classify([])).toEqual({ lane: 'prose', byFile: {} });
  });

  it('does not treat rule names embedded in unrelated paths as matches', () => {
    expect(classify(['other/apps/site/public/image.png']).lane).toBe('gated');
    expect(classify(['apps/site/src/package.json']).lane).toBe('gated');
  });
});

describe('lane CLI arguments', () => {
  it.each([['--base'], ['--base', '--dry-run']])('rejects a missing base ref in %j', (...args) => {
    const result = spawnSync(process.execPath, [resolve(import.meta.dirname, 'lane.ts'), ...args], {
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('--base requires a ref');
  });
});

describe('lockfile preflight', () => {
  it('checks manifest and lockfile changes before the suite', () => {
    for (const path of ['package.json', 'packages/human/package.json', 'package-lock.json']) {
      expect(laneCommands([path], 'gated')[0]).toEqual(['node', 'scripts/lockfile-sync.ts']);
    }
    expect(laneCommands(['scripts/lane.ts'], 'gated')[0]).toEqual(['npm', 'run', 'check']);
  });
});
