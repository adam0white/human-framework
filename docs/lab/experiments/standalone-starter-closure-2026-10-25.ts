/** Timing contrast for the existing starter; no new starter or HF API. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { control } from '../../../packages/human/examples/h3-starter/control.ts';
import { type Input, replay, Starter } from '../../../packages/human/examples/h3-starter/starter.ts';

const seeds = [7, 19, 43, 71, 101];
const rows = seeds.map((seed, index) => {
  const delay = 1 + index * 2;
  const early: Input[] = [
    { until: delay, workAvailable: true },
    { until: 30, workAvailable: true },
  ];
  const delayed = early.map((input, i) => ({ ...input, workAvailable: i > 0 }));
  const arms = [early, delayed].map((inputs) => {
    const full = replay(seed, inputs).save();
    const restored = new Starter(seed, JSON.parse(JSON.stringify(replay(seed, inputs.slice(0, 1)).save())));
    assert(inputs[1]);
    restored.apply(inputs[1]);
    assert.deepEqual(full, restored.save());
    assert.deepEqual(full, replay(seed, full.inputs).save());
    // Both arms reach real repair activity; delayed work is not an empty-action arm.
    assert(full.people.some((p) => p.activity?.action === 'repair') || full.repairs > 0);
    return full;
  });
  assert(arms[0] && arms[1]);
  assert.equal(arms[0].repairs, 4);
  assert.equal(arms[1].repairs, 2);
  return {
    seed,
    delay,
    repairs: arms.map((arm) => arm.repairs),
    restoreExact: true,
    replayExact: true,
    arms,
  };
});
// Preserve the original pinned legacy hashes and exact current restore/replay controls.
const legacy = [7, 42].map(control);
assert(process.argv[2], 'Supply a scratch output JSON path');
writeFileSync(process.argv[2], JSON.stringify({ rows, legacy }, null, 2));
console.log(JSON.stringify({ rows: rows.map(({ arms: _, ...row }) => row), legacy }, null, 2));
