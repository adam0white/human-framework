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
    /^(packages\/(human|lab-client|lab-kit)\/|apps\/site\/worker\/|\.github\/workflows\/)/.test(path) ||
    /^(package-lock\.json|package\.json|scripts\/(deploy|release|suite-lock|lane)\.ts|wrangler\.jsonc|apps\/site\/public\/_headers|tsconfig[^/]*\.json|biome\.json|vitest[^/]*\.config\.ts)$/.test(
      path,
    ) ||
    /\/(package\.json|vitest\.config\.ts)$/.test(path)
  )
    return 'gated';
  if (
    /^apps\/site\/public\//.test(path) ||
    /^apps\/site\/[^/]+\.html$/.test(path) ||
    /^apps\/site\/(?:.*\/)?index\.html$/.test(path) ||
    path === 'apps/site/vite.config.ts' ||
    /(?:^|\/)(sw\.ts|service-worker[^/]*)$/.test(path)
  )
    return 'delivery';
  if (/^(apps\/site\/src\/|packages\/playtester\/|scripts\/)/.test(path) || curatedDocs.has(path))
    return 'fast';
  if (/^(docs\/|research\/|archive\/)/.test(path) || path === 'LICENSE' || /\.md$/.test(path)) return 'prose';
  return 'fast';
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

function main(): void {
  const root = resolve(import.meta.dirname, '..');
  const git = (...args: string[]): string => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  const args = process.argv.slice(2);
  const baseIndex = args.indexOf('--base');
  const baseRef = baseIndex < 0 ? 'origin/main' : args[baseIndex + 1];
  if (!baseRef || baseRef.startsWith('-')) throw new Error('--base requires a ref');
  const base = git('merge-base', 'HEAD', baseRef).trim();
  const paths = [
    git('diff', '--name-only', '--no-renames', '-z', base, 'HEAD', '--'),
    git('diff', '--cached', '--name-only', '--no-renames', '-z', '--'),
    git('diff', '--name-only', '--no-renames', '-z', '--'),
    git('ls-files', '--others', '--exclude-standard', '-z'),
  ];
  const changed = [...new Set(paths.flatMap((output) => output.split('\0').filter(Boolean)))].sort();
  const { lane, byFile } = classify(changed);
  for (const path of changed) console.log(`${byFile[path]}\t${path}`);
  const deciding = changed.find((path) => byFile[path] === lane);
  console.log(`Lane: ${lane}; deciding file: ${deciding ?? '(no changed files)'}`);

  const commands: string[][] = [['npm', 'run', 'lint']];
  if (lane === 'gated') commands.splice(0, 1, ['npm', 'run', 'check']);
  else if (lane !== 'prose') {
    commands.push(['npm', 'run', 'typecheck']);
    const sources = changed.filter((path) => /\.[cm]?[jt]sx?$/.test(path));
    if (sources.length)
      commands.push(['npm', 'exec', '--', 'vitest', 'related', '--run', '--passWithNoTests', ...sources]);
  }
  // Markdown is not in Vitest's import graph. This contract still needs its explicit test.
  if (lane !== 'gated' && changed.some((path) => curatedDocs.has(path)))
    commands.push(['npm', 'exec', '--', 'vitest', 'run', 'apps/site/src/lab/lab.test.ts']);
  if (lane === 'delivery') commands.push(['npm', 'run', 'build']);
  for (const command of commands) {
    const [executable, ...args] = command;
    if (!executable) continue;
    console.log(`> ${command.map((part) => JSON.stringify(part)).join(' ')}`);
    if (!process.argv.includes('--dry-run')) execFileSync(executable, args, { cwd: root, stdio: 'inherit' });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
