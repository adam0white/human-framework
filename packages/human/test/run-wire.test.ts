import { expect, test } from 'vitest';
import { createRun, exportRun, inspect, step } from '../src/run.ts';
import { runWire } from '../src/run-wire.ts';
import { emptyRunSpec } from './run-fixture.ts';

// One headless run proves transport parity and refusal before mutation.
test('wire routes admitted operations and rejects malformed or unsupported requests without changing the run', () => {
  const a = createRun(emptyRunSpec());
  const b = createRun(emptyRunSpec());
  if (!a.ok || !b.ok) throw new Error('run creation failed');
  const request = (operation: string, input: unknown, version = 1) =>
    JSON.stringify({ format: 'hf-run-wire', version, operation, input });
  const before = exportRun(a.value);
  for (const bad of [
    '{',
    '{"format":"hf-run-wire","version":1,"version":1,"operation":"step","input":{"until":1,"inputs":[]}}',
    '{"format":"hf-run-wire","version":1,"operation":"step","input":{"until":1,"\\u0075ntil":1,"inputs":[]}}',
    '{"format":"hf-run-wire","version":1,"operation":"step","input":{"until":-0,"inputs":[]}}',
    request('step', { until: 1, inputs: [] }, 2),
    request('step', { until: 1, inputs: [], unexpected: true }),
    JSON.stringify({
      format: 'hf-run-wire',
      version: 1,
      operation: 'step',
      input: { until: 1, inputs: [] },
      extra: 1,
    }),
  ]) {
    expect(JSON.parse(runWire(a.value, bad)).result.ok).toBe(false);
    expect(exportRun(a.value)).toEqual(before);
  }
  const batch = { until: 1, inputs: [] };
  expect(JSON.parse(runWire(a.value, request('step', batch))).result).toEqual(step(b.value, batch));
  const query = { perspective: { kind: 'host' as const }, people: [], select: [] };
  expect(JSON.parse(runWire(a.value, request('inspect', query))).result).toEqual(inspect(b.value, query));
  expect(exportRun(a.value)).toEqual(exportRun(b.value));
});
