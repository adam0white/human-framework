/** Validate the lockfile without installing packages or running lifecycle scripts. */
import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['ci', '--dry-run', '--ignore-scripts', '--no-audit', '--no-fund'], {
  cwd: process.cwd(),
  stdio: 'inherit',
});
if (result.error || result.status !== 0) {
  console.error(
    'Lockfile check failed: run npm install --package-lock-only, then commit package-lock.json with the manifest.',
  );
  process.exit(1);
}
