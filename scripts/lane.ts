/**
 * Select checks for committed and local changes from the merge-base with origin/main.
 * CLI: node scripts/lane.ts [--base <ref>] [--dry-run]. Use --base HEAD for local changes only.
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type Lane = 'prose' | 'fast' | 'delivery' | 'gated';
const priority: Record<Lane, number> = { prose: 0, fast: 1, delivery: 2, gated: 3 };
const curatedDocs = new Set([
  'docs/lab/feedback-ledger.md',
  'docs/lab/lessons.md',
  'docs/lab/testing-asks.md',
]);

function fileLane(path: string): Lane {
  if (
    // Worker source dependencies: lab/{core,games,curated} and lab/games -> src/games.ts.
    // The import audit in lane-contract.test.ts guards additions outside this directory.
    /^(packages\/(human|lab-client|lab-kit)\/|apps\/site\/(worker|src\/lab)\/|\.github\/)/.test(path) ||
    /^(package-lock\.json|\.nvmrc|scripts\/(deploy|release|suite-lock|lane|lockfile-sync)\.ts|wrangler\.jsonc|apps\/site\/(public\/_headers|src\/games\.ts)|biome\.json)$/.test(
      path,
    ) ||
    /(?:^|\/)(package\.json|tsconfig[^/]*\.json|vitest[^/]*\.config\.ts|AGENTS\.md|CLAUDE\.md)$/.test(path) ||
    /^scripts\/[^/]+\.sh$/.test(path)
  )
    return 'gated';
  if (
    /^apps\/site\/public\//.test(path) ||
    /^apps\/site\/[^/]+\.html$/.test(path) ||
    /^apps\/site\/(?:.*\/)?index\.html$/.test(path) ||
    /(?:^|\/)vite\.config\.ts$/.test(path) ||
    /(?:^|\/)(sw\.ts|service-worker[^/]*)$/.test(path)
  )
    return 'delivery';
  if (
    /^(apps\/site\/src\/|packages\/playtester\/)/.test(path) ||
    /^scripts\/[^/]+\.ts$/.test(path) ||
    curatedDocs.has(path)
  )
    return 'fast';
  if (/^(docs\/|research\/|archive\/)/.test(path) || path === 'LICENSE' || /\.md$/.test(path)) return 'prose';
  return 'gated';
}

/** Paths are repository-relative. Higher-risk lanes win across files. */
export function classify(paths: readonly string[]): { lane: Lane; byFile: Record<string, Lane> } {
  let lane: Lane = 'prose';
  const byFile: Record<string, Lane> = Object.create(null);
  for (const path of paths) {
    const value = fileLane(path);
    byFile[path] = value;
    if (priority[value] > priority[lane]) lane = value;
  }
  return { lane, byFile };
}

/** --no-renames reports both the removed and added path; deletions also stay in the union. */
export function changedPaths(root: string, baseRef: string): string[] {
  const git = (...args: string[]): string => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  const base = git('merge-base', 'HEAD', baseRef).trim();
  const paths = [
    git('diff', '--name-only', '--no-renames', '-z', base, 'HEAD', '--'),
    git('diff', '--cached', '--name-only', '--no-renames', '-z', '--'),
    git('diff', '--name-only', '--no-renames', '-z', '--'),
    git('ls-files', '--others', '--exclude-standard', '-z'),
  ];
  return [...new Set(paths.flatMap((output) => output.split('\0').filter(Boolean)))].sort();
}

export function laneCommands(changed: readonly string[], lane: Lane): string[][] {
  const commands: string[][] = [['npm', 'run', 'lint']];
  if (lane === 'gated') commands.splice(0, 1, ['npm', 'run', 'check']);
  else if (lane !== 'prose') {
    commands.push(['npm', 'run', 'typecheck']);
    const sources = changed.filter((path) => /\.[cm]?[jt]sx?$/.test(path));
    if (sources.length)
      commands.push(['npm', 'exec', '--', 'vitest', 'related', '--run', '--passWithNoTests', ...sources]);
  }
  // Markdown is read at runtime, outside Vitest's import graph.
  if (lane !== 'gated' && changed.some((path) => curatedDocs.has(path)))
    commands.push(['npm', 'exec', '--', 'vitest', 'run', 'apps/site/src/lab/lab.test.ts']);
  if (lane === 'delivery') commands.push(['npm', 'run', 'build'], ['node', 'scripts/site-smoke.ts']);
  if (changed.some((path) => /(?:^|\/)(?:package\.json|package-lock\.json)$/.test(path)))
    commands.unshift(['node', 'scripts/lockfile-sync.ts']);
  return commands;
}

function main(): void {
  const root = resolve(import.meta.dirname, '..');
  const args = process.argv.slice(2);
  const baseIndex = args.indexOf('--base');
  const baseRef = baseIndex < 0 ? 'origin/main' : args[baseIndex + 1];
  if (!baseRef || baseRef.startsWith('-')) throw new Error('--base requires a ref');
  const changed = changedPaths(root, baseRef);
  const { lane, byFile } = classify(changed);
  for (const path of changed) console.log(`${byFile[path]}\t${path}`);
  const deciding = changed.find((path) => byFile[path] === lane);
  console.log(`Lane: ${lane}; deciding file: ${deciding ?? '(no changed files)'}`);

  for (const command of laneCommands(changed, lane)) {
    const [executable, ...args] = command;
    if (!executable) continue;
    console.log(`> ${command.map((part) => JSON.stringify(part)).join(' ')}`);
    if (!process.argv.includes('--dry-run')) execFileSync(executable, args, { cwd: root, stdio: 'inherit' });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
