import { describe, expect, it } from 'vitest';
import { createRun, DEFAULT_NORMS, exportRun } from '../src/index.ts';
import { emptyRunSpec } from './run-fixture.ts';

describe('public default norms', () => {
  it('admits and retains the sourced catalog; duplicate ids are rejected', () => {
    const spec = emptyRunSpec();
    spec.definitions.norms = DEFAULT_NORMS;
    const result = createRun(spec);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    const archive = exportRun(result.value);
    expect(archive.initial.spec.definitions.norms).toEqual(DEFAULT_NORMS);
    const fast = DEFAULT_NORMS.find((norm) => norm.id === 'sawm-ramadan');
    expect(fast?.provenance).toMatchObject({ kind: 'religious', researchRef: 'research/norm-sources.md' });
    expect(fast?.exemptions.find((item) => item.when === 'illness')?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'interpretation', ref: expect.stringContaining('NOT modelled') }),
      ]),
    );
    expect(DEFAULT_NORMS.find((norm) => norm.id === 'punctuality')?.provenance.kind).toBe('authored-world');
    if (!fast) throw new Error('Missing sourced fast norm');
    spec.definitions.norms = [...DEFAULT_NORMS, fast];
    expect(createRun(spec)).toMatchObject({ ok: false, error: { code: 'duplicate-id' } });
  });
});
