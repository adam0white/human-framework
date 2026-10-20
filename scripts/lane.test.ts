import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classify, type Lane } from './lane.ts';

const cases: [string, Lane][] = [
  ['packages/human/src/person.ts', 'gated'],
  ['packages/human/README.md', 'gated'],
  ['packages/lab-client/src/index.ts', 'gated'],
  ['packages/lab-kit/README.md', 'gated'],
  ['apps/site/worker/index.ts', 'gated'],
  ['package-lock.json', 'gated'],
  ['package.json', 'gated'],
  ['apps/site/package.json', 'gated'],
  ['.github/workflows/ci.yml', 'gated'],
  ['scripts/deploy.ts', 'gated'],
  ['scripts/release.ts', 'gated'],
  ['scripts/suite-lock.ts', 'gated'],
  ['scripts/lane.ts', 'gated'],
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
  ['apps/site/src/sw.ts', 'delivery'],
  ['sw.ts', 'delivery'],
  ['apps/site/src/service-worker.ts', 'delivery'],
  ['service-worker.js', 'delivery'],
  ['apps/site/src/game.ts', 'fast'],
  ['apps/site/src/README.md', 'fast'],
  ['packages/playtester/src/index.ts', 'fast'],
  ['packages/playtester/README.md', 'fast'],
  ['scripts/lane.test.ts', 'fast'],
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
  ['other/LICENSE', 'fast'],
  ['unexpected/file.bin', 'fast'],
  ['packages/new/src/index.ts', 'fast'],
];

describe('classify', () => {
  it.each(cases)('%s selects %s', (path, lane) => {
    expect(classify([path])).toEqual({ lane, byFile: { [path]: lane } });
  });

  it.each([
    [['README.md', 'unknown.json'], 'fast'],
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
    expect(classify(['other/apps/site/public/image.png']).lane).toBe('fast');
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
