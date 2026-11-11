import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import {
  anchorPersonaLife,
  initialPersonaLife,
  preparePersonaLife,
  validatePersonaLife,
} from '../src/life.ts';

const capture = JSON.parse(readFileSync(new URL('./legacy-capture.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

it('has no HF3 runtime dependency', () => {
  expect(manifest.dependencies['@adam0white/hf-legacy']).toBeUndefined();
});

it('reproduces published client 0.5.18 coarse-life captures and retained arrival', () => {
  const cases = capture.lifeCases;
  const parent = cases[0].result.parent;
  expect(initialPersonaLife(parent.castId, parent.branchId, 0)).toEqual(parent.transfer.life);
  for (const sample of cases) expect(preparePersonaLife(parent, sample.now)).toEqual(sample.result);
  const life = cases[3].result.life;
  expect(anchorPersonaLife(life, parent.castId, 101 * 3_600_000)).toEqual(capture.anchored);
  const retained = { ...parent, transfer: { ...parent.transfer, life } };
  expect(preparePersonaLife(retained, 0).life).toEqual(life);
  expect(preparePersonaLife(retained, 100 * 3_600_000).life).toEqual(life);
  const extra = structuredClone(life);
  extra.clock.note = { retained: true };
  expect(
    preparePersonaLife({ ...parent, transfer: { life: extra } }, 101 * 3_600_000).life.clock,
  ).toMatchObject({ note: { retained: true } });
  const negativeZero = structuredClone(life);
  negativeZero.clock.seed = -0;
  negativeZero.clock.watermark = -0;
  const anchoredZero = anchorPersonaLife(negativeZero, parent.castId, -0);
  expect(Object.is(anchoredZero.clock.seed, -0)).toBe(true);
  expect(Object.is(anchoredZero.clock.watermark, -0)).toBe(true);
  const invalid = structuredClone(life);
  invalid.clock.watermark = Number.MAX_SAFE_INTEGER;
  expect(() => validatePersonaLife(invalid, parent.castId)).toThrow();
});

it('matches captured HF3 boundaries, split returns and invalid clock errors', () => {
  for (const sample of capture.boundaries) {
    if (sample.error) {
      expect(() => preparePersonaLife(sample.parent, sample.now), sample.label).toThrow(sample.error);
    } else {
      expect(preparePersonaLife(sample.parent, sample.now), sample.label).toEqual(sample.result);
      expect(validatePersonaLife(sample.parent.transfer.life, sample.parent.castId), sample.label).toEqual(
        sample.parent.transfer.life,
      );
    }
  }
  const parent = capture.lifeCases[0].result.parent;
  expect(initialPersonaLife(parent.castId, parent.branchId, 3_599_999).clock.watermark).toBe(0);
  for (const now of [-1, 1.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() => initialPersonaLife(parent.castId, parent.branchId, now)).toThrow('Invalid chapter clock.');
    expect(() => preparePersonaLife(parent, now)).toThrow('Invalid chapter clock.');
  }
});
