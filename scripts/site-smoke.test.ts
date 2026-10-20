import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { smokeSite } from './site-smoke.ts';

let dist: string;
beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'hf-smoke-test-'));
  for (const page of [
    'index',
    'games/index',
    'colony/index',
    'voice/index',
    'watch/index',
    'lab/index',
    'lab/privacy/index',
  ]) {
    const path = join(dist, `${page}.html`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      '<script type="module" src="/assets/main.js"></script><link rel="stylesheet" href="/assets/main.css">',
    );
  }
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, 'assets/main.js'), '');
  writeFileSync(join(dist, 'assets/main.css'), '');
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  rmSync(dist, { recursive: true, force: true });
  vi.restoreAllMocks();
});
it('checks all entry pages and bundled assets', () => {
  expect(() => smokeSite(dist)).not.toThrow();
});
it('accepts the deliberately static privacy page', () => {
  writeFileSync(join(dist, 'lab/privacy/index.html'), '<link rel="stylesheet" href="/assets/main.css">');
  expect(() => smokeSite(dist)).not.toThrow();
});
it('does not require Worker routes linked as alternate data to be static files', () => {
  writeFileSync(
    join(dist, 'lab/index.html'),
    '<script src="/assets/main.js"></script><link rel="alternate" href="/lab/data.json">',
  );
  expect(() => smokeSite(dist)).not.toThrow();
});
it('rejects missing stylesheets', () => {
  rmSync(join(dist, 'assets/main.css'));
  expect(() => smokeSite(dist)).toThrow('missing or escaping asset /assets/main.css');
});
it('rejects an unbundled page', () => {
  writeFileSync(join(dist, 'lab/index.html'), '<main>Empty</main>');
  expect(() => smokeSite(dist)).toThrow('missing bundled script');
});
it('rejects paths outside dist', () => {
  writeFileSync(join(dist, 'index.html'), '<script src="/../external.js"></script>');
  expect(() => smokeSite(dist)).toThrow('escaping asset');
});
