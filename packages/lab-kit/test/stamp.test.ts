// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('../bin/stamp-release', import.meta.url));
const directories: string[] = [];
function fixture() {
  const cwd = mkdtempSync(join(tmpdir(), 'lab-kit-stamp-'));
  directories.push(cwd);
  writeFileSync(join(cwd, 'package.json'), '{"version":"1.2.3"}');
  mkdirSync(join(cwd, 'node_modules/@adam0white/human-framework'), { recursive: true });
  writeFileSync(join(cwd, 'node_modules/@adam0white/human-framework/package.json'), '{"version":"2.8.0"}');
  return cwd;
}
function stamp(cwd: string, args: string[] = []) {
  execFileSync(process.execPath, [script, ...args], { cwd, stdio: 'pipe' });
  return JSON.parse(readFileSync(join(cwd, 'public/release.json'), 'utf8'));
}
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});
describe('release stamp', () => {
  it('stamps source archives conservatively and creates the output directory', () => {
    expect(stamp(fixture())).toEqual({ app: '1.2.3', framework: '2.8.0', commit: 'none', dirty: true });
  });
  it('accepts caller paths and rejects missing versions or unknown options', () => {
    const cwd = fixture();
    writeFileSync(join(cwd, 'custom.json'), '{"version":"3.0.0"}');
    expect(stamp(cwd, ['--package', 'custom.json']).app).toBe('3.0.0');
    writeFileSync(join(cwd, 'custom.json'), '{}');
    expect(() => stamp(cwd, ['--package', 'custom.json'])).toThrow();
    expect(() => stamp(cwd, ['--unknown', 'value'])).toThrow();
  });
  it('records the actual commit and distinguishes clean from dirty checkouts', () => {
    const cwd = fixture();
    const git = (...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
    git('init', '--quiet');
    writeFileSync(join(cwd, '.gitignore'), 'node_modules/\npublic/release.json\n');
    git('add', '.');
    git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '--quiet',
      '-m',
      'fixture',
    );
    expect(stamp(cwd)).toMatchObject({ commit: git('rev-parse', 'HEAD'), dirty: false });
    writeFileSync(join(cwd, 'changed.txt'), 'changed');
    expect(stamp(cwd).dirty).toBe(true);
  });
});
