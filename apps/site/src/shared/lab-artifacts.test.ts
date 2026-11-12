import { readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, test } from 'vitest';

// Resolve from the site, not the similarly named workspace source packages.
test('central site uses the qualified published Lab artifacts', () => {
  for (const [name, version] of [
    ['lab-client', '0.5.19'],
    ['lab-kit', '0.5.36'],
  ]) {
    const manifest = realpathSync(
      resolve(import.meta.dirname, `../../node_modules/@adam0white/${name}/package.json`),
    );
    const pkg = JSON.parse(readFileSync(manifest, 'utf8')) as { version: string };
    expect(pkg.version).toBe(version);
    expect(dirname(manifest)).toContain('node_modules/.pnpm/');
  }
});
