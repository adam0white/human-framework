import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import * as api from '../src/index.ts';
import { exampleSpec, need } from './support.ts';

test('the public run contract has eight operations and archive identity matches the actual package', () => {
  const operations = {
    createRun: api.createRun,
    createPerson: api.createPerson,
    step: api.step,
    inspect: api.inspect,
    preview: api.preview,
    exportRun: api.exportRun,
    restoreRun: api.restoreRun,
    replay: api.replay,
  };
  for (const [name, operation] of Object.entries(operations)) expect(typeof operation, name).toBe('function');
  // The eight run calls plus the one pure chapter-clock projection; nothing else is exported at runtime.
  expect(Object.keys(api).sort()).toEqual([...Object.keys(operations), 'projectChapterClock'].sort());
  expect(Object.hasOwn(api, 'FRAMEWORK_VERSION')).toBe(false);
  expect(Object.hasOwn(api, 'ENGINE_VERSION')).toBe(false);
  expect(Object.keys(api).some((name) => name.startsWith('enable'))).toBe(false);
  const run = need(api.createRun(exampleSpec()));
  const archive = api.exportRun(run);
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  expect(pkg.version).toMatch(/^4\./);
  expect(archive.version).toBe(4);
  expect(archive.engine.package).toBe(`${pkg.name}@${pkg.version}`);
  expect(archive.engine.build).toMatch(/^[a-f0-9]{64}$/);
  expect(archive.engine.schema).toMatch(/^[a-f0-9]{64}$/);
});
