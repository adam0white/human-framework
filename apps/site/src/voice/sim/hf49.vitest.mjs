/** Isolated published-artifact control. The released 3.2 game keeps its own normal test lane. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const artifacts = process.env.HF49_ARTIFACT_ROOT;
if (!artifacts)
  throw new Error('Set HF49_ARTIFACT_ROOT to extracted released packages; see ../hf49-blockers.md.');
const packageRoot = (name) => resolve(artifacts, 'node_modules/@adam0white', name);
for (const [name, expected] of [
  ['human-framework', '4.9.0'],
  ['lab-client', '0.5.8'],
]) {
  const manifest = JSON.parse(readFileSync(resolve(packageRoot(name), 'package.json'), 'utf8'));
  if (manifest.version !== expected) throw new Error(`Expected released ${name}@${expected}`);
}
export default {
  root: resolve(import.meta.dirname, '../../../../..'),
  resolve: {
    alias: [
      {
        find: /^@adam0white\/human-framework$/,
        replacement: resolve(packageRoot('human-framework'), 'dist/index.js'),
      },
      { find: /^@adam0white\/lab-client$/, replacement: resolve(packageRoot('lab-client'), 'dist/index.js') },
    ],
  },
  test: {
    name: 'published-hf49',
    environment: 'node',
    testTimeout: 30_000,
    include: ['apps/site/src/voice/sim/hf49-contract.test.mjs'],
  },
};
