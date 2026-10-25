import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { resolveSiteFramework } from '../apps/site/hf-resolution.ts';

const scratch = tmpdir();
mkdirSync(scratch, { recursive: true });
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function fixture(workspace = '2.20.0', pin = '2.18.0') {
  const root = realpathSync(mkdtempSync(join(scratch, 'game-pins-test-')));
  roots.push(root);
  const app = join(root, 'apps/site');
  const human = join(root, 'packages/human');
  const write = (path: string, value: unknown) => {
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, JSON.stringify(value));
  };
  write(join(app, 'package.json'), { dependencies: { '@adam0white/human-framework': pin } });
  write(join(human, 'package.json'), { name: '@adam0white/human-framework', version: workspace });
  write(join(human, 'src/index.ts'), 'workspace');
  const install = (version = pin) => {
    const pkg = join(app, 'node_modules/@adam0white/human-framework');
    write(join(pkg, 'package.json'), {
      name: '@adam0white/human-framework',
      version,
      type: 'module',
      exports: {
        '.': { types: './dist/index.d.ts', default: './dist/index.js' },
        './package.json': './package.json',
      },
    });
    write(join(pkg, 'dist/index.js'), 'published');
    write(join(pkg, 'dist/index.d.ts'), 'published types');
    return pkg;
  };
  return { root, app, human, install };
}
it('uses source without dist only when the workspace equals the exact pin', () => {
  const f = fixture('2.20.0', '2.20.0');
  expect(resolveSiteFramework(f.app)).toMatchObject({
    entry: join(f.human, 'src/index.ts'),
    framework: '2.20.0',
    frameworkLibrary: '2.20.0',
  });
});
it('resolves the actual published entry from the app and separates runtime/latest metadata', () => {
  const f = fixture();
  const pkg = f.install();
  expect(resolveSiteFramework(f.app)).toMatchObject({
    entry: join(pkg, 'dist/index.js'),
    framework: '2.18.0',
    frameworkLibrary: '2.20.0',
  });
});
it('rejects a partial published install missing declarations', () => {
  const f = fixture();
  const pkg = f.install();
  rmSync(join(pkg, 'dist/index.d.ts'));
  expect(() => resolveSiteFramework(f.app)).toThrow(/Missing HF declarations/);
});
it('rejects a missing published package instead of using workspace source', () => {
  const f = fixture();
  expect(() => resolveSiteFramework(f.app)).toThrow(/Cannot resolve/);
});
it('rejects a mismatched installed package', () => {
  const f = fixture();
  f.install('2.19.0');
  expect(() => resolveSiteFramework(f.app)).toThrow(/2.19.0.*2.18.0/);
});
it('rejects a hoisted workspace symlink when the workspace differs', () => {
  const f = fixture();
  mkdirSync(join(f.root, 'node_modules/@adam0white'), { recursive: true });
  symlinkSync(f.human, join(f.root, 'node_modules/@adam0white/human-framework'));
  expect(() => resolveSiteFramework(f.app)).toThrow();
});
it('rejects a range even if workspace would satisfy it', () => {
  const f = fixture('2.20.0', '^2.20.0');
  expect(() => resolveSiteFramework(f.app)).toThrow(/exact/);
});

it('honors the import export condition instead of the require entry', () => {
  const f = fixture();
  const pkg = f.install();
  writeFileSync(
    join(pkg, 'package.json'),
    JSON.stringify({
      name: '@adam0white/human-framework',
      version: '2.18.0',
      type: 'module',
      exports: {
        '.': { import: './dist/index.js', require: './missing.cjs' },
        './package.json': './package.json',
      },
    }),
  );
  expect(resolveSiteFramework(f.app).entry).toBe(join(pkg, 'dist/index.js'));
});

it('Vite stamps the game pin and the separate library version', async () => {
  const { default: config } = await import('../apps/site/vite.config.ts');
  const app = JSON.parse(readFileSync('apps/site/package.json', 'utf8'));
  const human = JSON.parse(readFileSync('packages/human/package.json', 'utf8'));
  expect(config.define).toEqual({
    __HF_PACKAGE_VERSION__: JSON.stringify(app.dependencies['@adam0white/human-framework']),
    __HF_LIBRARY_VERSION__: JSON.stringify(human.version),
  });
  const aliases = config.resolve?.alias;
  expect(Array.isArray(aliases)).toBe(true);
  if (!Array.isArray(aliases)) throw new Error('Expected Vite alias array');
  const rootAlias = aliases[0];
  if (!rootAlias || !(rootAlias.find instanceof RegExp)) throw new Error('Expected exact HF alias');
  expect(rootAlias.find.test('@adam0white/human-framework')).toBe(true);
  expect(rootAlias.find.test('@adam0white/human-framework/package.json')).toBe(false);
  expect(rootAlias.find.test('@adam0white/human-framework/other')).toBe(false);
});

it('TypeScript prefers published declarations and allows equal-version source before dist exists', () => {
  const paths = JSON.parse(readFileSync('apps/site/tsconfig.json', 'utf8')).compilerOptions.paths;
  const tsc = resolve(import.meta.dirname, '../node_modules/typescript/bin/tsc');
  const compile = (app: string, expected: string) => {
    writeFileSync(
      join(app, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          noEmit: true,
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          paths,
        },
        include: ['probe.ts'],
      }),
    );
    writeFileSync(
      join(app, 'probe.ts'),
      `import { pin } from '@adam0white/human-framework'; const actual: '${expected}' = pin;`,
    );
    try {
      execFileSync(process.execPath, [tsc, '-p', join(app, 'tsconfig.json')], { stdio: 'pipe' });
    } catch (error) {
      throw new Error(String((error as { stdout?: Buffer }).stdout ?? error));
    }
  };
  const equal = fixture('2.20.0', '2.20.0');
  writeFileSync(join(equal.human, 'src/index.ts'), "export const pin = 'workspace' as const;");
  compile(equal.app, 'workspace');

  const different = fixture();
  const pkg = different.install();
  writeFileSync(join(different.human, 'src/index.ts'), "export const pin = 'workspace' as const;");
  writeFileSync(join(pkg, 'dist/index.d.ts'), "export declare const pin: 'published';");
  compile(different.app, 'published');
});
