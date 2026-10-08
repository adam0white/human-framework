/**
 * HF release: `npm run release` on a clean `main` that is pushed to origin. Checks that the package version,
 * `FRAMEWORK_VERSION` and a CHANGELOG.md section agree and that the tag is new, runs `npm run check`, packs
 * `packages/human`, then creates and pushes the tag `vX.Y.Z` and a GitHub release whose notes are the CHANGELOG
 * section, which must open with the ENGINE_VERSION it ships (`Engine: X.Y.Z.`), with the tarball attached. The
 * release starts .github/workflows/publish.yml, which publishes the version to npm.
 *
 * `npm run release -- --dry-run` skips the branch, clean and pushed checks and stops after packing: it prints
 * the notes and the tarball path and creates no tag or release.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const run = (cmd: string, args: string[], quiet = false): string =>
  execFileSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: quiet ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  }) ?? '';
const git = (...args: string[]) => run('git', args, true).trim();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const fail = (message: string): never => {
  throw new Error(`release: ${message}`);
};

const dryRun = process.argv.includes('--dry-run');

run('gh', ['auth', 'status'], true);

if (!dryRun) {
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (branch !== 'main') fail(`release from main, not ${branch}`);
  if (git('status', '--porcelain')) fail('working tree is dirty; commit first');
  git('fetch', 'origin', 'main');
  if (git('rev-parse', 'origin/main') !== git('rev-parse', 'HEAD')) fail('HEAD is not pushed to origin/main');
}

const version = (JSON.parse(read('packages/human/package.json')) as { version: string }).version;
if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`package version ${version} is not X.Y.Z`);
const framework = /export const FRAMEWORK_VERSION = '([^']+)'/.exec(read('packages/human/src/index.ts'))?.[1];
if (framework !== version) fail(`FRAMEWORK_VERSION ${framework} != package version ${version}`);
const engine = /export const ENGINE_VERSION = '([^']+)'/.exec(read('packages/human/src/types.ts'))?.[1];
if (!engine) fail('ENGINE_VERSION not found in packages/human/src/types.ts');

const tag = `v${version}`;
if (git('tag', '--list', tag)) fail(`tag ${tag} already exists locally`);
if (git('ls-remote', '--tags', 'origin', `refs/tags/${tag}`)) fail(`tag ${tag} already exists on origin`);

// The section runs from `## [X.Y.Z]` to the next `## ` heading or the link references at the end.
const changelog = read('CHANGELOG.md').split('\n');
const start = changelog.findIndex((l) => l.startsWith(`## [${version}]`));
if (start < 0) fail(`CHANGELOG.md has no "## [${version}]" section`);
let end = changelog.findIndex((l, i) => i > start && (l.startsWith('## ') || /^\[[^\]]+\]: /.test(l)));
if (end < 0) end = changelog.length;
const section = changelog
  .slice(start + 1, end)
  .join('\n')
  .trim();
if (!section) fail(`CHANGELOG.md section ${version} is empty`);
// The version policy lists the ENGINE_VERSION in every release's notes: the section must open with it.
if (!section.startsWith(`Engine: ${engine}.`)) {
  fail(`CHANGELOG.md section ${version} must open with "Engine: ${engine}." (ENGINE_VERSION in types.ts)`);
}
const notes = `${section}\n`;

run('npm', ['run', 'check']);

const out = mkdtempSync(join(tmpdir(), 'hf-release-'));
// Lifecycle output (prepack builds the package) can precede the JSON on stdout, so parse from the first `[`.
const packed = run('npm', ['pack', '-w', 'packages/human', '--pack-destination', out, '--json'], true);
const json = JSON.parse(packed.slice(packed.indexOf('\n[') + 1 || packed.indexOf('['))) as {
  filename: string;
}[];
const tarball = join(out, json[0]?.filename ?? fail('npm pack reported no file'));
const notesFile = join(out, 'notes.md');
writeFileSync(notesFile, notes);

if (dryRun) {
  console.log(
    `\n--- ${tag} notes ---\n${notes}--- end ---\ntarball ${tarball}\nDry run: no tag or release created.`,
  );
} else {
  git('tag', '-a', tag, '-m', `HF ${version} (engine ${engine})`);
  git('push', 'origin', tag);
  run('gh', [
    'release',
    'create',
    tag,
    tarball,
    '--verify-tag',
    '--title',
    `HF ${version}`,
    '--notes-file',
    notesFile,
  ]);
  console.log(`Released ${tag} with ${tarball}`);
  console.log('publish.yml now publishes it to npm (HANDOFF.md, "npm").');
}
