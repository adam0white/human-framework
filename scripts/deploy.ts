/**
 * Release workflow: require HEAD to equal fetched origin/main, regardless of local branch,
 * and a successful `ci` check belonging to
 * the CI workflow's push run on main for that SHA. Wait up to 15 minutes for pending CI;
 * fail closed on missing/failed/unavailable CI unless --full-check enables local checks.
 * Build and deploy only from a fresh detached temporary worktree of that exact SHA,
 * installed with npm ci; always remove it afterwards. Local checkout edits are excluded.
 * --dry-run uses the same guards, install, build and cleanup; --trust-ci is a legacy alias.
 * Stamp release.json with that SHA and verify the live manifest after a real upload.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const run = (cmd: string, args: string[], quiet = false, timeout?: number, cwd = root): string =>
  execFileSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    stdio: quiet ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    timeout,
  }) ?? '';
const git = (...args: string[]) => run('git', args, true).trim();

const dryRun = process.argv.includes('--dry-run');
const fullCheck = process.argv.includes('--full-check');
const commit = git('rev-parse', 'HEAD');
git('fetch', 'origin', 'main');
const pushed = git('rev-parse', 'origin/main');
if (commit !== pushed) throw new Error(`HEAD ${commit} is not origin/main ${pushed}: push it first`);

type WorkflowRun = {
  id: number;
  name: string;
  head_sha: string;
  head_branch: string;
  event: string;
  status: string;
  conclusion: string | null;
  check_suite_id: number;
};
type Check = {
  id: number;
  name: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  check_suite?: { id: number };
};
const apiPages = (endpoint: string): Record<string, unknown>[] => {
  const pages: unknown = JSON.parse(run('gh', ['api', '--paginate', '--slurp', endpoint], true, 30_000));
  if (!Array.isArray(pages) || pages.some((page) => !page || typeof page !== 'object'))
    throw new Error('Unexpected GitHub API response');
  return pages;
};
const pending = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);
let trustedCiUrl: string | undefined;
try {
  const deadline = Date.now() + 15 * 60_000;
  while (!trustedCiUrl) {
    const runs = apiPages(
      `repos/adam0white/human-framework/actions/runs?head_sha=${commit}&per_page=100`,
    ).flatMap((page) => {
      if (!Array.isArray(page.workflow_runs)) throw new Error('Unexpected workflow-runs page');
      return page.workflow_runs as WorkflowRun[];
    });
    const workflow = runs
      .filter(
        (run) =>
          run.name === 'CI' && run.head_sha === commit && run.head_branch === 'main' && run.event === 'push',
      )
      .sort((a, b) => b.id - a.id)[0];
    if (!workflow) throw new Error(`Missing CI push workflow on main for ${commit}`);
    if (workflow.status === 'completed' && workflow.conclusion !== 'success')
      throw new Error(`CI workflow for ${commit} finished with ${workflow.conclusion ?? 'no conclusion'}`);
    const checks = apiPages(
      `repos/adam0white/human-framework/commits/${commit}/check-runs?filter=all&per_page=100`,
    ).flatMap((page) => {
      if (!Array.isArray(page.check_runs)) throw new Error('Unexpected check-runs page');
      return page.check_runs as Check[];
    });
    const latestCi = checks
      .filter(
        (check) =>
          check.name === 'ci' &&
          check.head_sha === commit &&
          typeof workflow.check_suite_id === 'number' &&
          check.check_suite?.id === workflow.check_suite_id,
      )
      .sort((a, b) => b.id - a.id)[0];
    if (latestCi?.status === 'completed' && latestCi.conclusion !== 'success')
      throw new Error(`CI for ${commit} finished with ${latestCi.conclusion ?? 'no conclusion'}`);
    if (workflow.status === 'completed' && latestCi?.status === 'completed') {
      if (typeof latestCi.html_url !== 'string' || !latestCi.html_url)
        throw new Error('CI check is missing its URL');
      trustedCiUrl = latestCi.html_url;
      break;
    }
    if (!pending.has(workflow.status) && !pending.has(latestCi?.status ?? ''))
      throw new Error(`Missing or invalid ci check for CI workflow on ${commit}`);
    console.log(`Waiting for CI for ${commit}: ${latestCi?.status ?? workflow.status}`);
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

const temporary = mkdtempSync(join(tmpdir(), 'hf-deploy-'));
const checkout = join(temporary, 'source');
let added = false;
try {
  git('worktree', 'add', '--detach', checkout, commit);
  added = true;
  const isolated = (cmd: string, args: string[]) => run(cmd, args, false, undefined, checkout);
  isolated('npm', ['ci', '--no-audit', '--no-fund']);
  if (!trustedCiUrl) isolated('npm', ['run', 'check']);
  isolated('npm', ['run', 'build']);
  const pkg = (path: string) => JSON.parse(readFileSync(join(checkout, path), 'utf8')) as { version: string };
  // Execute the resolver from the detached checkout too: local helper edits must not stamp a release.
  const framework = JSON.parse(
    run(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        "import { resolveSiteFramework } from './apps/site/hf-resolution.ts'; process.stdout.write(JSON.stringify(resolveSiteFramework('./apps/site')))",
      ],
      true,
      30_000,
      checkout,
    ),
  ) as { framework: string; frameworkLibrary: string };
  const release = {
    app: pkg('package.json').version,
    framework: framework.framework,
    frameworkLibrary: framework.frameworkLibrary,
    commit,
    dirty: false,
  };
  writeFileSync(join(checkout, 'apps/site/dist/release.json'), `${JSON.stringify(release, null, 2)}\n`);
  console.log('release', release);
  isolated('npx', ['wrangler', 'deploy', ...(dryRun ? ['--dry-run'] : [])]);
  if (!dryRun) {
    // The edge can serve the previous release for a few seconds after upload.
    let live = '';
    for (let attempt = 0; attempt < 10 && live !== commit; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 3000));
      live = (
        (await (await fetch('https://human.adamwhite.work/release.json', { cache: 'no-store' })).json()) as {
          commit: string;
        }
      ).commit;
    }
    if (live !== commit) throw new Error(`Live commit ${live} != ${commit}`);
    console.log('Verified live release at', commit);
  }
} finally {
  try {
    if (added) git('worktree', 'remove', '--force', checkout);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
