import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';

const base = resolve(import.meta.dirname, '../apps/site/public/lab/island');
const viewer = runInNewContext(
  `${readFileSync(resolve(base, 'viewer.js'), 'utf8')}; globalThis.IslandReplay`,
) as { validateRecording: (recording: unknown) => unknown };
const index = JSON.parse(readFileSync(resolve(base, 'runs/index.json'), 'utf8')) as { file: string }[];
const current = () => JSON.parse(readFileSync(resolve(base, 'runs/hf417-1.json'), 'utf8'));

it.each(index.map((entry) => entry.file))('loads the actual indexed recording %s', (file) => {
  const recording = JSON.parse(readFileSync(resolve(base, 'runs', file), 'utf8'));
  expect(viewer.validateRecording(recording)).toBe(recording);
});

it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('refuses invalid goal time %s', (minute) => {
  const recording = current();
  const frame = recording.frames.find((item: { inner?: { goals?: unknown[] } }) => item.inner?.goals?.length);
  if (!frame) throw new Error('Current recording has no actual goal');
  frame.inner.goals[0].minute = minute;
  expect(() => viewer.validateRecording(recording)).toThrow('island-recording@1 contract');
});

it('still requires integer frame steps and map cells', () => {
  for (const field of ['step', 'cell']) {
    const recording = current();
    if (field === 'step') recording.frames[0].s = 0.5;
    else recording.frames[0].me.x = 0.5;
    expect(() => viewer.validateRecording(recording)).toThrow('island-recording@1 contract');
  }
});
