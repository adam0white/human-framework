/** Validate the lockfile without installing packages or running lifecycle scripts. */
import { spawnSync } from 'node:child_process';

const result = spawnSync('pnpm', ['install', '--lockfile-only', '--frozen-lockfile', '--ignore-scripts'], {
  cwd: process.cwd(),
  stdio: 'inherit',
});
if (result.error || result.status !== 0) {
  console.error(
    'Lockfile check failed: run pnpm install --lockfile-only, then commit pnpm-lock.yaml with the manifest.',
  );
  process.exit(1);
}
