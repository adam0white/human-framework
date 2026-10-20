/** Pack the built HF package and run its minimal host example outside workspace resolution. */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const temp = mkdtempSync(join(tmpdir(), 'hf-pack-smoke-'));
try {
  // CI builds first. Skip lifecycle scripts so packing consumes that exact build.
  const packed = JSON.parse(
    execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temp], {
      cwd: join(root, 'packages/human'),
      encoding: 'utf8',
    }),
  ) as { filename: string }[];
  const filename = packed[0]?.filename;
  if (packed.length !== 1 || !filename) throw new Error('pack-smoke: expected one HF tarball');
  const consumer = join(temp, 'consumer');
  mkdirSync(consumer);
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  execFileSync(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', join(temp, filename)],
    { cwd: consumer, stdio: 'inherit' },
  );
  const installed = join(consumer, 'node_modules/@adam0white/human-framework');
  const pkg = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8')) as { name: string };
  if (pkg.name !== '@adam0white/human-framework') throw new Error('pack-smoke: wrong installed package');
  copyFileSync(join(root, 'packages/human/examples/minimal.ts'), join(consumer, 'minimal.ts'));
  execFileSync(process.execPath, ['minimal.ts'], { cwd: consumer, stdio: 'inherit' });
  console.log('pack-smoke: packed HF minimal example passed');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
