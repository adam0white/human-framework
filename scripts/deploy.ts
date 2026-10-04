/**
 * Release workflow: require a clean, pushed `main`, run all checks, build, stamp release.json,
 * deploy with Wrangler, then verify the live manifest matches this commit.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const run = (cmd: string, args: string[], quiet = false): string =>
  execFileSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: quiet ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  }) ?? '';
const git = (...args: string[]) => run('git', args, true).trim();

const dryRun = process.argv.includes('--dry-run');
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
const dirty = git('status', '--porcelain');
const commit = git('rev-parse', 'HEAD');
if (!dryRun) {
  if (branch !== 'main') throw new Error(`Deploy from main, not ${branch}`);
  if (dirty) throw new Error('Working tree is dirty; commit first');
  git('fetch', 'origin', 'main');
  if (git('rev-parse', 'origin/main') !== commit) throw new Error('HEAD is not pushed to origin/main');
}

run('npm', ['run', 'check']);
run('npm', ['run', 'build']);

const pkg = (path: string) => JSON.parse(readFileSync(join(root, path), 'utf8')) as { version: string };
const release = {
  app: pkg('package.json').version,
  framework: pkg('packages/human/package.json').version,
  commit,
  dirty: Boolean(dirty),
};
writeFileSync(join(root, 'apps/site/dist/release.json'), `${JSON.stringify(release, null, 2)}\n`);
console.log('release', release);

if (dryRun) {
  run('npx', ['wrangler', 'deploy', '--dry-run']);
} else {
  run('npx', ['wrangler', 'deploy']);
  // The edge can serve the previous release for a few seconds after upload: retry before failing.
  let live = '';
  for (let attempt = 0; attempt < 10 && live !== commit; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 3000));
    live = (
      (await (await fetch('https://human.adamwhite.work/release.json', { cache: 'no-store' })).json()) as {
        commit: string;
      }
    ).commit;
  }
  if (live !== commit) throw new Error(`Live commit ${live} != ${commit}`);
  console.log('Verified live release at', commit);
}
