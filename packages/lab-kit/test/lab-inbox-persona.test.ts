import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';

const { personaMeasurements } = await import(pathToFileURL(resolve('scripts/lab-inbox-persona.ts')).href);
const id = (digit: string) => digit.repeat(32);
const run = (game: string, runId: string, oneCast: unknown, extra = {}) => ({
  v: 2,
  id: id('1'),
  player: id('a'),
  session: id('b'),
  runId,
  game,
  kind: 'run',
  at: 1,
  build: {},
  data: { oneCast },
  ...extra,
});
const admission = {
  v: 1,
  probe: 'zeynep',
  arm: 'continuing',
  scope: 'shared',
  castId: 'hf.cast.zeynep.pass',
  branchId: id('c'),
  revision: 'd'.repeat(64),
  parentRevision: 'e'.repeat(64),
  stage: 'admitted',
  outcome: 'accepted',
};
it('counts complete received runs once and joins a continuing person across games', () => {
  const source = run('pass', id('f'), { ...admission, revision: 'e'.repeat(64), stage: 'checkpoint' });
  const target = run('goodhands', id('2'), [admission]);
  const result = personaMeasurements([source, target, target]);
  expect(result.rows).toHaveLength(2);
  expect(result.joins).toBe(1);
  expect(result.incomplete).toBe(0);
});
it('excludes incomplete chunks and reports file scope without claiming a linked transfer', () => {
  const chunk = run('pass', id('f'), admission, {
    data: { encoding: 'json', upload: id('3'), index: 0, total: 2, text: '{' },
  });
  const result = personaMeasurements([chunk, run('goodhands', id('2'), { ...admission, scope: 'file' })]);
  expect(result.incomplete).toBe(1);
  expect(result.rows).toHaveLength(1);
  expect(result.joins).toBe(0);
});
it('does not join different recording identities or count malformed metadata', () => {
  const result = personaMeasurements([
    run('pass', id('f'), { ...admission, revision: 'e'.repeat(64), stage: 'checkpoint' }),
    run('goodhands', id('2'), admission, { player: id('9') }),
    run('voice', id('4'), { ...admission, castId: '<script>' }),
  ]);
  expect(result.joins).toBe(0);
  expect(result.rows).toHaveLength(2);
});

it('joins a later checkpoint from the same run without losing its revision evidence', () => {
  const early = { ...admission, stage: 'checkpoint' };
  const late = { ...early, revision: 'f'.repeat(64), parentRevision: early.revision };
  const result = personaMeasurements([
    run('pass', id('5'), [early]),
    run('pass', id('5'), [early, late]),
    run('goodhands', id('6'), { ...admission, parentRevision: late.revision }),
  ]);
  expect(result.joins).toBe(1);
  expect(result.rows.filter((r: { stage: string }) => r.stage === 'checkpoint')).toHaveLength(2);
});
