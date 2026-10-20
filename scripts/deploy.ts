/**
 * Release workflow: require a clean, pushed `main` and successful CI for this exact commit,
 * waiting up to 15 minutes. --full-check permits local checks if CI cannot be trusted;
 * --trust-ci remains a compatibility alias. Build, stamp release.json, deploy with Wrangler,
 * then verify the live manifest matches this commit. --dry-run uses the same CI gate.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const run = (cmd: string, args: string[], quiet = false, timeout?: number): string =>
  execFileSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: quiet ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    timeout,
  }) ?? '';
const git = (...args: string[]) => run('git', args, true).trim();

const dryRun = process.argv.includes('--dry-run');
const fullCheck = process.argv.includes('--full-check');
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
const dirty = git('status', '--porcelain');
const commit = git('rev-parse', 'HEAD');
if (!dryRun) {
  if (branch !== 'main') throw new Error(`Deploy from main, not ${branch}`);
  if (dirty) throw new Error('Working tree is dirty; commit first');
  git('fetch', 'origin', 'main');
  if (git('rev-parse', 'origin/main') !== commit) throw new Error('HEAD is not pushed to origin/main');
}

// Worktree preparation can leave workspace links pointing at another checkout. Reinstall from the lockfile
// before checking or bundling so a locally green build uses this checkout's released client.
run('npm', ['ci', '--no-audit', '--no-fund']);
let trustedCiUrl: string | undefined;
try {
  if (dirty) throw new Error('Working tree is dirty; CI cannot verify local changes');
  const deadline = Date.now() + 15 * 60_000;
  while (!trustedCiUrl) {
    const pages: unknown = JSON.parse(
      run(
        'gh',
        [
          'api',
          '--paginate',
          '--slurp',
          `repos/adam0white/human-framework/commits/${commit}/check-runs?filter=all&per_page=100`,
        ],
        true,
        30_000,
      ),
    );
    if (!Array.isArray(pages)) throw new Error('Unexpected check-runs response');
    const checks = pages.flatMap((page: { check_runs?: unknown }) => {
      if (!Array.isArray(page.check_runs)) throw new Error('Unexpected check-runs page');
      return page.check_runs as {
        id: number;
        name: string;
        head_sha: string;
        status: string;
        conclusion: string | null;
        html_url: string;
      }[];
    });
    const latestCi = checks
      .filter((check) => check.name === 'ci' && check.head_sha === commit)
      .sort((a, b) => b.id - a.id)[0];
    if (latestCi?.status === 'completed') {
      if (latestCi.conclusion !== 'success') {
        throw new Error(`CI for ${commit} finished with ${latestCi.conclusion ?? 'no conclusion'}`);
      }
      if (typeof latestCi.html_url !== 'string') throw new Error('CI check is missing its URL');
      trustedCiUrl = latestCi.html_url;
      break;
    }
    const status = latestCi?.status ?? 'missing';
    console.log(`Waiting for CI for ${commit}: ${status}`);
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error(`Timed out after 15 minutes waiting for CI for ${commit}`);
    await new Promise((resolve) => setTimeout(resolve, Math.min(15_000, remaining)));
  }
} catch (error) {
  if (!fullCheck) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot deploy without successful CI: ${reason}. Use --full-check to run local checks.`, {
      cause: error,
    });
  }
  console.warn('Could not trust CI; --full-check enabled local checks.', error);
}
if (trustedCiUrl) console.log(`Trusting successful CI: ${trustedCiUrl}`);
else run('npm', ['run', 'check']);
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
